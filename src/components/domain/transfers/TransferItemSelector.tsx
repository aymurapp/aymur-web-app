'use client';

/**
 * TransferItemSelector Component
 *
 * Multi-select component for choosing inventory items to transfer.
 * Displays items in a searchable table with selection checkboxes.
 *
 * Features:
 * - Search by item name, SKU, or barcode
 * - Filter by status (only "available" items can be transferred)
 * - Multi-select with checkboxes
 * - Shows item details (name, SKU, weight, value)
 * - RTL support
 *
 * @module components/domain/transfers/TransferItemSelector
 */

import React, { useState, useCallback, useMemo } from 'react';

import { SearchOutlined } from '@ant-design/icons';
import { Table, Input, Typography, Tag, Empty, Spin } from 'antd';
import { useTranslations } from 'next-intl';

import {
  useInventoryItems,
  type InventoryItemWithRelations,
} from '@/lib/hooks/data/useInventoryItems';
import { formatCurrency, formatWeight } from '@/lib/utils/format';

import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface TransferItemSelectorProps {
  /** Currently selected item IDs */
  selectedItemIds: string[];
  /** Change handler for selected item IDs */
  onChange: (itemIds: string[]) => void;
  /** Disabled state */
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * TransferItemSelector - Inventory item selector for transfers
 */
export function TransferItemSelector({
  selectedItemIds,
  onChange,
  disabled = false,
}: TransferItemSelectorProps): React.JSX.Element {
  const t = useTranslations('transfers');
  const tCommon = useTranslations('common');
  const tInventory = useTranslations('inventory');

  // Search state
  const [searchValue, setSearchValue] = useState('');

  // Fetch inventory items that can be transferred (available status)
  const { items, isLoading } = useInventoryItems({
    status: ['available'],
    search: searchValue,
    page_size: 100,
  });

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, []);

  const handleSelectionChange = useCallback(
    (selectedRowKeys: React.Key[]) => {
      onChange(selectedRowKeys as string[]);
    },
    [onChange]
  );

  // ==========================================================================
  // TABLE CONFIGURATION
  // ==========================================================================

  // Row selection configuration
  const rowSelection: TableRowSelection<InventoryItemWithRelations> = {
    selectedRowKeys: selectedItemIds,
    onChange: handleSelectionChange,
    getCheckboxProps: (record) => ({
      disabled: disabled || record.status !== 'available',
      name: record.id_item,
    }),
  };

  // Table columns
  const columns: ColumnsType<InventoryItemWithRelations> = useMemo(
    () => [
      {
        key: 'item_name',
        title: tInventory('itemName'),
        dataIndex: 'item_name',
        width: 200,
        ellipsis: true,
        render: (value: string, record) => (
          <div>
            <Text strong className="block">
              {value}
            </Text>
            {record.sku && (
              <Text type="secondary" className="text-xs font-mono">
                {record.sku}
              </Text>
            )}
          </div>
        ),
      },
      {
        key: 'barcode',
        title: tInventory('barcode'),
        dataIndex: 'barcode',
        width: 120,
        render: (value: string | null) => <Text className="font-mono text-xs">{value || '-'}</Text>,
      },
      {
        key: 'weight',
        title: tInventory('weight'),
        dataIndex: 'weight_grams',
        width: 100,
        align: 'right',
        render: (value: number | null) => <Text>{value ? formatWeight(value) : '-'}</Text>,
      },
      {
        key: 'value',
        title: tInventory('purchasePrice'),
        width: 120,
        align: 'right',
        render: (_, record) => (
          <Text>
            {record.purchase_price
              ? formatCurrency(record.purchase_price, record.currency || 'USD')
              : '-'}
          </Text>
        ),
      },
      {
        key: 'status',
        title: tCommon('labels.status'),
        dataIndex: 'status',
        width: 100,
        render: (status: string) => {
          const color = status === 'available' ? 'green' : 'default';
          return <Tag color={color}>{tInventory(`status.${status}`)}</Tag>;
        },
      },
    ],
    [tInventory, tCommon]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spin size="default" />
      </div>
    );
  }

  return (
    <div className="transfer-item-selector">
      {/* Search Input */}
      <Input
        placeholder={t('searchItems')}
        prefix={<SearchOutlined />}
        value={searchValue}
        onChange={handleSearchChange}
        allowClear
        className="mb-3"
        disabled={disabled}
      />

      {/* Selection Summary */}
      <div className="mb-2 text-sm text-stone-500">
        {selectedItemIds.length > 0 ? (
          <Text>{t('selectedCount', { count: selectedItemIds.length })}</Text>
        ) : (
          <Text type="secondary">{t('selectItemsHint')}</Text>
        )}
      </div>

      {/* Items Table */}
      <Table<InventoryItemWithRelations>
        dataSource={items}
        columns={columns}
        rowKey="id_item"
        rowSelection={rowSelection}
        size="small"
        scroll={{ y: 300 }}
        pagination={false}
        loading={isLoading}
        locale={{
          emptyText: (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('noItemsToTransfer')} />
          ),
        }}
        className="border border-stone-200 rounded-lg"
      />

      {/* Help text */}
      <Text type="secondary" className="text-xs mt-2 block">
        {t('transferItemsHelp')}
      </Text>
    </div>
  );
}

export default TransferItemSelector;
