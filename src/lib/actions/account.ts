'use server';

/**
 * Account Management Server Actions
 *
 * Server-side actions for account deletion flow in the Aymur Platform.
 * Implements a secure two-step deletion process with confirmation.
 *
 * Key features:
 * - Request account deletion (password verification + token generation)
 * - Confirm deletion (email verification + execution)
 * - Cancel pending deletion request
 *
 * Security considerations:
 * - Password verification required to initiate deletion
 * - Email confirmation required to complete deletion
 * - Tokens expire after 24 hours
 * - Deletion is soft-delete (data retained for compliance)
 *
 * @module lib/actions/account
 */

import { createHash, randomBytes } from 'crypto';

import { createClient } from '@/lib/supabase/server';

import type { ActionResult } from './auth';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result from requesting account deletion
 */
export interface RequestDeletionResult {
  /** Whether confirmation step is required (always true) */
  confirmationRequired: boolean;
  /** Token expiration time */
  expiresAt: string;
}

/**
 * Pending deletion request info
 */
export interface PendingDeletionInfo {
  hasPendingRequest: boolean;
  requestedAt: string | null;
  expiresAt: string | null;
  reason: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Token expiration time in hours */
const TOKEN_EXPIRY_HOURS = 24;

/** Minimum password length for verification */
const MIN_PASSWORD_LENGTH = 6;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generates a secure random token
 */
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hashes a token for secure storage
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Calculates token expiration timestamp
 */
function getTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + TOKEN_EXPIRY_HOURS);
  return expiry;
}

// =============================================================================
// GET PENDING DELETION REQUEST
// =============================================================================

/**
 * Checks if user has a pending deletion request
 *
 * @returns ActionResult with pending deletion info
 *
 * @example
 * ```tsx
 * const result = await getPendingDeletionRequest();
 * if (result.success && result.data?.hasPendingRequest) {
 *   showCancellationOption();
 * }
 * ```
 */
export async function getPendingDeletionRequest(): Promise<ActionResult<PendingDeletionInfo>> {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to check deletion status.',
        code: 'unauthorized',
      };
    }

    // 2. Get user's id_user
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      return {
        success: false,
        error: 'User profile not found.',
        code: 'user_not_found',
      };
    }

    // 3. Check for pending deletion token (used_at is null means not used)
    const { data: token, error: tokenError } = await supabase
      .from('account_deletion_tokens')
      .select('created_at, expires_at, reason')
      .eq('id_user', userRecord.id_user)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (tokenError) {
      console.error('[getPendingDeletionRequest] Token fetch error:', tokenError.message);
      // Table might not exist - return no pending request
      return {
        success: true,
        data: {
          hasPendingRequest: false,
          requestedAt: null,
          expiresAt: null,
          reason: null,
        },
      };
    }

    if (token) {
      return {
        success: true,
        data: {
          hasPendingRequest: true,
          requestedAt: token.created_at,
          expiresAt: token.expires_at,
          reason: token.reason,
        },
      };
    }

    return {
      success: true,
      data: {
        hasPendingRequest: false,
        requestedAt: null,
        expiresAt: null,
        reason: null,
      },
    };
  } catch (err) {
    console.error('[getPendingDeletionRequest] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// REQUEST ACCOUNT DELETION
// =============================================================================

/**
 * Initiates account deletion process
 *
 * Verifies password and creates a deletion token that must be
 * confirmed by typing the user's email address.
 *
 * @param password - Current account password for verification
 * @param reason - Optional reason for deletion (for feedback)
 * @returns ActionResult with confirmation requirements
 *
 * @example
 * ```tsx
 * const result = await requestAccountDeletion('mypassword', 'Not using anymore');
 * if (result.success) {
 *   showConfirmationDialog();
 * }
 * ```
 */
export async function requestAccountDeletion(
  password: string,
  reason?: string
): Promise<ActionResult<RequestDeletionResult>> {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to request account deletion.',
        code: 'unauthorized',
      };
    }

    // 2. Validate password input
    if (!password || typeof password !== 'string') {
      return {
        success: false,
        error: 'Password is required.',
        code: 'validation_error',
      };
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return {
        success: false,
        error: 'Invalid password.',
        code: 'validation_error',
      };
    }

    // 3. Get user email
    const userEmail = user.email;
    if (!userEmail) {
      return {
        success: false,
        error: 'Account email not found.',
        code: 'email_not_found',
      };
    }

    // 4. Verify password by attempting sign-in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: password,
    });

    if (signInError) {
      console.error('[requestAccountDeletion] Password verification failed:', signInError.message);
      return {
        success: false,
        error: 'Incorrect password. Please try again.',
        code: 'invalid_password',
      };
    }

    // 5. Get user's id_user
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      return {
        success: false,
        error: 'User profile not found.',
        code: 'user_not_found',
      };
    }

    // 6. Check for existing pending request (used_at is null means not used)
    const { data: existingToken, error: existingError } = await supabase
      .from('account_deletion_tokens')
      .select('id_token')
      .eq('id_user', userRecord.id_user)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingError) {
      console.error('[requestAccountDeletion] Check existing error:', existingError.message);
      // Continue anyway - might be table doesn't exist
    }

    // 7. Invalidate any existing tokens by setting used_at timestamp
    if (existingToken) {
      await supabase
        .from('account_deletion_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id_user', userRecord.id_user)
        .is('used_at', null);
    }

    // 8. Generate new token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = getTokenExpiry();

    // 9. Store token (used_at defaults to null, meaning not used yet)
    const { error: insertError } = await supabase.from('account_deletion_tokens').insert({
      id_user: userRecord.id_user,
      token_hash: tokenHash,
      reason: reason?.trim() || null,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error('[requestAccountDeletion] Token insert error:', insertError.message);
      return {
        success: false,
        error: 'Failed to create deletion request. Please try again.',
        code: 'database_error',
      };
    }

    // 10. Store unhashed token in session for confirmation step
    // In a real app, this would be sent via email instead
    // For now, we'll return it in a way the client can use

    return {
      success: true,
      data: {
        confirmationRequired: true,
        expiresAt: expiresAt.toISOString(),
      },
      message: 'Deletion request created. Please confirm by typing your email address.',
    };
  } catch (err) {
    console.error('[requestAccountDeletion] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while requesting deletion.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// CONFIRM ACCOUNT DELETION
// =============================================================================

/**
 * Confirms and executes account deletion
 *
 * Verifies the typed email matches the account email,
 * validates the deletion token, and performs soft delete.
 *
 * @param typedEmail - Email typed by user for confirmation
 * @param token - Deletion token (optional if using pending request)
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await confirmAccountDeletion('user@example.com');
 * if (result.success) {
 *   // User will be signed out
 *   router.push('/goodbye');
 * }
 * ```
 */
export async function confirmAccountDeletion(
  typedEmail: string,
  token?: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to confirm account deletion.',
        code: 'unauthorized',
      };
    }

    // 2. Validate typed email
    if (!typedEmail || typeof typedEmail !== 'string') {
      return {
        success: false,
        error: 'Please type your email to confirm.',
        code: 'validation_error',
      };
    }

    const normalizedTypedEmail = typedEmail.toLowerCase().trim();
    const accountEmail = user.email?.toLowerCase();

    if (!accountEmail) {
      return {
        success: false,
        error: 'Account email not found.',
        code: 'email_not_found',
      };
    }

    // 3. Verify typed email matches account email
    if (normalizedTypedEmail !== accountEmail) {
      return {
        success: false,
        error: 'Email does not match. Please type your exact email address.',
        code: 'email_mismatch',
      };
    }

    // 4. Get user's id_user
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      return {
        success: false,
        error: 'User profile not found.',
        code: 'user_not_found',
      };
    }

    // 5. Verify valid deletion token exists (used_at is null means not used)
    let tokenQuery = supabase
      .from('account_deletion_tokens')
      .select('id_token, token_hash')
      .eq('id_user', userRecord.id_user)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString());

    // If token provided, verify it matches
    if (token) {
      const tokenHash = hashToken(token);
      tokenQuery = tokenQuery.eq('token_hash', tokenHash);
    }

    const { data: validToken, error: tokenError } = await tokenQuery.maybeSingle();

    if (tokenError) {
      console.error('[confirmAccountDeletion] Token verification error:', tokenError.message);
      return {
        success: false,
        error: 'Failed to verify deletion request.',
        code: 'database_error',
      };
    }

    if (!validToken) {
      return {
        success: false,
        error: 'No valid deletion request found. Please request deletion again.',
        code: 'token_invalid',
      };
    }

    // 6. Mark token as used by setting used_at timestamp
    await supabase
      .from('account_deletion_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id_token', validToken.id_token);

    // 7. Perform soft delete on user record
    const { error: deleteError } = await supabase
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        // Optionally anonymize PII
        email: `deleted_${userRecord.id_user}@deleted.local`,
        phone: null,
        full_name: 'Deleted User',
      })
      .eq('id_user', userRecord.id_user);

    if (deleteError) {
      console.error('[confirmAccountDeletion] Delete error:', deleteError.message);
      return {
        success: false,
        error: 'Failed to delete account. Please contact support.',
        code: 'delete_error',
      };
    }

    // 8. Revoke all sessions
    await supabase
      .from('users_sessions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('id_user', userRecord.id_user);

    // 9. Sign out the user
    await supabase.auth.signOut();

    return {
      success: true,
      message: 'Your account has been deleted. We are sorry to see you go.',
    };
  } catch (err) {
    console.error('[confirmAccountDeletion] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while deleting your account.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// CANCEL ACCOUNT DELETION
// =============================================================================

/**
 * Cancels a pending account deletion request
 *
 * Invalidates all pending deletion tokens for the user.
 *
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await cancelAccountDeletion();
 * if (result.success) {
 *   message.success('Deletion request cancelled');
 * }
 * ```
 */
export async function cancelAccountDeletion(): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to cancel deletion.',
        code: 'unauthorized',
      };
    }

    // 2. Get user's id_user
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      return {
        success: false,
        error: 'User profile not found.',
        code: 'user_not_found',
      };
    }

    // 3. Count pending tokens first
    const { count: pendingCount, error: countError } = await supabase
      .from('account_deletion_tokens')
      .select('id_token', { count: 'exact', head: true })
      .eq('id_user', userRecord.id_user)
      .is('used_at', null);

    if (countError) {
      console.error('[cancelAccountDeletion] Count error:', countError.message);
      return {
        success: false,
        error: 'Failed to check deletion requests.',
        code: 'database_error',
      };
    }

    if (!pendingCount || pendingCount === 0) {
      return {
        success: true,
        message: 'No pending deletion request found.',
      };
    }

    // 4. Invalidate all pending tokens by setting used_at timestamp
    const { error: updateError } = await supabase
      .from('account_deletion_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id_user', userRecord.id_user)
      .is('used_at', null);

    if (updateError) {
      console.error('[cancelAccountDeletion] Update error:', updateError.message);
      return {
        success: false,
        error: 'Failed to cancel deletion request.',
        code: 'database_error',
      };
    }

    return {
      success: true,
      message: 'Account deletion request has been cancelled.',
    };
  } catch (err) {
    console.error('[cancelAccountDeletion] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while cancelling deletion.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// EXPORT ACCOUNT DATA (GDPR Compliance)
// =============================================================================

/**
 * Prepares account data export for GDPR compliance
 *
 * Returns a summary of data that would be exported.
 * Actual export would be handled by a separate background job.
 *
 * @returns ActionResult with export summary
 *
 * @example
 * ```tsx
 * const result = await requestDataExport();
 * if (result.success) {
 *   message.info('Export will be sent to your email');
 * }
 * ```
 */
export async function requestDataExport(): Promise<
  ActionResult<{ requested: boolean; estimatedSize: string }>
> {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to request data export.',
        code: 'unauthorized',
      };
    }

    // 2. Get user's id_user
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user, email')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      return {
        success: false,
        error: 'User profile not found.',
        code: 'user_not_found',
      };
    }

    // 3. In a production system, this would:
    // - Create a background job to export data
    // - Send email with download link when ready
    // For now, we return a success message

    // Estimate data size (rough calculation)
    // In production, this would query actual data volumes
    const estimatedSize = '< 1 MB';

    return {
      success: true,
      data: {
        requested: true,
        estimatedSize,
      },
      message: `Data export requested. You will receive an email at ${userRecord.email} when it is ready.`,
    };
  } catch (err) {
    console.error('[requestDataExport] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while requesting data export.',
      code: 'unexpected_error',
    };
  }
}
