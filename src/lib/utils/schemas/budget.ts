/**
 * Budget Zod Validation Schemas
 * Validation schemas for budget management forms and data operations
 *
 * These schemas match the database constraints defined in:
 * - budget_categories table
 * - budget_allocations table
 * - budget_transactions table (immutable ledger)
 *
 * Key features:
 * - Budget categories for organizing expenses
 * - Budget allocations for time periods
 * - Period validation (start_date <= end_date)
 * - Amount validation (positive numbers)
 *
 * @module lib/utils/schemas/budget
 */

import { z } from 'zod';

import { uuidSchema, dateStringSchema } from '../validation';

// =============================================================================
// BUDGET ENUMS
// =============================================================================

/**
 * Budget type enum - matches budget_categories.budget_type in database
 */
export const budgetTypeEnum = z.enum(
  ['operational', 'capital', 'marketing', 'salary', 'inventory', 'maintenance', 'other'],
  {
    errorMap: () => ({
      message:
        'Budget type must be operational, capital, marketing, salary, inventory, maintenance, or other',
    }),
  }
);

/**
 * Budget frequency enum - matches budget_categories.default_frequency in database
 */
export const budgetFrequencyEnum = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], {
  errorMap: () => ({
    message: 'Frequency must be daily, weekly, monthly, quarterly, or yearly',
  }),
});

/**
 * Budget allocation status enum - matches budget_allocations.status in database
 */
export const budgetAllocationStatusEnum = z.enum(['active', 'closed', 'cancelled'], {
  errorMap: () => ({
    message: 'Status must be active, closed, or cancelled',
  }),
});

/**
 * Budget transaction type enum - matches budget_transactions.transaction_type in database
 */
export const budgetTransactionTypeEnum = z.enum(
  ['allocation', 'expense', 'adjustment', 'rollover', 'refund'],
  {
    errorMap: () => ({
      message: 'Transaction type must be allocation, expense, adjustment, rollover, or refund',
    }),
  }
);

/**
 * Budget transaction approval status enum - matches budget_transactions.approval_status
 */
export const budgetApprovalStatusEnum = z.enum(
  ['pending', 'approved', 'rejected', 'auto_approved'],
  {
    errorMap: () => ({
      message: 'Approval status must be pending, approved, rejected, or auto_approved',
    }),
  }
);

// =============================================================================
// BUDGET CATEGORY FIELD SCHEMAS
// =============================================================================

/**
 * Category name validation - varchar(255), required
 */
export const budgetCategoryNameSchema = z
  .string()
  .min(2, 'Category name must be at least 2 characters')
  .max(255, 'Category name cannot exceed 255 characters');

/**
 * Budget description validation - text, optional
 */
export const budgetDescriptionSchema = z
  .string()
  .max(2000, 'Description cannot exceed 2000 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Default amount validation - numeric, non-negative
 */
export const defaultAmountSchema = z
  .number()
  .min(0, 'Default amount cannot be negative')
  .max(99999999999.9999, 'Default amount is too large')
  .optional()
  .nullable()
  .default(0);

/**
 * Approval threshold validation - numeric, positive when set
 */
export const approvalThresholdSchema = z
  .number()
  .positive('Approval threshold must be positive')
  .max(99999999999.9999, 'Approval threshold is too large')
  .optional()
  .nullable();

/**
 * Sort order validation - integer
 */
export const sortOrderSchema = z
  .number()
  .int('Sort order must be a whole number')
  .min(0, 'Sort order cannot be negative')
  .max(9999, 'Sort order is too large')
  .optional()
  .default(0);

// =============================================================================
// BUDGET ALLOCATION FIELD SCHEMAS
// =============================================================================

/**
 * Allocated amount validation - numeric, positive
 */
export const allocatedAmountSchema = z
  .number()
  .positive('Allocated amount must be greater than zero')
  .max(99999999999.9999, 'Allocated amount is too large');

/**
 * Used amount validation - numeric, non-negative
 */
export const usedAmountSchema = z
  .number()
  .min(0, 'Used amount cannot be negative')
  .max(99999999999.9999, 'Used amount is too large')
  .optional()
  .default(0);

/**
 * Rollover amount validation - numeric, non-negative
 */
export const rolloverAmountSchema = z
  .number()
  .min(0, 'Rollover amount cannot be negative')
  .max(99999999999.9999, 'Rollover amount is too large')
  .optional()
  .default(0);

/**
 * Budget notes validation - text, optional
 */
export const budgetNotesSchema = z
  .string()
  .max(5000, 'Notes cannot exceed 5000 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

// =============================================================================
// BUDGET TRANSACTION FIELD SCHEMAS
// =============================================================================

/**
 * Transaction amount validation - numeric, positive
 */
export const transactionAmountSchema = z
  .number()
  .positive('Transaction amount must be greater than zero')
  .max(99999999999.9999, 'Transaction amount is too large');

/**
 * Transaction description validation - text, required
 */
export const transactionDescriptionSchema = z
  .string()
  .min(1, 'Transaction description is required')
  .max(2000, 'Transaction description cannot exceed 2000 characters');

// =============================================================================
// BUDGET CATEGORY SCHEMA
// =============================================================================

/**
 * Budget category base schema
 */
const budgetCategoryBaseSchema = z.object({
  // Required fields
  category_name: budgetCategoryNameSchema,
  budget_type: budgetTypeEnum,

  // Optional fields
  description: budgetDescriptionSchema,
  default_amount: defaultAmountSchema,
  default_frequency: budgetFrequencyEnum.optional().default('monthly'),
  requires_approval: z.boolean().optional().default(false),
  approval_threshold: approvalThresholdSchema,
  is_active: z.boolean().optional().default(true),
  sort_order: sortOrderSchema,
});

/**
 * Budget category schema for form validation
 */
export const budgetCategorySchema = budgetCategoryBaseSchema;

/**
 * Budget category creation schema with shop ID
 */
export const budgetCategoryCreateSchema = budgetCategoryBaseSchema.extend({
  id_shop: uuidSchema.optional(),
});

/**
 * Budget category update schema - all fields optional
 */
export const budgetCategoryUpdateSchema = budgetCategoryBaseSchema.partial().extend({
  id_budget_category: uuidSchema.optional(),
});

// =============================================================================
// BUDGET ALLOCATION SCHEMA
// =============================================================================

/**
 * Budget allocation base schema
 */
const budgetAllocationBaseSchema = z.object({
  // Required fields
  id_budget_category: uuidSchema.describe('Budget category is required'),
  period_start: dateStringSchema.describe('Period start date is required'),
  period_end: dateStringSchema.describe('Period end date is required'),
  allocated_amount: allocatedAmountSchema,

  // Optional fields
  id_user: uuidSchema.optional().nullable(), // For user-specific budgets
  rollover_enabled: z.boolean().optional().default(false),
  rollover_amount: rolloverAmountSchema,
  status: budgetAllocationStatusEnum.optional().default('active'),
  notes: budgetNotesSchema,
});

/**
 * Budget allocation schema with period validation
 */
export const budgetAllocationSchema = budgetAllocationBaseSchema.refine(
  (data) => {
    const startDate = new Date(data.period_start);
    const endDate = new Date(data.period_end);
    return startDate <= endDate;
  },
  {
    message: 'Period start date must be before or equal to period end date',
    path: ['period_end'],
  }
);

/**
 * Budget allocation creation schema with shop ID
 */
export const budgetAllocationCreateSchema = budgetAllocationBaseSchema
  .extend({
    id_shop: uuidSchema.optional(),
  })
  .refine(
    (data) => {
      const startDate = new Date(data.period_start);
      const endDate = new Date(data.period_end);
      return startDate <= endDate;
    },
    {
      message: 'Period start date must be before or equal to period end date',
      path: ['period_end'],
    }
  );

/**
 * Budget allocation update schema - all fields optional except ID
 */
export const budgetAllocationUpdateSchema = budgetAllocationBaseSchema
  .partial()
  .extend({
    id_budget_allocation: uuidSchema.optional(),
  })
  .refine(
    (data) => {
      // Only validate if both dates are provided
      if (data.period_start && data.period_end) {
        const startDate = new Date(data.period_start);
        const endDate = new Date(data.period_end);
        return startDate <= endDate;
      }
      return true;
    },
    {
      message: 'Period start date must be before or equal to period end date',
      path: ['period_end'],
    }
  );

/**
 * Budget adjustment schema - for modifying allocation amount
 */
export const budgetAdjustmentSchema = z.object({
  id_budget_allocation: uuidSchema.describe('Budget allocation is required'),
  adjustment_amount: z
    .number()
    .refine((val) => val !== 0, 'Adjustment amount cannot be zero')
    .refine((val) => Math.abs(val) <= 99999999999.9999, 'Adjustment amount is too large'),
  reason: z
    .string()
    .min(1, 'Adjustment reason is required')
    .max(1000, 'Adjustment reason cannot exceed 1000 characters'),
});

/**
 * Budget transfer schema - for transferring budget between allocations
 */
export const budgetTransferSchema = z
  .object({
    from_allocation_id: uuidSchema.describe('Source allocation is required'),
    to_allocation_id: uuidSchema.describe('Destination allocation is required'),
    amount: z
      .number()
      .positive('Transfer amount must be positive')
      .max(99999999999.9999, 'Transfer amount is too large'),
    reason: z
      .string()
      .min(1, 'Transfer reason is required')
      .max(1000, 'Transfer reason cannot exceed 1000 characters'),
  })
  .refine((data) => data.from_allocation_id !== data.to_allocation_id, {
    message: 'Cannot transfer to the same allocation',
    path: ['to_allocation_id'],
  });

// =============================================================================
// BUDGET TRANSACTION SCHEMA (IMMUTABLE LEDGER)
// =============================================================================

/**
 * Budget transaction schema for recording expenses against allocations
 * NOTE: budget_transactions is IMMUTABLE - only INSERT operations allowed
 */
export const budgetTransactionSchema = z.object({
  // Required fields
  id_budget_allocation: uuidSchema.describe('Budget allocation is required'),
  transaction_type: budgetTransactionTypeEnum,
  amount: transactionAmountSchema,
  description: transactionDescriptionSchema,

  // Optional fields
  id_expense: uuidSchema.optional().nullable(), // Link to expense record
  approval_status: budgetApprovalStatusEnum.optional().default('auto_approved'),
});

/**
 * Budget transaction creation schema with shop ID
 */
export const budgetTransactionCreateSchema = budgetTransactionSchema.extend({
  id_shop: uuidSchema.optional(),
});

// =============================================================================
// BUDGET SEARCH/FILTER SCHEMAS
// =============================================================================

/**
 * Budget category search base schema
 */
const budgetCategorySearchBaseSchema = z.object({
  // Text search
  search: z
    .string()
    .max(255, 'Search query cannot exceed 255 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),

  // Filters
  budget_type: budgetTypeEnum.optional(),
  is_active: z.boolean().optional(),
  requires_approval: z.boolean().optional(),

  // Sorting
  sort_by: z
    .enum(['category_name', 'budget_type', 'default_amount', 'sort_order', 'created_at'])
    .optional()
    .default('sort_order'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),

  // Pagination
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

/**
 * Budget category search schema
 */
export const budgetCategorySearchSchema = budgetCategorySearchBaseSchema;

/**
 * Budget allocation search base schema
 */
const budgetAllocationSearchBaseSchema = z.object({
  // Filter by category
  id_budget_category: uuidSchema.optional(),

  // Filter by user
  id_user: uuidSchema.optional().nullable(),

  // Date filters
  period_contains: dateStringSchema.optional(), // Find allocations containing this date
  period_start_after: dateStringSchema.optional(),
  period_end_before: dateStringSchema.optional(),

  // Status filter
  status: budgetAllocationStatusEnum.optional(),

  // Amount filters
  min_allocated: z.number().min(0).optional(),
  max_allocated: z.number().max(99999999999.9999).optional(),
  min_remaining: z.number().optional(), // Can be negative for over-budget
  max_remaining: z.number().optional(),

  // Over budget filter
  is_over_budget: z.boolean().optional(),

  // Sorting
  sort_by: z
    .enum([
      'period_start',
      'period_end',
      'allocated_amount',
      'used_amount',
      'remaining_amount',
      'created_at',
    ])
    .optional()
    .default('period_start'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),

  // Pagination
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

/**
 * Budget allocation search schema with amount range validation
 */
export const budgetAllocationSearchSchema = budgetAllocationSearchBaseSchema.refine(
  (data) => {
    // Validate allocated amount range
    if (data.min_allocated !== undefined && data.max_allocated !== undefined) {
      return data.min_allocated <= data.max_allocated;
    }
    return true;
  },
  {
    message: 'Minimum allocated amount must be less than or equal to maximum',
    path: ['max_allocated'],
  }
);

/**
 * Budget vs actual query schema - for comparing budget to expenses
 */
export const budgetVsActualQuerySchema = z.object({
  // Required period
  period_start: dateStringSchema.describe('Period start is required'),
  period_end: dateStringSchema.describe('Period end is required'),

  // Optional filters
  id_budget_category: uuidSchema.optional(),
  id_expense_category: uuidSchema.optional(),
  id_user: uuidSchema.optional().nullable(),

  // Include/exclude options
  include_inactive_categories: z.boolean().optional().default(false),
  include_unbudgeted_expenses: z.boolean().optional().default(true),
});

// =============================================================================
// PERIOD VALIDATION HELPERS
// =============================================================================

/**
 * Period schema with date range validation
 */
export const budgetPeriodSchema = z
  .object({
    period_start: dateStringSchema,
    period_end: dateStringSchema,
  })
  .refine(
    (data) => {
      const startDate = new Date(data.period_start);
      const endDate = new Date(data.period_end);
      return startDate <= endDate;
    },
    {
      message: 'Period start date must be before or equal to period end date',
      path: ['period_end'],
    }
  );

/**
 * Monthly period helper - generates start and end for a given month
 */
export const monthlyPeriodSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
  })
  .transform((data) => {
    const startDate = new Date(data.year, data.month - 1, 1);
    const endDate = new Date(data.year, data.month, 0); // Last day of month
    return {
      period_start: startDate.toISOString().split('T')[0],
      period_end: endDate.toISOString().split('T')[0],
    };
  });

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Enum types
export type BudgetType = z.infer<typeof budgetTypeEnum>;
export type BudgetFrequency = z.infer<typeof budgetFrequencyEnum>;
export type BudgetAllocationStatus = z.infer<typeof budgetAllocationStatusEnum>;
export type BudgetTransactionType = z.infer<typeof budgetTransactionTypeEnum>;
export type BudgetApprovalStatus = z.infer<typeof budgetApprovalStatusEnum>;

// Schema input types
export type BudgetCategoryInput = z.infer<typeof budgetCategorySchema>;
export type BudgetCategoryCreateInput = z.infer<typeof budgetCategoryCreateSchema>;
export type BudgetCategoryUpdateInput = z.infer<typeof budgetCategoryUpdateSchema>;

export type BudgetAllocationInput = z.infer<typeof budgetAllocationSchema>;
export type BudgetAllocationCreateInput = z.infer<typeof budgetAllocationCreateSchema>;
export type BudgetAllocationUpdateInput = z.infer<typeof budgetAllocationUpdateSchema>;
export type BudgetAdjustmentInput = z.infer<typeof budgetAdjustmentSchema>;
export type BudgetTransferInput = z.infer<typeof budgetTransferSchema>;

export type BudgetTransactionInput = z.infer<typeof budgetTransactionSchema>;
export type BudgetTransactionCreateInput = z.infer<typeof budgetTransactionCreateSchema>;

export type BudgetCategorySearchInput = z.infer<typeof budgetCategorySearchSchema>;
export type BudgetAllocationSearchInput = z.infer<typeof budgetAllocationSearchSchema>;
export type BudgetVsActualQueryInput = z.infer<typeof budgetVsActualQuerySchema>;
export type BudgetPeriodInput = z.infer<typeof budgetPeriodSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates budget category data and returns typed result
 */
export function validateBudgetCategory(data: unknown): {
  success: boolean;
  data?: BudgetCategoryInput;
  errors?: z.ZodError;
} {
  const result = budgetCategorySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates budget allocation data and returns typed result
 */
export function validateBudgetAllocation(data: unknown): {
  success: boolean;
  data?: BudgetAllocationInput;
  errors?: z.ZodError;
} {
  const result = budgetAllocationSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates budget adjustment data and returns typed result
 */
export function validateBudgetAdjustment(data: unknown): {
  success: boolean;
  data?: BudgetAdjustmentInput;
  errors?: z.ZodError;
} {
  const result = budgetAdjustmentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates budget transfer data and returns typed result
 */
export function validateBudgetTransfer(data: unknown): {
  success: boolean;
  data?: BudgetTransferInput;
  errors?: z.ZodError;
} {
  const result = budgetTransferSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates budget transaction data and returns typed result
 */
export function validateBudgetTransaction(data: unknown): {
  success: boolean;
  data?: BudgetTransactionInput;
  errors?: z.ZodError;
} {
  const result = budgetTransactionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates budget period and returns typed result
 */
export function validateBudgetPeriod(data: unknown): {
  success: boolean;
  data?: BudgetPeriodInput;
  errors?: z.ZodError;
} {
  const result = budgetPeriodSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Formats validation errors into a user-friendly object
 */
export function formatBudgetErrors(error: z.ZodError): Record<string, string> {
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
 * Helper to calculate remaining budget
 */
export function calculateRemainingBudget(
  allocated: number,
  used: number,
  rollover: number = 0
): number {
  return allocated + rollover - used;
}

/**
 * Helper to check if budget is over limit
 */
export function isOverBudget(allocated: number, used: number, rollover: number = 0): boolean {
  return calculateRemainingBudget(allocated, used, rollover) < 0;
}

/**
 * Helper to calculate budget utilization percentage
 */
export function calculateBudgetUtilization(
  allocated: number,
  used: number,
  rollover: number = 0
): number {
  const totalBudget = allocated + rollover;
  if (totalBudget === 0) {
    return 0;
  }
  return (used / totalBudget) * 100;
}
