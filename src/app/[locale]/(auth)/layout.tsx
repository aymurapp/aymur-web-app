import React from 'react';

import { CheckCircleFilled } from '@ant-design/icons';

import type { Metadata } from 'next';

/**
 * Auth Layout Metadata
 */
export const metadata: Metadata = {
  title: {
    template: '%s | AYMUR',
    default: 'Authentication | AYMUR',
  },
  description:
    'Sign in or create an account to access the AYMUR jewelry business management platform.',
  robots: {
    index: false,
    follow: false,
  },
};

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
 * Feature list for the branding panel
 */
const FEATURES = [
  'Complete inventory tracking & management',
  'Point of sale & professional invoicing',
  'Customer relationship management',
  'AI-powered business insights',
  'Multi-shop & team collaboration',
  'Real-time analytics dashboard',
];

/**
 * Trust indicators
 */
const TRUST_INDICATORS = [
  { value: '256-bit', label: 'SSL Encryption' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '24/7', label: 'Support' },
];

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Feature item with gold checkmark
 */
function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircleFilled className="text-lg flex-shrink-0" style={{ color: BRAND_COLORS.gold }} />
      <span className="text-stone-300 text-sm">{text}</span>
    </div>
  );
}

/**
 * Trust indicator badge
 */
function TrustIndicator({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-bold text-white">{value}</span>
      <span className="text-xs text-stone-400 uppercase tracking-wide">{label}</span>
    </div>
  );
}

/**
 * Branding Panel Component
 *
 * Dark stone-900 panel with AYMUR branding, features, and trust indicators.
 * Styled to match the onboarding flow aesthetic.
 */
function BrandingPanel() {
  return (
    <div
      className="
        relative
        w-full lg:w-[55%]
        min-h-[280px] lg:min-h-screen
        flex flex-col items-center justify-center
        p-8 lg:p-12
        overflow-hidden
        bg-stone-900
        order-first lg:order-last
      "
    >
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Radial gradient overlay with gold */}
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
        {/* Abstract circles */}
        <div
          className="absolute -top-20 -end-20 w-96 h-96 rounded-full opacity-5"
          style={{
            background: `radial-gradient(circle, ${BRAND_COLORS.gold} 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute -bottom-32 -start-32 w-80 h-80 rounded-full opacity-5"
          style={{
            background: `radial-gradient(circle, ${BRAND_COLORS.gold} 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-md">
        {/* AYMUR Logo */}
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/AYMUR-Full-Text-Logo.png"
            alt="AYMUR"
            className="h-12 sm:h-14 lg:h-16 mx-auto"
          />
        </div>

        {/* Tagline */}
        <p className="text-lg sm:text-xl text-stone-300 font-medium mb-2">
          Premium Jewelry Business Management
        </p>

        {/* Gold accent line */}
        <div
          className="mt-6 mb-8 mx-auto w-24 h-1 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${BRAND_COLORS.gold}, transparent)`,
          }}
          aria-hidden="true"
        />

        {/* Features - hidden on mobile for cleaner look */}
        <div className="hidden lg:block space-y-4 text-start mb-10">
          {FEATURES.map((feature, index) => (
            <FeatureItem key={index} text={feature} />
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="hidden lg:flex items-center justify-center gap-8 pt-8 border-t border-stone-800">
          {TRUST_INDICATORS.map((indicator, index) => (
            <TrustIndicator key={index} value={indicator.value} label={indicator.label} />
          ))}
        </div>
      </div>

      {/* Bottom decorative line */}
      <div
        className="absolute bottom-0 start-0 end-0 h-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${BRAND_COLORS.gold}50, transparent)`,
        }}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Form Panel Component
 *
 * Light stone-50 panel containing the auth form.
 */
function FormPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        w-full lg:w-[45%]
        min-h-[calc(100vh-280px)] lg:min-h-screen
        flex items-center justify-center
        p-6 sm:p-8 lg:p-12
        bg-stone-50
        order-last lg:order-first
      "
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

// =============================================================================
// MAIN LAYOUT
// =============================================================================

/**
 * Auth Layout
 *
 * Enterprise-grade split-screen layout for authentication pages featuring:
 * - 45/55 split on desktop (left form panel, right branding panel)
 * - Stacked layout on mobile (branding on top, form below)
 * - Dark stone-900 branding with gold accents matching AYMUR theme
 * - AYMUR logo and professional feature highlights
 *
 * NOTE: NextIntlClientProvider is provided by parent [locale]/layout.tsx
 */
export default function AuthLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Form Content (45% on desktop) */}
      <FormPanel>{children}</FormPanel>

      {/* Right Panel - Branding (55% on desktop) */}
      <BrandingPanel />
    </div>
  );
}
