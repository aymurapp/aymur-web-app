/**
 * useWorkshops Hook
 *
 * TanStack Query hook for fetching and managing workshop lists and orders.
 * Supports pagination, search by name/contact, and filtering by internal/external.
 *
 * @module lib/hooks/data/useWorkshops
 */

'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { queryKeys, invalidateScope } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/types/database';
import type { WorkshopOrderStatus, WorkshopOrderType } from '@/lib/utils/schemas/workshop';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Workshop row type from the public.workshops table
 * Matches the actual database schema columns
 */
export interface Workshop {
  id_workshop: string;
  id_shop: string;
  workshop_name: string;
  is_internal: boolean;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  specialization: string | null;
  hourly_rate: number | null;
  current_balance: number;
  status: string | null;
  notes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  deleted_at: string | null;
}

/**
 * Workshop insert type for creating new workshops
 */
export interface WorkshopInsert {
  id_shop: string;
  workshop_name: string;
  is_internal?: boolean;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  specialization?: string | null;
  hourly_rate?: number | null;
  status?: string | null;
  notes?: string | null;
  created_by: string;
}

/**
 * Workshop update type for updating workshops
 */
export interface WorkshopUpdate {
  workshop_name?: string;
  is_internal?: boolean;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  specialization?: string | null;
  hourly_rate?: number | null;
  status?: string | null;
  notes?: string | null;
  updated_at?: string;
  updated_by?: string | null;
}

/**
 * Workshop order row type
 * Matches the actual database schema columns (workshop_orders table)
 */
export interface WorkshopOrder {
  id_workshop_order: string;
  id_shop: string;
  id_workshop: string;
  id_customer: string | null;
  id_inventory_item: string | null;
  order_number: string;
  order_type: WorkshopOrderType;
  received_date: string;
  estimated_completion_date: string | null;
  completed_date: string | null;
  delivered_date: string | null;
  description: string | null;
  item_description: string | null;
  item_source: string;
  materials_used: Json | null;
  labor_cost: number | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  paid_amount: number;
  payment_status: string | null;
  status: WorkshopOrderStatus | null;
  notes: string | null;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

/**
 * Workshop order with workshop details
 */
export interface WorkshopOrderWithWorkshop extends WorkshopOrder {
  workshops: Pick<
    Workshop,
    | 'id_workshop'
    | 'workshop_name'
    | 'is_internal'
    | 'contact_person'
    | 'phone'
    | 'email'
    | 'specialization'
  > | null;
  workshop_transactions?: WorkshopTransaction[];
}

/**
 * Workshop order with full details including customer
 */
export interface WorkshopOrderFull extends WorkshopOrderWithWorkshop {
  customers: { id_customer: string; full_name: string } | null;
  workshop_transactions?: WorkshopTransaction[];
}

/**
 * Workshop order item row type
 * Note: workshop_order_items table does not exist in database
 * Order item info is stored directly in workshop_orders (item_description, materials_used, etc.)
 * This type is kept for backward compatibility but may be removed in future
 */
export interface WorkshopOrderItem {
  id_order_item: string;
  id_order: string;
  id_shop: string;
  description: string;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  is_completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Workshop transaction row type (immutable ledger)
 * Matches the actual database schema columns
 */
export interface WorkshopTransaction {
  id_transaction: string;
  id_shop: string;
  id_workshop: string;
  sequence_number: number;
  transaction_type: string;
  reference_id: string | null;
  reference_type: string | null;
  debit_amount: number;
  credit_amount: number;
  balance_after: number;
  description: string | null;
  created_by: string;
  created_at: string;
}

/**
 * Options for filtering and paginating workshop queries
 */
export interface UseWorkshopsOptions {
  /** Search term for workshop name, contact, or phone (ilike search) */
  search?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: keyof Workshop;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Filter by internal/external */
  isInternal?: boolean;
  /** Filter by status (active/inactive) */
  status?: 'active' | 'inactive';
  /** Filter by specialization */
  specialization?: string;
  /** Include soft-deleted workshops */
  includeDeleted?: boolean;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for the useWorkshops hook
 */
export interface UseWorkshopsReturn {
  /** Array of workshops */
  workshops: Workshop[];
  /** Total count of matching workshops */
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
 * Options for workshop order queries
 */
export interface UseWorkshopOrdersOptions {
  /** Filter by workshop ID */
  workshopId?: string;
  /** Filter by customer ID */
  customerId?: string;
  /** Filter by order type */
  orderType?: WorkshopOrderType;
  /** Filter by status */
  status?: WorkshopOrderStatus;
  /** Filter by payment status */
  paymentStatus?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: keyof WorkshopOrder;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Start date for date range filter (received_date) */
  startDate?: string;
  /** End date for date range filter (received_date) */
  endDate?: string;
  /** Filter overdue orders (estimated_completion_date < today and not completed) */
  isOverdue?: boolean;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for workshop orders
 */
export interface UseWorkshopOrdersReturn {
  /** Array of orders */
  orders: WorkshopOrderWithWorkshop[];
  /** Total count of matching orders */
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

/**
 * Options for workshop transaction queries
 */
export interface UseWorkshopTransactionsOptions {
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
 * Return type for workshop transactions
 */
export interface UseWorkshopTransactionsReturn {
  /** Array of transactions */
  transactions: WorkshopTransaction[];
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
 * Fetches workshops with pagination and filtering
 */
async function fetchWorkshops(
  shopId: string,
  options: UseWorkshopsOptions
): Promise<{ workshops: Workshop[]; totalCount: number }> {
  const {
    search,
    page = 1,
    pageSize = 20,
    sortBy = 'workshop_name',
    sortDirection = 'asc',
    isInternal,
    status,
    specialization,
    includeDeleted = false,
  } = options;

  const supabase = createClient();

  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;

  // Build the base query
  let query = supabase.from('workshops').select('*', { count: 'exact' }).eq('id_shop', shopId);

  // Apply soft delete filter
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  // Apply search filter (workshop name, contact person, or phone)
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `workshop_name.ilike.${searchTerm},contact_person.ilike.${searchTerm},phone.ilike.${searchTerm}`
    );
  }

  // Apply internal/external filter
  if (isInternal !== undefined) {
    query = query.eq('is_internal', isInternal);
  }

  // Apply status filter (active/inactive)
  if (status !== undefined) {
    query = query.eq('status', status);
  }

  // Apply specialization filter (array contains search)
  if (specialization) {
    query = query.contains('specializations', [specialization]);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch workshops: ${error.message}`);
  }

  return {
    workshops: (data ?? []) as Workshop[],
    totalCount: count ?? 0,
  };
}

/**
 * Fetches a single workshop by ID
 */
async function fetchWorkshop(shopId: string, workshopId: string): Promise<Workshop | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .eq('id_shop', shopId)
    .eq('id_workshop', workshopId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch workshop: ${error.message}`);
  }

  return data as Workshop;
}

/**
 * Fetches workshop orders with pagination and filtering
 */
async function fetchWorkshopOrders(
  shopId: string,
  options: UseWorkshopOrdersOptions
): Promise<{ orders: WorkshopOrderWithWorkshop[]; totalCount: number }> {
  const {
    workshopId,
    customerId,
    orderType,
    status,
    paymentStatus,
    page = 1,
    pageSize = 20,
    sortBy = 'created_at',
    sortDirection = 'desc',
    startDate,
    endDate,
    isOverdue,
  } = options;

  const supabase = createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('workshop_orders')
    .select(
      `
      *,
      workshops!inner (
        id_workshop,
        workshop_name,
        is_internal
      )
    `,
      { count: 'exact' }
    )
    .eq('id_shop', shopId)
    .is('deleted_at', null);

  // Apply workshop filter
  if (workshopId) {
    query = query.eq('id_workshop', workshopId);
  }

  // Apply customer filter
  if (customerId) {
    query = query.eq('id_customer', customerId);
  }

  // Apply order type filter
  if (orderType) {
    query = query.eq('order_type', orderType);
  }

  // Apply status filter
  if (status) {
    query = query.eq('status', status);
  }

  // Apply payment status filter
  if (paymentStatus) {
    query = query.eq('payment_status', paymentStatus);
  }

  // Apply date range filter (on received_date)
  if (startDate) {
    query = query.gte('received_date', startDate);
  }
  if (endDate) {
    query = query.lte('received_date', endDate);
  }

  // Filter overdue orders (estimated_completion_date < today AND status not completed/cancelled)
  if (isOverdue) {
    const today = new Date().toISOString().split('T')[0];
    query = query
      .lt('estimated_completion_date', today)
      .not('status', 'in', '("completed","cancelled")');
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch workshop orders: ${error.message}`);
  }

  return {
    orders: (data ?? []) as unknown as WorkshopOrderWithWorkshop[],
    totalCount: count ?? 0,
  };
}

/**
 * Fetches a single workshop order with full details
 */
async function fetchWorkshopOrder(
  shopId: string,
  orderId: string
): Promise<WorkshopOrderFull | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('workshop_orders')
    .select(
      `
      *,
      workshops (
        id_workshop,
        workshop_name,
        is_internal,
        contact_person,
        phone,
        email,
        specialization
      ),
      customers (
        id_customer,
        full_name
      ),
      workshop_transactions (
        id_transaction,
        transaction_type,
        reference_id,
        debit_amount,
        credit_amount,
        description,
        created_at
      )
    `
    )
    .eq('id_shop', shopId)
    .eq('id_workshop_order', orderId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch workshop order: ${error.message}`);
  }

  return data as unknown as WorkshopOrderFull;
}

/**
 * Fetches workshop transactions (ledger)
 * Uses sequence_number for ordering to maintain ledger sequence integrity
 */
async function fetchWorkshopTransactions(
  shopId: string,
  workshopId: string,
  options: UseWorkshopTransactionsOptions
): Promise<{ transactions: WorkshopTransaction[]; totalCount: number }> {
  const { page = 1, pageSize = 20, transactionType, startDate, endDate } = options;

  const supabase = createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('workshop_transactions')
    .select('*', { count: 'exact' })
    .eq('id_shop', shopId)
    .eq('id_workshop', workshopId);

  // Apply transaction type filter
  if (transactionType) {
    query = query.eq('transaction_type', transactionType);
  }

  // Apply date range filter (on created_at since there's no transaction_date)
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  // Order by sequence_number descending (most recent first)
  query = query.order('sequence_number', { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch workshop transactions: ${error.message}`);
  }

  return {
    transactions: (data ?? []) as WorkshopTransaction[],
    totalCount: count ?? 0,
  };
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to fetch paginated workshop list with search and filtering.
 *
 * Features:
 * - Automatic shop scoping via useShop
 * - Search by workshop name, contact name, or phone number
 * - Pagination with page navigation
 * - Filter by internal/external workshops
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated workshop list with metadata
 *
 * @example
 * ```tsx
 * function WorkshopList() {
 *   const [search, setSearch] = useState('');
 *   const [page, setPage] = useState(1);
 *
 *   const {
 *     workshops,
 *     totalCount,
 *     totalPages,
 *     isLoading,
 *     error
 *   } = useWorkshops({
 *     search,
 *     page,
 *     pageSize: 20,
 *     isInternal: false // Only external workshops
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       <SearchInput value={search} onChange={setSearch} />
 *       <WorkshopTable workshops={workshops} />
 *       <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useWorkshops(options: UseWorkshopsOptions = {}): UseWorkshopsReturn {
  const { shopId, hasAccess } = useShop();
  const {
    search = '',
    page = 1,
    pageSize = 20,
    sortBy = 'workshop_name',
    sortDirection = 'asc',
    isInternal,
    status,
    specialization,
    includeDeleted = false,
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.workshops(shopId ?? ''),
      {
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        isInternal,
        status,
        specialization,
        includeDeleted,
      },
    ],
    queryFn: () =>
      fetchWorkshops(shopId!, {
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        isInternal,
        status,
        specialization,
        includeDeleted,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  const workshops = data?.workshops ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    workshops,
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
 * Hook to fetch a single workshop by ID
 *
 * @param workshopId - The workshop ID to fetch
 * @param options - Query options
 * @returns Workshop data
 *
 * @example
 * ```tsx
 * const { data: workshop, isLoading, error } = useWorkshop('workshop-uuid');
 * ```
 */
export function useWorkshop(workshopId: string, options: { enabled?: boolean } = {}) {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.workshop(shopId ?? '', workshopId),
    queryFn: () => fetchWorkshop(shopId!, workshopId),
    enabled: !!shopId && !!workshopId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch workshop orders with pagination and filtering
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated order list
 *
 * @example
 * ```tsx
 * const {
 *   orders,
 *   totalCount,
 *   isLoading
 * } = useWorkshopOrders({
 *   status: 'pending',
 *   page: 1,
 *   pageSize: 20
 * });
 * ```
 */
export function useWorkshopOrders(options: UseWorkshopOrdersOptions = {}): UseWorkshopOrdersReturn {
  const { shopId, hasAccess } = useShop();
  const {
    workshopId,
    customerId,
    orderType,
    status,
    paymentStatus,
    page = 1,
    pageSize = 20,
    sortBy = 'created_at',
    sortDirection = 'desc',
    startDate,
    endDate,
    isOverdue,
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.workshopOrders(shopId ?? ''),
      {
        workshopId,
        customerId,
        orderType,
        status,
        paymentStatus,
        page,
        pageSize,
        sortBy,
        sortDirection,
        startDate,
        endDate,
        isOverdue,
      },
    ],
    queryFn: () =>
      fetchWorkshopOrders(shopId!, {
        workshopId,
        customerId,
        orderType,
        status,
        paymentStatus,
        page,
        pageSize,
        sortBy,
        sortDirection,
        startDate,
        endDate,
        isOverdue,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, error, refetch } = queryResult;

  const orders = data?.orders ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    orders,
    totalCount,
    page,
    totalPages,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to fetch a single workshop order with full details
 *
 * @param orderId - The order ID to fetch
 * @param options - Query options
 * @returns Order data with items and related entities
 *
 * @example
 * ```tsx
 * const { data: order, isLoading } = useWorkshopOrder('order-uuid');
 * ```
 */
export function useWorkshopOrder(orderId: string, options: { enabled?: boolean } = {}) {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.workshopOrder(shopId ?? '', orderId),
    queryFn: () => fetchWorkshopOrder(shopId!, orderId),
    enabled: !!shopId && !!orderId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch workshop transactions (ledger)
 *
 * NOTE: workshop_transactions is an IMMUTABLE ledger - only INSERTs allowed
 *
 * @param workshopId - The workshop ID to fetch transactions for
 * @param options - Query options for filtering and pagination
 * @returns Paginated transaction list
 *
 * @example
 * ```tsx
 * const {
 *   transactions,
 *   totalCount,
 *   isLoading
 * } = useWorkshopTransactions('workshop-uuid', {
 *   page: 1,
 *   pageSize: 20
 * });
 * ```
 */
export function useWorkshopTransactions(
  workshopId: string,
  options: UseWorkshopTransactionsOptions = {}
): UseWorkshopTransactionsReturn {
  const { shopId, hasAccess } = useShop();
  const { page = 1, pageSize = 20, transactionType, startDate, endDate, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.workshopTransactions(shopId ?? '', workshopId),
      { page, pageSize, transactionType, startDate, endDate },
    ],
    queryFn: () =>
      fetchWorkshopTransactions(shopId!, workshopId, {
        page,
        pageSize,
        transactionType,
        startDate,
        endDate,
      }),
    enabled: !!shopId && !!workshopId && hasAccess && enabled,
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
// MUTATIONS
// =============================================================================

/**
 * Hook to create a new workshop
 *
 * @example
 * ```tsx
 * const createWorkshop = useCreateWorkshop();
 *
 * const handleCreate = async (data: WorkshopInsert) => {
 *   try {
 *     const newWorkshop = await createWorkshop.mutateAsync(data);
 *     toast.success('Workshop created!');
 *   } catch (error) {
 *     toast.error('Failed to create workshop');
 *   }
 * };
 * ```
 */
export function useCreateWorkshop() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<WorkshopInsert, 'id_shop' | 'created_by'>) => {
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

      const { data: workshop, error } = await supabase
        .from('workshops')
        .insert({
          ...data,
          id_shop: shopId,
          created_by: publicUser.id_user,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create workshop: ${error.message}`);
      }

      return workshop as Workshop;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.workshops(shopId) });
      }
    },
  });
}

/**
 * Hook to update an existing workshop
 *
 * @example
 * ```tsx
 * const updateWorkshop = useUpdateWorkshop();
 *
 * const handleUpdate = async (workshopId: string, data: WorkshopUpdate) => {
 *   try {
 *     await updateWorkshop.mutateAsync({ workshopId, data });
 *     toast.success('Workshop updated!');
 *   } catch (error) {
 *     toast.error('Failed to update workshop');
 *   }
 * };
 * ```
 */
export function useUpdateWorkshop() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workshopId, data }: { workshopId: string; data: WorkshopUpdate }) => {
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

      const { data: workshop, error } = await supabase
        .from('workshops')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
          updated_by: publicUser?.id_user,
        })
        .eq('id_workshop', workshopId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update workshop: ${error.message}`);
      }

      return workshop as Workshop;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.workshops(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.workshop(shopId, variables.workshopId),
        });
      }
    },
  });
}

/**
 * Hook to soft-delete a workshop
 *
 * Note: This performs a soft delete by setting deleted_at.
 * The workshop must have zero balance and no pending orders.
 *
 * @example
 * ```tsx
 * const deleteWorkshop = useDeleteWorkshop();
 *
 * const handleDelete = async (workshopId: string) => {
 *   try {
 *     await deleteWorkshop.mutateAsync(workshopId);
 *     toast.success('Workshop deleted!');
 *   } catch (error) {
 *     toast.error('Failed to delete workshop');
 *   }
 * };
 * ```
 */
export function useDeleteWorkshop() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workshopId: string) => {
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

      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('workshops')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        })
        .eq('id_workshop', workshopId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to delete workshop: ${error.message}`);
      }

      return { workshopId };
    },
    onSuccess: (_, workshopId) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.workshops(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.workshop(shopId, workshopId),
        });
      }
    },
  });
}

/**
 * Workshop order create input type (omits auto-generated fields)
 */
export type WorkshopOrderCreateInput = Omit<
  WorkshopOrder,
  | 'id_workshop_order'
  | 'id_shop'
  | 'created_at'
  | 'updated_at'
  | 'created_by'
  | 'updated_by'
  | 'deleted_at'
  | 'version'
  | 'paid_amount'
>;

/**
 * Hook to create a workshop order
 */
export function useCreateWorkshopOrder() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WorkshopOrderCreateInput) => {
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

      const { data: order, error } = await supabase
        .from('workshop_orders')
        .insert({
          ...data,
          id_shop: shopId,
          created_by: publicUser.id_user,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create order: ${error.message}`);
      }

      return order as WorkshopOrder;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.workshops(shopId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.workshopOrders(shopId) });
      }
    },
  });
}

/**
 * Hook to update workshop order status
 */
export function useUpdateWorkshopOrderStatus() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
      notes,
      actualCost,
      completedDate,
    }: {
      orderId: string;
      status: WorkshopOrderStatus;
      notes?: string;
      actualCost?: number;
      completedDate?: string;
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

      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
        updated_by: publicUser?.id_user,
      };

      // Note: No started_at column in database - status is tracked directly

      if (status === 'completed') {
        // Use provided date or current date
        updateData.completed_date = completedDate || new Date().toISOString().split('T')[0];
        if (actualCost !== undefined) {
          updateData.actual_cost = actualCost;
        }
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const { data: order, error } = await supabase
        .from('workshop_orders')
        .update(updateData)
        .eq('id_workshop_order', orderId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update order status: ${error.message}`);
      }

      return order as WorkshopOrder;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.workshops(shopId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.workshopOrders(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.workshopOrder(shopId, variables.orderId),
        });
      }
    },
  });
}

/**
 * Workshop transaction input for recording payments
 */
export interface WorkshopTransactionInput {
  id_workshop_order: string;
  id_workshop: string;
  transaction_type: 'payment' | 'advance' | 'refund' | 'adjustment';
  amount: number;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
}

/**
 * Hook to record a payment for a workshop order
 *
 * Creates a workshop_transaction record and updates the order's paid_amount
 *
 * @example
 * ```tsx
 * const recordPayment = useRecordWorkshopPayment();
 *
 * const handlePayment = async (data: WorkshopTransactionInput) => {
 *   try {
 *     await recordPayment.mutateAsync(data);
 *     toast.success('Payment recorded!');
 *   } catch (error) {
 *     toast.error('Failed to record payment');
 *   }
 * };
 * ```
 */
export function useRecordWorkshopPayment() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WorkshopTransactionInput) => {
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

      // Get the workshop's current balance to calculate balance_after
      const { data: workshop, error: workshopError } = await supabase
        .from('workshops')
        .select('current_balance')
        .eq('id_workshop', data.id_workshop)
        .single();

      if (workshopError) {
        throw new Error(`Failed to fetch workshop: ${workshopError.message}`);
      }

      const currentBalance = Number(workshop?.current_balance ?? 0);
      // For payments, we credit the workshop (reduce what we owe)
      const balanceAfter = currentBalance - data.amount;

      // Create workshop transaction
      const { data: transaction, error: txError } = await supabase
        .from('workshop_transactions')
        .insert({
          id_shop: shopId,
          id_workshop: data.id_workshop,
          transaction_type:
            data.transaction_type === 'payment' ? 'order_payment' : data.transaction_type,
          reference_type: 'order',
          reference_id: data.id_workshop_order,
          debit_amount: 0,
          credit_amount: data.amount,
          balance_after: balanceAfter,
          description: data.notes || `Payment for order`,
          created_by: publicUser.id_user,
        })
        .select()
        .single();

      if (txError) {
        throw new Error(`Failed to record transaction: ${txError.message}`);
      }

      // Update order paid_amount and payment_status
      // First, get current order to calculate new paid amount
      const { data: currentOrder, error: orderFetchError } = await supabase
        .from('workshop_orders')
        .select('paid_amount, actual_cost, estimated_cost')
        .eq('id_workshop_order', data.id_workshop_order)
        .single();

      if (orderFetchError) {
        throw new Error(`Failed to fetch order: ${orderFetchError.message}`);
      }

      const newPaidAmount = Number(currentOrder.paid_amount || 0) + data.amount;
      const totalCost = Number(currentOrder.actual_cost ?? currentOrder.estimated_cost ?? 0);

      let newPaymentStatus: 'unpaid' | 'partial' | 'paid' = 'partial';
      if (newPaidAmount <= 0) {
        newPaymentStatus = 'unpaid';
      } else if (newPaidAmount >= totalCost) {
        newPaymentStatus = 'paid';
      }

      const { error: orderUpdateError } = await supabase
        .from('workshop_orders')
        .update({
          paid_amount: newPaidAmount,
          payment_status: newPaymentStatus,
          updated_at: new Date().toISOString(),
          updated_by: publicUser.id_user,
        })
        .eq('id_workshop_order', data.id_workshop_order);

      if (orderUpdateError) {
        throw new Error(`Failed to update order: ${orderUpdateError.message}`);
      }

      return transaction;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.workshops(shopId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.workshopOrders(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.workshopOrder(shopId, variables.id_workshop_order),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.workshopTransactions(shopId, variables.id_workshop),
        });
      }
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Utility to invalidate workshop caches
 */
export function useInvalidateWorkshops() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all workshop queries for current shop */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({ queryKey: invalidateScope.workshops(shopId) });
      }
      return undefined;
    },
    /** Invalidate a specific workshop */
    invalidateOne: (workshopId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.workshop(shopId, workshopId),
        });
      }
      return undefined;
    },
    /** Invalidate workshop orders */
    invalidateOrders: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.workshopOrders(shopId),
        });
      }
      return undefined;
    },
    /** Invalidate workshop transactions */
    invalidateTransactions: (workshopId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.workshopTransactions(shopId, workshopId),
        });
      }
      return undefined;
    },
  };
}

/**
 * Local query key definitions for use in components
 */
export const workshopKeys = {
  all: (shopId: string) => queryKeys.workshops(shopId),
  one: (shopId: string, workshopId: string) => queryKeys.workshop(shopId, workshopId),
  orders: (shopId: string) => queryKeys.workshopOrders(shopId),
  order: (shopId: string, orderId: string) => queryKeys.workshopOrder(shopId, orderId),
  transactions: (shopId: string, workshopId: string) =>
    queryKeys.workshopTransactions(shopId, workshopId),
};
