'use client';

/**
 * useRole Hook
 *
 * Provides role-based access control utilities for the current user.
 * Returns the user's role for the current shop with helper methods
 * for role checking and hierarchy comparisons.
 *
 * @example
 * ```tsx
 * import { useRole } from '@/lib/hooks/permissions';
 *
 * function AdminPanel() {
 *   const { role, isOwner, isAtLeast, isLoading } = useRole();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   // Only owners can see this
 *   if (!isOwner) {
 *     return <AccessDenied />;
 *   }
 *
 *   // Managers and above can see this
 *   if (!isAtLeast('manager')) {
 *     return <UpgradePrompt />;
 *   }
 *
 *   return <AdminDashboard />;
 * }
 * ```
 *
 * @module lib/hooks/permissions/useRole
 */

import { useMemo } from 'react';

import { type RoleName, ROLES, ROLE_HIERARCHY } from '@/lib/constants/permissions';
import { useUser } from '@/lib/hooks/auth';
import { useShopStore } from '@/stores/shopStore';

/**
 * Return type for the useRole hook
 */
export interface UseRoleReturn {
  /**
   * The user's role for the current shop
   * Returns null if user has no access or role is unknown
   */
  role: RoleName | null;

  /**
   * Whether the user is an owner
   */
  isOwner: boolean;

  /**
   * Whether the user is a manager
   */
  isManager: boolean;

  /**
   * Whether the user is in finance role
   */
  isFinance: boolean;

  /**
   * Whether the user is staff
   */
  isStaff: boolean;

  /**
   * Check if the user has a specific role
   * @param roleName - The role to check for
   * @returns true if user has this exact role
   */
  hasRole: (roleName: RoleName | string) => boolean;

  /**
   * Check if the user's role is at least the specified level
   * Uses the role hierarchy: owner > manager > finance > staff
   *
   * @param roleName - The minimum role required
   * @returns true if user's role is at or above the specified level
   *
   * @example
   * // If user is manager:
   * isAtLeast('staff')    // true - manager > staff
   * isAtLeast('manager')  // true - manager == manager
   * isAtLeast('owner')    // false - manager < owner
   */
  isAtLeast: (roleName: RoleName | string) => boolean;

  /**
   * Whether the role data is still loading
   */
  isLoading: boolean;

  /**
   * Whether the user has access to the current shop
   */
  hasAccess: boolean;

  /**
   * The current shop ID being used for role resolution
   */
  shopId: string | null;

  /**
   * The role's hierarchy level (lower = more privileged)
   * null if no role
   */
  hierarchyLevel: number | null;
}

/**
 * Gets the hierarchy level for a role
 * Lower numbers = higher privileges
 *
 * @param role - The role name
 * @returns The hierarchy level, or Infinity for unknown roles
 */
function getRoleLevel(role: RoleName | string | null): number {
  if (!role) {
    return Infinity;
  }

  const normalizedRole = role.toLowerCase() as RoleName;

  if (normalizedRole in ROLE_HIERARCHY) {
    return ROLE_HIERARCHY[normalizedRole];
  }

  // Unknown roles get lowest priority
  return Infinity;
}

/**
 * Hook for role-based access control
 *
 * Retrieves the user's role for the current or specified shop
 * and provides utilities for role checking and hierarchy comparisons.
 *
 * Role hierarchy (from highest to lowest privileges):
 * 1. owner - Full access, can manage all settings
 * 2. manager - Operational access, limited settings
 * 3. finance - Financial operations, limited operational access
 * 4. staff - Basic operations only
 *
 * @param shopId - Optional shop ID override. If not provided, uses the current shop from store.
 * @returns Role information and checking utilities
 */
export function useRole(shopId?: string): UseRoleReturn {
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
  const role = useMemo((): RoleName | null => {
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

    // Return null for unknown roles
    return null;
  }, [shopAccess?.role?.role_name]);

  // Compute role hierarchy level
  const hierarchyLevel = useMemo((): number | null => {
    if (!role) {
      return null;
    }
    return ROLE_HIERARCHY[role];
  }, [role]);

  // Role boolean flags
  const isOwner = role === ROLES.OWNER;
  const isManager = role === ROLES.MANAGER;
  const isFinance = role === ROLES.FINANCE;
  const isStaff = role === ROLES.STAFF;

  // Check if user has a specific role
  const hasRole = useMemo(() => {
    return (roleName: RoleName | string): boolean => {
      if (!role) {
        return false;
      }
      return role === roleName.toLowerCase();
    };
  }, [role]);

  // Check if user's role is at least the specified level
  const isAtLeast = useMemo(() => {
    return (roleName: RoleName | string): boolean => {
      if (!role) {
        return false;
      }

      const userLevel = getRoleLevel(role);
      const requiredLevel = getRoleLevel(roleName);

      // Lower level = higher privileges
      return userLevel <= requiredLevel;
    };
  }, [role]);

  return {
    role,
    isOwner,
    isManager,
    isFinance,
    isStaff,
    hasRole,
    isAtLeast,
    isLoading: userLoading,
    hasAccess: !!shopAccess,
    shopId: effectiveShopId,
    hierarchyLevel,
  };
}

export default useRole;
