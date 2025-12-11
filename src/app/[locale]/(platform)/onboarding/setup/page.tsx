'use client';

/**
 * Onboarding Setup Page
 *
 * Shop creation step in the onboarding flow.
 * Wraps the existing ShopSetupWizard with onboarding-specific styling.
 *
 * @module app/(platform)/[locale]/onboarding/setup/page
 */

import React, { useCallback } from 'react';

import { useTranslations } from 'next-intl';

import { ShopSetupWizard } from '@/components/domain/settings/ShopSetupWizard';
import { useRouter } from '@/lib/i18n/navigation';
import { useShopStore } from '@/stores/shopStore';

export default function OnboardingSetupPage(): React.JSX.Element {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const setCurrentShop = useShopStore((state) => state.setCurrentShop);

  /**
   * Handle wizard completion - set current shop and redirect to completion page
   */
  const handleComplete = useCallback(
    (shopId: string): void => {
      // Set the created shop as current shop
      setCurrentShop(shopId);
      // Navigate to completion page
      router.push('/onboarding/complete');
    },
    [setCurrentShop, router]
  );

  /**
   * Handle cancel - go back to plans (shouldn't happen in normal flow)
   */
  const handleCancel = useCallback((): void => {
    router.push('/onboarding/plans');
  }, [router]);

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">{t('setup.title')}</h1>
          <p className="text-stone-600">{t('setup.subtitle')}</p>
        </div>

        {/* Shop Setup Wizard */}
        <ShopSetupWizard onCancel={handleCancel} onComplete={handleComplete} />
      </div>
    </div>
  );
}
