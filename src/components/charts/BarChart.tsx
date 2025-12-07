'use client';

/**
 * BarChart Component
 *
 * A gold-themed bar/column chart wrapper around @ant-design/charts Column component.
 * Supports vertical columns and horizontal bars with gradient fills.
 *
 * @example
 * // Basic vertical bar chart
 * <BarChart
 *   data={categoryData}
 *   xField="category"
 *   yField="value"
 *   title="Sales by Category"
 * />
 *
 * // Horizontal bar chart
 * <BarChart
 *   data={categoryData}
 *   xField="category"
 *   yField="value"
 *   horizontal
 * />
 */

import React from 'react';

import { Column } from '@ant-design/charts';
import { Card, Skeleton, Typography } from 'antd';

import { cn } from '@/lib/utils/cn';

const { Title } = Typography;

/**
 * Gold theme color palette for charts
 */
const GOLD_PALETTE = ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'];

/**
 * BarChart data item type
 */
export interface BarChartDataItem {
  category: string;
  value: number;
  [key: string]: string | number;
}

/**
 * BarChart component props
 */
export interface BarChartProps {
  /**
   * Chart data array
   */
  data: BarChartDataItem[];

  /**
   * Field name for x-axis (category axis)
   * @default 'category'
   */
  xField?: string;

  /**
   * Field name for y-axis (value axis)
   * @default 'value'
   */
  yField?: string;

  /**
   * Field name for series grouping (grouped/stacked bars)
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
   * Render as horizontal bars instead of vertical columns
   * @default false
   */
  horizontal?: boolean;

  /**
   * Show value labels on bars
   * @default false
   */
  showLabels?: boolean;

  /**
   * Use gradient fill for bars
   * @default true
   */
  gradient?: boolean;
}

/**
 * BarChart Component
 *
 * A responsive bar/column chart with gold gradient styling, suitable for
 * displaying categorical data comparisons such as sales by category,
 * product performance, or regional metrics.
 */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  xField = 'category',
  yField = 'value',
  seriesField,
  title,
  height = 300,
  loading = false,
  className,
  horizontal = false,
  showLabels = false,
  gradient = true,
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

  // Gradient fill configuration
  const gradientStyle = gradient
    ? {
        fill: 'linear-gradient(180deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
        fillOpacity: 0.9,
      }
    : {
        fill: GOLD_PALETTE[0],
      };

  const config = {
    data,
    xField,
    yField,
    seriesField,
    colorField: seriesField || xField,
    autoFit: true,
    height,
    // Transpose for horizontal bars
    coordinate: horizontal
      ? {
          transform: [{ type: 'transpose' as const }],
        }
      : undefined,
    // Gold gradient styling
    style: {
      ...gradientStyle,
      radius: [4, 4, 0, 0],
    },
    // Color palette for multiple series
    scale: {
      color: {
        range: GOLD_PALETTE,
      },
      x: {
        padding: 0.3,
      },
    },
    // Bar labels
    label: showLabels
      ? {
          text: yField,
          position: horizontal ? 'right' : 'top',
          style: {
            fill: '#374151',
            fontSize: 11,
            fontWeight: 500,
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
          autoRotate: true,
          autoHide: true,
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
      shared: false,
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
    // Hover interaction
    state: {
      active: {
        style: {
          fillOpacity: 1,
          stroke: GOLD_PALETTE[2],
          lineWidth: 1,
        },
      },
      inactive: {
        style: {
          fillOpacity: 0.5,
        },
      },
    },
    interaction: {
      elementHighlight: {
        background: true,
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
      <Column {...config} />
    </div>
  );
};

BarChart.displayName = 'BarChart';

export default BarChart;
