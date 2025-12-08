'use client';

/**
 * Sales List Page
 *
 * Main sales history page with filtering, search, and statistics.
 * Displays all sales for the current shop with various view options.
 *
 * Features:
 * - Sales statistics summary cards
 * - Table view on desktop, card view on mobile
 * - Comprehensive filtering (date, status, payment, customer)
 * - Search by sale number
 * - Pagination with total count
 * - Quick actions (view, print, void)
 * - Link to POS for new sale
 *
 * @module app/(platform)/[locale]/[shopId]/sales/page
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
  PlusOutlined,
  FilterOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { Input, Badge, Space, Dropdown, Pagination } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { SalesFilters, type SalesFiltersState } from '@/components/domain/sales/SalesFilters';
import { SalesList } from '@/components/domain/sales/SalesList';
import { SalesStats } from '@/components/domain/sales/SalesStats';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useSales, type SaleStatus, type PaymentStatus } from '@/lib/hooks/data/useSales';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { useDebounce } from '@/lib/hooks/utils/useDebounce';
import { useMobile } from '@/lib/hooks/utils/useMediaQuery';
import { useRouter } from '@/lib/i18n/navigation';

import type { MenuProps } from 'antd';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Debounce delay for search input in milliseconds */
const SEARCH_DEBOUNCE_MS = 300;

/** Page size for pagination */
const PAGE_SIZE = 20;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Sales Page Component
 *
 * Displays sales history in a responsive layout with:
 * - Statistics summary at the top
 * - Filtering and search capabilities
 * - Table view on desktop, cards on mobile
 * - Pagination
 */
export default function SalesPage(): JSX.Element {
  const t = useTranslations('sales');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { can } = usePermissions();
  const { shopId } = useShop();
  const isMobile = useMobile();

  // ==========================================================================
  // STATE
  // ==========================================================================

  // Search state with debounce
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);

  // Filter panel visibility
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // Filter state
  const [filters, setFilters] = useState<SalesFiltersState>({
    dateRange: undefined,
    saleStatus: undefined,
    paymentStatus: undefined,
    customerId: undefined,
  });

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { sales, totalCount, totalPages, isInitialLoading, isFetching, error, refetch } = useSales({
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
    sortBy: 'sale_date',
    sortDirection: 'desc',
    saleStatus: filters.saleStatus as SaleStatus | SaleStatus[] | undefined,
    paymentStatus: filters.paymentStatus as PaymentStatus | PaymentStatus[] | undefined,
    customerId: filters.customerId,
    dateRange: filters.dateRange,
    includeCustomer: true,
  });

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const hasActiveFilters = useMemo(() => {
    return (
      !!filters.dateRange?.startDate ||
      !!filters.dateRange?.endDate ||
      !!filters.saleStatus ||
      !!filters.paymentStatus ||
      !!filters.customerId ||
      !!debouncedSearch
    );
  }, [filters, debouncedSearch]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateRange?.startDate || filters.dateRange?.endDate) {
      count++;
    }
    if (filters.saleStatus) {
      count++;
    }
    if (filters.paymentStatus) {
      count++;
    }
    if (filters.customerId) {
      count++;
    }
    return count;
  }, [filters]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleNewSale = useCallback(() => {
    router.push(`/${shopId}/sales/pos`);
  }, [shopId, router]);

  const handleSaleClick = useCallback(
    (saleId: string) => {
      router.push(`/${shopId}/sales/${saleId}`);
    },
    [shopId, router]
  );

  const handleFilterChange = useCallback((newFilters: SalesFiltersState) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      dateRange: undefined,
      saleStatus: undefined,
      paymentStatus: undefined,
      customerId: undefined,
    });
    setSearchInput('');
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleExport = useCallback((format: 'csv' | 'pdf') => {
    // TODO: Implement export functionality
    console.log('Export as:', format);
  }, []);

  // Export menu items
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'csv',
      label: tCommon('actions.export') + ' CSV',
      onClick: () => handleExport('csv'),
    },
    {
      key: 'pdf',
      label: tCommon('actions.export') + ' PDF',
      onClick: () => handleExport('pdf'),
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Error state
  if (error && !sales.length) {
    return (
      <div className="sales-page">
        <PageHeader title={t('title')} />
        <EmptyState
          title={tCommon('messages.error')}
          description={error?.message || tCommon('messages.unexpectedError')}
          action={{
            label: tCommon('messages.tryAgain'),
            onClick: () => refetch(),
          }}
        />
      </div>
    );
  }

  return (
    <div className="sales-page">
      {/* Page Header */}
      <PageHeader title={t('title')}>
        <Space wrap>
          {/* Export Button */}
          {can('sales.export') && (
            <Dropdown menu={{ items: exportMenuItems }} trigger={['click']}>
              <Button icon={<DownloadOutlined />}>{tCommon('actions.export')}</Button>
            </Dropdown>
          )}

          {/* New Sale Button */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleNewSale}
            permission="sales.create"
          >
            {t('newSale')}
          </Button>
        </Space>
      </PageHeader>

      {/* Statistics Summary */}
      <div className="mb-6">
        <SalesStats />
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Search Input */}
          <Input
            placeholder={t('searchSale')}
            prefix={<SearchOutlined className="text-stone-400" />}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            allowClear
            className="w-full sm:w-64"
          />

          {/* Filter Toggle and Results Count */}
          <div className="flex items-center gap-3">
            {/* Results Count */}
            {!isInitialLoading && (
              <span className="text-sm text-stone-500">
                {totalCount} {totalCount === 1 ? t('sale') : t('sales')}
              </span>
            )}

            {/* Filter Toggle */}
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
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <SalesFilters
            filters={filters}
            onChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Active Filters Summary */}
        {hasActiveFilters && !showFilters && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-500">
              {activeFilterCount} {tCommon('actions.filter').toLowerCase()}(s) active
            </span>
            <Button
              type="link"
              size="small"
              onClick={handleClearFilters}
              className="px-0 text-stone-500 hover:text-stone-700"
            >
              {tCommon('actions.clear')}
            </Button>
          </div>
        )}
      </div>

      {/* Sales List */}
      {isInitialLoading ? (
        <SalesList sales={[]} isLoading onSaleClick={handleSaleClick} isMobile={isMobile} />
      ) : sales.length === 0 ? (
        <EmptyState
          icon={<ShoppingCartOutlined />}
          title={hasActiveFilters ? tCommon('messages.noResults') : tCommon('messages.noData')}
          description={hasActiveFilters ? tCommon('messages.tryAgain') : t('noSalesDescription')}
          action={
            hasActiveFilters
              ? {
                  label: tCommon('actions.clear'),
                  onClick: handleClearFilters,
                  type: 'default',
                }
              : can('sales.create')
                ? {
                    label: t('newSale'),
                    onClick: handleNewSale,
                    icon: <PlusOutlined />,
                    permission: 'sales.create',
                  }
                : undefined
          }
          size="lg"
        />
      ) : (
        <>
          <SalesList
            sales={sales}
            isLoading={isFetching && !isInitialLoading}
            onSaleClick={handleSaleClick}
            isMobile={isMobile}
          />

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
                  tCommon('pagination.showing', {
                    from: range[0],
                    to: range[1],
                    total,
                  })
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
