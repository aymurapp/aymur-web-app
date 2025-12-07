/**
 * Feedback Components
 * Alerts, notifications, loading states, error boundaries, etc.
 *
 * @module components/common/feedback
 */

// =============================================================================
// ERROR BOUNDARY
// =============================================================================

export {
  ErrorBoundary,
  ErrorBoundaryProvider,
  useErrorBoundary,
  type ErrorBoundaryProps,
  type ErrorFallbackProps,
  type ErrorDetails,
} from './ErrorBoundary';

// =============================================================================
// OFFLINE BANNER
// =============================================================================

export {
  OfflineBanner,
  OfflineIndicator,
  type OfflineBannerProps,
  type OfflineIndicatorProps,
} from './OfflineBanner';
