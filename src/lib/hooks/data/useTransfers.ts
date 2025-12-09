/**
 * useTransfers Hook
 *
 * TanStack Query hooks for fetching and managing shop transfers.
 * Supports pagination, search, and filtering by direction/status/date.
 *
 * Database Schema:
 * - shop_transfers: References neighbor_shops via id_neighbor, direction field indicates flow
 * - shop_transfer_items: Denormalized item data for each transfer
 * - neighbor_shops: Can be internal (id_neighbor_shop) or external (external_shop_name)
 *
 * @module lib/hooks/data/useTransfers
 */

'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { queryKeys } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES (Matching actual database schema)
// =============================================================================

/**
 * Shop transfer row type from public.shop_transfers table
 */
export interface ShopTransfer {
  id_transfer: string;
  id_shop: string;
  transfer_number: string;
  id_neighbor: string;
  direction: 'outgoing' | 'incoming';
  total_items_count: number | null;
  total_items_value: number | null;
  gold_grams: number | null;
  gold_value: number | null;
  money_amount: number | null;
  total_value: number | null;
  status: string;
  due_date: string | null;
  return_date: string | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  version: number;
}

/**
 * Shop transfer insert type
 */
export interface ShopTransferInsert {
  id_transfer?: string;
  id_shop: string;
  transfer_number?: string;
  id_neighbor: string;
  direction: 'outgoing' | 'incoming';
  total_items_count?: number | null;
  total_items_value?: number | null;
  gold_grams?: number | null;
  gold_value?: number | null;
  money_amount?: number | null;
  total_value?: number | null;
  status?: string;
  due_date?: string | null;
  return_date?: string | null;
  notes?: string | null;
  created_by: string;
}

/**
 * Shop transfer update type
 */
export interface ShopTransferUpdate {
  status?: string;
  notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  updated_at?: string;
  updated_by?: string | null;
}

/**
 * Shop transfer item row type from public.shop_transfer_items table
 */
export interface ShopTransferItem {
  id_transfer_item: string;
  id_shop: string;
  id_transfer: string;
  id_inventory_item: string;
  item_name: string;
  item_sku: string | null;
  weight_grams: number | null;
  metal_type: string | null;
  metal_purity: string | null;
  category_name: string | null;
  item_value: number;
  status: string | null;
  returned_at: string | null;
  returned_by: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Neighbor shop row type from public.neighbor_shops table
 */
export interface NeighborShop {
  id_neighbor: string;
  id_shop: string;
  neighbor_type: 'internal' | 'external';
  id_neighbor_shop: string | null;
  external_shop_name: string | null;
  external_shop_phone: string | null;
  external_shop_address: string | null;
  status: string | null;
  balance_items_value: number | null;
  balance_gold_grams: number | null;
  balance_gold_value: number | null;
  balance_money: number | null;
  balance_total: number | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  version: number;
}

/**
 * Shop basic info type for joins
 */
export interface ShopInfo {
  id_shop: string;
  shop_name: string;
  shop_logo?: string | null;
}

/**
 * Neighbor shop with expanded internal shop info
 */
export interface NeighborShopWithDetails extends NeighborShop {
  /** Internal shop info (if neighbor_type is 'internal') */
  internal_shop?: ShopInfo | null;
}

/**
 * Transfer item with inventory reference
 */
export interface TransferItemWithDetails extends ShopTransferItem {
  /** Inventory item reference (for linking back) */
  inventory_item?: {
    id_item: string;
    status: string | null;
  } | null;
}

/**
 * Transfer with neighbor and item details
 */
export interface TransferWithDetails extends ShopTransfer {
  /** Neighbor shop info (expanded via join) */
  neighbor?: NeighborShopWithDetails | null;
  /** Transfer items */
  items?: TransferItemWithDetails[];
  /** Count of items (from total_items_count or computed) */
  items_count?: number;
}

/**
 * Transfer status type
 */
export type TransferStatus = 'pending' | 'shipped' | 'received' | 'rejected';

/**
 * Transfer direction relative to the current shop
 */
export type TransferDirection = 'outgoing' | 'incoming';

/**
 * Options for filtering and paginating transfer queries
 */
export interface UseTransfersOptions {
  /** Filter by transfer direction (outgoing/incoming) */
  direction?: TransferDirection;
  /** Search term for transfer number (ilike search) */
  search?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: 'created_at' | 'transfer_number' | 'status' | 'total_value';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Filter by status */
  status?: TransferStatus;
  /** Filter by date range - start */
  dateFrom?: string;
  /** Filter by date range - end */
  dateTo?: string;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for the useTransfers hook
 */
export interface UseTransfersReturn {
  /** Array of transfers */
  transfers: TransferWithDetails[];
  /** Total count of matching transfers */
  totalCount: number;
  /** Current page number */
  page: number;
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
}

/**
 * Options for neighbor shop queries
 */
export interface UseNeighborShopsOptions {
  /** Search term for shop name */
  search?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 50) */
  pageSize?: number;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for useNeighborShops hook
 */
export interface UseNeighborShopsReturn {
  /** Array of neighbor shops */
  neighborShops: NeighborShopWithDetails[];
  /** Total count of neighbor shops */
  totalCount: number;
  /** True while loading */
  isLoading: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

// =============================================================================
// QUERY KEY EXTENSIONS
// =============================================================================

/**
 * Extended query keys for transfers
 */
export const transferKeys = {
  /** All transfers for a shop */
  all: (shopId: string) => ['transfers', shopId] as const,

  /** Transfer list with filters */
  list: (shopId: string, direction?: TransferDirection) =>
    ['transfers', shopId, 'list', direction] as const,

  /** Single transfer */
  detail: (shopId: string, transferId: string) => ['transfers', shopId, transferId] as const,

  /** Neighbor shops */
  neighbors: (shopId: string) => ['neighbor-shops', shopId] as const,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the display name for a neighbor shop
 */
export function getNeighborDisplayName(neighbor?: NeighborShopWithDetails | null): string {
  if (!neighbor) {
    return '-';
  }

  if (neighbor.neighbor_type === 'internal' && neighbor.internal_shop) {
    return neighbor.internal_shop.shop_name;
  }

  if (neighbor.neighbor_type === 'external' && neighbor.external_shop_name) {
    return neighbor.external_shop_name;
  }

  return '-';
}

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

/**
 * Fetches transfers with pagination and filtering
 */
async function fetchTransfers(
  shopId: string,
  options: UseTransfersOptions
): Promise<{ transfers: TransferWithDetails[]; totalCount: number }> {
  const {
    direction,
    search,
    page = 1,
    pageSize = 20,
    sortBy = 'created_at',
    sortDirection = 'desc',
    status,
    dateFrom,
    dateTo,
  } = options;

  const supabase = createClient();
  const offset = (page - 1) * pageSize;

  // Build the query - fetch transfers belonging to this shop
  let query = supabase.from('shop_transfers').select(
    `
      *,
      neighbor:neighbor_shops!shop_transfers_id_neighbor_fkey (
        *,
        internal_shop:shops!neighbor_shops_id_neighbor_shop_fkey (
          id_shop,
          shop_name,
          shop_logo
        )
      )
    `,
    { count: 'exact' }
  );

  // Filter by shop
  query = query.eq('id_shop', shopId);

  // Filter by direction
  if (direction) {
    query = query.eq('direction', direction);
  }

  // Exclude soft-deleted records
  query = query.is('deleted_at', null);

  // Apply search filter (transfer number)
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.ilike('transfer_number', searchTerm);
  }

  // Apply status filter
  if (status) {
    query = query.eq('status', status);
  }

  // Apply date range filter
  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch transfers: ${error.message}`);
  }

  // Type assertion needed because Supabase client doesn't know about FK relationships
  const typedData = data as unknown as Array<
    ShopTransfer & {
      neighbor: NeighborShopWithDetails | null;
    }
  >;

  const transfers = (typedData ?? []).map((transfer) => ({
    ...transfer,
    items_count: transfer.total_items_count ?? 0,
  })) as TransferWithDetails[];

  return {
    transfers,
    totalCount: count ?? 0,
  };
}

/**
 * Fetches a single transfer by ID with full details
 */
async function fetchTransfer(
  shopId: string,
  transferId: string
): Promise<TransferWithDetails | null> {
  const supabase = createClient();

  const { data: transfer, error } = await supabase
    .from('shop_transfers')
    .select(
      `
      *,
      neighbor:neighbor_shops!shop_transfers_id_neighbor_fkey (
        *,
        internal_shop:shops!neighbor_shops_id_neighbor_shop_fkey (
          id_shop,
          shop_name,
          shop_logo
        )
      )
    `
    )
    .eq('id_transfer', transferId)
    .eq('id_shop', shopId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch transfer: ${error.message}`);
  }

  // Fetch transfer items
  const { data: items, error: itemsError } = await supabase
    .from('shop_transfer_items')
    .select(
      `
      *,
      inventory_item:inventory_items (
        id_item,
        status
      )
    `
    )
    .eq('id_transfer', transferId);

  if (itemsError) {
    throw new Error(`Failed to fetch transfer items: ${itemsError.message}`);
  }

  // Type assertions needed because Supabase client doesn't know about FK relationships
  const typedTransfer = transfer as unknown as ShopTransfer & {
    neighbor: NeighborShopWithDetails | null;
  };
  const typedItems = (items ?? []) as unknown as TransferItemWithDetails[];

  return {
    ...typedTransfer,
    items: typedItems,
    items_count: typedItems.length ?? typedTransfer.total_items_count ?? 0,
  } as TransferWithDetails;
}

/**
 * Fetches neighbor shops for the current shop
 */
async function fetchNeighborShops(
  shopId: string,
  options: UseNeighborShopsOptions
): Promise<{
  neighborShops: NeighborShopWithDetails[];
  totalCount: number;
}> {
  const { search, page = 1, pageSize = 50 } = options;

  const supabase = createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('neighbor_shops')
    .select(
      `
      *,
      internal_shop:shops!neighbor_shops_id_neighbor_shop_fkey (
        id_shop,
        shop_name,
        shop_logo
      )
    `,
      { count: 'exact' }
    )
    .eq('id_shop', shopId)
    .eq('status', 'active')
    .is('deleted_at', null);

  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch neighbor shops: ${error.message}`);
  }

  // Type assertion needed because Supabase client doesn't know about FK relationships
  let results = (data ?? []) as unknown as NeighborShopWithDetails[];

  // Apply search filter on shop name (both internal and external)
  if (search && search.trim()) {
    const searchLower = search.trim().toLowerCase();
    results = results.filter((ns) => {
      if (ns.neighbor_type === 'internal') {
        return ns.internal_shop?.shop_name?.toLowerCase().includes(searchLower);
      } else {
        return ns.external_shop_name?.toLowerCase().includes(searchLower);
      }
    });
  }

  return {
    neighborShops: results,
    totalCount: count ?? 0,
  };
}

// =============================================================================
// TRANSFER HOOKS
// =============================================================================

/**
 * Hook to fetch paginated transfer list with search and filtering.
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated transfer list with metadata
 */
export function useTransfers(options: UseTransfersOptions = {}): UseTransfersReturn {
  const { shopId, hasAccess } = useShop();
  const {
    direction,
    search = '',
    page = 1,
    pageSize = 20,
    sortBy = 'created_at',
    sortDirection = 'desc',
    status,
    dateFrom,
    dateTo,
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: [
      ...transferKeys.all(shopId ?? ''),
      {
        direction,
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        status,
        dateFrom,
        dateTo,
      },
    ],
    queryFn: () =>
      fetchTransfers(shopId!, {
        direction,
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        status,
        dateFrom,
        dateTo,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  const transfers = data?.transfers ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    transfers,
    totalCount,
    page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    isLoading,
    isInitialLoading: isLoading && !data,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to fetch a single transfer by ID with full details
 *
 * @param transferId - The transfer ID to fetch
 * @param options - Query options
 * @returns Transfer data with items
 */
export function useTransfer(transferId: string, options: { enabled?: boolean } = {}) {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  return useQuery({
    queryKey: transferKeys.detail(shopId ?? '', transferId),
    queryFn: () => fetchTransfer(shopId!, transferId),
    enabled: !!shopId && !!transferId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch neighbor shops for transfer destinations
 *
 * @param options - Query options
 * @returns Neighbor shops list
 */
export function useNeighborShops(options: UseNeighborShopsOptions = {}): UseNeighborShopsReturn {
  const { shopId, hasAccess } = useShop();
  const { search, page = 1, pageSize = 50, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: [...transferKeys.neighbors(shopId ?? ''), { search, page, pageSize }],
    queryFn: () => fetchNeighborShops(shopId!, { search, page, pageSize }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data, isLoading, error, refetch } = queryResult;

  return {
    neighborShops: data?.neighborShops ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// =============================================================================
// TRANSFER MUTATIONS
// =============================================================================

/**
 * Hook to create a new transfer
 */
export function useCreateTransfer() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      neighborId: string;
      itemIds: string[];
      notes?: string;
      direction?: TransferDirection;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get public user ID
      const { data: publicUser } = await supabase
        .from('users')
        .select('id_user')
        .eq('auth_id', user.id)
        .single();

      if (!publicUser) {
        throw new Error('User not found');
      }

      // Fetch selected inventory items for denormalized data
      // Note: metal_type and metal_purity are FKs, need to join with their tables
      const { data: inventoryItems, error: itemsFetchError } = await supabase
        .from('inventory_items')
        .select(
          `
          id_item,
          item_name,
          sku,
          weight_grams,
          purchase_price,
          id_metal_type,
          id_metal_purity,
          metal_type_rel:metal_types!inventory_items_id_metal_type_fkey(metal_name),
          metal_purity_rel:metal_purities!inventory_items_id_metal_purity_fkey(purity_name)
        `
        )
        .in('id_item', data.itemIds);

      if (itemsFetchError) {
        throw new Error(`Failed to fetch inventory items: ${itemsFetchError.message}`);
      }

      if (!inventoryItems || inventoryItems.length === 0) {
        throw new Error('No valid inventory items selected');
      }

      // Fetch category names
      const { data: itemCategories } = await supabase
        .from('inventory_items')
        .select(
          'id_item, category:product_categories!inventory_items_id_category_fkey(category_name)'
        )
        .in('id_item', data.itemIds);

      // Type assertion needed because Supabase client doesn't know about FK relationships
      const typedItemCategories = itemCategories as unknown as Array<{
        id_item: string;
        category: { category_name: string } | null;
      }>;

      const categoryMap = new Map(
        typedItemCategories?.map((ic) => [ic.id_item, ic.category?.category_name || null]) ?? []
      );

      // Type the inventory items result
      const typedInventoryItems = inventoryItems as unknown as Array<{
        id_item: string;
        item_name: string;
        sku: string | null;
        weight_grams: number | null;
        purchase_price: number | null;
        id_metal_type: string | null;
        id_metal_purity: string | null;
        metal_type_rel: { metal_name: string } | null;
        metal_purity_rel: { purity_name: string } | null;
      }>;

      // Calculate totals
      const totalItemsCount = typedInventoryItems.length;
      const totalItemsValue = typedInventoryItems.reduce(
        (sum, item) => sum + (item.purchase_price || 0),
        0
      );
      const goldGrams = typedInventoryItems.reduce(
        (sum, item) => sum + (item.weight_grams || 0),
        0
      );

      // Determine transfer direction (default to 'outgoing' if not specified)
      const transferDirection: TransferDirection = data.direction || 'outgoing';

      // Create the transfer
      const { data: transfer, error: transferError } = await supabase
        .from('shop_transfers')
        .insert({
          id_shop: shopId,
          id_neighbor: data.neighborId,
          direction: transferDirection,
          total_items_count: totalItemsCount,
          total_items_value: totalItemsValue,
          gold_grams: goldGrams,
          status: 'pending',
          notes: data.notes || null,
          created_by: publicUser.id_user,
        })
        .select()
        .single();

      if (transferError) {
        throw new Error(`Failed to create transfer: ${transferError.message}`);
      }

      // Add transfer items with denormalized data
      const transferItems = typedInventoryItems.map((item) => ({
        id_shop: shopId,
        id_transfer: transfer.id_transfer,
        id_inventory_item: item.id_item,
        item_name: item.item_name,
        item_sku: item.sku || null,
        weight_grams: item.weight_grams || null,
        metal_type: item.metal_type_rel?.metal_name || null,
        metal_purity: item.metal_purity_rel?.purity_name || null,
        category_name: categoryMap.get(item.id_item) || null,
        item_value: item.purchase_price || 0,
        status: 'transferred',
        created_by: publicUser.id_user,
      }));

      const { error: itemsError } = await supabase
        .from('shop_transfer_items')
        .insert(transferItems);

      if (itemsError) {
        // Rollback transfer if items fail
        await supabase.from('shop_transfers').delete().eq('id_transfer', transfer.id_transfer);
        throw new Error(`Failed to add transfer items: ${itemsError.message}`);
      }

      // Update inventory item status to 'transferred'
      const { error: statusUpdateError } = await supabase
        .from('inventory_items')
        .update({ status: 'transferred', updated_at: new Date().toISOString() })
        .in('id_item', data.itemIds);

      if (statusUpdateError) {
        console.error('Warning: Failed to update inventory status:', statusUpdateError);
        // Don't rollback - transfer was created successfully
      }

      return transfer;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: transferKeys.all(shopId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory(shopId) });
      }
    },
  });
}

/**
 * Hook to update transfer status (ship, receive, reject)
 */
export function useUpdateTransferStatus() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transferId,
      status,
      notes,
    }: {
      transferId: string;
      status: TransferStatus;
      notes?: string;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: publicUser } = await supabase
        .from('users')
        .select('id_user')
        .eq('auth_id', user.id)
        .single();

      const updateData: ShopTransferUpdate = {
        status,
        updated_at: new Date().toISOString(),
        updated_by: publicUser?.id_user,
      };

      // Add approval/rejection fields based on status
      if (status === 'received') {
        updateData.approved_by = publicUser?.id_user;
        updateData.approved_at = new Date().toISOString();
      } else if (status === 'rejected') {
        updateData.rejected_by = publicUser?.id_user;
        updateData.rejected_at = new Date().toISOString();
        if (notes) {
          updateData.rejection_reason = notes;
        }
      }

      const { data: transfer, error } = await supabase
        .from('shop_transfers')
        .update(updateData)
        .eq('id_transfer', transferId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update transfer status: ${error.message}`);
      }

      // If rejected, restore inventory items to 'available' status
      if (status === 'rejected') {
        const { data: transferItems } = await supabase
          .from('shop_transfer_items')
          .select('id_inventory_item')
          .eq('id_transfer', transferId);

        if (transferItems && transferItems.length > 0) {
          const itemIds = transferItems.map((ti) => ti.id_inventory_item);
          await supabase
            .from('inventory_items')
            .update({ status: 'available', updated_at: new Date().toISOString() })
            .in('id_item', itemIds);
        }
      }

      return transfer;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: transferKeys.all(shopId) });
        queryClient.invalidateQueries({
          queryKey: transferKeys.detail(shopId, variables.transferId),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory(shopId) });
      }
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Utility to invalidate transfer caches
 */
export function useInvalidateTransfers() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all transfer queries for current shop */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({ queryKey: transferKeys.all(shopId) });
      }
      return undefined;
    },
    /** Invalidate a specific transfer */
    invalidateOne: (transferId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: transferKeys.detail(shopId, transferId),
        });
      }
      return undefined;
    },
  };
}

// =============================================================================
// NEIGHBOR SHOP MUTATIONS
// =============================================================================

/**
 * Input type for creating a neighbor shop
 */
export interface CreateNeighborShopInput {
  neighborType: 'internal' | 'external';
  /** For internal type: the shop ID of the neighbor */
  neighborShopId?: string;
  /** For external type: the shop name */
  externalShopName?: string;
  /** For external type: contact phone */
  externalShopPhone?: string;
  /** For external type: address */
  externalShopAddress?: string;
  /** Optional notes */
  notes?: string;
}

/**
 * Input type for updating a neighbor shop
 */
export interface UpdateNeighborShopInput {
  neighborId: string;
  /** For external type: the shop name */
  externalShopName?: string;
  /** For external type: contact phone */
  externalShopPhone?: string;
  /** For external type: address */
  externalShopAddress?: string;
  /** Status: active or inactive */
  status?: 'active' | 'inactive';
  /** Optional notes */
  notes?: string;
}

/**
 * Hook to create a new neighbor shop relationship
 */
export function useCreateNeighborShop() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNeighborShopInput) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get public user ID
      const { data: publicUser } = await supabase
        .from('users')
        .select('id_user')
        .eq('auth_id', user.id)
        .single();

      if (!publicUser) {
        throw new Error('User not found');
      }

      // Validate input
      if (data.neighborType === 'internal' && !data.neighborShopId) {
        throw new Error('Neighbor shop ID is required for internal type');
      }

      if (data.neighborType === 'external' && !data.externalShopName) {
        throw new Error('External shop name is required for external type');
      }

      // Check if neighbor relationship already exists
      let existingQuery = supabase
        .from('neighbor_shops')
        .select('id_neighbor')
        .eq('id_shop', shopId)
        .is('deleted_at', null);

      if (data.neighborType === 'internal') {
        existingQuery = existingQuery.eq('id_neighbor_shop', data.neighborShopId!);
      } else {
        existingQuery = existingQuery
          .eq('neighbor_type', 'external')
          .eq('external_shop_name', data.externalShopName!);
      }

      const { data: existing } = await existingQuery;

      if (existing && existing.length > 0) {
        throw new Error('This neighbor shop relationship already exists');
      }

      // Create the neighbor shop
      const { data: neighborShop, error } = await supabase
        .from('neighbor_shops')
        .insert({
          id_shop: shopId,
          neighbor_type: data.neighborType,
          id_neighbor_shop: data.neighborType === 'internal' ? data.neighborShopId : null,
          external_shop_name: data.neighborType === 'external' ? data.externalShopName : null,
          external_shop_phone: data.neighborType === 'external' ? data.externalShopPhone : null,
          external_shop_address: data.neighborType === 'external' ? data.externalShopAddress : null,
          status: 'active',
          notes: data.notes || null,
          created_by: publicUser.id_user,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create neighbor shop: ${error.message}`);
      }

      return neighborShop;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: transferKeys.neighbors(shopId) });
      }
    },
  });
}

/**
 * Hook to update a neighbor shop
 */
export function useUpdateNeighborShop() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateNeighborShopInput) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get public user ID
      const { data: publicUser } = await supabase
        .from('users')
        .select('id_user')
        .eq('auth_id', user.id)
        .single();

      // Build update data
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        updated_by: publicUser?.id_user,
      };

      if (data.externalShopName !== undefined) {
        updateData.external_shop_name = data.externalShopName;
      }
      if (data.externalShopPhone !== undefined) {
        updateData.external_shop_phone = data.externalShopPhone;
      }
      if (data.externalShopAddress !== undefined) {
        updateData.external_shop_address = data.externalShopAddress;
      }
      if (data.status !== undefined) {
        updateData.status = data.status;
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes;
      }

      const { data: neighborShop, error } = await supabase
        .from('neighbor_shops')
        .update(updateData)
        .eq('id_neighbor', data.neighborId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update neighbor shop: ${error.message}`);
      }

      return neighborShop;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: transferKeys.neighbors(shopId) });
      }
    },
  });
}

/**
 * Hook to delete (soft delete) a neighbor shop
 */
export function useDeleteNeighborShop() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (neighborId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get public user ID
      const { data: publicUser } = await supabase
        .from('users')
        .select('id_user')
        .eq('auth_id', user.id)
        .single();

      // Soft delete - set deleted_at
      const { error } = await supabase
        .from('neighbor_shops')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: publicUser?.id_user,
          status: 'inactive',
        })
        .eq('id_neighbor', neighborId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to delete neighbor shop: ${error.message}`);
      }

      return { success: true };
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: transferKeys.neighbors(shopId) });
      }
    },
  });
}

/**
 * Hook to fetch all neighbor shops (including inactive) for management
 */
export function useNeighborShopsForManagement(
  options: UseNeighborShopsOptions = {}
): UseNeighborShopsReturn & { isFetching: boolean } {
  const { shopId, hasAccess } = useShop();
  const { search, page = 1, pageSize = 50, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: [...transferKeys.neighbors(shopId ?? ''), 'management', { search, page, pageSize }],
    queryFn: async () => {
      const supabase = createClient();
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from('neighbor_shops')
        .select(
          `
          *,
          internal_shop:shops!neighbor_shops_id_neighbor_shop_fkey (
            id_shop,
            shop_name,
            shop_logo
          )
        `,
          { count: 'exact' }
        )
        .eq('id_shop', shopId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch neighbor shops: ${error.message}`);
      }

      let results = (data ?? []) as unknown as NeighborShopWithDetails[];

      // Apply search filter on shop name (both internal and external)
      if (search && search.trim()) {
        const searchLower = search.trim().toLowerCase();
        results = results.filter((ns) => {
          if (ns.neighbor_type === 'internal') {
            return ns.internal_shop?.shop_name?.toLowerCase().includes(searchLower);
          } else {
            return ns.external_shop_name?.toLowerCase().includes(searchLower);
          }
        });
      }

      return {
        neighborShops: results,
        totalCount: count ?? 0,
      };
    },
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  return {
    neighborShops: data?.neighborShops ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}
