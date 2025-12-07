'use client';

/**
 * PaymentSummary Component
 *
 * Displays payment summary information including:
 * - Order total
 * - Amount paid (sum of payments)
 * - Remaining balance
 * - Change due (for overpayment with cash)
 * - Visual indicator when fully paid
 *
 * @module components/domain/sales/PaymentSummary
 */

import React, { useMemo } from 'react';

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { Typography, Tag, Progress, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

const { Text, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Payment status enumeration
 */
type PaymentStatusType = 'unpaid' | 'partial' | 'paid' | 'overpaid';

/**
 * Props for PaymentSummary component
 */
export interface PaymentSummaryProps {
  /**
   * Total order amount
   */
  totalAmount: number;

  /**
   * Amount already paid
   */
  paidAmount: number;

  /**
   * Currency code (e.g., 'USD', 'IQD')
   */
  currency: string;

  /**
   * Locale for formatting
   */
  locale?: string;

  /**
   * Whether to show change due calculation (for cash payments)
   */
  showChange?: boolean;

  /**
   * Cash tendered amount (for change calculation)
   */
  cashTendered?: number;

  /**
   * Whether to show progress bar
   */
  showProgress?: boolean;

  /**
   * Whether to show status badge
   */
  showStatus?: boolean;

  /**
   * Compact display mode
   */
  compact?: boolean;

  /**
   * Custom class name
   */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Status configuration for visual styling
 */
const STATUS_CONFIG: Record<
  PaymentStatusType,
  {
    icon: React.ReactNode;
    color: string;
    tagColor: string;
    labelKey: string;
  }
> = {
  unpaid: {
    icon: <ClockCircleOutlined />,
    color: 'text-stone-500',
    tagColor: 'default',
    labelKey: 'status.unpaid',
  },
  partial: {
    icon: <ExclamationCircleOutlined />,
    color: 'text-amber-600',
    tagColor: 'warning',
    labelKey: 'status.partial',
  },
  paid: {
    icon: <CheckCircleOutlined />,
    color: 'text-emerald-600',
    tagColor: 'success',
    labelKey: 'status.paid',
  },
  overpaid: {
    icon: <DollarOutlined />,
    color: 'text-blue-600',
    tagColor: 'processing',
    labelKey: 'status.overpaid',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * PaymentSummary Component
 *
 * Displays a comprehensive payment summary with visual indicators
 * for payment status, progress, and change calculation.
 */
export function PaymentSummary({
  totalAmount,
  paidAmount,
  currency,
  locale = 'en-US',
  showChange = false,
  cashTendered = 0,
  showProgress = true,
  showStatus = true,
  compact = false,
  className,
}: PaymentSummaryProps): JSX.Element {
  const t = useTranslations('sales.payment');

  /**
   * Calculate payment status and amounts
   */
  const { status, remainingAmount, changeAmount, progressPercent, isFullyPaid } = useMemo(() => {
    const remaining = totalAmount - paidAmount;
    const progress = totalAmount > 0 ? Math.min((paidAmount / totalAmount) * 100, 100) : 0;

    let paymentStatus: PaymentStatusType;
    if (paidAmount <= 0) {
      paymentStatus = 'unpaid';
    } else if (remaining > 0.01) {
      paymentStatus = 'partial';
    } else if (remaining < -0.01) {
      paymentStatus = 'overpaid';
    } else {
      paymentStatus = 'paid';
    }

    // Calculate change for cash payments
    const change =
      showChange && cashTendered > 0
        ? Math.max(0, cashTendered - totalAmount)
        : Math.abs(Math.min(0, remaining));

    return {
      status: paymentStatus,
      remainingAmount: Math.max(0, remaining),
      changeAmount: change,
      progressPercent: progress,
      isFullyPaid: paymentStatus === 'paid' || paymentStatus === 'overpaid',
    };
  }, [totalAmount, paidAmount, showChange, cashTendered]);

  const statusConfig = STATUS_CONFIG[status];

  // Compact mode rendering
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-lg',
          'border border-stone-200 bg-stone-50',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <span className={statusConfig.color}>{statusConfig.icon}</span>
          <Text strong>{formatCurrency(remainingAmount, currency, locale)}</Text>
          <Text type="secondary" className="text-sm">
            {t('summary.remaining')}
          </Text>
        </div>
        {showStatus && <Tag color={statusConfig.tagColor}>{t(statusConfig.labelKey)}</Tag>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border-2 overflow-hidden',
        isFullyPaid ? 'border-emerald-200 bg-emerald-50/30' : 'border-stone-200 bg-white',
        className
      )}
    >
      {/* Header with status */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3',
          isFullyPaid ? 'bg-emerald-100/50' : 'bg-stone-50'
        )}
      >
        <Title level={5} className="mb-0 flex items-center gap-2">
          <span className={statusConfig.color}>{statusConfig.icon}</span>
          {t('summary.title')}
        </Title>
        {showStatus && (
          <Tag color={statusConfig.tagColor} className="m-0">
            {t(statusConfig.labelKey)}
          </Tag>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Progress bar */}
        {showProgress && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <Text type="secondary">{t('summary.paymentProgress')}</Text>
              <Text type="secondary">{Math.round(progressPercent)}%</Text>
            </div>
            <Tooltip
              title={`${formatCurrency(paidAmount, currency, locale)} / ${formatCurrency(totalAmount, currency, locale)}`}
            >
              <Progress
                percent={progressPercent}
                showInfo={false}
                strokeColor={{
                  '0%': '#f59e0b',
                  '100%': '#10b981',
                }}
                trailColor="#e5e7eb"
                className="m-0"
              />
            </Tooltip>
          </div>
        )}

        {/* Amount breakdown */}
        <div className="space-y-3">
          {/* Order total */}
          <div className="flex items-center justify-between">
            <Text type="secondary">{t('summary.orderTotal')}</Text>
            <Text strong className="text-lg">
              {formatCurrency(totalAmount, currency, locale)}
            </Text>
          </div>

          {/* Amount paid */}
          <div className="flex items-center justify-between">
            <Text type="secondary">{t('summary.amountPaid')}</Text>
            <Text strong className={cn('text-lg', paidAmount > 0 && 'text-emerald-600')}>
              {formatCurrency(paidAmount, currency, locale)}
            </Text>
          </div>

          {/* Divider */}
          <div className="border-t border-stone-200" />

          {/* Remaining balance */}
          {remainingAmount > 0.01 && (
            <div className="flex items-center justify-between">
              <Text strong>{t('summary.remaining')}</Text>
              <Text strong className="text-xl text-amber-600">
                {formatCurrency(remainingAmount, currency, locale)}
              </Text>
            </div>
          )}

          {/* Change due */}
          {isFullyPaid && changeAmount > 0.01 && (
            <div
              className={cn(
                'flex items-center justify-between p-3 -mx-4 -mb-4',
                'bg-emerald-100/50 border-t border-emerald-200'
              )}
            >
              <div className="flex items-center gap-2">
                <DollarOutlined className="text-emerald-600" />
                <Text strong className="text-emerald-800">
                  {t('summary.changeDue')}
                </Text>
              </div>
              <Text strong className="text-xl text-emerald-700">
                {formatCurrency(changeAmount, currency, locale)}
              </Text>
            </div>
          )}

          {/* Fully paid indicator */}
          {isFullyPaid && changeAmount <= 0.01 && (
            <div
              className={cn(
                'flex items-center justify-center gap-2 p-3 -mx-4 -mb-4',
                'bg-emerald-100/50 border-t border-emerald-200'
              )}
            >
              <CheckCircleOutlined className="text-emerald-600 text-xl" />
              <Text strong className="text-emerald-700">
                {t('summary.fullyPaid')}
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentSummary;
