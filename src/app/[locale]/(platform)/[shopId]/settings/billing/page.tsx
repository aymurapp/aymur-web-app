'use client';

/**
 * Billing Settings Page
 *
 * Allows users to view and manage their subscription:
 * - Current plan status and details
 * - Plan limits and usage
 * - Available plans for upgrade
 * - Access to Stripe Customer Portal
 *
 * Features:
 * - Real-time subscription data via useSubscriptionPlan hook
 * - Usage progress bars for limits
 * - Stripe Checkout flow for upgrades
 * - Customer Portal for subscription management
 * - RTL support using CSS logical properties
 *
 * @module app/(platform)/[locale]/[shopId]/settings/billing/page
 */

import React, { useEffect, useState, useCallback } from 'react';

import {
  CrownOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CreditCardOutlined,
  ShopOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  CloudOutlined,
  RightOutlined,
  LeftOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { Card, Progress, Badge, Typography, Skeleton, message, Alert, Space, Divider } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  createCheckoutSessionAction,
  createPortalSessionAction,
  getAvailablePlansAction,
  getSubscriptionUsageAction,
} from '@/lib/actions/billing';
import { useSubscriptionPlan } from '@/lib/hooks/data/useSubscription';
import { useShop } from '@/lib/hooks/shop';
import { isRtlLocale, type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';

const { Text, Title, Paragraph } = Typography;

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

interface UsageData {
  shopsUsed: number;
  shopsLimit: number | null;
  staffUsed: number;
  staffLimit: number | null;
  aiCreditsUsed: number;
  aiCreditsLimit: number | null;
  storageUsedMb: number;
  storageLimitMb: number | null;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Status badge component for subscription status
 */
function StatusBadge({ status }: { status: string }): JSX.Element {
  const t = useTranslations('billing');

  const defaultConfig = { color: 'success' as const, icon: <CheckCircleOutlined /> };

  const statusConfig: Record<
    string,
    { color: 'success' | 'warning' | 'error'; icon: JSX.Element }
  > = {
    active: { color: 'success', icon: <CheckCircleOutlined /> },
    past_due: { color: 'warning', icon: <ExclamationCircleOutlined /> },
    canceled: { color: 'error', icon: <ClockCircleOutlined /> },
    paused: { color: 'warning', icon: <ClockCircleOutlined /> },
  };

  const config = statusConfig[status] ?? defaultConfig;
  const badgeStatus =
    config.color === 'success' ? 'success' : config.color === 'error' ? 'error' : 'warning';

  return (
    <Badge
      status={badgeStatus}
      text={
        <span className="flex items-center gap-1">
          {config.icon}
          <span>{t(`status.${status}`)}</span>
        </span>
      }
    />
  );
}

/**
 * Usage progress bar with label
 */
function UsageProgress({
  label,
  icon,
  used,
  limit,
  unit,
}: {
  label: string;
  icon: JSX.Element;
  used: number;
  limit: number | null;
  unit?: string;
}): JSX.Element {
  const t = useTranslations('billing');

  const isUnlimited = limit === null;
  const percent = isUnlimited ? 0 : Math.min(Math.round((used / limit) * 100), 100);
  const isWarning = !isUnlimited && percent >= 80;
  const isDanger = !isUnlimited && percent >= 95;

  const strokeColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-500">{icon}</span>
          <Text strong>{label}</Text>
        </div>
        <Text type="secondary">
          {used.toLocaleString()}
          {unit ? ` ${unit}` : ''} /{' '}
          {isUnlimited ? t('unlimited') : `${limit?.toLocaleString()}${unit ? ` ${unit}` : ''}`}
        </Text>
      </div>
      <Progress
        percent={isUnlimited ? 100 : percent}
        strokeColor={isUnlimited ? '#d4d4d4' : strokeColor}
        showInfo={false}
        size="small"
      />
    </div>
  );
}

/**
 * Plan card component for displaying available plans
 */
function PlanCard({
  plan,
  isCurrentPlan,
  onUpgrade,
  loading,
  currentPlanTier,
}: {
  plan: PlanData;
  isCurrentPlan: boolean;
  onUpgrade: (priceId: string) => void;
  loading: boolean;
  currentPlanTier: string;
}): JSX.Element {
  const t = useTranslations('billing');
  const locale = useLocale() as Locale;
  const isRtl = isRtlLocale(locale);

  const ArrowIcon = isRtl ? LeftOutlined : RightOutlined;

  // Determine if this plan is an upgrade from current
  const planTierOrder = ['free', 'pro', 'business', 'enterprise'];
  const currentTierIndex = planTierOrder.indexOf(currentPlanTier);
  const planTierIndex = planTierOrder.indexOf(plan.name.toLowerCase());
  const isUpgrade = planTierIndex > currentTierIndex;
  const isDowngrade = planTierIndex < currentTierIndex;

  const formatPrice = (price: number | null, currency: string, interval: string | null) => {
    if (price === null) {
      return t('contactSales');
    }
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price);
    return interval ? `${formatted}/${t(`interval.${interval}`)}` : formatted;
  };

  return (
    <Card
      className={cn(
        'relative transition-all duration-200',
        isCurrentPlan && 'border-2 border-amber-400 shadow-amber-100 shadow-md',
        !isCurrentPlan && 'hover:border-amber-300 hover:shadow-md'
      )}
    >
      {/* Current plan badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 start-4">
          <Badge
            count={t('currentPlan')}
            style={{ backgroundColor: '#f59e0b' }}
            className="!px-2"
          />
        </div>
      )}

      <div className="space-y-4">
        {/* Plan name and icon */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
            <CrownOutlined className="text-xl text-amber-600" />
          </div>
          <div>
            <Title level={4} className="!mb-0">
              {plan.name}
            </Title>
          </div>
        </div>

        {/* Price */}
        <div className="py-2">
          <Text className="text-2xl font-bold text-stone-900">
            {formatPrice(plan.price, plan.currency, plan.interval)}
          </Text>
        </div>

        {/* Features list */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShopOutlined className="text-stone-400" />
            <Text>
              {plan.maxShops === null ? t('unlimited') : plan.maxShops} {t('shops')}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <TeamOutlined className="text-stone-400" />
            <Text>
              {plan.maxStaffPerShop === null ? t('unlimited') : plan.maxStaffPerShop}{' '}
              {t('staffPerShop')}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <ThunderboltOutlined className="text-stone-400" />
            <Text>
              {plan.aiCreditsMonthly === null
                ? t('unlimited')
                : plan.aiCreditsMonthly.toLocaleString()}{' '}
              {t('aiCredits')}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <CloudOutlined className="text-stone-400" />
            <Text>
              {plan.storageLimitMb === null ? t('unlimited') : `${plan.storageLimitMb} MB`}{' '}
              {t('storage')}
            </Text>
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2">
          {isCurrentPlan ? (
            <Button block disabled className="border-amber-400 text-amber-600">
              <CheckCircleOutlined className="me-1" />
              {t('currentPlan')}
            </Button>
          ) : plan.isContactSales ? (
            <Button block type="default" icon={<MailOutlined />} href="mailto:sales@aymur.com">
              {t('contactSales')}
            </Button>
          ) : isDowngrade ? (
            <Button block type="default" disabled>
              {t('downgrade')}
            </Button>
          ) : (
            <Button
              block
              type="primary"
              onClick={() => plan.stripePriceId && onUpgrade(plan.stripePriceId)}
              loading={loading}
              disabled={!plan.stripePriceId}
            >
              {isUpgrade ? t('upgrade') : t('subscribe')}
              <ArrowIcon className="ms-1" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Billing Settings Page
 *
 * Displays current subscription status, usage, and available plans.
 */
export default function BillingSettingsPage(): React.JSX.Element {
  const t = useTranslations('billing');
  const locale = useLocale() as Locale;

  const { shopId } = useShop();
  const { subscription, isLoading: subscriptionLoading, refetch } = useSubscriptionPlan();

  // Local state
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Check for success/cancel query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      message.success(t('checkoutSuccess'));
      refetch();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      message.info(t('checkoutCanceled'));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [t, refetch]);

  // Load available plans
  useEffect(() => {
    const loadPlans = async () => {
      setPlansLoading(true);
      try {
        const result = await getAvailablePlansAction();
        if (result.success && result.data) {
          setPlans(result.data);
        } else if (!result.success) {
          message.error(result.error || t('errorLoadingPlans'));
        }
      } catch (_error) {
        message.error(t('errorLoadingPlans'));
      } finally {
        setPlansLoading(false);
      }
    };

    loadPlans();
  }, [t]);

  // Load usage data
  useEffect(() => {
    const loadUsage = async () => {
      if (!shopId) {
        return;
      }

      setUsageLoading(true);
      try {
        const result = await getSubscriptionUsageAction(shopId);
        if (result.success && result.data) {
          setUsage(result.data);
        }
      } catch (_error) {
        // Usage is non-critical, just log
        console.error('Failed to load usage data');
      } finally {
        setUsageLoading(false);
      }
    };

    loadUsage();
  }, [shopId]);

  // Handle upgrade click
  const handleUpgrade = useCallback(
    async (priceId: string) => {
      setCheckoutLoading(true);
      try {
        const result = await createCheckoutSessionAction(priceId);
        if (result.success && result.data?.url) {
          window.location.href = result.data.url;
        } else if (!result.success) {
          message.error(result.error || t('errorCreatingCheckout'));
        }
      } catch (_error) {
        message.error(t('errorCreatingCheckout'));
      } finally {
        setCheckoutLoading(false);
      }
    },
    [t]
  );

  // Handle manage subscription click
  const handleManageSubscription = useCallback(async () => {
    setPortalLoading(true);
    try {
      const result = await createPortalSessionAction();
      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
      } else if (!result.success) {
        message.error(result.error || t('errorCreatingPortal'));
      }
    } catch (_error) {
      message.error(t('errorCreatingPortal'));
    } finally {
      setPortalLoading(false);
    }
  }, [t]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  // Loading state
  if (subscriptionLoading) {
    return (
      <div className="billing-settings-page">
        <PageHeader title={t('title')} subtitle={t('subtitle')} showBack />
        <div className="space-y-6">
          <Card>
            <Skeleton active paragraph={{ rows: 4 }} />
          </Card>
          <Card>
            <Skeleton active paragraph={{ rows: 3 }} />
          </Card>
        </div>
      </div>
    );
  }

  // Determine current plan tier
  const currentPlanTier = subscription?.plan.tier || 'free';
  const isEnterprise = currentPlanTier === 'enterprise';

  return (
    <div className="billing-settings-page">
      <PageHeader title={t('title')} subtitle={t('subtitle')} showBack />

      <div className="space-y-6">
        {/* Past due warning */}
        {subscription?.status === 'past_due' && (
          <Alert
            message={t('pastDueTitle')}
            description={t('pastDueDescription')}
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
            action={
              <Button type="primary" onClick={handleManageSubscription} loading={portalLoading}>
                {t('updatePayment')}
              </Button>
            }
          />
        )}

        {/* Section 1: Current Plan */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <CrownOutlined className="text-amber-500" />
              <span>{t('currentPlanSection')}</span>
            </div>
          }
        >
          {subscription ? (
            <div className="space-y-6">
              {/* Plan info row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Title level={3} className="!mb-0">
                      {subscription.plan.name}
                    </Title>
                    <StatusBadge status={subscription.status} />
                  </div>
                  <Text type="secondary">{t('planDescription')}</Text>
                </div>
                <Button
                  type="default"
                  icon={<CreditCardOutlined />}
                  onClick={handleManageSubscription}
                  loading={portalLoading}
                >
                  {t('manageSubscription')}
                </Button>
              </div>

              <Divider className="!my-4" />

              {/* Billing details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Next billing date */}
                <div className="space-y-1">
                  <Text type="secondary">{t('nextBillingDate')}</Text>
                  <div className="flex items-center gap-2">
                    <ClockCircleOutlined className="text-amber-500" />
                    <Text strong>
                      {subscription.cancelAtPeriodEnd
                        ? t('cancelsOn', { date: formatDate(subscription.currentPeriodEnd) })
                        : formatDate(subscription.currentPeriodEnd)}
                    </Text>
                  </div>
                </div>

                {/* Billing cycle */}
                <div className="space-y-1">
                  <Text type="secondary">{t('billingCycle')}</Text>
                  <Text strong>{t('monthly')}</Text>
                </div>

                {/* Plan tier */}
                <div className="space-y-1">
                  <Text type="secondary">{t('planTier')}</Text>
                  <Text strong className="capitalize">
                    {subscription.plan.tier}
                  </Text>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CrownOutlined className="text-4xl text-stone-300 mb-4" />
              <Paragraph type="secondary">{t('noSubscription')}</Paragraph>
              <Text type="secondary">{t('selectPlanBelow')}</Text>
            </div>
          )}
        </Card>

        {/* Section 2: Plan Limits & Usage */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <ThunderboltOutlined className="text-amber-500" />
              <span>{t('usageSection')}</span>
            </div>
          }
        >
          {usageLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : usage ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UsageProgress
                label={t('shopsUsage')}
                icon={<ShopOutlined />}
                used={usage.shopsUsed}
                limit={usage.shopsLimit}
              />
              <UsageProgress
                label={t('staffUsage')}
                icon={<TeamOutlined />}
                used={usage.staffUsed}
                limit={usage.staffLimit}
              />
              <UsageProgress
                label={t('aiCreditsUsage')}
                icon={<ThunderboltOutlined />}
                used={usage.aiCreditsUsed}
                limit={usage.aiCreditsLimit}
              />
              <UsageProgress
                label={t('storageUsage')}
                icon={<CloudOutlined />}
                used={usage.storageUsedMb}
                limit={usage.storageLimitMb}
                unit="MB"
              />
            </div>
          ) : (
            <div className="text-center py-4">
              <Text type="secondary">{t('usageNotAvailable')}</Text>
            </div>
          )}
        </Card>

        {/* Section 3: Available Plans */}
        {!isEnterprise && (
          <Card
            title={
              <div className="flex items-center gap-2">
                <CreditCardOutlined className="text-amber-500" />
                <span>{t('availablePlansSection')}</span>
              </div>
            }
          >
            {plansLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <Skeleton active paragraph={{ rows: 6 }} />
                  </Card>
                ))}
              </div>
            ) : plans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isCurrentPlan={subscription?.plan.id === plan.id}
                    onUpgrade={handleUpgrade}
                    loading={checkoutLoading}
                    currentPlanTier={currentPlanTier}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCardOutlined className="text-4xl text-stone-300 mb-4" />
                <Paragraph type="secondary">{t('noPlansAvailable')}</Paragraph>
              </div>
            )}
          </Card>
        )}

        {/* Enterprise message */}
        {isEnterprise && (
          <Card className="border-amber-200 bg-amber-50">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                <CrownOutlined className="text-2xl text-amber-600" />
              </div>
              <div className="flex-1">
                <Title level={4} className="!mb-1">
                  {t('enterpriseTitle')}
                </Title>
                <Paragraph type="secondary" className="!mb-3">
                  {t('enterpriseDescription')}
                </Paragraph>
                <Space>
                  <Button type="primary" icon={<MailOutlined />} href="mailto:sales@aymur.com">
                    {t('contactSales')}
                  </Button>
                  <Button type="default" onClick={handleManageSubscription} loading={portalLoading}>
                    {t('manageSubscription')}
                  </Button>
                </Space>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
