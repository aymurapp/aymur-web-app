/**
 * useSales Hook
 *
 * TanStack Query hook for fetching and managing sales lists.
 * Supports pagination, date range filtering, status filtering, and customer filtering.
 *
 * @module lib/hooks/data/useSales
 */

'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { invalidateScope } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';

/**
 * Sale row type from the public.sales table
 * Note: Manually defined until database types are regenerated
 */
export interface Sale {
  id_sale: string;
  id_shop: string;
  sale_number: string;
  sale_date: string;
  id_customer: string | null;
  sale_status: 'pending' | 'completed' | 'cancelled' | 'refunded' | null;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded' | null;
  subtotal_amount: number;
  discount_amount: number | null;
  discount_percentage: number | null;
  tax_amount: number | null;
  total_amount: number;
  paid_amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  version: number;
}

/**
 * Sale insert type for creating new sales
 */
export interface SaleInsert {
  id_sale?: string;
  id_shop?: string;
  sale_number: string;
  sale_date: string;
  id_customer?: string | null;
  sale_status?: 'pending' | 'completed' | 'cancelled' | 'refunded' | null;
  payment_status?: 'unpaid' | 'partial' | 'paid' | 'refunded' | null;
  subtotal_amount: number;
  discount_amount?: number | null;
  discount_percentage?: number | null;
  tax_amount?: number | null;
  total_amount: number;
  paid_amount?: number;
  currency: string;
  notes?: string | null;
  created_at?: string;
  created_by: string;
  updated_at?: string;
  updated_by?: string | null;
  deleted_at?: string | null;
  version?: number;
}

/**
 * Sale update type for updating sales
 */
export type SaleUpdate = Partial<SaleInsert>;

/**
 * Sale item insert type
 */
export interface SaleItemInsert {
  id_sale_item?: string;
  id_shop?: string;
  id_sale?: string;
  id_item: string;
  item_name: string;
  sku?: string | null;
  weight_grams?: number | null;
  unit_price: number;
  quantity: number;
  discount_amount?: number | null;
  discount_percentage?: number | null;
  total_price: number;
  notes?: string | null;
  created_at?: string;
}

/**
 * Sale payment insert type
 */
export interface SalePaymentInsert {
  id_payment?: string;
  id_shop?: string;
  id_sale?: string;
  id_customer?: string | null;
  payment_type: string;
  amount: number;
  cash_amount?: number | null;
  card_amount?: number | null;
  bank_transfer_amount?: number | null;
  gold_exchange_amount?: number | null;
  store_credit_amount?: number | null;
  payment_date: string;
  payment_reference?: string | null;
  notes?: string | null;
  created_by: string;
  created_at?: string;
}

/**
 * Sale with customer relation
 */
export interface SaleWithCustomer extends Sale {
  customer?: {
    id_customer: string;
    full_name: string;
    phone: string | null;
  } | null;
  items_count?: number;
}

/**
 * Sale status type
 */
export type SaleStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';

/**
 * Payment status type
 */
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

/**
 * Date range filter for queries
 */
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

/**
 * Options for filtering and paginating sales queries
 */
export interface UseSalesOptions {
  /** Search term for sale number (ilike search) */
  search?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: keyof Sale;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Filter by sale status */
  saleStatus?: SaleStatus | SaleStatus[];
  /** Filter by payment status */
  paymentStatus?: PaymentStatus | PaymentStatus[];
  /** Filter by customer ID */
  customerId?: string;
  /** Filter by date range */
  dateRange?: DateRangeFilter;
  /** Include customer relation */
  includeCustomer?: boolean;
  /** Include soft-deleted sales */
  includeDeleted?: boolean;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for the useSales hook
 */
export interface UseSalesReturn {
  /** Array of sales */
  sales: SaleWithCustomer[];
  /** Total count of matching sales */
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
 * Query key factory for sales
 */
export const saleKeys = {
  all: (shopId: string) => ['sales', shopId] as const,
  lists: (shopId: string) => [...saleKeys.all(shopId), 'list'] as const,
  list: (shopId: string, filters: Record<string, unknown>) =>
    [...saleKeys.lists(shopId), filters] as const,
  details: (shopId: string) => [...saleKeys.all(shopId), 'detail'] as const,
  detail: (shopId: string, saleId: string) => [...saleKeys.details(shopId), saleId] as const,
  items: (shopId: string, saleId: string) => [...saleKeys.detail(shopId, saleId), 'items'] as const,
  payments: (shopId: string, saleId: string) =>
    [...saleKeys.detail(shopId, saleId), 'payments'] as const,
  byCustomer: (shopId: string, customerId: string) =>
    [...saleKeys.all(shopId), 'customer', customerId] as const,
  byDateRange: (shopId: string, startDate: string, endDate: string) =>
    [...saleKeys.all(shopId), 'range', startDate, endDate] as const,
};

/**
 * Fetches sales with pagination and filtering
 */
async function fetchSales(
  shopId: string,
  options: UseSalesOptions
): Promise<{ sales: SaleWithCustomer[]; totalCount: number }> {
  const {
    search,
    page = 1,
    pageSize = 20,
    sortBy = 'sale_date',
    sortDirection = 'desc',
    saleStatus,
    paymentStatus,
    customerId,
    dateRange,
    includeCustomer = true,
    includeDeleted = false,
  } = options;

  const supabase = createClient();

  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;

  // Build select query based on options
  const selectQuery = includeCustomer
    ? `
      *,
      customer:customers!sales_id_customer_fkey (
        id_customer,
        full_name,
        phone
      )
    `
    : '*';

  // Build the base query
  let query = supabase.from('sales').select(selectQuery, { count: 'exact' }).eq('id_shop', shopId);

  // Apply soft delete filter
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  // Apply search filter (sale number)
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.ilike('sale_number', searchTerm);
  }

  // Apply sale status filter
  if (saleStatus) {
    if (Array.isArray(saleStatus)) {
      query = query.in('sale_status', saleStatus);
    } else {
      query = query.eq('sale_status', saleStatus);
    }
  }

  // Apply payment status filter
  if (paymentStatus) {
    if (Array.isArray(paymentStatus)) {
      query = query.in('payment_status', paymentStatus);
    } else {
      query = query.eq('payment_status', paymentStatus);
    }
  }

  // Apply customer filter
  if (customerId) {
    query = query.eq('id_customer', customerId);
  }

  // Apply date range filter
  if (dateRange?.startDate) {
    query = query.gte('sale_date', dateRange.startDate);
  }
  if (dateRange?.endDate) {
    query = query.lte('sale_date', dateRange.endDate);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch sales: ${error.message}`);
  }

  return {
    sales: (data ?? []) as unknown as SaleWithCustomer[],
    totalCount: count ?? 0,
  };
}

/**
 * Hook to fetch paginated sales list with filtering.
 *
 * Features:
 * - Automatic shop scoping via useShop
 * - Search by sale number
 * - Pagination with page navigation
 * - Sorting by any sale field
 * - Filtering by sale status, payment status, customer, and date range
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated sales list with metadata
 *
 * @example
 * ```tsx
 * function SalesList() {
 *   const [search, setSearch] = useState('');
 *   const [page, setPage] = useState(1);
 *   const [dateRange, setDateRange] = useState({ startDate: '2024-01-01' });
 *
 *   const {
 *     sales,
 *     totalCount,
 *     totalPages,
 *     hasNextPage,
 *     isLoading,
 *     error
 *   } = useSales({
 *     search,
 *     page,
 *     pageSize: 20,
 *     sortBy: 'sale_date',
 *     sortDirection: 'desc',
 *     dateRange,
 *     saleStatus: 'completed'
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       <SearchInput value={search} onChange={setSearch} />
 *       <SalesTable sales={sales} />
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
export function useSales(options: UseSalesOptions = {}): UseSalesReturn {
  const { shopId, hasAccess } = useShop();
  const {
    search = '',
    page = 1,
    pageSize = 20,
    sortBy = 'sale_date',
    sortDirection = 'desc',
    saleStatus,
    paymentStatus,
    customerId,
    dateRange,
    includeCustomer = true,
    includeDeleted = false,
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: saleKeys.list(shopId ?? '', {
      search,
      page,
      pageSize,
      sortBy,
      sortDirection,
      saleStatus,
      paymentStatus,
      customerId,
      dateRange,
      includeCustomer,
      includeDeleted,
    }),
    queryFn: () =>
      fetchSales(shopId!, {
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        saleStatus,
        paymentStatus,
        customerId,
        dateRange,
        includeCustomer,
        includeDeleted,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  const sales = data?.sales ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    sales,
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
 * Hook to fetch sales by customer
 *
 * @example
 * ```tsx
 * const { data: customerSales } = useSalesByCustomer(customerId);
 * ```
 */
export function useSalesByCustomer(
  customerId: string | null | undefined,
  options?: { limit?: number }
) {
  const { shopId, hasAccess } = useShop();
  const limit = options?.limit ?? 50;

  return useQuery({
    queryKey: saleKeys.byCustomer(shopId ?? '', customerId ?? ''),
    queryFn: async () => {
      if (!shopId || !customerId) {
        return [];
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('id_shop', shopId)
        .eq('id_customer', customerId)
        .is('deleted_at', null)
        .order('sale_date', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch sales by customer: ${error.message}`);
      }

      return data as unknown as Sale[];
    },
    enabled: !!shopId && !!customerId && hasAccess,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch sales within a date range
 *
 * @example
 * ```tsx
 * const { data: rangeSales } = useSalesByDateRange('2024-01-01', '2024-01-31');
 * ```
 */
export function useSalesByDateRange(startDate: string, endDate: string) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: saleKeys.byDateRange(shopId ?? '', startDate, endDate),
    queryFn: async () => {
      if (!shopId) {
        return [];
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('sales')
        .select(
          `
          *,
          customer:customers!sales_id_customer_fkey (
            id_customer,
            full_name,
            phone
          )
        `
        )
        .eq('id_shop', shopId)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)
        .is('deleted_at', null)
        .order('sale_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch sales by date range: ${error.message}`);
      }

      return data as unknown as SaleWithCustomer[];
    },
    enabled: !!shopId && !!startDate && !!endDate && hasAccess,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Data for creating a complete sale with items and optional payment
 */
export interface CreateSaleData {
  /** Sale data (without id_shop, it's auto-added) */
  sale: Omit<SaleInsert, 'id_shop'>;
  /** Sale items to create */
  items: Omit<SaleItemInsert, 'id_shop' | 'id_sale'>[];
  /** Optional initial payment */
  payment?: Omit<SalePaymentInsert, 'id_shop' | 'id_sale'>;
}

/**
 * Hook to create a new sale with items and optional payment
 *
 * This is a compound mutation that:
 * 1. Creates the sale record
 * 2. Creates all sale items
 * 3. Optionally creates an initial payment
 *
 * Note: The database handles inventory status updates and balance calculations
 * via triggers.
 *
 * @example
 * ```tsx
 * const createSale = useCreateSale();
 *
 * const handleCreateSale = async () => {
 *   try {
 *     const sale = await createSale.mutateAsync({
 *       sale: {
 *         sale_number: 'SALE-001',
 *         sale_date: '2024-01-15',
 *         currency: 'USD',
 *         subtotal_amount: 1500,
 *         total_amount: 1500,
 *         id_customer: customerId,
 *         created_by: userId,
 *       },
 *       items: [
 *         {
 *           id_item: itemId,
 *           item_name: 'Gold Ring',
 *           weight_grams: 5.5,
 *           unit_price: 1500,
 *           quantity: 1,
 *           total_price: 1500,
 *         }
 *       ],
 *       payment: {
 *         id_customer: customerId,
 *         payment_type: 'cash',
 *         amount: 1500,
 *         cash_amount: 1500,
 *         payment_date: '2024-01-15',
 *         created_by: userId,
 *       }
 *     });
 *     toast.success('Sale created!');
 *   } catch (error) {
 *     toast.error('Failed to create sale');
 *   }
 * };
 * ```
 */
export function useCreateSale() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSaleData) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // 1. Create the sale
      // Note: Manual types may differ from database schema
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        // @ts-expect-error Manual types in useSales.ts differ from database schema
        .insert({ ...data.sale, id_shop: shopId })
        .select()
        .single();

      if (saleError) {
        throw new Error(`Failed to create sale: ${saleError.message}`);
      }

      // 2. Create sale items
      if (data.items.length > 0) {
        // Note: Manual types may differ from database schema
        const itemsWithIds = data.items.map((item) => ({
          ...item,
          id_shop: shopId,
          id_sale: sale.id_sale,
        }));

        // Note: Manual types in useSales.ts differ from database schema - using 'never' cast
        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(itemsWithIds as never);

        if (itemsError) {
          // Attempt to clean up the sale if items fail
          await supabase.from('sales').delete().eq('id_sale', sale.id_sale);
          throw new Error(`Failed to create sale items: ${itemsError.message}`);
        }
      }

      // 3. Create initial payment if provided
      if (data.payment) {
        const { error: paymentError } = await supabase.from('sale_payments').insert({
          ...data.payment,
          id_shop: shopId,
          id_sale: sale.id_sale,
        });

        if (paymentError) {
          // Note: We don't rollback the sale/items here as partial data may be acceptable
          console.error('Failed to create payment:', paymentError.message);
        }
      }

      return sale;
    },
    onSuccess: () => {
      if (shopId) {
        // Invalidate sales list
        queryClient.invalidateQueries({ queryKey: invalidateScope.sales(shopId) });
        // Invalidate inventory as item status may change
        queryClient.invalidateQueries({ queryKey: invalidateScope.inventory(shopId) });
        // Invalidate customer queries as balances may change
        queryClient.invalidateQueries({ queryKey: invalidateScope.customers(shopId) });
      }
    },
  });
}

/**
 * Hook to update an existing sale
 *
 * Note: This only updates the sale record itself, not the items.
 * To modify items, use the useSaleItems hooks.
 *
 * @example
 * ```tsx
 * const updateSale = useUpdateSale();
 *
 * const handleUpdate = async (saleId: string, data: SaleUpdate) => {
 *   try {
 *     await updateSale.mutateAsync({ saleId, data });
 *     toast.success('Sale updated!');
 *   } catch (error) {
 *     toast.error('Failed to update sale');
 *   }
 * };
 * ```
 */
export function useUpdateSale() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, data }: { saleId: string; data: SaleUpdate }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: sale, error } = await supabase
        .from('sales')
        .update(data)
        .eq('id_sale', saleId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update sale: ${error.message}`);
      }

      return sale;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.sales(shopId) });
        queryClient.invalidateQueries({ queryKey: saleKeys.detail(shopId, variables.saleId) });
      }
    },
  });
}

/**
 * Hook to cancel a sale (soft delete)
 *
 * This updates the sale status to 'cancelled' and sets deleted_at.
 * The database handles reversing inventory status and balance adjustments.
 *
 * @example
 * ```tsx
 * const cancelSale = useCancelSale();
 *
 * const handleCancel = async (saleId: string) => {
 *   try {
 *     await cancelSale.mutateAsync(saleId);
 *     toast.success('Sale cancelled!');
 *   } catch (error) {
 *     toast.error('Failed to cancel sale');
 *   }
 * };
 * ```
 */
export function useCancelSale() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { error } = await supabase
        .from('sales')
        .update({
          sale_status: 'cancelled',
          deleted_at: new Date().toISOString(),
        })
        .eq('id_sale', saleId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to cancel sale: ${error.message}`);
      }

      return { saleId };
    },
    onSuccess: (_, saleId) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.sales(shopId) });
        queryClient.invalidateQueries({ queryKey: saleKeys.detail(shopId, saleId) });
        queryClient.invalidateQueries({ queryKey: invalidateScope.inventory(shopId) });
        queryClient.invalidateQueries({ queryKey: invalidateScope.customers(shopId) });
      }
    },
  });
}

/**
 * Utility to invalidate sales caches
 */
export function useInvalidateSales() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all sales queries for current shop */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({ queryKey: invalidateScope.sales(shopId) });
      }
      return undefined;
    },
    /** Invalidate a specific sale */
    invalidateOne: (saleId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: saleKeys.detail(shopId, saleId),
        });
      }
      return undefined;
    },
  };
}
