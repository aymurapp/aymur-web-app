'use client';

/**
 * LazyPieChart Component
 *
 * Lazy-loaded version of the PieChart component using Next.js dynamic imports.
 * Reduces initial bundle size by loading @ant-design/charts only when needed.
 *
 * @example
 * import { LazyPieChart } from '@/components/charts/lazy';
 *
 * <LazyPieChart
 *   data={distributionData}
 *   angleField="value"
 *   colorField="name"
 *   title="Sales Distribution"
 * />
 *
 * @module components/charts/lazy/LazyPieChart
 */

import React, { Suspense, lazy } from 'react';

import { ChartSkeleton } from '../ChartSkeleton';

import type { PieChartProps } from '../PieChart';

/**
 * Dynamically import PieChart component
 * This ensures @ant-design/charts is not included in the initial bundle
 */
const PieChartLazy = lazy(() =>
  import('../PieChart').then((module) => ({ default: module.PieChart }))
);

/**
 * LazyPieChart Component
 *
 * A lazy-loaded wrapper around PieChart that provides:
 * - Automatic code splitting via dynamic imports
 * - Built-in Suspense boundary with loading skeleton
 * - Same API as the regular PieChart component
 */
export function LazyPieChart(props: PieChartProps): React.JSX.Element {
  const { height = 300, title, className } = props;

  return (
    <Suspense
      fallback={<ChartSkeleton height={height} title={title} type="pie" className={className} />}
    >
      <PieChartLazy {...props} />
    </Suspense>
  );
}

LazyPieChart.displayName = 'LazyPieChart';

export default LazyPieChart;
