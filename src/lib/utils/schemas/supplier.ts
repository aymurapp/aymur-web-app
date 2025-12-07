/**
 * Supplier Zod Validation Schemas
 * Validation schemas for supplier forms and data operations
 *
 * These schemas match the database constraints defined in:
 * - suppliers table
 * - supplier_categories table
 * - supplier_transactions table (immutable ledger)
 *
 * Key fields:
 * - company_name (required, max 255 chars)
 * - contact_name (optional, max 255 chars)
 * - phone (optional, E.164 format)
 * - email (optional, valid email format)
 * - credit_limit (optional, non-negative)
 * - payment_terms_days (optional, 0-365)
 *
 * @module lib/utils/schemas/supplier
 */

import { z } from 'zod';

import { uuidSchema, phoneSchema, dateStringSchema } from '../validation';

// =============================================================================
// SUPPLIER TRANSACTION TYPES
// =============================================================================

/**
 * Supplier transaction type enum - matches supplier_transactions.transaction_type in database
 * Used for the immutable ledger pattern
 */
export const supplierTransactionTypeEnum = z.enum(
  ['purchase', 'payment', 'credit_note', 'debit_note', 'adjustment', 'opening_balance'],
  {
    errorMap: () => ({
      message:
        'Transaction type must be purchase, payment, credit_note, debit_note, adjustment, or opening_balance',
    }),
  }
);

/**
 * Reference type for supplier transactions - what entity triggered the transaction
 */
export const supplierReferenceTypeEnum = z.enum(['purchase', 'payment', 'manual', 'return'], {
  errorMap: () => ({
    message: 'Reference type must be purchase, payment, manual, or return',
  }),
});

// =============================================================================
// SUPPLIER FIELD SCHEMAS
// =============================================================================

/**
 * Company name validation - varchar(255), required
 */
export const companyNameSchema = z
  .string()
  .min(2, 'Company name must be at least 2 characters')
  .max(255, 'Company name cannot exceed 255 characters');

/**
 * Contact name validation - varchar(255), optional
 */
export const contactNameSchema = z
  .string()
  .max(255, 'Contact name cannot exceed 255 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Supplier phone validation - optional, E.164 format
 */
export const supplierPhoneSchema = phoneSchema.optional().nullable();

/**
 * Supplier email validation - optional but must be valid if provided
 */
export const supplierEmailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email cannot exceed 255 characters')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

/**
 * Address line validation - varchar(255), optional
 */
export const addressLineSchema = z
  .string()
  .max(255, 'Address line cannot exceed 255 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * City validation - varchar(100), optional
 */
export const supplierCitySchema = z
  .string()
  .max(100, 'City cannot exceed 100 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * State/Province validation - varchar(100), optional
 */
export const stateSchema = z
  .string()
  .max(100, 'State cannot exceed 100 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Postal code validation - varchar(20), optional
 */
export const supplierPostalCodeSchema = z
  .string()
  .max(20, 'Postal code cannot exceed 20 characters')
  .regex(/^[a-zA-Z0-9\s-]*$/, 'Invalid postal code format')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Country validation - varchar(100), optional
 */
export const countrySchema = z
  .string()
  .max(100, 'Country cannot exceed 100 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Tax ID validation - varchar(50), optional
 */
export const supplierTaxIdSchema = z
  .string()
  .max(50, 'Tax ID cannot exceed 50 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Bank name validation - varchar(255), optional
 */
export const bankNameSchema = z
  .string()
  .max(255, 'Bank name cannot exceed 255 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Bank account number validation - varchar(50), optional
 */
export const bankAccountSchema = z
  .string()
  .max(50, 'Bank account cannot exceed 50 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * IBAN validation - varchar(34), optional
 */
export const bankIbanSchema = z
  .string()
  .max(34, 'IBAN cannot exceed 34 characters')
  .regex(/^[A-Z0-9]*$/i, 'IBAN can only contain letters and numbers')
  .optional()
  .nullable()
  .transform((val) => val?.trim().toUpperCase() || null);

/**
 * SWIFT/BIC validation - varchar(11), optional
 */
export const bankSwiftSchema = z
  .string()
  .max(11, 'SWIFT code cannot exceed 11 characters')
  .regex(/^[A-Z0-9]*$/i, 'SWIFT code can only contain letters and numbers')
  .optional()
  .nullable()
  .transform((val) => val?.trim().toUpperCase() || null);

/**
 * Credit limit validation - numeric(15,4), non-negative
 */
export const supplierCreditLimitSchema = z
  .number()
  .min(0, 'Credit limit cannot be negative')
  .max(99999999999.9999, 'Credit limit is too large')
  .optional()
  .nullable();

/**
 * Payment terms days validation - integer, 0-365
 */
export const paymentTermsDaysSchema = z
  .number()
  .int('Payment terms must be a whole number')
  .min(0, 'Payment terms cannot be negative')
  .max(365, 'Payment terms cannot exceed 365 days')
  .optional()
  .nullable();

/**
 * Supplier notes validation - text, optional
 */
export const supplierNotesSchema = z
  .string()
  .max(5000, 'Notes cannot exceed 5000 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Payment amount validation - positive number
 */
export const paymentAmountSchema = z
  .number()
  .positive('Payment amount must be greater than zero')
  .max(99999999999.9999, 'Amount is too large');

// =============================================================================
// BASE SUPPLIER SCHEMA
// =============================================================================

/**
 * Base supplier object schema - without refinements
 * Used as foundation for other schemas that need .extend() or .partial()
 */
const supplierBaseSchema = z.object({
  // Required fields
  company_name: companyNameSchema,

  // Contact information
  contact_name: contactNameSchema,
  phone: supplierPhoneSchema,
  email: supplierEmailSchema,

  // Category
  id_category: uuidSchema.optional().nullable(),

  // Address fields
  address_line1: addressLineSchema,
  address_line2: addressLineSchema,
  city: supplierCitySchema,
  state: stateSchema,
  postal_code: supplierPostalCodeSchema,
  country: countrySchema,

  // Tax information
  tax_id: supplierTaxIdSchema,

  // Bank details
  bank_name: bankNameSchema,
  bank_account: bankAccountSchema,
  bank_iban: bankIbanSchema,
  bank_swift: bankSwiftSchema,

  // Credit terms
  credit_limit: supplierCreditLimitSchema,
  payment_terms_days: paymentTermsDaysSchema,

  // Status
  is_active: z.boolean().default(true),

  // Notes
  notes: supplierNotesSchema,
});

// =============================================================================
// MAIN SUPPLIER SCHEMA
// =============================================================================

/**
 * Supplier creation/edit schema
 * Use this for the main supplier form with all fields
 */
export const supplierSchema = supplierBaseSchema;

/**
 * Supplier creation schema with shop ID
 * Used when creating a new supplier
 */
export const supplierCreateSchema = supplierBaseSchema.extend({
  // Shop ID is required for creation (set programmatically)
  id_shop: uuidSchema.optional(),
});

/**
 * Supplier update schema - all fields optional
 * Used for partial updates
 */
export const supplierUpdateSchema = supplierBaseSchema.partial().extend({
  // ID is required for updates
  id_supplier: uuidSchema.optional(),
});

// =============================================================================
// SUPPLIER CATEGORY SCHEMA
// =============================================================================

/**
 * Supplier category base schema
 */
const supplierCategoryBaseSchema = z.object({
  category_name: z
    .string()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters'),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  is_active: z.boolean().default(true),
});

/**
 * Supplier category schema for creation/edit
 */
export const supplierCategorySchema = supplierCategoryBaseSchema;

/**
 * Supplier category creation schema with shop ID
 */
export const supplierCategoryCreateSchema = supplierCategoryBaseSchema.extend({
  id_shop: uuidSchema.optional(),
});

/**
 * Supplier category update schema
 */
export const supplierCategoryUpdateSchema = supplierCategoryBaseSchema.partial().extend({
  id_category: uuidSchema.optional(),
});

// =============================================================================
// SUPPLIER PAYMENT SCHEMA
// =============================================================================

/**
 * Supplier payment schema for recording payments to suppliers
 * This creates an immutable supplier_transaction record
 */
export const supplierPaymentSchema = z.object({
  // Supplier to pay
  id_supplier: uuidSchema.describe('Supplier ID is required'),

  // Payment amount (positive value - will be recorded as reducing what we owe)
  amount: paymentAmountSchema,

  // Payment date
  transaction_date: dateStringSchema.describe('Payment date is required'),

  // Optional notes
  notes: z
    .string()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
});

/**
 * Supplier payment with reference schema
 * Used when payment is linked to a specific purchase or reference
 */
export const supplierPaymentWithReferenceSchema = supplierPaymentSchema.extend({
  reference_type: supplierReferenceTypeEnum.optional().nullable(),
  reference_id: uuidSchema.optional().nullable(),
});

// =============================================================================
// SUPPLIER SEARCH/FILTER SCHEMA
// =============================================================================

/**
 * Supplier search base schema for filtering supplier lists
 */
const supplierSearchBaseSchema = z.object({
  // Text search (searches company_name, contact_name, phone, email)
  search: z
    .string()
    .max(255, 'Search query cannot exceed 255 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),

  // Filter by category
  id_category: uuidSchema.optional().nullable(),

  // Filter by active status
  is_active: z.boolean().optional(),

  // Filter by balance range (what we owe them)
  balance_min: z.number().min(-99999999999.9999, 'Minimum balance is too small').optional(),
  balance_max: z.number().max(99999999999.9999, 'Maximum balance is too large').optional(),

  // Filter suppliers with outstanding balance
  has_balance: z.boolean().optional(),

  // Sorting
  sort_by: z
    .enum([
      'company_name',
      'contact_name',
      'current_balance',
      'total_purchases',
      'total_payments',
      'created_at',
      'updated_at',
    ])
    .optional()
    .default('company_name'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),

  // Pagination
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

/**
 * Supplier search schema with range validations
 */
export const supplierSearchSchema = supplierSearchBaseSchema.refine(
  (data) => {
    // Validate balance range
    if (data.balance_min !== undefined && data.balance_max !== undefined) {
      return data.balance_min <= data.balance_max;
    }
    return true;
  },
  {
    message: 'Minimum balance must be less than or equal to maximum balance',
    path: ['balance_max'],
  }
);

// =============================================================================
// SUPPLIER QUICK ADD SCHEMA
// =============================================================================

/**
 * Simplified supplier schema for quick add (minimal fields)
 * Use this when you need to quickly create a supplier during a purchase
 */
export const supplierQuickAddSchema = z.object({
  company_name: companyNameSchema,
  contact_name: contactNameSchema,
  phone: supplierPhoneSchema,
  email: supplierEmailSchema,
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Enum types
export type SupplierTransactionType = z.infer<typeof supplierTransactionTypeEnum>;
export type SupplierReferenceType = z.infer<typeof supplierReferenceTypeEnum>;

// Schema input types
export type SupplierInput = z.infer<typeof supplierSchema>;
export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
export type SupplierQuickAddInput = z.infer<typeof supplierQuickAddSchema>;

export type SupplierCategoryInput = z.infer<typeof supplierCategorySchema>;
export type SupplierCategoryCreateInput = z.infer<typeof supplierCategoryCreateSchema>;
export type SupplierCategoryUpdateInput = z.infer<typeof supplierCategoryUpdateSchema>;

export type SupplierPaymentInput = z.infer<typeof supplierPaymentSchema>;
export type SupplierPaymentWithReferenceInput = z.infer<typeof supplierPaymentWithReferenceSchema>;

export type SupplierSearchInput = z.infer<typeof supplierSearchSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates supplier data and returns typed result
 */
export function validateSupplier(data: unknown): {
  success: boolean;
  data?: SupplierInput;
  errors?: z.ZodError;
} {
  const result = supplierSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates supplier quick add data and returns typed result
 */
export function validateSupplierQuickAdd(data: unknown): {
  success: boolean;
  data?: SupplierQuickAddInput;
  errors?: z.ZodError;
} {
  const result = supplierQuickAddSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates supplier category data and returns typed result
 */
export function validateSupplierCategory(data: unknown): {
  success: boolean;
  data?: SupplierCategoryInput;
  errors?: z.ZodError;
} {
  const result = supplierCategorySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates supplier payment data and returns typed result
 */
export function validateSupplierPayment(data: unknown): {
  success: boolean;
  data?: SupplierPaymentInput;
  errors?: z.ZodError;
} {
  const result = supplierPaymentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates supplier search/filter data and returns typed result with defaults
 */
export function validateSupplierSearch(data: unknown): {
  success: boolean;
  data?: SupplierSearchInput;
  errors?: z.ZodError;
} {
  const result = supplierSearchSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Formats validation errors into a user-friendly object
 * Returns an object with field names as keys and error messages as values
 */
export function formatSupplierErrors(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formattedErrors[path]) {
      formattedErrors[path] = issue.message;
    }
  }

  return formattedErrors;
}
