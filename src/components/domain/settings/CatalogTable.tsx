'use client';

/**
 * CatalogTable Component
 *
 * A reusable table component for displaying catalog items (categories, metals, etc.)
 * with built-in support for actions, reordering, and CRUD operations.
 *
 * Features:
 * - Customizable columns
 * - Row actions (Edit, Delete)
 * - Drag & drop reordering (optional)
 * - Permission-aware actions
 * - Loading and empty states
 * - RTL support
 *
 * @module components/domain/settings/CatalogTable
 */

import React, { useMemo, useCallback } from 'react';

import { EditOutlined, DeleteOutlined, HolderOutlined, MoreOutlined } from '@ant-design/icons';
import { Table, Button, Dropdown, Popconfirm, Typography, Tag } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';

import type { MenuProps } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Action configuration for table rows
 */
export interface CatalogAction<T> {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (record: T) => void;
  danger?: boolean;
  permission?: string;
  confirm?: {
    title: string;
    description?: string;
  };
  disabled?: (record: T) => boolean;
}

/**
 * Column definition extending Ant Design columns
 */
export interface CatalogColumn<T> extends Omit<ColumnType<T>, 'render'> {
  key: string;
  title: string;
  dataIndex?: string | string[];
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  width?: number | string;
}

/**
 * CatalogTable props
 */
export interface CatalogTableProps<T extends { id?: string; sort_order?: number | null }> {
  /** Data source for the table */
  dataSource: T[];
  /** Column definitions */
  columns: CatalogColumn<T>[];
  /** Unique key field for rows */
  rowKey: keyof T;
  /** Row actions configuration */
  actions?: CatalogAction<T>[];
  /** Loading state */
  loading?: boolean;
  /** Enable drag & drop reordering */
  reorderable?: boolean;
  /** Callback when order changes */
  onReorder?: (items: T[]) => void;
  /** Permission required to manage items */
  permission?: string;
  /** Empty state configuration */
  empty?: {
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  /** Additional class name */
  className?: string;
  /** Show sort order column */
  showSortOrder?: boolean;
  /** Table size */
  size?: 'small' | 'middle' | 'large';
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * CatalogTable - Reusable table for catalog settings
 */
export function CatalogTable<T extends { id?: string; sort_order?: number | null }>({
  dataSource,
  columns,
  rowKey,
  actions = [],
  loading = false,
  reorderable = false,
  onReorder: _onReorder,
  permission = 'catalog.manage',
  empty,
  className,
  showSortOrder = false,
  size = 'middle',
}: CatalogTableProps<T>): React.JSX.Element {
  const t = useTranslations('common');
  const tSettings = useTranslations('settings');
  const { can } = usePermissions();

  const hasManagePermission = can(permission);

  // Build columns with optional drag handle and actions
  const tableColumns = useMemo((): ColumnsType<T> => {
    const cols: ColumnsType<T> = [];

    // Add drag handle column if reorderable
    if (reorderable && hasManagePermission) {
      cols.push({
        key: 'drag-handle',
        title: '',
        width: 40,
        className: 'drag-handle-column',
        render: () => (
          <HolderOutlined className="cursor-move text-stone-400 hover:text-stone-600" />
        ),
      });
    }

    // Add sort order column if enabled
    if (showSortOrder) {
      cols.push({
        key: 'sort_order',
        title: '#',
        dataIndex: 'sort_order',
        width: 60,
        render: (value: number | null) => (
          <Text type="secondary" className="text-xs">
            {value ?? '-'}
          </Text>
        ),
      });
    }

    // Add user-defined columns
    cols.push(
      ...columns.map((col) => ({
        ...col,
        key: col.key,
        title: col.title,
        dataIndex: col.dataIndex,
        width: col.width,
        render: col.render as ColumnType<T>['render'],
      }))
    );

    // Add actions column if there are actions and user has permission
    if (actions.length > 0 && hasManagePermission) {
      cols.push({
        key: 'actions',
        title: '',
        width: 60,
        fixed: 'right' as const,
        render: (_: unknown, record: T) => {
          // Filter actions based on permissions and disabled state
          const visibleActions = actions.filter((action) => {
            if (action.permission && !can(action.permission)) {
              return false;
            }
            return true;
          });

          if (visibleActions.length === 0) {
            return null;
          }

          const menuItems: MenuProps['items'] = visibleActions.map((action) => {
            const isDisabled = action.disabled?.(record);

            return {
              key: action.key,
              icon: action.icon,
              label: action.confirm ? (
                <Popconfirm
                  title={action.confirm.title}
                  description={action.confirm.description}
                  onConfirm={() => action.onClick(record)}
                  okText={t('actions.confirm')}
                  cancelText={t('actions.cancel')}
                  okButtonProps={{ danger: action.danger }}
                >
                  <span className="block w-full">{action.label}</span>
                </Popconfirm>
              ) : (
                action.label
              ),
              danger: action.danger,
              disabled: isDisabled,
              onClick: action.confirm ? undefined : () => action.onClick(record),
            };
          });

          return (
            <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
              <Button
                type="text"
                icon={<MoreOutlined />}
                className="hover:bg-stone-100"
                aria-label={t('actions.showMore')}
              />
            </Dropdown>
          );
        },
      });
    }

    return cols;
  }, [columns, actions, reorderable, showSortOrder, hasManagePermission, can, t]);

  // Handle empty state
  const emptyStateRender = useCallback(() => {
    if (empty) {
      return (
        <EmptyState
          icon={empty.icon}
          title={empty.title || t('messages.noData')}
          description={empty.description}
          action={
            empty.action && hasManagePermission
              ? {
                  label: empty.action.label,
                  onClick: empty.action.onClick,
                }
              : undefined
          }
          size="md"
        />
      );
    }

    return (
      <EmptyState
        title={t('messages.noData')}
        description={tSettings('catalog.noItems')}
        size="md"
      />
    );
  }, [empty, t, tSettings, hasManagePermission]);

  return (
    <div className={cn('catalog-table', className)}>
      <Table
        dataSource={dataSource}
        columns={tableColumns}
        rowKey={rowKey as string}
        loading={loading}
        pagination={false}
        size={size}
        locale={{
          emptyText: emptyStateRender(),
        }}
        className="border border-stone-200 rounded-lg overflow-hidden"
        rowClassName="hover:bg-amber-50/30 transition-colors"
      />
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Color indicator component for displaying color swatches
 */
export function ColorIndicator({
  color,
  size = 'default',
}: {
  color: string;
  size?: 'small' | 'default' | 'large';
}): React.JSX.Element {
  const sizeClasses = {
    small: 'w-4 h-4',
    default: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  return (
    <div
      className={cn('rounded-full border-2 border-white shadow-sm', sizeClasses[size])}
      style={{ backgroundColor: color }}
      aria-label={`Color: ${color}`}
    />
  );
}

/**
 * Category badge component
 */
export function CategoryBadge({
  category,
  className,
}: {
  category: string;
  className?: string;
}): React.JSX.Element {
  const colorMap: Record<string, string> = {
    precious: 'gold',
    'semi-precious': 'blue',
    organic: 'green',
    synthetic: 'purple',
    other: 'default',
  };

  return (
    <Tag color={colorMap[category] || 'default'} className={className}>
      {category}
    </Tag>
  );
}

/**
 * Percentage display component
 */
export function PercentageDisplay({
  value,
  suffix = '%',
}: {
  value: number;
  suffix?: string;
}): React.JSX.Element {
  return (
    <Text className="font-mono">
      {value.toFixed(2)}
      {suffix}
    </Text>
  );
}

// =============================================================================
// DEFAULT ACTIONS FACTORY
// =============================================================================

/**
 * Create default edit and delete actions
 */
export function createDefaultActions<T>(
  onEdit: (record: T) => void,
  onDelete: (record: T) => void,
  t: ReturnType<typeof useTranslations>
): CatalogAction<T>[] {
  return [
    {
      key: 'edit',
      label: t('actions.edit'),
      icon: <EditOutlined />,
      onClick: onEdit,
    },
    {
      key: 'delete',
      label: t('actions.delete'),
      icon: <DeleteOutlined />,
      onClick: onDelete,
      danger: true,
      confirm: {
        title: t('messages.confirmDelete'),
      },
    },
  ];
}

export default CatalogTable;
