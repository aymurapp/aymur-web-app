/**
 * useTeam Hook
 *
 * TanStack Query hooks for team management operations.
 * Handles team members (shop_access), roles, and staff invitations.
 *
 * @module lib/hooks/data/useTeam
 */

'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { queryKeys } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate, Json } from '@/lib/types/database';

// ============================================
// Base Types from Database
// ============================================

/**
 * Shop access record type from public.shop_access table
 */
export type ShopAccess = Tables<'shop_access'>;

/**
 * Shop access insert type
 */
export type ShopAccessInsert = TablesInsert<'shop_access'>;

/**
 * Shop access update type
 */
export type ShopAccessUpdate = TablesUpdate<'shop_access'>;

/**
 * Role type from public.roles table
 */
export type Role = Tables<'roles'>;

/**
 * User type from public.users table
 */
export type User = Tables<'users'>;

/**
 * Staff invitation type from public.staff_invitations table
 */
export type StaffInvitation = Tables<'staff_invitations'>;

/**
 * Staff invitation insert type
 */
export type StaffInvitationInsert = TablesInsert<'staff_invitations'>;

// ============================================
// Composite Types
// ============================================

/**
 * Team member with joined user and role data
 */
export interface TeamMember extends ShopAccess {
  user: Pick<User, 'id_user' | 'email' | 'full_name' | 'phone'> | null;
  role: Pick<Role, 'id_role' | 'role_name' | 'description'> | null;
}

/**
 * Simplified team member type for display
 */
export interface TeamMemberDisplay {
  id_access: string;
  id_user: string;
  email: string;
  full_name: string;
  phone: string | null;
  role_name: string;
  role_description: string | null;
  permissions: Json | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Pending invitation with role info
 */
export interface PendingInvitation extends StaffInvitation {
  role: Pick<Role, 'id_role' | 'role_name' | 'description'> | null;
  inviter: Pick<User, 'id_user' | 'full_name' | 'email'> | null;
}

// ============================================
// Query Keys
// ============================================

/**
 * Query key factory for team-related queries
 */
export const teamKeys = {
  /** All team queries */
  all: ['team'] as const,
  /** Team members for a shop */
  members: (shopId: string) => ['team', 'members', shopId] as const,
  /** Single team member */
  member: (shopId: string, accessId: string) => ['team', 'members', shopId, accessId] as const,
  /** All roles (global) */
  roles: () => ['team', 'roles'] as const,
  /** Single role */
  role: (roleId: string) => ['team', 'roles', roleId] as const,
  /** Pending invitations for a shop */
  invitations: (shopId: string) => ['team', 'invitations', shopId] as const,
  /** Single invitation */
  invitation: (shopId: string, invitationId: string) =>
    ['team', 'invitations', shopId, invitationId] as const,
};

// ============================================
// Options Types
// ============================================

/**
 * Options for useTeamMembers hook
 */
export interface UseTeamMembersOptions {
  /** Include inactive members */
  includeInactive?: boolean;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Options for usePendingInvitations hook
 */
export interface UsePendingInvitationsOptions {
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Options for useRoles hook
 */
export interface UseRolesOptions {
  /** Whether to enable the query */
  enabled?: boolean;
}

// ============================================
// Return Types
// ============================================

/**
 * Return type for useTeamMembers hook
 */
export interface UseTeamMembersReturn {
  /** Array of team members with user and role data */
  members: TeamMemberDisplay[];
  /** Total count of team members */
  totalCount: number;
  /** True while loading */
  isLoading: boolean;
  /** True if loading for first time */
  isInitialLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Return type for useRoles hook
 */
export interface UseRolesReturn {
  /** Array of available roles */
  roles: Role[];
  /** True while loading */
  isLoading: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Return type for usePendingInvitations hook
 */
export interface UsePendingInvitationsReturn {
  /** Array of pending invitations */
  invitations: PendingInvitation[];
  /** Total count of pending invitations */
  totalCount: number;
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

// ============================================
// Data Fetching Functions
// ============================================

/**
 * Fetches team members with user and role data
 */
async function fetchTeamMembers(
  shopId: string,
  options: UseTeamMembersOptions
): Promise<{ members: TeamMemberDisplay[]; totalCount: number }> {
  const { includeInactive = false } = options;

  const supabase = createClient();

  // First, get shop access records
  let query = supabase.from('shop_access').select('*', { count: 'exact' }).eq('id_shop', shopId);

  // Filter inactive if not requested
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  // Order by creation date
  query = query.order('created_at', { ascending: true });

  const { data: accessRecords, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch team members: ${error.message}`);
  }

  if (!accessRecords || accessRecords.length === 0) {
    return { members: [], totalCount: 0 };
  }

  // Get unique user and role IDs
  const userIds = [...new Set(accessRecords.map((r) => r.id_user))];
  const roleIds = [...new Set(accessRecords.map((r) => r.id_role))];

  // Fetch users
  const { data: users } = await supabase
    .from('users')
    .select('id_user, email, full_name, phone')
    .in('id_user', userIds);

  // Fetch roles
  const { data: roles } = await supabase
    .from('roles')
    .select('id_role, role_name, description')
    .in('id_role', roleIds);

  // Create lookup maps
  const userMap = new Map(users?.map((u) => [u.id_user, u]) ?? []);
  const roleMap = new Map(roles?.map((r) => [r.id_role, r]) ?? []);

  // Transform to display format
  const members: TeamMemberDisplay[] = accessRecords.map((item) => {
    const user = userMap.get(item.id_user);
    const role = roleMap.get(item.id_role);
    return {
      id_access: item.id_access,
      id_user: item.id_user,
      email: user?.email ?? '',
      full_name: user?.full_name ?? '',
      phone: user?.phone ?? null,
      role_name: role?.role_name ?? 'Unknown',
      role_description: role?.description ?? null,
      permissions: item.permissions,
      is_active: item.is_active,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  });

  return {
    members,
    totalCount: count ?? 0,
  };
}

/**
 * Fetches all available roles
 */
async function fetchRoles(): Promise<Role[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .is('deleted_at', null)
    .order('role_name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch roles: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Fetches pending invitations for a shop
 */
async function fetchPendingInvitations(
  shopId: string
): Promise<{ invitations: PendingInvitation[]; totalCount: number }> {
  const supabase = createClient();

  const now = new Date().toISOString();

  // First, get invitation records
  const {
    data: invitationRecords,
    error,
    count,
  } = await supabase
    .from('staff_invitations')
    .select('*', { count: 'exact' })
    .eq('id_shop', shopId)
    .eq('status', 'pending')
    .gt('expires_at', now)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch pending invitations: ${error.message}`);
  }

  if (!invitationRecords || invitationRecords.length === 0) {
    return { invitations: [], totalCount: 0 };
  }

  // Get unique role and inviter IDs
  const roleIds = [...new Set(invitationRecords.map((r) => r.id_role))];
  const inviterIds = [...new Set(invitationRecords.map((r) => r.invited_by))];

  // Fetch roles
  const { data: roles } = await supabase
    .from('roles')
    .select('id_role, role_name, description')
    .in('id_role', roleIds);

  // Fetch inviters
  const { data: inviters } = await supabase
    .from('users')
    .select('id_user, full_name, email')
    .in('id_user', inviterIds);

  // Create lookup maps
  const roleMap = new Map(roles?.map((r) => [r.id_role, r]) ?? []);
  const inviterMap = new Map(inviters?.map((u) => [u.id_user, u]) ?? []);

  // Transform to PendingInvitation format
  const invitations: PendingInvitation[] = invitationRecords.map((item) => ({
    ...item,
    role: roleMap.get(item.id_role) ?? null,
    inviter: inviterMap.get(item.invited_by) ?? null,
  }));

  return {
    invitations,
    totalCount: count ?? 0,
  };
}

// ============================================
// Query Hooks
// ============================================

/**
 * Hook to fetch team members for the current shop.
 *
 * Fetches shop_access records with joined users and roles data.
 * Returns team members with their roles and permissions.
 *
 * @param options - Query options
 * @returns Team members list with metadata
 *
 * @example
 * ```tsx
 * function TeamList() {
 *   const { members, isLoading, error } = useTeamMembers();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <Table dataSource={members}>
 *       <Column title="Name" dataIndex="full_name" />
 *       <Column title="Email" dataIndex="email" />
 *       <Column title="Role" dataIndex="role_name" />
 *     </Table>
 *   );
 * }
 * ```
 */
export function useTeamMembers(options: UseTeamMembersOptions = {}): UseTeamMembersReturn {
  const { shopId, hasAccess } = useShop();
  const { includeInactive = false, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: [...teamKeys.members(shopId ?? ''), { includeInactive }],
    queryFn: () => fetchTeamMembers(shopId!, { includeInactive }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  return {
    members: data?.members ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isInitialLoading: isLoading && !data,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to fetch all available roles.
 *
 * Fetches roles from the roles table.
 * Roles are global (not shop-scoped).
 *
 * @param options - Query options
 * @returns Available roles list
 *
 * @example
 * ```tsx
 * function RoleSelector({ value, onChange }) {
 *   const { roles, isLoading } = useRoles();
 *
 *   return (
 *     <Select
 *       value={value}
 *       onChange={onChange}
 *       loading={isLoading}
 *       options={roles.map(r => ({ value: r.id_role, label: r.role_name }))}
 *     />
 *   );
 * }
 * ```
 */
export function useRoles(options: UseRolesOptions = {}): UseRolesReturn {
  const { enabled = true } = options;

  const queryResult = useQuery({
    queryKey: teamKeys.roles(),
    queryFn: fetchRoles,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes (roles rarely change)
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const { data, isLoading, error, refetch } = queryResult;

  return {
    roles: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to fetch pending staff invitations for the current shop.
 *
 * Fetches invitations with status = 'pending' that haven't expired.
 *
 * @param options - Query options
 * @returns Pending invitations list
 *
 * @example
 * ```tsx
 * function PendingInvitations() {
 *   const { invitations, isLoading } = usePendingInvitations();
 *
 *   return (
 *     <List
 *       loading={isLoading}
 *       dataSource={invitations}
 *       renderItem={inv => (
 *         <List.Item>
 *           {inv.email} - {inv.role?.role_name}
 *         </List.Item>
 *       )}
 *     />
 *   );
 * }
 * ```
 */
export function usePendingInvitations(
  options: UsePendingInvitationsOptions = {}
): UsePendingInvitationsReturn {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  const queryResult = useQuery({
    queryKey: teamKeys.invitations(shopId ?? ''),
    queryFn: () => fetchPendingInvitations(shopId!),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  return {
    invitations: data?.invitations ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}

// ============================================
// Mutation Types
// ============================================

/**
 * Input for inviting a team member
 */
export interface InviteTeamMemberInput {
  /** Email address to send invitation to */
  email: string;
  /** Role ID to assign */
  roleId: string;
  /** Optional custom permissions override */
  permissions?: Json;
}

/**
 * Input for updating a team member's role
 */
export interface UpdateMemberRoleInput {
  /** Shop access ID */
  accessId: string;
  /** New role ID (optional) */
  roleId?: string;
  /** New permissions (optional) */
  permissions?: Json;
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to invite a new team member.
 *
 * Creates a staff_invitation record with a unique token.
 * The invitation expires after a set period (configured in DB).
 *
 * @example
 * ```tsx
 * const inviteTeamMember = useInviteTeamMember();
 *
 * const handleInvite = async (data: InviteTeamMemberInput) => {
 *   try {
 *     await inviteTeamMember.mutateAsync(data);
 *     toast.success('Invitation sent!');
 *   } catch (error) {
 *     toast.error('Failed to send invitation');
 *   }
 * };
 * ```
 */
export function useInviteTeamMember() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InviteTeamMemberInput) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user for invited_by
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        throw new Error('Not authenticated');
      }

      // Get the user record
      const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('id_user')
        .eq('auth_id', authUser.id)
        .single();

      if (userError || !currentUser) {
        throw new Error('Failed to get current user');
      }

      // Check if email already has access to this shop
      const { data: existingAccess } = await supabase
        .from('shop_access')
        .select('id_access, users!fk_shop_access_user(email)')
        .eq('id_shop', shopId)
        .eq('is_active', true);

      const hasExistingAccess = existingAccess?.some((access) => {
        const typedAccess = access as unknown as { users: { email: string } | null };
        return typedAccess.users?.email?.toLowerCase() === input.email.toLowerCase();
      });

      if (hasExistingAccess) {
        throw new Error('This email already has access to the shop');
      }

      // Check if there's already a pending invitation for this email
      const { data: existingInvite } = await supabase
        .from('staff_invitations')
        .select('id_invitation')
        .eq('id_shop', shopId)
        .eq('email', input.email.toLowerCase())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existingInvite) {
        throw new Error('A pending invitation already exists for this email');
      }

      // Create the invitation (expires in 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: invitation, error } = await supabase
        .from('staff_invitations')
        .insert({
          id_shop: shopId,
          email: input.email.toLowerCase(),
          id_role: input.roleId,
          permissions: input.permissions ?? {},
          invited_by: currentUser.id_user,
          expires_at: expiresAt.toISOString(),
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create invitation: ${error.message}`);
      }

      return invitation;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: teamKeys.invitations(shopId) });
      }
    },
  });
}

/**
 * Hook to remove a team member (soft deactivate).
 *
 * Sets is_active = false on the shop_access record.
 * Does not delete the record to preserve audit trail.
 *
 * @example
 * ```tsx
 * const removeTeamMember = useRemoveTeamMember();
 *
 * const handleRemove = async (accessId: string) => {
 *   try {
 *     await removeTeamMember.mutateAsync(accessId);
 *     toast.success('Team member removed');
 *   } catch (error) {
 *     toast.error('Failed to remove team member');
 *   }
 * };
 * ```
 */
export function useRemoveTeamMember() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accessId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Soft deactivate by setting is_active = false
      const { data, error } = await supabase
        .from('shop_access')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id_access', accessId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to remove team member: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: teamKeys.members(shopId) });
      }
    },
  });
}

/**
 * Hook to reactivate a previously removed team member.
 *
 * Sets is_active = true on the shop_access record.
 *
 * @example
 * ```tsx
 * const reactivateTeamMember = useReactivateTeamMember();
 *
 * const handleReactivate = async (accessId: string) => {
 *   try {
 *     await reactivateTeamMember.mutateAsync(accessId);
 *     toast.success('Team member reactivated');
 *   } catch (error) {
 *     toast.error('Failed to reactivate team member');
 *   }
 * };
 * ```
 */
export function useReactivateTeamMember() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accessId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('shop_access')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id_access', accessId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to reactivate team member: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: teamKeys.members(shopId) });
      }
    },
  });
}

/**
 * Hook to update a team member's role and/or permissions.
 *
 * Can update the role, permissions, or both.
 *
 * @example
 * ```tsx
 * const updateMemberRole = useUpdateMemberRole();
 *
 * const handleUpdateRole = async (accessId: string, newRoleId: string) => {
 *   try {
 *     await updateMemberRole.mutateAsync({ accessId, roleId: newRoleId });
 *     toast.success('Role updated');
 *   } catch (error) {
 *     toast.error('Failed to update role');
 *   }
 * };
 * ```
 */
export function useUpdateMemberRole() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMemberRoleInput) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const { accessId, roleId, permissions } = input;

      // Build update object
      const updateData: ShopAccessUpdate = {
        updated_at: new Date().toISOString(),
      };

      if (roleId !== undefined) {
        updateData.id_role = roleId;
      }

      if (permissions !== undefined) {
        updateData.permissions = permissions;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('shop_access')
        .update(updateData)
        .eq('id_access', accessId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update member role: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: teamKeys.members(shopId) });
        // Also invalidate shop access queries since permissions changed
        queryClient.invalidateQueries({ queryKey: queryKeys.shopAccess(shopId) });
      }
    },
  });
}

/**
 * Hook to cancel a pending invitation.
 *
 * Sets the invitation status to 'cancelled'.
 *
 * @example
 * ```tsx
 * const cancelInvitation = useCancelInvitation();
 *
 * const handleCancel = async (invitationId: string) => {
 *   try {
 *     await cancelInvitation.mutateAsync(invitationId);
 *     toast.success('Invitation cancelled');
 *   } catch (error) {
 *     toast.error('Failed to cancel invitation');
 *   }
 * };
 * ```
 */
export function useCancelInvitation() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('staff_invitations')
        .update({ status: 'cancelled' })
        .eq('id_invitation', invitationId)
        .eq('id_shop', shopId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to cancel invitation: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: teamKeys.invitations(shopId) });
      }
    },
  });
}

/**
 * Hook to resend an invitation.
 *
 * Creates a new invitation and cancels the old one.
 *
 * @example
 * ```tsx
 * const resendInvitation = useResendInvitation();
 *
 * const handleResend = async (invitationId: string) => {
 *   try {
 *     await resendInvitation.mutateAsync(invitationId);
 *     toast.success('Invitation resent');
 *   } catch (error) {
 *     toast.error('Failed to resend invitation');
 *   }
 * };
 * ```
 */
export function useResendInvitation() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get the original invitation
      const { data: original, error: fetchError } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('id_invitation', invitationId)
        .eq('id_shop', shopId)
        .single();

      if (fetchError || !original) {
        throw new Error('Invitation not found');
      }

      // Cancel the old invitation
      await supabase
        .from('staff_invitations')
        .update({ status: 'cancelled' })
        .eq('id_invitation', invitationId);

      // Create a new invitation with same details
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: newInvitation, error: createError } = await supabase
        .from('staff_invitations')
        .insert({
          id_shop: shopId,
          email: original.email,
          id_role: original.id_role,
          permissions: original.permissions,
          invited_by: original.invited_by,
          expires_at: expiresAt.toISOString(),
          status: 'pending',
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to resend invitation: ${createError.message}`);
      }

      return newInvitation;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: teamKeys.invitations(shopId) });
      }
    },
  });
}

// ============================================
// Utility Hooks
// ============================================

/**
 * Utility to invalidate team caches
 */
export function useInvalidateTeam() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all team queries for current shop */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({ queryKey: teamKeys.all });
      }
      return undefined;
    },
    /** Invalidate team members for current shop */
    invalidateMembers: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({ queryKey: teamKeys.members(shopId) });
      }
      return undefined;
    },
    /** Invalidate invitations for current shop */
    invalidateInvitations: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({ queryKey: teamKeys.invitations(shopId) });
      }
      return undefined;
    },
    /** Invalidate roles (global) */
    invalidateRoles: (): Promise<void> => {
      return queryClient.invalidateQueries({ queryKey: teamKeys.roles() });
    },
  };
}
