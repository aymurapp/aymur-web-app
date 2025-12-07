/**
 * Delivery Zod Validation Schemas
 * Validation schemas for delivery and courier forms and data operations
 *
 * These schemas match the database constraints defined in:
 * - deliveries table
 * - courier_companies table
 * - courier_transactions table (immutable ledger)
 *
 * Key tables:
 * - deliveries: id_delivery, id_shop, id_sale, id_courier, tracking_number, status, delivery_address
 * - courier_companies: id_courier, id_shop, company_name, current_balance
 * - courier_transactions: immutable ledger for courier financial transactions
 *
 * @module lib/utils/schemas/delivery
 */

import { z } from 'zod';

import { uuidSchema, phoneSchema, dateStringSchema } from '../validation';

// =============================================================================
// DELIVERY STATUS ENUM
// =============================================================================

/**
 * Delivery status enum - matches deliveries.status in database
 * Represents the lifecycle of a delivery
 */
export const deliveryStatusEnum = z.enum(
  ['pending', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled'],
  {
    errorMap: () => ({
      message: 'Status must be pending, picked_up, in_transit, delivered, failed, or cancelled',
    }),
  }
);

/**
 * Cost paid by enum - who pays for the delivery
 */
export const costPaidByEnum = z.enum(['shop', 'customer', 'split'], {
  errorMap: () => ({
    message: 'Cost paid by must be shop, customer, or split',
  }),
});

/**
 * Courier status enum - matches courier_companies.status in database
 */
export const courierStatusEnum = z.enum(['active', 'inactive', 'suspended'], {
  errorMap: () => ({
    message: 'Status must be active, inactive, or suspended',
  }),
});

/**
 * Courier transaction type enum - matches courier_transactions.transaction_type
 * Used for the immutable ledger pattern
 */
export const courierTransactionTypeEnum = z.enum(
  ['delivery_charge', 'payment', 'adjustment', 'refund', 'opening_balance'],
  {
    errorMap: () => ({
      message:
        'Transaction type must be delivery_charge, payment, adjustment, refund, or opening_balance',
    }),
  }
);

/**
 * Reference type for courier transactions
 */
export const courierReferenceTypeEnum = z.enum(['delivery', 'payment', 'manual'], {
  errorMap: () => ({
    message: 'Reference type must be delivery, payment, or manual',
  }),
});

// =============================================================================
// ADDRESS VALIDATION SCHEMAS
// =============================================================================

/**
 * Delivery address validation - text field for full address
 */
export const deliveryAddressSchema = z
  .string()
  .min(10, 'Delivery address must be at least 10 characters')
  .max(1000, 'Delivery address cannot exceed 1000 characters')
  .transform((val) => val.trim());

/**
 * Optional delivery address
 */
export const optionalDeliveryAddressSchema = z
  .string()
  .max(1000, 'Delivery address cannot exceed 1000 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

// =============================================================================
// DELIVERY FIELD SCHEMAS
// =============================================================================

/**
 * Tracking number validation - varchar(100)
 */
export const trackingNumberSchema = z
  .string()
  .max(100, 'Tracking number cannot exceed 100 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim().toUpperCase() || null);

/**
 * Delivery cost validation - numeric, non-negative
 */
export const deliveryCostSchema = z
  .number()
  .min(0, 'Delivery cost cannot be negative')
  .max(99999999.9999, 'Delivery cost is too large');

/**
 * Recipient name validation - varchar(255)
 */
export const recipientNameSchema = z
  .string()
  .min(2, 'Recipient name must be at least 2 characters')
  .max(255, 'Recipient name cannot exceed 255 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Delivery notes validation - text, optional
 */
export const deliveryNotesSchema = z
  .string()
  .max(2000, 'Notes cannot exceed 2000 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Shipped date validation - date string
 */
export const shippedDateSchema = z
  .string()
  .refine((val) => !val || !isNaN(new Date(val).getTime()), {
    message: 'Invalid shipped date format',
  })
  .optional()
  .nullable();

/**
 * Estimated delivery date validation
 */
export const estimatedDeliveryDateSchema = z
  .string()
  .refine((val) => !val || !isNaN(new Date(val).getTime()), {
    message: 'Invalid estimated delivery date format',
  })
  .optional()
  .nullable();

/**
 * Delivered date validation
 */
export const deliveredDateSchema = z
  .string()
  .refine((val) => !val || !isNaN(new Date(val).getTime()), {
    message: 'Invalid delivered date format',
  })
  .optional()
  .nullable();

// =============================================================================
// COURIER FIELD SCHEMAS
// =============================================================================

/**
 * Courier company name validation - varchar(255), required
 */
export const courierCompanyNameSchema = z
  .string()
  .min(2, 'Company name must be at least 2 characters')
  .max(255, 'Company name cannot exceed 255 characters');

/**
 * Contact person validation - varchar(255), optional
 */
export const courierContactPersonSchema = z
  .string()
  .max(255, 'Contact person name cannot exceed 255 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Courier phone validation - optional
 */
export const courierPhoneSchema = phoneSchema.optional().nullable();

/**
 * Courier email validation - optional but must be valid if provided
 */
export const courierEmailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email cannot exceed 255 characters')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

/**
 * Website validation - varchar(255), optional
 */
export const courierWebsiteSchema = z
  .string()
  .url('Invalid website URL')
  .max(255, 'Website URL cannot exceed 255 characters')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

/**
 * Courier notes validation - text, optional
 */
export const courierNotesSchema = z
  .string()
  .max(5000, 'Notes cannot exceed 5000 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Payment amount validation - positive number for courier payments
 */
export const courierPaymentAmountSchema = z
  .number()
  .positive('Payment amount must be greater than zero')
  .max(99999999.9999, 'Amount is too large');

// =============================================================================
// DELIVERY SCHEMAS
// =============================================================================

/**
 * Base delivery object schema
 */
const deliveryBaseSchema = z.object({
  // Required fields
  id_sale: uuidSchema.describe('Sale ID is required'),
  id_courier: uuidSchema.describe('Courier ID is required'),
  delivery_cost: deliveryCostSchema,
  cost_paid_by: costPaidByEnum,

  // Optional fields
  tracking_number: trackingNumberSchema,
  status: deliveryStatusEnum.default('pending'),
  shipped_date: shippedDateSchema,
  estimated_delivery_date: estimatedDeliveryDateSchema,
  delivered_date: deliveredDateSchema,
  recipient_name: recipientNameSchema,
  delivery_address: optionalDeliveryAddressSchema,
  notes: deliveryNotesSchema,
});

/**
 * Delivery creation schema
 * Use this when creating a new delivery
 */
export const deliverySchema = deliveryBaseSchema;

/**
 * Delivery creation schema with shop ID
 */
export const deliveryCreateSchema = deliveryBaseSchema.extend({
  id_shop: uuidSchema.optional(),
});

/**
 * Delivery update schema - all fields optional except id
 */
export const deliveryUpdateSchema = deliveryBaseSchema.partial().extend({
  id_delivery: uuidSchema.optional(),
});

/**
 * Delivery status update schema
 * Used for updating just the status with optional related fields
 */
export const deliveryStatusUpdateSchema = z
  .object({
    id_delivery: uuidSchema.describe('Delivery ID is required'),
    status: deliveryStatusEnum,
    tracking_number: trackingNumberSchema,
    shipped_date: shippedDateSchema,
    delivered_date: deliveredDateSchema,
    notes: deliveryNotesSchema,
  })
  .refine(
    (data) => {
      // If status is delivered, delivered_date should be provided
      if (data.status === 'delivered' && !data.delivered_date) {
        return false;
      }
      return true;
    },
    {
      message: 'Delivered date is required when status is delivered',
      path: ['delivered_date'],
    }
  )
  .refine(
    (data) => {
      // If status is picked_up or in_transit, shipped_date should be provided
      if (['picked_up', 'in_transit'].includes(data.status) && !data.shipped_date) {
        return false;
      }
      return true;
    },
    {
      message: 'Shipped date is required when status is picked_up or in_transit',
      path: ['shipped_date'],
    }
  );

// =============================================================================
// COURIER SCHEMAS
// =============================================================================

/**
 * Base courier company schema
 */
const courierBaseSchema = z.object({
  // Required fields
  company_name: courierCompanyNameSchema,

  // Optional fields
  contact_person: courierContactPersonSchema,
  phone: courierPhoneSchema,
  email: courierEmailSchema,
  website: courierWebsiteSchema,
  status: courierStatusEnum.default('active'),
  notes: courierNotesSchema,
});

/**
 * Courier creation/edit schema
 */
export const courierSchema = courierBaseSchema;

/**
 * Courier creation schema with shop ID
 */
export const courierCreateSchema = courierBaseSchema.extend({
  id_shop: uuidSchema.optional(),
});

/**
 * Courier update schema - all fields optional
 */
export const courierUpdateSchema = courierBaseSchema.partial().extend({
  id_courier: uuidSchema.optional(),
});

// =============================================================================
// COURIER PAYMENT SCHEMA
// =============================================================================

/**
 * Courier payment schema for recording payments to couriers
 * This creates an immutable courier_transaction record
 */
export const courierPaymentSchema = z.object({
  // Courier to pay
  id_courier: uuidSchema.describe('Courier ID is required'),

  // Payment amount (positive value - will be recorded as reducing what we owe)
  amount: courierPaymentAmountSchema,

  // Optional description
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
});

/**
 * Courier payment with reference schema
 * Used when payment is linked to a specific delivery
 */
export const courierPaymentWithReferenceSchema = courierPaymentSchema.extend({
  reference_type: courierReferenceTypeEnum.optional().nullable(),
  reference_id: uuidSchema.optional().nullable(),
});

// =============================================================================
// SEARCH/FILTER SCHEMAS
// =============================================================================

/**
 * Delivery search/filter schema
 */
export const deliverySearchSchema = z.object({
  // Text search (searches tracking_number, recipient_name)
  search: z
    .string()
    .max(255, 'Search query cannot exceed 255 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),

  // Filter by status
  status: deliveryStatusEnum.optional(),

  // Filter by courier
  id_courier: uuidSchema.optional().nullable(),

  // Filter by sale
  id_sale: uuidSchema.optional().nullable(),

  // Date range filter
  date_from: dateStringSchema.optional(),
  date_to: dateStringSchema.optional(),

  // Sorting
  sort_by: z
    .enum([
      'created_at',
      'shipped_date',
      'delivered_date',
      'estimated_delivery_date',
      'delivery_cost',
      'status',
    ])
    .optional()
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),

  // Pagination
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

/**
 * Courier search/filter schema
 */
export const courierSearchSchema = z.object({
  // Text search (searches company_name, contact_person, phone)
  search: z
    .string()
    .max(255, 'Search query cannot exceed 255 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),

  // Filter by status
  status: courierStatusEnum.optional(),

  // Filter by balance
  has_balance: z.boolean().optional(),

  // Sorting
  sort_by: z
    .enum(['company_name', 'current_balance', 'created_at', 'updated_at'])
    .optional()
    .default('company_name'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),

  // Pagination
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Enum types
export type DeliveryStatus = z.infer<typeof deliveryStatusEnum>;
export type CostPaidBy = z.infer<typeof costPaidByEnum>;
export type CourierStatus = z.infer<typeof courierStatusEnum>;
export type CourierTransactionType = z.infer<typeof courierTransactionTypeEnum>;
export type CourierReferenceType = z.infer<typeof courierReferenceTypeEnum>;

// Schema input types
export type DeliveryInput = z.infer<typeof deliverySchema>;
export type DeliveryCreateInput = z.infer<typeof deliveryCreateSchema>;
export type DeliveryUpdateInput = z.infer<typeof deliveryUpdateSchema>;
export type DeliveryStatusUpdateInput = z.infer<typeof deliveryStatusUpdateSchema>;

export type CourierInput = z.infer<typeof courierSchema>;
export type CourierCreateInput = z.infer<typeof courierCreateSchema>;
export type CourierUpdateInput = z.infer<typeof courierUpdateSchema>;

export type CourierPaymentInput = z.infer<typeof courierPaymentSchema>;
export type CourierPaymentWithReferenceInput = z.infer<typeof courierPaymentWithReferenceSchema>;

export type DeliverySearchInput = z.infer<typeof deliverySearchSchema>;
export type CourierSearchInput = z.infer<typeof courierSearchSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates delivery data and returns typed result
 */
export function validateDelivery(data: unknown): {
  success: boolean;
  data?: DeliveryInput;
  errors?: z.ZodError;
} {
  const result = deliverySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates delivery status update data
 */
export function validateDeliveryStatusUpdate(data: unknown): {
  success: boolean;
  data?: DeliveryStatusUpdateInput;
  errors?: z.ZodError;
} {
  const result = deliveryStatusUpdateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates courier data and returns typed result
 */
export function validateCourier(data: unknown): {
  success: boolean;
  data?: CourierInput;
  errors?: z.ZodError;
} {
  const result = courierSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates courier payment data and returns typed result
 */
export function validateCourierPayment(data: unknown): {
  success: boolean;
  data?: CourierPaymentInput;
  errors?: z.ZodError;
} {
  const result = courierPaymentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates delivery search/filter data
 */
export function validateDeliverySearch(data: unknown): {
  success: boolean;
  data?: DeliverySearchInput;
  errors?: z.ZodError;
} {
  const result = deliverySearchSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates courier search/filter data
 */
export function validateCourierSearch(data: unknown): {
  success: boolean;
  data?: CourierSearchInput;
  errors?: z.ZodError;
} {
  const result = courierSearchSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Formats validation errors into a user-friendly object
 */
export function formatDeliveryErrors(error: z.ZodError): Record<string, string> {
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
 * Helper to determine if a delivery status allows editing
 */
export function isDeliveryEditable(status: DeliveryStatus): boolean {
  return ['pending', 'picked_up', 'in_transit'].includes(status);
}

/**
 * Helper to get allowed status transitions
 */
export function getAllowedStatusTransitions(currentStatus: DeliveryStatus): DeliveryStatus[] {
  const transitions: Record<DeliveryStatus, DeliveryStatus[]> = {
    pending: ['picked_up', 'cancelled'],
    picked_up: ['in_transit', 'failed', 'cancelled'],
    in_transit: ['delivered', 'failed'],
    delivered: [], // Terminal state
    failed: ['pending', 'picked_up'], // Can retry
    cancelled: [], // Terminal state
  };

  return transitions[currentStatus] || [];
}
