'use client';

/**
 * LineChart Component
 *
 * A gold-themed line chart wrapper around @ant-design/charts Line component.
 * Supports responsive sizing, loading states, and multi-series data.
 *
 * @example
 * // Basic usage
 * <LineChart
 *   data={salesData}
 *   xField="date"
 *   yField="value"
 *   title="Monthly Sales"
 * />
 *
 * // Multi-series line chart
 * <LineChart
 *   data={multiData}
 *   xField="date"
 *   yField="value"
 *   seriesField="category"
 * />
 */

import React from 'react';

import { Line } from '@ant-design/charts';
import { Card, Skeleton, Typography } from 'antd';

import { cn } from '@/lib/utils/cn';

const { Title } = Typography;

/**
 * Gold theme color palette for charts
 */
const GOLD_PALETTE = ['#C9A227', '#A68B1F', '#8B7419', '#6B5A14', '#4A3E0E'];

/**
 * LineChart data item type
 */
export interface LineChartDataItem {
  date: string;
  value: number;
  [key: string]: string | number;
}

/**
 * LineChart component props
 */
export interface LineChartProps {
  /**
   * Chart data array
   */
  data: LineChartDataItem[];

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
   * Field name for series grouping (multiple lines)
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
   * Show data points on the line
   * @default false
   */
  showPoints?: boolean;

  /**
   * Use smooth curved lines
   * @default true
   */
  smooth?: boolean;
}

/**
 * LineChart Component
 *
 * A responsive line chart with gold theme styling, suitable for
 * displaying trends over time such as sales, revenue, or inventory levels.
 */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  xField = 'date',
  yField = 'value',
  seriesField,
  title,
  height = 300,
  loading = false,
  className,
  showPoints = false,
  smooth = true,
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
    // Smooth curved lines
    shapeField: smooth ? 'smooth' : undefined,
    // Gold theme styling
    style: {
      stroke: GOLD_PALETTE[0],
      lineWidth: 2,
    },
    // Color palette for multiple series
    scale: {
      color: {
        range: GOLD_PALETTE,
      },
    },
    // Point markers configuration
    point: showPoints
      ? {
          size: 4,
          shape: 'circle',
          style: {
            fill: '#fff',
            stroke: GOLD_PALETTE[0],
            lineWidth: 2,
          },
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
    // Interactions
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
      <Line {...config} />
    </div>
  );
};

LineChart.displayName = 'LineChart';

export default LineChart;
