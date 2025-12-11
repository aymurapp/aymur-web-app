'use server';

/**
 * Invitation Server Actions
 *
 * Server actions for handling staff invitation codes.
 * Supports validating and accepting invitation codes for team members
 * to join existing shops.
 *
 * Features:
 * - Validate invitation code format and existence
 * - Check invitation expiration and status
 * - Accept invitation and create shop_access record
 * - Handle edge cases (already accepted, expired, etc.)
 *
 * @module lib/actions/invitation
 */

import { createClient } from '@/lib/supabase/server';

import type { ActionResult } from './auth';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Invitation details returned when validating a code
 */
export interface InvitationDetails {
  id_invitation: string;
  id_shop: string;
  shop_name: string;
  shop_logo: string | null;
  id_role: string;
  role_name: string;
  email: string;
  expires_at: string;
  invited_by_name: string;
}

/**
 * Result of accepting an invitation
 */
export interface AcceptInvitationResult {
  id_shop: string;
  shop_name: string;
  role_name: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Invitation code format: 3 uppercase letters + 5 digits
 * Pattern: AAA00000 (e.g., ABC12345)
 */
const INVITATION_CODE_PATTERN = /^[A-Z]{3}[0-9]{5}$/;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validates the format of an invitation code
 */
function isValidCodeFormat(code: string): boolean {
  return INVITATION_CODE_PATTERN.test(code.toUpperCase());
}

/**
 * Normalizes the invitation code (uppercase, trim)
 */
function normalizeCode(code: string): string {
  return code.toUpperCase().trim();
}

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Validates an invitation code and returns invitation details
 *
 * Checks:
 * - Code format is valid (3 letters + 5 digits)
 * - Code exists in database
 * - Invitation is not expired
 * - Invitation status is 'pending'
 *
 * @param code - The invitation code to validate
 * @returns ActionResult with invitation details or error
 */
export async function validateInvitationCode(
  code: string
): Promise<ActionResult<InvitationDetails>> {
  try {
    // Validate format
    if (!code || !isValidCodeFormat(code)) {
      return {
        success: false,
        error:
          'Invalid invitation code format. Code should be 3 letters followed by 5 digits (e.g., ABC12345).',
        code: 'invalid_format',
      };
    }

    const normalizedCode = normalizeCode(code);
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to use an invitation code.',
        code: 'not_authenticated',
      };
    }

    // Fetch invitation with shop and role details
    const { data: invitation, error: fetchError } = await supabase
      .from('staff_invitations')
      .select(
        `
        id_invitation,
        id_shop,
        id_role,
        email,
        expires_at,
        status,
        invited_by,
        shops:id_shop (
          shop_name,
          shop_logo
        ),
        roles:id_role (
          role_name
        ),
        inviter:invited_by (
          full_name
        )
      `
      )
      .eq('invitation_code', normalizedCode)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return {
          success: false,
          error: 'Invitation code not found. Please check the code and try again.',
          code: 'not_found',
        };
      }
      console.error('[validateInvitationCode] Fetch error:', fetchError);
      return {
        success: false,
        error: 'Failed to validate invitation code.',
        code: 'fetch_error',
      };
    }

    if (!invitation) {
      return {
        success: false,
        error: 'Invitation code not found.',
        code: 'not_found',
      };
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return {
        success: false,
        error: 'This invitation has already been accepted.',
        code: 'already_accepted',
      };
    }

    // Check if expired
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      return {
        success: false,
        error: 'This invitation has expired. Please request a new one.',
        code: 'expired',
      };
    }

    // Check if status is pending
    if (invitation.status !== 'pending') {
      return {
        success: false,
        error: `This invitation is no longer valid (status: ${invitation.status}).`,
        code: 'invalid_status',
      };
    }

    // Type assertions for joined data
    const shop = invitation.shops as unknown as { shop_name: string; shop_logo: string | null };
    const role = invitation.roles as unknown as { role_name: string };
    const inviter = invitation.inviter as unknown as { full_name: string } | null;

    return {
      success: true,
      data: {
        id_invitation: invitation.id_invitation,
        id_shop: invitation.id_shop,
        shop_name: shop?.shop_name || 'Unknown Shop',
        shop_logo: shop?.shop_logo || null,
        id_role: invitation.id_role,
        role_name: role?.role_name || 'Team Member',
        email: invitation.email,
        expires_at: invitation.expires_at,
        invited_by_name: inviter?.full_name || 'Shop Owner',
      },
      message: 'Invitation code is valid.',
    };
  } catch (error) {
    console.error('[validateInvitationCode] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while validating the invitation code.',
      code: 'unexpected_error',
    };
  }
}

/**
 * Accepts an invitation and grants the user access to the shop
 *
 * Actions:
 * - Validates the invitation code again
 * - Creates shop_access record for the user
 * - Updates invitation status to 'accepted'
 * - Records acceptance timestamp and user
 *
 * @param code - The invitation code to accept
 * @returns ActionResult with shop details or error
 */
export async function acceptInvitation(
  code: string
): Promise<ActionResult<AcceptInvitationResult>> {
  try {
    // First validate the code
    const validationResult = await validateInvitationCode(code);
    if (!validationResult.success) {
      return validationResult as ActionResult<AcceptInvitationResult>;
    }

    const invitation = validationResult.data!;
    const normalizedCode = normalizeCode(code);
    const supabase = await createClient();

    // Get current user and their internal user record
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: 'You must be logged in to accept an invitation.',
        code: 'not_authenticated',
      };
    }

    // Get the internal user ID
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', authUser.id)
      .single();

    if (userError || !userRecord) {
      console.error('[acceptInvitation] User record error:', userError);
      return {
        success: false,
        error: 'User profile not found. Please complete your profile first.',
        code: 'user_not_found',
      };
    }

    // Check if user already has access to this shop
    const { data: existingAccess } = await supabase
      .from('shop_access')
      .select('id_access')
      .eq('id_shop', invitation.id_shop)
      .eq('id_user', userRecord.id_user)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingAccess) {
      return {
        success: false,
        error: 'You already have access to this shop.',
        code: 'already_member',
      };
    }

    // Create shop_access record
    const { error: accessError } = await supabase.from('shop_access').insert({
      id_shop: invitation.id_shop,
      id_user: userRecord.id_user,
      id_role: invitation.id_role,
      is_active: true,
    });

    if (accessError) {
      console.error('[acceptInvitation] Access creation error:', accessError);
      return {
        success: false,
        error: 'Failed to grant shop access. Please try again.',
        code: 'access_error',
      };
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('staff_invitations')
      .update({
        status: 'accepted',
        accepted_by: userRecord.id_user,
        accepted_at: new Date().toISOString(),
      })
      .eq('invitation_code', normalizedCode);

    if (updateError) {
      console.error('[acceptInvitation] Update error:', updateError);
      // Note: Access was already granted, so this is not critical
    }

    return {
      success: true,
      data: {
        id_shop: invitation.id_shop,
        shop_name: invitation.shop_name,
        role_name: invitation.role_name,
      },
      message: `You have successfully joined ${invitation.shop_name} as ${invitation.role_name}.`,
    };
  } catch (error) {
    console.error('[acceptInvitation] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while accepting the invitation.',
      code: 'unexpected_error',
    };
  }
}

/**
 * Generates a new invitation code for a shop
 * (Called when creating a new staff invitation)
 *
 * @param shopId - The shop to create an invitation for
 * @param email - The email of the person being invited
 * @param roleId - The role to assign to the invitee
 * @param expiresInDays - Number of days until expiration (default: 7)
 * @returns ActionResult with the generated invitation code
 */
export async function createInvitation(
  shopId: string,
  email: string,
  roleId: string,
  expiresInDays: number = 7
): Promise<ActionResult<{ invitation_code: string; expires_at: string }>> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: 'You must be logged in to create invitations.',
        code: 'not_authenticated',
      };
    }

    // Get the internal user ID
    const { data: userRecord } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', authUser.id)
      .single();

    if (!userRecord) {
      return {
        success: false,
        error: 'User profile not found.',
        code: 'user_not_found',
      };
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invitation (invitation_code is auto-generated by the database)
    const { data: invitation, error: insertError } = await supabase
      .from('staff_invitations')
      .insert({
        id_shop: shopId,
        email: email.toLowerCase().trim(),
        id_role: roleId,
        invited_by: userRecord.id_user,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select('invitation_code, expires_at')
      .single();

    if (insertError) {
      console.error('[createInvitation] Insert error:', insertError);
      return {
        success: false,
        error: 'Failed to create invitation.',
        code: 'insert_error',
      };
    }

    return {
      success: true,
      data: {
        invitation_code: invitation.invitation_code,
        expires_at: invitation.expires_at,
      },
      message: 'Invitation created successfully.',
    };
  } catch (error) {
    console.error('[createInvitation] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while creating the invitation.',
      code: 'unexpected_error',
    };
  }
}
