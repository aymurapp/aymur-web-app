'use client';

/**
 * SaleItemsTable Component
 *
 * Displays a table of items included in a sale transaction.
 * Shows item details including image, name, SKU, metal type,
 * weight, price, discount, and return status.
 *
 * Features:
 * - Responsive table with horizontal scroll on mobile
 * - Image thumbnails with fallback
 * - Links to inventory items
 * - Return status indicators
 * - Weight and price formatting
 * - RTL support with logical CSS properties
 *
 * @module components/domain/sales/SaleItemsTable
 */

import React, { useMemo } from 'react';

import { ShoppingOutlined, UndoOutlined, PictureOutlined } from '@ant-design/icons';
import { Table, Tag, Typography, Skeleton } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import type { SaleItemWithDetails } from '@/lib/hooks/data/useSale';
import { useShop } from '@/lib/hooks/shop';
import { useRouter } from '@/lib/i18n/navigation';
import { type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatWeight } from '@/lib/utils/format';

import type { ColumnsType } from 'antd/es/table';

const { Text, Link } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface SaleItemsTableProps {
  /** Sale items to display */
  items: SaleItemWithDetails[];
  /** Currency code for formatting */
  currency: string;
  /** Loading state */
  isLoading?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

/**
 * Skeleton loading state for SaleItemsTable
 */
export function SaleItemsTableSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border border-stone-200 rounded-lg">
          <Skeleton.Avatar active shape="square" size={48} />
          <div className="flex-1">
            <Skeleton.Input active size="small" className="!w-32 !min-w-0 mb-1" />
            <Skeleton.Input active size="small" className="!w-20 !min-w-0" />
          </div>
          <Skeleton.Input active size="small" className="!w-16 !min-w-0" />
          <Skeleton.Input active size="small" className="!w-20 !min-w-0" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SaleItemsTable Component
 *
 * Displays a detailed table of items in a sale transaction.
 */
export function SaleItemsTable({
  items,
  currency,
  isLoading = false,
  compact = false,
  className,
}: SaleItemsTableProps): React.JSX.Element {
  const t = useTranslations('sales');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { shopId } = useShop();

  // Handle item click to navigate to inventory
  const handleItemClick = (itemId: string) => {
    if (shopId && itemId) {
      router.push(`/${shopId}/inventory/${itemId}`);
    }
  };

  // Table columns
  const columns: ColumnsType<SaleItemWithDetails> = useMemo(
    () => [
      // Image column
      {
        title: '',
        key: 'image',
        width: 64,
        render: () => {
          return (
            <div className="flex items-center justify-center w-12 h-12 bg-stone-100 rounded-lg overflow-hidden">
              <PictureOutlined className="text-xl text-stone-400" />
            </div>
          );
        },
      },
      // Item details column
      {
        title: t('itemDetails'),
        key: 'details',
        render: (_, record) => (
          <div className="flex flex-col gap-0.5">
            {/* Item name with link - item_name comes from inventory_item */}
            <Link
              onClick={() =>
                record.inventory_item?.id_item && handleItemClick(record.inventory_item.id_item)
              }
              className="font-medium text-stone-900 hover:text-amber-600 cursor-pointer"
            >
              {record.inventory_item?.item_name ?? '-'}
            </Link>
            {/* SKU - comes from inventory_item */}
            {record.inventory_item?.sku && (
              <Text type="secondary" className="text-xs" code>
                {record.inventory_item.sku}
              </Text>
            )}
            {/* Return status - comes from inventory_item */}
            {record.inventory_item?.status === 'returned' && (
              <Tag icon={<UndoOutlined />} color="orange" className="mt-1 w-fit">
                {t('itemReturned')}
              </Tag>
            )}
          </div>
        ),
      },
      // Metal type column (hidden in compact mode)
      ...(compact
        ? []
        : [
            {
              title: t('metalType'),
              key: 'metal',
              width: 140,
              render: (_: unknown, record: SaleItemWithDetails) => {
                const metalType = record.inventory_item?.metal_type;
                const metalPurity = record.inventory_item?.metal_purity;
                if (!metalType && !metalPurity) {
                  return <Text type="secondary">-</Text>;
                }
                return (
                  <div className="flex flex-col gap-0.5">
                    {metalType && <Text className="text-sm">{metalType.metal_name}</Text>}
                    {metalPurity && (
                      <Text type="secondary" className="text-xs">
                        {metalPurity.purity_name}
                      </Text>
                    )}
                  </div>
                );
              },
            } as ColumnsType<SaleItemWithDetails>[number],
          ]),
      // Weight column - weight_grams comes from inventory_item
      {
        title: t('weight'),
        key: 'weight',
        width: 100,
        align: 'end' as const,
        render: (_: unknown, record: SaleItemWithDetails) => {
          const weight = record.inventory_item?.weight_grams;
          return weight ? (
            <Text className="text-sm font-medium">{formatWeight(weight, locale)}</Text>
          ) : (
            <Text type="secondary">-</Text>
          );
        },
      },
      // Unit price column
      {
        title: t('unitPrice'),
        dataIndex: 'unit_price',
        key: 'unitPrice',
        width: 120,
        align: 'end' as const,
        render: (price: number) => (
          <Text className="text-sm">{formatCurrency(price, currency, locale)}</Text>
        ),
      },
      // Discount column (hidden in compact mode)
      ...(compact
        ? []
        : [
            {
              title: t('discount'),
              key: 'discount',
              width: 100,
              align: 'end' as const,
              render: (_: unknown, record: SaleItemWithDetails) => {
                const discount = Number(record.discount_amount ?? 0);
                if (discount <= 0) {
                  return <Text type="secondary">-</Text>;
                }
                return (
                  <Text className="text-sm text-amber-600">
                    -{formatCurrency(discount, currency, locale)}
                  </Text>
                );
              },
            } as ColumnsType<SaleItemWithDetails>[number],
          ]),
      // Line total column - database field is 'line_total', status comes from inventory_item
      {
        title: t('lineTotal'),
        dataIndex: 'line_total',
        key: 'total',
        width: 130,
        align: 'end' as const,
        render: (total: number, record: SaleItemWithDetails) => {
          const isReturned = record.inventory_item?.status === 'returned';
          return (
            <div className="flex flex-col items-end">
              <Text strong className={cn('text-sm', isReturned && 'line-through text-stone-400')}>
                {formatCurrency(total, currency, locale)}
              </Text>
              {isReturned && (
                <Text type="secondary" className="text-xs">
                  {t('refunded')}
                </Text>
              )}
            </div>
          );
        },
      },
    ],
    [t, currency, locale, compact, shopId, router]
  );

  // Calculate totals - status comes from inventory_item, line_total and weight_grams from their respective sources
  const totals = useMemo(() => {
    const soldItems = items.filter((item) => item.inventory_item?.status !== 'returned');
    const returnedItems = items.filter((item) => item.inventory_item?.status === 'returned');

    const subtotal = soldItems.reduce((sum, item) => sum + Number(item.line_total ?? 0), 0);
    const returnedTotal = returnedItems.reduce(
      (sum, item) => sum + Number(item.line_total ?? 0),
      0
    );
    const totalWeight = soldItems.reduce(
      (sum, item) => sum + Number(item.inventory_item?.weight_grams ?? 0),
      0
    );

    return { subtotal, returnedTotal, totalWeight, itemCount: items.length };
  }, [items]);

  if (isLoading) {
    return <SaleItemsTableSkeleton />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingOutlined />}
        title={t('noItems')}
        description={t('noItemsInSale')}
        size="sm"
      />
    );
  }

  return (
    <div className={cn('sale-items-table', className)}>
      <Table<SaleItemWithDetails>
        dataSource={items}
        columns={columns}
        rowKey="id_sale_item"
        pagination={false}
        scroll={{ x: compact ? 500 : 800 }}
        size="small"
        rowClassName={(record) =>
          record.inventory_item?.status === 'returned' ? 'bg-stone-50 opacity-75' : ''
        }
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row className="bg-stone-50">
              <Table.Summary.Cell index={0} colSpan={compact ? 2 : 3}>
                <Text strong className="text-stone-700">
                  {t('itemsSummary', { count: totals.itemCount })}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Text strong className="text-stone-700">
                  {formatWeight(totals.totalWeight, locale)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={compact ? 1 : 2} />
              <Table.Summary.Cell index={3} align="right">
                <Text strong className="text-stone-900 text-base">
                  {formatCurrency(totals.subtotal, currency, locale)}
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  );
}

export default SaleItemsTable;
