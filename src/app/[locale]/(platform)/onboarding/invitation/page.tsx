'use client';

/**
 * Onboarding Invitation Information Page
 *
 * Informational page for users who selected "Join a Team" in the onboarding flow.
 * Explains the invitation process and provides a helpful, non-discouraging experience
 * for team members waiting to join an existing shop.
 *
 * Features:
 * - Clear explanation of the invitation process
 * - Professional, welcoming design with gold accents
 * - Step-by-step guide for joining a team
 * - Easy navigation back to role selection
 * - Responsive layout with RTL support
 *
 * @module app/(platform)/[locale]/onboarding/invitation
 */

import React from 'react';

import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  MailOutlined,
  UserAddOutlined,
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
 * Steps configuration with icons
 */
const INVITATION_STEPS = [
  {
    key: 'step1',
    icon: UserAddOutlined,
    number: 1,
  },
  {
    key: 'step2',
    icon: MailOutlined,
    number: 2,
  },
  {
    key: 'step3',
    icon: CheckCircleOutlined,
    number: 3,
  },
] as const;

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Hero section with icon and welcoming message
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
      aria-labelledby="invitation-title"
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
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <Link
          href="/onboarding/role"
          className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition-colors group"
        >
          <ArrowLeftOutlined className="text-sm group-hover:-translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:translate-x-1" />
          <span className="text-sm font-medium">Back</span>
        </Link>
      </div>

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Decorative icon circle */}
        <div className="mb-8 inline-flex">
          <div
            className={cn(
              'relative w-24 h-24 rounded-full',
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
            <InboxOutlined
              className="text-4xl"
              style={{ color: BRAND_COLORS.gold }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Main title */}
        <h1
          id="invitation-title"
          className={cn(
            'text-3xl sm:text-4xl lg:text-5xl font-bold',
            'text-white mb-4',
            'tracking-tight leading-tight'
          )}
        >
          {t('invitation.title')}
        </h1>

        {/* Subtitle */}
        <p
          className={cn('text-lg sm:text-xl font-medium mb-6')}
          style={{ color: BRAND_COLORS.goldLight }}
        >
          {t('invitation.subtitle')}
        </p>

        {/* Description */}
        <p
          className={cn(
            'text-base sm:text-lg text-stone-400',
            'max-w-2xl mx-auto',
            'leading-relaxed'
          )}
        >
          {t('invitation.description')}
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
 * Individual step item component
 */
function StepItem({
  stepKey,
  Icon,
  number,
  t,
}: {
  stepKey: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  number: number;
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-4">
      {/* Step number with icon */}
      <div className="flex-shrink-0">
        <div
          className={cn(
            'relative w-12 h-12 rounded-full',
            'flex items-center justify-center',
            'bg-gradient-to-br from-amber-50 to-amber-100',
            'border-2 border-amber-200',
            'shadow-sm'
          )}
        >
          {/* Number badge */}
          <span
            className={cn(
              'absolute -top-1 -end-1',
              'w-5 h-5 rounded-full',
              'flex items-center justify-center',
              'text-xs font-bold text-white',
              'shadow-sm'
            )}
            style={{ backgroundColor: BRAND_COLORS.gold }}
          >
            {number}
          </span>
          <Icon className="text-xl" style={{ color: BRAND_COLORS.goldDark }} aria-hidden="true" />
        </div>
      </div>

      {/* Step text */}
      <div className="flex-1 pt-2">
        <p className="text-stone-700 text-base leading-relaxed">
          {t(`invitation.steps.${stepKey}` as Parameters<typeof t>[0])}
        </p>
      </div>
    </div>
  );
}

/**
 * Steps section explaining the invitation process
 */
function StepsSection({
  t,
}: {
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <section className="py-12 sm:py-16 bg-stone-50" aria-labelledby="steps-title">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card
          className={cn(
            'border-stone-200',
            'shadow-sm hover:shadow-md',
            'transition-shadow duration-300'
          )}
          bodyStyle={{ padding: 0 }}
        >
          {/* Card header */}
          <div
            className={cn(
              'px-6 sm:px-8 py-5',
              'border-b border-stone-100',
              'bg-gradient-to-r from-stone-50 to-white'
            )}
          >
            <h2
              id="steps-title"
              className="text-lg sm:text-xl font-semibold text-stone-900 flex items-center gap-3"
            >
              <span
                className={cn(
                  'w-8 h-8 rounded-lg',
                  'flex items-center justify-center',
                  'bg-amber-100'
                )}
              >
                <MailOutlined className="text-base" style={{ color: BRAND_COLORS.gold }} />
              </span>
              {t('invitation.steps.title')}
            </h2>
          </div>

          {/* Steps list */}
          <div className="px-6 sm:px-8 py-6 space-y-6">
            {INVITATION_STEPS.map((step) => (
              <StepItem
                key={step.key}
                stepKey={step.key}
                Icon={step.icon}
                number={step.number}
                t={t}
              />
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

/**
 * Action section with email check prompt
 */
function ActionSection({
  t,
}: {
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <section className="py-12 sm:py-16 bg-white" aria-label="Check your email">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Visual email indicator */}
        <div className="mb-6 inline-flex">
          <div
            className={cn(
              'relative w-20 h-20 rounded-2xl',
              'flex items-center justify-center',
              'bg-gradient-to-br from-emerald-50 to-emerald-100',
              'border border-emerald-200',
              'shadow-sm'
            )}
          >
            {/* Animated notification dot */}
            <span
              className={cn(
                'absolute -top-1 -end-1',
                'w-4 h-4 rounded-full',
                'bg-emerald-500',
                'animate-pulse'
              )}
            />
            <MailOutlined className="text-3xl text-emerald-600" aria-hidden="true" />
          </div>
        </div>

        {/* Main message */}
        <h3 className="text-xl sm:text-2xl font-semibold text-stone-900 mb-3">
          {t('invitation.hasInvitation')}
        </h3>

        {/* Sub-message */}
        <p className="text-base text-stone-600 max-w-md mx-auto">{t('invitation.checkEmail')}</p>

        {/* Email visual hint */}
        <div
          className={cn(
            'mt-8 inline-flex items-center gap-3',
            'px-5 py-3 rounded-full',
            'bg-stone-100 border border-stone-200'
          )}
        >
          <InboxOutlined className="text-lg text-stone-500" aria-hidden="true" />
          <span className="text-sm text-stone-600">inbox@yourmail.com</span>
        </div>
      </div>
    </section>
  );
}

/**
 * Alternative action section with link back to role selection
 */
function AlternativeSection({
  t,
}: {
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <section
      className="py-10 bg-stone-50 border-t border-stone-200"
      aria-label="Alternative action"
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Question */}
        <p className="text-base text-stone-600 mb-4">{t('invitation.wrongChoice')}</p>

        {/* Back link */}
        <Link href="/onboarding/role" className="inline-block">
          <Button
            type="default"
            size="large"
            className={cn(
              'h-12 px-6 text-base',
              'border-stone-300 text-stone-700',
              'hover:border-amber-400 hover:text-amber-700',
              'transition-all duration-200'
            )}
          >
            <span className="flex items-center gap-2">
              <ArrowLeftOutlined className="text-sm rtl:rotate-180" aria-hidden="true" />
              {t('invitation.backToRole')}
            </span>
          </Button>
        </Link>
      </div>
    </section>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

/**
 * Invitation Information Page Component
 *
 * Displays helpful information for users who want to join an existing team.
 * Explains the invitation process in a clear, non-discouraging manner and
 * provides an easy way to go back to role selection if they chose incorrectly.
 */
export default function InvitationPage(): React.JSX.Element {
  const t = useTranslations('onboarding');

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero section with welcoming message */}
      <HeroSection t={t} />

      {/* Steps explaining the invitation process */}
      <StepsSection t={t} />

      {/* Action section with email check prompt */}
      <ActionSection t={t} />

      {/* Alternative action - go back to role selection */}
      <AlternativeSection t={t} />
    </div>
  );
}
