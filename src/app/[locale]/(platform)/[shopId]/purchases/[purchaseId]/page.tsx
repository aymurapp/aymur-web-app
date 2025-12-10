'use client';

/**
 * Purchase Detail Page
 *
 * Page for viewing a single purchase order with all details.
 *
 * Features:
 * - Full purchase details display
 * - Actions: Edit, Record Payment, Cancel
 * - Payment modal integration
 * - Cancel confirmation
 *
 * @module app/(platform)/[locale]/[shopId]/purchases/[purchaseId]/page
 */

import React, { useState, useCallback } from 'react';

import { Modal, message } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import {
  PurchaseDetail,
  PurchaseDetailSkeleton,
} from '@/components/domain/purchases/PurchaseDetail';
import { RecordPaymentDrawer } from '@/components/domain/suppliers/RecordPaymentDrawer';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePurchase, useCancelPurchase } from '@/lib/hooks/data/usePurchases';
import { usePermissions } from '@/lib/hooks/permissions';
import { useRouter } from '@/lib/i18n/navigation';

// =============================================================================
// TYPES
// =============================================================================

interface PurchaseDetailPageProps {
  params: {
    locale: string;
    shopId: string;
    purchaseId: string;
  };
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function PurchaseDetailPage({ params }: PurchaseDetailPageProps): React.JSX.Element {
  const t = useTranslations('purchases');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { can } = usePermissions();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { purchase, isLoading, error, refetch } = usePurchase(params.purchaseId);

  // Mutations
  const cancelPurchase = useCancelPurchase();

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleEdit = useCallback(() => {
    router.push(`/${params.locale}/${params.shopId}/purchases/${params.purchaseId}/edit`);
  }, [router, params.locale, params.shopId, params.purchaseId]);

  const handleRecordPayment = useCallback(() => {
    setPaymentModalOpen(true);
  }, []);

  const handleCancel = useCallback(() => {
    setCancelModalOpen(true);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    setPaymentModalOpen(false);
    refetch();
    message.success(t('paymentRecorded'));
  }, [refetch, t]);

  const handleCancelConfirm = useCallback(async () => {
    try {
      await cancelPurchase.mutateAsync({
        purchaseId: params.purchaseId,
        reason: 'Cancelled by user',
      });
      message.success(t('purchaseCancelled'));
      setCancelModalOpen(false);
      router.push(`/${params.locale}/${params.shopId}/purchases`);
    } catch (_error) {
      message.error(t('cancelError'));
    }
  }, [cancelPurchase, params.purchaseId, params.locale, params.shopId, router, t]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <PageHeader
          title={t('purchaseDetails')}
          showBack
          backUrl={`/${params.locale}/${params.shopId}/purchases`}
        />
        <PurchaseDetailSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <PageHeader
          title={t('purchaseDetails')}
          showBack
          backUrl={`/${params.locale}/${params.shopId}/purchases`}
        />
        <EmptyState
          title={tCommon('messages.error')}
          description={error.message}
          action={{
            label: tCommon('actions.retry'),
            onClick: () => refetch(),
          }}
          size="lg"
        />
      </div>
    );
  }

  // Not found state
  if (!purchase) {
    return (
      <div className="p-4 sm:p-6">
        <PageHeader
          title={t('purchaseDetails')}
          showBack
          backUrl={`/${params.locale}/${params.shopId}/purchases`}
        />
        <EmptyState
          title={t('purchaseNotFound')}
          description={t('purchaseNotFoundDescription')}
          action={{
            label: t('backToPurchases'),
            onClick: () => router.push(`/${params.locale}/${params.shopId}/purchases`),
          }}
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={purchase.purchase_number}
        subtitle={purchase.supplier?.company_name}
        showBack
        backUrl={`/${params.locale}/${params.shopId}/purchases`}
        breadcrumbOverrides={[{ key: params.purchaseId, label: purchase.purchase_number }]}
      />

      <PurchaseDetail
        purchase={purchase}
        onEdit={can('purchases.edit') ? handleEdit : undefined}
        onRecordPayment={can('suppliers.payments') ? handleRecordPayment : undefined}
        onCancel={can('purchases.delete') ? handleCancel : undefined}
      />

      {/* Record Payment Drawer */}
      <RecordPaymentDrawer
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        purchase={purchase}
      />

      {/* Cancel Confirmation Modal */}
      <Modal
        title={t('cancelPurchaseTitle')}
        open={cancelModalOpen}
        onCancel={() => setCancelModalOpen(false)}
        onOk={handleCancelConfirm}
        okText={tCommon('actions.confirm')}
        cancelText={tCommon('actions.cancel')}
        okButtonProps={{ danger: true, loading: cancelPurchase.isPending }}
      >
        <p>{t('cancelPurchaseConfirmation', { purchaseNumber: purchase.purchase_number })}</p>
      </Modal>
    </div>
  );
}
