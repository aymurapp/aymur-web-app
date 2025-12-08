'use client';

/**
 * ItemCard Component
 *
 * A card component for displaying inventory items in a grid layout.
 * Features:
 * - Product image with fallback placeholder
 * - Name, SKU, and price display
 * - Status badge with color coding
 * - Hover overlay with additional details
 * - Click handler for opening detail drawer
 * - Permission-aware action buttons
 *
 * @module components/domain/inventory/ItemCard
 */

import React, { useCallback, useMemo } from 'react';

import { ShoppingOutlined, EditOutlined, TagOutlined, EyeOutlined } from '@ant-design/icons';
import { Badge, Image, Tag, Tooltip, Space, Typography, Dropdown } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { InventoryItemWithRelations } from '@/lib/hooks/data/useInventoryItems';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';

import type { MenuProps } from 'antd';

const { Text, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the ItemCard component
 */
export interface ItemCardProps {
  /**
   * The inventory item to display
   */
  item: InventoryItemWithRelations;

  /**
   * Callback when the card is clicked
   */
  onClick?: (item: InventoryItemWithRelations) => void;

  /**
   * Callback for quick action buttons
   */
  onQuickAction?: (action: 'edit' | 'reserve' | 'sell', item: InventoryItemWithRelations) => void;

  /**
   * Whether the card is currently selected
   */
  selected?: boolean;

  /**
   * Whether to show action buttons
   * @default true
   */
  showActions?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Status badge color mapping
 */
const STATUS_COLORS: Record<string, string> = {
  available: 'green',
  reserved: 'orange',
  sold: 'blue',
  workshop: 'purple',
  damaged: 'red',
  returned: 'cyan',
  consignment: 'gold',
};

/**
 * Status badge text color mapping for better contrast
 */
const STATUS_TEXT_COLORS: Record<string, string> = {
  available: 'text-green-700',
  reserved: 'text-orange-700',
  sold: 'text-blue-700',
  workshop: 'text-purple-700',
  damaged: 'text-red-700',
  returned: 'text-cyan-700',
  consignment: 'text-amber-700',
};

/**
 * Placeholder image for items without images
 */
const PLACEHOLDER_IMAGE = '/images/placeholder-jewelry.svg';

/**
 * Extended type for inventory item with optional image URL
 * The image URL may come from a related file_uploads table or storage
 */
interface InventoryItemDisplay extends InventoryItemWithRelations {
  /** Primary image URL from file uploads or storage */
  image_url?: string | null;
  /** Computed selling price (may be calculated from purchase_price + markup) */
  selling_price?: number | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format weight in grams with proper units
 */
function formatWeight(weightGrams: number | null | undefined): string {
  if (weightGrams === null || weightGrams === undefined) {
    return '-';
  }
  return `${weightGrams.toFixed(2)}g`;
}

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

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ItemCard Component
 *
 * Displays an inventory item in a card format suitable for grid layouts.
 * Includes product image, essential info, status badge, and quick actions.
 */
export function ItemCard({
  item,
  onClick,
  onQuickAction,
  selected = false,
  showActions = true,
}: ItemCardProps): JSX.Element {
  const t = useTranslations();
  const { can } = usePermissions();

  // Determine if user has various permissions
  const canEdit = can('inventory.manage');
  const canSell = can('sales.create');
  const canReserve = can('inventory.manage');

  // Handle card click
  const handleClick = useCallback(() => {
    onClick?.(item);
  }, [onClick, item]);

  // Handle quick action clicks
  const handleQuickAction = useCallback(
    (action: 'edit' | 'reserve' | 'sell') => (e: React.MouseEvent) => {
      e.stopPropagation();
      onQuickAction?.(action, item);
    },
    [onQuickAction, item]
  );

  // Build dropdown menu items for actions
  const actionMenuItems: MenuProps['items'] = useMemo(() => {
    const items: MenuProps['items'] = [];

    if (canEdit) {
      items.push({
        key: 'edit',
        icon: <EditOutlined />,
        label: t('common.actions.edit'),
        onClick: () => onQuickAction?.('edit', item),
      });
    }

    if (canReserve && item.status === 'available') {
      items.push({
        key: 'reserve',
        icon: <TagOutlined />,
        label: t('inventory.reserved'),
        onClick: () => onQuickAction?.('reserve', item),
      });
    }

    if (canSell && item.status === 'available') {
      items.push({
        key: 'sell',
        icon: <ShoppingOutlined />,
        label: t('sales.newSale'),
        onClick: () => onQuickAction?.('sell', item),
      });
    }

    return items;
  }, [canEdit, canReserve, canSell, item, onQuickAction, t]);

  // Get status color
  const statusColor = STATUS_COLORS[item.status || 'available'] || 'default';
  const statusTextColor = STATUS_TEXT_COLORS[item.status || 'available'] || 'text-stone-700';

  // Cast to extended type to support optional display properties
  const displayItem = item as InventoryItemDisplay;

  // Get display values
  const imageUrl = displayItem.image_url || PLACEHOLDER_IMAGE;
  const itemName = item.item_name || t('common.labels.name');
  const sku = item.sku || '-';
  const price = formatPrice(displayItem.selling_price || item.purchase_price);
  const weight = formatWeight(item.weight_grams);
  const category = item.category?.category_name;
  const metalType = item.metal_type?.metal_name;
  const purity = item.metal_purity?.purity_name;
  const statusLabel = item.status
    ? t(`inventory.${item.status}` as Parameters<typeof t>[0])
    : t('common.labels.status');

  return (
    <Card
      hoverable
      className={cn(
        // Base styles
        'relative overflow-hidden transition-all duration-300',
        // Selected state
        selected && ['ring-2 ring-amber-500 ring-offset-2', 'border-amber-400'],
        // Custom hover styles
        'group'
      )}
      onClick={handleClick}
      bodyStyle={{ padding: 0 }}
    >
      {/* Image Container - 4:3 Aspect Ratio */}
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        <Image
          src={imageUrl}
          alt={itemName}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          preview={false}
          fallback={PLACEHOLDER_IMAGE}
          placeholder={
            <div className="flex h-full w-full items-center justify-center bg-stone-100">
              <ShoppingOutlined className="text-4xl text-stone-300" />
            </div>
          }
        />

        {/* Status Badge - Top End */}
        <div className="absolute top-2 end-2">
          <Badge
            color={statusColor}
            text={<span className={cn('text-xs font-medium', statusTextColor)}>{statusLabel}</span>}
            className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5"
          />
        </div>

        {/* Hover Overlay with Additional Details */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent',
            'flex flex-col justify-end p-3',
            'opacity-0 transition-opacity duration-300 group-hover:opacity-100'
          )}
        >
          <div className="space-y-1 text-white">
            {/* Metal & Purity */}
            {(metalType || purity) && (
              <div className="flex items-center gap-2 text-xs">
                {metalType && <span>{metalType}</span>}
                {purity && (
                  <Tag
                    className="border-0 bg-amber-500/80 text-white m-0"
                    style={{ fontSize: '10px', lineHeight: '16px', padding: '0 6px' }}
                  >
                    {purity}
                  </Tag>
                )}
              </div>
            )}

            {/* Weight */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-300">{t('inventory.metals.weight')}:</span>
              <span className="font-medium">{weight}</span>
            </div>

            {/* Category */}
            {category && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-300">{t('common.labels.category')}:</span>
                <span className="font-medium">{category}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick View Button - Shows on Hover */}
        <div
          className={cn(
            'absolute top-2 start-2',
            'opacity-0 transition-opacity duration-300 group-hover:opacity-100'
          )}
        >
          <Tooltip title={t('common.actions.view')}>
            <Button
              type="primary"
              shape="circle"
              size="small"
              icon={<EyeOutlined />}
              onClick={handleClick}
              className="bg-white/90 text-stone-700 hover:bg-white hover:text-amber-600 border-0 shadow-sm"
            />
          </Tooltip>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3 space-y-2">
        {/* Item Name */}
        <Paragraph
          ellipsis={{ rows: 1, tooltip: itemName }}
          className="!mb-0 font-semibold text-stone-900 text-sm"
        >
          {itemName}
        </Paragraph>

        {/* SKU */}
        <Text type="secondary" className="text-xs block">
          {t('inventory.sku')}: {sku}
        </Text>

        {/* Price and Actions Row */}
        <div className="flex items-center justify-between pt-1">
          {/* Price */}
          <Text strong className="text-amber-600 text-base">
            {price}
          </Text>

          {/* Action Buttons */}
          {showActions && actionMenuItems && actionMenuItems.length > 0 && (
            <Space size="small">
              {/* Primary action: View/Edit */}
              {canEdit && (
                <Tooltip title={t('common.actions.edit')}>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={handleQuickAction('edit')}
                    className="text-stone-500 hover:text-amber-600"
                  />
                </Tooltip>
              )}

              {/* Quick Sell Button - Only for available items */}
              {canSell && item.status === 'available' && (
                <Tooltip title={t('sales.newSale')}>
                  <Button
                    type="text"
                    size="small"
                    icon={<ShoppingOutlined />}
                    onClick={handleQuickAction('sell')}
                    className="text-stone-500 hover:text-green-600"
                  />
                </Tooltip>
              )}

              {/* More Actions Dropdown */}
              {actionMenuItems.length > 2 && (
                <Dropdown menu={{ items: actionMenuItems }} trigger={['click']}>
                  <Button
                    type="text"
                    size="small"
                    onClick={(e) => e.stopPropagation()}
                    className="text-stone-500 hover:text-amber-600"
                  >
                    ...
                  </Button>
                </Dropdown>
              )}
            </Space>
          )}
        </div>
      </div>

      {/* Selected Indicator */}
      {selected && <div className="absolute top-0 start-0 w-1 h-full bg-amber-500" />}
    </Card>
  );
}

// =============================================================================
// SKELETON VARIANT
// =============================================================================

/**
 * Loading skeleton variant of ItemCard
 */
export function ItemCardSkeleton(): JSX.Element {
  return (
    <Card className="overflow-hidden" bodyStyle={{ padding: 0 }}>
      {/* Image Skeleton */}
      <div className="aspect-[4/3] bg-stone-200 animate-pulse" />

      {/* Content Skeleton */}
      <div className="p-3 space-y-2">
        <div className="h-4 bg-stone-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-stone-200 rounded animate-pulse w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-5 bg-stone-200 rounded animate-pulse w-20" />
          <div className="h-6 bg-stone-200 rounded animate-pulse w-16" />
        </div>
      </div>
    </Card>
  );
}

export default ItemCard;
