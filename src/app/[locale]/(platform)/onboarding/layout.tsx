'use client';

/**
 * Onboarding Layout
 *
 * Enterprise-grade onboarding flow layout with branded header and step navigation.
 * Provides a consistent, professional experience throughout the onboarding process.
 *
 * Features:
 * - AYMUR branding with logo
 * - Step-based progress indicator
 * - Responsive design
 * - Professional aesthetics
 *
 * @module app/(platform)/[locale]/onboarding/layout
 */

import React from 'react';

import { usePathname } from 'next/navigation';

import { Steps } from 'antd';
import { useTranslations } from 'next-intl';

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
  stone: '#1C1917',
  stoneMuted: '#57534E',
};

/**
 * Onboarding steps configuration for shop owners
 */
const ONBOARDING_STEPS = [
  { key: 'welcome', path: '/onboarding/welcome' },
  { key: 'role', path: '/onboarding/role' },
  { key: 'profile', path: '/onboarding/profile' },
  { key: 'plans', path: '/onboarding/plans' },
  { key: 'setup', path: '/onboarding/setup' },
  { key: 'complete', path: '/onboarding/complete' },
];

/**
 * Pages that don't show the step header (team member flow)
 */
const PAGES_WITHOUT_STEPS = ['/onboarding/invitation'];

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Branded header with logo and progress
 */
function OnboardingHeader({
  currentStep,
  t,
}: {
  currentStep: number;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const stepItems = ONBOARDING_STEPS.map((step) => ({
    title: t(`steps.${step.key}`),
  }));

  return (
    <header className="bg-stone-900 border-b border-stone-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo Row */}
        <div className="flex items-center justify-center py-6">
          <img src="/images/AYMUR-Full-Text-Logo.png" alt="AYMUR" className="h-10 sm:h-12" />
        </div>

        {/* Steps Navigation */}
        <div className="pb-6">
          <Steps
            current={currentStep}
            items={stepItems}
            size="small"
            className="onboarding-steps"
            responsive={false}
          />
        </div>
      </div>

      {/* Custom styles for steps */}
      <style jsx global>{`
        .onboarding-steps .ant-steps-item-process .ant-steps-item-icon {
          background: ${BRAND_COLORS.gold} !important;
          border-color: ${BRAND_COLORS.gold} !important;
        }
        .onboarding-steps .ant-steps-item-finish .ant-steps-item-icon {
          background: transparent !important;
          border-color: ${BRAND_COLORS.gold} !important;
        }
        .onboarding-steps .ant-steps-item-finish .ant-steps-item-icon .ant-steps-icon {
          color: ${BRAND_COLORS.gold} !important;
        }
        .onboarding-steps .ant-steps-item-finish .ant-steps-item-tail::after {
          background-color: ${BRAND_COLORS.gold} !important;
        }
        .onboarding-steps .ant-steps-item-title {
          color: #a8a29e !important;
          font-size: 13px !important;
        }
        .onboarding-steps .ant-steps-item-process .ant-steps-item-title,
        .onboarding-steps .ant-steps-item-finish .ant-steps-item-title {
          color: #fafaf9 !important;
        }
        .onboarding-steps .ant-steps-item-wait .ant-steps-item-icon {
          background: transparent !important;
          border-color: #57534e !important;
        }
        .onboarding-steps .ant-steps-item-wait .ant-steps-item-icon .ant-steps-icon {
          color: #57534e !important;
        }
        .onboarding-steps .ant-steps-item-tail::after {
          background-color: #44403c !important;
        }
      `}</style>
    </header>
  );
}

// =============================================================================
// MAIN LAYOUT
// =============================================================================

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const t = useTranslations('onboarding');

  // Check if current page should hide steps (team member flow)
  const shouldHideSteps = PAGES_WITHOUT_STEPS.some((page) => pathname.includes(page));

  // Determine current step from pathname
  const getCurrentStep = (): number => {
    // Extract the step from pathname (e.g., /en/onboarding/welcome -> welcome)
    const pathParts = pathname.split('/');
    const stepPath = pathParts[pathParts.length - 1];

    // Handle checkout success/canceled as part of plans step
    if (pathname.includes('/checkout/')) {
      return 3; // Plans step (index 3 after adding role and profile)
    }

    const stepIndex = ONBOARDING_STEPS.findIndex((step) => step.path.endsWith(`/${stepPath}`));
    return stepIndex >= 0 ? stepIndex : 0;
  };

  const currentStep = getCurrentStep();

  return (
    <div className={cn('min-h-screen flex flex-col', 'bg-stone-50')}>
      {/* Branded Header with Steps - hidden for team member flow */}
      {!shouldHideSteps ? (
        <OnboardingHeader currentStep={currentStep} t={t} />
      ) : (
        // Simple header with just logo for team member flow
        <header className="bg-stone-900 border-b border-stone-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-6">
              <img src="/images/AYMUR-Full-Text-Logo.png" alt="AYMUR" className="h-10 sm:h-12" />
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Footer */}
      <footer className="bg-stone-100 border-t border-stone-200 py-4">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-stone-500">
            {new Date().getFullYear()} AYMUR. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
