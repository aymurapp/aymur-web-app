/**
 * useSaleItems Hook
 *
 * TanStack Query hooks for managing sale line items.
 * Includes queries for fetching items and mutations for
 * creating, updating, and returning items.
 *
 * @module lib/hooks/data/useSaleItems
 */

'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { invalidateScope } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';
import type { Database, Tables } from '@/lib/types/database';

import { saleKeys } from './useSales';

/**
 * Sale item row type from the public.sale_items table
 */
export type SaleItem = Tables<'sale_items'>;

/**
 * Sale item insert type
 */
export type SaleItemInsert = Database['public']['Tables']['sale_items']['Insert'];

/**
 * Sale item update type
 */
export type SaleItemUpdate = Database['public']['Tables']['sale_items']['Update'];

/**
 * Sale item with inventory item details
 */
export interface SaleItemWithInventory extends SaleItem {
  inventory_item?: {
    id_item: string;
    item_name: string;
    sku: string | null;
    barcode: string | null;
    status: string;
    weight_grams: number;
    purchase_price: number;
    metal_type?: {
      id_metal_type: string;
      metal_name: string;
    } | null;
    metal_purity?: {
      id_purity: string;
      purity_name: string;
      purity_percentage: number;
    } | null;
    category?: {
      id_category: string;
      category_name: string;
    } | null;
  } | null;
}

/**
 * Options for useSaleItems hook
 */
export interface UseSaleItemsOptions {
  /** Sale ID to fetch items for */
  saleId: string | null | undefined;
  /** Include inventory item details */
  includeInventoryDetails?: boolean;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for useSaleItems hook
 */
export interface UseSaleItemsReturn {
  /** Array of sale items */
  items: SaleItemWithInventory[];
  /** Total count of items */
  totalCount: number;
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
  /** Sum of all item prices */
  totalAmount: number;
  /** Sum of all item weights */
  totalWeight: number;
  /** Count of returned items */
  returnedCount: number;
}

/**
 * Query key factory for sale items
 */
export const saleItemKeys = {
  all: (shopId: string, saleId: string) => [...saleKeys.items(shopId, saleId)] as const,
  list: (shopId: string, saleId: string, filters: Record<string, unknown>) =>
    [...saleItemKeys.all(shopId, saleId), filters] as const,
  detail: (shopId: string, saleId: string, itemId: string) =>
    [...saleItemKeys.all(shopId, saleId), itemId] as const,
};

/**
 * Fetches sale items with optional inventory details
 */
async function fetchSaleItems(
  shopId: string,
  saleId: string,
  options: {
    includeInventoryDetails: boolean;
  }
): Promise<SaleItemWithInventory[]> {
  const supabase = createClient();

  // Build select query based on options
  let selectQuery = '*';

  if (options.includeInventoryDetails) {
    // Note: Using explicit FK hints because there may be multiple relationships
    selectQuery = `
      *,
      inventory_item:inventory_items!fk_sale_items_item (
        id_item,
        item_name,
        sku,
        barcode,
        status,
        weight_grams,
        purchase_price,
        metal_type:metal_types!fk_inventory_items_metal_type (
          id_metal_type,
          metal_name
        ),
        metal_purity:metal_purities!fk_inventory_items_metal_purity (
          id_purity,
          purity_name,
          purity_percentage
        ),
        category:product_categories!fk_inventory_items_category (
          id_category,
          category_name
        )
      )
    `;
  }

  const query = supabase
    .from('sale_items')
    .select(selectQuery)
    .eq('id_sale', saleId)
    .eq('id_shop', shopId)
    .order('created_at', { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch sale items: ${error.message}`);
  }

  return (data ?? []) as unknown as SaleItemWithInventory[];
}

/**
 * Hook to fetch sale items for a specific sale.
 *
 * Features:
 * - Automatic shop scoping via useShop
 * - Optional inventory item details
 * - Status filtering (sold/returned)
 * - Computed totals (amount, weight)
 *
 * @param options - Query options
 * @returns Sale items with metadata
 *
 * @example
 * ```tsx
 * function SaleItemsList({ saleId }: { saleId: string }) {
 *   const {
 *     items,
 *     totalCount,
 *     totalAmount,
 *     totalWeight,
 *     returnedCount,
 *     isLoading,
 *     error
 *   } = useSaleItems({
 *     saleId,
 *     includeInventoryDetails: true
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       <div>
 *         <span>Total Items: {totalCount}</span>
 *         <span>Total Amount: {formatCurrency(totalAmount)}</span>
 *         <span>Total Weight: {totalWeight.toFixed(2)}g</span>
 *         {returnedCount > 0 && (
 *           <span>Returned: {returnedCount}</span>
 *         )}
 *       </div>
 *
 *       <table>
 *         {items.map(item => (
 *           <tr key={item.id_sale_item}>
 *             <td>{item.item_name}</td>
 *             <td>{item.metal_type}</td>
 *             <td>{item.weight_grams}g</td>
 *             <td>{formatCurrency(item.total_price)}</td>
 *             <td>{item.status}</td>
 *           </tr>
 *         ))}
 *       </table>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSaleItems(options: UseSaleItemsOptions): UseSaleItemsReturn {
  const { saleId, includeInventoryDetails = false, enabled = true } = options;

  const { shopId, hasAccess } = useShop();

  const queryResult = useQuery({
    queryKey: saleItemKeys.list(shopId ?? '', saleId ?? '', {
      includeInventoryDetails,
    }),
    queryFn: () =>
      fetchSaleItems(shopId!, saleId!, {
        includeInventoryDetails,
      }),
    enabled: !!shopId && !!saleId && hasAccess && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  const items = data ?? [];

  // Compute totals
  const totalCount = items.length;
  const totalAmount = items.reduce((sum, item) => sum + Number(item.line_total), 0);
  // Weight comes from the inventory_item relation
  const totalWeight = items.reduce(
    (sum, item) => sum + Number(item.inventory_item?.weight_grams ?? 0),
    0
  );
  // Note: sale_items table doesn't have status field, return tracking would need a separate table
  const returnedCount = 0;

  return {
    items,
    totalCount,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    totalAmount,
    totalWeight,
    returnedCount,
  };
}

/**
 * Hook to add an item to an existing sale
 *
 * Note: This should be used for adding items to pending/draft sales.
 * The database handles inventory status updates.
 *
 * @example
 * ```tsx
 * const addItem = useAddSaleItem();
 *
 * const handleAddItem = async () => {
 *   try {
 *     await addItem.mutateAsync({
 *       saleId,
 *       item: {
 *         id_item: inventoryItemId,
 *         item_name: 'Gold Ring',
 *         weight_grams: 5.5,
 *         unit_price: 500,
 *         quantity: 1,
 *         total_price: 500,
 *       }
 *     });
 *     toast.success('Item added!');
 *   } catch (error) {
 *     toast.error('Failed to add item');
 *   }
 * };
 * ```
 */
export function useAddSaleItem() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      item,
    }: {
      saleId: string;
      item: Omit<SaleItemInsert, 'id_shop' | 'id_sale'>;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('sale_items')
        .insert({
          ...item,
          id_shop: shopId,
          id_sale: saleId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add sale item: ${error.message}`);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        // Invalidate sale items
        queryClient.invalidateQueries({
          queryKey: saleKeys.items(shopId, variables.saleId),
        });
        // Invalidate the sale itself (totals may change)
        queryClient.invalidateQueries({
          queryKey: saleKeys.detail(shopId, variables.saleId),
        });
        // Invalidate inventory as item status changes
        queryClient.invalidateQueries({ queryKey: invalidateScope.inventory(shopId) });
      }
    },
  });
}

/**
 * Hook to update a sale item
 *
 * @example
 * ```tsx
 * const updateItem = useUpdateSaleItem();
 *
 * const handleUpdate = async () => {
 *   try {
 *     await updateItem.mutateAsync({
 *       saleId,
 *       itemId: item.id_sale_item,
 *       data: { unit_price: 550, total_price: 550 }
 *     });
 *     toast.success('Item updated!');
 *   } catch (error) {
 *     toast.error('Failed to update item');
 *   }
 * };
 * ```
 */
export function useUpdateSaleItem() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      itemId,
      data,
    }: {
      saleId: string;
      itemId: string;
      data: SaleItemUpdate;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: item, error } = await supabase
        .from('sale_items')
        .update(data)
        .eq('id_sale_item', itemId)
        .eq('id_sale', saleId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update sale item: ${error.message}`);
      }

      return item;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: saleKeys.items(shopId, variables.saleId),
        });
        queryClient.invalidateQueries({
          queryKey: saleKeys.detail(shopId, variables.saleId),
        });
      }
    },
  });
}

/**
 * Hook to return/refund a sale item
 *
 * Note: The sale_items table doesn't have return tracking fields.
 * Returns are handled by deleting the sale item and restoring inventory.
 * For proper return tracking, a separate returns table should be used.
 *
 * @example
 * ```tsx
 * const returnItem = useReturnSaleItem();
 *
 * const handleReturn = async () => {
 *   try {
 *     await returnItem.mutateAsync({
 *       saleId,
 *       itemId: item.id_sale_item,
 *       reason: 'Customer changed mind'
 *     });
 *     toast.success('Item returned!');
 *   } catch (error) {
 *     toast.error('Failed to return item');
 *   }
 * };
 * ```
 */
export function useReturnSaleItem() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    // Note: reason parameter preserved for future return tracking functionality
    mutationFn: async (params: { saleId: string; itemId: string; reason?: string }) => {
      const { saleId, itemId } = params;
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Since sale_items table doesn't have status/return fields,
      // we delete the item to return it. A proper implementation would
      // use a separate returns table to track return history.
      const { error } = await supabase
        .from('sale_items')
        .delete()
        .eq('id_sale_item', itemId)
        .eq('id_sale', saleId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to return sale item: ${error.message}`);
      }

      return { itemId, saleId };
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        // Invalidate sale items
        queryClient.invalidateQueries({
          queryKey: saleKeys.items(shopId, variables.saleId),
        });
        // Invalidate the sale itself (status/totals may change)
        queryClient.invalidateQueries({
          queryKey: saleKeys.detail(shopId, variables.saleId),
        });
        // Invalidate sales list
        queryClient.invalidateQueries({ queryKey: invalidateScope.sales(shopId) });
        // Invalidate inventory as item status changes
        queryClient.invalidateQueries({ queryKey: invalidateScope.inventory(shopId) });
        // Invalidate customer queries as balances may change
        queryClient.invalidateQueries({ queryKey: invalidateScope.customers(shopId) });
      }
    },
  });
}

/**
 * Hook to remove an item from a pending sale
 *
 * Note: This should only be used for pending/draft sales where items
 * haven't been finalized. For completed sales, use useReturnSaleItem.
 *
 * @example
 * ```tsx
 * const removeItem = useRemoveSaleItem();
 *
 * const handleRemove = async () => {
 *   try {
 *     await removeItem.mutateAsync({
 *       saleId,
 *       itemId: item.id_sale_item
 *     });
 *     toast.success('Item removed!');
 *   } catch (error) {
 *     toast.error('Failed to remove item');
 *   }
 * };
 * ```
 */
export function useRemoveSaleItem() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, itemId }: { saleId: string; itemId: string }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { error } = await supabase
        .from('sale_items')
        .delete()
        .eq('id_sale_item', itemId)
        .eq('id_sale', saleId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to remove sale item: ${error.message}`);
      }

      return { itemId };
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: saleKeys.items(shopId, variables.saleId),
        });
        queryClient.invalidateQueries({
          queryKey: saleKeys.detail(shopId, variables.saleId),
        });
        queryClient.invalidateQueries({ queryKey: invalidateScope.inventory(shopId) });
      }
    },
  });
}

/**
 * Utility to invalidate sale items caches
 */
export function useInvalidateSaleItems() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all items for a specific sale */
    invalidateForSale: (saleId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: saleKeys.items(shopId, saleId),
        });
      }
      return undefined;
    },
  };
}
