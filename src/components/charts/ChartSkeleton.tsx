'use client';

/**
 * ChartSkeleton Component
 *
 * Loading placeholder for chart components during lazy loading.
 * Provides a consistent loading experience for dynamically imported charts.
 *
 * @module components/charts/ChartSkeleton
 */

import React from 'react';

import { Card, Skeleton } from 'antd';

import { cn } from '@/lib/utils/cn';

/**
 * ChartSkeleton props
 */
export interface ChartSkeletonProps {
  /** Chart height in pixels */
  height?: number;
  /** Chart title to show while loading */
  title?: string;
  /** Additional CSS classes */
  className?: string;
  /** Type of chart being loaded */
  type?: 'line' | 'bar' | 'pie' | 'area';
}

/**
 * ChartSkeleton Component
 *
 * Displays a shimmer loading state for chart components.
 * Mimics the approximate shape of the chart being loaded.
 */
export function ChartSkeleton({
  height = 300,
  title,
  className,
  type = 'line',
}: ChartSkeletonProps): React.JSX.Element {
  const renderChartPlaceholder = () => {
    switch (type) {
      case 'pie':
        return (
          <div className="flex items-center justify-center" style={{ height }}>
            <Skeleton.Avatar active size={height * 0.6} shape="circle" />
          </div>
        );
      case 'bar':
        return (
          <div className="flex items-end justify-around gap-2 px-4" style={{ height }}>
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton.Button
                key={index}
                active
                style={{
                  width: 40,
                  height: Math.random() * (height * 0.7) + height * 0.2,
                  borderRadius: '4px 4px 0 0',
                }}
              />
            ))}
          </div>
        );
      case 'area':
      case 'line':
      default:
        return (
          <Skeleton.Node active style={{ width: '100%', height }} className="!flex !w-full">
            <div style={{ width: '100%', height }} />
          </Skeleton.Node>
        );
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {title && (
        <div className="mb-4">
          <Skeleton.Input active style={{ width: 150 }} />
        </div>
      )}
      <Card className="border-stone-200" styles={{ body: { padding: '16px' } }}>
        {renderChartPlaceholder()}
      </Card>
    </div>
  );
}

ChartSkeleton.displayName = 'ChartSkeleton';

export default ChartSkeleton;
