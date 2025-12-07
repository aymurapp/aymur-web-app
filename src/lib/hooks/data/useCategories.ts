/**
 * useCategories Hook
 *
 * TanStack Query hooks for product categories management.
 * Provides data fetching and mutations for the product_categories table.
 *
 * @module lib/hooks/data/useCategories
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { createClient } from '@/lib/supabase/client';

/**
 * Product category row type based on database schema
 */
export interface ProductCategory {
  id_category: string;
  id_shop: string;
  category_name: string;
  description: string | null;
  sort_order: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Insert type for product categories
 */
export interface ProductCategoryInsert {
  id_shop: string;
  category_name: string;
  description?: string | null;
  sort_order?: number | null;
  created_by: string;
}

/**
 * Update type for product categories
 */
export interface ProductCategoryUpdate {
  category_name?: string;
  description?: string | null;
  sort_order?: number | null;
}

/**
 * Query key factory for categories
 */
export const categoryKeys = {
  all: (shopId: string) => ['categories', shopId] as const,
  detail: (shopId: string, categoryId: string) => ['categories', shopId, categoryId] as const,
  active: (shopId: string) => ['categories', shopId, 'active'] as const,
};

/**
 * Options for useCategories hook
 */
export interface UseCategoriesOptions {
  /** Whether to include soft-deleted categories (default: false) */
  includeDeleted?: boolean;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook to fetch all product categories for the current shop
 *
 * @param options - Query options
 * @returns TanStack Query result with categories array
 *
 * @example
 * ```tsx
 * const { data: categories, isLoading } = useCategories();
 *
 * if (isLoading) return <Spinner />;
 *
 * return (
 *   <select>
 *     {categories?.map((cat) => (
 *       <option key={cat.id_category} value={cat.id_category}>
 *         {cat.category_name}
 *       </option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export function useCategories(options: UseCategoriesOptions = {}) {
  const { shopId, hasAccess } = useShop();
  const { includeDeleted = false, enabled = true } = options;

  return useQuery({
    queryKey: includeDeleted ? categoryKeys.all(shopId || '') : categoryKeys.active(shopId || ''),
    queryFn: async () => {
      if (!shopId) {
        return [];
      }

      const supabase = createClient();

      let query = supabase
        .from('product_categories')
        .select('*')
        .eq('id_shop', shopId)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('category_name', { ascending: true });

      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch categories: ${error.message}`);
      }

      return data as ProductCategory[];
    },
    enabled: enabled && !!shopId && hasAccess,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch a single category by ID
 *
 * @param categoryId - The category ID to fetch
 * @returns TanStack Query result with category data
 */
export function useCategory(categoryId: string | null | undefined) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: categoryKeys.detail(shopId || '', categoryId || ''),
    queryFn: async () => {
      if (!shopId || !categoryId) {
        return null;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('id_shop', shopId)
        .eq('id_category', categoryId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch category: ${error.message}`);
      }

      return data as ProductCategory;
    },
    enabled: !!shopId && !!categoryId && hasAccess,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to create a new product category
 *
 * @returns TanStack Mutation for creating categories
 *
 * @example
 * ```tsx
 * const { mutate: createCategory, isPending } = useCreateCategory();
 *
 * const handleSubmit = (data: ProductCategoryInsert) => {
 *   createCategory(data, {
 *     onSuccess: () => toast.success('Category created!'),
 *     onError: (error) => toast.error(error.message),
 *   });
 * };
 * ```
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async (category: Omit<ProductCategoryInsert, 'id_shop'>) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('product_categories')
        .insert({ ...category, id_shop: shopId })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create category: ${error.message}`);
      }

      return data as ProductCategory;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['categories', shopId] });
      }
    },
  });
}

/**
 * Hook to update an existing product category
 *
 * @returns TanStack Mutation for updating categories
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async ({
      categoryId,
      updates,
    }: {
      categoryId: string;
      updates: ProductCategoryUpdate;
    }) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('product_categories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id_shop', shopId)
        .eq('id_category', categoryId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update category: ${error.message}`);
      }

      return data as ProductCategory;
    },
    onSuccess: (data) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['categories', shopId] });
        queryClient.setQueryData(categoryKeys.detail(shopId, data.id_category), data);
      }
    },
  });
}

/**
 * Hook to soft-delete a product category
 *
 * @returns TanStack Mutation for deleting categories
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      const { error } = await supabase
        .from('product_categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id_shop', shopId)
        .eq('id_category', categoryId);

      if (error) {
        throw new Error(`Failed to delete category: ${error.message}`);
      }

      return categoryId;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['categories', shopId] });
      }
    },
  });
}

/**
 * Utility hook to invalidate category caches
 */
export function useInvalidateCategories() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    invalidate: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['categories', shopId] });
      }
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  };
}
