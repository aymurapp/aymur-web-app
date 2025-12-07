'use client';

/**
 * StatCard Component
 *
 * A dashboard metric card displaying a value with optional trend indicator,
 * prefix (icon/currency), and suffix.
 *
 * @example
 * <StatCard
 *   title={t('totalSales')}
 *   value="$12,450"
 *   prefix={<DollarOutlined />}
 *   trend={{ value: 12.5, direction: 'up', label: 'vs last month' }}
 *   onClick={() => navigate('/sales')}
 * />
 */

import React from 'react';

import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Card, Skeleton, Statistic } from 'antd';

import { cn } from '@/lib/utils/cn';

/**
 * Trend configuration for stat card
 */
export interface StatTrend {
  /** Percentage or absolute value of change */
  value: number;
  /** Direction of the trend */
  direction: 'up' | 'down';
  /** Optional label to display (e.g., "vs last month") */
  label?: string;
}

/**
 * StatCard props
 */
export interface StatCardProps {
  /** Card title */
  title: string;
  /** Primary value to display */
  value: string | number;
  /** Prefix element (icon or currency symbol) */
  prefix?: React.ReactNode;
  /** Suffix string (e.g., "items", "%") */
  suffix?: string;
  /** Trend indicator */
  trend?: StatTrend;
  /** Whether the card is in loading state */
  loading?: boolean;
  /** Click handler - makes card interactive */
  onClick?: () => void;
  /** Additional class name */
  className?: string;
  /** Value precision for number formatting */
  precision?: number;
  /** Custom value style */
  valueStyle?: React.CSSProperties;
  /** Whether to group digits (e.g., 1,000) */
  groupSeparator?: boolean;
}

/**
 * StatCard component for displaying dashboard metrics
 *
 * Features:
 * - Trend indicator with up/down styling
 * - Loading skeleton state
 * - Clickable for navigation
 * - Prefix icon/currency support
 * - RTL-compatible
 * - Luxury gold theme hover effects
 */
export function StatCard({
  title,
  value,
  prefix,
  suffix,
  trend,
  loading = false,
  onClick,
  className,
  precision,
  valueStyle,
  groupSeparator = true,
}: StatCardProps) {
  // Render trend indicator
  const renderTrend = () => {
    if (!trend) {
      return null;
    }

    const isPositive = trend.direction === 'up';
    const TrendIcon = isPositive ? ArrowUpOutlined : ArrowDownOutlined;
    const trendColorClass = isPositive
      ? 'text-emerald-600 bg-emerald-50'
      : 'text-red-600 bg-red-50';

    return (
      <div className="flex items-center gap-2 mt-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            trendColorClass
          )}
        >
          <TrendIcon className="text-[10px]" />
          {Math.abs(trend.value)}%
        </span>
        {trend.label && <span className="text-xs text-stone-500">{trend.label}</span>}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <Card
        className={cn('border border-stone-200 bg-white overflow-hidden', className)}
        styles={{
          body: {
            padding: '20px',
          },
        }}
      >
        <Skeleton active paragraph={false} title={{ width: '40%' }} className="mb-3" />
        <Skeleton active paragraph={false} title={{ width: '60%', style: { height: 32 } }} />
        <Skeleton
          active
          paragraph={false}
          title={{ width: '30%', style: { height: 20, marginTop: 8 } }}
        />
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'border border-stone-200 bg-white overflow-hidden',
        // Interactive hover effects when clickable
        onClick && [
          'cursor-pointer',
          'transition-all duration-300 ease-out',
          'hover:shadow-lg hover:shadow-amber-500/10',
          'hover:border-amber-300',
          'hover:-translate-y-0.5',
        ],
        className
      )}
      onClick={onClick}
      styles={{
        body: {
          padding: '20px',
        },
      }}
    >
      {/* Title */}
      <p className="text-sm font-medium text-stone-500 mb-1">{title}</p>

      {/* Value with Ant Design Statistic for formatting */}
      <Statistic
        value={value}
        prefix={prefix}
        suffix={suffix}
        precision={precision}
        groupSeparator={groupSeparator ? ',' : undefined}
        valueStyle={{
          fontSize: '28px',
          fontWeight: 600,
          color: '#1c1917', // stone-900
          lineHeight: 1.2,
          ...valueStyle,
        }}
      />

      {/* Trend indicator */}
      {renderTrend()}
    </Card>
  );
}

/**
 * StatCardGrid - Helper component for responsive stat card layouts
 */
export interface StatCardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function StatCardGrid({ children, columns = 4, className }: StatCardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return <div className={cn('grid gap-4', gridCols[columns], className)}>{children}</div>;
}

export default StatCard;
