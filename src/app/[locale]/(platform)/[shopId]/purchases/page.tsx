'use client';

/**
 * Purchases List Page
 *
 * Main page for viewing and managing purchase orders from suppliers.
 * Supports filtering, pagination, and quick actions.
 *
 * Features:
 * - DataTable with purchases
 * - Filters: date range, status, supplier, payment status
 * - Quick actions: view, receive, pay
 * - Add new purchase button
 * - Mobile responsive with card view
 *
 * @module app/(platform)/[locale]/[shopId]/purchases/page
 */

import React, { useState, useCallback } from 'react';

import { PlusOutlined } from '@ant-design/icons';
import { Pagination } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import {
  PurchasesFilters,
  defaultPurchasesFilters,
  type PurchasesFiltersState,
} from '@/components/domain/purchases/PurchasesFilters';
import { PurchasesList } from '@/components/domain/purchases/PurchasesList';
import { PurchasesStats } from '@/components/domain/purchases/PurchasesStats';
import { ReceivePurchaseModal } from '@/components/domain/purchases/ReceivePurchaseModal';
import { RecordPaymentModal } from '@/components/domain/suppliers/RecordPaymentModal';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { usePurchases, usePurchase } from '@/lib/hooks/data/usePurchases';
import { usePermissions } from '@/lib/hooks/permissions';
import { useMediaQuery } from '@/lib/hooks/utils/useMediaQuery';
import { useRouter } from '@/lib/i18n/navigation';

// =============================================================================
// TYPES
// =============================================================================

interface PurchasesPageProps {
  params: {
    locale: string;
    shopId: string;
  };
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function PurchasesPage({ params }: PurchasesPageProps): React.JSX.Element {
  const t = useTranslations('purchases');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { can } = usePermissions();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [filters, setFilters] = useState<PurchasesFiltersState>(defaultPurchasesFilters);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { purchases, totalCount, isLoading, isFetching, error, refetch } = usePurchases({
    search: filters.search || undefined,
    supplierId: filters.supplierId || undefined,
    paymentStatus: filters.paymentStatus.length > 0 ? filters.paymentStatus : undefined,
    dateRange: filters.dateRange,
    page,
    pageSize,
    sortBy: 'purchase_date',
    sortDirection: 'desc',
    includeSupplier: true,
  });

  // Fetch selected purchase for modals
  const { purchase: selectedPurchase } = usePurchase(selectedPurchaseId, {
    enabled: !!selectedPurchaseId && (paymentModalOpen || receiveModalOpen),
  });

  // ==========================================================================
  // PERMISSIONS
  // ==========================================================================

  const canCreatePurchase = can('purchases.create');
  const canRecordPayment = can('suppliers.payments');
  const canReceive = can('inventory.manage');

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  // Filter handlers
  const handleFiltersChange = useCallback((newFilters: Partial<PurchasesFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page on filter change
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(defaultPurchasesFilters);
    setPage(1);
  }, []);

  // Navigation handlers
  const handlePurchaseClick = useCallback(
    (purchaseId: string) => {
      router.push(`/${params.locale}/${params.shopId}/purchases/${purchaseId}`);
    },
    [router, params.locale, params.shopId]
  );

  const handleCreatePurchase = useCallback(() => {
    router.push(`/${params.locale}/${params.shopId}/purchases/new`);
  }, [router, params.locale, params.shopId]);

  // Modal handlers
  const handleRecordPayment = useCallback((purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    setPaymentModalOpen(true);
  }, []);

  const handleReceive = useCallback((purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    setReceiveModalOpen(true);
  }, []);

  const handlePaymentModalClose = useCallback(() => {
    setPaymentModalOpen(false);
    setSelectedPurchaseId(null);
  }, []);

  const handleReceiveModalClose = useCallback(() => {
    setReceiveModalOpen(false);
    setSelectedPurchaseId(null);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    handlePaymentModalClose();
    refetch();
  }, [handlePaymentModalClose, refetch]);

  const handleReceiveSuccess = useCallback(() => {
    handleReceiveModalClose();
    refetch();
  }, [handleReceiveModalClose, refetch]);

  // Pagination handlers
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <PageHeader title={t('title')} />
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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <PageHeader title={t('title')}>
        {canCreatePurchase && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreatePurchase}>
            {t('newPurchase')}
          </Button>
        )}
      </PageHeader>

      {/* Stats Cards */}
      <PurchasesStats purchases={purchases} totalCount={totalCount} isLoading={isLoading} />

      {/* Filters */}
      <PurchasesFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        isLoading={isFetching}
      />

      {/* Purchases List or Empty State */}
      {!isLoading && purchases.length === 0 ? (
        <EmptyState
          title={
            filters.search ||
            filters.supplierId ||
            filters.paymentStatus.length > 0 ||
            filters.dateRange
              ? tCommon('messages.noResults')
              : t('noPurchases')
          }
          description={
            filters.search ||
            filters.supplierId ||
            filters.paymentStatus.length > 0 ||
            filters.dateRange
              ? t('noPurchasesWithFilters')
              : t('noPurchasesDescription')
          }
          action={
            canCreatePurchase && !filters.search
              ? {
                  label: t('newPurchase'),
                  onClick: handleCreatePurchase,
                  icon: <PlusOutlined />,
                }
              : filters.search
                ? {
                    label: tCommon('actions.clear'),
                    onClick: handleClearFilters,
                  }
                : undefined
          }
          size="lg"
        />
      ) : (
        <>
          {/* List */}
          <PurchasesList
            purchases={purchases}
            isLoading={isLoading}
            onPurchaseClick={handlePurchaseClick}
            onRecordPayment={canRecordPayment ? handleRecordPayment : undefined}
            onReceive={canReceive ? handleReceive : undefined}
            isMobile={isMobile}
          />

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="flex justify-center mt-6">
              <Pagination
                current={page}
                total={totalCount}
                pageSize={pageSize}
                onChange={handlePageChange}
                showSizeChanger={false}
                showTotal={(total, range) =>
                  tCommon('pagination.showTotal', {
                    start: range[0],
                    end: range[1],
                    total,
                  })
                }
              />
            </div>
          )}
        </>
      )}

      {/* Record Payment Modal */}
      {selectedPurchase && (
        <RecordPaymentModal
          open={paymentModalOpen}
          onClose={handlePaymentModalClose}
          onSuccess={handlePaymentSuccess}
          purchase={selectedPurchase}
        />
      )}

      {/* Receive Purchase Modal */}
      {selectedPurchase && (
        <ReceivePurchaseModal
          open={receiveModalOpen}
          onClose={handleReceiveModalClose}
          onSuccess={handleReceiveSuccess}
          purchase={selectedPurchase}
        />
      )}
    </div>
  );
}
