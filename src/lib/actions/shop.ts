'use server';

/**
 * Shop Server Actions
 *
 * Server-side actions for shop management in the Aymur Platform.
 * These actions handle shop creation, updates, and subscription limit checks.
 *
 * Key features:
 * - Shop creation with automatic owner access
 * - Shop settings updates
 * - Subscription limit checking
 * - Default shop setup (categories, metal types, etc.)
 *
 * All actions return structured results with success/error states.
 *
 * @module lib/actions/shop
 */

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

import type { ActionResult } from './auth';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Shop creation input data
 */
export interface CreateShopInput {
  /** Display name for the shop */
  shopName: string;
  /** Optional description of the shop */
  description?: string;
  /** Currency code (e.g., 'USD', 'EUR', 'TRY') */
  currency: string;
  /** Locale/language code (e.g., 'en', 'tr', 'ar') */
  language: string;
  /** IANA timezone (e.g., 'Europe/Istanbul', 'America/New_York') */
  timezone: string;
  /** Optional shop logo URL (uploaded separately) */
  shopLogo?: string | null;
  /** Business phone number */
  phone?: string | null;
  /** Business email address */
  email?: string | null;
  /** Tax identification number */
  taxId?: string | null;
  /** Street address line 1 */
  addressLine1?: string | null;
  /** Street address line 2 */
  addressLine2?: string | null;
  /** City name */
  city?: string | null;
  /** Area or district */
  area?: string | null;
  /** State or province */
  state?: string | null;
  /** Postal/ZIP code */
  postalCode?: string | null;
  /** Country name */
  country?: string | null;
}

/**
 * Shop update input data
 */
export interface UpdateShopInput {
  /** Display name for the shop */
  shopName?: string;
  /** Currency code */
  currency?: string;
  /** Locale/language code */
  language?: string;
  /** IANA timezone */
  timezone?: string;
  /** Shop logo URL */
  shopLogo?: string | null;
}

/**
 * Created shop data returned after successful creation
 */
export interface CreatedShop {
  id_shop: string;
  shop_name: string;
  currency: string;
  timezone: string;
  language: string;
  shop_logo: string | null;
}

/**
 * Subscription limits check result
 */
export interface SubscriptionLimits {
  /** Whether the user is within their limit */
  withinLimit: boolean;
  /** Current usage count */
  currentUsage: number;
  /** Maximum allowed by plan */
  maxAllowed: number;
  /** Human-readable message */
  message: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Owner role ID from the roles table
 * This is used when creating shop_access for the shop creator
 */
const OWNER_ROLE_ID = 'cd2c64be-def1-42e2-985c-26d3b73f0d64';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validates shop input data
 */
function validateShopInput(data: CreateShopInput): { valid: boolean; error?: string } {
  if (!data.shopName || data.shopName.trim().length < 2) {
    return { valid: false, error: 'Shop name must be at least 2 characters.' };
  }

  if (data.shopName.length > 100) {
    return { valid: false, error: 'Shop name cannot exceed 100 characters.' };
  }

  if (!data.currency || data.currency.length !== 3) {
    return { valid: false, error: 'Invalid currency code.' };
  }

  if (!data.language || data.language.length < 2) {
    return { valid: false, error: 'Invalid language code.' };
  }

  if (!data.timezone) {
    return { valid: false, error: 'Timezone is required.' };
  }

  return { valid: true };
}

// =============================================================================
// GET SHOP LIMITS (task-070)
// =============================================================================

/**
 * Checks subscription limits for creating new shops.
 *
 * Uses the check_subscription_limits database function to verify
 * whether the user can create additional shops under their current plan.
 *
 * @param shopId - An existing shop ID to check the subscription for
 * @returns ActionResult with limit information
 *
 * @example
 * ```tsx
 * const result = await getShopLimits('shop-uuid');
 * if (result.success && result.data?.withinLimit) {
 *   // User can create more shops
 * }
 * ```
 */
export async function getShopLimits(shopId: string): Promise<ActionResult<SubscriptionLimits>> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to check shop limits.',
        code: 'unauthorized',
      };
    }

    // Call the check_subscription_limits function
    // Note: This function may not exist yet - using type assertion
    const { data, error } = (await (supabase.rpc as CallableFunction)('check_subscription_limits', {
      p_shop_id: shopId,
      p_check_type: 'shops',
    })) as {
      data: Array<{
        within_limit: boolean;
        current_usage: number;
        max_allowed: number;
        message: string;
      }> | null;
      error: Error | null;
    };

    if (error) {
      console.error('[getShopLimits] Database error:', error.message);
      return {
        success: false,
        error: 'Failed to check subscription limits.',
        code: 'database_error',
      };
    }

    // The function returns an array with one row
    const result = data?.[0];

    if (!result) {
      return {
        success: false,
        error: 'No subscription found for this shop.',
        code: 'no_subscription',
      };
    }

    return {
      success: true,
      data: {
        withinLimit: result.within_limit,
        currentUsage: Number(result.current_usage),
        maxAllowed: Number(result.max_allowed),
        message: result.message,
      },
    };
  } catch (err) {
    console.error('[getShopLimits] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while checking limits.',
      code: 'unexpected_error',
    };
  }
}

/**
 * Checks if user can create a new shop based on their subscription.
 * This version doesn't require an existing shop ID - it checks the user's
 * subscription plan limits against their current shop count.
 *
 * @returns ActionResult with limit information including plan name
 */
export async function canCreateShop(): Promise<ActionResult<SubscriptionLimits>> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to check shop limits.',
        code: 'unauthorized',
      };
    }

    // Get user's public.users record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        error: 'User profile not found.',
        code: 'user_not_found',
      };
    }

    // Get user's active subscription with plan details
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select(
        `
        id_subscription,
        plans:id_plan (
          max_shops,
          plan_name
        )
      `
      )
      .eq('id_user', userData.id_user)
      .eq('status', 'active')
      .single();

    // Type assertion for the nested plan data
    const typedSubscription = subscription as {
      id_subscription: string;
      plans: { max_shops: number | null; plan_name: string } | null;
    } | null;

    if (subscriptionError || !typedSubscription) {
      console.error('[canCreateShop] Subscription error:', subscriptionError?.message);
      return {
        success: false,
        error: 'Active subscription required. Please subscribe to create a shop.',
        code: 'no_subscription',
      };
    }

    // Extract plan details from the joined data
    const plan = typedSubscription.plans;

    if (!plan) {
      return {
        success: false,
        error: 'Subscription plan not found. Please contact support.',
        code: 'plan_not_found',
      };
    }

    // Count existing shops owned by this user
    const { count, error: countError } = await supabase
      .from('shops')
      .select('*', { count: 'exact', head: true })
      .eq('id_owner', userData.id_user)
      .is('deleted_at', null);

    if (countError) {
      console.error('[canCreateShop] Count error:', countError.message);
      return {
        success: false,
        error: 'Failed to count existing shops.',
        code: 'database_error',
      };
    }

    const currentCount = count || 0;

    // Handle unlimited shops (Enterprise plan) - max_shops is NULL
    if (plan.max_shops === null) {
      return {
        success: true,
        data: {
          withinLimit: true,
          currentUsage: currentCount,
          maxAllowed: -1, // -1 indicates unlimited
          message: `You have ${currentCount} shop(s). Your ${plan.plan_name} plan allows unlimited shops.`,
        },
      };
    }

    const withinLimit = currentCount < plan.max_shops;
    const remainingShops = plan.max_shops - currentCount;

    return {
      success: true,
      data: {
        withinLimit,
        currentUsage: currentCount,
        maxAllowed: plan.max_shops,
        message: withinLimit
          ? `You can create ${remainingShops} more shop(s) on your ${plan.plan_name} plan.`
          : `You have reached the maximum of ${plan.max_shops} shop(s) for your ${plan.plan_name} plan.`,
      },
    };
  } catch (err) {
    console.error('[canCreateShop] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while checking limits.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// CREATE SHOP (task-070)
// =============================================================================

/**
 * Creates a new shop for the authenticated user.
 *
 * This action:
 * 1. Validates the user is authenticated
 * 2. Checks subscription limits
 * 3. Creates the shop record
 * 4. Adds owner access for the user
 * 5. Sets up default shop data (categories, metal types, etc.)
 *
 * @param data - The shop creation data
 * @returns ActionResult with the created shop data
 *
 * @example
 * ```tsx
 * const result = await createShop({
 *   shopName: 'My Jewelry Store',
 *   currency: 'USD',
 *   language: 'en',
 *   timezone: 'America/New_York'
 * });
 *
 * if (result.success) {
 *   router.push(`/${locale}/${result.data.id_shop}/dashboard`);
 * }
 * ```
 */
export async function createShop(data: CreateShopInput): Promise<ActionResult<CreatedShop>> {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to create a shop.',
        code: 'unauthorized',
      };
    }

    // 2. Validate input
    const validation = validateShopInput(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error!,
        code: 'validation_error',
      };
    }

    // 3. Get user's public.users record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        error: 'User profile not found. Please complete your profile first.',
        code: 'user_not_found',
      };
    }

    // 4. Check subscription limits
    const limitCheck = await canCreateShop();
    if (!limitCheck.success) {
      return limitCheck;
    }

    if (!limitCheck.data?.withinLimit) {
      return {
        success: false,
        error:
          limitCheck.data?.message || 'You have reached the maximum number of shops for your plan.',
        code: 'limit_exceeded',
      };
    }

    // 5. Get the user's active subscription ID
    // The subscription was already validated in canCreateShop(), but we need the ID
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('id_subscription')
      .eq('id_user', userData.id_user)
      .eq('status', 'active')
      .single();

    if (subscriptionError || !subscriptionData) {
      console.error('[createShop] Subscription lookup error:', subscriptionError?.message);
      return {
        success: false,
        error: 'Active subscription required. Please subscribe to create a shop.',
        code: 'no_subscription',
      };
    }

    const subscriptionId = subscriptionData.id_subscription;

    // 6. Create the shop
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .insert({
        id_owner: userData.id_user,
        id_subscription: subscriptionId,
        shop_name: data.shopName.trim(),
        description: data.description?.trim() || null,
        currency: data.currency.toUpperCase(),
        language: data.language,
        timezone: data.timezone,
        shop_logo: data.shopLogo || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        tax_id: data.taxId?.trim() || null,
        address_line1: data.addressLine1?.trim() || null,
        address_line2: data.addressLine2?.trim() || null,
        city: data.city?.trim() || null,
        area: data.area?.trim() || null,
        state: data.state?.trim() || null,
        postal_code: data.postalCode?.trim() || null,
        country: data.country?.trim() || null,
      })
      .select('id_shop, shop_name, currency, timezone, language, shop_logo')
      .single();

    if (shopError || !shop) {
      console.error('[createShop] Shop creation error:', shopError?.message);
      return {
        success: false,
        error: 'Failed to create shop. Please try again.',
        code: 'shop_creation_error',
      };
    }

    // 7. Add owner access
    const { error: accessError } = await supabase.from('shop_access').insert({
      id_shop: shop.id_shop,
      id_user: userData.id_user,
      id_role: OWNER_ROLE_ID,
      is_active: true,
    });

    if (accessError) {
      console.error('[createShop] Access creation error:', accessError.message);
      // Don't fail the whole operation - the shop was created
      // Admin can fix access issues later
    }

    // 8. Set up shop defaults (categories, metal types, etc.)
    // TODO: Implement setup_shop_defaults database function to create:
    // - Default product categories
    // - Default metal types and purities
    // - Default expense categories
    // - Default budget categories
    // - Default document templates
    // For now, these will need to be set up manually or via separate actions

    // 9. Revalidate relevant paths
    revalidatePath('/[locale]/shops', 'page');
    revalidatePath('/', 'layout');

    return {
      success: true,
      data: {
        id_shop: shop.id_shop,
        shop_name: shop.shop_name,
        currency: shop.currency,
        timezone: shop.timezone,
        language: shop.language,
        shop_logo: shop.shop_logo,
      },
      message: 'Shop created successfully.',
    };
  } catch (err) {
    console.error('[createShop] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while creating the shop.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// UPDATE SHOP (task-070)
// =============================================================================

/**
 * Updates an existing shop's settings.
 *
 * Only the shop owner or users with appropriate permissions can update shop settings.
 * RLS policies automatically enforce this restriction.
 *
 * @param shopId - The shop ID to update
 * @param data - The fields to update
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await updateShop('shop-uuid', {
 *   shopName: 'Updated Shop Name',
 *   currency: 'EUR'
 * });
 * ```
 */
export async function updateShop(
  shopId: string,
  data: UpdateShopInput
): Promise<ActionResult<CreatedShop>> {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to update shop settings.',
        code: 'unauthorized',
      };
    }

    // 2. Validate shopId
    if (!shopId || typeof shopId !== 'string') {
      return {
        success: false,
        error: 'Invalid shop ID.',
        code: 'validation_error',
      };
    }

    // 3. Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {};

    if (data.shopName !== undefined) {
      if (data.shopName.trim().length < 2) {
        return {
          success: false,
          error: 'Shop name must be at least 2 characters.',
          code: 'validation_error',
        };
      }
      updateData.shop_name = data.shopName.trim();
    }

    if (data.currency !== undefined) {
      if (data.currency.length !== 3) {
        return {
          success: false,
          error: 'Invalid currency code.',
          code: 'validation_error',
        };
      }
      updateData.currency = data.currency.toUpperCase();
    }

    if (data.timezone !== undefined) {
      updateData.timezone = data.timezone;
    }

    if (data.shopLogo !== undefined) {
      updateData.shop_logo = data.shopLogo;
    }

    if (data.language !== undefined) {
      if (data.language.length < 2) {
        return {
          success: false,
          error: 'Invalid language code.',
          code: 'validation_error',
        };
      }
      updateData.language = data.language;
    }

    // 4. Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        error: 'No fields to update.',
        code: 'validation_error',
      };
    }

    // 5. Update the shop (RLS will enforce access control)
    const { data: shop, error: updateError } = await supabase
      .from('shops')
      .update(updateData)
      .eq('id_shop', shopId)
      .is('deleted_at', null)
      .select('id_shop, shop_name, currency, timezone, language, shop_logo')
      .single();

    if (updateError) {
      console.error('[updateShop] Update error:', updateError.message);

      // Check for specific error codes
      if (updateError.code === 'PGRST116') {
        return {
          success: false,
          error: 'Shop not found or you do not have permission to update it.',
          code: 'not_found',
        };
      }

      return {
        success: false,
        error: 'Failed to update shop settings.',
        code: 'update_error',
      };
    }

    // 6. Revalidate relevant paths
    revalidatePath(`/[locale]/${shopId}`, 'layout');
    revalidatePath('/[locale]/shops', 'page');

    return {
      success: true,
      data: {
        id_shop: shop.id_shop,
        shop_name: shop.shop_name,
        currency: shop.currency,
        timezone: shop.timezone,
        language: shop.language,
        shop_logo: shop.shop_logo,
      },
      message: 'Shop updated successfully.',
    };
  } catch (err) {
    console.error('[updateShop] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while updating the shop.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// DELETE SHOP (soft delete)
// =============================================================================

/**
 * Soft deletes a shop (sets deleted_at timestamp).
 *
 * Only the shop owner can delete a shop.
 * The shop data is preserved for potential recovery.
 *
 * @param shopId - The shop ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteShop(shopId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to delete a shop.',
        code: 'unauthorized',
      };
    }

    // 2. Get user's public.users record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        error: 'User profile not found.',
        code: 'user_not_found',
      };
    }

    // 3. Verify user is the owner of the shop
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id_shop, id_owner')
      .eq('id_shop', shopId)
      .is('deleted_at', null)
      .single();

    if (shopError || !shop) {
      return {
        success: false,
        error: 'Shop not found.',
        code: 'not_found',
      };
    }

    if (shop.id_owner !== userData.id_user) {
      return {
        success: false,
        error: 'Only the shop owner can delete a shop.',
        code: 'forbidden',
      };
    }

    // 4. Soft delete the shop
    const { error: deleteError } = await supabase
      .from('shops')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id_shop', shopId);

    if (deleteError) {
      console.error('[deleteShop] Delete error:', deleteError.message);
      return {
        success: false,
        error: 'Failed to delete shop.',
        code: 'delete_error',
      };
    }

    // 5. Revalidate paths
    revalidatePath('/[locale]/shops', 'page');
    revalidatePath('/', 'layout');

    return {
      success: true,
      message: 'Shop deleted successfully.',
    };
  } catch (err) {
    console.error('[deleteShop] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while deleting the shop.',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GET SHOP DETAILS
// =============================================================================

/**
 * Gets detailed information about a specific shop.
 *
 * @param shopId - The shop ID to fetch
 * @returns ActionResult with shop details
 */
export async function getShopDetails(shopId: string): Promise<ActionResult<CreatedShop>> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to view shop details.',
        code: 'unauthorized',
      };
    }

    // Fetch shop (RLS will enforce access)
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id_shop, shop_name, currency, timezone, language, shop_logo')
      .eq('id_shop', shopId)
      .is('deleted_at', null)
      .single();

    if (shopError || !shop) {
      return {
        success: false,
        error: 'Shop not found or you do not have access.',
        code: 'not_found',
      };
    }

    return {
      success: true,
      data: shop,
    };
  } catch (err) {
    console.error('[getShopDetails] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred.',
      code: 'unexpected_error',
    };
  }
}
