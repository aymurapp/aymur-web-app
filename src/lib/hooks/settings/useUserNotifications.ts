'use client';

/**
 * useUserNotifications Hook
 *
 * TanStack Query hooks for managing user notification preferences.
 * Allows users to configure email, push, and in-app notification settings.
 *
 * Features:
 * - Read current notification preferences
 * - Update notification settings per category
 * - Toggle all notifications on/off
 * - Configure email digest frequency
 *
 * @module lib/hooks/settings/useUserNotifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Notification channel types
 */
export type NotificationChannel = 'email' | 'push' | 'in_app' | 'sms';

/**
 * Email digest frequency options
 */
export type DigestFrequency = 'instant' | 'daily' | 'weekly' | 'never';

/**
 * Notification category settings
 */
export interface NotificationCategorySettings {
  /** Category identifier */
  category: string;
  /** Human-readable category name */
  label: string;
  /** Description of what notifications this category includes */
  description: string;
  /** Whether email notifications are enabled */
  email: boolean;
  /** Whether push notifications are enabled */
  push: boolean;
  /** Whether in-app notifications are enabled */
  in_app: boolean;
  /** Whether SMS notifications are enabled */
  sms: boolean;
}

/**
 * User notification settings
 */
export interface UserNotificationSettings {
  /** User ID */
  id_user: string;
  /** Master toggle for all notifications */
  notifications_enabled: boolean;
  /** Email digest frequency */
  email_digest_frequency: DigestFrequency;
  /** Marketing emails opt-in */
  marketing_emails: boolean;
  /** Security alerts (always on, shown for info) */
  security_alerts: boolean;
  /** Category-specific settings */
  categories: NotificationCategorySettings[];
  /** Last updated timestamp */
  updated_at: string;
}

/**
 * Input for updating notification settings
 */
export interface UpdateNotificationSettingsInput {
  /** Master toggle for all notifications */
  notifications_enabled?: boolean;
  /** Email digest frequency */
  email_digest_frequency?: DigestFrequency;
  /** Marketing emails opt-in */
  marketing_emails?: boolean;
  /** Update specific category settings */
  category_updates?: Array<{
    category: string;
    email?: boolean;
    push?: boolean;
    in_app?: boolean;
    sms?: boolean;
  }>;
}

/**
 * Action result type for notification operations
 */
export interface NotificationActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Server action functions interface
 * These functions should be implemented in src/lib/actions/user-notifications.ts
 */
export interface NotificationActions {
  getUserNotificationSettings: () => Promise<NotificationActionResult<UserNotificationSettings>>;
  updateUserNotificationSettings: (
    input: UpdateNotificationSettingsInput
  ) => Promise<NotificationActionResult<UserNotificationSettings>>;
}

// =============================================================================
// QUERY KEY FACTORY
// =============================================================================

/**
 * Query key factory for notification-related queries
 */
export const notificationKeys = {
  /** User notification settings */
  settings: ['user-notifications'] as const,
} as const;

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to get user notification settings
 *
 * Fetches the current user's notification preferences.
 *
 * @param actions - Server action functions for notification operations
 * @returns Query result with notification settings
 *
 * @example
 * ```tsx
 * import { getUserNotificationSettings, updateUserNotificationSettings } from '@/lib/actions/user-notifications';
 *
 * function NotificationSettings() {
 *   const { data: settings, isLoading } = useUserNotificationSettings({
 *     getUserNotificationSettings,
 *     updateUserNotificationSettings,
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <Switch
 *         checked={settings?.notifications_enabled}
 *         label="Enable Notifications"
 *       />
 *       {settings?.categories.map(cat => (
 *         <CategoryToggle key={cat.category} category={cat} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserNotificationSettings(
  actions: Pick<NotificationActions, 'getUserNotificationSettings'>
) {
  return useQuery({
    queryKey: notificationKeys.settings,
    queryFn: async () => {
      const result = await actions.getUserNotificationSettings();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch notification settings');
      }
      return result.data ?? null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to update notification settings
 *
 * Updates user notification preferences with optimistic update support.
 *
 * @param actions - Server action functions for notification operations
 * @returns Mutation for updating notification settings
 *
 * @example
 * ```tsx
 * const { mutate: updateSettings, isPending } = useUpdateNotificationSettings({
 *   updateUserNotificationSettings,
 * });
 *
 * const handleToggleAll = (enabled: boolean) => {
 *   updateSettings(
 *     { notifications_enabled: enabled },
 *     {
 *       onSuccess: () => toast.success('Settings updated'),
 *       onError: (error) => toast.error(error.message),
 *     }
 *   );
 * };
 * ```
 */
export function useUpdateNotificationSettings(
  actions: Pick<NotificationActions, 'updateUserNotificationSettings'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateNotificationSettingsInput) => {
      const result = await actions.updateUserNotificationSettings(input);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update notification settings');
      }
      return result.data;
    },
    onMutate: async (input) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.settings });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<UserNotificationSettings>(
        notificationKeys.settings
      );

      // Optimistically update
      if (previousSettings) {
        const updatedSettings = { ...previousSettings };

        if (input.notifications_enabled !== undefined) {
          updatedSettings.notifications_enabled = input.notifications_enabled;
        }
        if (input.email_digest_frequency !== undefined) {
          updatedSettings.email_digest_frequency = input.email_digest_frequency;
        }
        if (input.marketing_emails !== undefined) {
          updatedSettings.marketing_emails = input.marketing_emails;
        }
        if (input.category_updates) {
          updatedSettings.categories = updatedSettings.categories.map((cat) => {
            const update = input.category_updates?.find((u) => u.category === cat.category);
            if (update) {
              return {
                ...cat,
                ...(update.email !== undefined && { email: update.email }),
                ...(update.push !== undefined && { push: update.push }),
                ...(update.in_app !== undefined && { in_app: update.in_app }),
                ...(update.sms !== undefined && { sms: update.sms }),
              };
            }
            return cat;
          });
        }

        queryClient.setQueryData(notificationKeys.settings, updatedSettings);
      }

      return { previousSettings };
    },
    onError: (_err, _input, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(notificationKeys.settings, context.previousSettings);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: notificationKeys.settings });
    },
  });
}

/**
 * Hook to toggle a specific notification category
 *
 * Convenience wrapper for toggling a single category's channel.
 *
 * @param actions - Server action functions for notification operations
 * @returns Mutation for toggling category notifications
 *
 * @example
 * ```tsx
 * const { mutate: toggleCategory } = useToggleCategoryNotification({
 *   updateUserNotificationSettings,
 * });
 *
 * const handleToggle = () => {
 *   toggleCategory({
 *     category: 'sales',
 *     channel: 'email',
 *     enabled: true,
 *   });
 * };
 * ```
 */
export function useToggleCategoryNotification(
  actions: Pick<NotificationActions, 'updateUserNotificationSettings'>
) {
  const updateMutation = useUpdateNotificationSettings(actions);

  return {
    ...updateMutation,
    mutate: (input: { category: string; channel: NotificationChannel; enabled: boolean }) => {
      updateMutation.mutate({
        category_updates: [
          {
            category: input.category,
            [input.channel]: input.enabled,
          },
        ],
      });
    },
  };
}

/**
 * Utility hook to invalidate notification settings queries
 *
 * @returns Object with invalidate function
 */
export function useInvalidateNotificationSettings() {
  const queryClient = useQueryClient();

  return {
    /** Invalidate notification settings query */
    invalidate: () => queryClient.invalidateQueries({ queryKey: notificationKeys.settings }),
  };
}
