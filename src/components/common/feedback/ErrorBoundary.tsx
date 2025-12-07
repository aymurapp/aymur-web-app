/**
 * ErrorBoundary Component
 *
 * React Error Boundary that catches JavaScript errors in child components,
 * logs them, and displays a fallback UI with retry functionality.
 *
 * Features:
 * - Catches and handles runtime errors in component tree
 * - User-friendly error display with retry option
 * - Optional Sentry error reporting integration
 * - RTL support for Arabic locale
 * - Gold/amber luxury theme styling
 *
 * @module components/common/feedback/ErrorBoundary
 */

'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

import { ReloadOutlined, HomeOutlined, BugOutlined } from '@ant-design/icons';
import { Button, Result, Typography, Space, Card } from 'antd';

const { Text, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Error details for logging and display
 */
export interface ErrorDetails {
  /** Error message */
  message: string;
  /** Error stack trace */
  stack?: string;
  /** Component stack from React */
  componentStack?: string;
  /** Timestamp of error occurrence */
  timestamp: Date;
  /** User agent string */
  userAgent?: string;
  /** Current URL */
  url?: string;
}

/**
 * Props for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;

  /**
   * Custom fallback component to render on error.
   * If not provided, uses default error UI.
   */
  fallback?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);

  /**
   * Callback when an error is caught.
   * Useful for custom logging or analytics.
   */
  onError?: (error: Error, errorInfo: ErrorInfo, details: ErrorDetails) => void;

  /**
   * Enable Sentry error reporting.
   * Set to true when Sentry is configured.
   * @default false
   */
  enableSentry?: boolean;

  /**
   * Custom retry function.
   * If not provided, uses default window reload.
   */
  onRetry?: () => void;

  /**
   * Show detailed error information in development.
   * @default process.env.NODE_ENV === 'development'
   */
  showDetails?: boolean;

  /**
   * Title to show in error state
   * @default 'Something went wrong'
   */
  title?: string;

  /**
   * Description to show in error state
   * @default 'We apologize for the inconvenience. Please try again.'
   */
  description?: string;

  /**
   * Whether to show the home button
   * @default true
   */
  showHomeButton?: boolean;

  /**
   * Custom home URL
   * @default '/'
   */
  homeUrl?: string;
}

/**
 * Props passed to custom fallback components
 */
export interface ErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Error details for display/logging */
  errorDetails: ErrorDetails;
  /** Function to retry/reset the error boundary */
  resetError: () => void;
  /** Whether detailed error info should be shown */
  showDetails: boolean;
}

/**
 * State for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error */
  error: Error | null;
  /** Details about the error */
  errorDetails: ErrorDetails | null;
}

// =============================================================================
// SENTRY PLACEHOLDER
// =============================================================================

/**
 * Placeholder for Sentry error reporting.
 * Replace this with actual Sentry SDK when integrated.
 *
 * @example
 * // When Sentry is configured:
 * import * as Sentry from '@sentry/nextjs';
 * export const captureException = Sentry.captureException;
 */
const captureException = (error: Error, context?: Record<string, unknown>): void => {
  // Placeholder: Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group('[Sentry Placeholder] Error Captured');
    console.error('Error:', error);
    if (context) {
      console.log('Context:', context);
    }
    console.groupEnd();
  }

  // TODO: When Sentry is configured, replace with:
  // Sentry.captureException(error, { extra: context });
};

// =============================================================================
// DEFAULT FALLBACK COMPONENT
// =============================================================================

/**
 * Default fallback UI displayed when an error occurs
 */
function DefaultErrorFallback({
  error,
  errorDetails,
  resetError,
  showDetails,
  title = 'Something went wrong',
  description = 'We apologize for the inconvenience. Please try again.',
  showHomeButton = true,
  homeUrl = '/',
}: ErrorFallbackProps & {
  title?: string;
  description?: string;
  showHomeButton?: boolean;
  homeUrl?: string;
}) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        padding: '24px',
      }}
    >
      <Card
        style={{
          maxWidth: '600px',
          width: '100%',
          borderColor: '#fde68a',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)',
        }}
      >
        <Result
          status="error"
          title={<span style={{ color: '#1c1917' }}>{title}</span>}
          subTitle={<span style={{ color: '#57534e' }}>{description}</span>}
          extra={
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={resetError}
                  style={{
                    backgroundColor: '#f59e0b',
                    borderColor: '#f59e0b',
                  }}
                >
                  Try Again
                </Button>
                {showHomeButton && (
                  <Button
                    icon={<HomeOutlined />}
                    onClick={() => {
                      window.location.href = homeUrl;
                    }}
                  >
                    Go Home
                  </Button>
                )}
              </Space>

              {/* Error details for development */}
              {(showDetails || isDevelopment) && (
                <Card
                  size="small"
                  title={
                    <Space>
                      <BugOutlined style={{ color: '#dc2626' }} />
                      <Text strong>Error Details</Text>
                    </Space>
                  }
                  style={{
                    backgroundColor: '#fef2f2',
                    borderColor: '#fecaca',
                    marginTop: '16px',
                    textAlign: 'start',
                  }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary">Error Message:</Text>
                      <Paragraph
                        code
                        copyable
                        style={{
                          margin: '4px 0',
                          backgroundColor: '#fff',
                          padding: '8px',
                          borderRadius: '4px',
                        }}
                      >
                        {error.message}
                      </Paragraph>
                    </div>

                    {error.stack && (
                      <div>
                        <Text type="secondary">Stack Trace:</Text>
                        <Paragraph
                          code
                          copyable
                          ellipsis={{ rows: 5, expandable: true }}
                          style={{
                            margin: '4px 0',
                            backgroundColor: '#fff',
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {error.stack}
                        </Paragraph>
                      </div>
                    )}

                    {errorDetails.componentStack && (
                      <div>
                        <Text type="secondary">Component Stack:</Text>
                        <Paragraph
                          code
                          ellipsis={{ rows: 3, expandable: true }}
                          style={{
                            margin: '4px 0',
                            backgroundColor: '#fff',
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {errorDetails.componentStack}
                        </Paragraph>
                      </div>
                    )}

                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Occurred at: {errorDetails.timestamp.toLocaleString()}
                    </Text>
                  </Space>
                </Card>
              )}
            </Space>
          }
        />
      </Card>
    </div>
  );
}

// =============================================================================
// ERROR BOUNDARY COMPONENT
// =============================================================================

/**
 * React Error Boundary component that catches JavaScript errors
 * anywhere in the child component tree and displays a fallback UI.
 *
 * @example
 * // Basic usage
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // With custom error handler
 * <ErrorBoundary
 *   onError={(error, info, details) => {
 *     logToAnalytics(error, details);
 *   }}
 *   enableSentry={true}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // With custom fallback
 * <ErrorBoundary
 *   fallback={({ error, resetError }) => (
 *     <div>
 *       <p>Error: {error.message}</p>
 *       <button onClick={resetError}>Retry</button>
 *     </div>
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorDetails: null,
    };
  }

  /**
   * Static method called when an error is thrown in a descendant component.
   * Updates state to trigger fallback UI render.
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called after an error is caught.
   * Used for logging and error reporting.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, enableSentry } = this.props;

    // Create error details object
    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      timestamp: new Date(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    // Update state with error details
    this.setState({ errorDetails });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('[ErrorBoundary] Error Caught');
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.log('Error Details:', errorDetails);
      console.groupEnd();
    }

    // Report to Sentry if enabled
    if (enableSentry) {
      captureException(error, {
        componentStack: errorInfo.componentStack,
        ...errorDetails,
      });
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo, errorDetails);
    }
  }

  /**
   * Reset the error boundary state to allow retry
   */
  resetError = (): void => {
    const { onRetry } = this.props;

    this.setState({
      hasError: false,
      error: null,
      errorDetails: null,
    });

    // Call custom retry function or reload the page
    if (onRetry) {
      onRetry();
    }
  };

  render(): ReactNode {
    const { children, fallback, showDetails, title, description, showHomeButton, homeUrl } =
      this.props;
    const { hasError, error, errorDetails } = this.state;

    // If no error, render children normally
    if (!hasError || !error || !errorDetails) {
      return children;
    }

    // Prepare fallback props
    const fallbackProps: ErrorFallbackProps = {
      error,
      errorDetails,
      resetError: this.resetError,
      showDetails: showDetails ?? process.env.NODE_ENV === 'development',
    };

    // Render custom fallback if provided
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback(fallbackProps);
      }
      return fallback;
    }

    // Render default fallback
    return (
      <DefaultErrorFallback
        {...fallbackProps}
        title={title}
        description={description}
        showHomeButton={showHomeButton}
        homeUrl={homeUrl}
      />
    );
  }
}

// =============================================================================
// HOOK FOR PROGRAMMATIC ERROR HANDLING
// =============================================================================

/**
 * Context for programmatic error boundary control
 */
interface ErrorBoundaryContextValue {
  /** Trigger an error in the nearest error boundary */
  showBoundary: (error: Error) => void;
}

const ErrorBoundaryContext = React.createContext<ErrorBoundaryContextValue | null>(null);

/**
 * Provider component that allows programmatic error handling
 */
export function ErrorBoundaryProvider({ children }: { children: ReactNode }) {
  const [error, setError] = React.useState<Error | null>(null);

  const showBoundary = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  // If there's an error, throw it to trigger the nearest error boundary
  if (error) {
    throw error;
  }

  return (
    <ErrorBoundaryContext.Provider value={{ showBoundary }}>
      {children}
    </ErrorBoundaryContext.Provider>
  );
}

/**
 * Hook to programmatically trigger the nearest error boundary
 *
 * @example
 * function MyComponent() {
 *   const { showBoundary } = useErrorBoundary();
 *
 *   const handleClick = async () => {
 *     try {
 *       await riskyOperation();
 *     } catch (error) {
 *       showBoundary(error as Error);
 *     }
 *   };
 * }
 */
export function useErrorBoundary(): ErrorBoundaryContextValue {
  const context = React.useContext(ErrorBoundaryContext);

  if (!context) {
    // Provide a default implementation that throws immediately
    return {
      showBoundary: (error: Error) => {
        throw error;
      },
    };
  }

  return context;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ErrorBoundary;
