'use client';

/**
 * AreaChart Component
 *
 * A gold-themed area chart wrapper around @ant-design/charts Area component.
 * Supports gradient fills, stacked areas, and responsive sizing.
 *
 * @example
 * // Basic area chart
 * <AreaChart
 *   data={revenueData}
 *   xField="date"
 *   yField="value"
 *   title="Revenue Trend"
 * />
 *
 * // Stacked area chart
 * <AreaChart
 *   data={multiData}
 *   xField="date"
 *   yField="value"
 *   seriesField="category"
 *   stacked
 * />
 */

import React from 'react';

import { Area } from '@ant-design/charts';
import { Card, Skeleton, Typography } from 'antd';

import { cn } from '@/lib/utils/cn';

const { Title } = Typography;

/**
 * Gold theme color palette for charts
 */
const GOLD_PALETTE = ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'];

/**
 * AreaChart data item type
 */
export interface AreaChartDataItem {
  date: string;
  value: number;
  [key: string]: string | number;
}

/**
 * AreaChart component props
 */
export interface AreaChartProps {
  /**
   * Chart data array
   */
  data: AreaChartDataItem[];

  /**
   * Field name for x-axis (horizontal axis)
   * @default 'date'
   */
  xField?: string;

  /**
   * Field name for y-axis (vertical axis)
   * @default 'value'
   */
  yField?: string;

  /**
   * Field name for series grouping (multiple areas)
   */
  seriesField?: string;

  /**
   * Chart title displayed above the chart
   */
  title?: string;

  /**
   * Chart height in pixels
   * @default 300
   */
  height?: number;

  /**
   * Show loading skeleton
   * @default false
   */
  loading?: boolean;

  /**
   * Additional CSS classes for the container
   */
  className?: string;

  /**
   * Stack multiple areas on top of each other
   * @default false
   */
  stacked?: boolean;

  /**
   * Show as percentage (100% stacked)
   * @default false
   */
  percent?: boolean;

  /**
   * Use smooth curved lines
   * @default true
   */
  smooth?: boolean;

  /**
   * Show line on top of area
   * @default true
   */
  showLine?: boolean;
}

/**
 * AreaChart Component
 *
 * A responsive area chart with gold gradient styling, suitable for
 * displaying cumulative data over time such as total revenue,
 * inventory value, or growth metrics.
 */
export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  xField = 'date',
  yField = 'value',
  seriesField,
  title,
  height = 300,
  loading = false,
  className,
  stacked = false,
  percent = false,
  smooth = true,
  showLine = true,
}) => {
  // Show loading skeleton when loading
  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        {title && (
          <div className="mb-4">
            <Skeleton.Input active style={{ width: 150 }} />
          </div>
        )}
        <Skeleton.Node active style={{ width: '100%', height }} className="!flex !w-full">
          <div style={{ width: '100%', height }} />
        </Skeleton.Node>
      </Card>
    );
  }

  const config = {
    data,
    xField,
    yField,
    seriesField,
    colorField: seriesField,
    autoFit: true,
    height,
    // Stacking configuration
    stack: stacked || percent,
    percent,
    // Smooth curved lines
    shapeField: smooth ? 'smooth' : undefined,
    // Gold gradient fill
    style: {
      fill: seriesField
        ? undefined
        : 'linear-gradient(180deg, rgba(245, 158, 11, 0.6) 0%, rgba(245, 158, 11, 0.1) 100%)',
      fillOpacity: 0.8,
    },
    // Color palette for multiple series
    scale: {
      color: {
        range: GOLD_PALETTE,
      },
    },
    // Line on top of area
    line: showLine
      ? {
          style: {
            stroke: seriesField ? undefined : GOLD_PALETTE[0],
            lineWidth: 2,
          },
          shapeField: smooth ? 'smooth' : undefined,
        }
      : undefined,
    // Axis styling
    axis: {
      x: {
        title: false,
        line: {
          style: {
            stroke: '#d1d5db',
          },
        },
        tick: {
          style: {
            stroke: '#d1d5db',
          },
        },
        label: {
          style: {
            fill: '#6b7280',
            fontSize: 12,
          },
        },
      },
      y: {
        title: false,
        grid: {
          line: {
            style: {
              stroke: '#e5e7eb',
              lineDash: [4, 4],
            },
          },
        },
        label: {
          style: {
            fill: '#6b7280',
            fontSize: 12,
          },
          formatter: percent ? (v: number) => `${(v * 100).toFixed(0)}%` : undefined,
        },
      },
    },
    // Tooltip configuration
    tooltip: {
      shared: true,
      showCrosshairs: true,
      crosshairs: {
        line: {
          style: {
            stroke: GOLD_PALETTE[0],
            strokeOpacity: 0.5,
          },
        },
      },
    },
    // Legend for multi-series
    legend: seriesField
      ? {
          position: 'top-right' as const,
          itemName: {
            style: {
              fill: '#374151',
            },
          },
        }
      : false,
    // Interaction states
    state: {
      active: {
        style: {
          fillOpacity: 1,
        },
      },
      inactive: {
        style: {
          fillOpacity: 0.3,
        },
      },
    },
    interaction: {
      tooltip: {
        marker: true,
      },
    },
  };

  return (
    <div className={cn('w-full', className)}>
      {title && (
        <Title level={5} className="mb-4 text-stone-700">
          {title}
        </Title>
      )}
      <Area {...config} />
    </div>
  );
};

AreaChart.displayName = 'AreaChart';

export default AreaChart;
