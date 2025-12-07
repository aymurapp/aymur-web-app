/**
 * useStones Hook
 *
 * TanStack Query hooks for stone types management.
 * Provides data fetching and mutations for the stone_types table.
 *
 * @module lib/hooks/data/useStones
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { createClient } from '@/lib/supabase/client';

/**
 * Stone type row based on database schema
 */
export interface StoneType {
  id_stone_type: string;
  id_shop: string;
  stone_name: string;
  category: string;
  mohs_hardness: number | null;
  description: string | null;
  sort_order: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Insert type for stone types
 */
export interface StoneTypeInsert {
  id_shop: string;
  stone_name: string;
  category: string;
  mohs_hardness?: number | null;
  description?: string | null;
  sort_order?: number | null;
  created_by: string;
}

/**
 * Update type for stone types
 */
export interface StoneTypeUpdate {
  stone_name?: string;
  category?: string;
  mohs_hardness?: number | null;
  description?: string | null;
  sort_order?: number | null;
}

/**
 * Stone categories (precious, semi-precious, synthetic, etc.)
 */
export type StoneCategory = 'precious' | 'semi-precious' | 'synthetic' | 'other';

/**
 * Query key factory for stones
 */
export const stoneKeys = {
  all: (shopId: string) => ['stone-types', shopId] as const,
  detail: (shopId: string, stoneId: string) => ['stone-types', shopId, stoneId] as const,
  active: (shopId: string) => ['stone-types', shopId, 'active'] as const,
  byCategory: (shopId: string, category: string) =>
    ['stone-types', shopId, 'category', category] as const,
};

/**
 * Options for useStoneTypes hook
 */
export interface UseStoneTypesOptions {
  /** Filter by stone category (precious, semi-precious, etc.) */
  category?: string | null;
  /** Whether to include soft-deleted types (default: false) */
  includeDeleted?: boolean;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook to fetch all stone types for the current shop
 *
 * @param options - Query options
 * @returns TanStack Query result with stone types array
 *
 * @example
 * ```tsx
 * const { data: stoneTypes, isLoading } = useStoneTypes();
 *
 * // Filter by category
 * const { data: preciousStones } = useStoneTypes({
 *   category: 'precious',
 * });
 *
 * return (
 *   <select>
 *     {stoneTypes?.map((stone) => (
 *       <option key={stone.id_stone_type} value={stone.id_stone_type}>
 *         {stone.stone_name} ({stone.category})
 *       </option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export function useStoneTypes(options: UseStoneTypesOptions = {}) {
  const { shopId, hasAccess } = useShop();
  const { category, includeDeleted = false, enabled = true } = options;

  const queryKey = category
    ? stoneKeys.byCategory(shopId || '', category)
    : includeDeleted
      ? stoneKeys.all(shopId || '')
      : stoneKeys.active(shopId || '');

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!shopId) {
        return [];
      }

      const supabase = createClient();

      let query = supabase
        .from('stone_types')
        .select('*')
        .eq('id_shop', shopId)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('stone_name', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch stone types: ${error.message}`);
      }

      return data as StoneType[];
    },
    enabled: enabled && !!shopId && hasAccess,
    staleTime: 10 * 60 * 1000, // 10 minutes - stone types change rarely
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to fetch a single stone type by ID
 *
 * @param stoneId - The stone type ID to fetch
 * @returns TanStack Query result with stone type data
 */
export function useStoneType(stoneId: string | null | undefined) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: stoneKeys.detail(shopId || '', stoneId || ''),
    queryFn: async () => {
      if (!shopId || !stoneId) {
        return null;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('stone_types')
        .select('*')
        .eq('id_shop', shopId)
        .eq('id_stone_type', stoneId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch stone type: ${error.message}`);
      }

      return data as StoneType;
    },
    enabled: !!shopId && !!stoneId && hasAccess,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook to get unique stone categories for the current shop
 *
 * @returns TanStack Query result with unique categories
 */
export function useStoneCategories() {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: ['stone-categories', shopId],
    queryFn: async () => {
      if (!shopId) {
        return [];
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('stone_types')
        .select('category')
        .eq('id_shop', shopId)
        .is('deleted_at', null);

      if (error) {
        throw new Error(`Failed to fetch stone categories: ${error.message}`);
      }

      // Extract unique categories
      const uniqueCategories = [...new Set(data.map((d) => d.category))].sort();
      return uniqueCategories;
    },
    enabled: !!shopId && hasAccess,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook to create a new stone type
 *
 * @returns TanStack Mutation for creating stone types
 *
 * @example
 * ```tsx
 * const { mutate: createStone, isPending } = useCreateStoneType();
 *
 * const handleSubmit = (data: StoneTypeInsert) => {
 *   createStone(data, {
 *     onSuccess: () => toast.success('Stone type created!'),
 *     onError: (error) => toast.error(error.message),
 *   });
 * };
 * ```
 */
export function useCreateStoneType() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async (stone: Omit<StoneTypeInsert, 'id_shop'>) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('stone_types')
        .insert({ ...stone, id_shop: shopId })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create stone type: ${error.message}`);
      }

      return data as StoneType;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['stone-types', shopId] });
        queryClient.invalidateQueries({ queryKey: ['stone-categories', shopId] });
      }
    },
  });
}

/**
 * Hook to update an existing stone type
 */
export function useUpdateStoneType() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async ({ stoneId, updates }: { stoneId: string; updates: StoneTypeUpdate }) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('stone_types')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id_shop', shopId)
        .eq('id_stone_type', stoneId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update stone type: ${error.message}`);
      }

      return data as StoneType;
    },
    onSuccess: (data) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['stone-types', shopId] });
        queryClient.invalidateQueries({ queryKey: ['stone-categories', shopId] });
        queryClient.setQueryData(stoneKeys.detail(shopId, data.id_stone_type), data);
      }
    },
  });
}

/**
 * Hook to soft-delete a stone type
 */
export function useDeleteStoneType() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async (stoneId: string) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      const { error } = await supabase
        .from('stone_types')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id_shop', shopId)
        .eq('id_stone_type', stoneId);

      if (error) {
        throw new Error(`Failed to delete stone type: ${error.message}`);
      }

      return stoneId;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['stone-types', shopId] });
        queryClient.invalidateQueries({ queryKey: ['stone-categories', shopId] });
      }
    },
  });
}

/**
 * Utility hook to invalidate stone caches
 */
export function useInvalidateStones() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    invalidate: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['stone-types', shopId] });
        queryClient.invalidateQueries({ queryKey: ['stone-categories', shopId] });
      }
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['stone-types'] });
      queryClient.invalidateQueries({ queryKey: ['stone-categories'] });
    },
  };
}
