/**
 * Permission Hooks
 * Role-based access control and permission checking
 *
 * @module lib/hooks/permissions
 *
 * @example
 * ```tsx
 * import { usePermissions, useRole } from '@/lib/hooks/permissions';
 *
 * function ProtectedComponent() {
 *   const { can, canAny, isLoading: permissionsLoading } = usePermissions();
 *   const { isOwner, isAtLeast, isLoading: roleLoading } = useRole();
 *
 *   if (permissionsLoading || roleLoading) return <Spinner />;
 *
 *   // Check specific permissions
 *   if (!can('sales.view')) {
 *     return <AccessDenied />;
 *   }
 *
 *   // Check role hierarchy
 *   if (!isAtLeast('manager')) {
 *     return <UpgradePrompt />;
 *   }
 *
 *   return <ProtectedContent />;
 * }
 * ```
 */

// Permission checking hook
export { usePermissions } from './usePermissions';
export type {
  UsePermissionsReturn,
  PermissionOverrides,
  ResolvedPermissions,
} from './usePermissions';

// Role checking hook
export { useRole } from './useRole';
export type { UseRoleReturn } from './useRole';

// Re-export permission constants for convenience
export {
  PERMISSION_KEYS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLES,
  ROLE_HIERARCHY,
  getDefaultPermissions,
  type PermissionKey,
  type RoleName,
} from '@/lib/constants/permissions';
