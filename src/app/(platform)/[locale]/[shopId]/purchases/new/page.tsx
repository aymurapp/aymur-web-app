'use client';

/**
 * New Purchase Page
 *
 * Page for creating a new purchase order from a supplier.
 *
 * Features:
 * - PurchaseForm component
 * - Navigation back to list on success
 * - Permission check for purchases.create
 *
 * @module app/(platform)/[locale]/[shopId]/purchases/new/page
 */

import React, { useCallback } from 'react';

import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { PurchaseForm } from '@/components/domain/purchases/PurchaseForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePermissions } from '@/lib/hooks/permissions';
import { useRouter } from '@/lib/i18n/navigation';

// =============================================================================
// TYPES
// =============================================================================

interface NewPurchasePageProps {
  params: {
    locale: string;
    shopId: string;
  };
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function NewPurchasePage({ params }: NewPurchasePageProps): React.JSX.Element {
  const t = useTranslations('purchases');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { can } = usePermissions();

  const canCreate = can('purchases.create');

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSuccess = useCallback(
    (purchaseId: string) => {
      router.push(`/${params.locale}/${params.shopId}/purchases/${purchaseId}`);
    },
    [router, params.locale, params.shopId]
  );

  const handleCancel = useCallback(() => {
    router.push(`/${params.locale}/${params.shopId}/purchases`);
  }, [router, params.locale, params.shopId]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Permission check
  if (!canCreate) {
    return (
      <div className="p-4 sm:p-6">
        <PageHeader
          title={t('newPurchase')}
          showBack
          backUrl={`/${params.locale}/${params.shopId}/purchases`}
        />
        <EmptyState
          title={tCommon('messages.unauthorized')}
          description={tCommon('messages.noPermission')}
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={t('newPurchase')}
        subtitle={t('newPurchaseSubtitle')}
        showBack
        backUrl={`/${params.locale}/${params.shopId}/purchases`}
      />

      <div className="max-w-4xl">
        <PurchaseForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
}
