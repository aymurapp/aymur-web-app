'use client';

/**
 * RecordPaymentModal Component
 *
 * Modal for recording payments against a purchase or supplier balance.
 *
 * Features:
 * - Show current balance due
 * - Amount input (default to balance)
 * - Payment method selector
 * - Reference number field
 * - Date picker
 * - Notes field
 *
 * @module components/domain/suppliers/RecordPaymentModal
 */

import React, { useState, useCallback, useEffect } from 'react';

import { DollarOutlined, FileTextOutlined, CreditCardOutlined } from '@ant-design/icons';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Typography,
  Divider,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslations, useLocale } from 'next-intl';

import type { PurchaseWithSupplier } from '@/lib/hooks/data/usePurchases';
import { useRecordPurchasePayment } from '@/lib/hooks/data/usePurchases';
import { useShop } from '@/lib/hooks/shop';
import { formatCurrency } from '@/lib/utils/format';

const { Text, Title } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

export interface RecordPaymentModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Handler for closing the modal */
  onClose: () => void;
  /** Handler for successful payment */
  onSuccess: () => void;
  /** Purchase to record payment for */
  purchase: PurchaseWithSupplier;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PAYMENT_METHODS = [
  { value: 'cash', icon: <DollarOutlined /> },
  { value: 'bank_transfer', icon: <CreditCardOutlined /> },
  { value: 'check', icon: <FileTextOutlined /> },
  { value: 'card', icon: <CreditCardOutlined /> },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function RecordPaymentModal({
  open,
  onClose,
  onSuccess,
  purchase,
}: RecordPaymentModalProps): React.JSX.Element {
  const t = useTranslations('purchases');
  const tCommon = useTranslations('common');
  const tSales = useTranslations('sales');
  const locale = useLocale();
  const { shop } = useShop();
  const currency = shop?.currency || 'USD';

  // Form instance
  const [form] = Form.useForm();

  // Mutations
  const recordPayment = useRecordPurchasePayment();

  // Calculate balance
  const totalAmount = Number(purchase.total_amount) || 0;
  const paidAmount = Number(purchase.paid_amount) || 0;
  const balanceDue = totalAmount - paidAmount;

  // State
  const [amount, setAmount] = useState(balanceDue);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setAmount(balanceDue);
      form.setFieldsValue({
        amount: balanceDue,
        paymentMethod: 'cash',
        paymentDate: dayjs(),
        reference: '',
        notes: '',
      });
    }
  }, [open, balanceDue, form]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      await recordPayment.mutateAsync({
        purchaseId: purchase.id_purchase,
        amount: values.amount,
        paymentDate: values.paymentDate?.format('YYYY-MM-DD'),
        notes: values.notes
          ? `[${values.paymentMethod}${values.reference ? ` - ${values.reference}` : ''}] ${values.notes}`
          : `[${values.paymentMethod}${values.reference ? ` - ${values.reference}` : ''}]`,
      });

      message.success(t('paymentRecorded'));
      onSuccess();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error(t('paymentError'));
      }
    }
  }, [form, recordPayment, purchase.id_purchase, t, onSuccess]);

  const handleAmountChange = useCallback((value: number | null) => {
    setAmount(value || 0);
  }, []);

  const handlePayFullBalance = useCallback(() => {
    form.setFieldValue('amount', balanceDue);
    setAmount(balanceDue);
  }, [form, balanceDue]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <DollarOutlined className="text-amber-500" />
          <span>{t('recordPayment')}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={t('recordPayment')}
      cancelText={tCommon('actions.cancel')}
      okButtonProps={{ loading: recordPayment.isPending }}
      width={480}
      destroyOnClose
    >
      {/* Balance Summary */}
      <div className="bg-stone-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <Text type="secondary">{t('purchaseNumber')}</Text>
          <Text strong className="text-amber-700">
            {purchase.purchase_number}
          </Text>
        </div>
        <div className="flex justify-between items-center mb-2">
          <Text type="secondary">{t('supplier')}</Text>
          <Text>{purchase.supplier?.company_name || '-'}</Text>
        </div>
        <Divider className="my-3" />
        <div className="flex justify-between items-center mb-2">
          <Text type="secondary">{t('totalAmount')}</Text>
          <Text>{formatCurrency(totalAmount, currency, locale)}</Text>
        </div>
        <div className="flex justify-between items-center mb-2">
          <Text type="secondary">{t('paidAmount')}</Text>
          <Text className="text-green-600">{formatCurrency(paidAmount, currency, locale)}</Text>
        </div>
        <div className="flex justify-between items-center">
          <Text strong>{t('balanceDue')}</Text>
          <Title level={4} className="!mb-0 text-orange-500">
            {formatCurrency(balanceDue, currency, locale)}
          </Title>
        </div>
      </div>

      {/* Payment Form */}
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          amount: balanceDue,
          paymentMethod: 'cash',
          paymentDate: dayjs(),
        }}
      >
        {/* Amount */}
        <Form.Item
          name="amount"
          label={t('paymentAmount')}
          rules={[
            { required: true, message: t('validation.amountRequired') },
            {
              type: 'number',
              min: 0.01,
              message: t('validation.amountPositive'),
            },
          ]}
          extra={
            amount < balanceDue && (
              <a onClick={handlePayFullBalance} className="text-amber-600 hover:text-amber-700">
                {t('payFullBalance')}
              </a>
            )
          }
        >
          <InputNumber
            className="w-full"
            min={0.01}
            max={balanceDue * 10} // Allow overpayment with warning
            step={0.01}
            precision={2}
            prefix={<DollarOutlined className="text-stone-400" />}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/,/g, '') as unknown as number}
            onChange={handleAmountChange}
          />
        </Form.Item>

        {/* Payment Method */}
        <Form.Item
          name="paymentMethod"
          label={tSales('payment.method')}
          rules={[{ required: true, message: t('validation.methodRequired') }]}
        >
          <Select
            options={PAYMENT_METHODS.map((method) => ({
              value: method.value,
              label: (
                <div className="flex items-center gap-2">
                  {method.icon}
                  <span>{tSales(`payment.${method.value}`)}</span>
                </div>
              ),
            }))}
          />
        </Form.Item>

        {/* Payment Date */}
        <Form.Item name="paymentDate" label={t('paymentDate')}>
          <DatePicker
            className="w-full"
            format="YYYY-MM-DD"
            disabledDate={(current) => current && current > dayjs().endOf('day')}
          />
        </Form.Item>

        {/* Reference Number */}
        <Form.Item name="reference" label={t('referenceNumber')}>
          <Input
            placeholder={t('referenceNumberPlaceholder')}
            prefix={<FileTextOutlined className="text-stone-400" />}
          />
        </Form.Item>

        {/* Notes */}
        <Form.Item name="notes" label={tCommon('labels.notes')}>
          <TextArea rows={2} placeholder={t('paymentNotesPlaceholder')} maxLength={500} showCount />
        </Form.Item>
      </Form>

      {/* Warning for overpayment */}
      {amount > balanceDue && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm">
          {t('overpaymentWarning', {
            excess: formatCurrency(amount - balanceDue, currency, locale),
          })}
        </div>
      )}
    </Modal>
  );
}

export default RecordPaymentModal;
