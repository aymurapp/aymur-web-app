/**
 * TanStack Query Client Configuration
 *
 * This file configures the QueryClient with sensible defaults for the Aymur Platform.
 * It follows the recommended pattern for Next.js App Router to ensure proper
 * server/client separation and avoid cache sharing between requests.
 *
 * Features:
 * - Optimized cache timing for different data types
 * - Smart retry logic with exponential backoff
 * - SSR-compatible dehydration settings
 * - Background refetch optimization
 *
 * @module lib/query/client
 */

import { QueryClient, defaultShouldDehydrateQuery, isServer } from '@tanstack/react-query';

import { CACHE_TIMES, GC_TIMES } from './cacheConfig';

/**
 * Error types that should not trigger retries
 * 4xx errors indicate client-side issues that won't be fixed by retrying
 */
const NON_RETRYABLE_STATUS_CODES = [400, 401, 403, 404, 405, 409, 422];

/**
 * Check if an error is a non-retryable client error
 */
function isNonRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Check for HTTP status codes in error message
    for (const code of NON_RETRYABLE_STATUS_CODES) {
      if (error.message.includes(String(code))) {
        return true;
      }
    }

    // Check for Supabase-specific error codes
    if (
      error.message.includes('PGRST') ||
      error.message.includes('AuthError') ||
      error.message.includes('not found')
    ) {
      return true;
    }
  }

  // Check for error objects with status property
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: number }).status;
    return NON_RETRYABLE_STATUS_CODES.includes(status);
  }

  return false;
}

/**
 * Calculate retry delay with exponential backoff and jitter
 * Starts at 1 second and doubles up to max 30 seconds
 * Adds random jitter to prevent thundering herd
 */
function calculateRetryDelay(attemptIndex: number): number {
  const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000);
  // Add up to 20% jitter
  const jitter = baseDelay * 0.2 * Math.random();
  return baseDelay + jitter;
}

/**
 * Factory function to create a new QueryClient instance
 * with configured defaults for the Aymur Platform
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * Default stale time: 1 minute
         * Data is considered fresh for 1 minute before a background refetch is triggered.
         * This prevents immediate refetching on the client after SSR hydration.
         *
         * Note: Individual queries can override this using QUERY_CONFIGS from cacheConfig.ts
         */
        staleTime: CACHE_TIMES.SHORT,

        /**
         * Garbage collection time: 5 minutes (formerly cacheTime)
         * Unused/inactive cache entries are garbage collected after 5 minutes.
         * This balances memory usage with data availability for navigation.
         */
        gcTime: GC_TIMES.MEDIUM,

        /**
         * Disable refetch on window focus by default
         * This prevents unexpected refetches when users switch tabs,
         * which can be jarring for a business application.
         *
         * Real-time data queries can enable this individually.
         */
        refetchOnWindowFocus: false,

        /**
         * Disable refetch on reconnect by default
         * Let the application control when to refetch after reconnection.
         *
         * Enable for queries that need fresh data after network restoration.
         */
        refetchOnReconnect: false,

        /**
         * Disable refetch on mount when data is fresh
         * If the data is still within staleTime, don't refetch.
         */
        refetchOnMount: true,

        /**
         * Refetch interval: disabled by default
         * Enable on specific queries that need polling (e.g., notifications).
         */
        refetchInterval: false,

        /**
         * Don't refetch in the background when tab is hidden
         * Saves bandwidth and prevents unnecessary server load.
         */
        refetchIntervalInBackground: false,

        /**
         * Network mode: online only
         * Only fetch when online. Use 'offlineFirst' for offline-capable queries.
         */
        networkMode: 'online',

        /**
         * Retry configuration
         * - Don't retry on 4xx errors (client errors)
         * - Retry up to 3 times for other failures
         * - Uses exponential backoff with jitter
         */
        retry: (failureCount, error) => {
          if (isNonRetryableError(error)) {
            return false;
          }
          return failureCount < 3;
        },

        /**
         * Exponential backoff with jitter for retries
         */
        retryDelay: calculateRetryDelay,

        /**
         * Structural sharing for performance
         * Reuses unchanged parts of the previous result to prevent
         * unnecessary re-renders. Enabled by default in TanStack Query v5.
         */
        structuralSharing: true,
      },

      mutations: {
        /**
         * Don't retry mutations by default
         * Mutations should be idempotent, but retrying can cause
         * unexpected duplicate operations in business contexts.
         */
        retry: false,

        /**
         * Network mode: online only for mutations
         * Mutations require network to ensure data consistency.
         */
        networkMode: 'online',

        /**
         * Garbage collection time for mutations: 5 minutes
         * Keep mutation state available for potential rollback or status display.
         */
        gcTime: GC_TIMES.MEDIUM,
      },

      /**
       * Dehydration options for SSR
       * Include pending queries to support streaming SSR in Next.js App Router
       */
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
        /**
         * Don't redact errors - let Next.js handle error boundaries
         * and dynamic page detection
         */
        shouldRedactErrors: () => false,
      },
    },
  });
}

/**
 * Singleton QueryClient for browser-side usage
 * Server-side always gets a fresh client per request
 */
let browserQueryClient: QueryClient | undefined;

/**
 * Get the appropriate QueryClient instance
 *
 * Server: Always returns a new QueryClient to prevent cache sharing between requests
 * Browser: Returns a singleton client to maintain cache across navigations
 *
 * @returns QueryClient instance appropriate for the current environment
 */
export function getQueryClient(): QueryClient {
  if (isServer) {
    // Server: always make a new query client to prevent data leaking between requests
    return makeQueryClient();
  }

  // Browser: make a new query client if we don't already have one
  // This is important to avoid re-creating the client if React
  // suspends during the initial render
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}

/**
 * Reset the browser query client
 * Useful for testing or when user logs out
 */
export function resetQueryClient(): void {
  if (!isServer && browserQueryClient) {
    browserQueryClient.clear();
    browserQueryClient = undefined;
  }
}

export { QueryClient };
