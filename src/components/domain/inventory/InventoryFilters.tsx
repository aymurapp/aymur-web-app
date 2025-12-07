'use client';

/**
 * InventoryFilters Component
 *
 * A collapsible filter panel for the inventory list with comprehensive
 * filtering options including category, metal type/purity, status,
 * price and weight ranges, and boolean filters.
 *
 * Features:
 * - Collapsible panel UI with expand/collapse toggle
 * - Category filter (dropdown from useCategories)
 * - Metal type/purity cascaded dropdowns
 * - Status multi-select with checkboxes
 * - Price and weight range sliders with input fields
 * - Ownership type checkboxes
 * - Boolean filters (hasBarcode, hasStones) with Yes/No/Any toggle
 * - Clear all filters button with active filter count badge
 * - URL synchronization via useInventoryFilters
 * - RTL support with logical properties
 * - Fully internationalized with next-intl
 *
 * @module components/domain/inventory/InventoryFilters
 */

import React, { useCallback, useMemo } from 'react';

import {
  FilterOutlined,
  ClearOutlined,
  DownOutlined,
  UpOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Checkbox,
  Divider,
  Input,
  InputNumber,
  Radio,
  Select,
  Slider,
  Typography,
} from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  useCategories,
  useMetalTypes,
  useMetalPurities,
  useStoneTypes,
  useInventoryFilters,
} from '@/lib/hooks/data';
import { cn } from '@/lib/utils/cn';

import type { RadioChangeEvent } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

const { Text, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the InventoryFilters component
 */
export interface InventoryFiltersProps {
  /**
   * Whether the filter panel is collapsed
   * @default false
   */
  collapsed?: boolean;

  /**
   * Callback when collapse state changes
   */
  onCollapseChange?: (collapsed: boolean) => void;

  /**
   * Additional class name for styling
   */
  className?: string;
}

/**
 * Status options for inventory items
 */
const STATUS_OPTIONS = [
  'available',
  'reserved',
  'sold',
  'workshop',
  'transferred',
  'damaged',
  'returned',
] as const;

/**
 * Ownership type options
 */
const OWNERSHIP_OPTIONS = ['owned', 'consignment', 'memo'] as const;

/**
 * Boolean filter value type
 */
type BooleanFilterValue = 'any' | 'yes' | 'no';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Filter section wrapper with title
 */
interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function FilterSection({ title, children, className }: FilterSectionProps): JSX.Element {
  return (
    <div className={cn('space-y-2', className)}>
      <Text strong className="text-xs uppercase tracking-wide text-stone-500">
        {title}
      </Text>
      {children}
    </div>
  );
}

/**
 * Range filter with slider and input fields
 */
interface RangeFilterProps {
  label: string;
  min?: number;
  max?: number;
  value?: { min?: number; max?: number };
  onChange: (value: { min?: number; max?: number } | undefined) => void;
  step?: number;
  precision?: number;
  unit?: string;
}

function RangeFilter({
  label,
  min = 0,
  max = 10000,
  value,
  onChange,
  step = 1,
  precision = 0,
  unit,
}: RangeFilterProps): JSX.Element {
  const t = useTranslations('common');

  const sliderValue: [number, number] = [value?.min ?? min, value?.max ?? max];

  const handleSliderChange = useCallback(
    (newValue: number[]) => {
      const [newMin, newMax] = newValue;
      const hasChanges = newMin !== min || newMax !== max;
      onChange(
        hasChanges
          ? {
              min: newMin === min ? undefined : newMin,
              max: newMax === max ? undefined : newMax,
            }
          : undefined
      );
    },
    [min, max, onChange]
  );

  const handleMinChange = useCallback(
    (newMin: number | null) => {
      onChange({
        min: newMin ?? undefined,
        max: value?.max,
      });
    },
    [value?.max, onChange]
  );

  const handleMaxChange = useCallback(
    (newMax: number | null) => {
      onChange({
        min: value?.min,
        max: newMax ?? undefined,
      });
    },
    [value?.min, onChange]
  );

  return (
    <div className="space-y-2">
      <Text className="text-xs text-stone-600">{label}</Text>
      <Slider
        range
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={handleSliderChange}
        className="[&_.ant-slider-track]:bg-amber-400 [&_.ant-slider-handle]:border-amber-400"
      />
      <div className="flex items-center gap-2">
        <InputNumber
          size="small"
          min={min}
          max={max}
          step={step}
          precision={precision}
          value={value?.min}
          onChange={handleMinChange}
          placeholder={t('labels.from')}
          addonAfter={unit}
          className="flex-1"
        />
        <span className="text-stone-400">-</span>
        <InputNumber
          size="small"
          min={min}
          max={max}
          step={step}
          precision={precision}
          value={value?.max}
          onChange={handleMaxChange}
          placeholder={t('labels.to')}
          addonAfter={unit}
          className="flex-1"
        />
      </div>
    </div>
  );
}

/**
 * Boolean filter with Yes/No/Any radio buttons
 */
interface BooleanFilterProps {
  label: string;
  value?: boolean;
  onChange: (value: boolean | undefined) => void;
}

function BooleanFilter({ label, value, onChange }: BooleanFilterProps): JSX.Element {
  const t = useTranslations('common');

  const getRadioValue = (): BooleanFilterValue => {
    if (value === undefined) {
      return 'any';
    }
    return value ? 'yes' : 'no';
  };

  const radioValue = getRadioValue();

  const handleChange = useCallback(
    (e: RadioChangeEvent) => {
      const newValue = e.target.value as BooleanFilterValue;
      onChange(newValue === 'any' ? undefined : newValue === 'yes');
    },
    [onChange]
  );

  return (
    <div className="flex items-center justify-between">
      <Text className="text-sm text-stone-700">{label}</Text>
      <Radio.Group
        size="small"
        value={radioValue}
        onChange={handleChange}
        optionType="button"
        buttonStyle="solid"
        className="[&_.ant-radio-button-wrapper-checked]:bg-amber-500 [&_.ant-radio-button-wrapper-checked]:border-amber-500"
      >
        <Radio.Button value="any">{t('labels.all')}</Radio.Button>
        <Radio.Button value="yes">{t('labels.yes')}</Radio.Button>
        <Radio.Button value="no">{t('labels.no')}</Radio.Button>
      </Radio.Group>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * InventoryFilters Component
 *
 * A comprehensive filter panel for inventory items with collapsible sections,
 * cascaded dropdowns, range sliders, and URL synchronization.
 */
export function InventoryFilters({
  collapsed = false,
  onCollapseChange,
  className,
}: InventoryFiltersProps): JSX.Element {
  const t = useTranslations();

  // Filter state management with URL sync
  const { filters, setFilter, resetFilters, hasActiveFilters, activeFilterCount, setSearch } =
    useInventoryFilters({ syncWithUrl: true });

  // Catalog data hooks
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: metalTypes = [], isLoading: metalTypesLoading } = useMetalTypes();
  const { data: metalPurities = [], isLoading: puritiesLoading } = useMetalPurities({
    metalTypeId: filters.id_metal_type?.[0],
  });
  const { data: stoneTypes = [], isLoading: stonesLoading } = useStoneTypes();

  // Toggle collapse state
  const handleCollapseToggle = useCallback(() => {
    onCollapseChange?.(!collapsed);
  }, [collapsed, onCollapseChange]);

  // Handle search input
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [setSearch]
  );

  // Handle status checkbox changes
  const handleStatusChange = useCallback(
    (status: (typeof STATUS_OPTIONS)[number], checked: boolean) => {
      const currentStatus = filters.status || [];
      const newStatus = checked
        ? [...currentStatus, status]
        : currentStatus.filter((s) => s !== status);
      setFilter('status', newStatus.length > 0 ? newStatus : undefined);
    },
    [filters.status, setFilter]
  );

  // Handle ownership type checkbox changes
  const handleOwnershipChange = useCallback(
    (ownership: (typeof OWNERSHIP_OPTIONS)[number], checked: boolean) => {
      const currentOwnership = filters.ownership_type || [];
      const newOwnership = checked
        ? [...currentOwnership, ownership]
        : currentOwnership.filter((o) => o !== ownership);
      setFilter('ownership_type', newOwnership.length > 0 ? newOwnership : undefined);
    },
    [filters.ownership_type, setFilter]
  );

  // Handle category select
  const handleCategoryChange = useCallback(
    (value: string | undefined) => {
      setFilter('id_category', value ? [value] : undefined);
    },
    [setFilter]
  );

  // Handle metal type select (clears purity when metal type changes)
  const handleMetalTypeChange = useCallback(
    (value: string | undefined) => {
      setFilter('id_metal_type', value ? [value] : undefined);
      // Clear purity when metal type changes
      if (filters.id_metal_purity) {
        setFilter('id_metal_purity', undefined);
      }
    },
    [filters.id_metal_purity, setFilter]
  );

  // Handle metal purity select
  const handleMetalPurityChange = useCallback(
    (value: string | undefined) => {
      setFilter('id_metal_purity', value ? [value] : undefined);
    },
    [setFilter]
  );

  // Handle stone type select
  const handleStoneTypeChange = useCallback(
    (value: string | undefined) => {
      setFilter('id_stone_type', value ? [value] : undefined);
    },
    [setFilter]
  );

  // Handle price range change
  const handlePriceRangeChange = useCallback(
    (value: { min?: number; max?: number } | undefined) => {
      setFilter('price_range', value);
    },
    [setFilter]
  );

  // Handle weight range change
  const handleWeightRangeChange = useCallback(
    (value: { min?: number; max?: number } | undefined) => {
      setFilter('weight_range', value);
    },
    [setFilter]
  );

  // Handle boolean filter changes
  const handleHasBarcodeChange = useCallback(
    (value: boolean | undefined) => {
      setFilter('has_barcode', value);
    },
    [setFilter]
  );

  const handleHasStonesChange = useCallback(
    (value: boolean | undefined) => {
      setFilter('has_stones', value);
    },
    [setFilter]
  );

  // Build category options
  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        label: cat.category_name,
        value: cat.id_category,
      })),
    [categories]
  );

  // Build metal type options
  const metalTypeOptions = useMemo(
    () =>
      metalTypes.map((metal) => ({
        label: metal.metal_name,
        value: metal.id_metal_type,
      })),
    [metalTypes]
  );

  // Build metal purity options (filtered by selected metal type)
  const metalPurityOptions = useMemo(
    () =>
      metalPurities.map((purity) => ({
        label: `${purity.purity_name} (${purity.purity_percentage}%)`,
        value: purity.id_purity,
      })),
    [metalPurities]
  );

  // Build stone type options
  const stoneTypeOptions = useMemo(
    () =>
      stoneTypes.map((stone) => ({
        label: stone.stone_name,
        value: stone.id_stone_type,
      })),
    [stoneTypes]
  );

  // Filter panel content
  const filterContent = (
    <div className="space-y-6">
      {/* Search Input */}
      <FilterSection title={t('common.actions.search')}>
        <Input
          prefix={<SearchOutlined className="text-stone-400" />}
          placeholder={t('inventory.select.placeholder')}
          value={filters.search || ''}
          onChange={handleSearchChange}
          allowClear
          className="[&:focus]:border-amber-400 [&:hover]:border-amber-300"
        />
      </FilterSection>

      <Divider className="my-4" />

      {/* Status Filter */}
      <FilterSection title={t('common.labels.status')}>
        <div className="space-y-1">
          {STATUS_OPTIONS.map((status) => (
            <Checkbox
              key={status}
              checked={filters.status?.includes(status) || false}
              onChange={(e: CheckboxChangeEvent) => handleStatusChange(status, e.target.checked)}
              className="block [&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-amber-500 [&_.ant-checkbox-checked_.ant-checkbox-inner]:border-amber-500"
            >
              <Text className="text-sm">{t(`inventory.${status}` as Parameters<typeof t>[0])}</Text>
            </Checkbox>
          ))}
        </div>
      </FilterSection>

      <Divider className="my-4" />

      {/* Category Filter */}
      <FilterSection title={t('common.labels.category')}>
        <Select
          placeholder={t('common.select.placeholder')}
          value={filters.id_category?.[0]}
          onChange={handleCategoryChange}
          options={categoryOptions}
          loading={categoriesLoading}
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
          }
          className="w-full [&.ant-select-focused_.ant-select-selector]:border-amber-400"
        />
      </FilterSection>

      <Divider className="my-4" />

      {/* Metal Type & Purity (Cascaded) */}
      <FilterSection title={t('inventory.metals.title')}>
        <div className="space-y-3">
          <div>
            <Text className="text-xs text-stone-500 mb-1 block">{t('common.labels.type')}</Text>
            <Select
              placeholder={t('common.select.placeholder')}
              value={filters.id_metal_type?.[0]}
              onChange={handleMetalTypeChange}
              options={metalTypeOptions}
              loading={metalTypesLoading}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              className="w-full [&.ant-select-focused_.ant-select-selector]:border-amber-400"
            />
          </div>
          <div>
            <Text className="text-xs text-stone-500 mb-1 block">
              {t('inventory.metals.purity')}
            </Text>
            <Select
              placeholder={t('common.select.placeholder')}
              value={filters.id_metal_purity?.[0]}
              onChange={handleMetalPurityChange}
              options={metalPurityOptions}
              loading={puritiesLoading}
              allowClear
              showSearch
              disabled={!filters.id_metal_type?.length}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              className="w-full [&.ant-select-focused_.ant-select-selector]:border-amber-400"
            />
          </div>
        </div>
      </FilterSection>

      <Divider className="my-4" />

      {/* Stone Type Filter */}
      <FilterSection title={t('inventory.stones.title')}>
        <Select
          placeholder={t('common.select.placeholder')}
          value={filters.id_stone_type?.[0]}
          onChange={handleStoneTypeChange}
          options={stoneTypeOptions}
          loading={stonesLoading}
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
          }
          className="w-full [&.ant-select-focused_.ant-select-selector]:border-amber-400"
        />
      </FilterSection>

      <Divider className="my-4" />

      {/* Price Range */}
      <FilterSection title={t('inventory.pricing.title')}>
        <RangeFilter
          label={t('common.labels.price')}
          min={0}
          max={100000}
          step={100}
          precision={2}
          value={filters.price_range}
          onChange={handlePriceRangeChange}
        />
      </FilterSection>

      <Divider className="my-4" />

      {/* Weight Range */}
      <FilterSection title={t('inventory.metals.weight')}>
        <RangeFilter
          label={t('inventory.metals.grams')}
          min={0}
          max={1000}
          step={0.1}
          precision={2}
          unit="g"
          value={filters.weight_range}
          onChange={handleWeightRangeChange}
        />
      </FilterSection>

      <Divider className="my-4" />

      {/* Ownership Type */}
      <FilterSection title={t('inventory.consignment')}>
        <div className="space-y-1">
          {OWNERSHIP_OPTIONS.map((ownership) => (
            <Checkbox
              key={ownership}
              checked={filters.ownership_type?.includes(ownership) || false}
              onChange={(e: CheckboxChangeEvent) =>
                handleOwnershipChange(ownership, e.target.checked)
              }
              className="block [&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-amber-500 [&_.ant-checkbox-checked_.ant-checkbox-inner]:border-amber-500"
            >
              <Text className="text-sm capitalize">{ownership}</Text>
            </Checkbox>
          ))}
        </div>
      </FilterSection>

      <Divider className="my-4" />

      {/* Boolean Filters */}
      <FilterSection title={t('common.labels.other')}>
        <div className="space-y-3">
          <BooleanFilter
            label={t('inventory.barcode')}
            value={filters.has_barcode}
            onChange={handleHasBarcodeChange}
          />
          <BooleanFilter
            label={t('inventory.stones.title')}
            value={filters.has_stones}
            onChange={handleHasStonesChange}
          />
        </div>
      </FilterSection>
    </div>
  );

  return (
    <div className={cn('bg-white border border-stone-200 rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3',
          'border-b border-stone-200 bg-stone-50',
          'cursor-pointer select-none',
          'hover:bg-stone-100 transition-colors'
        )}
        onClick={handleCollapseToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCollapseToggle();
          }
        }}
        aria-expanded={!collapsed}
        aria-controls="inventory-filters-content"
      >
        <div className="flex items-center gap-2">
          <FilterOutlined className="text-amber-600" />
          <Title level={5} className="!mb-0 !text-sm font-semibold">
            {t('common.actions.filter')}
          </Title>
          {hasActiveFilters && (
            <Badge
              count={activeFilterCount}
              className="[&_.ant-badge-count]:bg-amber-500"
              size="small"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                resetFilters();
              }}
              className="text-stone-500 hover:text-amber-600"
            >
              {t('common.actions.clear')}
            </Button>
          )}
          {collapsed ? (
            <DownOutlined className="text-stone-400" />
          ) : (
            <UpOutlined className="text-stone-400" />
          )}
        </div>
      </div>

      {/* Content */}
      <div
        id="inventory-filters-content"
        className={cn(
          'transition-all duration-300 ease-in-out',
          collapsed ? 'max-h-0 overflow-hidden' : 'max-h-[2000px]'
        )}
      >
        <div className="p-4">{filterContent}</div>
      </div>
    </div>
  );
}

/**
 * Compact filter bar variant for mobile/smaller screens
 */
export function InventoryFiltersCompact({ className }: { className?: string }): JSX.Element {
  const t = useTranslations();
  const { hasActiveFilters, activeFilterCount, resetFilters } = useInventoryFilters({
    syncWithUrl: true,
  });

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 p-3',
        'bg-white border border-stone-200 rounded-lg',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <FilterOutlined className="text-amber-600" />
        <Text strong className="text-sm">
          {t('common.actions.filter')}
        </Text>
        {hasActiveFilters && (
          <Badge
            count={activeFilterCount}
            className="[&_.ant-badge-count]:bg-amber-500"
            size="small"
          />
        )}
      </div>
      {hasActiveFilters && (
        <Button
          type="text"
          size="small"
          icon={<ClearOutlined />}
          onClick={resetFilters}
          className="text-stone-500 hover:text-amber-600"
        >
          {t('common.actions.clear')}
        </Button>
      )}
    </div>
  );
}

export default InventoryFilters;
