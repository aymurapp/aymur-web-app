'use client';

/**
 * Onboarding Setup Page
 *
 * Shop creation step in the onboarding flow.
 * Wraps the existing ShopSetupWizard with onboarding-specific styling.
 * Marks onboarding as completed when shop is created.
 *
 * Validates that user has an active subscription before allowing shop creation.
 *
 * @module app/(platform)/[locale]/onboarding/setup/page
 */

import React, { useCallback, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { ShopSetupWizard } from '@/components/domain/settings/ShopSetupWizard';
import { LoadingSpinnerSection } from '@/components/ui/LoadingSpinner';
import { getOnboardingStatus, updateOnboardingStep } from '@/lib/actions/onboarding';
import { useRouter } from '@/lib/i18n/navigation';
import { useShopStore } from '@/stores/shopStore';

export default function OnboardingSetupPage(): React.JSX.Element {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const setCurrentShop = useShopStore((state) => state.setCurrentShop);
  const [isValidating, setIsValidating] = useState(true);

  /**
   * Handle wizard completion - set current shop, mark onboarding complete, and redirect
   */
  const handleComplete = useCallback(
    async (shopId: string): Promise<void> => {
      // Set the created shop as current shop
      setCurrentShop(shopId);

      // Mark onboarding as completed
      try {
        await updateOnboardingStep('completed');
      } catch (error) {
        console.error('[OnboardingSetupPage] Failed to update onboarding step:', error);
      }

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

  // Validate subscription status on mount
  useEffect(() => {
    const validateAccess = async (): Promise<void> => {
      try {
        const result = await getOnboardingStatus();

        if (result.success && result.data) {
          // If user already has a shop, redirect to shops page
          if (result.data.hasShop) {
            router.replace('/shops');
            return;
          }

          // If user doesn't have a subscription, redirect to plans
          if (!result.data.hasActiveSubscription) {
            router.replace('/onboarding/plans');
            return;
          }
        }

        setIsValidating(false);
      } catch (error) {
        console.error('[OnboardingSetupPage] Validation error:', error);
        setIsValidating(false);
      }
    };

    validateAccess();
  }, [router]);

  // Show loading while validating access
  if (isValidating) {
    return <LoadingSpinnerSection className="flex-1" />;
  }

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
