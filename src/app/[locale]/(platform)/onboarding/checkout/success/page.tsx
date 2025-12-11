'use client';

/**
 * Checkout Success Page
 *
 * Displays a success message after successful subscription checkout.
 * Part of the onboarding flow - guides users to create their first shop.
 *
 * Features:
 * - Success animation with gold-branded checkmark
 * - Subscription features preview
 * - CTA to create first shop
 * - Professional, celebratory aesthetics
 * - Updates onboarding step to 'setup' on mount
 *
 * @module app/(platform)/[locale]/onboarding/checkout/success
 */

import React, { useEffect } from 'react';

import {
  CheckCircleFilled,
  ArrowRightOutlined,
  ShopOutlined,
  TeamOutlined,
  BarChartOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { Result, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { updateOnboardingStep } from '@/lib/actions/onboarding';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

const { Text, Title } = Typography;

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
};

/**
 * Features unlocked with subscription
 */
const UNLOCKED_FEATURES = [
  { key: 'shops', icon: ShopOutlined },
  { key: 'team', icon: TeamOutlined },
  { key: 'analytics', icon: BarChartOutlined },
  { key: 'security', icon: SafetyOutlined },
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Custom success icon with gold branding
 */
function SuccessIcon(): JSX.Element {
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Outer glow ring */}
      <div
        className="absolute w-36 h-36 rounded-full opacity-20 animate-pulse"
        style={{ backgroundColor: BRAND_COLORS.goldLight }}
      />

      {/* Inner ring */}
      <div
        className="absolute w-28 h-28 rounded-full opacity-30"
        style={{ backgroundColor: BRAND_COLORS.goldLight }}
      />

      {/* Main circle with checkmark */}
      <div
        className={cn(
          'relative w-24 h-24 rounded-full',
          'flex items-center justify-center',
          'shadow-lg'
        )}
        style={{
          backgroundColor: BRAND_COLORS.gold,
          boxShadow: `0 8px 32px ${BRAND_COLORS.gold}40`,
        }}
      >
        <CheckCircleFilled
          className="text-5xl text-white"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
        />
      </div>
    </div>
  );
}

/**
 * Feature card showing what the user unlocked
 */
function FeaturesList({ t }: { t: ReturnType<typeof useTranslations> }): JSX.Element {
  return (
    <Card className="bg-stone-50 border-stone-200 max-w-lg mx-auto">
      <div className="text-center mb-4">
        <Text type="secondary" className="text-sm uppercase tracking-wide">
          {t('checkout.success.featuresUnlocked')}
        </Text>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {UNLOCKED_FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.key}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg',
                'bg-white border border-stone-200',
                'transition-all duration-200 hover:border-amber-300'
              )}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${BRAND_COLORS.gold}15` }}
              >
                <Icon className="text-lg" style={{ color: BRAND_COLORS.gold }} />
              </div>
              <Text className="text-sm font-medium text-stone-700">
                {t(`checkout.success.features.${feature.key}`)}
              </Text>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Checkout Success Page
 *
 * Shown after successful Stripe checkout completion.
 * Guides users to create their first shop.
 */
export default function CheckoutSuccessPage(): JSX.Element {
  const t = useTranslations('onboarding');

  // Update onboarding step to 'setup' when user reaches this page
  useEffect(() => {
    const updateStep = async () => {
      try {
        await updateOnboardingStep('setup');
      } catch (error) {
        console.error('[CheckoutSuccessPage] Failed to update onboarding step:', error);
      }
    };
    updateStep();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-2xl">
        {/* Success Result */}
        <Result
          icon={<SuccessIcon />}
          title={
            <Title level={2} className="!mb-2 !mt-4 text-stone-900">
              {t('checkout.success.title')}
            </Title>
          }
          subTitle={
            <div className="space-y-2">
              <Text className="text-lg text-stone-600 block">{t('checkout.success.subtitle')}</Text>
              <Text type="secondary" className="block">
                {t('checkout.success.description')}
              </Text>
            </div>
          }
          className="!pb-0"
        />

        {/* Features Preview */}
        <div className="mt-8 mb-10">
          <FeaturesList t={t} />
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Link href="/onboarding/setup">
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              className="!h-14 !px-10 !text-base !font-semibold"
              style={{
                backgroundColor: BRAND_COLORS.gold,
                borderColor: BRAND_COLORS.gold,
              }}
            >
              {t('checkout.success.cta')}
            </Button>
          </Link>

          <Text type="secondary" className="block mt-4 text-sm">
            {t('checkout.success.ctaHint')}
          </Text>
        </div>
      </div>
    </div>
  );
}
