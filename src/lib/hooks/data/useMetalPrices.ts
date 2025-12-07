/**
 * useMetalPrices Hook
 *
 * IMPORTANT: This file is currently DISABLED because the metal_prices table
 * does not exist in the database schema. Do not import or use these hooks
 * until the table is created via migration.
 *
 * TanStack Query hooks for metal prices management.
 * Provides data fetching and mutations for the metal_prices table.
 * Supports date range queries for price history and current price lookups.
 *
 * @module lib/hooks/data/useMetalPrices
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { createClient } from '@/lib/supabase/client';

/**
 * Metal price row based on database schema
 */
export interface MetalPrice {
  id_price: string;
  id_shop: string;
  id_metal_type: string;
  id_metal_purity: string | null;
  price_date: string;
  price_per_gram: number;
  buy_price_per_gram: number | null;
  sell_price_per_gram: number | null;
  currency: string;
  source: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

/**
 * Metal price with related metal type and purity info
 */
export interface MetalPriceWithDetails extends MetalPrice {
  metal_type?: {
    id_metal_type: string;
    metal_name: string;
  };
  metal_purity?: {
    id_purity: string;
    purity_name: string;
    purity_percentage: number;
    fineness: number;
  } | null;
}

/**
 * Insert type for metal prices
 */
export interface MetalPriceInsert {
  id_shop: string;
  id_metal_type: string;
  id_metal_purity?: string | null;
  price_date: string;
  price_per_gram: number;
  buy_price_per_gram?: number | null;
  sell_price_per_gram?: number | null;
  currency: string;
  source?: string | null;
  notes?: string | null;
  created_by: string;
}

/**
 * Update type for metal prices (prices are typically immutable, but allow corrections)
 */
export interface MetalPriceUpdate {
  price_per_gram?: number;
  buy_price_per_gram?: number | null;
  sell_price_per_gram?: number | null;
  source?: string | null;
  notes?: string | null;
}

/**
 * Date range filter for price queries
 */
export interface DateRangeFilter {
  startDate: string;
  endDate: string;
}

/**
 * Query key factory for metal prices
 */
export const metalPriceKeys = {
  all: (shopId: string) => ['metal-prices', shopId] as const,
  detail: (shopId: string, priceId: string) => ['metal-prices', shopId, priceId] as const,
  current: (shopId: string) => ['metal-prices', shopId, 'current'] as const,
  byDate: (shopId: string, date: string) => ['metal-prices', shopId, 'date', date] as const,
  byDateRange: (shopId: string, startDate: string, endDate: string) =>
    ['metal-prices', shopId, 'range', startDate, endDate] as const,
  byMetalType: (shopId: string, metalTypeId: string) =>
    ['metal-prices', shopId, 'metal-type', metalTypeId] as const,
  byMetalTypeAndPurity: (shopId: string, metalTypeId: string, purityId: string) =>
    ['metal-prices', shopId, 'metal-type', metalTypeId, 'purity', purityId] as const,
  latest: (shopId: string, metalTypeId: string, purityId?: string) =>
    ['metal-prices', shopId, 'latest', metalTypeId, purityId || 'all'] as const,
};

/**
 * Options for useMetalPrices hook
 */
export interface UseMetalPricesOptions {
  /** Filter by metal type ID */
  metalTypeId?: string | null;
  /** Filter by metal purity ID */
  metalPurityId?: string | null;
  /** Filter by date range */
  dateRange?: DateRangeFilter | null;
  /** Filter by specific date */
  date?: string | null;
  /** Whether to include metal type and purity relations (default: true) */
  includeDetails?: boolean;
  /** Maximum number of records to return */
  limit?: number;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook to fetch metal prices for the current shop
 *
 * @param options - Query options including filters
 * @returns TanStack Query result with metal prices array
 *
 * @example
 * ```tsx
 * // Get all prices
 * const { data: allPrices } = useMetalPrices();
 *
 * // Get prices for a specific metal type
 * const { data: goldPrices } = useMetalPrices({
 *   metalTypeId: goldTypeId,
 * });
 *
 * // Get prices for a date range
 * const { data: monthPrices } = useMetalPrices({
 *   dateRange: {
 *     startDate: '2024-01-01',
 *     endDate: '2024-01-31',
 *   },
 * });
 *
 * // Get prices for today
 * const { data: todayPrices } = useMetalPrices({
 *   date: new Date().toISOString().split('T')[0],
 * });
 * ```
 */
export function useMetalPrices(options: UseMetalPricesOptions = {}) {
  const { shopId, hasAccess } = useShop();
  const {
    metalTypeId,
    metalPurityId,
    dateRange,
    date,
    includeDetails = true,
    limit,
    enabled = true,
  } = options;

  // Determine query key based on filters
  let queryKey: readonly unknown[];
  if (metalTypeId && metalPurityId) {
    queryKey = metalPriceKeys.byMetalTypeAndPurity(shopId || '', metalTypeId, metalPurityId);
  } else if (metalTypeId) {
    queryKey = metalPriceKeys.byMetalType(shopId || '', metalTypeId);
  } else if (dateRange) {
    queryKey = metalPriceKeys.byDateRange(shopId || '', dateRange.startDate, dateRange.endDate);
  } else if (date) {
    queryKey = metalPriceKeys.byDate(shopId || '', date);
  } else {
    queryKey = metalPriceKeys.all(shopId || '');
  }

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!shopId) {
        return [];
      }

      const supabase = createClient();

      const selectClause = includeDetails
        ? '*, metal_type:metal_types!fk_metal_prices_metal_type(id_metal_type, metal_name), metal_purity:metal_purities!fk_metal_prices_metal_purity(id_purity, purity_name, purity_percentage, fineness)'
        : '*';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from('metal_prices').select(selectClause) as any)
        .eq('id_shop', shopId)
        .order('price_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (metalTypeId) {
        query = query.eq('id_metal_type', metalTypeId);
      }

      if (metalPurityId) {
        query = query.eq('id_metal_purity', metalPurityId);
      }

      if (dateRange) {
        query = query.gte('price_date', dateRange.startDate).lte('price_date', dateRange.endDate);
      }

      if (date) {
        query = query.eq('price_date', date);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch metal prices: ${error.message}`);
      }

      return data as (MetalPrice | MetalPriceWithDetails)[];
    },
    enabled: enabled && !!shopId && hasAccess,
    staleTime: 5 * 60 * 1000, // 5 minutes - prices may change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch the current (latest) metal prices for each metal type/purity combination
 *
 * @returns TanStack Query result with current prices
 *
 * @example
 * ```tsx
 * const { data: currentPrices } = useCurrentMetalPrices();
 *
 * // Find the current gold price
 * const goldPrice = currentPrices?.find(p => p.metal_type?.metal_name === 'Gold');
 * ```
 */
export function useCurrentMetalPrices() {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: metalPriceKeys.current(shopId || ''),
    queryFn: async () => {
      if (!shopId) {
        return [];
      }

      const supabase = createClient();

      // Get the latest price for each metal type/purity combination
      // Using a subquery approach to get the most recent price
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('metal_prices')
        .select(
          '*, metal_type:metal_types!fk_metal_prices_metal_type(id_metal_type, metal_name), metal_purity:metal_purities!fk_metal_prices_metal_purity(id_purity, purity_name, purity_percentage, fineness)'
        )
        .eq('id_shop', shopId)
        .lte('price_date', today)
        .order('price_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch current metal prices: ${error.message}`);
      }

      // Group by metal_type + metal_purity and take the most recent
      const latestPrices = new Map<string, MetalPriceWithDetails>();

      for (const price of data as unknown as MetalPriceWithDetails[]) {
        const key = `${price.id_metal_type}-${price.id_metal_purity || 'null'}`;
        if (!latestPrices.has(key)) {
          latestPrices.set(key, price);
        }
      }

      return Array.from(latestPrices.values());
    },
    enabled: !!shopId && hasAccess,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch the latest price for a specific metal type and optional purity
 *
 * @param metalTypeId - The metal type ID
 * @param metalPurityId - Optional metal purity ID
 * @returns TanStack Query result with the latest price
 *
 * @example
 * ```tsx
 * const { data: latestGoldPrice } = useLatestMetalPrice(goldTypeId, gold22kPurityId);
 *
 * if (latestGoldPrice) {
 *   console.log(`Current gold price: ${latestGoldPrice.price_per_gram} per gram`);
 * }
 * ```
 */
export function useLatestMetalPrice(
  metalTypeId: string | null | undefined,
  metalPurityId?: string | null
) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: metalPriceKeys.latest(shopId || '', metalTypeId || '', metalPurityId || undefined),
    queryFn: async () => {
      if (!shopId || !metalTypeId) {
        return null;
      }

      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = supabase
        .from('metal_prices')
        .select(
          '*, metal_type:metal_types!fk_metal_prices_metal_type(id_metal_type, metal_name), metal_purity:metal_purities!fk_metal_prices_metal_purity(id_purity, purity_name, purity_percentage, fineness)'
        )
        .eq('id_shop', shopId)
        .eq('id_metal_type', metalTypeId)
        .lte('price_date', today)
        .order('price_date', { ascending: false })
        .order('created_at', { ascending: false })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .limit(1) as any;

      if (metalPurityId) {
        query = query.eq('id_metal_purity', metalPurityId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch latest metal price: ${error.message}`);
      }

      return data as unknown as MetalPriceWithDetails | null;
    },
    enabled: !!shopId && !!metalTypeId && hasAccess,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single metal price by ID
 *
 * @param priceId - The price ID to fetch
 * @returns TanStack Query result with price data
 */
export function useMetalPrice(priceId: string | null | undefined) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: metalPriceKeys.detail(shopId || '', priceId || ''),
    queryFn: async () => {
      if (!shopId || !priceId) {
        return null;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('metal_prices')
        .select(
          '*, metal_type:metal_types!fk_metal_prices_metal_type(id_metal_type, metal_name), metal_purity:metal_purities!fk_metal_prices_metal_purity(id_purity, purity_name, purity_percentage, fineness)'
        )
        .eq('id_shop', shopId)
        .eq('id_price', priceId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch metal price: ${error.message}`);
      }

      return data as unknown as MetalPriceWithDetails;
    },
    enabled: !!shopId && !!priceId && hasAccess,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to create a new metal price entry
 *
 * @returns TanStack Mutation for creating metal prices
 *
 * @example
 * ```tsx
 * const { mutate: createPrice, isPending } = useCreateMetalPrice();
 *
 * const handleSubmit = (data: MetalPriceInsert) => {
 *   createPrice(data, {
 *     onSuccess: () => toast.success('Price recorded!'),
 *     onError: (error) => toast.error(error.message),
 *   });
 * };
 * ```
 */
export function useCreateMetalPrice() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async (price: Omit<MetalPriceInsert, 'id_shop'>) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('metal_prices')
        .insert({ ...price, id_shop: shopId })
        .select(
          '*, metal_type:metal_types!fk_metal_prices_metal_type(id_metal_type, metal_name), metal_purity:metal_purities!fk_metal_prices_metal_purity(id_purity, purity_name, purity_percentage, fineness)'
        )
        .single();

      if (error) {
        throw new Error(`Failed to create metal price: ${error.message}`);
      }

      return data as unknown as MetalPriceWithDetails;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['metal-prices', shopId] });
      }
    },
  });
}

/**
 * Hook to update an existing metal price (typically for corrections only)
 */
export function useUpdateMetalPrice() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async ({ priceId, updates }: { priceId: string; updates: MetalPriceUpdate }) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('metal_prices')
        .update(updates)
        .eq('id_shop', shopId)
        .eq('id_price', priceId)
        .select(
          '*, metal_type:metal_types!fk_metal_prices_metal_type(id_metal_type, metal_name), metal_purity:metal_purities!fk_metal_prices_metal_purity(id_purity, purity_name, purity_percentage, fineness)'
        )
        .single();

      if (error) {
        throw new Error(`Failed to update metal price: ${error.message}`);
      }

      return data as unknown as MetalPriceWithDetails;
    },
    onSuccess: (data) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['metal-prices', shopId] });
        queryClient.setQueryData(metalPriceKeys.detail(shopId, data.id_price), data);
      }
    },
  });
}

/**
 * Hook to delete a metal price entry
 */
export function useDeleteMetalPrice() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return useMutation({
    mutationFn: async (priceId: string) => {
      if (!shopId) {
        throw new Error('No shop selected');
      }

      const supabase = createClient();

      const { error } = await supabase
        .from('metal_prices')
        .delete()
        .eq('id_shop', shopId)
        .eq('id_price', priceId);

      if (error) {
        throw new Error(`Failed to delete metal price: ${error.message}`);
      }

      return priceId;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['metal-prices', shopId] });
      }
    },
  });
}

/**
 * Utility hook to invalidate metal price caches
 */
export function useInvalidateMetalPrices() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    invalidate: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: ['metal-prices', shopId] });
      }
    },
    invalidateCurrent: () => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: metalPriceKeys.current(shopId),
        });
      }
    },
    invalidateByMetalType: (metalTypeId: string) => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: metalPriceKeys.byMetalType(shopId, metalTypeId),
        });
      }
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['metal-prices'] });
    },
  };
}
