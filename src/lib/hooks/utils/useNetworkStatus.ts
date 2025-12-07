/**
 * useNetworkStatus Hook
 *
 * Detects and tracks network connectivity status with auto-retry capabilities.
 * Provides real-time online/offline status and triggers callbacks when
 * connection state changes.
 *
 * Features:
 * - Real-time online/offline detection
 * - Connection quality estimation
 * - Auto-retry callbacks when connection is restored
 * - Debounced status changes to prevent flickering
 * - Server-side rendering safe
 *
 * @module lib/hooks/utils/useNetworkStatus
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Network connection type from Network Information API
 */
export type ConnectionType =
  | 'bluetooth'
  | 'cellular'
  | 'ethernet'
  | 'wifi'
  | 'wimax'
  | 'other'
  | 'none'
  | 'unknown';

/**
 * Effective connection type (4G, 3G, etc.)
 */
export type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

/**
 * Network connection quality assessment
 */
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

/**
 * Network status information
 */
export interface NetworkStatus {
  /** Whether the browser is online */
  isOnline: boolean;

  /** Whether the browser was previously online (for detecting reconnection) */
  wasOffline: boolean;

  /** Connection type if available */
  connectionType: ConnectionType;

  /** Effective connection type (4G, 3G, etc.) */
  effectiveType: EffectiveConnectionType;

  /** Estimated downlink speed in Mbps */
  downlink: number | null;

  /** Estimated round-trip time in ms */
  rtt: number | null;

  /** Whether the user has requested reduced data usage */
  saveData: boolean;

  /** Assessed connection quality */
  quality: ConnectionQuality;

  /** Timestamp of last status change */
  lastChanged: Date | null;

  /** Time since last online state in milliseconds */
  offlineDuration: number | null;
}

/**
 * Options for configuring the useNetworkStatus hook
 */
export interface UseNetworkStatusOptions {
  /**
   * Callback when the device comes back online.
   * Useful for triggering data refetch or sync.
   */
  onOnline?: () => void;

  /**
   * Callback when the device goes offline.
   * Useful for showing offline indicators or pausing operations.
   */
  onOffline?: () => void;

  /**
   * Callback when connection quality changes.
   */
  onQualityChange?: (quality: ConnectionQuality) => void;

  /**
   * Debounce delay in milliseconds for status changes.
   * Prevents rapid flickering when connection is unstable.
   * @default 1000
   */
  debounceDelay?: number;

  /**
   * Interval in milliseconds for periodic connectivity checks.
   * Set to 0 to disable periodic checks.
   * @default 30000 (30 seconds)
   */
  checkInterval?: number;

  /**
   * URL to ping for connectivity verification.
   * Uses a lightweight endpoint to verify actual internet access.
   * @default '/api/health' or navigator.onLine fallback
   */
  pingUrl?: string;

  /**
   * Timeout for ping requests in milliseconds.
   * @default 5000
   */
  pingTimeout?: number;
}

/**
 * Return type for the useNetworkStatus hook
 */
export interface UseNetworkStatusReturn extends NetworkStatus {
  /** Manually trigger a connectivity check */
  checkConnection: () => Promise<boolean>;

  /** Whether a connectivity check is in progress */
  isChecking: boolean;
}

// =============================================================================
// NETWORK INFORMATION API TYPES
// =============================================================================

/**
 * Network Information API types (experimental API)
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API
 */
interface NetworkInformation extends EventTarget {
  type?: ConnectionType;
  effectiveType?: EffectiveConnectionType;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the Network Information API connection object
 */
function getConnection(): NetworkInformation | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const nav = navigator as NavigatorWithConnection;
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

/**
 * Assess connection quality based on network metrics
 */
function assessConnectionQuality(
  isOnline: boolean,
  effectiveType: EffectiveConnectionType,
  downlink: number | null,
  rtt: number | null
): ConnectionQuality {
  if (!isOnline) {
    return 'offline';
  }

  // Use effective type as primary indicator
  if (effectiveType === '4g') {
    if (downlink && downlink >= 10) {
      return 'excellent';
    }
    if (downlink && downlink >= 5) {
      return 'good';
    }
    return 'good';
  }

  if (effectiveType === '3g') {
    return 'fair';
  }

  if (effectiveType === '2g' || effectiveType === 'slow-2g') {
    return 'poor';
  }

  // Fallback to RTT-based assessment
  if (rtt !== null) {
    if (rtt < 100) {
      return 'excellent';
    }
    if (rtt < 300) {
      return 'good';
    }
    if (rtt < 600) {
      return 'fair';
    }
    return 'poor';
  }

  // Default to good if online but no metrics available
  return 'good';
}

/**
 * Get initial network status (SSR-safe)
 */
function getInitialStatus(): NetworkStatus {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const connection = getConnection();

  return {
    isOnline,
    wasOffline: false,
    connectionType: connection?.type || 'unknown',
    effectiveType: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink ?? null,
    rtt: connection?.rtt ?? null,
    saveData: connection?.saveData ?? false,
    quality: assessConnectionQuality(
      isOnline,
      connection?.effectiveType || 'unknown',
      connection?.downlink ?? null,
      connection?.rtt ?? null
    ),
    lastChanged: null,
    offlineDuration: null,
  };
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook that tracks network connectivity status and provides auto-retry capabilities.
 *
 * @example
 * // Basic usage
 * function MyComponent() {
 *   const { isOnline, quality } = useNetworkStatus();
 *
 *   if (!isOnline) {
 *     return <OfflineBanner />;
 *   }
 *
 *   return <div>Connection: {quality}</div>;
 * }
 *
 * @example
 * // With auto-retry on reconnection
 * function DataComponent() {
 *   const queryClient = useQueryClient();
 *
 *   const { isOnline, wasOffline } = useNetworkStatus({
 *     onOnline: () => {
 *       // Refetch queries when coming back online
 *       queryClient.refetchQueries();
 *     },
 *     onOffline: () => {
 *       // Show offline notification
 *       notification.warning({
 *         message: 'You are offline',
 *         description: 'Some features may be unavailable',
 *       });
 *     },
 *   });
 * }
 *
 * @example
 * // With periodic connectivity checks
 * const { isOnline, checkConnection, isChecking } = useNetworkStatus({
 *   checkInterval: 60000, // Check every minute
 *   pingUrl: '/api/health',
 * });
 */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}): UseNetworkStatusReturn {
  const {
    onOnline,
    onOffline,
    onQualityChange,
    debounceDelay = 1000,
    checkInterval = 30000,
    pingUrl,
    pingTimeout = 5000,
  } = options;

  // State
  const [status, setStatus] = useState<NetworkStatus>(getInitialStatus);
  const [isChecking, setIsChecking] = useState(false);

  // Refs for cleanup and preventing stale closures
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offlineStartRef = useRef<Date | null>(null);
  const previousQualityRef = useRef<ConnectionQuality>(status.quality);
  const mountedRef = useRef(true);

  /**
   * Update network status with debouncing
   */
  const updateStatus = useCallback(
    (newOnline: boolean) => {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) {
          return;
        }

        const connection = getConnection();
        const effectiveType = connection?.effectiveType || 'unknown';
        const downlink = connection?.downlink ?? null;
        const rtt = connection?.rtt ?? null;
        const newQuality = assessConnectionQuality(newOnline, effectiveType, downlink, rtt);

        setStatus((prev) => {
          // Calculate offline duration if coming back online
          let offlineDuration: number | null = null;
          if (newOnline && !prev.isOnline && offlineStartRef.current) {
            offlineDuration = Date.now() - offlineStartRef.current.getTime();
            offlineStartRef.current = null;
          }

          // Track when going offline
          if (!newOnline && prev.isOnline) {
            offlineStartRef.current = new Date();
          }

          const wasOffline = !prev.isOnline && newOnline;

          return {
            isOnline: newOnline,
            wasOffline,
            connectionType: connection?.type || 'unknown',
            effectiveType,
            downlink,
            rtt,
            saveData: connection?.saveData ?? false,
            quality: newQuality,
            lastChanged: new Date(),
            offlineDuration,
          };
        });

        // Trigger callbacks
        if (newOnline && onOnline) {
          onOnline();
        } else if (!newOnline && onOffline) {
          onOffline();
        }

        // Quality change callback
        if (newQuality !== previousQualityRef.current && onQualityChange) {
          onQualityChange(newQuality);
        }
        previousQualityRef.current = newQuality;
      }, debounceDelay);
    },
    [debounceDelay, onOnline, onOffline, onQualityChange]
  );

  /**
   * Check connection by pinging a URL
   */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') {
      return true;
    }

    setIsChecking(true);

    try {
      // First check navigator.onLine
      if (!navigator.onLine) {
        updateStatus(false);
        return false;
      }

      // If ping URL provided, verify actual connectivity
      if (pingUrl) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), pingTimeout);

        try {
          const response = await fetch(pingUrl, {
            method: 'HEAD',
            cache: 'no-store',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const isOnline = response.ok;
          updateStatus(isOnline);
          return isOnline;
        } catch {
          clearTimeout(timeoutId);
          // Network error - might be offline or URL unreachable
          // Fall back to navigator.onLine
          const isOnline = navigator.onLine;
          updateStatus(isOnline);
          return isOnline;
        }
      }

      // No ping URL - trust navigator.onLine
      updateStatus(true);
      return true;
    } finally {
      if (mountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [pingUrl, pingTimeout, updateStatus]);

  // Setup event listeners
  useEffect(() => {
    mountedRef.current = true;

    // Browser online/offline events
    const handleOnline = () => updateStatus(true);
    const handleOffline = () => updateStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API change event
    const connection = getConnection();
    const handleConnectionChange = () => {
      updateStatus(navigator.onLine);
    };

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial check
    checkConnection();

    // Setup periodic connectivity checks
    if (checkInterval > 0) {
      checkIntervalRef.current = setInterval(() => {
        checkConnection();
      }, checkInterval);
    }

    // Cleanup
    return () => {
      mountedRef.current = false;

      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [updateStatus, checkConnection, checkInterval]);

  return {
    ...status,
    checkConnection,
    isChecking,
  };
}

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Simple hook that just returns online/offline status
 *
 * @example
 * const isOnline = useIsOnline();
 */
export function useIsOnline(): boolean {
  const { isOnline } = useNetworkStatus();
  return isOnline;
}

/**
 * Hook that triggers a callback when coming back online
 *
 * @example
 * useOnReconnect(() => {
 *   queryClient.refetchQueries();
 * });
 */
export function useOnReconnect(callback: () => void): void {
  useNetworkStatus({
    onOnline: callback,
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get human-readable connection quality label
 */
export function getQualityLabel(quality: ConnectionQuality): string {
  const labels: Record<ConnectionQuality, string> = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
    offline: 'Offline',
  };
  return labels[quality];
}

/**
 * Get color for connection quality (for UI indicators)
 */
export function getQualityColor(quality: ConnectionQuality): string {
  const colors: Record<ConnectionQuality, string> = {
    excellent: '#059669', // Green
    good: '#16a34a', // Light green
    fair: '#d97706', // Amber
    poor: '#dc2626', // Red
    offline: '#6b7280', // Gray
  };
  return colors[quality];
}

/**
 * Format offline duration for display
 */
export function formatOfflineDuration(ms: number | null): string {
  if (ms === null) {
    return '';
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useNetworkStatus;
