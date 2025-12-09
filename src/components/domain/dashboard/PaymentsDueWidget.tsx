'use client';

/**
 * PaymentsDueWidget Component
 *
 * Dashboard widget displaying upcoming and overdue payments from customers
 * and to suppliers. Currently shows empty state - real data fetching to be implemented.
 *
 * @module components/domain/dashboard/PaymentsDueWidget
 */

import React, { useState } from 'react';

import { DollarOutlined, ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Card, Segmented, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Payment direction type
 */
type PaymentDirection = 'receivable' | 'payable';

/**
 * PaymentsDueWidget props
 */
export interface PaymentsDueWidgetProps {
  /** Additional class name */
  className?: string;
  /** Maximum items to show per tab (default: 4) */
  maxItems?: number;
  /** Whether the widget is loading */
  loading?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * PaymentsDueWidget Component
 *
 * Displays upcoming and overdue payments organized by direction (receivables/payables).
 * Currently shows empty state - real data fetching to be implemented.
 */
export function PaymentsDueWidget({
  className,
  maxItems: _maxItems = 4,
  loading = false,
}: PaymentsDueWidgetProps): React.JSX.Element {
  const t = useTranslations('dashboard.payments');

  // Active tab state
  const [activeTab, setActiveTab] = useState<PaymentDirection>('receivable');

  // Loading state
  if (loading) {
    return (
      <Card
        className={cn('border border-stone-200 bg-white h-full', className)}
        styles={{ body: { padding: 0 } }}
      >
        <div className="px-5 py-4 border-b border-stone-100">
          <Skeleton active paragraph={false} title={{ width: '50%' }} />
        </div>
        <div className="px-5 py-4">
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn('border border-stone-200 bg-white h-full', className)}
      styles={{ body: { padding: 0 } }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50">
            <DollarOutlined className="text-lg text-emerald-600" />
          </div>
          <h3 className="text-base font-semibold text-stone-900">{t('title')}</h3>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="px-5 py-3 border-b border-stone-100">
        <Segmented
          value={activeTab}
          onChange={(value) => setActiveTab(value as PaymentDirection)}
          options={[
            {
              label: (
                <div className="flex items-center gap-2 px-1">
                  <ArrowDownOutlined className="text-emerald-500" />
                  <span>{t('fromCustomers')}</span>
                </div>
              ),
              value: 'receivable',
            },
            {
              label: (
                <div className="flex items-center gap-2 px-1">
                  <ArrowUpOutlined className="text-amber-500" />
                  <span>{t('toSuppliers')}</span>
                </div>
              ),
              value: 'payable',
            },
          ]}
          block
          className="payments-segmented"
        />
      </div>

      {/* Empty State */}
      <div className="px-5 py-6">
        <EmptyState
          icon={<DollarOutlined />}
          title={t('noPayments')}
          description={activeTab === 'receivable' ? t('noReceivables') : t('noPayables')}
          size="sm"
        />
      </div>

      {/* Custom styles */}
      <style jsx global>{`
        .payments-segmented .ant-segmented-item-selected {
          background: #fef3c7 !important;
        }
        .payments-segmented .ant-segmented-item-label {
          padding: 4px 8px;
        }
      `}</style>
    </Card>
  );
}

export default PaymentsDueWidget;
