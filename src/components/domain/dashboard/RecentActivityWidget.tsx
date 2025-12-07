'use client';

/**
 * RecentActivityWidget Component
 *
 * Dashboard widget displaying recent shop activity in a timeline format.
 * Shows recent sales, inventory changes, and customer additions.
 *
 * Features:
 * - Timeline format with icons and timestamps
 * - Activity type icons (sale, inventory, customer)
 * - Relative timestamps (e.g., "2 hours ago")
 * - "View All" link to audit log
 * - Uses mock data for demonstration
 * - RTL-compatible with logical CSS properties
 *
 * @module components/domain/dashboard/RecentActivityWidget
 */

import React, { useMemo } from 'react';

import {
  ShoppingOutlined,
  InboxOutlined,
  UserAddOutlined,
  SwapOutlined,
  HistoryOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Card, Timeline, Skeleton, Tag } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Activity type
 */
type ActivityType = 'sale' | 'inventory_add' | 'inventory_update' | 'customer_add' | 'transfer';

/**
 * Activity item
 */
interface ActivityItem {
  /** Unique ID */
  id: string;
  /** Type of activity */
  type: ActivityType;
  /** Activity title */
  title: string;
  /** Activity description */
  description: string;
  /** Timestamp of the activity */
  timestamp: Date;
  /** Optional amount (for sales) */
  amount?: number;
  /** Optional user who performed the action */
  user?: string;
}

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
// MOCK DATA
// =============================================================================

/**
 * Generate mock activity data for demonstration
 */
function generateMockActivities(): ActivityItem[] {
  const now = new Date();

  return [
    {
      id: '1',
      type: 'sale',
      title: 'New Sale #1234',
      description: '18K Gold Ring sold to Ahmed Al-Farsi',
      timestamp: new Date(now.getTime() - 25 * 60 * 1000), // 25 minutes ago
      amount: 1250,
      user: 'Mohamed',
    },
    {
      id: '2',
      type: 'inventory_add',
      title: 'Inventory Added',
      description: '5 items added from supplier "Golden Dreams"',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      user: 'Fatima',
    },
    {
      id: '3',
      type: 'customer_add',
      title: 'New Customer',
      description: 'Layla Hassan registered',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      user: 'Omar',
    },
    {
      id: '4',
      type: 'sale',
      title: 'New Sale #1233',
      description: '22K Gold Necklace sold to Youssef Mahmoud',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
      amount: 3500,
      user: 'Mohamed',
    },
    {
      id: '5',
      type: 'inventory_update',
      title: 'Price Updated',
      description: 'Updated prices for 12 gold items',
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000), // 8 hours ago
      user: 'Admin',
    },
    {
      id: '6',
      type: 'transfer',
      title: 'Stock Transfer',
      description: '3 items transferred to Branch B',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      user: 'Fatima',
    },
  ];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get icon for activity type
 */
function getActivityIcon(type: ActivityType): React.ReactNode {
  const iconClass = 'text-base';

  switch (type) {
    case 'sale':
      return <ShoppingOutlined className={cn(iconClass, 'text-amber-600')} />;
    case 'inventory_add':
      return <InboxOutlined className={cn(iconClass, 'text-emerald-600')} />;
    case 'inventory_update':
      return <InboxOutlined className={cn(iconClass, 'text-blue-600')} />;
    case 'customer_add':
      return <UserAddOutlined className={cn(iconClass, 'text-violet-600')} />;
    case 'transfer':
      return <SwapOutlined className={cn(iconClass, 'text-cyan-600')} />;
    default:
      return <HistoryOutlined className={cn(iconClass, 'text-stone-600')} />;
  }
}

/**
 * Get color for activity type
 */
function getActivityColor(type: ActivityType): string {
  switch (type) {
    case 'sale':
      return 'amber';
    case 'inventory_add':
      return 'emerald';
    case 'inventory_update':
      return 'blue';
    case 'customer_add':
      return 'violet';
    case 'transfer':
      return 'cyan';
    default:
      return 'stone';
  }
}

/**
 * Format relative timestamp
 */
function formatRelativeTime(date: Date, t: ReturnType<typeof useTranslations>): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return t('recentActivity.justNow');
  }
  if (diffMins < 60) {
    return t('recentActivity.minutesAgo', { count: diffMins });
  }
  if (diffHours < 24) {
    return t('recentActivity.hoursAgo', { count: diffHours });
  }
  if (diffDays === 1) {
    return t('recentActivity.yesterday');
  }
  return t('recentActivity.daysAgo', { count: diffDays });
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * RecentActivityWidget Component
 *
 * Displays recent shop activity in a timeline format with icons and timestamps.
 */
export function RecentActivityWidget({
  className,
  maxItems = 5,
  loading = false,
}: RecentActivityWidgetProps): React.JSX.Element {
  const t = useTranslations('dashboard');

  // Mock data - in production this would come from a hook
  const activities = useMemo(() => {
    const allActivities = generateMockActivities();
    return allActivities.slice(0, maxItems);
  }, [maxItems]);

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
          <Skeleton active paragraph={false} title={{ width: '50%' }} />
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton.Avatar active size="small" />
                <div className="flex-1">
                  <Skeleton
                    active
                    paragraph={{ rows: 1, width: ['80%'] }}
                    title={{ width: '60%' }}
                  />
                </div>
              </div>
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
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-stone-100">
            <HistoryOutlined className="text-lg text-stone-600" />
          </div>
          <h3 className="text-base font-semibold text-stone-900">{t('recentActivity.title')}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {activities.length === 0 ? (
          <EmptyState
            icon={<HistoryOutlined />}
            title={t('recentActivity.noActivity')}
            description={t('recentActivity.noActivityDesc')}
            size="sm"
          />
        ) : (
          <Timeline
            className="mt-1"
            items={activities.map((activity) => ({
              key: activity.id,
              dot: (
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full',
                    `bg-${getActivityColor(activity.type)}-50`
                  )}
                  style={{
                    backgroundColor:
                      activity.type === 'sale'
                        ? '#fef3c7'
                        : activity.type === 'inventory_add'
                          ? '#d1fae5'
                          : activity.type === 'inventory_update'
                            ? '#dbeafe'
                            : activity.type === 'customer_add'
                              ? '#ede9fe'
                              : activity.type === 'transfer'
                                ? '#cffafe'
                                : '#f5f5f4',
                  }}
                >
                  {getActivityIcon(activity.type)}
                </div>
              ),
              children: (
                <div className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-stone-900">{activity.title}</span>
                        {activity.amount && (
                          <Tag color="gold" className="m-0">
                            {formatCurrency(activity.amount)}
                          </Tag>
                        )}
                      </div>
                      <p className="text-sm text-stone-500 mt-0.5 truncate">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-stone-400">
                      {formatRelativeTime(activity.timestamp, t)}
                    </span>
                    {activity.user && (
                      <>
                        <span className="text-xs text-stone-300">|</span>
                        <span className="text-xs text-stone-400">
                          {t('recentActivity.by')} {activity.user}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ),
            }))}
          />
        )}
      </div>

      {/* Footer with View All Link */}
      {activities.length > 0 && (
        <div className="px-5 py-3 border-t border-stone-100">
          <Link
            href="/settings/audit"
            className="flex items-center justify-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            {t('recentActivity.viewAll')}
            <RightOutlined className="text-xs" />
          </Link>
        </div>
      )}
    </Card>
  );
}

export default RecentActivityWidget;
