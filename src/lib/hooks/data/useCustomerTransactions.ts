/**
 * useCustomerTransactions Hook
 *
 * TanStack Query hook for fetching customer transaction ledger history.
 * The customer_transactions table is an IMMUTABLE LEDGER - this hook
 * only supports SELECT operations. All writes are handled by database
 * triggers when related operations occur (sales, payments, etc.).
 *
 * IMPORTANT: customer_transactions is INSERT-ONLY at the database level.
 * No UPDATE or DELETE operations are allowed. The balance_after field
 * provides a running balance calculated at insertion time.
 *
 * @module lib/hooks/data/useCustomerTransactions
 */

'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { queryKeys } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/types/database';

/**
 * Customer transaction row type from the public.customer_transactions table
 *
 * This is an immutable ledger entry with the following key fields:
 * - debit_amount: Amount charged to customer (increases their balance)
 * - credit_amount: Amount credited to customer (decreases their balance)
 * - balance_after: Running balance after this transaction
 * - sequence_number: Auto-incremented per customer for ordering
 */
export type CustomerTransaction = Tables<'customer_transactions'>;

/**
 * Extended transaction type with related data
 */
export interface CustomerTransactionWithDetails extends CustomerTransaction {
  /** User who created this transaction */
  created_by_user?: {
    id_user: string;
    full_name: string;
  } | null;
}

/**
 * Transaction type enum for filtering
 */
export type TransactionType =
  | 'sale'
  | 'payment'
  | 'refund'
  | 'adjustment'
  | 'opening_balance'
  | 'return';

/**
 * Options for filtering customer transactions
 */
export interface UseCustomerTransactionsOptions {
  /** Customer ID to fetch transactions for (required) */
  customerId: string | null | undefined;
  /** Filter by transaction type */
  transactionType?: TransactionType;
  /** Filter transactions after this date */
  fromDate?: string;
  /** Filter transactions before this date */
  toDate?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 50) */
  pageSize?: number;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for the useCustomerTransactions hook
 */
export interface UseCustomerTransactionsReturn {
  /** Array of transactions (ordered by sequence_number descending - newest first) */
  transactions: CustomerTransactionWithDetails[];
  /** Total count of matching transactions */
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
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
  /** Aggregated totals */
  totals: {
    totalDebits: number;
    totalCredits: number;
    netChange: number;
  };
}

/**
 * Fetches customer transactions with pagination and filtering
 *
 * Note: This is a READ-ONLY operation. The customer_transactions table
 * is an immutable ledger maintained by database triggers.
 */
async function fetchCustomerTransactions(
  shopId: string,
  customerId: string,
  options: Omit<UseCustomerTransactionsOptions, 'customerId' | 'enabled'>
): Promise<{
  transactions: CustomerTransactionWithDetails[];
  totalCount: number;
  totals: { totalDebits: number; totalCredits: number; netChange: number };
}> {
  const { transactionType, fromDate, toDate, page = 1, pageSize = 50 } = options;

  const supabase = createClient();
  const offset = (page - 1) * pageSize;

  // Build the query for transactions
  let query = supabase
    .from('customer_transactions')
    .select(
      `
      *,
      created_by_user:users!fk_customer_transactions_created_by (
        id_user,
        full_name
      )
    `,
      { count: 'exact' }
    )
    .eq('id_shop', shopId)
    .eq('id_customer', customerId);

  // Apply transaction type filter
  if (transactionType) {
    query = query.eq('transaction_type', transactionType);
  }

  // Apply date range filters
  if (fromDate) {
    query = query.gte('created_at', fromDate);
  }

  if (toDate) {
    query = query.lte('created_at', toDate);
  }

  // Order by sequence_number descending (newest first)
  // This provides consistent ordering even for transactions created at the same time
  query = query.order('sequence_number', { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch customer transactions: ${error.message}`);
  }

  // Calculate totals from the fetched data
  // Note: For accurate totals across all transactions, a separate aggregation query would be needed
  const transactions = (data ?? []) as unknown as CustomerTransactionWithDetails[];

  // Calculate totals for the current page (for display purposes)
  const totals = transactions.reduce(
    (acc, tx) => ({
      totalDebits: acc.totalDebits + (tx.debit_amount || 0),
      totalCredits: acc.totalCredits + (tx.credit_amount || 0),
      netChange: acc.netChange + ((tx.debit_amount || 0) - (tx.credit_amount || 0)),
    }),
    { totalDebits: 0, totalCredits: 0, netChange: 0 }
  );

  return {
    transactions,
    totalCount: count ?? 0,
    totals,
  };
}

/**
 * Hook to fetch customer transaction history (ledger).
 *
 * IMPORTANT: This is a READ-ONLY hook for an IMMUTABLE LEDGER.
 * The customer_transactions table does not allow UPDATE or DELETE operations.
 * New entries are created by database triggers when related operations occur.
 *
 * Transaction types and their meanings:
 * - 'sale': Debit entry when customer makes a purchase
 * - 'payment': Credit entry when customer pays towards their balance
 * - 'refund': Credit entry for returned items
 * - 'adjustment': Manual balance adjustment (debit or credit)
 * - 'opening_balance': Initial balance when customer is created with balance
 * - 'return': Credit entry for item returns
 *
 * Balance interpretation:
 * - debit_amount: Increases customer's balance (they owe more)
 * - credit_amount: Decreases customer's balance (they owe less)
 * - balance_after: Running balance after this transaction
 *
 * @param options - Query options for filtering
 * @returns Transaction list with pagination and totals
 *
 * @example
 * ```tsx
 * function CustomerLedger({ customerId }: { customerId: string }) {
 *   const [page, setPage] = useState(1);
 *
 *   const {
 *     transactions,
 *     totalCount,
 *     totalPages,
 *     isLoading,
 *     error,
 *     totals
 *   } = useCustomerTransactions({
 *     customerId,
 *     page,
 *     pageSize: 25
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       <h2>Transaction History ({totalCount} entries)</h2>
 *       <table>
 *         <thead>
 *           <tr>
 *             <th>Date</th>
 *             <th>Type</th>
 *             <th>Debit</th>
 *             <th>Credit</th>
 *             <th>Balance</th>
 *           </tr>
 *         </thead>
 *         <tbody>
 *           {transactions.map((tx) => (
 *             <tr key={tx.id_transaction}>
 *               <td>{formatDate(tx.created_at)}</td>
 *               <td>{tx.transaction_type}</td>
 *               <td>{tx.debit_amount > 0 ? formatCurrency(tx.debit_amount) : '-'}</td>
 *               <td>{tx.credit_amount > 0 ? formatCurrency(tx.credit_amount) : '-'}</td>
 *               <td>{formatCurrency(tx.balance_after)}</td>
 *             </tr>
 *           ))}
 *         </tbody>
 *       </table>
 *       <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useCustomerTransactions(
  options: UseCustomerTransactionsOptions
): UseCustomerTransactionsReturn {
  const {
    customerId,
    transactionType,
    fromDate,
    toDate,
    page = 1,
    pageSize = 50,
    enabled = true,
  } = options;

  const { shopId, hasAccess } = useShop();

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.customerHistory(shopId ?? '', customerId ?? ''),
      { transactionType, fromDate, toDate, page, pageSize },
    ],
    queryFn: () =>
      fetchCustomerTransactions(shopId!, customerId!, {
        transactionType,
        fromDate,
        toDate,
        page,
        pageSize,
      }),
    enabled: !!shopId && !!customerId && hasAccess && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  const transactions = data?.transactions ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const totals = data?.totals ?? { totalDebits: 0, totalCredits: 0, netChange: 0 };

  return {
    transactions,
    totalCount,
    page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    totals,
  };
}

/**
 * Hook for infinite scrolling customer transaction history
 *
 * Useful for mobile views or continuous scrolling interfaces
 *
 * @example
 * ```tsx
 * function CustomerLedgerInfinite({ customerId }: { customerId: string }) {
 *   const {
 *     data,
 *     fetchNextPage,
 *     hasNextPage,
 *     isFetchingNextPage,
 *     isLoading
 *   } = useCustomerTransactionsInfinite({ customerId, pageSize: 20 });
 *
 *   const transactions = data?.pages.flatMap(p => p.transactions) ?? [];
 *
 *   return (
 *     <div>
 *       {transactions.map((tx) => (
 *         <TransactionRow key={tx.id_transaction} transaction={tx} />
 *       ))}
 *       {hasNextPage && (
 *         <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
 *           {isFetchingNextPage ? 'Loading...' : 'Load More'}
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCustomerTransactionsInfinite(options: {
  customerId: string | null | undefined;
  transactionType?: TransactionType;
  fromDate?: string;
  toDate?: string;
  pageSize?: number;
  enabled?: boolean;
}) {
  const { customerId, transactionType, fromDate, toDate, pageSize = 20, enabled = true } = options;

  const { shopId, hasAccess } = useShop();

  return useInfiniteQuery({
    queryKey: [
      ...queryKeys.customerHistory(shopId ?? '', customerId ?? ''),
      'infinite',
      { transactionType, fromDate, toDate, pageSize },
    ],
    queryFn: async ({ pageParam = 1 }) => {
      return fetchCustomerTransactions(shopId!, customerId!, {
        transactionType,
        fromDate,
        toDate,
        page: pageParam,
        pageSize,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalPages = Math.ceil(lastPage.totalCount / pageSize);
      const nextPage = allPages.length + 1;
      return nextPage <= totalPages ? nextPage : undefined;
    },
    enabled: !!shopId && !!customerId && hasAccess && enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to get transaction summary/totals for a customer
 *
 * Fetches aggregated data across all transactions for reporting
 *
 * @example
 * ```tsx
 * const { summary, isLoading } = useCustomerTransactionSummary(customerId);
 *
 * <SummaryCard>
 *   <Stat label="Total Purchases" value={summary.totalDebits} />
 *   <Stat label="Total Payments" value={summary.totalCredits} />
 *   <Stat label="Current Balance" value={summary.currentBalance} />
 * </SummaryCard>
 * ```
 */
export function useCustomerTransactionSummary(customerId: string | null | undefined) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: [...queryKeys.customerHistory(shopId ?? '', customerId ?? ''), 'summary'],
    queryFn: async () => {
      if (!shopId || !customerId) {
        return null;
      }

      const supabase = createClient();

      // Get the latest transaction for current balance
      const { data: latestTx, error: latestError } = await supabase
        .from('customer_transactions')
        .select('balance_after')
        .eq('id_shop', shopId)
        .eq('id_customer', customerId)
        .order('sequence_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) {
        throw new Error(`Failed to fetch latest transaction: ${latestError.message}`);
      }

      // Get aggregated totals
      // Note: Supabase doesn't support SUM directly, so we fetch all and aggregate
      // For large datasets, consider using a database function
      const { data: allTx, error: allError } = await supabase
        .from('customer_transactions')
        .select('debit_amount, credit_amount, transaction_type')
        .eq('id_shop', shopId)
        .eq('id_customer', customerId);

      if (allError) {
        throw new Error(`Failed to fetch transaction totals: ${allError.message}`);
      }

      const transactions = allTx ?? [];

      const summary = transactions.reduce(
        (acc, tx) => {
          acc.totalDebits += tx.debit_amount || 0;
          acc.totalCredits += tx.credit_amount || 0;
          acc.transactionCount += 1;

          // Track by type
          const type = tx.transaction_type as string;
          if (!acc.byType[type]) {
            acc.byType[type] = { debits: 0, credits: 0, count: 0 };
          }
          acc.byType[type].debits += tx.debit_amount || 0;
          acc.byType[type].credits += tx.credit_amount || 0;
          acc.byType[type].count += 1;

          return acc;
        },
        {
          totalDebits: 0,
          totalCredits: 0,
          transactionCount: 0,
          currentBalance: latestTx?.balance_after ?? 0,
          byType: {} as Record<string, { debits: number; credits: number; count: number }>,
        }
      );

      return summary;
    },
    enabled: !!shopId && !!customerId && hasAccess,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get recent transactions for a customer (last N transactions)
 *
 * Useful for quick previews in customer cards or dashboards
 *
 * @example
 * ```tsx
 * const { transactions, isLoading } = useRecentCustomerTransactions(customerId, 5);
 *
 * <RecentActivityList>
 *   {transactions.map(tx => (
 *     <ActivityItem key={tx.id_transaction} transaction={tx} />
 *   ))}
 * </RecentActivityList>
 * ```
 */
export function useRecentCustomerTransactions(
  customerId: string | null | undefined,
  limit: number = 5
) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: [...queryKeys.customerHistory(shopId ?? '', customerId ?? ''), 'recent', limit],
    queryFn: async () => {
      if (!shopId || !customerId) {
        return [];
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('customer_transactions')
        .select(
          `
          *,
          created_by_user:users!fk_customer_transactions_created_by (
            id_user,
            full_name
          )
        `
        )
        .eq('id_shop', shopId)
        .eq('id_customer', customerId)
        .order('sequence_number', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch recent transactions: ${error.message}`);
      }

      return (data ?? []) as unknown as CustomerTransactionWithDetails[];
    },
    enabled: !!shopId && !!customerId && hasAccess,
    staleTime: 30 * 1000, // 30 seconds
  });
}
