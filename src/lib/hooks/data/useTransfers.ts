/**
 * useTransfers Hook
 *
 * TanStack Query hooks for fetching and managing shop transfers.
 * Supports pagination, search, and filtering by direction/status/date.
 *
 * Key features:
 * - Paginated transfer list with status/direction/date filters
 * - Single transfer with items and shop details
 * - Neighbor shops list for transfer destinations
 * - CRUD mutations for transfers
 * - Status update mutations (ship, receive, reject)
 *
 * @module lib/hooks/data/useTransfers
 */

'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { queryKeys } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/types/database';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Shop transfer row type from the public.shop_transfers table
 */
export type ShopTransfer = Tables<'shop_transfers'>;

/**
 * Shop transfer insert type for creating new transfers
 */
export type ShopTransferInsert = TablesInsert<'shop_transfers'>;

/**
 * Shop transfer update type for updating transfers
 */
export type ShopTransferUpdate = TablesUpdate<'shop_transfers'>;

/**
 * Shop transfer item row type
 */
export type ShopTransferItem = Tables<'shop_transfer_items'>;

/**
 * Shop transfer item insert type
 */
export type ShopTransferItemInsert = TablesInsert<'shop_transfer_items'>;

/**
 * Neighbor shop row type
 */
export type NeighborShop = Tables<'neighbor_shops'>;

/**
 * Shop basic info type
 */
export interface ShopInfo {
  id_shop: string;
  shop_name: string;
  shop_logo?: string | null;
}

/**
 * Inventory item basic info for transfer items
 */
export interface TransferItemInfo {
  id_item: string;
  item_name: string;
  sku?: string | null;
  barcode?: string | null;
  weight_grams?: number | null;
  purchase_price?: number | null;
  currency?: string | null;
  status?: string | null;
}

/**
 * Transfer item with inventory details
 */
export interface TransferItemWithDetails extends ShopTransferItem {
  inventory_item?: TransferItemInfo | null;
}

/**
 * Transfer with shop and item details
 */
export interface TransferWithDetails extends ShopTransfer {
  from_shop?: ShopInfo | null;
  to_shop?: ShopInfo | null;
  items?: TransferItemWithDetails[];
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
  sortBy?: keyof ShopTransfer;
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
  neighborShops: (NeighborShop & { neighbor_shop?: ShopInfo | null })[];
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

  // Build the base query with shop filter based on direction
  let query = supabase.from('shop_transfers').select(
    `
      *,
      from_shop:shops!shop_transfers_from_shop_fkey (
        id_shop,
        shop_name,
        shop_logo
      ),
      to_shop:shops!shop_transfers_to_shop_fkey (
        id_shop,
        shop_name,
        shop_logo
      )
    `,
    { count: 'exact' }
  );

  // Filter by direction
  if (direction === 'outgoing') {
    query = query.eq('from_shop', shopId);
  } else if (direction === 'incoming') {
    query = query.eq('to_shop', shopId);
  } else {
    // Show both incoming and outgoing
    query = query.or(`from_shop.eq.${shopId},to_shop.eq.${shopId}`);
  }

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

  // Get items count for each transfer
  const transfersWithCounts = await Promise.all(
    (data ?? []).map(async (transfer) => {
      const { count: itemsCount } = await supabase
        .from('shop_transfer_items')
        .select('*', { count: 'exact', head: true })
        .eq('id_transfer', transfer.id_transfer);

      return {
        ...transfer,
        items_count: itemsCount ?? 0,
      } as TransferWithDetails;
    })
  );

  return {
    transfers: transfersWithCounts,
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
      from_shop:shops!shop_transfers_from_shop_fkey (
        id_shop,
        shop_name,
        shop_logo
      ),
      to_shop:shops!shop_transfers_to_shop_fkey (
        id_shop,
        shop_name,
        shop_logo
      )
    `
    )
    .eq('id_transfer', transferId)
    .or(`from_shop.eq.${shopId},to_shop.eq.${shopId}`)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch transfer: ${error.message}`);
  }

  // Fetch transfer items with inventory details
  const { data: items, error: itemsError } = await supabase
    .from('shop_transfer_items')
    .select(
      `
      *,
      inventory_item:inventory_items (
        id_item,
        item_name,
        sku,
        barcode,
        weight_grams,
        purchase_price,
        currency,
        status
      )
    `
    )
    .eq('id_transfer', transferId);

  if (itemsError) {
    throw new Error(`Failed to fetch transfer items: ${itemsError.message}`);
  }

  return {
    ...transfer,
    items: (items ?? []) as TransferItemWithDetails[],
    items_count: items?.length ?? 0,
  } as TransferWithDetails;
}

/**
 * Fetches neighbor shops for the current shop
 */
async function fetchNeighborShops(
  shopId: string,
  options: UseNeighborShopsOptions
): Promise<{
  neighborShops: (NeighborShop & { neighbor_shop?: ShopInfo | null })[];
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
      neighbor_shop:shops!neighbor_shops_neighbor_shop_id_fkey (
        id_shop,
        shop_name,
        shop_logo
      )
    `,
      { count: 'exact' }
    )
    .eq('id_shop', shopId)
    .eq('status', 'active');

  // Apply search filter
  if (search && search.trim()) {
    // Note: We filter after fetch since we need to search on the joined shop name
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch neighbor shops: ${error.message}`);
  }

  let results = (data ?? []) as (NeighborShop & { neighbor_shop?: ShopInfo | null })[];

  // Apply search filter on shop name
  if (search && search.trim()) {
    const searchLower = search.trim().toLowerCase();
    results = results.filter((ns) =>
      ns.neighbor_shop?.shop_name?.toLowerCase().includes(searchLower)
    );
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
    mutationFn: async (data: { toShopId: string; itemIds: string[]; notes?: string }) => {
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

      // Create the transfer
      const { data: transfer, error: transferError } = await supabase
        .from('shop_transfers')
        .insert({
          from_shop: shopId,
          to_shop: data.toShopId,
          status: 'pending',
          notes: data.notes || null,
          created_by: publicUser.id_user,
        })
        .select()
        .single();

      if (transferError) {
        throw new Error(`Failed to create transfer: ${transferError.message}`);
      }

      // Add transfer items
      const transferItems = data.itemIds.map((itemId) => ({
        id_transfer: transfer.id_transfer,
        id_item: itemId,
      }));

      const { error: itemsError } = await supabase
        .from('shop_transfer_items')
        .insert(transferItems);

      if (itemsError) {
        // Rollback transfer if items fail
        await supabase.from('shop_transfers').delete().eq('id_transfer', transfer.id_transfer);
        throw new Error(`Failed to add transfer items: ${itemsError.message}`);
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

      // Add date fields based on status
      if (status === 'shipped') {
        updateData.shipped_at = new Date().toISOString();
        updateData.shipped_by = publicUser?.id_user;
      } else if (status === 'received') {
        updateData.received_at = new Date().toISOString();
        updateData.received_by = publicUser?.id_user;
      } else if (status === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
        updateData.rejected_by = publicUser?.id_user;
        if (notes) {
          updateData.rejection_reason = notes;
        }
      }

      const { data: transfer, error } = await supabase
        .from('shop_transfers')
        .update(updateData)
        .eq('id_transfer', transferId)
        .or(`from_shop.eq.${shopId},to_shop.eq.${shopId}`)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update transfer status: ${error.message}`);
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
