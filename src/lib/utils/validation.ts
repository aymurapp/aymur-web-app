/**
 * Common Zod Validation Schemas
 * Reusable validation schemas for forms and data validation
 */

import { z } from 'zod';

// =============================================================================
// PRIMITIVE SCHEMAS
// =============================================================================

/**
 * Email validation schema with proper error message
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Phone validation schema supporting international format (E.164)
 * Allows optional + prefix followed by 1-15 digits
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .or(z.literal('')); // Allow empty string for optional fields

/**
 * Strict phone schema that requires a value
 */
export const phoneRequiredSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

/**
 * Password validation schema with security requirements
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

/**
 * Strong password with special character requirement
 */
export const strongPasswordSchema = passwordSchema.regex(
  /[!@#$%^&*(),.?":{}|<>]/,
  'Password must contain a special character'
);

/**
 * Currency amount validation (positive numbers)
 */
export const currencySchema = z.number().positive('Amount must be positive');

/**
 * Optional currency schema that allows null/undefined
 */
export const optionalCurrencySchema = z
  .number()
  .positive('Amount must be positive')
  .nullable()
  .optional();

/**
 * Weight validation (positive numbers for jewelry weight in grams)
 */
export const weightSchema = z.number().positive('Weight must be positive');

/**
 * Weight schema with realistic jewelry constraints
 */
export const jewelryWeightSchema = z
  .number()
  .positive('Weight must be positive')
  .max(10000, 'Weight cannot exceed 10 kg');

// =============================================================================
// ID SCHEMAS
// =============================================================================

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid ID format');

/**
 * Shop ID validation (UUID)
 */
export const shopIdSchema = uuidSchema.describe('Shop ID');

/**
 * User ID validation (UUID)
 */
export const userIdSchema = uuidSchema.describe('User ID');

/**
 * Generic entity ID validation
 */
export const entityIdSchema = uuidSchema.describe('Entity ID');

// =============================================================================
// NAME AND TEXT SCHEMAS
// =============================================================================

/**
 * Person full name validation
 */
export const fullNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name cannot exceed 100 characters')
  .regex(/^[a-zA-Z\s\u0600-\u06FF'-]+$/, 'Name contains invalid characters');

/**
 * Shop/business name validation
 */
export const shopNameSchema = z
  .string()
  .min(2, 'Shop name must be at least 2 characters')
  .max(100, 'Shop name cannot exceed 100 characters');

/**
 * Generic description field
 */
export const descriptionSchema = z
  .string()
  .max(1000, 'Description cannot exceed 1000 characters')
  .optional();

/**
 * Notes field validation
 */
export const notesSchema = z.string().max(2000, 'Notes cannot exceed 2000 characters').optional();

// =============================================================================
// ADDRESS SCHEMAS
// =============================================================================

/**
 * Full address validation
 */
export const addressSchema = z.object({
  country: z.string().min(1, 'Country is required'),
  province: z.string().optional(),
  city: z.string().optional(),
  address: z.string().max(500, 'Address cannot exceed 500 characters').optional(),
  postalCode: z.string().max(20, 'Postal code cannot exceed 20 characters').optional(),
});

/**
 * Partial address for optional fields
 */
export const partialAddressSchema = addressSchema.partial();

// =============================================================================
// AUTHENTICATION FORM SCHEMAS
// =============================================================================

/**
 * Login form validation
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Registration form validation
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
});

/**
 * Registration with password confirmation
 */
export const registerWithConfirmSchema = registerSchema
  .extend({
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Password reset request
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Password reset form
 */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Change password form (requires current password)
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

// =============================================================================
// BUSINESS ENTITY SCHEMAS
// =============================================================================

/**
 * Customer creation/edit form
 */
export const customerSchema = z.object({
  full_name: fullNameSchema,
  phone: phoneSchema.optional(),
  email: emailSchema.optional().or(z.literal('')),
  credit_limit: optionalCurrencySchema,
  notes: notesSchema,
  country: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  address: z.string().max(500).optional(),
});

/**
 * Supplier creation/edit form
 */
export const supplierSchema = z.object({
  supplier_name: z.string().min(2, 'Supplier name must be at least 2 characters'),
  contact_person: z.string().optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional().or(z.literal('')),
  id_category: uuidSchema.optional(),
  notes: notesSchema,
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().max(500).optional(),
});

// =============================================================================
// JEWELRY-SPECIFIC SCHEMAS
// =============================================================================

/**
 * Metal purity validation (parts per thousand)
 */
export const metalPuritySchema = z
  .number()
  .min(1, 'Purity must be at least 1')
  .max(999, 'Purity cannot exceed 999');

/**
 * Barcode validation
 */
export const barcodeSchema = z
  .string()
  .min(1, 'Barcode is required')
  .max(50, 'Barcode cannot exceed 50 characters')
  .regex(/^[a-zA-Z0-9-_]+$/, 'Barcode contains invalid characters');

/**
 * SKU validation
 */
export const skuSchema = z
  .string()
  .max(50, 'SKU cannot exceed 50 characters')
  .regex(/^[a-zA-Z0-9-_]*$/, 'SKU contains invalid characters')
  .optional();

// =============================================================================
// DATE SCHEMAS
// =============================================================================

/**
 * Date string validation (ISO format)
 */
export const dateStringSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: 'Invalid date format' }
);

/**
 * Date range validation
 */
export const dateRangeSchema = z
  .object({
    startDate: dateStringSchema,
    endDate: dateStringSchema,
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
  });

// =============================================================================
// PAGINATION AND FILTERING SCHEMAS
// =============================================================================

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

/**
 * Sort parameters
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Common list query parameters
 */
export const listQuerySchema = paginationSchema.merge(sortSchema).extend({
  search: z.string().optional(),
});

// =============================================================================
// SHOP SCHEMAS
// =============================================================================

/**
 * Shop creation/edit form validation
 */
export const shopSchema = z.object({
  shopName: shopNameSchema,
  description: descriptionSchema,
  currency: z.string().length(3, 'Invalid currency code'),
  language: z.string().min(2, 'Invalid language code'),
  timezone: z.string().min(1, 'Timezone is required'),
  shopLogo: z.string().url().optional().or(z.literal('')),
});

/**
 * Shop update form (partial - all fields optional)
 */
export const shopUpdateSchema = shopSchema.partial();

// =============================================================================
// PROFILE SCHEMAS
// =============================================================================

/**
 * Profile update form validation
 */
export const profileUpdateSchema = z.object({
  full_name: fullNameSchema,
  email: emailSchema, // Read-only in form, but included for validation
  phone: phoneSchema.optional().or(z.literal('')),
  country: z.string().max(100, 'Country cannot exceed 100 characters').optional().or(z.literal('')),
  province: z
    .string()
    .max(100, 'Province cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  city: z.string().max(100, 'City cannot exceed 100 characters').optional().or(z.literal('')),
  address: z.string().max(500, 'Address cannot exceed 500 characters').optional().or(z.literal('')),
});

/**
 * Avatar upload validation
 */
export const avatarUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 2 * 1024 * 1024, 'File size must be less than 2MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type),
      'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.'
    ),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterWithConfirmInput = z.infer<typeof registerWithConfirmSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SortInput = z.infer<typeof sortSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
export type ShopInput = z.infer<typeof shopSchema>;
export type ShopUpdateInput = z.infer<typeof shopUpdateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type AvatarUploadInput = z.infer<typeof avatarUploadSchema>;
