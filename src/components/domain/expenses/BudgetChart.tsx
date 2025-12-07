'use client';

/**
 * Budget vs Actual Chart Component
 *
 * Bar chart showing allocated vs spent per category with color coding
 * for budget status. Uses @ant-design/charts for visualization.
 *
 * Features:
 * - Bar chart showing allocated vs spent per category
 * - Color coding: green for under budget, red for over
 * - Category breakdown on x-axis
 * - Amounts on y-axis
 * - Trend view option (over time for selected period)
 * - Variance highlighting (percentage difference)
 * - Responsive sizing
 *
 * @module components/domain/expenses/BudgetChart
 */

import React, { useMemo, useState } from 'react';

import { Column } from '@ant-design/charts';
import { BarChartOutlined, LineChartOutlined, TableOutlined } from '@ant-design/icons';
import { Segmented, Empty, Table, Tag, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';

import type { ColumnsType } from 'antd/es/table';

// =============================================================================
// TYPES
// =============================================================================

interface BudgetChartDataItem {
  category: string;
  allocated: number;
  spent: number;
  isOverBudget: boolean;
}

interface BudgetChartProps {
  /**
   * Budget data to display
   */
  data: BudgetChartDataItem[];

  /**
   * Selected period information
   */
  period: {
    start: string;
    end: string;
    type: string;
  };

  /**
   * Chart height in pixels
   * @default 400
   */
  height?: number;

  /**
   * Optional CSS class name
   */
  className?: string;
}

type ChartViewMode = 'grouped' | 'comparison' | 'table';

interface TransformedChartData {
  category: string;
  type: 'allocated' | 'spent';
  value: number;
  isOverBudget: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CHART_COLORS = {
  allocated: '#3b82f6', // Blue for allocated
  spent: '#22c55e', // Green for spent (under budget)
  spentOver: '#ef4444', // Red for over budget
  variance: '#f59e0b', // Amber for variance
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * Calculate variance percentage
 */
function calculateVariance(allocated: number, spent: number): number {
  if (allocated === 0) {
    return spent > 0 ? 100 : 0;
  }
  return ((spent - allocated) / allocated) * 100;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Budget vs Actual Chart Component
 *
 * Displays a visual comparison of budget allocations vs actual spending
 * with multiple view modes (grouped bars, comparison, table).
 */
export function BudgetChart({
  data,
  period,
  height = 400,
  className,
}: BudgetChartProps): React.JSX.Element {
  const t = useTranslations('budgets');
  const [viewMode, setViewMode] = useState<ChartViewMode>('grouped');

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  /**
   * Transform data for grouped bar chart
   */
  const chartData: TransformedChartData[] = useMemo(() => {
    const transformed: TransformedChartData[] = [];

    data.forEach((item) => {
      transformed.push({
        category: item.category,
        type: 'allocated',
        value: item.allocated,
        isOverBudget: item.isOverBudget,
      });
      transformed.push({
        category: item.category,
        type: 'spent',
        value: item.spent,
        isOverBudget: item.isOverBudget,
      });
    });

    return transformed;
  }, [data]);

  /**
   * Summary statistics
   */
  const summary = useMemo(() => {
    const totalAllocated = data.reduce((sum, item) => sum + item.allocated, 0);
    const totalSpent = data.reduce((sum, item) => sum + item.spent, 0);
    const overBudgetCount = data.filter((item) => item.isOverBudget).length;
    const variance = calculateVariance(totalAllocated, totalSpent);

    return {
      totalAllocated,
      totalSpent,
      overBudgetCount,
      variance,
      utilizationPercent: totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0,
    };
  }, [data]);

  /**
   * Table columns configuration
   */
  const tableColumns: ColumnsType<BudgetChartDataItem> = useMemo(
    () => [
      {
        title: t('category'),
        dataIndex: 'category',
        key: 'category',
        render: (category: string, record: BudgetChartDataItem) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{category}</span>
            {record.isOverBudget && (
              <Tag color="red" className="text-xs">
                {t('overBudget')}
              </Tag>
            )}
          </div>
        ),
      },
      {
        title: t('allocated'),
        dataIndex: 'allocated',
        key: 'allocated',
        align: 'end',
        render: (value: number) => (
          <span className="text-blue-600 font-medium">{formatCurrency(value)}</span>
        ),
      },
      {
        title: t('spent'),
        dataIndex: 'spent',
        key: 'spent',
        align: 'end',
        render: (value: number, record: BudgetChartDataItem) => (
          <span
            className={cn('font-medium', record.isOverBudget ? 'text-red-600' : 'text-green-600')}
          >
            {formatCurrency(value)}
          </span>
        ),
      },
      {
        title: t('variance'),
        key: 'variance',
        align: 'end',
        render: (_: unknown, record: BudgetChartDataItem) => {
          const variance = calculateVariance(record.allocated, record.spent);
          const isNegative = variance < 0;
          return (
            <Tooltip title={isNegative ? t('underBudget') : t('overBudget')}>
              <span className={cn('font-medium', isNegative ? 'text-green-600' : 'text-red-600')}>
                {formatPercentage(variance)}
              </span>
            </Tooltip>
          );
        },
      },
      {
        title: t('remaining'),
        key: 'remaining',
        align: 'end',
        render: (_: unknown, record: BudgetChartDataItem) => {
          const remaining = record.allocated - record.spent;
          return (
            <span className={cn('font-medium', remaining < 0 ? 'text-red-600' : 'text-green-600')}>
              {formatCurrency(remaining)}
            </span>
          );
        },
      },
    ],
    [t]
  );

  // ==========================================================================
  // CHART CONFIGURATION
  // ==========================================================================

  /**
   * Grouped bar chart configuration
   */
  const groupedChartConfig = useMemo(
    () => ({
      data: chartData,
      xField: 'category',
      yField: 'value',
      colorField: 'type',
      group: true,
      height,
      style: {
        radiusTopLeft: 4,
        radiusTopRight: 4,
        inset: 2,
      },
      scale: {
        color: {
          domain: ['allocated', 'spent'],
          range: [CHART_COLORS.allocated, CHART_COLORS.spent],
        },
      },
      axis: {
        x: {
          title: false,
          labelAutoRotate: true,
          labelFontSize: 11,
        },
        y: {
          title: false,
          labelFormatter: (value: number) => formatCurrency(value),
          labelFontSize: 11,
        },
      },
      legend: {
        color: {
          title: false,
          position: 'top-right' as const,
          itemLabelText: (datum: { id: string }) =>
            datum.id === 'allocated' ? t('allocated') : t('spent'),
        },
      },
      tooltip: {
        title: (datum: TransformedChartData) => datum.category,
        items: [
          {
            channel: 'y',
            valueFormatter: (value: number) => formatCurrency(value),
            name: (datum: TransformedChartData) =>
              datum.type === 'allocated' ? t('allocated') : t('spent'),
          },
        ],
      },
      interaction: {
        elementHighlight: { background: true },
      },
    }),
    [chartData, height, t]
  );

  /**
   * Comparison chart (variance) configuration
   */
  const comparisonChartConfig = useMemo(
    () => ({
      data: data.map((item) => ({
        category: item.category,
        variance: item.spent - item.allocated,
        isOverBudget: item.isOverBudget,
      })),
      xField: 'category',
      yField: 'variance',
      height,
      style: {
        radiusTopLeft: 4,
        radiusTopRight: 4,
        radiusBottomLeft: 4,
        radiusBottomRight: 4,
        fill: (datum: { isOverBudget: boolean; variance: number }) =>
          datum.variance > 0 ? CHART_COLORS.spentOver : CHART_COLORS.spent,
      },
      axis: {
        x: {
          title: false,
          labelAutoRotate: true,
          labelFontSize: 11,
        },
        y: {
          title: false,
          labelFormatter: (value: number) => formatCurrency(value),
          labelFontSize: 11,
        },
      },
      legend: false,
      tooltip: {
        title: (datum: { category: string }) => datum.category,
        items: [
          {
            channel: 'y',
            valueFormatter: (value: number) => `${value >= 0 ? '+' : ''}${formatCurrency(value)}`,
            name: t('variance'),
          },
        ],
      },
      annotations: [
        {
          type: 'lineY' as const,
          yField: 0,
          style: {
            stroke: '#d1d5db',
            lineDash: [4, 4],
          },
        },
      ],
    }),
    [data, height, t]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (data.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('noDataForChart')} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with View Mode Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">{t('budgetVsActual')}</h3>
          <p className="text-sm text-stone-500">
            {t('periodLabel', {
              start: new Date(period.start).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }),
              end: new Date(period.end).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }),
            })}
          </p>
        </div>

        <Segmented
          value={viewMode}
          onChange={(value) => setViewMode(value as ChartViewMode)}
          options={[
            {
              value: 'grouped',
              icon: <BarChartOutlined />,
              label: t('groupedView'),
            },
            {
              value: 'comparison',
              icon: <LineChartOutlined />,
              label: t('varianceView'),
            },
            {
              value: 'table',
              icon: <TableOutlined />,
              label: t('tableView'),
            },
          ]}
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-stone-50 rounded-lg">
        <div className="text-center">
          <div className="text-xs text-stone-500 uppercase tracking-wider">
            {t('totalAllocated')}
          </div>
          <div className="text-lg font-semibold text-blue-600">
            {formatCurrency(summary.totalAllocated)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-stone-500 uppercase tracking-wider">{t('totalSpent')}</div>
          <div
            className={cn(
              'text-lg font-semibold',
              summary.variance > 0 ? 'text-red-600' : 'text-green-600'
            )}
          >
            {formatCurrency(summary.totalSpent)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-stone-500 uppercase tracking-wider">{t('utilization')}</div>
          <div className="text-lg font-semibold text-amber-600">
            {summary.utilizationPercent.toFixed(1)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-stone-500 uppercase tracking-wider">
            {t('overBudgetCategories')}
          </div>
          <div
            className={cn(
              'text-lg font-semibold',
              summary.overBudgetCount > 0 ? 'text-red-600' : 'text-green-600'
            )}
          >
            {summary.overBudgetCount}
          </div>
        </div>
      </div>

      {/* Chart / Table */}
      <div className="min-h-[400px]">
        {viewMode === 'grouped' && <Column {...groupedChartConfig} />}

        {viewMode === 'comparison' && <Column {...comparisonChartConfig} />}

        {viewMode === 'table' && (
          <Table
            dataSource={data}
            columns={tableColumns}
            rowKey="category"
            pagination={false}
            size="middle"
            className="border border-stone-200 rounded-lg overflow-hidden"
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row className="bg-stone-50 font-semibold">
                  <Table.Summary.Cell index={0}>{t('total')}</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <span className="text-blue-600">{formatCurrency(summary.totalAllocated)}</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <span className={summary.variance > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(summary.totalSpent)}
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <span className={summary.variance > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatPercentage(summary.variance)}
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <span className={summary.variance > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(summary.totalAllocated - summary.totalSpent)}
                    </span>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        )}
      </div>

      {/* Legend for Comparison View */}
      {viewMode === 'comparison' && (
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: CHART_COLORS.spent }} />
            <span className="text-stone-600">{t('underBudget')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: CHART_COLORS.spentOver }} />
            <span className="text-stone-600">{t('overBudget')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetChart;
