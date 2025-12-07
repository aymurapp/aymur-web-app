'use client';

/**
 * LazyChartWrapper Component
 *
 * Generic wrapper component for lazy-loaded charts with Suspense boundary.
 * Handles loading states and error boundaries for dynamically imported charts.
 *
 * @module components/charts/lazy/LazyChartWrapper
 */

import React, { Suspense, type ComponentType } from 'react';

import { Alert } from 'antd';

import { ChartSkeleton, type ChartSkeletonProps } from '../ChartSkeleton';

/**
 * LazyChartWrapper props
 */
export interface LazyChartWrapperProps<P> {
  /** The lazy-loaded chart component */
  component: ComponentType<P>;
  /** Props to pass to the chart component */
  componentProps: P;
  /** Height for the loading skeleton */
  skeletonHeight?: number;
  /** Title for the loading skeleton */
  skeletonTitle?: string;
  /** Type of chart for skeleton styling */
  skeletonType?: ChartSkeletonProps['type'];
  /** Additional class name for the wrapper */
  className?: string;
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary for catching chart loading errors
 */
class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Chart loading error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Alert
            type="error"
            message="Failed to load chart"
            description="There was an error loading the chart component. Please try refreshing the page."
            className="my-4"
          />
        )
      );
    }

    return this.props.children;
  }
}

/**
 * LazyChartWrapper Component
 *
 * Wraps lazy-loaded chart components with Suspense and error boundaries.
 * Provides consistent loading states and error handling.
 */
export function LazyChartWrapper<P extends object>({
  component: Component,
  componentProps,
  skeletonHeight = 300,
  skeletonTitle,
  skeletonType = 'line',
  className,
}: LazyChartWrapperProps<P>): React.JSX.Element {
  return (
    <ChartErrorBoundary>
      <Suspense
        fallback={
          <ChartSkeleton
            height={skeletonHeight}
            title={skeletonTitle}
            type={skeletonType}
            className={className}
          />
        }
      >
        <Component {...componentProps} />
      </Suspense>
    </ChartErrorBoundary>
  );
}

LazyChartWrapper.displayName = 'LazyChartWrapper';

export default LazyChartWrapper;
