'use client';

/**
 * CheckoutComplete Component
 *
 * Success state displayed after sale completion.
 * Shows sale confirmation, receipt preview, and action buttons.
 *
 * Features:
 * - Success animation with checkmark
 * - Sale number display
 * - Receipt preview summary
 * - Print Receipt button
 * - Email Receipt button (if customer has email)
 * - New Sale button (clears cart, returns to POS)
 * - Auto-focus on New Sale for quick workflow
 * - RTL support
 *
 * @module components/domain/sales/CheckoutComplete
 */

import React, { useEffect, useRef } from 'react';

import {
  CheckCircleFilled,
  PrinterOutlined,
  MailOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { Typography, Result, Space, Divider, message, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Sale } from '@/lib/actions/sales';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/format';

const { Text, Title, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Receipt data for display
 */
export interface ReceiptData {
  /** Sale number */
  saleNumber: string;
  /** Sale date */
  saleDate: string;
  /** Customer name (if any) */
  customerName?: string;
  /** Customer email (for email receipt) */
  customerEmail?: string;
  /** Number of items */
  itemCount: number;
  /** Subtotal before discounts */
  subtotal: number;
  /** Total discount amount */
  discount: number;
  /** Tax amount */
  tax: number;
  /** Grand total */
  total: number;
  /** Total paid amount */
  paid: number;
  /** Change given */
  change: number;
  /** Currency code */
  currency: string;
}

/**
 * Props for CheckoutComplete component
 */
export interface CheckoutCompleteProps {
  /**
   * Completed sale data
   */
  sale: Sale | null;

  /**
   * Receipt data for display
   */
  receiptData: ReceiptData;

  /**
   * Callback to print receipt
   */
  onPrintReceipt?: () => void;

  /**
   * Callback to email receipt
   */
  onEmailReceipt?: () => void;

  /**
   * Callback to start a new sale
   */
  onNewSale: () => void;

  /**
   * Callback to view sale details
   */
  onViewSale?: () => void;

  /**
   * Whether printing is in progress
   * @default false
   */
  isPrinting?: boolean;

  /**
   * Whether emailing is in progress
   * @default false
   */
  isEmailing?: boolean;

  /**
   * Additional class names
   */
  className?: string;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Success Animation Component
 */
function SuccessAnimation(): JSX.Element {
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Pulse rings */}
      <div className="absolute w-32 h-32 rounded-full bg-green-100 animate-ping opacity-20" />
      <div className="absolute w-24 h-24 rounded-full bg-green-200 animate-pulse" />

      {/* Main checkmark */}
      <div
        className={cn(
          'relative w-20 h-20 rounded-full bg-green-500',
          'flex items-center justify-center shadow-lg shadow-green-200',
          'animate-[bounce_0.5s_ease-in-out]'
        )}
      >
        <CheckCircleFilled className="text-4xl text-white" />
      </div>
    </div>
  );
}

/**
 * Receipt Summary Card
 */
function ReceiptSummary({ data, onCopy }: { data: ReceiptData; onCopy?: () => void }): JSX.Element {
  const t = useTranslations();

  const handleCopySaleNumber = () => {
    navigator.clipboard.writeText(data.saleNumber);
    message.success(t('common.messages.copied'));
    onCopy?.();
  };

  return (
    <Card className="bg-stone-50 border-stone-200">
      <div className="text-center pb-3 border-b border-dashed border-stone-300">
        <Text type="secondary" className="text-xs uppercase tracking-wide">
          {t('sales.checkout.saleNumber')}
        </Text>
        <div className="flex items-center justify-center gap-2 mt-1">
          <Title level={4} className="!mb-0 font-mono">
            {data.saleNumber}
          </Title>
          <Tooltip title={t('common.actions.copy')}>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={handleCopySaleNumber}
            />
          </Tooltip>
        </div>
        <Text type="secondary" className="text-sm">
          {formatDate(data.saleDate, 'en-US', 'long')}
        </Text>
      </div>

      <div className="py-3 space-y-2">
        {/* Customer */}
        <div className="flex justify-between">
          <Text type="secondary">{t('sales.customer')}</Text>
          <Text>{data.customerName || t('sales.walkInCustomer')}</Text>
        </div>

        {/* Items count */}
        <div className="flex justify-between">
          <Text type="secondary">{t('sales.items')}</Text>
          <Text>
            {data.itemCount} {t('sales.item', { count: data.itemCount })}
          </Text>
        </div>

        <Divider className="!my-2" dashed />

        {/* Subtotal */}
        <div className="flex justify-between">
          <Text type="secondary">{t('common.labels.subtotal')}</Text>
          <Text>{formatCurrency(data.subtotal, data.currency)}</Text>
        </div>

        {/* Discount */}
        {data.discount > 0 && (
          <div className="flex justify-between">
            <Text type="secondary">{t('sales.discount')}</Text>
            <Text className="text-green-600">-{formatCurrency(data.discount, data.currency)}</Text>
          </div>
        )}

        {/* Tax */}
        {data.tax > 0 && (
          <div className="flex justify-between">
            <Text type="secondary">{t('common.labels.tax')}</Text>
            <Text>{formatCurrency(data.tax, data.currency)}</Text>
          </div>
        )}

        <Divider className="!my-2" />

        {/* Total */}
        <div className="flex justify-between items-center">
          <Text strong className="text-base">
            {t('common.labels.total')}
          </Text>
          <Text strong className="text-lg text-amber-600">
            {formatCurrency(data.total, data.currency)}
          </Text>
        </div>

        {/* Paid */}
        <div className="flex justify-between">
          <Text type="secondary">{t('sales.amountPaid')}</Text>
          <Text>{formatCurrency(data.paid, data.currency)}</Text>
        </div>

        {/* Change */}
        {data.change > 0 && (
          <div className="flex justify-between bg-amber-50 -mx-4 px-4 py-2 rounded">
            <Text strong>{t('sales.change')}</Text>
            <Text strong className="text-amber-600">
              {formatCurrency(data.change, data.currency)}
            </Text>
          </div>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CheckoutComplete Component
 *
 * Success state after sale completion with receipt actions.
 *
 * @example
 * ```tsx
 * <CheckoutComplete
 *   sale={completedSale}
 *   receiptData={receiptData}
 *   onPrintReceipt={() => printReceipt(sale.id_sale)}
 *   onNewSale={() => clearCartAndReset()}
 * />
 * ```
 */
export function CheckoutComplete({
  sale: _sale,
  receiptData,
  onPrintReceipt,
  onEmailReceipt,
  onNewSale,
  onViewSale,
  isPrinting = false,
  isEmailing = false,
  className,
}: CheckoutCompleteProps): JSX.Element {
  // sale available for future use (e.g., for view sale navigation)
  void _sale;
  const t = useTranslations();
  const newSaleButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus new sale button for quick workflow
  useEffect(() => {
    const timer = setTimeout(() => {
      newSaleButtonRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const hasEmail = !!receiptData.customerEmail;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Success Header */}
      <div className="text-center py-8">
        <SuccessAnimation />
        <Title level={3} className="!mt-6 !mb-2 text-green-600">
          {t('sales.checkout.saleComplete')}
        </Title>
        <Paragraph type="secondary" className="text-base">
          {t('sales.checkout.saleCompleteMessage')}
        </Paragraph>
      </div>

      {/* Receipt Summary */}
      <div className="w-full max-w-md mb-6">
        <ReceiptSummary data={receiptData} />
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-3">
        {/* Receipt Actions Row */}
        <div className="flex gap-3">
          {onPrintReceipt && (
            <Button
              type="default"
              size="large"
              icon={<PrinterOutlined />}
              onClick={onPrintReceipt}
              loading={isPrinting}
              className="flex-1"
            >
              {t('sales.checkout.printReceipt')}
            </Button>
          )}

          {onEmailReceipt && hasEmail && (
            <Button
              type="default"
              size="large"
              icon={<MailOutlined />}
              onClick={onEmailReceipt}
              loading={isEmailing}
              className="flex-1"
            >
              {t('sales.checkout.emailReceipt')}
            </Button>
          )}

          {onEmailReceipt && !hasEmail && (
            <Tooltip title={t('sales.checkout.noCustomerEmail')}>
              <Button
                type="default"
                size="large"
                icon={<MailOutlined />}
                disabled
                className="flex-1"
              >
                {t('sales.checkout.emailReceipt')}
              </Button>
            </Tooltip>
          )}
        </div>

        {/* View Sale Details */}
        {onViewSale && (
          <Button
            type="default"
            size="large"
            icon={<ShoppingCartOutlined />}
            onClick={onViewSale}
            block
          >
            {t('sales.checkout.viewSaleDetails')}
          </Button>
        )}

        {/* New Sale - Primary Action */}
        <Button
          ref={newSaleButtonRef}
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={onNewSale}
          block
          className="!h-14 !text-base !font-semibold"
        >
          {t('sales.checkout.newSale')}
        </Button>
      </div>

      {/* Keyboard hint */}
      <Text type="secondary" className="mt-4 text-xs">
        {t('sales.checkout.pressEnterForNewSale')}
      </Text>
    </div>
  );
}

/**
 * Processing State Component
 * Shown while sale is being finalized
 */
export function CheckoutProcessing({ className }: { className?: string }): JSX.Element {
  const t = useTranslations();

  return (
    <div className={cn('flex flex-col items-center justify-center py-16', className)}>
      <Result
        icon={
          <div className="relative inline-flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          </div>
        }
        title={t('sales.checkout.processingTitle')}
        subTitle={t('sales.checkout.processingMessage')}
      />
    </div>
  );
}

/**
 * Error State Component
 * Shown when sale creation fails
 */
export function CheckoutError({
  error,
  onRetry,
  onCancel,
  className,
}: {
  error: string;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}): JSX.Element {
  const t = useTranslations();

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <Result
        status="error"
        title={t('sales.checkout.errorTitle')}
        subTitle={error}
        extra={
          <Space>
            {onCancel && <Button onClick={onCancel}>{t('common.actions.cancel')}</Button>}
            {onRetry && (
              <Button type="primary" onClick={onRetry}>
                {t('sales.checkout.tryAgain')}
              </Button>
            )}
          </Space>
        }
      />
    </div>
  );
}

export default CheckoutComplete;
