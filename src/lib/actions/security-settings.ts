'use server';

/**
 * Security Settings Server Actions
 *
 * Server-side actions for user security settings including:
 * - 2FA (TOTP) management using Supabase MFA API
 * - Password change
 * - Login history
 *
 * Uses Supabase's built-in MFA system:
 * - auth.mfa.enroll() - Start TOTP enrollment
 * - auth.mfa.challenge() - Create verification challenge
 * - auth.mfa.verify() - Verify TOTP code
 * - auth.mfa.unenroll() - Disable 2FA
 * - auth.mfa.listFactors() - Get enrolled factors
 * - auth.mfa.getAuthenticatorAssuranceLevel() - Get current AAL
 *
 * @module lib/actions/security-settings
 */

import { createClient } from '@/lib/supabase/server';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Generic action result type for security operations
 */
export type SecurityActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; code?: string };

/**
 * MFA factor information
 */
export interface MfaFactor {
  id: string;
  factorType: 'totp';
  status: 'verified' | 'unverified';
  createdAt: string;
  updatedAt: string;
  friendlyName?: string;
}

/**
 * MFA status response
 */
export interface MfaStatus {
  enabled: boolean;
  factors: MfaFactor[];
  currentLevel: 'aal1' | 'aal2';
  nextLevel: 'aal1' | 'aal2' | null;
}

/**
 * TOTP enrollment response (contains QR code)
 */
export interface TotpEnrollment {
  factorId: string;
  qrCode: string; // SVG string
  secret: string; // For manual entry
  uri: string; // otpauth:// URI
}

/**
 * Login history record
 */
export interface LoginHistoryRecord {
  id: string;
  timestamp: string;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  success: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the current authenticated user
 */
async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

// =============================================================================
// MFA ACTIONS
// =============================================================================

/**
 * Gets the current MFA status for the user
 *
 * Returns information about enrolled factors and current authentication level.
 *
 * @returns MFA status including factors and AAL level
 */
export async function getMfaStatus(): Promise<SecurityActionResult<MfaStatus>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // Get enrolled factors
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      return { success: false, error: factorsError.message, code: 'mfa_error' };
    }

    // Get assurance level
    const { data: aal, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      return { success: false, error: aalError.message, code: 'mfa_error' };
    }

    // Map factors to our interface
    const factors: MfaFactor[] = factorsData.totp.map((f) => ({
      id: f.id,
      factorType: 'totp' as const,
      status: f.status as 'verified' | 'unverified',
      createdAt: f.created_at,
      updatedAt: f.updated_at,
      friendlyName: f.friendly_name ?? undefined,
    }));

    // Check if 2FA is enabled (has verified factors)
    const enabled = factors.some((f) => f.status === 'verified');

    return {
      success: true,
      data: {
        enabled,
        factors,
        currentLevel: aal.currentLevel as 'aal1' | 'aal2',
        nextLevel: aal.nextLevel as 'aal1' | 'aal2' | null,
      },
    };
  } catch (error) {
    console.error('getMfaStatus error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get MFA status',
      code: 'mfa_status_error',
    };
  }
}

/**
 * Starts TOTP enrollment
 *
 * Creates a new TOTP factor and returns QR code for user to scan.
 * User must call verifyTotpEnrollment with a valid code to complete setup.
 *
 * @returns TOTP enrollment data including QR code
 */
export async function enrollTotp(): Promise<SecurityActionResult<TotpEnrollment>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // Enroll new TOTP factor
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    });

    if (error) {
      return { success: false, error: error.message, code: 'enrollment_failed' };
    }

    return {
      success: true,
      data: {
        factorId: data.id,
        qrCode: data.totp.qr_code, // SVG string
        secret: data.totp.secret, // For manual entry
        uri: data.totp.uri, // otpauth:// URI
      },
    };
  } catch (error) {
    console.error('enrollTotp error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enroll TOTP',
      code: 'enrollment_error',
    };
  }
}

/**
 * Verifies TOTP enrollment with a 6-digit code
 *
 * Completes the 2FA setup by verifying the user can generate valid codes.
 *
 * @param factorId - The factor ID from enrollTotp
 * @param code - The 6-digit TOTP code from authenticator app
 * @returns Success or error
 */
export async function verifyTotpEnrollment(
  factorId: string,
  code: string
): Promise<SecurityActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // Create challenge
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError) {
      return { success: false, error: challengeError.message, code: 'challenge_failed' };
    }

    // Verify code
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    if (verifyError) {
      return { success: false, error: verifyError.message, code: 'verification_failed' };
    }

    return { success: true, message: '2FA enabled successfully' };
  } catch (error) {
    console.error('verifyTotpEnrollment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify TOTP',
      code: 'verification_error',
    };
  }
}

/**
 * Disables 2FA by unenrolling the TOTP factor
 *
 * @param factorId - The factor ID to unenroll
 * @returns Success or error
 */
export async function disableTotp(factorId: string): Promise<SecurityActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // Unenroll factor
    const { error } = await supabase.auth.mfa.unenroll({ factorId });

    if (error) {
      return { success: false, error: error.message, code: 'unenroll_failed' };
    }

    // Refresh session to get new AAL level
    await supabase.auth.refreshSession();

    return { success: true, message: '2FA disabled successfully' };
  } catch (error) {
    console.error('disableTotp error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disable TOTP',
      code: 'unenroll_error',
    };
  }
}

// =============================================================================
// PASSWORD ACTIONS
// =============================================================================

/**
 * Changes the user's password
 *
 * Uses Supabase auth.updateUser to change the password.
 *
 * @param newPassword - The new password
 * @returns Success or error
 */
export async function changePassword(newPassword: string): Promise<SecurityActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters',
        code: 'weak_password',
      };
    }

    // Update password
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      return { success: false, error: error.message, code: 'password_change_failed' };
    }

    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    console.error('changePassword error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change password',
      code: 'password_error',
    };
  }
}

// =============================================================================
// LOGIN HISTORY ACTIONS
// =============================================================================

/**
 * Gets the user's login history
 *
 * Fetches recent login attempts from the users_sessions table.
 *
 * @param limit - Maximum number of records to return (default: 20)
 * @returns Array of login history records
 */
export async function getLoginHistory(
  limit: number = 20
): Promise<SecurityActionResult<LoginHistoryRecord[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    const supabase = await createClient();

    // Get user's id_user
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      return { success: false, error: 'User record not found', code: 'user_not_found' };
    }

    // Get login history from sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('users_sessions')
      .select('id_session, created_at, ip_address, user_agent, browser, os, location, is_revoked')
      .eq('id_user', userRecord.id_user)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sessionsError) {
      return { success: false, error: sessionsError.message, code: 'fetch_error' };
    }

    const history: LoginHistoryRecord[] = (sessions || []).map((s) => ({
      id: s.id_session,
      timestamp: s.created_at,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
      browser: s.browser,
      os: s.os,
      location: s.location,
      success: !s.is_revoked, // Treat non-revoked sessions as successful logins
    }));

    return { success: true, data: history };
  } catch (error) {
    console.error('getLoginHistory error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch login history',
      code: 'history_error',
    };
  }
}
