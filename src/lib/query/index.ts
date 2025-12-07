/**
 * TanStack Query Configuration
 *
 * Central export point for TanStack Query utilities, client configuration,
 * and query key management for the Aymur Platform.
 *
 * @example
 * // Import query client utilities
 * import { getQueryClient, resetQueryClient } from '@/lib/query';
 *
 * // Import query keys
 * import { queryKeys, invalidateScope } from '@/lib/query';
 *
 * // Import provider for layout
 * import { QueryProvider } from '@/lib/query';
 *
 * // Import hydration utilities
 * import { HydrationBoundary, dehydrate } from '@/lib/query';
 *
 * // Import cache configuration for optimized data fetching
 * import { QUERY_CONFIGS, CACHE_TIMES, getCacheConfigForKey } from '@/lib/query';
 */

// Query client utilities
export { getQueryClient, resetQueryClient, QueryClient } from './client';

// Query key factory and invalidation helpers
export { queryKeys, invalidateScope } from './keys';
export type { QueryKeys, QueryKey } from './keys';

// Provider component and hydration utilities
export { QueryProvider, HydrationBoundary, dehydrate, useQueryClient } from './provider';

// Cache configuration for optimized data fetching
export {
  CACHE_TIMES,
  GC_TIMES,
  QUERY_CONFIGS,
  DOMAIN_CACHE_MAP,
  PREFETCH_CONFIGS,
  getCacheConfigForKey,
} from './cacheConfig';

// Re-export commonly used TanStack Query hooks and utilities
export {
  useQuery,
  useMutation,
  useQueries,
  useInfiniteQuery,
  useSuspenseQuery,
  useSuspenseQueries,
  useSuspenseInfiniteQuery,
  useIsFetching,
  useIsMutating,
  useMutationState,
  keepPreviousData,
  infiniteQueryOptions,
  queryOptions,
} from '@tanstack/react-query';

// Re-export types for convenience
export type {
  UseQueryOptions,
  UseQueryResult,
  UseMutationOptions,
  UseMutationResult,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  UseSuspenseQueryOptions,
  UseSuspenseQueryResult,
  QueryFunction,
  QueryFunctionContext,
  MutationFunction,
  InvalidateQueryFilters,
  QueryFilters,
  Updater,
} from '@tanstack/react-query';
