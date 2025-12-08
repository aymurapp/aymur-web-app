/**
 * useMetals Hook
 *
 * TanStack Query hooks for metal types and metal purities management.
 * Provides data fetching and mutations for metal_types and metal_purities tables.
 *
 * @module lib/hooks/data/useMetals
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { createClient } from '@/lib/supabase/client';

// ============================================
// Metal Types
// ============================================

/**
 * Metal type row based on database schema
 */
export interface MetalType {
  id_metal_type: string;
  id_shop: string;
  metal_name: string;
  description: string | null;
  sort_order: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Insert type for metal types
 */
export interface MetalTypeInsert {
  id_shop: string;
  metal_name: string;
  description?: string | null;
  sort_order?: number | null;
  created_by: string;
}

/**
 * Update type for metal types
 */
export interface MetalTypeUpdate {
  metal_name?: string;
  description?: string | null;
  sort_order?: number | null;
}

// ============================================
// Metal Purities
// ============================================

/**
 * Metal purity row based on database schema
 */
export interface MetalPurity {
  id_purity: string;
  id_shop: string;
  id_metal_type: string;
  purity_name: string;
  purity_percentage: number;
  fineness: number;
  sort_order: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Metal purity with related metal type info
 */
export interface MetalPurityWithType extends MetalPurity {
  metal_type?: MetalType;
}

/**
 * Insert type for metal purities
 */
export interface MetalPurityInsert {
  id_shop: string;
  id_metal_type: string;
  purity_name: string;
  purity_percentage: number;
  fineness: number;
  sort_order?: number | null;
  created_by: string;
}

/**
 * Update type for metal purities
 */
export interface MetalPurityUpdate {
  id_metal_type?: string;
  purity_name?: string;
  purity_percentage?: number;
  fineness?: number;
  sort_order?: number | null;
}

/**
 * Query key factory for metals
 */
export const metalKeys = {
  // Metal types
  types: (shopId: string) => ['metal-types', shopId] as const,
  typeDetail: (shopId: string, typeId: string) => ['metal-types', shopId, typeId] as const,
  typesActive: (shopId: string) => ['metal-types', shopId, 'active'] as const,

  // Metal purities
  purities: (shopId: string) => ['metal-purities', shopId] as const,
  purityDetail: (shopId: string, purityId: string) => ['metal-purities', shopId, purityId] as const,
  puritiesActive: (shopId: string) => ['metal-purities', shopId, 'active'] as const,
  puritiesByType: (shopId: string, typeId: string) =>
    ['metal-purities', shopId, 'by-type', typeId] as const,
};

/**
 * Options for useMetalTypes hook
 */
export interface UseMetalTypesOptions {
  /** Whether to include soft-deleted metal types (default: false) */
  includeDeleted?: boolean;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook to fetch all metal types for the current shop
 *
 * @param options - Query options
 * @returns TanStack Query result with metal types array
 *
 * @example
 * ```tsx
 * const { data: metalTypes, isLoading } = useMetalTypes();
 *
 * return (
 *   <select>
 *     {metalTypes?.map((type) => (
 *       <option key={type.id_metal_type} value={type.id_metal_type}>
 *         {type.metal_name}
 *       </option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export function useMetalTypes(options: UseMetalTypesOptions = {}) {
  const { shopId, hasAccess } = useShop();
  const { includeDeleted = false, enabled = true } = options;

  return useQuery({
    queryKey: includeDeleted ? metalKeys.types(shopId || '') : metalKeys.typesActive(shopId || ''),
    queryFn: async () => {
      if (!shopId) {
        return [];
      }

      const supabase = createClient();

      // Fetch shop-specific metal types
      let query = supabase
        .from('metal_types')
        .select('*')
        .eq('id_shop', shopId)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('metal_name', { ascending: true });

      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch metal types: ${error.message}`);
      }

      return data as MetalType[];
    },
    enabled: enabled && !!shopId && hasAccess,
    staleTime: 10 * 60 * 1000, // 10 minutes - metal types change rarely
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to fetch a single metal type by ID
 *
 * @param typeId - The metal type ID to fetch
 * @returns TanStack Query result with metal type data
 */
export function useMetalType(typeId: string | null | undefined) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: metalKeys.typeDetail(shopId || '', typeId || ''),
    queryFn: async () => {
      if (!shopId || !typeId) {
        return null;
      }

      const supabase = createClient();

      // Fetch shop-specific metal type
      const { data, error } = await supabase
        .from('metal_types')
        .select('*')
        .eq('id_metal_type', typeId)
        .eq('id_shop', shopId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch metal type: ${error.message}`);
      }

      return data as MetalType;
    },
    enabled: !!shopId && !!typeId && hasAccess,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook to create a new metal type
 */
export function useCreateMetalType() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async (metalType: Omit<MetalTypeInsert, 'id_shop' | 'created_by'>) => {
      if (!shopId) {
        throw new Error('No shop selected');
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

      const { data, error } = await supabase
        .from('metal_types')
        .insert({ ...metalType, id_shop: shopId, created_by: publicUser.id_user })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create metal type: ${error.message}`);
      }

      return data as MetalType;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['metal-types', shopId] });
      }
    },
  });
}

/**
 * Hook to update an existing metal type
 */
export function useUpdateMetalType() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async ({ typeId, updates }: { typeId: string; updates: MetalTypeUpdate }) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('metal_types')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id_shop', shopId)
        .eq('id_metal_type', typeId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update metal type: ${error.message}`);
      }

      return data as MetalType;
    },
    onSuccess: (data) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['metal-types', shopId] });
        queryClient.setQueryData(metalKeys.typeDetail(shopId, data.id_metal_type), data);
      }
    },
  });
}

/**
 * Hook to delete a metal type (soft delete)
 */
export function useDeleteMetalType() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async (typeId: string) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('metal_types')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id_shop', shopId)
        .eq('id_metal_type', typeId);

      if (error) {
        throw new Error(`Failed to delete metal type: ${error.message}`);
      }

      return typeId;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['metal-types', shopId] });
      }
    },
  });
}

// ============================================
// Metal Purities Hooks
// ============================================

/**
 * Options for useMetalPurities hook
 */
export interface UseMetalPuritiesOptions {
  /** Filter by metal type ID */
  metalTypeId?: string | null;
  /** Whether to include soft-deleted purities (default: false) */
  includeDeleted?: boolean;
  /** Whether to include metal type relation (default: false) */
  includeMetalType?: boolean;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook to fetch all metal purities for the current shop
 *
 * @param options - Query options including optional metal type filter
 * @returns TanStack Query result with metal purities array
 *
 * @example
 * ```tsx
 * // Get all purities
 * const { data: allPurities } = useMetalPurities();
 *
 * // Get purities for a specific metal type (e.g., Gold)
 * const { data: goldPurities } = useMetalPurities({
 *   metalTypeId: selectedMetalTypeId,
 * });
 * ```
 */
export function useMetalPurities(options: UseMetalPuritiesOptions = {}) {
  const { shopId, hasAccess } = useShop();
  const { metalTypeId, includeDeleted = false, includeMetalType = false, enabled = true } = options;

  const queryKey = metalTypeId
    ? metalKeys.puritiesByType(shopId || '', metalTypeId)
    : includeDeleted
      ? metalKeys.purities(shopId || '')
      : metalKeys.puritiesActive(shopId || '');

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!shopId) {
        return [];
      }

      const supabase = createClient();

      const selectClause = includeMetalType
        ? '*, metal_type:metal_types!fk_metal_purities_metal_type(*)'
        : '*';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = supabase.from('metal_purities').select(selectClause) as any;

      // Filter by shop
      query = query.eq('id_shop', shopId);

      // Filter soft-deleted
      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      query = query
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('purity_name', { ascending: true });

      if (metalTypeId) {
        query = query.eq('id_metal_type', metalTypeId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch metal purities: ${error.message}`);
      }

      return data as unknown as (MetalPurity | MetalPurityWithType)[];
    },
    enabled: enabled && !!shopId && hasAccess,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to fetch a single metal purity by ID
 *
 * @param purityId - The metal purity ID to fetch
 * @returns TanStack Query result with metal purity data
 */
export function useMetalPurity(purityId: string | null | undefined) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: metalKeys.purityDetail(shopId || '', purityId || ''),
    queryFn: async () => {
      if (!shopId || !purityId) {
        return null;
      }

      const supabase = createClient();

      // Fetch shop-specific metal purity
      const { data, error } = await supabase
        .from('metal_purities')
        .select('*, metal_type:metal_types!fk_metal_purities_metal_type(*)')
        .eq('id_purity', purityId)
        .eq('id_shop', shopId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch metal purity: ${error.message}`);
      }

      return data as unknown as MetalPurityWithType;
    },
    enabled: !!shopId && !!purityId && hasAccess,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Hook to create a new metal purity
 */
export function useCreateMetalPurity() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async (purity: Omit<MetalPurityInsert, 'id_shop' | 'created_by'>) => {
      if (!shopId) {
        throw new Error('No shop selected');
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

      const { data, error } = await supabase
        .from('metal_purities')
        .insert({ ...purity, id_shop: shopId, created_by: publicUser.id_user })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create metal purity: ${error.message}`);
      }

      return data as MetalPurity;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['metal-purities', shopId] });
      }
    },
  });
}

/**
 * Hook to update an existing metal purity
 */
export function useUpdateMetalPurity() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async ({ purityId, updates }: { purityId: string; updates: MetalPurityUpdate }) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('metal_purities')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id_shop', shopId)
        .eq('id_purity', purityId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update metal purity: ${error.message}`);
      }

      return data as MetalPurity;
    },
    onSuccess: (data) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['metal-purities', shopId] });
        queryClient.setQueryData(metalKeys.purityDetail(shopId, data.id_purity), data);
      }
    },
  });
}

/**
 * Hook to delete a metal purity (soft delete)
 */
export function useDeleteMetalPurity() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async (purityId: string) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('metal_purities')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id_shop', shopId)
        .eq('id_purity', purityId);

      if (error) {
        throw new Error(`Failed to delete metal purity: ${error.message}`);
      }

      return purityId;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['metal-purities', shopId] });
      }
    },
  });
}

/**
 * Utility hook to invalidate metal caches
 */
export function useInvalidateMetals() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    invalidateTypes: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['metal-types', shopId] });
      }
    },
    invalidatePurities: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['metal-purities', shopId] });
      }
    },
    invalidateAll: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['metal-types', shopId] });
        queryClient.invalidateQueries({ queryKey: ['metal-purities', shopId] });
      }
    },
  };
}
