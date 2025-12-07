'use server';

/**
 * Team Management Server Actions
 *
 * Server-side actions for managing team members, roles, and invitations
 * in the Aymur Platform multi-tenant environment.
 *
 * Key features:
 * - Get team members with roles and permissions
 * - Invite new team members via email
 * - Update member roles and permissions
 * - Cancel pending invitations
 * - Deactivate team members
 *
 * Security:
 * - Only owner/manager roles can manage team
 * - Cannot modify owner role
 * - Cannot deactivate shop owner
 * - RLS policies enforce shop isolation
 *
 * @module lib/actions/team
 */

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

import type { ActionResult } from './auth';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Role definition from the roles table
 */
export interface Role {
  id_role: string;
  role_name: string;
  description: string | null;
}

/**
 * Team member with user and role data
 */
export interface TeamMember {
  id_access: string;
  id_shop: string;
  id_user: string;
  id_role: string;
  permissions: Record<string, boolean> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id_user: string;
    email: string;
    full_name: string | null;
    phone: string | null;
  } | null;
  role: {
    id_role: string;
    role_name: string;
    description: string | null;
  } | null;
}

/**
 * Pending invitation with role data
 */
export interface PendingInvitation {
  id_invitation: string;
  id_shop: string;
  email: string;
  id_role: string;
  permissions: Record<string, boolean> | null;
  invitation_token: string;
  invited_by: string;
  expires_at: string;
  status: string;
  created_at: string;
  role: {
    id_role: string;
    role_name: string;
    description: string | null;
  } | null;
  inviter: {
    id_user: string;
    full_name: string | null;
    email: string;
  } | null;
}

/**
 * Input for inviting a team member
 */
export interface InviteTeamMemberInput {
  shopId: string;
  email: string;
  roleId: string;
  permissions?: Record<string, boolean>;
}

/**
 * Input for updating a member's role
 */
export interface UpdateMemberRoleInput {
  accessId: string;
  shopId: string;
  roleId: string;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Schema for inviting a team member
 */
export const InviteTeamMemberSchema = z.object({
  shopId: z.string().uuid('Invalid shop ID'),
  email: z.string().email('Invalid email address'),
  roleId: z.string().uuid('Invalid role ID'),
  permissions: z.record(z.string(), z.boolean()).optional(),
});

/**
 * Schema for updating member role
 */
export const UpdateMemberRoleSchema = z.object({
  accessId: z.string().uuid('Invalid access ID'),
  shopId: z.string().uuid('Invalid shop ID'),
  roleId: z.string().uuid('Invalid role ID'),
});

/**
 * Schema for updating member permissions
 */
export const UpdateMemberPermissionsSchema = z.object({
  accessId: z.string().uuid('Invalid access ID'),
  shopId: z.string().uuid('Invalid shop ID'),
  permissions: z.record(z.string(), z.boolean()),
});

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Role IDs from the database
 */
const ROLE_IDS = {
  OWNER: 'cd2c64be-def1-42e2-985c-26d3b73f0d64',
  STAFF: 'c2d9c45f-0052-44cc-97ad-df440a80b22c',
} as const;

/**
 * Invitation expiry in days
 */
const INVITATION_EXPIRY_DAYS = 7;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Checks if the current user has permission to manage team members.
 * Only owner and manager roles can manage team.
 *
 * @param supabase - Supabase client
 * @param shopId - Shop ID to check access for
 * @returns Object with hasPermission flag and user info
 */
async function checkTeamManagementPermission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shopId: string
): Promise<{
  hasPermission: boolean;
  userId: string | null;
  userRole: string | null;
  error?: string;
}> {
  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      hasPermission: false,
      userId: null,
      userRole: null,
      error: 'You must be logged in to manage team members.',
    };
  }

  // Get user's role in this shop using the database function
  const { data: roleData, error: roleError } = await supabase.rpc('get_user_shop_role', {
    p_shop_id: shopId,
  });

  if (roleError) {
    console.error('[checkTeamManagementPermission] Role check error:', roleError.message);
    return {
      hasPermission: false,
      userId: user.id,
      userRole: null,
      error: 'Failed to verify your permissions.',
    };
  }

  const userRole = roleData as string | null;

  // Only owner and manager can manage team
  const canManageTeam = userRole === 'owner' || userRole === 'manager';

  if (!canManageTeam) {
    return {
      hasPermission: false,
      userId: user.id,
      userRole,
      error:
        'You do not have permission to manage team members. Only owners and managers can perform this action.',
    };
  }

  return {
    hasPermission: true,
    userId: user.id,
    userRole,
  };
}

/**
 * Gets the user ID from the users table (not auth.users)
 * This is needed because shop_access references public.users.id_user
 */
async function getPublicUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id_user')
    .eq('auth_id', authId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id_user;
}

// =============================================================================
// GET TEAM MEMBERS
// =============================================================================

/**
 * Fetches all team members for a shop with user and role data.
 *
 * RLS automatically filters to shops the user has access to.
 *
 * @param shopId - The shop ID to get team members for
 * @returns ActionResult with array of team members
 *
 * @example
 * ```tsx
 * const result = await getTeamMembers('shop-uuid');
 * if (result.success) {
 *   const members = result.data;
 *   // Display team members
 * }
 * ```
 */
export async function getTeamMembers(shopId: string): Promise<ActionResult<TeamMember[]>> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to view team members.',
        code: 'unauthorized',
      };
    }

    // Fetch shop_access records
    // RLS policy shop_access_read ensures we can only see members of our shops
    const { data: accessRecords, error: accessError } = await supabase
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
        updated_at
      `
      )
      .eq('id_shop', shopId)
      .order('created_at', { ascending: true });

    if (accessError) {
      console.error('[getTeamMembers] Database error:', accessError.message);
      return {
        success: false,
        error: 'Failed to fetch team members.',
        code: 'database_error',
      };
    }

    if (!accessRecords || accessRecords.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // Get unique user and role IDs
    const userIds = [...new Set(accessRecords.map((a) => a.id_user))];
    const roleIds = [...new Set(accessRecords.map((a) => a.id_role))];

    // Fetch users and roles in parallel
    const [usersResult, rolesResult] = await Promise.all([
      supabase.from('users').select('id_user, email, full_name, phone').in('id_user', userIds),
      supabase.from('roles').select('id_role, role_name, description').in('id_role', roleIds),
    ]);

    // Create lookup maps
    const usersMap = new Map((usersResult.data || []).map((u) => [u.id_user, u]));
    const rolesMap = new Map((rolesResult.data || []).map((r) => [r.id_role, r]));

    // Transform the data to match our TeamMember interface
    const teamMembers: TeamMember[] = accessRecords.map((member) => ({
      id_access: member.id_access,
      id_shop: member.id_shop,
      id_user: member.id_user,
      id_role: member.id_role,
      permissions: member.permissions as Record<string, boolean> | null,
      is_active: member.is_active,
      created_at: member.created_at,
      updated_at: member.updated_at,
      user: usersMap.get(member.id_user) || null,
      role: rolesMap.get(member.id_role) || null,
    }));

    return {
      success: true,
      data: teamMembers,
    };
  } catch (error) {
    console.error('[getTeamMembers] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while fetching team members.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GET ROLES
// =============================================================================

/**
 * Fetches all available roles from the roles table.
 *
 * Roles are system-defined and read-only:
 * - Owner: Full control, pays subscription
 * - Staff: Invited by owner, granular permissions
 *
 * @returns ActionResult with array of roles
 *
 * @example
 * ```tsx
 * const result = await getRoles();
 * if (result.success) {
 *   const roles = result.data;
 *   // Populate role dropdown
 * }
 * ```
 */
export async function getRoles(): Promise<ActionResult<Role[]>> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to view roles.',
        code: 'unauthorized',
      };
    }

    // Fetch all roles
    // RLS allows public SELECT on roles table
    const { data, error } = await supabase
      .from('roles')
      .select('id_role, role_name, description')
      .is('deleted_at', null)
      .order('role_name', { ascending: true });

    if (error) {
      console.error('[getRoles] Database error:', error.message);
      return {
        success: false,
        error: 'Failed to fetch roles.',
        code: 'database_error',
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error('[getRoles] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while fetching roles.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GET PENDING INVITATIONS
// =============================================================================

/**
 * Fetches pending invitations for a shop, filtering out expired ones.
 *
 * Only returns invitations with status 'pending' and expires_at > now.
 *
 * @param shopId - The shop ID to get invitations for
 * @returns ActionResult with array of pending invitations
 *
 * @example
 * ```tsx
 * const result = await getPendingInvitations('shop-uuid');
 * if (result.success) {
 *   const invitations = result.data;
 *   // Display pending invitations
 * }
 * ```
 */
export async function getPendingInvitations(
  shopId: string
): Promise<ActionResult<PendingInvitation[]>> {
  try {
    const supabase = await createClient();

    // Verify authentication and permission
    const permCheck = await checkTeamManagementPermission(supabase, shopId);
    if (!permCheck.hasPermission) {
      return {
        success: false,
        error: permCheck.error || 'Permission denied.',
        code: 'forbidden',
      };
    }

    // Fetch pending invitations that haven't expired
    // RLS policy staff_invitations_read ensures shop isolation
    const { data: invitationRecords, error: invError } = await supabase
      .from('staff_invitations')
      .select(
        `
        id_invitation,
        id_shop,
        email,
        id_role,
        permissions,
        invitation_token,
        invited_by,
        expires_at,
        status,
        created_at
      `
      )
      .eq('id_shop', shopId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (invError) {
      console.error('[getPendingInvitations] Database error:', invError.message);
      return {
        success: false,
        error: 'Failed to fetch pending invitations.',
        code: 'database_error',
      };
    }

    if (!invitationRecords || invitationRecords.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // Get unique role and inviter IDs
    const roleIds = [...new Set(invitationRecords.map((i) => i.id_role))];
    const inviterIds = [...new Set(invitationRecords.map((i) => i.invited_by))];

    // Fetch roles and inviters in parallel
    const [rolesResult, invitersResult] = await Promise.all([
      supabase.from('roles').select('id_role, role_name, description').in('id_role', roleIds),
      supabase.from('users').select('id_user, full_name, email').in('id_user', inviterIds),
    ]);

    // Create lookup maps
    const rolesMap = new Map((rolesResult.data || []).map((r) => [r.id_role, r]));
    const invitersMap = new Map((invitersResult.data || []).map((u) => [u.id_user, u]));

    // Transform the data to match our PendingInvitation interface
    const invitations: PendingInvitation[] = invitationRecords.map((inv) => ({
      id_invitation: inv.id_invitation,
      id_shop: inv.id_shop,
      email: inv.email,
      id_role: inv.id_role,
      permissions: inv.permissions as Record<string, boolean> | null,
      invitation_token: inv.invitation_token,
      invited_by: inv.invited_by,
      expires_at: inv.expires_at,
      status: inv.status || 'pending',
      created_at: inv.created_at,
      role: rolesMap.get(inv.id_role) || null,
      inviter: invitersMap.get(inv.invited_by) || null,
    }));

    return {
      success: true,
      data: invitations,
    };
  } catch (error) {
    console.error('[getPendingInvitations] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while fetching invitations.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// INVITE TEAM MEMBER
// =============================================================================

/**
 * Creates a staff invitation record for a new team member.
 *
 * - Generates unique invitation token (auto by database)
 * - Sets expiry to 7 days from now
 * - Email sending should be handled separately
 *
 * Security:
 * - Only owner/manager can invite
 * - Cannot invite with owner role
 * - RLS policy enforces shop access
 *
 * @param input - Invitation details (shopId, email, roleId, permissions)
 * @returns ActionResult with the created invitation
 *
 * @example
 * ```tsx
 * const result = await inviteTeamMember({
 *   shopId: 'shop-uuid',
 *   email: 'newmember@example.com',
 *   roleId: 'staff-role-uuid',
 *   permissions: { 'inventory.view': true, 'sales.create': true }
 * });
 * if (result.success) {
 *   // Send invitation email with result.data.invitation_token
 * }
 * ```
 */
export async function inviteTeamMember(
  input: InviteTeamMemberInput
): Promise<ActionResult<PendingInvitation>> {
  try {
    // Validate input
    const validation = InviteTeamMemberSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Invalid input.',
        code: 'validation_error',
      };
    }

    const { shopId, email, roleId, permissions } = validation.data;

    const supabase = await createClient();

    // Verify authentication and permission
    const permCheck = await checkTeamManagementPermission(supabase, shopId);
    if (!permCheck.hasPermission) {
      return {
        success: false,
        error: permCheck.error || 'Permission denied.',
        code: 'forbidden',
      };
    }

    // Prevent inviting with owner role
    if (roleId === ROLE_IDS.OWNER) {
      return {
        success: false,
        error: 'Cannot invite team members with the Owner role. Each shop can only have one owner.',
        code: 'invalid_role',
      };
    }

    // Get the inviter's public user ID
    const inviterId = await getPublicUserId(supabase, permCheck.userId!);
    if (!inviterId) {
      return {
        success: false,
        error: 'Failed to identify the inviting user.',
        code: 'user_not_found',
      };
    }

    // Check if there's already a pending invitation for this email
    const { data: existingInvitation } = await supabase
      .from('staff_invitations')
      .select('id_invitation')
      .eq('id_shop', shopId)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      return {
        success: false,
        error: 'An active invitation already exists for this email address.',
        code: 'duplicate_invitation',
      };
    }

    // Check if this email is already a team member
    const { data: existingUser } = await supabase
      .from('users')
      .select('id_user')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      const { data: existingAccess } = await supabase
        .from('shop_access')
        .select('id_access')
        .eq('id_shop', shopId)
        .eq('id_user', existingUser.id_user)
        .single();

      if (existingAccess) {
        return {
          success: false,
          error: 'This user is already a team member of this shop.',
          code: 'already_member',
        };
      }
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    // Create the invitation
    const { data: invData, error: invError } = await supabase
      .from('staff_invitations')
      .insert({
        id_shop: shopId,
        email: email.toLowerCase(),
        id_role: roleId,
        permissions: permissions || {},
        invited_by: inviterId,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select(
        `
        id_invitation,
        id_shop,
        email,
        id_role,
        permissions,
        invitation_token,
        invited_by,
        expires_at,
        status,
        created_at
      `
      )
      .single();

    if (invError || !invData) {
      console.error('[inviteTeamMember] Database error:', invError?.message);
      return {
        success: false,
        error: 'Failed to create invitation.',
        code: 'database_error',
      };
    }

    // Fetch role and inviter data separately
    const [roleResult, inviterResult] = await Promise.all([
      supabase
        .from('roles')
        .select('id_role, role_name, description')
        .eq('id_role', roleId)
        .single(),
      supabase.from('users').select('id_user, full_name, email').eq('id_user', inviterId).single(),
    ]);

    // Transform to PendingInvitation type
    const invitation: PendingInvitation = {
      id_invitation: invData.id_invitation,
      id_shop: invData.id_shop,
      email: invData.email,
      id_role: invData.id_role,
      permissions: invData.permissions as Record<string, boolean> | null,
      invitation_token: invData.invitation_token,
      invited_by: invData.invited_by,
      expires_at: invData.expires_at,
      status: invData.status || 'pending',
      created_at: invData.created_at,
      role: roleResult.data || null,
      inviter: inviterResult.data || null,
    };

    // Revalidate the team page
    revalidatePath(`/[locale]/${shopId}/settings/team`);

    return {
      success: true,
      data: invitation,
      message: `Invitation sent to ${email}. It will expire in ${INVITATION_EXPIRY_DAYS} days.`,
    };
  } catch (error) {
    console.error('[inviteTeamMember] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while creating the invitation.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// CANCEL INVITATION
// =============================================================================

/**
 * Cancels a pending invitation by setting its status to 'cancelled'.
 *
 * Security:
 * - Only owner/manager can cancel invitations
 * - RLS policy enforces shop access
 *
 * @param invitationId - The invitation ID to cancel
 * @param shopId - The shop ID for permission verification
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await cancelInvitation('invitation-uuid', 'shop-uuid');
 * if (result.success) {
 *   // Show success message
 * }
 * ```
 */
export async function cancelInvitation(
  invitationId: string,
  shopId: string
): Promise<ActionResult<void>> {
  try {
    // Validate inputs
    if (!invitationId || !z.string().uuid().safeParse(invitationId).success) {
      return {
        success: false,
        error: 'Invalid invitation ID.',
        code: 'validation_error',
      };
    }

    if (!shopId || !z.string().uuid().safeParse(shopId).success) {
      return {
        success: false,
        error: 'Invalid shop ID.',
        code: 'validation_error',
      };
    }

    const supabase = await createClient();

    // Verify authentication and permission
    const permCheck = await checkTeamManagementPermission(supabase, shopId);
    if (!permCheck.hasPermission) {
      return {
        success: false,
        error: permCheck.error || 'Permission denied.',
        code: 'forbidden',
      };
    }

    // Update the invitation status
    const { error } = await supabase
      .from('staff_invitations')
      .update({ status: 'cancelled' })
      .eq('id_invitation', invitationId)
      .eq('id_shop', shopId)
      .eq('status', 'pending');

    if (error) {
      console.error('[cancelInvitation] Database error:', error.message);
      return {
        success: false,
        error: 'Failed to cancel invitation.',
        code: 'database_error',
      };
    }

    // Revalidate the team page
    revalidatePath(`/[locale]/${shopId}/settings/team`);

    return {
      success: true,
      message: 'Invitation cancelled successfully.',
    };
  } catch (error) {
    console.error('[cancelInvitation] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while cancelling the invitation.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// UPDATE MEMBER ROLE
// =============================================================================

/**
 * Updates a team member's role.
 *
 * Security:
 * - Only owner/manager can update roles
 * - Cannot change the owner's role
 * - Cannot assign owner role to others
 * - RLS policy enforces shop access
 *
 * @param input - Update details (accessId, shopId, roleId)
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await updateMemberRole({
 *   accessId: 'access-uuid',
 *   shopId: 'shop-uuid',
 *   roleId: 'new-role-uuid'
 * });
 * if (result.success) {
 *   // Role updated
 * }
 * ```
 */
export async function updateMemberRole(input: UpdateMemberRoleInput): Promise<ActionResult<void>> {
  try {
    // Validate input
    const validation = UpdateMemberRoleSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Invalid input.',
        code: 'validation_error',
      };
    }

    const { accessId, shopId, roleId } = validation.data;

    const supabase = await createClient();

    // Verify authentication and permission
    const permCheck = await checkTeamManagementPermission(supabase, shopId);
    if (!permCheck.hasPermission) {
      return {
        success: false,
        error: permCheck.error || 'Permission denied.',
        code: 'forbidden',
      };
    }

    // Prevent assigning owner role
    if (roleId === ROLE_IDS.OWNER) {
      return {
        success: false,
        error: 'Cannot assign the Owner role. Each shop can only have one owner.',
        code: 'invalid_role',
      };
    }

    // Get the current access record to check if it's the owner
    const { data: currentAccess, error: accessError } = await supabase
      .from('shop_access')
      .select('id_role')
      .eq('id_access', accessId)
      .eq('id_shop', shopId)
      .single();

    if (accessError || !currentAccess) {
      return {
        success: false,
        error: 'Team member not found.',
        code: 'not_found',
      };
    }

    // Prevent changing the owner's role
    if (currentAccess.id_role === ROLE_IDS.OWNER) {
      return {
        success: false,
        error: "Cannot change the shop owner's role.",
        code: 'owner_protected',
      };
    }

    // Update the role
    const { error } = await supabase
      .from('shop_access')
      .update({
        id_role: roleId,
        updated_at: new Date().toISOString(),
      })
      .eq('id_access', accessId)
      .eq('id_shop', shopId);

    if (error) {
      console.error('[updateMemberRole] Database error:', error.message);
      return {
        success: false,
        error: 'Failed to update member role.',
        code: 'database_error',
      };
    }

    // Revalidate the team page
    revalidatePath(`/[locale]/${shopId}/settings/team`);

    return {
      success: true,
      message: 'Member role updated successfully.',
    };
  } catch (error) {
    console.error('[updateMemberRole] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating the role.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// UPDATE MEMBER PERMISSIONS
// =============================================================================

/**
 * Updates a team member's permissions JSONB field.
 *
 * Permissions are granular overrides on top of the role's default permissions.
 *
 * Security:
 * - Only owner/manager can update permissions
 * - Cannot modify owner's permissions
 * - RLS policy enforces shop access
 *
 * @param accessId - The shop_access record ID
 * @param shopId - The shop ID for permission verification
 * @param permissions - The new permissions object
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await updateMemberPermissions(
 *   'access-uuid',
 *   'shop-uuid',
 *   {
 *     'inventory.view': true,
 *     'inventory.manage': false,
 *     'sales.create': true,
 *     'sales.void': false
 *   }
 * );
 * if (result.success) {
 *   // Permissions updated
 * }
 * ```
 */
export async function updateMemberPermissions(
  accessId: string,
  shopId: string,
  permissions: Record<string, boolean>
): Promise<ActionResult<void>> {
  try {
    // Validate inputs
    const validation = UpdateMemberPermissionsSchema.safeParse({
      accessId,
      shopId,
      permissions,
    });

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Invalid input.',
        code: 'validation_error',
      };
    }

    const supabase = await createClient();

    // Verify authentication and permission
    const permCheck = await checkTeamManagementPermission(supabase, shopId);
    if (!permCheck.hasPermission) {
      return {
        success: false,
        error: permCheck.error || 'Permission denied.',
        code: 'forbidden',
      };
    }

    // Get the current access record to check if it's the owner
    const { data: currentAccess, error: accessError } = await supabase
      .from('shop_access')
      .select('id_role')
      .eq('id_access', accessId)
      .eq('id_shop', shopId)
      .single();

    if (accessError || !currentAccess) {
      return {
        success: false,
        error: 'Team member not found.',
        code: 'not_found',
      };
    }

    // Prevent modifying owner's permissions
    if (currentAccess.id_role === ROLE_IDS.OWNER) {
      return {
        success: false,
        error: "Cannot modify the shop owner's permissions. Owners have full access.",
        code: 'owner_protected',
      };
    }

    // Update the permissions
    const { error } = await supabase
      .from('shop_access')
      .update({
        permissions,
        updated_at: new Date().toISOString(),
      })
      .eq('id_access', accessId)
      .eq('id_shop', shopId);

    if (error) {
      console.error('[updateMemberPermissions] Database error:', error.message);
      return {
        success: false,
        error: 'Failed to update permissions.',
        code: 'database_error',
      };
    }

    // Revalidate the team page
    revalidatePath(`/[locale]/${shopId}/settings/team`);

    return {
      success: true,
      message: 'Permissions updated successfully.',
    };
  } catch (error) {
    console.error('[updateMemberPermissions] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating permissions.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// DEACTIVATE MEMBER
// =============================================================================

/**
 * Deactivates a team member by setting is_active = false.
 *
 * This is a soft deactivation - the record remains but the user
 * loses access to the shop. They can be reactivated later.
 *
 * Security:
 * - Only owner/manager can deactivate members
 * - Cannot deactivate the shop owner
 * - Cannot deactivate yourself
 * - RLS policy enforces shop access
 *
 * @param accessId - The shop_access record ID
 * @param shopId - The shop ID for permission verification
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await deactivateMember('access-uuid', 'shop-uuid');
 * if (result.success) {
 *   // Member deactivated
 * }
 * ```
 */
export async function deactivateMember(
  accessId: string,
  shopId: string
): Promise<ActionResult<void>> {
  try {
    // Validate inputs
    if (!accessId || !z.string().uuid().safeParse(accessId).success) {
      return {
        success: false,
        error: 'Invalid access ID.',
        code: 'validation_error',
      };
    }

    if (!shopId || !z.string().uuid().safeParse(shopId).success) {
      return {
        success: false,
        error: 'Invalid shop ID.',
        code: 'validation_error',
      };
    }

    const supabase = await createClient();

    // Verify authentication and permission
    const permCheck = await checkTeamManagementPermission(supabase, shopId);
    if (!permCheck.hasPermission) {
      return {
        success: false,
        error: permCheck.error || 'Permission denied.',
        code: 'forbidden',
      };
    }

    // Get the inviter's public user ID
    const currentUserId = await getPublicUserId(supabase, permCheck.userId!);

    // Get the access record to check if it's the owner or self
    const { data: accessRecord, error: accessError } = await supabase
      .from('shop_access')
      .select('id_role, id_user')
      .eq('id_access', accessId)
      .eq('id_shop', shopId)
      .single();

    if (accessError || !accessRecord) {
      return {
        success: false,
        error: 'Team member not found.',
        code: 'not_found',
      };
    }

    // Prevent deactivating the owner
    if (accessRecord.id_role === ROLE_IDS.OWNER) {
      return {
        success: false,
        error: 'Cannot deactivate the shop owner.',
        code: 'owner_protected',
      };
    }

    // Prevent deactivating yourself
    if (accessRecord.id_user === currentUserId) {
      return {
        success: false,
        error:
          'You cannot deactivate your own access. Ask another manager or the owner to do this.',
        code: 'self_deactivation',
      };
    }

    // Deactivate the member
    const { error } = await supabase
      .from('shop_access')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id_access', accessId)
      .eq('id_shop', shopId);

    if (error) {
      console.error('[deactivateMember] Database error:', error.message);
      return {
        success: false,
        error: 'Failed to deactivate team member.',
        code: 'database_error',
      };
    }

    // Revalidate the team page
    revalidatePath(`/[locale]/${shopId}/settings/team`);

    return {
      success: true,
      message: 'Team member deactivated successfully.',
    };
  } catch (error) {
    console.error('[deactivateMember] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while deactivating the member.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// REACTIVATE MEMBER (Bonus utility)
// =============================================================================

/**
 * Reactivates a previously deactivated team member.
 *
 * Security:
 * - Only owner/manager can reactivate members
 * - RLS policy enforces shop access
 *
 * @param accessId - The shop_access record ID
 * @param shopId - The shop ID for permission verification
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await reactivateMember('access-uuid', 'shop-uuid');
 * if (result.success) {
 *   // Member reactivated
 * }
 * ```
 */
export async function reactivateMember(
  accessId: string,
  shopId: string
): Promise<ActionResult<void>> {
  try {
    // Validate inputs
    if (!accessId || !z.string().uuid().safeParse(accessId).success) {
      return {
        success: false,
        error: 'Invalid access ID.',
        code: 'validation_error',
      };
    }

    if (!shopId || !z.string().uuid().safeParse(shopId).success) {
      return {
        success: false,
        error: 'Invalid shop ID.',
        code: 'validation_error',
      };
    }

    const supabase = await createClient();

    // Verify authentication and permission
    const permCheck = await checkTeamManagementPermission(supabase, shopId);
    if (!permCheck.hasPermission) {
      return {
        success: false,
        error: permCheck.error || 'Permission denied.',
        code: 'forbidden',
      };
    }

    // Reactivate the member
    const { error } = await supabase
      .from('shop_access')
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id_access', accessId)
      .eq('id_shop', shopId);

    if (error) {
      console.error('[reactivateMember] Database error:', error.message);
      return {
        success: false,
        error: 'Failed to reactivate team member.',
        code: 'database_error',
      };
    }

    // Revalidate the team page
    revalidatePath(`/[locale]/${shopId}/settings/team`);

    return {
      success: true,
      message: 'Team member reactivated successfully.',
    };
  } catch (error) {
    console.error('[reactivateMember] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while reactivating the member.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// RESEND INVITATION (Bonus utility)
// =============================================================================

/**
 * Resends an invitation by creating a new one with fresh expiry.
 *
 * This cancels the old invitation and creates a new one with the same details.
 *
 * @param invitationId - The invitation ID to resend
 * @param shopId - The shop ID for permission verification
 * @returns ActionResult with the new invitation
 *
 * @example
 * ```tsx
 * const result = await resendInvitation('invitation-uuid', 'shop-uuid');
 * if (result.success) {
 *   // New invitation created, send email with result.data.invitation_token
 * }
 * ```
 */
export async function resendInvitation(
  invitationId: string,
  shopId: string
): Promise<ActionResult<PendingInvitation>> {
  try {
    // Validate inputs
    if (!invitationId || !z.string().uuid().safeParse(invitationId).success) {
      return {
        success: false,
        error: 'Invalid invitation ID.',
        code: 'validation_error',
      };
    }

    if (!shopId || !z.string().uuid().safeParse(shopId).success) {
      return {
        success: false,
        error: 'Invalid shop ID.',
        code: 'validation_error',
      };
    }

    const supabase = await createClient();

    // Verify authentication and permission
    const permCheck = await checkTeamManagementPermission(supabase, shopId);
    if (!permCheck.hasPermission) {
      return {
        success: false,
        error: permCheck.error || 'Permission denied.',
        code: 'forbidden',
      };
    }

    // Get the original invitation
    const { data: originalInvitation, error: fetchError } = await supabase
      .from('staff_invitations')
      .select('email, id_role, permissions, invited_by')
      .eq('id_invitation', invitationId)
      .eq('id_shop', shopId)
      .single();

    if (fetchError || !originalInvitation) {
      return {
        success: false,
        error: 'Invitation not found.',
        code: 'not_found',
      };
    }

    // Cancel the old invitation
    await supabase
      .from('staff_invitations')
      .update({ status: 'cancelled' })
      .eq('id_invitation', invitationId);

    // Create a new invitation with the same details
    const result = await inviteTeamMember({
      shopId,
      email: originalInvitation.email,
      roleId: originalInvitation.id_role,
      permissions: originalInvitation.permissions as Record<string, boolean> | undefined,
    });

    return result;
  } catch (error) {
    console.error('[resendInvitation] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while resending the invitation.',
      code: 'unexpected_error',
    };
  }
}
