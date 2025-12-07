'use client';

/**
 * useSession Hook
 *
 * Manages the authentication session from Supabase Auth.
 * Subscribes to auth state changes and provides session refresh capability.
 *
 * This hook:
 * - Provides the current auth session
 * - Subscribes to onAuthStateChange for real-time updates
 * - Exposes isAuthenticated boolean for easy checks
 * - Handles session refresh automatically via Supabase
 * - Invalidates user cache on auth state changes
 *
 * @example
 * ```tsx
 * import { useSession } from '@/lib/hooks/auth';
 *
 * function ProtectedRoute({ children }) {
 *   const { isAuthenticated, isLoading, session } = useSession();
 *
 *   if (isLoading) return <Spinner />;
 *   if (!isAuthenticated) return <Navigate to="/login" />;
 *
 *   return children;
 * }
 * ```
 *
 * @module lib/hooks/auth/useSession
 */

import { useEffect, useState, useCallback } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys, invalidateScope } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';

import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

/**
 * Auth state change event types for external consumption
 */
export type AuthEvent = AuthChangeEvent;

/**
 * Callback type for auth state change listeners
 */
export type AuthStateChangeCallback = (event: AuthEvent, session: Session | null) => void;

/**
 * Return type for the useSession hook
 */
export interface UseSessionReturn {
  /** The current auth session, null if not authenticated */
  session: Session | null;
  /** True if the user is authenticated (has a valid session) */
  isAuthenticated: boolean;
  /** True while the session is being loaded */
  isLoading: boolean;
  /** True if the session has been fetched at least once */
  isFetched: boolean;
  /** Error object if session fetch failed */
  error: Error | null;
  /** Manually refresh the session (useful after token expiry) */
  refreshSession: () => Promise<Session | null>;
  /** Subscribe to auth state changes */
  onAuthStateChange: (callback: AuthStateChangeCallback) => () => void;
}

/**
 * Hook to manage the authentication session
 *
 * Provides access to the current Supabase auth session and
 * subscribes to real-time auth state changes. When the auth
 * state changes (sign in, sign out, token refresh), it automatically
 * invalidates the user cache to ensure data consistency.
 *
 * @returns Object containing session data, auth state, and utility functions
 */
export function useSession(): UseSessionReturn {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Track additional listeners registered by consumers
  const [externalListeners] = useState<Set<AuthStateChangeCallback>>(() => new Set());

  // Query for session data
  const {
    data: session,
    isLoading,
    isFetched,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.session,
    queryFn: async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw new Error(`Failed to get session: ${error.message}`);
      }

      return session;
    },
    // Session data is relatively stable, don't refetch too often
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Don't retry session fetches - if it fails, user needs to re-auth
    retry: false,
  });

  // Subscribe to auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Update the session cache
      queryClient.setQueryData(queryKeys.session, newSession);

      // Invalidate user data on relevant auth events
      if (
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'USER_UPDATED' ||
        event === 'TOKEN_REFRESHED'
      ) {
        // Invalidate user cache to refetch with new session
        queryClient.invalidateQueries({ queryKey: invalidateScope.user() });
      }

      // On sign out, clear all cached data
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }

      // Notify external listeners
      externalListeners.forEach((callback) => {
        try {
          callback(event, newSession);
        } catch (err) {
          console.error('Auth state change callback error:', err);
        }
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, queryClient, externalListeners]);

  /**
   * Manually refresh the session
   * Useful when you need to ensure the token is fresh
   */
  const refreshSession = useCallback(async (): Promise<Session | null> => {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('Failed to refresh session:', error.message);
      // If refresh fails, the user needs to re-authenticate
      queryClient.setQueryData(queryKeys.session, null);
      return null;
    }

    // Update the cache with the new session
    queryClient.setQueryData(queryKeys.session, data.session);

    // Refetch the query to ensure consistency
    await refetch();

    return data.session;
  }, [supabase, queryClient, refetch]);

  /**
   * Register an external auth state change listener
   * Returns an unsubscribe function
   */
  const onAuthStateChange = useCallback(
    (callback: AuthStateChangeCallback): (() => void) => {
      externalListeners.add(callback);

      return () => {
        externalListeners.delete(callback);
      };
    },
    [externalListeners]
  );

  return {
    session: session ?? null,
    isAuthenticated: !!session?.user,
    isLoading,
    isFetched,
    error: error as Error | null,
    refreshSession,
    onAuthStateChange,
  };
}

/**
 * Hook to get just the authentication status
 * Lighter weight alternative when you only need to check if user is logged in
 */
export function useIsAuthenticated(): {
  isAuthenticated: boolean;
  isLoading: boolean;
} {
  const { isAuthenticated, isLoading } = useSession();
  return { isAuthenticated, isLoading };
}
