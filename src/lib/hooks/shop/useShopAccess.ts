'use client';

/**
 * useShopAccess Hook
 *
 * Gets the user's access record for a specific shop, including
 * their role and granular permissions.
 *
 * Data flow:
 * 1. Gets shopId from parameter or from useShop() if not provided
 * 2. Looks up the shop_access record from useUser() data
 * 3. Parses the permissions JSONB field
 * 4. Provides helper methods for permission checking
 *
 * @example
 * ```tsx
 * import { useShopAccess } from '@/lib/hooks/shop';
 *
 * function ProtectedButton() {
 *   const { hasPermission, role, isLoading } = useShopAccess();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   // Check specific permission
 *   if (!hasPermission('sales.create')) {
 *     return null;
 *   }
 *
 *   return <Button>Create Sale</Button>;
 * }
 * ```
 *
 * @module lib/hooks/shop/useShopAccess
 */

import { useMemo, useCallback } from 'react';

import type { PermissionKey, RoleName } from '@/lib/constants/permissions';
import { ROLES, ROLE_HIERARCHY, getDefaultPermissions } from '@/lib/constants/permissions';
import { useUser, type ShopAccessRecord, type UserRoleWithShop } from '@/lib/hooks/auth';

import { useShop } from './useShop';

/**
 * @deprecated Use ShopAccessRecord instead
 */
export type ShopAccessWithRelations = ShopAccessRecord;

/**
 * Parsed permissions map
 */
export type PermissionsMap = Record<string, boolean>;

/**
 * Return type for the useShopAccess hook
 */
export interface UseShopAccessReturn {
  /** The raw shop_access record with shop and role relation */
  access: UserRoleWithShop | null;
  /** The user's role name in this shop */
  role: string | null;
  /** The user role record's unique identifier */
  userRoleId: string | null;
  /**
   * @deprecated Use userRoleId instead
   */
  roleId: string | null;
  /** Parsed permissions map from the JSONB field */
  permissions: PermissionsMap;
  /** Whether the user's access is active */
  isActive: boolean;
  /** Whether the user is the shop owner */
  isOwner: boolean;
  /** Whether the user is a manager or higher */
  isManager: boolean;
  /** True while the data is being loaded */
  isLoading: boolean;
  /** Error object if the query failed */
  error: Error | null;
  /** Check if user has a specific permission */
  hasPermission: (permission: PermissionKey | string) => boolean;
  /** Check if user has all of the specified permissions */
  hasAllPermissions: (permissions: (PermissionKey | string)[]) => boolean;
  /** Check if user has any of the specified permissions */
  hasAnyPermission: (permissions: (PermissionKey | string)[]) => boolean;
  /** Check if user's role is at or above a certain level */
  hasRoleLevel: (roleName: string) => boolean;
}

/**
 * Parse permissions from JSONB field
 * Handles both object and string formats
 */
function parsePermissions(permissions: Record<string, boolean> | null): PermissionsMap {
  if (!permissions) {
    return {};
  }

  if (typeof permissions === 'object' && !Array.isArray(permissions)) {
    // Filter out undefined values and convert to boolean map
    const result: PermissionsMap = {};
    for (const [key, value] of Object.entries(permissions)) {
      if (typeof value === 'boolean') {
        result[key] = value;
      }
    }
    return result;
  }

  return {};
}

/**
 * Hook to get the user's access record for a shop
 *
 * Provides the user_role record along with parsed permissions
 * and helper methods for permission checking.
 *
 * @param shopId - Optional shop ID. If not provided, uses current shop from URL
 * @returns Object containing access record, role, permissions, and helper methods
 */
export function useShopAccess(shopId?: string): UseShopAccessReturn {
  const { user, isLoading: userLoading, error: userError } = useUser();
  const { shopId: currentShopId, isLoading: shopLoading } = useShop();

  // Use provided shopId or fall back to current shop
  const effectiveShopId = shopId || currentShopId;

  // Find the shop_access record for this shop
  const access = useMemo(() => {
    if (!user?.shop_access || !effectiveShopId) {
      return null;
    }

    return user.shop_access.find((r) => r.id_shop === effectiveShopId) ?? null;
  }, [user?.shop_access, effectiveShopId]);

  // Parse permissions
  const permissions = useMemo((): PermissionsMap => {
    if (!access) {
      return {} as PermissionsMap;
    }

    // Start with default permissions for the role
    // The role is a relation object with role_name
    const roleName = access.role?.role_name?.toLowerCase() as RoleName | undefined;
    const defaults: PermissionsMap = roleName
      ? (getDefaultPermissions(roleName) as PermissionsMap)
      : {};

    // Override with custom permissions from shop_access if available
    const customPermissions = parsePermissions(access.permissions);

    return { ...defaults, ...customPermissions };
  }, [access]);

  // Role information - role is a relation object with role_name
  const role = access?.role?.role_name ?? null;
  const userRoleId = access?.id_access ?? null;
  const isActive = access?.is_active ?? false;
  const isOwner = role?.toLowerCase() === ROLES.OWNER;
  const isManager = role?.toLowerCase() === ROLES.OWNER || role?.toLowerCase() === ROLES.MANAGER;

  /**
   * Check if user has a specific permission
   * Owners always have all permissions
   */
  const hasPermission = useCallback(
    (permission: PermissionKey | string): boolean => {
      // Owners have all permissions
      if (isOwner) {
        return true;
      }

      // Check if user has access at all
      if (!isActive) {
        return false;
      }

      // Check the permission in the merged map
      return permissions[permission as string] === true;
    },
    [permissions, isOwner, isActive]
  );

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (perms: (PermissionKey | string)[]): boolean => {
      return perms.every((p) => hasPermission(p));
    },
    [hasPermission]
  );

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (perms: (PermissionKey | string)[]): boolean => {
      return perms.some((p) => hasPermission(p));
    },
    [hasPermission]
  );

  /**
   * Check if user's role is at or above a certain level in the hierarchy
   * Lower hierarchy number = higher privileges
   */
  const hasRoleLevel = useCallback(
    (targetRole: string): boolean => {
      if (!role) {
        return false;
      }

      const userLevel = ROLE_HIERARCHY[role.toLowerCase() as keyof typeof ROLE_HIERARCHY];
      const targetLevel = ROLE_HIERARCHY[targetRole.toLowerCase() as keyof typeof ROLE_HIERARCHY];

      if (userLevel === undefined || targetLevel === undefined) {
        return false;
      }

      // Lower number = higher privileges
      return userLevel <= targetLevel;
    },
    [role]
  );

  const isLoading = userLoading || shopLoading;

  return {
    access,
    role,
    userRoleId,
    // Backwards compatibility
    roleId: userRoleId,
    permissions,
    isActive,
    isOwner,
    isManager,
    isLoading,
    error: userError as Error | null,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRoleLevel,
  };
}

/**
 * Lightweight hook that only checks a single permission
 * Useful for simple permission gates
 */
export function useHasPermission(permission: PermissionKey | string): {
  allowed: boolean;
  isLoading: boolean;
} {
  const { hasPermission, isLoading, isActive } = useShopAccess();

  return {
    allowed: isActive && hasPermission(permission),
    isLoading,
  };
}

/**
 * Hook to check if user has a minimum role level
 */
export function useHasRoleLevel(targetRole: string): {
  allowed: boolean;
  isLoading: boolean;
} {
  const { hasRoleLevel, isLoading, isActive } = useShopAccess();

  return {
    allowed: isActive && hasRoleLevel(targetRole),
    isLoading,
  };
}
