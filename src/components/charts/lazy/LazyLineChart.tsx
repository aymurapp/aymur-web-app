'use client';

/**
 * LazyLineChart Component
 *
 * Lazy-loaded version of the LineChart component using Next.js dynamic imports.
 * Reduces initial bundle size by loading @ant-design/charts only when needed.
 *
 * @example
 * import { LazyLineChart } from '@/components/charts/lazy';
 *
 * <LazyLineChart
 *   data={salesData}
 *   xField="date"
 *   yField="value"
 *   title="Monthly Sales"
 * />
 *
 * @module components/charts/lazy/LazyLineChart
 */

import React, { Suspense, lazy } from 'react';

import { ChartSkeleton } from '../ChartSkeleton';

import type { LineChartProps } from '../LineChart';

/**
 * Dynamically import LineChart component
 * This ensures @ant-design/charts is not included in the initial bundle
 */
const LineChartLazy = lazy(() =>
  import('../LineChart').then((module) => ({ default: module.LineChart }))
);

/**
 * LazyLineChart Component
 *
 * A lazy-loaded wrapper around LineChart that provides:
 * - Automatic code splitting via dynamic imports
 * - Built-in Suspense boundary with loading skeleton
 * - Same API as the regular LineChart component
 */
export function LazyLineChart(props: LineChartProps): React.JSX.Element {
  const { height = 300, title, className } = props;

  return (
    <Suspense
      fallback={<ChartSkeleton height={height} title={title} type="line" className={className} />}
    >
      <LineChartLazy {...props} />
    </Suspense>
  );
}

LazyLineChart.displayName = 'LazyLineChart';

export default LazyLineChart;
