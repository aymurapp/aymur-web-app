'use client';

/**
 * LowStockAlertWidget Component
 *
 * Dashboard widget displaying inventory items that are below their reorder threshold.
 * Currently shows empty state - real data fetching to be implemented.
 *
 * @module components/domain/dashboard/LowStockAlertWidget
 */

import React from 'react';

import { WarningOutlined } from '@ant-design/icons';
import { Card, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

/**
 * LowStockAlertWidget props
 */
export interface LowStockAlertWidgetProps {
  /** Additional class name */
  className?: string;
  /** Maximum items to show (default: 5) */
  maxItems?: number;
  /** Whether the widget is loading */
  loading?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * LowStockAlertWidget Component
 *
 * Displays inventory items below reorder threshold.
 * Shows empty state when no low stock items exist.
 */
export function LowStockAlertWidget({
  className,
  maxItems: _maxItems = 5,
  loading = false,
}: LowStockAlertWidgetProps): React.JSX.Element {
  const t = useTranslations('dashboard');

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
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50">
            <WarningOutlined className="text-lg text-amber-600" />
          </div>
          <h3 className="text-base font-semibold text-stone-900">{t('lowStock.title')}</h3>
        </div>
      </div>

      {/* Empty State */}
      <div className="px-5 py-6">
        <EmptyState
          icon={<WarningOutlined />}
          title={t('lowStock.noLowStock')}
          description={t('lowStock.noLowStockDesc')}
          size="sm"
        />
      </div>
    </Card>
  );
}

export default LowStockAlertWidget;
