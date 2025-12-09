'use client';

/**
 * WorkshopOrderForm Component
 *
 * A drawer form for creating workshop orders.
 * Features:
 * - Workshop selection dropdown
 * - Customer selection
 * - Item source selection (customer, inventory, supplied)
 * - Inventory item selection (when source is inventory)
 * - Order type selector (repair, custom, resize, polish, engrave, other)
 * - Item description and labor cost
 * - Description and notes
 * - Due date picker
 * - Estimated cost input
 * - Zod validation with react-hook-form
 * - RTL support with logical properties
 *
 * @module components/domain/workshops/WorkshopOrderForm
 */

import React, { useCallback, useTransition, useMemo, useState } from 'react';

import {
  ShopOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  TagOutlined,
  UserOutlined,
  InboxOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import {
  Drawer,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Divider,
  Typography,
  Tag,
  Alert,
  Radio,
  Spin,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { z } from 'zod';

import { CustomerSelect } from '@/components/domain/customers/CustomerSelect';
import { Button } from '@/components/ui/Button';
import { Form } from '@/components/ui/Form';
import { useInventoryItems } from '@/lib/hooks/data/useInventoryItems';
import { useWorkshops, useCreateWorkshopOrder } from '@/lib/hooks/data/useWorkshops';
import { useShop } from '@/lib/hooks/shop';
import { useDebounce } from '@/lib/hooks/utils/useDebounce';
import { itemSourceEnum } from '@/lib/utils/schemas/workshop';

import type { Dayjs } from 'dayjs';
import type { ZodType } from 'zod';

// Create a custom form schema for the order creation form
// Includes all required fields for workshop_orders table
const orderFormSchema = z.object({
  id_workshop: z.string().min(1, 'Workshop is required'),
  id_customer: z.string().optional().nullable(),
  item_source: itemSourceEnum,
  id_inventory_item: z.string().optional().nullable(),
  item_description: z.string().max(1000).optional().nullable(),
  order_type: z.enum(['repair', 'custom', 'resize', 'polish', 'engrave', 'other']),
  description: z.string().max(2000).optional().nullable(),
  estimated_completion_date: z.string().optional().nullable(),
  estimated_cost: z.number().min(0).optional().nullable(),
  labor_cost: z.number().min(0).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

// Infer the form data type from the schema
type OrderFormData = z.infer<typeof orderFormSchema>;

// Item source type
type ItemSource = 'customer' | 'inventory' | 'supplied';

const { Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface WorkshopOrderFormProps {
  /**
   * Whether the modal is open
   */
  open: boolean;

  /**
   * Pre-selected workshop ID (optional)
   */
  workshopId?: string;

  /**
   * Callback when order is successfully created
   */
  onSuccess?: () => void;

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Order type options with icons
const ORDER_TYPE_OPTIONS = [
  { value: 'repair', label: 'Repair', emoji: 'tools' },
  { value: 'custom', label: 'Custom Order', emoji: 'sparkles' },
  { value: 'resize', label: 'Resize', emoji: 'resize' },
  { value: 'polish', label: 'Polish', emoji: 'sparkle' },
  { value: 'engrave', label: 'Engraving', emoji: 'engrave' },
  { value: 'rhodium', label: 'Rhodium Plating', emoji: 'rhodium' },
  { value: 'stone', label: 'Stone Setting', emoji: 'stone' },
  { value: 'other', label: 'Other', emoji: 'other' },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * WorkshopOrderForm Component
 *
 * Provides a drawer form for creating workshop orders
 * with support for all order fields and validation.
 */
export function WorkshopOrderForm({
  open,
  workshopId: initialWorkshopId,
  onSuccess,
  onCancel,
}: WorkshopOrderFormProps): React.JSX.Element {
  const t = useTranslations('workshops');
  const tCommon = useTranslations('common');
  const { shop } = useShop();
  const [isPending, startTransition] = useTransition();

  const currency = shop?.currency || 'USD';

  // Fetch workshops for dropdown
  const { workshops, isLoading: isLoadingWorkshops } = useWorkshops({
    pageSize: 100,
    status: 'active',
  });

  // Create mutation
  const createOrder = useCreateWorkshopOrder();

  // Check if form is currently submitting
  const isSubmitting = isPending || createOrder.isPending;

  // Build workshop options
  const workshopOptions = useMemo(() => {
    return workshops.map((w) => ({
      value: w.id_workshop,
      label: (
        <div className="flex items-center gap-2">
          <Tag color={w.is_internal ? 'gold' : 'blue'} className="me-0">
            {w.is_internal ? t('internal') : t('external')}
          </Tag>
          <span>{w.workshop_name}</span>
        </div>
      ),
      searchLabel: w.workshop_name,
      workshop: w,
    }));
  }, [workshops, t]);

  // State for tracking item source (to show/hide inventory selector)
  const [itemSource, setItemSource] = useState<ItemSource>('customer');

  // State for inventory item search
  const [inventorySearch, setInventorySearch] = useState('');
  const debouncedInventorySearch = useDebounce(inventorySearch, 300);

  // Fetch inventory items when item_source is 'inventory'
  const { items: inventoryItems, isLoading: isLoadingInventory } = useInventoryItems({
    search: debouncedInventorySearch || undefined,
    status: ['available'],
    page: 1,
    page_size: 50,
    enabled: itemSource === 'inventory',
  });

  // Build inventory item options
  const inventoryOptions = useMemo(() => {
    return inventoryItems.map((item) => ({
      value: item.id_item,
      label: (
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.item_name}</span>
          {item.sku && <span className="text-stone-400 text-xs font-mono">({item.sku})</span>}
        </div>
      ),
      searchLabel: `${item.item_name} ${item.sku || ''} ${item.barcode || ''}`,
    }));
  }, [inventoryItems]);

  // Default values for the form
  const defaultValues = useMemo<Partial<OrderFormData>>(
    () => ({
      id_workshop: initialWorkshopId || '',
      id_customer: null,
      item_source: 'customer',
      id_inventory_item: null,
      item_description: '',
      order_type: 'repair',
      description: '',
      notes: null,
      estimated_completion_date: null,
      estimated_cost: null,
      labor_cost: null,
    }),
    [initialWorkshopId]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: OrderFormData) => {
      startTransition(async () => {
        try {
          // Note: order_number is generated server-side
          const receivedDate = new Date().toISOString().split('T')[0] ?? '';
          await createOrder.mutateAsync({
            id_workshop: data.id_workshop,
            order_type: data.order_type,
            order_number: '', // Generated server-side
            received_date: receivedDate,
            estimated_completion_date: data.estimated_completion_date || null,
            completed_date: null,
            delivered_date: null,
            description: data.description || null,
            item_description: data.item_description || null,
            item_source: data.item_source,
            materials_used: null,
            labor_cost: data.labor_cost || null,
            estimated_cost: data.estimated_cost || null,
            actual_cost: null,
            payment_status: 'unpaid',
            status: 'pending',
            notes: data.notes || null,
            id_customer: data.id_customer || null,
            id_inventory_item:
              data.item_source === 'inventory' ? data.id_inventory_item || null : null,
          });
          message.success(t('orders.createSuccess'));
          onSuccess?.();
        } catch (error) {
          console.error('[WorkshopOrderForm] Submit error:', error);
          message.error(t('orders.createError'));
        }
      });
    },
    [createOrder, onSuccess, t]
  );

  return (
    <Drawer
      open={open}
      title={
        <div className="flex items-center gap-2">
          <FileTextOutlined className="text-amber-500" />
          <span>{t('orders.newOrder')}</span>
        </div>
      }
      onClose={onCancel}
      placement="right"
      width={700}
      destroyOnClose
      maskClosable={!isSubmitting}
      closable={!isSubmitting}
    >
      <Form<OrderFormData>
        schema={orderFormSchema as unknown as ZodType<OrderFormData>}
        onSubmit={handleSubmit}
        defaultValues={defaultValues}
        className="space-y-6 mt-4"
      >
        {/* Workshop Selection Section */}
        <div>
          <Title level={5} className="mb-4 text-stone-800">
            {t('workshop')}
          </Title>

          {/* Workshop Dropdown */}
          <Form.Item<OrderFormData> name="id_workshop" label={t('selectWorkshop')} required>
            {({ field }) => (
              <Select
                {...field}
                size="large"
                placeholder={t('selectWorkshop')}
                loading={isLoadingWorkshops}
                showSearch
                optionFilterProp="searchLabel"
                options={workshopOptions}
                className="w-full"
                suffixIcon={<ShopOutlined />}
              />
            )}
          </Form.Item>
        </div>

        <Divider className="my-6" />

        {/* Customer & Item Section */}
        <div>
          <Title level={5} className="mb-4 text-stone-800">
            {t('orders.customerAndItem')}
          </Title>

          {/* Customer Selector */}
          <Form.Item<OrderFormData> name="id_customer" label={t('orders.customer')}>
            {({ field }) => (
              <CustomerSelect
                value={typeof field.value === 'string' ? field.value : null}
                onChange={(customerId) => field.onChange(customerId)}
                placeholder={t('orders.selectCustomer')}
                allowClear
              />
            )}
          </Form.Item>

          {/* Item Source Radio Group */}
          <Form.Item<OrderFormData> name="item_source" label={t('orders.itemSource')} required>
            {({ field }) => (
              <Radio.Group
                {...field}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  setItemSource(e.target.value as ItemSource);
                }}
                className="flex flex-col gap-3"
              >
                <Radio value="customer" className="flex items-center">
                  <div className="flex items-center gap-2 ms-1">
                    <UserOutlined className="text-amber-500" />
                    <span>{t('orders.itemSourceCustomer')}</span>
                  </div>
                </Radio>
                <Radio value="inventory" className="flex items-center">
                  <div className="flex items-center gap-2 ms-1">
                    <InboxOutlined className="text-blue-500" />
                    <span>{t('orders.itemSourceInventory')}</span>
                  </div>
                </Radio>
                <Radio value="supplied" className="flex items-center">
                  <div className="flex items-center gap-2 ms-1">
                    <ToolOutlined className="text-green-500" />
                    <span>{t('orders.itemSourceSupplied')}</span>
                  </div>
                </Radio>
              </Radio.Group>
            )}
          </Form.Item>

          {/* Inventory Item Selector - Only shown when item_source is 'inventory' */}
          {itemSource === 'inventory' && (
            <Form.Item<OrderFormData> name="id_inventory_item" label={t('orders.selectItem')}>
              {({ field }) => (
                <Select
                  {...field}
                  size="large"
                  placeholder={t('orders.selectItemPlaceholder')}
                  loading={isLoadingInventory}
                  showSearch
                  filterOption={false}
                  onSearch={setInventorySearch}
                  options={inventoryOptions}
                  optionFilterProp="searchLabel"
                  className="w-full"
                  allowClear
                  suffixIcon={<InboxOutlined />}
                  notFoundContent={
                    isLoadingInventory ? (
                      <div className="py-2 text-center">
                        <Spin size="small" />
                      </div>
                    ) : (
                      <div className="py-2 text-center text-stone-400">
                        {t('orders.noItemsFound')}
                      </div>
                    )
                  }
                />
              )}
            </Form.Item>
          )}

          {/* Item Description */}
          <Form.Item<OrderFormData> name="item_description" label={t('orders.itemDescription')}>
            <Input.TextArea
              rows={2}
              placeholder={t('orders.itemDescriptionPlaceholder')}
              maxLength={1000}
              showCount
            />
          </Form.Item>
        </div>

        <Divider className="my-6" />

        {/* Order Details Section */}
        <div>
          <Title level={5} className="mb-4 text-stone-800">
            {t('orders.details')}
          </Title>

          {/* Order Type */}
          <Form.Item<OrderFormData> name="order_type" label={t('orders.type')} required>
            {({ field }) => (
              <Select
                {...field}
                size="large"
                placeholder={t('orders.selectType')}
                options={ORDER_TYPE_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: t(`orders.${opt.value}`),
                }))}
                className="w-full"
                suffixIcon={<TagOutlined />}
              />
            )}
          </Form.Item>

          {/* Description */}
          <Form.Item<OrderFormData> name="description" label={t('orders.description')}>
            <Input.TextArea
              rows={4}
              placeholder={t('orders.descriptionPlaceholder')}
              maxLength={2000}
              showCount
            />
          </Form.Item>
        </div>

        <Divider className="my-6" />

        {/* Schedule & Cost Section */}
        <div>
          <Title level={5} className="mb-4 text-stone-800">
            {t('orders.scheduleAndCost')}
          </Title>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estimated Completion Date */}
            <Form.Item<OrderFormData>
              name="estimated_completion_date"
              label={t('orders.estimatedDate')}
            >
              {({ field }) => (
                <DatePicker
                  size="large"
                  className="w-full"
                  placeholder={t('orders.selectDate')}
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(date: Dayjs | null) =>
                    field.onChange(date?.format('YYYY-MM-DD') || null)
                  }
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  suffixIcon={<CalendarOutlined />}
                  format="YYYY-MM-DD"
                />
              )}
            </Form.Item>

            {/* Labor Cost */}
            <Form.Item<OrderFormData> name="labor_cost" label={t('orders.laborCost')}>
              <InputNumber
                size="large"
                className="!w-full"
                placeholder={t('orders.enterLaborCost')}
                min={0}
                step={0.01}
                formatter={(value) => `${currency} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) =>
                  parseFloat(value?.replace(new RegExp(`${currency}\\s?|,`, 'g'), '') || '0') as 0
                }
                prefix={<ToolOutlined />}
              />
            </Form.Item>

            {/* Estimated Cost */}
            <Form.Item<OrderFormData> name="estimated_cost" label={t('orders.estimatedCost')}>
              <InputNumber
                size="large"
                className="!w-full"
                placeholder={t('orders.enterCost')}
                min={0}
                step={0.01}
                formatter={(value) => `${currency} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) =>
                  parseFloat(value?.replace(new RegExp(`${currency}\\s?|,`, 'g'), '') || '0') as 0
                }
                prefix={<DollarOutlined />}
              />
            </Form.Item>
          </div>

          <Alert type="info" showIcon message={t('orders.costNote')} className="mt-4" />
        </div>

        <Divider className="my-6" />

        {/* Notes Section */}
        <div>
          <Title level={5} className="mb-4 text-stone-800">
            {tCommon('labels.notes')}
          </Title>

          <Form.Item<OrderFormData> name="notes">
            <Input.TextArea
              rows={3}
              placeholder={t('orders.notesPlaceholder')}
              maxLength={5000}
              showCount
            />
          </Form.Item>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
          <Button size="large" onClick={onCancel} disabled={isSubmitting}>
            {tCommon('actions.cancel')}
          </Button>

          <Form.Submit>
            <Button type="primary" size="large" loading={isSubmitting} className="min-w-[160px]">
              {isSubmitting ? tCommon('messages.saving') : tCommon('actions.create')}
            </Button>
          </Form.Submit>
        </div>
      </Form>
    </Drawer>
  );
}

export default WorkshopOrderForm;
