/**
 * Common Zod Schema Utilities
 *
 * Enhanced validation schemas with proper handling of edge cases:
 * - Empty strings vs null vs undefined
 * - Unicode characters (Arabic names, special jewelry symbols)
 * - Maximum length constraints
 * - Number precision for prices/weights
 *
 * @module lib/utils/schemas/common
 */

import { z } from 'zod';

// =============================================================================
// STRING EDGE CASE UTILITIES
// =============================================================================

/**
 * Normalizes whitespace in a string:
 * - Trims leading/trailing whitespace
 * - Collapses multiple spaces into single space
 * - Handles various Unicode whitespace characters
 */
export function normalizeWhitespace(str: string): string {
  // Unicode whitespace pattern including:
  // - Regular space
  // - Non-breaking space (\u00A0)
  // - En/Em space (\u2002, \u2003)
  // - Zero-width space (\u200B)
  // - Arabic tatweel (\u0640 - used for text justification)
  return str
    .replace(/[\u00A0\u2002\u2003\u200B]/g, ' ') // Normalize special spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Creates a schema that transforms empty strings to null.
 * Useful for optional text fields in forms.
 */
export const emptyToNull = z.preprocess((val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }
  return val;
}, z.string().nullable());

/**
 * Creates a schema that transforms empty/whitespace-only strings to undefined.
 * Useful for optional search/filter fields.
 */
export const emptyToUndefined = z.preprocess((val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return val;
}, z.string().optional());

// =============================================================================
// UNICODE CHARACTER SCHEMAS
// =============================================================================

/**
 * Arabic character range regex pattern
 * Includes:
 * - Arabic (0600-06FF)
 * - Arabic Supplement (0750-077F)
 * - Arabic Extended-A (08A0-08FF)
 * - Arabic Presentation Forms-A (FB50-FDFF)
 * - Arabic Presentation Forms-B (FE70-FEFF)
 */
const ARABIC_PATTERN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Latin character range (including accented characters)
 */
const LATIN_PATTERN = /[a-zA-Z\u00C0-\u024F]/;

/**
 * Common punctuation allowed in names
 */
const NAME_PUNCTUATION_PATTERN = /[\s'\-\.]/;

/**
 * Jewelry-specific symbols that may appear in descriptions
 * - Carat symbols (ct, K)
 * - Weight symbols (g, oz)
 * - Currency symbols
 * - Degree symbol for color grades
 */
export const JEWELRY_SYMBOLS_PATTERN = /[°℃℉№™®©€£¥₹₽]/;

/**
 * Full Unicode name pattern supporting:
 * - Latin characters (including accents)
 * - Arabic characters
 * - Common name punctuation (hyphen, apostrophe, period, space)
 */
export const UNICODE_NAME_PATTERN = new RegExp(
  `^[${LATIN_PATTERN.source.slice(1, -1)}${ARABIC_PATTERN.source.slice(1, -1)}${NAME_PUNCTUATION_PATTERN.source.slice(1, -1)}]+$`.replace(
    /\\/g,
    '\\'
  )
);

/**
 * Schema for names that support multiple scripts (Latin, Arabic, etc.)
 *
 * @param minLength Minimum length (default: 2)
 * @param maxLength Maximum length (default: 255)
 */
export function createUnicodeNameSchema(minLength = 2, maxLength = 255) {
  return z
    .string()
    .min(minLength, `Name must be at least ${minLength} characters`)
    .max(maxLength, `Name cannot exceed ${maxLength} characters`)
    .transform(normalizeWhitespace)
    .refine(
      (val) => {
        // Allow Latin, Arabic, spaces, hyphens, apostrophes, and periods
        // Pattern: any letter from Latin Extended or Arabic blocks + common punctuation
        const pattern = /^[\p{L}\p{M}\s'\-\.]+$/u;
        return pattern.test(val);
      },
      {
        message: 'Name contains invalid characters',
      }
    );
}

/**
 * Schema for Arabic-specific names (more permissive for Arabic diacritics)
 */
export function createArabicNameSchema(minLength = 2, maxLength = 255) {
  return z
    .string()
    .min(minLength, `Name must be at least ${minLength} characters`)
    .max(maxLength, `Name cannot exceed ${maxLength} characters`)
    .transform((val) => {
      // Normalize but preserve Arabic diacritics
      return val.trim().replace(/\s+/g, ' ');
    })
    .refine(
      (val) => {
        // Allow Arabic script including all diacritics and tatweel
        const pattern = /^[\p{Script=Arabic}\p{L}\s'\-\.]+$/u;
        return pattern.test(val);
      },
      {
        message: 'Name contains invalid characters',
      }
    );
}

/**
 * Schema for product descriptions that may include jewelry symbols
 */
export function createProductDescriptionSchema(maxLength = 2000) {
  return z
    .string()
    .max(maxLength, `Description cannot exceed ${maxLength} characters`)
    .transform(normalizeWhitespace)
    .optional()
    .nullable()
    .transform((val) => val || null);
}

// =============================================================================
// NUMBER PRECISION SCHEMAS
// =============================================================================

/**
 * Rounds a number to specified decimal places
 */
function roundToDecimal(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * Schema for monetary amounts with 4 decimal precision (matches DB numeric(15,4))
 *
 * Features:
 * - Rounds to 4 decimal places
 * - Validates against max value (99999999999.9999)
 * - Handles string inputs (e.g., from form fields)
 */
export const monetaryAmountSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(/,/g, ''));
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  },
  z
    .number()
    .min(0, 'Amount cannot be negative')
    .max(99999999999.9999, 'Amount exceeds maximum allowed value')
    .transform((val) => roundToDecimal(val, 4))
);

/**
 * Schema for signed monetary amounts (can be negative, e.g., balances)
 */
export const signedMonetaryAmountSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(/,/g, ''));
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  },
  z
    .number()
    .min(-99999999999.9999, 'Amount is below minimum allowed value')
    .max(99999999999.9999, 'Amount exceeds maximum allowed value')
    .transform((val) => roundToDecimal(val, 4))
);

/**
 * Schema for weight in grams with 3 decimal precision (matches DB numeric(10,3))
 */
export const weightGramsSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(/,/g, ''));
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  },
  z
    .number()
    .positive('Weight must be greater than 0')
    .max(9999999.999, 'Weight exceeds maximum allowed value')
    .transform((val) => roundToDecimal(val, 3))
);

/**
 * Schema for weight in carats with 3 decimal precision
 */
export const weightCaratsSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(/,/g, ''));
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  },
  z
    .number()
    .nonnegative('Weight cannot be negative')
    .max(9999999.999, 'Weight exceeds maximum allowed value')
    .transform((val) => roundToDecimal(val, 3))
);

/**
 * Schema for percentage values (0-100 with 2 decimal precision)
 */
export const percentageSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(/%/g, ''));
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  },
  z
    .number()
    .min(0, 'Percentage cannot be negative')
    .max(100, 'Percentage cannot exceed 100')
    .transform((val) => roundToDecimal(val, 2))
);

/**
 * Schema for quantity/count (positive integer)
 */
export const quantitySchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  },
  z
    .number()
    .int('Quantity must be a whole number')
    .positive('Quantity must be at least 1')
    .max(999999, 'Quantity exceeds maximum allowed value')
);

/**
 * Schema for version numbers (used in optimistic locking)
 */
export const versionSchema = z
  .number()
  .int('Version must be an integer')
  .nonnegative('Version cannot be negative');

// =============================================================================
// OPTIONAL FIELD SCHEMAS
// =============================================================================

/**
 * Creates an optional string schema that:
 * - Transforms empty strings to null
 * - Trims whitespace
 * - Validates max length
 *
 * @param maxLength Maximum allowed length
 * @param fieldName Field name for error messages
 */
export function createOptionalStringSchema(maxLength: number, fieldName = 'Field') {
  return z
    .string()
    .max(maxLength, `${fieldName} cannot exceed ${maxLength} characters`)
    .transform((val) => {
      const trimmed = normalizeWhitespace(val);
      return trimmed === '' ? null : trimmed;
    })
    .nullable()
    .optional()
    .transform((val) => val ?? null);
}

/**
 * Creates an optional email schema that handles empty strings
 */
export const optionalEmailSchema = z
  .string()
  .transform((val) => val.trim())
  .refine(
    (val) => {
      if (val === '') {
        return true;
      } // Allow empty
      // RFC 5322 compliant email regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val);
    },
    { message: 'Invalid email address' }
  )
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

/**
 * Creates an optional phone schema that handles various formats
 */
export const optionalPhoneSchema = z
  .string()
  .transform((val) => val.trim().replace(/[\s\-\(\)]/g, ''))
  .refine(
    (val) => {
      if (val === '') {
        return true;
      } // Allow empty
      // E.164 format or local format
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return phoneRegex.test(val);
    },
    { message: 'Invalid phone number format' }
  )
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Type guard to check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Type guard to check if a value is a valid positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && value > 0;
}

/**
 * Type guard to check if a value is a valid non-negative number
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && value >= 0;
}

/**
 * Safely parse a monetary string to number
 * Returns null if parsing fails
 */
export function parseMonetaryValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return roundToDecimal(value, 4);
  }

  const cleaned = value.replace(/[,\s]/g, '');
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    return null;
  }
  return roundToDecimal(parsed, 4);
}

/**
 * Format validation errors into a user-friendly object
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formatted[path]) {
      formatted[path] = issue.message;
    }
  }

  return formatted;
}

/**
 * Safely validate data with a Zod schema
 * Returns { success: true, data } or { success: false, errors }
 */
export function safeValidate<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: formatZodErrors(result.error) };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // String utilities
  normalizeWhitespace,
  emptyToNull,
  emptyToUndefined,

  // Unicode schemas
  createUnicodeNameSchema,
  createArabicNameSchema,
  createProductDescriptionSchema,

  // Number schemas
  monetaryAmountSchema,
  signedMonetaryAmountSchema,
  weightGramsSchema,
  weightCaratsSchema,
  percentageSchema,
  quantitySchema,
  versionSchema,

  // Optional field schemas
  createOptionalStringSchema,
  optionalEmailSchema,
  optionalPhoneSchema,

  // Helpers
  isNonEmptyString,
  isPositiveNumber,
  isNonNegativeNumber,
  parseMonetaryValue,
  formatZodErrors,
  safeValidate,
};
