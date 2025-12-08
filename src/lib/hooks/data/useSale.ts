/**
 * useSale Hook
 *
 * TanStack Query hook for fetching a single sale with full details.
 * Includes related data: customer, sale items, and payments.
 *
 * @module lib/hooks/data/useSale
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/types/database';

import { saleKeys } from './useSales';

/**
 * Sale row type from the public.sales table
 */
type Sale = Tables<'sales'>;

/**
 * Sale item row type from the public.sale_items table
 */
type SaleItem = Tables<'sale_items'>;

/**
 * Sale payment row type from the public.sale_payments table
 */
type SalePayment = Tables<'sale_payments'>;

/**
 * Sale item with inventory item details
 * Note: Sale items table only has id_sale_item, id_sale, id_shop, id_item, unit_price, discount_amount, discount_type, line_total
 * Additional fields like item_name, sku, weight_grams come from the joined inventory_item
 */
export interface SaleItemWithDetails extends SaleItem {
  inventory_item?: {
    id_item: string;
    item_name: string;
    sku: string | null;
    barcode: string | null;
    status: string;
    weight_grams: number;
    metal_type?: {
      id_metal_type: string;
      metal_name: string;
    } | null;
    metal_purity?: {
      id_purity: string;
      purity_name: string;
      percentage: number;
    } | null;
    category?: {
      id_category: string;
      category_name: string;
    } | null;
  } | null;
}

/**
 * Complete sale with all related data
 */
export interface SaleWithDetails extends Sale {
  /** Customer who made the purchase */
  customer?: {
    id_customer: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    current_balance: number;
  } | null;
  /** User who created this sale */
  created_by_user?: {
    id_user: string;
    full_name: string;
  } | null;
  /** User who last updated this sale */
  updated_by_user?: {
    id_user: string;
    full_name: string;
  } | null;
  /** Sale line items */
  sale_items?: SaleItemWithDetails[];
  /** Payments made for this sale */
  sale_payments?: SalePayment[];
}

/**
 * Options for the useSale hook
 */
export interface UseSaleOptions {
  /** Sale ID to fetch */
  saleId: string | null | undefined;
  /** Include sale items relation */
  includeItems?: boolean;
  /** Include payments relation */
  includePayments?: boolean;
  /** Include customer relation */
  includeCustomer?: boolean;
  /** Include user relations (created_by, updated_by) */
  includeUsers?: boolean;
  /** Include inventory details for sale items */
  includeItemDetails?: boolean;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for the useSale hook
 */
export interface UseSaleReturn {
  /** The sale data, null if not found */
  sale: SaleWithDetails | null;
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
  /** Check if sale is fully paid */
  isFullyPaid: boolean;
  /** Check if sale has partial payment */
  hasPartialPayment: boolean;
  /** Check if sale is pending */
  isPending: boolean;
  /** Check if sale is completed */
  isCompleted: boolean;
  /** Check if sale is cancelled */
  isCancelled: boolean;
  /** Outstanding amount (total - paid) */
  outstandingAmount: number;
}

/**
 * Fetches a single sale with optional related data
 */
async function fetchSale(
  shopId: string,
  saleId: string,
  options: {
    includeItems: boolean;
    includePayments: boolean;
    includeCustomer: boolean;
    includeUsers: boolean;
    includeItemDetails: boolean;
  }
): Promise<SaleWithDetails | null> {
  const supabase = createClient();

  // Build select query based on options
  const selectParts = ['*'];

  if (options.includeCustomer) {
    // Note: Using explicit FK hint because there are multiple relationships between sales and customers
    selectParts.push(`
      customer:customers!fk_sales_customer (
        id_customer,
        full_name,
        phone,
        email,
        current_balance
      )
    `);
  }

  if (options.includeUsers) {
    selectParts.push(`
      created_by_user:users!fk_sales_created_by (
        id_user,
        full_name
      ),
      updated_by_user:users!fk_sales_updated_by (
        id_user,
        full_name
      )
    `);
  }

  const selectQuery = selectParts.join(',');

  const { data: sale, error } = await supabase
    .from('sales')
    .select(selectQuery)
    .eq('id_sale', saleId)
    .eq('id_shop', shopId)
    .single();

  if (error) {
    // PGRST116 = no rows found
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch sale: ${error.message}`);
  }

  // Cast to our type
  const saleData = sale as unknown as SaleWithDetails;

  // Fetch sale items separately if requested (for better control over nested relations)
  if (options.includeItems) {
    let itemsSelect = '*';

    if (options.includeItemDetails) {
      // Note: Using explicit FK hints because there may be multiple relationships
      itemsSelect = `
        *,
        inventory_item:inventory_items!fk_sale_items_item (
          id_item,
          item_name,
          sku,
          barcode,
          status,
          weight_grams,
          metal_type:metal_types!fk_inventory_items_metal_type (
            id_metal_type,
            metal_name
          ),
          metal_purity:metal_purities!fk_inventory_items_metal_purity (
            id_purity,
            purity_name,
            percentage
          ),
          category:product_categories!fk_inventory_items_category (
            id_category,
            category_name
          )
        )
      `;
    }

    const { data: items, error: itemsError } = await supabase
      .from('sale_items')
      .select(itemsSelect)
      .eq('id_sale', saleId)
      .eq('id_shop', shopId)
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error('Failed to fetch sale items:', itemsError.message);
    } else {
      saleData.sale_items = items as unknown as SaleItemWithDetails[];
    }
  }

  // Fetch payments separately if requested
  if (options.includePayments) {
    const { data: payments, error: paymentsError } = await supabase
      .from('sale_payments')
      .select('*')
      .eq('id_sale', saleId)
      .eq('id_shop', shopId)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Failed to fetch sale payments:', paymentsError.message);
    } else {
      saleData.sale_payments = payments as SalePayment[];
    }
  }

  return saleData;
}

/**
 * Hook to fetch a single sale by ID with full details.
 *
 * Features:
 * - Automatic shop scoping via useShop
 * - Customer information
 * - Sale items with optional inventory details
 * - Payment history
 * - Status helpers (paid, pending, completed, etc.)
 *
 * @param options - Query options
 * @returns Sale data with loading/error states
 *
 * @example
 * ```tsx
 * function SaleDetails({ saleId }: { saleId: string }) {
 *   const {
 *     sale,
 *     isLoading,
 *     error,
 *     isFullyPaid,
 *     outstandingAmount,
 *     isCompleted
 *   } = useSale({
 *     saleId,
 *     includeItems: true,
 *     includePayments: true,
 *     includeCustomer: true,
 *     includeItemDetails: true
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (!sale) return <NotFound />;
 *
 *   return (
 *     <div>
 *       <h1>Sale #{sale.sale_number}</h1>
 *       <p>Customer: {sale.customer?.full_name}</p>
 *       <p>Total: {formatCurrency(sale.total_amount)}</p>
 *       {!isFullyPaid && (
 *         <Badge color="red">
 *           Outstanding: {formatCurrency(outstandingAmount)}
 *         </Badge>
 *       )}
 *
 *       <h2>Items</h2>
 *       {sale.sale_items?.map(item => (
 *         <div key={item.id_sale_item}>
 *           <span>{item.item_name}</span>
 *           <span>{formatCurrency(item.total_price)}</span>
 *         </div>
 *       ))}
 *
 *       <h2>Payments</h2>
 *       {sale.sale_payments?.map(payment => (
 *         <div key={payment.id_payment}>
 *           <span>{payment.payment_type}</span>
 *           <span>{formatCurrency(payment.amount)}</span>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSale(options: UseSaleOptions): UseSaleReturn {
  const {
    saleId,
    includeItems = true,
    includePayments = true,
    includeCustomer = true,
    includeUsers = false,
    includeItemDetails = false,
    enabled = true,
  } = options;

  const { shopId, hasAccess } = useShop();

  const queryResult = useQuery({
    queryKey: [
      ...saleKeys.detail(shopId ?? '', saleId ?? ''),
      { includeItems, includePayments, includeCustomer, includeUsers, includeItemDetails },
    ],
    queryFn: () =>
      fetchSale(shopId!, saleId!, {
        includeItems,
        includePayments,
        includeCustomer,
        includeUsers,
        includeItemDetails,
      }),
    enabled: !!shopId && !!saleId && hasAccess && enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: sale, isLoading, isFetching, isFetched, error, refetch } = queryResult;

  // Status helpers
  const totalAmount = Number(sale?.total_amount ?? 0);
  const paidAmount = Number(sale?.paid_amount ?? 0);
  const outstandingAmount = Math.max(0, totalAmount - paidAmount);

  const isFullyPaid = sale?.payment_status === 'paid' || outstandingAmount === 0;
  const hasPartialPayment = paidAmount > 0 && paidAmount < totalAmount;
  // Database field is 'status' not 'sale_status'
  const isPending = sale?.status === 'pending';
  const isCompleted = sale?.status === 'completed';
  const isCancelled = sale?.status === 'cancelled' || sale?.deleted_at !== null;

  return {
    sale: sale ?? null,
    isLoading,
    isFetching,
    isFetched,
    error: error as Error | null,
    refetch,
    isFullyPaid,
    hasPartialPayment,
    isPending,
    isCompleted,
    isCancelled,
    outstandingAmount,
  };
}

/**
 * Hook to prefetch a sale for faster navigation
 *
 * @example
 * ```tsx
 * const prefetchSale = usePrefetchSale();
 *
 * // Prefetch on hover
 * <SaleRow
 *   onMouseEnter={() => prefetchSale(sale.id_sale)}
 * />
 * ```
 */
export function usePrefetchSale() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return (saleId: string) => {
    if (!shopId || !saleId) {
      return;
    }

    queryClient.prefetchQuery({
      queryKey: saleKeys.detail(shopId, saleId),
      queryFn: () =>
        fetchSale(shopId, saleId, {
          includeItems: true,
          includePayments: true,
          includeCustomer: true,
          includeUsers: false,
          includeItemDetails: false,
        }),
      staleTime: 60 * 1000,
    });
  };
}

/**
 * Hook to get multiple sales by IDs
 *
 * Useful for displaying sale summaries where you have IDs
 *
 * @example
 * ```tsx
 * const { data: sales, isLoading } = useSalesByIds(['id1', 'id2', 'id3']);
 *
 * // Get sale number by ID
 * const getNumber = (id: string) => sales?.find(s => s.id_sale === id)?.sale_number;
 * ```
 */
export function useSalesByIds(saleIds: string[]) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: ['sales', shopId, 'byIds', saleIds],
    queryFn: async () => {
      if (!shopId || saleIds.length === 0) {
        return [];
      }

      const supabase = createClient();

      // Database fields: invoice_number (not sale_number), status (not sale_status)
      // Note: Using explicit FK hint because there are multiple relationships between sales and customers
      const { data, error } = await supabase
        .from('sales')
        .select(
          `
          id_sale,
          invoice_number,
          sale_date,
          total_amount,
          paid_amount,
          payment_status,
          status,
          customer:customers!fk_sales_customer (
            id_customer,
            full_name
          )
        `
        )
        .eq('id_shop', shopId)
        .in('id_sale', saleIds)
        .is('deleted_at', null);

      if (error) {
        throw new Error(`Failed to fetch sales: ${error.message}`);
      }

      return data ?? [];
    },
    enabled: !!shopId && hasAccess && saleIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to search sales with autocomplete
 *
 * Returns a lightweight list suitable for dropdown/autocomplete
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 * const { data: results, isLoading } = useSaleSearch(search);
 *
 * <Autocomplete
 *   value={search}
 *   onChange={setSearch}
 *   options={results}
 *   loading={isLoading}
 * />
 * ```
 */
export function useSaleSearch(searchTerm: string, limit: number = 10) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: ['sales', shopId, 'search', searchTerm],
    queryFn: async () => {
      if (!shopId || !searchTerm.trim()) {
        return [];
      }

      const supabase = createClient();
      const term = `%${searchTerm.trim()}%`;

      // Database field is invoice_number (not sale_number)
      // Note: Using explicit FK hint because there are multiple relationships between sales and customers
      const { data, error } = await supabase
        .from('sales')
        .select(
          `
          id_sale,
          invoice_number,
          sale_date,
          total_amount,
          payment_status,
          customer:customers!fk_sales_customer (
            id_customer,
            full_name
          )
        `
        )
        .eq('id_shop', shopId)
        .is('deleted_at', null)
        .ilike('invoice_number', term)
        .order('sale_date', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to search sales: ${error.message}`);
      }

      return data ?? [];
    },
    enabled: !!shopId && hasAccess && searchTerm.trim().length >= 2,
    staleTime: 10 * 1000, // 10 seconds
  });
}
