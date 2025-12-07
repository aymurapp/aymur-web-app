/**
 * Lazy-loaded Chart Components
 *
 * These components use Next.js dynamic imports to reduce initial bundle size.
 * @ant-design/charts is a heavy dependency (~500KB) that should be loaded
 * only when charts are actually needed on the page.
 *
 * Usage:
 * ```tsx
 * import { LazyLineChart, LazyBarChart, LazyPieChart, LazyAreaChart } from '@/components/charts/lazy';
 *
 * // Charts are lazy-loaded with built-in Suspense boundaries
 * <LazyLineChart data={salesData} xField="date" yField="value" />
 * ```
 *
 * @module components/charts/lazy
 */

export { LazyLineChart } from './LazyLineChart';
export { LazyBarChart } from './LazyBarChart';
export { LazyPieChart } from './LazyPieChart';
export { LazyAreaChart } from './LazyAreaChart';
export { LazyChartWrapper } from './LazyChartWrapper';

// Re-export types from original components
export type { LineChartProps, LineChartDataItem } from '../LineChart';
export type { BarChartProps, BarChartDataItem } from '../BarChart';
export type { PieChartProps, PieChartDataItem } from '../PieChart';
export type { AreaChartProps, AreaChartDataItem } from '../AreaChart';
