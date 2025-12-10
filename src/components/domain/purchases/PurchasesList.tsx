'use client';

/**
 * PurchasesList Component
 *
 * Displays purchases in either table (desktop) or card (mobile) format.
 * Includes loading skeletons, status badges, and action buttons.
 *
 * Features:
 * - Responsive: table on desktop, cards on mobile
 * - Payment status badges with semantic colors
 * - Supplier info display
 * - Total amount with currency
 * - Quick actions: View, Record Payment
 *
 * @module components/domain/purchases/PurchasesList
 */

import React, { useCallback } from 'react';

import { EyeOutlined, DollarOutlined, ShopOutlined } from '@ant-design/icons';
import { Table, Tag, Tooltip, Space, Skeleton, Typography } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/ui/Button';
import type { PurchaseWithSupplier, PurchasePaymentStatus } from '@/lib/hooks/data/usePurchases';
import { usePrefetchPurchase } from '@/lib/hooks/data/usePurchases';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { isRtlLocale, type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/format';

import { PurchaseCard, PurchaseCardSkeleton } from './PurchaseCard';

import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface PurchasesListProps {
  /** Array of purchases to display */
  purchases: PurchaseWithSupplier[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Callback when a purchase row/card is clicked */
  onPurchaseClick: (purchaseId: string) => void;
  /** Callback when record payment is clicked */
  onRecordPayment?: (purchaseId: string) => void;
  /** Whether to show mobile card view */
  isMobile: boolean;
}

// =============================================================================
// STATUS BADGE HELPERS
// =============================================================================

/**
 * Get tag color for payment status
 */
function getPaymentStatusColor(status: PurchasePaymentStatus | null): string {
  switch (status) {
    case 'paid':
      return 'success';
    case 'partial':
      return 'warning';
    case 'unpaid':
      return 'default';
    default:
      return 'default';
  }
}

// =============================================================================
// LOADING SKELETONS
// =============================================================================

/**
 * Table row skeleton for loading state
 */
function TableSkeleton({ rows = 5 }: { rows?: number }): React.JSX.Element {
  return (
    <div className="space-y-3">
      {/* Table header skeleton */}
      <div className="flex gap-4 py-3 px-4 bg-stone-50 border-b border-stone-200">
        <Skeleton.Input active size="small" className="!w-28" />
        <Skeleton.Input active size="small" className="!w-24" />
        <Skeleton.Input active size="small" className="!w-40" />
        <Skeleton.Input active size="small" className="!w-24" />
        <Skeleton.Input active size="small" className="!w-24" />
        <Skeleton.Input active size="small" className="!w-20" />
        <Skeleton.Input active size="small" className="!w-24" />
      </div>
      {/* Table rows skeleton */}
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-4 py-3 px-4 border-b border-stone-100">
          <Skeleton.Input active size="small" className="!w-28" />
          <Skeleton.Input active size="small" className="!w-24" />
          <Skeleton.Input active size="small" className="!w-40" />
          <Skeleton.Input active size="small" className="!w-24" />
          <Skeleton.Input active size="small" className="!w-24" />
          <Skeleton.Button active size="small" className="!w-20" />
          <Skeleton.Input active size="small" className="!w-24" />
        </div>
      ))}
    </div>
  );
}

/**
 * Cards grid skeleton for mobile loading
 */
function CardsSkeleton({ count = 6 }: { count?: number }): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <PurchaseCardSkeleton key={index} />
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * PurchasesList Component
 *
 * Displays purchases in table (desktop) or card (mobile) format.
 */
export function PurchasesList({
  purchases,
  isLoading,
  onPurchaseClick,
  onRecordPayment,
  isMobile,
}: PurchasesListProps): React.JSX.Element {
  const t = useTranslations('purchases');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const isRtl = isRtlLocale(locale);
  const { can } = usePermissions();
  const prefetchPurchase = usePrefetchPurchase();
  const { shop } = useShop();
  const currency = shop?.currency || 'USD';

  const canRecordPayment = can('suppliers.payments');

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleRowClick = useCallback(
    (record: PurchaseWithSupplier) => {
      onPurchaseClick(record.id_purchase);
    },
    [onPurchaseClick]
  );

  const handleRecordPayment = useCallback(
    (purchaseId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onRecordPayment?.(purchaseId);
    },
    [onRecordPayment]
  );

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================

  const columns: ColumnsType<PurchaseWithSupplier> = [
    {
      title: t('purchaseNumber'),
      dataIndex: 'purchase_number',
      key: 'purchase_number',
      width: 160,
      fixed: isRtl ? 'right' : 'left',
      render: (value: string) => <span className="font-medium text-amber-700">{value}</span>,
    },
    {
      title: tCommon('labels.date'),
      dataIndex: 'purchase_date',
      key: 'purchase_date',
      width: 120,
      render: (value: string) => formatDate(value, locale),
    },
    {
      title: t('supplier'),
      dataIndex: 'supplier',
      key: 'supplier',
      width: 200,
      ellipsis: true,
      render: (_: unknown, record: PurchaseWithSupplier) => {
        if (record.supplier) {
          return (
            <div className="flex items-center gap-2">
              <ShopOutlined className="text-amber-500" />
              <span>{record.supplier.company_name}</span>
            </div>
          );
        }
        return <span className="text-stone-400 italic">{t('unknownSupplier')}</span>;
      },
    },
    {
      title: tCommon('labels.total'),
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 140,
      align: isRtl ? 'left' : 'right',
      render: (value: number) => (
        <span className="font-semibold">
          {formatCurrency(Number(value) || 0, currency, locale)}
        </span>
      ),
    },
    {
      title: t('paidAmount'),
      dataIndex: 'paid_amount',
      key: 'paid_amount',
      width: 140,
      align: isRtl ? 'left' : 'right',
      render: (value: number, record: PurchaseWithSupplier) => {
        const isPaid = record.payment_status === 'paid';
        return (
          <Text type={isPaid ? 'success' : 'secondary'}>
            {formatCurrency(Number(value) || 0, currency, locale)}
          </Text>
        );
      },
    },
    {
      title: t('paymentStatusLabel'),
      dataIndex: 'payment_status',
      key: 'payment_status',
      width: 120,
      align: 'center',
      render: (status: PurchasePaymentStatus | null) => (
        <Tag color={getPaymentStatusColor(status)}>
          {status ? t(`paymentStatus.${status}`) : '-'}
        </Tag>
      ),
    },
    {
      title: tCommon('actions.view'),
      key: 'actions',
      width: 140,
      fixed: isRtl ? 'left' : 'right',
      render: (_: unknown, record: PurchaseWithSupplier) => {
        const isPaid = record.payment_status === 'paid';

        return (
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            <Tooltip title={tCommon('actions.view')}>
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onPurchaseClick(record.id_purchase)}
              />
            </Tooltip>
            {!isPaid && canRecordPayment && onRecordPayment && (
              <Tooltip title={t('recordPayment')}>
                <Button
                  type="text"
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={(e) => handleRecordPayment(record.id_purchase, e)}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Loading state
  if (isLoading && purchases.length === 0) {
    return isMobile ? <CardsSkeleton count={6} /> : <TableSkeleton rows={5} />;
  }

  // Mobile: Card view
  if (isMobile) {
    return (
      <div className={cn('grid grid-cols-1 gap-4', isLoading && 'opacity-60 pointer-events-none')}>
        {purchases.map((purchase) => (
          <PurchaseCard
            key={purchase.id_purchase}
            purchase={purchase}
            currency={currency}
            onClick={() => onPurchaseClick(purchase.id_purchase)}
            onRecordPayment={
              canRecordPayment && purchase.payment_status !== 'paid' && onRecordPayment
                ? (e) => handleRecordPayment(purchase.id_purchase, e)
                : undefined
            }
          />
        ))}
      </div>
    );
  }

  // Desktop: Table view
  return (
    <Table<PurchaseWithSupplier>
      columns={columns}
      dataSource={purchases}
      rowKey="id_purchase"
      pagination={false}
      loading={isLoading}
      scroll={{ x: 1000 }}
      onRow={(record) => ({
        onClick: () => handleRowClick(record),
        onMouseEnter: () => prefetchPurchase(record.id_purchase),
        className: 'cursor-pointer hover:bg-amber-50 transition-colors',
      })}
      className={cn(
        'purchases-table',
        '[&_.ant-table-thead_th]:bg-stone-50',
        '[&_.ant-table-thead_th]:text-stone-600',
        '[&_.ant-table-thead_th]:font-medium',
        '[&_.ant-table-thead_th]:border-b-stone-200',
        '[&_.ant-table-row:hover>td]:bg-amber-50'
      )}
    />
  );
}

export default PurchasesList;
