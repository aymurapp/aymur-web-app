'use client';

/**
 * LazyAreaChart Component
 *
 * Lazy-loaded version of the AreaChart component using Next.js dynamic imports.
 * Reduces initial bundle size by loading @ant-design/charts only when needed.
 *
 * @example
 * import { LazyAreaChart } from '@/components/charts/lazy';
 *
 * <LazyAreaChart
 *   data={revenueData}
 *   xField="date"
 *   yField="value"
 *   title="Revenue Trend"
 * />
 *
 * @module components/charts/lazy/LazyAreaChart
 */

import React, { Suspense, lazy } from 'react';

import { ChartSkeleton } from '../ChartSkeleton';

import type { AreaChartProps } from '../AreaChart';

/**
 * Dynamically import AreaChart component
 * This ensures @ant-design/charts is not included in the initial bundle
 */
const AreaChartLazy = lazy(() =>
  import('../AreaChart').then((module) => ({ default: module.AreaChart }))
);

/**
 * LazyAreaChart Component
 *
 * A lazy-loaded wrapper around AreaChart that provides:
 * - Automatic code splitting via dynamic imports
 * - Built-in Suspense boundary with loading skeleton
 * - Same API as the regular AreaChart component
 */
export function LazyAreaChart(props: AreaChartProps): React.JSX.Element {
  const { height = 300, title, className } = props;

  return (
    <Suspense
      fallback={<ChartSkeleton height={height} title={title} type="area" className={className} />}
    >
      <AreaChartLazy {...props} />
    </Suspense>
  );
}

LazyAreaChart.displayName = 'LazyAreaChart';

export default LazyAreaChart;
