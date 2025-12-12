'use client';

/**
 * useLoginHistory Hook
 *
 * TanStack Query hook for fetching user login history.
 * Provides access to historical login records including successful
 * and failed login attempts.
 *
 * Features:
 * - View login history with pagination
 * - Filter by date range
 * - Track successful and failed attempts
 * - Detect suspicious login activity
 *
 * @module lib/hooks/settings/useLoginHistory
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Login history record
 */
export interface LoginHistoryRecord {
  /** Unique identifier */
  id_login: string;
  /** User ID */
  id_user: string;
  /** Whether the login was successful */
  success: boolean;
  /** Login method (password, oauth_google, etc.) */
  login_method: string;
  /** IP address of the login attempt */
  ip_address: string | null;
  /** User agent string */
  user_agent: string | null;
  /** Parsed device type */
  device_type: string | null;
  /** Parsed browser name */
  browser: string | null;
  /** Parsed operating system */
  os: string | null;
  /** Geographic location based on IP */
  location: string | null;
  /** Country code */
  country_code: string | null;
  /** City name */
  city: string | null;
  /** Failure reason if unsuccessful */
  failure_reason: string | null;
  /** Whether this was flagged as suspicious */
  is_suspicious: boolean;
  /** Timestamp of the login attempt */
  created_at: string;
}

/**
 * Action result type for login history operations
 */
export interface LoginHistoryActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Options for fetching login history
 */
export interface LoginHistoryOptions {
  /** Maximum number of records to return */
  limit?: number;
  /** Number of records to skip (for pagination) */
  offset?: number;
  /** Only show successful logins */
  successOnly?: boolean;
  /** Only show failed logins */
  failedOnly?: boolean;
  /** Start date for filtering */
  startDate?: string;
  /** End date for filtering */
  endDate?: string;
}

/**
 * Server action functions interface
 * These functions should be implemented in src/lib/actions/login-history.ts
 */
export interface LoginHistoryActions {
  getLoginHistory: (
    options?: LoginHistoryOptions
  ) => Promise<LoginHistoryActionResult<LoginHistoryRecord[]>>;
}

// =============================================================================
// QUERY KEY FACTORY
// =============================================================================

/**
 * Query key factory for login history queries
 */
export const loginHistoryKeys = {
  /** All login history queries */
  all: ['login-history'] as const,
  /** Login history with specific options */
  list: (options?: LoginHistoryOptions) =>
    options ? (['login-history', options] as const) : (['login-history'] as const),
} as const;

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to get login history
 *
 * Fetches login history records for the current user with optional filtering.
 *
 * @param actions - Server action functions for login history operations
 * @param options - Optional filtering and pagination options
 * @returns Query result with login history records
 *
 * @example
 * ```tsx
 * import { getLoginHistory } from '@/lib/actions/login-history';
 *
 * function LoginHistoryList() {
 *   const { data: history, isLoading, error } = useLoginHistory(
 *     { getLoginHistory },
 *     { limit: 10 }
 *   );
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <ul>
 *       {history?.map(record => (
 *         <li key={record.id_login}>
 *           {record.success ? 'Success' : 'Failed'} - {record.browser} - {record.location}
 *           <time>{new Date(record.created_at).toLocaleString()}</time>
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useLoginHistory(
  actions: Pick<LoginHistoryActions, 'getLoginHistory'>,
  options?: LoginHistoryOptions
) {
  return useQuery({
    queryKey: loginHistoryKeys.list(options),
    queryFn: async () => {
      const result = await actions.getLoginHistory(options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch login history');
      }
      return result.data ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to get recent login history (last 10 by default)
 *
 * Convenience wrapper for common use case of showing recent logins.
 *
 * @param actions - Server action functions for login history operations
 * @param limit - Number of recent records to fetch (default: 10)
 * @returns Query result with recent login history records
 *
 * @example
 * ```tsx
 * const { data: recentLogins } = useRecentLoginHistory({ getLoginHistory }, 5);
 * ```
 */
export function useRecentLoginHistory(
  actions: Pick<LoginHistoryActions, 'getLoginHistory'>,
  limit: number = 10
) {
  return useLoginHistory(actions, { limit });
}

/**
 * Hook to get failed login attempts
 *
 * Useful for security monitoring to show recent failed login attempts.
 *
 * @param actions - Server action functions for login history operations
 * @param limit - Number of records to fetch
 * @returns Query result with failed login records
 *
 * @example
 * ```tsx
 * const { data: failedLogins } = useFailedLoginAttempts({ getLoginHistory }, 5);
 *
 * if (failedLogins && failedLogins.length > 0) {
 *   // Show security warning
 * }
 * ```
 */
export function useFailedLoginAttempts(
  actions: Pick<LoginHistoryActions, 'getLoginHistory'>,
  limit: number = 5
) {
  return useLoginHistory(actions, { limit, failedOnly: true });
}

/**
 * Hook to get suspicious login activity
 *
 * Returns only login attempts flagged as suspicious.
 *
 * @param actions - Server action functions for login history operations
 * @returns Query result with suspicious login records
 */
export function useSuspiciousLogins(actions: Pick<LoginHistoryActions, 'getLoginHistory'>) {
  const query = useLoginHistory(actions, { limit: 20 });

  return {
    ...query,
    data: query.data?.filter((record) => record.is_suspicious) ?? [],
  };
}

/**
 * Utility hook to invalidate login history queries
 *
 * Call this after any operation that might add new login records.
 *
 * @returns Object with invalidate function
 */
export function useInvalidateLoginHistory() {
  const queryClient = useQueryClient();

  return {
    /** Invalidate all login history queries */
    invalidate: () => queryClient.invalidateQueries({ queryKey: loginHistoryKeys.all }),
  };
}
