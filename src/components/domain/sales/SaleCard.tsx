'use client';

/**
 * SaleCard Component
 *
 * Card variant for displaying a sale in mobile/grid view.
 * Shows sale number, date, customer, items, total, and status badges.
 *
 * Features:
 * - Compact card layout for mobile
 * - Sale number and date
 * - Customer info (or "Walk-in")
 * - Item thumbnails (first 3 items if available)
 * - Total amount prominently displayed
 * - Status badges for sale and payment status
 * - Tap to view details
 * - Quick action menu (Print, Void)
 *
 * @module components/domain/sales/SaleCard
 */

import React from 'react';

import {
  UserOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  PrinterOutlined,
  StopOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { Card, Tag, Skeleton, Dropdown, Space } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/ui/Button';
import type { SaleWithCustomer } from '@/lib/hooks/data/useSales';
import { isRtlLocale, type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';

import type { MenuProps } from 'antd';

// =============================================================================
// TYPES
// =============================================================================

export interface SaleCardProps {
  /** Sale data to display */
  sale: SaleWithCustomer;
  /** Currency code for formatting */
  currency: string;
  /** Callback when card is clicked */
  onClick: () => void;
  /** Callback for print action */
  onPrint?: (e: React.MouseEvent) => void;
  /** Callback for void action (only shown if provided) */
  onVoid?: (e: React.MouseEvent) => void;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// STATUS HELPERS
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
// SKELETON COMPONENT
// =============================================================================

/**
 * Skeleton loading state for SaleCard
 */
export function SaleCardSkeleton(): React.JSX.Element {
  return (
    <Card className="border border-stone-200 bg-white">
      <div className="flex flex-col gap-3">
        {/* Header row */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <Skeleton.Input active size="small" className="!w-28 !min-w-0" />
            <Skeleton.Input active size="small" className="!w-32 !min-w-0" />
          </div>
          <Skeleton.Button active size="small" className="!w-8" shape="circle" />
        </div>

        {/* Customer row */}
        <div className="flex items-center gap-2">
          <Skeleton.Avatar active size="small" />
          <Skeleton.Input active size="small" className="!w-32 !min-w-0" />
        </div>

        {/* Status and amount row */}
        <div className="flex justify-between items-center pt-2 border-t border-stone-100">
          <div className="flex gap-2">
            <Skeleton.Button active size="small" className="!w-20" />
            <Skeleton.Button active size="small" className="!w-16" />
          </div>
          <Skeleton.Input active size="default" className="!w-24 !min-w-0" />
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SaleCard Component
 *
 * Displays a sale in a compact card format suitable for mobile views.
 */
export function SaleCard({
  sale,
  currency,
  onClick,
  onPrint,
  onVoid,
  className,
}: SaleCardProps): React.JSX.Element {
  const t = useTranslations('sales');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const isRtl = isRtlLocale(locale);

  // Build action menu items
  const menuItems: MenuProps['items'] = [
    {
      key: 'print',
      label: tCommon('actions.print'),
      icon: <PrinterOutlined />,
      onClick: (info) => {
        info.domEvent.stopPropagation();
        onPrint?.(info.domEvent as unknown as React.MouseEvent);
      },
    },
  ];

  // Add void option if available and sale is not already cancelled
  if (onVoid && sale.sale_status !== 'cancelled') {
    menuItems.push({
      key: 'void',
      label: t('voidSale'),
      icon: <StopOutlined />,
      danger: true,
      onClick: (info) => {
        info.domEvent.stopPropagation();
        onVoid?.(info.domEvent as unknown as React.MouseEvent);
      },
    });
  }

  // Get items count from sale if available
  const itemsCount = (sale as SaleWithCustomer & { items_count?: number }).items_count;

  return (
    <Card
      className={cn(
        'border border-stone-200 bg-white cursor-pointer transition-all',
        'hover:border-amber-300 hover:shadow-md',
        'active:bg-amber-50',
        className
      )}
      styles={{
        body: {
          padding: '16px',
        },
      }}
      onClick={onClick}
    >
      <div className="flex flex-col gap-3">
        {/* Header: Sale number, date, and action menu */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-0.5">
            {/* Sale Number */}
            <span className="font-semibold text-amber-700 text-base">{sale.sale_number}</span>
            {/* Date */}
            <span className="text-xs text-stone-500 flex items-center gap-1">
              <CalendarOutlined />
              {formatDateTime(sale.sale_date, locale)}
            </span>
          </div>

          {/* Action Menu */}
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement={isRtl ? 'bottomLeft' : 'bottomRight'}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
              className="text-stone-400 hover:text-stone-600"
            />
          </Dropdown>
        </div>

        {/* Customer Info */}
        <div className="flex items-center gap-2 text-sm">
          <UserOutlined className="text-stone-400" />
          {sale.customer ? (
            <span className="text-stone-700">{sale.customer.full_name}</span>
          ) : (
            <span className="text-stone-400 italic">{t('walkInCustomer')}</span>
          )}
        </div>

        {/* Items count if available */}
        {itemsCount !== undefined && (
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <ShoppingOutlined />
            <span>
              {itemsCount} {itemsCount === 1 ? t('item') : t('items')}
            </span>
          </div>
        )}

        {/* Footer: Status badges and amount */}
        <div className="flex justify-between items-center pt-3 border-t border-stone-100">
          {/* Status Badges */}
          <Space size={4}>
            <Tag color={getSaleStatusColor(sale.sale_status)} className="m-0">
              {sale.sale_status ? t(`status.${sale.sale_status}`) : '-'}
            </Tag>
            <Tag color={getPaymentStatusColor(sale.payment_status)} className="m-0">
              {sale.payment_status
                ? t(
                    `status.${
                      sale.payment_status === 'partial'
                        ? 'partiallyPaid'
                        : sale.payment_status === 'paid'
                          ? 'fullyPaid'
                          : sale.payment_status
                    }`
                  )
                : '-'}
            </Tag>
          </Space>

          {/* Total Amount */}
          <span className="font-bold text-lg text-stone-900">
            {formatCurrency(Number(sale.total_amount) || 0, currency, locale)}
          </span>
        </div>
      </div>
    </Card>
  );
}

export default SaleCard;
