'use client';

/**
 * LowStockAlertWidget Component
 *
 * Dashboard widget displaying inventory items that are below their reorder threshold.
 * Shows severity-based color coding and provides quick actions.
 *
 * Features:
 * - Shows items below reorder threshold
 * - Columns: Item name, Current stock, Reorder level
 * - Quick action to reorder or view item
 * - Red/amber color coding based on severity
 * - Uses mock data for demonstration
 * - RTL-compatible with logical CSS properties
 *
 * @module components/domain/dashboard/LowStockAlertWidget
 */

import React, { useMemo } from 'react';

import {
  WarningOutlined,
  AlertOutlined,
  RightOutlined,
  EyeOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { Card, Table, Tag, Tooltip, Skeleton, Space } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { Button } from '@/components/ui/Button';
import { usePermissions } from '@/lib/hooks/permissions';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

import type { ColumnsType } from 'antd/es/table';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Low stock item severity level
 */
type SeverityLevel = 'critical' | 'warning' | 'low';

/**
 * Low stock inventory item
 */
interface LowStockItem {
  /** Unique item ID */
  id: string;
  /** Item name */
  name: string;
  /** SKU or barcode */
  sku: string;
  /** Current stock quantity */
  currentStock: number;
  /** Reorder threshold level */
  reorderLevel: number;
  /** Category name */
  category: string;
  /** Calculated severity level */
  severity: SeverityLevel;
}

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
// MOCK DATA
// =============================================================================

/**
 * Generate mock low stock items for demonstration
 */
function generateMockLowStockItems(): LowStockItem[] {
  const items: Omit<LowStockItem, 'severity'>[] = [
    {
      id: '1',
      name: '18K Gold Chain (50cm)',
      sku: 'GLD-CH-18K-50',
      currentStock: 0,
      reorderLevel: 5,
      category: 'Chains',
    },
    {
      id: '2',
      name: '22K Gold Ring (Size 7)',
      sku: 'GLD-RG-22K-07',
      currentStock: 1,
      reorderLevel: 10,
      category: 'Rings',
    },
    {
      id: '3',
      name: 'Silver Bracelet (Medium)',
      sku: 'SLV-BR-MD',
      currentStock: 3,
      reorderLevel: 8,
      category: 'Bracelets',
    },
    {
      id: '4',
      name: 'Diamond Stud Earrings (0.5ct)',
      sku: 'DMD-ER-05CT',
      currentStock: 2,
      reorderLevel: 5,
      category: 'Earrings',
    },
    {
      id: '5',
      name: '24K Gold Pendant',
      sku: 'GLD-PD-24K',
      currentStock: 4,
      reorderLevel: 6,
      category: 'Pendants',
    },
    {
      id: '6',
      name: 'Pearl Necklace (18 inch)',
      sku: 'PRL-NK-18',
      currentStock: 2,
      reorderLevel: 4,
      category: 'Necklaces',
    },
  ];

  // Calculate severity and return
  return items.map((item) => ({
    ...item,
    severity: calculateSeverity(item.currentStock, item.reorderLevel),
  }));
}

/**
 * Calculate severity level based on stock percentage
 */
function calculateSeverity(currentStock: number, reorderLevel: number): SeverityLevel {
  if (currentStock === 0) {
    return 'critical';
  }
  const percentage = (currentStock / reorderLevel) * 100;
  if (percentage <= 25) {
    return 'critical';
  }
  if (percentage <= 50) {
    return 'warning';
  }
  return 'low';
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Severity level styling configuration
 */
const SEVERITY_CONFIG = {
  critical: {
    color: 'red',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
    tagColor: 'error',
    icon: <AlertOutlined />,
    label: 'critical',
  },
  warning: {
    color: 'amber',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    tagColor: 'warning',
    icon: <WarningOutlined />,
    label: 'warning',
  },
  low: {
    color: 'blue',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    tagColor: 'processing',
    icon: <WarningOutlined />,
    label: 'low',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * LowStockAlertWidget Component
 *
 * Displays a table of inventory items that are below their reorder threshold.
 */
export function LowStockAlertWidget({
  className,
  maxItems = 5,
  loading = false,
}: LowStockAlertWidgetProps): React.JSX.Element {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  // Mock data - in production this would come from a hook
  const items = useMemo(() => {
    const allItems = generateMockLowStockItems();
    // Sort by severity (critical first)
    const sorted = allItems.sort((a, b) => {
      const order = { critical: 0, warning: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    });
    return sorted.slice(0, maxItems);
  }, [maxItems]);

  // Count by severity
  const counts = useMemo(() => {
    return {
      critical: items.filter((i) => i.severity === 'critical').length,
      warning: items.filter((i) => i.severity === 'warning').length,
      total: items.length,
    };
  }, [items]);

  // Table columns
  const columns: ColumnsType<LowStockItem> = [
    {
      title: t('lowStock.itemName'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name: string, record: LowStockItem) => (
        <div className="py-1">
          <div className="font-medium text-stone-900 truncate">{name}</div>
          <div className="text-xs text-stone-500">{record.category}</div>
        </div>
      ),
    },
    {
      title: t('lowStock.stock'),
      key: 'stock',
      width: 100,
      align: 'center',
      render: (_: unknown, record: LowStockItem) => {
        const config = SEVERITY_CONFIG[record.severity];
        return (
          <div className="text-center">
            <div className={cn('font-semibold', config.textClass)}>{record.currentStock}</div>
            <div className="text-xs text-stone-400">/ {record.reorderLevel}</div>
          </div>
        );
      },
    },
    {
      title: t('lowStock.severity'),
      key: 'severity',
      width: 90,
      align: 'center',
      render: (_: unknown, record: LowStockItem) => {
        const config = SEVERITY_CONFIG[record.severity];
        return (
          <Tag color={config.tagColor} className="m-0 text-xs">
            {t(`lowStock.${config.label}`)}
          </Tag>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      align: 'end',
      render: (_: unknown, record: LowStockItem) => (
        <Space size="small">
          <Tooltip title={tCommon('actions.view')}>
            <Link href={`/inventory/${record.id}`}>
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                className="text-stone-500 hover:text-amber-600"
              />
            </Link>
          </Tooltip>
          {can('purchases.create') && (
            <Tooltip title={t('lowStock.reorder')}>
              <Link href={`/purchases?action=add&item=${record.id}`}>
                <Button
                  type="text"
                  size="small"
                  icon={<ShoppingCartOutlined />}
                  className="text-stone-500 hover:text-emerald-600"
                />
              </Link>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

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
          <Skeleton active paragraph={{ rows: 4 }} />
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
          <div
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg',
              counts.critical > 0 ? 'bg-red-50' : 'bg-amber-50'
            )}
          >
            {counts.critical > 0 ? (
              <AlertOutlined className="text-lg text-red-600" />
            ) : (
              <WarningOutlined className="text-lg text-amber-600" />
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900">{t('lowStock.title')}</h3>
            {counts.total > 0 && (
              <p className="text-sm text-stone-500">
                {t('lowStock.itemsLow', { count: counts.total })}
              </p>
            )}
          </div>
        </div>

        {/* Severity badges */}
        {counts.critical > 0 && (
          <Tag color="error" className="m-0">
            {counts.critical} {t('lowStock.critical')}
          </Tag>
        )}
      </div>

      {/* Content */}
      <div className="px-0">
        {items.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              icon={<WarningOutlined />}
              title={t('lowStock.noLowStock')}
              description={t('lowStock.noLowStockDesc')}
              size="sm"
            />
          </div>
        ) : (
          <Table
            dataSource={items}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
            rowClassName={(record) => {
              const config = SEVERITY_CONFIG[record.severity];
              return cn(config.bgClass, 'hover:opacity-90');
            }}
            className="low-stock-table"
          />
        )}
      </div>

      {/* Footer with View All Link */}
      {items.length > 0 && (
        <div className="px-5 py-3 border-t border-stone-100">
          <Link
            href="/inventory?filter=low_stock"
            className="flex items-center justify-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            {t('lowStock.viewAll')}
            <RightOutlined className="text-xs" />
          </Link>
        </div>
      )}

      {/* Custom table styles */}
      <style jsx global>{`
        .low-stock-table .ant-table-thead > tr > th {
          background: #fafaf9;
          font-weight: 500;
          font-size: 12px;
          color: #78716c;
          padding: 8px 16px;
        }
        .low-stock-table .ant-table-tbody > tr > td {
          padding: 8px 16px;
          border-bottom: 1px solid #f5f5f4;
        }
        .low-stock-table .ant-table-tbody > tr:last-child > td {
          border-bottom: none;
        }
      `}</style>
    </Card>
  );
}

export default LowStockAlertWidget;
