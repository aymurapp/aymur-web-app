'use client';

/**
 * Suppliers Page
 *
 * Main suppliers listing page with contact card grid layout.
 * Displays supplier information in a searchable, filterable grid.
 *
 * Features:
 * - Contact card grid using SupplierCard component
 * - Search by company name or contact
 * - Category filter dropdown
 * - Status filter (active/inactive)
 * - Balance indicators with color coding
 * - Quick add button in PageHeader
 * - Click row to navigate to detail page
 * - Loading skeletons for cards
 * - Empty state when no suppliers
 *
 * @module app/(platform)/[locale]/[shopId]/suppliers/page
 */

import React, { useState, useMemo, useCallback } from 'react';

import { useParams } from 'next/navigation';

import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { Input, Segmented, Switch, Pagination, Badge, Skeleton, Card, Select } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { SupplierCard, SupplierForm } from '@/components/domain/suppliers';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useSuppliers, useSupplierCategories, type Supplier } from '@/lib/hooks/data/useSuppliers';
import { usePermissions } from '@/lib/hooks/permissions';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

type StatusFilter = 'all' | 'active' | 'inactive';

interface FilterState {
  status: StatusFilter;
  category: string | null;
  hasBalance: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PAGE_SIZE = 12;

// =============================================================================
// LOADING SKELETON COMPONENT
// =============================================================================

/**
 * Supplier card skeleton for loading state
 */
function SupplierCardSkeleton(): React.JSX.Element {
  return (
    <Card className="border border-stone-200 bg-white">
      <div className="flex gap-4">
        <Skeleton.Avatar active size={64} />
        <div className="flex-1 min-w-0">
          <Skeleton.Input active size="small" className="!w-40 !min-w-0 mb-2" />
          <Skeleton.Input active size="small" className="!w-32 !min-w-0 mb-2" />
          <div className="flex gap-2">
            <Skeleton.Button active size="small" className="!w-20" />
            <Skeleton.Button active size="small" className="!w-16" />
          </div>
        </div>
        <div className="flex-shrink-0 text-end">
          <Skeleton.Input active size="small" className="!w-16 !min-w-0 mb-1" />
          <Skeleton.Input active size="default" className="!w-24 !min-w-0" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Grid of supplier card skeletons
 */
function SupplierGridSkeleton({ count = 6 }: { count?: number }): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <SupplierCardSkeleton key={index} />
      ))}
    </div>
  );
}

// =============================================================================
// FILTER COMPONENTS
// =============================================================================

/**
 * Status segmented filter
 */
function StatusSegmented({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}): React.JSX.Element {
  const tCommon = useTranslations('common');

  const options = [
    {
      label: tCommon('labels.all'),
      value: 'all' as const,
    },
    {
      label: (
        <span className="flex items-center gap-1">
          <CheckCircleOutlined className="text-emerald-600" />
          {tCommon('status.active')}
        </span>
      ),
      value: 'active' as const,
    },
    {
      label: (
        <span className="flex items-center gap-1">
          <CloseCircleOutlined className="text-stone-400" />
          {tCommon('status.inactive')}
        </span>
      ),
      value: 'inactive' as const,
    },
  ];

  return (
    <Segmented
      options={options}
      value={value}
      onChange={(val) => onChange(val as StatusFilter)}
      className="bg-stone-100"
    />
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Suppliers Page Component
 *
 * Client component that displays a grid of supplier cards with
 * search, filtering, and pagination capabilities.
 */
export default function SuppliersPage(): React.JSX.Element {
  const t = useTranslations('suppliers');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();
  const router = useRouter();
  const params = useParams();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    category: null,
    hasBalance: false,
  });

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // ==========================================================================
  // DEBOUNCED SEARCH
  // ==========================================================================

  // Debounce search input
  const handleSearchChange = useCallback((value: string): (() => void) => {
    setSearch(value);
    // Reset to page 1 when searching
    setPage(1);

    // Debounce the actual search
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, []);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { suppliers, totalCount, totalPages, isInitialLoading, isFetching } = useSuppliers({
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
    sortBy: 'company_name',
    sortDirection: 'asc',
    isActive: filters.status === 'all' ? undefined : filters.status === 'active',
    categoryId: filters.category || undefined,
  });

  // Fetch categories for filter dropdown
  const { data: categories, isLoading: categoriesLoading } = useSupplierCategories();

  // ==========================================================================
  // FILTERED SUPPLIERS (Client-side filtering for hasBalance)
  // ==========================================================================

  const filteredSuppliers = useMemo(() => {
    let result = suppliers;

    // Filter suppliers with balance
    if (filters.hasBalance) {
      result = result.filter((s) => s.current_balance !== 0);
    }

    return result;
  }, [suppliers, filters.hasBalance]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSupplierClick = useCallback(
    (supplier: Supplier) => {
      // Navigate to supplier detail page
      router.push(`/${params.locale}/${params.shopId}/suppliers/${supplier.id_supplier}`);
    },
    [router, params.locale, params.shopId]
  );

  const handleAddSupplier = useCallback(() => {
    setSelectedSupplier(null);
    setIsFormModalOpen(true);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setIsFormModalOpen(false);
    setSelectedSupplier(null);
  }, []);

  const handleFormCancel = useCallback(() => {
    setIsFormModalOpen(false);
    setSelectedSupplier(null);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    // Scroll to top of grid
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleFilterChange = useCallback(
    (key: keyof FilterState, value: FilterState[keyof FilterState]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1); // Reset to first page when filter changes
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      category: null,
      hasBalance: false,
    });
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  }, []);

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const hasActiveFilters = useMemo(() => {
    return (
      filters.status !== 'all' ||
      filters.category !== null ||
      filters.hasBalance ||
      debouncedSearch.length > 0
    );
  }, [filters, debouncedSearch]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') {
      count++;
    }
    if (filters.category !== null) {
      count++;
    }
    if (filters.hasBalance) {
      count++;
    }
    return count;
  }, [filters]);

  // Category options for filter
  const categoryOptions = useMemo(() => {
    if (!categories) {
      return [];
    }
    return categories.map((cat) => ({
      label: cat.category_name,
      value: cat.id_supplier_category,
    }));
  }, [categories]);

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  const getEmptyStateAction = () => {
    if (hasActiveFilters) {
      return {
        label: tCommon('actions.clear'),
        onClick: handleClearFilters,
        type: 'default' as const,
      };
    }

    if (can('suppliers.manage')) {
      return {
        label: t('addSupplier'),
        onClick: handleAddSupplier,
        icon: <PlusOutlined />,
        permission: 'suppliers.manage',
      };
    }

    return undefined;
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="suppliers-page">
      {/* Page Header */}
      <PageHeader title={t('title')}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddSupplier}
          permission="suppliers.manage"
        >
          {t('addSupplier')}
        </Button>
      </PageHeader>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        {/* Search Input and Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={t('searchSupplier')}
            prefix={<SearchOutlined className="text-stone-400" />}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            allowClear
            className="flex-1 max-w-md"
            size="large"
          />

          <Badge count={activeFilterCount} size="small" offset={[-5, 5]}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowFilters(!showFilters)}
              type={showFilters ? 'primary' : 'default'}
            >
              {tCommon('actions.filter')}
            </Button>
          </Badge>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-stone-50 rounded-lg p-4 border border-stone-200 space-y-4">
            {/* Status Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm font-medium text-stone-600 min-w-[100px]">
                {tCommon('labels.status')}:
              </span>
              <StatusSegmented
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm font-medium text-stone-600 min-w-[100px]">
                {tCommon('labels.category')}:
              </span>
              <Select
                placeholder={t('placeholders.category')}
                value={filters.category}
                onChange={(value) => handleFilterChange('category', value)}
                options={categoryOptions}
                loading={categoriesLoading}
                allowClear
                className="w-full sm:w-[240px]"
                popupMatchSelectWidth={false}
              />
            </div>

            {/* Toggle Filters */}
            <div className="flex flex-wrap gap-6">
              {/* Has Balance Toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={filters.hasBalance}
                  onChange={(checked) => handleFilterChange('hasBalance', checked)}
                  size="small"
                />
                <span className="text-sm text-stone-600 flex items-center gap-1">
                  <DollarOutlined className="text-amber-600" />
                  {t('hasBalance')}
                </span>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="pt-2 border-t border-stone-200">
                <Button
                  type="link"
                  onClick={handleClearFilters}
                  className="px-0 text-stone-500 hover:text-stone-700"
                >
                  {tCommon('actions.clear')} {tCommon('actions.filter').toLowerCase()}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      {!isInitialLoading && (
        <div className="mb-4 text-sm text-stone-500">
          {tCommon('pagination.showing', {
            from: Math.min((page - 1) * PAGE_SIZE + 1, totalCount),
            to: Math.min(page * PAGE_SIZE, totalCount),
            total: totalCount,
          })}
        </div>
      )}

      {/* Supplier Grid */}
      {isInitialLoading ? (
        <SupplierGridSkeleton count={6} />
      ) : filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={<ShopOutlined />}
          title={hasActiveFilters ? tCommon('messages.noResults') : tCommon('messages.noData')}
          description={hasActiveFilters ? tCommon('messages.tryAgain') : t('supplierList')}
          action={getEmptyStateAction()}
          size="lg"
        />
      ) : (
        <>
          {/* Card Grid */}
          <div
            className={cn(
              'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
              isFetching && 'opacity-60 pointer-events-none'
            )}
          >
            {filteredSuppliers.map((supplier) => (
              <SupplierCard
                key={supplier.id_supplier}
                supplier={supplier}
                onClick={handleSupplierClick}
                showBalance
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                current={page}
                total={totalCount}
                pageSize={PAGE_SIZE}
                onChange={handlePageChange}
                showSizeChanger={false}
                showQuickJumper={totalPages > 10}
                showTotal={(total, range) =>
                  tCommon('pagination.showTotal', {
                    start: range[0],
                    end: range[1],
                    total,
                  })
                }
              />
            </div>
          )}
        </>
      )}

      {/* Add/Edit Supplier Modal */}
      <Modal
        open={isFormModalOpen}
        onCancel={handleFormCancel}
        title={selectedSupplier ? t('editSupplier') : t('addSupplier')}
        width={720}
        hideFooter
        destroyOnClose
      >
        <SupplierForm
          supplier={selectedSupplier ?? undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>
    </div>
  );
}
