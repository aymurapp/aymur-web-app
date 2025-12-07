'use client';

/**
 * useShops Hook
 *
 * Gets all shops the current user has access to.
 * Used primarily by the shop switcher component.
 *
 * Data flow:
 * 1. Gets user data from useUser() which includes user_roles
 * 2. Transforms user_roles into a list of ShopWithRole objects
 * 3. Provides helper selectors for active/inactive shops
 *
 * @example
 * ```tsx
 * import { useShops } from '@/lib/hooks/shop';
 *
 * function ShopSwitcher() {
 *   const { shops, isLoading, activeShops } = useShops();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <Select>
 *       {activeShops.map((shop) => (
 *         <Option key={shop.id_shop} value={shop.id_shop}>
 *           {shop.shop_name} ({shop.role})
 *         </Option>
 *       ))}
 *     </Select>
 *   );
 * }
 * ```
 *
 * @module lib/hooks/shop/useShops
 */

import { useMemo } from 'react';

import { useUser } from '@/lib/hooks/auth';
import { useShopStore } from '@/stores/shopStore';

/**
 * Shop with user's role information
 */
export interface ShopWithRole {
  /** The unique shop identifier */
  id_shop: string;
  /** Display name of the shop */
  shop_name: string;
  /** URL to the shop logo, if set */
  shop_logo: string | null;
  /** The user's role in this shop (owner, staff) */
  role: string;
  /** The shop access record's unique identifier */
  id_access: string;
  /** Whether the user's access to this shop is active */
  is_active: boolean;
  /** Shop's default currency */
  currency: string;
  /** Shop's timezone */
  timezone: string;
}

/**
 * Return type for the useShops hook
 */
export interface UseShopsReturn {
  /** All shops the user has access to (active and inactive) */
  shops: ShopWithRole[];
  /** Only shops with active access */
  activeShops: ShopWithRole[];
  /** True while the user data is being fetched */
  isLoading: boolean;
  /** True if the query has been fetched at least once */
  isFetched: boolean;
  /** Error object if the query failed */
  error: Error | null;
  /** True if user has access to multiple shops */
  hasMultipleShops: boolean;
  /** Total count of accessible shops */
  shopCount: number;
  /** Function to manually refetch shops data */
  refetch: () => Promise<void>;
}

/**
 * Hook to get all shops the user has access to
 *
 * Provides a list of shops with role information for each.
 * This is derived from the user's user_roles records fetched by useUser().
 *
 * @returns Object containing shops array, loading state, and error
 */
export function useShops(): UseShopsReturn {
  const { user, isLoading, isFetched, error, refetch: refetchUser } = useUser();

  // Transform shop_access into ShopWithRole array
  const { shops, activeShops } = useMemo(() => {
    if (!user?.shop_access) {
      return { shops: [], activeShops: [] };
    }

    const allShops: ShopWithRole[] = user.shop_access
      .filter((access) => access.shop && access.role)
      .map((access) => ({
        id_shop: access.shop.id_shop,
        shop_name: access.shop.shop_name,
        shop_logo: access.shop.shop_logo,
        // role is a relation object with role_name
        role: access.role?.role_name ?? 'unknown',
        id_access: access.id_access,
        is_active: access.is_active,
        currency: access.shop.currency,
        timezone: access.shop.timezone,
      }));

    const active = allShops.filter((shop) => shop.is_active);

    return { shops: allShops, activeShops: active };
  }, [user?.shop_access]);

  const refetch = async (): Promise<void> => {
    await refetchUser();
  };

  return {
    shops,
    activeShops,
    isLoading,
    isFetched,
    error: error as Error | null,
    hasMultipleShops: activeShops.length > 1,
    shopCount: activeShops.length,
    refetch,
  };
}

/**
 * Selector hook: Get the current shop from the shops list
 * Returns the shop that matches the current shopId in the store
 */
export function useCurrentShopFromList(): ShopWithRole | null {
  const { activeShops } = useShops();
  const currentShopId = useShopStore((state) => state.currentShopId);

  return useMemo(() => {
    if (!currentShopId) {
      return null;
    }
    return activeShops.find((shop) => shop.id_shop === currentShopId) ?? null;
  }, [activeShops, currentShopId]);
}

/**
 * Selector hook: Get shops where user has a specific role
 */
export function useShopsByRole(roleName: string): ShopWithRole[] {
  const { activeShops } = useShops();

  return useMemo(() => {
    return activeShops.filter((shop) => shop.role.toLowerCase() === roleName.toLowerCase());
  }, [activeShops, roleName]);
}

/**
 * Selector hook: Check if user is owner of any shop
 */
export function useIsOwnerOfAnyShop(): boolean {
  const ownerShops = useShopsByRole('owner');
  return ownerShops.length > 0;
}
