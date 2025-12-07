'use client';

/**
 * PaymentsDueWidget Component
 *
 * Dashboard widget displaying upcoming and overdue payments from customers
 * and to suppliers. Provides a quick overview of the shop's receivables
 * and payables.
 *
 * Features:
 * - Tabbed view for "From Customers" and "To Suppliers"
 * - Shows payment amount, due date, and overdue status
 * - Color-coded urgency indicators
 * - Quick link to payments page
 * - RTL-compatible with logical CSS properties
 *
 * @module components/domain/dashboard/PaymentsDueWidget
 */

import React, { useMemo, useState } from 'react';

import {
  DollarOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Card, Segmented, List, Tag, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Payment direction type
 */
type PaymentDirection = 'receivable' | 'payable';

/**
 * Payment status type
 */
type PaymentStatus = 'overdue' | 'due_soon' | 'upcoming';

/**
 * Payment due item
 */
interface PaymentDueItem {
  /** Unique payment ID */
  id: string;
  /** Entity name (customer or supplier) */
  entityName: string;
  /** Payment amount */
  amount: number;
  /** Currency code */
  currency: string;
  /** Due date */
  dueDate: Date;
  /** Payment status */
  status: PaymentStatus;
  /** Reference number (invoice/order number) */
  reference?: string;
}

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
// MOCK DATA
// =============================================================================

/**
 * Generate mock receivables (from customers) for demonstration
 */
function generateMockReceivables(): PaymentDueItem[] {
  const now = new Date();

  return [
    {
      id: 'r1',
      entityName: 'Ahmed Al-Farsi',
      amount: 2500,
      currency: 'USD',
      dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      status: 'overdue',
      reference: 'INV-1234',
    },
    {
      id: 'r2',
      entityName: 'Fatima Hassan',
      amount: 1800,
      currency: 'USD',
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      status: 'due_soon',
      reference: 'INV-1235',
    },
    {
      id: 'r3',
      entityName: 'Youssef Mahmoud',
      amount: 950,
      currency: 'USD',
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'upcoming',
      reference: 'INV-1236',
    },
    {
      id: 'r4',
      entityName: 'Layla Ibrahim',
      amount: 3200,
      currency: 'USD',
      dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      status: 'upcoming',
      reference: 'INV-1237',
    },
  ];
}

/**
 * Generate mock payables (to suppliers) for demonstration
 */
function generateMockPayables(): PaymentDueItem[] {
  const now = new Date();

  return [
    {
      id: 'p1',
      entityName: 'Golden Dreams Wholesale',
      amount: 15000,
      currency: 'USD',
      dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      status: 'overdue',
      reference: 'PO-5678',
    },
    {
      id: 'p2',
      entityName: 'Diamond Masters LLC',
      amount: 8500,
      currency: 'USD',
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      status: 'due_soon',
      reference: 'PO-5679',
    },
    {
      id: 'p3',
      entityName: 'Silver Craft Co.',
      amount: 4200,
      currency: 'USD',
      dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: 'upcoming',
      reference: 'PO-5680',
    },
  ];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format due date for display
 */
function formatDueDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Get days until due (negative if overdue)
 */
function getDaysUntilDue(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);
  const diffMs = dueDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get status configuration
 */
function getStatusConfig(status: PaymentStatus): {
  color: string;
  bgClass: string;
  borderClass: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case 'overdue':
      return {
        color: 'red',
        bgClass: 'bg-red-50',
        borderClass: 'border-red-200',
        icon: <WarningOutlined className="text-red-500" />,
      };
    case 'due_soon':
      return {
        color: 'gold',
        bgClass: 'bg-amber-50',
        borderClass: 'border-amber-200',
        icon: <ClockCircleOutlined className="text-amber-500" />,
      };
    case 'upcoming':
      return {
        color: 'blue',
        bgClass: 'bg-blue-50',
        borderClass: 'border-blue-200',
        icon: <ClockCircleOutlined className="text-blue-500" />,
      };
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * PaymentsDueWidget Component
 *
 * Displays upcoming and overdue payments organized by direction (receivables/payables).
 */
export function PaymentsDueWidget({
  className,
  maxItems = 4,
  loading = false,
}: PaymentsDueWidgetProps): React.JSX.Element {
  const t = useTranslations('dashboard.payments');

  // Active tab state
  const [activeTab, setActiveTab] = useState<PaymentDirection>('receivable');

  // Mock data - in production this would come from hooks
  const receivables = useMemo(() => {
    return generateMockReceivables().slice(0, maxItems);
  }, [maxItems]);

  const payables = useMemo(() => {
    return generateMockPayables().slice(0, maxItems);
  }, [maxItems]);

  // Get current items based on active tab
  const currentItems = activeTab === 'receivable' ? receivables : payables;

  // Calculate totals
  const totals = useMemo(() => {
    const receivableTotal = receivables.reduce((sum, item) => sum + item.amount, 0);
    const payableTotal = payables.reduce((sum, item) => sum + item.amount, 0);
    const receivableOverdue = receivables.filter((i) => i.status === 'overdue').length;
    const payableOverdue = payables.filter((i) => i.status === 'overdue').length;

    return {
      receivableTotal,
      payableTotal,
      receivableOverdue,
      payableOverdue,
      totalOverdue: receivableOverdue + payableOverdue,
    };
  }, [receivables, payables]);

  // Loading state
  if (loading) {
    return (
      <Card
        className={cn('border border-stone-200 bg-white h-full', className)}
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <Skeleton.Avatar active size="default" shape="square" />
            <Skeleton.Input active size="small" style={{ width: 120 }} />
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-3">
          <Skeleton.Button active block style={{ height: 32, marginBottom: 16 }} />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton.Input key={i} active block style={{ height: 48 }} />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn('border border-stone-200 bg-white h-full', className)}
      styles={{
        body: {
          padding: 0,
        },
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50">
            <DollarOutlined className="text-lg text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900">{t('title')}</h3>
            {totals.totalOverdue > 0 && (
              <p className="text-sm text-red-500">
                {totals.totalOverdue} {t('overdue')}
              </p>
            )}
          </div>
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
                  {totals.receivableOverdue > 0 && (
                    <Tag color="red" className="m-0 text-xs">
                      {totals.receivableOverdue}
                    </Tag>
                  )}
                </div>
              ),
              value: 'receivable',
            },
            {
              label: (
                <div className="flex items-center gap-2 px-1">
                  <ArrowUpOutlined className="text-amber-500" />
                  <span>{t('toSuppliers')}</span>
                  {totals.payableOverdue > 0 && (
                    <Tag color="red" className="m-0 text-xs">
                      {totals.payableOverdue}
                    </Tag>
                  )}
                </div>
              ),
              value: 'payable',
            },
          ]}
          block
          className="payments-segmented"
        />
      </div>

      {/* Summary */}
      <div className="px-5 py-3 bg-stone-50/50 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-600">
            {activeTab === 'receivable' ? t('totalReceivable') : t('totalPayable')}
          </span>
          <span className="text-lg font-semibold text-stone-900">
            {formatCurrency(
              activeTab === 'receivable' ? totals.receivableTotal : totals.payableTotal,
              'USD'
            )}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-3">
        {currentItems.length === 0 ? (
          <EmptyState
            icon={<DollarOutlined />}
            title={t('noPayments')}
            description={activeTab === 'receivable' ? t('noReceivables') : t('noPayables')}
            size="sm"
          />
        ) : (
          <List
            dataSource={currentItems}
            split={false}
            renderItem={(item) => {
              const config = getStatusConfig(item.status);
              const daysUntil = getDaysUntilDue(item.dueDate);

              return (
                <List.Item
                  className={cn(
                    'px-3 py-2 rounded-lg mb-2 last:mb-0 border',
                    config.bgClass,
                    config.borderClass
                  )}
                >
                  <div className="w-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {config.icon}
                        <div className="min-w-0">
                          <span className="font-medium text-stone-900 truncate block">
                            {item.entityName}
                          </span>
                          {item.reference && (
                            <span className="text-xs text-stone-500">{item.reference}</span>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-stone-900 shrink-0">
                        {formatCurrency(item.amount, item.currency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 ps-6">
                      <span className="text-xs text-stone-500">
                        {t('dueDate')}: {formatDueDate(item.dueDate)}
                      </span>
                      <Tag color={config.color} className="m-0 text-xs">
                        {item.status === 'overdue'
                          ? t('daysOverdue', { count: Math.abs(daysUntil) })
                          : daysUntil === 0
                            ? t('dueToday')
                            : daysUntil === 1
                              ? t('dueTomorrow')
                              : t('daysUntil', { count: daysUntil })}
                      </Tag>
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </div>

      {/* Footer with View All Link */}
      {currentItems.length > 0 && (
        <div className="px-5 py-3 border-t border-stone-100">
          <Link
            href={
              activeTab === 'receivable'
                ? '/customers?filter=balance_due'
                : '/suppliers?filter=balance_due'
            }
            className="flex items-center justify-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            {t('viewAll')}
            <RightOutlined className="text-xs" />
          </Link>
        </div>
      )}

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
