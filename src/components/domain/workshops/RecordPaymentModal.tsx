'use client';

/**
 * RecordPaymentModal Component
 *
 * A modal for recording workshop order payments.
 * Creates workshop_transaction records when payments are made.
 *
 * Features:
 * - Shows order balance due
 * - Amount input with validation
 * - Payment method selection
 * - Reference number input
 * - Notes field
 * - Creates workshop_transaction on submit
 * - RTL support with logical properties
 *
 * @module components/domain/workshops/RecordPaymentModal
 */

import React, { useCallback, useTransition, useMemo } from 'react';

import {
  WalletOutlined,
  DollarOutlined,
  CreditCardOutlined,
  NumberOutlined,
  FileTextOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { Modal, Input, Select, InputNumber, message, Typography, Alert, Divider } from 'antd';
import { useTranslations, useLocale } from 'next-intl';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Form } from '@/components/ui/Form';
import {
  useRecordWorkshopPayment,
  type WorkshopOrderWithWorkshop,
} from '@/lib/hooks/data/useWorkshops';
import { useShop } from '@/lib/hooks/shop';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

import type { ZodType } from 'zod';

// Create a form schema for recording payments
const paymentFormSchema = z.object({
  id_workshop_order: z.string().min(1, 'Order ID is required'),
  id_workshop: z.string().min(1, 'Workshop ID is required'),
  transaction_type: z.enum(['payment', 'advance', 'refund', 'adjustment']).default('payment'),
  amount: z.number().positive('Amount must be greater than zero').max(99999999.9999),
  payment_method: z.string().max(50).optional().nullable().default('cash'),
  reference_number: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// Infer the form data type
type PaymentFormData = z.infer<typeof paymentFormSchema>;

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface RecordPaymentModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean;

  /**
   * The workshop order to record payment for
   */
  order: WorkshopOrderWithWorkshop;

  /**
   * Current balance due on the order
   */
  balanceDue: number;

  /**
   * Callback when payment is successfully recorded
   */
  onSuccess?: () => void;

  /**
   * Callback when modal is cancelled
   */
  onCancel?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Payment method options
const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash', icon: <DollarOutlined /> },
  { value: 'card', label: 'Card', icon: <CreditCardOutlined /> },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: <BankOutlined /> },
  { value: 'check', label: 'Check', icon: <FileTextOutlined /> },
  { value: 'other', label: 'Other', icon: <WalletOutlined /> },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * RecordPaymentModal Component
 *
 * Provides a modal form for recording payments to workshop orders.
 * Creates workshop_transaction records for payment tracking.
 */
export function RecordPaymentModal({
  open,
  order,
  balanceDue,
  onSuccess,
  onCancel,
}: RecordPaymentModalProps): React.JSX.Element {
  const t = useTranslations('workshops');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const { shop } = useShop();
  const [isPending, startTransition] = useTransition();

  const currency = shop?.currency || 'USD';

  // Record payment mutation
  const recordPayment = useRecordWorkshopPayment();

  // Check if form is currently submitting
  const isSubmitting = isPending || recordPayment.isPending;

  // Default values for the form
  const defaultValues = useMemo<Partial<PaymentFormData>>(
    () => ({
      id_workshop_order: order.id_workshop_order,
      id_workshop: order.id_workshop,
      transaction_type: 'payment',
      amount: balanceDue > 0 ? balanceDue : 0,
      payment_method: 'cash',
      reference_number: null,
      notes: null,
    }),
    [order, balanceDue]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: PaymentFormData) => {
      startTransition(async () => {
        try {
          await recordPayment.mutateAsync({
            id_workshop_order: order.id_workshop_order,
            id_workshop: order.id_workshop,
            transaction_type: 'payment',
            amount: data.amount,
            notes: data.notes || null,
          });
          message.success(t('orders.paymentRecorded'));
          onSuccess?.();
        } catch (error) {
          console.error('[RecordPaymentModal] Submit error:', error);
          message.error(t('orders.paymentError'));
        }
      });
    },
    [order, recordPayment, onSuccess, t]
  );

  return (
    <Modal
      open={open}
      title={
        <div className="flex items-center gap-2">
          <WalletOutlined className="text-amber-500" />
          <span>{t('orders.recordPayment')}</span>
        </div>
      }
      onCancel={onCancel}
      footer={null}
      width={500}
      destroyOnClose
      maskClosable={!isSubmitting}
      closable={!isSubmitting}
    >
      {/* Order Summary */}
      <div className="bg-stone-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <Text type="secondary" className="text-xs">
              {t('orders.orderNumber')}
            </Text>
            <Text strong className="block text-amber-700">
              {order.order_number}
            </Text>
          </div>
          <div className="text-end">
            <Text type="secondary" className="text-xs">
              {t('workshop')}
            </Text>
            <Text strong className="block">
              {order.workshops?.workshop_name}
            </Text>
          </div>
        </div>

        <Divider className="my-3" />

        <div className="flex justify-between items-center">
          <Text type="secondary">{t('orders.balanceDue')}</Text>
          <Text
            strong
            className={cn('text-xl', balanceDue > 0 ? 'text-red-600' : 'text-emerald-600')}
          >
            {formatCurrency(balanceDue, currency, locale)}
          </Text>
        </div>
      </div>

      {balanceDue <= 0 ? (
        <Alert
          type="success"
          showIcon
          message={t('orders.fullyPaid')}
          description={t('orders.fullyPaidDescription')}
        />
      ) : (
        <Form<PaymentFormData>
          schema={paymentFormSchema as unknown as ZodType<PaymentFormData>}
          onSubmit={handleSubmit}
          defaultValues={defaultValues}
          className="space-y-4"
        >
          {/* Amount Input */}
          <Form.Item<PaymentFormData> name="amount" label={tCommon('labels.amount')} required>
            {({ field }) => (
              <InputNumber
                {...field}
                size="large"
                className="!w-full"
                placeholder={t('orders.enterPaymentAmount')}
                min={0.01}
                max={balanceDue}
                step={0.01}
                formatter={(value) => `${currency} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => Number(value!.replace(new RegExp(`${currency}\\s?|,`, 'g'), ''))}
                prefix={<DollarOutlined />}
              />
            )}
          </Form.Item>

          {/* Quick amount buttons */}
          <div className="flex gap-2 -mt-2 mb-4">
            <Form.Item<PaymentFormData> name="amount">
              {({ field }) => (
                <>
                  <Button
                    size="small"
                    type={field.value === balanceDue ? 'primary' : 'default'}
                    onClick={() => field.onChange(balanceDue)}
                  >
                    {t('orders.payFullAmount')}
                  </Button>
                  {balanceDue > 100 && (
                    <Button
                      size="small"
                      type={field.value === Math.floor(balanceDue / 2) ? 'primary' : 'default'}
                      onClick={() => field.onChange(Math.floor(balanceDue / 2))}
                    >
                      {t('orders.payHalf')}
                    </Button>
                  )}
                </>
              )}
            </Form.Item>
          </div>

          {/* Payment Method */}
          <Form.Item<PaymentFormData>
            name="payment_method"
            label={t('orders.paymentMethod')}
            required
          >
            {({ field }) => (
              <Select
                {...field}
                size="large"
                placeholder={t('orders.selectPaymentMethod')}
                className="w-full"
              >
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      <span>{t(`orders.paymentMethods.${opt.value}`)}</span>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            )}
          </Form.Item>

          {/* Reference Number */}
          <Form.Item<PaymentFormData> name="reference_number" label={t('orders.referenceNumber')}>
            <Input
              size="large"
              placeholder={t('orders.enterReference')}
              maxLength={100}
              prefix={<NumberOutlined className="text-stone-400" />}
            />
          </Form.Item>

          {/* Notes */}
          <Form.Item<PaymentFormData> name="notes" label={tCommon('labels.notes')}>
            <Input.TextArea
              rows={2}
              placeholder={t('orders.paymentNotesPlaceholder')}
              maxLength={500}
            />
          </Form.Item>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <Button size="large" onClick={onCancel} disabled={isSubmitting}>
              {tCommon('actions.cancel')}
            </Button>

            <Form.Submit>
              <Button
                type="primary"
                size="large"
                loading={isSubmitting}
                icon={<WalletOutlined />}
                className="min-w-[160px]"
              >
                {isSubmitting ? tCommon('messages.processing') : t('orders.recordPayment')}
              </Button>
            </Form.Submit>
          </div>
        </Form>
      )}
    </Modal>
  );
}

export default RecordPaymentModal;
