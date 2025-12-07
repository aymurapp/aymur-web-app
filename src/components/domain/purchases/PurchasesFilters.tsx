'use client';

/**
 * PurchasesFilters Component
 *
 * Filter controls for the purchases list page.
 * Includes date range, status, supplier, and payment status filters.
 *
 * Features:
 * - Date range picker
 * - Payment status multi-select
 * - Supplier dropdown
 * - Search input
 * - Clear all filters
 * - RTL support
 *
 * @module components/domain/purchases/PurchasesFilters
 */

import React, { useCallback } from 'react';

import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { Input, Select, DatePicker, Button, Badge } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslations, useLocale } from 'next-intl';

import { SupplierSelect } from '@/components/domain/suppliers/SupplierSelect';
import type { PurchasePaymentStatus, DateRangeFilter } from '@/lib/hooks/data/usePurchases';
import { isRtlLocale, type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';

const { RangePicker } = DatePicker;

// =============================================================================
// TYPES
// =============================================================================

export interface PurchasesFiltersState {
  search: string;
  supplierId: string | null;
  paymentStatus: PurchasePaymentStatus[];
  dateRange: DateRangeFilter | undefined;
}

export interface PurchasesFiltersProps {
  /** Current filter values */
  filters: PurchasesFiltersState;
  /** Callback when filters change */
  onFiltersChange: (filters: Partial<PurchasesFiltersState>) => void;
  /** Callback to clear all filters */
  onClearFilters: () => void;
  /** Whether filters are loading */
  isLoading?: boolean;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PAYMENT_STATUS_OPTIONS: PurchasePaymentStatus[] = ['unpaid', 'partial', 'paid'];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * PurchasesFilters Component
 *
 * Provides filtering controls for the purchases list.
 */
export function PurchasesFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  isLoading = false,
  className,
}: PurchasesFiltersProps): React.JSX.Element {
  const t = useTranslations('purchases');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const isRtl = isRtlLocale(locale);

  // Count active filters
  const activeFilterCount = [
    filters.search,
    filters.supplierId,
    filters.paymentStatus.length > 0,
    filters.dateRange?.startDate || filters.dateRange?.endDate,
  ].filter(Boolean).length;

  // Handle search change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ search: e.target.value });
    },
    [onFiltersChange]
  );

  // Handle supplier change
  const handleSupplierChange = useCallback(
    (supplierId: string | null) => {
      onFiltersChange({ supplierId });
    },
    [onFiltersChange]
  );

  // Handle payment status change
  const handlePaymentStatusChange = useCallback(
    (statuses: PurchasePaymentStatus[]) => {
      onFiltersChange({ paymentStatus: statuses });
    },
    [onFiltersChange]
  );

  // Handle date range change
  const handleDateRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (dates && dates[0] && dates[1]) {
        onFiltersChange({
          dateRange: {
            startDate: dates[0].format('YYYY-MM-DD'),
            endDate: dates[1].format('YYYY-MM-DD'),
          },
        });
      } else {
        onFiltersChange({ dateRange: undefined });
      }
    },
    [onFiltersChange]
  );

  // Build payment status options
  const paymentStatusOptions = PAYMENT_STATUS_OPTIONS.map((status) => ({
    value: status,
    label: t(`paymentStatus.${status}`),
  }));

  // Get date range value for RangePicker
  const dateRangeValue: [Dayjs | null, Dayjs | null] | null =
    filters.dateRange?.startDate && filters.dateRange?.endDate
      ? [dayjs(filters.dateRange.startDate), dayjs(filters.dateRange.endDate)]
      : null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Primary filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <Input
          placeholder={t('searchPurchase')}
          prefix={<SearchOutlined className="text-stone-400" />}
          value={filters.search}
          onChange={handleSearchChange}
          allowClear
          className="sm:w-64"
          disabled={isLoading}
        />

        {/* Supplier filter */}
        <div className="sm:w-64">
          <SupplierSelect
            value={filters.supplierId}
            onChange={handleSupplierChange}
            placeholder={t('filterBySupplier')}
            allowClear
            disabled={isLoading}
          />
        </div>

        {/* Payment status filter */}
        <Select
          mode="multiple"
          placeholder={t('filterByPaymentStatus')}
          value={filters.paymentStatus}
          onChange={handlePaymentStatusChange}
          options={paymentStatusOptions}
          allowClear
          className="sm:w-48"
          disabled={isLoading}
          maxTagCount="responsive"
        />

        {/* Date range filter */}
        <RangePicker
          value={dateRangeValue}
          onChange={handleDateRangeChange}
          format="YYYY-MM-DD"
          placeholder={[tCommon('labels.from'), tCommon('labels.to')]}
          direction={isRtl ? 'rtl' : 'ltr'}
          className="sm:w-64"
          disabled={isLoading}
        />

        {/* Clear filters button */}
        {activeFilterCount > 0 && (
          <Button icon={<ClearOutlined />} onClick={onClearFilters} disabled={isLoading}>
            <span className="hidden sm:inline">{tCommon('actions.clear')}</span>
            <Badge
              count={activeFilterCount}
              size="small"
              className="ms-1"
              style={{ backgroundColor: '#f59e0b' }}
            />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Default filter state
 */
export const defaultPurchasesFilters: PurchasesFiltersState = {
  search: '',
  supplierId: null,
  paymentStatus: [],
  dateRange: undefined,
};

export default PurchasesFilters;
