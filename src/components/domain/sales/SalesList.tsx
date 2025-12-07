'use client';

/**
 * SalesList Component
 *
 * Displays sales in either table (desktop) or card (mobile) format.
 * Includes loading skeletons, status badges, and action buttons.
 *
 * Features:
 * - Responsive: table on desktop, cards on mobile
 * - Status badges with semantic colors
 * - Customer info display (or "Walk-in")
 * - Items count
 * - Total amount with currency
 * - Quick actions: View, Print, Void
 *
 * @module components/domain/sales/SalesList
 */

import React, { useCallback } from 'react';

import { EyeOutlined, PrinterOutlined, StopOutlined, UserOutlined } from '@ant-design/icons';
import { Table, Tag, Tooltip, Space, Skeleton } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { usePrefetchSale } from '@/lib/hooks/data/useSale';
import type { SaleWithCustomer, SaleStatus, PaymentStatus } from '@/lib/hooks/data/useSales';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { isRtlLocale, type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';

import { SaleCard, SaleCardSkeleton } from './SaleCard';

import type { ColumnsType } from 'antd/es/table';

// =============================================================================
// TYPES
// =============================================================================

export interface SalesListProps {
  /** Array of sales to display */
  sales: SaleWithCustomer[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Callback when a sale row/card is clicked */
  onSaleClick: (saleId: string) => void;
  /** Whether to show mobile card view */
  isMobile: boolean;
}

// =============================================================================
// STATUS BADGE HELPERS
// =============================================================================

/**
 * Get tag color for sale status
 */
function getSaleStatusColor(status: string | null): string {
  switch (status) {
    case 'completed':
      return 'success';
    case 'cancelled':
    case 'refunded':
      return 'error';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * Get tag color for payment status
 */
function getPaymentStatusColor(status: string | null): string {
  switch (status) {
    case 'paid':
      return 'success';
    case 'partial':
      return 'warning';
    case 'unpaid':
      return 'default';
    case 'refunded':
      return 'error';
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
        <Skeleton.Input active size="small" className="!w-24" />
        <Skeleton.Input active size="small" className="!w-32" />
        <Skeleton.Input active size="small" className="!w-40" />
        <Skeleton.Input active size="small" className="!w-16" />
        <Skeleton.Input active size="small" className="!w-24" />
        <Skeleton.Input active size="small" className="!w-20" />
        <Skeleton.Input active size="small" className="!w-20" />
        <Skeleton.Input active size="small" className="!w-24" />
      </div>
      {/* Table rows skeleton */}
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-4 py-3 px-4 border-b border-stone-100">
          <Skeleton.Input active size="small" className="!w-24" />
          <Skeleton.Input active size="small" className="!w-32" />
          <Skeleton.Input active size="small" className="!w-40" />
          <Skeleton.Input active size="small" className="!w-16" />
          <Skeleton.Input active size="small" className="!w-24" />
          <Skeleton.Button active size="small" className="!w-20" />
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
        <SaleCardSkeleton key={index} />
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SalesList Component
 *
 * Displays sales in table (desktop) or card (mobile) format.
 */
export function SalesList({
  sales,
  isLoading,
  onSaleClick,
  isMobile,
}: SalesListProps): React.JSX.Element {
  const t = useTranslations('sales');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const isRtl = isRtlLocale(locale);
  const { can } = usePermissions();
  const prefetchSale = usePrefetchSale();
  const { shop } = useShop();
  const currency = shop?.currency || 'USD';

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleRowClick = useCallback(
    (record: SaleWithCustomer) => {
      onSaleClick(record.id_sale);
    },
    [onSaleClick]
  );

  const handlePrint = useCallback((saleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement print functionality
    console.log('Print sale:', saleId);
  }, []);

  const handleVoid = useCallback((saleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement void functionality with confirmation
    console.log('Void sale:', saleId);
  }, []);

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================

  const columns: ColumnsType<SaleWithCustomer> = [
    {
      title: t('invoiceNumber'),
      dataIndex: 'sale_number',
      key: 'sale_number',
      width: 140,
      fixed: isRtl ? 'right' : 'left',
      render: (value: string) => <span className="font-medium text-amber-700">{value}</span>,
    },
    {
      title: tCommon('labels.date'),
      dataIndex: 'sale_date',
      key: 'sale_date',
      width: 160,
      render: (value: string) => formatDateTime(value, locale),
    },
    {
      title: t('customer'),
      dataIndex: 'customer',
      key: 'customer',
      width: 200,
      ellipsis: true,
      render: (_: unknown, record: SaleWithCustomer) => {
        if (record.customer) {
          return (
            <div className="flex items-center gap-2">
              <UserOutlined className="text-stone-400" />
              <span>{record.customer.full_name}</span>
            </div>
          );
        }
        return <span className="text-stone-400 italic">{t('walkInCustomer')}</span>;
      },
    },
    {
      title: t('items'),
      dataIndex: 'items_count',
      key: 'items_count',
      width: 80,
      align: 'center',
      render: (_: unknown, record: SaleWithCustomer) => {
        // items_count might come from the database or we need to count sale_items
        const count = (record as SaleWithCustomer & { items_count?: number }).items_count ?? '-';
        return <span>{count}</span>;
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
      title: t('payment.title'),
      dataIndex: 'payment_status',
      key: 'payment_status',
      width: 120,
      align: 'center',
      render: (status: PaymentStatus | null) => (
        <Tag color={getPaymentStatusColor(status)}>
          {status
            ? t(
                `status.${status === 'partial' ? 'partiallyPaid' : status === 'paid' ? 'fullyPaid' : status}`
              )
            : '-'}
        </Tag>
      ),
    },
    {
      title: tCommon('labels.status'),
      dataIndex: 'sale_status',
      key: 'sale_status',
      width: 120,
      align: 'center',
      render: (status: SaleStatus | null) => (
        <Tag color={getSaleStatusColor(status)}>{status ? t(`status.${status}`) : '-'}</Tag>
      ),
    },
    {
      title: tCommon('actions.view'),
      key: 'actions',
      width: 120,
      fixed: isRtl ? 'left' : 'right',
      render: (_: unknown, record: SaleWithCustomer) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Tooltip title={tCommon('actions.view')}>
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onSaleClick(record.id_sale)}
            />
          </Tooltip>
          <Tooltip title={tCommon('actions.print')}>
            <Button
              type="text"
              size="small"
              icon={<PrinterOutlined />}
              onClick={(e) => handlePrint(record.id_sale, e)}
            />
          </Tooltip>
          {can('sales.void') && record.sale_status !== 'cancelled' && (
            <Tooltip title={t('voidSale')}>
              <Button
                type="text"
                size="small"
                danger
                icon={<StopOutlined />}
                onClick={(e) => handleVoid(record.id_sale, e)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Loading state
  if (isLoading && sales.length === 0) {
    return isMobile ? <CardsSkeleton count={6} /> : <TableSkeleton rows={5} />;
  }

  // Mobile: Card view
  if (isMobile) {
    return (
      <div className={cn('grid grid-cols-1 gap-4', isLoading && 'opacity-60 pointer-events-none')}>
        {sales.map((sale) => (
          <SaleCard
            key={sale.id_sale}
            sale={sale}
            currency={currency}
            onClick={() => onSaleClick(sale.id_sale)}
            onPrint={(e) => handlePrint(sale.id_sale, e)}
            onVoid={can('sales.void') ? (e) => handleVoid(sale.id_sale, e) : undefined}
          />
        ))}
      </div>
    );
  }

  // Desktop: Table view
  return (
    <Table<SaleWithCustomer>
      columns={columns}
      dataSource={sales}
      rowKey="id_sale"
      pagination={false}
      loading={isLoading}
      scroll={{ x: 1000 }}
      onRow={(record) => ({
        onClick: () => handleRowClick(record),
        onMouseEnter: () => prefetchSale(record.id_sale),
        className: 'cursor-pointer hover:bg-amber-50 transition-colors',
      })}
      className={cn(
        'sales-table',
        '[&_.ant-table-thead_th]:bg-stone-50',
        '[&_.ant-table-thead_th]:text-stone-600',
        '[&_.ant-table-thead_th]:font-medium',
        '[&_.ant-table-thead_th]:border-b-stone-200',
        '[&_.ant-table-row:hover>td]:bg-amber-50'
      )}
    />
  );
}

export default SalesList;
