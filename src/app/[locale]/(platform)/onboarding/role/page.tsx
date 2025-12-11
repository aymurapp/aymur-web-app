'use client';

/**
 * Onboarding Role Selection Page
 *
 * Enterprise-grade role selection page for the AYMUR jewelry platform onboarding flow.
 * Users choose between being a shop owner (create their own shop) or a team member
 * (join an existing shop via invitation).
 *
 * Features:
 * - Two large, visually distinct cards for each path
 * - Professional enterprise aesthetics with AYMUR branding
 * - Gold accent for owner path, blue accent for team path
 * - Hover effects and selection states
 * - Responsive layout with RTL support
 * - Fully accessible navigation
 *
 * @module app/(platform)/[locale]/onboarding/role/page
 */

import React from 'react';

import { ArrowRightOutlined, CheckOutlined, CrownOutlined, TeamOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';

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
 * Role card configurations
 */
const ROLE_CARDS = [
  {
    key: 'owner',
    Icon: CrownOutlined,
    href: '/onboarding/plans',
    accentColor: BRAND_COLORS.gold,
    gradient: 'from-amber-500 to-amber-600',
    gradientLight: 'from-amber-50 to-amber-100/50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    hoverBorder: 'hover:border-amber-400',
    hoverShadow: 'hover:shadow-amber-500/20',
    checkColor: 'text-amber-600 bg-amber-100',
  },
  {
    key: 'team',
    Icon: TeamOutlined,
    href: '/onboarding/invitation',
    accentColor: '#3B82F6', // blue-500
    gradient: 'from-blue-500 to-blue-600',
    gradientLight: 'from-blue-50 to-blue-100/50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    hoverBorder: 'hover:border-blue-400',
    hoverShadow: 'hover:shadow-blue-500/20',
    checkColor: 'text-blue-600 bg-blue-100',
  },
] as const;

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Page header with title and subtitle
 */
function PageHeader({
  t,
}: {
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'relative py-12 sm:py-16 lg:py-20',
        'bg-gradient-to-b from-stone-100 to-stone-50'
      )}
      aria-labelledby="role-title"
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className={cn(
            'absolute top-10 start-1/4 w-72 h-72 rounded-full',
            'bg-amber-500/5 blur-3xl'
          )}
        />
        <div
          className={cn(
            'absolute bottom-10 end-1/4 w-80 h-80 rounded-full',
            'bg-blue-500/5 blur-3xl'
          )}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1
          id="role-title"
          className={cn(
            'text-3xl sm:text-4xl lg:text-5xl font-bold',
            'text-stone-900 mb-4',
            'tracking-tight leading-tight'
          )}
        >
          {t('role.title')}
        </h1>

        <p
          className={cn(
            'text-lg sm:text-xl text-stone-600',
            'max-w-2xl mx-auto',
            'leading-relaxed'
          )}
        >
          {t('role.subtitle')}
        </p>
      </div>
    </section>
  );
}

/**
 * Feature list item with checkmark
 */
function FeatureItem({
  children,
  checkColorClass,
}: {
  children: React.ReactNode;
  checkColorClass: string;
}): React.JSX.Element {
  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full',
          'flex items-center justify-center',
          checkColorClass
        )}
      >
        <CheckOutlined className="text-xs" />
      </span>
      <span className="text-stone-600 text-sm">{children}</span>
    </li>
  );
}

/**
 * Individual role selection card
 */
function RoleCard({
  roleKey,
  Icon,
  href,
  gradient,
  gradientLight,
  iconBg,
  iconColor,
  hoverBorder,
  hoverShadow,
  checkColor,
  t,
}: {
  roleKey: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  href: string;
  gradient: string;
  gradientLight: string;
  iconBg: string;
  iconColor: string;
  hoverBorder: string;
  hoverShadow: string;
  checkColor: string;
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  // Access the features array - next-intl returns raw values for arrays
  const featuresRaw = t.raw(`role.${roleKey}.features` as Parameters<typeof t.raw>[0]);
  const features: string[] = Array.isArray(featuresRaw) ? featuresRaw : [];

  return (
    <Link
      href={href}
      className="block h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 rounded-2xl"
      aria-label={t(`role.${roleKey}.title` as Parameters<typeof t>[0])}
    >
      <Card
        className={cn(
          'relative h-full overflow-hidden',
          'border-2 border-stone-200',
          'transition-all duration-300 ease-out',
          'group-hover:-translate-y-2',
          'group-hover:shadow-2xl',
          hoverBorder,
          hoverShadow
        )}
        bodyStyle={{ padding: 0 }}
        hoverable={false}
      >
        {/* Gradient accent bar at top */}
        <div className={cn('h-2 bg-gradient-to-r', gradient)} aria-hidden="true" />

        {/* Light gradient background on hover */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100',
            'transition-opacity duration-300',
            gradientLight
          )}
          aria-hidden="true"
        />

        {/* Card content */}
        <div className="relative p-8 sm:p-10">
          {/* Icon container */}
          <div
            className={cn(
              'inline-flex items-center justify-center',
              'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl',
              'mb-6',
              iconBg,
              'transition-transform duration-300',
              'group-hover:scale-110'
            )}
          >
            <Icon className={cn('text-3xl sm:text-4xl', iconColor)} />
          </div>

          {/* Title */}
          <h2
            className={cn(
              'text-xl sm:text-2xl font-bold text-stone-900',
              'mb-3',
              'group-hover:text-stone-800'
            )}
          >
            {t(`role.${roleKey}.title` as Parameters<typeof t>[0])}
          </h2>

          {/* Description */}
          <p className="text-stone-600 mb-6 leading-relaxed">
            {t(`role.${roleKey}.description` as Parameters<typeof t>[0])}
          </p>

          {/* Features list */}
          <ul className="space-y-3 mb-8">
            {features.map((feature, index) => (
              <FeatureItem key={index} checkColorClass={checkColor}>
                {feature}
              </FeatureItem>
            ))}
          </ul>

          {/* Arrow indicator */}
          <div
            className={cn(
              'flex items-center gap-2 text-stone-400',
              'transition-all duration-300',
              'group-hover:text-stone-600',
              'group-hover:translate-x-1 rtl:group-hover:-translate-x-1'
            )}
          >
            <span className="text-sm font-medium">{t('role.cta')}</span>
            <ArrowRightOutlined className="text-sm rtl:rotate-180" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

/**
 * Cards grid section
 */
function CardsSection({
  t,
}: {
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <section
      className="flex-1 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-stone-50"
      aria-label="Role selection"
    >
      <div className="max-w-4xl mx-auto">
        {/* Two cards in responsive grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {ROLE_CARDS.map((card) => (
            <RoleCard
              key={card.key}
              roleKey={card.key}
              Icon={card.Icon}
              href={card.href}
              gradient={card.gradient}
              gradientLight={card.gradientLight}
              iconBg={card.iconBg}
              iconColor={card.iconColor}
              hoverBorder={card.hoverBorder}
              hoverShadow={card.hoverShadow}
              checkColor={card.checkColor}
              t={t}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

/**
 * Role Selection Page Component
 *
 * The second step in the AYMUR onboarding flow. Users choose between:
 * - Owner Path: Create their own shop (leads to plans selection)
 * - Team Member Path: Join an existing shop via invitation
 */
export default function RoleSelectionPage(): React.JSX.Element {
  const t = useTranslations('onboarding');

  return (
    <div className="flex-1 flex flex-col">
      {/* Page header with title and subtitle */}
      <PageHeader t={t} />

      {/* Role selection cards */}
      <CardsSection t={t} />
    </div>
  );
}
