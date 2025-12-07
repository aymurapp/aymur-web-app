'use client';

/**
 * DashboardGrid Component
 *
 * A responsive grid layout system for organizing dashboard widgets.
 * Provides consistent styling and behavior for dashboard components.
 *
 * Features:
 * - Responsive grid layout (1 col mobile, 2 col tablet, 3-4 col desktop)
 * - Widget slots with configurable sizes (sm, md, lg, full)
 * - Collapsible widgets with persistent state
 * - Loading skeleton for widgets
 * - RTL support with logical CSS properties
 * - Luxury gold-themed styling
 *
 * @module components/domain/dashboard/DashboardGrid
 */

import React, { useState, useCallback, useId } from 'react';

import { DownOutlined, UpOutlined, ReloadOutlined } from '@ant-design/icons';
import { Card, Skeleton, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Widget size options
 * - sm: Small widget (1 column on all breakpoints)
 * - md: Medium widget (1 column mobile, 1 column tablet, 1 column desktop)
 * - lg: Large widget (1 column mobile, 2 columns tablet+)
 * - full: Full width widget (spans all columns)
 */
export type WidgetSize = 'sm' | 'md' | 'lg' | 'full';

/**
 * Props for the DashboardGrid container
 */
export interface DashboardGridProps {
  /** Grid children (DashboardWidget components) */
  children: React.ReactNode;
  /** Additional class name for custom styling */
  className?: string;
}

/**
 * Props for the DashboardWidget component
 */
export interface DashboardWidgetProps {
  /** Widget title (required, should be translated) */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Widget size: 'sm' | 'md' | 'lg' | 'full' */
  size?: WidgetSize;
  /** Whether the widget can be collapsed */
  collapsible?: boolean;
  /** Initial collapsed state (only used if collapsible is true) */
  defaultCollapsed?: boolean;
  /** Whether the widget is in loading state */
  loading?: boolean;
  /** Icon to display in the widget header */
  icon?: React.ReactNode;
  /** Additional actions to display in the header (e.g., buttons, links) */
  actions?: React.ReactNode;
  /** Optional callback when refresh is clicked (shows refresh button if provided) */
  onRefresh?: () => void;
  /** Whether refresh is in progress */
  isRefreshing?: boolean;
  /** Widget content */
  children: React.ReactNode;
  /** Additional class name for custom styling */
  className?: string;
  /** Custom header class name */
  headerClassName?: string;
  /** Custom body class name */
  bodyClassName?: string;
}

/**
 * Props for the WidgetSkeleton component
 */
export interface WidgetSkeletonProps {
  /** Widget size for proper column span */
  size?: WidgetSize;
  /** Number of skeleton paragraph rows */
  rows?: number;
  /** Whether to show a skeleton title */
  showTitle?: boolean;
  /** Whether to show a skeleton avatar/icon */
  showIcon?: boolean;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// GRID SIZE MAPPINGS
// =============================================================================

/**
 * CSS class mappings for widget sizes
 * Using Tailwind grid column span classes
 */
const sizeClasses: Record<WidgetSize, string> = {
  sm: 'col-span-1',
  md: 'col-span-1 lg:col-span-1',
  lg: 'col-span-1 md:col-span-2 lg:col-span-2',
  full: 'col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4',
};

// =============================================================================
// DASHBOARD GRID COMPONENT
// =============================================================================

/**
 * DashboardGrid Component
 *
 * Main container for dashboard widgets. Provides responsive grid layout
 * with consistent spacing and alignment.
 *
 * @example
 * ```tsx
 * <DashboardGrid>
 *   <DashboardWidget title={t('sales')} size="lg">
 *     <SalesChart />
 *   </DashboardWidget>
 *   <DashboardWidget title={t('activity')} size="md">
 *     <ActivityFeed />
 *   </DashboardWidget>
 * </DashboardGrid>
 * ```
 */
export function DashboardGrid({ children, className }: DashboardGridProps): React.JSX.Element {
  return (
    <div
      className={cn(
        // Base grid layout
        'grid gap-4 md:gap-5 lg:gap-6',
        // Responsive columns: 1 on mobile, 2 on tablet, 3 on desktop, 4 on xl
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        // Auto-row sizing for consistent card heights within rows
        'auto-rows-auto',
        className
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// DASHBOARD WIDGET COMPONENT
// =============================================================================

/**
 * DashboardWidget Component
 *
 * Individual widget wrapper with card styling, collapsible functionality,
 * and loading states. Designed for use within DashboardGrid.
 *
 * @example
 * ```tsx
 * <DashboardWidget
 *   title={t('recentActivity')}
 *   subtitle={t('last24Hours')}
 *   icon={<HistoryOutlined />}
 *   size="lg"
 *   collapsible
 *   actions={<Button size="small">{t('viewAll')}</Button>}
 * >
 *   <ActivityList />
 * </DashboardWidget>
 * ```
 */
export function DashboardWidget({
  title,
  subtitle,
  size = 'md',
  collapsible = false,
  defaultCollapsed = false,
  loading = false,
  icon,
  actions,
  onRefresh,
  isRefreshing = false,
  children,
  className,
  headerClassName,
  bodyClassName,
}: DashboardWidgetProps): React.JSX.Element {
  const t = useTranslations('dashboard.widgets');
  const widgetId = useId();

  // Collapsed state management
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Toggle collapse handler
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // Render loading skeleton
  if (loading) {
    return (
      <div className={cn(sizeClasses[size], className)}>
        <Card
          className="border border-stone-200 bg-white h-full"
          styles={{
            body: { padding: 0 },
          }}
        >
          {/* Header skeleton */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
            <Skeleton.Avatar active size="default" shape="square" />
            <div className="flex-1">
              <Skeleton.Input active size="small" style={{ width: 120 }} />
            </div>
          </div>
          {/* Body skeleton */}
          <div className="p-5">
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn(sizeClasses[size], className)}>
      <Card
        className={cn(
          'border border-stone-200 bg-white h-full',
          'transition-all duration-300 ease-out',
          'hover:shadow-md hover:shadow-stone-200/50'
        )}
        styles={{
          body: { padding: 0 },
        }}
      >
        {/* Widget Header */}
        <div
          className={cn(
            'flex items-center justify-between gap-3 px-5 py-4',
            !isCollapsed && 'border-b border-stone-100',
            headerClassName
          )}
        >
          {/* Left side: Icon + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {icon && (
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 shrink-0">
                <span className="text-lg text-amber-600">{icon}</span>
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-stone-900 truncate">{title}</h3>
              {subtitle && <p className="text-sm text-stone-500 truncate">{subtitle}</p>}
            </div>
          </div>

          {/* Right side: Actions + Collapse toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Refresh button */}
            {onRefresh && (
              <Tooltip title={t('refresh')}>
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined spin={isRefreshing} />}
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="text-stone-500 hover:text-amber-600"
                  aria-label={t('refresh')}
                />
              </Tooltip>
            )}

            {/* Custom actions */}
            {actions}

            {/* Collapse toggle */}
            {collapsible && (
              <Tooltip title={isCollapsed ? t('expand') : t('collapse')}>
                <Button
                  type="text"
                  size="small"
                  icon={isCollapsed ? <DownOutlined /> : <UpOutlined />}
                  onClick={handleToggleCollapse}
                  className="text-stone-500 hover:text-amber-600"
                  aria-expanded={!isCollapsed}
                  aria-controls={`widget-body-${widgetId}`}
                  aria-label={isCollapsed ? t('expand') : t('collapse')}
                />
              </Tooltip>
            )}
          </div>
        </div>

        {/* Widget Body (collapsible) */}
        <div
          id={`widget-body-${widgetId}`}
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100',
            bodyClassName
          )}
          aria-hidden={isCollapsed}
        >
          <div className="p-5">{children}</div>
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// WIDGET SKELETON COMPONENT
// =============================================================================

/**
 * WidgetSkeleton Component
 *
 * Loading placeholder for dashboard widgets. Provides consistent
 * skeleton styling while data is being fetched.
 *
 * @example
 * ```tsx
 * {isLoading ? (
 *   <WidgetSkeleton size="lg" rows={5} showIcon />
 * ) : (
 *   <DashboardWidget title={t('sales')} size="lg">
 *     <SalesData />
 *   </DashboardWidget>
 * )}
 * ```
 */
export function WidgetSkeleton({
  size = 'md',
  rows = 4,
  showTitle = true,
  showIcon = true,
  className,
}: WidgetSkeletonProps): React.JSX.Element {
  return (
    <div className={cn(sizeClasses[size], className)}>
      <Card
        className="border border-stone-200 bg-white h-full"
        styles={{
          body: { padding: 0 },
        }}
      >
        {/* Header skeleton */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
          {showIcon && <Skeleton.Avatar active size={40} shape="square" className="!rounded-lg" />}
          <div className="flex-1 space-y-2">
            {showTitle && <Skeleton.Input active size="small" className="!w-32 !min-w-0" />}
            <Skeleton.Input active size="small" className="!w-24 !min-w-0 !h-4" />
          </div>
          <Skeleton.Button active size="small" shape="circle" />
        </div>

        {/* Body skeleton */}
        <div className="p-5">
          <Skeleton active paragraph={{ rows }} title={false} />
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default DashboardGrid;
