'use client';

/**
 * CartItem Component
 *
 * Individual line item component for the POS cart.
 * Displays item details, quantity controls, and line discount options.
 *
 * Features:
 * - Image thumbnail with fallback
 * - Item details (name, SKU, metal type, purity, weight)
 * - Unit price display
 * - Quantity controls (for applicable items)
 * - Line discount input (percentage or fixed)
 * - Calculated line total
 * - Remove button
 * - Animations for state changes
 *
 * @module components/domain/sales/CartItem
 */

import React, { useCallback, useState, useMemo } from 'react';

import {
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
  PercentageOutlined,
  DollarOutlined,
  ShoppingOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { InputNumber, Typography, Tooltip, Popover, Space, Segmented } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatWeight } from '@/lib/utils/format';
import {
  type CartItem as CartItemType,
  type DiscountType,
  calculateLineTotal,
} from '@/stores/cartStore';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the CartItem component
 */
export interface CartItemProps {
  /**
   * The cart item to display
   */
  item: CartItemType;

  /**
   * Currency code for price formatting
   */
  currency: string;

  /**
   * Callback when quantity changes
   */
  onQuantityChange?: (id: string, quantity: number) => void;

  /**
   * Callback when discount changes
   */
  onDiscountChange?: (id: string, type: DiscountType | null, value: number) => void;

  /**
   * Callback when item is removed
   */
  onRemove?: (id: string) => void;

  /**
   * Whether quantity controls are enabled
   * Some jewelry items are unique (quantity always 1)
   * @default true
   */
  quantityEditable?: boolean;

  /**
   * Whether discount controls are enabled
   * @default true
   */
  discountEditable?: boolean;

  /**
   * Whether the item is being removed (for animation)
   */
  isRemoving?: boolean;

  /**
   * Size variant
   * @default 'default'
   */
  size?: 'small' | 'default';
}

// =============================================================================
// CONSTANTS
// =============================================================================

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Discount Popover Content
 */
function DiscountPopover({
  discountType,
  discountValue,
  maxDiscount,
  onChange,
  t,
}: {
  discountType: DiscountType | undefined;
  discountValue: number | undefined;
  maxDiscount: number;
  onChange: (type: DiscountType | null, value: number) => void;
  t: ReturnType<typeof useTranslations>;
}): JSX.Element {
  const [type, setType] = useState<DiscountType>(discountType || 'percentage');
  const [value, setValue] = useState<number>(discountValue || 0);

  const handleApply = () => {
    if (value > 0) {
      onChange(type, value);
    } else {
      onChange(null, 0);
    }
  };

  const handleClear = () => {
    setValue(0);
    onChange(null, 0);
  };

  return (
    <div className="p-2 space-y-3 min-w-[200px]">
      <Text strong className="block text-sm">
        {t('sales.cart.lineDiscount')}
      </Text>

      <Segmented
        value={type}
        onChange={(val) => setType(val as DiscountType)}
        options={[
          {
            value: 'percentage',
            icon: <PercentageOutlined />,
            label: '%',
          },
          {
            value: 'fixed',
            icon: <DollarOutlined />,
            label: t('common.labels.fixed'),
          },
        ]}
        block
        size="small"
      />

      <InputNumber
        value={value}
        onChange={(val) => setValue(val || 0)}
        min={0}
        max={type === 'percentage' ? 100 : maxDiscount}
        precision={type === 'percentage' ? 0 : 2}
        suffix={type === 'percentage' ? '%' : undefined}
        className="w-full"
        size="small"
      />

      <Space className="w-full justify-end">
        <Button type="text" size="small" onClick={handleClear}>
          {t('common.actions.clear')}
        </Button>
        <Button type="primary" size="small" onClick={handleApply}>
          {t('common.actions.apply')}
        </Button>
      </Space>
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * CartItem Component
 *
 * Displays a single line item in the cart with controls for
 * quantity, discount, and removal.
 */
export function CartItem({
  item,
  currency,
  onQuantityChange,
  onDiscountChange,
  onRemove,
  quantityEditable = true,
  discountEditable = true,
  isRemoving = false,
  size = 'default',
}: CartItemProps): JSX.Element {
  const t = useTranslations();
  const { can } = usePermissions();

  const [discountPopoverOpen, setDiscountPopoverOpen] = useState(false);

  // Permission checks
  const canApplyDiscount = can('sales.discount');

  // Calculate line total
  const lineTotal = useMemo(() => calculateLineTotal(item), [item]);
  const baseTotal = item.price * item.quantity;
  const hasDiscount = item.discountValue && item.discountValue > 0;
  const discountAmount = baseTotal - lineTotal;

  // Handlers
  const handleQuantityChange = useCallback(
    (newQuantity: number | null) => {
      if (newQuantity !== null && onQuantityChange) {
        onQuantityChange(item.id, newQuantity);
      }
    },
    [item.id, onQuantityChange]
  );

  const handleDecrement = useCallback(() => {
    if (item.quantity > 1 && onQuantityChange) {
      onQuantityChange(item.id, item.quantity - 1);
    }
  }, [item.id, item.quantity, onQuantityChange]);

  const handleIncrement = useCallback(() => {
    if (onQuantityChange) {
      onQuantityChange(item.id, item.quantity + 1);
    }
  }, [item.id, item.quantity, onQuantityChange]);

  const handleDiscountChange = useCallback(
    (type: DiscountType | null, value: number) => {
      if (onDiscountChange) {
        onDiscountChange(item.id, type, value);
      }
      setDiscountPopoverOpen(false);
    },
    [item.id, onDiscountChange]
  );

  const handleRemove = useCallback(() => {
    if (onRemove) {
      onRemove(item.id);
    }
  }, [item.id, onRemove]);

  // Size-specific styles
  const isSmall = size === 'small';
  const imageSize = isSmall ? 'w-10 h-10' : 'w-14 h-14';
  const textSize = isSmall ? 'text-xs' : 'text-sm';

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-3 border-b border-stone-100 last:border-0',
        'transition-all duration-300',
        isRemoving && 'opacity-50 scale-95 translate-x-4'
      )}
    >
      {/* Item Image */}
      <div className={cn(imageSize, 'bg-stone-100 rounded-lg overflow-hidden flex-shrink-0')}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">
            <ShoppingOutlined className="text-stone-400" />
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0 space-y-0.5">
        {/* Name */}
        <Text strong className={cn('block truncate', textSize)}>
          {item.name}
        </Text>

        {/* SKU */}
        <Text type="secondary" className="text-xs block">
          {item.sku}
        </Text>

        {/* Metal Type & Purity */}
        {(item.metalType || item.purity) && (
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            {item.metalType && <span>{item.metalType}</span>}
            {item.purity && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
                {item.purity}
              </span>
            )}
          </div>
        )}

        {/* Weight */}
        {item.weight && (
          <Text type="secondary" className="text-xs block">
            {formatWeight(item.weight)}
          </Text>
        )}

        {/* Unit Price */}
        <Text type="secondary" className="text-xs block">
          {formatCurrency(item.price, currency)} x {item.quantity}
        </Text>

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="flex items-center gap-1 mt-1">
            <TagOutlined className="text-green-600 text-xs" />
            <Text className="text-xs text-green-600">
              -{formatCurrency(discountAmount, currency)}
              {item.discountType === 'percentage' && (
                <span className="text-stone-400 ms-1">({item.discountValue}%)</span>
              )}
            </Text>
          </div>
        )}
      </div>

      {/* Controls Column */}
      <div className="flex flex-col items-end gap-2">
        {/* Quantity Controls */}
        {quantityEditable && (
          <div className="flex items-center gap-1">
            <Button
              type="text"
              size="small"
              icon={<MinusOutlined />}
              onClick={handleDecrement}
              disabled={item.quantity <= 1}
              className="!w-6 !h-6 !min-w-0 !p-0"
            />
            <InputNumber
              min={1}
              max={999}
              value={item.quantity}
              onChange={handleQuantityChange}
              controls={false}
              className={cn('text-center', isSmall ? '!w-8' : '!w-10')}
              size="small"
            />
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleIncrement}
              className="!w-6 !h-6 !min-w-0 !p-0"
            />
          </div>
        )}

        {/* Line Total */}
        <div className="text-end">
          {hasDiscount && (
            <Text delete type="secondary" className="text-xs block text-stone-400">
              {formatCurrency(baseTotal, currency)}
            </Text>
          )}
          <Text strong className={cn('text-amber-600', isSmall ? 'text-sm' : 'text-base')}>
            {formatCurrency(lineTotal, currency)}
          </Text>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Discount Button */}
          {discountEditable && canApplyDiscount && (
            <Popover
              content={
                <DiscountPopover
                  discountType={item.discountType}
                  discountValue={item.discountValue}
                  maxDiscount={baseTotal}
                  onChange={handleDiscountChange}
                  t={t}
                />
              }
              title={null}
              trigger="click"
              open={discountPopoverOpen}
              onOpenChange={setDiscountPopoverOpen}
              placement="bottomRight"
            >
              <Tooltip title={t('sales.cart.lineDiscount')}>
                <Button
                  type="text"
                  size="small"
                  icon={<PercentageOutlined />}
                  className={cn(
                    '!w-7 !h-7 !min-w-0 !p-0',
                    hasDiscount
                      ? 'text-green-600 hover:text-green-700'
                      : 'text-stone-400 hover:text-amber-600'
                  )}
                />
              </Tooltip>
            </Popover>
          )}

          {/* Remove Button */}
          <Tooltip title={t('common.actions.remove')}>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={handleRemove}
              className="!w-7 !h-7 !min-w-0 !p-0"
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

/**
 * Loading skeleton for CartItem
 */
export function CartItemSkeleton({
  size = 'default',
}: {
  size?: 'small' | 'default';
}): JSX.Element {
  const isSmall = size === 'small';
  const imageSize = isSmall ? 'w-10 h-10' : 'w-14 h-14';

  return (
    <div className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-0">
      {/* Image Skeleton */}
      <div className={cn(imageSize, 'bg-stone-200 rounded-lg animate-pulse')} />

      {/* Details Skeleton */}
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-stone-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-stone-200 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-stone-200 rounded animate-pulse w-1/3" />
      </div>

      {/* Controls Skeleton */}
      <div className="flex flex-col items-end gap-2">
        <div className="h-6 bg-stone-200 rounded animate-pulse w-20" />
        <div className="h-5 bg-stone-200 rounded animate-pulse w-16" />
      </div>
    </div>
  );
}

export default CartItem;
