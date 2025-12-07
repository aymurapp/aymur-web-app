'use client';

/**
 * ProductSearchFilters Component
 *
 * Collapsible advanced filters for POS product search.
 * Compact design to minimize space usage while providing quick filtering.
 *
 * Features:
 * - Collapsible/expandable panel
 * - Metal type filter
 * - Metal purity filter
 * - Price range filter
 * - Weight range filter
 * - Quick clear all button
 * - Active filter count badge
 *
 * @module components/domain/sales/ProductSearchFilters
 */

import React, { useCallback, useMemo } from 'react';

import { FilterOutlined, CloseOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { Select, Slider, Space, Typography, Badge } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Filter state for product search
 */
export interface ProductFilters {
  /** Selected metal type IDs */
  metalTypes?: string[];
  /** Selected metal purity IDs */
  metalPurities?: string[];
  /** Price range [min, max] */
  priceRange?: [number, number];
  /** Weight range in grams [min, max] */
  weightRange?: [number, number];
}

/**
 * Metal type option
 */
export interface MetalTypeOption {
  id: string;
  name: string;
}

/**
 * Metal purity option
 */
export interface MetalPurityOption {
  id: string;
  name: string;
  percentage: number;
}

/**
 * Props for ProductSearchFilters component
 */
export interface ProductSearchFiltersProps {
  /**
   * Current filter state
   */
  filters: ProductFilters;

  /**
   * Callback when filters change
   */
  onFiltersChange: (filters: ProductFilters) => void;

  /**
   * Available metal types for selection
   */
  metalTypes?: MetalTypeOption[];

  /**
   * Available metal purities for selection
   */
  metalPurities?: MetalPurityOption[];

  /**
   * Maximum price for range slider
   * @default 100000
   */
  maxPrice?: number;

  /**
   * Maximum weight for range slider (in grams)
   * @default 1000
   */
  maxWeight?: number;

  /**
   * Currency code for price display
   * @default 'USD'
   */
  currency?: string;

  /**
   * Whether filters panel is expanded
   */
  expanded?: boolean;

  /**
   * Callback when expanded state changes
   */
  onExpandedChange?: (expanded: boolean) => void;

  /**
   * Size variant
   * @default 'default'
   */
  size?: 'small' | 'default';

  /**
   * Additional class name
   */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ProductSearchFilters Component
 *
 * Collapsible advanced filter panel for POS product search.
 */
export function ProductSearchFilters({
  filters,
  onFiltersChange,
  metalTypes = [],
  metalPurities = [],
  maxPrice = 100000,
  maxWeight = 1000,
  currency = 'USD',
  expanded = false,
  onExpandedChange,
  size = 'default',
  className,
}: ProductSearchFiltersProps): JSX.Element {
  const t = useTranslations();

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.metalTypes?.length) {
      count++;
    }
    if (filters.metalPurities?.length) {
      count++;
    }
    if (filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice)) {
      count++;
    }
    if (filters.weightRange && (filters.weightRange[0] > 0 || filters.weightRange[1] < maxWeight)) {
      count++;
    }
    return count;
  }, [filters, maxPrice, maxWeight]);

  // Handlers
  const handleMetalTypesChange = useCallback(
    (values: string[]) => {
      onFiltersChange({ ...filters, metalTypes: values.length ? values : undefined });
    },
    [filters, onFiltersChange]
  );

  const handleMetalPuritiesChange = useCallback(
    (values: string[]) => {
      onFiltersChange({ ...filters, metalPurities: values.length ? values : undefined });
    },
    [filters, onFiltersChange]
  );

  const handlePriceRangeChange = useCallback(
    (value: [number, number]) => {
      const hasChanged = value[0] > 0 || value[1] < maxPrice;
      onFiltersChange({ ...filters, priceRange: hasChanged ? value : undefined });
    },
    [filters, onFiltersChange, maxPrice]
  );

  const handleWeightRangeChange = useCallback(
    (value: [number, number]) => {
      const hasChanged = value[0] > 0 || value[1] < maxWeight;
      onFiltersChange({ ...filters, weightRange: hasChanged ? value : undefined });
    },
    [filters, onFiltersChange, maxWeight]
  );

  const handleClearAll = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  const handleToggleExpanded = useCallback(() => {
    onExpandedChange?.(!expanded);
  }, [expanded, onExpandedChange]);

  // Size configurations
  const isSmall = size === 'small';
  const selectSize = isSmall ? 'small' : 'middle';

  // Format price for display
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={cn('border border-stone-200 rounded-lg bg-white', className)}>
      {/* Header - Always Visible */}
      <button
        type="button"
        onClick={handleToggleExpanded}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3',
          isSmall ? 'py-2' : 'py-2.5',
          'hover:bg-stone-50 transition-colors'
        )}
      >
        <div className="flex items-center gap-2">
          <Badge count={activeFilterCount} size="small" offset={[0, 0]}>
            <FilterOutlined className="text-stone-500" />
          </Badge>
          <Text className={cn('font-medium', isSmall ? 'text-xs' : 'text-sm')}>
            {t('common.labels.filters')}
          </Text>
        </div>

        <div className="flex items-center gap-2">
          {/* Clear All Button */}
          {activeFilterCount > 0 && (
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              className="!text-stone-400 hover:!text-red-500 !text-xs"
            >
              {t('common.actions.clear')}
            </Button>
          )}

          {/* Expand/Collapse Icon */}
          {expanded ? (
            <UpOutlined className="text-stone-400 text-xs" />
          ) : (
            <DownOutlined className="text-stone-400 text-xs" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      {expanded && (
        <div className={cn('border-t border-stone-100 px-3', isSmall ? 'py-2' : 'py-3')}>
          <div className="grid grid-cols-2 gap-3">
            {/* Metal Type */}
            {metalTypes.length > 0 && (
              <div className="space-y-1">
                <Text type="secondary" className="text-xs block">
                  {t('inventory.metals.metalType')}
                </Text>
                <Select
                  mode="multiple"
                  size={selectSize}
                  placeholder={t('common.placeholders.selectAll')}
                  value={filters.metalTypes || []}
                  onChange={handleMetalTypesChange}
                  options={metalTypes.map((mt) => ({ value: mt.id, label: mt.name }))}
                  className="w-full"
                  maxTagCount={1}
                  maxTagPlaceholder={(omitted) => `+${omitted.length}`}
                  allowClear
                />
              </div>
            )}

            {/* Metal Purity */}
            {metalPurities.length > 0 && (
              <div className="space-y-1">
                <Text type="secondary" className="text-xs block">
                  {t('inventory.metals.purity')}
                </Text>
                <Select
                  mode="multiple"
                  size={selectSize}
                  placeholder={t('common.placeholders.selectAll')}
                  value={filters.metalPurities || []}
                  onChange={handleMetalPuritiesChange}
                  options={metalPurities.map((mp) => ({
                    value: mp.id,
                    label: `${mp.name} (${mp.percentage}%)`,
                  }))}
                  className="w-full"
                  maxTagCount={1}
                  maxTagPlaceholder={(omitted) => `+${omitted.length}`}
                  allowClear
                />
              </div>
            )}

            {/* Price Range */}
            <div className="space-y-1 col-span-2">
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-xs">
                  {t('inventory.priceRange')}
                </Text>
                <Text type="secondary" className="text-xs">
                  {filters.priceRange
                    ? `${formatPrice(filters.priceRange[0])} - ${formatPrice(filters.priceRange[1])}`
                    : t('common.labels.all')}
                </Text>
              </div>
              <Slider
                range
                min={0}
                max={maxPrice}
                step={100}
                value={filters.priceRange || [0, maxPrice]}
                onChange={(value) => handlePriceRangeChange(value as [number, number])}
                tooltip={{
                  formatter: (value) => (value !== undefined ? formatPrice(value) : ''),
                }}
                className="!mb-0"
              />
            </div>

            {/* Weight Range */}
            <div className="space-y-1 col-span-2">
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-xs">
                  {t('inventory.metals.weight')} (g)
                </Text>
                <Text type="secondary" className="text-xs">
                  {filters.weightRange
                    ? `${filters.weightRange[0]}g - ${filters.weightRange[1]}g`
                    : t('common.labels.all')}
                </Text>
              </div>
              <Slider
                range
                min={0}
                max={maxWeight}
                step={1}
                value={filters.weightRange || [0, maxWeight]}
                onChange={(value) => handleWeightRangeChange(value as [number, number])}
                tooltip={{
                  formatter: (value) => (value !== undefined ? `${value}g` : ''),
                }}
                className="!mb-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT INLINE VARIANT
// =============================================================================

/**
 * Compact inline filter chips for quick filtering
 */
export function ProductSearchFiltersInline({
  filters,
  onFiltersChange,
  metalTypes = [],
  metalPurities = [],
  size = 'default',
  className,
}: Omit<
  ProductSearchFiltersProps,
  'expanded' | 'onExpandedChange' | 'maxPrice' | 'maxWeight' | 'currency'
>): JSX.Element {
  const t = useTranslations();

  const isSmall = size === 'small';
  const selectSize = isSmall ? 'small' : 'middle';

  const handleMetalTypesChange = useCallback(
    (values: string[]) => {
      onFiltersChange({ ...filters, metalTypes: values.length ? values : undefined });
    },
    [filters, onFiltersChange]
  );

  const handleMetalPuritiesChange = useCallback(
    (values: string[]) => {
      onFiltersChange({ ...filters, metalPurities: values.length ? values : undefined });
    },
    [filters, onFiltersChange]
  );

  return (
    <Space size="small" wrap className={className}>
      {/* Metal Type */}
      {metalTypes.length > 0 && (
        <Select
          mode="multiple"
          size={selectSize}
          placeholder={t('inventory.metals.metalType')}
          value={filters.metalTypes || []}
          onChange={handleMetalTypesChange}
          options={metalTypes.map((mt) => ({ value: mt.id, label: mt.name }))}
          style={{ minWidth: 100 }}
          maxTagCount={0}
          maxTagPlaceholder={(selected) =>
            selected.length === 0
              ? t('inventory.metals.metalType')
              : `${selected.length} ${t('common.labels.selected')}`
          }
          allowClear
        />
      )}

      {/* Metal Purity */}
      {metalPurities.length > 0 && (
        <Select
          mode="multiple"
          size={selectSize}
          placeholder={t('inventory.metals.purity')}
          value={filters.metalPurities || []}
          onChange={handleMetalPuritiesChange}
          options={metalPurities.map((mp) => ({
            value: mp.id,
            label: mp.name,
          }))}
          style={{ minWidth: 100 }}
          maxTagCount={0}
          maxTagPlaceholder={(selected) =>
            selected.length === 0
              ? t('inventory.metals.purity')
              : `${selected.length} ${t('common.labels.selected')}`
          }
          allowClear
        />
      )}
    </Space>
  );
}

export default ProductSearchFilters;
