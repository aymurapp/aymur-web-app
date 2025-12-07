'use client';

/**
 * PaymentForm Component
 *
 * A comprehensive payment form for collecting payments in the POS system.
 * Features:
 * - Order summary section (total amount due)
 * - Payment method selector (Cash, Card, Bank Transfer, Cheque, Split)
 * - Amount input with quick buttons (exact amount, round up options)
 * - Split payments: multiple payment methods
 * - Change calculation for cash payments
 * - Customer balance display if customer selected
 * - Apply store credit option (if customer has credit)
 * - Payment notes field
 * - Submit button with loading state
 * - Validation with Zod schema
 *
 * @module components/domain/sales/PaymentForm
 */

import React, { useCallback, useState, useMemo, useTransition } from 'react';

import {
  DollarOutlined,
  CreditCardOutlined,
  UserOutlined,
  WalletOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import { Input, InputNumber, Typography, Divider, Alert, Card, message } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { PERMISSION_KEYS } from '@/lib/constants/permissions';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import type { PaymentType } from '@/lib/utils/schemas/sales';

import { PaymentMethodSelector } from './PaymentMethodSelector';
import { PaymentSummary } from './PaymentSummary';
import { SplitPayment, type SplitPaymentEntry } from './SplitPayment';

const { Text, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Customer type with credit balance
 */
export interface PaymentCustomer {
  id_customer: string;
  full_name: string;
  phone?: string;
  credit_balance?: number;
  is_vip?: boolean;
}

/**
 * Payment record returned after successful payment
 */
export interface Payment {
  id?: string;
  payment_type: PaymentType;
  amount: number;
  reference?: string;
  notes?: string;
}

/**
 * Props for PaymentForm component
 */
export interface PaymentFormProps {
  /**
   * Sale ID the payment is for
   */
  saleId: string;

  /**
   * Total amount due
   */
  totalAmount: number;

  /**
   * Customer associated with the sale (optional)
   */
  customer?: PaymentCustomer | null;

  /**
   * Callback when payment is completed successfully
   */
  onPaymentComplete: (payments: Payment[]) => void;

  /**
   * Callback when form is cancelled
   */
  onCancel: () => void;

  /**
   * Currency code (e.g., 'USD', 'IQD')
   */
  currency: string;

  /**
   * Locale for formatting
   */
  locale?: string;

  /**
   * Already paid amount (for partial payments)
   */
  paidAmount?: number;

  /**
   * Custom class name
   */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Quick amount button configurations (as multipliers of total)
 */
const QUICK_AMOUNT_OPTIONS = [
  { labelKey: 'quickAmount.exact', multiplier: 1 },
  { labelKey: 'quickAmount.roundUp10', roundTo: 10 },
  { labelKey: 'quickAmount.roundUp50', roundTo: 50 },
  { labelKey: 'quickAmount.roundUp100', roundTo: 100 },
];

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Round up to nearest value
 */
function roundUpTo(amount: number, roundTo: number): number {
  return Math.ceil(amount / roundTo) * roundTo;
}

/**
 * Generate unique ID for split payment entry
 */
function generateEntryId(): string {
  return `payment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * PaymentForm Component
 *
 * Comprehensive payment form with support for multiple payment methods,
 * split payments, change calculation, and customer credit.
 */
export function PaymentForm({
  saleId: _saleId, // Retained for future API integration
  totalAmount,
  customer,
  onPaymentComplete,
  onCancel,
  currency,
  locale = 'en-US',
  paidAmount = 0,
  className,
}: PaymentFormProps): JSX.Element {
  const t = useTranslations('sales.payment');
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  // Permissions
  const { can } = usePermissions();
  const canProcessPayment = can(PERMISSION_KEYS.SALES_CREATE);
  // Note: canApplyDiscount available via can(PERMISSION_KEYS.SALES_DISCOUNT) when needed

  // State
  const [selectedMethod, setSelectedMethod] = useState<PaymentType>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(totalAmount - paidAmount);
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [reference, setReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [splitEntries, setSplitEntries] = useState<SplitPaymentEntry[]>([
    { id: generateEntryId(), method: 'cash', amount: totalAmount - paidAmount },
  ]);
  const [applyStoreCredit, setApplyStoreCredit] = useState<boolean>(false);

  // Derived values
  const remainingAmount = totalAmount - paidAmount;
  const customerCredit = customer?.credit_balance ?? 0;
  const hasStoreCredit = customerCredit > 0;

  /**
   * Calculate effective payment amount and change
   */
  const { effectiveAmount, changeAmount, isValidPayment } = useMemo(() => {
    if (selectedMethod === 'mixed') {
      // For split payments, sum all entries
      const total = splitEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
      return {
        effectiveAmount: total,
        changeAmount: 0,
        isValidPayment: Math.abs(total - remainingAmount) < 0.01,
      };
    }

    // For single payment method
    let effective = paymentAmount;

    // Apply store credit if selected
    if (applyStoreCredit && hasStoreCredit) {
      const creditToApply = Math.min(customerCredit, remainingAmount);
      effective = Math.max(0, remainingAmount - creditToApply);
    }

    // Calculate change for cash payments
    const change =
      selectedMethod === 'cash' && cashTendered > effective ? cashTendered - effective : 0;

    const isValid =
      selectedMethod === 'cash'
        ? cashTendered >= effective || effective <= 0
        : effective >= remainingAmount - 0.01;

    return {
      effectiveAmount: effective,
      changeAmount: change,
      isValidPayment: isValid,
    };
  }, [
    selectedMethod,
    paymentAmount,
    cashTendered,
    splitEntries,
    remainingAmount,
    applyStoreCredit,
    hasStoreCredit,
    customerCredit,
  ]);

  /**
   * Handle payment method change
   */
  const handleMethodChange = useCallback(
    (method: PaymentType) => {
      setSelectedMethod(method);
      // Reset cash tendered when switching methods
      if (method !== 'cash') {
        setCashTendered(0);
      }
      // Initialize split entries when switching to mixed
      if (method === 'mixed') {
        setSplitEntries([{ id: generateEntryId(), method: 'cash', amount: remainingAmount }]);
      }
    },
    [remainingAmount]
  );

  /**
   * Handle quick amount selection
   */
  const handleQuickAmount = useCallback(
    (option: (typeof QUICK_AMOUNT_OPTIONS)[number]) => {
      let amount: number;
      if (option.multiplier) {
        amount = remainingAmount * option.multiplier;
      } else if (option.roundTo) {
        amount = roundUpTo(remainingAmount, option.roundTo);
      } else {
        amount = remainingAmount;
      }

      if (selectedMethod === 'cash') {
        setCashTendered(amount);
      } else {
        setPaymentAmount(amount);
      }
    },
    [remainingAmount, selectedMethod]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    if (!canProcessPayment) {
      message.error(t('errors.noPermission'));
      return;
    }

    startTransition(async () => {
      try {
        let payments: Payment[];

        if (selectedMethod === 'mixed') {
          // Create payment records for each split entry
          payments = splitEntries.map((entry) => ({
            payment_type: entry.method,
            amount: entry.amount,
            reference: entry.reference,
            notes: paymentNotes || undefined,
          }));
        } else {
          // Single payment
          const payment: Payment = {
            payment_type: selectedMethod,
            amount: effectiveAmount,
            notes: paymentNotes || undefined,
          };

          // Add reference for card/bank payments
          if ((selectedMethod === 'card' || selectedMethod === 'bank_transfer') && reference) {
            payment.reference = reference;
          }

          payments = [payment];

          // Add store credit payment if applied
          if (applyStoreCredit && hasStoreCredit) {
            const creditAmount = Math.min(customerCredit, remainingAmount);
            if (creditAmount > 0) {
              payments.unshift({
                payment_type: 'cheque', // Using cheque for store credit in this context
                amount: creditAmount,
                notes: t('notes.storeCreditApplied'),
              });
            }
          }
        }

        // Call completion handler
        onPaymentComplete(payments);
        message.success(t('messages.paymentSuccess'));
      } catch (error) {
        console.error('[PaymentForm] Submit error:', error);
        message.error(t('messages.paymentError'));
      }
    });
  }, [
    canProcessPayment,
    selectedMethod,
    splitEntries,
    effectiveAmount,
    reference,
    paymentNotes,
    applyStoreCredit,
    hasStoreCredit,
    customerCredit,
    remainingAmount,
    onPaymentComplete,
    t,
  ]);

  // Check if user has permission
  if (!canProcessPayment) {
    return (
      <Alert
        type="error"
        showIcon
        message={t('errors.noPermission')}
        description={t('errors.noPermissionDesc')}
        className={className}
      />
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Customer info if available */}
      {customer && (
        <Card size="small" className="bg-stone-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  customer.is_vip ? 'bg-amber-100' : 'bg-stone-200'
                )}
              >
                <UserOutlined
                  className={cn('text-lg', customer.is_vip ? 'text-amber-600' : 'text-stone-600')}
                />
              </div>
              <div>
                <Text strong>{customer.full_name}</Text>
                {customer.phone && (
                  <Text type="secondary" className="block text-sm" dir="ltr">
                    {customer.phone}
                  </Text>
                )}
              </div>
            </div>
            {hasStoreCredit && (
              <div className="text-end">
                <Text type="secondary" className="text-xs block">
                  {t('customer.storeCredit')}
                </Text>
                <Text strong className="text-emerald-600">
                  {formatCurrency(customerCredit, currency, locale)}
                </Text>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Payment Summary */}
      <PaymentSummary
        totalAmount={totalAmount}
        paidAmount={
          paidAmount +
          (selectedMethod === 'mixed'
            ? splitEntries.reduce((sum, e) => sum + (e.amount || 0), 0)
            : effectiveAmount)
        }
        currency={currency}
        locale={locale}
        showChange={selectedMethod === 'cash'}
        cashTendered={cashTendered}
        showProgress
        showStatus
      />

      <Divider className="my-4" />

      {/* Payment Method Selection */}
      <div>
        <Title level={5} className="mb-3 text-stone-800">
          {t('selectMethod')}
        </Title>
        <PaymentMethodSelector
          value={selectedMethod}
          onChange={handleMethodChange}
          hiddenMethods={['refund']}
          hasStoreCredit={hasStoreCredit}
          storeCreditBalance={customerCredit}
          showDescriptions={false}
        />
      </div>

      <Divider className="my-4" />

      {/* Payment Details based on method */}
      {selectedMethod === 'mixed' ? (
        /* Split Payment */
        <SplitPayment
          entries={splitEntries}
          onChange={setSplitEntries}
          totalAmount={remainingAmount}
          currency={currency}
          locale={locale}
        />
      ) : (
        /* Single Payment Method */
        <div className="space-y-4">
          {/* Store Credit Option */}
          {hasStoreCredit && (
            <Card
              size="small"
              className={cn(
                'cursor-pointer transition-all',
                applyStoreCredit
                  ? 'border-emerald-400 bg-emerald-50/50'
                  : 'border-stone-200 hover:border-emerald-300'
              )}
              onClick={() => setApplyStoreCredit(!applyStoreCredit)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <WalletOutlined
                    className={cn(
                      'text-xl',
                      applyStoreCredit ? 'text-emerald-600' : 'text-stone-400'
                    )}
                  />
                  <div>
                    <Text strong>{t('applyStoreCredit')}</Text>
                    <Text type="secondary" className="block text-sm">
                      {t('storeCreditAvailableAmount', {
                        amount: formatCurrency(
                          Math.min(customerCredit, remainingAmount),
                          currency,
                          locale
                        ),
                      })}
                    </Text>
                  </div>
                </div>
                <div
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center',
                    applyStoreCredit ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300'
                  )}
                >
                  {applyStoreCredit && <span className="text-white text-xs">&#10003;</span>}
                </div>
              </div>
            </Card>
          )}

          {/* Amount Input */}
          <div>
            <Text strong className="block mb-2">
              {selectedMethod === 'cash' ? t('cashTendered') : t('paymentAmount')}
            </Text>

            {/* Quick amount buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_AMOUNT_OPTIONS.map((option) => {
                const amount = option.multiplier
                  ? remainingAmount * option.multiplier
                  : option.roundTo
                    ? roundUpTo(remainingAmount, option.roundTo)
                    : remainingAmount;

                // Don't show if same as exact amount
                if (option.roundTo && amount === remainingAmount) {
                  return null;
                }

                return (
                  <Button
                    key={option.labelKey}
                    size="small"
                    onClick={() => handleQuickAmount(option)}
                    className={cn(
                      'transition-all',
                      (selectedMethod === 'cash' ? cashTendered : paymentAmount) === amount &&
                        'border-amber-400 bg-amber-50'
                    )}
                  >
                    {formatCurrency(amount, currency, locale)}
                  </Button>
                );
              })}
            </div>

            {/* Main amount input */}
            <InputNumber
              value={selectedMethod === 'cash' ? cashTendered : paymentAmount}
              onChange={(value) => {
                if (selectedMethod === 'cash') {
                  setCashTendered(value ?? 0);
                } else {
                  setPaymentAmount(value ?? 0);
                }
              }}
              min={0}
              precision={2}
              className="w-full"
              size="large"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => {
                const parsed = Number(value?.replace(/,/g, '') || 0);
                return parsed as 0;
              }}
              addonBefore={
                <span className="flex items-center gap-1">
                  <DollarOutlined />
                  {currency}
                </span>
              }
              placeholder={t('enterAmount')}
            />

            {/* Change display for cash */}
            {selectedMethod === 'cash' && changeAmount > 0 && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalculatorOutlined className="text-emerald-600" />
                    <Text className="text-emerald-800">{t('changeDue')}</Text>
                  </div>
                  <Text strong className="text-lg text-emerald-700">
                    {formatCurrency(changeAmount, currency, locale)}
                  </Text>
                </div>
              </div>
            )}
          </div>

          {/* Reference Input for Card/Bank */}
          {(selectedMethod === 'card' || selectedMethod === 'bank_transfer') && (
            <div>
              <Text strong className="block mb-2">
                {selectedMethod === 'card' ? t('cardReference') : t('transferReference')}
              </Text>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                prefix={<CreditCardOutlined className="text-stone-400" />}
                placeholder={
                  selectedMethod === 'card'
                    ? t('placeholders.cardReference')
                    : t('placeholders.transferReference')
                }
                maxLength={100}
                size="large"
              />
            </div>
          )}

          {/* Payment Notes */}
          <div>
            <Text strong className="block mb-2">
              {t('notes')}
            </Text>
            <Input.TextArea
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder={t('placeholders.notes')}
              maxLength={500}
              rows={2}
              showCount
            />
          </div>
        </div>
      )}

      <Divider className="my-4" />

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button size="large" onClick={onCancel} disabled={isPending}>
          {tCommon('actions.cancel')}
        </Button>

        <Button
          type="primary"
          size="large"
          onClick={handleSubmit}
          loading={isPending}
          disabled={!isValidPayment || isPending}
          className="min-w-[160px]"
          icon={<DollarOutlined />}
        >
          {isPending
            ? t('processing')
            : t('confirmPayment', {
                amount: formatCurrency(
                  selectedMethod === 'mixed'
                    ? splitEntries.reduce((sum, e) => sum + (e.amount || 0), 0)
                    : effectiveAmount,
                  currency,
                  locale
                ),
              })}
        </Button>
      </div>

      {/* Validation message */}
      {!isValidPayment && (
        <Alert
          type="warning"
          showIcon
          message={
            selectedMethod === 'cash'
              ? t('validation.insufficientCash')
              : selectedMethod === 'mixed'
                ? t('validation.splitPaymentMismatch')
                : t('validation.invalidAmount')
          }
          className="mt-4"
        />
      )}
    </div>
  );
}

export default PaymentForm;
