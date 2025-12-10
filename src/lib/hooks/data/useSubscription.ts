/**
 * useSubscription Hook
 *
 * Hook for fetching subscription plan data for the current shop.
 * Provides access to the shop's subscription status, plan details, and limits.
 *
 * Features:
 * - Fetches subscription via shops -> subscriptions -> plans relationship
 * - Uses TanStack Query for caching and automatic refetching
 * - Normalizes plan names to tier identifiers for easy comparison
 * - Exposes plan limits (max shops, staff, AI credits, storage)
 *
 * @example
 * ```tsx
 * import { useSubscriptionPlan } from '@/lib/hooks/data';
 *
 * function SubscriptionStatus() {
 *   const { subscription, isLoading, error } = useSubscriptionPlan();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (!subscription) return <NoSubscription />;
 *
 *   return (
 *     <div>
 *       <p>Plan: {subscription.plan.name}</p>
 *       <p>Status: {subscription.status}</p>
 *       <p>Renews: {subscription.currentPeriodEnd}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @module lib/hooks/data/useSubscription
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Subscription status values from the database
 */
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'paused';

/**
 * Plan tier identifiers (normalized from plan names)
 */
export type PlanTier = 'free' | 'pro' | 'business' | 'enterprise';

/**
 * Plan features configuration
 */
export interface PlanFeatures {
  /** Whether AI features are enabled */
  ai_enabled?: boolean;
  /** Whether advanced analytics are available */
  advanced_analytics?: boolean;
  /** Whether multi-shop is enabled */
  multi_shop?: boolean;
  /** Whether custom branding is available */
  custom_branding?: boolean;
  /** Whether priority support is included */
  priority_support?: boolean;
  /** Whether API access is available */
  api_access?: boolean;
  /** Additional feature flags */
  [key: string]: boolean | undefined;
}

/**
 * Plan details from the plans table
 */
export interface Plan {
  /** Unique plan identifier */
  id: string;
  /** Display name of the plan (e.g., 'Professional', 'Business') */
  name: string;
  /** Normalized tier identifier (e.g., 'pro', 'business') */
  tier: PlanTier;
  /** Maximum number of shops allowed (null = unlimited) */
  maxShops: number | null;
  /** Maximum staff members per shop (null = unlimited) */
  maxStaffPerShop: number | null;
  /** Monthly AI credits allocation (null = none) */
  aiCreditsMonthly: number | null;
  /** Storage limit in megabytes (null = unlimited) */
  storageLimitMb: number | null;
  /** Feature flags for the plan */
  features: PlanFeatures;
}

/**
 * Complete subscription and plan data
 */
export interface SubscriptionPlan {
  /** Unique subscription identifier */
  subscriptionId: string;
  /** Stripe subscription ID for payment integration */
  stripeSubscriptionId: string | null;
  /** Current subscription status */
  status: SubscriptionStatus;
  /** End date of the current billing period */
  currentPeriodEnd: string;
  /** Whether the subscription will cancel at period end */
  cancelAtPeriodEnd: boolean;
  /** Associated plan details */
  plan: Plan;
}

/**
 * Return type for the useSubscriptionPlan hook
 */
export interface UseSubscriptionPlanReturn {
  /** The subscription and plan data, null if not found */
  subscription: SubscriptionPlan | null;
  /** True while the data is being fetched */
  isLoading: boolean;
  /** Error object if the query failed */
  error: Error | null;
  /** Function to manually refetch the subscription data */
  refetch: () => void;
}

/**
 * Raw subscription data from the database
 */
interface SubscriptionRow {
  id_subscription: string;
  stripe_subscription_id: string | null;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

/**
 * Raw plan data from the database
 */
interface PlanRow {
  id_plan: string;
  plan_name: string;
  max_shops: number | null;
  max_staff_per_shop: number | null;
  ai_credits_monthly: number | null;
  storage_limit_mb: number | null;
  features: Record<string, boolean> | null;
}

// =============================================================================
// QUERY KEYS
// =============================================================================

/**
 * Query key factory for subscription-related queries
 */
export const subscriptionKeys = {
  /** Base key for all subscription queries */
  all: ['subscriptions'] as const,
  /** Key for a specific shop's subscription */
  byShop: (shopId: string) => [...subscriptionKeys.all, shopId] as const,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalizes a plan name to a tier identifier.
 *
 * Converts display names like 'Professional' to lowercase tier
 * identifiers like 'pro' for easier programmatic comparison.
 *
 * @param planName - The display name of the plan
 * @returns The normalized tier identifier
 *
 * @example
 * ```ts
 * planNameToTier('Professional') // 'pro'
 * planNameToTier('Business')     // 'business'
 * planNameToTier('Enterprise')   // 'enterprise'
 * planNameToTier('Unknown')      // 'free'
 * ```
 */
export function planNameToTier(planName: string): PlanTier {
  const normalized = planName.toLowerCase().trim();

  switch (normalized) {
    case 'professional':
    case 'pro':
      return 'pro';
    case 'business':
      return 'business';
    case 'enterprise':
      return 'enterprise';
    case 'free':
    case 'starter':
    case 'trial':
      return 'free';
    default:
      return 'free';
  }
}

/**
 * Transforms raw database rows into the SubscriptionPlan interface
 */
function transformSubscriptionData(subscription: SubscriptionRow, plan: PlanRow): SubscriptionPlan {
  return {
    subscriptionId: subscription.id_subscription,
    stripeSubscriptionId: subscription.stripe_subscription_id,
    status: subscription.status as SubscriptionStatus,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    plan: {
      id: plan.id_plan,
      name: plan.plan_name,
      tier: planNameToTier(plan.plan_name),
      maxShops: plan.max_shops,
      maxStaffPerShop: plan.max_staff_per_shop,
      aiCreditsMonthly: plan.ai_credits_monthly,
      storageLimitMb: plan.storage_limit_mb,
      features: (plan.features as PlanFeatures) ?? {},
    },
  };
}

/**
 * Fetches subscription and plan data for a shop
 */
async function fetchSubscriptionPlan(shopId: string): Promise<SubscriptionPlan | null> {
  const supabase = createClient();

  // First, get the shop to find its subscription ID
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('id_subscription')
    .eq('id_shop', shopId)
    .is('deleted_at', null)
    .single();

  if (shopError) {
    // PGRST116 = no rows found
    if (shopError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch shop: ${shopError.message}`);
  }

  if (!shop?.id_subscription) {
    return null;
  }

  // Fetch subscription with plan details
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select(
      `
      id_subscription,
      stripe_subscription_id,
      status,
      current_period_end,
      cancel_at_period_end,
      plans:id_plan (
        id_plan,
        plan_name,
        max_shops,
        max_staff_per_shop,
        ai_credits_monthly,
        storage_limit_mb,
        features
      )
    `
    )
    .eq('id_subscription', shop.id_subscription)
    .single();

  if (subscriptionError) {
    // PGRST116 = no rows found
    if (subscriptionError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch subscription: ${subscriptionError.message}`);
  }

  if (!subscription || !subscription.plans) {
    return null;
  }

  // Type assertion for the joined plan data
  const plan = subscription.plans as unknown as PlanRow;

  return transformSubscriptionData(
    {
      id_subscription: subscription.id_subscription,
      stripe_subscription_id: subscription.stripe_subscription_id,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
    plan
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to fetch the current shop's subscription and plan details.
 *
 * Retrieves the subscription status, billing period, and associated plan
 * limits (max shops, staff, AI credits, storage). Uses the shop context
 * from useShop to determine which subscription to fetch.
 *
 * @returns Object containing subscription data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * function UpgradePrompt() {
 *   const { subscription, isLoading } = useSubscriptionPlan();
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   if (subscription?.plan.tier === 'free') {
 *     return <UpgradeBanner />;
 *   }
 *
 *   return null;
 * }
 * ```
 *
 * @example
 * ```tsx
 * function AIFeatureGate({ children }: { children: React.ReactNode }) {
 *   const { subscription } = useSubscriptionPlan();
 *
 *   if (!subscription?.plan.features.ai_enabled) {
 *     return <UpgradeRequired feature="AI Assistant" />;
 *   }
 *
 *   return <>{children}</>;
 * }
 * ```
 */
export function useSubscriptionPlan(): UseSubscriptionPlanReturn {
  const { shopId, hasAccess } = useShop();

  const {
    data: subscription,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: subscriptionKeys.byShop(shopId ?? ''),
    queryFn: async () => {
      if (!shopId) {
        return null;
      }
      return fetchSubscriptionPlan(shopId);
    },
    enabled: !!shopId && hasAccess,
    staleTime: 5 * 60 * 1000, // 5 minutes - subscription data doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });

  return {
    subscription: subscription ?? null,
    isLoading,
    error: error as Error | null,
    refetch: () => {
      refetch();
    },
  };
}

/**
 * Hook to invalidate subscription cache.
 * Call this after subscription changes (upgrades, cancellations, etc.)
 *
 * @returns Object with invalidation functions
 *
 * @example
 * ```tsx
 * function UpgradeButton() {
 *   const { invalidate } = useInvalidateSubscription();
 *
 *   const handleUpgrade = async () => {
 *     await processUpgrade();
 *     invalidate(); // Refresh subscription data
 *   };
 * }
 * ```
 */
export function useInvalidateSubscription() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate subscription for the current shop */
    invalidate: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: subscriptionKeys.byShop(shopId) });
      }
    },
    /** Invalidate subscription for a specific shop */
    invalidateShop: (targetShopId: string) =>
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.byShop(targetShopId) }),
    /** Invalidate all subscription queries */
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: subscriptionKeys.all }),
  };
}
