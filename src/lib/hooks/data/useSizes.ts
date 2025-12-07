/**
 * useSizes Hook
 *
 * TanStack Query hooks for product sizes management.
 * Provides data fetching and mutations for the product_sizes table.
 * Sizes are typically associated with product categories (e.g., ring sizes, bracelet sizes).
 *
 * @module lib/hooks/data/useSizes
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { createClient } from '@/lib/supabase/client';

/**
 * Product size row based on database schema
 */
export interface ProductSize {
  id_size: string;
  id_shop: string;
  id_category: string;
  size_name: string;
  size_value: string | null;
  size_system: string | null;
  sort_order: number | null;
  created_by: string;
  created_at: string;
}

/**
 * Product size with related category info
 */
export interface ProductSizeWithCategory extends ProductSize {
  category?: {
    id_category: string;
    category_name: string;
  };
}

/**
 * Insert type for product sizes
 */
export interface ProductSizeInsert {
  id_shop: string;
  id_category: string;
  size_name: string;
  size_value?: string | null;
  size_system?: string | null;
  sort_order?: number | null;
  created_by: string;
}

/**
 * Update type for product sizes
 */
export interface ProductSizeUpdate {
  id_category?: string;
  size_name?: string;
  size_value?: string | null;
  size_system?: string | null;
  sort_order?: number | null;
}

/**
 * Common size systems
 */
export type SizeSystem = 'general' | 'US' | 'UK' | 'EU' | 'metric' | 'inches';

/**
 * Query key factory for sizes
 */
export const sizeKeys = {
  all: (shopId: string) => ['product-sizes', shopId] as const,
  detail: (shopId: string, sizeId: string) => ['product-sizes', shopId, sizeId] as const,
  byCategory: (shopId: string, categoryId: string) =>
    ['product-sizes', shopId, 'category', categoryId] as const,
  bySystem: (shopId: string, system: string) =>
    ['product-sizes', shopId, 'system', system] as const,
};

/**
 * Options for useSizes hook
 */
export interface UseSizesOptions {
  /** Filter by category ID */
  categoryId?: string | null;
  /** Filter by size system (US, UK, EU, etc.) */
  sizeSystem?: string | null;
  /** Whether to include category relation (default: false) */
  includeCategory?: boolean;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook to fetch product sizes for the current shop
 *
 * @param options - Query options including optional category filter
 * @returns TanStack Query result with sizes array
 *
 * @example
 * ```tsx
 * // Get all sizes
 * const { data: allSizes } = useSizes();
 *
 * // Get sizes for a specific category (e.g., Rings)
 * const { data: ringSizes } = useSizes({
 *   categoryId: ringCategoryId,
 * });
 *
 * // Get sizes with category info
 * const { data: sizesWithCategories } = useSizes({
 *   includeCategory: true,
 * });
 *
 * return (
 *   <select>
 *     {ringSizes?.map((size) => (
 *       <option key={size.id_size} value={size.id_size}>
 *         {size.size_name} {size.size_value && `(${size.size_value})`}
 *       </option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export function useSizes(options: UseSizesOptions = {}) {
  const { shopId, hasAccess } = useShop();
  const { categoryId, sizeSystem, includeCategory = false, enabled = true } = options;

  // Determine query key based on filters
  let queryKey: readonly unknown[];
  if (categoryId) {
    queryKey = sizeKeys.byCategory(shopId || '', categoryId);
  } else if (sizeSystem) {
    queryKey = sizeKeys.bySystem(shopId || '', sizeSystem);
  } else {
    queryKey = sizeKeys.all(shopId || '');
  }

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!shopId) {
        return [];
      }

      const supabase = createClient();

      const selectClause = includeCategory
        ? '*, category:product_categories!fk_product_sizes_category(id_category, category_name)'
        : '*';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = supabase.from('product_sizes').select(selectClause) as any;

      query = query
        .eq('id_shop', shopId)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('size_name', { ascending: true });

      if (categoryId) {
        query = query.eq('id_category', categoryId);
      }

      if (sizeSystem) {
        query = query.eq('size_system', sizeSystem);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch sizes: ${error.message}`);
      }

      return data as unknown as (ProductSize | ProductSizeWithCategory)[];
    },
    enabled: enabled && !!shopId && hasAccess,
    staleTime: 10 * 60 * 1000, // 10 minutes - sizes change rarely
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to fetch a single size by ID
 *
 * @param sizeId - The size ID to fetch
 * @returns TanStack Query result with size data
 */
export function useSize(sizeId: string | null | undefined) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: sizeKeys.detail(shopId || '', sizeId || ''),
    queryFn: async () => {
      if (!shopId || !sizeId) {
        return null;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('product_sizes')
        .select(
          '*, category:product_categories!fk_product_sizes_category(id_category, category_name)'
        )
        .eq('id_shop', shopId)
        .eq('id_size', sizeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch size: ${error.message}`);
      }

      return data as unknown as ProductSizeWithCategory;
    },
    enabled: !!shopId && !!sizeId && hasAccess,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook to get unique size systems for the current shop
 *
 * @returns TanStack Query result with unique size systems
 */
export function useSizeSystems() {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: ['size-systems', shopId],
    queryFn: async () => {
      if (!shopId) {
        return [];
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('product_sizes')
        .select('size_system')
        .eq('id_shop', shopId)
        .not('size_system', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch size systems: ${error.message}`);
      }

      // Extract unique systems
      const uniqueSystems = [...new Set(data.map((d) => d.size_system))]
        .filter((s): s is string => s !== null)
        .sort();

      return uniqueSystems;
    },
    enabled: !!shopId && hasAccess,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook to create a new product size
 *
 * @returns TanStack Mutation for creating sizes
 *
 * @example
 * ```tsx
 * const { mutate: createSize, isPending } = useCreateSize();
 *
 * const handleSubmit = (data: ProductSizeInsert) => {
 *   createSize(data, {
 *     onSuccess: () => toast.success('Size created!'),
 *     onError: (error) => toast.error(error.message),
 *   });
 * };
 * ```
 */
export function useCreateSize() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async (size: Omit<ProductSizeInsert, 'id_shop'>) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('product_sizes')
        .insert({ ...size, id_shop: shopId })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create size: ${error.message}`);
      }

      return data as ProductSize;
    },
    onSuccess: (data) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['product-sizes', shopId] });
        queryClient.invalidateQueries({ queryKey: ['size-systems', shopId] });
        // Also invalidate category-specific queries
        queryClient.invalidateQueries({
          queryKey: sizeKeys.byCategory(shopId, data.id_category),
        });
      }
    },
  });
}

/**
 * Hook to update an existing product size
 */
export function useUpdateSize() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async ({ sizeId, updates }: { sizeId: string; updates: ProductSizeUpdate }) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('product_sizes')
        .update(updates)
        .eq('id_shop', shopId)
        .eq('id_size', sizeId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update size: ${error.message}`);
      }

      return data as ProductSize;
    },
    onSuccess: (data) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['product-sizes', shopId] });
        queryClient.invalidateQueries({ queryKey: ['size-systems', shopId] });
        queryClient.setQueryData(sizeKeys.detail(shopId, data.id_size), data);
      }
    },
  });
}

/**
 * Hook to delete a product size (hard delete - sizes don't have soft delete)
 */
export function useDeleteSize() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async (sizeId: string) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      const { error } = await supabase
        .from('product_sizes')
        .delete()
        .eq('id_shop', shopId)
        .eq('id_size', sizeId);

      if (error) {
        throw new Error(`Failed to delete size: ${error.message}`);
      }

      return sizeId;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['product-sizes', shopId] });
        queryClient.invalidateQueries({ queryKey: ['size-systems', shopId] });
      }
    },
  });
}

/**
 * Utility hook to invalidate size caches
 */
export function useInvalidateSizes() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    invalidate: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['product-sizes', shopId] });
        queryClient.invalidateQueries({ queryKey: ['size-systems', shopId] });
      }
    },
    invalidateByCategory: (categoryId: string) => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: sizeKeys.byCategory(shopId, categoryId),
        });
      }
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['product-sizes'] });
      queryClient.invalidateQueries({ queryKey: ['size-systems'] });
    },
  };
}
