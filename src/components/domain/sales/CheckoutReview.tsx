'use client';

/**
 * CheckoutReview Component
 *
 * Order summary before payment step in checkout flow.
 * Displays items, customer info, discounts, and totals with edit capability.
 *
 * Features:
 * - Complete order summary with all items
 * - Customer information display
 * - Discount breakdown (line and order level)
 * - Tax display
 * - Grand total highlighting
 * - Edit buttons to return to POS
 * - Confirm and proceed button
 * - RTL support
 *
 * @module components/domain/sales/CheckoutReview
 */

import React from 'react';

import {
  ShoppingCartOutlined,
  UserOutlined,
  TagOutlined,
  EditOutlined,
  CheckOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import { Typography, Divider, Empty, Avatar, Tag } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import { type CartItem as CartItemType, type CartCustomer } from '@/stores/cartStore';

const { Text, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for CheckoutReview component
 */
export interface CheckoutReviewProps {
  /**
   * Cart items to display
   */
  items: CartItemType[];

  /**
   * Selected customer (null for walk-in)
   */
  customer: CartCustomer | null;

  /**
   * Calculated totals
   */
  totals: {
    subtotal: number;
    lineDiscounts: number;
    orderDiscount: number;
    taxAmount: number;
    grandTotal: number;
  };

  /**
   * Currency code
   */
  currency: string;

  /**
   * Order notes
   */
  notes?: string;

  /**
   * Callback to edit cart (go back to POS)
   */
  onEdit?: () => void;

  /**
   * Callback to change customer
   */
  onChangeCustomer?: () => void;

  /**
   * Callback to proceed to next step
   */
  onProceed?: () => void;

  /**
   * Whether proceeding is disabled
   * @default false
   */
  proceedDisabled?: boolean;

  /**
   * Whether component is in loading state
   * @default false
   */
  isLoading?: boolean;

  /**
   * Additional class names
   */
  className?: string;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Review Item Row
 */
function ReviewItem({ item, currency }: { item: CartItemType; currency: string }): JSX.Element {
  const t = useTranslations();

  // Calculate line total with discount
  const baseTotal = item.price * item.quantity;
  let discountAmount = 0;

  if (item.discountType && item.discountValue) {
    if (item.discountType === 'percentage') {
      discountAmount = (baseTotal * item.discountValue) / 100;
    } else {
      discountAmount = item.discountValue;
    }
  }

  const lineTotal = baseTotal - discountAmount;

  return (
    <div className="flex items-start gap-3 py-3">
      {/* Item Image */}
      <div className="w-12 h-12 rounded-lg bg-stone-100 flex-shrink-0 overflow-hidden">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCartOutlined className="text-stone-400" />
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <Text strong className="block truncate">
          {item.name}
        </Text>
        {item.sku && (
          <Text type="secondary" className="text-xs block">
            {t('inventory.sku')}: {item.sku}
          </Text>
        )}
        <div className="flex items-center gap-2 mt-1">
          <Text type="secondary" className="text-sm">
            {formatCurrency(item.price, currency)} x {item.quantity}
          </Text>
          {discountAmount > 0 && (
            <Tag color="green" className="!text-xs">
              -
              {item.discountType === 'percentage'
                ? `${item.discountValue}%`
                : formatCurrency(discountAmount, currency)}
            </Tag>
          )}
        </div>
      </div>

      {/* Line Total */}
      <div className="text-end flex-shrink-0">
        <Text strong className="text-amber-600">
          {formatCurrency(lineTotal, currency)}
        </Text>
        {discountAmount > 0 && (
          <Text type="secondary" className="text-xs line-through block">
            {formatCurrency(baseTotal, currency)}
          </Text>
        )}
      </div>
    </div>
  );
}

/**
 * Customer Section
 */
function CustomerSection({
  customer,
  onChangeCustomer,
  currency,
}: {
  customer: CartCustomer | null;
  onChangeCustomer?: () => void;
  currency: string;
}): JSX.Element {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
      <Avatar
        size={40}
        icon={<UserOutlined />}
        className={cn(customer ? 'bg-amber-100 text-amber-600' : 'bg-stone-200 text-stone-500')}
      />
      <div className="flex-1 min-w-0">
        <Text strong className="block">
          {customer?.name || t('sales.walkInCustomer')}
        </Text>
        {customer?.phone && (
          <Text type="secondary" className="text-sm block">
            {customer.phone}
          </Text>
        )}
        {customer?.balance !== undefined && customer.balance !== 0 && (
          <Text className={cn('text-xs', customer.balance > 0 ? 'text-green-600' : 'text-red-600')}>
            {t('sales.cart.balance')}: {formatCurrency(customer.balance, currency)}
          </Text>
        )}
      </div>
      {onChangeCustomer && (
        <Button type="text" size="small" icon={<EditOutlined />} onClick={onChangeCustomer}>
          {t('common.actions.edit')}
        </Button>
      )}
    </div>
  );
}

/**
 * Totals Summary Section
 */
function TotalsSummary({
  totals,
  currency,
}: {
  totals: CheckoutReviewProps['totals'];
  currency: string;
}): JSX.Element {
  const t = useTranslations();

  const hasLineDiscounts = totals.lineDiscounts > 0;
  const hasOrderDiscount = totals.orderDiscount > 0;
  const hasTax = totals.taxAmount > 0;
  const hasDiscounts = hasLineDiscounts || hasOrderDiscount;

  return (
    <div className="space-y-2 pt-2">
      {/* Subtotal */}
      <div className="flex justify-between items-center">
        <Text type="secondary">{t('common.labels.subtotal')}</Text>
        <Text>{formatCurrency(totals.subtotal, currency)}</Text>
      </div>

      {/* Line Discounts */}
      {hasLineDiscounts && (
        <div className="flex justify-between items-center">
          <Text type="secondary" className="flex items-center gap-1">
            <TagOutlined className="text-green-500" />
            {t('sales.checkout.itemDiscounts')}
          </Text>
          <Text className="text-green-600">-{formatCurrency(totals.lineDiscounts, currency)}</Text>
        </div>
      )}

      {/* Order Discount */}
      {hasOrderDiscount && (
        <div className="flex justify-between items-center">
          <Text type="secondary" className="flex items-center gap-1">
            <PercentageOutlined className="text-green-500" />
            {t('sales.checkout.orderDiscount')}
          </Text>
          <Text className="text-green-600">-{formatCurrency(totals.orderDiscount, currency)}</Text>
        </div>
      )}

      {/* Tax */}
      {hasTax && (
        <div className="flex justify-between items-center">
          <Text type="secondary">{t('common.labels.tax')}</Text>
          <Text>{formatCurrency(totals.taxAmount, currency)}</Text>
        </div>
      )}

      {/* Divider before grand total */}
      <Divider className="!my-3" />

      {/* Grand Total */}
      <div className="flex justify-between items-center">
        <Title level={5} className="!mb-0">
          {t('sales.grandTotal')}
        </Title>
        <Title level={4} className="!mb-0 text-amber-600">
          {formatCurrency(totals.grandTotal, currency)}
        </Title>
      </div>

      {/* Savings indicator */}
      {hasDiscounts && (
        <div className="flex justify-end">
          <Tag color="green" className="!me-0">
            {t('sales.checkout.youSave', {
              amount: formatCurrency(totals.lineDiscounts + totals.orderDiscount, currency),
            })}
          </Tag>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CheckoutReview Component
 *
 * Displays order summary before proceeding to payment.
 *
 * @example
 * ```tsx
 * <CheckoutReview
 *   items={cartItems}
 *   customer={selectedCustomer}
 *   totals={calculatedTotals}
 *   currency="USD"
 *   onEdit={() => router.push('/pos')}
 *   onProceed={() => setStep('payment')}
 * />
 * ```
 */
export function CheckoutReview({
  items,
  customer,
  totals,
  currency,
  notes,
  onEdit,
  onChangeCustomer,
  onProceed,
  proceedDisabled = false,
  isLoading = false,
  className,
}: CheckoutReviewProps): JSX.Element {
  const t = useTranslations();

  // Empty state
  if (items.length === 0) {
    return (
      <Card className={cn('p-6', className)}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('sales.checkout.emptyCart')} />
        {onEdit && (
          <div className="flex justify-center mt-4">
            <Button type="primary" onClick={onEdit}>
              {t('sales.checkout.goBack')}
            </Button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Items Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <ShoppingCartOutlined className="text-amber-500" />
            <span>{t('sales.checkout.orderItems')}</span>
            <Tag className="!ms-2">{items.length}</Tag>
          </div>
        }
        extra={
          onEdit && (
            <Button type="text" icon={<EditOutlined />} onClick={onEdit}>
              {t('common.actions.edit')}
            </Button>
          )
        }
      >
        <div className="divide-y divide-stone-100">
          {items.map((item) => (
            <ReviewItem key={item.id} item={item} currency={currency} />
          ))}
        </div>
      </Card>

      {/* Customer Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <UserOutlined className="text-amber-500" />
            <span>{t('sales.customer')}</span>
          </div>
        }
      >
        <CustomerSection
          customer={customer}
          onChangeCustomer={onChangeCustomer}
          currency={currency}
        />
      </Card>

      {/* Notes Card (if present) */}
      {notes && (
        <Card title={t('common.labels.notes')} size="small">
          <Text type="secondary" className="whitespace-pre-wrap">
            {notes}
          </Text>
        </Card>
      )}

      {/* Summary Card */}
      <Card className="bg-stone-50">
        <TotalsSummary totals={totals} currency={currency} />
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        {onEdit && (
          <Button
            type="default"
            size="large"
            icon={<EditOutlined />}
            onClick={onEdit}
            className="flex-1"
          >
            {t('sales.checkout.editOrder')}
          </Button>
        )}
        {onProceed && (
          <Button
            type="primary"
            size="large"
            icon={<CheckOutlined />}
            onClick={onProceed}
            loading={isLoading}
            disabled={proceedDisabled}
            className="flex-1 !h-12 !text-base !font-semibold"
          >
            {t('sales.checkout.confirmOrder')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default CheckoutReview;
