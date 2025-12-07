'use client';

/**
 * PieChart Component
 *
 * A gold-themed pie/donut chart wrapper around @ant-design/charts Pie component.
 * Supports legends, labels, and donut style with center content.
 *
 * @example
 * // Basic pie chart
 * <PieChart
 *   data={distributionData}
 *   angleField="value"
 *   colorField="name"
 *   title="Sales Distribution"
 * />
 *
 * // Donut chart with center text
 * <PieChart
 *   data={distributionData}
 *   angleField="value"
 *   colorField="name"
 *   innerRadius={0.6}
 *   centerText="Total"
 *   centerValue="$50,000"
 * />
 */

import React from 'react';

import { Pie } from '@ant-design/charts';
import { Card, Skeleton, Typography } from 'antd';

import { cn } from '@/lib/utils/cn';

const { Title } = Typography;

/**
 * Gold theme color palette for charts
 */
const GOLD_PALETTE = ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'];

/**
 * PieChart data item type
 */
export interface PieChartDataItem {
  name: string;
  value: number;
  [key: string]: string | number;
}

/**
 * PieChart component props
 */
export interface PieChartProps {
  /**
   * Chart data array
   */
  data: PieChartDataItem[];

  /**
   * Field name for angle/value mapping
   * @default 'value'
   */
  angleField?: string;

  /**
   * Field name for color/category mapping
   * @default 'name'
   */
  colorField?: string;

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
   * Outer radius of the pie (0-1)
   * @default 0.8
   */
  radius?: number;

  /**
   * Inner radius for donut charts (0-1)
   * @default 0 (full pie)
   */
  innerRadius?: number;

  /**
   * Show value labels on segments
   * @default true
   */
  showLabels?: boolean;

  /**
   * Label position: 'inner', 'outer', or 'spider'
   * @default 'outer'
   */
  labelPosition?: 'inner' | 'outer' | 'spider';

  /**
   * Center text for donut charts (main label)
   */
  centerText?: string;

  /**
   * Center value for donut charts (secondary text)
   */
  centerValue?: string;
}

/**
 * PieChart Component
 *
 * A responsive pie/donut chart with gold theme palette, suitable for
 * displaying proportional data such as market share, category distribution,
 * or budget allocation.
 */
export const PieChart: React.FC<PieChartProps> = ({
  data,
  angleField = 'value',
  colorField = 'name',
  title,
  height = 300,
  loading = false,
  className,
  radius = 0.8,
  innerRadius = 0,
  showLabels = true,
  labelPosition = 'outer',
  centerText,
  centerValue,
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
        <div className="flex items-center justify-center" style={{ height }}>
          <Skeleton.Avatar active size={height * 0.6} shape="circle" />
        </div>
      </Card>
    );
  }

  // Build annotations for center text (donut charts)
  const annotations =
    innerRadius > 0 && (centerText || centerValue)
      ? [
          ...(centerText
            ? [
                {
                  type: 'text' as const,
                  style: {
                    text: centerText,
                    x: '50%',
                    y: centerValue ? '45%' : '50%',
                    textAlign: 'center' as const,
                    fontSize: 14,
                    fill: '#6b7280',
                    fontWeight: 500,
                  },
                },
              ]
            : []),
          ...(centerValue
            ? [
                {
                  type: 'text' as const,
                  style: {
                    text: centerValue,
                    x: '50%',
                    y: centerText ? '55%' : '50%',
                    textAlign: 'center' as const,
                    fontSize: 24,
                    fill: '#1f2937',
                    fontWeight: 700,
                  },
                },
              ]
            : []),
        ]
      : undefined;

  const config = {
    data,
    angleField,
    colorField,
    autoFit: true,
    height,
    radius,
    innerRadius,
    // Gold theme color palette
    scale: {
      color: {
        range: GOLD_PALETTE,
      },
    },
    // Segment styling
    style: {
      stroke: '#fff',
      lineWidth: 2,
    },
    // Labels configuration
    label: showLabels
      ? {
          text: (d: Record<string, unknown>) => {
            const name = d[colorField];
            const value = d[angleField];
            return labelPosition === 'inner' ? `${value}` : `${name}: ${value}`;
          },
          position: labelPosition,
          style: {
            fill: labelPosition === 'inner' ? '#fff' : '#374151',
            fontSize: 12,
            fontWeight: 500,
          },
          transform: labelPosition === 'spider' ? [{ type: 'overlapDodgeY' as const }] : undefined,
        }
      : undefined,
    // Legend configuration
    legend: {
      color: {
        position: 'right' as const,
        rowPadding: 8,
        itemMarker: 'circle',
        itemLabelFill: '#374151',
        itemLabelFontSize: 12,
      },
    },
    // Tooltip configuration
    tooltip: {
      title: colorField,
    },
    // Annotations for center text
    annotations,
    // Interaction states
    state: {
      active: {
        style: {
          stroke: GOLD_PALETTE[2],
          lineWidth: 3,
        },
      },
      inactive: {
        style: {
          fillOpacity: 0.5,
        },
      },
    },
    interaction: {
      elementHighlight: true,
    },
  };

  return (
    <div className={cn('w-full', className)}>
      {title && (
        <Title level={5} className="mb-4 text-stone-700">
          {title}
        </Title>
      )}
      <Pie {...config} />
    </div>
  );
};

PieChart.displayName = 'PieChart';

export default PieChart;
