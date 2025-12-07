'use server';

/**
 * Auth Server Actions
 *
 * Server-side authentication actions for the Aymur Platform.
 * These actions use the Supabase server client and handle all
 * authentication operations securely on the server.
 *
 * Key features:
 * - Email/password authentication
 * - OAuth (Google) authentication
 * - Password reset flow
 * - Email verification
 * - Session management
 *
 * All actions return structured results with success/error states.
 *
 * @module lib/actions/auth
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import type { AuthError, Provider, User, Session } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Generic action result type for consistent error handling.
 * All server actions should return this type.
 */
export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; code?: string };

/**
 * Sign in form data structure
 */
export interface SignInFormData {
  email: string;
  password: string;
}

/**
 * Sign up form data structure
 */
export interface SignUpFormData {
  email: string;
  password: string;
  fullName: string;
}

/**
 * Sign in result with optional redirect URL
 */
export interface SignInResult {
  redirectTo?: string;
}

/**
 * Sign up result with verification info
 */
export interface SignUpResult {
  requiresEmailVerification: boolean;
  email: string;
}

/**
 * OAuth sign in result with authorization URL
 */
export interface OAuthSignInResult {
  url: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the base URL for redirects.
 * Uses NEXT_PUBLIC_APP_URL or falls back to localhost for development.
 */
function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url) {
    return url;
  }
  // Fallback for development
  return 'http://localhost:3000';
}

/**
 * Maps Supabase auth errors to user-friendly messages.
 * Prevents exposing internal error details while providing helpful feedback.
 */
function getErrorMessage(error: AuthError): { message: string; code?: string } {
  const code = error.code || error.name;

  switch (error.message) {
    case 'Invalid login credentials':
      return {
        message: 'Invalid email or password. Please check your credentials and try again.',
        code: 'invalid_credentials',
      };
    case 'Email not confirmed':
      return {
        message: 'Please verify your email address before signing in.',
        code: 'email_not_verified',
      };
    case 'User already registered':
      return {
        message: 'An account with this email already exists. Please sign in instead.',
        code: 'user_exists',
      };
    case 'Password should be at least 6 characters':
      return {
        message: 'Password must be at least 6 characters long.',
        code: 'weak_password',
      };
    case 'Unable to validate email address: invalid format':
      return {
        message: 'Please enter a valid email address.',
        code: 'invalid_email',
      };
    case 'For security purposes, you can only request this once every 60 seconds':
      return {
        message: 'Please wait before requesting another email. Try again in a minute.',
        code: 'rate_limit',
      };
    case 'New password should be different from the old password':
      return {
        message: 'Your new password must be different from your current password.',
        code: 'same_password',
      };
    default:
      // Log unexpected errors for debugging but return generic message to user
      console.error('[Auth Action] Unhandled auth error:', {
        message: error.message,
        code,
        status: error.status,
      });
      return {
        message: 'An unexpected error occurred. Please try again later.',
        code: code || 'unknown_error',
      };
  }
}

// =============================================================================
// SIGN IN ACTION (task-053)
// =============================================================================

/**
 * Signs in a user with email and password.
 *
 * Uses the Supabase server client for secure server-side authentication.
 * RLS policies are automatically applied based on the JWT claims.
 *
 * @param formData - The sign in credentials
 * @returns ActionResult with redirect URL on success or error message on failure
 *
 * @example
 * ```tsx
 * const result = await signIn({ email: 'user@example.com', password: 'secret' });
 * if (result.success) {
 *   router.push(result.data?.redirectTo || '/dashboard');
 * } else {
 *   setError(result.error);
 * }
 * ```
 */
export async function signIn(formData: SignInFormData): Promise<ActionResult<SignInResult>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email.toLowerCase().trim(),
      password: formData.password,
    });

    if (error) {
      const { message, code } = getErrorMessage(error);
      return { success: false, error: message, code };
    }

    if (!data.session) {
      return {
        success: false,
        error: 'Failed to create session. Please try again.',
        code: 'session_error',
      };
    }

    // Revalidate to clear any stale cached data
    revalidatePath('/', 'layout');

    return {
      success: true,
      data: {
        redirectTo: '/dashboard',
      },
      message: 'Successfully signed in.',
    };
  } catch (err) {
    console.error('[signIn] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred during sign in.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// SIGN UP ACTION (task-054)
// =============================================================================

/**
 * Registers a new user with email, password, and full name.
 *
 * The database has a trigger that automatically creates a public.users
 * record when a new auth.users record is created, so we only need to
 * handle the Supabase auth signup.
 *
 * Email confirmation is required before the user can sign in.
 *
 * @param formData - The registration details
 * @returns ActionResult with verification status on success or error message on failure
 *
 * @example
 * ```tsx
 * const result = await signUp({
 *   email: 'user@example.com',
 *   password: 'secure_password',
 *   fullName: 'John Doe'
 * });
 * if (result.success && result.data?.requiresEmailVerification) {
 *   showVerificationMessage(result.data.email);
 * }
 * ```
 */
export async function signUp(formData: SignUpFormData): Promise<ActionResult<SignUpResult>> {
  try {
    const supabase = await createClient();
    const email = formData.email.toLowerCase().trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName.trim(),
        },
        emailRedirectTo: `${getBaseUrl()}/auth/callback`,
      },
    });

    if (error) {
      const { message, code } = getErrorMessage(error);
      return { success: false, error: message, code };
    }

    // Check if user was created but needs email confirmation
    // When email confirmation is required, user exists but session is null
    if (data.user && !data.session) {
      return {
        success: true,
        data: {
          requiresEmailVerification: true,
          email,
        },
        message: 'Please check your email to verify your account.',
      };
    }

    // If auto-confirm is enabled (development), user is immediately signed in
    if (data.session) {
      revalidatePath('/', 'layout');
      return {
        success: true,
        data: {
          requiresEmailVerification: false,
          email,
        },
        message: 'Account created successfully. You are now signed in.',
      };
    }

    // Fallback - shouldn't reach here but handle gracefully
    return {
      success: true,
      data: {
        requiresEmailVerification: true,
        email,
      },
      message: 'Account created. Please check your email for verification.',
    };
  } catch (err) {
    console.error('[signUp] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred during registration.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// PASSWORD RESET ACTIONS (task-055)
// =============================================================================

/**
 * Sends a password reset email to the specified address.
 *
 * The email contains a link that redirects to /auth/reset-password
 * with a recovery token.
 *
 * For security, this always returns success even if the email doesn't exist.
 * This prevents email enumeration attacks.
 *
 * @param email - The email address to send the reset link to
 * @returns ActionResult indicating the request was processed
 *
 * @example
 * ```tsx
 * const result = await resetPasswordRequest('user@example.com');
 * if (result.success) {
 *   showMessage('Check your email for reset instructions');
 * }
 * ```
 */
export async function resetPasswordRequest(email: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: `${getBaseUrl()}/auth/reset-password`,
    });

    if (error) {
      // Check for rate limiting
      if (error.message.includes('only request this once every')) {
        const { message, code } = getErrorMessage(error);
        return { success: false, error: message, code };
      }

      // For other errors, log but don't expose to prevent email enumeration
      console.error('[resetPasswordRequest] Error:', error.message);
    }

    // Always return success to prevent email enumeration
    // User won't know if email exists or not
    return {
      success: true,
      message:
        'If an account with that email exists, you will receive password reset instructions.',
    };
  } catch (err) {
    console.error('[resetPasswordRequest] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again later.',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates the password for the currently authenticated user.
 *
 * This is used after the user clicks the reset link in their email
 * and lands on the reset-password page with a valid recovery session.
 *
 * @param newPassword - The new password to set
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await updatePassword('new_secure_password');
 * if (result.success) {
 *   router.push('/login');
 * }
 * ```
 */
export async function updatePassword(newPassword: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Verify user is authenticated (has recovery session)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Your password reset link has expired. Please request a new one.',
        code: 'session_expired',
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      const { message, code } = getErrorMessage(error);
      return { success: false, error: message, code };
    }

    // Revalidate to update cached auth state
    revalidatePath('/', 'layout');

    return {
      success: true,
      message: 'Your password has been updated successfully.',
    };
  } catch (err) {
    console.error('[updatePassword] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while updating your password.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// SIGN OUT ACTION (task-056)
// =============================================================================

/**
 * Signs out the current user and clears the session.
 *
 * Clears all cached data and redirects to the login page.
 * Uses redirect() which throws, so this function never returns normally.
 *
 * @throws {Error} Always throws due to redirect()
 *
 * @example
 * ```tsx
 * <form action={signOut}>
 *   <button type="submit">Sign Out</button>
 * </form>
 * ```
 */
export async function signOut(): Promise<never> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[signOut] Error:', error.message);
    // Still redirect even on error - user wants to leave
  }

  // Clear all cached data
  revalidatePath('/', 'layout');

  // Redirect to login page
  redirect('/login');
}

/**
 * Signs out the current user without redirecting.
 * Useful when you need to handle the redirect yourself.
 *
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await signOutWithoutRedirect();
 * if (result.success) {
 *   // Handle custom post-logout logic
 *   router.push('/goodbye');
 * }
 * ```
 */
export async function signOutWithoutRedirect(): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[signOutWithoutRedirect] Error:', error.message);
      return {
        success: false,
        error: 'Failed to sign out. Please try again.',
        code: 'signout_error',
      };
    }

    // Clear all cached data
    revalidatePath('/', 'layout');

    return {
      success: true,
      message: 'Successfully signed out.',
    };
  } catch (err) {
    console.error('[signOutWithoutRedirect] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred during sign out.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// ADDITIONAL AUTH HELPERS
// =============================================================================

/**
 * Resends the verification email to a user who hasn't confirmed their email.
 *
 * Subject to rate limiting (60 seconds between requests).
 *
 * @param email - The email address to resend verification to
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await resendVerificationEmail('user@example.com');
 * if (!result.success && result.code === 'rate_limit') {
 *   showMessage('Please wait before requesting another email');
 * }
 * ```
 */
export async function resendVerificationEmail(email: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Use signUp with the same email to resend verification
    // This is the recommended approach in Supabase
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: `${getBaseUrl()}/auth/callback`,
      },
    });

    if (error) {
      const { message, code } = getErrorMessage(error);
      return { success: false, error: message, code };
    }

    return {
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    };
  } catch (err) {
    console.error('[resendVerificationEmail] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again later.',
      code: 'unexpected_error',
    };
  }
}

/**
 * Initiates OAuth sign in with a third-party provider.
 *
 * Returns the authorization URL to redirect the user to.
 * After authentication, the user is redirected to /auth/callback.
 *
 * @param provider - The OAuth provider to use (currently 'google')
 * @returns ActionResult with the authorization URL on success
 *
 * @example
 * ```tsx
 * const result = await signInWithOAuth('google');
 * if (result.success && result.data?.url) {
 *   window.location.href = result.data.url;
 * }
 * ```
 */
export async function signInWithOAuth(
  provider: 'google'
): Promise<ActionResult<OAuthSignInResult>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo: `${getBaseUrl()}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('[signInWithOAuth] Error:', error.message);
      return {
        success: false,
        error: `Failed to initiate ${provider} sign in. Please try again.`,
        code: 'oauth_error',
      };
    }

    if (!data.url) {
      return {
        success: false,
        error: 'Failed to generate authorization URL.',
        code: 'oauth_url_error',
      };
    }

    return {
      success: true,
      data: {
        url: data.url,
      },
    };
  } catch (err) {
    console.error('[signInWithOAuth] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again later.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// SESSION HELPERS
// =============================================================================

/**
 * Gets the current authenticated user from the server.
 *
 * Useful for server components that need to check authentication status.
 * This always validates the JWT with Supabase, ensuring security.
 *
 * @returns The authenticated user or null if not authenticated
 *
 * @example
 * ```tsx
 * // In a Server Component
 * const user = await getCurrentUser();
 * if (!user) {
 *   redirect('/login');
 * }
 * ```
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (err) {
    console.error('[getCurrentUser] Error:', err);
    return null;
  }
}

/**
 * Gets the current session from the server.
 *
 * Includes access token, refresh token, and user information.
 * The session is validated with Supabase on each call.
 *
 * @returns The current session or null if not authenticated
 *
 * @example
 * ```tsx
 * const session = await getCurrentSession();
 * if (session?.expires_at && session.expires_at < Date.now() / 1000) {
 *   // Session is expired
 * }
 * ```
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  } catch (err) {
    console.error('[getCurrentSession] Error:', err);
    return null;
  }
}
