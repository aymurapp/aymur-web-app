'use server';

/**
 * User Notification Settings Server Actions
 *
 * Server-side actions for managing global user notification preferences.
 * These are user-level settings that apply across all shops.
 *
 * Key features:
 * - Get notification settings (creates default if not exists)
 * - Update notification preferences
 * - Supports email, push, and SMS channels
 *
 * Note: Shop-specific notification settings are in user_notification_settings table.
 * Global settings are stored in user_global_notification_settings table.
 *
 * @module lib/actions/user-notifications
 */

import { createClient } from '@/lib/supabase/server';

import type { ActionResult } from './auth';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Global notification settings for a user
 * These settings apply across all shops the user has access to
 *
 * Schema matches user_global_notification_settings table:
 * - id_notification_settings (uuid, PK)
 * - id_user (uuid, FK to users)
 * - email_* columns for email preferences
 * - push_* columns for push notification preferences
 * - quiet_hours_* for do-not-disturb settings
 */
export interface NotificationSettings {
  id_notification_settings: string;
  id_user: string;

  // Email notifications
  email_marketing: boolean;
  email_product_updates: boolean;
  email_security_alerts: boolean;
  email_billing_alerts: boolean;

  // Push notifications
  push_enabled: boolean;
  push_security_alerts: boolean;
  push_billing_alerts: boolean;

  // Quiet hours (do not disturb)
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null; // Time format: "HH:MM:SS"
  quiet_hours_end: string | null; // Time format: "HH:MM:SS"

  created_at: string;
  updated_at: string;
}

/**
 * Input for updating notification settings
 * All fields are optional - only provided fields will be updated
 */
export interface UpdateNotificationSettingsInput {
  // Email notifications
  email_marketing?: boolean;
  email_product_updates?: boolean;
  email_security_alerts?: boolean;
  email_billing_alerts?: boolean;

  // Push notifications
  push_enabled?: boolean;
  push_security_alerts?: boolean;
  push_billing_alerts?: boolean;

  // Quiet hours
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default notification settings for new users
 * Security-focused defaults: security alerts enabled, marketing disabled
 * Matches database column defaults
 */
const DEFAULT_NOTIFICATION_SETTINGS: Omit<
  NotificationSettings,
  'id_notification_settings' | 'id_user' | 'created_at' | 'updated_at'
> = {
  // Email notifications
  email_marketing: false,
  email_product_updates: true,
  email_security_alerts: true,
  email_billing_alerts: true,

  // Push notifications
  push_enabled: true,
  push_security_alerts: true,
  push_billing_alerts: true,

  // Quiet hours - disabled by default
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00:00',
  quiet_hours_end: '08:00:00',
};

// =============================================================================
// GET USER NOTIFICATION SETTINGS
// =============================================================================

/**
 * Retrieves global notification settings for the current user
 *
 * If no settings exist, creates a record with default values.
 * This ensures every user has notification preferences.
 *
 * @returns ActionResult with notification settings
 *
 * @example
 * ```tsx
 * const result = await getUserNotificationSettings();
 * if (result.success) {
 *   console.log('Email enabled:', result.data?.email_enabled);
 * }
 * ```
 */
export async function getUserNotificationSettings(): Promise<ActionResult<NotificationSettings>> {
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
        error: 'You must be logged in to view notification settings.',
        code: 'unauthorized',
      };
    }

    // 2. Get user's id_user from users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      console.error('[getUserNotificationSettings] User record not found:', userError?.message);
      return {
        success: false,
        error: 'User profile not found.',
        code: 'user_not_found',
      };
    }

    // 3. Try to fetch existing settings
    const { data: existingSettings, error: fetchError } = await supabase
      .from('user_global_notification_settings')
      .select('*')
      .eq('id_user', userRecord.id_user)
      .maybeSingle();

    if (fetchError) {
      console.error('[getUserNotificationSettings] Fetch error:', fetchError.message);
      // Table might not exist yet - return defaults
      return {
        success: true,
        data: {
          id_notification_settings: 'default',
          id_user: userRecord.id_user,
          ...DEFAULT_NOTIFICATION_SETTINGS,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    // 4. If settings exist, return them
    if (existingSettings) {
      return {
        success: true,
        data: existingSettings as NotificationSettings,
      };
    }

    // 5. Create default settings if none exist
    const { data: newSettings, error: insertError } = await supabase
      .from('user_global_notification_settings')
      .insert({
        id_user: userRecord.id_user,
        ...DEFAULT_NOTIFICATION_SETTINGS,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[getUserNotificationSettings] Insert error:', insertError.message);
      // Return defaults even if insert fails (table might not exist)
      return {
        success: true,
        data: {
          id_notification_settings: 'default',
          id_user: userRecord.id_user,
          ...DEFAULT_NOTIFICATION_SETTINGS,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    return {
      success: true,
      data: newSettings as NotificationSettings,
      message: 'Default notification settings created.',
    };
  } catch (err) {
    console.error('[getUserNotificationSettings] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while fetching notification settings.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// UPDATE USER NOTIFICATION SETTINGS
// =============================================================================

/**
 * Updates global notification settings for the current user
 *
 * Only provided fields will be updated. Creates settings record
 * if it doesn't exist.
 *
 * @param data - Partial notification settings to update
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await updateUserNotificationSettings({
 *   email_marketing: false,
 *   push_enabled: true,
 * });
 *
 * if (result.success) {
 *   message.success('Settings updated');
 * }
 * ```
 */
export async function updateUserNotificationSettings(
  data: UpdateNotificationSettingsInput
): Promise<ActionResult<void>> {
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
        error: 'You must be logged in to update notification settings.',
        code: 'unauthorized',
      };
    }

    // 2. Get user's id_user
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      return {
        success: false,
        error: 'User profile not found.',
        code: 'user_not_found',
      };
    }

    // 3. Validate input
    if (!data || Object.keys(data).length === 0) {
      return {
        success: false,
        error: 'No settings provided to update.',
        code: 'validation_error',
      };
    }

    // Validate quiet_hours_start and quiet_hours_end format if provided
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (data.quiet_hours_start !== undefined && data.quiet_hours_start !== null) {
      if (!timeRegex.test(data.quiet_hours_start)) {
        return {
          success: false,
          error: 'Invalid quiet hours start time format. Use HH:MM:SS.',
          code: 'validation_error',
        };
      }
    }
    if (data.quiet_hours_end !== undefined && data.quiet_hours_end !== null) {
      if (!timeRegex.test(data.quiet_hours_end)) {
        return {
          success: false,
          error: 'Invalid quiet hours end time format. Use HH:MM:SS.',
          code: 'validation_error',
        };
      }
    }

    // 4. Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Type-safe field mapping for boolean fields
    const booleanFields: (keyof UpdateNotificationSettingsInput)[] = [
      'email_marketing',
      'email_product_updates',
      'email_security_alerts',
      'email_billing_alerts',
      'push_enabled',
      'push_security_alerts',
      'push_billing_alerts',
      'quiet_hours_enabled',
    ];

    for (const field of booleanFields) {
      if (data[field] !== undefined) {
        updateData[field] = Boolean(data[field]);
      }
    }

    // Handle time fields
    if (data.quiet_hours_start !== undefined) {
      updateData.quiet_hours_start = data.quiet_hours_start;
    }
    if (data.quiet_hours_end !== undefined) {
      updateData.quiet_hours_end = data.quiet_hours_end;
    }

    // 5. Check if settings exist
    const { data: existingSettings, error: fetchError } = await supabase
      .from('user_global_notification_settings')
      .select('id_notification_settings')
      .eq('id_user', userRecord.id_user)
      .maybeSingle();

    if (fetchError) {
      console.error('[updateUserNotificationSettings] Fetch error:', fetchError.message);
      return {
        success: false,
        error: 'Failed to check existing settings.',
        code: 'database_error',
      };
    }

    // 6. Update or insert settings
    if (existingSettings) {
      // Update existing settings
      const { error: updateError } = await supabase
        .from('user_global_notification_settings')
        .update(updateData)
        .eq('id_user', userRecord.id_user);

      if (updateError) {
        console.error('[updateUserNotificationSettings] Update error:', updateError.message);
        return {
          success: false,
          error: 'Failed to update notification settings.',
          code: 'database_error',
        };
      }
    } else {
      // Create new settings with defaults + provided values
      const insertData = {
        id_user: userRecord.id_user,
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...updateData,
      };

      const { error: insertError } = await supabase
        .from('user_global_notification_settings')
        .insert(insertData);

      if (insertError) {
        console.error('[updateUserNotificationSettings] Insert error:', insertError.message);
        return {
          success: false,
          error: 'Failed to create notification settings.',
          code: 'database_error',
        };
      }
    }

    return {
      success: true,
      message: 'Notification settings updated successfully.',
    };
  } catch (err) {
    console.error('[updateUserNotificationSettings] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while updating notification settings.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// RESET NOTIFICATION SETTINGS
// =============================================================================

/**
 * Resets notification settings to default values
 *
 * Useful for users who want to restore default preferences.
 *
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await resetNotificationSettings();
 * if (result.success) {
 *   message.success('Settings reset to defaults');
 * }
 * ```
 */
export async function resetNotificationSettings(): Promise<ActionResult<NotificationSettings>> {
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
        error: 'You must be logged in to reset notification settings.',
        code: 'unauthorized',
      };
    }

    // 2. Get user's id_user
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      return {
        success: false,
        error: 'User profile not found.',
        code: 'user_not_found',
      };
    }

    // 3. Reset settings to defaults
    const { data: settings, error: upsertError } = await supabase
      .from('user_global_notification_settings')
      .upsert(
        {
          id_user: userRecord.id_user,
          ...DEFAULT_NOTIFICATION_SETTINGS,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id_user',
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('[resetNotificationSettings] Upsert error:', upsertError.message);
      return {
        success: false,
        error: 'Failed to reset notification settings.',
        code: 'database_error',
      };
    }

    return {
      success: true,
      data: settings as NotificationSettings,
      message: 'Notification settings reset to defaults.',
    };
  } catch (err) {
    console.error('[resetNotificationSettings] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while resetting notification settings.',
      code: 'unexpected_error',
    };
  }
}
