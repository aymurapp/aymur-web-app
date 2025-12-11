'use server';

/**
 * Billing Server Actions
 *
 * Server-side actions for Stripe billing and subscription management.
 * Handles checkout session creation, customer portal access, and Stripe customer management.
 *
 * Security considerations:
 * - All actions verify user authentication
 * - Stripe secret key is never exposed to client
 * - Customer IDs are validated before use
 *
 * @module lib/actions/billing
 */

import { getStripe, createPortalSession } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Generic action result type for consistent error handling
 */
export type BillingActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; code?: string };

/**
 * Result containing a redirect URL
 */
export interface UrlResult {
  url: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the base URL for redirects
 * Uses NEXT_PUBLIC_APP_URL or falls back to localhost for development
 */
function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url) {
    return url;
  }
  return 'http://localhost:3000';
}

/**
 * Gets the current authenticated user from Supabase
 * Returns null if not authenticated
 */
async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Gets or creates a Stripe customer for the user
 * Checks users.stripe_customer_id first, creates if needed
 */
async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const supabase = await createClient();

  // Get user record with stripe_customer_id
  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .select('id_user, email, full_name, stripe_customer_id')
    .eq('auth_id', userId)
    .single();

  if (userError || !userRecord) {
    throw new Error('User record not found');
  }

  // Return existing customer ID if available
  if (userRecord.stripe_customer_id) {
    return userRecord.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await getStripe().customers.create({
    email: userRecord.email,
    name: userRecord.full_name || undefined,
    metadata: {
      user_id: userRecord.id_user,
      auth_id: userId,
    },
  });

  // Save customer ID to user record
  const { error: updateError } = await supabase
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id_user', userRecord.id_user);

  if (updateError) {
    // Log error but don't fail - customer is created in Stripe
    console.error('Failed to save stripe_customer_id:', updateError.message);
  }

  return customer.id;
}

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Options for checkout session redirect URLs
 */
export interface CheckoutRedirectOptions {
  /** URL to redirect to on successful checkout (relative path, e.g., '/onboarding/checkout/success') */
  successPath?: string;
  /** URL to redirect to when checkout is canceled (relative path, e.g., '/onboarding/checkout/canceled') */
  cancelPath?: string;
}

/**
 * Creates a Stripe Checkout session for subscribing to a plan
 *
 * Flow:
 * 1. Verify user is authenticated
 * 2. Get or create Stripe customer
 * 3. Create checkout session with subscription metadata
 * 4. Return checkout URL for redirect
 *
 * @param priceId - The Stripe price ID (price_xxx) for the subscription plan
 * @param options - Optional redirect URL configuration
 * @returns Result containing the checkout session URL or error
 *
 * @example
 * ```tsx
 * // Default redirect (settings/billing)
 * const result = await createCheckoutSessionAction('price_xxx');
 *
 * // Custom redirect (onboarding flow)
 * const result = await createCheckoutSessionAction('price_xxx', {
 *   successPath: '/onboarding/checkout/success',
 *   cancelPath: '/onboarding/checkout/canceled',
 * });
 *
 * if (result.success) {
 *   window.location.href = result.data.url;
 * }
 * ```
 */
export async function createCheckoutSessionAction(
  priceId: string,
  options?: CheckoutRedirectOptions
): Promise<BillingActionResult<UrlResult>> {
  try {
    // Validate input
    if (!priceId || !priceId.startsWith('price_')) {
      return {
        success: false,
        error: 'Invalid price ID',
        code: 'INVALID_PRICE_ID',
      };
    }

    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHENTICATED',
      };
    }

    // Get user's id_user from users table
    const supabase = await createClient();
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      return {
        success: false,
        error: 'User record not found',
        code: 'USER_NOT_FOUND',
      };
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(user.id);

    // Build redirect URLs with optional custom paths
    const baseUrl = getBaseUrl();
    const successPath = options?.successPath ?? '/settings/billing?success=true';
    const cancelPath = options?.cancelPath ?? '/settings/billing?canceled=true';
    const successUrl = `${baseUrl}${successPath}`;
    const cancelUrl = `${baseUrl}${cancelPath}`;

    // Create checkout session with subscription metadata
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      subscription_data: {
        metadata: {
          user_id: userRecord.id_user,
        },
      },
    });

    if (!session.url) {
      return {
        success: false,
        error: 'Failed to create checkout session',
        code: 'CHECKOUT_FAILED',
      };
    }

    return {
      success: true,
      data: { url: session.url },
    };
  } catch (error) {
    console.error('createCheckoutSessionAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
      code: 'CHECKOUT_ERROR',
    };
  }
}

/**
 * Creates a Stripe Customer Portal session for managing subscriptions
 *
 * The Customer Portal allows users to:
 * - View and update payment methods
 * - View invoice history
 * - Cancel or pause subscriptions
 * - Update billing information
 *
 * @returns Result containing the portal session URL or error
 *
 * @example
 * ```tsx
 * const result = await createPortalSessionAction();
 * if (result.success) {
 *   window.location.href = result.data.url;
 * }
 * ```
 */
export async function createPortalSessionAction(): Promise<BillingActionResult<UrlResult>> {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHENTICATED',
      };
    }

    // Get user's Stripe customer ID
    const supabase = await createClient();
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      return {
        success: false,
        error: 'User record not found',
        code: 'USER_NOT_FOUND',
      };
    }

    if (!userRecord.stripe_customer_id) {
      return {
        success: false,
        error: 'No billing account found. Please subscribe to a plan first.',
        code: 'NO_CUSTOMER',
      };
    }

    // Build return URL
    const baseUrl = getBaseUrl();
    const returnUrl = `${baseUrl}/settings/billing`;

    // Create portal session
    const portalUrl = await createPortalSession(userRecord.stripe_customer_id, returnUrl);

    return {
      success: true,
      data: { url: portalUrl },
    };
  } catch (error) {
    console.error('createPortalSessionAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create portal session',
      code: 'PORTAL_ERROR',
    };
  }
}

/**
 * Gets all available subscription plans
 *
 * Returns active plans from the database with their Stripe price IDs
 * for display in the billing page.
 *
 * @returns Result containing array of plans or error
 */
export async function getAvailablePlansAction(): Promise<
  BillingActionResult<
    Array<{
      id: string;
      name: string;
      stripePriceId: string | null;
      price: number | null;
      currency: string;
      interval: string | null;
      maxShops: number | null;
      maxStaffPerShop: number | null;
      aiCreditsMonthly: number | null;
      storageLimitMb: number | null;
      features: Record<string, boolean>;
      isContactSales: boolean;
    }>
  >
> {
  try {
    const supabase = await createClient();

    const { data: plans, error } = await supabase
      .from('plans')
      .select(
        `
        id_plan,
        plan_name,
        stripe_price_id,
        price,
        currency,
        interval,
        max_shops,
        max_staff_per_shop,
        ai_credits_monthly,
        storage_limit_mb,
        features,
        is_contact_sales
      `
      )
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('price', { ascending: true });

    if (error) {
      return {
        success: false,
        error: 'Failed to fetch plans',
        code: 'FETCH_ERROR',
      };
    }

    const transformedPlans = plans.map((plan) => ({
      id: plan.id_plan,
      name: plan.plan_name,
      stripePriceId: plan.stripe_price_id,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      maxShops: plan.max_shops,
      maxStaffPerShop: plan.max_staff_per_shop,
      aiCreditsMonthly: plan.ai_credits_monthly,
      storageLimitMb: plan.storage_limit_mb,
      features: (plan.features as Record<string, boolean>) ?? {},
      isContactSales: plan.is_contact_sales,
    }));

    return {
      success: true,
      data: transformedPlans,
    };
  } catch (error) {
    console.error('getAvailablePlansAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch plans',
      code: 'PLANS_ERROR',
    };
  }
}

/**
 * Gets the current user's subscription usage data
 *
 * Returns current usage for:
 * - Shops count
 * - Staff per shop count
 * - AI credits used this month
 * - Storage used in MB
 *
 * @param shopId - The shop ID to check usage for
 * @returns Result containing usage data or error
 */
export async function getSubscriptionUsageAction(shopId: string): Promise<
  BillingActionResult<{
    shopsUsed: number;
    shopsLimit: number | null;
    staffUsed: number;
    staffLimit: number | null;
    aiCreditsUsed: number;
    aiCreditsLimit: number | null;
    storageUsedMb: number;
    storageLimitMb: number | null;
  }>
> {
  try {
    if (!shopId) {
      return {
        success: false,
        error: 'Shop ID is required',
        code: 'MISSING_SHOP_ID',
      };
    }

    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHENTICATED',
      };
    }

    const supabase = await createClient();

    // Get user's id_user
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      return {
        success: false,
        error: 'User record not found',
        code: 'USER_NOT_FOUND',
      };
    }

    // Get shop with subscription and plan limits
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select(
        `
        id_shop,
        storage_used_bytes,
        subscriptions:id_subscription (
          plans:id_plan (
            max_shops,
            max_staff_per_shop,
            ai_credits_monthly,
            storage_limit_mb
          )
        )
      `
      )
      .eq('id_shop', shopId)
      .single();

    if (shopError || !shop) {
      return {
        success: false,
        error: 'Shop not found',
        code: 'SHOP_NOT_FOUND',
      };
    }

    // Get subscription and plan from the nested data
    const subscription = shop.subscriptions as unknown as {
      plans: {
        max_shops: number | null;
        max_staff_per_shop: number | null;
        ai_credits_monthly: number | null;
        storage_limit_mb: number | null;
      };
    } | null;

    const plan = subscription?.plans ?? null;

    // Count shops owned by user
    const { count: shopsCount } = await supabase
      .from('shops')
      .select('id_shop', { count: 'exact', head: true })
      .eq('id_owner', userRecord.id_user)
      .is('deleted_at', null);

    // Count staff in this shop
    const { count: staffCount } = await supabase
      .from('shop_access')
      .select('id_access', { count: 'exact', head: true })
      .eq('id_shop', shopId)
      .eq('is_active', true);

    // Get AI credits used this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: aiUsage } = await supabase
      .from('ai_credit_pools')
      .select('owner_used, staff_pool_used')
      .eq('id_shop', shopId)
      .gte('period_start', startOfMonth.toISOString())
      .maybeSingle();

    // Convert storage from bytes to MB
    const storageUsedMb = Math.round((shop.storage_used_bytes || 0) / (1024 * 1024));

    // Calculate total AI credits used (owner + staff pool)
    const aiCreditsUsed = (aiUsage?.owner_used ?? 0) + (aiUsage?.staff_pool_used ?? 0);

    return {
      success: true,
      data: {
        shopsUsed: shopsCount ?? 0,
        shopsLimit: plan?.max_shops ?? null,
        staffUsed: staffCount ?? 0,
        staffLimit: plan?.max_staff_per_shop ?? null,
        aiCreditsUsed,
        aiCreditsLimit: plan?.ai_credits_monthly ?? null,
        storageUsedMb,
        storageLimitMb: plan?.storage_limit_mb ?? null,
      },
    };
  } catch (error) {
    console.error('getSubscriptionUsageAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch usage data',
      code: 'USAGE_ERROR',
    };
  }
}

/**
 * Gets the current user's subscription limits for the shops overview page
 *
 * Returns:
 * - Plan details (name, limits from database)
 * - Owned shops count (counts against limit)
 * - Member shops count (does NOT count against limit)
 * - Total storage used across owned shops
 *
 * Important: Limits are fetched from the plans table and can be modified by admin in Supabase.
 * Being a member of other shops does NOT count against your shop limit.
 *
 * @returns Result containing subscription limits and usage or error
 */
export async function getUserSubscriptionLimitsAction(): Promise<
  BillingActionResult<{
    planName: string | null;
    planId: string | null;
    subscriptionStatus: string | null;
    // Shops - only OWNED shops count against limit
    ownedShopsCount: number;
    memberShopsCount: number;
    maxShops: number | null; // null = unlimited (Enterprise)
    // Storage - aggregate across all owned shops
    totalStorageUsedMb: number;
    storageLimitMb: number | null; // null = unlimited
    // Staff limit per shop (for reference)
    maxStaffPerShop: number | null; // null = unlimited
    // AI credits
    aiCreditsMonthly: number | null; // null = unlimited
    // Is enterprise/contact sales
    isContactSales: boolean;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHENTICATED',
      };
    }

    const supabase = await createClient();

    // Get user's id_user
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userRecord) {
      return {
        success: false,
        error: 'User record not found',
        code: 'USER_NOT_FOUND',
      };
    }

    // Get user's active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id_subscription, id_plan, status')
      .eq('id_user', userRecord.id_user)
      .eq('status', 'active')
      .maybeSingle();

    // Get plan details if subscription exists (limits from database)
    let plan: {
      id_plan: string;
      plan_name: string;
      max_shops: number | null;
      max_staff_per_shop: number | null;
      storage_limit_mb: number | null;
      ai_credits_monthly: number | null;
      is_contact_sales: boolean;
    } | null = null;

    if (subscription?.id_plan) {
      const { data: planData } = await supabase
        .from('plans')
        .select(
          'id_plan, plan_name, max_shops, max_staff_per_shop, storage_limit_mb, ai_credits_monthly, is_contact_sales'
        )
        .eq('id_plan', subscription.id_plan)
        .single();

      plan = planData;
    }

    // Count shops OWNED by user (these count against the limit)
    const { count: ownedShopsCount, error: ownedError } = await supabase
      .from('shops')
      .select('id_shop', { count: 'exact', head: true })
      .eq('id_owner', userRecord.id_user)
      .is('deleted_at', null);

    if (ownedError) {
      console.error('Error counting owned shops:', ownedError);
    }

    // Count shops user is a MEMBER of (via shop_access, but NOT owner)
    // This does NOT count against the shop limit
    // Step 1: Get all shop IDs the user has access to
    const { data: shopAccessList, error: memberError } = await supabase
      .from('shop_access')
      .select('id_shop')
      .eq('id_user', userRecord.id_user)
      .eq('is_active', true);

    if (memberError) {
      console.error('Error fetching shop access:', memberError);
    }

    // Step 2: Count how many of those shops are NOT owned by this user
    let memberShopsCount = 0;
    if (shopAccessList && shopAccessList.length > 0) {
      const shopIds = shopAccessList.map((access) => access.id_shop);

      const { count: memberCount, error: countError } = await supabase
        .from('shops')
        .select('id_shop', { count: 'exact', head: true })
        .in('id_shop', shopIds)
        .neq('id_owner', userRecord.id_user)
        .is('deleted_at', null);

      if (countError) {
        console.error('Error counting member shops:', countError);
      }
      memberShopsCount = memberCount ?? 0;
    }

    // Get total storage used across all OWNED shops
    const { data: ownedShopsData, error: storageError } = await supabase
      .from('shops')
      .select('storage_used_bytes')
      .eq('id_owner', userRecord.id_user)
      .is('deleted_at', null);

    if (storageError) {
      console.error('Error fetching storage usage:', storageError);
    }

    // Sum storage across all owned shops and convert to MB
    const totalStorageUsedBytes =
      ownedShopsData?.reduce((sum, shop) => sum + (shop.storage_used_bytes || 0), 0) ?? 0;
    const totalStorageUsedMb = Math.round(totalStorageUsedBytes / (1024 * 1024));

    return {
      success: true,
      data: {
        planName: plan?.plan_name ?? null,
        planId: plan?.id_plan ?? null,
        subscriptionStatus: subscription?.status ?? null,
        // Shops
        ownedShopsCount: ownedShopsCount ?? 0,
        memberShopsCount,
        maxShops: plan?.max_shops ?? null,
        // Storage
        totalStorageUsedMb,
        storageLimitMb: plan?.storage_limit_mb ?? null,
        // Staff
        maxStaffPerShop: plan?.max_staff_per_shop ?? null,
        // AI
        aiCreditsMonthly: plan?.ai_credits_monthly ?? null,
        // Enterprise flag
        isContactSales: plan?.is_contact_sales ?? false,
      },
    };
  } catch (error) {
    console.error('getUserSubscriptionLimitsAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch subscription limits',
      code: 'LIMITS_ERROR',
    };
  }
}
