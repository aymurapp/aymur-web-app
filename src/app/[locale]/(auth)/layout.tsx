'use client';

import React from 'react';

import { CheckCircleFilled } from '@ant-design/icons';

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
        order-first lg:order-first
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
 * Light stone-50 panel containing the auth form with enterprise-grade styling.
 */
function FormPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        w-full lg:w-[45%]
        min-h-[calc(100vh-280px)] lg:min-h-screen
        flex items-center justify-center
        p-6 sm:p-8 lg:p-12
        bg-stone-100
        order-last lg:order-last
      "
    >
      {/* Form Card Container */}
      <div
        className="
          w-full max-w-md
          bg-white
          rounded-2xl
          shadow-xl shadow-stone-200/50
          border border-stone-200/60
          p-8 sm:p-10
        "
      >
        {children}
      </div>

      {/* Enterprise-grade form input styles */}
      <style jsx global>{`
        /* Input fields - clean white with subtle borders */
        .ant-input,
        .ant-input-password .ant-input,
        .ant-input-affix-wrapper {
          background-color: #ffffff !important;
          border-color: #d6d3d1 !important;
          border-radius: 8px !important;
          color: #1c1917 !important;
          transition: all 0.2s ease !important;
        }

        .ant-input::placeholder,
        .ant-input-password .ant-input::placeholder {
          color: #a8a29e !important;
        }

        /* Input hover state */
        .ant-input:hover,
        .ant-input-affix-wrapper:hover {
          border-color: #a8a29e !important;
        }

        /* Input focus state with gold ring */
        .ant-input:focus,
        .ant-input-focused,
        .ant-input-affix-wrapper:focus,
        .ant-input-affix-wrapper-focused {
          border-color: ${BRAND_COLORS.gold} !important;
          box-shadow: 0 0 0 3px ${BRAND_COLORS.gold}20 !important;
        }

        /* Password toggle icon */
        .ant-input-password .ant-input-suffix {
          color: #78716c !important;
        }

        .ant-input-password .ant-input-suffix:hover {
          color: #1c1917 !important;
        }

        /* Form labels */
        .ant-form-item-label > label {
          color: #44403c !important;
          font-weight: 500 !important;
          font-size: 14px !important;
        }

        .ant-form-item-required::before {
          color: ${BRAND_COLORS.gold} !important;
        }

        /* Checkbox styling - gold themed */
        .ant-checkbox-wrapper {
          color: #57534e !important;
        }

        /* Unchecked checkbox - light stone border */
        .ant-checkbox .ant-checkbox-inner {
          background-color: #ffffff !important;
          border-color: #d6d3d1 !important;
          border-width: 2px !important;
          border-radius: 4px !important;
          transition: all 0.2s ease !important;
        }

        /* Checked checkbox - gold background */
        .ant-checkbox-checked .ant-checkbox-inner {
          background-color: ${BRAND_COLORS.gold} !important;
          border-color: ${BRAND_COLORS.gold} !important;
        }

        /* Hover state - gold border */
        .ant-checkbox:hover .ant-checkbox-inner {
          border-color: ${BRAND_COLORS.gold} !important;
        }

        /* Focus state - gold ring */
        .ant-checkbox-input:focus-visible + .ant-checkbox-inner {
          border-color: ${BRAND_COLORS.gold} !important;
          box-shadow: 0 0 0 3px ${BRAND_COLORS.gold}30 !important;
        }

        /* Checkmark color */
        .ant-checkbox-checked .ant-checkbox-inner::after {
          border-color: #ffffff !important;
        }

        /* Divider styling */
        .ant-divider {
          border-color: #e7e5e4 !important;
        }

        .ant-divider-inner-text {
          color: #a8a29e !important;
          font-size: 13px !important;
        }

        /* Alert styling - Enhanced error states */
        .ant-alert-error {
          background-color: #fef2f2 !important;
          border-color: #f87171 !important;
          border-radius: 10px !important;
          border-width: 1px !important;
          padding: 12px 16px !important;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15) !important;
        }

        .ant-alert-error .ant-alert-icon {
          color: #dc2626 !important;
          font-size: 18px !important;
        }

        .ant-alert-error .ant-alert-message {
          color: #991b1b !important;
          font-weight: 500 !important;
          font-size: 14px !important;
        }

        .ant-alert-error .ant-alert-close-icon {
          color: #dc2626 !important;
        }

        .ant-alert-error .ant-alert-close-icon:hover {
          color: #991b1b !important;
        }

        /* Shake animation for error */
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-4px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(4px);
          }
        }

        .auth-error-shake {
          animation: shake 0.5s ease-in-out;
        }

        /* Progress bar (password strength) */
        .ant-progress-bg {
          transition: all 0.3s ease !important;
        }
      `}</style>
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
 * - 55/45 split on desktop (left branding panel, right form panel)
 * - Stacked layout on mobile (branding on top, form below)
 * - Dark stone-900 branding with gold accents matching AYMUR theme
 * - AYMUR logo and professional feature highlights
 * - Gold-themed form inputs and checkboxes
 *
 * NOTE: NextIntlClientProvider is provided by parent [locale]/layout.tsx
 */
export default function AuthLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding (55% on desktop) */}
      <BrandingPanel />

      {/* Right Panel - Form Content (45% on desktop) */}
      <FormPanel>{children}</FormPanel>
    </div>
  );
}
