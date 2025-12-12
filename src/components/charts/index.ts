/**
 * Chart Components
 *
 * Gold-themed data visualization components using @ant-design/charts.
 * All charts support responsive sizing, loading states, and consistent
 * styling that matches the luxury aesthetic of the Aymur platform.
 *
 * Color Palette (AYMUR Brand Gold):
 * - Primary: #C9A227 (gold-500 - main brand)
 * - Secondary: #A68B1F (gold-600)
 * - Tertiary: #8B7419 (gold-700)
 * - Quaternary: #6B5A14 (gold-800)
 * - Quinary: #4A3E0E (gold-900)
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
 * Uses AYMUR brand gold palette for consistency
 */
export const CHART_GOLD_PALETTE = [
  '#C9A227', // gold-500 (main brand)
  '#A68B1F', // gold-600
  '#8B7419', // gold-700
  '#6B5A14', // gold-800
  '#4A3E0E', // gold-900
] as const;
