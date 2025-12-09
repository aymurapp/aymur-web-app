'use client';

/**
 * DeliveryStep Component
 *
 * Step in checkout flow for selecting delivery option.
 * Allows user to choose between customer pickup or delivery.
 * If delivery is selected, collects courier and delivery details.
 *
 * Features:
 * - Toggle between pickup and delivery
 * - Courier selection dropdown
 * - Recipient name (auto-filled from customer)
 * - Delivery address input
 * - Delivery cost with paid-by selection
 * - Estimated delivery date picker
 * - RTL support
 *
 * @module components/domain/sales/DeliveryStep
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import {
  TruckOutlined,
  ShopOutlined,
  UserOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Radio,
  Divider,
  Typography,
  Space,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { useCouriers } from '@/lib/hooks/data/useDeliveries';
import { cn } from '@/lib/utils/cn';
import type { DeliveryInfo, FulfillmentType, CartCustomer } from '@/stores/cartStore';

import type { RadioChangeEvent } from 'antd';

const { TextArea } = Input;
const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface DeliveryStepProps {
  /** Current fulfillment type */
  fulfillmentType: FulfillmentType;
  /** Current delivery info */
  deliveryInfo: DeliveryInfo | null;
  /** Customer info (for pre-filling) */
  customer: CartCustomer | null;
  /** Callback to set fulfillment type */
  onFulfillmentTypeChange: (type: FulfillmentType) => void;
  /** Callback to set delivery info */
  onDeliveryInfoChange: (info: DeliveryInfo | null) => void;
  /** Callback to go back */
  onBack: () => void;
  /** Callback to proceed */
  onProceed: () => void;
  /** Whether we can proceed */
  canProceed: boolean;
  /** Whether form is loading/processing */
  isLoading?: boolean;
  /** Currency for display */
  currency?: string;
  /** Additional class name */
  className?: string;
}

interface DeliveryFormValues {
  fulfillmentType: FulfillmentType;
  courierId?: string;
  recipientName?: string;
  deliveryAddress?: string;
  deliveryCost: number;
  costPaidBy: 'shop' | 'customer';
  estimatedDate?: dayjs.Dayjs;
  notes?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * DeliveryStep - Checkout step for delivery options
 */
export function DeliveryStep({
  fulfillmentType,
  deliveryInfo,
  customer,
  onFulfillmentTypeChange,
  onDeliveryInfoChange,
  onBack,
  onProceed,
  canProceed,
  isLoading = false,
  currency = 'USD',
  className,
}: DeliveryStepProps): React.JSX.Element {
  const t = useTranslations('sales.checkout.delivery');
  const tCommon = useTranslations('common');

  const [form] = Form.useForm<DeliveryFormValues>();

  // Fetch active couriers
  const { couriers, isLoading: couriersLoading } = useCouriers({
    status: 'active',
    pageSize: 100,
  });

  // Cost paid by options
  const costPaidByOptions = useMemo(
    () => [
      { label: t('byShop'), value: 'shop' },
      { label: t('byCustomer'), value: 'customer' },
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

  // Initialize form with current values
  useEffect(() => {
    form.setFieldsValue({
      fulfillmentType,
      courierId: deliveryInfo?.courierId,
      recipientName: deliveryInfo?.recipientName || customer?.name || '',
      deliveryAddress: deliveryInfo?.deliveryAddress || '',
      deliveryCost: deliveryInfo?.deliveryCost ?? 0,
      costPaidBy: deliveryInfo?.costPaidBy || 'customer',
      estimatedDate: deliveryInfo?.estimatedDate ? dayjs(deliveryInfo.estimatedDate) : undefined,
      notes: deliveryInfo?.notes || '',
    });
  }, [form, fulfillmentType, deliveryInfo, customer]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleFulfillmentChange = useCallback(
    (e: RadioChangeEvent) => {
      const newType = e.target.value as FulfillmentType;
      onFulfillmentTypeChange(newType);

      if (newType === 'pickup') {
        onDeliveryInfoChange(null);
      }
    },
    [onFulfillmentTypeChange, onDeliveryInfoChange]
  );

  const handleFormChange = useCallback(() => {
    const values = form.getFieldsValue();

    if (values.fulfillmentType === 'pickup') {
      return;
    }

    // Find courier name
    const courier = couriers.find((c) => c.id_courier === values.courierId);

    const newDeliveryInfo: DeliveryInfo = {
      courierId: values.courierId || '',
      courierName: courier?.company_name,
      recipientName: values.recipientName?.trim() || '',
      deliveryAddress: values.deliveryAddress?.trim() || '',
      deliveryCost: values.deliveryCost ?? 0,
      costPaidBy: values.costPaidBy || 'customer',
      estimatedDate: values.estimatedDate?.format('YYYY-MM-DD'),
      notes: values.notes?.trim(),
    };

    onDeliveryInfoChange(newDeliveryInfo);
  }, [form, couriers, onDeliveryInfoChange]);

  const handleProceed = useCallback(() => {
    if (fulfillmentType === 'pickup') {
      onProceed();
      return;
    }

    form
      .validateFields()
      .then(() => {
        onProceed();
      })
      .catch(() => {
        // Validation failed, form will show errors
      });
  }, [form, fulfillmentType, onProceed]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const isDelivery = fulfillmentType === 'delivery';

  return (
    <div className={cn('space-y-6', className)}>
      <Form form={form} layout="vertical" requiredMark="optional" onValuesChange={handleFormChange}>
        {/* Fulfillment Type Selection */}
        <div className="bg-stone-50 rounded-lg p-4 mb-6">
          <Text type="secondary" className="block mb-3 text-sm">
            {t('title')}
          </Text>
          <Form.Item name="fulfillmentType" noStyle>
            <Radio.Group
              onChange={handleFulfillmentChange}
              value={fulfillmentType}
              className="w-full"
            >
              <Space direction="vertical" className="w-full">
                <Radio.Button
                  value="pickup"
                  className={cn(
                    'w-full !h-auto !py-3 !px-4 flex items-center gap-3',
                    !isDelivery && '!border-amber-500 !bg-amber-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <ShopOutlined className={cn('text-lg', !isDelivery && 'text-amber-600')} />
                    <div>
                      <div className={cn('font-medium', !isDelivery && 'text-amber-700')}>
                        {t('pickUp')}
                      </div>
                    </div>
                  </div>
                </Radio.Button>
                <Radio.Button
                  value="delivery"
                  className={cn(
                    'w-full !h-auto !py-3 !px-4 flex items-center gap-3',
                    isDelivery && '!border-amber-500 !bg-amber-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <TruckOutlined className={cn('text-lg', isDelivery && 'text-amber-600')} />
                    <div>
                      <div className={cn('font-medium', isDelivery && 'text-amber-700')}>
                        {t('deliverToCustomer')}
                      </div>
                    </div>
                  </div>
                </Radio.Button>
              </Space>
            </Radio.Group>
          </Form.Item>
        </div>

        {/* Delivery Form - Only shown when delivery is selected */}
        {isDelivery && (
          <div className="space-y-4">
            {/* Courier Selection */}
            <Form.Item
              name="courierId"
              label={t('selectCourier')}
              rules={[{ required: true, message: tCommon('validation.required') }]}
            >
              <Select
                placeholder={t('selectCourier')}
                options={courierOptions}
                loading={couriersLoading}
                showSearch
                optionFilterProp="label"
                suffixIcon={<TruckOutlined />}
                notFoundContent={
                  couriersLoading ? tCommon('messages.loading') : t('noCouriersAvailable')
                }
              />
            </Form.Item>

            <Divider orientation="left" className="!text-sm !text-stone-500">
              <span className="flex items-center gap-2">
                <UserOutlined />
                {t('recipientName')}
              </span>
            </Divider>

            {/* Recipient Name */}
            <Form.Item
              name="recipientName"
              label={t('recipientName')}
              rules={[{ max: 255, message: tCommon('validation.maxLength', { max: 255 }) }]}
            >
              <Input placeholder={customer?.name || t('recipientName')} />
            </Form.Item>

            <Divider orientation="left" className="!text-sm !text-stone-500">
              <span className="flex items-center gap-2">
                <EnvironmentOutlined />
                {t('deliveryAddress')}
              </span>
            </Divider>

            {/* Delivery Address */}
            <Form.Item
              name="deliveryAddress"
              label={t('deliveryAddress')}
              rules={[
                { required: true, message: tCommon('validation.required') },
                { max: 1000, message: tCommon('validation.maxLength', { max: 1000 }) },
              ]}
            >
              <TextArea rows={3} placeholder={t('deliveryAddress')} showCount maxLength={1000} />
            </Form.Item>

            <Divider orientation="left" className="!text-sm !text-stone-500">
              <span className="flex items-center gap-2">
                <DollarOutlined />
                {t('deliveryCost')}
              </span>
            </Divider>

            {/* Delivery Cost and Paid By */}
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="deliveryCost"
                label={t('deliveryCost')}
                rules={[
                  { required: true, message: tCommon('validation.required') },
                  { type: 'number', min: 0, message: tCommon('validation.minValue', { min: 0 }) },
                ]}
              >
                <InputNumber<number>
                  className="w-full"
                  min={0}
                  precision={2}
                  formatter={(value) =>
                    `${currency} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  }
                  parser={(value) => {
                    const parsed = value?.replace(/[^\d.]/g, '');
                    return (parsed ? parseFloat(parsed) : 0) as 0;
                  }}
                  placeholder="0.00"
                />
              </Form.Item>

              <Form.Item
                name="costPaidBy"
                label={t('paidBy')}
                rules={[{ required: true, message: tCommon('validation.required') }]}
              >
                <Select options={costPaidByOptions} placeholder={t('paidBy')} />
              </Form.Item>
            </div>

            {/* Estimated Delivery Date */}
            <Form.Item name="estimatedDate" label={t('estimatedDate')}>
              <DatePicker
                className="w-full"
                format="YYYY-MM-DD"
                placeholder={t('estimatedDate')}
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Form.Item>

            {/* Notes */}
            <Form.Item
              name="notes"
              label={tCommon('labels.notes')}
              rules={[{ max: 500, message: tCommon('validation.maxLength', { max: 500 }) }]}
            >
              <TextArea rows={2} placeholder={tCommon('labels.notes')} showCount maxLength={500} />
            </Form.Item>
          </div>
        )}
      </Form>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4 border-t border-stone-200">
        <Button
          type="default"
          size="large"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          disabled={isLoading}
          className="flex-1"
        >
          {tCommon('actions.back')}
        </Button>
        <Button
          type="primary"
          size="large"
          icon={<ArrowRightOutlined />}
          onClick={handleProceed}
          loading={isLoading}
          disabled={!canProceed}
          className="flex-1"
        >
          {t('continueToPayment')}
        </Button>
      </div>

      {/* Optional step hint */}
      {!isDelivery && (
        <div className="text-center">
          <Text type="secondary" className="text-sm">
            {t('optionalStep')}
          </Text>
        </div>
      )}
    </div>
  );
}

export default DeliveryStep;
