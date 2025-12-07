'use client';

/**
 * SalesStats Component
 *
 * Summary statistics cards displayed at the top of the sales list page.
 * Shows today's sales count, revenue, average sale value, and comparison.
 *
 * Features:
 * - Today's sales count
 * - Today's revenue
 * - Average sale value
 * - Comparison to yesterday (with trend indicator)
 * - Loading skeleton state
 * - Responsive grid layout
 *
 * @module components/domain/sales/SalesStats
 */

import React from 'react';

import {
  ShoppingCartOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import { Card, Skeleton, Row, Col } from 'antd';
import dayjs from 'dayjs';
import { useTranslations, useLocale } from 'next-intl';

import { useSalesByDateRange } from '@/lib/hooks/data/useSales';
import { useShop } from '@/lib/hooks/shop';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

// =============================================================================
// TYPES
// =============================================================================

export interface SalesStatsProps {
  /** Additional class name */
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconBgClass?: string;
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

/**
 * Individual stat card with icon, value, and optional trend
 */
function StatCard({
  title,
  value,
  prefix,
  suffix,
  trend,
  isLoading,
  icon,
  iconBgClass = 'bg-amber-100',
}: StatCardProps): React.JSX.Element {
  if (isLoading) {
    return (
      <Card className="border-stone-200">
        <div className="flex items-start gap-4">
          <Skeleton.Avatar active size={48} shape="square" className="rounded-lg" />
          <div className="flex-1">
            <Skeleton.Input active size="small" className="!w-24 mb-2" />
            <Skeleton.Input active size="default" className="!w-32" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-stone-200 hover:border-amber-200 transition-colors">
      <div className="flex items-start gap-4">
        {/* Icon */}
        {icon && (
          <div className={cn('flex items-center justify-center w-12 h-12 rounded-lg', iconBgClass)}>
            <span className="text-xl text-amber-600">{icon}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-500 mb-1 truncate">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">
              {prefix}
              {value}
              {suffix}
            </span>
          </div>

          {/* Trend */}
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              {trend.isPositive ? (
                <RiseOutlined className="text-emerald-500 text-xs" />
              ) : (
                <FallOutlined className="text-red-500 text-xs" />
              )}
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-xs text-stone-400">{trend.label}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SalesStats Component
 *
 * Displays summary statistics for sales performance.
 */
export function SalesStats({ className }: SalesStatsProps): React.JSX.Element {
  const t = useTranslations('sales');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const { shop } = useShop();
  const currency = shop?.currency || 'USD';

  // Get today's date range
  const today = dayjs().format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  // Fetch today's sales
  const { data: todaySales, isLoading: todayLoading } = useSalesByDateRange(today, today);

  // Fetch yesterday's sales for comparison
  const { data: yesterdaySales, isLoading: yesterdayLoading } = useSalesByDateRange(
    yesterday,
    yesterday
  );

  const isLoading = todayLoading || yesterdayLoading;

  // Calculate statistics
  const todayCount = todaySales?.length ?? 0;
  const yesterdayCount = yesterdaySales?.length ?? 0;

  const todayRevenue =
    todaySales?.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0) ?? 0;

  const yesterdayRevenue =
    yesterdaySales?.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0) ?? 0;

  const avgSaleValue = todayCount > 0 ? todayRevenue / todayCount : 0;
  const yesterdayAvg = yesterdayCount > 0 ? yesterdayRevenue / yesterdayCount : 0;

  // Calculate trends
  const countTrend =
    yesterdayCount > 0
      ? ((todayCount - yesterdayCount) / yesterdayCount) * 100
      : todayCount > 0
        ? 100
        : 0;

  const revenueTrend =
    yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : todayRevenue > 0
        ? 100
        : 0;

  const avgTrend =
    yesterdayAvg > 0
      ? ((avgSaleValue - yesterdayAvg) / yesterdayAvg) * 100
      : avgSaleValue > 0
        ? 100
        : 0;

  // Completed sales (for success rate)
  const completedToday = todaySales?.filter((s) => s.sale_status === 'completed').length ?? 0;
  const completionRate = todayCount > 0 ? (completedToday / todayCount) * 100 : 0;

  return (
    <div className={className}>
      <Row gutter={[16, 16]}>
        {/* Today's Sales Count */}
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('stats.todaySales')}
            value={formatNumber(todayCount, locale)}
            icon={<ShoppingCartOutlined />}
            iconBgClass="bg-blue-100"
            isLoading={isLoading}
            trend={
              yesterdayCount > 0 || todayCount > 0
                ? {
                    value: Math.round(countTrend),
                    isPositive: countTrend >= 0,
                    label: tCommon('time.yesterday'),
                  }
                : undefined
            }
          />
        </Col>

        {/* Today's Revenue */}
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('stats.todayRevenue')}
            value={formatCurrency(todayRevenue, currency, locale)}
            icon={<DollarOutlined />}
            iconBgClass="bg-emerald-100"
            isLoading={isLoading}
            trend={
              yesterdayRevenue > 0 || todayRevenue > 0
                ? {
                    value: Math.round(revenueTrend),
                    isPositive: revenueTrend >= 0,
                    label: tCommon('time.yesterday'),
                  }
                : undefined
            }
          />
        </Col>

        {/* Average Sale Value */}
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('stats.avgSaleValue')}
            value={formatCurrency(avgSaleValue, currency, locale)}
            icon={<CalculatorOutlined />}
            iconBgClass="bg-amber-100"
            isLoading={isLoading}
            trend={
              yesterdayAvg > 0 || avgSaleValue > 0
                ? {
                    value: Math.round(avgTrend),
                    isPositive: avgTrend >= 0,
                    label: tCommon('time.yesterday'),
                  }
                : undefined
            }
          />
        </Col>

        {/* Completion Rate */}
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('stats.completionRate')}
            value={`${Math.round(completionRate)}%`}
            icon={completionRate >= 80 ? <RiseOutlined /> : <FallOutlined />}
            iconBgClass={completionRate >= 80 ? 'bg-emerald-100' : 'bg-amber-100'}
            isLoading={isLoading}
          />
        </Col>
      </Row>
    </div>
  );
}

export default SalesStats;
