'use client';

/**
 * PurchaseCard Component
 *
 * Card view for a single purchase, used in mobile layouts.
 * Shows purchase number, supplier, date, amount, and status.
 *
 * Features:
 * - Compact card layout
 * - Status badges
 * - Quick action buttons
 * - Click to navigate
 *
 * @module components/domain/purchases/PurchaseCard
 */

import React from 'react';

import { EyeOutlined, DollarOutlined, ShopOutlined, CalendarOutlined } from '@ant-design/icons';
import { Card, Tag, Skeleton, Typography } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/ui/Button';
import type { PurchaseWithSupplier, PurchasePaymentStatus } from '@/lib/hooks/data/usePurchases';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/format';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface PurchaseCardProps {
  /** Purchase data */
  purchase: PurchaseWithSupplier;
  /** Currency for formatting */
  currency: string;
  /** Click handler for the card */
  onClick: () => void;
  /** Record payment handler */
  onRecordPayment?: (e: React.MouseEvent) => void;
}

// =============================================================================
// HELPERS
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
// SKELETON COMPONENT
// =============================================================================

/**
 * Skeleton loading state for PurchaseCard
 */
export function PurchaseCardSkeleton(): React.JSX.Element {
  return (
    <Card className="border border-stone-200">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <Skeleton.Input active size="small" className="!w-32" />
          <Skeleton.Button active size="small" shape="round" className="!w-16" />
        </div>
        <Skeleton.Input active size="small" className="!w-48" />
        <div className="flex justify-between items-center">
          <Skeleton.Input active size="small" className="!w-24" />
          <Skeleton.Input active size="small" className="!w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton.Button active size="small" className="!w-16" />
          <Skeleton.Button active size="small" className="!w-16" />
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * PurchaseCard Component
 *
 * Mobile-friendly card display for a purchase.
 */
export function PurchaseCard({
  purchase,
  currency,
  onClick,
  onRecordPayment,
}: PurchaseCardProps): React.JSX.Element {
  const t = useTranslations('purchases');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;

  const balanceDue = Number(purchase.total_amount) - Number(purchase.paid_amount);
  const isPaid = purchase.payment_status === 'paid';

  return (
    <Card
      className={cn(
        'border border-stone-200 cursor-pointer transition-all',
        'hover:border-amber-300 hover:shadow-md'
      )}
      onClick={onClick}
      bodyStyle={{ padding: '12px 16px' }}
    >
      <div className="space-y-3">
        {/* Header: Purchase Number + Status */}
        <div className="flex justify-between items-start">
          <Text strong className="text-amber-700">
            {purchase.purchase_number}
          </Text>
          <Tag color={getPaymentStatusColor(purchase.payment_status)}>
            {purchase.payment_status ? t(`paymentStatus.${purchase.payment_status}`) : '-'}
          </Tag>
        </div>

        {/* Supplier Info */}
        <div className="flex items-center gap-2 text-stone-600">
          <ShopOutlined className="text-amber-500" />
          <span className="truncate">
            {purchase.supplier?.company_name || t('unknownSupplier')}
          </span>
        </div>

        {/* Date and Amount Row */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 text-stone-500 text-sm">
            <CalendarOutlined className="text-xs" />
            <span>{formatDate(purchase.purchase_date, locale)}</span>
          </div>
          <Text strong className="text-lg">
            {formatCurrency(Number(purchase.total_amount), currency, locale)}
          </Text>
        </div>

        {/* Balance Due (if not fully paid) */}
        {!isPaid && balanceDue > 0 && (
          <div className="flex justify-between items-center text-sm">
            <Text type="secondary">{t('balanceDue')}</Text>
            <Text type="danger" strong>
              {formatCurrency(balanceDue, currency, locale)}
            </Text>
          </div>
        )}

        {/* Actions */}
        <div
          className="flex gap-2 pt-2 border-t border-stone-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={onClick}>
            {tCommon('actions.view')}
          </Button>
          {!isPaid && onRecordPayment && (
            <Button type="text" size="small" icon={<DollarOutlined />} onClick={onRecordPayment}>
              {t('recordPayment')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default PurchaseCard;
