'use client';

/**
 * useAccountDeletion Hook
 *
 * TanStack Query hooks for managing account deletion workflow.
 * Implements a safe, multi-step deletion process with confirmation.
 *
 * Features:
 * - Request account deletion with reason
 * - Confirm deletion with password verification
 * - Cancel pending deletion requests
 * - Check deletion request status
 * - Grace period before permanent deletion
 *
 * @module lib/hooks/settings/useAccountDeletion
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Account deletion request status
 */
export type DeletionRequestStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

/**
 * Reasons for account deletion
 */
export type DeletionReason =
  | 'no_longer_needed'
  | 'privacy_concerns'
  | 'switching_service'
  | 'too_expensive'
  | 'missing_features'
  | 'too_complex'
  | 'other';

/**
 * Account deletion request record
 */
export interface AccountDeletionRequest {
  /** Request identifier */
  id_request: string;
  /** User ID */
  id_user: string;
  /** Current status */
  status: DeletionRequestStatus;
  /** Reason for deletion */
  reason: DeletionReason;
  /** Additional feedback */
  feedback: string | null;
  /** When the request was created */
  requested_at: string;
  /** When the request was confirmed (if applicable) */
  confirmed_at: string | null;
  /** When the request was cancelled (if applicable) */
  cancelled_at: string | null;
  /** When the account will be permanently deleted */
  scheduled_deletion_at: string | null;
  /** Number of days until permanent deletion */
  days_until_deletion: number | null;
}

/**
 * Account deletion status response
 */
export interface DeletionStatusResponse {
  /** Whether there's an active deletion request */
  has_pending_request: boolean;
  /** The pending request details (if any) */
  request: AccountDeletionRequest | null;
  /** What data will be deleted */
  data_to_delete: {
    profile: boolean;
    sessions: boolean;
    shops_owned: number;
    shop_access: number;
  };
}

/**
 * Input for requesting account deletion
 */
export interface RequestDeletionInput {
  /** Reason for deletion */
  reason: DeletionReason;
  /** Optional additional feedback */
  feedback?: string;
}

/**
 * Input for confirming account deletion
 */
export interface ConfirmDeletionInput {
  /** Request ID to confirm */
  request_id: string;
  /** Password verification */
  password: string;
  /** User must type "DELETE" to confirm */
  confirmation_text: string;
}

/**
 * Action result type for deletion operations
 */
export interface DeletionActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Server action functions interface
 * These functions should be implemented in src/lib/actions/account-deletion.ts
 */
export interface AccountDeletionActions {
  getDeletionStatus: () => Promise<DeletionActionResult<DeletionStatusResponse>>;
  requestAccountDeletion: (
    input: RequestDeletionInput
  ) => Promise<DeletionActionResult<AccountDeletionRequest>>;
  confirmAccountDeletion: (input: ConfirmDeletionInput) => Promise<DeletionActionResult>;
  cancelAccountDeletion: (requestId: string) => Promise<DeletionActionResult>;
}

// =============================================================================
// QUERY KEY FACTORY
// =============================================================================

/**
 * Query key factory for account deletion queries
 */
export const deletionKeys = {
  /** Deletion status */
  status: ['account-deletion', 'status'] as const,
} as const;

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to get account deletion status
 *
 * Checks if there's a pending deletion request and its details.
 *
 * @param actions - Server action functions for deletion operations
 * @returns Query result with deletion status
 *
 * @example
 * ```tsx
 * import { getDeletionStatus, ... } from '@/lib/actions/account-deletion';
 *
 * function DeletionStatus() {
 *   const { data: status, isLoading } = useAccountDeletionStatus({
 *     getDeletionStatus,
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   if (status?.has_pending_request) {
 *     return (
 *       <Alert variant="warning">
 *         Your account is scheduled for deletion in{' '}
 *         {status.request?.days_until_deletion} days.
 *         <button onClick={handleCancel}>Cancel Deletion</button>
 *       </Alert>
 *     );
 *   }
 *
 *   return <button onClick={handleRequest}>Delete Account</button>;
 * }
 * ```
 */
export function useAccountDeletionStatus(
  actions: Pick<AccountDeletionActions, 'getDeletionStatus'>
) {
  return useQuery({
    queryKey: deletionKeys.status,
    queryFn: async () => {
      const result = await actions.getDeletionStatus();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch deletion status');
      }
      return result.data ?? null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to request account deletion
 *
 * Initiates the account deletion process with a grace period.
 *
 * @param actions - Server action functions for deletion operations
 * @returns Mutation for requesting deletion
 *
 * @example
 * ```tsx
 * const { mutate: requestDeletion, isPending } = useRequestAccountDeletion({
 *   requestAccountDeletion,
 * });
 *
 * const handleRequest = (reason: DeletionReason, feedback?: string) => {
 *   requestDeletion(
 *     { reason, feedback },
 *     {
 *       onSuccess: (data) => {
 *         toast.info(
 *           `Deletion requested. You have ${data?.days_until_deletion} days to cancel.`
 *         );
 *       },
 *       onError: (error) => toast.error(error.message),
 *     }
 *   );
 * };
 * ```
 */
export function useRequestAccountDeletion(
  actions: Pick<AccountDeletionActions, 'requestAccountDeletion'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RequestDeletionInput) => {
      const result = await actions.requestAccountDeletion(input);
      if (!result.success) {
        throw new Error(result.error || 'Failed to request account deletion');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deletionKeys.status });
    },
  });
}

/**
 * Hook to confirm account deletion
 *
 * Confirms the deletion request with password and text verification.
 * After confirmation, the account will be permanently deleted after the grace period.
 *
 * @param actions - Server action functions for deletion operations
 * @returns Mutation for confirming deletion
 *
 * @example
 * ```tsx
 * const { mutate: confirmDeletion, isPending } = useConfirmAccountDeletion({
 *   confirmAccountDeletion,
 * });
 *
 * const handleConfirm = () => {
 *   if (confirmationText !== 'DELETE') {
 *     toast.error('Please type DELETE to confirm');
 *     return;
 *   }
 *
 *   confirmDeletion(
 *     {
 *       request_id: request.id_request,
 *       password,
 *       confirmation_text: confirmationText,
 *     },
 *     {
 *       onSuccess: () => {
 *         // Redirect to goodbye page
 *         router.push('/goodbye');
 *       },
 *       onError: (error) => toast.error(error.message),
 *     }
 *   );
 * };
 * ```
 */
export function useConfirmAccountDeletion(
  actions: Pick<AccountDeletionActions, 'confirmAccountDeletion'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ConfirmDeletionInput) => {
      // Validate confirmation text client-side
      if (input.confirmation_text !== 'DELETE') {
        throw new Error('Please type DELETE to confirm account deletion');
      }

      const result = await actions.confirmAccountDeletion(input);
      if (!result.success) {
        throw new Error(result.error || 'Failed to confirm account deletion');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deletionKeys.status });
    },
  });
}

/**
 * Hook to cancel account deletion
 *
 * Cancels a pending deletion request before it's processed.
 *
 * @param actions - Server action functions for deletion operations
 * @returns Mutation for canceling deletion
 *
 * @example
 * ```tsx
 * const { mutate: cancelDeletion, isPending } = useCancelAccountDeletion({
 *   cancelAccountDeletion,
 * });
 *
 * const handleCancel = () => {
 *   cancelDeletion(request.id_request, {
 *     onSuccess: () => toast.success('Account deletion cancelled'),
 *     onError: (error) => toast.error(error.message),
 *   });
 * };
 * ```
 */
export function useCancelAccountDeletion(
  actions: Pick<AccountDeletionActions, 'cancelAccountDeletion'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const result = await actions.cancelAccountDeletion(requestId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel account deletion');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deletionKeys.status });
    },
  });
}

/**
 * Utility hook to invalidate account deletion queries
 *
 * @returns Object with invalidate function
 */
export function useInvalidateAccountDeletion() {
  const queryClient = useQueryClient();

  return {
    /** Invalidate deletion status query */
    invalidate: () => queryClient.invalidateQueries({ queryKey: deletionKeys.status }),
  };
}
