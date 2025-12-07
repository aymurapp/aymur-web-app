/**
 * Chart Components
 *
 * Gold-themed data visualization components using @ant-design/charts.
 * All charts support responsive sizing, loading states, and consistent
 * styling that matches the luxury aesthetic of the Aymur platform.
 *
 * Color Palette:
 * - Primary: #f59e0b (amber-500)
 * - Secondary: #d97706 (amber-600)
 * - Tertiary: #b45309 (amber-700)
 * - Quaternary: #92400e (amber-800)
 * - Quinary: #78350f (amber-900)
 *
 * @example
 * // Regular imports (larger bundle, immediate load)
 * import { LineChart, BarChart, PieChart, AreaChart } from '@/components/charts';
 *
 * // Lazy imports (smaller initial bundle, on-demand load)
 * import { LazyLineChart, LazyBarChart, LazyPieChart, LazyAreaChart } from '@/components/charts/lazy';
 *
 * // Line chart for trends
 * <LineChart data={salesData} xField="date" yField="value" />
 *
 * // Bar chart for comparisons
 * <BarChart data={categoryData} xField="category" yField="value" />
 *
 * // Pie chart for distribution
 * <PieChart data={distributionData} angleField="value" colorField="name" />
 *
 * // Area chart for cumulative data
 * <AreaChart data={revenueData} xField="date" yField="value" />
 */

// Line Chart - for trends over time
export { LineChart } from './LineChart';
export type { LineChartProps, LineChartDataItem } from './LineChart';

// Bar Chart - for categorical comparisons
export { BarChart } from './BarChart';
export type { BarChartProps, BarChartDataItem } from './BarChart';

// Pie Chart - for proportional data
export { PieChart } from './PieChart';
export type { PieChartProps, PieChartDataItem } from './PieChart';

// Area Chart - for cumulative/stacked data
export { AreaChart } from './AreaChart';
export type { AreaChartProps, AreaChartDataItem } from './AreaChart';

// Chart Skeleton - loading placeholder for charts
export { ChartSkeleton } from './ChartSkeleton';
export type { ChartSkeletonProps } from './ChartSkeleton';

// Lazy-loaded chart components (for optimal bundle splitting)
export { LazyLineChart, LazyBarChart, LazyPieChart, LazyAreaChart, LazyChartWrapper } from './lazy';

/**
 * Gold color palette used across all chart components
 */
export const CHART_GOLD_PALETTE = [
  '#f59e0b', // amber-500
  '#d97706', // amber-600
  '#b45309', // amber-700
  '#92400e', // amber-800
  '#78350f', // amber-900
] as const;
