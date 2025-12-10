/**
 * useSuppliers Hook
 *
 * TanStack Query hook for fetching and managing supplier lists.
 * Supports pagination, search by company name/phone, and filtering.
 *
 * @module lib/hooks/data/useSuppliers
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
 * Supplier row type from the public.suppliers table
 */
export type Supplier = Tables<'suppliers'>;

/**
 * Supplier insert type for creating new suppliers
 */
export type SupplierInsert = TablesInsert<'suppliers'>;

/**
 * Supplier update type for updating suppliers
 */
export type SupplierUpdate = TablesUpdate<'suppliers'>;

/**
 * Supplier category row type
 */
export type SupplierCategory = Tables<'supplier_categories'>;

/**
 * Supplier category insert type
 */
export type SupplierCategoryInsert = TablesInsert<'supplier_categories'>;

/**
 * Supplier category update type
 */
export type SupplierCategoryUpdate = TablesUpdate<'supplier_categories'>;

/**
 * Supplier transaction row type (immutable ledger)
 */
export type SupplierTransaction = Tables<'supplier_transactions'>;

/**
 * Supplier payment row type
 */
export type SupplierPayment = Tables<'supplier_payments'>;

/**
 * Supplier payment with optional purchase relation
 */
export interface SupplierPaymentWithPurchase extends SupplierPayment {
  purchase?: {
    id_purchase: string;
    purchase_number: string;
  } | null;
}

/**
 * Supplier with category details
 */
export interface SupplierWithCategory extends Supplier {
  supplier_categories: SupplierCategory | null;
}

/**
 * Options for filtering and paginating supplier queries
 */
export interface UseSuppliersOptions {
  /** Search term for company name, contact, or phone (ilike search) */
  search?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: keyof Supplier;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Filter by category */
  categoryId?: string;
  /** Filter by active status */
  isActive?: boolean;
  /** Include soft-deleted suppliers */
  includeDeleted?: boolean;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for the useSuppliers hook
 */
export interface UseSuppliersReturn {
  /** Array of suppliers */
  suppliers: Supplier[];
  /** Total count of matching suppliers */
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
 * Options for supplier transaction queries
 */
export interface UseSupplierTransactionsOptions {
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
 * Return type for supplier transactions
 */
export interface UseSupplierTransactionsReturn {
  /** Array of transactions */
  transactions: SupplierTransaction[];
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

/**
 * Options for supplier payment queries
 */
export interface UseSupplierPaymentsOptions {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Filter by payment type */
  paymentType?: string;
  /** Start date for date range filter */
  startDate?: string;
  /** End date for date range filter */
  endDate?: string;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for supplier payments
 */
export interface UseSupplierPaymentsReturn {
  /** Array of payments */
  payments: SupplierPaymentWithPurchase[];
  /** Total count of matching payments */
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
 * Fetches suppliers with pagination and filtering
 */
async function fetchSuppliers(
  shopId: string,
  options: UseSuppliersOptions
): Promise<{ suppliers: Supplier[]; totalCount: number }> {
  const {
    search,
    page = 1,
    pageSize = 20,
    sortBy = 'company_name',
    sortDirection = 'asc',
    categoryId,
    isActive,
    includeDeleted = false,
  } = options;

  const supabase = createClient();

  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;

  // Build the base query
  let query = supabase.from('suppliers').select('*', { count: 'exact' }).eq('id_shop', shopId);

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

  // Apply category filter
  if (categoryId) {
    query = query.eq('id_category', categoryId);
  }

  // Apply active status filter
  if (isActive !== undefined) {
    query = query.eq('status', isActive ? 'active' : 'inactive');
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch suppliers: ${error.message}`);
  }

  return {
    suppliers: data ?? [],
    totalCount: count ?? 0,
  };
}

/**
 * Fetches a single supplier by ID
 */
async function fetchSupplier(
  shopId: string,
  supplierId: string
): Promise<SupplierWithCategory | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('suppliers')
    .select(
      `
      *,
      supplier_categories (*)
    `
    )
    .eq('id_shop', shopId)
    .eq('id_supplier', supplierId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch supplier: ${error.message}`);
  }

  return data as unknown as SupplierWithCategory;
}

/**
 * Fetches supplier categories
 */
async function fetchSupplierCategories(shopId: string): Promise<SupplierCategory[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('supplier_categories')
    .select('*')
    .eq('id_shop', shopId)
    .is('deleted_at', null)
    .order('category_name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch supplier categories: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Fetches supplier transactions (ledger)
 */
async function fetchSupplierTransactions(
  shopId: string,
  supplierId: string,
  options: UseSupplierTransactionsOptions
): Promise<{ transactions: SupplierTransaction[]; totalCount: number }> {
  const { page = 1, pageSize = 20, transactionType, startDate, endDate } = options;

  const supabase = createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('supplier_transactions')
    .select('*', { count: 'exact' })
    .eq('id_shop', shopId)
    .eq('id_supplier', supplierId);

  // Apply transaction type filter
  if (transactionType) {
    query = query.eq('transaction_type', transactionType);
  }

  // Apply date range filter
  if (startDate) {
    query = query.gte('transaction_date', startDate);
  }
  if (endDate) {
    query = query.lte('transaction_date', endDate);
  }

  // Order by most recent first
  query = query.order('created_at', { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch supplier transactions: ${error.message}`);
  }

  return {
    transactions: data ?? [],
    totalCount: count ?? 0,
  };
}

/**
 * Fetches supplier payments
 */
async function fetchSupplierPayments(
  shopId: string,
  supplierId: string,
  options: UseSupplierPaymentsOptions
): Promise<{ payments: SupplierPaymentWithPurchase[]; totalCount: number }> {
  const { page = 1, pageSize = 20, paymentType, startDate, endDate } = options;

  const supabase = createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('supplier_payments')
    .select(
      `
      *,
      purchase:purchases!supplier_payments_id_purchase_fkey (
        id_purchase,
        purchase_number
      )
    `,
      { count: 'exact' }
    )
    .eq('id_shop', shopId)
    .eq('id_supplier', supplierId);

  // Apply payment type filter
  if (paymentType) {
    query = query.eq('payment_type', paymentType);
  }

  // Apply date range filter
  if (startDate) {
    query = query.gte('payment_date', startDate);
  }
  if (endDate) {
    query = query.lte('payment_date', endDate);
  }

  // Order by most recent first
  query = query.order('payment_date', { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch supplier payments: ${error.message}`);
  }

  return {
    payments: (data ?? []) as unknown as SupplierPaymentWithPurchase[],
    totalCount: count ?? 0,
  };
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to fetch paginated supplier list with search and filtering.
 *
 * Features:
 * - Automatic shop scoping via useShop
 * - Search by company name, contact name, or phone number
 * - Pagination with page navigation
 * - Sorting by any supplier field
 * - Filtering by category and active status
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated supplier list with metadata
 *
 * @example
 * ```tsx
 * function SupplierList() {
 *   const [search, setSearch] = useState('');
 *   const [page, setPage] = useState(1);
 *
 *   const {
 *     suppliers,
 *     totalCount,
 *     totalPages,
 *     hasNextPage,
 *     isLoading,
 *     error
 *   } = useSuppliers({
 *     search,
 *     page,
 *     pageSize: 20,
 *     sortBy: 'company_name',
 *     sortDirection: 'asc'
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       <SearchInput value={search} onChange={setSearch} />
 *       <SupplierTable suppliers={suppliers} />
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
export function useSuppliers(options: UseSuppliersOptions = {}): UseSuppliersReturn {
  const { shopId, hasAccess } = useShop();
  const {
    search = '',
    page = 1,
    pageSize = 20,
    sortBy = 'company_name',
    sortDirection = 'asc',
    categoryId,
    isActive,
    includeDeleted = false,
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.suppliers(shopId ?? ''),
      { search, page, pageSize, sortBy, sortDirection, categoryId, isActive, includeDeleted },
    ],
    queryFn: () =>
      fetchSuppliers(shopId!, {
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        categoryId,
        isActive,
        includeDeleted,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  const suppliers = data?.suppliers ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    suppliers,
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
 * Hook to fetch a single supplier by ID
 *
 * @param supplierId - The supplier ID to fetch
 * @param options - Query options
 * @returns Supplier data with category
 *
 * @example
 * ```tsx
 * const { supplier, isLoading, error } = useSupplier('supplier-uuid');
 * ```
 */
export function useSupplier(supplierId: string, options: { enabled?: boolean } = {}) {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.supplier(shopId ?? '', supplierId),
    queryFn: () => fetchSupplier(shopId!, supplierId),
    enabled: !!shopId && !!supplierId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch supplier categories
 *
 * @returns List of supplier categories
 *
 * @example
 * ```tsx
 * const { data: categories, isLoading } = useSupplierCategories();
 * ```
 */
export function useSupplierCategories(options: { enabled?: boolean } = {}) {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.supplierCategories(shopId ?? ''),
    queryFn: () => fetchSupplierCategories(shopId!),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - categories change less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch supplier transactions (ledger)
 *
 * NOTE: supplier_transactions is an IMMUTABLE ledger - only INSERTs allowed
 *
 * @param supplierId - The supplier ID to fetch transactions for
 * @param options - Query options for filtering and pagination
 * @returns Paginated transaction list
 *
 * @example
 * ```tsx
 * const {
 *   transactions,
 *   totalCount,
 *   isLoading
 * } = useSupplierTransactions('supplier-uuid', {
 *   page: 1,
 *   pageSize: 20
 * });
 * ```
 */
export function useSupplierTransactions(
  supplierId: string,
  options: UseSupplierTransactionsOptions = {}
): UseSupplierTransactionsReturn {
  const { shopId, hasAccess } = useShop();
  const { page = 1, pageSize = 20, transactionType, startDate, endDate, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.supplierTransactions(shopId ?? '', supplierId),
      { page, pageSize, transactionType, startDate, endDate },
    ],
    queryFn: () =>
      fetchSupplierTransactions(shopId!, supplierId, {
        page,
        pageSize,
        transactionType,
        startDate,
        endDate,
      }),
    enabled: !!shopId && !!supplierId && hasAccess && enabled,
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

/**
 * Hook to fetch supplier payments
 *
 * @param supplierId - The supplier ID to fetch payments for
 * @param options - Query options for filtering and pagination
 * @returns Paginated payment list
 *
 * @example
 * ```tsx
 * const {
 *   payments,
 *   totalCount,
 *   isLoading
 * } = useSupplierPayments('supplier-uuid', {
 *   page: 1,
 *   pageSize: 20
 * });
 * ```
 */
export function useSupplierPayments(
  supplierId: string,
  options: UseSupplierPaymentsOptions = {}
): UseSupplierPaymentsReturn {
  const { shopId, hasAccess } = useShop();
  const { page = 1, pageSize = 20, paymentType, startDate, endDate, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: [
      'supplier-payments',
      shopId ?? '',
      supplierId,
      { page, pageSize, paymentType, startDate, endDate },
    ],
    queryFn: () =>
      fetchSupplierPayments(shopId!, supplierId, {
        page,
        pageSize,
        paymentType,
        startDate,
        endDate,
      }),
    enabled: !!shopId && !!supplierId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, error, refetch } = queryResult;

  const payments = data?.payments ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    payments,
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
 * Hook to create a new supplier
 *
 * @example
 * ```tsx
 * const createSupplier = useCreateSupplier();
 *
 * const handleCreate = async (data: SupplierInsert) => {
 *   try {
 *     const newSupplier = await createSupplier.mutateAsync(data);
 *     toast.success('Supplier created!');
 *   } catch (error) {
 *     toast.error('Failed to create supplier');
 *   }
 * };
 * ```
 */
export function useCreateSupplier() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<SupplierInsert, 'id_shop' | 'created_by'>) => {
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

      const insertData: SupplierInsert = {
        ...data,
        id_shop: shopId,
        created_by: publicUser.id_user,
      };

      const { data: supplier, error } = await supabase
        .from('suppliers')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create supplier: ${error.message}`);
      }

      return supplier;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.suppliers(shopId) });
      }
    },
  });
}

/**
 * Hook to update an existing supplier
 *
 * @example
 * ```tsx
 * const updateSupplier = useUpdateSupplier();
 *
 * const handleUpdate = async (supplierId: string, data: SupplierUpdate) => {
 *   try {
 *     await updateSupplier.mutateAsync({ supplierId, data });
 *     toast.success('Supplier updated!');
 *   } catch (error) {
 *     toast.error('Failed to update supplier');
 *   }
 * };
 * ```
 */
export function useUpdateSupplier() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, data }: { supplierId: string; data: SupplierUpdate }) => {
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

      const { data: supplier, error } = await supabase
        .from('suppliers')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
          updated_by: publicUser?.id_user,
        })
        .eq('id_supplier', supplierId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update supplier: ${error.message}`);
      }

      return supplier;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.suppliers(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.supplier(shopId, variables.supplierId),
        });
      }
    },
  });
}

/**
 * Hook to soft-delete a supplier
 *
 * Note: This performs a soft delete by setting deleted_at.
 * The supplier's balance should be zero before deletion.
 *
 * @example
 * ```tsx
 * const deleteSupplier = useDeleteSupplier();
 *
 * const handleDelete = async (supplierId: string) => {
 *   try {
 *     await deleteSupplier.mutateAsync(supplierId);
 *     toast.success('Supplier deleted!');
 *   } catch (error) {
 *     toast.error('Failed to delete supplier');
 *   }
 * };
 * ```
 */
export function useDeleteSupplier() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplierId: string) => {
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
        .from('suppliers')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        })
        .eq('id_supplier', supplierId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to delete supplier: ${error.message}`);
      }

      return { supplierId };
    },
    onSuccess: (_, supplierId) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.suppliers(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.supplier(shopId, supplierId),
        });
      }
    },
  });
}

// =============================================================================
// CATEGORY MUTATIONS
// =============================================================================

/**
 * Hook to create a new supplier category
 *
 * @example
 * ```tsx
 * const createCategory = useCreateSupplierCategory();
 *
 * const handleCreate = async (data: SupplierCategoryInsert) => {
 *   try {
 *     await createCategory.mutateAsync(data);
 *     toast.success('Category created!');
 *   } catch (error) {
 *     toast.error('Failed to create category');
 *   }
 * };
 * ```
 */
export function useCreateSupplierCategory() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<SupplierCategoryInsert, 'id_shop'>) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const insertData: SupplierCategoryInsert = {
        ...data,
        id_shop: shopId,
      };

      const { data: category, error } = await supabase
        .from('supplier_categories')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create supplier category: ${error.message}`);
      }

      return category;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.supplierCategories(shopId) });
      }
    },
  });
}

/**
 * Hook to update an existing supplier category
 *
 * @example
 * ```tsx
 * const updateCategory = useUpdateSupplierCategory();
 *
 * const handleUpdate = async (categoryId: string, data: SupplierCategoryUpdate) => {
 *   try {
 *     await updateCategory.mutateAsync({ categoryId, data });
 *     toast.success('Category updated!');
 *   } catch (error) {
 *     toast.error('Failed to update category');
 *   }
 * };
 * ```
 */
export function useUpdateSupplierCategory() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      data,
    }: {
      categoryId: string;
      data: SupplierCategoryUpdate;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: category, error } = await supabase
        .from('supplier_categories')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id_category', categoryId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update supplier category: ${error.message}`);
      }

      return category;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.supplierCategories(shopId) });
      }
    },
  });
}

/**
 * Hook to delete a supplier category
 *
 * Note: This will set is_active to false (soft delete).
 * Suppliers in this category will remain but become uncategorized.
 *
 * @example
 * ```tsx
 * const deleteCategory = useDeleteSupplierCategory();
 *
 * const handleDelete = async (categoryId: string) => {
 *   try {
 *     await deleteCategory.mutateAsync(categoryId);
 *     toast.success('Category deleted!');
 *   } catch (error) {
 *     toast.error('Failed to delete category');
 *   }
 * };
 * ```
 */
export function useDeleteSupplierCategory() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('supplier_categories')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id_category', categoryId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to delete supplier category: ${error.message}`);
      }

      return { categoryId };
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.supplierCategories(shopId) });
        // Also invalidate suppliers list since category counts may have changed
        queryClient.invalidateQueries({ queryKey: invalidateScope.suppliers(shopId) });
      }
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Utility to invalidate supplier caches
 */
export function useInvalidateSuppliers() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all supplier queries for current shop */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({ queryKey: invalidateScope.suppliers(shopId) });
      }
      return undefined;
    },
    /** Invalidate a specific supplier */
    invalidateOne: (supplierId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.supplier(shopId, supplierId),
        });
      }
      return undefined;
    },
    /** Invalidate supplier categories */
    invalidateCategories: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.supplierCategories(shopId),
        });
      }
      return undefined;
    },
    /** Invalidate supplier transactions */
    invalidateTransactions: (supplierId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.supplierTransactions(shopId, supplierId),
        });
      }
      return undefined;
    },
  };
}

/**
 * Local query key definitions for use in components
 */
export const supplierKeys = {
  all: (shopId: string) => queryKeys.suppliers(shopId),
  one: (shopId: string, supplierId: string) => queryKeys.supplier(shopId, supplierId),
  categories: (shopId: string) => queryKeys.supplierCategories(shopId),
  transactions: (shopId: string, supplierId: string) =>
    queryKeys.supplierTransactions(shopId, supplierId),
};
