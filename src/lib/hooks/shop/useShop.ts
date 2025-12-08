'use client';

/**
 * useShop Hook
 *
 * Gets the current shop from URL params and validates user access.
 * This is the primary hook for accessing the current shop context.
 *
 * Data flow:
 * 1. Extracts shopId from URL params via useParams()
 * 2. Syncs shopId with Zustand shopStore
 * 3. Fetches full shop data via TanStack Query
 * 4. Validates user has access via user_roles records from useUser()
 *
 * @example
 * ```tsx
 * import { useShop } from '@/lib/hooks/shop';
 *
 * function ShopDashboard() {
 *   const { shop, shopId, isLoading, error, hasAccess } = useShop();
 *
 *   if (isLoading) return <Spinner />;
 *   if (!hasAccess) return <AccessDenied />;
 *   if (error) return <Error message={error.message} />;
 *   if (!shop) return <NotFound />;
 *
 *   return <div>Welcome to {shop.shop_name}!</div>;
 * }
 * ```
 *
 * @module lib/hooks/shop/useShop
 */

import { useEffect, useMemo } from 'react';

import { useParams } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useUser } from '@/lib/hooks/auth';
import { queryKeys } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/types/database';
import { useShopStore } from '@/stores/shopStore';

/**
 * Shop type from the public.shops table
 */
type Shop = Tables<'shops'>;

/**
 * Extended shop data with owner info
 * Note: subscriptions and plans tables don't exist in the current schema
 */
export interface ShopWithDetails extends Shop {
  owner?: {
    id_user: string;
    full_name: string;
    email: string;
  };
}

/**
 * Return type for the useShop hook
 */
export interface UseShopReturn {
  /** The current shop with full details, null if not found or no access */
  shop: ShopWithDetails | null;
  /** The current shop ID from URL params */
  shopId: string | null;
  /** True while the shop data is being fetched */
  isLoading: boolean;
  /** True if the query has been fetched at least once */
  isFetched: boolean;
  /** Error object if the query failed */
  error: Error | null;
  /** True if the current user has access to this shop */
  hasAccess: boolean;
  /** True if the shop is active (not deleted) */
  isActive: boolean;
  /** The user's role in this shop */
  role: string | null;
}

/**
 * Fetches shop data with related owner info
 */
async function fetchShopDetails(shopId: string): Promise<ShopWithDetails | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('shops')
    .select(
      `
      *,
      owner:users!fk_shops_owner (
        id_user,
        full_name,
        email
      )
    `
    )
    .eq('id_shop', shopId)
    .is('deleted_at', null)
    .single();

  if (error) {
    // PGRST116 = no rows found
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch shop: ${error.message}`);
  }

  // Type assertion for the joined data
  return data as unknown as ShopWithDetails;
}

/**
 * Hook to get the current shop from URL and validate access
 *
 * Provides the current shop context for components within a shop route.
 * Automatically syncs with the Zustand shopStore and validates that
 * the user has access to the requested shop.
 *
 * @returns Object containing shop data, loading state, error, and access info
 */
export function useShop(): UseShopReturn {
  const params = useParams();
  const { user, isLoading: userLoading } = useUser();
  const { setCurrentShop, setShops, currentShopId } = useShopStore();

  // Extract shopId from URL params
  // The URL pattern is expected to be /[locale]/shop/[shopId]/...
  const shopIdFromUrl = params?.shopId as string | undefined;

  // Determine the effective shopId to use
  const effectiveShopId = shopIdFromUrl || currentShopId;

  // Sync shopId with store when URL changes
  useEffect(() => {
    if (shopIdFromUrl && shopIdFromUrl !== currentShopId) {
      setCurrentShop(shopIdFromUrl);
    }
  }, [shopIdFromUrl, currentShopId, setCurrentShop]);

  // Sync shops from user data to store
  useEffect(() => {
    if (user?.shop_access && user.shop_access.length > 0) {
      const shopInfos = user.shop_access
        .filter((access) => access.is_active && access.shop)
        .map((access) => ({
          id: access.shop.id_shop,
          name: access.shop.shop_name,
          slug: access.shop.id_shop, // Using id_shop as slug for now
          logo_url: access.shop.shop_logo,
          is_active: access.is_active,
        }));
      setShops(shopInfos);
    }
  }, [user?.shop_access, setShops]);

  // Check if user has access to the current shop
  const accessInfo = useMemo(() => {
    if (!user?.shop_access || !effectiveShopId) {
      return { hasAccess: false, role: null, isActive: false };
    }

    const shopAccess = user.shop_access.find((a) => a.id_shop === effectiveShopId && a.is_active);

    return {
      hasAccess: !!shopAccess,
      // role is a relation object with role_name
      role: shopAccess?.role?.role_name ?? null,
      isActive: shopAccess?.is_active ?? false,
    };
  }, [user?.shop_access, effectiveShopId]);

  // Query for shop data
  const {
    data: shop,
    isLoading: shopLoading,
    isFetched,
    error,
  } = useQuery({
    queryKey: queryKeys.shop(effectiveShopId || ''),
    queryFn: async () => {
      if (!effectiveShopId) {
        return null;
      }
      return fetchShopDetails(effectiveShopId);
    },
    enabled: !!effectiveShopId && accessInfo.hasAccess,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });

  // Combined loading state
  const isLoading = userLoading || (!!effectiveShopId && accessInfo.hasAccess && shopLoading);

  return {
    shop: shop ?? null,
    shopId: effectiveShopId ?? null,
    isLoading,
    isFetched,
    error: error as Error | null,
    hasAccess: accessInfo.hasAccess,
    isActive: accessInfo.isActive,
    role: accessInfo.role,
  };
}

/**
 * Utility to invalidate shop cache
 * Call this after shop settings updates
 */
export function useInvalidateShop() {
  const queryClient = useQueryClient();

  return {
    invalidate: (shopId: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.shop(shopId) }),
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: ['shops'] }),
  };
}
