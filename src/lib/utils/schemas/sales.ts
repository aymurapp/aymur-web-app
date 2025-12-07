/**
 * Sales Zod Validation Schemas
 * Validation schemas for sales forms and data operations
 *
 * These schemas match the database constraints defined in:
 * - sales table
 * - sale_items table
 * - sale_payments table
 *
 * Key fields:
 * - sale_number (auto-generated, format: PREFIX-YYYYMMDD-SEQUENCE)
 * - sale_date (required, YYYY-MM-DD format)
 * - currency (required, 3-letter ISO code)
 * - sale_status (enum: pending, completed, returned, partial_return)
 * - payment_status (enum: paid, partial, unpaid)
 * - payment_type (enum: cash, card, bank_transfer, cheque, mixed, refund)
 */

import { z } from 'zod';

import { uuidSchema, notesSchema, dateStringSchema } from '../validation';
import { currencyCodeSchema } from './inventory';

// =============================================================================
// SALES ENUMS
// =============================================================================

/**
 * Sale status enum - matches sales.sale_status in database
 * Tracks the lifecycle of a sale from creation to completion/return
 */
export const saleStatusEnum = z.enum(['pending', 'completed', 'returned', 'partial_return'], {
  errorMap: () => ({
    message: 'Sale status must be pending, completed, returned, or partial_return',
  }),
});

/**
 * Payment status enum - matches sales.payment_status in database
 * Indicates how much of the sale has been paid
 */
export const paymentStatusEnum = z.enum(['paid', 'partial', 'unpaid'], {
  errorMap: () => ({ message: 'Payment status must be paid, partial, or unpaid' }),
});

/**
 * Payment type enum - matches sale_payments.payment_type in database
 * Defines the method of payment used
 */
export const paymentTypeEnum = z.enum(
  ['cash', 'card', 'bank_transfer', 'cheque', 'mixed', 'refund'],
  {
    errorMap: () => ({
      message: 'Payment type must be cash, card, bank_transfer, cheque, mixed, or refund',
    }),
  }
);

/**
 * Discount type enum - matches sales.discount_type in database
 * Defines how the discount is calculated
 */
export const discountTypeEnum = z.enum(['percentage', 'fixed'], {
  errorMap: () => ({ message: 'Discount type must be percentage or fixed' }),
});

/**
 * Cheque status enum - matches sale_payments.cheque_status in database
 * Tracks the lifecycle of a cheque payment
 */
export const chequeStatusEnum = z.enum(['pending', 'cleared', 'bounced'], {
  errorMap: () => ({ message: 'Cheque status must be pending, cleared, or bounced' }),
});

/**
 * Sale item status enum - matches sale_items.status in database
 */
export const saleItemStatusEnum = z.enum(['sold', 'returned'], {
  errorMap: () => ({ message: 'Sale item status must be sold or returned' }),
});

// =============================================================================
// SALES FIELD SCHEMAS
// =============================================================================

/**
 * Sale number validation - varchar(50), auto-generated
 * Format: PREFIX-YYYYMMDD-SEQUENCE (e.g., INV-20241204-0001)
 */
export const saleNumberSchema = z
  .string()
  .min(1, 'Sale number is required')
  .max(50, 'Sale number cannot exceed 50 characters')
  .regex(/^[A-Z]{2,10}-\d{8}-\d{4}$/, 'Sale number must follow format: PREFIX-YYYYMMDD-SEQUENCE');

/**
 * Sale date validation - required, YYYY-MM-DD format
 */
export const saleDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Sale date must be in YYYY-MM-DD format')
  .refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Invalid sale date' }
  );

/**
 * Amount validation - numeric(15,4), must be non-negative
 * Used for subtotal, discount_amount, tax_amount, total_amount, paid_amount
 */
export const amountSchema = z
  .number()
  .min(0, 'Amount cannot be negative')
  .max(99999999999.9999, 'Amount is too large');

/**
 * Required amount validation - must be positive
 */
export const positiveAmountSchema = z
  .number()
  .positive('Amount must be greater than 0')
  .max(99999999999.9999, 'Amount is too large');

/**
 * Unit price validation - numeric(15,4), must be non-negative
 */
export const unitPriceSchema = z
  .number()
  .min(0, 'Unit price cannot be negative')
  .max(99999999999.9999, 'Unit price is too large');

/**
 * Quantity validation - integer, must be positive
 */
export const quantitySchema = z
  .number()
  .int('Quantity must be a whole number')
  .positive('Quantity must be at least 1')
  .max(9999, 'Quantity cannot exceed 9999')
  .default(1);

/**
 * Discount percentage validation - 0 to 100
 */
export const discountPercentSchema = z
  .number()
  .min(0, 'Discount percentage cannot be negative')
  .max(100, 'Discount percentage cannot exceed 100%');

/**
 * Discount value validation - non-negative
 * Meaning depends on discount_type (percentage: 0-100, fixed: currency amount)
 */
export const discountValueSchema = z
  .number()
  .min(0, 'Discount value cannot be negative')
  .max(99999999999.9999, 'Discount value is too large');

/**
 * Item name validation - varchar(255), required (snapshot from inventory)
 */
export const saleItemNameSchema = z
  .string()
  .min(1, 'Item name is required')
  .max(255, 'Item name cannot exceed 255 characters');

/**
 * Weight in grams validation - numeric(10,3), must be non-negative
 */
export const saleWeightGramsSchema = z
  .number()
  .min(0, 'Weight cannot be negative')
  .max(9999999.999, 'Weight cannot exceed 9,999,999.999 grams');

/**
 * Barcode validation - varchar(100), optional (snapshot from inventory)
 */
export const saleItemBarcodeSchema = z
  .string()
  .max(100, 'Barcode cannot exceed 100 characters')
  .optional()
  .nullable();

/**
 * Metal type name - varchar(50), optional (snapshot)
 */
export const metalTypeNameSchema = z
  .string()
  .max(50, 'Metal type cannot exceed 50 characters')
  .optional()
  .nullable();

/**
 * Metal purity name - varchar(20), optional (snapshot)
 */
export const metalPurityNameSchema = z
  .string()
  .max(20, 'Metal purity cannot exceed 20 characters')
  .optional()
  .nullable();

/**
 * Return reason - text, required when returning an item
 */
export const returnReasonSchema = z
  .string()
  .min(1, 'Return reason is required')
  .max(1000, 'Return reason cannot exceed 1000 characters');

// =============================================================================
// PAYMENT FIELD SCHEMAS
// =============================================================================

/**
 * Payment date validation - required, YYYY-MM-DD format
 */
export const paymentDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be in YYYY-MM-DD format')
  .refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Invalid payment date' }
  );

/**
 * Card last four digits - exactly 4 digits
 */
export const cardLastFourSchema = z
  .string()
  .length(4, 'Card last four must be exactly 4 digits')
  .regex(/^\d{4}$/, 'Card last four must contain only digits')
  .optional()
  .nullable();

/**
 * Authorization code - varchar(50), optional
 */
export const authorizationCodeSchema = z
  .string()
  .max(50, 'Authorization code cannot exceed 50 characters')
  .optional()
  .nullable();

/**
 * Bank name - varchar(100), optional
 */
export const bankNameSchema = z
  .string()
  .max(100, 'Bank name cannot exceed 100 characters')
  .optional()
  .nullable();

/**
 * Transaction reference - varchar(100), optional
 */
export const transactionReferenceSchema = z
  .string()
  .max(100, 'Transaction reference cannot exceed 100 characters')
  .optional()
  .nullable();

/**
 * Cheque number - varchar(50), optional
 */
export const chequeNumberSchema = z
  .string()
  .max(50, 'Cheque number cannot exceed 50 characters')
  .optional()
  .nullable();

/**
 * Cheque date validation - YYYY-MM-DD format, optional
 */
export const chequeDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Cheque date must be in YYYY-MM-DD format')
  .refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Invalid cheque date' }
  )
  .optional()
  .nullable();

// =============================================================================
// DISCOUNT SCHEMA
// =============================================================================

/**
 * Discount schema for applying discounts to sales
 * Validates percentage vs fixed discount with appropriate limits
 */
export const discountSchema = z
  .object({
    discount_type: discountTypeEnum,
    discount_value: discountValueSchema,
  })
  .refine(
    (data) => {
      // For percentage discounts, value must be between 0 and 100
      if (data.discount_type === 'percentage') {
        return data.discount_value >= 0 && data.discount_value <= 100;
      }
      return true;
    },
    {
      message: 'Percentage discount must be between 0 and 100',
      path: ['discount_value'],
    }
  );

/**
 * Optional discount schema - allows null/undefined
 */
export const optionalDiscountSchema = z
  .object({
    discount_type: discountTypeEnum.nullable().optional(),
    discount_value: discountValueSchema.nullable().optional(),
  })
  .refine(
    (data) => {
      // If discount_type is set, discount_value should also be set
      if (
        data.discount_type &&
        (data.discount_value === null || data.discount_value === undefined)
      ) {
        return false;
      }
      // If discount_value is set, discount_type should also be set
      if (
        data.discount_value !== null &&
        data.discount_value !== undefined &&
        data.discount_value > 0 &&
        !data.discount_type
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Both discount type and value must be provided together',
      path: ['discount_type'],
    }
  )
  .refine(
    (data) => {
      // For percentage discounts, value must be between 0 and 100
      if (
        data.discount_type === 'percentage' &&
        data.discount_value !== null &&
        data.discount_value !== undefined
      ) {
        return data.discount_value >= 0 && data.discount_value <= 100;
      }
      return true;
    },
    {
      message: 'Percentage discount must be between 0 and 100',
      path: ['discount_value'],
    }
  );

// =============================================================================
// SALE ITEM SCHEMA
// =============================================================================

/**
 * Base sale item schema - for creating sale line items
 * Contains snapshot data from inventory at time of sale
 */
const saleItemBaseSchema = z.object({
  // Required inventory reference
  id_item: uuidSchema.describe('Inventory item ID is required'),

  // Snapshot fields from inventory (can be overridden)
  item_name: saleItemNameSchema,
  item_barcode: saleItemBarcodeSchema,
  weight_grams: saleWeightGramsSchema,
  metal_type: metalTypeNameSchema,
  metal_purity: metalPurityNameSchema,

  // Sale-specific fields
  unit_price: unitPriceSchema,
  quantity: quantitySchema,
  total_price: amountSchema,

  // Status tracking
  status: saleItemStatusEnum.default('sold'),

  // Return tracking
  return_reason: z.string().max(1000).optional().nullable(),
});

/**
 * Sale item schema with total price validation
 */
export const saleItemSchema = saleItemBaseSchema.refine(
  (data) => {
    // Validate total_price matches unit_price * quantity
    const expectedTotal = data.unit_price * data.quantity;
    const tolerance = 0.01; // Allow for floating point rounding
    return Math.abs(data.total_price - expectedTotal) <= tolerance;
  },
  {
    message: 'Total price must equal unit price multiplied by quantity',
    path: ['total_price'],
  }
);

/**
 * Sale item creation schema - includes required fields
 */
export const saleItemCreateSchema = saleItemBaseSchema
  .omit({ status: true, return_reason: true })
  .extend({
    // Sale reference (set programmatically)
    id_sale: uuidSchema.optional(),
  });

/**
 * Sale item update schema - partial updates for line items
 */
export const saleItemUpdateSchema = z.object({
  id_sale_item: uuidSchema.describe('Sale item ID is required'),
  unit_price: unitPriceSchema.optional(),
  quantity: quantitySchema.optional(),
});

/**
 * Sale item return schema - for processing returns
 */
export const saleItemReturnSchema = z.object({
  id_sale_item: uuidSchema.describe('Sale item ID is required'),
  return_reason: returnReasonSchema,
});

// =============================================================================
// SALE PAYMENT SCHEMA
// =============================================================================

/**
 * Base payment schema - common fields for all payment types
 */
const salePaymentBaseSchema = z.object({
  // Sale and customer references
  id_sale: uuidSchema.describe('Sale ID is required'),
  id_customer: uuidSchema.describe('Customer ID is required'),

  // Payment details
  payment_type: paymentTypeEnum,
  amount: positiveAmountSchema,
  payment_date: paymentDateSchema,

  // Optional notes
  notes: notesSchema,
});

/**
 * Cash payment fields
 */
const cashPaymentFields = z.object({
  cash_amount: amountSchema.optional().nullable(),
});

/**
 * Card payment fields
 */
const cardPaymentFields = z.object({
  card_amount: amountSchema.optional().nullable(),
  card_last_four: cardLastFourSchema,
  authorization_code: authorizationCodeSchema,
});

/**
 * Bank transfer payment fields
 */
const bankTransferPaymentFields = z.object({
  transfer_amount: amountSchema.optional().nullable(),
  bank_name: bankNameSchema,
  transaction_reference: transactionReferenceSchema,
});

/**
 * Cheque payment fields
 */
const chequePaymentFields = z.object({
  cheque_amount: amountSchema.optional().nullable(),
  cheque_number: chequeNumberSchema,
  cheque_bank: bankNameSchema,
  cheque_date: chequeDateSchema,
  cheque_status: chequeStatusEnum.default('pending'),
});

/**
 * Sale payment schema with payment type-specific validation
 * Note: For mixed payments, all component fields (cash, card, transfer, cheque) are
 * included and validation ensures the components sum to the total amount.
 */
export const salePaymentSchema = salePaymentBaseSchema
  .merge(cashPaymentFields)
  .merge(cardPaymentFields)
  .merge(bankTransferPaymentFields)
  .merge(chequePaymentFields)
  .refine(
    (data) => {
      // Validate cheque fields are provided for cheque payments
      if (data.payment_type === 'cheque') {
        return !!data.cheque_number && !!data.cheque_date;
      }
      return true;
    },
    {
      message: 'Cheque number and cheque date are required for cheque payments',
      path: ['cheque_number'],
    }
  )
  .refine(
    (data) => {
      // For mixed payments, ensure at least one amount is provided
      if (data.payment_type === 'mixed') {
        const totalParts =
          (data.cash_amount || 0) +
          (data.card_amount || 0) +
          (data.transfer_amount || 0) +
          (data.cheque_amount || 0);
        return totalParts > 0;
      }
      return true;
    },
    {
      message: 'Mixed payment must have at least one payment component',
      path: ['payment_type'],
    }
  )
  .refine(
    (data) => {
      // For mixed payments, validate total matches amount
      if (data.payment_type === 'mixed') {
        const totalParts =
          (data.cash_amount || 0) +
          (data.card_amount || 0) +
          (data.transfer_amount || 0) +
          (data.cheque_amount || 0);
        const tolerance = 0.01;
        return Math.abs(totalParts - data.amount) <= tolerance;
      }
      return true;
    },
    {
      message: 'Mixed payment components must sum to total amount',
      path: ['amount'],
    }
  );

/**
 * Simple payment schema for quick payments (single type)
 */
export const salePaymentSimpleSchema = z.object({
  id_sale: uuidSchema,
  id_customer: uuidSchema,
  payment_type: z.enum(['cash', 'card', 'bank_transfer']),
  amount: positiveAmountSchema,
  payment_date: paymentDateSchema,
  notes: notesSchema,
});

// =============================================================================
// MAIN SALE SCHEMA
// =============================================================================

/**
 * Base sale schema for form validation
 * Matches sales table structure
 */
const saleBaseSchema = z.object({
  // Sale date and currency
  sale_date: saleDateSchema,
  currency: currencyCodeSchema,

  // Customer reference (optional for walk-in customers)
  id_customer: uuidSchema.optional().nullable(),

  // Discount fields
  discount_type: discountTypeEnum.optional().nullable(),
  discount_value: discountValueSchema.optional().nullable(),

  // Tax
  tax_amount: amountSchema.optional().nullable(),

  // Notes
  notes: notesSchema,
});

/**
 * Sale creation schema
 * Used when creating a new sale
 */
export const saleSchema = saleBaseSchema
  .refine(
    (data) => {
      // If discount_type is set, discount_value should also be set
      if (
        data.discount_type &&
        (data.discount_value === null || data.discount_value === undefined)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Discount value is required when discount type is specified',
      path: ['discount_value'],
    }
  )
  .refine(
    (data) => {
      // For percentage discounts, value must be between 0 and 100
      if (
        data.discount_type === 'percentage' &&
        data.discount_value !== null &&
        data.discount_value !== undefined
      ) {
        return data.discount_value >= 0 && data.discount_value <= 100;
      }
      return true;
    },
    {
      message: 'Percentage discount must be between 0 and 100',
      path: ['discount_value'],
    }
  );

/**
 * Sale creation schema with shop ID
 * Used when creating a new sale programmatically
 */
export const saleCreateSchema = saleBaseSchema.extend({
  // Shop ID is required for creation (set programmatically)
  id_shop: uuidSchema.optional(),
});

/**
 * Sale update schema - partial updates
 * All fields optional for PATCH-style updates
 */
export const saleUpdateSchema = z.object({
  // Allowed update fields
  id_customer: uuidSchema.optional().nullable(),
  discount_type: discountTypeEnum.optional().nullable(),
  discount_value: discountValueSchema.optional().nullable(),
  tax_amount: amountSchema.optional().nullable(),
  notes: notesSchema,
});

/**
 * Sale completion schema - for completing a pending sale
 */
export const saleCompleteSchema = z.object({
  id_sale: uuidSchema.describe('Sale ID is required'),
});

/**
 * Sale void schema - for voiding/cancelling a pending sale
 */
export const saleVoidSchema = z.object({
  id_sale: uuidSchema.describe('Sale ID is required'),
  void_reason: z
    .string()
    .min(1, 'Void reason is required')
    .max(500, 'Void reason cannot exceed 500 characters'),
});

// =============================================================================
// SALE FILTER SCHEMA
// =============================================================================

/**
 * Date range schema for filtering
 */
export const saleDateRangeSchema = z
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
export const amountRangeSchema = z
  .object({
    min: amountSchema.optional(),
    max: amountSchema.optional(),
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
 * Sale filter schema for search/filter forms
 */
export const saleFilterSchema = z.object({
  // Text search (sale number)
  search: z
    .string()
    .max(255, 'Search query cannot exceed 255 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),

  // Status filters
  sale_status: z.array(saleStatusEnum).optional(),
  payment_status: z.array(paymentStatusEnum).optional(),

  // Customer filter
  id_customer: uuidSchema.optional(),

  // Date range filter
  date_range: saleDateRangeSchema.optional(),

  // Amount range filter
  amount_range: amountRangeSchema,

  // Currency filter
  currency: z.array(currencyCodeSchema).optional(),

  // Boolean filters
  has_customer: z.boolean().optional(),
  has_discount: z.boolean().optional(),
  is_fully_paid: z.boolean().optional(),

  // Sorting
  sort_by: z
    .enum([
      'sale_number',
      'sale_date',
      'total_amount',
      'paid_amount',
      'sale_status',
      'payment_status',
      'created_at',
      'updated_at',
    ])
    .optional()
    .default('sale_date'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),

  // Pagination
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Enum types
export type SaleStatus = z.infer<typeof saleStatusEnum>;
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;
export type PaymentType = z.infer<typeof paymentTypeEnum>;
export type DiscountType = z.infer<typeof discountTypeEnum>;
export type ChequeStatus = z.infer<typeof chequeStatusEnum>;
export type SaleItemStatus = z.infer<typeof saleItemStatusEnum>;

// Schema input types
export type SaleInput = z.infer<typeof saleSchema>;
export type SaleCreateInput = z.infer<typeof saleCreateSchema>;
export type SaleUpdateInput = z.infer<typeof saleUpdateSchema>;
export type SaleCompleteInput = z.infer<typeof saleCompleteSchema>;
export type SaleVoidInput = z.infer<typeof saleVoidSchema>;

export type SaleItemInput = z.infer<typeof saleItemSchema>;
export type SaleItemCreateInput = z.infer<typeof saleItemCreateSchema>;
export type SaleItemUpdateInput = z.infer<typeof saleItemUpdateSchema>;
export type SaleItemReturnInput = z.infer<typeof saleItemReturnSchema>;

export type SalePaymentInput = z.infer<typeof salePaymentSchema>;
export type SalePaymentSimpleInput = z.infer<typeof salePaymentSimpleSchema>;

export type DiscountInput = z.infer<typeof discountSchema>;
export type OptionalDiscountInput = z.infer<typeof optionalDiscountSchema>;

export type SaleFilterInput = z.infer<typeof saleFilterSchema>;
export type SaleDateRangeInput = z.infer<typeof saleDateRangeSchema>;
export type AmountRangeInput = z.infer<typeof amountRangeSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates sale data and returns typed result
 */
export function validateSale(data: unknown): {
  success: boolean;
  data?: SaleInput;
  errors?: z.ZodError;
} {
  const result = saleSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates sale item data and returns typed result
 */
export function validateSaleItem(data: unknown): {
  success: boolean;
  data?: SaleItemCreateInput;
  errors?: z.ZodError;
} {
  const result = saleItemCreateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates sale payment data and returns typed result
 */
export function validateSalePayment(data: unknown): {
  success: boolean;
  data?: SalePaymentInput;
  errors?: z.ZodError;
} {
  const result = salePaymentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates discount data and returns typed result
 */
export function validateDiscount(data: unknown): {
  success: boolean;
  data?: DiscountInput;
  errors?: z.ZodError;
} {
  const result = discountSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates sale filter data and returns typed result with defaults
 */
export function validateSaleFilter(data: unknown): {
  success: boolean;
  data?: SaleFilterInput;
  errors?: z.ZodError;
} {
  const result = saleFilterSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Formats validation errors into a user-friendly object
 * Returns an object with field names as keys and error messages as values
 */
export function formatSaleErrors(error: z.ZodError): Record<string, string> {
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
 * Calculates discount amount based on type and value
 */
export function calculateDiscountAmount(
  subtotal: number,
  discountType: DiscountType | null | undefined,
  discountValue: number | null | undefined
): number {
  if (
    !discountType ||
    discountValue === null ||
    discountValue === undefined ||
    discountValue === 0
  ) {
    return 0;
  }

  if (discountType === 'percentage') {
    return (subtotal * discountValue) / 100;
  }

  // Fixed discount cannot exceed subtotal
  return Math.min(discountValue, subtotal);
}

/**
 * Determines payment status based on paid and total amounts
 */
export function determinePaymentStatus(paidAmount: number, totalAmount: number): PaymentStatus {
  if (paidAmount >= totalAmount) {
    return 'paid';
  }
  if (paidAmount > 0) {
    return 'partial';
  }
  return 'unpaid';
}
