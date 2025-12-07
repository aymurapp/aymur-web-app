'use client';

/**
 * usePermissions Hook
 *
 * Provides role-based access control (RBAC) for components.
 * Fetches the user's shop_access record and merges role defaults
 * with custom permission overrides from the permissions JSONB field.
 *
 * @example
 * ```tsx
 * import { usePermissions } from '@/lib/hooks/permissions';
 *
 * function SalesPage() {
 *   const { can, canAny, canAll, isLoading } = usePermissions();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   if (!can('sales.view')) {
 *     return <AccessDenied />;
 *   }
 *
 *   return (
 *     <div>
 *       {can('sales.create') && <CreateSaleButton />}
 *       {can('sales.refund') && <RefundButton />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @module lib/hooks/permissions/usePermissions
 */

import { useMemo } from 'react';

import {
  type PermissionKey,
  type RoleName,
  ROLES,
  getDefaultPermissions,
} from '@/lib/constants/permissions';
import { useUser } from '@/lib/hooks/auth';
import { useShopStore } from '@/stores/shopStore';

/**
 * Permission overrides from shop_access.permissions JSONB
 * These can override the role defaults for specific permissions
 */
export type PermissionOverrides = Partial<Record<PermissionKey, boolean>>;

/**
 * Resolved permissions map - all permissions with their boolean values
 */
export type ResolvedPermissions = Record<PermissionKey, boolean>;

/**
 * Return type for the usePermissions hook
 */
export interface UsePermissionsReturn {
  /**
   * Check if user has a specific permission
   * @param permission - The permission key to check (e.g., 'sales.create')
   * @returns true if the user has the permission
   */
  can: (permission: PermissionKey | string) => boolean;

  /**
   * Check if user does NOT have a specific permission
   * @param permission - The permission key to check
   * @returns true if the user does NOT have the permission
   */
  cannot: (permission: PermissionKey | string) => boolean;

  /**
   * Check if user has ANY of the specified permissions
   * @param permissions - Array of permission keys
   * @returns true if the user has at least one of the permissions
   */
  canAny: (permissions: (PermissionKey | string)[]) => boolean;

  /**
   * Check if user has ALL of the specified permissions
   * @param permissions - Array of permission keys
   * @returns true if the user has all of the permissions
   */
  canAll: (permissions: (PermissionKey | string)[]) => boolean;

  /**
   * The fully resolved permissions map (role defaults + overrides)
   */
  permissions: ResolvedPermissions;

  /**
   * Custom permission overrides from shop_access.permissions
   */
  overrides: PermissionOverrides;

  /**
   * Whether the permissions are still loading
   */
  isLoading: boolean;

  /**
   * Whether the user has access to the current shop
   */
  hasAccess: boolean;

  /**
   * The current shop ID being used for permission resolution
   */
  shopId: string | null;
}

/**
 * Merges role default permissions with custom overrides
 * Custom overrides take precedence over role defaults
 *
 * @param roleName - The role to get defaults for
 * @param overrides - Custom permission overrides from shop_access
 * @returns Merged permission map
 */
function resolvePermissions(
  roleName: RoleName,
  overrides: PermissionOverrides | null
): ResolvedPermissions {
  // Get the default permissions for this role
  const defaults = getDefaultPermissions(roleName);

  // If no overrides, return defaults
  if (!overrides || Object.keys(overrides).length === 0) {
    return { ...defaults };
  }

  // Merge defaults with overrides (overrides win)
  return {
    ...defaults,
    ...overrides,
  } as ResolvedPermissions;
}

/**
 * Extracts permission overrides from the JSONB field
 * Handles null/undefined and validates the structure
 */
function extractOverrides(permissions: unknown | null): PermissionOverrides {
  if (!permissions || typeof permissions !== 'object') {
    return {};
  }

  // Filter to only include valid boolean values
  const overrides: PermissionOverrides = {};
  for (const [key, value] of Object.entries(permissions as Record<string, unknown>)) {
    if (typeof value === 'boolean') {
      overrides[key as PermissionKey] = value;
    }
  }

  return overrides;
}

/**
 * Creates an empty permissions map (all permissions denied)
 */
function createEmptyPermissions(): ResolvedPermissions {
  // Use STAFF_DEFAULT_PERMISSIONS as base and set all to false
  const staffDefaults = getDefaultPermissions(ROLES.STAFF);
  const empty: Partial<ResolvedPermissions> = {};

  for (const key of Object.keys(staffDefaults) as PermissionKey[]) {
    empty[key] = false;
  }

  return empty as ResolvedPermissions;
}

/**
 * Hook for checking user permissions
 *
 * Retrieves the user's shop_access record for the current or specified shop,
 * gets the role's default permissions, and merges them with any custom
 * permission overrides stored in the shop_access.permissions JSONB field.
 *
 * @param shopId - Optional shop ID override. If not provided, uses the current shop from store.
 * @returns Permission checking utilities and resolved permissions
 */
export function usePermissions(shopId?: string): UsePermissionsReturn {
  // Get user data which includes shop_access with role info
  const { user, isLoading: userLoading } = useUser();

  // Get current shop from store if no shopId provided
  const currentShopId = useShopStore((state) => state.currentShopId);
  const effectiveShopId = shopId ?? currentShopId;

  // Find the shop_access record for the specified shop
  const shopAccess = useMemo(() => {
    if (!user?.shop_access || !effectiveShopId) {
      return null;
    }

    return (
      user.shop_access.find((access) => access.id_shop === effectiveShopId && access.is_active) ??
      null
    );
  }, [user?.shop_access, effectiveShopId]);

  // Extract role name from the shop_access record
  const roleName = useMemo((): RoleName | null => {
    if (!shopAccess?.role?.role_name) {
      return null;
    }

    const name = shopAccess.role.role_name.toLowerCase();

    // Validate it's a known role
    if (
      name === ROLES.OWNER ||
      name === ROLES.MANAGER ||
      name === ROLES.FINANCE ||
      name === ROLES.STAFF
    ) {
      return name as RoleName;
    }

    // Default to staff for unknown roles (most restrictive)
    return ROLES.STAFF;
  }, [shopAccess?.role?.role_name]);

  // Extract permission overrides from shop_access.permissions
  const overrides = useMemo((): PermissionOverrides => {
    if (!shopAccess?.permissions) {
      return {};
    }

    return extractOverrides(shopAccess.permissions);
  }, [shopAccess?.permissions]);

  // Resolve final permissions (role defaults + overrides)
  const permissions = useMemo((): ResolvedPermissions => {
    if (!roleName) {
      return createEmptyPermissions();
    }

    return resolvePermissions(roleName, overrides);
  }, [roleName, overrides]);

  // Permission checking function
  const can = useMemo(() => {
    return (permission: PermissionKey | string): boolean => {
      if (!roleName) {
        return false;
      }

      // Check if permission exists in our resolved map
      const key = permission as PermissionKey;
      if (key in permissions) {
        return permissions[key];
      }

      // Unknown permission - deny by default
      return false;
    };
  }, [roleName, permissions]);

  // Cannot function (inverse of can)
  const cannot = useMemo(() => {
    return (permission: PermissionKey | string): boolean => {
      return !can(permission);
    };
  }, [can]);

  // Check if user has ANY of the specified permissions
  const canAny = useMemo(() => {
    return (requiredPermissions: (PermissionKey | string)[]): boolean => {
      if (!roleName || requiredPermissions.length === 0) {
        return false;
      }
      return requiredPermissions.some((p) => can(p));
    };
  }, [roleName, can]);

  // Check if user has ALL of the specified permissions
  const canAll = useMemo(() => {
    return (requiredPermissions: (PermissionKey | string)[]): boolean => {
      if (!roleName || requiredPermissions.length === 0) {
        return false;
      }
      return requiredPermissions.every((p) => can(p));
    };
  }, [roleName, can]);

  return {
    can,
    cannot,
    canAny,
    canAll,
    permissions,
    overrides,
    isLoading: userLoading,
    hasAccess: !!shopAccess,
    shopId: effectiveShopId,
  };
}

export default usePermissions;
