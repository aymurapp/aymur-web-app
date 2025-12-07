'use client';

/**
 * Budget Allocation Form Component
 *
 * Modal form for creating and editing budget allocations.
 * Supports category selection, period configuration, and amount input.
 *
 * Features:
 * - Category selector (budget categories)
 * - Period selection (start/end date or preset: this month, this quarter, etc.)
 * - Amount input with currency
 * - Notes field
 * - Uses useAllocateBudget mutation
 * - Validation with budgetAllocationSchema
 *
 * @module components/domain/expenses/BudgetAllocationForm
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import {
  WalletOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  InputNumber,
  Input,
  Segmented,
  Alert,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  useBudgetCategories,
  useAllocateBudget,
  useBudgetAllocations,
  type BudgetCategory,
} from '@/lib/hooks/data/useBudgets';
import { usePermissions } from '@/lib/hooks/permissions';
import { budgetAllocationSchema, type BudgetAllocationInput } from '@/lib/utils/schemas/budget';

dayjs.extend(quarterOfYear);

// =============================================================================
// TYPES
// =============================================================================

type PeriodPreset =
  | 'thisMonth'
  | 'nextMonth'
  | 'thisQuarter'
  | 'nextQuarter'
  | 'thisYear'
  | 'custom';

interface BudgetAllocationFormProps {
  /**
   * Whether the modal is open
   */
  open: boolean;

  /**
   * Called when the modal should close
   */
  onClose: () => void;

  /**
   * Called after successful form submission
   */
  onSuccess?: () => void;

  /**
   * Pre-selected category ID
   */
  defaultCategoryId?: string;

  /**
   * Default period dates
   */
  defaultPeriod?: {
    start: string;
    end: string;
  };
}

interface FormValues {
  id_budget_category: string;
  period_preset: PeriodPreset;
  period_start: Dayjs;
  period_end: Dayjs;
  allocated_amount: number;
  rollover_enabled: boolean;
  notes: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PERIOD_PRESETS = [
  { value: 'thisMonth', label: 'This Month' },
  { value: 'nextMonth', label: 'Next Month' },
  { value: 'thisQuarter', label: 'This Quarter' },
  { value: 'nextQuarter', label: 'Next Quarter' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get period dates based on preset
 */
function getPresetDates(preset: PeriodPreset): { start: Dayjs; end: Dayjs } {
  const now = dayjs();

  switch (preset) {
    case 'thisMonth':
      return {
        start: now.startOf('month'),
        end: now.endOf('month'),
      };
    case 'nextMonth':
      return {
        start: now.add(1, 'month').startOf('month'),
        end: now.add(1, 'month').endOf('month'),
      };
    case 'thisQuarter':
      return {
        start: now.startOf('quarter'),
        end: now.endOf('quarter'),
      };
    case 'nextQuarter':
      return {
        start: now.add(1, 'quarter').startOf('quarter'),
        end: now.add(1, 'quarter').endOf('quarter'),
      };
    case 'thisYear':
      return {
        start: now.startOf('year'),
        end: now.endOf('year'),
      };
    default:
      return {
        start: now.startOf('month'),
        end: now.endOf('month'),
      };
  }
}

/**
 * Format currency display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Budget Allocation Form Component
 *
 * Modal form for creating budget allocations with category selection,
 * period configuration, and amount input.
 */
export function BudgetAllocationForm({
  open,
  onClose,
  onSuccess,
  defaultCategoryId,
  defaultPeriod,
}: BudgetAllocationFormProps): React.JSX.Element {
  const t = useTranslations('budgets');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  const [form] = Form.useForm<FormValues>();
  const periodPreset = Form.useWatch('period_preset', form);
  const selectedCategoryId = Form.useWatch('id_budget_category', form);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { categories = [], isLoading: categoriesLoading } = useBudgetCategories({
    isActive: true,
  });

  const allocateBudget = useAllocateBudget();

  // Check for existing allocation in the selected period
  const periodStart = Form.useWatch('period_start', form);
  const periodEnd = Form.useWatch('period_end', form);

  const { allocations: existingAllocations = [] } = useBudgetAllocations({
    categoryId: selectedCategoryId || undefined,
    periodContains: periodStart?.format('YYYY-MM-DD'),
    status: 'active',
  });

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const canManageBudgets = can('budgets.manage');

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id_budget_category === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const hasExistingAllocation = useMemo(() => {
    if (!selectedCategoryId || !periodStart || !periodEnd) {
      return false;
    }
    return existingAllocations.some((a) => a.id_budget_category === selectedCategoryId);
  }, [existingAllocations, selectedCategoryId, periodStart, periodEnd]);

  const categoryOptions = useMemo(() => {
    return categories.map((category: BudgetCategory) => ({
      value: category.id_budget_category,
      label: (
        <div className="flex items-center justify-between">
          <span>{category.category_name}</span>
          <span className="text-stone-400 text-xs">{category.budget_type}</span>
        </div>
      ),
      category,
    }));
  }, [categories]);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const initialPreset: PeriodPreset = 'thisMonth';
      const dates = defaultPeriod
        ? {
            start: dayjs(defaultPeriod.start),
            end: dayjs(defaultPeriod.end),
          }
        : getPresetDates(initialPreset);

      form.setFieldsValue({
        id_budget_category: defaultCategoryId || undefined,
        period_preset: defaultPeriod ? 'custom' : initialPreset,
        period_start: dates.start,
        period_end: dates.end,
        allocated_amount: selectedCategory?.default_amount || undefined,
        rollover_enabled: false,
        notes: '',
      });
    }
  }, [open, defaultCategoryId, defaultPeriod, form, selectedCategory?.default_amount]);

  // Update dates when preset changes
  useEffect(() => {
    if (periodPreset && periodPreset !== 'custom') {
      const dates = getPresetDates(periodPreset);
      form.setFieldsValue({
        period_start: dates.start,
        period_end: dates.end,
      });
    }
  }, [periodPreset, form]);

  // Set default amount when category changes
  useEffect(() => {
    if (selectedCategory?.default_amount && !form.getFieldValue('allocated_amount')) {
      form.setFieldsValue({
        allocated_amount: selectedCategory.default_amount,
      });
    }
  }, [selectedCategory, form]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      if (!canManageBudgets) {
        message.error(tCommon('messages.operationFailed'));
        return;
      }

      try {
        const allocationData: BudgetAllocationInput = {
          id_budget_category: values.id_budget_category,
          period_start: values.period_start.format('YYYY-MM-DD'),
          period_end: values.period_end.format('YYYY-MM-DD'),
          allocated_amount: values.allocated_amount,
          rollover_enabled: values.rollover_enabled || false,
          rollover_amount: 0,
          status: 'active',
          notes: values.notes?.trim() || null,
        };

        // Validate with schema
        const validation = budgetAllocationSchema.safeParse(allocationData);
        if (!validation.success) {
          const errors = validation.error.issues.map((issue) => issue.message);
          message.error(errors[0]);
          return;
        }

        await allocateBudget.mutateAsync(allocationData);
        message.success(t('allocationCreated'));
        form.resetFields();
        onSuccess?.();
      } catch (error) {
        console.error('Failed to create budget allocation:', error);
        message.error(tCommon('messages.operationFailed'));
      }
    },
    [allocateBudget, canManageBudgets, form, onSuccess, t, tCommon]
  );

  const handleClose = useCallback(() => {
    form.resetFields();
    onClose();
  }, [form, onClose]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <div className="flex items-center gap-2">
          <WalletOutlined className="text-amber-600" />
          <span>{t('createAllocation')}</span>
        </div>
      }
      footer={null}
      width={520}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4"
        disabled={!canManageBudgets}
      >
        {/* Category Selector */}
        <Form.Item
          name="id_budget_category"
          label={
            <span className="flex items-center gap-1">
              <WalletOutlined className="text-stone-400" />
              {t('category')}
            </span>
          }
          rules={[{ required: true, message: t('validation.categoryRequired') }]}
        >
          <Select
            placeholder={t('selectCategory')}
            options={categoryOptions}
            loading={categoriesLoading}
            showSearch
            filterOption={(input, option) =>
              option?.category?.category_name?.toLowerCase().includes(input.toLowerCase()) ?? false
            }
            optionFilterProp="children"
          />
        </Form.Item>

        {/* Period Preset */}
        <Form.Item
          name="period_preset"
          label={
            <span className="flex items-center gap-1">
              <CalendarOutlined className="text-stone-400" />
              {t('periodPreset')}
            </span>
          }
        >
          <Segmented
            options={PERIOD_PRESETS.map((preset) => ({
              value: preset.value,
              label: t(`presets.${preset.value}`),
            }))}
            className="w-full"
          />
        </Form.Item>

        {/* Custom Period Dates */}
        {periodPreset === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="period_start"
              label={t('periodStart')}
              rules={[{ required: true, message: t('validation.startDateRequired') }]}
            >
              <DatePicker format="MMM D, YYYY" className="w-full" allowClear={false} />
            </Form.Item>

            <Form.Item
              name="period_end"
              label={t('periodEnd')}
              rules={[
                { required: true, message: t('validation.endDateRequired') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const startDate = getFieldValue('period_start');
                    if (
                      !value ||
                      !startDate ||
                      value.isAfter(startDate) ||
                      value.isSame(startDate)
                    ) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('validation.endDateAfterStart')));
                  },
                }),
              ]}
            >
              <DatePicker format="MMM D, YYYY" className="w-full" allowClear={false} />
            </Form.Item>
          </div>
        )}

        {/* Period Display (for presets) */}
        {periodPreset !== 'custom' && (
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const start = getFieldValue('period_start');
              const end = getFieldValue('period_end');
              return (
                <div className="mb-4 p-3 bg-stone-50 rounded-lg text-sm text-stone-600">
                  {start && end && (
                    <>
                      <span className="font-medium">{t('selectedPeriod')}:</span>{' '}
                      {start.format('MMM D, YYYY')} - {end.format('MMM D, YYYY')}
                    </>
                  )}
                </div>
              );
            }}
          </Form.Item>
        )}

        {/* Existing Allocation Warning */}
        {hasExistingAllocation && (
          <Alert
            type="warning"
            showIcon
            message={t('existingAllocationWarning')}
            description={t('existingAllocationDescription')}
            className="mb-4"
          />
        )}

        {/* Amount Input */}
        <Form.Item
          name="allocated_amount"
          label={
            <span className="flex items-center gap-1">
              <DollarOutlined className="text-stone-400" />
              {t('allocatedAmount')}
            </span>
          }
          rules={[
            { required: true, message: t('validation.amountRequired') },
            {
              type: 'number',
              min: 0.01,
              message: t('validation.amountPositive'),
            },
          ]}
          extra={
            selectedCategory?.default_amount ? (
              <span className="text-stone-400 text-xs">
                {t('defaultAmount')}: {formatCurrency(selectedCategory.default_amount)}
              </span>
            ) : null
          }
        >
          <InputNumber<number>
            placeholder={t('enterAmount')}
            className="w-full"
            min={0.01}
            step={100}
            precision={2}
            formatter={(value) => (value ? `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
            parser={(value) => {
              const parsed = value?.replace(/\$\s?|(,*)/g, '');
              return (parsed ? parseFloat(parsed) : 0) as unknown as number;
            }}
          />
        </Form.Item>

        {/* Rollover Toggle */}
        <Form.Item name="rollover_enabled" valuePropName="checked">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rollover_enabled"
              className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              checked={form.getFieldValue('rollover_enabled')}
              onChange={(e) => form.setFieldValue('rollover_enabled', e.target.checked)}
            />
            <label htmlFor="rollover_enabled" className="text-sm text-stone-600 cursor-pointer">
              {t('enableRollover')}
            </label>
          </div>
        </Form.Item>

        {/* Notes */}
        <Form.Item
          name="notes"
          label={
            <span className="flex items-center gap-1">
              <FileTextOutlined className="text-stone-400" />
              {tCommon('labels.notes')}
            </span>
          }
        >
          <Input.TextArea placeholder={t('notesPlaceholder')} rows={3} maxLength={5000} showCount />
        </Form.Item>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
          <Button onClick={handleClose}>{tCommon('actions.cancel')}</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={allocateBudget.isPending}
            disabled={hasExistingAllocation}
          >
            {t('createAllocation')}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

export default BudgetAllocationForm;
