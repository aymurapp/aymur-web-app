/**
 * Inventory Zod Validation Schemas
 * Validation schemas for inventory items, stones, and certifications
 *
 * These schemas match the database constraints defined in:
 * - inventory_items table
 * - item_stones table
 * - item_certifications table
 */

import { z } from 'zod';

import { uuidSchema, descriptionSchema, notesSchema, dateStringSchema } from '../validation';

// =============================================================================
// INVENTORY ITEM ENUMS
// =============================================================================

/**
 * Item type enum - matches inventory_items.item_type CHECK constraint
 */
export const itemTypeEnum = z.enum(['raw_material', 'component', 'finished'], {
  errorMap: () => ({ message: 'Invalid item type. Must be raw_material, component, or finished' }),
});

/**
 * Ownership type enum - matches inventory_items.ownership_type CHECK constraint
 */
export const ownershipTypeEnum = z.enum(['owned', 'consignment', 'memo'], {
  errorMap: () => ({ message: 'Invalid ownership type. Must be owned, consignment, or memo' }),
});

/**
 * Source type enum - matches inventory_items.source_type CHECK constraint
 */
export const sourceTypeEnum = z.enum(['purchase', 'recycled'], {
  errorMap: () => ({ message: 'Invalid source type. Must be purchase or recycled' }),
});

/**
 * Inventory status enum - matches inventory_items.status CHECK constraint
 */
export const inventoryStatusEnum = z.enum(
  ['available', 'reserved', 'sold', 'workshop', 'transferred', 'damaged', 'returned'],
  {
    errorMap: () => ({
      message:
        'Invalid status. Must be available, reserved, sold, workshop, transferred, damaged, or returned',
    }),
  }
);

/**
 * Gold color enum - matches inventory_items.gold_color CHECK constraint
 */
export const goldColorEnum = z.enum(['yellow', 'white', 'rose'], {
  errorMap: () => ({ message: 'Invalid gold color. Must be yellow, white, or rose' }),
});

/**
 * Certification type enum - matches item_certifications.certification_type CHECK constraint
 */
export const certificationTypeEnum = z.enum(['diamond', 'gemstone', 'metal', 'appraisal'], {
  errorMap: () => ({
    message: 'Invalid certification type. Must be diamond, gemstone, metal, or appraisal',
  }),
});

// =============================================================================
// INVENTORY ITEM FIELD SCHEMAS
// =============================================================================

/**
 * Item name validation - varchar(255), required
 */
export const itemNameSchema = z
  .string()
  .min(1, 'Item name is required')
  .max(255, 'Item name cannot exceed 255 characters');

/**
 * Barcode validation - varchar(100), optional, alphanumeric with dash/underscore
 */
export const inventoryBarcodeSchema = z
  .string()
  .max(100, 'Barcode cannot exceed 100 characters')
  .regex(/^[a-zA-Z0-9-_]*$/, 'Barcode can only contain letters, numbers, dashes, and underscores')
  .optional()
  .nullable();

/**
 * Inventory SKU validation - varchar(100), optional
 */
export const inventorySkuSchema = z
  .string()
  .max(100, 'SKU cannot exceed 100 characters')
  .regex(/^[a-zA-Z0-9-_]*$/, 'SKU can only contain letters, numbers, dashes, and underscores')
  .optional()
  .nullable();

/**
 * Weight in grams - numeric(10,3), must be positive
 */
export const weightGramsSchema = z
  .number()
  .positive('Weight must be greater than 0')
  .max(9999999.999, 'Weight cannot exceed 9,999,999.999 grams');

/**
 * Stone weight in carats - numeric(10,3), must be non-negative
 */
export const stoneWeightCaratsSchema = z
  .number()
  .min(0, 'Stone weight cannot be negative')
  .max(9999999.999, 'Stone weight cannot exceed 9,999,999.999 carats')
  .optional()
  .nullable();

/**
 * Purchase price - numeric(15,4), must be non-negative
 */
export const purchasePriceSchema = z
  .number()
  .min(0, 'Purchase price cannot be negative')
  .max(99999999999.9999, 'Purchase price is too large');

/**
 * Currency code - varchar(3), ISO 4217
 */
export const currencyCodeSchema = z
  .string()
  .length(3, 'Currency must be a 3-letter ISO code')
  .toUpperCase();

// =============================================================================
// INVENTORY ITEM SCHEMA
// =============================================================================

/**
 * Base inventory item schema for form validation
 * Matches inventory_items table structure
 */
export const inventoryItemSchema = z
  .object({
    // Required fields
    item_name: itemNameSchema,
    source_type: sourceTypeEnum,
    weight_grams: weightGramsSchema,
    purchase_price: purchasePriceSchema,
    currency: currencyCodeSchema,

    // Optional fields with defaults in DB
    item_type: itemTypeEnum.default('finished'),
    ownership_type: ownershipTypeEnum.default('owned'),
    status: inventoryStatusEnum.default('available'),

    // Optional string fields
    barcode: inventoryBarcodeSchema,
    sku: inventorySkuSchema,
    description: descriptionSchema,

    // Foreign key references (UUIDs)
    id_category: uuidSchema.optional().nullable(),
    id_metal_type: uuidSchema.optional().nullable(),
    id_metal_purity: uuidSchema.optional().nullable(),
    id_stone_type: uuidSchema.optional().nullable(),
    id_size: uuidSchema.optional().nullable(),
    id_purchase: uuidSchema.optional().nullable(),
    id_recycled_item: uuidSchema.optional().nullable(),

    // Metal-specific fields
    gold_color: goldColorEnum.optional().nullable(),

    // Stone-specific fields
    stone_weight_carats: stoneWeightCaratsSchema,
  })
  .refine(
    (data) => {
      // Validate source_type relationship with id_purchase and id_recycled_item
      if (data.source_type === 'purchase') {
        return data.id_purchase !== null && data.id_recycled_item === null;
      }
      if (data.source_type === 'recycled') {
        return data.id_recycled_item !== null && data.id_purchase === null;
      }
      return true;
    },
    {
      message:
        'For purchase source, id_purchase is required. For recycled source, id_recycled_item is required.',
      path: ['source_type'],
    }
  );

/**
 * Simplified inventory item schema for quick add (without source validation)
 * Use this when creating items through a simplified form
 */
export const inventoryItemSimpleSchema = z.object({
  item_name: itemNameSchema,
  weight_grams: weightGramsSchema,
  purchase_price: purchasePriceSchema,
  currency: currencyCodeSchema,
  item_type: itemTypeEnum.default('finished'),
  ownership_type: ownershipTypeEnum.default('owned'),
  status: inventoryStatusEnum.default('available'),
  barcode: inventoryBarcodeSchema,
  sku: inventorySkuSchema,
  description: descriptionSchema,
  id_category: uuidSchema.optional().nullable(),
  id_metal_type: uuidSchema.optional().nullable(),
  id_metal_purity: uuidSchema.optional().nullable(),
  id_stone_type: uuidSchema.optional().nullable(),
  id_size: uuidSchema.optional().nullable(),
  gold_color: goldColorEnum.optional().nullable(),
  stone_weight_carats: stoneWeightCaratsSchema,
});

/**
 * Inventory item update schema - all fields optional except for id
 */
export const inventoryItemUpdateSchema = inventoryItemSimpleSchema.partial();

// =============================================================================
// ITEM STONES SCHEMA
// =============================================================================

/**
 * Stone count validation - integer, must be positive
 */
export const stoneCountSchema = z
  .number()
  .int('Stone count must be a whole number')
  .positive('Stone count must be at least 1')
  .default(1);

/**
 * Stone weight in carats - numeric(10,3), must be positive (required for stones)
 */
export const stoneWeightRequiredSchema = z
  .number()
  .positive('Stone weight must be greater than 0')
  .max(9999999.999, 'Stone weight cannot exceed 9,999,999.999 carats');

/**
 * Stone position - varchar(50), optional
 */
export const stonePositionSchema = z
  .string()
  .max(50, 'Position cannot exceed 50 characters')
  .optional()
  .nullable();

/**
 * Stone clarity - varchar(20), optional
 * Common grades: FL, IF, VVS1, VVS2, VS1, VS2, SI1, SI2, I1, I2, I3
 */
export const stoneClaritySchema = z
  .string()
  .max(20, 'Clarity cannot exceed 20 characters')
  .optional()
  .nullable();

/**
 * Stone color - varchar(20), optional
 * For diamonds: D-Z scale. For colored stones: descriptive colors
 */
export const stoneColorSchema = z
  .string()
  .max(20, 'Color cannot exceed 20 characters')
  .optional()
  .nullable();

/**
 * Stone cut - varchar(20), optional
 * Common cuts: Round, Princess, Oval, Marquise, Pear, Cushion, Emerald, Asscher, Radiant, Heart
 */
export const stoneCutSchema = z
  .string()
  .max(20, 'Cut cannot exceed 20 characters')
  .optional()
  .nullable();

/**
 * Estimated value - numeric(15,4), must be non-negative
 */
export const estimatedValueSchema = z
  .number()
  .min(0, 'Estimated value cannot be negative')
  .max(99999999999.9999, 'Estimated value is too large')
  .optional()
  .nullable();

/**
 * Item stone schema for form validation
 * Matches item_stones table structure
 */
export const itemStoneSchema = z.object({
  // Required fields
  id_stone_type: uuidSchema.describe('Stone type is required'),
  weight_carats: stoneWeightRequiredSchema,

  // Optional fields
  stone_count: stoneCountSchema,
  position: stonePositionSchema,
  clarity: stoneClaritySchema,
  color: stoneColorSchema,
  cut: stoneCutSchema,
  estimated_value: estimatedValueSchema,
  notes: notesSchema,

  // Context fields (usually set programmatically)
  id_item: uuidSchema.optional(),
});

/**
 * Item stone creation schema - includes required item reference
 */
export const itemStoneCreateSchema = itemStoneSchema.extend({
  id_item: uuidSchema.describe('Item ID is required'),
});

/**
 * Item stone update schema - all fields optional
 */
export const itemStoneUpdateSchema = itemStoneSchema.partial();

// =============================================================================
// ITEM CERTIFICATIONS SCHEMA
// =============================================================================

/**
 * Certificate number - varchar(100), required
 */
export const certificateNumberSchema = z
  .string()
  .min(1, 'Certificate number is required')
  .max(100, 'Certificate number cannot exceed 100 characters');

/**
 * Issuing authority - varchar(100), required
 */
export const issuingAuthoritySchema = z
  .string()
  .min(1, 'Issuing authority is required')
  .max(100, 'Issuing authority cannot exceed 100 characters');

/**
 * Appraised value - numeric(15,4), must be non-negative
 */
export const appraisedValueSchema = z
  .number()
  .min(0, 'Appraised value cannot be negative')
  .max(99999999999.9999, 'Appraised value is too large')
  .optional()
  .nullable();

/**
 * Verification URL - varchar(500), optional
 */
export const verificationUrlSchema = z
  .string()
  .max(500, 'Verification URL cannot exceed 500 characters')
  .url('Invalid URL format')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

/**
 * Date validation for certifications (YYYY-MM-DD format)
 */
export const certificationDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Invalid date' }
  )
  .optional()
  .nullable();

/**
 * Base item certification object schema (without refinements)
 * Used for extending and partial operations
 */
const itemCertificationBaseSchema = z.object({
  // Required fields
  certification_type: certificationTypeEnum,
  certificate_number: certificateNumberSchema,
  issuing_authority: issuingAuthoritySchema,

  // Optional date fields
  issue_date: certificationDateSchema,
  expiry_date: certificationDateSchema,

  // Optional value fields
  appraised_value: appraisedValueSchema,
  currency: currencyCodeSchema.optional().nullable(),

  // Optional reference fields
  id_file_upload: uuidSchema.optional().nullable(),
  verification_url: verificationUrlSchema,

  // Notes
  notes: notesSchema,

  // Context field (usually set programmatically)
  id_item: uuidSchema.optional(),
});

/**
 * Refinements for item certification validation
 */
const certificationRefinements = <T extends z.ZodTypeAny>(schema: T) =>
  schema
    .refine(
      (data: z.infer<typeof itemCertificationBaseSchema>) => {
        // If both dates are provided, issue_date must be before or equal to expiry_date
        if (data.issue_date && data.expiry_date) {
          return new Date(data.issue_date) <= new Date(data.expiry_date);
        }
        return true;
      },
      {
        message: 'Issue date must be before or equal to expiry date',
        path: ['expiry_date'],
      }
    )
    .refine(
      (data: z.infer<typeof itemCertificationBaseSchema>) => {
        // If appraised_value is provided, currency should also be provided
        if (data.appraised_value && data.appraised_value > 0 && !data.currency) {
          return false;
        }
        return true;
      },
      {
        message: 'Currency is required when appraised value is provided',
        path: ['currency'],
      }
    );

/**
 * Item certification schema for form validation
 * Matches item_certifications table structure
 */
export const itemCertificationSchema = certificationRefinements(itemCertificationBaseSchema);

/**
 * Item certification creation schema - includes required item reference
 */
export const itemCertificationCreateSchema = certificationRefinements(
  itemCertificationBaseSchema.extend({
    id_item: uuidSchema.describe('Item ID is required'),
  })
);

/**
 * Item certification update schema - all fields optional (no refinements for partial updates)
 */
export const itemCertificationUpdateSchema = itemCertificationBaseSchema
  .partial()
  .omit({ id_item: true });

// =============================================================================
// INVENTORY FILTER SCHEMA
// =============================================================================

/**
 * Price range schema for filtering
 */
export const priceRangeSchema = z
  .object({
    min: z.number().min(0, 'Minimum price cannot be negative').optional(),
    max: z.number().min(0, 'Maximum price cannot be negative').optional(),
  })
  .refine(
    (data) => {
      if (data.min !== undefined && data.max !== undefined) {
        return data.min <= data.max;
      }
      return true;
    },
    {
      message: 'Minimum price must be less than or equal to maximum price',
      path: ['max'],
    }
  )
  .optional();

/**
 * Weight range schema for filtering
 */
export const weightRangeSchema = z
  .object({
    min: z.number().min(0, 'Minimum weight cannot be negative').optional(),
    max: z.number().min(0, 'Maximum weight cannot be negative').optional(),
  })
  .refine(
    (data) => {
      if (data.min !== undefined && data.max !== undefined) {
        return data.min <= data.max;
      }
      return true;
    },
    {
      message: 'Minimum weight must be less than or equal to maximum weight',
      path: ['max'],
    }
  )
  .optional();

/**
 * Inventory filter schema for search/filter forms
 */
export const inventoryFilterSchema = z.object({
  // Text search
  search: z
    .string()
    .max(255, 'Search query cannot exceed 255 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),

  // Enum filters
  status: z.array(inventoryStatusEnum).optional(),
  item_type: z.array(itemTypeEnum).optional(),
  ownership_type: z.array(ownershipTypeEnum).optional(),
  source_type: z.array(sourceTypeEnum).optional(),
  gold_color: z.array(goldColorEnum).optional(),

  // Foreign key filters (UUIDs)
  id_category: z.array(uuidSchema).optional(),
  id_metal_type: z.array(uuidSchema).optional(),
  id_metal_purity: z.array(uuidSchema).optional(),
  id_stone_type: z.array(uuidSchema).optional(),

  // Range filters
  price_range: priceRangeSchema,
  weight_range: weightRangeSchema,

  // Date filters
  created_from: dateStringSchema.optional(),
  created_to: dateStringSchema.optional(),

  // Boolean filters
  has_barcode: z.boolean().optional(),
  has_stones: z.boolean().optional(),
  has_certifications: z.boolean().optional(),

  // Sorting
  sort_by: z
    .enum([
      'item_name',
      'sku',
      'barcode',
      'weight_grams',
      'purchase_price',
      'status',
      'created_at',
      'updated_at',
    ])
    .optional()
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),

  // Pagination
  page: z.number().int().positive().optional().default(1),
  page_size: z.number().int().min(1).max(100).optional().default(20),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Enum types
export type ItemType = z.infer<typeof itemTypeEnum>;
export type OwnershipType = z.infer<typeof ownershipTypeEnum>;
export type SourceType = z.infer<typeof sourceTypeEnum>;
export type InventoryStatus = z.infer<typeof inventoryStatusEnum>;
export type GoldColor = z.infer<typeof goldColorEnum>;
export type CertificationType = z.infer<typeof certificationTypeEnum>;

// Schema input types
export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;
export type InventoryItemSimpleInput = z.infer<typeof inventoryItemSimpleSchema>;
export type InventoryItemUpdateInput = z.infer<typeof inventoryItemUpdateSchema>;

export type ItemStoneInput = z.infer<typeof itemStoneSchema>;
export type ItemStoneCreateInput = z.infer<typeof itemStoneCreateSchema>;
export type ItemStoneUpdateInput = z.infer<typeof itemStoneUpdateSchema>;

export type ItemCertificationInput = z.infer<typeof itemCertificationSchema>;
export type ItemCertificationCreateInput = z.infer<typeof itemCertificationCreateSchema>;
export type ItemCertificationUpdateInput = z.infer<typeof itemCertificationUpdateSchema>;

export type InventoryFilterInput = z.infer<typeof inventoryFilterSchema>;
export type PriceRangeInput = z.infer<typeof priceRangeSchema>;
export type WeightRangeInput = z.infer<typeof weightRangeSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates inventory item data and returns typed result
 */
export function validateInventoryItem(data: unknown): {
  success: boolean;
  data?: InventoryItemInput;
  errors?: z.ZodError;
} {
  const result = inventoryItemSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates item stone data and returns typed result
 */
export function validateItemStone(data: unknown): {
  success: boolean;
  data?: ItemStoneCreateInput;
  errors?: z.ZodError;
} {
  const result = itemStoneCreateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates item certification data and returns typed result
 */
export function validateItemCertification(data: unknown): {
  success: boolean;
  data?: ItemCertificationCreateInput;
  errors?: z.ZodError;
} {
  const result = itemCertificationCreateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates inventory filter data and returns typed result with defaults
 */
export function validateInventoryFilter(data: unknown): {
  success: boolean;
  data?: InventoryFilterInput;
  errors?: z.ZodError;
} {
  const result = inventoryFilterSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
