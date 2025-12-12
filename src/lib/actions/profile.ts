'use server';

/**
 * Profile Server Actions
 *
 * Server-side actions for user profile management in the Aymur Platform.
 * These actions handle profile reading, updates, and avatar uploads.
 *
 * Key features:
 * - Profile data fetching
 * - Profile updates (name, phone, etc.)
 * - Avatar upload to Supabase Storage
 * - Secure file handling with type validation
 *
 * All actions return structured results with success/error states.
 *
 * @module lib/actions/profile
 */

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

import type { ActionResult } from './auth';

// =============================================================================
// TYPES
// =============================================================================

/**
 * User profile data returned from the database
 */
export interface UserProfile {
  id_user: string;
  auth_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  country: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Profile update input data
 */
export interface UpdateProfileInput {
  full_name?: string;
  phone?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
}

/**
 * Avatar upload result
 */
export interface AvatarUploadResult {
  avatar_url: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Storage bucket name for avatars
 */
const AVATARS_BUCKET = 'avatars';

/**
 * Maximum file size for avatar uploads (2MB)
 */
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

/**
 * Allowed MIME types for avatar uploads
 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validates the avatar file
 */
function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return { valid: false, error: 'File size must be less than 2MB.' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.',
    };
  }

  return { valid: true };
}

/**
 * Generates a unique filename for the avatar
 */
function generateAvatarFilename(userId: string, originalName: string): string {
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  return `${userId}/${timestamp}.${extension}`;
}

// =============================================================================
// GET PROFILE (task-079)
// =============================================================================

/**
 * Fetches the current user's profile.
 *
 * Retrieves data from the public.users table, which is linked to auth.users.
 * RLS policies ensure users can only access their own profile.
 *
 * @returns ActionResult with the user profile data
 *
 * @example
 * ```tsx
 * const result = await getProfile();
 * if (result.success) {
 *   console.log(result.data?.full_name);
 * }
 * ```
 */
export async function getProfile(): Promise<ActionResult<UserProfile>> {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to view your profile.',
        code: 'unauthorized',
      };
    }

    // 2. Fetch user profile from public.users (including avatar_url)
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select(
        `
        id_user,
        auth_id,
        full_name,
        email,
        phone,
        avatar_url,
        country,
        province,
        city,
        address,
        created_at,
        updated_at
      `
      )
      .eq('auth_id', user.id)
      .is('deleted_at', null)
      .single();

    if (profileError || !profile) {
      console.error('[getProfile] Database error:', profileError?.message);
      return {
        success: false,
        error: 'Failed to fetch profile.',
        code: 'database_error',
      };
    }

    // 3. Use avatar_url from public.users table (fallback to auth metadata for backwards compatibility)
    const avatarUrl = profile.avatar_url || user.user_metadata?.avatar_url || null;

    return {
      success: true,
      data: {
        ...profile,
        avatar_url: avatarUrl,
      },
    };
  } catch (err) {
    console.error('[getProfile] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while fetching your profile.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// UPDATE PROFILE (task-079)
// =============================================================================

/**
 * Updates the current user's profile.
 *
 * Updates data in the public.users table and optionally in auth.users metadata.
 * Only the authenticated user can update their own profile (enforced by RLS).
 *
 * @param data - The profile fields to update
 * @returns ActionResult with the updated profile data
 *
 * @example
 * ```tsx
 * const result = await updateProfile({
 *   full_name: 'John Doe',
 *   phone: '+1234567890'
 * });
 *
 * if (result.success) {
 *   message.success('Profile updated!');
 * }
 * ```
 */
export async function updateProfile(data: UpdateProfileInput): Promise<ActionResult<UserProfile>> {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to update your profile.',
        code: 'unauthorized',
      };
    }

    // 2. Validate input
    if (data.full_name !== undefined) {
      const trimmedName = data.full_name.trim();
      if (trimmedName.length < 2) {
        return {
          success: false,
          error: 'Full name must be at least 2 characters.',
          code: 'validation_error',
        };
      }
      if (trimmedName.length > 100) {
        return {
          success: false,
          error: 'Full name cannot exceed 100 characters.',
          code: 'validation_error',
        };
      }
    }

    // 3. Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.full_name !== undefined) {
      updateData.full_name = data.full_name.trim();
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone || null;
    }
    if (data.country !== undefined) {
      updateData.country = data.country || null;
    }
    if (data.province !== undefined) {
      updateData.province = data.province || null;
    }
    if (data.city !== undefined) {
      updateData.city = data.city || null;
    }
    if (data.address !== undefined) {
      updateData.address = data.address || null;
    }

    // 4. Update the profile in public.users
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('auth_id', user.id)
      .is('deleted_at', null)
      .select(
        `
        id_user,
        auth_id,
        full_name,
        email,
        phone,
        country,
        province,
        city,
        address,
        created_at,
        updated_at
      `
      )
      .single();

    if (updateError || !updatedProfile) {
      console.error('[updateProfile] Update error:', updateError?.message);
      return {
        success: false,
        error: 'Failed to update profile.',
        code: 'database_error',
      };
    }

    // 5. If name was updated, also update auth.users metadata
    if (data.full_name !== undefined) {
      const { error: metaError } = await supabase.auth.updateUser({
        data: { full_name: data.full_name.trim() },
      });

      if (metaError) {
        console.warn('[updateProfile] Failed to update auth metadata:', metaError.message);
        // Don't fail the operation - the main profile was updated
      }
    }

    // 6. Revalidate relevant paths
    revalidatePath('/[locale]/[shopId]/profile', 'page');

    // 7. Get avatar URL from auth metadata
    const avatarUrl = user.user_metadata?.avatar_url || null;

    return {
      success: true,
      data: {
        ...updatedProfile,
        avatar_url: avatarUrl,
      },
      message: 'Profile updated successfully.',
    };
  } catch (err) {
    console.error('[updateProfile] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while updating your profile.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// UPLOAD AVATAR (task-079)
// =============================================================================

/**
 * Uploads a new avatar image for the current user.
 *
 * Uploads the image to Supabase Storage (avatars bucket) and updates
 * the user's auth metadata with the new avatar URL.
 *
 * @param formData - FormData containing the avatar file with key 'avatar'
 * @returns ActionResult with the new avatar URL
 *
 * @example
 * ```tsx
 * const formData = new FormData();
 * formData.append('avatar', file);
 *
 * const result = await uploadAvatar(formData);
 * if (result.success) {
 *   setAvatarUrl(result.data?.avatar_url);
 * }
 * ```
 */
export async function uploadAvatar(formData: FormData): Promise<ActionResult<AvatarUploadResult>> {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to upload an avatar.',
        code: 'unauthorized',
      };
    }

    // 2. Get the file from FormData
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return {
        success: false,
        error: 'No file provided.',
        code: 'validation_error',
      };
    }

    // 3. Validate the file
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error ?? 'Invalid file.',
        code: 'validation_error',
      };
    }

    // 4. Generate unique filename
    const filename = generateAvatarFilename(user.id, file.name);

    // 5. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('[uploadAvatar] Upload error:', uploadError.message);

      // Check if bucket doesn't exist
      if (uploadError.message.includes('Bucket not found')) {
        return {
          success: false,
          error: 'Avatar storage is not configured. Please contact support.',
          code: 'storage_not_configured',
        };
      }

      return {
        success: false,
        error: 'Failed to upload avatar. Please try again.',
        code: 'upload_error',
      };
    }

    // 6. Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(uploadData.path);

    // 7. Update auth.users metadata with new avatar URL
    const { error: metaError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl },
    });

    if (metaError) {
      console.error('[uploadAvatar] Failed to update auth metadata:', metaError.message);
      // Don't fail - the file was uploaded successfully
    }

    // 7b. Also update public.users table with avatar URL (for persistence after session refresh)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_id', user.id);

    if (updateError) {
      console.error('[uploadAvatar] Failed to update users table:', updateError.message);
      // Don't fail - the file was uploaded successfully
    }

    // 8. Delete old avatar if exists (cleanup)
    // Get old avatar path from metadata
    const oldAvatarUrl = user.user_metadata?.avatar_url;
    if (oldAvatarUrl && oldAvatarUrl.includes(AVATARS_BUCKET)) {
      try {
        // Extract path from URL
        const urlParts = oldAvatarUrl.split(`${AVATARS_BUCKET}/`);
        if (urlParts[1]) {
          const oldPath = decodeURIComponent(urlParts[1]);
          await supabase.storage.from(AVATARS_BUCKET).remove([oldPath]);
        }
      } catch (cleanupError) {
        console.warn('[uploadAvatar] Failed to cleanup old avatar:', cleanupError);
        // Don't fail the operation
      }
    }

    // 9. Revalidate relevant paths
    revalidatePath('/[locale]/[shopId]/profile', 'page');

    return {
      success: true,
      data: {
        avatar_url: publicUrl,
      },
      message: 'Avatar uploaded successfully.',
    };
  } catch (err) {
    console.error('[uploadAvatar] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while uploading your avatar.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// DELETE AVATAR (task-079)
// =============================================================================

/**
 * Deletes the current user's avatar.
 *
 * Removes the avatar from Supabase Storage and clears the avatar URL
 * from auth.users metadata.
 *
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await deleteAvatar();
 * if (result.success) {
 *   setAvatarUrl(null);
 * }
 * ```
 */
export async function deleteAvatar(): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to delete your avatar.',
        code: 'unauthorized',
      };
    }

    // 2. Get current avatar URL
    const avatarUrl = user.user_metadata?.avatar_url;

    if (!avatarUrl) {
      return {
        success: true,
        message: 'No avatar to delete.',
      };
    }

    // 3. Delete from storage if it's our bucket
    if (avatarUrl.includes(AVATARS_BUCKET)) {
      try {
        const urlParts = avatarUrl.split(`${AVATARS_BUCKET}/`);
        if (urlParts[1]) {
          const path = decodeURIComponent(urlParts[1]);
          const { error: deleteError } = await supabase.storage.from(AVATARS_BUCKET).remove([path]);

          if (deleteError) {
            console.warn('[deleteAvatar] Storage delete error:', deleteError.message);
            // Continue anyway - we'll still clear the metadata
          }
        }
      } catch (storageError) {
        console.warn('[deleteAvatar] Failed to delete from storage:', storageError);
        // Continue anyway
      }
    }

    // 4. Clear avatar URL from auth metadata
    const { error: metaError } = await supabase.auth.updateUser({
      data: { avatar_url: null },
    });

    if (metaError) {
      console.error('[deleteAvatar] Failed to clear auth metadata:', metaError.message);
      return {
        success: false,
        error: 'Failed to remove avatar.',
        code: 'metadata_error',
      };
    }

    // 4b. Clear avatar URL from public.users table
    const { error: updateError } = await supabase
      .from('users')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_id', user.id);

    if (updateError) {
      console.error('[deleteAvatar] Failed to clear users table:', updateError.message);
      // Don't fail - auth metadata was already cleared
    }

    // 5. Revalidate relevant paths
    revalidatePath('/[locale]/[shopId]/profile', 'page');

    return {
      success: true,
      message: 'Avatar deleted successfully.',
    };
  } catch (err) {
    console.error('[deleteAvatar] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while deleting your avatar.',
      code: 'unexpected_error',
    };
  }
}
