'use client';

/**
 * Billing Settings Page
 *
 * Allows users to manage their subscription, view usage stats, and manage payment methods.
 *
 * Features:
 * - Current plan display with status badge
 * - Usage statistics (shops, storage, AI credits)
 * - Available plans grid
 * - Stripe customer portal integration
 *
 * @module app/(platform)/[locale]/settings/billing/page
 */

import React, { useState, useEffect } from 'react';

import { useSearchParams } from 'next/navigation';

import {
  CheckOutlined,
  CrownOutlined,
  RocketOutlined,
  StarOutlined,
  CalendarOutlined,
  ShopOutlined,
  CloudOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { Progress, Tag, message } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  getAvailablePlansAction,
  getUserSubscriptionLimitsAction,
  createCheckoutSessionAction,
  createPortalSessionAction,
} from '@/lib/actions/billing';
import { useUser } from '@/lib/hooks/auth/useUser';
import {
  useAvailablePlans,
  useUserSubscriptionLimits,
  useCreateCheckoutSession,
  useCreatePortalSession,
  type BillingPlan,
} from '@/lib/hooks/settings';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// CONSTANTS
// =============================================================================

const BRAND_COLORS = {
  gold: '#C9A227',
  goldDark: '#A68B1F',
};

/**
 * Gradient configurations for plan cards
 */
const PLAN_GRADIENTS = {
  professional: 'from-stone-600 to-stone-700',
  business: 'from-[#A68B1F] to-[#8B7419]',
  enterprise: 'from-stone-800 to-stone-900',
} as const;

/**
 * Get gradient for a plan based on its name
 */
function getPlanGradient(planName: string): string {
  const name = planName.toLowerCase();
  if (name.includes('enterprise')) {
    return PLAN_GRADIENTS.enterprise;
  }
  if (name.includes('business')) {
    return PLAN_GRADIENTS.business;
  }
  return PLAN_GRADIENTS.professional;
}

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Loading skeleton for billing page
 */
function BillingSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-8 bg-stone-200 rounded w-48 mb-2 animate-pulse" />
        <div className="h-5 bg-stone-200 rounded w-72 animate-pulse" />
      </div>

      {/* Current plan skeleton */}
      <Card className="p-6">
        <div className="h-5 bg-stone-200 rounded w-32 mb-4 animate-pulse" />
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-stone-200 rounded w-40 animate-pulse" />
            <div className="h-4 bg-stone-200 rounded w-32 animate-pulse" />
          </div>
          <div className="h-10 bg-stone-200 rounded w-32 animate-pulse" />
        </div>
      </Card>

      {/* Usage skeleton */}
      <Card className="p-6">
        <div className="h-5 bg-stone-200 rounded w-32 mb-4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-stone-200 rounded w-24 animate-pulse" />
              <div className="h-2 bg-stone-200 rounded w-full animate-pulse" />
              <div className="h-3 bg-stone-200 rounded w-16 animate-pulse" />
            </div>
          ))}
        </div>
      </Card>

      {/* Plans skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-96 bg-stone-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/**
 * Current plan card with status and next billing
 */
function CurrentPlanCard({
  planName,
  subscriptionStatus,
  isContactSales,
  currentPlan,
  onManageSubscription,
  isLoading,
  t,
}: {
  planName: string | null;
  subscriptionStatus: string | null;
  isContactSales: boolean;
  currentPlan: BillingPlan | null;
  onManageSubscription: () => void;
  isLoading: boolean;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  // Format next billing date (30 days from now)
  const nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(
    'en-US',
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }
  );

  const displayPrice = currentPlan?.price ?? 0;
  const isActive = subscriptionStatus === 'active';

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-stone-500 dark:text-stone-400 mb-2">
            {t('billing.currentPlan')}
          </h3>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {planName || t('billing.noPlan')}
            </h2>
            {isActive && (
              <Tag color="success" className="!m-0">
                {t('billing.active')}
              </Tag>
            )}
          </div>
          {isActive && (
            <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
              <CalendarOutlined />
              <span>
                {t('billing.nextBilling')}: {nextBillingDate}
              </span>
            </div>
          )}
        </div>
        <div className="text-end">
          {isContactSales ? (
            <div className="text-xl font-bold text-stone-900 dark:text-stone-100">
              {t('billing.custom')}
            </div>
          ) : (
            <div className="text-3xl font-bold text-stone-900 dark:text-stone-100">
              {currentPlan?.currency === 'EUR' ? '€' : '$'}
              {displayPrice}
              <span className="text-base font-normal text-stone-500">/{t('billing.month')}</span>
            </div>
          )}
          {subscriptionStatus && (
            <Button
              type="default"
              icon={<ExportOutlined />}
              onClick={onManageSubscription}
              loading={isLoading}
              className="mt-3"
            >
              {t('billing.manageSubscription')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Usage statistics card
 */
function UsageCard({
  ownedShopsCount,
  maxShops,
  totalStorageUsedMb,
  storageLimitMb,
  t,
}: {
  ownedShopsCount: number;
  maxShops: number | null;
  totalStorageUsedMb: number;
  storageLimitMb: number | null;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const formatStorage = (mb: number): string => {
    if (mb >= 1000) {
      return `${(mb / 1000).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  const usageItems = [
    {
      key: 'shops',
      label: t('billing.usage.shops'),
      icon: <ShopOutlined className="text-amber-500" />,
      used: ownedShopsCount,
      limit: maxShops,
      format: (n: number) => n.toString(),
    },
    {
      key: 'storage',
      label: t('billing.usage.storage'),
      icon: <CloudOutlined className="text-blue-500" />,
      used: totalStorageUsedMb,
      limit: storageLimitMb,
      format: formatStorage,
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
        {t('billing.usage.title')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {usageItems.map((item) => {
          const percentage = item.limit ? Math.round((item.used / item.limit) * 100) : 0;
          const isUnlimited = item.limit === null;

          return (
            <div key={item.key} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {isUnlimited ? (
                <div className="text-sm text-stone-500 dark:text-stone-400">
                  {item.format(item.used)} / {t('billing.usage.unlimited')}
                </div>
              ) : (
                <>
                  <Progress
                    percent={percentage}
                    showInfo={false}
                    strokeColor={percentage > 80 ? '#ef4444' : BRAND_COLORS.gold}
                    trailColor="#e7e5e4"
                    size="small"
                  />
                  <div className="text-sm text-stone-500 dark:text-stone-400">
                    {item.format(item.used)} / {item.format(item.limit!)}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/**
 * Plan feature item with checkmark
 */
function FeatureItem({ children }: { children: React.ReactNode }): React.JSX.Element {
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
 * Individual plan card
 */
function PlanCard({
  plan,
  isCurrent,
  onSelect,
  isLoading,
  t,
}: {
  plan: BillingPlan;
  isCurrent: boolean;
  onSelect: () => void;
  isLoading: boolean;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const isEnterprise = plan.isContactSales;
  const gradient = getPlanGradient(plan.name);

  // Business plan is "popular"
  const isPopular = plan.name.toLowerCase().includes('business');

  const getPlanIcon = (name: string): React.ReactNode => {
    const iconClass = 'text-2xl';
    const nameLower = name.toLowerCase();
    if (nameLower.includes('enterprise')) {
      return <CrownOutlined className={iconClass} />;
    }
    if (nameLower.includes('business')) {
      return <RocketOutlined className={iconClass} />;
    }
    return <StarOutlined className={iconClass} />;
  };

  // Build features list from plan limits
  const features: string[] = [];
  if (plan.maxShops === null) {
    features.push(t('billing.features.unlimitedShops'));
  } else {
    features.push(t('billing.features.shopsLimit', { count: plan.maxShops }));
  }
  if (plan.maxStaffPerShop === null) {
    features.push(t('billing.features.unlimitedStaff'));
  } else {
    features.push(t('billing.features.staffLimit', { count: plan.maxStaffPerShop }));
  }
  if (plan.aiCreditsMonthly === null) {
    features.push(t('billing.features.unlimitedAI'));
  } else if (plan.aiCreditsMonthly > 0) {
    features.push(
      t('billing.features.aiCredits', { count: plan.aiCreditsMonthly.toLocaleString() })
    );
  }
  if (plan.storageLimitMb === null) {
    features.push(t('billing.features.unlimitedStorage'));
  } else {
    const storageGb = (plan.storageLimitMb / 1000).toFixed(0);
    features.push(t('billing.features.storage', { gb: storageGb }));
  }

  // Add features from plan.features object
  if (plan.features.priority_support) {
    features.push(t('billing.features.prioritySupport'));
  }
  if (plan.features.dedicated_manager) {
    features.push(t('billing.features.dedicatedManager'));
  }
  if (plan.features.sla_guarantee) {
    features.push(t('billing.features.slaGuarantee'));
  }

  const currencySymbol = plan.currency === 'EUR' ? '€' : '$';

  return (
    <div
      className={cn(
        'relative h-full flex flex-col',
        'bg-white rounded-2xl overflow-hidden',
        'border border-stone-200',
        'shadow-sm hover:shadow-2xl',
        'transform hover:-translate-y-1',
        'transition-all duration-300 ease-out',
        isPopular && !isCurrent && 'ring-2 ring-[#C9A227] shadow-[#C9A227]/20',
        isCurrent && 'ring-2 ring-emerald-500'
      )}
    >
      {/* Popular Badge */}
      {isPopular && !isCurrent && (
        <div className="absolute -top-0 inset-x-0 flex justify-center z-10">
          <span
            className={cn(
              'px-4 py-1.5 text-xs font-bold uppercase tracking-wider',
              'bg-gradient-to-r from-[#C9A227] to-[#A68B1F]',
              'text-white rounded-b-lg shadow-lg'
            )}
          >
            {t('billing.popular')}
          </span>
        </div>
      )}

      {/* Current Badge */}
      {isCurrent && (
        <div className="absolute -top-0 inset-x-0 flex justify-center z-10">
          <span
            className={cn(
              'px-4 py-1.5 text-xs font-bold uppercase tracking-wider',
              'bg-emerald-500',
              'text-white rounded-b-lg shadow-lg'
            )}
          >
            {t('billing.currentPlan')}
          </span>
        </div>
      )}

      {/* Gradient Header */}
      <div
        className={cn(
          'relative bg-gradient-to-br p-6 text-white',
          gradient,
          (isPopular || isCurrent) && 'pt-10'
        )}
      >
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 end-0 w-32 h-32 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/2" />
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
            {getPlanIcon(plan.name)}
          </div>
          <h3 className="text-2xl font-bold">{plan.name}</h3>
        </div>
      </div>

      {/* Pricing */}
      <div className="p-6 border-b border-stone-100">
        {isEnterprise ? (
          <div>
            <span className="text-3xl font-bold text-stone-900">{t('billing.custom')}</span>
            <p className="text-sm text-stone-500 mt-1">{t('billing.contactSales')}</p>
          </div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-stone-900">
              {currencySymbol}
              {plan.price}
            </span>
            <span className="text-stone-500 text-lg">/{t('billing.month')}</span>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="flex-1 p-6">
        <h4 className="font-semibold text-stone-900 mb-4 text-sm uppercase tracking-wider">
          {t('billing.includes')}
        </h4>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <FeatureItem key={index}>{feature}</FeatureItem>
          ))}
        </ul>
      </div>

      {/* CTA Button */}
      <div className="p-6 pt-0">
        <Button
          type={isPopular && !isCurrent ? 'primary' : 'default'}
          size="large"
          block
          onClick={onSelect}
          loading={isLoading}
          disabled={isCurrent}
          className={cn(
            'h-12 text-base font-semibold rounded-xl',
            'transition-all duration-200',
            isPopular && !isCurrent
              ? 'bg-gradient-to-r from-[#C9A227] to-[#A68B1F] border-none hover:from-[#A68B1F] hover:to-[#8B7419] shadow-lg shadow-[#C9A227]/30'
              : 'hover:border-stone-400 hover:text-stone-900',
            isCurrent && 'bg-stone-100 text-stone-500 cursor-not-allowed'
          )}
        >
          {isCurrent
            ? t('billing.currentPlan')
            : isEnterprise
              ? t('billing.contactSalesBtn')
              : t('billing.upgrade')}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BillingSettingsPage(): React.JSX.Element {
  const t = useTranslations('userSettings');
  const searchParams = useSearchParams();
  const { isLoading: userLoading } = useUser();
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);

  // Fetch billing data
  const { data: plans, isLoading: plansLoading } = useAvailablePlans({
    getAvailablePlansAction,
  });

  const { data: subscriptionLimits, isLoading: limitsLoading } = useUserSubscriptionLimits({
    getUserSubscriptionLimitsAction,
  });

  // Mutations for Stripe actions
  const { mutate: createCheckout, isPending: isCheckoutPending } = useCreateCheckoutSession({
    createCheckoutSessionAction,
  });

  const { mutate: openPortal, isPending: isPortalPending } = useCreatePortalSession({
    createPortalSessionAction,
  });

  // Handle checkout success/cancel from URL params
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      message.success(t('billing.checkoutSuccess'));
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (canceled === 'true') {
      message.info(t('billing.checkoutCanceled'));
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, t]);

  // Loading state
  const isLoading = userLoading || plansLoading || limitsLoading;

  if (isLoading) {
    return <BillingSkeleton />;
  }

  // Find current plan from plans list
  const currentPlan = plans?.find((p) => p.id === subscriptionLimits?.planId) || null;

  const handleManageSubscription = () => {
    message.info(t('billing.openingPortal'));
    openPortal(undefined, {
      onError: (error) => {
        message.error(error.message || t('billing.portalError'));
      },
    });
  };

  const handleSelectPlan = (plan: BillingPlan) => {
    if (plan.isContactSales) {
      window.location.href = 'mailto:sales@aymur.com?subject=Enterprise Plan Inquiry';
      return;
    }

    if (!plan.stripePriceId) {
      message.error(t('billing.noPriceId'));
      return;
    }

    setUpgradingPlanId(plan.id);
    message.info(t('billing.redirectingToCheckout'));

    createCheckout(
      { priceId: plan.stripePriceId },
      {
        onError: (error) => {
          message.error(error.message || t('billing.checkoutError'));
          setUpgradingPlanId(null);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1">
          {t('billing.title')}
        </h1>
        <p className="text-stone-600 dark:text-stone-400">{t('billing.subtitle')}</p>
      </div>

      {/* Current Plan */}
      <CurrentPlanCard
        planName={subscriptionLimits?.planName ?? null}
        subscriptionStatus={subscriptionLimits?.subscriptionStatus ?? null}
        isContactSales={subscriptionLimits?.isContactSales ?? false}
        currentPlan={currentPlan}
        onManageSubscription={handleManageSubscription}
        isLoading={isPortalPending}
        t={t}
      />

      {/* Usage Statistics */}
      {subscriptionLimits && (
        <UsageCard
          ownedShopsCount={subscriptionLimits.ownedShopsCount}
          maxShops={subscriptionLimits.maxShops}
          totalStorageUsedMb={subscriptionLimits.totalStorageUsedMb}
          storageLimitMb={subscriptionLimits.storageLimitMb}
          t={t}
        />
      )}

      {/* Available Plans */}
      <div>
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
          {t('billing.availablePlans')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans?.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === subscriptionLimits?.planId}
              onSelect={() => handleSelectPlan(plan)}
              isLoading={(isCheckoutPending && upgradingPlanId === plan.id) || false}
              t={t}
            />
          ))}
        </div>
      </div>

      {/* Guarantee */}
      <Card className="p-6 bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-center gap-3 text-stone-600 dark:text-stone-400">
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
          <span className="text-sm sm:text-base">{t('billing.guarantee')}</span>
        </div>
      </Card>
    </div>
  );
}
