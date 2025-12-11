'use client';

/**
 * Onboarding Plans Page
 *
 * Enterprise-grade pricing page for the AYMUR onboarding flow.
 * Displays available subscription plans with elegant, gold-themed design.
 *
 * Features:
 * - Dynamic plan fetching from database
 * - 3-column responsive grid layout
 * - Gradient headers with tier-specific colors
 * - "Most Popular" badge for Business plan
 * - Stripe checkout integration
 * - Professional hover animations
 * - AYMUR branding with gold accents
 *
 * @module app/(platform)/[locale]/onboarding/plans/page
 */

import React, { useEffect, useState, useCallback } from 'react';

import {
  CheckOutlined,
  CheckCircleFilled,
  CrownOutlined,
  RocketOutlined,
  StarOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getAvailablePlansAction, createCheckoutSessionAction } from '@/lib/actions/billing';
import { getOnboardingStatus, updateOnboardingStep } from '@/lib/actions/onboarding';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Gradient configurations for each plan tier
 * Enterprise-grade: sophisticated, muted tones with gold accent for featured plan
 */
const PLAN_GRADIENTS = {
  professional: 'from-stone-600 to-stone-700',
  business: 'from-[#A68B1F] to-[#8B7419]',
  enterprise: 'from-stone-800 to-stone-900',
} as const;

// =============================================================================
// TYPES
// =============================================================================

interface PlanData {
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

type PlanTier = 'professional' | 'business' | 'enterprise';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price with currency symbol
 */
function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Determine plan tier from name
 */
function getPlanTier(planName: string): PlanTier {
  const name = planName.toLowerCase();
  if (name.includes('enterprise')) {
    return 'enterprise';
  }
  if (name.includes('business')) {
    return 'business';
  }
  return 'professional';
}

/**
 * Get plan icon based on tier
 */
function getPlanIcon(tier: PlanTier): React.ReactNode {
  const iconClass = 'text-2xl';
  switch (tier) {
    case 'enterprise':
      return <CrownOutlined className={iconClass} />;
    case 'business':
      return <RocketOutlined className={iconClass} />;
    default:
      return <StarOutlined className={iconClass} />;
  }
}

/**
 * Check if plan should be marked as popular
 */
function isPopularPlan(planName: string): boolean {
  return planName.toLowerCase().includes('business');
}

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Individual plan feature item with checkmark
 */
function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 group">
      <span
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full',
          'flex items-center justify-center',
          'bg-emerald-100 text-emerald-600',
          'group-hover:bg-emerald-500 group-hover:text-white',
          'transition-colors duration-200'
        )}
      >
        <CheckOutlined className="text-xs" />
      </span>
      <span className="text-stone-600 text-sm leading-relaxed">{children}</span>
    </li>
  );
}

/**
 * Plan card with gradient header and feature list
 */
function PlanCard({
  plan,
  onSelect,
  isLoading,
  t,
}: {
  plan: PlanData;
  onSelect: () => void;
  isLoading: boolean;
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}) {
  const tier = getPlanTier(plan.name);
  const isPopular = isPopularPlan(plan.name);
  const gradient = PLAN_GRADIENTS[tier];
  const icon = getPlanIcon(tier);

  // Build features list dynamically from plan data
  const featuresList: string[] = [];

  // Shops limit
  if (plan.maxShops === null) {
    featuresList.push('Unlimited shops');
  } else {
    featuresList.push(`Up to ${plan.maxShops} shop${plan.maxShops > 1 ? 's' : ''}`);
  }

  // Staff limit
  if (plan.maxStaffPerShop === null) {
    featuresList.push('Unlimited team members');
  } else {
    featuresList.push(
      `${plan.maxStaffPerShop} team member${plan.maxStaffPerShop > 1 ? 's' : ''} per shop`
    );
  }

  // AI Credits
  if (plan.aiCreditsMonthly === null) {
    featuresList.push('Unlimited AI credits');
  } else if (plan.aiCreditsMonthly > 0) {
    featuresList.push(`${plan.aiCreditsMonthly.toLocaleString()} AI credits/month`);
  }

  // Storage
  if (plan.storageLimitMb === null) {
    featuresList.push('Unlimited storage');
  } else {
    const storageGb = Math.round(plan.storageLimitMb / 1024);
    featuresList.push(`${storageGb} GB storage`);
  }

  // Additional features from features object
  if (plan.features.priority_support) {
    featuresList.push('Priority support');
  }
  if (plan.features.custom_branding) {
    featuresList.push('Custom branding');
  }
  if (plan.features.api_access) {
    featuresList.push('API access');
  }
  if (plan.features.advanced_analytics) {
    featuresList.push('Advanced analytics');
  }
  if (plan.features.dedicated_account_manager) {
    featuresList.push('Dedicated account manager');
  }
  if (plan.features.sla_guarantee) {
    featuresList.push('99.9% SLA guarantee');
  }

  const cardContent = (
    <div
      className={cn(
        'relative h-full flex flex-col',
        'bg-white rounded-2xl overflow-hidden',
        'border border-stone-200',
        'shadow-sm hover:shadow-2xl',
        'transform hover:-translate-y-2',
        'transition-all duration-300 ease-out',
        isPopular && 'ring-2 ring-[#C9A227] shadow-[#C9A227]/20'
      )}
    >
      {/* Popular Badge - Floating */}
      {isPopular && (
        <div className="absolute -top-0 inset-x-0 flex justify-center z-10">
          <span
            className={cn(
              'px-4 py-1.5 text-xs font-bold uppercase tracking-wider',
              'bg-gradient-to-r from-[#C9A227] to-[#A68B1F]',
              'text-white rounded-b-lg shadow-lg'
            )}
          >
            {t('plans.popular')}
          </span>
        </div>
      )}

      {/* Gradient Header */}
      <div
        className={cn('relative bg-gradient-to-br p-6 text-white', gradient, isPopular && 'pt-10')}
      >
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 end-0 w-32 h-32 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 start-0 w-24 h-24 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />
        </div>

        {/* Header Content */}
        <div className="relative z-10">
          <div
            className={cn(
              'inline-flex items-center justify-center',
              'w-12 h-12 rounded-xl',
              'bg-white/20 backdrop-blur-sm',
              'mb-4'
            )}
          >
            {icon}
          </div>
          <h3 className="text-2xl font-bold">{plan.name}</h3>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="p-6 border-b border-stone-100">
        {plan.isContactSales ? (
          <div>
            <span className="text-3xl font-bold text-stone-900">Custom</span>
            <p className="text-sm text-stone-500 mt-1">Tailored to your needs</p>
          </div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-stone-900">
              {plan.price !== null ? formatPrice(plan.price, plan.currency) : 'Free'}
            </span>
            {plan.interval && plan.price !== null && (
              <span className="text-stone-500 text-lg">
                {plan.interval === 'month' ? t('plans.cta') && '/mo' : '/yr'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Features List */}
      <div className="flex-1 p-6">
        <h4 className="font-semibold text-stone-900 mb-4 text-sm uppercase tracking-wider">
          {t('plans.features')}
        </h4>
        <ul className="space-y-3">
          {featuresList.map((feature, index) => (
            <FeatureItem key={index}>{feature}</FeatureItem>
          ))}
        </ul>
      </div>

      {/* CTA Button */}
      <div className="p-6 pt-0">
        <Button
          type={isPopular ? 'primary' : 'default'}
          size="large"
          block
          onClick={onSelect}
          loading={isLoading}
          className={cn(
            'h-12 text-base font-semibold rounded-xl',
            'transition-all duration-200',
            isPopular
              ? 'bg-gradient-to-r from-[#C9A227] to-[#A68B1F] border-none hover:from-[#A68B1F] hover:to-[#8B7419] shadow-lg shadow-[#C9A227]/30'
              : 'hover:border-stone-400 hover:text-stone-900'
          )}
        >
          {plan.isContactSales ? 'Contact Sales' : t('plans.cta')}
        </Button>
      </div>
    </div>
  );

  return cardContent;
}

/**
 * Loading skeleton for plan cards
 */
function PlanCardSkeleton() {
  return (
    <div
      className={cn(
        'h-[500px] rounded-2xl overflow-hidden',
        'bg-white border border-stone-200',
        'animate-pulse'
      )}
    >
      {/* Header skeleton */}
      <div className="h-32 bg-gradient-to-br from-stone-200 to-stone-300" />

      {/* Price skeleton */}
      <div className="p-6 border-b border-stone-100">
        <div className="h-10 w-24 bg-stone-200 rounded" />
      </div>

      {/* Features skeleton */}
      <div className="p-6 space-y-4">
        <div className="h-4 w-20 bg-stone-200 rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-stone-200" />
            <div className="h-4 flex-1 bg-stone-200 rounded" />
          </div>
        ))}
      </div>

      {/* Button skeleton */}
      <div className="p-6 pt-0">
        <div className="h-12 bg-stone-200 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div
          className={cn(
            'w-16 h-16 mx-auto mb-6 rounded-full',
            'bg-red-100 flex items-center justify-center'
          )}
        >
          <span className="text-3xl text-red-500">!</span>
        </div>
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Something went wrong</h2>
        <p className="text-stone-600 mb-6">{error}</p>
        <Button type="primary" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    </div>
  );
}

/**
 * Already subscribed state - shown when user already has an active subscription
 */
function AlreadySubscribedState({
  onContinue,
  isLoading,
  t,
}: {
  onContinue: () => void;
  isLoading: boolean;
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-lg w-full">
        <Card className="text-center p-8 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          {/* Success Icon */}
          <div className="mb-6">
            <div
              className={cn(
                'inline-flex items-center justify-center',
                'w-20 h-20 rounded-full',
                'bg-emerald-100'
              )}
            >
              <CheckCircleFilled className="text-4xl text-emerald-500" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-stone-900 mb-3">
            {t('plans.alreadySubscribed.title')}
          </h2>

          {/* Description */}
          <p className="text-stone-600 mb-8">{t('plans.alreadySubscribed.description')}</p>

          {/* Continue Button */}
          <Button
            type="primary"
            size="large"
            onClick={onContinue}
            loading={isLoading}
            icon={<ArrowRightOutlined />}
            className={cn(
              'h-14 px-10 text-base font-semibold rounded-xl',
              'bg-gradient-to-r from-[#C9A227] to-[#A68B1F]',
              'border-none hover:from-[#A68B1F] hover:to-[#8B7419]',
              'shadow-lg shadow-[#C9A227]/30'
            )}
          >
            {t('plans.alreadySubscribed.cta')}
          </Button>

          {/* Hint */}
          <p className="mt-4 text-sm text-stone-500">{t('plans.alreadySubscribed.hint')}</p>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function OnboardingPlansPage() {
  const t = useTranslations('onboarding');
  const router = useRouter();

  const [plans, setPlans] = useState<PlanData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);

  /**
   * Load plans and check subscription status
   */
  const loadPlansAndStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check subscription status first
      const statusResult = await getOnboardingStatus();
      if (statusResult.success && statusResult.data) {
        setHasActiveSubscription(statusResult.data.hasActiveSubscription);

        // If already has subscription, no need to load plans
        if (statusResult.data.hasActiveSubscription) {
          setIsLoading(false);
          return;
        }
      }

      // Load plans if no active subscription
      const result = await getAvailablePlansAction();

      if (result.success && result.data) {
        setPlans(result.data);
      } else {
        setError(result.success ? 'No plans available' : result.error);
      }
    } catch (err) {
      console.error('Error loading plans:', err);
      setError('Failed to load plans. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load plans and status on mount
  useEffect(() => {
    loadPlansAndStatus();
  }, [loadPlansAndStatus]);

  /**
   * Handle continue for already subscribed users
   */
  const handleContinueToSetup = async () => {
    setContinueLoading(true);
    try {
      // Update onboarding step to setup
      await updateOnboardingStep('setup');
      router.push('/onboarding/setup');
    } catch (err) {
      console.error('Error continuing to setup:', err);
      message.error('Failed to continue. Please try again.');
    } finally {
      setContinueLoading(false);
    }
  };

  /**
   * Handle plan selection and checkout
   */
  const handleSelectPlan = async (plan: PlanData) => {
    // For enterprise/contact sales plans
    if (plan.isContactSales) {
      window.location.href = 'mailto:sales@aymur.com?subject=Enterprise Plan Inquiry';
      return;
    }

    // Validate stripe price ID
    if (!plan.stripePriceId) {
      message.error('This plan is not available for purchase at the moment');
      return;
    }

    setCheckoutLoading(plan.id);

    try {
      // Use onboarding-specific redirect URLs
      const result = await createCheckoutSessionAction(plan.stripePriceId, {
        successPath: '/onboarding/checkout/success',
        cancelPath: '/onboarding/checkout/canceled',
      });

      if (result.success && result.data) {
        message.loading('Redirecting to checkout...', 2);
        window.location.href = result.data.url;
      } else {
        message.error(result.success ? 'Failed to create checkout session' : result.error);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      message.error('An error occurred. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Error state
  if (error && !isLoading) {
    return <ErrorState error={error} onRetry={loadPlansAndStatus} />;
  }

  // Already subscribed state
  if (hasActiveSubscription && !isLoading) {
    return (
      <AlreadySubscribedState
        onContinue={handleContinueToSetup}
        isLoading={continueLoading}
        t={t}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section with Stone Background */}
      <section
        className={cn('relative py-12 sm:py-16', 'bg-gradient-to-b from-stone-100 to-stone-50')}
      >
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={cn(
              'absolute top-10 start-10 w-64 h-64 rounded-full',
              'bg-[#C9A227]/5 blur-3xl'
            )}
          />
          <div
            className={cn(
              'absolute bottom-10 end-10 w-96 h-96 rounded-full',
              'bg-stone-500/5 blur-3xl'
            )}
          />
        </div>

        {/* Back Button */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <Link
            href="/onboarding/welcome"
            className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors group"
          >
            <ArrowLeftOutlined className="text-sm group-hover:-translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:translate-x-1" />
            <span className="text-sm font-medium">
              {t('common.back', { defaultValue: 'Back' })}
            </span>
          </Link>
        </div>

        {/* Header Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className={cn('text-3xl sm:text-4xl lg:text-5xl font-bold', 'text-stone-900 mb-4')}>
            {t('plans.title')}
          </h1>
          <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto">
            {t('plans.subtitle')}
          </p>
        </div>
      </section>

      {/* Plans Grid Section */}
      <section className="flex-1 py-12 px-4 sm:px-6 lg:px-8 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            // Loading State
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {[1, 2, 3].map((i) => (
                <PlanCardSkeleton key={i} />
              ))}
            </div>
          ) : plans.length === 0 ? (
            // Empty State
            <div className="text-center py-16">
              <p className="text-stone-600">No plans available at this time.</p>
            </div>
          ) : (
            // Plans Grid
            <div
              className={cn(
                'grid gap-6 lg:gap-8',
                plans.length === 1 && 'grid-cols-1 max-w-md mx-auto',
                plans.length === 2 && 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto',
                plans.length >= 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              )}
            >
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onSelect={() => handleSelectPlan(plan)}
                  isLoading={checkoutLoading === plan.id}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Guarantee Section */}
      <section className="py-8 bg-white border-t border-stone-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 text-stone-600">
            <svg
              className="w-5 h-5 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="text-sm sm:text-base">{t('plans.guarantee')}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
