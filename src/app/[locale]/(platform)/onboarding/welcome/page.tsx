'use client';

/**
 * Onboarding Welcome Page
 *
 * Enterprise-grade welcome page for the AYMUR jewelry platform onboarding flow.
 * Introduces users to the platform's key features and guides them to select a plan.
 *
 * Features:
 * - Professional, luxurious design with gold accents
 * - Feature highlights grid showcasing platform capabilities
 * - Responsive layout with RTL support
 * - Accessible navigation to the plans page
 *
 * @module app/(platform)/[locale]/onboarding/welcome
 */

import React from 'react';

import {
  AppstoreOutlined,
  ArrowRightOutlined,
  LineChartOutlined,
  RobotOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Link } from '@/lib/i18n/navigation';
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

/**
 * Feature configuration with icons and translation keys
 */
const FEATURES = [
  {
    key: 'inventory',
    icon: AppstoreOutlined,
    gradient: 'from-amber-500/20 to-amber-600/10',
  },
  {
    key: 'sales',
    icon: ShoppingCartOutlined,
    gradient: 'from-emerald-500/20 to-emerald-600/10',
  },
  {
    key: 'analytics',
    icon: LineChartOutlined,
    gradient: 'from-blue-500/20 to-blue-600/10',
  },
  {
    key: 'ai',
    icon: RobotOutlined,
    gradient: 'from-purple-500/20 to-purple-600/10',
  },
] as const;

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Hero section with welcoming message and brand identity
 */
function HeroSection({
  t,
}: {
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'relative overflow-hidden',
        'bg-gradient-to-b from-stone-900 via-stone-900 to-stone-800',
        'py-16 sm:py-20 lg:py-24'
      )}
      aria-labelledby="welcome-title"
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

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Welcome badge */}
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-stone-800/80 border border-stone-700">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: BRAND_COLORS.gold }}
          />
          <span className="text-sm font-medium text-stone-300">{t('welcome.subtitle')}</span>
        </div>

        {/* Main title */}
        <h1
          id="welcome-title"
          className={cn(
            'text-3xl sm:text-4xl lg:text-5xl font-bold',
            'text-white mb-6',
            'tracking-tight leading-tight'
          )}
        >
          {t('welcome.title')}
        </h1>

        {/* Description */}
        <p
          className={cn(
            'text-lg sm:text-xl text-stone-400',
            'max-w-2xl mx-auto',
            'leading-relaxed'
          )}
        >
          {t('welcome.description')}
        </p>

        {/* Gold accent line */}
        <div
          className="mt-10 mx-auto w-24 h-1 rounded-full"
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
 * Individual feature card component
 */
function FeatureCard({
  featureKey,
  Icon,
  gradient,
  t,
}: {
  featureKey: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  gradient: string;
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden',
        'border-stone-200 hover:border-amber-300',
        'transition-all duration-300 ease-out',
        'hover:shadow-lg hover:shadow-amber-500/10',
        'hover:-translate-y-1'
      )}
      bodyStyle={{ padding: 0 }}
    >
      {/* Gradient background */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100',
          'transition-opacity duration-300',
          'bg-gradient-to-br',
          gradient
        )}
        aria-hidden="true"
      />

      {/* Card content */}
      <div className="relative p-6 sm:p-8">
        {/* Icon container */}
        <div
          className={cn(
            'inline-flex items-center justify-center',
            'w-14 h-14 rounded-xl mb-5',
            'bg-stone-100 group-hover:bg-white',
            'transition-colors duration-300'
          )}
        >
          <Icon
            className="text-2xl transition-colors duration-300"
            style={{ color: BRAND_COLORS.gold }}
          />
        </div>

        {/* Feature title */}
        <h3
          className={cn('text-lg font-semibold text-stone-900 mb-2', 'group-hover:text-stone-800')}
        >
          {t(`welcome.features.${featureKey}` as Parameters<typeof t>[0])}
        </h3>

        {/* Feature description */}
        <p className="text-stone-600 text-sm leading-relaxed">
          {t(`welcome.features.${featureKey}Desc` as Parameters<typeof t>[0])}
        </p>
      </div>
    </Card>
  );
}

/**
 * Features grid section
 */
function FeaturesSection({
  t,
}: {
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <section className="py-16 sm:py-20 bg-stone-50" aria-label="Platform features">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Features grid - 2x2 on desktop, 1 column on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
          {FEATURES.map((feature) => (
            <FeatureCard
              key={feature.key}
              featureKey={feature.key}
              Icon={feature.icon}
              gradient={feature.gradient}
              t={t}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Call to action section with primary button
 */
function CTASection({
  t,
}: {
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <section className="py-16 sm:py-20 bg-white" aria-label="Get started">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* CTA Button */}
        <Link href="/onboarding/role" className="inline-block">
          <Button
            type="primary"
            size="large"
            className={cn(
              'h-14 px-10 text-base font-semibold',
              'border-none shadow-lg',
              'hover:shadow-xl hover:scale-[1.02]',
              'transition-all duration-200'
            )}
            style={{
              backgroundColor: BRAND_COLORS.gold,
            }}
            aria-label={t('welcome.cta')}
          >
            <span className="flex items-center gap-3">
              {t('welcome.cta')}
              <ArrowRightOutlined className="text-sm rtl:rotate-180" />
            </span>
          </Button>
        </Link>

        {/* Time estimate */}
        <p className="mt-6 text-sm text-stone-500">{t('welcome.timeEstimate')}</p>

        {/* Trust indicators */}
        <div
          className={cn(
            'mt-10 pt-10 border-t border-stone-200',
            'flex flex-wrap items-center justify-center gap-8'
          )}
        >
          <TrustIndicator value="256-bit" label="SSL Encryption" />
          <TrustIndicator value="99.9%" label="Uptime SLA" />
          <TrustIndicator value="24/7" label="Support" />
        </div>
      </div>
    </section>
  );
}

/**
 * Trust indicator badge component
 */
function TrustIndicator({ value, label }: { value: string; label: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-bold text-stone-800">{value}</span>
      <span className="text-xs text-stone-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

/**
 * Welcome Page Component
 *
 * The first step in the AYMUR onboarding flow. Welcomes new users and highlights
 * the platform's key features before guiding them to select a subscription plan.
 */
export default function WelcomePage(): React.JSX.Element {
  const t = useTranslations('onboarding');

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero section with welcome message */}
      <HeroSection t={t} />

      {/* Feature highlights grid */}
      <FeaturesSection t={t} />

      {/* Call to action */}
      <CTASection t={t} />
    </div>
  );
}
