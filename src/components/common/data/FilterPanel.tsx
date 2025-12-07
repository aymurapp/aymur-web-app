'use client';

/**
 * FilterPanel Component
 *
 * A collapsible filter panel for use with DataTable.
 * Supports various filter types including select, date range, and input.
 *
 * @example
 * <FilterPanel
 *   filters={[
 *     { key: 'status', label: 'Status', type: 'select', options: statusOptions },
 *     { key: 'dateRange', label: 'Date', type: 'dateRange' }
 *   ]}
 *   values={filterValues}
 *   onChange={handleFilterChange}
 * />
 */

import React, { useCallback } from 'react';

import { CloseOutlined } from '@ant-design/icons';
import { Card, Select, Input, DatePicker, Button, Space, Flex, InputNumber } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';

import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

/**
 * Filter option for select filters
 */
export interface FilterOption {
  label: string;
  value: string | number;
}

/**
 * Base filter configuration
 */
interface BaseFilterConfig {
  /** Unique key for the filter */
  key: string;
  /** Display label */
  label: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the filter spans full width */
  fullWidth?: boolean;
}

/**
 * Select filter configuration
 */
interface SelectFilterConfig extends BaseFilterConfig {
  type: 'select';
  options: FilterOption[];
  mode?: 'multiple' | 'tags';
}

/**
 * Input filter configuration
 */
interface InputFilterConfig extends BaseFilterConfig {
  type: 'input';
}

/**
 * Number filter configuration
 */
interface NumberFilterConfig extends BaseFilterConfig {
  type: 'number';
  min?: number;
  max?: number;
}

/**
 * Date filter configuration
 */
interface DateFilterConfig extends BaseFilterConfig {
  type: 'date';
}

/**
 * Date range filter configuration
 */
interface DateRangeFilterConfig extends BaseFilterConfig {
  type: 'dateRange';
}

/**
 * Union type for all filter configurations
 */
export type FilterConfig =
  | SelectFilterConfig
  | InputFilterConfig
  | NumberFilterConfig
  | DateFilterConfig
  | DateRangeFilterConfig;

/**
 * FilterPanel props
 */
export interface FilterPanelProps {
  /** Filter configurations */
  filters: FilterConfig[];
  /** Current filter values */
  values: Record<string, unknown>;
  /** Callback when values change */
  onChange: (values: Record<string, unknown>) => void;
  /** Callback to close the panel */
  onClose?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * FilterPanel component for DataTable
 *
 * Features:
 * - Multiple filter types (select, input, date, dateRange)
 * - Clear all functionality
 * - Responsive grid layout
 * - RTL-compatible
 */
export function FilterPanel({ filters, values, onChange, onClose, className }: FilterPanelProps) {
  const t = useTranslations('common');

  // Handle individual filter change
  const handleChange = useCallback(
    (key: string, value: unknown) => {
      onChange({
        ...values,
        [key]: value,
      });
    },
    [values, onChange]
  );

  // Clear all filters
  const handleClearAll = useCallback(() => {
    const clearedValues: Record<string, unknown> = {};
    filters.forEach((filter) => {
      clearedValues[filter.key] = undefined;
    });
    onChange(clearedValues);
  }, [filters, onChange]);

  // Check if any filter has a value
  const hasValues = Object.values(values).some((v) => v !== undefined && v !== null && v !== '');

  // Render filter based on type
  const renderFilter = (filter: FilterConfig) => {
    const commonProps = {
      className: 'w-full',
      placeholder: filter.placeholder || filter.label,
    };

    switch (filter.type) {
      case 'select':
        return (
          <Select
            {...commonProps}
            value={values[filter.key] as string | string[] | undefined}
            onChange={(value) => handleChange(filter.key, value)}
            options={filter.options}
            mode={filter.mode}
            allowClear
          />
        );

      case 'input':
        return (
          <Input
            {...commonProps}
            value={values[filter.key] as string | undefined}
            onChange={(e) => handleChange(filter.key, e.target.value)}
            allowClear
          />
        );

      case 'number':
        return (
          <InputNumber
            {...commonProps}
            value={values[filter.key] as number | undefined}
            onChange={(value) => handleChange(filter.key, value)}
            min={filter.min}
            max={filter.max}
          />
        );

      case 'date':
        return (
          <DatePicker
            {...commonProps}
            value={values[filter.key] as Dayjs | undefined}
            onChange={(date) => handleChange(filter.key, date)}
          />
        );

      case 'dateRange':
        return (
          <RangePicker
            className="w-full"
            placeholder={[filter.placeholder || filter.label, filter.placeholder || filter.label]}
            value={values[filter.key] as [Dayjs, Dayjs] | undefined}
            onChange={(dates) => handleChange(filter.key, dates)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Card
      size="small"
      className={cn('border-stone-200 bg-stone-50', className)}
      styles={{
        body: {
          padding: '16px',
        },
      }}
    >
      <Flex justify="space-between" align="start" className="mb-4">
        <span className="text-sm font-medium text-stone-700">{t('actions.filter')}</span>
        <Space size="small">
          {hasValues && (
            <Button
              type="link"
              size="small"
              onClick={handleClearAll}
              className="text-stone-500 hover:text-stone-700 px-0"
            >
              {t('actions.clear')}
            </Button>
          )}
          {onClose && (
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600"
              aria-label={t('actions.close')}
            />
          )}
        </Space>
      </Flex>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filters.map((filter) => (
          <div
            key={filter.key}
            className={cn(
              'flex flex-col gap-1',
              filter.fullWidth && 'sm:col-span-2 md:col-span-3 lg:col-span-4'
            )}
          >
            <label className="text-xs font-medium text-stone-600">{filter.label}</label>
            {renderFilter(filter)}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default FilterPanel;
