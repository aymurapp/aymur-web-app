'use client';

/**
 * DataTable Component
 *
 * A full-featured, mobile-responsive data table built on top of the UI Table component.
 * Includes search, filters, row actions with permission support, and mobile card view.
 *
 * Mobile Features:
 * - Horizontal scroll wrapper for small screens
 * - Toggle between table and card view on mobile
 * - Touch-friendly 44px minimum tap targets
 * - Responsive header layout
 *
 * @example
 * <DataTable
 *   dataSource={items}
 *   columns={columns}
 *   searchable
 *   searchPlaceholder={t('search')}
 *   onSearch={handleSearch}
 *   mobileCardRender={(record) => <ItemCard item={record} />}
 *   actions={[
 *     { key: 'edit', label: t('edit'), icon: <EditOutlined />, onClick: handleEdit },
 *     { key: 'delete', label: t('delete'), icon: <DeleteOutlined />, onClick: handleDelete, danger: true }
 *   ]}
 *   filters={[
 *     { key: 'status', label: t('status'), type: 'select', options: statusOptions }
 *   ]}
 * />
 */

import React, { useMemo, useCallback, useState } from 'react';

import {
  SearchOutlined,
  MoreOutlined,
  FilterOutlined,
  TableOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { Input, Dropdown, Button, Popconfirm, Flex, Segmented } from 'antd';
import { useTranslations } from 'next-intl';

import { Table } from '@/components/ui/Table';
import type { TableProps } from '@/components/ui/Table';
import { usePermissions } from '@/lib/hooks/permissions';
import { useMobile } from '@/lib/hooks/utils/useMediaQuery';
import { cn } from '@/lib/utils/cn';

import { EmptyState } from './EmptyState';
import { FilterPanel, type FilterConfig } from './FilterPanel';

import type { MenuProps } from 'antd';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum touch target size (WCAG 2.1 Level AAA) */
const MIN_TOUCH_TARGET = 44;

/** View mode options */
type ViewMode = 'table' | 'card';

/**
 * Confirmation dialog configuration
 */
export interface ConfirmConfig {
  /** Title of the confirm dialog */
  title: string;
  /** Description text */
  description?: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
}

/**
 * Row action configuration
 */
export interface ActionConfig<T> {
  /** Unique key for the action */
  key: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Click handler */
  onClick: (record: T) => void;
  /** Required permission to show this action */
  permission?: string;
  /** Whether this is a dangerous action (red styling) */
  danger?: boolean;
  /** Confirmation dialog before executing */
  confirm?: ConfirmConfig;
  /** Whether the action is disabled */
  disabled?: boolean | ((record: T) => boolean);
  /** Whether to hide the action entirely */
  hidden?: boolean | ((record: T) => boolean);
}

/**
 * DataTable props extending the base Table props
 */
export interface DataTableProps<T extends object> extends Omit<TableProps<T>, 'locale'> {
  /** Row actions dropdown configuration */
  actions?: ActionConfig<T>[];
  /** Filter panel configuration */
  filters?: FilterConfig[];
  /** Current filter values */
  filterValues?: Record<string, unknown>;
  /** Callback when filters change */
  onFilterChange?: (values: Record<string, unknown>) => void;
  /** Whether to show search input */
  searchable?: boolean;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Current search value */
  searchValue?: string;
  /** Callback when search value changes */
  onSearch?: (value: string) => void;
  /** Debounce delay for search in ms */
  searchDebounce?: number;
  /** Title for empty state */
  emptyTitle?: string;
  /** Description for empty state */
  emptyDescription?: string;
  /** Action button for empty state */
  emptyAction?: React.ReactNode;
  /** Custom empty state icon */
  emptyIcon?: React.ReactNode;
  /** Header content to show before search/filters */
  headerStart?: React.ReactNode;
  /** Header content to show after search/filters */
  headerEnd?: React.ReactNode;
  /** Whether to show the table header */
  showHeader?: boolean;
  /** Additional class for the wrapper */
  wrapperClassName?: string;

  // =============================================================================
  // MOBILE-SPECIFIC PROPS
  // =============================================================================

  /**
   * Custom render function for mobile card view.
   * When provided, enables the table/card view toggle on mobile.
   */
  mobileCardRender?: (record: T, index: number, actions?: ActionConfig<T>[]) => React.ReactNode;

  /**
   * Whether to show the view mode toggle on mobile.
   * Only shown if mobileCardRender is provided.
   * @default true
   */
  showViewToggle?: boolean;

  /**
   * Default view mode on mobile.
   * @default 'card'
   */
  defaultMobileView?: ViewMode;

  /**
   * Whether to enable horizontal scroll on small screens.
   * @default true
   */
  horizontalScroll?: boolean;

  /**
   * Minimum width for the table content before scrolling.
   * @default 800
   */
  minTableWidth?: number;

  /**
   * Key extractor for card view (uses rowKey by default)
   */
  cardKeyExtractor?: (record: T, index: number) => string | number;
}

/**
 * Full-featured DataTable component
 *
 * Features:
 * - Search input with debounce
 * - Filter panel with multiple filter types
 * - Row actions dropdown with permissions
 * - Confirmation dialogs for dangerous actions
 * - Empty state with custom content
 * - RTL-compatible layout
 * - Mobile card view with toggle
 * - Horizontal scroll wrapper for tables
 * - Touch-friendly tap targets
 */
export function DataTable<T extends object>({
  dataSource,
  columns,
  actions,
  filters,
  filterValues,
  onFilterChange,
  searchable = false,
  searchPlaceholder,
  searchValue: controlledSearchValue,
  onSearch,
  searchDebounce = 300,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyIcon,
  headerStart,
  headerEnd,
  showHeader = true,
  wrapperClassName,
  loading,
  rowKey = 'id',
  // Mobile-specific props
  mobileCardRender,
  showViewToggle = true,
  defaultMobileView = 'card',
  horizontalScroll = true,
  minTableWidth = 800,
  cardKeyExtractor,
  ...tableProps
}: DataTableProps<T>) {
  const t = useTranslations('common');
  const { can } = usePermissions();
  const isMobile = useMobile();

  // View mode state (table or card)
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMobileView);

  // Internal search state for uncontrolled mode
  const [internalSearchValue, setInternalSearchValue] = useState('');
  const searchValue = controlledSearchValue ?? internalSearchValue;

  // Determine if we should show card view
  const showCardView = isMobile && mobileCardRender && viewMode === 'card';

  // Determine if view toggle should be shown
  const canToggleView = isMobile && mobileCardRender && showViewToggle;

  // Debounced search handler
  const searchTimeoutRef = React.useRef<NodeJS.Timeout>();

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInternalSearchValue(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        onSearch?.(value);
      }, searchDebounce);
    },
    [onSearch, searchDebounce]
  );

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Filter panel state
  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilters = useMemo(() => {
    if (!filterValues) {
      return false;
    }
    return Object.values(filterValues).some((v) => v !== undefined && v !== null && v !== '');
  }, [filterValues]);

  // Build actions column if actions are provided
  const columnsWithActions = useMemo(() => {
    if (!actions || actions.length === 0) {
      return columns;
    }

    const actionsColumn = {
      key: 'actions',
      title: '',
      width: 56,
      fixed: 'right' as const,
      render: (_: unknown, record: T) => {
        // Filter actions based on permissions and visibility
        const visibleActions = actions.filter((action) => {
          // Check permission
          if (action.permission && !can(action.permission)) {
            return false;
          }
          // Check hidden
          if (typeof action.hidden === 'function') {
            return !action.hidden(record);
          }
          return !action.hidden;
        });

        if (visibleActions.length === 0) {
          return null;
        }

        const menuItems: MenuProps['items'] = visibleActions.map((action) => {
          const isDisabled =
            typeof action.disabled === 'function' ? action.disabled(record) : action.disabled;

          return {
            key: action.key,
            icon: action.icon,
            label: action.confirm ? (
              <Popconfirm
                title={action.confirm.title}
                description={action.confirm.description}
                okText={action.confirm.confirmText || t('actions.confirm')}
                cancelText={action.confirm.cancelText || t('actions.cancel')}
                onConfirm={() => action.onClick(record)}
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
    };

    return [...(columns || []), actionsColumn];
  }, [columns, actions, can, t]);

  // Custom empty state
  const emptyState = useMemo(() => {
    if (loading) {
      return undefined;
    }

    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle || t('messages.noData')}
        description={emptyDescription}
        size="md"
      >
        {emptyAction}
      </EmptyState>
    );
  }, [loading, emptyIcon, emptyTitle, emptyDescription, emptyAction, t]);

  // Determine if we need to show header
  const hasHeader =
    showHeader && (searchable || filters?.length || headerStart || headerEnd || canToggleView);

  // Get key for a record in card view
  const getCardKey = useCallback(
    (record: T, index: number): string | number => {
      if (cardKeyExtractor) {
        return cardKeyExtractor(record, index);
      }
      if (typeof rowKey === 'function') {
        const key = rowKey(record);
        return typeof key === 'bigint' ? String(key) : key;
      }
      return ((record as Record<string, unknown>)[rowKey as string] as string | number) ?? index;
    },
    [cardKeyExtractor, rowKey]
  );

  // Render card list for mobile
  const renderCardList = () => {
    if (!dataSource || dataSource.length === 0) {
      return (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle || t('messages.noData')}
          description={emptyDescription}
          size="md"
        >
          {emptyAction}
        </EmptyState>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {dataSource.map((record, index) => (
          <div key={getCardKey(record, index)}>{mobileCardRender!(record, index, actions)}</div>
        ))}
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col gap-4', wrapperClassName)}>
      {/* Header with search, filters, and view toggle */}
      {hasHeader && (
        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={isMobile ? 8 : 12}
          className="w-full"
        >
          {/* Start content */}
          <Flex align="center" gap={isMobile ? 8 : 12} wrap="wrap" className="flex-1 min-w-0">
            {headerStart}

            {/* Search input */}
            {searchable && (
              <Input
                placeholder={searchPlaceholder || t('actions.search')}
                prefix={<SearchOutlined className="text-stone-400" aria-hidden="true" />}
                value={searchValue}
                onChange={handleSearchChange}
                allowClear
                className={cn('max-w-full', isMobile ? 'w-full' : 'w-64')}
                style={{ minHeight: isMobile ? MIN_TOUCH_TARGET : 'auto' }}
                aria-label={searchPlaceholder || t('actions.search')}
              />
            )}

            {/* Filter toggle */}
            {filters && filters.length > 0 && (
              <Button
                icon={<FilterOutlined aria-hidden="true" />}
                onClick={() => setShowFilters(!showFilters)}
                type={hasActiveFilters ? 'primary' : 'default'}
                ghost={hasActiveFilters}
                className="touch-manipulation flex-shrink-0"
                style={{ minHeight: isMobile ? MIN_TOUCH_TARGET : 'auto' }}
                aria-label={t('actions.filter')}
                aria-expanded={showFilters}
              >
                {!isMobile && t('actions.filter')}
                {hasActiveFilters && (
                  <span className="ms-1 inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-xs w-5 h-5">
                    {
                      Object.values(filterValues || {}).filter(
                        (v) => v !== undefined && v !== null && v !== ''
                      ).length
                    }
                  </span>
                )}
              </Button>
            )}
          </Flex>

          {/* End content with view toggle */}
          <Flex align="center" gap={isMobile ? 8 : 12} className="flex-shrink-0">
            {/* View mode toggle (mobile only) */}
            {canToggleView && (
              <Segmented
                value={viewMode}
                onChange={(value) => setViewMode(value as ViewMode)}
                options={[
                  {
                    value: 'card',
                    icon: <AppstoreOutlined aria-hidden="true" />,
                    label: <span className="sr-only">{t('table.cardView')}</span>,
                  },
                  {
                    value: 'table',
                    icon: <TableOutlined aria-hidden="true" />,
                    label: <span className="sr-only">{t('table.tableView')}</span>,
                  },
                ]}
                className="touch-manipulation"
                size={isMobile ? 'middle' : 'small'}
              />
            )}

            {headerEnd}
          </Flex>
        </Flex>
      )}

      {/* Filter panel */}
      {showFilters && filters && filters.length > 0 && (
        <FilterPanel
          filters={filters}
          values={filterValues || {}}
          onChange={onFilterChange || (() => {})}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Content: Card view or Table view */}
      {showCardView ? (
        // Mobile card view
        <div className="w-full">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-lg bg-stone-100 dark:bg-stone-800 animate-pulse"
                />
              ))}
            </div>
          ) : (
            renderCardList()
          )}
        </div>
      ) : (
        // Table view with horizontal scroll wrapper
        <div
          className={cn(
            'w-full',
            horizontalScroll && isMobile && 'overflow-x-auto scrollbar-thin -mx-4 px-4'
          )}
        >
          <div
            style={{
              minWidth: horizontalScroll && isMobile ? `${minTableWidth}px` : 'auto',
            }}
          >
            <Table
              dataSource={dataSource}
              columns={columnsWithActions}
              loading={loading}
              rowKey={rowKey}
              emptyText={emptyState}
              scroll={horizontalScroll ? { x: minTableWidth } : undefined}
              {...tableProps}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
