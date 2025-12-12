/**
 * Settings Hooks
 *
 * TanStack Query v5 hooks for user settings management.
 * Provides typed, cached data fetching and mutations for:
 * - Session management
 * - Login history
 * - Notification preferences
 * - Security settings (2FA, backup codes)
 * - Account deletion workflow
 *
 * All hooks follow the action-based pattern where server actions
 * are passed as dependencies for maximum flexibility and testability.
 *
 * @module lib/hooks/settings
 */

// =============================================================================
// USER SESSIONS
// =============================================================================

export {
  // Hooks
  useUserSessions,
  useCurrentSessionId,
  useRevokeSession,
  useRevokeAllOtherSessions,
  useInvalidateSessions,
  // Query keys
  sessionKeys,
  // Types
  type UserSession,
  type SessionActionResult,
  type SessionActions,
} from './useUserSessions';

// =============================================================================
// LOGIN HISTORY
// =============================================================================

export {
  // Hooks
  useLoginHistory,
  useRecentLoginHistory,
  useFailedLoginAttempts,
  useSuspiciousLogins,
  useInvalidateLoginHistory,
  // Query keys
  loginHistoryKeys,
  // Types
  type LoginHistoryRecord,
  type LoginHistoryActionResult,
  type LoginHistoryOptions,
  type LoginHistoryActions,
} from './useLoginHistory';

// =============================================================================
// USER NOTIFICATIONS
// =============================================================================

export {
  // Hooks
  useUserNotificationSettings,
  useUpdateNotificationSettings,
  useToggleCategoryNotification,
  useInvalidateNotificationSettings,
  // Query keys
  notificationKeys,
  // Types
  type NotificationChannel,
  type DigestFrequency,
  type NotificationCategorySettings,
  type UserNotificationSettings,
  type UpdateNotificationSettingsInput,
  type NotificationActionResult,
  type NotificationActions,
} from './useUserNotifications';

// =============================================================================
// USER SECURITY SETTINGS
// =============================================================================

export {
  // Hooks
  useUserSecuritySettings,
  useUpdateSecuritySettings,
  useEnableTwoFactor,
  useVerifyTwoFactorSetup,
  useDisableTwoFactor,
  useGenerateBackupCodes,
  useRemoveTrustedDevice,
  useRemoveAllTrustedDevices,
  useInvalidateSecuritySettings,
  // Query keys
  securityKeys,
  // Types
  type TwoFactorMethod,
  type TrustedDevice,
  type UserSecuritySettings,
  type TwoFactorSetupResponse,
  type BackupCodesResponse,
  type UpdateSecuritySettingsInput,
  type SecurityActionResult,
  type SecuritySettingsActions,
} from './useUserSecuritySettings';

// =============================================================================
// ACCOUNT DELETION
// =============================================================================

export {
  // Hooks
  useAccountDeletionStatus,
  useRequestAccountDeletion,
  useConfirmAccountDeletion,
  useCancelAccountDeletion,
  useInvalidateAccountDeletion,
  // Query keys
  deletionKeys,
  // Types
  type DeletionRequestStatus,
  type DeletionReason,
  type AccountDeletionRequest,
  type DeletionStatusResponse,
  type RequestDeletionInput,
  type ConfirmDeletionInput,
  type DeletionActionResult,
  type AccountDeletionActions,
} from './useAccountDeletion';

// =============================================================================
// BILLING & SUBSCRIPTION
// =============================================================================

export {
  // Hooks
  useAvailablePlans,
  useUserSubscriptionLimits,
  useSubscriptionUsage,
  useCreateCheckoutSession,
  useCreatePortalSession,
  // Query keys
  billingKeys,
  // Types
  type BillingPlan,
  type SubscriptionLimits,
  type SubscriptionUsage,
  type UrlResult,
  type CheckoutRedirectOptions,
  type BillingActionResult,
  type BillingActions,
} from './useBilling';
