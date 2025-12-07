/**
 * Expense Zod Validation Schemas
 * Validation schemas for expense forms and data operations
 *
 * These schemas match the database constraints defined in:
 * - expenses table
 * - expense_categories table
 * - recurring_expenses table
 * - expense_payments table
 *
 * Key status types:
 * - Payment status: unpaid, partial, paid
 * - Approval status: pending, approved, rejected
 * - Recurring status: active, paused, completed, cancelled
 * - Frequency: daily, weekly, monthly, yearly
 *
 * @module lib/utils/schemas/expense
 */

import { z } from 'zod';

import { uuidSchema, dateStringSchema } from '../validation';

// =============================================================================
// EXPENSE ENUMS
// =============================================================================

/**
 * Expense payment status - matches expenses.payment_status in database
 */
export const expensePaymentStatusEnum = z.enum(['unpaid', 'partial', 'paid'], {
  errorMap: () => ({
    message: 'Payment status must be unpaid, partial, or paid',
  }),
});

/**
 * Expense approval status - matches expenses.approval_status in database
 */
export const expenseApprovalStatusEnum = z.enum(['pending', 'approved', 'rejected'], {
  errorMap: () => ({
    message: 'Approval status must be pending, approved, or rejected',
  }),
});

/**
 * Expense category type - matches expense_categories.category_type in database
 */
export const expenseCategoryTypeEnum = z.enum(
  ['operational', 'administrative', 'marketing', 'payroll', 'inventory', 'utilities', 'other'],
  {
    errorMap: () => ({
      message:
        'Category type must be operational, administrative, marketing, payroll, inventory, utilities, or other',
    }),
  }
);

/**
 * Recurring expense frequency - matches recurring_expenses.frequency in database
 */
export const expenseFrequencyEnum = z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
  errorMap: () => ({
    message: 'Frequency must be daily, weekly, monthly, or yearly',
  }),
});

/**
 * Recurring expense status - matches recurring_expenses.status in database
 */
export const recurringExpenseStatusEnum = z.enum(['active', 'paused', 'completed', 'cancelled'], {
  errorMap: () => ({
    message: 'Status must be active, paused, completed, or cancelled',
  }),
});

/**
 * Expense payment type - matches expense_payments.payment_type in database
 */
export const expensePaymentTypeEnum = z.enum(['cash', 'card', 'bank_transfer', 'cheque', 'other'], {
  errorMap: () => ({
    message: 'Payment type must be cash, card, bank_transfer, cheque, or other',
  }),
});

/**
 * Cheque status for expense payments
 */
export const expenseChequeStatusEnum = z.enum(['pending', 'cleared', 'bounced', 'cancelled'], {
  errorMap: () => ({
    message: 'Cheque status must be pending, cleared, bounced, or cancelled',
  }),
});

// =============================================================================
// EXPENSE FIELD SCHEMAS
// =============================================================================

/**
 * Expense number validation - varchar, system-generated
 */
export const expenseNumberSchema = z
  .string()
  .min(1, 'Expense number is required')
  .max(50, 'Expense number cannot exceed 50 characters');

/**
 * Expense description validation - text, required
 */
export const expenseDescriptionSchema = z
  .string()
  .min(3, 'Description must be at least 3 characters')
  .max(1000, 'Description cannot exceed 1000 characters');

/**
 * Vendor name validation - varchar(255), optional
 */
export const vendorNameSchema = z
  .string()
  .max(255, 'Vendor name cannot exceed 255 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Expense amount validation - numeric(15,4), positive
 */
export const expenseAmountSchema = z
  .number()
  .positive('Amount must be greater than zero')
  .max(99999999999.9999, 'Amount is too large');

/**
 * Paid amount validation - non-negative
 */
export const paidAmountSchema = z
  .number()
  .min(0, 'Paid amount cannot be negative')
  .max(99999999999.9999, 'Amount is too large')
  .optional()
  .nullable();

/**
 * Expense date validation
 */
export const expenseDateSchema = dateStringSchema.describe('Expense date is required');

/**
 * Due date validation - optional
 */
export const dueDateSchema = z
  .string()
  .refine(
    (val) => {
      if (!val) {
        return true;
      }
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Invalid due date format' }
  )
  .optional()
  .nullable();

/**
 * Expense notes validation - text, optional
 */
export const expenseNotesSchema = z
  .string()
  .max(5000, 'Notes cannot exceed 5000 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Rejection reason validation
 */
export const rejectionReasonSchema = z
  .string()
  .min(1, 'Rejection reason is required')
  .max(1000, 'Rejection reason cannot exceed 1000 characters');

// =============================================================================
// EXPENSE CATEGORY FIELD SCHEMAS
// =============================================================================

/**
 * Category name validation - varchar(100), required
 */
export const expenseCategoryNameSchema = z
  .string()
  .min(2, 'Category name must be at least 2 characters')
  .max(100, 'Category name cannot exceed 100 characters');

/**
 * Category description validation - text, optional
 */
export const categoryDescriptionSchema = z
  .string()
  .max(500, 'Description cannot exceed 500 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Sort order validation - integer, optional
 */
export const sortOrderSchema = z
  .number()
  .int('Sort order must be a whole number')
  .min(0, 'Sort order cannot be negative')
  .max(9999, 'Sort order cannot exceed 9999')
  .optional()
  .nullable();

// =============================================================================
// RECURRING EXPENSE FIELD SCHEMAS
// =============================================================================

/**
 * Day of month validation (1-31)
 */
export const dayOfMonthSchema = z
  .number()
  .int('Day must be a whole number')
  .min(1, 'Day must be between 1 and 31')
  .max(31, 'Day must be between 1 and 31')
  .optional()
  .nullable();

/**
 * Day of week validation (0-6, Sunday=0)
 */
export const dayOfWeekSchema = z
  .number()
  .int('Day must be a whole number')
  .min(0, 'Day must be between 0 (Sunday) and 6 (Saturday)')
  .max(6, 'Day must be between 0 (Sunday) and 6 (Saturday)')
  .optional()
  .nullable();

// =============================================================================
// EXPENSE PAYMENT FIELD SCHEMAS
// =============================================================================

/**
 * Payment amount validation
 */
export const paymentAmountSchema = z
  .number()
  .positive('Payment amount must be greater than zero')
  .max(99999999999.9999, 'Amount is too large');

/**
 * Cheque number validation
 */
export const chequeNumberSchema = z
  .string()
  .max(50, 'Cheque number cannot exceed 50 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Bank name validation
 */
export const chequeBankSchema = z
  .string()
  .max(100, 'Bank name cannot exceed 100 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

// =============================================================================
// BASE EXPENSE SCHEMA
// =============================================================================

/**
 * Base expense object schema - without refinements
 */
const expenseBaseSchema = z.object({
  // Category (required)
  id_expense_category: uuidSchema.describe('Expense category is required'),

  // Description (required)
  description: expenseDescriptionSchema,

  // Vendor (optional)
  vendor_name: vendorNameSchema,

  // Amount (required)
  amount: expenseAmountSchema,

  // Dates
  expense_date: expenseDateSchema,
  due_date: dueDateSchema,

  // Notes (optional)
  notes: expenseNotesSchema,
});

// =============================================================================
// MAIN EXPENSE SCHEMAS
// =============================================================================

/**
 * Expense creation/edit schema
 * Use this for the main expense form
 */
export const expenseSchema = expenseBaseSchema;

/**
 * Expense creation schema with shop ID
 * Used when creating a new expense
 */
export const expenseCreateSchema = expenseBaseSchema.extend({
  // Shop ID (set programmatically)
  id_shop: uuidSchema.optional(),
  // Expense number (can be auto-generated)
  expense_number: expenseNumberSchema.optional(),
  // Link to recurring expense if generated from one
  id_recurring_expense: uuidSchema.optional().nullable(),
  // File upload reference
  id_file_upload: uuidSchema.optional().nullable(),
});

/**
 * Expense update schema - all fields optional
 * Used for partial updates
 */
export const expenseUpdateSchema = expenseBaseSchema.partial().extend({
  // ID is required for updates
  id_expense: uuidSchema.describe('Expense ID is required for updates'),
});

// =============================================================================
// EXPENSE APPROVAL SCHEMAS
// =============================================================================

/**
 * Expense approval schema
 * Used when approving an expense
 */
export const expenseApprovalSchema = z.object({
  id_expense: uuidSchema.describe('Expense ID is required'),
});

/**
 * Expense rejection schema
 * Used when rejecting an expense
 */
export const expenseRejectionSchema = z.object({
  id_expense: uuidSchema.describe('Expense ID is required'),
  rejection_reason: rejectionReasonSchema,
});

// =============================================================================
// EXPENSE CATEGORY SCHEMAS
// =============================================================================

/**
 * Expense category base schema
 */
const expenseCategoryBaseSchema = z.object({
  category_name: expenseCategoryNameSchema,
  category_type: expenseCategoryTypeEnum,
  description: categoryDescriptionSchema,
  is_taxable: z.boolean().default(true),
  sort_order: sortOrderSchema,
  is_active: z.boolean().default(true),
});

/**
 * Expense category schema for creation/edit
 */
export const expenseCategorySchema = expenseCategoryBaseSchema;

/**
 * Expense category creation schema with shop ID
 */
export const expenseCategoryCreateSchema = expenseCategoryBaseSchema.extend({
  id_shop: uuidSchema.optional(),
});

/**
 * Expense category update schema
 */
export const expenseCategoryUpdateSchema = expenseCategoryBaseSchema.partial().extend({
  id_expense_category: uuidSchema.describe('Category ID is required for updates'),
});

// =============================================================================
// RECURRING EXPENSE SCHEMAS
// =============================================================================

/**
 * Recurring expense base schema
 */
const recurringExpenseBaseSchema = z.object({
  // Category (required)
  id_expense_category: uuidSchema.describe('Expense category is required'),

  // Description (required)
  description: expenseDescriptionSchema,

  // Vendor (optional)
  vendor_name: vendorNameSchema,

  // Amount (required)
  amount: expenseAmountSchema,

  // Frequency (required)
  frequency: expenseFrequencyEnum,

  // Auto-generate expenses
  is_auto_generate: z.boolean().default(true),

  // Schedule configuration
  day_of_month: dayOfMonthSchema,
  day_of_week: dayOfWeekSchema,

  // Date range
  start_date: dateStringSchema.describe('Start date is required'),
  end_date: dueDateSchema,

  // Notes (optional)
  notes: expenseNotesSchema,
});

/**
 * Recurring expense schema for creation/edit
 */
export const recurringExpenseSchema = recurringExpenseBaseSchema
  .refine(
    (data) => {
      // Validate day_of_month is set for monthly/yearly frequency
      if ((data.frequency === 'monthly' || data.frequency === 'yearly') && !data.day_of_month) {
        return false;
      }
      return true;
    },
    {
      message: 'Day of month is required for monthly and yearly recurring expenses',
      path: ['day_of_month'],
    }
  )
  .refine(
    (data) => {
      // Validate day_of_week is set for weekly frequency
      if (data.frequency === 'weekly' && data.day_of_week === null) {
        return false;
      }
      return true;
    },
    {
      message: 'Day of week is required for weekly recurring expenses',
      path: ['day_of_week'],
    }
  );

/**
 * Recurring expense creation schema with shop ID
 */
export const recurringExpenseCreateSchema = recurringExpenseBaseSchema.extend({
  id_shop: uuidSchema.optional(),
  // Next due date will be calculated
  next_due_date: dateStringSchema.optional(),
});

/**
 * Recurring expense update schema
 */
export const recurringExpenseUpdateSchema = recurringExpenseBaseSchema.partial().extend({
  id_recurring_expense: uuidSchema.describe('Recurring expense ID is required for updates'),
});

/**
 * Recurring expense pause/resume schema
 */
export const recurringExpenseStatusChangeSchema = z.object({
  id_recurring_expense: uuidSchema.describe('Recurring expense ID is required'),
  status: recurringExpenseStatusEnum,
});

// =============================================================================
// EXPENSE PAYMENT SCHEMAS
// =============================================================================

/**
 * Expense payment schema for recording payments
 */
export const expensePaymentSchema = z
  .object({
    // Expense to pay
    id_expense: uuidSchema.describe('Expense ID is required'),

    // Payment type
    payment_type: expensePaymentTypeEnum,

    // Payment amount
    amount: paymentAmountSchema,

    // Payment date
    payment_date: dateStringSchema.describe('Payment date is required'),

    // Cheque details (optional, required if payment_type is cheque)
    cheque_number: chequeNumberSchema,
    cheque_date: dueDateSchema,
    cheque_bank: chequeBankSchema,
    cheque_status: expenseChequeStatusEnum.optional().nullable(),

    // Notes (optional)
    notes: expenseNotesSchema,
  })
  .refine(
    (data) => {
      // If payment type is cheque, cheque_number is required
      if (data.payment_type === 'cheque' && !data.cheque_number) {
        return false;
      }
      return true;
    },
    {
      message: 'Cheque number is required for cheque payments',
      path: ['cheque_number'],
    }
  );

// =============================================================================
// EXPENSE SEARCH/FILTER SCHEMAS
// =============================================================================

/**
 * Expense search base schema for filtering expense lists
 */
const expenseSearchBaseSchema = z.object({
  // Text search (searches description, vendor_name, expense_number)
  search: z
    .string()
    .max(255, 'Search query cannot exceed 255 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),

  // Filter by category
  id_expense_category: uuidSchema.optional().nullable(),

  // Filter by payment status
  payment_status: expensePaymentStatusEnum.optional(),

  // Filter by approval status
  approval_status: expenseApprovalStatusEnum.optional(),

  // Filter by date range
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),

  // Filter by amount range
  amount_min: z.number().min(0, 'Minimum amount cannot be negative').optional(),
  amount_max: z.number().max(99999999999.9999, 'Maximum amount is too large').optional(),

  // Sorting
  sort_by: z
    .enum([
      'expense_date',
      'amount',
      'description',
      'vendor_name',
      'payment_status',
      'approval_status',
      'created_at',
      'updated_at',
    ])
    .optional()
    .default('expense_date'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),

  // Pagination
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

/**
 * Expense search schema with range validations
 */
export const expenseSearchSchema = expenseSearchBaseSchema
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
  )
  .refine(
    (data) => {
      // Validate date range
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) <= new Date(data.end_date);
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['end_date'],
    }
  );

/**
 * Recurring expense search schema
 */
export const recurringExpenseSearchSchema = z.object({
  // Text search
  search: z
    .string()
    .max(255, 'Search query cannot exceed 255 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),

  // Filter by category
  id_expense_category: uuidSchema.optional().nullable(),

  // Filter by status
  status: recurringExpenseStatusEnum.optional(),

  // Filter by frequency
  frequency: expenseFrequencyEnum.optional(),

  // Sorting
  sort_by: z
    .enum(['description', 'amount', 'frequency', 'next_due_date', 'status', 'created_at'])
    .optional()
    .default('next_due_date'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),

  // Pagination
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

// =============================================================================
// EXPENSE QUICK ADD SCHEMA
// =============================================================================

/**
 * Simplified expense schema for quick add (minimal fields)
 */
export const expenseQuickAddSchema = z.object({
  id_expense_category: uuidSchema.describe('Expense category is required'),
  description: expenseDescriptionSchema,
  amount: expenseAmountSchema,
  expense_date: expenseDateSchema,
  vendor_name: vendorNameSchema,
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Enum types
export type ExpensePaymentStatus = z.infer<typeof expensePaymentStatusEnum>;
export type ExpenseApprovalStatus = z.infer<typeof expenseApprovalStatusEnum>;
export type ExpenseCategoryType = z.infer<typeof expenseCategoryTypeEnum>;
export type ExpenseFrequency = z.infer<typeof expenseFrequencyEnum>;
export type RecurringExpenseStatus = z.infer<typeof recurringExpenseStatusEnum>;
export type ExpensePaymentType = z.infer<typeof expensePaymentTypeEnum>;
export type ExpenseChequeStatus = z.infer<typeof expenseChequeStatusEnum>;

// Schema input types
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
export type ExpenseQuickAddInput = z.infer<typeof expenseQuickAddSchema>;

export type ExpenseApprovalInput = z.infer<typeof expenseApprovalSchema>;
export type ExpenseRejectionInput = z.infer<typeof expenseRejectionSchema>;

export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
export type ExpenseCategoryCreateInput = z.infer<typeof expenseCategoryCreateSchema>;
export type ExpenseCategoryUpdateInput = z.infer<typeof expenseCategoryUpdateSchema>;

export type RecurringExpenseInput = z.infer<typeof recurringExpenseSchema>;
export type RecurringExpenseCreateInput = z.infer<typeof recurringExpenseCreateSchema>;
export type RecurringExpenseUpdateInput = z.infer<typeof recurringExpenseUpdateSchema>;
export type RecurringExpenseStatusChangeInput = z.infer<typeof recurringExpenseStatusChangeSchema>;

export type ExpensePaymentInput = z.infer<typeof expensePaymentSchema>;

export type ExpenseSearchInput = z.infer<typeof expenseSearchSchema>;
export type RecurringExpenseSearchInput = z.infer<typeof recurringExpenseSearchSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates expense data and returns typed result
 */
export function validateExpense(data: unknown): {
  success: boolean;
  data?: ExpenseInput;
  errors?: z.ZodError;
} {
  const result = expenseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates expense quick add data and returns typed result
 */
export function validateExpenseQuickAdd(data: unknown): {
  success: boolean;
  data?: ExpenseQuickAddInput;
  errors?: z.ZodError;
} {
  const result = expenseQuickAddSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates expense category data and returns typed result
 */
export function validateExpenseCategory(data: unknown): {
  success: boolean;
  data?: ExpenseCategoryInput;
  errors?: z.ZodError;
} {
  const result = expenseCategorySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates recurring expense data and returns typed result
 */
export function validateRecurringExpense(data: unknown): {
  success: boolean;
  data?: RecurringExpenseInput;
  errors?: z.ZodError;
} {
  const result = recurringExpenseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates expense payment data and returns typed result
 */
export function validateExpensePayment(data: unknown): {
  success: boolean;
  data?: ExpensePaymentInput;
  errors?: z.ZodError;
} {
  const result = expensePaymentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates expense search/filter data and returns typed result with defaults
 */
export function validateExpenseSearch(data: unknown): {
  success: boolean;
  data?: ExpenseSearchInput;
  errors?: z.ZodError;
} {
  const result = expenseSearchSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Formats validation errors into a user-friendly object
 * Returns an object with field names as keys and error messages as values
 */
export function formatExpenseErrors(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formattedErrors[path]) {
      formattedErrors[path] = issue.message;
    }
  }

  return formattedErrors;
}

/**
 * Determines payment status based on amount and paid amount
 */
export function determineExpensePaymentStatus(
  amount: number,
  paidAmount: number
): ExpensePaymentStatus {
  if (paidAmount >= amount) {
    return 'paid';
  }
  if (paidAmount > 0) {
    return 'partial';
  }
  return 'unpaid';
}

/**
 * Calculates the next due date for a recurring expense
 */
export function calculateNextDueDate(
  startDate: string,
  frequency: ExpenseFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date {
  const date = new Date(startDate);

  switch (frequency) {
    case 'daily':
      return date;
    case 'weekly':
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        const currentDay = date.getDay();
        const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
        date.setDate(date.getDate() + daysUntilTarget);
      }
      return date;
    case 'monthly':
      if (dayOfMonth) {
        date.setDate(Math.min(dayOfMonth, getDaysInMonth(date)));
      }
      return date;
    case 'yearly':
      if (dayOfMonth) {
        date.setDate(Math.min(dayOfMonth, getDaysInMonth(date)));
      }
      return date;
    default:
      return date;
  }
}

/**
 * Helper function to get days in a month
 */
function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
