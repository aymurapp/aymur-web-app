'use client';

/**
 * Pricing Page
 *
 * Displays available subscription plans fetched dynamically from the database.
 * Users can select a plan and proceed to checkout.
 *
 * Features:
 * - Dynamically fetches plans from database
 * - Displays plan features and limits
 * - Handles Stripe checkout for paid plans
 * - Shows "Contact Sales" for enterprise plans
 * - Auto-updates when plans are modified in database
 *
 * @module app/(platform)/[locale]/pricing/page
 */

import React, { useEffect, useState } from 'react';

import {
  CheckOutlined,
  CrownOutlined,
  RocketOutlined,
  ShopOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { Alert, Badge, message } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getAvailablePlansAction, createCheckoutSessionAction } from '@/lib/actions/billing';
import { cn } from '@/lib/utils/cn';

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

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price with currency
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
 * Get plan icon based on name
 */
function getPlanIcon(planName: string): React.ReactNode {
  const name = planName.toLowerCase();
  if (name.includes('enterprise')) {
    return <CrownOutlined className="text-2xl" />;
  }
  if (name.includes('business')) {
    return <RocketOutlined className="text-2xl" />;
  }
  if (name.includes('professional') || name.includes('pro')) {
    return <StarOutlined className="text-2xl" />;
  }
  return <ShopOutlined className="text-2xl" />;
}

/**
 * Get plan accent color
 */
function getPlanAccent(planName: string): string {
  const name = planName.toLowerCase();
  if (name.includes('enterprise')) {
    return 'from-purple-500 to-purple-600';
  }
  if (name.includes('business')) {
    return 'from-amber-500 to-amber-600';
  }
  return 'from-blue-500 to-blue-600';
}

/**
 * Check if plan should be marked as popular
 */
function isPopularPlan(planName: string): boolean {
  const name = planName.toLowerCase();
  return name.includes('business');
}

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Plan card component
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
  t: ReturnType<typeof useTranslations<'pricing'>>;
}) {
  const isPopular = isPopularPlan(plan.name);
  const accent = getPlanAccent(plan.name);
  const icon = getPlanIcon(plan.name);

  // Build features list
  const featuresList: string[] = [];

  // Shops
  if (plan.maxShops === null) {
    featuresList.push(t('featuresList.unlimitedShops'));
  } else {
    featuresList.push(t('featuresList.shops', { count: plan.maxShops }));
  }

  // Staff
  if (plan.maxStaffPerShop === null) {
    featuresList.push(t('featuresList.unlimitedStaff'));
  } else {
    featuresList.push(t('featuresList.staff', { count: plan.maxStaffPerShop }));
  }

  // AI Credits
  if (plan.aiCreditsMonthly === null) {
    featuresList.push(t('featuresList.unlimitedAi'));
  } else if (plan.aiCreditsMonthly > 0) {
    featuresList.push(t('featuresList.aiCredits', { count: plan.aiCreditsMonthly }));
  }

  // Storage
  if (plan.storageLimitMb === null) {
    featuresList.push(t('featuresList.unlimitedStorage'));
  } else {
    const storageGb = Math.round(plan.storageLimitMb / 1024);
    featuresList.push(t('featuresList.storage', { count: storageGb }));
  }

  // Additional features from features object
  if (plan.features.priority_support) {
    featuresList.push(t('featuresList.prioritySupport'));
  }
  if (plan.features.custom_branding) {
    featuresList.push(t('featuresList.customBranding'));
  }
  if (plan.features.api_access) {
    featuresList.push(t('featuresList.apiAccess'));
  }
  if (plan.features.advanced_analytics) {
    featuresList.push(t('featuresList.advancedAnalytics'));
  }

  const cardContent = (
    <Card
      className={cn(
        'h-full relative overflow-hidden transition-all duration-300',
        'hover:shadow-xl hover:-translate-y-1',
        isPopular && 'ring-2 ring-amber-500'
      )}
    >
      {/* Header with gradient */}
      <div className={cn('bg-gradient-to-r p-6 text-white', accent)}>
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-white/20 rounded-lg">{icon}</div>
          {isPopular && (
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
              {t('mostPopular')}
            </span>
          )}
        </div>
        <h3 className="text-2xl font-bold mt-4">{plan.name}</h3>
      </div>

      {/* Pricing */}
      <div className="p-6 border-b border-stone-100">
        {plan.isContactSales ? (
          <div>
            <span className="text-3xl font-bold text-stone-900">{t('customPricing')}</span>
            <p className="text-sm text-stone-500 mt-1">{t('enterpriseDescription')}</p>
          </div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-stone-900">
              {plan.price !== null ? formatPrice(plan.price, plan.currency) : '-'}
            </span>
            {plan.interval && (
              <span className="text-stone-500">
                /
                {plan.interval === 'month'
                  ? t('perMonth').replace('/', '')
                  : t('perYear').replace('/', '')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Features */}
      <div className="p-6">
        <h4 className="font-semibold text-stone-900 mb-4">{t('features')}</h4>
        <ul className="space-y-3">
          {featuresList.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckOutlined className="text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-stone-600">{feature}</span>
            </li>
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
          className={cn(isPopular && 'bg-amber-500 hover:bg-amber-600 border-amber-500')}
        >
          {plan.isContactSales ? t('contactSales') : t('getStarted')}
        </Button>
      </div>
    </Card>
  );

  if (isPopular) {
    return (
      <Badge.Ribbon text={t('recommended')} color="gold">
        {cardContent}
      </Badge.Ribbon>
    );
  }

  return cardContent;
}

/**
 * Loading skeleton for plan cards
 */
function PlanCardSkeleton() {
  return (
    <Card className="h-full" skeleton loading skeletonRows={8}>
      <div />
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PricingPage() {
  const t = useTranslations('pricing');
  const tCommon = useTranslations('common');

  const [plans, setPlans] = useState<PlanData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Fetch plans on mount
  useEffect(() => {
    async function loadPlans() {
      try {
        const result = await getAvailablePlansAction();

        if (result.success && result.data) {
          setPlans(result.data);
        } else {
          setError(result.success ? 'No plans data returned' : result.error);
        }
      } catch (err) {
        console.error('Error loading plans:', err);
        setError(t('errorLoading'));
      } finally {
        setIsLoading(false);
      }
    }

    loadPlans();
  }, [t]);

  /**
   * Handle plan selection
   */
  const handleSelectPlan = async (plan: PlanData) => {
    // For contact sales plans, redirect to contact page or show modal
    if (plan.isContactSales) {
      // Open email client for enterprise inquiries
      window.location.href = 'mailto:sales@aymur.com?subject=Enterprise Plan Inquiry';
      return;
    }

    // Check if plan has a Stripe price ID
    if (!plan.stripePriceId) {
      message.error('This plan is not available for purchase at the moment');
      return;
    }

    setCheckoutLoading(plan.id);

    try {
      const result = await createCheckoutSessionAction(plan.stripePriceId);

      if (result.success && result.data) {
        // Show loading message and redirect
        message.loading(t('redirectingToCheckout'), 2);
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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-stone-900 mb-4">{t('title')}</h1>
            <p className="text-lg text-stone-600">{t('loadingPlans')}</p>
          </div>

          {/* Loading Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <PlanCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Alert
            type="error"
            showIcon
            message={tCommon('messages.error')}
            description={error}
            action={
              <Button type="primary" onClick={() => window.location.reload()}>
                {tCommon('actions.retry')}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // No plans available
  if (plans.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-stone-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-stone-600">{t('noPlans')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-stone-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>

        {/* Plans Grid */}
        <div
          className={cn(
            'grid gap-8',
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

        {/* Footer note */}
        <div className="text-center mt-12">
          <p className="text-stone-500 text-sm">
            All plans include a 14-day free trial. No credit card required to start.
          </p>
        </div>
      </div>
    </div>
  );
}
