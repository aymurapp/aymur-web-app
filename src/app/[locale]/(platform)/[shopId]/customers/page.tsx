'use client';

/**
 * Customers Page
 *
 * Main customers listing page with contact card grid layout.
 * Displays customer information in a searchable, filterable grid.
 *
 * Features:
 * - Contact card grid using CustomerCard component
 * - Search by name or phone
 * - Filter by client type, financial status, VIP, and balance
 * - Responsive grid layout (1/2/3 columns)
 * - Loading skeletons for cards
 * - Empty state when no customers
 * - Quick add customer button with permission check
 * - Add/Edit customer drawer with CustomerForm
 *
 * @module app/(platform)/[locale]/[shopId]/customers/page
 */

import React, { useState, useMemo, useCallback } from 'react';

import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  UserOutlined,
  BankOutlined,
  CrownOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { Input, Segmented, Switch, Pagination, Badge, Skeleton, Card, Drawer } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { CustomerForm } from '@/components/domain/customers';
import { CustomerCard } from '@/components/domain/customers/CustomerCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useCustomers, type Customer } from '@/lib/hooks/data/useCustomers';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

type ClientTypeFilter = 'all' | 'individual' | 'company';
type FinancialStatusFilter = 'all' | 'good' | 'warning' | 'critical';

interface FilterState {
  clientType: ClientTypeFilter;
  financialStatus: FinancialStatusFilter;
  vipOnly: boolean;
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
 * Customer card skeleton for loading state
 */
function CustomerCardSkeleton(): React.JSX.Element {
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
 * Grid of customer card skeletons
 */
function CustomerGridSkeleton({ count = 6 }: { count?: number }): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <CustomerCardSkeleton key={index} />
      ))}
    </div>
  );
}

// =============================================================================
// FILTER COMPONENTS
// =============================================================================

/**
 * Client type segmented filter
 */
function ClientTypeSegmented({
  value,
  onChange,
  t,
}: {
  value: ClientTypeFilter;
  onChange: (value: ClientTypeFilter) => void;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const tCommon = useTranslations('common');

  const options = [
    {
      label: tCommon('labels.all'),
      value: 'all' as const,
      icon: <UserOutlined />,
    },
    {
      label: t('segments.retail'),
      value: 'individual' as const,
      icon: <UserOutlined />,
    },
    {
      label: t('segments.wholesale'),
      value: 'company' as const,
      icon: <BankOutlined />,
    },
  ];

  return (
    <Segmented
      options={options}
      value={value}
      onChange={(val) => onChange(val as ClientTypeFilter)}
      className="bg-stone-100"
    />
  );
}

/**
 * Financial status segmented filter
 */
function FinancialStatusSegmented({
  value,
  onChange,
}: {
  value: FinancialStatusFilter;
  onChange: (value: FinancialStatusFilter) => void;
}): React.JSX.Element {
  const tCommon = useTranslations('common');

  const options = [
    {
      label: tCommon('labels.all'),
      value: 'all' as const,
    },
    {
      label: <span className="text-emerald-600">{tCommon('status.active')}</span>,
      value: 'good' as const,
    },
    {
      label: <span className="text-amber-600">{tCommon('messages.warning')}</span>,
      value: 'warning' as const,
    },
    {
      label: <span className="text-red-600">{tCommon('status.suspended')}</span>,
      value: 'critical' as const,
    },
  ];

  return (
    <Segmented
      options={options}
      value={value}
      onChange={(val) => onChange(val as FinancialStatusFilter)}
      className="bg-stone-100"
    />
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Customers Page Component
 *
 * Client component that displays a grid of customer cards with
 * search, filtering, and pagination capabilities.
 */
export default function CustomersPage(): React.JSX.Element {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    clientType: 'all',
    financialStatus: 'all',
    vipOnly: false,
    hasBalance: false,
  });

  // Drawer state for add/edit customer
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

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

  const { customers, totalCount, totalPages, isInitialLoading, isFetching, refetch } = useCustomers(
    {
      search: debouncedSearch,
      page,
      pageSize: PAGE_SIZE,
      sortBy: 'full_name',
      sortDirection: 'asc',
      clientType: filters.clientType === 'all' ? undefined : filters.clientType,
      financialStatus: filters.financialStatus === 'all' ? undefined : filters.financialStatus,
    }
  );

  // ==========================================================================
  // FILTERED CUSTOMERS (Client-side filtering for VIP and hasBalance)
  // ==========================================================================

  const filteredCustomers = useMemo(() => {
    let result = customers;

    // Filter VIP only (client-side until is_vip is in database)
    if (filters.vipOnly) {
      result = result.filter((c) => (c as Customer & { is_vip?: boolean }).is_vip === true);
    }

    // Filter customers with balance
    if (filters.hasBalance) {
      result = result.filter((c) => c.current_balance !== 0);
    }

    return result;
  }, [customers, filters.vipOnly, filters.hasBalance]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleCustomerClick = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsFormDrawerOpen(true);
  }, []);

  const handleAddCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setIsFormDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setIsFormDrawerOpen(false);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setIsFormDrawerOpen(false);
    refetch();
  }, [refetch]);

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
      clientType: 'all',
      financialStatus: 'all',
      vipOnly: false,
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
      filters.clientType !== 'all' ||
      filters.financialStatus !== 'all' ||
      filters.vipOnly ||
      filters.hasBalance ||
      debouncedSearch.length > 0
    );
  }, [filters, debouncedSearch]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.clientType !== 'all') {
      count++;
    }
    if (filters.financialStatus !== 'all') {
      count++;
    }
    if (filters.vipOnly) {
      count++;
    }
    if (filters.hasBalance) {
      count++;
    }
    return count;
  }, [filters]);

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

    if (can('customers.create')) {
      return {
        label: t('addCustomer'),
        onClick: handleAddCustomer,
        icon: <PlusOutlined />,
        permission: 'customers.create',
      };
    }

    return undefined;
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="customers-page">
      {/* Page Header */}
      <PageHeader title={t('title')}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddCustomer}
          permission="customers.create"
        >
          {t('addCustomer')}
        </Button>
      </PageHeader>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        {/* Search Input and Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={t('searchCustomer')}
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
            {/* Client Type Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm font-medium text-stone-600 min-w-[100px]">
                {tCommon('labels.type')}:
              </span>
              <ClientTypeSegmented
                value={filters.clientType}
                onChange={(value) => handleFilterChange('clientType', value)}
                t={t}
              />
            </div>

            {/* Financial Status Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm font-medium text-stone-600 min-w-[100px]">
                {tCommon('labels.status')}:
              </span>
              <FinancialStatusSegmented
                value={filters.financialStatus}
                onChange={(value) => handleFilterChange('financialStatus', value)}
              />
            </div>

            {/* Toggle Filters */}
            <div className="flex flex-wrap gap-6">
              {/* VIP Only Toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={filters.vipOnly}
                  onChange={(checked) => handleFilterChange('vipOnly', checked)}
                  size="small"
                />
                <span className="text-sm text-stone-600 flex items-center gap-1">
                  <CrownOutlined className="text-amber-500" />
                  {t('segments.vip')}
                </span>
              </div>

              {/* Has Balance Toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={filters.hasBalance}
                  onChange={(checked) => handleFilterChange('hasBalance', checked)}
                  size="small"
                />
                <span className="text-sm text-stone-600 flex items-center gap-1">
                  <DollarOutlined className="text-emerald-600" />
                  {t('creditAccount.balance')}
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

      {/* Customer Grid */}
      {isInitialLoading ? (
        <CustomerGridSkeleton count={6} />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<UserOutlined />}
          title={hasActiveFilters ? tCommon('messages.noResults') : tCommon('messages.noData')}
          description={hasActiveFilters ? tCommon('messages.tryAgain') : t('customerList')}
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
            {filteredCustomers.map((customer) => (
              <CustomerCard
                key={customer.id_customer}
                customer={customer}
                onClick={handleCustomerClick}
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

      {/* Add/Edit Customer Drawer */}
      <Drawer
        open={isFormDrawerOpen}
        onClose={handleDrawerClose}
        title={selectedCustomer ? t('editCustomer') : t('addCustomer')}
        width={600}
        placement="right"
        destroyOnClose
      >
        <CustomerForm
          customer={selectedCustomer ?? undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleDrawerClose}
        />
      </Drawer>
    </div>
  );
}
