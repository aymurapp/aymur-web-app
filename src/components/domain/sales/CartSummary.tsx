'use client';

/**
 * CartSummary Component
 *
 * Displays the cart summary with subtotal, discounts, tax, and grand total.
 * Provides real-time updates as cart items change.
 *
 * Features:
 * - Subtotal calculation (sum of line items)
 * - Line discounts breakdown
 * - Order-level discount display
 * - Tax calculation based on shop settings
 * - Grand total with real-time updates
 * - Currency formatting using shop currency
 *
 * @module components/domain/sales/CartSummary
 */

import React, { useMemo } from 'react';

import { TagOutlined, PercentageOutlined, CalculatorOutlined } from '@ant-design/icons';
import { Divider, Typography, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import {
  type CartItem,
  type OrderDiscount,
  calculateSubtotal,
  calculateLineDiscounts,
  calculateOrderDiscountAmount,
  calculateTaxAmount,
  calculateGrandTotal,
} from '@/stores/cartStore';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the CartSummary component
 */
export interface CartSummaryProps {
  /**
   * Cart items
   */
  items: CartItem[];

  /**
   * Order-level discount
   */
  orderDiscount: OrderDiscount | null;

  /**
   * Tax rate (percentage, e.g., 5 for 5%)
   * @default 0
   */
  taxRate?: number;

  /**
   * Currency code for formatting
   */
  currency: string;

  /**
   * Whether to show tax breakdown
   * @default true
   */
  showTax?: boolean;

  /**
   * Whether to show line discounts separately
   * @default true
   */
  showLineDiscounts?: boolean;

  /**
   * Size variant
   * @default 'default'
   */
  size?: 'small' | 'default' | 'large';

  /**
   * Additional class names
   */
  className?: string;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Summary Row Component
 */
function SummaryRow({
  label,
  value,
  icon,
  isTotal = false,
  isDiscount = false,
  tooltip,
  className,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  isTotal?: boolean;
  isDiscount?: boolean;
  tooltip?: string;
  className?: string;
}): JSX.Element {
  const content = (
    <div className={cn('flex items-center justify-between', isTotal && 'py-2', className)}>
      <div className="flex items-center gap-2">
        {icon && (
          <span className={cn('text-stone-400', isDiscount && 'text-green-600')}>{icon}</span>
        )}
        <Text
          className={cn(isTotal && 'font-semibold text-base', !isTotal && 'text-sm text-stone-600')}
        >
          {label}
        </Text>
      </div>
      <Text
        className={cn(
          isTotal && 'font-bold text-lg text-amber-600',
          !isTotal && 'text-sm',
          isDiscount && !isTotal && 'text-green-600'
        )}
      >
        {isDiscount && !isTotal && value !== '-' ? `-${value}` : value}
      </Text>
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} placement="left">
        {content}
      </Tooltip>
    );
  }

  return content;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * CartSummary Component
 *
 * Displays comprehensive cart totals including subtotal, discounts,
 * taxes, and grand total with proper currency formatting.
 */
export function CartSummary({
  items,
  orderDiscount,
  taxRate = 0,
  currency,
  showTax = true,
  showLineDiscounts = true,
  size = 'default',
  className,
}: CartSummaryProps): JSX.Element {
  const t = useTranslations();

  // Calculate all totals
  const { subtotal, lineDiscountsAmount, orderDiscountAmount, taxAmount, grandTotal } =
    useMemo(() => {
      const sub = calculateSubtotal(items);
      const lineDisc = calculateLineDiscounts(items);
      const orderDisc = calculateOrderDiscountAmount(sub, orderDiscount);
      const tax = showTax ? calculateTaxAmount(sub, orderDisc, taxRate) : 0;
      const total = calculateGrandTotal(sub, orderDisc, tax);

      return {
        subtotal: sub,
        lineDiscountsAmount: lineDisc,
        orderDiscountAmount: orderDisc,
        taxAmount: tax,
        grandTotal: total,
      };
    }, [items, orderDiscount, taxRate, showTax]);

  // Check if there are any discounts
  const hasLineDiscounts = lineDiscountsAmount > 0;
  const hasOrderDiscount = orderDiscountAmount > 0;
  const hasTax = showTax && taxRate > 0;

  // size is used for potential future styling variations
  void size;

  // If cart is empty, show minimal summary
  if (items.length === 0) {
    return (
      <div className={cn('py-4', className)}>
        <SummaryRow label={t('sales.cart.total')} value={formatCurrency(0, currency)} isTotal />
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Subtotal (before discounts applied at line level) */}
      <SummaryRow
        label={t('sales.cart.subtotal')}
        value={formatCurrency(subtotal, currency)}
        icon={<CalculatorOutlined />}
      />

      {/* Line Discounts */}
      {showLineDiscounts && hasLineDiscounts && (
        <SummaryRow
          label={t('sales.cart.lineDiscounts')}
          value={formatCurrency(lineDiscountsAmount, currency)}
          icon={<TagOutlined />}
          isDiscount
          tooltip={t('sales.cart.lineDiscountsTooltip')}
        />
      )}

      {/* Order Discount */}
      {hasOrderDiscount && (
        <SummaryRow
          label={
            orderDiscount?.type === 'percentage'
              ? `${t('sales.cart.orderDiscount')} (${orderDiscount.value}%)`
              : t('sales.cart.orderDiscount')
          }
          value={formatCurrency(orderDiscountAmount, currency)}
          icon={<PercentageOutlined />}
          isDiscount
        />
      )}

      {/* Tax */}
      {hasTax && (
        <SummaryRow
          label={`${t('sales.cart.tax')} (${taxRate}%)`}
          value={formatCurrency(taxAmount, currency)}
        />
      )}

      <Divider className="!my-3" />

      {/* Grand Total */}
      <SummaryRow
        label={t('sales.cart.total')}
        value={formatCurrency(grandTotal, currency)}
        isTotal
      />

      {/* Items count */}
      <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
        <span>{t('sales.cart.itemsCount', { count: items.length })}</span>
        <span>
          {items.reduce((sum, item) => sum + item.quantity, 0)} {t('sales.cart.units')}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// COMPACT VARIANT
// =============================================================================

/**
 * Compact summary showing only total
 */
export function CartSummaryCompact({
  items,
  orderDiscount,
  taxRate = 0,
  currency,
  className,
}: Omit<CartSummaryProps, 'showTax' | 'showLineDiscounts' | 'size'>): JSX.Element {
  const t = useTranslations();

  const grandTotal = useMemo(() => {
    const subtotal = calculateSubtotal(items);
    const orderDiscountAmount = calculateOrderDiscountAmount(subtotal, orderDiscount);
    const taxAmount = calculateTaxAmount(subtotal, orderDiscountAmount, taxRate);
    return calculateGrandTotal(subtotal, orderDiscountAmount, taxAmount);
  }, [items, orderDiscount, taxRate]);

  return (
    <div
      className={cn(
        'flex items-center justify-between py-2 px-3 bg-amber-50 rounded-lg',
        className
      )}
    >
      <Text className="text-sm text-stone-600">{t('sales.cart.total')}</Text>
      <Text strong className="text-lg text-amber-600">
        {formatCurrency(grandTotal, currency)}
      </Text>
    </div>
  );
}

// =============================================================================
// DETAILED BREAKDOWN
// =============================================================================

/**
 * Detailed breakdown for receipts/invoices
 */
export function CartSummaryDetailed({
  items,
  orderDiscount,
  taxRate = 0,
  currency,
  className,
}: CartSummaryProps): JSX.Element {
  const t = useTranslations();

  // Calculate all values
  const calculations = useMemo(() => {
    const rawSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const subtotalAfterLineDiscounts = calculateSubtotal(items);
    const lineDiscounts = rawSubtotal - subtotalAfterLineDiscounts;
    const orderDiscountAmount = calculateOrderDiscountAmount(
      subtotalAfterLineDiscounts,
      orderDiscount
    );
    const subtotalAfterAllDiscounts = subtotalAfterLineDiscounts - orderDiscountAmount;
    const taxAmount = calculateTaxAmount(subtotalAfterLineDiscounts, orderDiscountAmount, taxRate);
    const grandTotal = subtotalAfterAllDiscounts + taxAmount;

    return {
      rawSubtotal,
      lineDiscounts,
      subtotalAfterLineDiscounts,
      orderDiscountAmount,
      subtotalAfterAllDiscounts,
      taxAmount,
      grandTotal,
    };
  }, [items, orderDiscount, taxRate]);

  return (
    <div className={cn('space-y-1', className)}>
      {/* Raw Subtotal */}
      <SummaryRow
        label={t('sales.cart.subtotalBeforeDiscounts')}
        value={formatCurrency(calculations.rawSubtotal, currency)}
      />

      {/* Line Discounts */}
      {calculations.lineDiscounts > 0 && (
        <SummaryRow
          label={t('sales.cart.lineDiscounts')}
          value={formatCurrency(calculations.lineDiscounts, currency)}
          isDiscount
        />
      )}

      {/* Subtotal After Line Discounts */}
      {calculations.lineDiscounts > 0 && (
        <SummaryRow
          label={t('sales.cart.subtotalAfterLineDiscounts')}
          value={formatCurrency(calculations.subtotalAfterLineDiscounts, currency)}
        />
      )}

      {/* Order Discount */}
      {calculations.orderDiscountAmount > 0 && (
        <SummaryRow
          label={t('sales.cart.orderDiscount')}
          value={formatCurrency(calculations.orderDiscountAmount, currency)}
          isDiscount
        />
      )}

      {/* Subtotal After All Discounts */}
      {(calculations.lineDiscounts > 0 || calculations.orderDiscountAmount > 0) && (
        <>
          <Divider className="!my-2" />
          <SummaryRow
            label={t('sales.cart.subtotalAfterDiscounts')}
            value={formatCurrency(calculations.subtotalAfterAllDiscounts, currency)}
          />
        </>
      )}

      {/* Tax */}
      {taxRate > 0 && (
        <SummaryRow
          label={`${t('sales.cart.tax')} (${taxRate}%)`}
          value={formatCurrency(calculations.taxAmount, currency)}
        />
      )}

      <Divider className="!my-2" />

      {/* Grand Total */}
      <SummaryRow
        label={t('sales.cart.grandTotal')}
        value={formatCurrency(calculations.grandTotal, currency)}
        isTotal
      />
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

/**
 * Loading skeleton for CartSummary
 */
export function CartSummarySkeleton(): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <div className="h-4 bg-stone-200 rounded animate-pulse w-20" />
        <div className="h-4 bg-stone-200 rounded animate-pulse w-24" />
      </div>
      <div className="flex justify-between">
        <div className="h-4 bg-stone-200 rounded animate-pulse w-16" />
        <div className="h-4 bg-stone-200 rounded animate-pulse w-20" />
      </div>
      <Divider className="!my-3" />
      <div className="flex justify-between">
        <div className="h-5 bg-stone-200 rounded animate-pulse w-12" />
        <div className="h-5 bg-stone-200 rounded animate-pulse w-28" />
      </div>
    </div>
  );
}

export default CartSummary;
