/**
 * useCustomers Hook
 *
 * TanStack Query hook for fetching and managing customer lists.
 * Supports pagination, search by name/phone, and filtering.
 *
 * @module lib/hooks/data/useCustomers
 */

'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { queryKeys, invalidateScope } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/types/database';

/**
 * Customer row type from the public.customers table
 */
export type Customer = Tables<'customers'>;

/**
 * Customer insert type for creating new customers
 */
export type CustomerInsert = TablesInsert<'customers'>;

/**
 * Customer update type for updating customers
 */
export type CustomerUpdate = TablesUpdate<'customers'>;

/**
 * Options for filtering and paginating customer queries
 */
export interface UseCustomersOptions {
  /** Search term for name or phone (ilike search) */
  search?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: keyof Customer;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Filter by client type */
  clientType?: string;
  /** Filter by financial status */
  financialStatus?: string;
  /** Include soft-deleted customers */
  includeDeleted?: boolean;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for the useCustomers hook
 */
export interface UseCustomersReturn {
  /** Array of customers */
  customers: Customer[];
  /** Total count of matching customers */
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
 * Fetches customers with pagination and filtering
 */
async function fetchCustomers(
  shopId: string,
  options: UseCustomersOptions
): Promise<{ customers: Customer[]; totalCount: number }> {
  const {
    search,
    page = 1,
    pageSize = 20,
    sortBy = 'full_name',
    sortDirection = 'asc',
    clientType,
    financialStatus,
    includeDeleted = false,
  } = options;

  const supabase = createClient();

  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;

  // Build the base query
  let query = supabase.from('customers').select('*', { count: 'exact' }).eq('id_shop', shopId);

  // Apply soft delete filter
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  // Apply search filter (name or phone)
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(`full_name.ilike.${searchTerm},phone.ilike.${searchTerm}`);
  }

  // Apply client type filter
  if (clientType) {
    query = query.eq('client_type', clientType);
  }

  // Apply financial status filter
  if (financialStatus) {
    query = query.eq('financial_status', financialStatus);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch customers: ${error.message}`);
  }

  return {
    customers: data ?? [],
    totalCount: count ?? 0,
  };
}

/**
 * Hook to fetch paginated customer list with search and filtering.
 *
 * Features:
 * - Automatic shop scoping via useShop
 * - Search by name or phone number
 * - Pagination with page navigation
 * - Sorting by any customer field
 * - Filtering by client type and financial status
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated customer list with metadata
 *
 * @example
 * ```tsx
 * function CustomerList() {
 *   const [search, setSearch] = useState('');
 *   const [page, setPage] = useState(1);
 *
 *   const {
 *     customers,
 *     totalCount,
 *     totalPages,
 *     hasNextPage,
 *     isLoading,
 *     error
 *   } = useCustomers({
 *     search,
 *     page,
 *     pageSize: 20,
 *     sortBy: 'full_name',
 *     sortDirection: 'asc'
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       <SearchInput value={search} onChange={setSearch} />
 *       <CustomerTable customers={customers} />
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
export function useCustomers(options: UseCustomersOptions = {}): UseCustomersReturn {
  const { shopId, hasAccess } = useShop();
  const {
    search = '',
    page = 1,
    pageSize = 20,
    sortBy = 'full_name',
    sortDirection = 'asc',
    clientType,
    financialStatus,
    includeDeleted = false,
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.customers(shopId ?? ''),
      {
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        clientType,
        financialStatus,
        includeDeleted,
      },
    ],
    queryFn: () =>
      fetchCustomers(shopId!, {
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        clientType,
        financialStatus,
        includeDeleted,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  const customers = data?.customers ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    customers,
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
 * Hook to create a new customer
 *
 * @example
 * ```tsx
 * const createCustomer = useCreateCustomer();
 *
 * const handleCreate = async (data: CustomerInsert) => {
 *   try {
 *     const newCustomer = await createCustomer.mutateAsync(data);
 *     toast.success('Customer created!');
 *   } catch (error) {
 *     toast.error('Failed to create customer');
 *   }
 * };
 * ```
 */
export function useCreateCustomer() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<CustomerInsert, 'id_shop'>) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: customer, error } = await supabase
        .from('customers')
        .insert({ ...data, id_shop: shopId })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create customer: ${error.message}`);
      }

      return customer;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.customers(shopId) });
      }
    },
  });
}

/**
 * Hook to update an existing customer
 *
 * @example
 * ```tsx
 * const updateCustomer = useUpdateCustomer();
 *
 * const handleUpdate = async (customerId: string, data: CustomerUpdate) => {
 *   try {
 *     await updateCustomer.mutateAsync({ customerId, data });
 *     toast.success('Customer updated!');
 *   } catch (error) {
 *     toast.error('Failed to update customer');
 *   }
 * };
 * ```
 */
export function useUpdateCustomer() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, data }: { customerId: string; data: CustomerUpdate }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: customer, error } = await supabase
        .from('customers')
        .update(data)
        .eq('id_customer', customerId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update customer: ${error.message}`);
      }

      return customer;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.customers(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.customer(shopId, variables.customerId),
        });
      }
    },
  });
}

/**
 * Hook to soft-delete a customer
 *
 * Note: This performs a soft delete by setting deleted_at.
 * The customer's balance should be zero before deletion.
 *
 * @example
 * ```tsx
 * const deleteCustomer = useDeleteCustomer();
 *
 * const handleDelete = async (customerId: string) => {
 *   try {
 *     await deleteCustomer.mutateAsync(customerId);
 *     toast.success('Customer deleted!');
 *   } catch (error) {
 *     toast.error('Failed to delete customer');
 *   }
 * };
 * ```
 */
export function useDeleteCustomer() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id_customer', customerId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to delete customer: ${error.message}`);
      }

      return { customerId };
    },
    onSuccess: (_, customerId) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.customers(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.customer(shopId, customerId),
        });
      }
    },
  });
}

/**
 * Utility to invalidate customer caches
 */
export function useInvalidateCustomers() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all customer queries for current shop */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({ queryKey: invalidateScope.customers(shopId) });
      }
      return undefined;
    },
    /** Invalidate a specific customer */
    invalidateOne: (customerId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.customer(shopId, customerId),
        });
      }
      return undefined;
    },
  };
}
