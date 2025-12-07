'use client';

/**
 * PurchasesStats Component
 *
 * Statistics cards for the purchases list page.
 * Displays total purchases, total amount, pending payments, etc.
 *
 * Features:
 * - Total purchases count
 * - Total amount
 * - Outstanding balance
 * - Paid amount
 *
 * @module components/domain/purchases/PurchasesStats
 */

import React from 'react';

import {
  ShoppingCartOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Card, Statistic, Skeleton, Row, Col } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import type { PurchaseWithSupplier } from '@/lib/hooks/data/usePurchases';
import { useShop } from '@/lib/hooks/shop';
import { type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

// =============================================================================
// TYPES
// =============================================================================

export interface PurchasesStatsProps {
  /** Purchases data for calculating stats */
  purchases: PurchaseWithSupplier[];
  /** Total count (may be more than loaded purchases) */
  totalCount: number;
  /** Whether data is loading */
  isLoading: boolean;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

function StatsSkeleton(): React.JSX.Element {
  return (
    <Row gutter={[16, 16]}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Col key={index} xs={12} sm={6}>
          <Card className="border border-stone-200">
            <Skeleton active paragraph={{ rows: 1 }} title={false} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * PurchasesStats Component
 *
 * Displays key statistics about purchases.
 */
export function PurchasesStats({
  purchases,
  totalCount,
  isLoading,
  className,
}: PurchasesStatsProps): React.JSX.Element {
  const t = useTranslations('purchases');
  const locale = useLocale() as Locale;
  const { shop } = useShop();
  const currency = shop?.currency || 'USD';

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalAmount = purchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const paidAmount = purchases.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
    const outstandingBalance = totalAmount - paidAmount;
    const unpaidCount = purchases.filter(
      (p) => p.payment_status === 'unpaid' || p.payment_status === 'partial'
    ).length;

    return {
      totalAmount,
      paidAmount,
      outstandingBalance,
      unpaidCount,
    };
  }, [purchases]);

  if (isLoading && purchases.length === 0) {
    return <StatsSkeleton />;
  }

  return (
    <Row gutter={[16, 16]} className={className}>
      {/* Total Purchases */}
      <Col xs={12} sm={6}>
        <Card
          className={cn(
            'border border-stone-200 h-full',
            'hover:border-amber-300 transition-colors'
          )}
          bodyStyle={{ padding: '16px' }}
        >
          <Statistic
            title={<span className="text-stone-500 text-sm">{t('stats.totalPurchases')}</span>}
            value={totalCount}
            prefix={<ShoppingCartOutlined className="text-amber-500 me-2" />}
            valueStyle={{ color: '#78716c', fontWeight: 600 }}
          />
        </Card>
      </Col>

      {/* Total Amount */}
      <Col xs={12} sm={6}>
        <Card
          className={cn(
            'border border-stone-200 h-full',
            'hover:border-amber-300 transition-colors'
          )}
          bodyStyle={{ padding: '16px' }}
        >
          <Statistic
            title={<span className="text-stone-500 text-sm">{t('stats.totalAmount')}</span>}
            value={stats.totalAmount}
            prefix={<DollarOutlined className="text-amber-500 me-2" />}
            formatter={(value) => formatCurrency(Number(value), currency, locale)}
            valueStyle={{ color: '#78716c', fontWeight: 600 }}
          />
        </Card>
      </Col>

      {/* Outstanding Balance */}
      <Col xs={12} sm={6}>
        <Card
          className={cn(
            'border border-stone-200 h-full',
            'hover:border-amber-300 transition-colors'
          )}
          bodyStyle={{ padding: '16px' }}
        >
          <Statistic
            title={<span className="text-stone-500 text-sm">{t('stats.outstandingBalance')}</span>}
            value={stats.outstandingBalance}
            prefix={<ClockCircleOutlined className="text-orange-500 me-2" />}
            formatter={(value) => formatCurrency(Number(value), currency, locale)}
            valueStyle={{
              color: stats.outstandingBalance > 0 ? '#ea580c' : '#78716c',
              fontWeight: 600,
            }}
          />
        </Card>
      </Col>

      {/* Paid Amount */}
      <Col xs={12} sm={6}>
        <Card
          className={cn(
            'border border-stone-200 h-full',
            'hover:border-amber-300 transition-colors'
          )}
          bodyStyle={{ padding: '16px' }}
        >
          <Statistic
            title={<span className="text-stone-500 text-sm">{t('stats.paidAmount')}</span>}
            value={stats.paidAmount}
            prefix={<CheckCircleOutlined className="text-green-500 me-2" />}
            formatter={(value) => formatCurrency(Number(value), currency, locale)}
            valueStyle={{ color: '#16a34a', fontWeight: 600 }}
          />
        </Card>
      </Col>
    </Row>
  );
}

export default PurchasesStats;
