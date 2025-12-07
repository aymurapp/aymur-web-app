/**
 * Error Page for Shop Routes
 *
 * Next.js error page that handles runtime errors in the shop route segment.
 * This is a client component that receives error and reset props from Next.js.
 *
 * Features:
 * - User-friendly error display with retry functionality
 * - Automatic error reporting (Sentry placeholder)
 * - Gold/amber luxury theme styling
 * - RTL support for Arabic locale
 * - Navigation options to dashboard or home
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 * @module app/(platform)/[locale]/[shopId]/error
 */

'use client';

import { useEffect } from 'react';

import { useParams, useRouter } from 'next/navigation';

import {
  ReloadOutlined,
  HomeOutlined,
  DashboardOutlined,
  BugOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Button, Result, Card, Space, Typography } from 'antd';

const { Text, Paragraph, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface ErrorPageProps {
  /** The error that was thrown */
  error: Error & { digest?: string };
  /** Function to attempt recovery by re-rendering the route segment */
  reset: () => void;
}

// =============================================================================
// SENTRY PLACEHOLDER
// =============================================================================

/**
 * Placeholder for Sentry error reporting.
 * Replace with actual Sentry SDK when integrated.
 */
const captureException = (error: Error, context?: Record<string, unknown>): void => {
  if (process.env.NODE_ENV === 'development') {
    console.group('[Sentry Placeholder] Page Error Captured');
    console.error('Error:', error);
    if (context) {
      console.log('Context:', context);
    }
    console.groupEnd();
  }

  // TODO: When Sentry is configured:
  // import * as Sentry from '@sentry/nextjs';
  // Sentry.captureException(error, { extra: context });
};

// =============================================================================
// ERROR PAGE COMPONENT
// =============================================================================

/**
 * Error page component for handling runtime errors in shop routes.
 *
 * This page is automatically rendered by Next.js when an error is thrown
 * within the [shopId] route segment or any of its children.
 */
export default function ShopErrorPage({ error, reset }: ErrorPageProps) {
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale as string | undefined;
  const shopId = params?.shopId as string | undefined;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Report error to monitoring service
  useEffect(() => {
    // Log error details
    console.error('[ShopErrorPage] Error occurred:', {
      message: error.message,
      digest: error.digest,
      locale,
      shopId,
      timestamp: new Date().toISOString(),
    });

    // Report to Sentry
    captureException(error, {
      digest: error.digest,
      locale,
      shopId,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    });
  }, [error, locale, shopId]);

  // Navigation handlers
  const handleRetry = () => {
    reset();
  };

  const handleGoToDashboard = () => {
    if (locale && shopId) {
      router.push(`/${locale}/${shopId}/dashboard`);
    } else if (locale) {
      router.push(`/${locale}/shops`);
    } else {
      router.push('/');
    }
  };

  const handleGoHome = () => {
    router.push('/');
  };

  // Determine error type for user-friendly message
  const getErrorInfo = () => {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return {
        title: 'Connection Error',
        description:
          'Unable to connect to the server. Please check your internet connection and try again.',
        icon: <ExclamationCircleOutlined style={{ color: '#d97706' }} />,
      };
    }

    if (
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('403')
    ) {
      return {
        title: 'Access Denied',
        description:
          'You do not have permission to access this resource. Please contact your administrator.',
        icon: <ExclamationCircleOutlined style={{ color: '#dc2626' }} />,
      };
    }

    if (message.includes('not found') || message.includes('404')) {
      return {
        title: 'Resource Not Found',
        description:
          'The requested resource could not be found. It may have been moved or deleted.',
        icon: <ExclamationCircleOutlined style={{ color: '#d97706' }} />,
      };
    }

    if (message.includes('timeout')) {
      return {
        title: 'Request Timeout',
        description: 'The request took too long to complete. Please try again.',
        icon: <ExclamationCircleOutlined style={{ color: '#d97706' }} />,
      };
    }

    return {
      title: 'Something Went Wrong',
      description:
        'An unexpected error occurred. Our team has been notified and is working on a fix.',
      icon: <ExclamationCircleOutlined style={{ color: '#dc2626' }} />,
    };
  };

  const errorInfo = getErrorInfo();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '24px',
        backgroundColor: '#fafaf9',
      }}
    >
      <Card
        style={{
          maxWidth: '600px',
          width: '100%',
          borderColor: '#fde68a',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.15)',
          borderRadius: '12px',
        }}
        bodyStyle={{ padding: '32px' }}
      >
        <Result
          icon={errorInfo.icon}
          title={
            <Title level={3} style={{ color: '#1c1917', margin: 0 }}>
              {errorInfo.title}
            </Title>
          }
          subTitle={
            <Text style={{ color: '#57534e', fontSize: '16px' }}>{errorInfo.description}</Text>
          }
          extra={
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Action Buttons */}
              <Space wrap style={{ justifyContent: 'center' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<ReloadOutlined />}
                  onClick={handleRetry}
                  style={{
                    backgroundColor: '#f59e0b',
                    borderColor: '#f59e0b',
                    height: '44px',
                    paddingInline: '24px',
                    fontWeight: 500,
                  }}
                >
                  Try Again
                </Button>

                {shopId && (
                  <Button
                    size="large"
                    icon={<DashboardOutlined />}
                    onClick={handleGoToDashboard}
                    style={{
                      height: '44px',
                      paddingInline: '24px',
                    }}
                  >
                    Go to Dashboard
                  </Button>
                )}

                <Button
                  size="large"
                  icon={<HomeOutlined />}
                  onClick={handleGoHome}
                  style={{
                    height: '44px',
                    paddingInline: '24px',
                  }}
                >
                  Go Home
                </Button>
              </Space>

              {/* Error ID for support */}
              {error.digest && (
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Error ID:{' '}
                    <Text code copyable style={{ fontSize: '12px' }}>
                      {error.digest}
                    </Text>
                  </Text>
                </div>
              )}

              {/* Technical details (development only) */}
              {isDevelopment && (
                <Card
                  size="small"
                  title={
                    <Space>
                      <BugOutlined style={{ color: '#dc2626' }} />
                      <Text strong>Developer Details</Text>
                    </Space>
                  }
                  style={{
                    backgroundColor: '#fef2f2',
                    borderColor: '#fecaca',
                    textAlign: 'start',
                  }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Error Message:
                      </Text>
                      <Paragraph
                        code
                        copyable
                        style={{
                          margin: '4px 0',
                          backgroundColor: '#fff',
                          padding: '8px',
                          borderRadius: '4px',
                          fontSize: '13px',
                        }}
                      >
                        {error.message}
                      </Paragraph>
                    </div>

                    {error.stack && (
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Stack Trace:
                        </Text>
                        <Paragraph
                          code
                          copyable
                          ellipsis={{ rows: 6, expandable: true }}
                          style={{
                            margin: '4px 0',
                            backgroundColor: '#fff',
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {error.stack}
                        </Paragraph>
                      </div>
                    )}

                    <Space split={<Text type="secondary">|</Text>}>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Locale: {locale || 'N/A'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Shop: {shopId || 'N/A'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Time: {new Date().toLocaleTimeString()}
                      </Text>
                    </Space>
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
