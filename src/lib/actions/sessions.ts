'use server';

/**
 * Session Management Server Actions
 *
 * Server-side actions for managing user sessions in the Aymur Platform.
 * Handles session listing, revocation, and login history retrieval.
 *
 * Key features:
 * - List active sessions with device/location info
 * - Identify current session
 * - Revoke individual or all other sessions
 * - View login history
 *
 * Security considerations:
 * - All actions verify user authentication
 * - Session token hashes are compared for current session detection
 * - Soft delete pattern used for session revocation
 *
 * @module lib/actions/sessions
 */

import { cookies } from 'next/headers';

import { createHash } from 'crypto';

import { createClient } from '@/lib/supabase/server';
import { getRequestMetadata, formatDeviceInfo } from '@/lib/utils/request-metadata';

import type { ActionResult } from './auth';

// =============================================================================
// TYPES
// =============================================================================

/**
 * User session data for display
 */
export interface UserSession {
  id_session: string;
  device_info: string | null;
  ip_address: string | null;
  user_agent: string | null;
  browser: string | null;
  os: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  location: string | null;
  is_current: boolean;
  is_trusted_device: boolean;
  created_at: string;
  last_activity_at: string | null;
  expires_at: string;
}

/**
 * Login attempt record
 */
export interface LoginAttempt {
  id_attempt: string;
  identifier: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  failure_reason: string | null;
  created_at: string;
  device_info: string | null;
  location: string | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generates SHA-256 hash of a token
 * Used to match current session without storing raw tokens
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Extracts access token from cookies
 * Supabase stores the token in a cookie with project ref prefix
 */
async function getAccessTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // Find the Supabase auth token cookie
  // Format: sb-<project-ref>-auth-token or similar
  for (const cookie of allCookies) {
    if (cookie.name.includes('auth-token') && cookie.value) {
      try {
        // The cookie value may be base64 encoded JSON
        const decoded = JSON.parse(cookie.value);
        if (decoded.access_token) {
          return decoded.access_token;
        }
      } catch {
        // If not JSON, might be the token itself
        if (cookie.value.includes('.')) {
          return cookie.value;
        }
      }
    }
  }

  return null;
}

/**
 * Parses device info from stored user_agent string
 */
function parseDeviceInfo(userAgent: string | null): {
  browser: string | null;
  os: string | null;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
} {
  if (!userAgent) {
    return { browser: null, os: null, deviceType: 'unknown' };
  }

  // Simple parsing - more comprehensive parsing is in request-metadata.ts
  let browser: string | null = null;
  let os: string | null = null;
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';

  // Browser detection
  if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
    browser = 'Opera';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
  }

  // OS detection
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS X')) {
    os = 'macOS';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  }

  // Device type detection
  if (/iPad|tablet|playbook/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|android.*mobile/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/windows|macintosh|linux/i.test(userAgent)) {
    deviceType = 'desktop';
  }

  return { browser, os, deviceType };
}

// =============================================================================
// GET USER SESSIONS
// =============================================================================

/**
 * Retrieves all active sessions for the current user
 *
 * Returns sessions with device and location information.
 * Marks the current session for UI highlighting.
 *
 * @returns ActionResult with array of user sessions
 *
 * @example
 * ```tsx
 * const result = await getUserSessions();
 * if (result.success) {
 *   result.data?.forEach(session => {
 *     console.log(session.device_info, session.is_current);
 *   });
 * }
 * ```
 */
export async function getUserSessions(): Promise<ActionResult<UserSession[]>> {
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
        error: 'You must be logged in to view sessions.',
        code: 'unauthorized',
      };
    }

    // 2. Get user's id_user from users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      console.error('[getUserSessions] User record not found:', userError?.message);
      return {
        success: false,
        error: 'User profile not found.',
        code: 'user_not_found',
      };
    }

    // 3. Fetch active sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('users_sessions')
      .select(
        `
        id_session,
        device_info,
        ip_address,
        user_agent,
        country,
        country_code,
        region,
        city,
        is_trusted_device,
        session_token_hash,
        created_at,
        last_activity_at,
        expires_at
      `
      )
      .eq('id_user', userRecord.id_user)
      .eq('is_active', true)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('last_activity_at', { ascending: false, nullsFirst: false });

    if (sessionsError) {
      console.error('[getUserSessions] Database error:', sessionsError.message);
      return {
        success: false,
        error: 'Failed to fetch sessions.',
        code: 'database_error',
      };
    }

    // 4. Get current session ID for comparison
    const currentSessionId = await getCurrentSessionId();

    // 5. Transform sessions for response
    const userSessions: UserSession[] = (sessions || []).map((session) => {
      const deviceInfo = parseDeviceInfo(session.user_agent);
      const locationParts: string[] = [];

      if (session.city) {
        locationParts.push(session.city);
      }
      if (session.region) {
        locationParts.push(session.region);
      }
      if (session.country_code) {
        locationParts.push(session.country_code);
      }

      return {
        id_session: session.id_session,
        device_info: session.device_info,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        device_type: deviceInfo.deviceType,
        country: session.country,
        country_code: session.country_code,
        region: session.region,
        city: session.city,
        location: locationParts.length > 0 ? locationParts.join(', ') : null,
        is_current: session.id_session === currentSessionId,
        is_trusted_device: session.is_trusted_device || false,
        created_at: session.created_at,
        last_activity_at: session.last_activity_at,
        expires_at: session.expires_at,
      };
    });

    return {
      success: true,
      data: userSessions,
    };
  } catch (err) {
    console.error('[getUserSessions] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while fetching sessions.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GET CURRENT SESSION ID
// =============================================================================

/**
 * Identifies the current session by matching token hash
 *
 * Extracts the access token from cookies and compares its hash
 * against stored session_token_hash values.
 *
 * @returns Session ID if found, null otherwise
 *
 * @example
 * ```tsx
 * const sessionId = await getCurrentSessionId();
 * if (sessionId) {
 *   console.log('Current session:', sessionId);
 * }
 * ```
 */
export async function getCurrentSessionId(): Promise<string | null> {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // 2. Get user's id_user
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      return null;
    }

    // 3. Get current access token and hash it
    const accessToken = await getAccessTokenFromCookies();
    if (!accessToken) {
      return null;
    }

    const tokenHash = hashToken(accessToken);

    // 4. Find session with matching hash
    const { data: session, error: sessionError } = await supabase
      .from('users_sessions')
      .select('id_session')
      .eq('id_user', userRecord.id_user)
      .eq('session_token_hash', tokenHash)
      .eq('is_active', true)
      .is('revoked_at', null)
      .maybeSingle();

    if (sessionError || !session) {
      return null;
    }

    return session.id_session;
  } catch (err) {
    console.error('[getCurrentSessionId] Error:', err);
    return null;
  }
}

// =============================================================================
// REVOKE SESSION
// =============================================================================

/**
 * Revokes a specific session (soft delete)
 *
 * Marks the session as inactive and sets revoked_at timestamp.
 * Cannot revoke the current session - use sign out instead.
 *
 * @param sessionId - The session ID to revoke
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await revokeSession('session-uuid');
 * if (result.success) {
 *   message.success('Session revoked');
 * }
 * ```
 */
export async function revokeSession(sessionId: string): Promise<ActionResult<void>> {
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
        error: 'You must be logged in to revoke sessions.',
        code: 'unauthorized',
      };
    }

    // 2. Validate session ID
    if (!sessionId || typeof sessionId !== 'string') {
      return {
        success: false,
        error: 'Invalid session ID.',
        code: 'validation_error',
      };
    }

    // 3. Get user's id_user
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

    // 4. Check if this is the current session
    const currentSessionId = await getCurrentSessionId();
    if (sessionId === currentSessionId) {
      return {
        success: false,
        error: 'Cannot revoke the current session. Please sign out instead.',
        code: 'cannot_revoke_current',
      };
    }

    // 5. Verify session belongs to user and is active
    const { data: session, error: sessionError } = await supabase
      .from('users_sessions')
      .select('id_session, is_active')
      .eq('id_session', sessionId)
      .eq('id_user', userRecord.id_user)
      .single();

    if (sessionError || !session) {
      return {
        success: false,
        error: 'Session not found.',
        code: 'session_not_found',
      };
    }

    if (!session.is_active) {
      return {
        success: false,
        error: 'Session is already inactive.',
        code: 'session_already_revoked',
      };
    }

    // 6. Revoke the session
    const { error: updateError } = await supabase
      .from('users_sessions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('id_session', sessionId)
      .eq('id_user', userRecord.id_user);

    if (updateError) {
      console.error('[revokeSession] Update error:', updateError.message);
      return {
        success: false,
        error: 'Failed to revoke session.',
        code: 'database_error',
      };
    }

    return {
      success: true,
      message: 'Session revoked successfully.',
    };
  } catch (err) {
    console.error('[revokeSession] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while revoking the session.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// REVOKE ALL OTHER SESSIONS
// =============================================================================

/**
 * Revokes all sessions except the current one
 *
 * Useful for "Sign out everywhere else" functionality.
 * Returns the count of revoked sessions.
 *
 * @returns ActionResult with count of revoked sessions
 *
 * @example
 * ```tsx
 * const result = await revokeAllOtherSessions();
 * if (result.success) {
 *   message.success(`Revoked ${result.data?.count} sessions`);
 * }
 * ```
 */
export async function revokeAllOtherSessions(): Promise<ActionResult<{ count: number }>> {
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
        error: 'You must be logged in to revoke sessions.',
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

    // 3. Get current session ID to exclude
    const currentSessionId = await getCurrentSessionId();

    // 4. Count sessions to be revoked
    let query = supabase
      .from('users_sessions')
      .select('id_session', { count: 'exact', head: true })
      .eq('id_user', userRecord.id_user)
      .eq('is_active', true)
      .is('revoked_at', null);

    if (currentSessionId) {
      query = query.neq('id_session', currentSessionId);
    }

    const { count: sessionsToRevoke, error: countError } = await query;

    if (countError) {
      console.error('[revokeAllOtherSessions] Count error:', countError.message);
      return {
        success: false,
        error: 'Failed to count sessions.',
        code: 'database_error',
      };
    }

    if (!sessionsToRevoke || sessionsToRevoke === 0) {
      return {
        success: true,
        data: { count: 0 },
        message: 'No other active sessions found.',
      };
    }

    // 5. Revoke all other sessions
    let updateQuery = supabase
      .from('users_sessions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('id_user', userRecord.id_user)
      .eq('is_active', true)
      .is('revoked_at', null);

    if (currentSessionId) {
      updateQuery = updateQuery.neq('id_session', currentSessionId);
    }

    const { error: updateError } = await updateQuery;

    if (updateError) {
      console.error('[revokeAllOtherSessions] Update error:', updateError.message);
      return {
        success: false,
        error: 'Failed to revoke sessions.',
        code: 'database_error',
      };
    }

    return {
      success: true,
      data: { count: sessionsToRevoke },
      message: `Successfully revoked ${sessionsToRevoke} session${sessionsToRevoke === 1 ? '' : 's'}.`,
    };
  } catch (err) {
    console.error('[revokeAllOtherSessions] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while revoking sessions.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GET LOGIN HISTORY
// =============================================================================

/**
 * Retrieves login attempt history for the current user
 *
 * Returns both successful and failed login attempts,
 * useful for security auditing.
 *
 * @param limit - Maximum number of attempts to return (default: 20)
 * @returns ActionResult with array of login attempts
 *
 * @example
 * ```tsx
 * const result = await getLoginHistory(10);
 * if (result.success) {
 *   result.data?.forEach(attempt => {
 *     console.log(attempt.success ? 'Success' : 'Failed', attempt.created_at);
 *   });
 * }
 * ```
 */
export async function getLoginHistory(limit: number = 20): Promise<ActionResult<LoginAttempt[]>> {
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
        error: 'You must be logged in to view login history.',
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

    // 3. Validate limit
    const safeLimit = Math.min(Math.max(1, limit), 100);

    // 4. Fetch login attempts
    // Query by both id_user (for linked attempts) and identifier (email)
    const { data: attempts, error: attemptsError } = await supabase
      .from('login_attempts')
      .select(
        `
        id_attempt,
        identifier,
        ip_address,
        user_agent,
        success,
        failure_reason,
        created_at
      `
      )
      .or(`id_user.eq.${userRecord.id_user},identifier.eq.${userRecord.email}`)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (attemptsError) {
      console.error('[getLoginHistory] Database error:', attemptsError.message);
      return {
        success: false,
        error: 'Failed to fetch login history.',
        code: 'database_error',
      };
    }

    // 5. Transform attempts for response
    const loginAttempts: LoginAttempt[] = (attempts || []).map((attempt) => {
      const deviceInfo = parseDeviceInfo(attempt.user_agent);
      const deviceStr = deviceInfo.browser
        ? `${deviceInfo.browser}${deviceInfo.os ? ` on ${deviceInfo.os}` : ''}`
        : null;

      return {
        id_attempt: attempt.id_attempt,
        identifier: attempt.identifier,
        ip_address: attempt.ip_address ? String(attempt.ip_address) : null,
        user_agent: attempt.user_agent,
        success: attempt.success,
        failure_reason: attempt.failure_reason,
        created_at: attempt.created_at,
        device_info: deviceStr,
        location: null, // Login attempts don't store location currently
      };
    });

    return {
      success: true,
      data: loginAttempts,
    };
  } catch (err) {
    console.error('[getLoginHistory] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while fetching login history.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// CREATE SESSION (Helper for auth flows)
// =============================================================================

/**
 * Creates a new session record for the current user
 *
 * Should be called after successful authentication to track
 * the session with device and location information.
 *
 * @param accessToken - The access token to hash and store
 * @returns ActionResult with the created session ID
 *
 * @example
 * ```typescript
 * // Called internally after sign-in
 * const result = await createSession(session.access_token);
 * ```
 */
export async function createSession(
  accessToken: string
): Promise<ActionResult<{ sessionId: string }>> {
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
        error: 'Authentication required.',
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

    // 3. Get request metadata
    const metadata = await getRequestMetadata();

    // 4. Hash the access token
    const tokenHash = hashToken(accessToken);

    // 5. Calculate expiration (default 1 hour, matching Supabase default)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // 6. Create session record
    const { data: session, error: insertError } = await supabase
      .from('users_sessions')
      .insert({
        id_user: userRecord.id_user,
        session_token_hash: tokenHash,
        ip_address: metadata.ipAddress,
        user_agent: metadata.userAgent,
        device_info: formatDeviceInfo(metadata),
        country: metadata.country,
        country_code: metadata.countryCode,
        region: metadata.region,
        city: metadata.city,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        is_trusted_device: false,
      })
      .select('id_session')
      .single();

    if (insertError || !session) {
      console.error('[createSession] Insert error:', insertError?.message);
      return {
        success: false,
        error: 'Failed to create session record.',
        code: 'database_error',
      };
    }

    return {
      success: true,
      data: { sessionId: session.id_session },
    };
  } catch (err) {
    console.error('[createSession] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while creating session.',
      code: 'unexpected_error',
    };
  }
}
