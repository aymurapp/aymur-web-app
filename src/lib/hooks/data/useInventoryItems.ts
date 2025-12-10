/**
 * useInventoryItems Hook
 *
 * TanStack Query hook for fetching and managing inventory item lists.
 * Supports pagination, search, advanced filtering, and real-time updates.
 *
 * Features:
 * - Paginated inventory item fetching
 * - Advanced filtering and search
 * - Real-time updates with optimistic cache management
 * - Infinite scroll support
 * - Bulk operations
 *
 * @module lib/hooks/data/useInventoryItems
 */

'use client';

import { useCallback, useState } from 'react';

import {
  useQuery,
  useQueryClient,
  useMutation,
  useInfiniteQuery,
  type InfiniteData,
} from '@tanstack/react-query';

import {
  useRealtime,
  type RealtimeConnectionStatus,
  type RealtimePayload,
} from '@/lib/hooks/data/useRealtime';
import { useShop } from '@/lib/hooks/shop';
import { queryKeys } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/types/database';
import type { InventoryFilterInput } from '@/lib/utils/schemas/inventory';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Inventory item row type from the public.inventory_items table
 */
export type InventoryItem = Tables<'inventory_items'>;

/**
 * Inventory item insert type for creating new items
 */
export type InventoryItemInsert = TablesInsert<'inventory_items'>;

/**
 * Inventory item update type for updating items
 */
export type InventoryItemUpdate = TablesUpdate<'inventory_items'>;

/**
 * Inventory item with related data for list display
 */
export interface InventoryItemWithRelations extends InventoryItem {
  category?: {
    id_category: string;
    category_name: string;
  } | null;
  metal_type?: {
    id_metal_type: string;
    metal_name: string;
  } | null;
  metal_purity?: {
    id_purity: string;
    purity_name: string;
    purity_percentage: number;
  } | null;
  stone_type?: {
    id_stone_type: string;
    stone_name: string;
  } | null;
  size?: {
    id_size: string;
    size_value: string;
  } | null;
  stones_count?: number;
  certifications_count?: number;
  /** Primary image URL from file_uploads */
  image_url?: string | null;
}

/**
 * Options for filtering and paginating inventory queries
 */
export interface UseInventoryItemsOptions extends Partial<InventoryFilterInput> {
  /** Whether to include related data (category, metal, stone, size) */
  includeRelations?: boolean;
  /** Include soft-deleted items */
  includeDeleted?: boolean;
  /** Whether to enable the query */
  enabled?: boolean;
  /** Whether to enable real-time updates */
  realtime?: boolean;
  /**
   * Whether to use optimistic updates for realtime events.
   * When true, the cache is updated immediately without refetching.
   * Default: true
   */
  optimisticUpdates?: boolean;
  /** Callback when an item is inserted via realtime */
  onRealtimeInsert?: (item: InventoryItem) => void;
  /** Callback when an item is updated via realtime */
  onRealtimeUpdate?: (item: InventoryItem, oldItem: Partial<InventoryItem> | null) => void;
  /** Callback when an item is deleted via realtime */
  onRealtimeDelete?: (oldItem: Partial<InventoryItem>) => void;
  /** Callback when realtime connection status changes */
  onRealtimeStatusChange?: (status: RealtimeConnectionStatus) => void;
}

/**
 * Return type for the useInventoryItems hook
 */
export interface UseInventoryItemsReturn {
  /** Array of inventory items */
  items: InventoryItemWithRelations[];
  /** Total count of matching items */
  totalCount: number;
  /** Current page number */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages */
  hasNextPage: boolean;
  /** Whether there are previous pages */
  hasPreviousPage: boolean;
  /** True while loading */
  isLoading: boolean;
  /** True if loading for first time */
  isInitialLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
  /** Whether realtime subscription is active */
  isRealtimeConnected: boolean;
  /** Current realtime connection status */
  realtimeStatus: RealtimeConnectionStatus;
}

// =============================================================================
// QUERY KEY FACTORY
// =============================================================================

/**
 * Query key factory for inventory items
 */
export const inventoryKeys = {
  /** All inventory queries for a shop */
  all: (shopId: string) => ['inventory', shopId] as const,

  /** Inventory list with filters */
  list: (shopId: string, filters: Partial<InventoryFilterInput>) =>
    ['inventory', shopId, 'list', filters] as const,

  /** Single inventory item */
  detail: (shopId: string, itemId: string) => ['inventory', shopId, itemId] as const,

  /** Item stones */
  stones: (shopId: string, itemId: string) => ['inventory', shopId, itemId, 'stones'] as const,

  /** Item certifications */
  certifications: (shopId: string, itemId: string) =>
    ['inventory', shopId, itemId, 'certifications'] as const,
};

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

/**
 * Builds the select string for inventory queries
 */
function buildInventorySelect(includeRelations: boolean): string {
  const baseSelect = '*';

  if (!includeRelations) {
    return baseSelect;
  }

  return `
    ${baseSelect},
    category:product_categories!fk_inventory_items_category (
      id_category,
      category_name
    ),
    metal_type:metal_types!fk_inventory_items_metal_type (
      id_metal_type,
      metal_name
    ),
    metal_purity:metal_purities!fk_inventory_items_metal_purity (
      id_purity,
      purity_name,
      purity_percentage
    ),
    stone_type:stone_types!fk_inventory_items_stone_type (
      id_stone_type,
      stone_name
    ),
    size:product_sizes!fk_inventory_items_size (
      id_size,
      size_value
    )
  `.trim();
}

/**
 * Storage bucket for inventory images (public)
 */
const STORAGE_BUCKET = 'inventory-images';

/**
 * Fetches inventory items with pagination and filtering
 */
async function fetchInventoryItems(
  shopId: string,
  options: UseInventoryItemsOptions
): Promise<{ items: InventoryItemWithRelations[]; totalCount: number }> {
  const {
    search,
    status,
    item_type,
    ownership_type,
    source_type,
    gold_color,
    id_category,
    id_metal_type,
    id_metal_purity,
    id_stone_type,
    price_range,
    weight_range,
    created_from,
    created_to,
    has_barcode,
    sort_by = 'created_at',
    sort_order = 'desc',
    page = 1,
    page_size = 20,
    includeRelations = true,
    includeDeleted = false,
  } = options;

  const supabase = createClient();
  const offset = (page - 1) * page_size;

  // Build the query
  let query = supabase
    .from('inventory_items')
    .select(buildInventorySelect(includeRelations), { count: 'exact' })
    .eq('id_shop', shopId);

  // Apply soft delete filter
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  // Apply search filter (name, SKU, or barcode)
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `item_name.ilike.${searchTerm},sku.ilike.${searchTerm},barcode.ilike.${searchTerm}`
    );
  }

  // Apply enum array filters
  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  if (item_type && item_type.length > 0) {
    query = query.in('item_type', item_type);
  }

  if (ownership_type && ownership_type.length > 0) {
    query = query.in('ownership_type', ownership_type);
  }

  if (source_type && source_type.length > 0) {
    query = query.in('source_type', source_type);
  }

  if (gold_color && gold_color.length > 0) {
    query = query.in('gold_color', gold_color);
  }

  // Apply foreign key filters
  if (id_category && id_category.length > 0) {
    query = query.in('id_category', id_category);
  }

  if (id_metal_type && id_metal_type.length > 0) {
    query = query.in('id_metal_type', id_metal_type);
  }

  if (id_metal_purity && id_metal_purity.length > 0) {
    query = query.in('id_metal_purity', id_metal_purity);
  }

  if (id_stone_type && id_stone_type.length > 0) {
    query = query.in('id_stone_type', id_stone_type);
  }

  // Apply range filters
  if (price_range) {
    if (price_range.min !== undefined) {
      query = query.gte('purchase_price', price_range.min);
    }
    if (price_range.max !== undefined) {
      query = query.lte('purchase_price', price_range.max);
    }
  }

  if (weight_range) {
    if (weight_range.min !== undefined) {
      query = query.gte('weight_grams', weight_range.min);
    }
    if (weight_range.max !== undefined) {
      query = query.lte('weight_grams', weight_range.max);
    }
  }

  // Apply date filters
  if (created_from) {
    query = query.gte('created_at', created_from);
  }

  if (created_to) {
    query = query.lte('created_at', created_to);
  }

  // Apply boolean filters
  if (has_barcode === true) {
    query = query.not('barcode', 'is', null);
  } else if (has_barcode === false) {
    query = query.is('barcode', null);
  }

  // Apply sorting
  query = query.order(sort_by, { ascending: sort_order === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + page_size - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch inventory items: ${error.message}`);
  }

  const items = (data ?? []) as unknown as InventoryItemWithRelations[];

  // Fetch primary images for all items from file_uploads
  if (items.length > 0) {
    const itemIds = items.map((item) => item.id_item);

    const { data: fileData } = await supabase
      .from('file_uploads')
      .select('entity_id, file_path')
      .eq('id_shop', shopId)
      .eq('entity_type', 'inventory_items')
      .in('entity_id', itemIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (fileData && fileData.length > 0) {
      // Create a map of entity_id -> first image URL (primary image)
      const imageMap = new Map<string, string>();

      for (const file of fileData) {
        if (file.entity_id && !imageMap.has(file.entity_id)) {
          const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(file.file_path);
          imageMap.set(file.entity_id, urlData.publicUrl);
        }
      }

      // Merge image URLs into items
      for (const item of items) {
        item.image_url = imageMap.get(item.id_item) || null;
      }
    }
  }

  return {
    items,
    totalCount: count ?? 0,
  };
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to fetch paginated inventory items with search and filtering.
 *
 * Features:
 * - Automatic shop scoping via useShop
 * - Search by name, SKU, or barcode
 * - Advanced filtering by status, type, metal, stone, etc.
 * - Range filters for price and weight
 * - Date range filtering
 * - Pagination with page navigation
 * - Optional real-time updates
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated inventory item list with metadata
 *
 * @example
 * ```tsx
 * function InventoryList() {
 *   const [search, setSearch] = useState('');
 *   const [page, setPage] = useState(1);
 *   const [filters, setFilters] = useState<InventoryFilterInput>({});
 *
 *   const {
 *     items,
 *     totalCount,
 *     totalPages,
 *     hasNextPage,
 *     isLoading,
 *     error
 *   } = useInventoryItems({
 *     search,
 *     page,
 *     page_size: 20,
 *     ...filters,
 *     realtime: true // Enable real-time updates
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       <SearchInput value={search} onChange={setSearch} />
 *       <InventoryTable items={items} />
 *       <Pagination
 *         page={page}
 *         totalPages={totalPages}
 *         onPageChange={setPage}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useInventoryItems(options: UseInventoryItemsOptions = {}): UseInventoryItemsReturn {
  const { shopId, hasAccess } = useShop();
  const queryClient = useQueryClient();

  const {
    search = '',
    status,
    item_type,
    ownership_type,
    source_type,
    gold_color,
    id_category,
    id_metal_type,
    id_metal_purity,
    id_stone_type,
    price_range,
    weight_range,
    created_from,
    created_to,
    has_barcode,
    has_stones,
    has_certifications,
    sort_by = 'created_at',
    sort_order = 'desc',
    page = 1,
    page_size = 20,
    includeRelations = true,
    includeDeleted = false,
    enabled = true,
    realtime = false,
    optimisticUpdates = true,
    onRealtimeInsert,
    onRealtimeUpdate,
    onRealtimeDelete,
    onRealtimeStatusChange,
  } = options;

  // State for realtime connection status
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionStatus>('disconnected');

  // Build filter object for query key
  const filters: Partial<InventoryFilterInput> = {
    search,
    status,
    item_type,
    ownership_type,
    source_type,
    gold_color,
    id_category,
    id_metal_type,
    id_metal_purity,
    id_stone_type,
    price_range,
    weight_range,
    created_from,
    created_to,
    has_barcode,
    has_stones,
    has_certifications,
    sort_by,
    sort_order,
    page,
    page_size,
  };

  const queryKey = inventoryKeys.list(shopId ?? '', filters);
  const allInventoryKey = inventoryKeys.all(shopId ?? '');

  /**
   * Handle realtime INSERT event with optimistic cache update
   */
  const handleRealtimeInsert = useCallback(
    (record: InventoryItem, _payload: RealtimePayload<'inventory_items'>) => {
      // Call user callback
      onRealtimeInsert?.(record);

      if (optimisticUpdates) {
        // Optimistically add to cache
        queryClient.setQueriesData<{ items: InventoryItemWithRelations[]; totalCount: number }>(
          { queryKey: ['inventory', shopId, 'list'] },
          (oldData) => {
            if (!oldData) {
              return oldData;
            }

            // Check if item already exists (prevent duplicates)
            const exists = oldData.items.some((item) => item.id_item === record.id_item);
            if (exists) {
              return oldData;
            }

            // Add new item at the beginning (assuming default sort is by created_at desc)
            return {
              ...oldData,
              items: [record as InventoryItemWithRelations, ...oldData.items],
              totalCount: oldData.totalCount + 1,
            };
          }
        );
      } else {
        // Just invalidate to refetch
        queryClient.invalidateQueries({ queryKey: allInventoryKey });
      }
    },
    [shopId, queryClient, allInventoryKey, optimisticUpdates, onRealtimeInsert]
  );

  /**
   * Handle realtime UPDATE event with optimistic cache update
   */
  const handleRealtimeUpdate = useCallback(
    (
      record: InventoryItem,
      oldRecord: Partial<InventoryItem> | null,
      _payload: RealtimePayload<'inventory_items'>
    ) => {
      // Call user callback
      onRealtimeUpdate?.(record, oldRecord);

      if (optimisticUpdates) {
        // Optimistically update in cache
        queryClient.setQueriesData<{ items: InventoryItemWithRelations[]; totalCount: number }>(
          { queryKey: ['inventory', shopId, 'list'] },
          (oldData) => {
            if (!oldData) {
              return oldData;
            }

            return {
              ...oldData,
              items: oldData.items.map((item) =>
                item.id_item === record.id_item ? { ...item, ...record } : item
              ),
            };
          }
        );

        // Also update single item cache if it exists
        queryClient.setQueryData<InventoryItemWithRelations>(
          inventoryKeys.detail(shopId!, record.id_item),
          (oldData) => {
            if (!oldData) {
              return oldData;
            }
            return { ...oldData, ...record };
          }
        );
      } else {
        // Just invalidate to refetch
        queryClient.invalidateQueries({ queryKey: allInventoryKey });
      }
    },
    [shopId, queryClient, allInventoryKey, optimisticUpdates, onRealtimeUpdate]
  );

  /**
   * Handle realtime DELETE event with optimistic cache update
   */
  const handleRealtimeDelete = useCallback(
    (oldRecord: Partial<InventoryItem>, _payload: RealtimePayload<'inventory_items'>) => {
      // Call user callback
      onRealtimeDelete?.(oldRecord);

      if (optimisticUpdates && oldRecord.id_item) {
        // Optimistically remove from cache
        queryClient.setQueriesData<{ items: InventoryItemWithRelations[]; totalCount: number }>(
          { queryKey: ['inventory', shopId, 'list'] },
          (oldData) => {
            if (!oldData) {
              return oldData;
            }

            return {
              ...oldData,
              items: oldData.items.filter((item) => item.id_item !== oldRecord.id_item),
              totalCount: Math.max(0, oldData.totalCount - 1),
            };
          }
        );

        // Remove from single item cache if it exists
        queryClient.removeQueries({
          queryKey: inventoryKeys.detail(shopId!, oldRecord.id_item),
        });
      } else {
        // Just invalidate to refetch
        queryClient.invalidateQueries({ queryKey: allInventoryKey });
      }
    },
    [shopId, queryClient, allInventoryKey, optimisticUpdates, onRealtimeDelete]
  );

  /**
   * Handle connection status change
   */
  const handleConnectionStatusChange = useCallback(
    (status: RealtimeConnectionStatus) => {
      setRealtimeStatus(status);
      onRealtimeStatusChange?.(status);
    },
    [onRealtimeStatusChange]
  );

  // Real-time subscription with optimistic updates
  const { isSubscribed: isRealtimeConnected } = useRealtime({
    table: 'inventory_items',
    filter: shopId ? `id_shop=eq.${shopId}` : undefined,
    queryKey: queryKeys.inventory(shopId ?? ''),
    autoInvalidate: false, // We handle updates manually for optimistic behavior
    enabled: realtime && !!shopId && hasAccess,
    onInsert: handleRealtimeInsert,
    onUpdate: handleRealtimeUpdate,
    onDelete: handleRealtimeDelete,
    onConnectionStatusChange: handleConnectionStatusChange,
    autoReconnect: true,
  });

  const queryResult = useQuery({
    queryKey,
    queryFn: () =>
      fetchInventoryItems(shopId!, {
        ...options,
        includeRelations,
        includeDeleted,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / page_size);

  return {
    items,
    totalCount,
    page,
    pageSize: page_size,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    isLoading,
    isInitialLoading: isLoading && !data,
    isFetching,
    error: error as Error | null,
    refetch,
    isRealtimeConnected,
    realtimeStatus,
  };
}

/**
 * Hook to fetch inventory items with infinite scroll support.
 *
 * @example
 * ```tsx
 * function InfiniteInventoryList() {
 *   const {
 *     data,
 *     fetchNextPage,
 *     hasNextPage,
 *     isFetchingNextPage,
 *     isLoading
 *   } = useInventoryItemsInfinite({ page_size: 20 });
 *
 *   const items = data?.pages.flatMap(page => page.items) ?? [];
 *
 *   return (
 *     <InfiniteScroll
 *       items={items}
 *       loadMore={fetchNextPage}
 *       hasMore={hasNextPage}
 *       loading={isFetchingNextPage}
 *     />
 *   );
 * }
 * ```
 */
export function useInventoryItemsInfinite(options: Omit<UseInventoryItemsOptions, 'page'> = {}) {
  const { shopId, hasAccess } = useShop();
  const { page_size = 20, enabled = true, ...filterOptions } = options;

  return useInfiniteQuery<
    { items: InventoryItemWithRelations[]; totalCount: number },
    Error,
    InfiniteData<{ items: InventoryItemWithRelations[]; totalCount: number }>,
    readonly unknown[],
    number
  >({
    queryKey: ['inventory', shopId, 'infinite', filterOptions] as const,
    queryFn: async ({ pageParam }) => {
      return fetchInventoryItems(shopId!, {
        ...filterOptions,
        page: pageParam,
        page_size,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + page.items.length, 0);
      if (loadedCount >= lastPage.totalCount) {
        return undefined;
      }
      return allPages.length + 1;
    },
    initialPageParam: 1,
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Hook to create a new inventory item
 *
 * @example
 * ```tsx
 * const createItem = useCreateInventoryItem();
 *
 * const handleCreate = async (data: InventoryItemInsert) => {
 *   try {
 *     const newItem = await createItem.mutateAsync(data);
 *     toast.success('Item created!');
 *   } catch (error) {
 *     toast.error('Failed to create item');
 *   }
 * };
 * ```
 */
export function useCreateInventoryItem() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<InventoryItemInsert, 'id_shop'>) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: item, error } = await supabase
        .from('inventory_items')
        .insert({ ...data, id_shop: shopId })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create inventory item: ${error.message}`);
      }

      return item;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.all(shopId) });
      }
    },
  });
}

/**
 * Hook to update an existing inventory item
 *
 * @example
 * ```tsx
 * const updateItem = useUpdateInventoryItem();
 *
 * const handleUpdate = async (itemId: string, data: InventoryItemUpdate) => {
 *   try {
 *     await updateItem.mutateAsync({ itemId, data });
 *     toast.success('Item updated!');
 *   } catch (error) {
 *     toast.error('Failed to update item');
 *   }
 * };
 * ```
 */
export function useUpdateInventoryItem() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: InventoryItemUpdate }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: item, error } = await supabase
        .from('inventory_items')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id_item', itemId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update inventory item: ${error.message}`);
      }

      return item;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.all(shopId) });
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.detail(shopId, variables.itemId),
        });
      }
    },
  });
}

/**
 * Hook to soft-delete an inventory item
 *
 * Note: This performs a soft delete by setting deleted_at.
 *
 * @example
 * ```tsx
 * const deleteItem = useDeleteInventoryItem();
 *
 * const handleDelete = async (itemId: string) => {
 *   try {
 *     await deleteItem.mutateAsync(itemId);
 *     toast.success('Item deleted!');
 *   } catch (error) {
 *     toast.error('Failed to delete item');
 *   }
 * };
 * ```
 */
export function useDeleteInventoryItem() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('inventory_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id_item', itemId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to delete inventory item: ${error.message}`);
      }

      return { itemId };
    },
    onSuccess: (_, itemId) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.all(shopId) });
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.detail(shopId, itemId),
        });
      }
    },
  });
}

/**
 * Hook to update inventory item status
 *
 * @example
 * ```tsx
 * const updateStatus = useUpdateInventoryItemStatus();
 *
 * const handleStatusChange = async (itemId: string, status: string) => {
 *   await updateStatus.mutateAsync({ itemId, status });
 * };
 * ```
 */
export function useUpdateInventoryItemStatus() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: item, error } = await supabase
        .from('inventory_items')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id_item', itemId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update inventory item status: ${error.message}`);
      }

      return item;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.all(shopId) });
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.detail(shopId, variables.itemId),
        });
      }
    },
  });
}

/**
 * Hook to bulk update inventory item status
 *
 * @example
 * ```tsx
 * const bulkUpdateStatus = useBulkUpdateInventoryItemStatus();
 *
 * const handleBulkStatusChange = async (itemIds: string[], status: string) => {
 *   await bulkUpdateStatus.mutateAsync({ itemIds, status });
 * };
 * ```
 */
export function useBulkUpdateInventoryItemStatus() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemIds, status }: { itemIds: string[]; status: string }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: items, error } = await supabase
        .from('inventory_items')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id_item', itemIds)
        .eq('id_shop', shopId)
        .select();

      if (error) {
        throw new Error(`Failed to bulk update inventory items: ${error.message}`);
      }

      return items;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.all(shopId) });
      }
    },
  });
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Utility to invalidate inventory caches
 */
export function useInvalidateInventory() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all inventory queries for current shop */
    invalidateAll: useCallback((): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({ queryKey: inventoryKeys.all(shopId) });
      }
      return undefined;
    }, [queryClient, shopId]),

    /** Invalidate a specific inventory item */
    invalidateOne: useCallback(
      (itemId: string): Promise<void> | undefined => {
        if (shopId) {
          return queryClient.invalidateQueries({
            queryKey: inventoryKeys.detail(shopId, itemId),
          });
        }
        return undefined;
      },
      [queryClient, shopId]
    ),

    /** Invalidate inventory list queries */
    invalidateList: useCallback((): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: ['inventory', shopId, 'list'],
        });
      }
      return undefined;
    }, [queryClient, shopId]),
  };
}
