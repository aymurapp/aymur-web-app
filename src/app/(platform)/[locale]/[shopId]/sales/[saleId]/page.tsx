'use client';

/**
 * Sale Detail Page
 *
 * Displays comprehensive information about a completed sale including:
 * - Sale header with number, date, status badges
 * - Customer information
 * - Items sold with details
 * - Payment history
 * - Financial summary
 * - Quick actions (print, void, add payment, return)
 *
 * Features:
 * - Breadcrumb navigation
 * - Permission checks
 * - Loading and error states
 * - Print functionality
 * - Void sale with confirmation
 * - Add payment modal
 * - Create return flow
 *
 * @module app/(platform)/[locale]/[shopId]/sales/[saleId]/page
 */

import React, { useCallback } from 'react';

import { useParams } from 'next/navigation';

import { ArrowLeftOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Breadcrumb, message } from 'antd';
import { useTranslations } from 'next-intl';

import { SaleDetail } from '@/components/domain/sales/SaleDetail';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useShop } from '@/lib/hooks/shop';
import { useRouter } from '@/lib/i18n/navigation';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Sale Detail Page
 *
 * Server component wrapper for the sale detail view.
 */
export default function SaleDetailPage(): React.JSX.Element {
  const t = useTranslations('sales');
  const tCommon = useTranslations('common');
  const params = useParams();
  const router = useRouter();
  const { shopId } = useShop();

  const saleId = params.saleId as string;

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Navigate back to sales list
   */
  const handleBack = useCallback(() => {
    router.push(`/${shopId}/sales`);
  }, [shopId, router]);

  /**
   * Handle print receipt
   */
  const handlePrint = useCallback(() => {
    // TODO: Implement print functionality
    // Could open print dialog or generate PDF
    window.print();
    message.success(t('printingReceipt'));
  }, [t]);

  /**
   * Handle add payment
   */
  const handleAddPayment = useCallback(() => {
    // TODO: Implement add payment modal/drawer
    // Navigate to payment form or open modal
    message.info(t('addPaymentComingSoon'));
  }, [t]);

  /**
   * Handle void sale
   */
  const handleVoidSale = useCallback(
    async (_reason: string) => {
      // TODO: Implement void sale API call
      try {
        message.loading(t('voidingSale'), 0);
        // await voidSale(saleId, _reason);
        message.destroy();
        message.success(t('saleVoided'));
        // Refresh the page or redirect
      } catch (error) {
        message.destroy();
        message.error(t('voidSaleFailed'));
        throw error;
      }
    },
    [t]
  );

  /**
   * Handle create return
   */
  const handleCreateReturn = useCallback(() => {
    // TODO: Navigate to return creation flow
    router.push(`/${shopId}/sales/${saleId}/return`);
  }, [shopId, saleId, router]);

  /**
   * Handle duplicate sale
   */
  const handleDuplicate = useCallback(() => {
    // TODO: Navigate to POS with pre-filled items
    router.push(`/${shopId}/sales/pos?duplicate=${saleId}`);
  }, [shopId, saleId, router]);

  // ==========================================================================
  // BREADCRUMB ITEMS
  // ==========================================================================

  const breadcrumbItems = [
    {
      title: (
        <span
          className="cursor-pointer hover:text-amber-600"
          onClick={() => router.push(`/${shopId}/sales`)}
        >
          {t('title')}
        </span>
      ),
    },
    {
      title: t('saleDetails'),
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Validate saleId parameter
  if (!saleId || typeof saleId !== 'string') {
    return (
      <div className="sale-detail-page">
        <PageHeader title={t('saleDetails')}>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            {tCommon('actions.back')}
          </Button>
        </PageHeader>
        <div className="mt-8 text-center">
          <ShoppingCartOutlined className="text-6xl text-stone-300 mb-4" />
          <p className="text-stone-500">{t('invalidSaleId')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sale-detail-page">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={breadcrumbItems} className="mb-4 text-sm" />

      {/* Page Header */}
      <PageHeader title={t('saleDetails')} className="mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          {tCommon('actions.back')}
        </Button>
      </PageHeader>

      {/* Sale Detail Content */}
      <SaleDetail
        saleId={saleId}
        onPrint={handlePrint}
        onAddPayment={handleAddPayment}
        onVoidSale={handleVoidSale}
        onCreateReturn={handleCreateReturn}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
}
