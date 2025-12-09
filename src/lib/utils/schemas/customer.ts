/**
 * Customer Zod Validation Schemas
 * Validation schemas for customer forms and data operations
 *
 * These schemas match the database constraints defined in:
 * - customers table
 * - customer_transactions table (reference only)
 *
 * Key fields:
 * - full_name (required, max 255 chars)
 * - phone (optional, E.164 format)
 * - email (optional, valid email format)
 * - address (optional, text)
 * - client_type (enum: individual, company)
 * - financial_status (enum: good, warning, critical)
 * - notes (optional, text)
 */

import { z } from 'zod';

import { uuidSchema, phoneSchema, phoneRequiredSchema, dateStringSchema } from '../validation';

// =============================================================================
// CUSTOMER ENUMS
// =============================================================================

/**
 * Client type enum - matches customers.client_type in database
 * Distinguishes between individual customers and company/business customers
 */
export const clientTypeEnum = z.enum(['individual', 'company'], {
  errorMap: () => ({ message: 'Client type must be either individual or company' }),
});

/**
 * Financial status enum - matches customers.financial_status in database
 * Indicates the customer's payment reliability status
 */
export const financialStatusEnum = z.enum(['good', 'warning', 'critical'], {
  errorMap: () => ({ message: 'Financial status must be good, warning, or critical' }),
});

// =============================================================================
// CUSTOMER FIELD SCHEMAS
// =============================================================================

/**
 * Customer name validation - varchar(255), required
 * Supports Latin and Arabic characters, spaces, hyphens, and apostrophes
 */
export const customerNameSchema = z
  .string()
  .min(2, 'Customer name must be at least 2 characters')
  .max(255, 'Customer name cannot exceed 255 characters');

/**
 * Phone primary validation - required for customer creation
 * Uses E.164 international format
 */
export const phonePrimarySchema = phoneRequiredSchema;

/**
 * Phone secondary validation - optional
 * Uses E.164 international format or empty string
 */
export const phoneSecondarySchema = phoneSchema.optional().nullable();

/**
 * Customer email validation - optional but must be valid if provided
 */
export const customerEmailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email cannot exceed 255 characters')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

/**
 * Address field validation - text, optional
 * Combined address field (can include street, area, etc.)
 */
export const addressFieldSchema = z
  .string()
  .max(1000, 'Address cannot exceed 1000 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * City validation - varchar(100), optional
 */
export const citySchema = z
  .string()
  .max(100, 'City cannot exceed 100 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Area/District validation - varchar(100), optional
 */
export const areaSchema = z
  .string()
  .max(100, 'Area cannot exceed 100 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Street address validation - varchar(255), optional
 */
export const streetSchema = z
  .string()
  .max(255, 'Street address cannot exceed 255 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Postal code validation - varchar(20), optional
 */
export const postalCodeSchema = z
  .string()
  .max(20, 'Postal code cannot exceed 20 characters')
  .regex(/^[a-zA-Z0-9\s-]*$/, 'Invalid postal code format')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

// =============================================================================
// SOCIAL MEDIA FIELD SCHEMAS
// =============================================================================

/**
 * Instagram username validation - varchar(100), optional
 * Allows usernames with or without @ prefix
 */
export const instagramSchema = z
  .string()
  .max(100, 'Instagram handle cannot exceed 100 characters')
  .regex(/^@?[a-zA-Z0-9._]*$/, 'Invalid Instagram handle format')
  .optional()
  .nullable()
  .transform((val) => {
    if (!val?.trim()) {
      return null;
    }
    // Remove @ prefix if present for consistent storage
    return val.trim().replace(/^@/, '');
  });

/**
 * Facebook username/URL validation - varchar(100), optional
 */
export const facebookSchema = z
  .string()
  .max(100, 'Facebook handle cannot exceed 100 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * WhatsApp number validation - varchar(20), optional
 * Should be a valid phone number format
 */
export const whatsappSchema = z
  .string()
  .max(20, 'WhatsApp number cannot exceed 20 characters')
  .regex(/^[+]?[0-9\s-]*$/, 'Invalid WhatsApp number format')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * TikTok username validation - varchar(100), optional
 * Allows usernames with or without @ prefix
 */
export const tiktokSchema = z
  .string()
  .max(100, 'TikTok handle cannot exceed 100 characters')
  .regex(/^@?[a-zA-Z0-9._]*$/, 'Invalid TikTok handle format')
  .optional()
  .nullable()
  .transform((val) => {
    if (!val?.trim()) {
      return null;
    }
    // Remove @ prefix if present for consistent storage
    return val.trim().replace(/^@/, '');
  });

/**
 * Tax ID validation - varchar(50), optional (typically required for companies)
 */
export const taxIdSchema = z
  .string()
  .max(50, 'Tax ID cannot exceed 50 characters')
  .regex(/^[a-zA-Z0-9-]*$/, 'Tax ID can only contain letters, numbers, and hyphens')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Credit limit validation - numeric(15,4), non-negative
 * This is a permission-based field that may require special access to modify
 */
export const creditLimitFieldSchema = z
  .number()
  .min(0, 'Credit limit cannot be negative')
  .max(99999999999.9999, 'Credit limit is too large')
  .default(0);

/**
 * Balance schema - numeric(15,4), can be positive (customer owes) or negative (shop owes)
 */
export const balanceSchema = z
  .number()
  .min(-99999999999.9999, 'Balance is too small')
  .max(99999999999.9999, 'Balance is too large');

/**
 * VIP status validation - boolean flag
 */
export const isVipSchema = z.boolean().default(false);

/**
 * Customer notes validation - text, optional
 */
export const customerNotesSchema = z
  .string()
  .max(5000, 'Notes cannot exceed 5000 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

// =============================================================================
// BASE CUSTOMER SCHEMA (without refinements)
// =============================================================================

/**
 * Base customer object schema - without refinements
 * Used as foundation for other schemas that need .extend() or .partial()
 */
const customerBaseSchema = z.object({
  // Required fields
  full_name: customerNameSchema,
  phone: phonePrimarySchema,

  // Optional contact fields
  email: customerEmailSchema,

  // Address fields (combined into single address field in DB)
  address: addressFieldSchema,

  // Address component fields (new columns in DB)
  postal_code: postalCodeSchema,
  city: citySchema,
  area: areaSchema,

  // Social media fields
  instagram: instagramSchema,
  facebook: facebookSchema,
  whatsapp: whatsappSchema,
  tiktok: tiktokSchema,

  // Customer classification
  client_type: clientTypeEnum.default('individual'),

  // Financial fields (credit_limit may require permission)
  financial_status: financialStatusEnum.optional().nullable(),

  // VIP status
  is_vip: isVipSchema,

  // Tax ID (typically for companies)
  tax_id: taxIdSchema,

  // Notes
  notes: customerNotesSchema,
});

// =============================================================================
// MAIN CUSTOMER SCHEMA
// =============================================================================

/**
 * Customer creation/edit schema
 * Use this for the main customer form with all fields
 */
export const customerSchema = customerBaseSchema;

/**
 * Customer creation schema with shop ID
 * Used when creating a new customer
 */
export const customerCreateSchema = customerBaseSchema.extend({
  // Shop ID is required for creation (set programmatically)
  id_shop: uuidSchema.optional(),
});

/**
 * Customer update schema - all fields optional
 * Used for partial updates
 */
export const customerUpdateSchema = customerBaseSchema.partial().extend({
  // ID is required for updates
  id_customer: uuidSchema.optional(),
});

// =============================================================================
// CREDIT LIMIT SCHEMA
// =============================================================================

/**
 * Credit limit base schema for permission-based field updates
 * This is a separate schema because credit_limit modification typically requires
 * special permissions (e.g., manager or owner role)
 */
const creditLimitBaseSchema = z.object({
  // Customer ID to update
  id_customer: uuidSchema.describe('Customer ID is required'),

  // New credit limit value
  credit_limit: creditLimitFieldSchema,

  // Optional reason for the change (for audit purposes)
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional().nullable(),
});

/**
 * Credit limit schema for simple updates
 */
export const creditLimitSchema = creditLimitBaseSchema;

/**
 * Credit limit update with validation
 * Includes previous value for comparison/audit
 */
export const creditLimitUpdateSchema = creditLimitBaseSchema
  .extend({
    previous_credit_limit: z.number().optional(),
  })
  .refine(
    (data) => {
      // Ensure new credit limit is different from previous
      if (data.previous_credit_limit !== undefined) {
        return data.credit_limit !== data.previous_credit_limit;
      }
      return true;
    },
    {
      message: 'New credit limit must be different from current value',
      path: ['credit_limit'],
    }
  );

// =============================================================================
// CUSTOMER SEARCH/FILTER SCHEMA
// =============================================================================

/**
 * Customer search base schema for filtering customer lists
 */
const customerSearchBaseSchema = z.object({
  // Text search (searches name, phone, email)
  search: z
    .string()
    .max(255, 'Search query cannot exceed 255 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),

  // Filter by client type
  client_type: z.array(clientTypeEnum).optional(),

  // Filter by financial status
  financial_status: z.array(financialStatusEnum).optional(),

  // Filter by VIP status
  is_vip: z.boolean().optional(),

  // Filter by balance range
  balance_min: z.number().min(-99999999999.9999, 'Minimum balance is too small').optional(),
  balance_max: z.number().max(99999999999.9999, 'Maximum balance is too large').optional(),

  // Filter by credit limit range
  credit_limit_min: z.number().min(0, 'Minimum credit limit cannot be negative').optional(),
  credit_limit_max: z
    .number()
    .max(99999999999.9999, 'Maximum credit limit is too large')
    .optional(),

  // Filter customers with outstanding balance
  has_balance: z.boolean().optional(),

  // Filter customers over credit limit
  over_credit_limit: z.boolean().optional(),

  // Date range filters
  created_from: dateStringSchema.optional(),
  created_to: dateStringSchema.optional(),

  // Sorting
  sort_by: z
    .enum([
      'full_name',
      'phone',
      'email',
      'client_type',
      'current_balance',
      'total_purchases',
      'total_payments',
      'financial_status',
      'is_vip',
      'created_at',
      'updated_at',
    ])
    .optional()
    .default('full_name'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),

  // Pagination
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

/**
 * Customer search schema with range validations
 */
export const customerSearchSchema = customerSearchBaseSchema
  .refine(
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
  )
  .refine(
    (data) => {
      // Validate credit limit range
      if (data.credit_limit_min !== undefined && data.credit_limit_max !== undefined) {
        return data.credit_limit_min <= data.credit_limit_max;
      }
      return true;
    },
    {
      message: 'Minimum credit limit must be less than or equal to maximum credit limit',
      path: ['credit_limit_max'],
    }
  );

// =============================================================================
// CUSTOMER QUICK ADD SCHEMA
// =============================================================================

/**
 * Simplified customer schema for quick add (minimal fields)
 * Use this when you need to quickly create a customer during a sale
 */
export const customerQuickAddSchema = z.object({
  full_name: customerNameSchema,
  phone: phonePrimarySchema,
  email: customerEmailSchema,
  client_type: clientTypeEnum.default('individual'),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Enum types
export type ClientType = z.infer<typeof clientTypeEnum>;
export type FinancialStatus = z.infer<typeof financialStatusEnum>;

// Schema input types
export type CustomerInput = z.infer<typeof customerSchema>;
export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type CustomerQuickAddInput = z.infer<typeof customerQuickAddSchema>;

export type CreditLimitInput = z.infer<typeof creditLimitSchema>;
export type CreditLimitUpdateInput = z.infer<typeof creditLimitUpdateSchema>;

export type CustomerSearchInput = z.infer<typeof customerSearchSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates customer data and returns typed result
 */
export function validateCustomer(data: unknown): {
  success: boolean;
  data?: CustomerInput;
  errors?: z.ZodError;
} {
  const result = customerSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates customer quick add data and returns typed result
 */
export function validateCustomerQuickAdd(data: unknown): {
  success: boolean;
  data?: CustomerQuickAddInput;
  errors?: z.ZodError;
} {
  const result = customerQuickAddSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates credit limit update data and returns typed result
 */
export function validateCreditLimit(data: unknown): {
  success: boolean;
  data?: CreditLimitInput;
  errors?: z.ZodError;
} {
  const result = creditLimitSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates customer search/filter data and returns typed result with defaults
 */
export function validateCustomerSearch(data: unknown): {
  success: boolean;
  data?: CustomerSearchInput;
  errors?: z.ZodError;
} {
  const result = customerSearchSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Formats validation errors into a user-friendly object
 * Returns an object with field names as keys and error messages as values
 */
export function formatCustomerErrors(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formattedErrors[path]) {
      formattedErrors[path] = issue.message;
    }
  }

  return formattedErrors;
}
