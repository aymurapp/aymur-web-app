/**
 * Shop Management Hooks
 *
 * Provides hooks for shop context, switching, and access control.
 * All hooks are client-side only and use TanStack Query for state management.
 *
 * @example
 * ```tsx
 * import { useShop, useShops, useShopAccess } from '@/lib/hooks/shop';
 *
 * function ShopPage() {
 *   const { shop, shopId, isLoading: shopLoading, hasAccess } = useShop();
 *   const { shops, activeShops, hasMultipleShops } = useShops();
 *   const { role, hasPermission, isOwner } = useShopAccess();
 *
 *   // Use the hooks...
 * }
 * ```
 *
 * @module lib/hooks/shop
 */

// Current shop hook - gets shop from URL params
export { useShop, useInvalidateShop } from './useShop';
export type { UseShopReturn, ShopWithDetails } from './useShop';

// All shops hook - gets all shops user has access to
export { useShops, useCurrentShopFromList, useShopsByRole, useIsOwnerOfAnyShop } from './useShops';
export type { UseShopsReturn, ShopWithRole } from './useShops';

// Shop access hook - gets user's access record and permissions
export { useShopAccess, useHasPermission, useHasRoleLevel } from './useShopAccess';
export type { UseShopAccessReturn, PermissionsMap } from './useShopAccess';
// Note: ShopAccessWithRelations is exported from @/lib/hooks/auth to avoid duplicate exports
