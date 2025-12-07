'use client';

/**
 * SalesFilters Component
 *
 * Filter panel for the sales list with date range, status filters,
 * and customer search. Supports URL synchronization for shareable filtered views.
 *
 * Features:
 * - Date range picker with presets (Today, Yesterday, This Week, This Month, Custom)
 * - Sale status filter (All, Completed, Cancelled, Pending)
 * - Payment status filter (All, Paid, Partial, Unpaid)
 * - Customer search/select
 * - Collapsible on mobile
 * - Clear all functionality
 *
 * @module components/domain/sales/SalesFilters
 */

import React, { useCallback, useMemo } from 'react';

import { CloseOutlined, CalendarOutlined } from '@ant-design/icons';
import { Card, Select, DatePicker, Button, Space, Flex, Segmented } from 'antd';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { CustomerSelect } from '@/components/domain/customers/CustomerSelect';
import type { DateRangeFilter } from '@/lib/hooks/data/useSales';
import { cn } from '@/lib/utils/cn';

import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Filter state for sales filters
 */
export interface SalesFiltersState {
  /** Date range filter */
  dateRange?: DateRangeFilter;
  /** Sale status filter */
  saleStatus?: string | string[];
  /** Payment status filter */
  paymentStatus?: string | string[];
  /** Customer ID filter */
  customerId?: string;
}

export interface SalesFiltersProps {
  /** Current filter values */
  filters: SalesFiltersState;
  /** Callback when filters change */
  onChange: (filters: SalesFiltersState) => void;
  /** Callback to close the panel */
  onClose?: () => void;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Date range presets
 */
type DatePreset = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'custom';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SalesFilters Component
 *
 * Provides filtering capabilities for the sales list.
 */
export function SalesFilters({
  filters,
  onChange,
  onClose,
  className,
}: SalesFiltersProps): React.JSX.Element {
  const t = useTranslations('sales');
  const tCommon = useTranslations('common');

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  // Check if any filter has a value
  const hasValues = useMemo(() => {
    return (
      !!filters.dateRange?.startDate ||
      !!filters.dateRange?.endDate ||
      !!filters.saleStatus ||
      !!filters.paymentStatus ||
      !!filters.customerId
    );
  }, [filters]);

  // Determine current date preset based on filter values
  const currentDatePreset = useMemo((): DatePreset | null => {
    if (!filters.dateRange?.startDate && !filters.dateRange?.endDate) {
      return null;
    }

    const today = dayjs().startOf('day');
    const startDate = filters.dateRange.startDate ? dayjs(filters.dateRange.startDate) : null;
    const endDate = filters.dateRange.endDate ? dayjs(filters.dateRange.endDate) : null;

    // Check for today
    if (startDate?.isSame(today, 'day') && endDate?.isSame(today, 'day')) {
      return 'today';
    }

    // Check for yesterday
    const yesterday = today.subtract(1, 'day');
    if (startDate?.isSame(yesterday, 'day') && endDate?.isSame(yesterday, 'day')) {
      return 'yesterday';
    }

    // Check for this week
    const startOfWeek = today.startOf('week');
    const endOfWeek = today.endOf('week');
    if (startDate?.isSame(startOfWeek, 'day') && endDate?.isSame(endOfWeek, 'day')) {
      return 'thisWeek';
    }

    // Check for this month
    const startOfMonth = today.startOf('month');
    const endOfMonth = today.endOf('month');
    if (startDate?.isSame(startOfMonth, 'day') && endDate?.isSame(endOfMonth, 'day')) {
      return 'thisMonth';
    }

    return 'custom';
  }, [filters.dateRange]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleDatePresetChange = useCallback(
    (preset: DatePreset) => {
      const today = dayjs().startOf('day');
      let newRange: DateRangeFilter | undefined;

      switch (preset) {
        case 'today':
          newRange = {
            startDate: today.format('YYYY-MM-DD'),
            endDate: today.format('YYYY-MM-DD'),
          };
          break;
        case 'yesterday':
          const yesterday = today.subtract(1, 'day');
          newRange = {
            startDate: yesterday.format('YYYY-MM-DD'),
            endDate: yesterday.format('YYYY-MM-DD'),
          };
          break;
        case 'thisWeek':
          newRange = {
            startDate: today.startOf('week').format('YYYY-MM-DD'),
            endDate: today.endOf('week').format('YYYY-MM-DD'),
          };
          break;
        case 'thisMonth':
          newRange = {
            startDate: today.startOf('month').format('YYYY-MM-DD'),
            endDate: today.endOf('month').format('YYYY-MM-DD'),
          };
          break;
        case 'custom':
          // Keep current range or set to today as starting point
          newRange = filters.dateRange || {
            startDate: today.format('YYYY-MM-DD'),
            endDate: today.format('YYYY-MM-DD'),
          };
          break;
      }

      onChange({
        ...filters,
        dateRange: newRange,
      });
    },
    [filters, onChange]
  );

  const handleDateRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (!dates || !dates[0] || !dates[1]) {
        onChange({
          ...filters,
          dateRange: undefined,
        });
        return;
      }

      onChange({
        ...filters,
        dateRange: {
          startDate: dates[0].format('YYYY-MM-DD'),
          endDate: dates[1].format('YYYY-MM-DD'),
        },
      });
    },
    [filters, onChange]
  );

  const handleSaleStatusChange = useCallback(
    (value: string | undefined) => {
      onChange({
        ...filters,
        saleStatus: value || undefined,
      });
    },
    [filters, onChange]
  );

  const handlePaymentStatusChange = useCallback(
    (value: string | undefined) => {
      onChange({
        ...filters,
        paymentStatus: value || undefined,
      });
    },
    [filters, onChange]
  );

  const handleCustomerChange = useCallback(
    (customerId: string | null) => {
      onChange({
        ...filters,
        customerId: customerId || undefined,
      });
    },
    [filters, onChange]
  );

  const handleClearAll = useCallback(() => {
    onChange({
      dateRange: undefined,
      saleStatus: undefined,
      paymentStatus: undefined,
      customerId: undefined,
    });
  }, [onChange]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Sale status options
  const saleStatusOptions = [
    { value: '', label: tCommon('labels.all') },
    { value: 'completed', label: t('status.completed') },
    { value: 'pending', label: t('status.pending') },
    { value: 'cancelled', label: t('status.cancelled') },
    { value: 'refunded', label: t('status.refunded') },
  ];

  // Payment status options
  const paymentStatusOptions = [
    { value: '', label: tCommon('labels.all') },
    { value: 'paid', label: t('status.fullyPaid') },
    { value: 'partial', label: t('status.partiallyPaid') },
    { value: 'unpaid', label: t('payment.balance') },
  ];

  // Date preset options for segmented control
  const datePresetOptions = [
    { value: 'today', label: tCommon('time.today') },
    { value: 'yesterday', label: tCommon('time.yesterday') },
    { value: 'thisWeek', label: tCommon('time.thisWeek') },
    { value: 'thisMonth', label: tCommon('time.thisMonth') },
  ];

  // Get dayjs values for date picker
  const datePickerValue: [Dayjs, Dayjs] | undefined =
    filters.dateRange?.startDate && filters.dateRange?.endDate
      ? [dayjs(filters.dateRange.startDate), dayjs(filters.dateRange.endDate)]
      : undefined;

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
        <span className="text-sm font-medium text-stone-700">{tCommon('actions.filter')}</span>
        <Space size="small">
          {hasValues && (
            <Button
              type="link"
              size="small"
              onClick={handleClearAll}
              className="text-stone-500 hover:text-stone-700 px-0"
            >
              {tCommon('actions.clear')}
            </Button>
          )}
          {onClose && (
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600"
              aria-label={tCommon('actions.close')}
            />
          )}
        </Space>
      </Flex>

      <div className="space-y-4">
        {/* Date Range Section */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-stone-600 flex items-center gap-1">
            <CalendarOutlined />
            {tCommon('labels.dateRange')}
          </label>

          {/* Date Presets */}
          <div className="flex flex-wrap gap-2">
            <Segmented
              options={datePresetOptions}
              value={currentDatePreset === 'custom' ? undefined : (currentDatePreset ?? undefined)}
              onChange={(value) => handleDatePresetChange(value as DatePreset)}
              className="bg-white"
            />
          </div>

          {/* Custom Date Range Picker */}
          <RangePicker
            value={datePickerValue}
            onChange={handleDateRangeChange}
            className="w-full"
            placeholder={[tCommon('labels.from'), tCommon('labels.to')]}
            allowClear
          />
        </div>

        {/* Status Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Sale Status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-600">{tCommon('labels.status')}</label>
            <Select
              value={(filters.saleStatus as string) || ''}
              onChange={handleSaleStatusChange}
              options={saleStatusOptions}
              className="w-full"
              placeholder={tCommon('labels.status')}
            />
          </div>

          {/* Payment Status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-600">{t('payment.title')}</label>
            <Select
              value={(filters.paymentStatus as string) || ''}
              onChange={handlePaymentStatusChange}
              options={paymentStatusOptions}
              className="w-full"
              placeholder={t('payment.title')}
            />
          </div>

          {/* Customer Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-600">{t('customer')}</label>
            <CustomerSelect
              value={filters.customerId || null}
              onChange={handleCustomerChange}
              placeholder={t('selectCustomer')}
              allowClear
              className="w-full"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default SalesFilters;
