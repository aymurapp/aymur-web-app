/**
 * usePurchases Hook
 *
 * TanStack Query hooks for fetching and managing purchase orders from suppliers.
 * Supports pagination, date range filtering, supplier filtering, and payment status filtering.
 *
 * @module lib/hooks/data/usePurchases
 */

'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import {
  createPurchase,
  updatePurchase,
  recordPurchasePayment,
  cancelPurchase,
  generatePurchaseNumber,
} from '@/lib/actions/purchase';
import { useShop } from '@/lib/hooks/shop';
import { invalidateScope } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Purchase row type from the public.purchases table
 */
export interface Purchase {
  id_purchase: string;
  id_shop: string;
  id_supplier: string;
  purchase_number: string;
  invoice_number: string | null;
  purchase_date: string;
  currency: string;
  total_items: number;
  total_weight_grams: number;
  total_amount: number;
  paid_amount: number;
  payment_status: PurchasePaymentStatus | null;
  notes: string | null;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

/**
 * Purchase insert type for creating new purchases
 */
export interface PurchaseInsert {
  id_purchase?: string;
  id_shop?: string;
  id_supplier: string;
  purchase_number?: string;
  invoice_number?: string | null;
  purchase_date: string;
  currency: string;
  total_items?: number;
  total_weight_grams?: number;
  total_amount: number;
  paid_amount?: number;
  payment_status?: PurchasePaymentStatus | null;
  notes?: string | null;
  created_by?: string;
}

/**
 * Purchase update type for updating purchases
 */
export type PurchaseUpdate = Partial<Omit<PurchaseInsert, 'id_shop' | 'id_purchase'>>;

/**
 * Purchase with supplier relation
 */
export interface PurchaseWithSupplier extends Purchase {
  supplier?: {
    id_supplier: string;
    company_name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

/**
 * Purchase payment status type
 */
export type PurchasePaymentStatus = 'unpaid' | 'partial' | 'paid';

/**
 * Date range filter for queries
 */
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

/**
 * Amount range filter for queries
 */
export interface AmountRangeFilter {
  min?: number;
  max?: number;
}

/**
 * Options for filtering and paginating purchases queries
 */
export interface UsePurchasesOptions {
  /** Search term for purchase number or invoice number (ilike search) */
  search?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: keyof Purchase;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Filter by supplier ID */
  supplierId?: string;
  /** Filter by payment status */
  paymentStatus?: PurchasePaymentStatus | PurchasePaymentStatus[];
  /** Filter by date range */
  dateRange?: DateRangeFilter;
  /** Filter by amount range */
  amountRange?: AmountRangeFilter;
  /** Include supplier relation */
  includeSupplier?: boolean;
  /** Include soft-deleted purchases */
  includeDeleted?: boolean;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for the usePurchases hook
 */
export interface UsePurchasesReturn {
  /** Array of purchases */
  purchases: PurchaseWithSupplier[];
  /** Total count of matching purchases */
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

// =============================================================================
// QUERY KEY FACTORY
// =============================================================================

/**
 * Query key factory for purchases
 */
export const purchaseKeys = {
  all: (shopId: string) => ['purchases', shopId] as const,
  lists: (shopId: string) => [...purchaseKeys.all(shopId), 'list'] as const,
  list: (shopId: string, filters: Record<string, unknown>) =>
    [...purchaseKeys.lists(shopId), filters] as const,
  details: (shopId: string) => [...purchaseKeys.all(shopId), 'detail'] as const,
  detail: (shopId: string, purchaseId: string) =>
    [...purchaseKeys.details(shopId), purchaseId] as const,
  bySupplier: (shopId: string, supplierId: string) =>
    [...purchaseKeys.all(shopId), 'supplier', supplierId] as const,
  byDateRange: (shopId: string, startDate: string, endDate: string) =>
    [...purchaseKeys.all(shopId), 'range', startDate, endDate] as const,
  byPaymentStatus: (shopId: string, status: string) =>
    [...purchaseKeys.all(shopId), 'payment-status', status] as const,
  pending: (shopId: string) => [...purchaseKeys.all(shopId), 'pending'] as const,
};

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

/**
 * Fetches purchases with pagination and filtering
 */
async function fetchPurchases(
  shopId: string,
  options: UsePurchasesOptions
): Promise<{ purchases: PurchaseWithSupplier[]; totalCount: number }> {
  const {
    search,
    page = 1,
    pageSize = 20,
    sortBy = 'purchase_date',
    sortDirection = 'desc',
    supplierId,
    paymentStatus,
    dateRange,
    amountRange,
    includeSupplier = true,
    includeDeleted = false,
  } = options;

  const supabase = createClient();

  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;

  // Build select query based on options
  // Note: Using simple relation syntax without explicit FK hint
  // The FK relationship is inferred automatically by PostgREST
  const selectQuery = includeSupplier
    ? `
      *,
      supplier:suppliers (
        id_supplier,
        company_name,
        contact_person,
        phone,
        email
      )
    `
    : '*';

  // Build the base query
  let query = supabase
    .from('purchases')
    .select(selectQuery, { count: 'exact' })
    .eq('id_shop', shopId);

  // Apply soft delete filter
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  // Apply search filter (purchase number or invoice number)
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(`purchase_number.ilike.${searchTerm},invoice_number.ilike.${searchTerm}`);
  }

  // Apply supplier filter
  if (supplierId) {
    query = query.eq('id_supplier', supplierId);
  }

  // Apply payment status filter
  if (paymentStatus) {
    if (Array.isArray(paymentStatus)) {
      query = query.in('payment_status', paymentStatus);
    } else {
      query = query.eq('payment_status', paymentStatus);
    }
  }

  // Apply date range filter
  if (dateRange?.startDate) {
    query = query.gte('purchase_date', dateRange.startDate);
  }
  if (dateRange?.endDate) {
    query = query.lte('purchase_date', dateRange.endDate);
  }

  // Apply amount range filter
  if (amountRange?.min !== undefined) {
    query = query.gte('total_amount', amountRange.min);
  }
  if (amountRange?.max !== undefined) {
    query = query.lte('total_amount', amountRange.max);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch purchases: ${error.message}`);
  }

  return {
    purchases: (data ?? []) as unknown as PurchaseWithSupplier[],
    totalCount: count ?? 0,
  };
}

/**
 * Fetches a single purchase with full details
 */
async function fetchPurchase(
  shopId: string,
  purchaseId: string
): Promise<PurchaseWithSupplier | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('purchases')
    .select(
      `
      *,
      supplier:suppliers (
        id_supplier,
        company_name,
        contact_person,
        phone,
        email
      )
    `
    )
    .eq('id_purchase', purchaseId)
    .eq('id_shop', shopId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch purchase: ${error.message}`);
  }

  return data as unknown as PurchaseWithSupplier;
}

// =============================================================================
// LIST HOOKS
// =============================================================================

/**
 * Hook to fetch paginated purchases list with filtering.
 *
 * Features:
 * - Automatic shop scoping via useShop
 * - Search by purchase number or invoice number
 * - Pagination with page navigation
 * - Sorting by any purchase field
 * - Filtering by supplier, payment status, date range, and amount range
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated purchases list with metadata
 *
 * @example
 * ```tsx
 * function PurchasesList() {
 *   const [search, setSearch] = useState('');
 *   const [page, setPage] = useState(1);
 *
 *   const {
 *     purchases,
 *     totalCount,
 *     totalPages,
 *     hasNextPage,
 *     isLoading,
 *     error
 *   } = usePurchases({
 *     search,
 *     page,
 *     pageSize: 20,
 *     sortBy: 'purchase_date',
 *     sortDirection: 'desc',
 *     paymentStatus: 'unpaid'
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       <SearchInput value={search} onChange={setSearch} />
 *       <PurchasesTable purchases={purchases} />
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
export function usePurchases(options: UsePurchasesOptions = {}): UsePurchasesReturn {
  const { shopId, hasAccess } = useShop();
  const {
    search = '',
    page = 1,
    pageSize = 20,
    sortBy = 'purchase_date',
    sortDirection = 'desc',
    supplierId,
    paymentStatus,
    dateRange,
    amountRange,
    includeSupplier = true,
    includeDeleted = false,
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: purchaseKeys.list(shopId ?? '', {
      search,
      page,
      pageSize,
      sortBy,
      sortDirection,
      supplierId,
      paymentStatus,
      dateRange,
      amountRange,
      includeSupplier,
      includeDeleted,
    }),
    queryFn: () =>
      fetchPurchases(shopId!, {
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        supplierId,
        paymentStatus,
        dateRange,
        amountRange,
        includeSupplier,
        includeDeleted,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  const purchases = data?.purchases ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    purchases,
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
 * Hook to fetch purchases by supplier
 *
 * @param supplierId - The supplier ID to filter by
 * @param options - Optional query options
 * @returns Purchases by the specified supplier
 *
 * @example
 * ```tsx
 * const { data: supplierPurchases } = usePurchasesBySupplier(supplierId);
 * ```
 */
export function usePurchasesBySupplier(
  supplierId: string | null | undefined,
  options?: { limit?: number }
) {
  const { shopId, hasAccess } = useShop();
  const limit = options?.limit ?? 50;

  return useQuery({
    queryKey: purchaseKeys.bySupplier(shopId ?? '', supplierId ?? ''),
    queryFn: async () => {
      if (!shopId || !supplierId) {
        return [];
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('purchases')
        .select(
          `
          *,
          supplier:suppliers (
            id_supplier,
            company_name,
            contact_person,
            phone,
            email
          )
        `
        )
        .eq('id_shop', shopId)
        .eq('id_supplier', supplierId)
        .is('deleted_at', null)
        .order('purchase_date', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch purchases by supplier: ${error.message}`);
      }

      return data as unknown as PurchaseWithSupplier[];
    },
    enabled: !!shopId && !!supplierId && hasAccess,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch purchases within a date range
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Purchases within the date range
 *
 * @example
 * ```tsx
 * const { data: rangePurchases } = usePurchasesByDateRange('2024-01-01', '2024-01-31');
 * ```
 */
export function usePurchasesByDateRange(startDate: string, endDate: string) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: purchaseKeys.byDateRange(shopId ?? '', startDate, endDate),
    queryFn: async () => {
      if (!shopId) {
        return [];
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('purchases')
        .select(
          `
          *,
          supplier:suppliers (
            id_supplier,
            company_name,
            contact_person,
            phone,
            email
          )
        `
        )
        .eq('id_shop', shopId)
        .gte('purchase_date', startDate)
        .lte('purchase_date', endDate)
        .is('deleted_at', null)
        .order('purchase_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch purchases by date range: ${error.message}`);
      }

      return data as unknown as PurchaseWithSupplier[];
    },
    enabled: !!shopId && !!startDate && !!endDate && hasAccess,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch pending purchases (unpaid or partial payment status)
 *
 * @returns Pending purchases
 *
 * @example
 * ```tsx
 * const { data: pendingPurchases } = usePendingPurchases();
 * ```
 */
export function usePendingPurchases() {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: purchaseKeys.pending(shopId ?? ''),
    queryFn: async () => {
      if (!shopId) {
        return [];
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('purchases')
        .select(
          `
          *,
          supplier:suppliers (
            id_supplier,
            company_name,
            contact_person,
            phone,
            email
          )
        `
        )
        .eq('id_shop', shopId)
        .in('payment_status', ['unpaid', 'partial'])
        .is('deleted_at', null)
        .order('purchase_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch pending purchases: ${error.message}`);
      }

      return data as unknown as PurchaseWithSupplier[];
    },
    enabled: !!shopId && hasAccess,
    staleTime: 30 * 1000,
  });
}

// =============================================================================
// DETAIL HOOK
// =============================================================================

/**
 * Options for the usePurchase hook
 */
export interface UsePurchaseOptions {
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for the usePurchase hook
 */
export interface UsePurchaseReturn {
  /** The purchase data */
  purchase: PurchaseWithSupplier | null;
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Hook to fetch a single purchase with full details
 *
 * @param purchaseId - The purchase ID to fetch
 * @param options - Query options
 * @returns Single purchase with supplier details
 *
 * @example
 * ```tsx
 * function PurchaseDetail({ purchaseId }: { purchaseId: string }) {
 *   const { purchase, isLoading, error } = usePurchase(purchaseId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (!purchase) return <NotFound />;
 *
 *   return <PurchaseCard purchase={purchase} />;
 * }
 * ```
 */
export function usePurchase(
  purchaseId: string | null | undefined,
  options: UsePurchaseOptions = {}
): UsePurchaseReturn {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  const queryResult = useQuery({
    queryKey: purchaseKeys.detail(shopId ?? '', purchaseId ?? ''),
    queryFn: () => fetchPurchase(shopId!, purchaseId!),
    enabled: !!shopId && !!purchaseId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    purchase: queryResult.data ?? null,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error as Error | null,
    refetch: queryResult.refetch,
  };
}

/**
 * Hook to prefetch a purchase for navigation optimization
 *
 * @example
 * ```tsx
 * const prefetchPurchase = usePrefetchPurchase();
 *
 * // Prefetch on hover
 * <Link
 *   to={`/purchases/${purchaseId}`}
 *   onMouseEnter={() => prefetchPurchase(purchaseId)}
 * >
 *   View Purchase
 * </Link>
 * ```
 */
export function usePrefetchPurchase() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return (purchaseId: string) => {
    if (!shopId || !purchaseId) {
      return;
    }

    queryClient.prefetchQuery({
      queryKey: purchaseKeys.detail(shopId, purchaseId),
      queryFn: () => fetchPurchase(shopId, purchaseId),
      staleTime: 30 * 1000,
    });
  };
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Data for creating a new purchase
 */
export interface CreatePurchaseData {
  id_supplier: string;
  invoice_number?: string | null;
  purchase_date: string;
  currency: string;
  total_items?: number;
  total_weight_grams?: number;
  total_amount: number;
  paid_amount?: number;
  notes?: string | null;
}

/**
 * Hook to create a new purchase
 *
 * Uses the server action for purchase creation which handles
 * purchase number generation automatically.
 *
 * @example
 * ```tsx
 * const createPurchaseMutation = useCreatePurchase();
 *
 * const handleCreate = async () => {
 *   try {
 *     const purchase = await createPurchaseMutation.mutateAsync({
 *       id_supplier: supplierId,
 *       purchase_date: '2024-01-15',
 *       currency: 'USD',
 *       total_amount: 5000,
 *       total_items: 10,
 *     });
 *     toast.success('Purchase created!');
 *   } catch (error) {
 *     toast.error('Failed to create purchase');
 *   }
 * };
 * ```
 */
export function useCreatePurchase() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePurchaseData) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const result = await createPurchase({
        id_shop: shopId,
        id_supplier: data.id_supplier,
        invoice_number: data.invoice_number,
        purchase_date: data.purchase_date,
        currency: data.currency,
        total_items: data.total_items ?? 0,
        total_weight_grams: data.total_weight_grams ?? 0,
        total_amount: data.total_amount,
        paid_amount: data.paid_amount ?? 0,
        notes: data.notes,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data!;
    },
    onSuccess: () => {
      if (shopId) {
        // Invalidate purchases list
        queryClient.invalidateQueries({ queryKey: invalidateScope.purchases(shopId) });
        // Invalidate supplier queries as balance may change
        queryClient.invalidateQueries({ queryKey: invalidateScope.suppliers(shopId) });
      }
    },
  });
}

/**
 * Hook to update an existing purchase
 *
 * @example
 * ```tsx
 * const updatePurchaseMutation = useUpdatePurchase();
 *
 * const handleUpdate = async (purchaseId: string, data: PurchaseUpdate) => {
 *   try {
 *     await updatePurchaseMutation.mutateAsync({ purchaseId, data });
 *     toast.success('Purchase updated!');
 *   } catch (error) {
 *     toast.error('Failed to update purchase');
 *   }
 * };
 * ```
 */
export function useUpdatePurchase() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ purchaseId, data }: { purchaseId: string; data: PurchaseUpdate }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      // Filter out null payment_status - server action expects undefined instead of null
      const { payment_status, ...restData } = data;
      const result = await updatePurchase({
        id_purchase: purchaseId,
        ...restData,
        // Only pass payment_status if it's a valid string value
        ...(payment_status && { payment_status }),
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data!;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.purchases(shopId) });
        queryClient.invalidateQueries({
          queryKey: purchaseKeys.detail(shopId, variables.purchaseId),
        });
      }
    },
  });
}

/**
 * Hook to record a payment for a purchase
 *
 * @example
 * ```tsx
 * const recordPayment = useRecordPurchasePayment();
 *
 * const handlePayment = async (purchaseId: string, amount: number) => {
 *   try {
 *     await recordPayment.mutateAsync({ purchaseId, amount });
 *     toast.success('Payment recorded!');
 *   } catch (error) {
 *     toast.error('Failed to record payment');
 *   }
 * };
 * ```
 */
export function useRecordPurchasePayment() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      purchaseId,
      amount,
      paymentDate,
      notes,
    }: {
      purchaseId: string;
      amount: number;
      paymentDate?: string;
      notes?: string;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const result = await recordPurchasePayment({
        id_purchase: purchaseId,
        amount,
        payment_date: paymentDate,
        notes,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data!;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.purchases(shopId) });
        queryClient.invalidateQueries({
          queryKey: purchaseKeys.detail(shopId, variables.purchaseId),
        });
        // Invalidate supplier queries as balance may change
        queryClient.invalidateQueries({ queryKey: invalidateScope.suppliers(shopId) });
      }
    },
  });
}

/**
 * Hook to cancel a purchase (soft delete)
 *
 * @example
 * ```tsx
 * const cancelPurchaseMutation = useCancelPurchase();
 *
 * const handleCancel = async (purchaseId: string, reason: string) => {
 *   try {
 *     await cancelPurchaseMutation.mutateAsync({ purchaseId, reason });
 *     toast.success('Purchase cancelled!');
 *   } catch (error) {
 *     toast.error('Failed to cancel purchase');
 *   }
 * };
 * ```
 */
export function useCancelPurchase() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ purchaseId, reason }: { purchaseId: string; reason: string }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const result = await cancelPurchase({
        id_purchase: purchaseId,
        reason,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data!;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.purchases(shopId) });
        queryClient.invalidateQueries({
          queryKey: purchaseKeys.detail(shopId, variables.purchaseId),
        });
        // Invalidate supplier queries as balance may change
        queryClient.invalidateQueries({ queryKey: invalidateScope.suppliers(shopId) });
      }
    },
  });
}

/**
 * Hook to generate a purchase number
 *
 * @example
 * ```tsx
 * const { mutateAsync: generateNumber } = useGeneratePurchaseNumber();
 *
 * const handleGenerateNumber = async () => {
 *   const number = await generateNumber();
 *   console.log('Generated purchase number:', number);
 * };
 * ```
 */
export function useGeneratePurchaseNumber() {
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async () => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const result = await generatePurchaseNumber(shopId);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data!;
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Utility to invalidate purchase caches
 *
 * @example
 * ```tsx
 * const { invalidateAll, invalidateOne } = useInvalidatePurchases();
 *
 * // Invalidate all purchases
 * await invalidateAll();
 *
 * // Invalidate a specific purchase
 * await invalidateOne(purchaseId);
 * ```
 */
export function useInvalidatePurchases() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all purchase queries for current shop */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({ queryKey: invalidateScope.purchases(shopId) });
      }
      return undefined;
    },
    /** Invalidate a specific purchase */
    invalidateOne: (purchaseId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: purchaseKeys.detail(shopId, purchaseId),
        });
      }
      return undefined;
    },
    /** Invalidate purchases by supplier */
    invalidateBySupplier: (supplierId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: purchaseKeys.bySupplier(shopId, supplierId),
        });
      }
      return undefined;
    },
  };
}
