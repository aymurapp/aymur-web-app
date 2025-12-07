'use client';

/**
 * Expenses Page
 *
 * Main expenses listing page with data table, filters, and summary statistics.
 * Displays expense information in a searchable, filterable table.
 *
 * Features:
 * - DataTable with expenses using useExpenses hook
 * - Filters: category, date range, approval status, payment status
 * - Columns: date, description, category, amount, vendor, approval_status, payment_status
 * - Approval status badges (pending=yellow, approved=green, rejected=red)
 * - Quick actions: view, approve, reject (based on permissions)
 * - Add expense button
 * - Summary cards at top (total, pending, approved this month)
 *
 * @module app/(platform)/[locale]/[shopId]/expenses/page
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
/* CalendarOutlined removed - unused */
import {
  Input,
  Table,
  Tag,
  DatePicker,
  Select,
  Badge,
  Tooltip,
  Space,
  Dropdown,
  message,
} from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { StatCard, StatCardGrid } from '@/components/common/data/StatCard';
import { ExpenseApprovalModal } from '@/components/domain/expenses/ExpenseApprovalModal';
import { ExpenseForm } from '@/components/domain/expenses/ExpenseForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  useExpenses,
  useExpenseCategories,
  useApproveExpense,
  useRejectExpense,
  type ExpenseWithCategory,
} from '@/lib/hooks/data/useExpenses';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';

import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { RangePicker } = DatePicker;

// =============================================================================
// TYPES
// =============================================================================

type ApprovalStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type PaymentStatusFilter = 'all' | 'unpaid' | 'partial' | 'paid';

interface FilterState {
  category: string | null;
  approvalStatus: ApprovalStatusFilter;
  paymentStatus: PaymentStatusFilter;
  dateRange: [string, string] | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PAGE_SIZE = 20;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get tag color for approval status
 */
function getApprovalStatusColor(status: string | null): string {
  switch (status) {
    case 'approved':
      return 'green';
    case 'rejected':
      return 'red';
    case 'pending':
    default:
      return 'gold';
  }
}

/**
 * Get tag color for payment status
 */
function getPaymentStatusColor(status: string | null): string {
  switch (status) {
    case 'paid':
      return 'green';
    case 'partial':
      return 'blue';
    case 'unpaid':
    default:
      return 'default';
  }
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date string
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Expenses Page Component
 *
 * Client component that displays a table of expenses with
 * search, filtering, and pagination capabilities.
 */
export default function ExpensesPage(): React.JSX.Element {
  const t = useTranslations('expenses');
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
    category: null,
    approvalStatus: 'all',
    paymentStatus: 'all',
    dateRange: null,
  });

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithCategory | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithCategory | null>(null);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { data: categories = [] } = useExpenseCategories();

  const { expenses, totalCount, isInitialLoading, isFetching, refetch } = useExpenses({
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
    sortBy: 'expense_date',
    sortDirection: 'desc',
    categoryId: filters.category || undefined,
    approvalStatus: filters.approvalStatus === 'all' ? undefined : filters.approvalStatus,
    paymentStatus: filters.paymentStatus === 'all' ? undefined : filters.paymentStatus,
    startDate: filters.dateRange?.[0] || undefined,
    endDate: filters.dateRange?.[1] || undefined,
  });

  // Mutations
  const approveExpense = useApproveExpense();
  const rejectExpense = useRejectExpense();

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalAmount = 0;
    let pendingCount = 0;
    let approvedThisMonth = 0;

    expenses.forEach((expense) => {
      totalAmount += expense.amount;
      if (expense.approval_status === 'pending') {
        pendingCount++;
      }
      if (
        expense.approval_status === 'approved' &&
        new Date(expense.expense_date) >= startOfMonth
      ) {
        approvedThisMonth += expense.amount;
      }
    });

    return {
      totalAmount,
      pendingCount,
      approvedThisMonth,
    };
  }, [expenses]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.category !== null ||
      filters.approvalStatus !== 'all' ||
      filters.paymentStatus !== 'all' ||
      filters.dateRange !== null ||
      debouncedSearch.length > 0
    );
  }, [filters, debouncedSearch]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category !== null) {
      count++;
    }
    if (filters.approvalStatus !== 'all') {
      count++;
    }
    if (filters.paymentStatus !== 'all') {
      count++;
    }
    if (filters.dateRange !== null) {
      count++;
    }
    return count;
  }, [filters]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);

    const timeoutId = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, []);

  const handleFilterChange = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters({
      category: null,
      approvalStatus: 'all',
      paymentStatus: 'all',
      dateRange: null,
    });
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  }, []);

  const handleAddExpense = useCallback(() => {
    setEditingExpense(null);
    setFormOpen(true);
  }, []);

  const handleViewExpense = useCallback((expense: ExpenseWithCategory) => {
    setSelectedExpense(expense);
    setApprovalModalOpen(true);
  }, []);

  const handleApprove = useCallback(
    async (expenseId: string) => {
      try {
        await approveExpense.mutateAsync(expenseId);
        message.success(tCommon('messages.operationSuccess'));
        refetch();
      } catch {
        message.error(tCommon('messages.operationFailed'));
      }
    },
    [approveExpense, tCommon, refetch]
  );

  const handleReject = useCallback(
    async (expenseId: string, reason: string) => {
      try {
        await rejectExpense.mutateAsync({ expenseId, reason });
        message.success(tCommon('messages.operationSuccess'));
        refetch();
        setApprovalModalOpen(false);
      } catch {
        message.error(tCommon('messages.operationFailed'));
      }
    },
    [rejectExpense, tCommon, refetch]
  );

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditingExpense(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setFormOpen(false);
    setEditingExpense(null);
    refetch();
  }, [refetch]);

  const handleApprovalModalClose = useCallback(() => {
    setApprovalModalOpen(false);
    setSelectedExpense(null);
  }, []);

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================

  const getActionMenuItems = useCallback(
    (expense: ExpenseWithCategory): MenuProps['items'] => {
      const items: MenuProps['items'] = [
        {
          key: 'view',
          icon: <EyeOutlined />,
          label: tCommon('actions.view'),
          onClick: () => handleViewExpense(expense),
        },
      ];

      if (expense.approval_status === 'pending' && can('expenses.approve')) {
        items.push(
          {
            key: 'approve',
            icon: <CheckOutlined />,
            label: tCommon('status.approved'),
            onClick: () => handleApprove(expense.id_expense),
          },
          {
            key: 'reject',
            icon: <CloseOutlined />,
            label: tCommon('status.rejected'),
            onClick: () => handleViewExpense(expense),
          }
        );
      }

      return items;
    },
    [can, handleApprove, handleViewExpense, tCommon]
  );

  const columns: ColumnsType<ExpenseWithCategory> = useMemo(
    () => [
      {
        title: t('date'),
        dataIndex: 'expense_date',
        key: 'expense_date',
        width: 120,
        render: (date: string) => <span className="text-stone-600">{formatDate(date)}</span>,
      },
      {
        title: t('description'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (description: string, record: ExpenseWithCategory) => (
          <div>
            <div className="font-medium text-stone-900">{description}</div>
            {record.expense_number && (
              <div className="text-xs text-stone-400">{record.expense_number}</div>
            )}
          </div>
        ),
      },
      {
        title: t('category'),
        dataIndex: ['expense_categories', 'category_name'],
        key: 'category',
        width: 150,
        render: (_: unknown, record: ExpenseWithCategory) => (
          <Tag className="border-amber-200 bg-amber-50 text-amber-700">
            {record.expense_categories?.category_name || '-'}
          </Tag>
        ),
      },
      {
        title: t('amount'),
        dataIndex: 'amount',
        key: 'amount',
        width: 130,
        align: 'end',
        render: (amount: number) => (
          <span className="font-semibold text-stone-900">{formatCurrency(amount)}</span>
        ),
      },
      {
        title: t('vendor'),
        dataIndex: 'vendor_name',
        key: 'vendor_name',
        width: 150,
        ellipsis: true,
        render: (vendor: string | null) => <span className="text-stone-600">{vendor || '-'}</span>,
      },
      {
        title: t('status.pending').replace(' Approval', ''),
        dataIndex: 'approval_status',
        key: 'approval_status',
        width: 120,
        render: (status: string | null) => (
          <Tag color={getApprovalStatusColor(status)}>
            {tCommon(`status.${status || 'pending'}`)}
          </Tag>
        ),
      },
      {
        title: t('status.paid'),
        dataIndex: 'payment_status',
        key: 'payment_status',
        width: 100,
        render: (status: string | null) => (
          <Tag color={getPaymentStatusColor(status)}>
            {status === 'partial'
              ? tCommon('status.processing')
              : tCommon(`status.${status || 'pending'}`)}
          </Tag>
        ),
      },
      {
        title: tCommon('actions.view'),
        key: 'actions',
        width: 80,
        align: 'center',
        render: (_: unknown, record: ExpenseWithCategory) => (
          <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
            <Button type="text" size="small">
              ...
            </Button>
          </Dropdown>
        ),
      },
    ],
    [t, tCommon, getActionMenuItems]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="expenses-page">
      {/* Page Header */}
      <PageHeader title={t('title')}>
        <Space>
          <Tooltip title={tCommon('actions.refresh')}>
            <Button icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()} />
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddExpense}
            permission="expenses.create"
          >
            {t('addExpense')}
          </Button>
        </Space>
      </PageHeader>

      {/* Summary Cards */}
      <StatCardGrid columns={3} className="mb-6">
        <StatCard
          title={tCommon('labels.total')}
          value={formatCurrency(summaryStats.totalAmount)}
          prefix={<DollarOutlined className="text-amber-500" />}
          loading={isInitialLoading}
        />
        <StatCard
          title={t('status.pending')}
          value={summaryStats.pendingCount}
          prefix={<ClockCircleOutlined className="text-amber-500" />}
          loading={isInitialLoading}
        />
        <StatCard
          title={`${t('status.approved')} ${tCommon('time.thisMonth')}`}
          value={formatCurrency(summaryStats.approvedThisMonth)}
          prefix={<CheckCircleOutlined className="text-emerald-500" />}
          loading={isInitialLoading}
        />
      </StatCardGrid>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={`${tCommon('actions.search')}...`}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('category')}
                </label>
                <Select
                  placeholder={tCommon('select.placeholder')}
                  value={filters.category}
                  onChange={(value) => handleFilterChange('category', value)}
                  allowClear
                  className="w-full"
                  options={categories.map((cat) => ({
                    label: cat.category_name,
                    value: cat.id_expense_category,
                  }))}
                />
              </div>

              {/* Approval Status Filter */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('approvedBy')}
                </label>
                <Select
                  value={filters.approvalStatus}
                  onChange={(value) => handleFilterChange('approvalStatus', value)}
                  className="w-full"
                  options={[
                    { label: tCommon('labels.all'), value: 'all' },
                    { label: tCommon('status.pending'), value: 'pending' },
                    { label: tCommon('status.approved'), value: 'approved' },
                    { label: tCommon('status.rejected'), value: 'rejected' },
                  ]}
                />
              </div>

              {/* Payment Status Filter */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('status.paid')}
                </label>
                <Select
                  value={filters.paymentStatus}
                  onChange={(value) => handleFilterChange('paymentStatus', value)}
                  className="w-full"
                  options={[
                    { label: tCommon('labels.all'), value: 'all' },
                    { label: t('status.pending'), value: 'unpaid' },
                    { label: t('status.paid'), value: 'paid' },
                  ]}
                />
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {tCommon('labels.dateRange')}
                </label>
                <RangePicker
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      handleFilterChange('dateRange', [
                        dates[0].format('YYYY-MM-DD'),
                        dates[1].format('YYYY-MM-DD'),
                      ]);
                    } else {
                      handleFilterChange('dateRange', null);
                    }
                  }}
                  className="w-full"
                />
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

      {/* Expenses Table */}
      {expenses.length === 0 && !isInitialLoading ? (
        <EmptyState
          icon={<DollarOutlined />}
          title={hasActiveFilters ? tCommon('messages.noResults') : tCommon('messages.noData')}
          description={hasActiveFilters ? tCommon('messages.tryAgain') : t('expenseList')}
          action={
            hasActiveFilters
              ? {
                  label: tCommon('actions.clear'),
                  onClick: handleClearFilters,
                  type: 'default',
                }
              : can('expenses.create')
                ? {
                    label: t('addExpense'),
                    onClick: handleAddExpense,
                    icon: <PlusOutlined />,
                  }
                : undefined
          }
          size="lg"
        />
      ) : (
        <Table
          columns={columns}
          dataSource={expenses}
          rowKey="id_expense"
          loading={isInitialLoading}
          className={cn(isFetching && 'opacity-60')}
          pagination={{
            current: page,
            total: totalCount,
            pageSize: PAGE_SIZE,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (total, range) =>
              tCommon('pagination.showTotal', {
                start: range[0],
                end: range[1],
                total,
              }),
          }}
          scroll={{ x: 900 }}
          onRow={(record) => ({
            onClick: () => handleViewExpense(record),
            className: 'cursor-pointer hover:bg-amber-50/50',
          })}
        />
      )}

      {/* Expense Form Modal */}
      <ExpenseForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        expense={editingExpense}
      />

      {/* Expense Approval Modal */}
      {selectedExpense && (
        <ExpenseApprovalModal
          open={approvalModalOpen}
          onClose={handleApprovalModalClose}
          expense={selectedExpense}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
