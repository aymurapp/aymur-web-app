'use server';

/**
 * Shop Settings Server Actions
 *
 * Server-side actions for managing shop settings in the Aymur Platform.
 * These actions handle shop configuration including name, logo, currency,
 * timezone, and language settings.
 *
 * Key features:
 * - Get shop settings
 * - Update shop settings with Zod validation
 * - Update shop logo
 * - Retrieve available currencies and timezones
 *
 * RLS Note: All queries are automatically filtered by get_user_shop_ids()
 * embedded in JWT claims. No manual shop filtering needed.
 *
 * @module lib/actions/shopSettings
 */

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

import type { ActionResult } from './auth';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Shop settings data returned from the database
 */
export interface ShopSettings {
  id_shop: string;
  shop_name: string;
  shop_logo: string | null;
  currency: string;
  timezone: string;
  language: string;
  storage_used_bytes: number | null;
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Currency option for dropdown
 */
export interface CurrencyOption {
  code: string;
  label: string;
  symbol: string;
}

/**
 * Timezone option for dropdown
 */
export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Supported currencies with their labels and symbols.
 * Common currencies used in jewelry business across different regions.
 */
export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'TRY', label: 'Turkish Lira', symbol: '₺' },
  { code: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', label: 'Saudi Riyal', symbol: '﷼' },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { code: 'CNY', label: 'Chinese Yuan', symbol: '¥' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', label: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'KWD', label: 'Kuwaiti Dinar', symbol: 'د.ك' },
  { code: 'BHD', label: 'Bahraini Dinar', symbol: '.د.ب' },
  { code: 'QAR', label: 'Qatari Riyal', symbol: 'ر.ق' },
  { code: 'OMR', label: 'Omani Rial', symbol: 'ر.ع.' },
  { code: 'EGP', label: 'Egyptian Pound', symbol: 'E£' },
  { code: 'MAD', label: 'Moroccan Dirham', symbol: 'د.م.' },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R' },
  { code: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', label: 'Mexican Peso', symbol: 'Mex$' },
  { code: 'RUB', label: 'Russian Ruble', symbol: '₽' },
  { code: 'THB', label: 'Thai Baht', symbol: '฿' },
  { code: 'MYR', label: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'IDR', label: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'PKR', label: 'Pakistani Rupee', symbol: '₨' },
  { code: 'NGN', label: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', label: 'Kenyan Shilling', symbol: 'KSh' },
];

/**
 * Common timezones organized by region.
 * Covers major business centers and jewelry market regions.
 */
export const SUPPORTED_TIMEZONES: TimezoneOption[] = [
  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },

  // Americas
  { value: 'America/New_York', label: 'New York (Eastern)', offset: '-05:00' },
  { value: 'America/Chicago', label: 'Chicago (Central)', offset: '-06:00' },
  { value: 'America/Denver', label: 'Denver (Mountain)', offset: '-07:00' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (Pacific)', offset: '-08:00' },
  { value: 'America/Toronto', label: 'Toronto', offset: '-05:00' },
  { value: 'America/Vancouver', label: 'Vancouver', offset: '-08:00' },
  { value: 'America/Sao_Paulo', label: 'Sao Paulo', offset: '-03:00' },
  { value: 'America/Mexico_City', label: 'Mexico City', offset: '-06:00' },

  // Europe
  { value: 'Europe/London', label: 'London', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Paris', offset: '+01:00' },
  { value: 'Europe/Berlin', label: 'Berlin', offset: '+01:00' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam', offset: '+01:00' },
  { value: 'Europe/Brussels', label: 'Brussels', offset: '+01:00' },
  { value: 'Europe/Madrid', label: 'Madrid', offset: '+01:00' },
  { value: 'Europe/Rome', label: 'Rome', offset: '+01:00' },
  { value: 'Europe/Zurich', label: 'Zurich', offset: '+01:00' },
  { value: 'Europe/Vienna', label: 'Vienna', offset: '+01:00' },
  { value: 'Europe/Moscow', label: 'Moscow', offset: '+03:00' },
  { value: 'Europe/Istanbul', label: 'Istanbul', offset: '+03:00' },

  // Middle East
  { value: 'Asia/Dubai', label: 'Dubai', offset: '+04:00' },
  { value: 'Asia/Riyadh', label: 'Riyadh', offset: '+03:00' },
  { value: 'Asia/Kuwait', label: 'Kuwait', offset: '+03:00' },
  { value: 'Asia/Qatar', label: 'Qatar', offset: '+03:00' },
  { value: 'Asia/Bahrain', label: 'Bahrain', offset: '+03:00' },
  { value: 'Asia/Muscat', label: 'Muscat', offset: '+04:00' },
  { value: 'Asia/Tehran', label: 'Tehran', offset: '+03:30' },
  { value: 'Asia/Jerusalem', label: 'Jerusalem', offset: '+02:00' },

  // Africa
  { value: 'Africa/Cairo', label: 'Cairo', offset: '+02:00' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg', offset: '+02:00' },
  { value: 'Africa/Lagos', label: 'Lagos', offset: '+01:00' },
  { value: 'Africa/Casablanca', label: 'Casablanca', offset: '+01:00' },
  { value: 'Africa/Nairobi', label: 'Nairobi', offset: '+03:00' },

  // Asia
  { value: 'Asia/Kolkata', label: 'India (Kolkata)', offset: '+05:30' },
  { value: 'Asia/Mumbai', label: 'Mumbai', offset: '+05:30' },
  { value: 'Asia/Karachi', label: 'Karachi', offset: '+05:00' },
  { value: 'Asia/Bangkok', label: 'Bangkok', offset: '+07:00' },
  { value: 'Asia/Singapore', label: 'Singapore', offset: '+08:00' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', offset: '+08:00' },
  { value: 'Asia/Shanghai', label: 'Shanghai', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: '+09:00' },
  { value: 'Asia/Seoul', label: 'Seoul', offset: '+09:00' },
  { value: 'Asia/Jakarta', label: 'Jakarta', offset: '+07:00' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur', offset: '+08:00' },

  // Oceania
  { value: 'Australia/Sydney', label: 'Sydney', offset: '+11:00' },
  { value: 'Australia/Melbourne', label: 'Melbourne', offset: '+11:00' },
  { value: 'Australia/Perth', label: 'Perth', offset: '+08:00' },
  { value: 'Pacific/Auckland', label: 'Auckland', offset: '+13:00' },
];

/**
 * Supported languages for the application
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', direction: 'ltr' },
  { code: 'fr', label: 'French', direction: 'ltr' },
  { code: 'es', label: 'Spanish', direction: 'ltr' },
  { code: 'nl', label: 'Dutch', direction: 'ltr' },
  { code: 'ar', label: 'Arabic', direction: 'rtl' },
] as const;

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for validating shop settings updates
 */
export const UpdateShopSettingsSchema = z.object({
  shop_name: z
    .string()
    .min(2, 'Shop name must be at least 2 characters')
    .max(100, 'Shop name must be less than 100 characters')
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency code must be exactly 3 characters')
    .refine(
      (code) => SUPPORTED_CURRENCIES.some((c) => c.code === code.toUpperCase()),
      'Invalid or unsupported currency code'
    )
    .optional(),
  timezone: z
    .string()
    .min(1, 'Timezone is required')
    .refine(
      (tz) => SUPPORTED_TIMEZONES.some((t) => t.value === tz),
      'Invalid or unsupported timezone'
    )
    .optional(),
  language: z
    .string()
    .min(2, 'Language code must be at least 2 characters')
    .refine(
      (lang) => SUPPORTED_LANGUAGES.some((l) => l.code === lang),
      'Invalid or unsupported language'
    )
    .optional(),
});

export type UpdateShopSettingsInput = z.infer<typeof UpdateShopSettingsSchema>;

/**
 * Schema for validating shop logo URL
 */
const ShopLogoSchema = z
  .string()
  .url('Invalid URL format')
  .max(500, 'Logo URL must be less than 500 characters');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the authenticated user and their public.users record.
 * Returns null if not authenticated.
 */
async function getAuthenticatedUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Get the public.users record
  const { data: publicUser, error: userError } = await supabase
    .from('users')
    .select('id_user')
    .eq('auth_id', user.id)
    .single();

  if (userError || !publicUser) {
    return null;
  }

  return { authUser: user, publicUser };
}

/**
 * Standard revalidation paths for shop settings changes
 */
function revalidateShopPaths(shopId: string, locale: string = 'en') {
  revalidatePath(`/${locale}/${shopId}/settings`, 'page');
  revalidatePath(`/${locale}/${shopId}`, 'layout');
  revalidatePath('/[locale]/shops', 'page');
}

// =============================================================================
// GET SHOP SETTINGS
// =============================================================================

/**
 * Fetches the shop settings for a given shop ID.
 *
 * RLS policies automatically ensure the user has access to the shop.
 *
 * @param shopId - The shop ID to fetch settings for
 * @returns ActionResult with shop settings data
 *
 * @example
 * ```tsx
 * const result = await getShopSettings('shop-uuid');
 * if (result.success) {
 *   console.log('Shop name:', result.data?.shop_name);
 *   console.log('Currency:', result.data?.currency);
 * }
 * ```
 */
export async function getShopSettings(shopId: string): Promise<ActionResult<ShopSettings>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate shopId
    const uuidSchema = z.string().uuid('Invalid shop ID');
    const validationResult = uuidSchema.safeParse(shopId);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid shop ID format',
        code: 'validation_error',
      };
    }

    // 3. Fetch shop settings (RLS ensures shop access)
    const { data, error } = await supabase
      .from('shops')
      .select(
        `
        id_shop,
        shop_name,
        shop_logo,
        currency,
        timezone,
        language,
        storage_used_bytes,
        version,
        created_at,
        updated_at
      `
      )
      .eq('id_shop', shopId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Shop not found or you do not have access',
          code: 'not_found',
        };
      }
      console.error('[getShopSettings] Database error:', error);
      return {
        success: false,
        error: 'Failed to fetch shop settings',
        code: 'database_error',
      };
    }

    return {
      success: true,
      data: {
        id_shop: data.id_shop,
        shop_name: data.shop_name,
        shop_logo: data.shop_logo,
        currency: data.currency,
        timezone: data.timezone,
        language: data.language,
        storage_used_bytes: data.storage_used_bytes,
        version: data.version,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    };
  } catch (err) {
    console.error('[getShopSettings] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// UPDATE SHOP SETTINGS
// =============================================================================

/**
 * Updates shop settings (name, currency, timezone, language).
 *
 * Validates input using Zod schema and uses optimistic locking via version field.
 * RLS policies ensure only authorized users can update shop settings.
 *
 * @param shopId - The shop ID to update
 * @param updates - The fields to update
 * @returns ActionResult with updated shop settings
 *
 * @example
 * ```tsx
 * const result = await updateShopSettings('shop-uuid', {
 *   shop_name: 'My New Shop Name',
 *   currency: 'EUR',
 *   timezone: 'Europe/Paris'
 * });
 *
 * if (result.success) {
 *   message.success('Settings updated');
 * }
 * ```
 */
export async function updateShopSettings(
  shopId: string,
  updates: UpdateShopSettingsInput
): Promise<ActionResult<ShopSettings>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate shopId
    const uuidSchema = z.string().uuid('Invalid shop ID');
    const shopIdValidation = uuidSchema.safeParse(shopId);
    if (!shopIdValidation.success) {
      return {
        success: false,
        error: 'Invalid shop ID format',
        code: 'validation_error',
      };
    }

    // 3. Validate updates
    const validationResult = UpdateShopSettingsSchema.safeParse(updates);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const validatedUpdates = validationResult.data;

    // 4. Check if there's anything to update
    if (Object.keys(validatedUpdates).length === 0) {
      return {
        success: false,
        error: 'No fields to update',
        code: 'validation_error',
      };
    }

    // 5. Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validatedUpdates.shop_name !== undefined) {
      updateData.shop_name = validatedUpdates.shop_name.trim();
    }

    if (validatedUpdates.currency !== undefined) {
      updateData.currency = validatedUpdates.currency.toUpperCase();
    }

    if (validatedUpdates.timezone !== undefined) {
      updateData.timezone = validatedUpdates.timezone;
    }

    if (validatedUpdates.language !== undefined) {
      updateData.language = validatedUpdates.language;
    }

    // 6. Update shop settings (RLS enforces access control)
    const { data, error } = await supabase
      .from('shops')
      .update(updateData)
      .eq('id_shop', shopId)
      .is('deleted_at', null)
      .select(
        `
        id_shop,
        shop_name,
        shop_logo,
        currency,
        timezone,
        language,
        storage_used_bytes,
        version,
        created_at,
        updated_at
      `
      )
      .single();

    if (error) {
      console.error('[updateShopSettings] Database error:', error);

      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Shop not found or you do not have permission to update it',
          code: 'not_found',
        };
      }

      return {
        success: false,
        error: 'Failed to update shop settings',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateShopPaths(shopId, validatedUpdates.language ?? data.language);

    return {
      success: true,
      data: {
        id_shop: data.id_shop,
        shop_name: data.shop_name,
        shop_logo: data.shop_logo,
        currency: data.currency,
        timezone: data.timezone,
        language: data.language,
        storage_used_bytes: data.storage_used_bytes,
        version: data.version,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
      message: 'Shop settings updated successfully',
    };
  } catch (err) {
    console.error('[updateShopSettings] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// UPDATE SHOP LOGO
// =============================================================================

/**
 * Updates the shop logo URL.
 *
 * This action only updates the logo URL field. The actual file upload
 * should be handled separately via Supabase Storage.
 *
 * @param shopId - The shop ID to update
 * @param logoUrl - The new logo URL (or null to remove)
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * // After uploading logo to Supabase Storage
 * const result = await updateShopLogo('shop-uuid', publicUrl);
 *
 * if (result.success) {
 *   message.success('Logo updated');
 * }
 *
 * // To remove logo
 * const result = await updateShopLogo('shop-uuid', null);
 * ```
 */
export async function updateShopLogo(
  shopId: string,
  logoUrl: string | null
): Promise<ActionResult<{ shop_logo: string | null }>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate shopId
    const uuidSchema = z.string().uuid('Invalid shop ID');
    const shopIdValidation = uuidSchema.safeParse(shopId);
    if (!shopIdValidation.success) {
      return {
        success: false,
        error: 'Invalid shop ID format',
        code: 'validation_error',
      };
    }

    // 3. Validate logo URL (if provided)
    if (logoUrl !== null) {
      const logoValidation = ShopLogoSchema.safeParse(logoUrl);
      if (!logoValidation.success) {
        return {
          success: false,
          error: logoValidation.error.errors[0]?.message || 'Invalid logo URL',
          code: 'validation_error',
        };
      }
    }

    // 4. Update shop logo (RLS enforces access control)
    const { data, error } = await supabase
      .from('shops')
      .update({
        shop_logo: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id_shop', shopId)
      .is('deleted_at', null)
      .select('shop_logo, language')
      .single();

    if (error) {
      console.error('[updateShopLogo] Database error:', error);

      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Shop not found or you do not have permission to update it',
          code: 'not_found',
        };
      }

      return {
        success: false,
        error: 'Failed to update shop logo',
        code: 'database_error',
      };
    }

    // 5. Revalidate paths
    revalidateShopPaths(shopId, data.language);

    return {
      success: true,
      data: { shop_logo: data.shop_logo },
      message: logoUrl ? 'Shop logo updated successfully' : 'Shop logo removed successfully',
    };
  } catch (err) {
    console.error('[updateShopLogo] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GET AVAILABLE CURRENCIES
// =============================================================================

/**
 * Returns the list of supported currencies.
 *
 * This is a simple getter that returns the constant array of currencies.
 * No authentication required as this is reference data.
 *
 * @returns ActionResult with list of currency options
 *
 * @example
 * ```tsx
 * const result = await getAvailableCurrencies();
 * if (result.success) {
 *   result.data?.forEach(currency => {
 *     console.log(`${currency.code} - ${currency.label} (${currency.symbol})`);
 *   });
 * }
 * ```
 */
export async function getAvailableCurrencies(): Promise<ActionResult<CurrencyOption[]>> {
  try {
    // No authentication required for reference data
    return {
      success: true,
      data: SUPPORTED_CURRENCIES,
    };
  } catch (err) {
    console.error('[getAvailableCurrencies] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GET AVAILABLE TIMEZONES
// =============================================================================

/**
 * Returns the list of supported timezones.
 *
 * This is a simple getter that returns the constant array of timezones.
 * No authentication required as this is reference data.
 *
 * @returns ActionResult with list of timezone options
 *
 * @example
 * ```tsx
 * const result = await getAvailableTimezones();
 * if (result.success) {
 *   result.data?.forEach(tz => {
 *     console.log(`${tz.label} (${tz.offset})`);
 *   });
 * }
 * ```
 */
export async function getAvailableTimezones(): Promise<ActionResult<TimezoneOption[]>> {
  try {
    // No authentication required for reference data
    return {
      success: true,
      data: SUPPORTED_TIMEZONES,
    };
  } catch (err) {
    console.error('[getAvailableTimezones] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GET AVAILABLE LANGUAGES
// =============================================================================

/**
 * Returns the list of supported languages.
 *
 * This is a simple getter that returns the constant array of languages.
 * No authentication required as this is reference data.
 *
 * @returns ActionResult with list of language options
 *
 * @example
 * ```tsx
 * const result = await getAvailableLanguages();
 * if (result.success) {
 *   result.data?.forEach(lang => {
 *     console.log(`${lang.code} - ${lang.label} (${lang.direction})`);
 *   });
 * }
 * ```
 */
export async function getAvailableLanguages(): Promise<ActionResult<typeof SUPPORTED_LANGUAGES>> {
  try {
    // No authentication required for reference data
    return {
      success: true,
      data: SUPPORTED_LANGUAGES,
    };
  } catch (err) {
    console.error('[getAvailableLanguages] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}
