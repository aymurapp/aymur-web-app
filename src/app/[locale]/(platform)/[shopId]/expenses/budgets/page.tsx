'use client';

/**
 * Budgets Page
 *
 * Budget management page displaying budget categories, allocations, and spending.
 * Shows allocated vs spent amounts with progress bars and over-budget warnings.
 *
 * Features:
 * - Budget categories list using useBudgetCategories hook
 * - Period selector (monthly, quarterly, yearly dropdown + date picker)
 * - For each category: name, allocated, spent, remaining, progress bar
 * - Over-budget warning if exceeded
 * - Summary card at top (total allocated, total spent, remaining)
 * - Create budget allocation button
 * - Budget vs Actual chart
 *
 * @module app/(platform)/[locale]/[shopId]/expenses/budgets/page
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  PlusOutlined,
  WalletOutlined,
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  ReloadOutlined,
  PieChartOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import {
  Card,
  DatePicker,
  Select,
  Progress,
  Tag,
  Tooltip,
  Space,
  Segmented,
  Alert,
  Skeleton,
  Empty,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { useTranslations } from 'next-intl';

import { StatCard, StatCardGrid } from '@/components/common/data/StatCard';
import { BudgetAllocationForm } from '@/components/domain/expenses/BudgetAllocationForm';
import { BudgetChart } from '@/components/domain/expenses/BudgetChart';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  useBudgetCategories,
  useBudgetAllocations,
  useBudgetSummary,
  type BudgetCategory,
  type BudgetAllocationWithCategory,
} from '@/lib/hooks/data/useBudgets';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';

import type { PickerMode } from 'rc-picker/lib/interface';

// Extend dayjs with quarterOfYear plugin for quarter operations
dayjs.extend(quarterOfYear);

// =============================================================================
// TYPES
// =============================================================================

type PeriodType = 'monthly' | 'quarterly' | 'yearly' | 'custom';
type ViewMode = 'list' | 'chart';

interface PeriodState {
  type: PeriodType;
  startDate: string;
  endDate: string;
}

interface BudgetCategoryWithAllocation extends BudgetCategory {
  allocation?: BudgetAllocationWithCategory;
  spent: number;
  allocated: number;
  remaining: number;
  utilizationPercent: number;
  isOverBudget: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get period dates based on type and reference date
 */
function getPeriodDates(
  type: PeriodType,
  referenceDate: Dayjs = dayjs()
): { startDate: string; endDate: string } {
  switch (type) {
    case 'monthly':
      return {
        startDate: referenceDate.startOf('month').format('YYYY-MM-DD'),
        endDate: referenceDate.endOf('month').format('YYYY-MM-DD'),
      };
    case 'quarterly':
      return {
        startDate: referenceDate.startOf('quarter').format('YYYY-MM-DD'),
        endDate: referenceDate.endOf('quarter').format('YYYY-MM-DD'),
      };
    case 'yearly':
      return {
        startDate: referenceDate.startOf('year').format('YYYY-MM-DD'),
        endDate: referenceDate.endOf('year').format('YYYY-MM-DD'),
      };
    default:
      return {
        startDate: referenceDate.startOf('month').format('YYYY-MM-DD'),
        endDate: referenceDate.endOf('month').format('YYYY-MM-DD'),
      };
  }
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get progress bar status color based on utilization percentage
 */
function getProgressStatus(percent: number): 'success' | 'normal' | 'exception' {
  if (percent >= 100) {
    return 'exception';
  }
  if (percent >= 80) {
    return 'normal';
  }
  return 'success';
}

/**
 * Get progress bar stroke color based on utilization percentage
 */
function getProgressColor(percent: number): string {
  if (percent >= 100) {
    return '#ef4444';
  } // Red for over-budget
  if (percent >= 90) {
    return '#f59e0b';
  } // Amber for near-limit
  if (percent >= 75) {
    return '#eab308';
  } // Yellow for warning
  return '#22c55e'; // Green for healthy
}

// =============================================================================
// BUDGET CATEGORY CARD COMPONENT
// =============================================================================

interface BudgetCategoryCardProps {
  category: BudgetCategoryWithAllocation;
  onAllocate: (categoryId: string) => void;
  canManage: boolean;
  t: ReturnType<typeof useTranslations>;
}

function BudgetCategoryCard({
  category,
  onAllocate,
  canManage,
  t,
}: BudgetCategoryCardProps): React.JSX.Element {
  const progressPercent = Math.min(category.utilizationPercent, 100);
  const displayPercent = Math.round(category.utilizationPercent);

  return (
    <Card
      className={cn(
        'border transition-all duration-200 hover:shadow-md',
        category.isOverBudget
          ? 'border-red-200 bg-red-50/50'
          : 'border-stone-200 hover:border-amber-300'
      )}
      styles={{ body: { padding: '16px' } }}
    >
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-900 truncate">{category.category_name}</h3>
            {category.description && (
              <p className="text-xs text-stone-500 truncate mt-0.5">{category.description}</p>
            )}
          </div>
          <Tag
            className={cn(
              'shrink-0',
              category.isOverBudget
                ? 'border-red-200 bg-red-100 text-red-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            )}
          >
            {category.budget_type}
          </Tag>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress
            percent={progressPercent}
            status={getProgressStatus(category.utilizationPercent)}
            strokeColor={getProgressColor(category.utilizationPercent)}
            trailColor="#e7e5e4"
            size="small"
            showInfo={false}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-500">
              {displayPercent}% {t('used')}
            </span>
            {category.isOverBudget && (
              <Tooltip title={t('overBudgetWarning')}>
                <span className="flex items-center gap-1 text-red-600">
                  <WarningOutlined className="text-xs" />
                  {t('overBudget')}
                </span>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-0.5">
            <div className="text-xs text-stone-500">{t('allocated')}</div>
            <div className="font-semibold text-stone-900 text-sm">
              {formatCurrency(category.allocated)}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-stone-500">{t('spent')}</div>
            <div
              className={cn(
                'font-semibold text-sm',
                category.isOverBudget ? 'text-red-600' : 'text-stone-900'
              )}
            >
              {formatCurrency(category.spent)}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-stone-500">{t('remaining')}</div>
            <div
              className={cn(
                'font-semibold text-sm',
                category.remaining < 0 ? 'text-red-600' : 'text-green-600'
              )}
            >
              {formatCurrency(category.remaining)}
            </div>
          </div>
        </div>

        {/* Action */}
        {canManage && category.allocated === 0 && (
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => onAllocate(category.id_budget_category)}
            className="w-full mt-1"
          >
            {t('allocateBudget')}
          </Button>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Budgets Page Component
 *
 * Client component that displays budget categories with allocations,
 * spending tracking, and budget vs actual comparisons.
 */
export default function BudgetsPage(): React.JSX.Element {
  const t = useTranslations('budgets');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  // Helper to get picker mode for DatePicker based on period type
  const getPickerMode = (type: PeriodType): PickerMode | undefined => {
    switch (type) {
      case 'yearly':
        return 'year';
      case 'quarterly':
        return 'quarter';
      case 'monthly':
      default:
        return 'month';
    }
  };

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [period, setPeriod] = useState<PeriodState>(() => ({
    type: 'monthly',
    ...getPeriodDates('monthly'),
  }));

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { categories, isLoading: categoriesLoading } = useBudgetCategories({ isActive: true }) as {
    categories: BudgetCategory[];
    isLoading: boolean;
  };

  const {
    allocations = [],
    isLoading: allocationsLoading,
    refetch: refetchAllocations,
  } = useBudgetAllocations({
    periodContains: period.startDate,
    status: 'active',
  });

  const { isLoading: summaryLoading, refetch: refetchSummary } = useBudgetSummary({
    periodStart: period.startDate,
    periodEnd: period.endDate,
  });

  const isLoading = categoriesLoading || allocationsLoading || summaryLoading;

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const canManageBudgets = can('budgets.manage');

  /**
   * Merge categories with their allocations and calculate spent/remaining
   */
  const categoriesWithAllocations: BudgetCategoryWithAllocation[] = useMemo(() => {
    return categories.map((category: BudgetCategory) => {
      // Find allocation for this category in the current period
      const allocation = allocations.find(
        (a) => a.id_budget_category === category.id_budget_category
      );

      const allocated = allocation?.allocated_amount ?? 0;
      const spent = allocation?.used_amount ?? 0;
      const remaining = allocated - spent;
      const utilizationPercent = allocated > 0 ? (spent / allocated) * 100 : 0;

      return {
        ...category,
        allocation,
        allocated,
        spent,
        remaining,
        utilizationPercent,
        isOverBudget: remaining < 0,
      };
    });
  }, [categories, allocations]);

  /**
   * Summary statistics
   */
  const summaryStats = useMemo(() => {
    const totalAllocated = categoriesWithAllocations.reduce((sum, cat) => sum + cat.allocated, 0);
    const totalSpent = categoriesWithAllocations.reduce((sum, cat) => sum + cat.spent, 0);
    const totalRemaining = totalAllocated - totalSpent;
    const overBudgetCount = categoriesWithAllocations.filter((cat) => cat.isOverBudget).length;

    return {
      totalAllocated,
      totalSpent,
      totalRemaining,
      overBudgetCount,
      utilizationPercent: totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0,
    };
  }, [categoriesWithAllocations]);

  /**
   * Data for chart
   */
  const chartData = useMemo(() => {
    return categoriesWithAllocations
      .filter((cat) => cat.allocated > 0 || cat.spent > 0)
      .map((cat) => ({
        category: cat.category_name,
        allocated: cat.allocated,
        spent: cat.spent,
        isOverBudget: cat.isOverBudget,
      }));
  }, [categoriesWithAllocations]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handlePeriodTypeChange = useCallback((type: PeriodType) => {
    const dates = getPeriodDates(type);
    setPeriod({ type, ...dates });
  }, []);

  const handleDateChange = useCallback((dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setPeriod({
        type: 'custom',
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD'),
      });
    }
  }, []);

  const handleMonthChange = useCallback(
    (date: Dayjs | null) => {
      if (date) {
        const dates = getPeriodDates(period.type, date);
        setPeriod((prev) => ({ ...prev, ...dates }));
      }
    },
    [period.type]
  );

  const handleAllocate = useCallback((categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setFormOpen(true);
  }, []);

  const handleAddAllocation = useCallback(() => {
    setSelectedCategoryId(null);
    setFormOpen(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setSelectedCategoryId(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setFormOpen(false);
    setSelectedCategoryId(null);
    refetchAllocations();
    refetchSummary();
  }, [refetchAllocations, refetchSummary]);

  const handleRefresh = useCallback(() => {
    refetchAllocations();
    refetchSummary();
  }, [refetchAllocations, refetchSummary]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Page Header */}
      <PageHeader title={t('title')} subtitle={t('subtitle')}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading}>
            {tCommon('actions.refresh')}
          </Button>
          {canManageBudgets && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAllocation}>
              {t('createAllocation')}
            </Button>
          )}
        </Space>
      </PageHeader>

      {/* Period Selector */}
      <Card className="border-stone-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarOutlined className="text-amber-600" />
            <span className="font-medium text-stone-700">{t('period')}:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={period.type}
              onChange={handlePeriodTypeChange}
              options={PERIOD_OPTIONS.map((opt) => ({
                value: opt.value,
                label: t(`periods.${opt.value}`),
              }))}
              className="w-32"
            />

            {period.type === 'custom' ? (
              <DatePicker.RangePicker
                value={[dayjs(period.startDate), dayjs(period.endDate)]}
                onChange={handleDateChange}
                format="MMM D, YYYY"
                allowClear={false}
              />
            ) : (
              <DatePicker
                value={dayjs(period.startDate)}
                onChange={handleMonthChange}
                picker={getPickerMode(period.type)}
                format={
                  period.type === 'yearly'
                    ? 'YYYY'
                    : period.type === 'quarterly'
                      ? 'YYYY-[Q]Q'
                      : 'MMM YYYY'
                }
                allowClear={false}
              />
            )}
          </div>

          <div className="ms-auto">
            <Segmented
              value={viewMode}
              onChange={(value) => setViewMode(value as ViewMode)}
              options={[
                {
                  value: 'list',
                  icon: <BarChartOutlined />,
                  label: t('listView'),
                },
                {
                  value: 'chart',
                  icon: <PieChartOutlined />,
                  label: t('chartView'),
                },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Summary Statistics */}
      <StatCardGrid columns={4}>
        <StatCard
          title={t('totalAllocated')}
          value={formatCurrency(summaryStats.totalAllocated)}
          prefix={<WalletOutlined className="text-blue-600" />}
          loading={isLoading}
        />
        <StatCard
          title={t('totalSpent')}
          value={formatCurrency(summaryStats.totalSpent)}
          prefix={<DollarOutlined className="text-amber-600" />}
          loading={isLoading}
        />
        <StatCard
          title={t('totalRemaining')}
          value={formatCurrency(summaryStats.totalRemaining)}
          prefix={
            summaryStats.totalRemaining >= 0 ? (
              <CheckCircleOutlined className="text-green-600" />
            ) : (
              <WarningOutlined className="text-red-600" />
            )
          }
          loading={isLoading}
        />
        <StatCard
          title={t('overBudgetCategories')}
          value={summaryStats.overBudgetCount.toString()}
          prefix={
            <WarningOutlined
              className={summaryStats.overBudgetCount > 0 ? 'text-red-600' : 'text-green-600'}
            />
          }
          loading={isLoading}
        />
      </StatCardGrid>

      {/* Over Budget Alert */}
      {summaryStats.overBudgetCount > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={t('overBudgetAlert', { count: summaryStats.overBudgetCount })}
          description={t('overBudgetAlertDescription')}
          className="border-amber-200 bg-amber-50"
        />
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="border-stone-200">
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        categoriesWithAllocations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categoriesWithAllocations.map((category) => (
              <BudgetCategoryCard
                key={category.id_budget_category}
                category={category}
                onAllocate={handleAllocate}
                canManage={canManageBudgets}
                t={t}
              />
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="space-y-2">
                <p className="text-stone-500">{t('noCategories')}</p>
                {canManageBudgets && (
                  <Button type="primary" onClick={handleAddAllocation}>
                    {t('createFirstAllocation')}
                  </Button>
                )}
              </div>
            }
          />
        )
      ) : (
        <Card className="border-stone-200">
          <BudgetChart
            data={chartData}
            period={{
              start: period.startDate,
              end: period.endDate,
              type: period.type,
            }}
          />
        </Card>
      )}

      {/* Budget Allocation Form Modal */}
      <BudgetAllocationForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        defaultCategoryId={selectedCategoryId ?? undefined}
        defaultPeriod={{
          start: period.startDate,
          end: period.endDate,
        }}
      />
    </div>
  );
}
