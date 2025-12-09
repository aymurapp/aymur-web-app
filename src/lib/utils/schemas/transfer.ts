/**
 * Transfer Validation Schemas
 *
 * Zod schemas for validating shop transfer data including:
 * - Inter-shop transfers
 * - Transfer items
 * - Status updates
 *
 * Based on DATABASE_DOCUMENTATION.md:
 * - shop_transfers: Transfer headers
 * - shop_transfer_items: Transfer line items
 * - neighbor_shops: Shop-to-shop relationships
 *
 * @module lib/utils/schemas/transfer
 */

import { z } from 'zod';

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Transfer status enum
 * Flow: pending -> shipped -> received OR rejected
 */
export const transferStatusEnum = z.enum(['pending', 'shipped', 'received', 'rejected']);

/**
 * Transfer direction for filtering
 */
export const transferDirectionEnum = z.enum(['incoming', 'outgoing', 'all']);

// =============================================================================
// FIELD SCHEMAS
// =============================================================================

/**
 * Transfer number (auto-generated, typically)
 */
export const transferNumberSchema = z
  .string()
  .min(1, 'Transfer number is required')
  .max(50, 'Transfer number must not exceed 50 characters');

/**
 * Transfer notes (optional)
 */
export const transferNotesSchema = z
  .string()
  .max(1000, 'Notes must not exceed 1000 characters')
  .optional()
  .nullable();

/**
 * Shipped date
 */
export const shippedDateSchema = z
  .string()
  .datetime({ message: 'Invalid shipped date format' })
  .optional()
  .nullable();

/**
 * Received date
 */
export const receivedDateSchema = z
  .string()
  .datetime({ message: 'Invalid received date format' })
  .optional()
  .nullable();

/**
 * Item IDs array (for transfer items)
 */
export const transferItemIdsSchema = z
  .array(z.string().uuid('Invalid item ID'))
  .min(1, 'Select at least one item to transfer');

// =============================================================================
// MAIN SCHEMAS
// =============================================================================

/**
 * Create transfer schema
 * For initiating a new transfer to another shop
 */
export const createTransferSchema = z.object({
  /** Destination shop ID */
  to_shop_id: z.string().uuid('Invalid destination shop'),
  /** Items to transfer */
  items: transferItemIdsSchema,
  /** Optional notes */
  notes: transferNotesSchema,
});

/**
 * Update transfer status schema
 * For transitioning transfer through its lifecycle
 */
export const updateTransferStatusSchema = z.object({
  /** New status */
  status: z.enum(['shipped', 'received', 'rejected'], {
    required_error: 'Status is required',
    invalid_type_error: 'Invalid status value',
  }),
  /** Optional notes (required for rejection) */
  notes: transferNotesSchema,
  /** Tracking number (optional, typically set when shipping) */
  tracking_number: z
    .string()
    .max(100, 'Tracking number must not exceed 100 characters')
    .optional()
    .nullable(),
});

/**
 * Ship transfer schema
 * For marking a transfer as shipped
 */
export const shipTransferSchema = z.object({
  /** Optional tracking number */
  tracking_number: z
    .string()
    .max(100, 'Tracking number must not exceed 100 characters')
    .optional()
    .nullable(),
  /** Optional shipping notes */
  notes: transferNotesSchema,
});

/**
 * Receive transfer schema
 * For marking a transfer as received at destination
 */
export const receiveTransferSchema = z.object({
  /** Optional notes */
  notes: transferNotesSchema,
  /** Optionally specify which items were received (for partial transfers) */
  received_item_ids: z.array(z.string().uuid()).optional(),
});

/**
 * Reject transfer schema
 * For rejecting an incoming transfer
 */
export const rejectTransferSchema = z.object({
  /** Reason for rejection (required) */
  rejection_reason: z
    .string()
    .min(1, 'Rejection reason is required')
    .max(500, 'Rejection reason must not exceed 500 characters'),
});

/**
 * Transfer search/filter schema
 */
export const transferSearchSchema = z.object({
  /** Search term (transfer number, notes) */
  search: z.string().optional(),
  /** Filter by direction relative to current shop */
  direction: transferDirectionEnum.optional().default('all'),
  /** Filter by status */
  status: transferStatusEnum.optional(),
  /** Filter by specific from shop */
  from_shop_id: z.string().uuid().optional(),
  /** Filter by specific to shop */
  to_shop_id: z.string().uuid().optional(),
  /** Date range start */
  date_from: z.string().datetime().optional(),
  /** Date range end */
  date_to: z.string().datetime().optional(),
  /** Page number */
  page: z.number().int().positive().optional().default(1),
  /** Items per page */
  page_size: z.number().int().positive().max(100).optional().default(20),
  /** Sort field */
  sort_by: z
    .enum(['created_at', 'transfer_number', 'status', 'shipped_date', 'received_date'])
    .optional()
    .default('created_at'),
  /** Sort direction */
  sort_direction: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Add items to transfer schema
 * For adding additional items to a pending transfer
 */
export const addTransferItemsSchema = z.object({
  /** Transfer ID */
  transfer_id: z.string().uuid('Invalid transfer ID'),
  /** Items to add */
  item_ids: transferItemIdsSchema,
});

/**
 * Remove items from transfer schema
 * For removing items from a pending transfer
 */
export const removeTransferItemsSchema = z.object({
  /** Transfer ID */
  transfer_id: z.string().uuid('Invalid transfer ID'),
  /** Items to remove */
  item_ids: z
    .array(z.string().uuid('Invalid item ID'))
    .min(1, 'Select at least one item to remove'),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type TransferStatus = z.infer<typeof transferStatusEnum>;
export type TransferDirection = z.infer<typeof transferDirectionEnum>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type UpdateTransferStatusInput = z.infer<typeof updateTransferStatusSchema>;
export type ShipTransferInput = z.infer<typeof shipTransferSchema>;
export type ReceiveTransferInput = z.infer<typeof receiveTransferSchema>;
export type RejectTransferInput = z.infer<typeof rejectTransferSchema>;
export type TransferSearchInput = z.infer<typeof transferSearchSchema>;
export type AddTransferItemsInput = z.infer<typeof addTransferItemsSchema>;
export type RemoveTransferItemsInput = z.infer<typeof removeTransferItemsSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates create transfer input
 */
export function validateCreateTransfer(data: unknown): CreateTransferInput {
  return createTransferSchema.parse(data);
}

/**
 * Validates update transfer status input
 */
export function validateUpdateTransferStatus(data: unknown): UpdateTransferStatusInput {
  return updateTransferStatusSchema.parse(data);
}

/**
 * Validates ship transfer input
 */
export function validateShipTransfer(data: unknown): ShipTransferInput {
  return shipTransferSchema.parse(data);
}

/**
 * Validates receive transfer input
 */
export function validateReceiveTransfer(data: unknown): ReceiveTransferInput {
  return receiveTransferSchema.parse(data);
}

/**
 * Validates reject transfer input
 */
export function validateRejectTransfer(data: unknown): RejectTransferInput {
  return rejectTransferSchema.parse(data);
}

/**
 * Validates transfer search input
 */
export function validateTransferSearch(data: unknown): TransferSearchInput {
  return transferSearchSchema.parse(data);
}

/**
 * Format Zod errors for transfer schemas
 */
export function formatTransferErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Valid status transitions for transfers
 * From current status -> allowed next statuses
 */
export const TRANSFER_STATUS_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  pending: ['shipped'],
  shipped: ['received', 'rejected'],
  received: [], // Terminal state
  rejected: [], // Terminal state
};

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  currentStatus: TransferStatus,
  newStatus: TransferStatus
): boolean {
  return TRANSFER_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Get allowed status transitions for a transfer
 */
export function getAllowedTransferStatusTransitions(
  currentStatus: TransferStatus
): TransferStatus[] {
  return TRANSFER_STATUS_TRANSITIONS[currentStatus] ?? [];
}

/**
 * Check if a transfer can be edited (items added/removed)
 */
export function isTransferEditable(status: TransferStatus): boolean {
  return status === 'pending';
}

/**
 * Check if a transfer can be cancelled
 */
export function isTransferCancellable(status: TransferStatus): boolean {
  return status === 'pending';
}
