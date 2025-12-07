'use client';

/**
 * useAuth Hook
 *
 * Provides authentication actions for sign in, sign up, sign out,
 * and password management. Uses TanStack Query mutations for
 * proper loading/error state management.
 *
 * This hook:
 * - Provides all authentication actions in one place
 * - Manages loading and error states per action
 * - Handles cache invalidation on auth state changes
 * - Supports email/password authentication
 * - Includes password reset and update functionality
 *
 * @example
 * ```tsx
 * import { useAuth } from '@/lib/hooks/auth';
 *
 * function LoginForm() {
 *   const { signIn, isLoading, error } = useAuth();
 *
 *   const handleSubmit = async (email: string, password: string) => {
 *     const result = await signIn(email, password);
 *     if (result.success) {
 *       router.push('/dashboard');
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <Alert message={error.message} />}
 *       <button disabled={isLoading}>
 *         {isLoading ? 'Signing in...' : 'Sign In'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 *
 * @module lib/hooks/auth/useAuth
 */

import { useState, useCallback } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys, invalidateScope } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';

import type { AuthError, User } from '@supabase/supabase-js';

/**
 * Result of an auth action
 */
export interface AuthActionResult {
  success: boolean;
  error?: AuthError | Error;
  user?: User;
  message?: string;
}

/**
 * Sign up options
 */
export interface SignUpOptions {
  /** The user's email address */
  email: string;
  /** The user's password (minimum 6 characters) */
  password: string;
  /** The user's full name */
  fullName: string;
  /** Additional metadata to store with the user */
  metadata?: Record<string, unknown>;
}

/**
 * Return type for the useAuth hook
 */
export interface UseAuthReturn {
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  /** Sign up with email, password, and full name */
  signUp: (options: SignUpOptions) => Promise<AuthActionResult>;
  /** Sign out the current user */
  signOut: () => Promise<AuthActionResult>;
  /** Send a password reset email */
  resetPassword: (email: string) => Promise<AuthActionResult>;
  /** Update the current user's password */
  updatePassword: (newPassword: string) => Promise<AuthActionResult>;
  /** True if any auth action is in progress */
  isLoading: boolean;
  /** True if sign in is in progress */
  isSigningIn: boolean;
  /** True if sign up is in progress */
  isSigningUp: boolean;
  /** True if sign out is in progress */
  isSigningOut: boolean;
  /** True if password reset is in progress */
  isResettingPassword: boolean;
  /** True if password update is in progress */
  isUpdatingPassword: boolean;
  /** The last error that occurred, null if none */
  error: Error | null;
  /** Clear the current error state */
  clearError: () => void;
}

/**
 * Hook to manage authentication actions
 *
 * Provides functions for all authentication operations with
 * proper loading and error state management. Uses mutations
 * for predictable async state handling.
 *
 * @returns Object containing auth actions, loading states, and error handling
 */
export function useAuth(): UseAuthReturn {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  /**
   * Clear all auth-related cache after successful auth state change
   */
  const invalidateAuthCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.session });
    queryClient.invalidateQueries({ queryKey: invalidateScope.user() });
  }, [queryClient]);

  /**
   * Sign In Mutation
   */
  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      setError(null);
      invalidateAuthCache();
    },
    onError: (err: AuthError) => {
      setError(err);
    },
  });

  /**
   * Sign Up Mutation
   */
  const signUpMutation = useMutation({
    mutationFn: async ({ email, password, fullName, metadata }: SignUpOptions) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            ...metadata,
          },
          // Email confirmation redirect URL
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      setError(null);
      // Don't invalidate cache here - user needs to confirm email first
    },
    onError: (err: AuthError) => {
      setError(err);
    },
  });

  /**
   * Sign Out Mutation
   */
  const signOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      return true;
    },
    onSuccess: () => {
      setError(null);
      // Clear all cached data on sign out
      queryClient.clear();
    },
    onError: (err: AuthError) => {
      setError(err);
    },
  });

  /**
   * Reset Password Mutation
   */
  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      return true;
    },
    onSuccess: () => {
      setError(null);
    },
    onError: (err: AuthError) => {
      setError(err);
    },
  });

  /**
   * Update Password Mutation
   */
  const updatePasswordMutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      setError(null);
      // Refresh session after password update
      invalidateAuthCache();
    },
    onError: (err: AuthError) => {
      setError(err);
    },
  });

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      try {
        const data = await signInMutation.mutateAsync({ email, password });
        return {
          success: true,
          user: data.user ?? undefined,
        };
      } catch (err) {
        return {
          success: false,
          error: err as AuthError,
        };
      }
    },
    [signInMutation]
  );

  /**
   * Sign up with email, password, and full name
   */
  const signUp = useCallback(
    async (options: SignUpOptions): Promise<AuthActionResult> => {
      try {
        const data = await signUpMutation.mutateAsync(options);

        // Check if email confirmation is required
        if (data.user && !data.session) {
          return {
            success: true,
            user: data.user,
            message: 'Please check your email to confirm your account.',
          };
        }

        return {
          success: true,
          user: data.user ?? undefined,
        };
      } catch (err) {
        return {
          success: false,
          error: err as AuthError,
        };
      }
    },
    [signUpMutation]
  );

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    try {
      await signOutMutation.mutateAsync();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err as AuthError,
      };
    }
  }, [signOutMutation]);

  /**
   * Send a password reset email
   */
  const resetPassword = useCallback(
    async (email: string): Promise<AuthActionResult> => {
      try {
        await resetPasswordMutation.mutateAsync(email);
        return {
          success: true,
          message: 'Password reset email sent. Please check your inbox.',
        };
      } catch (err) {
        return {
          success: false,
          error: err as AuthError,
        };
      }
    },
    [resetPasswordMutation]
  );

  /**
   * Update the current user's password
   */
  const updatePassword = useCallback(
    async (newPassword: string): Promise<AuthActionResult> => {
      try {
        const data = await updatePasswordMutation.mutateAsync(newPassword);
        return {
          success: true,
          user: data.user,
          message: 'Password updated successfully.',
        };
      } catch (err) {
        return {
          success: false,
          error: err as AuthError,
        };
      }
    },
    [updatePasswordMutation]
  );

  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setError(null);
    signInMutation.reset();
    signUpMutation.reset();
    signOutMutation.reset();
    resetPasswordMutation.reset();
    updatePasswordMutation.reset();
  }, [
    signInMutation,
    signUpMutation,
    signOutMutation,
    resetPasswordMutation,
    updatePasswordMutation,
  ]);

  // Compute combined loading state
  const isLoading =
    signInMutation.isPending ||
    signUpMutation.isPending ||
    signOutMutation.isPending ||
    resetPasswordMutation.isPending ||
    updatePasswordMutation.isPending;

  return {
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    isLoading,
    isSigningIn: signInMutation.isPending,
    isSigningUp: signUpMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,
    isUpdatingPassword: updatePasswordMutation.isPending,
    error,
    clearError,
  };
}
