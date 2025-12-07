/**
 * Authentication Hooks
 *
 * Provides hooks for user session management, auth state, and auth actions.
 * All hooks are client-side only and use TanStack Query for state management.
 *
 * @example
 * ```tsx
 * import { useUser, useSession, useAuth } from '@/lib/hooks/auth';
 *
 * function App() {
 *   const { user, isLoading: userLoading } = useUser();
 *   const { isAuthenticated, session } = useSession();
 *   const { signIn, signOut, isLoading: authLoading } = useAuth();
 *
 *   // Use the hooks...
 * }
 * ```
 *
 * @module lib/hooks/auth
 */

// User data hook
export { useUser, useInvalidateUser } from './useUser';
export type {
  UseUserReturn,
  UserWithAccess,
  UserRoleWithShop,
  ShopAccessRecord,
  /** @deprecated Use UserRoleWithShop instead */
  ShopAccessWithRelations,
} from './useUser';

// Session management hook
export { useSession, useIsAuthenticated } from './useSession';
export type { UseSessionReturn, AuthEvent, AuthStateChangeCallback } from './useSession';

// Auth actions hook
export { useAuth } from './useAuth';
export type { UseAuthReturn, AuthActionResult, SignUpOptions } from './useAuth';
