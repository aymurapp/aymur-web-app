'use client';

/**
 * ItemForm Component
 *
 * A comprehensive form for creating and editing inventory items.
 * Features multi-section layout with:
 * - Basic Info (name, description, SKU, barcode)
 * - Classification (category, item type, ownership type)
 * - Metal Details (metal type, purity, gold color)
 * - Weight (gross, net, stone weight)
 * - Pricing (purchase price, making charge, selling price)
 * - Source (source type, supplier reference)
 * - Images (upload section placeholder)
 *
 * @module components/domain/inventory/ItemForm
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import {
  SaveOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  TagOutlined,
  ExperimentOutlined,
  DollarOutlined,
  ShopOutlined,
  PictureOutlined,
  ColumnWidthOutlined,
} from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Radio,
  Divider,
  Card,
  Row,
  Col,
  Typography,
  Alert,
  Upload,
  Space,
} from 'antd';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { type z } from 'zod';

import { Button } from '@/components/ui/Button';
import {
  useCategories,
  useMetalTypes,
  useMetalPurities,
  useStoneTypes,
  useSizes,
} from '@/lib/hooks/data';
import { useShop } from '@/lib/hooks/shop';
import { cn } from '@/lib/utils/cn';
import {
  inventoryItemSimpleSchema,
  type GoldColor,
  type ItemType,
  type OwnershipType,
} from '@/lib/utils/schemas';

import type { UploadProps } from 'antd';

const { Text, Title } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Inventory item data for editing (from database)
 */
export interface InventoryItemData {
  id_item: string;
  item_name: string;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  item_type: ItemType;
  ownership_type: OwnershipType;
  id_category?: string | null;
  id_metal_type?: string | null;
  id_metal_purity?: string | null;
  id_stone_type?: string | null;
  id_size?: string | null;
  gold_color?: GoldColor | null;
  weight_grams: number;
  stone_weight_carats?: number | null;
  purchase_price: number;
  currency: string;
}

/**
 * Form values structure - inferred from the schema
 */
export type ItemFormValues = z.infer<typeof inventoryItemSimpleSchema>;

/**
 * Props for the ItemForm component
 */
export interface ItemFormProps {
  /**
   * Existing item data for edit mode
   */
  initialData?: InventoryItemData;

  /**
   * Callback when form is submitted successfully
   */
  onSubmit: (data: ItemFormValues) => Promise<void>;

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;

  /**
   * Whether the form is currently submitting
   */
  isSubmitting?: boolean;

  /**
   * Form mode - 'create' or 'edit'
   */
  mode?: 'create' | 'edit';

  /**
   * Additional class name
   */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Item type options
 */
const ITEM_TYPE_OPTIONS: { value: ItemType; labelKey: string }[] = [
  { value: 'finished', labelKey: 'finishedProduct' },
  { value: 'raw_material', labelKey: 'rawMaterial' },
  { value: 'component', labelKey: 'component' },
];

/**
 * Ownership type options
 */
const OWNERSHIP_TYPE_OPTIONS: { value: OwnershipType; labelKey: string }[] = [
  { value: 'owned', labelKey: 'owned' },
  { value: 'consignment', labelKey: 'consignment' },
  { value: 'memo', labelKey: 'memo' },
];

/**
 * Gold color options
 */
const GOLD_COLOR_OPTIONS: { value: GoldColor; labelKey: string }[] = [
  { value: 'yellow', labelKey: 'yellow' },
  { value: 'white', labelKey: 'white' },
  { value: 'rose', labelKey: 'rose' },
];

/**
 * Default form values
 * Note: currency is set dynamically from shop
 */
const DEFAULT_VALUES: Partial<ItemFormValues> = {
  item_name: '',
  description: '',
  sku: '',
  barcode: '',
  item_type: 'finished',
  ownership_type: 'owned',
  weight_grams: 0,
  purchase_price: 0,
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Section header with icon
 */
interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
}

function SectionHeader({ icon, title }: SectionHeaderProps): JSX.Element {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-amber-600">{icon}</span>
      <Title level={5} className="!mb-0 !text-base font-semibold">
        {title}
      </Title>
    </div>
  );
}

/**
 * Form section card wrapper
 */
interface FormSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}

function FormSection({ icon, title, children, className }: FormSectionProps): JSX.Element {
  return (
    <Card
      className={cn('border border-stone-200 shadow-sm', className)}
      bodyStyle={{ padding: '1rem' }}
    >
      <SectionHeader icon={icon} title={title} />
      {children}
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ItemForm Component
 *
 * A comprehensive multi-section form for creating and editing inventory items.
 * Uses react-hook-form with Zod validation and Ant Design components.
 */
export function ItemForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode = 'create',
  className,
}: ItemFormProps): JSX.Element {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');
  const { shop } = useShop();

  // ==========================================================================
  // FORM SETUP
  // ==========================================================================

  // Convert initial data to form values
  const defaultValues = useMemo<Partial<ItemFormValues>>(() => {
    if (!initialData) {
      return {
        ...DEFAULT_VALUES,
        currency: shop?.currency,
      };
    }

    return {
      item_name: initialData.item_name,
      description: initialData.description ?? '',
      sku: initialData.sku ?? '',
      barcode: initialData.barcode ?? '',
      item_type: initialData.item_type,
      ownership_type: initialData.ownership_type,
      id_category: initialData.id_category ?? undefined,
      id_metal_type: initialData.id_metal_type ?? undefined,
      id_metal_purity: initialData.id_metal_purity ?? undefined,
      id_stone_type: initialData.id_stone_type ?? undefined,
      id_size: initialData.id_size ?? undefined,
      gold_color: initialData.gold_color ?? undefined,
      weight_grams: initialData.weight_grams,
      stone_weight_carats: initialData.stone_weight_carats ?? undefined,
      purchase_price: initialData.purchase_price,
      currency: initialData.currency,
    };
  }, [initialData, shop?.currency]);

  // Initialize react-hook-form
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
    reset,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<ItemFormValues, any>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(inventoryItemSimpleSchema) as any,
    defaultValues,
    mode: 'onBlur',
  });

  // Watch for dependent field changes
  const watchedMetalType = watch('id_metal_type');
  const watchedCategory = watch('id_category');

  // Reset form when initial data changes
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  // Catalog data for dropdowns
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: metalTypes = [], isLoading: metalTypesLoading } = useMetalTypes();
  const { data: metalPurities = [], isLoading: puritiesLoading } = useMetalPurities({
    metalTypeId: watchedMetalType ?? undefined,
    enabled: !!watchedMetalType,
  });
  const { data: stoneTypes = [], isLoading: stonesLoading } = useStoneTypes();
  const { data: sizes = [], isLoading: sizesLoading } = useSizes({
    categoryId: watchedCategory ?? undefined,
    enabled: !!watchedCategory,
  });

  // Clear purity when metal type changes
  useEffect(() => {
    if (watchedMetalType !== initialData?.id_metal_type) {
      setValue('id_metal_purity', undefined);
    }
  }, [watchedMetalType, initialData?.id_metal_type, setValue]);

  // Clear size when category changes
  useEffect(() => {
    if (watchedCategory !== initialData?.id_category) {
      setValue('id_size', undefined);
    }
  }, [watchedCategory, initialData?.id_category, setValue]);

  // ==========================================================================
  // DROPDOWN OPTIONS
  // ==========================================================================

  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        label: cat.category_name,
        value: cat.id_category,
      })),
    [categories]
  );

  const metalTypeOptions = useMemo(
    () =>
      metalTypes.map((mt) => ({
        label: mt.metal_name,
        value: mt.id_metal_type,
      })),
    [metalTypes]
  );

  const metalPurityOptions = useMemo(
    () =>
      metalPurities.map((mp) => ({
        label: `${mp.purity_name} (${mp.purity_percentage}%)`,
        value: mp.id_purity,
      })),
    [metalPurities]
  );

  const stoneTypeOptions = useMemo(
    () =>
      stoneTypes.map((st) => ({
        label: st.stone_name,
        value: st.id_stone_type,
      })),
    [stoneTypes]
  );

  const sizeOptions = useMemo(
    () =>
      sizes.map((s) => ({
        label: s.size_name + (s.size_value ? ` (${s.size_value})` : ''),
        value: s.id_size,
      })),
    [sizes]
  );

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleFormSubmit = useCallback(
    async (data: ItemFormValues) => {
      await onSubmit(data);
    },
    [onSubmit]
  );

  // ==========================================================================
  // UPLOAD CONFIG (Placeholder)
  // ==========================================================================

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    listType: 'picture-card',
    beforeUpload: () => false, // Prevent auto upload
    maxCount: 5,
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Form
      layout="vertical"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onFinish={handleSubmit(handleFormSubmit as any)}
      className={cn('item-form', className)}
    >
      <div className="space-y-6">
        {/* Error Summary */}
        {Object.keys(errors).length > 0 && (
          <Alert
            type="error"
            message={tCommon('validation.formHasErrors')}
            description={
              <ul className="list-disc list-inside mt-2">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field} className="text-sm">
                    {error?.message as string}
                  </li>
                ))}
              </ul>
            }
            showIcon
            className="mb-4"
          />
        )}

        {/* Basic Information Section */}
        <FormSection icon={<InfoCircleOutlined />} title={t('itemDetails')}>
          <Row gutter={[16, 0]}>
            <Col xs={24}>
              <Form.Item
                label={t('productName')}
                required
                validateStatus={errors.item_name ? 'error' : undefined}
                help={errors.item_name?.message}
              >
                <Controller
                  name="item_name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder={t('productName')}
                      size="large"
                      maxLength={255}
                      showCount
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                label={tCommon('labels.description')}
                validateStatus={errors.description ? 'error' : undefined}
                help={errors.description?.message}
              >
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextArea
                      {...field}
                      value={field.value ?? ''}
                      placeholder={tCommon('labels.description')}
                      rows={3}
                      maxLength={1000}
                      showCount
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={t('sku')}
                validateStatus={errors.sku ? 'error' : undefined}
                help={errors.sku?.message}
              >
                <Controller
                  name="sku"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder={mode === 'edit' ? '' : t('sku')}
                      maxLength={100}
                      disabled={mode === 'edit'}
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={t('barcode')}
                validateStatus={errors.barcode ? 'error' : undefined}
                help={errors.barcode?.message}
              >
                <Controller
                  name="barcode"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder={mode === 'edit' ? '' : t('barcode')}
                      maxLength={100}
                      disabled={mode === 'edit'}
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
        </FormSection>

        {/* Classification Section */}
        <FormSection icon={<TagOutlined />} title={t('categories.title')}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={t('category')}
                validateStatus={errors.id_category ? 'error' : undefined}
                help={errors.id_category?.message}
              >
                <Controller
                  name="id_category"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      placeholder={tCommon('select.placeholder')}
                      options={categoryOptions}
                      loading={categoriesLoading}
                      allowClear
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                      className="w-full"
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={tCommon('labels.type')}
                required
                validateStatus={errors.item_type ? 'error' : undefined}
                help={errors.item_type?.message}
              >
                <Controller
                  name="item_type"
                  control={control}
                  render={({ field }) => (
                    <Radio.Group {...field} className="w-full">
                      <Space direction="horizontal" wrap>
                        {ITEM_TYPE_OPTIONS.map((opt) => (
                          <Radio key={opt.value} value={opt.value}>
                            {opt.labelKey === 'finishedProduct' && 'Finished'}
                            {opt.labelKey === 'rawMaterial' && 'Raw Material'}
                            {opt.labelKey === 'component' && 'Component'}
                          </Radio>
                        ))}
                      </Space>
                    </Radio.Group>
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={t('consignment')}
                required
                validateStatus={errors.ownership_type ? 'error' : undefined}
                help={errors.ownership_type?.message}
              >
                <Controller
                  name="ownership_type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={OWNERSHIP_TYPE_OPTIONS.map((opt) => ({
                        value: opt.value,
                        label:
                          opt.labelKey === 'owned'
                            ? 'Owned'
                            : opt.labelKey === 'consignment'
                              ? 'Consignment'
                              : 'Memo',
                      }))}
                      className="w-full"
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={t('stockMovement.fromLocation')}
                validateStatus={errors.id_size ? 'error' : undefined}
                help={errors.id_size?.message}
              >
                <Controller
                  name="id_size"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      placeholder={tCommon('select.placeholder')}
                      options={sizeOptions}
                      loading={sizesLoading}
                      allowClear
                      showSearch
                      disabled={!watchedCategory}
                      filterOption={(input, option) =>
                        (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                      className="w-full"
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
        </FormSection>

        {/* Metal Details Section */}
        <FormSection icon={<ExperimentOutlined />} title={t('metals.title')}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label={t('metals.title')}
                validateStatus={errors.id_metal_type ? 'error' : undefined}
                help={errors.id_metal_type?.message}
              >
                <Controller
                  name="id_metal_type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      placeholder={tCommon('select.placeholder')}
                      options={metalTypeOptions}
                      loading={metalTypesLoading}
                      allowClear
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                      className="w-full"
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label={t('metals.purity')}
                validateStatus={errors.id_metal_purity ? 'error' : undefined}
                help={errors.id_metal_purity?.message}
              >
                <Controller
                  name="id_metal_purity"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      placeholder={tCommon('select.placeholder')}
                      options={metalPurityOptions}
                      loading={puritiesLoading}
                      allowClear
                      showSearch
                      disabled={!watchedMetalType}
                      filterOption={(input, option) =>
                        (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                      className="w-full"
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label={t('stones.color')}
                validateStatus={errors.gold_color ? 'error' : undefined}
                help={errors.gold_color?.message}
              >
                <Controller
                  name="gold_color"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      placeholder={tCommon('select.placeholder')}
                      options={GOLD_COLOR_OPTIONS.map((opt) => ({
                        value: opt.value,
                        label:
                          opt.labelKey === 'yellow'
                            ? 'Yellow Gold'
                            : opt.labelKey === 'white'
                              ? 'White Gold'
                              : 'Rose Gold',
                      }))}
                      allowClear
                      className="w-full"
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={t('stones.type')}
                validateStatus={errors.id_stone_type ? 'error' : undefined}
                help={errors.id_stone_type?.message}
              >
                <Controller
                  name="id_stone_type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      placeholder={tCommon('select.placeholder')}
                      options={stoneTypeOptions}
                      loading={stonesLoading}
                      allowClear
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                      className="w-full"
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
        </FormSection>

        {/* Weight Section */}
        <FormSection icon={<ColumnWidthOutlined />} title={t('metals.weight')}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={8}>
              <Form.Item
                label={t('metals.grossWeight')}
                required
                validateStatus={errors.weight_grams ? 'error' : undefined}
                help={errors.weight_grams?.message}
              >
                <Controller
                  name="weight_grams"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      placeholder="0.00"
                      min={0}
                      max={9999999.999}
                      step={0.001}
                      precision={3}
                      addonAfter={t('metals.grams').toLowerCase()}
                      className="w-full"
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                label={t('metals.stoneWeight')}
                validateStatus={errors.stone_weight_carats ? 'error' : undefined}
                help={errors.stone_weight_carats?.message}
              >
                <Controller
                  name="stone_weight_carats"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      value={field.value ?? undefined}
                      placeholder="0.00"
                      min={0}
                      max={9999999.999}
                      step={0.01}
                      precision={3}
                      addonAfter={t('stones.carat').toLowerCase()}
                      className="w-full"
                    />
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item label={t('metals.netWeight')}>
                <InputNumber
                  value={(watch('weight_grams') || 0) - (watch('stone_weight_carats') || 0) * 0.2}
                  disabled
                  precision={3}
                  addonAfter={t('metals.grams').toLowerCase()}
                  className="w-full"
                />
                <Text type="secondary" className="text-xs mt-1 block">
                  {t('metals.grossWeight')} - ({t('metals.stoneWeight')} x 0.2)
                </Text>
              </Form.Item>
            </Col>
          </Row>
        </FormSection>

        {/* Pricing Section */}
        <FormSection icon={<DollarOutlined />} title={t('pricing.title')}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={t('pricing.costPrice')}
                required={mode === 'create'}
                validateStatus={errors.purchase_price ? 'error' : undefined}
                help={errors.purchase_price?.message}
              >
                <Controller
                  name="purchase_price"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      placeholder="0.00"
                      min={0}
                      precision={2}
                      className="w-full"
                      disabled={mode === 'edit'}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as unknown as number}
                    />
                  )}
                />
              </Form.Item>
            </Col>

            {/* Currency field - hidden, uses shop default */}
            <Controller name="currency" control={control} render={() => <input type="hidden" />} />
          </Row>
        </FormSection>

        {/* Source Section */}
        <FormSection icon={<ShopOutlined />} title={t('stockMovement.title')}>
          <Row gutter={[16, 0]}>
            <Col xs={24}>
              <Form.Item label={t('stockMovement.title')}>
                <Radio.Group
                  value={watch('ownership_type') === 'consignment' ? 'consignment' : 'purchase'}
                  disabled
                >
                  <Radio value="purchase">{t('stockMovement.receive')}</Radio>
                  <Radio value="consignment">{t('consignment')}</Radio>
                </Radio.Group>
                <Text type="secondary" className="text-xs mt-2 block">
                  Source type is determined by ownership type
                </Text>
              </Form.Item>
            </Col>
          </Row>
        </FormSection>

        {/* Images Section (Placeholder) */}
        <FormSection icon={<PictureOutlined />} title="Images">
          <Upload {...uploadProps}>
            <div className="flex flex-col items-center justify-center p-4">
              <PictureOutlined className="text-2xl text-stone-400 mb-2" />
              <Text type="secondary" className="text-sm">
                {tCommon('actions.upload')}
              </Text>
            </div>
          </Upload>
          <Text type="secondary" className="text-xs mt-2 block">
            Upload up to 5 images. Max file size: 5MB each.
          </Text>
        </FormSection>

        <Divider />

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-white py-4 border-t border-stone-200 -mx-4 px-4">
          {onCancel && (
            <Button
              type="default"
              icon={<CloseOutlined />}
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {tCommon('actions.cancel')}
            </Button>
          )}
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={isSubmitting}
            disabled={!isDirty && mode === 'edit'}
          >
            {mode === 'create' ? tCommon('actions.create') : tCommon('actions.save')}
          </Button>
        </div>
      </div>
    </Form>
  );
}

/**
 * Loading skeleton for ItemForm
 */
export function ItemFormSkeleton(): JSX.Element {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="border border-stone-200">
          <div className="h-8 bg-stone-200 rounded w-1/4 mb-4" />
          <div className="space-y-4">
            <div className="h-10 bg-stone-200 rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-stone-200 rounded" />
              <div className="h-10 bg-stone-200 rounded" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default ItemForm;
