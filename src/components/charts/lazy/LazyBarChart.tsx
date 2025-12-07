'use client';

/**
 * LazyBarChart Component
 *
 * Lazy-loaded version of the BarChart component using Next.js dynamic imports.
 * Reduces initial bundle size by loading @ant-design/charts only when needed.
 *
 * @example
 * import { LazyBarChart } from '@/components/charts/lazy';
 *
 * <LazyBarChart
 *   data={categoryData}
 *   xField="category"
 *   yField="value"
 *   title="Sales by Category"
 * />
 *
 * @module components/charts/lazy/LazyBarChart
 */

import React, { Suspense, lazy } from 'react';

import { ChartSkeleton } from '../ChartSkeleton';

import type { BarChartProps } from '../BarChart';

/**
 * Dynamically import BarChart component
 * This ensures @ant-design/charts is not included in the initial bundle
 */
const BarChartLazy = lazy(() =>
  import('../BarChart').then((module) => ({ default: module.BarChart }))
);

/**
 * LazyBarChart Component
 *
 * A lazy-loaded wrapper around BarChart that provides:
 * - Automatic code splitting via dynamic imports
 * - Built-in Suspense boundary with loading skeleton
 * - Same API as the regular BarChart component
 */
export function LazyBarChart(props: BarChartProps): React.JSX.Element {
  const { height = 300, title, className } = props;

  return (
    <Suspense
      fallback={<ChartSkeleton height={height} title={title} type="bar" className={className} />}
    >
      <BarChartLazy {...props} />
    </Suspense>
  );
}

LazyBarChart.displayName = 'LazyBarChart';

export default LazyBarChart;
