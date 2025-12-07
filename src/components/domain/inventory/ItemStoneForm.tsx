'use client';

/**
 * ItemStoneForm Component
 *
 * Form for adding or editing a stone attached to an inventory item.
 * Includes fields for stone type, carat weight, quality grades,
 * cut type, setting type, quantity, and optional certificate info.
 *
 * @module components/domain/inventory/ItemStoneForm
 */

import React, { useCallback, useMemo, useEffect } from 'react';

import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, InputNumber, Select, Row, Col, Alert, Divider } from 'antd';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { useStoneTypes } from '@/lib/hooks/data/useStones';
import { cn } from '@/lib/utils/cn';
import {
  stoneWeightRequiredSchema,
  stonePositionSchema,
  stoneClaritySchema,
  stoneColorSchema,
  stoneCutSchema,
  estimatedValueSchema,
} from '@/lib/utils/schemas/inventory';
import { uuidSchema } from '@/lib/utils/validation';

import type { ItemStoneData } from './ItemStoneCard';

const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Form schema for stone data
 */
const itemStoneFormSchema = z.object({
  id_stone_type: uuidSchema.min(1, 'Stone type is required'),
  weight_carats: stoneWeightRequiredSchema,
  stone_count: z.number().int().positive(),
  position: stonePositionSchema,
  clarity: stoneClaritySchema,
  color: stoneColorSchema,
  cut: stoneCutSchema,
  estimated_value: estimatedValueSchema,
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * Form values type
 */
export type ItemStoneFormValues = z.infer<typeof itemStoneFormSchema>;

/**
 * Props for ItemStoneForm component
 */
export interface ItemStoneFormProps {
  /**
   * Initial stone data for edit mode
   */
  initialData?: Partial<ItemStoneData>;

  /**
   * Callback when form is submitted successfully
   */
  onSubmit: (data: ItemStoneFormValues) => Promise<void>;

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;

  /**
   * Whether the form is currently submitting
   */
  isSubmitting?: boolean;

  /**
   * Form mode
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
 * Common diamond clarity grades
 */
const CLARITY_OPTIONS = [
  { value: 'FL', label: 'FL (Flawless)' },
  { value: 'IF', label: 'IF (Internally Flawless)' },
  { value: 'VVS1', label: 'VVS1 (Very Very Slightly Included 1)' },
  { value: 'VVS2', label: 'VVS2 (Very Very Slightly Included 2)' },
  { value: 'VS1', label: 'VS1 (Very Slightly Included 1)' },
  { value: 'VS2', label: 'VS2 (Very Slightly Included 2)' },
  { value: 'SI1', label: 'SI1 (Slightly Included 1)' },
  { value: 'SI2', label: 'SI2 (Slightly Included 2)' },
  { value: 'I1', label: 'I1 (Included 1)' },
  { value: 'I2', label: 'I2 (Included 2)' },
  { value: 'I3', label: 'I3 (Included 3)' },
];

/**
 * Common diamond color grades (D-Z scale)
 */
const COLOR_OPTIONS = [
  { value: 'D', label: 'D (Colorless)' },
  { value: 'E', label: 'E (Colorless)' },
  { value: 'F', label: 'F (Colorless)' },
  { value: 'G', label: 'G (Near Colorless)' },
  { value: 'H', label: 'H (Near Colorless)' },
  { value: 'I', label: 'I (Near Colorless)' },
  { value: 'J', label: 'J (Near Colorless)' },
  { value: 'K', label: 'K (Faint Yellow)' },
  { value: 'L', label: 'L (Faint Yellow)' },
  { value: 'M', label: 'M (Faint Yellow)' },
  { value: 'N-Z', label: 'N-Z (Light Yellow)' },
  // Colored stone options
  { value: 'Fancy', label: 'Fancy Color' },
  { value: 'Blue', label: 'Blue' },
  { value: 'Red', label: 'Red' },
  { value: 'Green', label: 'Green' },
  { value: 'Pink', label: 'Pink' },
  { value: 'Yellow', label: 'Yellow' },
  { value: 'Orange', label: 'Orange' },
  { value: 'Purple', label: 'Purple' },
  { value: 'White', label: 'White' },
  { value: 'Black', label: 'Black' },
];

/**
 * Common cut types
 */
const CUT_OPTIONS = [
  { value: 'Round', label: 'Round Brilliant' },
  { value: 'Princess', label: 'Princess' },
  { value: 'Cushion', label: 'Cushion' },
  { value: 'Oval', label: 'Oval' },
  { value: 'Marquise', label: 'Marquise' },
  { value: 'Pear', label: 'Pear' },
  { value: 'Emerald', label: 'Emerald' },
  { value: 'Asscher', label: 'Asscher' },
  { value: 'Radiant', label: 'Radiant' },
  { value: 'Heart', label: 'Heart' },
  { value: 'Trillion', label: 'Trillion' },
  { value: 'Baguette', label: 'Baguette' },
  { value: 'Cabochon', label: 'Cabochon' },
];

/**
 * Common setting/position types
 */
const POSITION_OPTIONS = [
  { value: 'Center', label: 'Center Stone' },
  { value: 'Side', label: 'Side Stone' },
  { value: 'Accent', label: 'Accent Stone' },
  { value: 'Halo', label: 'Halo Setting' },
  { value: 'Pave', label: 'Pave Setting' },
  { value: 'Channel', label: 'Channel Setting' },
  { value: 'Bezel', label: 'Bezel Setting' },
  { value: 'Prong', label: 'Prong Setting' },
  { value: 'Tension', label: 'Tension Setting' },
  { value: 'Flush', label: 'Flush/Gypsy Setting' },
];

/**
 * Default form values
 */
const DEFAULT_VALUES: Partial<ItemStoneFormValues> = {
  id_stone_type: '',
  weight_carats: 0,
  stone_count: 1,
  position: null,
  clarity: null,
  color: null,
  cut: null,
  estimated_value: null,
  notes: null,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ItemStoneForm Component
 *
 * Form for creating or editing stones attached to inventory items.
 * Uses react-hook-form with Zod validation and Ant Design components.
 */
export function ItemStoneForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode = 'create',
  className,
}: ItemStoneFormProps): JSX.Element {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { data: stoneTypes = [], isLoading: stoneTypesLoading } = useStoneTypes();

  // ==========================================================================
  // FORM SETUP
  // ==========================================================================

  const defaultValues = useMemo<Partial<ItemStoneFormValues>>(() => {
    if (!initialData) {
      return DEFAULT_VALUES;
    }

    return {
      id_stone_type: initialData.id_stone_type || '',
      weight_carats: initialData.weight_carats || 0,
      stone_count: initialData.stone_count || 1,
      position: initialData.position || null,
      clarity: initialData.clarity || null,
      color: initialData.color || null,
      cut: initialData.cut || null,
      estimated_value: initialData.estimated_value || null,
      notes: initialData.notes || null,
    };
  }, [initialData]);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ItemStoneFormValues>({
    resolver: zodResolver(itemStoneFormSchema),
    defaultValues,
    mode: 'onBlur',
  });

  // Reset form when initial data changes
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // ==========================================================================
  // DROPDOWN OPTIONS
  // ==========================================================================

  const stoneTypeOptions = useMemo(
    () =>
      stoneTypes.map((st) => ({
        label: st.stone_name,
        value: st.id_stone_type,
      })),
    [stoneTypes]
  );

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleFormSubmit = useCallback(
    async (data: ItemStoneFormValues) => {
      await onSubmit(data);
    },
    [onSubmit]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Form
      layout="vertical"
      onFinish={handleSubmit(handleFormSubmit)}
      className={cn('item-stone-form', className)}
    >
      {/* Error Summary */}
      {Object.keys(errors).length > 0 && (
        <Alert
          type="error"
          message={tCommon('validation.required')}
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

      {/* Stone Type & Weight */}
      <Row gutter={[16, 0]}>
        <Col xs={24} sm={12}>
          <Form.Item
            label={t('stones.type')}
            required
            validateStatus={errors.id_stone_type ? 'error' : undefined}
            help={errors.id_stone_type?.message}
          >
            <Controller
              name="id_stone_type"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  value={field.value || undefined}
                  placeholder={tCommon('select.placeholder')}
                  options={stoneTypeOptions}
                  loading={stoneTypesLoading}
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

        <Col xs={24} sm={6}>
          <Form.Item
            label={t('stones.carat')}
            required
            validateStatus={errors.weight_carats ? 'error' : undefined}
            help={errors.weight_carats?.message}
          >
            <Controller
              name="weight_carats"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  placeholder="0.00"
                  min={0.01}
                  max={9999.99}
                  step={0.01}
                  precision={2}
                  addonAfter="ct"
                  className="w-full"
                />
              )}
            />
          </Form.Item>
        </Col>

        <Col xs={24} sm={6}>
          <Form.Item
            label={tCommon('labels.quantity')}
            validateStatus={errors.stone_count ? 'error' : undefined}
            help={errors.stone_count?.message}
          >
            <Controller
              name="stone_count"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  value={field.value ?? 1}
                  min={1}
                  max={999}
                  step={1}
                  precision={0}
                  className="w-full"
                />
              )}
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider className="my-4" />

      {/* Quality Grades */}
      <Row gutter={[16, 0]}>
        <Col xs={24} sm={8}>
          <Form.Item
            label={t('stones.clarity')}
            validateStatus={errors.clarity ? 'error' : undefined}
            help={errors.clarity?.message}
          >
            <Controller
              name="clarity"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  placeholder={tCommon('select.placeholder')}
                  options={CLARITY_OPTIONS}
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

        <Col xs={24} sm={8}>
          <Form.Item
            label={t('stones.color')}
            validateStatus={errors.color ? 'error' : undefined}
            help={errors.color?.message}
          >
            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  placeholder={tCommon('select.placeholder')}
                  options={COLOR_OPTIONS}
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

        <Col xs={24} sm={8}>
          <Form.Item
            label={t('stones.cut')}
            validateStatus={errors.cut ? 'error' : undefined}
            help={errors.cut?.message}
          >
            <Controller
              name="cut"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  placeholder={tCommon('select.placeholder')}
                  options={CUT_OPTIONS}
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

      {/* Setting & Value */}
      <Row gutter={[16, 0]}>
        <Col xs={24} sm={12}>
          <Form.Item
            label="Setting / Position"
            validateStatus={errors.position ? 'error' : undefined}
            help={errors.position?.message}
          >
            <Controller
              name="position"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  placeholder={tCommon('select.placeholder')}
                  options={POSITION_OPTIONS}
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
            label="Estimated Value"
            validateStatus={errors.estimated_value ? 'error' : undefined}
            help={errors.estimated_value?.message}
          >
            <Controller
              name="estimated_value"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  value={field.value ?? undefined}
                  placeholder="0.00"
                  min={0}
                  step={100}
                  precision={2}
                  addonBefore="$"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as unknown as number}
                  className="w-full"
                />
              )}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Notes */}
      <Row gutter={[16, 0]}>
        <Col xs={24}>
          <Form.Item
            label={tCommon('labels.notes')}
            validateStatus={errors.notes ? 'error' : undefined}
            help={errors.notes?.message}
          >
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  value={field.value ?? ''}
                  placeholder="Additional notes about this stone..."
                  rows={3}
                  maxLength={1000}
                  showCount
                />
              )}
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider className="my-4" />

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3">
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
          {mode === 'create' ? tCommon('actions.add') : tCommon('actions.save')}
        </Button>
      </div>
    </Form>
  );
}

/**
 * Loading skeleton for ItemStoneForm
 */
export function ItemStoneFormSkeleton(): JSX.Element {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-4">
        <div className="h-14 bg-stone-200 rounded" />
        <div className="h-14 bg-stone-200 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="h-14 bg-stone-200 rounded" />
        <div className="h-14 bg-stone-200 rounded" />
        <div className="h-14 bg-stone-200 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-14 bg-stone-200 rounded" />
        <div className="h-14 bg-stone-200 rounded" />
      </div>
      <div className="h-24 bg-stone-200 rounded" />
      <div className="flex justify-end gap-3">
        <div className="h-10 w-24 bg-stone-200 rounded" />
        <div className="h-10 w-24 bg-stone-200 rounded" />
      </div>
    </div>
  );
}

export default ItemStoneForm;
