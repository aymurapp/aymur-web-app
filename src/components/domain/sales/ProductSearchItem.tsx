'use client';

/**
 * ProductSearchItem Component
 *
 * Compact card for displaying inventory items in the POS product search grid.
 * Optimized for quick scanning and adding items to cart.
 *
 * Features:
 * - Compact thumbnail with status indicator
 * - Prominent price display
 * - Metal type/purity badge
 * - Click to add to cart
 * - Visual pulse animation on add
 * - Disabled state for items already in cart
 *
 * @module components/domain/sales/ProductSearchItem
 */

import React, { useCallback, useState } from 'react';

import { ShoppingOutlined, CheckOutlined } from '@ant-design/icons';
import { Image, Typography, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

import { Card } from '@/components/ui/Card';
import type { InventoryItemWithRelations } from '@/lib/hooks/data/useInventoryItems';
import { cn } from '@/lib/utils/cn';

const { Text, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the ProductSearchItem component
 */
export interface ProductSearchItemProps {
  /**
   * The inventory item to display
   */
  item: InventoryItemWithRelations;

  /**
   * Currency code for price formatting
   */
  currency: string;

  /**
   * Callback when the item is clicked/added to cart
   */
  onAdd?: (item: InventoryItemWithRelations) => void;

  /**
   * Whether this item is already in the cart
   */
  inCart?: boolean;

  /**
   * Whether the item is disabled (e.g., not available)
   */
  disabled?: boolean;

  /**
   * Size variant
   * @default 'default'
   */
  size?: 'small' | 'default';
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Placeholder image for items without images
 */
const PLACEHOLDER_IMAGE = '/images/placeholder-jewelry.svg';

/**
 * Status indicator colors
 */
const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-500',
  reserved: 'bg-orange-500',
  sold: 'bg-blue-500',
  workshop: 'bg-purple-500',
  damaged: 'bg-red-500',
  returned: 'bg-cyan-500',
  consignment: 'bg-amber-500',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price with currency
 */
function formatPrice(price: number | null | undefined, currency: string = 'USD'): string {
  if (price === null || price === undefined) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Format weight in grams
 */
function formatWeight(weightGrams: number | null | undefined): string {
  if (weightGrams === null || weightGrams === undefined) {
    return '';
  }
  return `${weightGrams.toFixed(2)}g`;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ProductSearchItem Component
 *
 * Compact card optimized for POS product search grid.
 * Designed for quick visual scanning and fast item addition.
 */
export function ProductSearchItem({
  item,
  currency,
  onAdd,
  inCart = false,
  disabled = false,
  size = 'default',
}: ProductSearchItemProps): JSX.Element {
  const t = useTranslations();

  // Animation state for add feedback
  const [isAdding, setIsAdding] = useState(false);

  // Handle click to add
  const handleClick = useCallback(() => {
    if (disabled || inCart || !onAdd) {
      return;
    }

    // Trigger add animation
    setIsAdding(true);

    // Call the onAdd callback
    onAdd(item);

    // Reset animation after short delay
    setTimeout(() => setIsAdding(false), 300);
  }, [disabled, inCart, onAdd, item]);

  // Get display values
  const imageUrl = (item as { image_url?: string }).image_url || PLACEHOLDER_IMAGE;
  const itemName = item.item_name || t('common.labels.untitled');
  const sku = item.sku || '-';
  const price = (item as { selling_price?: number }).selling_price || item.purchase_price;
  const weight = item.weight_grams;
  const metalType = item.metal_type?.type_name;
  const purity = item.metal_purity?.purity_name;
  const status = item.status || 'available';
  const statusColor = STATUS_COLORS[status] || 'bg-stone-400';

  // Size configurations
  const isSmall = size === 'small';
  const cardPadding = isSmall ? 'p-2' : 'p-3';
  const imageHeight = isSmall ? 'h-20' : 'h-24';
  const priceSize = isSmall ? 'text-sm' : 'text-base';

  // Determine if clickable
  const isClickable = !disabled && !inCart && !!onAdd;

  return (
    <Card
      hoverable={isClickable}
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        // Interactive states
        isClickable && 'cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        inCart && 'ring-2 ring-green-400 ring-opacity-50',
        // Add animation
        isAdding && 'scale-95 ring-2 ring-amber-400'
      )}
      onClick={handleClick}
      bodyStyle={{ padding: 0 }}
    >
      {/* Image Container */}
      <div className={cn('relative overflow-hidden bg-stone-100', imageHeight)}>
        <Image
          src={imageUrl}
          alt={itemName}
          className="h-full w-full object-cover"
          preview={false}
          fallback={PLACEHOLDER_IMAGE}
          placeholder={
            <div className="flex h-full w-full items-center justify-center bg-stone-100">
              <ShoppingOutlined className="text-2xl text-stone-300" />
            </div>
          }
        />

        {/* Status Indicator - Top End Corner */}
        <Tooltip title={t(`inventory.${status}` as Parameters<typeof t>[0])}>
          <div
            className={cn(
              'absolute top-1.5 end-1.5 w-2.5 h-2.5 rounded-full',
              statusColor,
              'shadow-sm'
            )}
          />
        </Tooltip>

        {/* In Cart Indicator */}
        {inCart && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <div className="bg-green-500 text-white rounded-full p-2">
              <CheckOutlined />
            </div>
          </div>
        )}

        {/* Metal Purity Badge - Bottom Start */}
        {purity && (
          <div
            className={cn(
              'absolute bottom-1.5 start-1.5',
              'px-1.5 py-0.5 rounded text-[10px] font-semibold',
              'bg-amber-500/90 text-white shadow-sm'
            )}
          >
            {purity}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className={cn(cardPadding, 'space-y-1')}>
        {/* Item Name */}
        <Paragraph
          ellipsis={{ rows: 1, tooltip: itemName }}
          className="!mb-0 font-medium text-stone-800 text-xs"
        >
          {itemName}
        </Paragraph>

        {/* SKU and Weight Row */}
        <div className="flex items-center justify-between gap-1">
          <Text type="secondary" className="text-[10px] truncate flex-1">
            {sku}
          </Text>
          {weight && (
            <Text type="secondary" className="text-[10px] flex-shrink-0">
              {formatWeight(weight)}
            </Text>
          )}
        </div>

        {/* Metal Type */}
        {metalType && (
          <Text type="secondary" className="text-[10px] block truncate">
            {metalType}
          </Text>
        )}

        {/* Price - Prominent */}
        <Text strong className={cn('text-amber-600 block', priceSize)}>
          {formatPrice(price, currency)}
        </Text>
      </div>

      {/* Hover Overlay - Quick Info */}
      {isClickable && (
        <div
          className={cn(
            'absolute inset-0 bg-amber-500/10 opacity-0 hover:opacity-100',
            'transition-opacity duration-200',
            'flex items-center justify-center'
          )}
        >
          <div className="bg-white/95 rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-1.5">
            <ShoppingOutlined className="text-amber-600" />
            <Text className="text-xs font-medium">{t('sales.addToCart')}</Text>
          </div>
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

/**
 * Loading skeleton for ProductSearchItem
 */
export function ProductSearchItemSkeleton({
  size = 'default',
}: {
  size?: 'small' | 'default';
}): JSX.Element {
  const isSmall = size === 'small';
  const imageHeight = isSmall ? 'h-20' : 'h-24';
  const cardPadding = isSmall ? 'p-2' : 'p-3';

  return (
    <Card className="overflow-hidden" bodyStyle={{ padding: 0 }}>
      {/* Image Skeleton */}
      <div className={cn(imageHeight, 'bg-stone-200 animate-pulse')} />

      {/* Content Skeleton */}
      <div className={cn(cardPadding, 'space-y-2')}>
        <div className="h-3 bg-stone-200 rounded animate-pulse w-3/4" />
        <div className="flex justify-between gap-2">
          <div className="h-2.5 bg-stone-200 rounded animate-pulse w-1/2" />
          <div className="h-2.5 bg-stone-200 rounded animate-pulse w-1/4" />
        </div>
        <div className="h-4 bg-stone-200 rounded animate-pulse w-1/3" />
      </div>
    </Card>
  );
}

export default ProductSearchItem;
