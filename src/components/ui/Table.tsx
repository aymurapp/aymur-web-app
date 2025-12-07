'use client';

/**
 * Table Component
 *
 * A server-paginated table wrapper around Ant Design Table.
 * Supports controlled pagination, loading states, and custom styling.
 *
 * @example
 * <Table
 *   dataSource={data}
 *   columns={columns}
 *   loading={isLoading}
 *   pagination={{
 *     current: page,
 *     pageSize: pageSize,
 *     total: totalCount,
 *     onChange: (page, pageSize) => {
 *       setPage(page);
 *       setPageSize(pageSize);
 *     }
 *   }}
 * />
 */

import React from 'react';

import { Table as AntTable, Empty } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';

import type { TableProps as AntTableProps, TablePaginationConfig } from 'antd';

/**
 * Server pagination configuration
 */
export interface ServerPaginationConfig {
  /** Current page number (1-indexed) */
  current: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items on the server */
  total: number;
  /** Callback when page or pageSize changes */
  onChange: (page: number, pageSize: number) => void;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Whether to show size changer dropdown */
  showSizeChanger?: boolean;
  /** Whether to show quick jumper input */
  showQuickJumper?: boolean;
  /** Whether to show total count */
  showTotal?: boolean;
}

/**
 * Extended Table props with server pagination support
 */
export interface TableProps<T> extends Omit<AntTableProps<T>, 'pagination'> {
  /**
   * Server-side pagination configuration.
   * If provided, the table will use controlled pagination.
   */
  pagination?: ServerPaginationConfig | false;

  /**
   * Additional class name for styling
   */
  className?: string;

  /**
   * Custom empty state component or message
   */
  emptyText?: React.ReactNode;

  /**
   * Whether to show striped rows
   * @default false
   */
  striped?: boolean;

  /**
   * Whether to highlight rows on hover
   * @default true
   */
  highlightOnHover?: boolean;
}

/**
 * Server-paginated Table component
 *
 * Features:
 * - Controlled server-side pagination
 * - Loading state with skeleton effect
 * - RTL-compatible styling
 * - Gold-themed hover effects
 * - Custom empty states
 */
export function Table<T extends object>({
  pagination,
  className,
  emptyText,
  striped = false,
  highlightOnHover = true,
  loading,
  locale,
  rowClassName,
  ...props
}: TableProps<T>) {
  const t = useTranslations('common');

  // Build pagination config for Ant Design
  const paginationConfig: TablePaginationConfig | false = React.useMemo(() => {
    if (pagination === false) {
      return false;
    }

    if (!pagination) {
      return false;
    }

    return {
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: pagination.total,
      onChange: pagination.onChange,
      onShowSizeChange: pagination.onChange,
      pageSizeOptions: pagination.pageSizeOptions || [10, 20, 50, 100],
      showSizeChanger: pagination.showSizeChanger ?? true,
      showQuickJumper: pagination.showQuickJumper ?? false,
      showTotal:
        pagination.showTotal !== false
          ? (total: number, range: [number, number]) =>
              t('pagination.showTotal', {
                start: range[0],
                end: range[1],
                total,
              })
          : undefined,
      position: ['bottomRight'] as TablePaginationConfig['position'],
      // Responsive hide size changer on mobile
      responsive: true,
    };
  }, [pagination, t]);

  // Custom row class name with striped and hover support
  const getRowClassName = React.useCallback(
    (record: T, index: number, indent: number) => {
      const classes: string[] = [];

      // Striped rows
      if (striped && index % 2 === 1) {
        classes.push('bg-stone-50');
      }

      // Highlight on hover
      if (highlightOnHover) {
        classes.push('hover:bg-amber-50/50 transition-colors duration-150');
      }

      // Call original rowClassName if provided
      if (typeof rowClassName === 'function') {
        const customClass = rowClassName(record, index, indent);
        if (customClass) {
          classes.push(customClass);
        }
      } else if (typeof rowClassName === 'string') {
        classes.push(rowClassName);
      }

      return cn(classes);
    },
    [striped, highlightOnHover, rowClassName]
  );

  // Custom locale with empty state
  const tableLocale = React.useMemo(
    () => ({
      ...locale,
      emptyText: emptyText || (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('table.noData')}
          className="py-8"
        />
      ),
    }),
    [locale, emptyText, t]
  );

  return (
    <AntTable
      loading={loading}
      pagination={paginationConfig}
      locale={tableLocale}
      rowClassName={getRowClassName}
      className={cn(
        // Base styling
        'w-full',
        // Custom scrollbar styling
        '[&_.ant-table-body]:scrollbar-thin',
        '[&_.ant-table-body]:scrollbar-thumb-stone-300',
        '[&_.ant-table-body]:scrollbar-track-stone-100',
        // Header styling
        '[&_.ant-table-thead>tr>th]:font-semibold',
        '[&_.ant-table-thead>tr>th]:text-stone-700',
        // Selection column styling
        '[&_.ant-table-selection-column]:w-12',
        // Action column styling (last column)
        '[&_.ant-table-cell:last-child]:text-end',
        className
      )}
      {...props}
    />
  );
}

// Re-export commonly used types
export type { ColumnsType, ColumnType } from 'antd/es/table';

export default Table;
