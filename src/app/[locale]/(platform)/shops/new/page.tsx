'use client';

/**
 * New Shop Page (task-069)
 *
 * Page for creating a new shop using the ShopSetupWizard component.
 * Features:
 * - Multi-step wizard for shop creation
 * - Cancel navigation back to shops list
 * - Subscription limit checking
 *
 * @module app/(platform)/[locale]/shops/new/page
 */

import React, { useEffect, useState } from 'react';

import { ArrowLeftOutlined, WarningOutlined } from '@ant-design/icons';
import { Alert, Spin } from 'antd';
import { useTranslations } from 'next-intl';

import { ShopSetupWizard } from '@/components/domain/settings/ShopSetupWizard';
import { Button } from '@/components/ui/Button';
import { canCreateShop, type SubscriptionLimits } from '@/lib/actions/shop';
import { Link, useRouter } from '@/lib/i18n/navigation';

/**
 * New Shop Page Component
 */
export default function NewShopPage() {
  const t = useTranslations('shop');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user can create a new shop
  useEffect(() => {
    async function checkLimits() {
      try {
        const result = await canCreateShop();

        if (result.success) {
          if (result.data) {
            setLimits(result.data);
          } else {
            setError('Failed to check subscription limits');
          }
        } else {
          setError(result.error);
        }
      } catch (err) {
        console.error('Error checking limits:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsChecking(false);
      }
    }

    checkLimits();
  }, []);

  /**
   * Handle cancel - navigate back to shops list
   */
  const handleCancel = () => {
    router.push('/shops');
  };

  // Loading state
  if (isChecking) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Spin size="large" tip={tCommon('messages.loading')} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Alert
            type="error"
            showIcon
            message="Error"
            description={error}
            action={
              <Link href="/shops">
                <Button type="primary">{tCommon('actions.back')}</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  // Limit exceeded state
  if (limits && !limits.withinLimit) {
    return (
      <div className="min-h-screen bg-stone-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back Link */}
          <Link
            href="/shops"
            className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-6"
          >
            <ArrowLeftOutlined />
            <span>Back to Shops</span>
          </Link>

          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message="Shop Limit Reached"
            description={
              <div className="space-y-4">
                <p>{limits.message}</p>
                <p className="text-sm">
                  You currently have {limits.currentUsage} of {limits.maxAllowed} shops allowed on
                  your plan.
                </p>
                <p className="text-sm">
                  To create more shops, please upgrade your subscription plan.
                </p>
                <div className="pt-2">
                  <Link href="/settings/billing">
                    <Button type="primary">Upgrade Plan</Button>
                  </Link>
                </div>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/shops"
            className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-4"
          >
            <ArrowLeftOutlined />
            <span>Back to Shops</span>
          </Link>

          <h1 className="text-3xl font-bold text-stone-900 mb-2">{t('createShop')}</h1>
          <p className="text-stone-600">Set up your new jewelry shop in just a few steps.</p>

          {/* Show remaining slots */}
          {limits && limits.maxAllowed > 1 && (
            <p className="text-sm text-stone-500 mt-2">
              {limits.maxAllowed - limits.currentUsage - 1} shop slot(s) will remain after creation.
            </p>
          )}
        </div>

        {/* Shop Setup Wizard */}
        <ShopSetupWizard onCancel={handleCancel} />
      </div>
    </div>
  );
}
