/**
 * useDeliveries Hook
 *
 * TanStack Query hooks for fetching and managing deliveries and couriers.
 * Supports pagination, search, and filtering by status/courier/date.
 *
 * Key features:
 * - Paginated delivery list with status/courier/date filters
 * - Single delivery with courier details
 * - Courier companies list and management
 * - Courier transactions ledger (immutable)
 * - CRUD mutations for deliveries and couriers
 *
 * @module lib/hooks/data/useDeliveries
 */

'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { queryKeys, invalidateScope } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/types/database';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Delivery row type from the public.deliveries table
 */
export type Delivery = Tables<'deliveries'>;

/**
 * Delivery insert type for creating new deliveries
 */
export type DeliveryInsert = TablesInsert<'deliveries'>;

/**
 * Delivery update type for updating deliveries
 */
export type DeliveryUpdate = TablesUpdate<'deliveries'>;

/**
 * Courier company row type
 */
export type CourierCompany = Tables<'courier_companies'>;

/**
 * Courier company insert type
 */
export type CourierCompanyInsert = TablesInsert<'courier_companies'>;

/**
 * Courier company update type
 */
export type CourierCompanyUpdate = TablesUpdate<'courier_companies'>;

/**
 * Courier transaction row type (immutable ledger)
 */
export type CourierTransaction = Tables<'courier_transactions'>;

/**
 * Delivery with courier details
 */
export interface DeliveryWithCourier extends Delivery {
  courier_companies: CourierCompany | null;
}

/**
 * Delivery status type
 */
export type DeliveryStatus =
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'cancelled';

/**
 * Courier status type
 */
export type CourierStatus = 'active' | 'inactive' | 'suspended';

/**
 * Options for filtering and paginating delivery queries
 */
export interface UseDeliveriesOptions {
  /** Search term for tracking number, recipient name (ilike search) */
  search?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: keyof Delivery;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Filter by status */
  status?: DeliveryStatus;
  /** Filter by courier */
  courierId?: string;
  /** Filter by sale */
  saleId?: string;
  /** Filter by date range - start */
  dateFrom?: string;
  /** Filter by date range - end */
  dateTo?: string;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for the useDeliveries hook
 */
export interface UseDeliveriesReturn {
  /** Array of deliveries */
  deliveries: DeliveryWithCourier[];
  /** Total count of matching deliveries */
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
 * Options for courier queries
 */
export interface UseCouriersOptions {
  /** Search term for company name, contact person, phone (ilike search) */
  search?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: keyof CourierCompany;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Filter by status */
  status?: CourierStatus;
  /** Filter couriers with outstanding balance */
  hasBalance?: boolean;
  /** Include soft-deleted couriers */
  includeDeleted?: boolean;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for useCouriers hook
 */
export interface UseCouriersReturn {
  /** Array of couriers */
  couriers: CourierCompany[];
  /** Total count of matching couriers */
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
 * Options for courier transaction queries
 */
export interface UseCourierTransactionsOptions {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Filter by transaction type */
  transactionType?: string;
  /** Start date for date range filter */
  startDate?: string;
  /** End date for date range filter */
  endDate?: string;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for courier transactions
 */
export interface UseCourierTransactionsReturn {
  /** Array of transactions */
  transactions: CourierTransaction[];
  /** Total count of matching transactions */
  totalCount: number;
  /** Current page number */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** True while loading */
  isLoading: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

/**
 * Fetches deliveries with pagination and filtering
 */
async function fetchDeliveries(
  shopId: string,
  options: UseDeliveriesOptions
): Promise<{ deliveries: DeliveryWithCourier[]; totalCount: number }> {
  const {
    search,
    page = 1,
    pageSize = 20,
    sortBy = 'created_at',
    sortDirection = 'desc',
    status,
    courierId,
    saleId,
    dateFrom,
    dateTo,
  } = options;

  const supabase = createClient();

  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;

  // Build the base query
  let query = supabase
    .from('deliveries')
    .select(
      `
      *,
      courier_companies (*)
    `,
      { count: 'exact' }
    )
    .eq('id_shop', shopId);

  // Apply search filter (tracking number or recipient name)
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(`tracking_number.ilike.${searchTerm},recipient_name.ilike.${searchTerm}`);
  }

  // Apply status filter
  if (status) {
    query = query.eq('status', status);
  }

  // Apply courier filter
  if (courierId) {
    query = query.eq('id_courier', courierId);
  }

  // Apply sale filter
  if (saleId) {
    query = query.eq('id_sale', saleId);
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
    throw new Error(`Failed to fetch deliveries: ${error.message}`);
  }

  return {
    deliveries: (data ?? []) as unknown as DeliveryWithCourier[],
    totalCount: count ?? 0,
  };
}

/**
 * Fetches a single delivery by ID
 */
async function fetchDelivery(
  shopId: string,
  deliveryId: string
): Promise<DeliveryWithCourier | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deliveries')
    .select(
      `
      *,
      courier_companies (*)
    `
    )
    .eq('id_shop', shopId)
    .eq('id_delivery', deliveryId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch delivery: ${error.message}`);
  }

  return data as unknown as DeliveryWithCourier;
}

/**
 * Fetches couriers with pagination and filtering
 */
async function fetchCouriers(
  shopId: string,
  options: UseCouriersOptions
): Promise<{ couriers: CourierCompany[]; totalCount: number }> {
  const {
    search,
    page = 1,
    pageSize = 20,
    sortBy = 'company_name',
    sortDirection = 'asc',
    status,
    hasBalance,
    includeDeleted = false,
  } = options;

  const supabase = createClient();

  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;

  // Build the base query
  let query = supabase
    .from('courier_companies')
    .select('*', { count: 'exact' })
    .eq('id_shop', shopId);

  // Apply soft delete filter
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  // Apply search filter (company name, contact person, or phone)
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `company_name.ilike.${searchTerm},contact_person.ilike.${searchTerm},phone.ilike.${searchTerm}`
    );
  }

  // Apply status filter
  if (status) {
    query = query.eq('status', status);
  }

  // Apply balance filter
  if (hasBalance !== undefined) {
    if (hasBalance) {
      query = query.neq('current_balance', 0);
    } else {
      query = query.eq('current_balance', 0);
    }
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch couriers: ${error.message}`);
  }

  return {
    couriers: data ?? [],
    totalCount: count ?? 0,
  };
}

/**
 * Fetches a single courier by ID
 */
async function fetchCourier(shopId: string, courierId: string): Promise<CourierCompany | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('courier_companies')
    .select('*')
    .eq('id_shop', shopId)
    .eq('id_courier', courierId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch courier: ${error.message}`);
  }

  return data;
}

/**
 * Fetches courier transactions (ledger)
 */
async function fetchCourierTransactions(
  shopId: string,
  courierId: string,
  options: UseCourierTransactionsOptions
): Promise<{ transactions: CourierTransaction[]; totalCount: number }> {
  const { page = 1, pageSize = 20, transactionType, startDate, endDate } = options;

  const supabase = createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('courier_transactions')
    .select('*', { count: 'exact' })
    .eq('id_shop', shopId)
    .eq('id_courier', courierId);

  // Apply transaction type filter
  if (transactionType) {
    query = query.eq('transaction_type', transactionType);
  }

  // Apply date range filter
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  // Order by most recent first (sequence_number for consistency)
  query = query.order('sequence_number', { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch courier transactions: ${error.message}`);
  }

  return {
    transactions: data ?? [],
    totalCount: count ?? 0,
  };
}

// =============================================================================
// DELIVERY HOOKS
// =============================================================================

/**
 * Hook to fetch paginated delivery list with search and filtering.
 *
 * Features:
 * - Automatic shop scoping via useShop
 * - Search by tracking number or recipient name
 * - Pagination with page navigation
 * - Sorting by any delivery field
 * - Filtering by status, courier, sale, and date range
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated delivery list with metadata
 *
 * @example
 * ```tsx
 * function DeliveryList() {
 *   const [status, setStatus] = useState<DeliveryStatus | undefined>();
 *   const [page, setPage] = useState(1);
 *
 *   const {
 *     deliveries,
 *     totalCount,
 *     totalPages,
 *     hasNextPage,
 *     isLoading,
 *     error
 *   } = useDeliveries({
 *     status,
 *     page,
 *     pageSize: 20,
 *     sortBy: 'created_at',
 *     sortDirection: 'desc'
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       <StatusFilter value={status} onChange={setStatus} />
 *       <DeliveryTable deliveries={deliveries} />
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
export function useDeliveries(options: UseDeliveriesOptions = {}): UseDeliveriesReturn {
  const { shopId, hasAccess } = useShop();
  const {
    search = '',
    page = 1,
    pageSize = 20,
    sortBy = 'created_at',
    sortDirection = 'desc',
    status,
    courierId,
    saleId,
    dateFrom,
    dateTo,
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.deliveries(shopId ?? ''),
      {
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        status,
        courierId,
        saleId,
        dateFrom,
        dateTo,
      },
    ],
    queryFn: () =>
      fetchDeliveries(shopId!, {
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        status,
        courierId,
        saleId,
        dateFrom,
        dateTo,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  const deliveries = data?.deliveries ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    deliveries,
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
 * Hook to fetch a single delivery by ID
 *
 * @param deliveryId - The delivery ID to fetch
 * @param options - Query options
 * @returns Delivery data with courier
 *
 * @example
 * ```tsx
 * const { data: delivery, isLoading, error } = useDelivery('delivery-uuid');
 * ```
 */
export function useDelivery(deliveryId: string, options: { enabled?: boolean } = {}) {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.delivery(shopId ?? '', deliveryId),
    queryFn: () => fetchDelivery(shopId!, deliveryId),
    enabled: !!shopId && !!deliveryId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// COURIER HOOKS
// =============================================================================

/**
 * Hook to fetch paginated courier list with search and filtering.
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated courier list with metadata
 *
 * @example
 * ```tsx
 * const { couriers, isLoading } = useCouriers({
 *   status: 'active',
 *   sortBy: 'company_name'
 * });
 * ```
 */
export function useCouriers(options: UseCouriersOptions = {}): UseCouriersReturn {
  const { shopId, hasAccess } = useShop();
  const {
    search = '',
    page = 1,
    pageSize = 20,
    sortBy = 'company_name',
    sortDirection = 'asc',
    status,
    hasBalance,
    includeDeleted = false,
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.couriers(shopId ?? ''),
      { search, page, pageSize, sortBy, sortDirection, status, hasBalance, includeDeleted },
    ],
    queryFn: () =>
      fetchCouriers(shopId!, {
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        status,
        hasBalance,
        includeDeleted,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - couriers change less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  const couriers = data?.couriers ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    couriers,
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
 * Hook to fetch a single courier by ID
 *
 * @param courierId - The courier ID to fetch
 * @param options - Query options
 * @returns Courier data
 *
 * @example
 * ```tsx
 * const { data: courier, isLoading, error } = useCourier('courier-uuid');
 * ```
 */
export function useCourier(courierId: string, options: { enabled?: boolean } = {}) {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.courier(shopId ?? '', courierId),
    queryFn: () => fetchCourier(shopId!, courierId),
    enabled: !!shopId && !!courierId && hasAccess && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch courier transactions (ledger)
 *
 * NOTE: courier_transactions is an IMMUTABLE ledger - only INSERTs allowed
 *
 * @param courierId - The courier ID to fetch transactions for
 * @param options - Query options for filtering and pagination
 * @returns Paginated transaction list
 *
 * @example
 * ```tsx
 * const {
 *   transactions,
 *   totalCount,
 *   isLoading
 * } = useCourierTransactions('courier-uuid', {
 *   page: 1,
 *   pageSize: 20
 * });
 * ```
 */
export function useCourierTransactions(
  courierId: string,
  options: UseCourierTransactionsOptions = {}
): UseCourierTransactionsReturn {
  const { shopId, hasAccess } = useShop();
  const { page = 1, pageSize = 20, transactionType, startDate, endDate, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.courierTransactions(shopId ?? '', courierId),
      { page, pageSize, transactionType, startDate, endDate },
    ],
    queryFn: () =>
      fetchCourierTransactions(shopId!, courierId, {
        page,
        pageSize,
        transactionType,
        startDate,
        endDate,
      }),
    enabled: !!shopId && !!courierId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, error, refetch } = queryResult;

  const transactions = data?.transactions ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    transactions,
    totalCount,
    page,
    totalPages,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// =============================================================================
// DELIVERY MUTATIONS
// =============================================================================

/**
 * Hook to create a new delivery
 *
 * @example
 * ```tsx
 * const createDelivery = useCreateDelivery();
 *
 * const handleCreate = async (data: DeliveryInsert) => {
 *   try {
 *     const newDelivery = await createDelivery.mutateAsync(data);
 *     toast.success('Delivery created!');
 *   } catch (error) {
 *     toast.error('Failed to create delivery');
 *   }
 * };
 * ```
 */
export function useCreateDelivery() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<DeliveryInsert, 'id_shop' | 'created_by'>) => {
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

      const insertData: DeliveryInsert = {
        ...data,
        id_shop: shopId,
        created_by: publicUser.id_user,
      };

      const { data: delivery, error } = await supabase
        .from('deliveries')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create delivery: ${error.message}`);
      }

      return delivery;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.deliveries(shopId) });
      }
    },
  });
}

/**
 * Hook to update an existing delivery
 *
 * @example
 * ```tsx
 * const updateDelivery = useUpdateDelivery();
 *
 * const handleUpdate = async (deliveryId: string, data: DeliveryUpdate) => {
 *   try {
 *     await updateDelivery.mutateAsync({ deliveryId, data });
 *     toast.success('Delivery updated!');
 *   } catch (error) {
 *     toast.error('Failed to update delivery');
 *   }
 * };
 * ```
 */
export function useUpdateDelivery() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ deliveryId, data }: { deliveryId: string; data: DeliveryUpdate }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user for updated_by
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

      const { data: delivery, error } = await supabase
        .from('deliveries')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
          updated_by: publicUser?.id_user,
        })
        .eq('id_delivery', deliveryId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update delivery: ${error.message}`);
      }

      return delivery;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.deliveries(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.delivery(shopId, variables.deliveryId),
        });
      }
    },
  });
}

/**
 * Hook to update delivery status
 *
 * @example
 * ```tsx
 * const updateStatus = useUpdateDeliveryStatus();
 *
 * const handleStatusChange = async (deliveryId: string, status: DeliveryStatus) => {
 *   try {
 *     await updateStatus.mutateAsync({ deliveryId, status });
 *     toast.success('Status updated!');
 *   } catch (error) {
 *     toast.error('Failed to update status');
 *   }
 * };
 * ```
 */
export function useUpdateDeliveryStatus() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      deliveryId,
      status,
      trackingNumber,
      shippedDate,
      deliveredDate,
      notes,
    }: {
      deliveryId: string;
      status: DeliveryStatus;
      trackingNumber?: string | null;
      shippedDate?: string | null;
      deliveredDate?: string | null;
      notes?: string | null;
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

      const updateData: DeliveryUpdate = {
        status,
        updated_at: new Date().toISOString(),
        updated_by: publicUser?.id_user,
      };

      if (trackingNumber !== undefined) {
        updateData.tracking_number = trackingNumber;
      }
      if (shippedDate !== undefined) {
        updateData.shipped_date = shippedDate;
      }
      if (deliveredDate !== undefined) {
        updateData.delivered_date = deliveredDate;
      }
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      // Auto-set dates based on status
      if (status === 'picked_up' && !shippedDate) {
        updateData.shipped_date = new Date().toISOString().split('T')[0];
      }
      if (status === 'delivered' && !deliveredDate) {
        updateData.delivered_date = new Date().toISOString().split('T')[0];
      }

      const { data: delivery, error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id_delivery', deliveryId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update delivery status: ${error.message}`);
      }

      return delivery;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.deliveries(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.delivery(shopId, variables.deliveryId),
        });
      }
    },
  });
}

// =============================================================================
// COURIER MUTATIONS
// =============================================================================

/**
 * Hook to create a new courier
 *
 * @example
 * ```tsx
 * const createCourier = useCreateCourier();
 *
 * const handleCreate = async (data: CourierCompanyInsert) => {
 *   try {
 *     const newCourier = await createCourier.mutateAsync(data);
 *     toast.success('Courier created!');
 *   } catch (error) {
 *     toast.error('Failed to create courier');
 *   }
 * };
 * ```
 */
export function useCreateCourier() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<CourierCompanyInsert, 'id_shop' | 'created_by'>) => {
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

      const insertData: CourierCompanyInsert = {
        ...data,
        id_shop: shopId,
        created_by: publicUser.id_user,
      };

      const { data: courier, error } = await supabase
        .from('courier_companies')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create courier: ${error.message}`);
      }

      return courier;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.couriers(shopId) });
      }
    },
  });
}

/**
 * Hook to update an existing courier
 *
 * @example
 * ```tsx
 * const updateCourier = useUpdateCourier();
 *
 * const handleUpdate = async (courierId: string, data: CourierCompanyUpdate) => {
 *   try {
 *     await updateCourier.mutateAsync({ courierId, data });
 *     toast.success('Courier updated!');
 *   } catch (error) {
 *     toast.error('Failed to update courier');
 *   }
 * };
 * ```
 */
export function useUpdateCourier() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courierId, data }: { courierId: string; data: CourierCompanyUpdate }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user for updated_by
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

      const { data: courier, error } = await supabase
        .from('courier_companies')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
          updated_by: publicUser?.id_user,
        })
        .eq('id_courier', courierId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update courier: ${error.message}`);
      }

      return courier;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.couriers(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.courier(shopId, variables.courierId),
        });
      }
    },
  });
}

/**
 * Hook to soft-delete a courier
 *
 * Note: This performs a soft delete by setting deleted_at.
 * The courier's balance should be zero before deletion.
 *
 * @example
 * ```tsx
 * const deleteCourier = useDeleteCourier();
 *
 * const handleDelete = async (courierId: string) => {
 *   try {
 *     await deleteCourier.mutateAsync(courierId);
 *     toast.success('Courier deleted!');
 *   } catch (error) {
 *     toast.error('Failed to delete courier');
 *   }
 * };
 * ```
 */
export function useDeleteCourier() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courierId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user for updated_by
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let updatedBy: string | undefined;
      if (user) {
        const { data: publicUser } = await supabase
          .from('users')
          .select('id_user')
          .eq('auth_id', user.id)
          .single();
        updatedBy = publicUser?.id_user;
      }

      // Check if courier has outstanding balance
      const { data: courier, error: fetchError } = await supabase
        .from('courier_companies')
        .select('current_balance')
        .eq('id_courier', courierId)
        .eq('id_shop', shopId)
        .is('deleted_at', null)
        .single();

      if (fetchError) {
        throw new Error('Courier not found');
      }

      if (Number(courier.current_balance) !== 0) {
        throw new Error('Cannot delete courier with outstanding balance');
      }

      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('courier_companies')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        })
        .eq('id_courier', courierId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to delete courier: ${error.message}`);
      }

      return { courierId };
    },
    onSuccess: (_, courierId) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.couriers(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.courier(shopId, courierId),
        });
      }
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Utility to invalidate delivery caches
 */
export function useInvalidateDeliveries() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all delivery queries for current shop */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({ queryKey: invalidateScope.deliveries(shopId) });
      }
      return undefined;
    },
    /** Invalidate a specific delivery */
    invalidateOne: (deliveryId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.delivery(shopId, deliveryId),
        });
      }
      return undefined;
    },
  };
}

/**
 * Utility to invalidate courier caches
 */
export function useInvalidateCouriers() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all courier queries for current shop */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({ queryKey: invalidateScope.couriers(shopId) });
      }
      return undefined;
    },
    /** Invalidate a specific courier */
    invalidateOne: (courierId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.courier(shopId, courierId),
        });
      }
      return undefined;
    },
    /** Invalidate courier transactions */
    invalidateTransactions: (courierId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.courierTransactions(shopId, courierId),
        });
      }
      return undefined;
    },
  };
}

/**
 * Local query key definitions for use in components
 */
export const deliveryKeys = {
  all: (shopId: string) => queryKeys.deliveries(shopId),
  one: (shopId: string, deliveryId: string) => queryKeys.delivery(shopId, deliveryId),
  pending: (shopId: string) => queryKeys.pendingDeliveries(shopId),
};

export const courierKeys = {
  all: (shopId: string) => queryKeys.couriers(shopId),
  one: (shopId: string, courierId: string) => queryKeys.courier(shopId, courierId),
  transactions: (shopId: string, courierId: string) =>
    queryKeys.courierTransactions(shopId, courierId),
};
