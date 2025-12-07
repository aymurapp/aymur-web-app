'use client';

/**
 * CartBuilder Component
 *
 * Main cart/invoice builder component for the POS system.
 * This is the right panel of the POS page that manages the current sale.
 *
 * Features:
 * - Cart state management (items, quantities, discounts)
 * - Line item display with image, name, SKU, weight, price
 * - Quantity adjustment and line-item discounts
 * - Overall discount section (order-level discount)
 * - Tax calculation display
 * - Grand total with real-time updates
 * - Customer display section (selected customer or "Walk-in")
 * - Notes/memo field
 * - Action buttons: Clear Cart, Hold Order, Proceed to Checkout
 * - Empty state when cart is empty
 * - Keyboard shortcuts support
 *
 * @module components/domain/sales/CartBuilder
 */

import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';

import {
  ShoppingCartOutlined,
  UserOutlined,
  DeleteOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  PercentageOutlined,
  DollarOutlined,
  EditOutlined,
  CloseOutlined,
  FileTextOutlined,
  HistoryOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import {
  Typography,
  Empty,
  Badge,
  Tooltip,
  Popover,
  InputNumber,
  Segmented,
  Space,
  Input,
  Drawer,
  List,
  Modal,
  Popconfirm,
} from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import {
  useCartStore,
  useCartIsEmpty,
  useHeldOrdersCount,
  type CartCustomer,
  type DiscountType,
  type HeldOrder,
  calculateSubtotal,
  calculateOrderDiscountAmount,
  calculateTaxAmount,
  calculateGrandTotal,
} from '@/stores/cartStore';

import { CartItem, CartItemSkeleton } from './CartItem';
import { CartSummary } from './CartSummary';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the CartBuilder component
 */
export interface CartBuilderProps {
  /**
   * Callback when checkout is requested
   */
  onCheckout?: () => void;

  /**
   * Callback when customer selection is requested
   */
  onSelectCustomer?: () => void;

  /**
   * Callback when order is held
   */
  onHoldOrder?: (orderId: string) => void;

  /**
   * Callback when order is restored
   */
  onRestoreOrder?: (orderId: string) => void;

  /**
   * Tax rate (percentage, e.g., 5 for 5%)
   * @default 0
   */
  taxRate?: number;

  /**
   * Whether the cart is loading
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
 * Customer Display Section
 */
function CustomerSection({
  customer,
  onSelectCustomer,
  onClearCustomer,
  currency,
  t,
}: {
  customer: CartCustomer | null;
  onSelectCustomer?: () => void;
  onClearCustomer: () => void;
  currency: string;
  t: ReturnType<typeof useTranslations>;
}): JSX.Element {
  if (!customer) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 bg-stone-50 rounded-lg',
          'border border-dashed border-stone-300',
          'cursor-pointer hover:border-amber-400 hover:bg-amber-50/30',
          'transition-colors duration-200'
        )}
        onClick={onSelectCustomer}
      >
        <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center">
          <UserOutlined className="text-stone-400" />
        </div>
        <div className="flex-1">
          <Text className="font-medium block">{t('sales.cart.walkIn')}</Text>
          <Text type="secondary" className="text-xs">
            {t('sales.cart.clickToSelectCustomer')}
          </Text>
        </div>
        <Button
          type="text"
          size="small"
          icon={<SwapOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onSelectCustomer?.();
          }}
        >
          {t('common.actions.select')}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 bg-amber-50 rounded-lg',
        'border border-amber-200'
      )}
    >
      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
        <UserOutlined className="text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <Text strong className="block truncate">
          {customer.name}
        </Text>
        {customer.phone && (
          <Text type="secondary" className="text-xs block">
            {customer.phone}
          </Text>
        )}
        {customer.balance !== undefined && customer.balance !== 0 && (
          <Text
            className={cn(
              'text-xs block',
              customer.balance > 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {t('sales.cart.balance')}: {formatCurrency(customer.balance, currency)}
          </Text>
        )}
      </div>
      <Space>
        <Tooltip title={t('sales.cart.changeCustomer')}>
          <Button type="text" size="small" icon={<SwapOutlined />} onClick={onSelectCustomer} />
        </Tooltip>
        <Tooltip title={t('sales.cart.clearCustomer')}>
          <Button
            type="text"
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={onClearCustomer}
          />
        </Tooltip>
      </Space>
    </div>
  );
}

/**
 * Order Discount Section
 */
function OrderDiscountSection({
  discount,
  subtotal,
  currency,
  onDiscountChange,
  canApplyDiscount,
  t,
}: {
  discount: { type: DiscountType; value: number } | null;
  subtotal: number;
  currency: string;
  onDiscountChange: (type: DiscountType | null, value: number) => void;
  canApplyDiscount: boolean;
  t: ReturnType<typeof useTranslations>;
}): JSX.Element {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [type, setType] = useState<DiscountType>(discount?.type || 'percentage');
  const [value, setValue] = useState<number>(discount?.value || 0);

  const handleApply = () => {
    if (value > 0) {
      onDiscountChange(type, value);
    } else {
      onDiscountChange(null, 0);
    }
    setPopoverOpen(false);
  };

  const handleClear = () => {
    setValue(0);
    onDiscountChange(null, 0);
    setPopoverOpen(false);
  };

  const discountAmount = discount ? calculateOrderDiscountAmount(subtotal, discount) : 0;

  if (!canApplyDiscount) {
    return <></>;
  }

  return (
    <div className="flex items-center justify-between py-2">
      <Text className="text-sm text-stone-600">{t('sales.cart.orderDiscount')}</Text>
      <Popover
        content={
          <div className="p-2 space-y-3 min-w-[220px]">
            <Text strong className="block text-sm">
              {t('sales.cart.orderDiscount')}
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
              max={type === 'percentage' ? 100 : subtotal}
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
        }
        title={null}
        trigger="click"
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        placement="bottomRight"
      >
        <Button
          type={discount ? 'link' : 'text'}
          size="small"
          className={cn(discount && 'text-green-600 hover:text-green-700')}
        >
          {discount ? (
            <>
              -{formatCurrency(discountAmount, currency)}
              {discount.type === 'percentage' && (
                <span className="text-stone-400 ms-1">({discount.value}%)</span>
              )}
            </>
          ) : (
            t('common.actions.add')
          )}
        </Button>
      </Popover>
    </div>
  );
}

/**
 * Held Orders Drawer
 */
function HeldOrdersDrawer({
  open,
  onClose,
  heldOrders,
  onRestore,
  onDelete,
  currency,
  t,
}: {
  open: boolean;
  onClose: () => void;
  heldOrders: HeldOrder[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  currency: string;
  t: ReturnType<typeof useTranslations>;
}): JSX.Element {
  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <HistoryOutlined />
          <span>{t('sales.cart.heldOrders')}</span>
        </div>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={360}
    >
      {heldOrders.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('sales.cart.noHeldOrders')} />
      ) : (
        <List
          dataSource={heldOrders}
          renderItem={(order) => {
            const total = calculateSubtotal(order.items);
            return (
              <List.Item
                className="!px-0"
                actions={[
                  <Tooltip title={t('sales.cart.restoreOrder')} key="restore">
                    <Button
                      type="primary"
                      size="small"
                      icon={<SwapOutlined />}
                      onClick={() => onRestore(order.id)}
                    />
                  </Tooltip>,
                  <Popconfirm
                    title={t('sales.cart.deleteHeldOrderConfirm')}
                    onConfirm={() => onDelete(order.id)}
                    okText={t('common.actions.delete')}
                    cancelText={t('common.actions.cancel')}
                    key="delete"
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <div className="flex items-center gap-2">
                      <span>{order.label || t('sales.cart.heldOrder')}</span>
                      <Badge
                        count={order.items.length}
                        className="!bg-amber-100 !text-amber-700"
                        style={{ backgroundColor: '#fef3c7', color: '#b45309' }}
                      />
                    </div>
                  }
                  description={
                    <div className="space-y-1">
                      <div className="text-xs text-stone-500">
                        {formatDate(order.heldAt, 'en-US', 'relative')}
                      </div>
                      {order.customer && (
                        <div className="text-xs flex items-center gap-1">
                          <UserOutlined />
                          {order.customer.name}
                        </div>
                      )}
                      <div className="text-sm font-medium text-amber-600">
                        {formatCurrency(total, currency)}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </Drawer>
  );
}

/**
 * Notes Section
 */
function NotesSection({
  notes,
  onNotesChange,
  t,
}: {
  notes: string;
  onNotesChange: (notes: string) => void;
  t: ReturnType<typeof useTranslations>;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes);

  const handleSave = () => {
    onNotesChange(localNotes);
    setEditing(false);
  };

  const handleCancel = () => {
    setLocalNotes(notes);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <TextArea
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          placeholder={t('sales.cart.notesPlaceholder')}
          autoSize={{ minRows: 2, maxRows: 4 }}
          className="text-sm"
        />
        <Space className="w-full justify-end">
          <Button type="text" size="small" onClick={handleCancel}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="primary" size="small" onClick={handleSave}>
            {t('common.actions.save')}
          </Button>
        </Space>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg cursor-pointer',
        'hover:bg-stone-50 transition-colors duration-200',
        'border border-transparent hover:border-stone-200'
      )}
      onClick={() => setEditing(true)}
    >
      <FileTextOutlined className="text-stone-400 mt-0.5" />
      {notes ? (
        <Paragraph ellipsis={{ rows: 2 }} className="!mb-0 text-sm text-stone-600 flex-1">
          {notes}
        </Paragraph>
      ) : (
        <Text type="secondary" className="text-sm">
          {t('sales.cart.addNotes')}
        </Text>
      )}
      <EditOutlined className="text-stone-400 text-xs" />
    </div>
  );
}

/**
 * Empty Cart State
 */
function EmptyCartState({ t }: { t: ReturnType<typeof useTranslations> }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mb-4">
        <ShoppingCartOutlined className="text-3xl text-stone-400" />
      </div>
      <Text strong className="text-stone-700 mb-1">
        {t('sales.cart.emptyTitle')}
      </Text>
      <Text type="secondary" className="text-sm text-center">
        {t('sales.cart.emptyDescription')}
      </Text>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CartBuilder Component
 *
 * Main cart/invoice builder for the POS system. Manages the current sale
 * with full support for items, discounts, customer selection, and held orders.
 */
export function CartBuilder({
  onCheckout,
  onSelectCustomer,
  onHoldOrder,
  onRestoreOrder,
  taxRate = 0,
  isLoading = false,
  className,
}: CartBuilderProps): JSX.Element {
  const t = useTranslations();
  const { can } = usePermissions();
  const { shop } = useShop();

  // Cart store
  const {
    items,
    customer,
    discount,
    notes,
    heldOrders,
    removeItem,
    updateQuantity,
    setItemDiscount,
    setCustomer,
    setOrderDiscount,
    setNotes,
    clearCart,
    holdOrder,
    restoreOrder,
    deleteHeldOrder,
  } = useCartStore();

  const isEmpty = useCartIsEmpty();
  const heldOrdersCount = useHeldOrdersCount();

  // Local state
  const [heldOrdersDrawerOpen, setHeldOrdersDrawerOpen] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const cartListRef = useRef<HTMLDivElement>(null);

  // Permission checks
  const canCreateSale = can('sales.create');
  const canApplyDiscount = can('sales.discount');

  // Currency from shop settings
  const currency = shop?.currency || 'USD';

  // Calculate totals
  const subtotal = useMemo(() => calculateSubtotal(items), [items]);
  const orderDiscountAmount = useMemo(
    () => calculateOrderDiscountAmount(subtotal, discount),
    [subtotal, discount]
  );
  const taxAmount = useMemo(
    () => calculateTaxAmount(subtotal, orderDiscountAmount, taxRate),
    [subtotal, orderDiscountAmount, taxRate]
  );
  const grandTotal = useMemo(
    () => calculateGrandTotal(subtotal, orderDiscountAmount, taxAmount),
    [subtotal, orderDiscountAmount, taxAmount]
  );

  // Handlers
  const handleRemoveItem = useCallback(
    (id: string) => {
      setRemovingItemId(id);
      // Animate out then remove
      setTimeout(() => {
        removeItem(id);
        setRemovingItemId(null);
      }, 300);
    },
    [removeItem]
  );

  const handleQuantityChange = useCallback(
    (id: string, quantity: number) => {
      updateQuantity(id, quantity);
    },
    [updateQuantity]
  );

  const handleItemDiscountChange = useCallback(
    (id: string, type: DiscountType | null, value: number) => {
      setItemDiscount(id, type, value);
    },
    [setItemDiscount]
  );

  const handleClearCustomer = useCallback(() => {
    setCustomer(null);
  }, [setCustomer]);

  const handleHoldOrder = useCallback(() => {
    const label = `${t('sales.cart.order')} #${heldOrders.length + 1}`;
    const orderId = holdOrder(label);
    if (orderId) {
      onHoldOrder?.(orderId);
    }
  }, [holdOrder, heldOrders.length, onHoldOrder, t]);

  const handleRestoreOrder = useCallback(
    (id: string) => {
      const success = restoreOrder(id);
      if (success) {
        onRestoreOrder?.(id);
        setHeldOrdersDrawerOpen(false);
      }
    },
    [restoreOrder, onRestoreOrder]
  );

  const handleDeleteHeldOrder = useCallback(
    (id: string) => {
      deleteHeldOrder(id);
    },
    [deleteHeldOrder]
  );

  const handleClearCart = useCallback(() => {
    Modal.confirm({
      title: t('sales.cart.clearCartTitle'),
      content: t('sales.cart.clearCartConfirm'),
      okText: t('common.actions.clear'),
      cancelText: t('common.actions.cancel'),
      okButtonProps: { danger: true },
      onOk: () => clearCart(),
    });
  }, [clearCart, t]);

  const handleCheckout = useCallback(() => {
    if (canCreateSale && !isEmpty) {
      onCheckout?.();
    }
  }, [canCreateSale, isEmpty, onCheckout]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input field
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // F8 - Hold order
      if (e.key === 'F8' && !isEmpty) {
        e.preventDefault();
        handleHoldOrder();
      }

      // F9 - Open held orders
      if (e.key === 'F9') {
        e.preventDefault();
        setHeldOrdersDrawerOpen(true);
      }

      // F12 - Checkout
      if (e.key === 'F12' && !isEmpty && canCreateSale) {
        e.preventDefault();
        handleCheckout();
      }

      // Delete - Clear cart (with Ctrl)
      if (e.key === 'Delete' && e.ctrlKey && !isEmpty) {
        e.preventDefault();
        handleClearCart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEmpty, canCreateSale, handleHoldOrder, handleCheckout, handleClearCart]);

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn('h-full flex flex-col', className)} bodyStyle={{ padding: 0 }}>
        <div className="p-4 space-y-4">
          <div className="h-16 bg-stone-100 rounded-lg animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <CartItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn('h-full flex flex-col overflow-hidden', className)}
      bodyStyle={{
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCartOutlined className="text-amber-600" />
            <Title level={5} className="!mb-0">
              {t('sales.cart.title')}
            </Title>
            {items.length > 0 && (
              <Badge count={items.length} style={{ backgroundColor: '#f59e0b' }} />
            )}
          </div>
          <Space>
            {/* Held Orders Button */}
            <Tooltip title={`${t('sales.cart.heldOrders')} (F9)`}>
              <Badge count={heldOrdersCount} size="small" offset={[-2, 2]}>
                <Button
                  type="text"
                  icon={<HistoryOutlined />}
                  onClick={() => setHeldOrdersDrawerOpen(true)}
                />
              </Badge>
            </Tooltip>
            {/* Clear Cart Button */}
            {!isEmpty && (
              <Tooltip title={`${t('sales.cart.clearCart')} (Ctrl+Del)`}>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={handleClearCart} />
              </Tooltip>
            )}
          </Space>
        </div>
      </div>

      {/* Customer Section */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-stone-100">
        <CustomerSection
          customer={customer}
          onSelectCustomer={onSelectCustomer}
          onClearCustomer={handleClearCustomer}
          currency={currency}
          t={t}
        />
      </div>

      {/* Cart Items List */}
      <div ref={cartListRef} className="flex-1 overflow-y-auto px-4" style={{ minHeight: 0 }}>
        {isEmpty ? (
          <EmptyCartState t={t} />
        ) : (
          <div className="py-2">
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                currency={currency}
                onQuantityChange={handleQuantityChange}
                onDiscountChange={handleItemDiscountChange}
                onRemove={handleRemoveItem}
                isRemoving={removingItemId === item.id}
                discountEditable={canApplyDiscount}
              />
            ))}
          </div>
        )}
      </div>

      {/* Notes Section */}
      {!isEmpty && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-stone-100">
          <NotesSection notes={notes} onNotesChange={setNotes} t={t} />
        </div>
      )}

      {/* Summary & Actions */}
      {!isEmpty && (
        <div className="flex-shrink-0 px-4 py-4 border-t border-stone-200 bg-stone-50">
          {/* Order Discount */}
          {canApplyDiscount && (
            <OrderDiscountSection
              discount={discount}
              subtotal={subtotal}
              currency={currency}
              onDiscountChange={setOrderDiscount}
              canApplyDiscount={canApplyDiscount}
              t={t}
            />
          )}

          {/* Summary */}
          <CartSummary
            items={items}
            orderDiscount={discount}
            taxRate={taxRate}
            currency={currency}
            showTax={taxRate > 0}
            className="mb-4"
          />

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Primary: Checkout */}
            <Button
              type="primary"
              size="large"
              block
              icon={<CheckCircleOutlined />}
              onClick={handleCheckout}
              disabled={!canCreateSale}
              className="!h-12 !text-base !font-semibold"
            >
              {t('sales.cart.checkout')} - {formatCurrency(grandTotal, currency)}
            </Button>

            {/* Secondary: Hold Order */}
            <Button
              type="default"
              size="large"
              block
              icon={<PauseCircleOutlined />}
              onClick={handleHoldOrder}
              className="!h-10"
            >
              {t('sales.cart.holdOrder')} (F8)
            </Button>
          </div>

          {/* Keyboard Shortcut Hints */}
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-stone-400">
            <span>F8: {t('sales.cart.hold')}</span>
            <span>F9: {t('sales.cart.heldOrders')}</span>
            <span>F12: {t('sales.cart.checkout')}</span>
          </div>
        </div>
      )}

      {/* Held Orders Drawer */}
      <HeldOrdersDrawer
        open={heldOrdersDrawerOpen}
        onClose={() => setHeldOrdersDrawerOpen(false)}
        heldOrders={heldOrders}
        onRestore={handleRestoreOrder}
        onDelete={handleDeleteHeldOrder}
        currency={currency}
        t={t}
      />
    </Card>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

/**
 * Loading skeleton for CartBuilder
 */
export function CartBuilderSkeleton(): JSX.Element {
  return (
    <Card className="h-full flex flex-col" bodyStyle={{ padding: 0 }}>
      {/* Header Skeleton */}
      <div className="px-4 py-3 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-stone-200 rounded animate-pulse w-24" />
          <div className="h-8 bg-stone-200 rounded animate-pulse w-8" />
        </div>
      </div>

      {/* Customer Skeleton */}
      <div className="px-4 py-3 border-b border-stone-100">
        <div className="h-16 bg-stone-100 rounded-lg animate-pulse" />
      </div>

      {/* Items Skeleton */}
      <div className="flex-1 px-4 py-2">
        {[1, 2, 3].map((i) => (
          <CartItemSkeleton key={i} />
        ))}
      </div>

      {/* Summary Skeleton */}
      <div className="px-4 py-4 border-t border-stone-200 bg-stone-50 space-y-3">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 bg-stone-200 rounded animate-pulse w-20" />
              <div className="h-4 bg-stone-200 rounded animate-pulse w-24" />
            </div>
          ))}
        </div>
        <div className="h-12 bg-stone-200 rounded-lg animate-pulse" />
        <div className="h-10 bg-stone-200 rounded-lg animate-pulse" />
      </div>
    </Card>
  );
}

export default CartBuilder;
