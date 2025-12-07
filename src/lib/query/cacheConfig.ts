/**
 * TanStack Query Cache Configuration
 *
 * Centralized cache timing configuration for different data types.
 * These settings optimize the balance between data freshness and performance.
 *
 * Terminology:
 * - staleTime: How long data is considered "fresh" (no background refetch)
 * - gcTime: How long inactive data stays in cache before garbage collection
 *
 * @module lib/query/cacheConfig
 */

/**
 * Cache timing presets in milliseconds
 */
export const CACHE_TIMES = {
  /** 30 seconds - for very fresh data like notifications */
  VERY_SHORT: 30 * 1000,
  /** 1 minute - default for most queries */
  SHORT: 60 * 1000,
  /** 5 minutes - for moderately stable data */
  MEDIUM: 5 * 60 * 1000,
  /** 15 minutes - for stable reference data */
  LONG: 15 * 60 * 1000,
  /** 1 hour - for rarely changing data */
  VERY_LONG: 60 * 60 * 1000,
  /** 24 hours - for static reference data */
  DAY: 24 * 60 * 60 * 1000,
  /** Forever until manually invalidated */
  INFINITY: Infinity,
} as const;

/**
 * Garbage collection timing (how long to keep inactive queries)
 */
export const GC_TIMES = {
  /** 2 minutes - for frequently changing data */
  SHORT: 2 * 60 * 1000,
  /** 5 minutes - default */
  MEDIUM: 5 * 60 * 1000,
  /** 15 minutes - for stable data */
  LONG: 15 * 60 * 1000,
  /** 1 hour - for reference data */
  VERY_LONG: 60 * 60 * 1000,
} as const;

/**
 * Pre-configured cache options for different data types
 *
 * Usage:
 * ```ts
 * useQuery({
 *   ...QUERY_CONFIGS.staticReference,
 *   queryKey: ['categories', shopId],
 *   queryFn: fetchCategories,
 * })
 * ```
 */
export const QUERY_CONFIGS = {
  /**
   * Real-time data that should always be fresh
   * Examples: notifications, live inventory counts, active sales
   */
  realtime: {
    staleTime: CACHE_TIMES.VERY_SHORT,
    gcTime: GC_TIMES.SHORT,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  /**
   * Frequently changing business data
   * Examples: inventory items, customer balances, recent sales
   */
  dynamic: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.MEDIUM,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  /**
   * Moderately stable data that changes occasionally
   * Examples: customer list, supplier list, expense categories
   */
  standard: {
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  /**
   * Stable reference data that rarely changes
   * Examples: product categories, metal types, stone types
   */
  reference: {
    staleTime: CACHE_TIMES.LONG,
    gcTime: GC_TIMES.LONG,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  /**
   * Static configuration data that almost never changes
   * Examples: system settings, currency codes, country lists
   */
  staticReference: {
    staleTime: CACHE_TIMES.VERY_LONG,
    gcTime: GC_TIMES.VERY_LONG,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  /**
   * User-specific data that should persist for the session
   * Examples: user profile, shop preferences, permissions
   */
  userSession: {
    staleTime: CACHE_TIMES.LONG,
    gcTime: GC_TIMES.VERY_LONG,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  /**
   * Analytics and reports (can be computed on-demand)
   * Examples: sales reports, inventory analytics, dashboard stats
   */
  analytics: {
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  /**
   * Search results (short cache for fresh results)
   * Examples: product search, customer search, global search
   */
  search: {
    staleTime: CACHE_TIMES.VERY_SHORT,
    gcTime: GC_TIMES.SHORT,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  /**
   * Paginated data (optimized for pagination)
   * Examples: inventory list, sales history, customer transactions
   */
  paginated: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.MEDIUM,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Keep previous data while fetching new page
    placeholderData: (previousData: unknown) => previousData,
  },
} as const;

/**
 * Domain-specific cache configurations
 * Maps specific query key prefixes to their optimal cache settings
 */
export const DOMAIN_CACHE_MAP: Record<string, (typeof QUERY_CONFIGS)[keyof typeof QUERY_CONFIGS]> =
  {
    // Real-time data
    notifications: QUERY_CONFIGS.realtime,
    'live-inventory': QUERY_CONFIGS.realtime,

    // Dynamic business data
    inventory: QUERY_CONFIGS.dynamic,
    sales: QUERY_CONFIGS.dynamic,
    purchases: QUERY_CONFIGS.dynamic,
    'customer-balance': QUERY_CONFIGS.dynamic,

    // Standard data
    customers: QUERY_CONFIGS.standard,
    suppliers: QUERY_CONFIGS.standard,
    expenses: QUERY_CONFIGS.standard,
    deliveries: QUERY_CONFIGS.standard,
    reminders: QUERY_CONFIGS.standard,

    // Reference data
    categories: QUERY_CONFIGS.reference,
    'metal-types': QUERY_CONFIGS.reference,
    'stone-types': QUERY_CONFIGS.reference,
    sizes: QUERY_CONFIGS.reference,
    'expense-categories': QUERY_CONFIGS.reference,

    // Static reference
    currencies: QUERY_CONFIGS.staticReference,
    countries: QUERY_CONFIGS.staticReference,
    'system-settings': QUERY_CONFIGS.staticReference,

    // User session
    user: QUERY_CONFIGS.userSession,
    session: QUERY_CONFIGS.userSession,
    permissions: QUERY_CONFIGS.userSession,
    shop: QUERY_CONFIGS.userSession,
    shops: QUERY_CONFIGS.userSession,

    // Analytics
    analytics: QUERY_CONFIGS.analytics,
    reports: QUERY_CONFIGS.analytics,
    dashboard: QUERY_CONFIGS.analytics,
    stats: QUERY_CONFIGS.analytics,

    // Search
    search: QUERY_CONFIGS.search,
    'global-search': QUERY_CONFIGS.search,
  };

/**
 * Get cache configuration for a query key
 *
 * @param queryKey - The query key array
 * @returns Cache configuration object
 *
 * @example
 * const config = getCacheConfigForKey(['customers', shopId]);
 * // Returns QUERY_CONFIGS.standard
 */
export function getCacheConfigForKey(
  queryKey: readonly unknown[]
): (typeof QUERY_CONFIGS)[keyof typeof QUERY_CONFIGS] {
  const firstKey = queryKey[0];

  if (typeof firstKey === 'string') {
    const config = DOMAIN_CACHE_MAP[firstKey];
    if (config) {
      return config;
    }
  }

  // Default to standard config
  return QUERY_CONFIGS.standard;
}

/**
 * Prefetch configuration for common navigation patterns
 * Use with queryClient.prefetchQuery for anticipatory loading
 */
export const PREFETCH_CONFIGS = {
  /** Prefetch on hover with short stale time */
  onHover: {
    staleTime: CACHE_TIMES.SHORT,
  },
  /** Prefetch on route change */
  onNavigate: {
    staleTime: CACHE_TIMES.MEDIUM,
  },
  /** Prefetch for next page in pagination */
  nextPage: {
    staleTime: CACHE_TIMES.SHORT,
  },
} as const;
