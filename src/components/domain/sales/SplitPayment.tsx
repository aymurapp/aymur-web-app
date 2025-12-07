'use client';

/**
 * SplitPayment Component
 *
 * Handles split payments across multiple payment methods.
 * Features:
 * - Add/remove payment entries
 * - Payment method selector per entry
 * - Amount input per entry
 * - Running total vs remaining balance
 * - Validation that total equals order amount
 * - RTL support with logical properties
 *
 * @module components/domain/sales/SplitPayment
 */

import React, { useCallback, useMemo } from 'react';

import {
  PlusOutlined,
  DeleteOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { InputNumber, Typography, Alert, Space, Divider, Select } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import type { PaymentType } from '@/lib/utils/schemas/sales';

const { Text, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Single payment entry in split payment
 */
export interface SplitPaymentEntry {
  id: string;
  method: PaymentType;
  amount: number;
  reference?: string;
}

/**
 * Props for SplitPayment component
 */
export interface SplitPaymentProps {
  /**
   * Current list of payment entries
   */
  entries: SplitPaymentEntry[];

  /**
   * Callback when entries change
   */
  onChange: (entries: SplitPaymentEntry[]) => void;

  /**
   * Total amount that needs to be paid
   */
  totalAmount: number;

  /**
   * Currency code (e.g., 'USD', 'IQD')
   */
  currency: string;

  /**
   * Locale for formatting
   */
  locale?: string;

  /**
   * Maximum number of split entries allowed
   */
  maxEntries?: number;

  /**
   * Whether the component is disabled
   */
  disabled?: boolean;

  /**
   * Custom class name
   */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Available payment methods for split payments
 * Excludes 'mixed' (this component handles mixed) and 'refund' (system-only)
 */
const SPLIT_PAYMENT_METHODS: { value: PaymentType; labelKey: string }[] = [
  { value: 'cash', labelKey: 'methods.cash' },
  { value: 'card', labelKey: 'methods.card' },
  { value: 'bank_transfer', labelKey: 'methods.bankTransfer' },
  { value: 'cheque', labelKey: 'methods.cheque' },
];

/**
 * Default max entries for split payment
 */
const DEFAULT_MAX_ENTRIES = 4;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate unique ID for payment entry
 */
function generateEntryId(): string {
  return `split-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SplitPayment Component
 *
 * Allows users to split payment across multiple methods.
 * Shows running total and remaining balance with validation.
 */
export function SplitPayment({
  entries,
  onChange,
  totalAmount,
  currency,
  locale = 'en-US',
  maxEntries = DEFAULT_MAX_ENTRIES,
  disabled = false,
  className,
}: SplitPaymentProps): JSX.Element {
  const t = useTranslations('sales.payment');
  const tCommon = useTranslations('common');

  /**
   * Calculate totals
   */
  const { paidAmount, remainingAmount, isFullyPaid, isOverpaid } = useMemo(() => {
    const paid = entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const remaining = totalAmount - paid;
    return {
      paidAmount: paid,
      remainingAmount: remaining,
      isFullyPaid: Math.abs(remaining) < 0.01,
      isOverpaid: remaining < -0.01,
    };
  }, [entries, totalAmount]);

  /**
   * Add new payment entry
   */
  const handleAddEntry = useCallback(() => {
    if (entries.length >= maxEntries) {
      return;
    }

    // Find first method not already used
    const usedMethods = entries.map((e) => e.method);
    const availableMethod =
      SPLIT_PAYMENT_METHODS.find((m) => !usedMethods.includes(m.value))?.value ?? 'cash';

    const newEntry: SplitPaymentEntry = {
      id: generateEntryId(),
      method: availableMethod,
      amount: Math.max(0, remainingAmount),
    };

    onChange([...entries, newEntry]);
  }, [entries, maxEntries, remainingAmount, onChange]);

  /**
   * Remove payment entry
   */
  const handleRemoveEntry = useCallback(
    (entryId: string) => {
      onChange(entries.filter((e) => e.id !== entryId));
    },
    [entries, onChange]
  );

  /**
   * Update payment entry method
   */
  const handleMethodChange = useCallback(
    (entryId: string, method: PaymentType) => {
      onChange(entries.map((e) => (e.id === entryId ? { ...e, method } : e)));
    },
    [entries, onChange]
  );

  /**
   * Update payment entry amount
   */
  const handleAmountChange = useCallback(
    (entryId: string, amount: number | null) => {
      onChange(entries.map((e) => (e.id === entryId ? { ...e, amount: amount ?? 0 } : e)));
    },
    [entries, onChange]
  );

  /**
   * Set remaining amount to entry
   */
  const handleSetRemaining = useCallback(
    (entryId: string) => {
      const otherEntriesTotal = entries
        .filter((e) => e.id !== entryId)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const remaining = Math.max(0, totalAmount - otherEntriesTotal);

      onChange(entries.map((e) => (e.id === entryId ? { ...e, amount: remaining } : e)));
    },
    [entries, totalAmount, onChange]
  );

  /**
   * Check if a method is already used by another entry
   */
  const isMethodUsed = useCallback(
    (method: PaymentType, excludeId: string) => {
      return entries.some((e) => e.method === method && e.id !== excludeId);
    },
    [entries]
  );

  const canAddEntry = entries.length < maxEntries && !disabled;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Title level={5} className="mb-0 text-stone-800">
          {t('splitPayment.title')}
        </Title>
        <Text type="secondary" className="text-sm">
          {t('splitPayment.entriesCount', {
            count: entries.length,
            max: maxEntries,
          })}
        </Text>
      </div>

      {/* Payment entries list */}
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className={cn(
              'flex flex-col sm:flex-row gap-3 p-4 rounded-lg',
              'border border-stone-200 bg-stone-50/50'
            )}
          >
            {/* Entry number */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-semibold text-sm shrink-0">
              {index + 1}
            </div>

            {/* Method selector */}
            <div className="flex-1 min-w-[140px]">
              <Text type="secondary" className="text-xs mb-1 block">
                {t('splitPayment.method')}
              </Text>
              <Select
                value={entry.method}
                onChange={(value) => handleMethodChange(entry.id, value)}
                disabled={disabled}
                className="w-full"
                size="large"
              >
                {SPLIT_PAYMENT_METHODS.map((method) => (
                  <Select.Option
                    key={method.value}
                    value={method.value}
                    disabled={isMethodUsed(method.value, entry.id)}
                  >
                    {t(method.labelKey)}
                  </Select.Option>
                ))}
              </Select>
            </div>

            {/* Amount input */}
            <div className="flex-1 min-w-[160px]">
              <Text type="secondary" className="text-xs mb-1 block">
                {t('splitPayment.amount')}
              </Text>
              <div className="flex gap-2">
                <InputNumber
                  value={entry.amount}
                  onChange={(value) => handleAmountChange(entry.id, value)}
                  disabled={disabled}
                  min={0}
                  max={totalAmount}
                  precision={2}
                  className="flex-1"
                  size="large"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => {
                    const parsed = Number(value?.replace(/,/g, '') || 0);
                    return parsed as 0;
                  }}
                  addonBefore={currency}
                />
                {/* Fill remaining button */}
                {remainingAmount > 0.01 && !disabled && (
                  <Button
                    size="large"
                    onClick={() => handleSetRemaining(entry.id)}
                    className="shrink-0"
                    title={t('splitPayment.fillRemaining')}
                  >
                    {t('splitPayment.fill')}
                  </Button>
                )}
              </div>
            </div>

            {/* Remove button */}
            {entries.length > 1 && !disabled && (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveEntry(entry.id)}
                className="self-end sm:self-center"
                aria-label={tCommon('actions.delete')}
              />
            )}
          </div>
        ))}
      </div>

      {/* Add entry button */}
      {canAddEntry && (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddEntry}
          className="w-full"
          disabled={disabled}
        >
          {t('splitPayment.addMethod')}
        </Button>
      )}

      <Divider className="my-4" />

      {/* Summary */}
      <div className="space-y-2 p-4 rounded-lg bg-stone-50 border border-stone-200">
        {/* Order total */}
        <div className="flex items-center justify-between">
          <Text type="secondary">{t('summary.orderTotal')}</Text>
          <Text strong>{formatCurrency(totalAmount, currency, locale)}</Text>
        </div>

        {/* Amount paid */}
        <div className="flex items-center justify-between">
          <Text type="secondary">{t('summary.amountPaid')}</Text>
          <Text
            strong
            className={cn(
              isOverpaid && 'text-red-600',
              isFullyPaid && !isOverpaid && 'text-emerald-600'
            )}
          >
            {formatCurrency(paidAmount, currency, locale)}
          </Text>
        </div>

        {/* Remaining balance */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-200">
          <Text strong>{t('summary.remaining')}</Text>
          <Space>
            {isFullyPaid && !isOverpaid && <CheckCircleOutlined className="text-emerald-500" />}
            {isOverpaid && <WarningOutlined className="text-red-500" />}
            <Text
              strong
              className={cn(
                'text-lg',
                remainingAmount > 0.01 && 'text-amber-600',
                isFullyPaid && !isOverpaid && 'text-emerald-600',
                isOverpaid && 'text-red-600'
              )}
            >
              {formatCurrency(Math.abs(remainingAmount), currency, locale)}
              {isOverpaid && ` (${t('summary.overpaid')})`}
            </Text>
          </Space>
        </div>
      </div>

      {/* Validation messages */}
      {!isFullyPaid && remainingAmount > 0.01 && (
        <Alert
          type="warning"
          showIcon
          message={t('validation.insufficientAmount')}
          description={t('validation.insufficientAmountDesc', {
            remaining: formatCurrency(remainingAmount, currency, locale),
          })}
        />
      )}

      {isOverpaid && (
        <Alert
          type="error"
          showIcon
          message={t('validation.overpaidAmount')}
          description={t('validation.overpaidAmountDesc', {
            overpaid: formatCurrency(Math.abs(remainingAmount), currency, locale),
          })}
        />
      )}
    </div>
  );
}

export default SplitPayment;
