'use client';

/**
 * ManualItemEntry Component
 *
 * Allows manual entry of items for incoming transfers.
 * For incoming transfers, items don't exist in our inventory yet,
 * so users need to manually enter item details.
 *
 * Features:
 * - Add multiple items manually
 * - Each item has: item_name, item_sku, weight_grams, metal_type, metal_purity, category_name, item_value
 * - Support adding/removing items
 * - Show total count and total value
 * - RTL support with logical properties
 *
 * @module components/domain/transfers/ManualItemEntry
 */

import React, { useCallback, useMemo } from 'react';

import {
  PlusOutlined,
  DeleteOutlined,
  GoldOutlined,
  DollarOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { Input, InputNumber, Select, Typography, Empty, Card } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { useCategories } from '@/lib/hooks/data/useCategories';
import { useMetalTypes, useMetalPurities } from '@/lib/hooks/data/useMetals';
import { useShop } from '@/lib/hooks/shop';
import { formatCurrency, formatWeight } from '@/lib/utils/format';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Manual item data structure for incoming transfers
 */
export interface ManualItem {
  /** Temporary client-side ID for React key */
  tempId: string;
  /** Item name (required) */
  item_name: string;
  /** Item SKU (optional) */
  item_sku?: string;
  /** Weight in grams (optional) */
  weight_grams?: number;
  /** Metal type name (optional) */
  metal_type?: string;
  /** Metal purity name (optional) */
  metal_purity?: string;
  /** Category name (optional) */
  category_name?: string;
  /** Item value (required) */
  item_value: number;
}

interface ManualItemEntryProps {
  /** Current list of manual items */
  items: ManualItem[];
  /** Change handler for items */
  onChange: (items: ManualItem[]) => void;
  /** Disabled state */
  disabled?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique temporary ID for manual items
 */
function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an empty manual item with default values
 */
function createEmptyItem(): ManualItem {
  return {
    tempId: generateTempId(),
    item_name: '',
    item_sku: undefined,
    weight_grams: undefined,
    metal_type: undefined,
    metal_purity: undefined,
    category_name: undefined,
    item_value: 0,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ManualItemEntry - Manual item entry form for incoming transfers
 */
export function ManualItemEntry({
  items,
  onChange,
  disabled = false,
}: ManualItemEntryProps): React.JSX.Element {
  const t = useTranslations('transfers');
  const tCommon = useTranslations('common');

  const { shop } = useShop();
  const currency = shop?.currency || 'USD';

  // Fetch catalog data for dropdowns
  const { data: metalTypes = [], isLoading: metalTypesLoading } = useMetalTypes({});
  const { data: metalPurities = [], isLoading: metalPuritiesLoading } = useMetalPurities({});
  const { data: categories = [], isLoading: categoriesLoading } = useCategories({});

  // ==========================================================================
  // MEMOIZED OPTIONS
  // ==========================================================================

  const metalTypeOptions = useMemo(
    () =>
      metalTypes.map((mt: { metal_name: string }) => ({
        label: mt.metal_name,
        value: mt.metal_name,
      })),
    [metalTypes]
  );

  const metalPurityOptions = useMemo(
    () =>
      metalPurities.map((mp: { purity_name: string }) => ({
        label: mp.purity_name,
        value: mp.purity_name,
      })),
    [metalPurities]
  );

  const categoryOptions = useMemo(
    () =>
      categories.map((cat: { category_name: string }) => ({
        label: cat.category_name,
        value: cat.category_name,
      })),
    [categories]
  );

  // ==========================================================================
  // CALCULATED VALUES
  // ==========================================================================

  const totalCount = items.length;
  const totalValue = items.reduce((sum, item) => sum + (item.item_value || 0), 0);
  const totalWeight = items.reduce((sum, item) => sum + (item.weight_grams || 0), 0);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleAddItem = useCallback(() => {
    onChange([...items, createEmptyItem()]);
  }, [items, onChange]);

  const handleRemoveItem = useCallback(
    (tempId: string) => {
      onChange(items.filter((item) => item.tempId !== tempId));
    },
    [items, onChange]
  );

  const handleItemChange = useCallback(
    (tempId: string, field: keyof ManualItem, value: string | number | undefined) => {
      onChange(items.map((item) => (item.tempId === tempId ? { ...item, [field]: value } : item)));
    },
    [items, onChange]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="manual-item-entry">
      {/* Summary Header */}
      <div className="flex items-center justify-between mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <InboxOutlined className="text-emerald-600" />
            <Text strong>{totalCount}</Text>
            <Text type="secondary">{t('items')}</Text>
          </div>
          {totalWeight > 0 && (
            <div className="flex items-center gap-2">
              <GoldOutlined className="text-amber-500" />
              <Text>{formatWeight(totalWeight)}</Text>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DollarOutlined className="text-emerald-600" />
          <Text strong className="text-emerald-700 dark:text-emerald-400">
            {formatCurrency(totalValue, currency)}
          </Text>
        </div>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div className="text-center">
              <Text type="secondary">{t('noItemsAdded')}</Text>
              <div className="mt-2">
                <Text type="secondary" className="text-xs">
                  {t('addItemsToTransfer')}
                </Text>
              </div>
            </div>
          }
        >
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem} disabled={disabled}>
            {t('addItem')}
          </Button>
        </Empty>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pe-2">
          {items.map((item, index) => (
            <Card
              key={item.tempId}
              size="small"
              className="border-emerald-200 dark:border-emerald-800"
              title={
                <div className="flex items-center justify-between">
                  <Text type="secondary" className="text-xs">
                    {t('manualEntry.item')} #{index + 1}
                  </Text>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveItem(item.tempId)}
                    disabled={disabled}
                  />
                </div>
              }
            >
              {/* Row 1: Name and SKU */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Text type="secondary" className="text-xs block mb-1">
                    {t('manualEntry.itemName')} <span className="text-red-500">*</span>
                  </Text>
                  <Input
                    placeholder={t('manualEntry.itemNamePlaceholder')}
                    value={item.item_name}
                    onChange={(e) => handleItemChange(item.tempId, 'item_name', e.target.value)}
                    disabled={disabled}
                    status={!item.item_name ? 'error' : undefined}
                  />
                </div>
                <div>
                  <Text type="secondary" className="text-xs block mb-1">
                    {t('manualEntry.itemSku')}
                  </Text>
                  <Input
                    placeholder={t('manualEntry.itemSkuPlaceholder')}
                    value={item.item_sku || ''}
                    onChange={(e) =>
                      handleItemChange(item.tempId, 'item_sku', e.target.value || undefined)
                    }
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Row 2: Metal Type, Purity, and Category */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <Text type="secondary" className="text-xs block mb-1">
                    {t('manualEntry.metalType')}
                  </Text>
                  <Select
                    placeholder={tCommon('select.placeholder')}
                    value={item.metal_type}
                    onChange={(value) => handleItemChange(item.tempId, 'metal_type', value)}
                    options={metalTypeOptions}
                    loading={metalTypesLoading}
                    allowClear
                    disabled={disabled}
                    className="w-full"
                  />
                </div>
                <div>
                  <Text type="secondary" className="text-xs block mb-1">
                    {t('manualEntry.metalPurity')}
                  </Text>
                  <Select
                    placeholder={tCommon('select.placeholder')}
                    value={item.metal_purity}
                    onChange={(value) => handleItemChange(item.tempId, 'metal_purity', value)}
                    options={metalPurityOptions}
                    loading={metalPuritiesLoading}
                    allowClear
                    disabled={disabled}
                    className="w-full"
                  />
                </div>
                <div>
                  <Text type="secondary" className="text-xs block mb-1">
                    {t('manualEntry.categoryName')}
                  </Text>
                  <Select
                    placeholder={tCommon('select.placeholder')}
                    value={item.category_name}
                    onChange={(value) => handleItemChange(item.tempId, 'category_name', value)}
                    options={categoryOptions}
                    loading={categoriesLoading}
                    allowClear
                    disabled={disabled}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Row 3: Weight and Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Text type="secondary" className="text-xs block mb-1">
                    {t('manualEntry.weightGrams')}
                  </Text>
                  <InputNumber
                    placeholder="0.00"
                    value={item.weight_grams}
                    onChange={(value) =>
                      handleItemChange(item.tempId, 'weight_grams', value ?? undefined)
                    }
                    min={0}
                    step={0.01}
                    precision={2}
                    addonAfter="g"
                    disabled={disabled}
                    className="w-full"
                  />
                </div>
                <div>
                  <Text type="secondary" className="text-xs block mb-1">
                    {t('manualEntry.itemValue')} <span className="text-red-500">*</span>
                  </Text>
                  <InputNumber
                    placeholder="0.00"
                    value={item.item_value}
                    onChange={(value) => handleItemChange(item.tempId, 'item_value', value ?? 0)}
                    min={0}
                    step={0.01}
                    precision={2}
                    addonBefore={currency}
                    disabled={disabled}
                    className="w-full"
                    status={item.item_value <= 0 ? 'error' : undefined}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Item Button */}
      {items.length > 0 && (
        <div className="mt-3">
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddItem}
            disabled={disabled}
            block
          >
            {t('addItem')}
          </Button>
        </div>
      )}

      {/* Help Text */}
      <Text type="secondary" className="text-xs mt-3 block">
        {t('manualEntry.helpText')}
      </Text>
    </div>
  );
}

export default ManualItemEntry;
