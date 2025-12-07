/**
 * Workshop Zod Validation Schemas
 * Validation schemas for workshop forms and data operations
 *
 * These schemas handle validation for:
 * - workshops table (internal/external workshops)
 * - workshop_orders table (repair, custom, resize, polish, engrave, other)
 * - workshop_transactions table (immutable ledger)
 *
 * Database schema key fields:
 * - workshops: workshop_name, is_internal, contact_person, specialization (varchar, NOT array), status
 * - workshop_orders: id_workshop_order, order_number, item_source, order_type, status,
 *   received_date, estimated_completion_date, completed_date, delivered_date,
 *   payment_status, paid_amount, materials_used (jsonb), labor_cost
 * - workshop_transactions: sequence_number, debit_amount, credit_amount, balance_after
 *
 * @module lib/utils/schemas/workshop
 */

import { z } from 'zod';

import { uuidSchema, dateStringSchema } from '../validation';

// =============================================================================
// WORKSHOP ENUMS
// =============================================================================

/**
 * Workshop order type enum - matches workshop_orders.order_type in database
 */
export const workshopOrderTypeEnum = z.enum(
  ['repair', 'custom', 'resize', 'polish', 'engrave', 'other'],
  {
    errorMap: () => ({
      message: 'Order type must be repair, custom, resize, polish, engrave, or other',
    }),
  }
);

/**
 * Workshop order status enum - matches workshop_orders.status in database
 */
export const workshopOrderStatusEnum = z.enum(
  ['pending', 'in_progress', 'completed', 'cancelled'],
  {
    errorMap: () => ({
      message: 'Status must be pending, in_progress, completed, or cancelled',
    }),
  }
);

/**
 * Workshop transaction type enum - matches workshop_transactions.transaction_type
 * Used for the immutable ledger pattern
 */
export const workshopTransactionTypeEnum = z.enum(
  ['order_payment', 'advance_payment', 'adjustment', 'refund', 'opening_balance'],
  {
    errorMap: () => ({
      message:
        'Transaction type must be order_payment, advance_payment, adjustment, refund, or opening_balance',
    }),
  }
);

/**
 * Reference type for workshop transactions - what entity triggered the transaction
 */
export const workshopReferenceTypeEnum = z.enum(['order', 'payment', 'manual'], {
  errorMap: () => ({
    message: 'Reference type must be order, payment, or manual',
  }),
});

// =============================================================================
// WORKSHOP FIELD SCHEMAS
// =============================================================================

/**
 * Workshop name validation - varchar(255), required
 */
export const workshopNameSchema = z
  .string()
  .min(2, 'Workshop name must be at least 2 characters')
  .max(255, 'Workshop name cannot exceed 255 characters');

/**
 * Workshop contact person validation - varchar(255), optional
 * Note: Database column is contact_person (not contact_name)
 */
export const workshopContactPersonSchema = z
  .string()
  .max(255, 'Contact person cannot exceed 255 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Workshop phone validation - optional
 */
export const workshopPhoneSchema = z
  .string()
  .max(50, 'Phone must be less than 50 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Workshop email validation - optional but must be valid if provided
 */
export const workshopEmailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email cannot exceed 255 characters')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

/**
 * Workshop specialization validation - varchar (single string, NOT array)
 * Note: Database column is specialization (varchar), NOT specializations (array)
 */
export const workshopSpecializationSchema = z
  .string()
  .max(255, 'Specialization cannot exceed 255 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Workshop status enum - matches workshops.status in database
 */
export const workshopStatusEnum = z.enum(['active', 'inactive'], {
  errorMap: () => ({
    message: 'Status must be active or inactive',
  }),
});

/**
 * Workshop address validation - text, optional
 */
export const workshopAddressSchema = z
  .string()
  .max(500, 'Address cannot exceed 500 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Workshop notes validation - text, optional
 */
export const workshopNotesSchema = z
  .string()
  .max(5000, 'Notes cannot exceed 5000 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Order number validation - format: WO-YYYYMMDD-XXX
 */
export const orderNumberSchema = z
  .string()
  .regex(/^WO-\d{8}-\d{3,}$/, 'Order number must be in format WO-YYYYMMDD-XXX');

/**
 * Order description validation - text, optional
 */
export const orderDescriptionSchema = z
  .string()
  .max(2000, 'Description cannot exceed 2000 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Order item description validation
 */
export const orderItemDescriptionSchema = z
  .string()
  .min(2, 'Item description must be at least 2 characters')
  .max(500, 'Item description cannot exceed 500 characters');

/**
 * Estimated cost validation
 */
export const estimatedCostSchema = z
  .number()
  .min(0, 'Estimated cost cannot be negative')
  .max(99999999.9999, 'Estimated cost is too large')
  .optional()
  .nullable();

/**
 * Actual cost validation
 */
export const actualCostSchema = z
  .number()
  .min(0, 'Actual cost cannot be negative')
  .max(99999999.9999, 'Actual cost is too large')
  .optional()
  .nullable();

/**
 * Payment amount validation - positive number
 */
export const workshopPaymentAmountSchema = z
  .number()
  .positive('Payment amount must be greater than zero')
  .max(99999999.9999, 'Amount is too large');

// =============================================================================
// BASE WORKSHOP SCHEMA
// =============================================================================

/**
 * Base workshop object schema - without refinements
 * Used as foundation for other schemas that need .extend() or .partial()
 * Matches database schema columns
 */
const workshopBaseSchema = z.object({
  // Required fields
  workshop_name: workshopNameSchema,
  is_internal: z.boolean().default(false),

  // Contact information (column is contact_person, not contact_name)
  contact_person: workshopContactPersonSchema,
  phone: workshopPhoneSchema,
  email: workshopEmailSchema,

  // Address
  address: workshopAddressSchema,

  // Specialization (varchar, single value - NOT array)
  specialization: workshopSpecializationSchema,

  // Status ('active' or 'inactive', not boolean is_active)
  status: workshopStatusEnum.optional().nullable().default('active'),

  // Notes
  notes: workshopNotesSchema,
});

// =============================================================================
// MAIN WORKSHOP SCHEMA
// =============================================================================

/**
 * Workshop creation/edit schema
 * Use this for the main workshop form with all fields
 */
export const workshopSchema = workshopBaseSchema;

/**
 * Workshop creation schema with shop ID
 * Used when creating a new workshop
 */
export const workshopCreateSchema = workshopBaseSchema.extend({
  // Shop ID is required for creation (set programmatically)
  id_shop: uuidSchema.optional(),
});

/**
 * Workshop update schema - all fields optional
 * Used for partial updates
 */
export const workshopUpdateSchema = workshopBaseSchema.partial().extend({
  // ID is required for updates
  id_workshop: uuidSchema.optional(),
});

// =============================================================================
// WORKSHOP ORDER SCHEMA
// =============================================================================

/**
 * Item source enum - where the item came from
 */
export const itemSourceEnum = z.enum(['customer', 'inventory', 'supplied'], {
  errorMap: () => ({
    message: 'Item source must be customer, inventory, or supplied',
  }),
});

/**
 * Payment status enum - payment state of the order
 */
export const paymentStatusEnum = z.enum(['unpaid', 'partial', 'paid'], {
  errorMap: () => ({
    message: 'Payment status must be unpaid, partial, or paid',
  }),
});

/**
 * Materials used schema - JSONB field for tracking materials
 */
export const materialsUsedSchema = z.record(z.unknown()).optional().nullable().default({});

/**
 * Labor cost validation
 */
export const laborCostSchema = z
  .number()
  .min(0, 'Labor cost cannot be negative')
  .max(99999999.9999, 'Labor cost is too large')
  .optional()
  .nullable()
  .default(0);

/**
 * Item description validation (for the item being worked on)
 */
export const itemDescriptionSchema = z
  .string()
  .max(1000, 'Item description cannot exceed 1000 characters')
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

/**
 * Base workshop order schema
 * Matches database schema columns
 */
const workshopOrderBaseSchema = z.object({
  // Workshop reference
  id_workshop: uuidSchema.describe('Workshop ID is required'),

  // Item source (required - where the item comes from)
  item_source: itemSourceEnum,

  // Order type (repair, custom, resize, polish, engrave, other)
  order_type: workshopOrderTypeEnum,

  // Status
  status: workshopOrderStatusEnum.optional().nullable().default('pending'),

  // Customer reference (optional - may be for internal use)
  id_customer: uuidSchema.optional().nullable(),

  // Inventory item reference (optional - item being worked on)
  id_inventory_item: uuidSchema.optional().nullable(),

  // Item description (what's being worked on)
  item_description: itemDescriptionSchema,

  // Description of work to be done
  description: orderDescriptionSchema,

  // Dates (received_date is required)
  received_date: dateStringSchema.describe('Received date is required'),
  estimated_completion_date: dateStringSchema.optional().nullable(),
  completed_date: dateStringSchema.optional().nullable(),
  delivered_date: dateStringSchema.optional().nullable(),

  // Costs
  estimated_cost: estimatedCostSchema,
  actual_cost: actualCostSchema,
  labor_cost: laborCostSchema,
  materials_used: materialsUsedSchema,

  // Payment tracking
  payment_status: paymentStatusEnum.optional().nullable().default('unpaid'),

  // Notes
  notes: workshopNotesSchema,
});

/**
 * Workshop order schema for creation/edit
 */
export const workshopOrderSchema = workshopOrderBaseSchema;

/**
 * Workshop order creation schema with shop ID
 */
export const workshopOrderCreateSchema = workshopOrderBaseSchema.extend({
  id_shop: uuidSchema.optional(),
  // Order number is generated server-side
  order_number: orderNumberSchema.optional(),
});

/**
 * Workshop order update schema - all fields optional
 */
export const workshopOrderUpdateSchema = workshopOrderBaseSchema.partial().extend({
  id_workshop_order: uuidSchema.optional(),
});

/**
 * Workshop order status update schema
 * Use this for quick status updates
 */
export const workshopOrderStatusUpdateSchema = z.object({
  id_order: uuidSchema,
  status: workshopOrderStatusEnum,
  notes: workshopNotesSchema,
  // When completing, actual_cost may be provided
  actual_cost: actualCostSchema,
  completed_at: dateStringSchema.optional().nullable(),
});

// =============================================================================
// WORKSHOP ORDER ITEM SCHEMA
// =============================================================================

/**
 * Workshop order item schema
 * Represents individual items/tasks within an order
 */
export const workshopOrderItemSchema = z.object({
  id_order: uuidSchema,
  description: orderItemDescriptionSchema,
  quantity: z.number().int().positive('Quantity must be positive').default(1),
  unit_price: z
    .number()
    .min(0, 'Unit price cannot be negative')
    .max(99999999.9999, 'Unit price is too large')
    .optional()
    .nullable(),
  total_price: z
    .number()
    .min(0, 'Total price cannot be negative')
    .max(99999999.9999, 'Total price is too large')
    .optional()
    .nullable(),
  is_completed: z.boolean().default(false),
  notes: workshopNotesSchema,
});

/**
 * Workshop order item create schema
 */
export const workshopOrderItemCreateSchema = workshopOrderItemSchema.extend({
  id_shop: uuidSchema.optional(),
});

/**
 * Workshop order item update schema
 */
export const workshopOrderItemUpdateSchema = workshopOrderItemSchema.partial().extend({
  id_order_item: uuidSchema.optional(),
});

// =============================================================================
// WORKSHOP PAYMENT SCHEMA
// =============================================================================

/**
 * Workshop payment schema for recording payments to workshops
 * This creates an immutable workshop_transaction record
 */
export const workshopPaymentSchema = z.object({
  // Workshop to pay
  id_workshop: uuidSchema.describe('Workshop ID is required'),

  // Order reference (optional - payment may be for multiple orders)
  id_order: uuidSchema.optional().nullable(),

  // Payment amount (positive value)
  amount: workshopPaymentAmountSchema,

  // Payment date
  transaction_date: dateStringSchema.describe('Payment date is required'),

  // Transaction type
  transaction_type: workshopTransactionTypeEnum.default('order_payment'),

  // Optional notes
  notes: z
    .string()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
});

/**
 * Workshop payment with reference schema
 * Used when payment is linked to a specific order
 */
export const workshopPaymentWithReferenceSchema = workshopPaymentSchema.extend({
  reference_type: workshopReferenceTypeEnum.optional().nullable(),
  reference_id: uuidSchema.optional().nullable(),
});

// =============================================================================
// WORKSHOP SEARCH/FILTER SCHEMA
// =============================================================================

/**
 * Workshop search base schema for filtering workshop lists
 */
const workshopSearchBaseSchema = z.object({
  // Text search (searches workshop_name, contact_person, phone)
  search: z
    .string()
    .max(255, 'Search query cannot exceed 255 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),

  // Filter by internal/external
  is_internal: z.boolean().optional(),

  // Filter by status (active/inactive)
  status: workshopStatusEnum.optional(),

  // Filter by specialization (searches in specializations array)
  specialization: z.string().max(100).optional(),

  // Sorting
  sort_by: z
    .enum(['workshop_name', 'contact_person', 'current_balance', 'created_at', 'updated_at'])
    .optional()
    .default('workshop_name'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),

  // Pagination
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

/**
 * Workshop search schema
 */
export const workshopSearchSchema = workshopSearchBaseSchema;

/**
 * Workshop order search schema for filtering order lists
 */
const workshopOrderSearchBaseSchema = z.object({
  // Text search (searches order_number, description)
  search: z
    .string()
    .max(255, 'Search query cannot exceed 255 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),

  // Filter by workshop
  id_workshop: uuidSchema.optional(),

  // Filter by customer
  id_customer: uuidSchema.optional(),

  // Filter by order type
  order_type: workshopOrderTypeEnum.optional(),

  // Filter by status
  status: workshopOrderStatusEnum.optional(),

  // Filter by payment status
  payment_status: paymentStatusEnum.optional(),

  // Filter by date range (on received_date)
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),

  // Filter overdue orders (estimated_completion_date < today and not completed)
  is_overdue: z.boolean().optional(),

  // Sorting
  sort_by: z
    .enum([
      'order_number',
      'created_at',
      'received_date',
      'estimated_completion_date',
      'status',
      'estimated_cost',
      'actual_cost',
      'payment_status',
    ])
    .optional()
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),

  // Pagination
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

/**
 * Workshop order search schema with date validation
 */
export const workshopOrderSearchSchema = workshopOrderSearchBaseSchema.refine(
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

// =============================================================================
// WORKSHOP QUICK ADD SCHEMA
// =============================================================================

/**
 * Simplified workshop schema for quick add (minimal fields)
 */
export const workshopQuickAddSchema = z.object({
  workshop_name: workshopNameSchema,
  is_internal: z.boolean().default(false),
  contact_person: workshopContactPersonSchema,
  phone: workshopPhoneSchema,
});

// =============================================================================
// WORKSHOP TRANSACTION SCHEMA (UI)
// =============================================================================

/**
 * Workshop transaction schema for recording payments via UI
 * Simplified version for the RecordPaymentModal
 */
export const workshopTransactionSchema = z.object({
  // Order reference (required for recording payments)
  id_workshop_order: uuidSchema.describe('Order ID is required'),

  // Workshop reference
  id_workshop: uuidSchema.describe('Workshop ID is required'),

  // Transaction type
  transaction_type: z.enum(['payment', 'advance', 'refund', 'adjustment']).default('payment'),

  // Amount (positive value)
  amount: z
    .number()
    .positive('Payment amount must be greater than zero')
    .max(99999999.9999, 'Amount is too large'),

  // Payment method
  payment_method: z
    .string()
    .max(50, 'Payment method cannot exceed 50 characters')
    .optional()
    .nullable()
    .default('cash'),

  // Reference number
  reference_number: z
    .string()
    .max(100, 'Reference number cannot exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  // Notes
  notes: z
    .string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
});

/**
 * Workshop transaction input type for UI forms
 */
export type WorkshopTransactionUIInput = z.infer<typeof workshopTransactionSchema>;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Enum types
export type WorkshopOrderType = z.infer<typeof workshopOrderTypeEnum>;
export type WorkshopOrderStatus = z.infer<typeof workshopOrderStatusEnum>;
export type WorkshopTransactionType = z.infer<typeof workshopTransactionTypeEnum>;
export type WorkshopReferenceType = z.infer<typeof workshopReferenceTypeEnum>;
export type WorkshopStatus = z.infer<typeof workshopStatusEnum>;
export type ItemSource = z.infer<typeof itemSourceEnum>;
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;

// Schema input types
export type WorkshopInput = z.infer<typeof workshopSchema>;
export type WorkshopCreateInput = z.infer<typeof workshopCreateSchema>;
export type WorkshopUpdateInput = z.infer<typeof workshopUpdateSchema>;
export type WorkshopQuickAddInput = z.infer<typeof workshopQuickAddSchema>;

export type WorkshopOrderInput = z.infer<typeof workshopOrderSchema>;
export type WorkshopOrderCreateInput = z.infer<typeof workshopOrderCreateSchema>;
export type WorkshopOrderUpdateInput = z.infer<typeof workshopOrderUpdateSchema>;
export type WorkshopOrderStatusUpdateInput = z.infer<typeof workshopOrderStatusUpdateSchema>;

export type WorkshopOrderItemInput = z.infer<typeof workshopOrderItemSchema>;
export type WorkshopOrderItemCreateInput = z.infer<typeof workshopOrderItemCreateSchema>;
export type WorkshopOrderItemUpdateInput = z.infer<typeof workshopOrderItemUpdateSchema>;

export type WorkshopPaymentInput = z.infer<typeof workshopPaymentSchema>;
export type WorkshopPaymentWithReferenceInput = z.infer<typeof workshopPaymentWithReferenceSchema>;

export type WorkshopSearchInput = z.infer<typeof workshopSearchSchema>;
export type WorkshopOrderSearchInput = z.infer<typeof workshopOrderSearchSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates workshop data and returns typed result
 */
export function validateWorkshop(data: unknown): {
  success: boolean;
  data?: WorkshopInput;
  errors?: z.ZodError;
} {
  const result = workshopSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates workshop quick add data and returns typed result
 */
export function validateWorkshopQuickAdd(data: unknown): {
  success: boolean;
  data?: WorkshopQuickAddInput;
  errors?: z.ZodError;
} {
  const result = workshopQuickAddSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates workshop order data and returns typed result
 */
export function validateWorkshopOrder(data: unknown): {
  success: boolean;
  data?: WorkshopOrderInput;
  errors?: z.ZodError;
} {
  const result = workshopOrderSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates workshop payment data and returns typed result
 */
export function validateWorkshopPayment(data: unknown): {
  success: boolean;
  data?: WorkshopPaymentInput;
  errors?: z.ZodError;
} {
  const result = workshopPaymentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates workshop search/filter data and returns typed result with defaults
 */
export function validateWorkshopSearch(data: unknown): {
  success: boolean;
  data?: WorkshopSearchInput;
  errors?: z.ZodError;
} {
  const result = workshopSearchSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates workshop order search/filter data and returns typed result
 */
export function validateWorkshopOrderSearch(data: unknown): {
  success: boolean;
  data?: WorkshopOrderSearchInput;
  errors?: z.ZodError;
} {
  const result = workshopOrderSearchSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Formats validation errors into a user-friendly object
 * Returns an object with field names as keys and error messages as values
 */
export function formatWorkshopErrors(error: z.ZodError): Record<string, string> {
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
 * Generates an order number in format WO-YYYYMMDD-XXX
 * @param sequenceNumber - The sequence number for the day
 * @param date - Optional date to use (defaults to today)
 */
export function generateOrderNumberFormat(sequenceNumber: number, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const sequence = String(sequenceNumber).padStart(3, '0');
  return `WO-${year}${month}${day}-${sequence}`;
}

/**
 * Parses an order number and extracts date and sequence
 * @param orderNumber - The order number to parse
 */
export function parseOrderNumber(orderNumber: string): {
  date: Date;
  sequence: number;
} | null {
  const match = orderNumber.match(/^WO-(\d{4})(\d{2})(\d{2})-(\d{3,})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, sequence] = match;
  return {
    date: new Date(Number(year), Number(month) - 1, Number(day)),
    sequence: Number(sequence),
  };
}
