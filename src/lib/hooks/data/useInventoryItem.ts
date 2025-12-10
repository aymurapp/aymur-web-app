/**
 * useInventoryItem Hook
 *
 * TanStack Query hook for fetching a single inventory item with all
 * its related data including stones, certifications, and reference data.
 *
 * Features:
 * - Single item fetching with full relations
 * - Real-time updates for the specific item
 * - Graceful deletion state handling
 * - Prefetching support
 *
 * @module lib/hooks/data/useInventoryItem
 */

'use client';

import { useCallback, useState, useEffect } from 'react';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import {
  useRealtime,
  type RealtimeConnectionStatus,
  type RealtimePayload,
} from '@/lib/hooks/data/useRealtime';
import { useShop } from '@/lib/hooks/shop';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/types/database';

// Note: item_certifications table types are manually defined since the database.ts
// may not include all tables. Once database types are regenerated, these can be
// replaced with Tables<'item_certifications'> etc.

import { inventoryKeys } from './useInventoryItems';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Item stone row type from the public.item_stones table
 */
export type ItemStone = Tables<'item_stones'>;

/**
 * Item stone insert type
 */
export type ItemStoneInsert = TablesInsert<'item_stones'>;

/**
 * Item stone update type
 */
export type ItemStoneUpdate = TablesUpdate<'item_stones'>;

/**
 * Item stone with related stone type information
 */
export interface ItemStoneWithType extends ItemStone {
  stone_type?: {
    id_stone_type: string;
    stone_name: string;
    category: string | null;
  } | null;
}

/**
 * Item certification type (not in database.ts yet, defined manually)
 */
export interface ItemCertification {
  id_certification: string;
  id_shop: string;
  id_item: string;
  certification_type: string;
  certificate_number: string;
  issuing_authority: string;
  issue_date: string | null;
  expiry_date: string | null;
  appraised_value: number | null;
  currency: string | null;
  id_file_upload: string | null;
  verification_url: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Item certification insert type
 */
export interface ItemCertificationInsert {
  id_certification?: string;
  id_shop: string;
  id_item: string;
  certification_type: string;
  certificate_number: string;
  issuing_authority: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  appraised_value?: number | null;
  currency?: string | null;
  id_file_upload?: string | null;
  verification_url?: string | null;
  notes?: string | null;
  created_by: string;
}

/**
 * Item certification update type
 */
export interface ItemCertificationUpdate {
  certification_type?: string;
  certificate_number?: string;
  issuing_authority?: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  appraised_value?: number | null;
  currency?: string | null;
  id_file_upload?: string | null;
  verification_url?: string | null;
  notes?: string | null;
}

/**
 * Full inventory item with all related data
 */
export interface InventoryItemFull extends Tables<'inventory_items'> {
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
    id_metal_type: string;
  } | null;
  stone_type?: {
    id_stone_type: string;
    stone_name: string;
    category: string | null;
  } | null;
  size?: {
    id_size: string;
    size_value: string;
    size_system: string | null;
    id_category: string | null;
  } | null;
  purchase?: {
    id_purchase: string;
    purchase_number: string | null;
    purchase_date: string;
    id_supplier: string;
    supplier?: {
      id_supplier: string;
      company_name: string;
    } | null;
  } | null;
  created_by_user?: {
    id_user: string;
    full_name: string;
  } | null;
  updated_by_user?: {
    id_user: string;
    full_name: string;
  } | null;
  stones?: ItemStoneWithType[];
  certifications?: ItemCertification[];
  /** Primary image URL from file_uploads */
  image_url?: string | null;
  /** All images for this item */
  images?: Array<{ id_file: string; file_url: string; file_name: string }>;
}

/**
 * Options for fetching a single inventory item
 */
export interface UseInventoryItemOptions {
  /** The item ID to fetch */
  itemId: string;
  /** Include related stones data */
  includeStones?: boolean;
  /** Include related certifications data */
  includeCertifications?: boolean;
  /** Include purchase and supplier data */
  includePurchase?: boolean;
  /** Enable the query */
  enabled?: boolean;
  /** Enable real-time updates for this item */
  realtime?: boolean;
  /** Callback when the item is updated via realtime */
  onRealtimeUpdate?: (item: Tables<'inventory_items'>) => void;
  /** Callback when the item is deleted via realtime */
  onRealtimeDelete?: () => void;
  /** Callback when realtime connection status changes */
  onRealtimeStatusChange?: (status: RealtimeConnectionStatus) => void;
}

/**
 * Deletion state for an inventory item
 */
export type ItemDeletionState = 'active' | 'deleted' | 'soft_deleted';

/**
 * Return type for the useInventoryItem hook
 */
export interface UseInventoryItemReturn {
  /** The inventory item with all relations */
  item: InventoryItemFull | null;
  /** Item stones */
  stones: ItemStoneWithType[];
  /** Item certifications */
  certifications: ItemCertification[];
  /** True while loading */
  isLoading: boolean;
  /** True if query has been fetched */
  isFetched: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
  /** Whether the item was deleted (via realtime event) */
  isDeleted: boolean;
  /** Deletion state of the item */
  deletionState: ItemDeletionState;
  /** Whether realtime subscription is active */
  isRealtimeConnected: boolean;
  /** Current realtime connection status */
  realtimeStatus: RealtimeConnectionStatus;
}

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

/**
 * Storage bucket for inventory images (public)
 */
const STORAGE_BUCKET = 'inventory-images';

/**
 * Fetches a single inventory item with all related data
 */
async function fetchInventoryItem(
  shopId: string,
  itemId: string,
  options: Pick<UseInventoryItemOptions, 'includePurchase'>
): Promise<InventoryItemFull | null> {
  const { includePurchase = true } = options;
  const supabase = createClient();

  // Build the select string with relations
  let selectString = `
    *,
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
      purity_percentage,
      id_metal_type
    ),
    stone_type:stone_types!fk_inventory_items_stone_type (
      id_stone_type,
      stone_name,
      category
    ),
    size:product_sizes!fk_inventory_items_size (
      id_size,
      size_value,
      size_system,
      id_category
    ),
    created_by_user:users!fk_inventory_items_created_by (
      id_user,
      full_name
    ),
    updated_by_user:users!fk_inventory_items_updated_by (
      id_user,
      full_name
    )
  `;

  if (includePurchase) {
    selectString += `,
    purchase:purchases!fk_inventory_items_purchase (
      id_purchase,
      purchase_number,
      purchase_date,
      id_supplier,
      supplier:suppliers!fk_purchases_supplier (
        id_supplier,
        company_name
      )
    )`;
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .select(selectString)
    .eq('id_item', itemId)
    .eq('id_shop', shopId)
    .is('deleted_at', null)
    .single();

  if (error) {
    // PGRST116 = no rows found
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch inventory item: ${error.message}`);
  }

  const item = data as unknown as InventoryItemFull;

  // Fetch images from file_uploads
  const { data: fileData } = await supabase
    .from('file_uploads')
    .select('id_file, file_path, file_name')
    .eq('id_shop', shopId)
    .eq('entity_type', 'inventory_items')
    .eq('entity_id', itemId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (fileData && fileData.length > 0) {
    // Map all images with URLs
    item.images = fileData.map((file) => {
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(file.file_path);
      return {
        id_file: file.id_file,
        file_url: urlData.publicUrl,
        file_name: file.file_name,
      };
    });

    // Set primary image URL (first image)
    item.image_url = item.images[0]?.file_url || null;
  }

  return item;
}

/**
 * Fetches stones for an inventory item
 */
async function fetchItemStones(shopId: string, itemId: string): Promise<ItemStoneWithType[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('item_stones')
    .select(
      `
      *,
      stone_type:stone_types!fk_item_stones_stone_type (
        id_stone_type,
        stone_name,
        category
      )
    `
    )
    .eq('id_item', itemId)
    .eq('id_shop', shopId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch item stones: ${error.message}`);
  }

  return (data ?? []) as unknown as ItemStoneWithType[];
}

/**
 * Fetches certifications for an inventory item
 * Note: Uses type assertion since item_certifications may not be in database.ts
 */
async function fetchItemCertifications(
  shopId: string,
  itemId: string
): Promise<ItemCertification[]> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('item_certifications')
    .select('*')
    .eq('id_item', itemId)
    .eq('id_shop', shopId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch item certifications: ${error.message}`);
  }

  return (data ?? []) as ItemCertification[];
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to fetch a single inventory item with all related data.
 *
 * Features:
 * - Fetches item with category, metal, stone, size relations
 * - Optionally fetches associated stones
 * - Optionally fetches associated certifications
 * - Optionally fetches purchase/supplier info
 * - Real-time updates support
 *
 * @param options - Options including itemId and what relations to include
 * @returns The inventory item with all its relations
 *
 * @example
 * ```tsx
 * function InventoryItemDetail({ itemId }: { itemId: string }) {
 *   const {
 *     item,
 *     stones,
 *     certifications,
 *     isLoading,
 *     error
 *   } = useInventoryItem({
 *     itemId,
 *     includeStones: true,
 *     includeCertifications: true,
 *     realtime: true
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (!item) return <NotFound />;
 *
 *   return (
 *     <div>
 *       <h1>{item.item_name}</h1>
 *       <ItemDetails item={item} />
 *       <StonesList stones={stones} />
 *       <CertificationsList certifications={certifications} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useInventoryItem(options: UseInventoryItemOptions): UseInventoryItemReturn {
  const { shopId, hasAccess } = useShop();
  const queryClient = useQueryClient();

  const {
    itemId,
    includeStones = true,
    includeCertifications = true,
    includePurchase = true,
    enabled = true,
    realtime = false,
    onRealtimeUpdate,
    onRealtimeDelete,
    onRealtimeStatusChange,
  } = options;

  // State for tracking deletion and realtime status
  const [isDeleted, setIsDeleted] = useState(false);
  const [deletionState, setDeletionState] = useState<ItemDeletionState>('active');
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionStatus>('disconnected');

  /**
   * Handle realtime UPDATE event for this specific item
   */
  const handleRealtimeUpdate = useCallback(
    (
      record: Tables<'inventory_items'>,
      _oldRecord: Partial<Tables<'inventory_items'>> | null,
      _payload: RealtimePayload<'inventory_items'>
    ) => {
      // Update the cache optimistically
      queryClient.setQueryData<InventoryItemFull>(
        inventoryKeys.detail(shopId!, itemId),
        (oldData) => {
          if (!oldData) {
            return oldData;
          }
          return { ...oldData, ...record };
        }
      );

      // Check if item was soft-deleted
      if (record.deleted_at) {
        setDeletionState('soft_deleted');
      }

      // Call user callback
      onRealtimeUpdate?.(record);
    },
    [shopId, itemId, queryClient, onRealtimeUpdate]
  );

  /**
   * Handle realtime DELETE event for this specific item
   */
  const handleRealtimeDelete = useCallback(
    (
      _oldRecord: Partial<Tables<'inventory_items'>>,
      _payload: RealtimePayload<'inventory_items'>
    ) => {
      setIsDeleted(true);
      setDeletionState('deleted');

      // Remove from cache
      queryClient.removeQueries({
        queryKey: inventoryKeys.detail(shopId!, itemId),
      });

      // Call user callback
      onRealtimeDelete?.();
    },
    [shopId, itemId, queryClient, onRealtimeDelete]
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

  // Real-time subscription for this item
  const { isSubscribed: isRealtimeConnected } = useRealtime({
    table: 'inventory_items',
    filter: shopId && itemId ? `id_item=eq.${itemId}` : undefined,
    queryKey: inventoryKeys.detail(shopId ?? '', itemId),
    autoInvalidate: false, // We handle updates manually
    enabled: realtime && !!shopId && !!itemId && hasAccess && !isDeleted,
    onUpdate: handleRealtimeUpdate,
    onDelete: handleRealtimeDelete,
    onConnectionStatusChange: handleConnectionStatusChange,
    autoReconnect: true,
  });

  // Real-time subscription for item stones
  useRealtime({
    table: 'item_stones',
    filter: shopId && itemId ? `id_item=eq.${itemId}` : undefined,
    queryKey: inventoryKeys.stones(shopId ?? '', itemId),
    autoInvalidate: true,
    enabled: realtime && includeStones && !!shopId && !!itemId && hasAccess && !isDeleted,
  });

  // Query for the main item
  const itemQuery = useQuery({
    queryKey: inventoryKeys.detail(shopId ?? '', itemId),
    queryFn: () => fetchInventoryItem(shopId!, itemId, { includePurchase }),
    enabled: !!shopId && !!itemId && hasAccess && enabled && !isDeleted,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for stones
  const stonesQuery = useQuery({
    queryKey: inventoryKeys.stones(shopId ?? '', itemId),
    queryFn: () => fetchItemStones(shopId!, itemId),
    enabled: !!shopId && !!itemId && hasAccess && enabled && includeStones && !isDeleted,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Query for certifications
  const certificationsQuery = useQuery({
    queryKey: inventoryKeys.certifications(shopId ?? '', itemId),
    queryFn: () => fetchItemCertifications(shopId!, itemId),
    enabled: !!shopId && !!itemId && hasAccess && enabled && includeCertifications && !isDeleted,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Detect soft deletion from fetched data
  useEffect(() => {
    if (itemQuery.data?.deleted_at) {
      setDeletionState('soft_deleted');
    }
  }, [itemQuery.data?.deleted_at]);

  const isLoading =
    itemQuery.isLoading ||
    (includeStones && stonesQuery.isLoading) ||
    (includeCertifications && certificationsQuery.isLoading);
  const isFetching =
    itemQuery.isFetching || stonesQuery.isFetching || certificationsQuery.isFetching;
  const isFetched = itemQuery.isFetched;

  // Combine errors
  const error = itemQuery.error ?? stonesQuery.error ?? certificationsQuery.error;

  // Refetch all related queries
  const refetch = useCallback(() => {
    // Reset deletion state on refetch
    setIsDeleted(false);
    setDeletionState('active');

    itemQuery.refetch();
    if (includeStones) {
      stonesQuery.refetch();
    }
    if (includeCertifications) {
      certificationsQuery.refetch();
    }
  }, [itemQuery, stonesQuery, certificationsQuery, includeStones, includeCertifications]);

  return {
    item: itemQuery.data ?? null,
    stones: stonesQuery.data ?? [],
    certifications: certificationsQuery.data ?? [],
    isLoading,
    isFetched,
    isFetching,
    error: error as Error | null,
    refetch,
    isDeleted,
    deletionState,
    isRealtimeConnected,
    realtimeStatus,
  };
}

/**
 * Prefetch an inventory item for better UX
 *
 * @example
 * ```tsx
 * const prefetchItem = usePrefetchInventoryItem();
 *
 * // Prefetch on hover
 * <Link
 *   href={`/inventory/${itemId}`}
 *   onMouseEnter={() => prefetchItem(itemId)}
 * >
 *   View Item
 * </Link>
 * ```
 */
export function usePrefetchInventoryItem() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useCallback(
    (itemId: string) => {
      if (!shopId) {
        return;
      }

      queryClient.prefetchQuery({
        queryKey: inventoryKeys.detail(shopId, itemId),
        queryFn: () => fetchInventoryItem(shopId, itemId, { includePurchase: true }),
        staleTime: 60 * 1000,
      });
    },
    [shopId, queryClient]
  );
}

// =============================================================================
// STONE MUTATIONS
// =============================================================================

/**
 * Hook to add a stone to an inventory item
 *
 * @example
 * ```tsx
 * const addStone = useAddItemStone();
 *
 * const handleAddStone = async (data: Omit<ItemStoneInsert, 'id_shop' | 'id_item'>) => {
 *   await addStone.mutateAsync({ itemId, data });
 * };
 * ```
 */
export function useAddItemStone() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      data,
    }: {
      itemId: string;
      data: Omit<ItemStoneInsert, 'id_shop' | 'id_item'>;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: stone, error } = await supabase
        .from('item_stones')
        .insert({ ...data, id_shop: shopId, id_item: itemId })
        .select(
          `
          *,
          stone_type:stone_types!fk_item_stones_stone_type (
            id_stone_type,
            stone_name,
            category
          )
        `
        )
        .single();

      if (error) {
        throw new Error(`Failed to add item stone: ${error.message}`);
      }

      return stone as unknown as ItemStoneWithType;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.stones(shopId, variables.itemId),
        });
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.detail(shopId, variables.itemId),
        });
      }
    },
  });
}

/**
 * Hook to update an item stone
 */
export function useUpdateItemStone() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId: _itemId,
      stoneId,
      data,
    }: {
      itemId: string;
      stoneId: string;
      data: ItemStoneUpdate;
    }) => {
      // itemId is used in onSuccess for cache invalidation
      void _itemId;
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: stone, error } = await supabase
        .from('item_stones')
        .update(data)
        .eq('id_item_stone', stoneId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update item stone: ${error.message}`);
      }

      return stone;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.stones(shopId, variables.itemId),
        });
      }
    },
  });
}

/**
 * Hook to delete an item stone
 */
export function useDeleteItemStone() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId: _itemId, stoneId }: { itemId: string; stoneId: string }) => {
      // itemId is used in onSuccess for cache invalidation
      void _itemId;
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { error } = await supabase
        .from('item_stones')
        .delete()
        .eq('id_item_stone', stoneId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to delete item stone: ${error.message}`);
      }

      return { stoneId };
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.stones(shopId, variables.itemId),
        });
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.detail(shopId, variables.itemId),
        });
      }
    },
  });
}

// =============================================================================
// CERTIFICATION MUTATIONS
// =============================================================================

/**
 * Hook to add a certification to an inventory item
 *
 * @example
 * ```tsx
 * const addCertification = useAddItemCertification();
 *
 * const handleAddCertification = async (data: Omit<ItemCertificationInsert, 'id_shop' | 'id_item'>) => {
 *   await addCertification.mutateAsync({ itemId, data });
 * };
 * ```
 */
export function useAddItemCertification() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      data,
    }: {
      itemId: string;
      data: Omit<ItemCertificationInsert, 'id_shop' | 'id_item'>;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: certification, error } = await (supabase as any)
        .from('item_certifications')
        .insert({ ...data, id_shop: shopId, id_item: itemId })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add item certification: ${error.message}`);
      }

      return certification as ItemCertification;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.certifications(shopId, variables.itemId),
        });
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.detail(shopId, variables.itemId),
        });
      }
    },
  });
}

/**
 * Hook to update an item certification
 */
export function useUpdateItemCertification() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId: _itemId,
      certificationId,
      data,
    }: {
      itemId: string;
      certificationId: string;
      data: ItemCertificationUpdate;
    }) => {
      // itemId is used in onSuccess for cache invalidation
      void _itemId;
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: certification, error } = await (supabase as any)
        .from('item_certifications')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id_certification', certificationId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update item certification: ${error.message}`);
      }

      return certification as ItemCertification;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.certifications(shopId, variables.itemId),
        });
      }
    },
  });
}

/**
 * Hook to delete an item certification
 */
export function useDeleteItemCertification() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId: _itemId,
      certificationId,
    }: {
      itemId: string;
      certificationId: string;
    }) => {
      // itemId is used in onSuccess for cache invalidation
      void _itemId;
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('item_certifications')
        .delete()
        .eq('id_certification', certificationId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to delete item certification: ${error.message}`);
      }

      return { certificationId };
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.certifications(shopId, variables.itemId),
        });
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.detail(shopId, variables.itemId),
        });
      }
    },
  });
}

// =============================================================================
// SEARCH HOOKS
// =============================================================================

/**
 * Hook to search inventory items by barcode or SKU
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useInventoryItemByBarcode('ABC123');
 * ```
 */
export function useInventoryItemByBarcode(barcode: string | null) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: ['inventory', shopId, 'barcode', barcode] as const,
    queryFn: async () => {
      if (!shopId || !barcode) {
        return null;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id_shop', shopId)
        .is('deleted_at', null)
        .or(`barcode.eq.${barcode},sku.eq.${barcode}`)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to find item by barcode: ${error.message}`);
      }

      return data;
    },
    enabled: !!shopId && !!barcode && hasAccess,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to search multiple items by IDs
 *
 * @example
 * ```tsx
 * const { data: items } = useInventoryItemsByIds(['id1', 'id2', 'id3']);
 * ```
 */
export function useInventoryItemsByIds(itemIds: string[]) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: ['inventory', shopId, 'batch', itemIds] as const,
    queryFn: async () => {
      if (!shopId || itemIds.length === 0) {
        return [];
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('inventory_items')
        .select(
          `
          *,
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
          )
        `
        )
        .eq('id_shop', shopId)
        .is('deleted_at', null)
        .in('id_item', itemIds);

      if (error) {
        throw new Error(`Failed to fetch items by IDs: ${error.message}`);
      }

      return data ?? [];
    },
    enabled: !!shopId && itemIds.length > 0 && hasAccess,
    staleTime: 30 * 1000,
  });
}
