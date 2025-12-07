/**
 * Purchase Zod Validation Schemas
 * Validation schemas for purchase forms and data operations
 *
 * These schemas match the database constraints defined in:
 * - purchases table
 *
 * Key fields:
 * - purchase_number (required, format: PO-YYYYMMDD-SEQUENCE)
 * - purchase_date (required, YYYY-MM-DD format)
 * - currency (required, 3-letter ISO code)
 * - payment_status (enum: unpaid, partial, paid)
 *
 * @module lib/utils/schemas/purchase
 */

import { z } from 'zod';

import { uuidSchema, notesSchema, dateStringSchema } from '../validation';
import { currencyCodeSchema } from './inventory';

// =============================================================================
// PURCHASE ENUMS
// =============================================================================

/**
 * Payment status enum - matches purchases.payment_status in database
 * Tracks how much of the purchase has been paid
 */
export const purchasePaymentStatusEnum = z.enum(['unpaid', 'partial', 'paid'], {
  errorMap: () => ({ message: 'Payment status must be unpaid, partial, or paid' }),
});

// =============================================================================
// PURCHASE FIELD SCHEMAS
// =============================================================================

/**
 * Purchase number validation - varchar(50)
 * Format: PO-YYYYMMDD-SEQUENCE (e.g., PO-20241204-0001)
 */
export const purchaseNumberSchema = z
  .string()
  .min(1, 'Purchase number is required')
  .max(50, 'Purchase number cannot exceed 50 characters')
  .regex(/^PO-\d{8}-\d{4}$/, 'Purchase number must follow format: PO-YYYYMMDD-SEQUENCE');

/**
 * Invoice number validation - varchar(100), optional
 * The supplier's invoice number reference
 */
export const invoiceNumberSchema = z
  .string()
  .max(100, 'Invoice number cannot exceed 100 characters')
  .optional()
  .nullable();

/**
 * Purchase date validation - required, YYYY-MM-DD format
 */
export const purchaseDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Purchase date must be in YYYY-MM-DD format')
  .refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Invalid purchase date' }
  );

/**
 * Total items validation - integer, non-negative
 */
export const totalItemsSchema = z
  .number()
  .int('Total items must be a whole number')
  .min(0, 'Total items cannot be negative')
  .default(0);

/**
 * Total weight in grams validation - numeric(15,4), non-negative
 */
export const totalWeightGramsSchema = z
  .number()
  .min(0, 'Total weight cannot be negative')
  .max(9999999999.9999, 'Total weight is too large')
  .default(0);

/**
 * Amount validation - numeric(15,4), must be non-negative
 * Used for total_amount, paid_amount
 */
export const purchaseAmountSchema = z
  .number()
  .min(0, 'Amount cannot be negative')
  .max(99999999999.9999, 'Amount is too large');

/**
 * Required positive amount validation
 */
export const positiveAmountSchema = z
  .number()
  .positive('Amount must be greater than 0')
  .max(99999999999.9999, 'Amount is too large');

// =============================================================================
// MAIN PURCHASE SCHEMA
// =============================================================================

/**
 * Base purchase schema for form validation
 * Matches purchases table structure
 */
const purchaseBaseSchema = z.object({
  // Supplier reference (required)
  id_supplier: uuidSchema.describe('Supplier ID is required'),

  // Purchase details
  invoice_number: invoiceNumberSchema,
  purchase_date: purchaseDateSchema,
  currency: currencyCodeSchema,

  // Amounts (calculated fields)
  total_items: totalItemsSchema.optional(),
  total_weight_grams: totalWeightGramsSchema.optional(),
  total_amount: purchaseAmountSchema,
  paid_amount: purchaseAmountSchema.default(0),

  // Status
  payment_status: purchasePaymentStatusEnum.optional().default('unpaid'),

  // Notes
  notes: notesSchema,
});

/**
 * Purchase creation schema
 * Used when creating a new purchase
 */
export const purchaseSchema = purchaseBaseSchema;

/**
 * Purchase creation schema with shop ID
 * Used when creating a new purchase programmatically
 */
export const purchaseCreateSchema = purchaseBaseSchema.extend({
  // Shop ID is required for creation (set programmatically)
  id_shop: uuidSchema.optional(),
});

/**
 * Purchase update schema - partial updates
 * All fields optional for PATCH-style updates
 */
export const purchaseUpdateSchema = z.object({
  // Allowed update fields
  id_supplier: uuidSchema.optional(),
  invoice_number: invoiceNumberSchema,
  purchase_date: purchaseDateSchema.optional(),
  total_items: totalItemsSchema.optional(),
  total_weight_grams: totalWeightGramsSchema.optional(),
  total_amount: purchaseAmountSchema.optional(),
  paid_amount: purchaseAmountSchema.optional(),
  payment_status: purchasePaymentStatusEnum.optional(),
  notes: notesSchema,
});

/**
 * Record payment schema - for recording payments against a purchase
 */
export const recordPurchasePaymentSchema = z.object({
  id_purchase: uuidSchema.describe('Purchase ID is required'),
  amount: positiveAmountSchema,
  payment_date: purchaseDateSchema.optional(),
  notes: notesSchema,
});

// =============================================================================
// PURCHASE FILTER SCHEMA
// =============================================================================

/**
 * Date range schema for filtering
 */
export const purchaseDateRangeSchema = z
  .object({
    start_date: dateStringSchema.optional(),
    end_date: dateStringSchema.optional(),
  })
  .refine(
    (data) => {
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
 * Amount range schema for filtering
 */
export const purchaseAmountRangeSchema = z
  .object({
    min: purchaseAmountSchema.optional(),
    max: purchaseAmountSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.min !== undefined && data.max !== undefined) {
        return data.min <= data.max;
      }
      return true;
    },
    {
      message: 'Minimum amount must be less than or equal to maximum amount',
      path: ['max'],
    }
  )
  .optional();

/**
 * Purchase filter schema for search/filter forms
 */
export const purchaseFilterSchema = z.object({
  // Text search (purchase number, invoice number)
  search: z
    .string()
    .max(255, 'Search query cannot exceed 255 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),

  // Supplier filter
  id_supplier: uuidSchema.optional(),

  // Payment status filter
  payment_status: z.array(purchasePaymentStatusEnum).optional(),

  // Date range filter
  date_range: purchaseDateRangeSchema.optional(),

  // Amount range filter
  amount_range: purchaseAmountRangeSchema,

  // Currency filter
  currency: z.array(currencyCodeSchema).optional(),

  // Boolean filters
  is_fully_paid: z.boolean().optional(),

  // Sorting
  sort_by: z
    .enum([
      'purchase_number',
      'purchase_date',
      'total_amount',
      'paid_amount',
      'payment_status',
      'created_at',
      'updated_at',
    ])
    .optional()
    .default('purchase_date'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),

  // Pagination
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Enum types
export type PurchasePaymentStatus = z.infer<typeof purchasePaymentStatusEnum>;

// Schema input types
export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type PurchaseCreateInput = z.infer<typeof purchaseCreateSchema>;
export type PurchaseUpdateInput = z.infer<typeof purchaseUpdateSchema>;
export type RecordPurchasePaymentInput = z.infer<typeof recordPurchasePaymentSchema>;

export type PurchaseFilterInput = z.infer<typeof purchaseFilterSchema>;
export type PurchaseDateRangeInput = z.infer<typeof purchaseDateRangeSchema>;
export type PurchaseAmountRangeInput = z.infer<typeof purchaseAmountRangeSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates purchase data and returns typed result
 */
export function validatePurchase(data: unknown): {
  success: boolean;
  data?: PurchaseInput;
  errors?: z.ZodError;
} {
  const result = purchaseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates purchase update data and returns typed result
 */
export function validatePurchaseUpdate(data: unknown): {
  success: boolean;
  data?: PurchaseUpdateInput;
  errors?: z.ZodError;
} {
  const result = purchaseUpdateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates purchase filter data and returns typed result with defaults
 */
export function validatePurchaseFilter(data: unknown): {
  success: boolean;
  data?: PurchaseFilterInput;
  errors?: z.ZodError;
} {
  const result = purchaseFilterSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Formats validation errors into a user-friendly object
 * Returns an object with field names as keys and error messages as values
 */
export function formatPurchaseErrors(error: z.ZodError): Record<string, string> {
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
 * Determines payment status based on paid and total amounts
 */
export function determinePurchasePaymentStatus(
  paidAmount: number,
  totalAmount: number
): PurchasePaymentStatus {
  if (paidAmount >= totalAmount) {
    return 'paid';
  }
  if (paidAmount > 0) {
    return 'partial';
  }
  return 'unpaid';
}
