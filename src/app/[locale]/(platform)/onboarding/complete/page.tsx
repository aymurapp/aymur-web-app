'use client';

/**
 * Onboarding Complete Page
 *
 * Celebration page marking the successful completion of the AYMUR onboarding flow.
 * Provides a professional, celebratory experience with quick start tips to guide
 * users into their first actions on the platform.
 *
 * Features:
 * - Celebration animation with confetti effect
 * - Professional, luxurious design with gold accents
 * - Quick start tips for immediate next actions
 * - Responsive layout with RTL support
 * - Accessible navigation to the dashboard
 *
 * @module app/(platform)/[locale]/onboarding/complete
 */

import React, { useEffect, useState } from 'react';

import {
  AppstoreOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Result } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';
import { useCurrentShop } from '@/stores/shopStore';

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
 * Quick start tips configuration with icons and translation keys
 */
const QUICK_START_TIPS = [
  {
    key: 'inventory',
    icon: AppstoreOutlined,
    gradient: 'from-amber-500/20 to-amber-600/10',
    href: '/inventory',
  },
  {
    key: 'customers',
    icon: TeamOutlined,
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    href: '/customers',
  },
  {
    key: 'settings',
    icon: SettingOutlined,
    gradient: 'from-blue-500/20 to-blue-600/10',
    href: '/settings/general',
  },
] as const;

/**
 * Confetti particle configuration
 */
interface ConfettiParticle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

const CONFETTI_COLORS = [
  BRAND_COLORS.gold,
  BRAND_COLORS.goldLight,
  '#f59e0b',
  '#fbbf24',
  '#fcd34d',
  '#fef3c7',
];

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Confetti animation component
 */
function ConfettiAnimation(): React.JSX.Element {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    // Generate confetti particles on mount
    const newParticles: ConfettiParticle[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? '#C9A227',
      size: 6 + Math.random() * 8,
    }));
    setParticles(newParticles);

    // Clean up after animation completes
    const timer = setTimeout(() => {
      setParticles([]);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (particles.length === 0) {
    return <></>;
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50" aria-hidden="true">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-confetti"
          style={{
            left: `${particle.x}%`,
            top: '-20px',
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
}

/**
 * Animated success icon with pulsing ring effect
 */
function SuccessIcon(): React.JSX.Element {
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Pulsing ring animation */}
      <div
        className="absolute w-32 h-32 rounded-full animate-ping opacity-20"
        style={{ backgroundColor: BRAND_COLORS.gold }}
      />
      <div
        className="absolute w-28 h-28 rounded-full animate-pulse opacity-30"
        style={{ backgroundColor: BRAND_COLORS.goldLight }}
      />

      {/* Main icon container */}
      <div
        className={cn(
          'relative w-24 h-24 rounded-full',
          'flex items-center justify-center',
          'shadow-2xl',
          'animate-bounce-gentle'
        )}
        style={{
          background: `linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldDark})`,
        }}
      >
        <CheckCircleFilled className="text-5xl text-white" aria-hidden="true" />
      </div>

      <style jsx>{`
        @keyframes bounce-gentle {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/**
 * Hero section with celebration message
 */
function CelebrationHero({
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
      aria-labelledby="complete-title"
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Radial gradient overlay */}
        <div
          className="absolute top-0 start-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-40"
          style={{
            background: `radial-gradient(ellipse at center, ${BRAND_COLORS.gold}20 0%, transparent 70%)`,
          }}
        />
        {/* Celebration sparkle pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(${BRAND_COLORS.gold} 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Success icon with animation */}
        <div className="mb-8">
          <SuccessIcon />
        </div>

        {/* Main title */}
        <h1
          id="complete-title"
          className={cn(
            'text-3xl sm:text-4xl lg:text-5xl font-bold',
            'text-white mb-4',
            'tracking-tight leading-tight'
          )}
        >
          {t('complete.title')}
        </h1>

        {/* Subtitle */}
        <p
          className={cn('text-xl sm:text-2xl font-medium mb-6')}
          style={{ color: BRAND_COLORS.goldLight }}
        >
          {t('complete.subtitle')}
        </p>

        {/* Description */}
        <p className={cn('text-lg text-stone-400', 'max-w-2xl mx-auto', 'leading-relaxed')}>
          {t('complete.description')}
        </p>

        {/* Gold accent line */}
        <div
          className="mt-10 mx-auto w-32 h-1 rounded-full"
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
 * Individual quick start tip card
 */
function TipCard({
  tipKey,
  Icon,
  gradient,
  href,
  shopSlug,
  t,
}: {
  tipKey: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  gradient: string;
  href: string;
  shopSlug: string;
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  const fullHref = `/${shopSlug}${href}`;

  return (
    <Link href={fullHref} className="block">
      <Card
        className={cn(
          'group relative overflow-hidden h-full',
          'border-stone-200 hover:border-amber-300',
          'transition-all duration-300 ease-out',
          'hover:shadow-lg hover:shadow-amber-500/10',
          'hover:-translate-y-1',
          'cursor-pointer'
        )}
        bodyStyle={{ padding: 0 }}
      >
        {/* Gradient background on hover */}
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
        <div className="relative p-6 sm:p-8 text-center">
          {/* Icon container */}
          <div
            className={cn(
              'inline-flex items-center justify-center',
              'w-16 h-16 rounded-xl mb-5',
              'bg-stone-100 group-hover:bg-white',
              'transition-colors duration-300'
            )}
          >
            <Icon
              className="text-3xl transition-colors duration-300"
              style={{ color: BRAND_COLORS.gold }}
            />
          </div>

          {/* Tip text */}
          <p
            className={cn(
              'text-base font-medium text-stone-700',
              'group-hover:text-stone-900',
              'transition-colors duration-300'
            )}
          >
            {t(`complete.tips.${tipKey}` as Parameters<typeof t>[0])}
          </p>

          {/* Arrow indicator */}
          <div
            className={cn(
              'mt-4 inline-flex items-center justify-center',
              'text-stone-400 group-hover:text-amber-600',
              'transition-all duration-300',
              'group-hover:translate-x-1 rtl:group-hover:-translate-x-1'
            )}
          >
            <ArrowRightOutlined className="rtl:rotate-180" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

/**
 * Quick start tips section
 */
function QuickStartSection({
  shopSlug,
  t,
}: {
  shopSlug: string;
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <section className="py-16 sm:py-20 bg-stone-50" aria-labelledby="tips-title">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section title */}
        <h2
          id="tips-title"
          className={cn('text-2xl sm:text-3xl font-bold text-stone-900', 'text-center mb-10')}
        >
          {t('complete.tips.title')}
        </h2>

        {/* Tips grid - 3 columns on desktop, 1 on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
          {QUICK_START_TIPS.map((tip) => (
            <TipCard
              key={tip.key}
              tipKey={tip.key}
              Icon={tip.icon}
              gradient={tip.gradient}
              href={tip.href}
              shopSlug={shopSlug}
              t={t}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Call to action section with primary dashboard button
 */
function CTASection({
  shopSlug,
  t,
}: {
  shopSlug: string;
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <section className="py-16 sm:py-20 bg-white" aria-label="Go to dashboard">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* CTA Button */}
        <Link href={`/${shopSlug}/dashboard`} className="inline-block">
          <Button
            type="primary"
            size="large"
            className={cn(
              'h-14 px-12 text-base font-semibold',
              'border-none shadow-lg',
              'hover:shadow-xl hover:scale-[1.02]',
              'transition-all duration-200'
            )}
            style={{
              backgroundColor: BRAND_COLORS.gold,
            }}
            aria-label={t('complete.cta')}
          >
            <span className="flex items-center gap-3">
              {t('complete.cta')}
              <ArrowRightOutlined className="text-sm rtl:rotate-180" />
            </span>
          </Button>
        </Link>

        {/* Decorative element */}
        <div className={cn('mt-12 pt-8 border-t border-stone-200', 'text-sm text-stone-500')}>
          <p>Welcome to the AYMUR family. We are excited to be part of your journey.</p>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

/**
 * Complete Page Component
 *
 * The final step in the AYMUR onboarding flow. Celebrates successful completion
 * and guides users with quick start tips before directing them to the dashboard.
 */
export default function CompletePage(): React.JSX.Element {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const currentShop = useCurrentShop();

  // Redirect to shops page if no shop is selected
  useEffect(() => {
    if (!currentShop) {
      router.replace('/shops');
    }
  }, [currentShop, router]);

  // Show nothing while redirecting
  if (!currentShop) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Result status="info" title="Redirecting..." subTitle="Taking you to your shops" />
      </div>
    );
  }

  const shopSlug = currentShop.slug;

  return (
    <div className="flex-1 flex flex-col">
      {/* Confetti celebration animation */}
      <ConfettiAnimation />

      {/* Hero section with success message */}
      <CelebrationHero t={t} />

      {/* Quick start tips */}
      <QuickStartSection shopSlug={shopSlug} t={t} />

      {/* Call to action - Go to Dashboard */}
      <CTASection shopSlug={shopSlug} t={t} />
    </div>
  );
}
