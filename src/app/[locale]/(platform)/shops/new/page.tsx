'use client';

/**
 * New Shop Page
 *
 * Page for creating a new shop using the ShopSetupWizard component.
 * Styled to match the onboarding flow with branded hero section.
 *
 * Features:
 * - Professional hero section with AYMUR branding
 * - Multi-step wizard for shop creation
 * - Subscription limit checking with styled warnings
 * - Consistent with onboarding UX/UI
 *
 * @module app/(platform)/[locale]/shops/new/page
 */

import React, { useEffect, useState } from 'react';

import { ArrowLeftOutlined, CrownOutlined, ShopOutlined, WarningOutlined } from '@ant-design/icons';
import { Alert } from 'antd';
import { useTranslations } from 'next-intl';

import { ShopSetupWizard } from '@/components/domain/settings/ShopSetupWizard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinnerSection } from '@/components/ui/LoadingSpinner';
import { canCreateShop, type SubscriptionLimits } from '@/lib/actions/shop';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Brand colors derived from AYMUR logo
 */
const BRAND_COLORS = {
  gold: '#C9A227',
  goldLight: '#E5C76B',
  goldDark: '#A68B1F',
} as const;

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Hero section with branded header - matches onboarding design
 */
function HeroSection({
  t,
  limits,
  showBackButton = true,
}: {
  t: ReturnType<typeof useTranslations<'shop'>>;
  limits?: SubscriptionLimits | null;
  showBackButton?: boolean;
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'relative overflow-hidden',
        'bg-gradient-to-b from-stone-900 via-stone-900 to-stone-800',
        'py-12 sm:py-16'
      )}
      aria-labelledby="new-shop-title"
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Radial gradient overlay */}
        <div
          className="absolute top-0 start-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-30"
          style={{
            background: `radial-gradient(ellipse at center, ${BRAND_COLORS.gold}15 0%, transparent 70%)`,
          }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(${BRAND_COLORS.gold}20 1px, transparent 1px),
                              linear-gradient(90deg, ${BRAND_COLORS.gold}20 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Back Button */}
      {showBackButton && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <Link
            href="/shops"
            className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition-colors group"
          >
            <ArrowLeftOutlined className="text-sm group-hover:-translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:translate-x-1" />
            <span className="text-sm font-medium">{t('backToShops')}</span>
          </Link>
        </div>
      )}

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Decorative icon circle */}
        <div className="mb-6 inline-flex">
          <div
            className={cn(
              'relative w-20 h-20 rounded-full',
              'flex items-center justify-center',
              'bg-gradient-to-br from-stone-800 to-stone-700',
              'border-2 shadow-xl'
            )}
            style={{ borderColor: BRAND_COLORS.gold }}
          >
            {/* Outer ring animation */}
            <div
              className="absolute inset-0 rounded-full animate-pulse opacity-30"
              style={{
                boxShadow: `0 0 0 8px ${BRAND_COLORS.gold}30, 0 0 0 16px ${BRAND_COLORS.gold}10`,
              }}
            />
            <ShopOutlined
              className="text-3xl"
              style={{ color: BRAND_COLORS.gold }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Main title */}
        <h1
          id="new-shop-title"
          className={cn(
            'text-2xl sm:text-3xl lg:text-4xl font-bold',
            'text-white mb-3',
            'tracking-tight leading-tight'
          )}
        >
          {t('createShop')}
        </h1>

        {/* Subtitle */}
        <p
          className={cn(
            'text-base sm:text-lg text-stone-400',
            'max-w-xl mx-auto',
            'leading-relaxed'
          )}
        >
          {t('newShopSubtitle')}
        </p>

        {/* Show remaining slots badge */}
        {limits && limits.maxAllowed > 1 && (
          <div className="mt-6 inline-flex">
            <span
              className={cn(
                'inline-flex items-center gap-2',
                'px-4 py-2 rounded-full',
                'bg-stone-800/80 border border-stone-700',
                'text-sm text-stone-300'
              )}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: BRAND_COLORS.gold }}
              />
              {t('limitReached.remainingSlots', {
                count: limits.maxAllowed - limits.currentUsage - 1,
              })}
            </span>
          </div>
        )}

        {/* Gold accent line */}
        <div
          className="mt-8 mx-auto w-24 h-1 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${BRAND_COLORS.gold}, transparent)`,
          }}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}

/**
 * Limit exceeded hero section with warning styling
 */
function LimitExceededHero({
  t,
}: {
  t: ReturnType<typeof useTranslations<'shop'>>;
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'relative overflow-hidden',
        'bg-gradient-to-b from-stone-900 via-stone-900 to-stone-800',
        'py-12 sm:py-16'
      )}
      aria-labelledby="limit-title"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-0 start-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-20"
          style={{
            background: `radial-gradient(ellipse at center, #f59e0b15 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Back Button */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <Link
          href="/shops"
          className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition-colors group"
        >
          <ArrowLeftOutlined className="text-sm group-hover:-translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:translate-x-1" />
          <span className="text-sm font-medium">{t('backToShops')}</span>
        </Link>
      </div>

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Warning icon */}
        <div className="mb-6 inline-flex">
          <div
            className={cn(
              'relative w-20 h-20 rounded-full',
              'flex items-center justify-center',
              'bg-gradient-to-br from-amber-900/50 to-amber-800/30',
              'border-2 border-amber-500/50 shadow-xl'
            )}
          >
            <WarningOutlined className="text-3xl text-amber-400" aria-hidden="true" />
          </div>
        </div>

        {/* Title */}
        <h1
          id="limit-title"
          className={cn(
            'text-2xl sm:text-3xl font-bold',
            'text-white mb-3',
            'tracking-tight leading-tight'
          )}
        >
          {t('limitReached.title')}
        </h1>

        {/* Gold accent line */}
        <div
          className="mt-6 mx-auto w-24 h-1 rounded-full bg-gradient-to-r from-transparent via-amber-500 to-transparent"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}

/**
 * Limit exceeded content section
 */
function LimitExceededContent({
  t,
  limits,
}: {
  t: ReturnType<typeof useTranslations<'shop'>>;
  limits: SubscriptionLimits;
}): React.JSX.Element {
  return (
    <section className="flex-1 py-10 sm:py-14 bg-stone-50">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        <Card
          className={cn('border-amber-200', 'shadow-lg shadow-amber-500/10', 'overflow-hidden')}
          bodyStyle={{ padding: 0 }}
        >
          {/* Card header */}
          <div className="px-6 py-5 bg-gradient-to-r from-amber-50 to-amber-100/50 border-b border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-200/50 flex items-center justify-center">
                <CrownOutlined className="text-lg text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-stone-900">{t('limitReached.title')}</h2>
                <p className="text-sm text-stone-600">
                  {limits.currentUsage} / {limits.maxAllowed} shops used
                </p>
              </div>
            </div>
          </div>

          {/* Card content */}
          <div className="px-6 py-6 space-y-4">
            <p className="text-stone-700">{limits.message}</p>

            <p className="text-sm text-stone-600">
              {t('limitReached.currentUsage', {
                current: limits.currentUsage,
                max: limits.maxAllowed,
              })}
            </p>

            <p className="text-sm text-stone-600">{t('limitReached.upgradeMessage')}</p>

            {/* Upgrade button */}
            <div className="pt-4">
              <Link href="/settings/billing" className="block">
                <Button
                  type="primary"
                  size="large"
                  className={cn(
                    'w-full h-12 text-base font-semibold',
                    'border-none shadow-md',
                    'hover:shadow-lg hover:scale-[1.01]',
                    'transition-all duration-200'
                  )}
                  style={{ backgroundColor: BRAND_COLORS.gold }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <CrownOutlined />
                    {t('upgradePlan')}
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

/**
 * Error content section
 */
function ErrorContent({
  t,
  tCommon,
  error,
}: {
  t: ReturnType<typeof useTranslations<'shop'>>;
  tCommon: ReturnType<typeof useTranslations<'common'>>;
  error: string;
}): React.JSX.Element {
  return (
    <section className="flex-1 py-10 sm:py-14 bg-stone-50">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        <Alert
          type="error"
          showIcon
          message={t('errorTitle')}
          description={error}
          action={
            <Link href="/shops">
              <Button type="primary">{tCommon('actions.back')}</Button>
            </Link>
          }
        />
      </div>
    </section>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

/**
 * New Shop Page Component
 */
export default function NewShopPage(): React.JSX.Element {
  const t = useTranslations('shop');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user can create a new shop
  useEffect(() => {
    async function checkLimits() {
      try {
        const result = await canCreateShop();

        if (result.success) {
          if (result.data) {
            setLimits(result.data);
          } else {
            setError('Failed to check subscription limits');
          }
        } else {
          setError(result.error);
        }
      } catch (err) {
        console.error('Error checking limits:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsChecking(false);
      }
    }

    checkLimits();
  }, []);

  /**
   * Handle cancel - navigate back to shops list
   */
  const handleCancel = () => {
    router.push('/shops');
  };

  // Loading state - use AYMUR branded spinner
  if (isChecking) {
    return <LoadingSpinnerSection className="min-h-screen" />;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <HeroSection t={t} limits={null} />
        <ErrorContent t={t} tCommon={tCommon} error={error} />
      </div>
    );
  }

  // Limit exceeded state
  if (limits && !limits.withinLimit) {
    return (
      <div className="min-h-screen flex flex-col">
        <LimitExceededHero t={t} />
        <LimitExceededContent t={t} limits={limits} />
      </div>
    );
  }

  // Main content - shop creation
  return (
    <div className="min-h-screen flex flex-col">
      {/* Branded Hero Section */}
      <HeroSection t={t} limits={limits} />

      {/* Shop Setup Wizard Section */}
      <section className="flex-1 py-8 sm:py-12 bg-stone-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <ShopSetupWizard onCancel={handleCancel} />
        </div>
      </section>
    </div>
  );
}
