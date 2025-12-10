'use client';

/**
 * RecordPaymentDrawer Component
 *
 * Drawer for recording payments against a purchase or supplier balance.
 *
 * Features:
 * - Show current balance due
 * - Amount input (default to balance)
 * - Payment type selector (cash, card, transfer, cheque, gold)
 * - Cheque fields (number, bank, date) when cheque is selected
 * - Gold fields (weight, rate) when gold is selected
 * - Date picker
 * - Notes field
 *
 * @module components/domain/suppliers/RecordPaymentDrawer
 */

import React, { useState, useCallback, useEffect } from 'react';

import {
  DollarOutlined,
  CreditCardOutlined,
  SwapOutlined,
  BankOutlined,
  GoldOutlined,
} from '@ant-design/icons';
import {
  Drawer,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Typography,
  Divider,
  message,
  Space,
  Alert,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { recordSupplierPayment } from '@/lib/actions/supplier';
import type { PurchaseWithSupplier } from '@/lib/hooks/data/usePurchases';
import { useShop } from '@/lib/hooks/shop';
import { formatCurrency } from '@/lib/utils/format';

const { Text, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface RecordPaymentDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Handler for closing the drawer */
  onClose: () => void;
  /** Handler for successful payment */
  onSuccess: () => void;
  /** Purchase to record payment for */
  purchase: PurchaseWithSupplier;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function RecordPaymentDrawer({
  open,
  onClose,
  onSuccess,
  purchase,
}: RecordPaymentDrawerProps): React.JSX.Element {
  const t = useTranslations('purchases');
  const tCommon = useTranslations('common');
  const tSuppliers = useTranslations('suppliers');
  const locale = useLocale();
  const { shop } = useShop();
  const currency = shop?.currency || 'USD';

  // Form instance
  const [form] = Form.useForm();

  // State
  const [isRecording, setIsRecording] = useState(false);

  // Calculate balance
  const totalAmount = Number(purchase.total_amount) || 0;
  const paidAmount = Number(purchase.paid_amount) || 0;
  const balanceDue = totalAmount - paidAmount;

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        amount: balanceDue,
        payment_type: 'cash',
        payment_date: dayjs(),
        notes: '',
      });
    }
  }, [open, balanceDue, form]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSubmit = useCallback(
    async (values: {
      amount: number;
      payment_type: 'cash' | 'card' | 'transfer' | 'cheque' | 'gold';
      payment_date: dayjs.Dayjs;
      notes?: string;
      // Cheque fields
      cheque_number?: string;
      cheque_bank?: string;
      cheque_date?: dayjs.Dayjs;
      // Gold fields
      gold_weight_grams?: number;
      gold_rate_per_gram?: number;
    }) => {
      if (!purchase.id_supplier) {
        message.error(t('noSupplierError'));
        return;
      }

      setIsRecording(true);
      try {
        const result = await recordSupplierPayment({
          id_supplier: purchase.id_supplier,
          amount: values.amount,
          transaction_date: values.payment_date.format('YYYY-MM-DD'),
          notes: values.notes || null,
          reference_type: 'purchase',
          reference_id: purchase.id_purchase,
          payment_type: values.payment_type,
          // Cheque fields
          cheque_number: values.cheque_number || null,
          cheque_bank: values.cheque_bank || null,
          cheque_date: values.cheque_date?.format('YYYY-MM-DD') || null,
          // Gold fields
          gold_weight_grams: values.gold_weight_grams || null,
          gold_rate_per_gram: values.gold_rate_per_gram || null,
        });

        if (result.success) {
          message.success(t('paymentRecorded'));
          onSuccess();
        } else {
          message.error(result.error || t('paymentError'));
        }
      } catch (error) {
        console.error('[RecordPaymentDrawer] Error:', error);
        message.error(t('paymentError'));
      } finally {
        setIsRecording(false);
      }
    },
    [purchase.id_supplier, purchase.id_purchase, t, onSuccess]
  );

  const handlePayFullBalance = useCallback(() => {
    form.setFieldValue('amount', balanceDue);
  }, [form, balanceDue]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <DollarOutlined className="text-amber-500" />
          <span>{t('recordPayment')}</span>
        </div>
      }
      open={open}
      onClose={onClose}
      width={480}
      placement="right"
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{tCommon('actions.cancel')}</Button>
          <Button
            type="primary"
            onClick={() => form.submit()}
            loading={isRecording}
            icon={<DollarOutlined />}
          >
            {t('recordPayment')}
          </Button>
        </div>
      }
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
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* Amount */}
        <Form.Item
          name="amount"
          label={tCommon('labels.amount')}
          rules={[
            { required: true, message: tSuppliers('validation.amountRequired') },
            {
              type: 'number',
              min: 0.01,
              message: tSuppliers('validation.amountPositive'),
            },
          ]}
          extra={
            form.getFieldValue('amount') < balanceDue && (
              <a onClick={handlePayFullBalance} className="text-amber-600 hover:text-amber-700">
                {t('payFullBalance')}
              </a>
            )
          }
        >
          <InputNumber
            className="!w-full"
            size="large"
            min={0.01}
            precision={2}
            prefix={currency}
            placeholder={tSuppliers('placeholders.enterAmount')}
          />
        </Form.Item>

        {/* Payment Date */}
        <Form.Item
          name="payment_date"
          label={t('paymentDate')}
          rules={[{ required: true, message: tSuppliers('validation.dateRequired') }]}
        >
          <DatePicker
            className="!w-full"
            size="large"
            format="YYYY-MM-DD"
            disabledDate={(current) => current && current > dayjs().endOf('day')}
          />
        </Form.Item>

        {/* Payment Type */}
        <Form.Item name="payment_type" label={tSuppliers('paymentType')}>
          <Select size="large">
            <Select.Option value="cash">
              <Space>
                <DollarOutlined />
                {tSuppliers('paymentTypes.cash')}
              </Space>
            </Select.Option>
            <Select.Option value="card">
              <Space>
                <CreditCardOutlined />
                {tSuppliers('paymentTypes.card')}
              </Space>
            </Select.Option>
            <Select.Option value="transfer">
              <Space>
                <SwapOutlined />
                {tSuppliers('paymentTypes.transfer')}
              </Space>
            </Select.Option>
            <Select.Option value="cheque">
              <Space>
                <BankOutlined />
                {tSuppliers('paymentTypes.cheque')}
              </Space>
            </Select.Option>
            <Select.Option value="gold">
              <Space>
                <GoldOutlined />
                {tSuppliers('paymentTypes.gold')}
              </Space>
            </Select.Option>
          </Select>
        </Form.Item>

        {/* Cheque Fields - shown when payment_type is 'cheque' */}
        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.payment_type !== curr.payment_type}>
          {({ getFieldValue }) =>
            getFieldValue('payment_type') === 'cheque' && (
              <>
                <Form.Item
                  name="cheque_number"
                  label={tSuppliers('chequeNumber')}
                  rules={[
                    { required: true, message: tSuppliers('validation.chequeNumberRequired') },
                  ]}
                >
                  <Input size="large" placeholder={tSuppliers('placeholders.chequeNumber')} />
                </Form.Item>
                <Form.Item
                  name="cheque_bank"
                  label={tSuppliers('chequeBank')}
                  rules={[{ required: true, message: tSuppliers('validation.chequeBankRequired') }]}
                >
                  <Input size="large" placeholder={tSuppliers('placeholders.chequeBank')} />
                </Form.Item>
                <Form.Item
                  name="cheque_date"
                  label={tSuppliers('chequeDate')}
                  rules={[{ required: true, message: tSuppliers('validation.chequeDateRequired') }]}
                >
                  <DatePicker className="!w-full" size="large" format="YYYY-MM-DD" />
                </Form.Item>
              </>
            )
          }
        </Form.Item>

        {/* Gold Fields - shown when payment_type is 'gold' */}
        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.payment_type !== curr.payment_type}>
          {({ getFieldValue }) =>
            getFieldValue('payment_type') === 'gold' && (
              <>
                <Form.Item
                  name="gold_weight_grams"
                  label={tSuppliers('goldWeightGrams')}
                  rules={[
                    { required: true, message: tSuppliers('validation.goldWeightRequired') },
                    {
                      type: 'number',
                      min: 0.001,
                      message: tSuppliers('validation.goldWeightPositive'),
                    },
                  ]}
                >
                  <InputNumber
                    className="!w-full"
                    size="large"
                    min={0.001}
                    precision={3}
                    placeholder={tSuppliers('placeholders.goldWeight')}
                    suffix="g"
                  />
                </Form.Item>
                <Form.Item
                  name="gold_rate_per_gram"
                  label={tSuppliers('goldRatePerGram')}
                  rules={[
                    { required: true, message: tSuppliers('validation.goldRateRequired') },
                    {
                      type: 'number',
                      min: 0.01,
                      message: tSuppliers('validation.goldRatePositive'),
                    },
                  ]}
                >
                  <InputNumber
                    className="!w-full"
                    size="large"
                    min={0.01}
                    precision={2}
                    prefix={currency}
                    placeholder={tSuppliers('placeholders.goldRate')}
                  />
                </Form.Item>
              </>
            )
          }
        </Form.Item>

        {/* Notes */}
        <Form.Item name="notes" label={tCommon('labels.notes')}>
          <Input.TextArea
            rows={3}
            placeholder={tSuppliers('placeholders.paymentNotes')}
            maxLength={1000}
            showCount
          />
        </Form.Item>
      </Form>

      {/* Warning for overpayment */}
      {form.getFieldValue('amount') > balanceDue && (
        <Alert
          type="warning"
          showIcon
          message={t('overpaymentWarning', {
            excess: formatCurrency(form.getFieldValue('amount') - balanceDue, currency, locale),
          })}
        />
      )}
    </Drawer>
  );
}

export default RecordPaymentDrawer;
