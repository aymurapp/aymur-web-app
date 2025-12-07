'use client';

/**
 * BarcodeLabelPreview Component
 *
 * Preview component for barcode labels with configuration options.
 * Shows how labels will look before printing with real-time updates.
 *
 * Features:
 * - Label size selector (small, medium, large)
 * - Content toggle options (name, SKU, price, metal, weight)
 * - Quantity selector for batch printing
 * - Live preview of label appearance
 * - RTL support
 *
 * @module components/domain/inventory/BarcodeLabelPreview
 */

import React, { useMemo } from 'react';

import { BarcodeOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { Card, Typography, InputNumber, Checkbox, Segmented } from 'antd';
import { useTranslations } from 'next-intl';

import type { InventoryItemWithRelations } from '@/lib/hooks/data/useInventoryItems';
import { cn } from '@/lib/utils/cn';

import { BarcodeLabel, BarcodeLabelSkeleton } from './BarcodeLabel';

import type { LabelSize } from './BarcodeLabel';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Label content options
 */
export interface LabelContentOptions {
  showName: boolean;
  showSku: boolean;
  showPrice: boolean;
  showMetal: boolean;
  showWeight: boolean;
}

/**
 * Props for the BarcodeLabelPreview component
 */
export interface BarcodeLabelPreviewProps {
  /** The inventory item to preview */
  item: InventoryItemWithRelations;
  /** Current label size selection */
  size: LabelSize;
  /** Handler for size change */
  onSizeChange: (size: LabelSize) => void;
  /** Current content display options */
  contentOptions: LabelContentOptions;
  /** Handler for content options change */
  onContentOptionsChange: (options: LabelContentOptions) => void;
  /** Quantity of labels to print */
  quantity: number;
  /** Handler for quantity change */
  onQuantityChange: (quantity: number) => void;
  /** Currency for price display */
  currency?: string;
  /** Whether component is loading */
  loading?: boolean;
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Size options for segmented control
 */
const SIZE_OPTIONS: { label: string; value: LabelSize }[] = [
  { label: '25x10mm', value: 'small' },
  { label: '40x20mm', value: 'medium' },
  { label: '60x30mm', value: 'large' },
];

/**
 * Default content options
 */
export const DEFAULT_CONTENT_OPTIONS: LabelContentOptions = {
  showName: true,
  showSku: true,
  showPrice: true,
  showMetal: false,
  showWeight: false,
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * BarcodeLabelPreview Component
 *
 * Provides a preview of barcode labels with configuration controls.
 * Users can select size, toggle content options, and set quantity.
 */
export function BarcodeLabelPreview({
  item,
  size,
  onSizeChange,
  contentOptions,
  onContentOptionsChange,
  quantity,
  onQuantityChange,
  currency = 'USD',
  loading = false,
  className,
}: BarcodeLabelPreviewProps): JSX.Element {
  const t = useTranslations('inventory.barcodeLabel');

  // Build size options with translations
  const sizeOptions = useMemo(
    () =>
      SIZE_OPTIONS.map((option) => ({
        label: (
          <span className="text-xs">
            {t(`sizes.${option.value}`)} ({option.label})
          </span>
        ),
        value: option.value,
      })),
    [t]
  );

  // Content option handlers
  const handleCheckboxChange = (field: keyof LabelContentOptions) => (e: CheckboxChangeEvent) => {
    onContentOptionsChange({
      ...contentOptions,
      [field]: e.target.checked,
    });
  };

  // Quantity handlers
  const handleQuantityChange = (value: number | null) => {
    if (value !== null && value >= 1 && value <= 100) {
      onQuantityChange(value);
    }
  };

  const incrementQuantity = () => {
    if (quantity < 100) {
      onQuantityChange(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    }
  };

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card className="bg-stone-50">
          <div className="flex justify-center py-4">
            <BarcodeLabelSkeleton size={size} />
          </div>
        </Card>
        <div className="h-20 bg-stone-100 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Preview Area */}
      <Card className="bg-stone-50 border-stone-200" styles={{ body: { padding: '16px' } }}>
        <div className="flex flex-col items-center gap-3">
          <Text type="secondary" className="text-xs uppercase tracking-wider">
            {t('preview')}
          </Text>

          {/* Label Preview */}
          <div
            className={cn(
              'bg-white border border-stone-300 rounded shadow-sm',
              'flex items-center justify-center p-2'
            )}
          >
            <BarcodeLabel
              item={item}
              size={size}
              showName={contentOptions.showName}
              showSku={contentOptions.showSku}
              showPrice={contentOptions.showPrice}
              showMetal={contentOptions.showMetal}
              showWeight={contentOptions.showWeight}
              currency={currency}
            />
          </div>

          {/* Item Info */}
          <div className="text-center">
            <Text strong className="block text-sm">
              {item.item_name || t('untitled')}
            </Text>
            <Text type="secondary" className="text-xs">
              {item.sku || item.barcode || '-'}
            </Text>
          </div>
        </div>
      </Card>

      {/* Configuration Options */}
      <div className="space-y-4">
        {/* Size Selector */}
        <div className="space-y-2">
          <Text strong className="text-sm block">
            <BarcodeOutlined className="me-2" />
            {t('labelSize')}
          </Text>
          <Segmented
            options={sizeOptions}
            value={size}
            onChange={(value) => onSizeChange(value as LabelSize)}
            block
            className="w-full"
          />
        </div>

        {/* Content Options */}
        <div className="space-y-2">
          <Text strong className="text-sm block">
            {t('contentOptions')}
          </Text>
          <div className="grid grid-cols-2 gap-2">
            <Checkbox checked={contentOptions.showName} onChange={handleCheckboxChange('showName')}>
              <span className="text-sm">{t('showName')}</span>
            </Checkbox>
            <Checkbox checked={contentOptions.showSku} onChange={handleCheckboxChange('showSku')}>
              <span className="text-sm">{t('showSku')}</span>
            </Checkbox>
            <Checkbox
              checked={contentOptions.showPrice}
              onChange={handleCheckboxChange('showPrice')}
            >
              <span className="text-sm">{t('showPrice')}</span>
            </Checkbox>
            <Checkbox
              checked={contentOptions.showMetal}
              onChange={handleCheckboxChange('showMetal')}
            >
              <span className="text-sm">{t('showMetal')}</span>
            </Checkbox>
            <Checkbox
              checked={contentOptions.showWeight}
              onChange={handleCheckboxChange('showWeight')}
            >
              <span className="text-sm">{t('showWeight')}</span>
            </Checkbox>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="space-y-2">
          <Text strong className="text-sm block">
            {t('quantity')}
          </Text>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={decrementQuantity}
              disabled={quantity <= 1}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-md border',
                'transition-colors',
                quantity <= 1
                  ? 'border-stone-200 text-stone-300 cursor-not-allowed'
                  : 'border-stone-300 text-stone-600 hover:border-amber-400 hover:text-amber-600'
              )}
            >
              <MinusOutlined className="text-xs" />
            </button>
            <InputNumber
              min={1}
              max={100}
              value={quantity}
              onChange={handleQuantityChange}
              className="w-20 text-center"
              controls={false}
            />
            <button
              type="button"
              onClick={incrementQuantity}
              disabled={quantity >= 100}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-md border',
                'transition-colors',
                quantity >= 100
                  ? 'border-stone-200 text-stone-300 cursor-not-allowed'
                  : 'border-stone-300 text-stone-600 hover:border-amber-400 hover:text-amber-600'
              )}
            >
              <PlusOutlined className="text-xs" />
            </button>
            <Text type="secondary" className="text-sm ms-2">
              {t('labels', { count: quantity })}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SKELETON VARIANT
// =============================================================================

/**
 * Loading skeleton variant of BarcodeLabelPreview
 */
export function BarcodeLabelPreviewSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      <Card className="bg-stone-50">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="h-3 w-16 bg-stone-200 animate-pulse rounded" />
          <BarcodeLabelSkeleton size="medium" />
          <div className="space-y-1 text-center">
            <div className="h-4 w-32 bg-stone-200 animate-pulse rounded" />
            <div className="h-3 w-24 bg-stone-200 animate-pulse rounded" />
          </div>
        </div>
      </Card>
      <div className="space-y-4">
        <div className="h-10 bg-stone-100 animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 bg-stone-100 animate-pulse rounded" />
          ))}
        </div>
        <div className="h-10 bg-stone-100 animate-pulse rounded-lg" />
      </div>
    </div>
  );
}

export default BarcodeLabelPreview;
