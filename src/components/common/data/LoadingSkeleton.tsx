'use client';

/**
 * LoadingSkeleton Component
 *
 * Shimmer loading placeholders for various content types.
 * Provides consistent loading states across the application.
 *
 * @example
 * // Table skeleton
 * <LoadingSkeleton variant="table" count={5} />
 *
 * // Stat cards skeleton
 * <LoadingSkeleton variant="stat" count={4} />
 *
 * // Form skeleton
 * <LoadingSkeleton variant="form" rows={6} />
 */

import React from 'react';

import { Card, Skeleton } from 'antd';

import { cn } from '@/lib/utils/cn';

/**
 * LoadingSkeleton props
 */
export interface LoadingSkeletonProps {
  /** Type of skeleton to render */
  variant: 'card' | 'table' | 'form' | 'stat' | 'list';
  /** Number of items for list/table/stat variants */
  count?: number;
  /** Number of rows for form variant */
  rows?: number;
  /** Additional class name */
  className?: string;
}

/**
 * Card skeleton
 */
function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card
      className={cn('border border-stone-200 bg-white', className)}
      styles={{ body: { padding: '20px' } }}
    >
      <Skeleton active avatar paragraph={{ rows: 3 }} />
    </Card>
  );
}

/**
 * Table row skeleton
 */
function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-stone-100">
      <Skeleton.Avatar active size="small" shape="circle" />
      <div className="flex-1 grid grid-cols-4 gap-4">
        <Skeleton.Input active size="small" className="!w-full" />
        <Skeleton.Input active size="small" className="!w-full" />
        <Skeleton.Input active size="small" className="!w-full" />
        <Skeleton.Input active size="small" className="!w-3/4" />
      </div>
    </div>
  );
}

/**
 * Table skeleton with header and rows
 */
function TableSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('border border-stone-200 rounded-lg bg-white overflow-hidden', className)}>
      {/* Table header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-stone-50 border-b border-stone-200">
        <div className="w-8" />
        <div className="flex-1 grid grid-cols-4 gap-4">
          <Skeleton.Input active size="small" className="!w-20 !min-w-0" />
          <Skeleton.Input active size="small" className="!w-24 !min-w-0" />
          <Skeleton.Input active size="small" className="!w-20 !min-w-0" />
          <Skeleton.Input active size="small" className="!w-16 !min-w-0" />
        </div>
      </div>

      {/* Table rows */}
      {Array.from({ length: count }).map((_, index) => (
        <TableRowSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Form field skeleton
 */
function FormFieldSkeleton({ fullWidth = false }: { fullWidth?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-2', fullWidth && 'col-span-2')}>
      <Skeleton.Input active size="small" className="!w-24 !min-w-0" />
      <Skeleton.Input active size="default" className="!w-full" />
    </div>
  );
}

/**
 * Form skeleton with multiple rows
 */
function FormSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  // Generate field configurations (some full width, some half)
  const fields: Array<{ fullWidth: boolean }> = [];
  for (let i = 0; i < rows; i++) {
    // Every 3rd row is full width
    fields.push({ fullWidth: i % 3 === 2 });
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Form fields in 2-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field, index) => (
          <FormFieldSkeleton key={index} fullWidth={field.fullWidth} />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
        <Skeleton.Button active size="default" />
        <Skeleton.Button active size="default" />
      </div>
    </div>
  );
}

/**
 * Stat card skeleton
 */
function StatSkeleton({ className }: { className?: string }) {
  return (
    <Card
      className={cn('border border-stone-200 bg-white', className)}
      styles={{ body: { padding: '20px' } }}
    >
      {/* Title */}
      <Skeleton.Input active size="small" className="!w-24 !min-w-0 mb-3" />

      {/* Value */}
      <Skeleton.Input active size="large" className="!w-32 !min-w-0 !h-9 mb-2" />

      {/* Trend */}
      <div className="flex items-center gap-2">
        <Skeleton.Button active size="small" className="!w-16 !min-w-0" />
        <Skeleton.Input active size="small" className="!w-20 !min-w-0" />
      </div>
    </Card>
  );
}

/**
 * Stat cards grid skeleton
 */
function StatGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <StatSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * List item skeleton
 */
function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-stone-100 last:border-b-0">
      <Skeleton.Avatar active size="default" shape="circle" />
      <div className="flex-1 space-y-2">
        <Skeleton.Input active size="small" className="!w-40 !min-w-0" />
        <Skeleton.Input active size="small" className="!w-24 !min-w-0" />
      </div>
      <Skeleton.Button active size="small" shape="circle" />
    </div>
  );
}

/**
 * List skeleton
 */
function ListSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('border border-stone-200 rounded-lg bg-white overflow-hidden', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <ListItemSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * LoadingSkeleton component with multiple variants
 *
 * Features:
 * - Multiple variants for different content types
 * - Configurable count/rows
 * - Shimmer animation via Ant Design Skeleton
 * - Responsive layouts
 * - RTL-compatible
 */
export function LoadingSkeleton({ variant, count = 5, rows = 4, className }: LoadingSkeletonProps) {
  switch (variant) {
    case 'card':
      return <CardSkeleton className={className} />;

    case 'table':
      return <TableSkeleton count={count} className={className} />;

    case 'form':
      return <FormSkeleton rows={rows} className={className} />;

    case 'stat':
      return <StatGridSkeleton count={count} className={className} />;

    case 'list':
      return <ListSkeleton count={count} className={className} />;

    default:
      return null;
  }
}

/**
 * Export individual skeleton components for flexibility
 */
export { CardSkeleton, TableSkeleton, FormSkeleton, StatSkeleton, StatGridSkeleton, ListSkeleton };

export default LoadingSkeleton;
