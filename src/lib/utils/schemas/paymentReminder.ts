/**
 * Payment Reminder Zod Validation Schemas
 * Validation schemas for payment reminder forms and data operations
 *
 * These schemas match the database constraints defined in:
 * - payment_reminders table
 *
 * Key fields:
 * - id_supplier (required, UUID) - The supplier this reminder relates to
 * - reminder_type (required) - Type of reminder: payment_due, follow_up, overdue
 * - due_date (required) - When payment is due
 * - amount (required, positive) - Amount due
 * - status (pending, completed, snoozed) - Current reminder status
 *
 * Note: The current database schema uses id_supplier as the entity reference.
 * The entity_type concept is prepared for future expansion to support
 * multiple entity types (supplier, workshop, courier, customer).
 *
 * @module lib/utils/schemas/paymentReminder
 */

import { z } from 'zod';

import { uuidSchema, dateStringSchema } from '../validation';

// =============================================================================
// REMINDER TYPE ENUMS
// =============================================================================

/**
 * Reminder type enum - matches payment_reminders.reminder_type in database
 * Defines what kind of payment reminder this is
 */
export const reminderTypeEnum = z.enum(['payment_due', 'follow_up', 'overdue', 'scheduled'], {
  errorMap: () => ({
    message: 'Reminder type must be payment_due, follow_up, overdue, or scheduled',
  }),
});

/**
 * Reminder status enum - matches payment_reminders.status in database
 * Tracks the current state of the reminder
 */
export const reminderStatusEnum = z.enum(['pending', 'completed', 'snoozed'], {
  errorMap: () => ({
    message: 'Reminder status must be pending, completed, or snoozed',
  }),
});

/**
 * Entity type enum - for future expansion to support multiple entity types
 * Currently the database only uses supplier, but this prepares for:
 * - supplier: Payment to material suppliers
 * - workshop: Payment to manufacturing workshops
 * - courier: Payment to delivery/courier companies
 * - customer: Payment expected from customers (receivables)
 */
export const entityTypeEnum = z.enum(['supplier', 'workshop', 'courier', 'customer'], {
  errorMap: () => ({
    message: 'Entity type must be supplier, workshop, courier, or customer',
  }),
});

// =============================================================================
// FIELD SCHEMAS
// =============================================================================

/**
 * Reminder amount validation - numeric, positive
 */
export const reminderAmountSchema = z
  .number()
  .positive('Amount must be greater than zero')
  .max(99999999999.9999, 'Amount is too large');

/**
 * Due date validation - must be a valid date string
 */
export const dueDateSchema = dateStringSchema.describe('Due date is required');

/**
 * Next reminder date validation - optional, for scheduling follow-ups
 */
export const nextReminderDateSchema = dateStringSchema
  .optional()
  .nullable()
  .describe('Next reminder date');

/**
 * Reminder notes validation - optional text field
 */
export const reminderNotesSchema = z
  .string()
  .max(2000, 'Notes cannot exceed 2000 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Reminder count validation - tracks how many times reminder was sent
 */
export const reminderCountSchema = z
  .number()
  .int('Reminder count must be a whole number')
  .min(0, 'Reminder count cannot be negative')
  .default(0);

/**
 * Snooze days validation - how many days to push the reminder forward
 */
export const snoozeDaysSchema = z
  .number()
  .int('Snooze days must be a whole number')
  .min(1, 'Snooze must be at least 1 day')
  .max(365, 'Snooze cannot exceed 365 days')
  .default(7);

// =============================================================================
// BASE PAYMENT REMINDER SCHEMA
// =============================================================================

/**
 * Base payment reminder object schema - without refinements
 * Used as foundation for other schemas that need .extend() or .partial()
 */
const paymentReminderBaseSchema = z.object({
  // Entity reference (currently supplier-only in DB)
  id_supplier: uuidSchema.describe('Supplier ID is required'),

  // Optional purchase reference
  id_purchase: uuidSchema.optional().nullable(),

  // Optional payment reference
  id_payment: uuidSchema.optional().nullable(),

  // Reminder details
  reminder_type: reminderTypeEnum,
  due_date: dueDateSchema,
  amount: reminderAmountSchema,
  status: reminderStatusEnum.default('pending'),

  // Reminder tracking
  next_reminder_date: nextReminderDateSchema,

  // Notes
  notes: reminderNotesSchema,
});

// =============================================================================
// MAIN PAYMENT REMINDER SCHEMAS
// =============================================================================

/**
 * Payment reminder schema for forms
 * Use this for the main reminder creation/edit form
 */
export const paymentReminderSchema = paymentReminderBaseSchema;

/**
 * Payment reminder creation schema with shop ID
 * Used when creating a new payment reminder
 */
export const paymentReminderCreateSchema = paymentReminderBaseSchema.extend({
  // Shop ID is required for creation (set programmatically)
  id_shop: uuidSchema.optional(),
});

/**
 * Payment reminder update schema - all fields optional except id
 * Used for partial updates
 */
export const paymentReminderUpdateSchema = paymentReminderBaseSchema.partial().extend({
  // ID is required for updates
  id_reminder: uuidSchema.describe('Reminder ID is required'),
});

// =============================================================================
// SPECIALIZED SCHEMAS
// =============================================================================

/**
 * Mark reminder as completed schema
 */
export const markReminderCompleteSchema = z.object({
  id_reminder: uuidSchema.describe('Reminder ID is required'),
  completion_notes: z
    .string()
    .max(500, 'Completion notes cannot exceed 500 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
});

/**
 * Snooze reminder schema - push due date forward
 */
export const snoozeReminderSchema = z.object({
  id_reminder: uuidSchema.describe('Reminder ID is required'),
  snooze_days: snoozeDaysSchema,
  snooze_reason: z
    .string()
    .max(500, 'Snooze reason cannot exceed 500 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
});

/**
 * Quick add reminder schema - minimal fields for fast entry
 */
export const paymentReminderQuickAddSchema = z.object({
  id_supplier: uuidSchema.describe('Supplier ID is required'),
  amount: reminderAmountSchema,
  due_date: dueDateSchema,
  notes: reminderNotesSchema,
});

// =============================================================================
// SEARCH/FILTER SCHEMAS
// =============================================================================

/**
 * Payment reminder search/filter schema
 */
const paymentReminderSearchBaseSchema = z.object({
  // Filter by supplier
  id_supplier: uuidSchema.optional().nullable(),

  // Filter by status
  status: reminderStatusEnum.optional(),

  // Filter by reminder type
  reminder_type: reminderTypeEnum.optional(),

  // Date range filters
  due_date_from: dateStringSchema.optional(),
  due_date_to: dateStringSchema.optional(),

  // Amount range filters
  amount_min: z.number().min(0, 'Minimum amount cannot be negative').optional(),
  amount_max: z.number().max(99999999999.9999, 'Maximum amount is too large').optional(),

  // Filter overdue only
  overdue_only: z.boolean().optional(),

  // Filter upcoming (due within X days)
  days_ahead: z
    .number()
    .int()
    .min(1, 'Days ahead must be at least 1')
    .max(365, 'Days ahead cannot exceed 365')
    .optional(),

  // Sorting
  sort_by: z
    .enum(['due_date', 'amount', 'status', 'created_at', 'reminder_type'])
    .optional()
    .default('due_date'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),

  // Pagination
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

/**
 * Payment reminder search schema with range validations
 */
export const paymentReminderSearchSchema = paymentReminderSearchBaseSchema
  .refine(
    (data) => {
      // Validate date range
      if (data.due_date_from && data.due_date_to) {
        return new Date(data.due_date_from) <= new Date(data.due_date_to);
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['due_date_to'],
    }
  )
  .refine(
    (data) => {
      // Validate amount range
      if (data.amount_min !== undefined && data.amount_max !== undefined) {
        return data.amount_min <= data.amount_max;
      }
      return true;
    },
    {
      message: 'Minimum amount must be less than or equal to maximum amount',
      path: ['amount_max'],
    }
  );

/**
 * Upcoming reminders filter schema
 * For dashboard widget showing reminders due within X days
 */
export const upcomingRemindersSchema = z.object({
  days_ahead: z
    .number()
    .int()
    .min(1, 'Days ahead must be at least 1')
    .max(90, 'Days ahead cannot exceed 90 for upcoming reminders')
    .default(7),
  limit: z.number().int().min(1).max(50).default(10),
});

/**
 * Overdue reminders filter schema
 * For dashboard widget showing past due reminders
 */
export const overdueRemindersSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Enum types
export type ReminderType = z.infer<typeof reminderTypeEnum>;
export type ReminderStatus = z.infer<typeof reminderStatusEnum>;
export type EntityType = z.infer<typeof entityTypeEnum>;

// Schema input types
export type PaymentReminderInput = z.infer<typeof paymentReminderSchema>;
export type PaymentReminderCreateInput = z.infer<typeof paymentReminderCreateSchema>;
export type PaymentReminderUpdateInput = z.infer<typeof paymentReminderUpdateSchema>;
export type PaymentReminderQuickAddInput = z.infer<typeof paymentReminderQuickAddSchema>;

export type MarkReminderCompleteInput = z.infer<typeof markReminderCompleteSchema>;
export type SnoozeReminderInput = z.infer<typeof snoozeReminderSchema>;

export type PaymentReminderSearchInput = z.infer<typeof paymentReminderSearchSchema>;
export type UpcomingRemindersInput = z.infer<typeof upcomingRemindersSchema>;
export type OverdueRemindersInput = z.infer<typeof overdueRemindersSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates payment reminder data and returns typed result
 */
export function validatePaymentReminder(data: unknown): {
  success: boolean;
  data?: PaymentReminderInput;
  errors?: z.ZodError;
} {
  const result = paymentReminderSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates payment reminder quick add data and returns typed result
 */
export function validatePaymentReminderQuickAdd(data: unknown): {
  success: boolean;
  data?: PaymentReminderQuickAddInput;
  errors?: z.ZodError;
} {
  const result = paymentReminderQuickAddSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates mark complete data and returns typed result
 */
export function validateMarkComplete(data: unknown): {
  success: boolean;
  data?: MarkReminderCompleteInput;
  errors?: z.ZodError;
} {
  const result = markReminderCompleteSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates snooze data and returns typed result
 */
export function validateSnooze(data: unknown): {
  success: boolean;
  data?: SnoozeReminderInput;
  errors?: z.ZodError;
} {
  const result = snoozeReminderSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates payment reminder search/filter data and returns typed result with defaults
 */
export function validatePaymentReminderSearch(data: unknown): {
  success: boolean;
  data?: PaymentReminderSearchInput;
  errors?: z.ZodError;
} {
  const result = paymentReminderSearchSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Formats validation errors into a user-friendly object
 * Returns an object with field names as keys and error messages as values
 */
export function formatPaymentReminderErrors(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formattedErrors[path]) {
      formattedErrors[path] = issue.message;
    }
  }

  return formattedErrors;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if a reminder is overdue based on due_date
 */
export function isReminderOverdue(dueDate: string | Date): boolean {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

/**
 * Checks if a reminder is due within the specified number of days
 */
export function isReminderUpcoming(dueDate: string | Date, daysAhead: number = 7): boolean {
  const due = new Date(dueDate);
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  futureDate.setHours(0, 0, 0, 0);

  return due >= today && due <= futureDate;
}

/**
 * Calculates the new due date after snoozing
 */
export function calculateSnoozedDueDate(currentDueDate: string | Date, snoozeDays: number): string {
  const due = new Date(currentDueDate);
  due.setDate(due.getDate() + snoozeDays);
  const dateStr = due.toISOString().split('T')[0];
  // dateStr is guaranteed to exist since toISOString() always returns a valid ISO string
  return dateStr!;
}

/**
 * Gets the number of days until a reminder is due (negative if overdue)
 */
export function getDaysUntilDue(dueDate: string | Date): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
