/**
 * OfflineBanner Component
 *
 * Displays a banner when the user goes offline, with automatic
 * dismissal when connection is restored and optional auto-retry.
 *
 * Features:
 * - Automatic show/hide based on network status
 * - Connection quality indicator
 * - Auto-retry when connection is restored
 * - RTL support for Arabic locale
 * - Gold/amber luxury theme styling
 * - Smooth slide-in/out animations
 *
 * @module components/common/feedback/OfflineBanner
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  WifiOutlined,
  ReloadOutlined,
  CloseOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Alert, Button, Space, Typography, Badge, Tooltip } from 'antd';

import {
  useNetworkStatus,
  getQualityLabel,
  getQualityColor,
  formatOfflineDuration,
  type ConnectionQuality,
} from '@/lib/hooks/utils/useNetworkStatus';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the OfflineBanner component
 */
export interface OfflineBannerProps {
  /**
   * Position of the banner on the screen
   * @default 'top'
   */
  position?: 'top' | 'bottom';

  /**
   * Whether the banner can be manually dismissed
   * @default false
   */
  dismissible?: boolean;

  /**
   * Callback when the connection is restored.
   * Use this to trigger data refresh/sync operations.
   */
  onReconnect?: () => void;

  /**
   * Callback when going offline
   */
  onDisconnect?: () => void;

  /**
   * Show connection quality indicator even when online
   * @default false
   */
  showQualityIndicator?: boolean;

  /**
   * Auto-hide the reconnection success message after this many milliseconds
   * Set to 0 to disable auto-hide
   * @default 3000
   */
  reconnectMessageDuration?: number;

  /**
   * Custom offline message
   */
  offlineMessage?: string;

  /**
   * Custom reconnected message
   */
  reconnectedMessage?: string;

  /**
   * Show retry button when offline
   * @default true
   */
  showRetryButton?: boolean;

  /**
   * Fixed position (true) or inline (false)
   * @default true
   */
  fixed?: boolean;

  /**
   * Z-index for fixed positioning
   * @default 1000
   */
  zIndex?: number;

  /**
   * Additional CSS class name
   */
  className?: string;

  /**
   * Additional inline styles
   */
  style?: React.CSSProperties;
}

/**
 * Banner display state
 */
type BannerState = 'hidden' | 'offline' | 'reconnecting' | 'reconnected';

// =============================================================================
// STYLES
// =============================================================================

const getPositionStyles = (
  position: 'top' | 'bottom',
  fixed: boolean,
  zIndex: number
): React.CSSProperties => {
  if (!fixed) {
    return {
      width: '100%',
    };
  }

  const baseStyles: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    zIndex,
    transition: 'transform 0.3s ease-in-out',
  };

  if (position === 'top') {
    return {
      ...baseStyles,
      top: 0,
    };
  }

  return {
    ...baseStyles,
    bottom: 0,
  };
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Banner component that shows when the user is offline.
 *
 * @example
 * // Basic usage - shows when offline
 * <OfflineBanner />
 *
 * @example
 * // With reconnect callback for data refresh
 * <OfflineBanner
 *   onReconnect={() => {
 *     queryClient.refetchQueries();
 *   }}
 * />
 *
 * @example
 * // Bottom position with quality indicator
 * <OfflineBanner
 *   position="bottom"
 *   showQualityIndicator
 *   dismissible
 * />
 *
 * @example
 * // Inline (non-fixed) banner
 * <OfflineBanner fixed={false} />
 */
export function OfflineBanner({
  position = 'top',
  dismissible = false,
  onReconnect,
  onDisconnect,
  showQualityIndicator = false,
  reconnectMessageDuration = 3000,
  offlineMessage = 'You are currently offline. Some features may be unavailable.',
  reconnectedMessage = 'Connection restored!',
  showRetryButton = true,
  fixed = true,
  zIndex = 1000,
  className,
  style,
}: OfflineBannerProps) {
  // Network status
  const { isOnline, wasOffline, quality, offlineDuration, checkConnection, isChecking } =
    useNetworkStatus({
      onOnline: onReconnect,
      onOffline: onDisconnect,
    });

  // Banner state
  const [bannerState, setBannerState] = useState<BannerState>('hidden');
  const [isDismissed, setIsDismissed] = useState(false);

  // Update banner state based on network status
  useEffect((): (() => void) | void => {
    if (!isOnline) {
      setBannerState('offline');
      setIsDismissed(false);
      return undefined;
    }

    if (wasOffline) {
      setBannerState('reconnected');

      // Auto-hide reconnected message
      if (reconnectMessageDuration > 0) {
        const timer = setTimeout(() => {
          setBannerState('hidden');
        }, reconnectMessageDuration);

        return () => clearTimeout(timer);
      }
      return undefined;
    }

    setBannerState('hidden');
    return undefined;
  }, [isOnline, wasOffline, reconnectMessageDuration]);

  // Handle retry
  const handleRetry = useCallback(async () => {
    setBannerState('reconnecting');
    const isConnected = await checkConnection();

    if (!isConnected) {
      setBannerState('offline');
    }
    // If connected, useEffect will handle the state change
  }, [checkConnection]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // Don't render if hidden or dismissed
  if (bannerState === 'hidden' || isDismissed) {
    // Show quality indicator if enabled and online
    if (showQualityIndicator && isOnline) {
      return <QualityIndicator quality={quality} />;
    }
    return null;
  }

  // Styles
  const positionStyles = getPositionStyles(position, fixed, zIndex);

  // Render based on state
  if (bannerState === 'reconnected') {
    return (
      <div
        className={className}
        style={{
          ...positionStyles,
          ...style,
        }}
      >
        <Alert
          type="success"
          message={
            <Space>
              <CheckCircleOutlined />
              <span>{reconnectedMessage}</span>
              {offlineDuration && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  (offline for {formatOfflineDuration(offlineDuration)})
                </Text>
              )}
            </Space>
          }
          banner
          showIcon={false}
          style={{
            backgroundColor: '#d1fae5',
            borderColor: '#059669',
          }}
        />
      </div>
    );
  }

  // Offline or reconnecting state
  const isReconnecting = bannerState === 'reconnecting' || isChecking;

  return (
    <div
      className={className}
      style={{
        ...positionStyles,
        ...style,
      }}
    >
      <Alert
        type="warning"
        message={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <Space>
              <WifiOutlined style={{ color: '#d97706' }} />
              <span>{isReconnecting ? 'Reconnecting...' : offlineMessage}</span>
            </Space>

            <Space>
              {showRetryButton && (
                <Button
                  type="primary"
                  size="small"
                  icon={isReconnecting ? <LoadingOutlined /> : <ReloadOutlined />}
                  onClick={handleRetry}
                  disabled={isReconnecting}
                  style={{
                    backgroundColor: '#f59e0b',
                    borderColor: '#f59e0b',
                  }}
                >
                  {isReconnecting ? 'Checking...' : 'Retry'}
                </Button>
              )}

              {dismissible && (
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleDismiss}
                  aria-label="Dismiss offline banner"
                />
              )}
            </Space>
          </div>
        }
        banner
        showIcon={false}
        style={{
          backgroundColor: '#fef3c7',
          borderColor: '#f59e0b',
        }}
      />
    </div>
  );
}

// =============================================================================
// QUALITY INDICATOR
// =============================================================================

interface QualityIndicatorProps {
  quality: ConnectionQuality;
}

/**
 * Small indicator showing connection quality
 */
function QualityIndicator({ quality }: QualityIndicatorProps) {
  const color = getQualityColor(quality);
  const label = getQualityLabel(quality);

  return (
    <Tooltip title={`Connection: ${label}`}>
      <Badge
        status="processing"
        color={color}
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 999,
        }}
      />
    </Tooltip>
  );
}

// =============================================================================
// OFFLINE INDICATOR (COMPACT VERSION)
// =============================================================================

export interface OfflineIndicatorProps {
  /**
   * Size of the indicator
   * @default 'default'
   */
  size?: 'small' | 'default' | 'large';

  /**
   * Show tooltip with details
   * @default true
   */
  showTooltip?: boolean;

  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * Compact offline indicator that can be placed inline in the UI.
 *
 * @example
 * <OfflineIndicator />
 *
 * @example
 * // In a header
 * <Header>
 *   <Logo />
 *   <OfflineIndicator size="small" />
 *   <UserMenu />
 * </Header>
 */
export function OfflineIndicator({
  size = 'default',
  showTooltip = true,
  className,
}: OfflineIndicatorProps) {
  const { isOnline, quality, isChecking } = useNetworkStatus();

  // Don't show anything if online with good connection
  if (isOnline && (quality === 'excellent' || quality === 'good')) {
    return null;
  }

  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;
  const color = isOnline ? getQualityColor(quality) : '#6b7280';

  const indicator = (
    <Space size={4} className={className} style={{ cursor: 'default' }}>
      {isChecking ? (
        <LoadingOutlined style={{ fontSize: iconSize, color }} />
      ) : isOnline ? (
        <ExclamationCircleOutlined style={{ fontSize: iconSize, color }} />
      ) : (
        <WifiOutlined style={{ fontSize: iconSize, color }} />
      )}
      {size !== 'small' && (
        <Text type="secondary" style={{ fontSize: size === 'large' ? 14 : 12 }}>
          {isOnline ? getQualityLabel(quality) : 'Offline'}
        </Text>
      )}
    </Space>
  );

  if (showTooltip) {
    const tooltipContent = isOnline
      ? `Connection quality: ${getQualityLabel(quality)}`
      : 'You are offline';

    return <Tooltip title={tooltipContent}>{indicator}</Tooltip>;
  }

  return indicator;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default OfflineBanner;
