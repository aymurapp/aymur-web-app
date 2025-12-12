'use client';

/**
 * useUserSessions Hook
 *
 * TanStack Query hooks for managing user sessions.
 * Provides session listing, current session identification, and session revocation.
 *
 * Features:
 * - List all active sessions for the current user
 * - Identify the current session
 * - Revoke individual sessions
 * - Revoke all other sessions (security feature)
 *
 * @module lib/hooks/settings/useUserSessions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { ActionResult } from '@/lib/actions/auth';
import type { UserSession as ActionUserSession } from '@/lib/actions/sessions';

// =============================================================================
// TYPES
// =============================================================================

/**
 * User session data - re-exported from actions for consistency
 */
export type UserSession = ActionUserSession;

/**
 * Action result type for session operations - uses ActionResult from auth
 */
export type SessionActionResult<T = void> = ActionResult<T>;

/**
 * Server action functions interface
 * These functions should be implemented in src/lib/actions/sessions.ts
 */
export interface SessionActions {
  getUserSessions: () => Promise<SessionActionResult<UserSession[]>>;
  getCurrentSessionId: () => Promise<string | null>;
  revokeSession: (sessionId: string) => Promise<SessionActionResult>;
  revokeAllOtherSessions: () => Promise<SessionActionResult<{ count: number }>>;
}

// =============================================================================
// QUERY KEY FACTORY
// =============================================================================

/**
 * Query key factory for session-related queries
 */
export const sessionKeys = {
  /** All session queries */
  all: ['user-sessions'] as const,
  /** Current session ID query */
  current: ['user-sessions', 'current'] as const,
} as const;

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to get all user sessions
 *
 * Fetches all active sessions for the current user with device/location info.
 *
 * @param actions - Server action functions for session operations
 * @returns Query result with sessions array
 *
 * @example
 * ```tsx
 * import { getUserSessions, getCurrentSessionId, revokeSession, revokeAllOtherSessions } from '@/lib/actions/sessions';
 *
 * function SessionsList() {
 *   const { data: sessions, isLoading, error } = useUserSessions({
 *     getUserSessions,
 *     getCurrentSessionId,
 *     revokeSession,
 *     revokeAllOtherSessions,
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <ul>
 *       {sessions?.map(session => (
 *         <li key={session.id_session}>{session.browser} - {session.location}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useUserSessions(actions: Pick<SessionActions, 'getUserSessions'>) {
  return useQuery({
    queryKey: sessionKeys.all,
    queryFn: async () => {
      const result = await actions.getUserSessions();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch sessions');
      }
      return result.data ?? [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - sessions can change
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get the current session ID
 *
 * Identifies which session is the current one (useful for highlighting in UI).
 *
 * @param actions - Server action functions for session operations
 * @returns Query result with current session ID
 *
 * @example
 * ```tsx
 * const { data: currentSessionId } = useCurrentSessionId({ getCurrentSessionId });
 * const isCurrentSession = session.id_session === currentSessionId;
 * ```
 */
export function useCurrentSessionId(actions: Pick<SessionActions, 'getCurrentSessionId'>) {
  return useQuery({
    queryKey: sessionKeys.current,
    queryFn: async () => {
      // getCurrentSessionId returns string | null directly, not wrapped in ActionResult
      const sessionId = await actions.getCurrentSessionId();
      return sessionId;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to revoke a specific session
 *
 * Invalidates a session, forcing the user to re-authenticate on that device.
 *
 * @param actions - Server action functions for session operations
 * @returns Mutation for revoking a session
 *
 * @example
 * ```tsx
 * const { mutate: revokeSession, isPending } = useRevokeSession({ revokeSession });
 *
 * const handleRevoke = (sessionId: string) => {
 *   revokeSession(sessionId, {
 *     onSuccess: () => toast.success('Session revoked'),
 *     onError: (error) => toast.error(error.message),
 *   });
 * };
 * ```
 */
export function useRevokeSession(actions: Pick<SessionActions, 'revokeSession'>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const result = await actions.revokeSession(sessionId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to revoke session');
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate sessions list to refresh
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

/**
 * Hook to revoke all sessions except the current one
 *
 * Security feature to log out all other devices at once.
 *
 * @param actions - Server action functions for session operations
 * @returns Mutation for revoking all other sessions
 *
 * @example
 * ```tsx
 * const { mutate: revokeAll, isPending } = useRevokeAllOtherSessions({
 *   revokeAllOtherSessions,
 * });
 *
 * const handleRevokeAll = () => {
 *   revokeAll(undefined, {
 *     onSuccess: (data) => toast.success(`Revoked ${data.data} sessions`),
 *     onError: (error) => toast.error(error.message),
 *   });
 * };
 * ```
 */
export function useRevokeAllOtherSessions(actions: Pick<SessionActions, 'revokeAllOtherSessions'>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await actions.revokeAllOtherSessions();
      if (!result.success) {
        throw new Error(result.error || 'Failed to revoke sessions');
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate sessions list to refresh
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

/**
 * Utility hook to invalidate all session queries
 *
 * Call this after any operation that might affect session state.
 *
 * @returns Object with invalidate function
 */
export function useInvalidateSessions() {
  const queryClient = useQueryClient();

  return {
    /** Invalidate all session queries */
    invalidate: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
    /** Invalidate current session query */
    invalidateCurrent: () => queryClient.invalidateQueries({ queryKey: sessionKeys.current }),
  };
}
