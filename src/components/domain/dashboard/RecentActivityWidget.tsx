'use client';

/**
 * RecentActivityWidget Component
 *
 * Dashboard widget displaying recent shop activity in a timeline format.
 * Currently shows empty state - real data fetching to be implemented.
 *
 * @module components/domain/dashboard/RecentActivityWidget
 */

import React from 'react';

import { HistoryOutlined } from '@ant-design/icons';
import { Card, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

/**
 * RecentActivityWidget props
 */
export interface RecentActivityWidgetProps {
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
 * RecentActivityWidget Component
 *
 * Displays recent shop activity in a timeline format.
 * Currently shows empty state - real data fetching to be implemented.
 */
export function RecentActivityWidget({
  className,
  maxItems: _maxItems = 5,
  loading = false,
}: RecentActivityWidgetProps): React.JSX.Element {
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
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-stone-100">
            <HistoryOutlined className="text-lg text-stone-600" />
          </div>
          <h3 className="text-base font-semibold text-stone-900">{t('recentActivity.title')}</h3>
        </div>
      </div>

      {/* Empty State */}
      <div className="px-5 py-6">
        <EmptyState
          icon={<HistoryOutlined />}
          title={t('recentActivity.noActivity')}
          description={t('recentActivity.noActivityDesc')}
          size="sm"
        />
      </div>
    </Card>
  );
}

export default RecentActivityWidget;
