/**
 * useCustomer Hook
 *
 * TanStack Query hook for fetching a single customer with full details.
 * Includes balance information maintained by database triggers.
 *
 * @module lib/hooks/data/useCustomer
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { queryKeys } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/types/database';

/**
 * Customer row type from the public.customers table
 */
type Customer = Tables<'customers'>;

/**
 * Extended customer type with related data
 */
export interface CustomerWithDetails extends Customer {
  /** User who created this customer */
  created_by_user?: {
    id_user: string;
    full_name: string;
  } | null;
  /** User who last updated this customer */
  updated_by_user?: {
    id_user: string;
    full_name: string;
  } | null;
}

/**
 * Options for the useCustomer hook
 */
export interface UseCustomerOptions {
  /** Customer ID to fetch */
  customerId: string | null | undefined;
  /** Include related user data (created_by, updated_by) */
  includeUsers?: boolean;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for the useCustomer hook
 */
export interface UseCustomerReturn {
  /** The customer data, null if not found */
  customer: CustomerWithDetails | null;
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** True if query has fetched at least once */
  isFetched: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
  /** Check if customer has outstanding balance */
  hasBalance: boolean;
  /** Check if customer owes money (positive balance) */
  owesBalance: boolean;
  /** Check if shop owes customer (negative balance) */
  hasCredit: boolean;
}

/**
 * Fetches a single customer with optional related data
 */
async function fetchCustomer(
  shopId: string,
  customerId: string,
  includeUsers: boolean
): Promise<CustomerWithDetails | null> {
  const supabase = createClient();

  // Build select query based on options
  const selectQuery = includeUsers
    ? `
      *,
      created_by_user:users!fk_customers_created_by (
        id_user,
        full_name
      ),
      updated_by_user:users!fk_customers_updated_by (
        id_user,
        full_name
      )
    `
    : '*';

  const { data, error } = await supabase
    .from('customers')
    .select(selectQuery)
    .eq('id_customer', customerId)
    .eq('id_shop', shopId)
    .is('deleted_at', null)
    .single();

  if (error) {
    // PGRST116 = no rows found
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch customer: ${error.message}`);
  }

  return data as unknown as CustomerWithDetails;
}

/**
 * Hook to fetch a single customer by ID.
 *
 * Features:
 * - Automatic shop scoping via useShop
 * - Balance information (maintained by triggers)
 * - Optional related user data
 * - Balance status helpers
 *
 * The customer's balance is maintained by database triggers when
 * transactions are inserted into the customer_transactions ledger.
 *
 * Balance interpretation:
 * - Positive balance: Customer owes the shop
 * - Negative balance: Shop owes the customer (credit)
 * - Zero balance: No outstanding balance
 *
 * @param options - Query options
 * @returns Customer data with loading/error states
 *
 * @example
 * ```tsx
 * function CustomerProfile({ customerId }: { customerId: string }) {
 *   const {
 *     customer,
 *     isLoading,
 *     error,
 *     hasBalance,
 *     owesBalance,
 *     hasCredit
 *   } = useCustomer({ customerId, includeUsers: true });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (!customer) return <NotFound />;
 *
 *   return (
 *     <div>
 *       <h1>{customer.full_name}</h1>
 *       <p>Phone: {customer.phone}</p>
 *       <p>Balance: {formatCurrency(customer.current_balance)}</p>
 *       {owesBalance && <Badge color="red">Outstanding Balance</Badge>}
 *       {hasCredit && <Badge color="green">Credit Available</Badge>}
 *       <p>Created by: {customer.created_by_user?.full_name}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCustomer(options: UseCustomerOptions): UseCustomerReturn {
  const { customerId, includeUsers = false, enabled = true } = options;
  const { shopId, hasAccess } = useShop();

  const queryResult = useQuery({
    queryKey: queryKeys.customer(shopId ?? '', customerId ?? ''),
    queryFn: () => fetchCustomer(shopId!, customerId!, includeUsers),
    enabled: !!shopId && !!customerId && hasAccess && enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: customer, isLoading, isFetching, isFetched, error, refetch } = queryResult;

  // Balance status helpers
  const balance = customer?.current_balance ?? 0;
  const hasBalance = balance !== 0;
  const owesBalance = balance > 0; // Customer owes shop
  const hasCredit = balance < 0; // Shop owes customer

  return {
    customer: customer ?? null,
    isLoading,
    isFetching,
    isFetched,
    error: error as Error | null,
    refetch,
    hasBalance,
    owesBalance,
    hasCredit,
  };
}

/**
 * Hook to prefetch a customer for faster navigation
 *
 * @example
 * ```tsx
 * const prefetchCustomer = usePrefetchCustomer();
 *
 * // Prefetch on hover
 * <CustomerRow
 *   onMouseEnter={() => prefetchCustomer(customer.id_customer)}
 * />
 * ```
 */
export function usePrefetchCustomer() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return (customerId: string) => {
    if (!shopId || !customerId) {
      return;
    }

    queryClient.prefetchQuery({
      queryKey: queryKeys.customer(shopId, customerId),
      queryFn: () => fetchCustomer(shopId, customerId, false),
      staleTime: 60 * 1000,
    });
  };
}

/**
 * Hook to get multiple customers by IDs
 *
 * Useful for displaying customer names in lists where you have IDs
 *
 * @example
 * ```tsx
 * const { customers, isLoading } = useCustomersByIds(['id1', 'id2', 'id3']);
 *
 * // Get customer name by ID
 * const getName = (id: string) => customers.find(c => c.id_customer === id)?.full_name;
 * ```
 */
export function useCustomersByIds(customerIds: string[]) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: ['customers', shopId, 'byIds', customerIds],
    queryFn: async () => {
      if (!shopId || customerIds.length === 0) {
        return [];
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('customers')
        .select('id_customer, full_name, phone, current_balance')
        .eq('id_shop', shopId)
        .in('id_customer', customerIds)
        .is('deleted_at', null);

      if (error) {
        throw new Error(`Failed to fetch customers: ${error.message}`);
      }

      return data ?? [];
    },
    enabled: !!shopId && hasAccess && customerIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to search customers with autocomplete
 *
 * Returns a lightweight list suitable for dropdown/autocomplete
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 * const { results, isLoading } = useCustomerSearch(search);
 *
 * <Autocomplete
 *   value={search}
 *   onChange={setSearch}
 *   options={results}
 *   loading={isLoading}
 * />
 * ```
 */
export function useCustomerSearch(searchTerm: string, limit: number = 10) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: queryKeys.customerSearch(shopId ?? '', searchTerm),
    queryFn: async () => {
      if (!shopId || !searchTerm.trim()) {
        return [];
      }

      const supabase = createClient();
      const term = `%${searchTerm.trim()}%`;

      const { data, error } = await supabase
        .from('customers')
        .select('id_customer, full_name, phone, current_balance')
        .eq('id_shop', shopId)
        .is('deleted_at', null)
        .or(`full_name.ilike.${term},phone.ilike.${term}`)
        .order('full_name', { ascending: true })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to search customers: ${error.message}`);
      }

      return data ?? [];
    },
    enabled: !!shopId && hasAccess && searchTerm.trim().length >= 2,
    staleTime: 10 * 1000, // 10 seconds - searches should be relatively fresh
  });
}
