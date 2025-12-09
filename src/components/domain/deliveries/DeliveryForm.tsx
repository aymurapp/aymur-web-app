'use client';

/**
 * DeliveryForm Component
 *
 * Modal form for creating and editing deliveries.
 * Handles all delivery fields including recipient info, address, and courier selection.
 *
 * Features:
 * - Create new delivery linked to a sale
 * - Edit existing delivery (if not in terminal state)
 * - Recipient name and phone fields
 * - Delivery address fields
 * - Courier selection dropdown
 * - Tracking number input
 * - Scheduled date picker
 * - Delivery cost with paid-by selection
 * - Notes field
 * - RTL support
 *
 * @module components/domain/deliveries/DeliveryForm
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import {
  TruckOutlined,
  UserOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import {
  Drawer,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Divider,
  Typography,
  Card,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  useCouriers,
  useCreateDelivery,
  useUpdateDelivery,
  type DeliveryWithCourier,
  type DeliveryInsert,
  type DeliveryUpdate,
} from '@/lib/hooks/data/useDeliveries';
import { useShop } from '@/lib/hooks/shop';

const { TextArea } = Input;
const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Sale info for display when linked to a delivery
 */
export interface SaleInfo {
  /** Sale ID */
  id_sale: string;
  /** Invoice number */
  invoice_number?: string;
  /** Sale date */
  sale_date?: string;
  /** Customer name */
  customer_name?: string;
  /** Total amount */
  total_amount?: number;
}

interface DeliveryFormProps {
  /** Whether the modal is open */
  open: boolean;
  /** Delivery to edit (null for create mode) */
  delivery?: DeliveryWithCourier | null;
  /** Pre-selected sale ID (for creating from sale page) */
  saleId?: string;
  /** Sale info for display (optional - for better UX) */
  saleInfo?: SaleInfo | null;
  /** Pre-filled recipient name (from customer) */
  recipientName?: string;
  /** Pre-filled delivery address (from customer) */
  deliveryAddress?: string;
  /** Close handler */
  onClose: () => void;
  /** Success callback */
  onSuccess?: () => void;
}

interface DeliveryFormValues {
  id_sale: string;
  id_courier: string;
  tracking_number?: string;
  recipient_name?: string;
  delivery_address?: string;
  delivery_cost: number;
  cost_paid_by: 'shop' | 'customer' | 'split';
  estimated_delivery_date?: dayjs.Dayjs;
  notes?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * DeliveryForm - Modal form for creating/editing deliveries
 */
export function DeliveryForm({
  open,
  delivery,
  saleId,
  saleInfo,
  recipientName,
  deliveryAddress,
  onClose,
  onSuccess,
}: DeliveryFormProps): React.JSX.Element {
  const t = useTranslations('deliveries');
  const tCommon = useTranslations('common');

  useShop(); // Ensure shop context is available
  const [form] = Form.useForm<DeliveryFormValues>();

  // Mutations
  const createMutation = useCreateDelivery();
  const updateMutation = useUpdateDelivery();

  // Fetch active couriers for dropdown
  const { couriers, isLoading: couriersLoading } = useCouriers({
    status: 'active',
    pageSize: 100,
  });

  // Derived state
  const isEdit = !!delivery;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Show sale info if available
  const displaySaleInfo =
    saleInfo ||
    (delivery && {
      id_sale: delivery.id_sale,
    });

  // Cost paid by options
  const costPaidByOptions = useMemo(
    () => [
      { label: t('paidByShop'), value: 'shop' },
      { label: t('paidByCustomer'), value: 'customer' },
      { label: t('splitCost'), value: 'split' },
    ],
    [t]
  );

  // Courier options
  const courierOptions = useMemo(
    () =>
      couriers.map((c) => ({
        label: c.company_name,
        value: c.id_courier,
      })),
    [couriers]
  );

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Reset form when modal opens or delivery changes
  useEffect(() => {
    if (open) {
      if (delivery) {
        // Edit mode - populate form with delivery data
        form.setFieldsValue({
          id_sale: delivery.id_sale,
          id_courier: delivery.id_courier,
          tracking_number: delivery.tracking_number || undefined,
          recipient_name: delivery.recipient_name || undefined,
          delivery_address: delivery.delivery_address || undefined,
          delivery_cost: Number(delivery.delivery_cost) || 0,
          cost_paid_by: (delivery.cost_paid_by as 'shop' | 'customer' | 'split') || 'customer',
          estimated_delivery_date: delivery.estimated_delivery_date
            ? dayjs(delivery.estimated_delivery_date)
            : undefined,
          notes: delivery.notes || undefined,
        });
      } else {
        // Create mode - reset form with defaults and pre-filled values
        form.resetFields();
        if (saleId) {
          form.setFieldValue('id_sale', saleId);
        }
        // Pre-fill recipient name if provided (from customer)
        if (recipientName) {
          form.setFieldValue('recipient_name', recipientName);
        }
        // Pre-fill delivery address if provided (from customer)
        if (deliveryAddress) {
          form.setFieldValue('delivery_address', deliveryAddress);
        }
        form.setFieldValue('cost_paid_by', 'customer');
        form.setFieldValue('delivery_cost', 0);
      }
    }
  }, [open, delivery, saleId, recipientName, deliveryAddress, form]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleClose = useCallback(() => {
    form.resetFields();
    onClose();
  }, [form, onClose]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      if (isEdit && delivery) {
        // Update existing delivery
        const updateData: DeliveryUpdate = {
          id_courier: values.id_courier,
          tracking_number: values.tracking_number?.trim().toUpperCase() || null,
          recipient_name: values.recipient_name?.trim() || null,
          delivery_address: values.delivery_address?.trim() || null,
          delivery_cost: values.delivery_cost,
          cost_paid_by: values.cost_paid_by,
          estimated_delivery_date: values.estimated_delivery_date?.format('YYYY-MM-DD') || null,
          notes: values.notes?.trim() || null,
        };

        await updateMutation.mutateAsync({
          deliveryId: delivery.id_delivery,
          data: updateData,
        });

        message.success(t('deliveryUpdated'));
      } else {
        // Create new delivery
        const createData: Omit<DeliveryInsert, 'id_shop' | 'created_by'> = {
          id_sale: values.id_sale,
          id_courier: values.id_courier,
          tracking_number: values.tracking_number?.trim().toUpperCase() || null,
          recipient_name: values.recipient_name?.trim() || null,
          delivery_address: values.delivery_address?.trim() || null,
          delivery_cost: values.delivery_cost,
          cost_paid_by: values.cost_paid_by,
          estimated_delivery_date: values.estimated_delivery_date?.format('YYYY-MM-DD') || null,
          notes: values.notes?.trim() || null,
          status: 'pending',
        };

        await createMutation.mutateAsync(createData);

        message.success(t('deliveryCreated'));
      }

      handleClose();
      onSuccess?.();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error(tCommon('messages.operationFailed'));
      }
    }
  }, [form, isEdit, delivery, createMutation, updateMutation, handleClose, onSuccess, t, tCommon]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Drawer
      open={open}
      title={
        <div className="flex items-center gap-2">
          <TruckOutlined className="text-amber-500" />
          <span>{isEdit ? t('editDelivery') : t('newDelivery')}</span>
        </div>
      }
      onClose={handleClose}
      placement="right"
      width={600}
      destroyOnClose
      maskClosable={!isSubmitting}
      closable={!isSubmitting}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} disabled={isSubmitting}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            permission={isEdit ? 'deliveries.update' : 'deliveries.create'}
          >
            {isEdit ? tCommon('actions.save') : tCommon('actions.create')}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional" className="mt-4">
        {/* Sale Info - Show when available */}
        {displaySaleInfo && (
          <Card
            size="small"
            className="mb-4 bg-amber-50 border-amber-200"
            styles={{ body: { padding: '12px' } }}
          >
            <div className="flex items-center gap-2 mb-2">
              <ShoppingOutlined className="text-amber-600" />
              <Text strong className="text-amber-700">
                {t('linkedSale')}
              </Text>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {displaySaleInfo.invoice_number && (
                <div>
                  <Text type="secondary">{t('invoiceNumber')}:</Text>
                  <Text className="ml-1">{displaySaleInfo.invoice_number}</Text>
                </div>
              )}
              {displaySaleInfo.sale_date && (
                <div>
                  <Text type="secondary">{t('saleDate')}:</Text>
                  <Text className="ml-1">{displaySaleInfo.sale_date}</Text>
                </div>
              )}
              {displaySaleInfo.customer_name && (
                <div>
                  <Text type="secondary">{t('customer')}:</Text>
                  <Text className="ml-1">{displaySaleInfo.customer_name}</Text>
                </div>
              )}
              {displaySaleInfo.total_amount !== undefined && (
                <div>
                  <Text type="secondary">{t('totalAmount')}:</Text>
                  <Text className="ml-1">${displaySaleInfo.total_amount.toFixed(2)}</Text>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Sale ID - Required for new deliveries (hidden input when saleId is provided) */}
        {!isEdit && (
          <Form.Item
            name="id_sale"
            label={displaySaleInfo ? undefined : t('linkedSale')}
            rules={[{ required: true, message: tCommon('validation.required') }]}
            hidden={!!saleId && !!displaySaleInfo}
          >
            <Input placeholder={t('selectSale')} disabled={!!saleId} />
          </Form.Item>
        )}

        {/* Courier Selection */}
        <Form.Item
          name="id_courier"
          label={t('courier')}
          rules={[{ required: true, message: tCommon('validation.required') }]}
        >
          <Select
            placeholder={t('selectCourier')}
            options={courierOptions}
            loading={couriersLoading}
            showSearch
            optionFilterProp="label"
            suffixIcon={<TruckOutlined />}
          />
        </Form.Item>

        <Divider orientation="left" className="!text-sm !text-stone-500">
          <span className="flex items-center gap-2">
            <UserOutlined />
            {t('recipientInfo')}
          </span>
        </Divider>

        {/* Recipient Name */}
        <Form.Item
          name="recipient_name"
          label={t('recipientName')}
          rules={[{ max: 255, message: tCommon('validation.maxLength', { max: 255 }) }]}
        >
          <Input placeholder={t('recipientName')} />
        </Form.Item>

        {/* Delivery Address */}
        <Form.Item
          name="delivery_address"
          label={t('deliveryAddress')}
          rules={[{ max: 1000, message: tCommon('validation.maxLength', { max: 1000 }) }]}
        >
          <TextArea rows={3} placeholder={t('deliveryAddress')} showCount maxLength={1000} />
        </Form.Item>

        <Divider orientation="left" className="!text-sm !text-stone-500">
          <span className="flex items-center gap-2">
            <EnvironmentOutlined />
            {t('trackingInfo')}
          </span>
        </Divider>

        {/* Tracking Number */}
        <Form.Item
          name="tracking_number"
          label={t('trackingNumber')}
          rules={[{ max: 100, message: tCommon('validation.maxLength', { max: 100 }) }]}
        >
          <Input
            placeholder={t('trackingNumber')}
            className="font-mono"
            style={{ textTransform: 'uppercase' }}
          />
        </Form.Item>

        {/* Estimated Delivery Date */}
        <Form.Item name="estimated_delivery_date" label={t('estimatedDelivery')}>
          <DatePicker className="w-full" format="YYYY-MM-DD" placeholder={t('scheduledDate')} />
        </Form.Item>

        <Divider orientation="left" className="!text-sm !text-stone-500">
          <span className="flex items-center gap-2">
            <DollarOutlined />
            {t('paymentInfo')}
          </span>
        </Divider>

        {/* Delivery Cost and Paid By */}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="delivery_cost"
            label={t('deliveryCost')}
            rules={[
              { required: true, message: tCommon('validation.required') },
              { type: 'number', min: 0, message: tCommon('validation.minValue', { min: 0 }) },
            ]}
          >
            <InputNumber className="w-full" min={0} precision={2} prefix="$" placeholder="0.00" />
          </Form.Item>

          <Form.Item
            name="cost_paid_by"
            label={t('costPaidBy')}
            rules={[{ required: true, message: tCommon('validation.required') }]}
          >
            <Select options={costPaidByOptions} placeholder={t('costPaidBy')} />
          </Form.Item>
        </div>

        {/* Notes */}
        <Form.Item
          name="notes"
          label={t('notes')}
          rules={[{ max: 2000, message: tCommon('validation.maxLength', { max: 2000 }) }]}
        >
          <TextArea rows={3} placeholder={t('notes')} showCount maxLength={2000} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

export default DeliveryForm;
