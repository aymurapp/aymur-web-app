/**
 * useInventoryFilters Hook
 *
 * A hook for managing inventory filter state with URL synchronization,
 * validation via Zod schema, and persistence options.
 *
 * @module lib/hooks/data/useInventoryFilters
 */

'use client';

import { useCallback, useMemo, useState } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import {
  inventoryFilterSchema,
  type InventoryFilterInput,
  type InventoryStatus,
  type ItemType,
  type OwnershipType,
  type SourceType,
  type GoldColor,
} from '@/lib/utils/schemas/inventory';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Filter state with all possible filter values
 */
export type InventoryFiltersState = InventoryFilterInput;

/**
 * Default filter values
 */
export const DEFAULT_INVENTORY_FILTERS: InventoryFiltersState = {
  search: undefined,
  status: undefined,
  item_type: undefined,
  ownership_type: undefined,
  source_type: undefined,
  gold_color: undefined,
  id_category: undefined,
  id_metal_type: undefined,
  id_metal_purity: undefined,
  id_stone_type: undefined,
  price_range: undefined,
  weight_range: undefined,
  created_from: undefined,
  created_to: undefined,
  has_barcode: undefined,
  has_stones: undefined,
  has_certifications: undefined,
  sort_by: 'created_at',
  sort_order: 'desc',
  page: 1,
  page_size: 20,
};

/**
 * Options for the useInventoryFilters hook
 */
export interface UseInventoryFiltersOptions {
  /** Initial filter values */
  initialFilters?: Partial<InventoryFiltersState>;
  /** Whether to sync filters with URL search params */
  syncWithUrl?: boolean;
  /** Default page size */
  defaultPageSize?: number;
  /** Callback when filters change */
  onFiltersChange?: (filters: InventoryFiltersState) => void;
}

/**
 * Return type for the useInventoryFilters hook
 */
export interface UseInventoryFiltersReturn {
  /** Current filter state */
  filters: InventoryFiltersState;

  /** Set a specific filter value */
  setFilter: <K extends keyof InventoryFiltersState>(
    key: K,
    value: InventoryFiltersState[K]
  ) => void;

  /** Set multiple filters at once */
  setFilters: (filters: Partial<InventoryFiltersState>) => void;

  /** Reset all filters to defaults */
  resetFilters: () => void;

  /** Reset filters but keep pagination */
  resetFilterValues: () => void;

  /** Clear a specific filter */
  clearFilter: (key: keyof InventoryFiltersState) => void;

  // Pagination helpers
  /** Go to a specific page */
  setPage: (page: number) => void;

  /** Go to next page */
  nextPage: () => void;

  /** Go to previous page */
  prevPage: () => void;

  /** Set page size */
  setPageSize: (size: number) => void;

  // Search helpers
  /** Set search query */
  setSearch: (search: string) => void;

  /** Clear search query */
  clearSearch: () => void;

  // Sorting helpers
  /** Set sort field and direction */
  setSort: (sortBy: InventoryFiltersState['sort_by'], sortOrder?: 'asc' | 'desc') => void;

  /** Toggle sort direction for current field */
  toggleSortDirection: () => void;

  // Multi-value filter helpers
  /** Add a value to a multi-select filter */
  addFilterValue: <K extends keyof InventoryFiltersState>(key: K, value: string) => void;

  /** Remove a value from a multi-select filter */
  removeFilterValue: <K extends keyof InventoryFiltersState>(key: K, value: string) => void;

  /** Check if a filter has any active values */
  hasActiveFilters: boolean;

  /** Count of active filters (excluding pagination and sorting) */
  activeFilterCount: number;

  /** Validate current filters against schema */
  validateFilters: () => { success: boolean; errors?: string[] };
}

// =============================================================================
// URL SERIALIZATION HELPERS
// =============================================================================

/**
 * Serialize filters to URL search params
 */
function filtersToSearchParams(filters: InventoryFiltersState): URLSearchParams {
  const params = new URLSearchParams();

  // Only add non-default values
  if (filters.search) {
    params.set('search', filters.search);
  }

  if (filters.status && filters.status.length > 0) {
    params.set('status', filters.status.join(','));
  }

  if (filters.item_type && filters.item_type.length > 0) {
    params.set('item_type', filters.item_type.join(','));
  }

  if (filters.ownership_type && filters.ownership_type.length > 0) {
    params.set('ownership_type', filters.ownership_type.join(','));
  }

  if (filters.source_type && filters.source_type.length > 0) {
    params.set('source_type', filters.source_type.join(','));
  }

  if (filters.gold_color && filters.gold_color.length > 0) {
    params.set('gold_color', filters.gold_color.join(','));
  }

  if (filters.id_category && filters.id_category.length > 0) {
    params.set('category', filters.id_category.join(','));
  }

  if (filters.id_metal_type && filters.id_metal_type.length > 0) {
    params.set('metal_type', filters.id_metal_type.join(','));
  }

  if (filters.id_metal_purity && filters.id_metal_purity.length > 0) {
    params.set('metal_purity', filters.id_metal_purity.join(','));
  }

  if (filters.id_stone_type && filters.id_stone_type.length > 0) {
    params.set('stone_type', filters.id_stone_type.join(','));
  }

  if (filters.price_range) {
    if (filters.price_range.min !== undefined) {
      params.set('price_min', String(filters.price_range.min));
    }
    if (filters.price_range.max !== undefined) {
      params.set('price_max', String(filters.price_range.max));
    }
  }

  if (filters.weight_range) {
    if (filters.weight_range.min !== undefined) {
      params.set('weight_min', String(filters.weight_range.min));
    }
    if (filters.weight_range.max !== undefined) {
      params.set('weight_max', String(filters.weight_range.max));
    }
  }

  if (filters.created_from) {
    params.set('created_from', filters.created_from);
  }

  if (filters.created_to) {
    params.set('created_to', filters.created_to);
  }

  if (filters.has_barcode !== undefined) {
    params.set('has_barcode', String(filters.has_barcode));
  }

  if (filters.has_stones !== undefined) {
    params.set('has_stones', String(filters.has_stones));
  }

  if (filters.has_certifications !== undefined) {
    params.set('has_certifications', String(filters.has_certifications));
  }

  if (filters.sort_by && filters.sort_by !== 'created_at') {
    params.set('sort_by', filters.sort_by);
  }

  if (filters.sort_order && filters.sort_order !== 'desc') {
    params.set('sort_order', filters.sort_order);
  }

  if (filters.page && filters.page !== 1) {
    params.set('page', String(filters.page));
  }

  if (filters.page_size && filters.page_size !== 20) {
    params.set('page_size', String(filters.page_size));
  }

  return params;
}

/**
 * Parse URL search params to filters
 */
function searchParamsToFilters(searchParams: URLSearchParams): Partial<InventoryFiltersState> {
  const filters: Partial<InventoryFiltersState> = {};

  const search = searchParams.get('search');
  if (search) {
    filters.search = search;
  }

  const status = searchParams.get('status');
  if (status) {
    filters.status = status.split(',') as InventoryStatus[];
  }

  const itemType = searchParams.get('item_type');
  if (itemType) {
    filters.item_type = itemType.split(',') as ItemType[];
  }

  const ownershipType = searchParams.get('ownership_type');
  if (ownershipType) {
    filters.ownership_type = ownershipType.split(',') as OwnershipType[];
  }

  const sourceType = searchParams.get('source_type');
  if (sourceType) {
    filters.source_type = sourceType.split(',') as SourceType[];
  }

  const goldColor = searchParams.get('gold_color');
  if (goldColor) {
    filters.gold_color = goldColor.split(',') as GoldColor[];
  }

  const category = searchParams.get('category');
  if (category) {
    filters.id_category = category.split(',');
  }

  const metalType = searchParams.get('metal_type');
  if (metalType) {
    filters.id_metal_type = metalType.split(',');
  }

  const metalPurity = searchParams.get('metal_purity');
  if (metalPurity) {
    filters.id_metal_purity = metalPurity.split(',');
  }

  const stoneType = searchParams.get('stone_type');
  if (stoneType) {
    filters.id_stone_type = stoneType.split(',');
  }

  const priceMin = searchParams.get('price_min');
  const priceMax = searchParams.get('price_max');
  if (priceMin || priceMax) {
    filters.price_range = {
      min: priceMin ? parseFloat(priceMin) : undefined,
      max: priceMax ? parseFloat(priceMax) : undefined,
    };
  }

  const weightMin = searchParams.get('weight_min');
  const weightMax = searchParams.get('weight_max');
  if (weightMin || weightMax) {
    filters.weight_range = {
      min: weightMin ? parseFloat(weightMin) : undefined,
      max: weightMax ? parseFloat(weightMax) : undefined,
    };
  }

  const createdFrom = searchParams.get('created_from');
  if (createdFrom) {
    filters.created_from = createdFrom;
  }

  const createdTo = searchParams.get('created_to');
  if (createdTo) {
    filters.created_to = createdTo;
  }

  const hasBarcode = searchParams.get('has_barcode');
  if (hasBarcode) {
    filters.has_barcode = hasBarcode === 'true';
  }

  const hasStones = searchParams.get('has_stones');
  if (hasStones) {
    filters.has_stones = hasStones === 'true';
  }

  const hasCertifications = searchParams.get('has_certifications');
  if (hasCertifications) {
    filters.has_certifications = hasCertifications === 'true';
  }

  const sortBy = searchParams.get('sort_by');
  if (sortBy) {
    filters.sort_by = sortBy as InventoryFiltersState['sort_by'];
  }

  const sortOrder = searchParams.get('sort_order');
  if (sortOrder) {
    filters.sort_order = sortOrder as 'asc' | 'desc';
  }

  const page = searchParams.get('page');
  if (page) {
    filters.page = parseInt(page, 10);
  }

  const pageSize = searchParams.get('page_size');
  if (pageSize) {
    filters.page_size = parseInt(pageSize, 10);
  }

  return filters;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for managing inventory filter state.
 *
 * Features:
 * - URL synchronization for shareable filter states
 * - Zod schema validation
 * - Pagination helpers
 * - Multi-select filter support
 * - Active filter tracking
 *
 * @param options - Configuration options
 * @returns Filter state and manipulation functions
 *
 * @example
 * ```tsx
 * function InventoryFilters() {
 *   const {
 *     filters,
 *     setFilter,
 *     setSearch,
 *     setPage,
 *     resetFilters,
 *     hasActiveFilters,
 *     activeFilterCount
 *   } = useInventoryFilters({ syncWithUrl: true });
 *
 *   return (
 *     <div>
 *       <SearchInput
 *         value={filters.search ?? ''}
 *         onChange={(e) => setSearch(e.target.value)}
 *       />
 *
 *       <StatusFilter
 *         value={filters.status}
 *         onChange={(status) => setFilter('status', status)}
 *       />
 *
 *       <CategoryFilter
 *         value={filters.id_category}
 *         onChange={(categories) => setFilter('id_category', categories)}
 *       />
 *
 *       {hasActiveFilters && (
 *         <Button onClick={resetFilters}>
 *           Clear {activeFilterCount} filters
 *         </Button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useInventoryFilters(
  options: UseInventoryFiltersOptions = {}
): UseInventoryFiltersReturn {
  const {
    initialFilters = {},
    syncWithUrl = false,
    defaultPageSize = 20,
    onFiltersChange,
  } = options;

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize filters from URL if syncing, otherwise use initial/default
  const getInitialFilters = useCallback((): InventoryFiltersState => {
    const defaults = {
      ...DEFAULT_INVENTORY_FILTERS,
      page_size: defaultPageSize,
    };

    if (syncWithUrl && searchParams) {
      const urlFilters = searchParamsToFilters(searchParams);
      return { ...defaults, ...urlFilters, ...initialFilters };
    }

    return { ...defaults, ...initialFilters };
  }, [syncWithUrl, searchParams, initialFilters, defaultPageSize]);

  const [filters, setFiltersState] = useState<InventoryFiltersState>(getInitialFilters);

  // Update URL when filters change (if syncWithUrl is enabled)
  const updateUrl = useCallback(
    (newFilters: InventoryFiltersState) => {
      if (!syncWithUrl) {
        return;
      }

      const params = filtersToSearchParams(newFilters);
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

      // Use window.history for URL updates to avoid Next.js typed route constraints
      window.history.replaceState(null, '', newUrl);
    },
    [syncWithUrl, pathname]
  );

  // Internal setter that handles URL sync and callback
  const updateFilters = useCallback(
    (newFilters: InventoryFiltersState) => {
      setFiltersState(newFilters);
      updateUrl(newFilters);
      onFiltersChange?.(newFilters);
    },
    [updateUrl, onFiltersChange]
  );

  // Set a specific filter value
  const setFilter = useCallback(
    <K extends keyof InventoryFiltersState>(key: K, value: InventoryFiltersState[K]) => {
      const newFilters = {
        ...filters,
        [key]: value,
        // Reset to page 1 when filters change (except for page/page_size)
        ...(key !== 'page' && key !== 'page_size' ? { page: 1 } : {}),
      };
      updateFilters(newFilters);
    },
    [filters, updateFilters]
  );

  // Set multiple filters at once
  const setFilters = useCallback(
    (partialFilters: Partial<InventoryFiltersState>) => {
      const newFilters = {
        ...filters,
        ...partialFilters,
        // Reset to page 1 if any filter other than page changes
        page: partialFilters.page ?? 1,
      };
      updateFilters(newFilters);
    },
    [filters, updateFilters]
  );

  // Reset all filters to defaults
  const resetFilters = useCallback(() => {
    const defaults = {
      ...DEFAULT_INVENTORY_FILTERS,
      page_size: defaultPageSize,
    };
    updateFilters(defaults);
  }, [defaultPageSize, updateFilters]);

  // Reset filters but keep pagination settings
  const resetFilterValues = useCallback(() => {
    const newFilters = {
      ...DEFAULT_INVENTORY_FILTERS,
      page_size: filters.page_size,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
    };
    updateFilters(newFilters);
  }, [filters.page_size, filters.sort_by, filters.sort_order, updateFilters]);

  // Clear a specific filter
  const clearFilter = useCallback(
    (key: keyof InventoryFiltersState) => {
      const newFilters = {
        ...filters,
        [key]: DEFAULT_INVENTORY_FILTERS[key],
        page: 1,
      };
      updateFilters(newFilters);
    },
    [filters, updateFilters]
  );

  // Pagination helpers
  const setPage = useCallback(
    (page: number) => {
      setFilter('page', Math.max(1, page));
    },
    [setFilter]
  );

  const nextPage = useCallback(() => {
    setPage((filters.page ?? 1) + 1);
  }, [filters.page, setPage]);

  const prevPage = useCallback(() => {
    setPage(Math.max(1, (filters.page ?? 1) - 1));
  }, [filters.page, setPage]);

  const setPageSize = useCallback(
    (size: number) => {
      const newFilters = {
        ...filters,
        page_size: Math.min(100, Math.max(1, size)),
        page: 1, // Reset to first page when changing page size
      };
      updateFilters(newFilters);
    },
    [filters, updateFilters]
  );

  // Search helpers
  const setSearch = useCallback(
    (search: string) => {
      setFilter('search', search || undefined);
    },
    [setFilter]
  );

  const clearSearch = useCallback(() => {
    clearFilter('search');
  }, [clearFilter]);

  // Sorting helpers
  const setSort = useCallback(
    (sortBy: InventoryFiltersState['sort_by'], sortOrder?: 'asc' | 'desc') => {
      const newFilters = {
        ...filters,
        sort_by: sortBy,
        sort_order: sortOrder ?? filters.sort_order,
        page: 1,
      };
      updateFilters(newFilters);
    },
    [filters, updateFilters]
  );

  const toggleSortDirection = useCallback(() => {
    setFilter('sort_order', filters.sort_order === 'asc' ? 'desc' : 'asc');
  }, [filters.sort_order, setFilter]);

  // Multi-value filter helpers
  const addFilterValue = useCallback(
    <K extends keyof InventoryFiltersState>(key: K, value: string) => {
      const currentValue = filters[key];
      if (Array.isArray(currentValue)) {
        if (!currentValue.includes(value as never)) {
          setFilter(key, [...currentValue, value] as InventoryFiltersState[K]);
        }
      } else {
        setFilter(key, [value] as InventoryFiltersState[K]);
      }
    },
    [filters, setFilter]
  );

  const removeFilterValue = useCallback(
    <K extends keyof InventoryFiltersState>(key: K, value: string) => {
      const currentValue = filters[key];
      if (Array.isArray(currentValue)) {
        const newValue = currentValue.filter((v) => v !== value);
        setFilter(key, (newValue.length > 0 ? newValue : undefined) as InventoryFiltersState[K]);
      }
    },
    [filters, setFilter]
  );

  // Calculate active filter count (excluding pagination and sorting)
  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.search) {
      count++;
    }
    if (filters.status && filters.status.length > 0) {
      count++;
    }
    if (filters.item_type && filters.item_type.length > 0) {
      count++;
    }
    if (filters.ownership_type && filters.ownership_type.length > 0) {
      count++;
    }
    if (filters.source_type && filters.source_type.length > 0) {
      count++;
    }
    if (filters.gold_color && filters.gold_color.length > 0) {
      count++;
    }
    if (filters.id_category && filters.id_category.length > 0) {
      count++;
    }
    if (filters.id_metal_type && filters.id_metal_type.length > 0) {
      count++;
    }
    if (filters.id_metal_purity && filters.id_metal_purity.length > 0) {
      count++;
    }
    if (filters.id_stone_type && filters.id_stone_type.length > 0) {
      count++;
    }
    if (filters.price_range?.min !== undefined || filters.price_range?.max !== undefined) {
      count++;
    }
    if (filters.weight_range?.min !== undefined || filters.weight_range?.max !== undefined) {
      count++;
    }
    if (filters.created_from || filters.created_to) {
      count++;
    }
    if (filters.has_barcode !== undefined) {
      count++;
    }
    if (filters.has_stones !== undefined) {
      count++;
    }
    if (filters.has_certifications !== undefined) {
      count++;
    }

    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  // Validate current filters against schema
  const validateFilters = useCallback(() => {
    const result = inventoryFilterSchema.safeParse(filters);
    if (result.success) {
      return { success: true };
    }
    return {
      success: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }, [filters]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    resetFilterValues,
    clearFilter,
    setPage,
    nextPage,
    prevPage,
    setPageSize,
    setSearch,
    clearSearch,
    setSort,
    toggleSortDirection,
    addFilterValue,
    removeFilterValue,
    hasActiveFilters,
    activeFilterCount,
    validateFilters,
  };
}

/**
 * Hook for debounced search in inventory filters
 *
 * @example
 * ```tsx
 * const { searchValue, setSearchValue, debouncedSearch } = useInventorySearch();
 *
 * // Use searchValue for input display
 * // Use debouncedSearch for the actual query
 * const { items } = useInventoryItems({ search: debouncedSearch });
 * ```
 */
export function useInventorySearch(delay: number = 300) {
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce the search value
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchValue, delay]);

  const clearSearch = useCallback(() => {
    setSearchValue('');
    setDebouncedSearch('');
  }, []);

  return {
    searchValue,
    setSearchValue,
    debouncedSearch,
    clearSearch,
  };
}

/**
 * Type for creating preset filter configurations
 */
export interface InventoryFilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: Partial<InventoryFiltersState>;
}

/**
 * Common preset filters for inventory
 */
export const INVENTORY_FILTER_PRESETS: InventoryFilterPreset[] = [
  {
    id: 'available',
    name: 'Available Items',
    description: 'Items ready for sale',
    filters: { status: ['available'] },
  },
  {
    id: 'reserved',
    name: 'Reserved Items',
    description: 'Items reserved for customers',
    filters: { status: ['reserved'] },
  },
  {
    id: 'workshop',
    name: 'In Workshop',
    description: 'Items being worked on',
    filters: { status: ['workshop'] },
  },
  {
    id: 'finished',
    name: 'Finished Products',
    description: 'Ready-to-sell finished items',
    filters: { item_type: ['finished'], status: ['available'] },
  },
  {
    id: 'raw-materials',
    name: 'Raw Materials',
    description: 'Raw materials in stock',
    filters: { item_type: ['raw_material'] },
  },
  {
    id: 'consignment',
    name: 'Consignment Items',
    description: 'Items on consignment',
    filters: { ownership_type: ['consignment'] },
  },
  {
    id: 'recently-added',
    name: 'Recently Added',
    description: 'Items added in the last 7 days',
    filters: {
      created_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      sort_by: 'created_at',
      sort_order: 'desc',
    },
  },
];
