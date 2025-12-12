'use client';

/**
 * useUser Hook
 *
 * Fetches the current authenticated user's data from the public.users table.
 * Includes associated shop_access data with role information.
 *
 * This hook:
 * - Uses TanStack Query for data fetching and caching
 * - Only fetches when there's an active session
 * - Joins shop_access with shops and roles for complete context
 * - Auto-refetches when session changes
 *
 * @example
 * ```tsx
 * import { useUser } from '@/lib/hooks/auth';
 *
 * function ProfilePage() {
 *   const { user, isLoading, error } = useUser();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (!user) return <LoginPrompt />;
 *
 *   return <div>Welcome, {user.full_name}!</div>;
 * }
 * ```
 *
 * @module lib/hooks/auth/useUser
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/types/database';

/**
 * User type from the public.users table
 */
type User = Tables<'users'>;

/**
 * Shop type from the public.shops table
 */
type Shop = Tables<'shops'>;

/**
 * Shop access record with role information
 * Maps to the shop_access table joined with roles and shops
 */
export interface ShopAccessRecord {
  id_access: string;
  id_shop: string;
  id_user: string;
  id_role: string;
  permissions: Record<string, boolean> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** The role name from the joined roles table */
  role: {
    id_role: string;
    role_name: string;
  } | null;
  /** The shop data from the joined shops table */
  shop: Pick<Shop, 'id_shop' | 'shop_name' | 'shop_logo' | 'currency' | 'timezone'>;
}

/**
 * Extended shop access including related shop and role data
 * @deprecated Use ShopAccessRecord instead
 */
export type UserRoleWithShop = ShopAccessRecord;

/**
 * @deprecated Use UserRoleWithShop instead. Kept for backwards compatibility.
 */
export type ShopAccessWithRelations = UserRoleWithShop;

/**
 * User with shop access information
 */
export interface UserWithAccess extends User {
  /** Shop access records providing access to shops */
  shop_access: ShopAccessRecord[];
}

/**
 * Return type for the useUser hook
 */
export interface UseUserReturn {
  /** The authenticated user with shop access data, null if not authenticated */
  user: UserWithAccess | null;
  /** True while the user data is being fetched */
  isLoading: boolean;
  /** True if the query has been fetched at least once */
  isFetched: boolean;
  /** Error object if the query failed */
  error: Error | null;
  /** Function to manually refetch user data */
  refetch: () => Promise<void>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Storage bucket name for avatars
 */
const AVATARS_BUCKET = 'avatars';

/**
 * Signed URL expiration time in seconds (1 hour)
 */
const SIGNED_URL_EXPIRATION = 60 * 60; // 1 hour

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generates a signed URL for an avatar path using client-side Supabase
 * Returns null if path is empty or generation fails
 */
async function generateSignedAvatarUrl(
  supabase: ReturnType<typeof createClient>,
  avatarPath: string | null
): Promise<string | null> {
  if (!avatarPath) {
    return null;
  }

  // Skip if already a full URL (signed URL from server)
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }

  try {
    const { data, error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .createSignedUrl(avatarPath, SIGNED_URL_EXPIRATION);

    if (error) {
      console.warn('[generateSignedAvatarUrl] Failed to create signed URL:', error.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.warn('[generateSignedAvatarUrl] Unexpected error:', err);
    return null;
  }
}

/**
 * Fetches user data with shop access from Supabase
 */
async function fetchUserWithAccess(authUserId: string): Promise<UserWithAccess | null> {
  const supabase = createClient();

  // First, get the user from public.users table using auth_id
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authUserId)
    .is('deleted_at', null)
    .single();

  if (userError) {
    // PGRST116 = no rows found - user hasn't been created in public.users yet
    if (userError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch user: ${userError.message}`);
  }

  if (!userData) {
    return null;
  }

  // Now fetch shop_access with related shop and role data
  const { data: accessData, error: accessError } = await supabase
    .from('shop_access')
    .select(
      `
      id_access,
      id_shop,
      id_user,
      id_role,
      permissions,
      is_active,
      created_at,
      updated_at,
      role:roles!fk_shop_access_role (
        id_role,
        role_name
      ),
      shop:shops!fk_shop_access_shop (
        id_shop,
        shop_name,
        shop_logo,
        currency,
        timezone
      )
    `
    )
    .eq('id_user', userData.id_user)
    .eq('is_active', true);

  if (accessError) {
    throw new Error(`Failed to fetch shop access: ${accessError.message}`);
  }

  // Type assertion for the joined data
  const shopAccess = (accessData || []) as unknown as ShopAccessRecord[];

  // Generate signed URL for avatar (stored as path in database)
  const signedAvatarUrl = await generateSignedAvatarUrl(supabase, userData.avatar_url);

  return {
    ...userData,
    avatar_url: signedAvatarUrl,
    shop_access: shopAccess,
  };
}

/**
 * Hook to get the current authenticated user's data
 *
 * Fetches user data from the public.users table along with
 * their shop_access records (including shop and role information).
 *
 * The query is only enabled when there's an active auth session.
 * Uses the session's user.id to match against users.auth_id.
 *
 * @returns Object containing user data, loading state, error, and refetch function
 */
export function useUser(): UseUserReturn {
  const supabase = createClient();

  const {
    data: user,
    isLoading,
    isFetched,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: queryKeys.user,
    queryFn: async () => {
      // Get the current session to extract auth user ID
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }

      if (!session?.user) {
        return null;
      }

      return fetchUserWithAccess(session.user.id);
    },
    // Keep user data fresh but don't refetch too aggressively
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    // Retry once on failure (might be a transient network issue)
    retry: 1,
  });

  const refetch = async (): Promise<void> => {
    await queryRefetch();
  };

  return {
    user: user ?? null,
    isLoading,
    isFetched,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Utility to invalidate user cache
 * Call this after user profile updates
 */
export function useInvalidateUser(): { invalidate: () => Promise<void> } {
  const queryClient = useQueryClient();

  return {
    invalidate: () => queryClient.invalidateQueries({ queryKey: queryKeys.user }),
  };
}
