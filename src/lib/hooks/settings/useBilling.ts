'use client';

/**
 * useBilling Hook
 *
 * TanStack Query hooks for billing and subscription management.
 * Provides plan listing, subscription status, usage data, and Stripe session creation.
 *
 * Features:
 * - Fetch available subscription plans
 * - Get current user's subscription limits
 * - Get shop-specific subscription usage
 * - Create Stripe Checkout sessions
 * - Create Stripe Customer Portal sessions
 *
 * @module lib/hooks/settings/useBilling
 */

import { useQuery, useMutation } from '@tanstack/react-query';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Available subscription plan for billing UI
 * Note: Named BillingPlan to avoid conflict with Plan from data/useSubscription
 */
export interface BillingPlan {
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
}

/**
 * User subscription limits and usage
 */
export interface SubscriptionLimits {
  planName: string | null;
  planId: string | null;
  subscriptionStatus: string | null;
  ownedShopsCount: number;
  memberShopsCount: number;
  maxShops: number | null;
  totalStorageUsedMb: number;
  storageLimitMb: number | null;
  maxStaffPerShop: number | null;
  aiCreditsMonthly: number | null;
  isContactSales: boolean;
}

/**
 * Shop-specific subscription usage
 */
export interface SubscriptionUsage {
  shopsUsed: number;
  shopsLimit: number | null;
  staffUsed: number;
  staffLimit: number | null;
  aiCreditsUsed: number;
  aiCreditsLimit: number | null;
  storageUsedMb: number;
  storageLimitMb: number | null;
}

/**
 * URL result for redirects
 */
export interface UrlResult {
  url: string;
}

/**
 * Checkout redirect options
 */
export interface CheckoutRedirectOptions {
  successPath?: string;
  cancelPath?: string;
}

/**
 * Action result type for billing operations
 */
export interface BillingActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

/**
 * Server action functions interface
 */
export interface BillingActions {
  getAvailablePlansAction: () => Promise<BillingActionResult<BillingPlan[]>>;
  getUserSubscriptionLimitsAction: () => Promise<BillingActionResult<SubscriptionLimits>>;
  getSubscriptionUsageAction: (shopId: string) => Promise<BillingActionResult<SubscriptionUsage>>;
  createCheckoutSessionAction: (
    priceId: string,
    options?: CheckoutRedirectOptions
  ) => Promise<BillingActionResult<UrlResult>>;
  createPortalSessionAction: () => Promise<BillingActionResult<UrlResult>>;
}

// =============================================================================
// QUERY KEY FACTORY
// =============================================================================

/**
 * Query key factory for billing-related queries
 */
export const billingKeys = {
  /** All billing queries */
  all: ['billing'] as const,
  /** Available plans */
  plans: ['billing', 'plans'] as const,
  /** User subscription limits */
  subscription: ['billing', 'subscription'] as const,
  /** Shop usage (with shopId parameter) */
  usage: (shopId: string) => ['billing', 'usage', shopId] as const,
} as const;

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to get all available subscription plans
 *
 * Fetches active plans from the database with pricing and limits.
 *
 * @param actions - Server action functions for billing operations
 * @returns Query result with plans array
 *
 * @example
 * ```tsx
 * import { getAvailablePlansAction } from '@/lib/actions/billing';
 *
 * function PlanSelector() {
 *   const { data: plans, isLoading } = useAvailablePlans({
 *     getAvailablePlansAction,
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       {plans?.map(plan => (
 *         <PlanCard key={plan.id} plan={plan} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAvailablePlans(actions: Pick<BillingActions, 'getAvailablePlansAction'>) {
  return useQuery({
    queryKey: billingKeys.plans,
    queryFn: async () => {
      const result = await actions.getAvailablePlansAction();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch plans');
      }
      return result.data ?? [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - plans don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to get current user's subscription limits
 *
 * Fetches the user's current plan, limits, and usage aggregates.
 *
 * @param actions - Server action functions for billing operations
 * @returns Query result with subscription limits
 *
 * @example
 * ```tsx
 * import { getUserSubscriptionLimitsAction } from '@/lib/actions/billing';
 *
 * function SubscriptionStatus() {
 *   const { data: limits, isLoading } = useUserSubscriptionLimits({
 *     getUserSubscriptionLimitsAction,
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <h2>{limits?.planName}</h2>
 *       <p>Shops: {limits?.ownedShopsCount} / {limits?.maxShops ?? '∞'}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserSubscriptionLimits(
  actions: Pick<BillingActions, 'getUserSubscriptionLimitsAction'>
) {
  return useQuery({
    queryKey: billingKeys.subscription,
    queryFn: async () => {
      const result = await actions.getUserSubscriptionLimitsAction();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch subscription limits');
      }
      return result.data ?? null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook to get shop-specific subscription usage
 *
 * Fetches usage data for a specific shop (staff count, AI credits, storage).
 *
 * @param actions - Server action functions for billing operations
 * @param shopId - The shop ID to get usage for
 * @returns Query result with usage data
 *
 * @example
 * ```tsx
 * import { getSubscriptionUsageAction } from '@/lib/actions/billing';
 *
 * function ShopUsage({ shopId }) {
 *   const { data: usage, isLoading } = useSubscriptionUsage(
 *     { getSubscriptionUsageAction },
 *     shopId
 *   );
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <p>Staff: {usage?.staffUsed} / {usage?.staffLimit ?? '∞'}</p>
 *       <p>Storage: {usage?.storageUsedMb}MB / {usage?.storageLimitMb ?? '∞'}MB</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSubscriptionUsage(
  actions: Pick<BillingActions, 'getSubscriptionUsageAction'>,
  shopId: string
) {
  return useQuery({
    queryKey: billingKeys.usage(shopId),
    queryFn: async () => {
      const result = await actions.getSubscriptionUsageAction(shopId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch usage data');
      }
      return result.data ?? null;
    },
    enabled: !!shopId,
    staleTime: 2 * 60 * 1000, // 2 minutes - usage can change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to create a Stripe Checkout session
 *
 * Creates a checkout session and redirects to Stripe.
 *
 * @param actions - Server action functions for billing operations
 * @returns Mutation for creating checkout session
 *
 * @example
 * ```tsx
 * import { createCheckoutSessionAction } from '@/lib/actions/billing';
 *
 * function UpgradeButton({ priceId }) {
 *   const { mutate: createCheckout, isPending } = useCreateCheckoutSession({
 *     createCheckoutSessionAction,
 *   });
 *
 *   const handleUpgrade = () => {
 *     createCheckout(
 *       { priceId },
 *       {
 *         onError: (error) => toast.error(error.message),
 *       }
 *     );
 *   };
 *
 *   return (
 *     <button onClick={handleUpgrade} disabled={isPending}>
 *       {isPending ? 'Redirecting...' : 'Upgrade'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useCreateCheckoutSession(
  actions: Pick<BillingActions, 'createCheckoutSessionAction'>
) {
  return useMutation({
    mutationFn: async ({
      priceId,
      options,
    }: {
      priceId: string;
      options?: CheckoutRedirectOptions;
    }) => {
      const result = await actions.createCheckoutSessionAction(priceId, options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create checkout session');
      }
      return result.data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data?.url) {
        window.location.href = data.url;
      }
    },
  });
}

/**
 * Hook to create a Stripe Customer Portal session
 *
 * Creates a portal session and redirects to Stripe.
 *
 * @param actions - Server action functions for billing operations
 * @returns Mutation for creating portal session
 *
 * @example
 * ```tsx
 * import { createPortalSessionAction } from '@/lib/actions/billing';
 *
 * function ManageSubscriptionButton() {
 *   const { mutate: openPortal, isPending } = useCreatePortalSession({
 *     createPortalSessionAction,
 *   });
 *
 *   const handleManage = () => {
 *     openPortal(undefined, {
 *       onError: (error) => toast.error(error.message),
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleManage} disabled={isPending}>
 *       {isPending ? 'Opening...' : 'Manage Subscription'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useCreatePortalSession(actions: Pick<BillingActions, 'createPortalSessionAction'>) {
  return useMutation({
    mutationFn: async () => {
      const result = await actions.createPortalSessionAction();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create portal session');
      }
      return result.data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe Customer Portal
      if (data?.url) {
        window.location.href = data.url;
      }
    },
  });
}
