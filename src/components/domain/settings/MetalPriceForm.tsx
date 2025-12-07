'use client';

/**
 * MetalPriceForm Component
 *
 * A modal form for adding or editing metal prices.
 * Supports different metal types with their associated purities.
 *
 * Features:
 * - Add and Edit modes with initial data support
 * - Dynamic purity options based on selected metal type
 * - Price date validation (cannot be in the future)
 * - Currency input for price fields
 * - Optional buy/sell price differentiation
 * - Source and notes fields
 * - RTL support with logical properties
 *
 * @module components/domain/settings/MetalPriceForm
 */

import React, { useEffect, useMemo, useCallback } from 'react';

import {
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  GoldOutlined,
} from '@ant-design/icons';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Typography,
  Spin,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import type { MetalPrice as MetalPriceType } from '@/lib/hooks/data/useMetalPrices';
import { useMetalTypes, useMetalPurities } from '@/lib/hooks/data/useMetals';
import { useShop } from '@/lib/hooks/shop';

import type { Dayjs } from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

/**
 * MetalPrice type for initial data
 * Can be the full type from database or a simplified version for the form
 */
export interface MetalPrice {
  id_price?: string;
  id_metal_type: string;
  id_metal_purity?: string | null;
  price_date: string;
  price_per_gram: number;
  buy_price_per_gram?: number | null;
  sell_price_per_gram?: number | null;
  source?: string | null;
  notes?: string | null;
}

/**
 * MetalPriceForm props
 */
export interface MetalPriceFormProps {
  /** Whether the modal is open */
  open: boolean;
  /** Handler for closing the modal */
  onClose: () => void;
  /** Initial data for edit mode */
  initialData?: MetalPrice | MetalPriceType | null;
  /** Callback when form is successfully submitted */
  onSuccess?: () => void;
}

/**
 * Form field values
 */
interface FormValues {
  id_metal_type: string;
  id_metal_purity?: string | null;
  price_date: Dayjs;
  price_per_gram: number;
  buy_price_per_gram?: number | null;
  sell_price_per_gram?: number | null;
  source?: string | null;
  notes?: string | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * MetalPriceForm Component
 *
 * Modal form for creating and editing metal prices.
 * Integrates with metal types and purities catalogs.
 */
export function MetalPriceForm({
  open,
  onClose,
  initialData,
  onSuccess,
}: MetalPriceFormProps): React.JSX.Element {
  const t = useTranslations('settings.metalPrices.form');
  const tCommon = useTranslations('common');
  const { shop } = useShop();

  // Form instance
  const [form] = Form.useForm<FormValues>();

  // Determine if we're in edit mode
  const isEdit = !!initialData?.id_price;

  // Watch selected metal type to filter purities
  const selectedMetalTypeId = Form.useWatch('id_metal_type', form);

  // Fetch metal types
  const { data: metalTypes, isLoading: metalTypesLoading } = useMetalTypes();

  // Fetch metal purities filtered by selected metal type
  const { data: metalPurities, isLoading: metalPuritiesLoading } = useMetalPurities({
    metalTypeId: selectedMetalTypeId || undefined,
    enabled: !!selectedMetalTypeId,
  });

  // Currency from shop settings
  const currency = shop?.currency || 'USD';

  // Loading state
  const isLoading = metalTypesLoading;

  // Form submitting state
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Reset form when modal opens or initial data changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue({
          id_metal_type: initialData.id_metal_type,
          id_metal_purity: initialData.id_metal_purity || undefined,
          price_date: dayjs(initialData.price_date),
          price_per_gram: initialData.price_per_gram,
          buy_price_per_gram: initialData.buy_price_per_gram || undefined,
          sell_price_per_gram: initialData.sell_price_per_gram || undefined,
          source: initialData.source || undefined,
          notes: initialData.notes || undefined,
        });
      } else {
        form.resetFields();
        // Set default date to today
        form.setFieldValue('price_date', dayjs());
      }
    }
  }, [open, initialData, form]);

  // Reset purity when metal type changes (only if not from initial data)
  useEffect(() => {
    if (selectedMetalTypeId && !initialData) {
      form.setFieldValue('id_metal_purity', undefined);
    }
  }, [selectedMetalTypeId, form, initialData]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      // Prepare data for submission
      const submitData = {
        id_metal_type: values.id_metal_type,
        id_metal_purity: values.id_metal_purity || null,
        price_date: values.price_date.format('YYYY-MM-DD'),
        price_per_gram: values.price_per_gram,
        buy_price_per_gram: values.buy_price_per_gram || null,
        sell_price_per_gram: values.sell_price_per_gram || null,
        source: values.source || null,
        notes: values.notes || null,
      };

      // For now, just log to console since we're using mock data
      console.log('[MetalPriceForm] Submit:', {
        mode: isEdit ? 'edit' : 'create',
        id: initialData?.id_price,
        data: submitData,
      });

      // Show success message
      message.success(isEdit ? t('updateSuccess') : t('createSuccess'));

      // Call success callback
      onSuccess?.();

      // Close modal
      handleClose();
    } catch (error) {
      // Form validation errors are handled by Ant Design Form
      if (error instanceof Error) {
        console.error('[MetalPriceForm] Submit error:', error);
        message.error(t('submitError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [form, isEdit, initialData, t, onSuccess]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    form.resetFields();
    onClose();
  }, [form, onClose]);

  /**
   * Disable future dates
   */
  const disabledDate = useCallback((current: Dayjs) => {
    return current && current.isAfter(dayjs(), 'day');
  }, []);

  // ==========================================================================
  // MEMOS
  // ==========================================================================

  /**
   * Metal type options
   */
  const metalTypeOptions = useMemo(() => {
    return (
      metalTypes?.map((type) => ({
        value: type.id_metal_type,
        label: type.metal_name,
      })) || []
    );
  }, [metalTypes]);

  /**
   * Metal purity options
   */
  const metalPurityOptions = useMemo(() => {
    return (
      metalPurities?.map((purity) => ({
        value: purity.id_purity,
        label: `${purity.purity_name} (${purity.purity_percentage}%)`,
      })) || []
    );
  }, [metalPurities]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Modal
      open={open}
      title={
        <div className="flex items-center gap-2">
          <GoldOutlined className="text-amber-500" />
          <span>{isEdit ? t('editTitle') : t('addTitle')}</span>
        </div>
      }
      onCancel={handleClose}
      width={560}
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
            permission="catalog.manage"
          >
            {isEdit ? tCommon('actions.save') : tCommon('actions.add')}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spin size="large" />
        </div>
      ) : (
        <Form form={form} layout="vertical" requiredMark="optional" className="mt-4">
          {/* Metal Type & Purity Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Metal Type */}
            <Form.Item
              name="id_metal_type"
              label={t('metalType')}
              rules={[{ required: true, message: tCommon('validation.required') }]}
            >
              <Select
                placeholder={t('selectMetalType')}
                options={metalTypeOptions}
                loading={metalTypesLoading}
                showSearch
                optionFilterProp="label"
                className="w-full"
              />
            </Form.Item>

            {/* Purity */}
            <Form.Item
              name="id_metal_purity"
              label={t('purity')}
              rules={[{ required: true, message: tCommon('validation.required') }]}
            >
              <Select
                placeholder={t('selectPurity')}
                options={metalPurityOptions}
                loading={metalPuritiesLoading}
                disabled={!selectedMetalTypeId}
                showSearch
                optionFilterProp="label"
                allowClear
                className="w-full"
              />
            </Form.Item>
          </div>

          {/* Helper text when no metal type is selected */}
          {!selectedMetalTypeId && (
            <div className="bg-stone-50 rounded-lg p-3 mb-4 -mt-2">
              <Text type="secondary" className="text-sm">
                {t('selectMetalTypeFirst')}
              </Text>
            </div>
          )}

          {/* Price Date */}
          <Form.Item
            name="price_date"
            label={t('priceDate')}
            rules={[{ required: true, message: tCommon('validation.required') }]}
          >
            <DatePicker
              className="w-full"
              format="YYYY-MM-DD"
              disabledDate={disabledDate}
              placeholder={t('selectDate')}
              suffixIcon={<CalendarOutlined className="text-stone-400" />}
            />
          </Form.Item>

          {/* Price Per Gram (Main Price) */}
          <Form.Item
            name="price_per_gram"
            label={t('pricePerGram')}
            rules={[
              { required: true, message: tCommon('validation.required') },
              {
                type: 'number',
                min: 0.01,
                message: t('priceMustBePositive'),
              },
            ]}
          >
            <InputNumber
              className="!w-full"
              placeholder={t('enterPrice')}
              min={0.01}
              step={0.01}
              precision={2}
              formatter={(value) =>
                value ? `${currency} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
              }
              parser={(value) =>
                Number(
                  value?.replace(new RegExp(`${currency}\\s?|,`, 'g'), '') || 0
                ) as unknown as 0.01
              }
              prefix={<DollarOutlined className="text-stone-400" />}
            />
          </Form.Item>

          {/* Buy & Sell Prices Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Buy Price */}
            <Form.Item
              name="buy_price_per_gram"
              label={t('buyPrice')}
              rules={[
                {
                  type: 'number',
                  min: 0.01,
                  message: t('priceMustBePositive'),
                },
              ]}
            >
              <InputNumber
                className="!w-full"
                placeholder={t('optional')}
                min={0.01}
                step={0.01}
                precision={2}
                formatter={(value) =>
                  value ? `${currency} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
                }
                parser={(value) =>
                  Number(
                    value?.replace(new RegExp(`${currency}\\s?|,`, 'g'), '') || 0
                  ) as unknown as 0.01
                }
              />
            </Form.Item>

            {/* Sell Price */}
            <Form.Item
              name="sell_price_per_gram"
              label={t('sellPrice')}
              rules={[
                {
                  type: 'number',
                  min: 0.01,
                  message: t('priceMustBePositive'),
                },
              ]}
            >
              <InputNumber
                className="!w-full"
                placeholder={t('optional')}
                min={0.01}
                step={0.01}
                precision={2}
                formatter={(value) =>
                  value ? `${currency} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
                }
                parser={(value) =>
                  Number(
                    value?.replace(new RegExp(`${currency}\\s?|,`, 'g'), '') || 0
                  ) as unknown as 0.01
                }
              />
            </Form.Item>
          </div>

          {/* Source */}
          <Form.Item name="source" label={t('source')}>
            <Input
              placeholder={t('sourcePlaceholder')}
              maxLength={100}
              prefix={<FileTextOutlined className="text-stone-400" />}
            />
          </Form.Item>

          {/* Notes */}
          <Form.Item name="notes" label={tCommon('labels.notes')}>
            <TextArea rows={3} placeholder={t('notesPlaceholder')} maxLength={500} showCount />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}

export default MetalPriceForm;
