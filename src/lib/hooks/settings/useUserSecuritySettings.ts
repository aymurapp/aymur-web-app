'use client';

/**
 * useUserSecuritySettings Hook
 *
 * TanStack Query hooks for managing user security settings.
 * Provides access to 2FA configuration, backup codes, and security preferences.
 *
 * Features:
 * - View 2FA status and configuration
 * - Enable/disable 2FA
 * - Generate and view backup codes
 * - Configure trusted devices
 * - View security audit log
 *
 * @module lib/hooks/settings/useUserSecuritySettings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Two-factor authentication method
 */
export type TwoFactorMethod = 'authenticator' | 'sms' | 'email';

/**
 * Trusted device record
 */
export interface TrustedDevice {
  /** Device identifier */
  id_device: string;
  /** Device name/label */
  device_name: string;
  /** Device type */
  device_type: string;
  /** Browser name */
  browser: string | null;
  /** Operating system */
  os: string | null;
  /** Last used timestamp */
  last_used_at: string;
  /** When the device was trusted */
  trusted_at: string;
  /** When trust expires */
  expires_at: string | null;
}

/**
 * User security settings
 */
export interface UserSecuritySettings {
  /** User ID */
  id_user: string;
  /** Whether 2FA is enabled */
  two_factor_enabled: boolean;
  /** Current 2FA method */
  two_factor_method: TwoFactorMethod | null;
  /** Phone number for SMS 2FA (masked) */
  two_factor_phone: string | null;
  /** Whether backup codes have been generated */
  backup_codes_generated: boolean;
  /** Number of remaining backup codes */
  backup_codes_remaining: number;
  /** When backup codes were last generated */
  backup_codes_generated_at: string | null;
  /** Trusted devices list */
  trusted_devices: TrustedDevice[];
  /** Whether to require re-auth for sensitive actions */
  require_reauth_for_sensitive: boolean;
  /** Session timeout in minutes */
  session_timeout_minutes: number;
  /** Whether login notifications are enabled */
  login_notifications: boolean;
  /** Last password change timestamp */
  password_last_changed_at: string | null;
  /** Last security audit timestamp */
  last_security_audit_at: string | null;
  /** Settings last updated timestamp */
  updated_at: string;
}

/**
 * 2FA setup response
 */
export interface TwoFactorSetupResponse {
  /** Secret key for authenticator app */
  secret: string;
  /** QR code data URL */
  qr_code_url: string;
  /** Recovery codes (shown once) */
  recovery_codes: string[];
}

/**
 * Backup codes response (only shown once)
 */
export interface BackupCodesResponse {
  /** New backup codes */
  codes: string[];
  /** When they were generated */
  generated_at: string;
}

/**
 * Input for updating security settings
 */
export interface UpdateSecuritySettingsInput {
  /** Whether to require re-auth for sensitive actions */
  require_reauth_for_sensitive?: boolean;
  /** Session timeout in minutes */
  session_timeout_minutes?: number;
  /** Whether login notifications are enabled */
  login_notifications?: boolean;
}

/**
 * Action result type for security operations
 */
export interface SecurityActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Server action functions interface
 * These functions should be implemented in src/lib/actions/security-settings.ts
 */
export interface SecuritySettingsActions {
  getUserSecuritySettings: () => Promise<SecurityActionResult<UserSecuritySettings>>;
  updateSecuritySettings: (
    input: UpdateSecuritySettingsInput
  ) => Promise<SecurityActionResult<UserSecuritySettings>>;
  enableTwoFactor: (method: TwoFactorMethod) => Promise<SecurityActionResult<TwoFactorSetupResponse>>;
  verifyTwoFactorSetup: (code: string) => Promise<SecurityActionResult>;
  disableTwoFactor: (password: string) => Promise<SecurityActionResult>;
  generateBackupCodes: () => Promise<SecurityActionResult<BackupCodesResponse>>;
  removeTrustedDevice: (deviceId: string) => Promise<SecurityActionResult>;
  removeAllTrustedDevices: () => Promise<SecurityActionResult>;
}

// =============================================================================
// QUERY KEY FACTORY
// =============================================================================

/**
 * Query key factory for security settings queries
 */
export const securityKeys = {
  /** User security settings */
  settings: ['user-security-settings'] as const,
  /** Trusted devices */
  trustedDevices: ['user-security-settings', 'trusted-devices'] as const,
} as const;

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to get user security settings
 *
 * Fetches the current user's security settings including 2FA status.
 *
 * @param actions - Server action functions for security operations
 * @returns Query result with security settings
 *
 * @example
 * ```tsx
 * import { getUserSecuritySettings, ... } from '@/lib/actions/security-settings';
 *
 * function SecuritySettings() {
 *   const { data: settings, isLoading } = useUserSecuritySettings({
 *     getUserSecuritySettings,
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <h2>Two-Factor Authentication</h2>
 *       <p>Status: {settings?.two_factor_enabled ? 'Enabled' : 'Disabled'}</p>
 *       <p>Method: {settings?.two_factor_method}</p>
 *       <p>Backup codes remaining: {settings?.backup_codes_remaining}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserSecuritySettings(
  actions: Pick<SecuritySettingsActions, 'getUserSecuritySettings'>
) {
  return useQuery({
    queryKey: securityKeys.settings,
    queryFn: async () => {
      const result = await actions.getUserSecuritySettings();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch security settings');
      }
      return result.data ?? null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to update security settings
 *
 * Updates user security preferences (excluding 2FA which has separate flows).
 *
 * @param actions - Server action functions for security operations
 * @returns Mutation for updating security settings
 *
 * @example
 * ```tsx
 * const { mutate: updateSettings, isPending } = useUpdateSecuritySettings({
 *   updateSecuritySettings,
 * });
 *
 * const handleUpdate = () => {
 *   updateSettings(
 *     { session_timeout_minutes: 60 },
 *     { onSuccess: () => toast.success('Settings updated') }
 *   );
 * };
 * ```
 */
export function useUpdateSecuritySettings(
  actions: Pick<SecuritySettingsActions, 'updateSecuritySettings'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSecuritySettingsInput) => {
      const result = await actions.updateSecuritySettings(input);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update security settings');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.settings });
    },
  });
}

/**
 * Hook to enable two-factor authentication
 *
 * Initiates 2FA setup and returns secret/QR code for verification.
 *
 * @param actions - Server action functions for security operations
 * @returns Mutation for enabling 2FA
 *
 * @example
 * ```tsx
 * const { mutate: enableTwoFactor, isPending, data: setupData } = useEnableTwoFactor({
 *   enableTwoFactor,
 * });
 *
 * const handleEnable = () => {
 *   enableTwoFactor('authenticator', {
 *     onSuccess: (data) => {
 *       setQrCode(data?.qr_code_url);
 *       setRecoveryCodes(data?.recovery_codes);
 *     },
 *   });
 * };
 * ```
 */
export function useEnableTwoFactor(
  actions: Pick<SecuritySettingsActions, 'enableTwoFactor'>
) {
  // queryClient not used here - invalidation happens after verification
  return useMutation({
    mutationFn: async (method: TwoFactorMethod) => {
      const result = await actions.enableTwoFactor(method);
      if (!result.success) {
        throw new Error(result.error || 'Failed to enable two-factor authentication');
      }
      return result.data;
    },
    onSuccess: () => {
      // Don't invalidate yet - wait for verification
    },
  });
}

/**
 * Hook to verify 2FA setup
 *
 * Verifies the TOTP code to complete 2FA setup.
 *
 * @param actions - Server action functions for security operations
 * @returns Mutation for verifying 2FA setup
 */
export function useVerifyTwoFactorSetup(
  actions: Pick<SecuritySettingsActions, 'verifyTwoFactorSetup'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const result = await actions.verifyTwoFactorSetup(code);
      if (!result.success) {
        throw new Error(result.error || 'Invalid verification code');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.settings });
    },
  });
}

/**
 * Hook to disable two-factor authentication
 *
 * Disables 2FA after password verification.
 *
 * @param actions - Server action functions for security operations
 * @returns Mutation for disabling 2FA
 */
export function useDisableTwoFactor(
  actions: Pick<SecuritySettingsActions, 'disableTwoFactor'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (password: string) => {
      const result = await actions.disableTwoFactor(password);
      if (!result.success) {
        throw new Error(result.error || 'Failed to disable two-factor authentication');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.settings });
    },
  });
}

/**
 * Hook to generate new backup codes
 *
 * Generates new backup codes (invalidates old ones).
 *
 * @param actions - Server action functions for security operations
 * @returns Mutation for generating backup codes
 */
export function useGenerateBackupCodes(
  actions: Pick<SecuritySettingsActions, 'generateBackupCodes'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await actions.generateBackupCodes();
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate backup codes');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.settings });
    },
  });
}

/**
 * Hook to remove a trusted device
 *
 * Removes a device from the trusted devices list.
 *
 * @param actions - Server action functions for security operations
 * @returns Mutation for removing a trusted device
 */
export function useRemoveTrustedDevice(
  actions: Pick<SecuritySettingsActions, 'removeTrustedDevice'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      const result = await actions.removeTrustedDevice(deviceId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove trusted device');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.settings });
    },
  });
}

/**
 * Hook to remove all trusted devices
 *
 * Clears all trusted devices (security measure).
 *
 * @param actions - Server action functions for security operations
 * @returns Mutation for removing all trusted devices
 */
export function useRemoveAllTrustedDevices(
  actions: Pick<SecuritySettingsActions, 'removeAllTrustedDevices'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await actions.removeAllTrustedDevices();
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove trusted devices');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.settings });
    },
  });
}

/**
 * Utility hook to invalidate security settings queries
 *
 * @returns Object with invalidate function
 */
export function useInvalidateSecuritySettings() {
  const queryClient = useQueryClient();

  return {
    /** Invalidate security settings query */
    invalidate: () => queryClient.invalidateQueries({ queryKey: securityKeys.settings }),
  };
}
