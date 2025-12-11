'use client';

/**
 * Checkout Canceled Page
 *
 * Displays a reassuring message when the user cancels the checkout process.
 * Provides options to return to plans or contact support.
 *
 * Features:
 * - Gentle, non-alarming design (info status, not error)
 * - Reassurance that nothing was charged
 * - Clear path back to plans
 * - Sales/support contact option
 *
 * @module app/(platform)/[locale]/onboarding/checkout/canceled
 */

import React from 'react';

import { ArrowLeftOutlined, InfoCircleOutlined, CustomerServiceOutlined } from '@ant-design/icons';
import { Result, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

const { Text, Title, Paragraph } = Typography;

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
  stone: '#1C1917',
  stoneMuted: '#57534E',
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Custom info icon - gentle and non-alarming
 */
function InfoIcon(): JSX.Element {
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Outer ring */}
      <div className="absolute w-32 h-32 rounded-full bg-blue-50 opacity-50" />

      {/* Inner ring */}
      <div className="absolute w-24 h-24 rounded-full bg-blue-100" />

      {/* Main circle with icon */}
      <div
        className={cn(
          'relative w-20 h-20 rounded-full bg-blue-500',
          'flex items-center justify-center',
          'shadow-lg shadow-blue-200'
        )}
      >
        <InfoCircleOutlined
          className="text-4xl text-white"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
        />
      </div>
    </div>
  );
}

/**
 * Help section with support contact
 */
function HelpSection({ t }: { t: ReturnType<typeof useTranslations> }): JSX.Element {
  return (
    <div
      className={cn(
        'mt-8 p-6 rounded-xl',
        'bg-stone-50 border border-stone-200',
        'text-center max-w-md mx-auto'
      )}
    >
      <div
        className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
        style={{ backgroundColor: `${BRAND_COLORS.gold}15` }}
      >
        <CustomerServiceOutlined className="text-xl" style={{ color: BRAND_COLORS.gold }} />
      </div>

      <Text strong className="text-stone-800 block mb-2">
        {t('checkout.canceled.helpTitle')}
      </Text>

      <Paragraph type="secondary" className="!mb-3 text-sm">
        {t('checkout.canceled.helpDescription')}
      </Paragraph>

      <a
        href="mailto:sales@aymur.com"
        className="text-sm font-medium hover:underline"
        style={{ color: BRAND_COLORS.gold }}
      >
        {t('checkout.canceled.help')}
      </a>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Checkout Canceled Page
 *
 * Shown when user cancels the Stripe checkout flow.
 * Uses a gentle, non-alarming design to encourage them to return.
 */
export default function CheckoutCanceledPage(): JSX.Element {
  const t = useTranslations('onboarding');

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-xl">
        {/* Info Result - gentle, not alarming */}
        <Result
          icon={<InfoIcon />}
          title={
            <Title level={2} className="!mb-2 !mt-4 text-stone-900">
              {t('checkout.canceled.title')}
            </Title>
          }
          subTitle={
            <div className="space-y-3">
              <Text className="text-lg text-stone-600 block">
                {t('checkout.canceled.subtitle')}
              </Text>
              <div
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full',
                  'bg-green-50 border border-green-200'
                )}
              >
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <Text className="text-green-700 text-sm font-medium">
                  {t('checkout.canceled.noCharge')}
                </Text>
              </div>
              <Text type="secondary" className="block mt-2">
                {t('checkout.canceled.description')}
              </Text>
            </div>
          }
          className="!pb-0"
        />

        {/* CTA Buttons */}
        <div className="mt-8 text-center space-y-4">
          <Link href="/onboarding/plans">
            <Button
              type="primary"
              size="large"
              icon={<ArrowLeftOutlined />}
              className="!h-12 !px-8 !text-base !font-medium"
              style={{
                backgroundColor: BRAND_COLORS.gold,
                borderColor: BRAND_COLORS.gold,
              }}
            >
              {t('checkout.canceled.cta')}
            </Button>
          </Link>
        </div>

        {/* Help Section */}
        <HelpSection t={t} />
      </div>
    </div>
  );
}
