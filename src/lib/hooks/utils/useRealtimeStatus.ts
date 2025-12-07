/**
 * useRealtimeStatus Hook
 *
 * Hook to track and display realtime connection status across the application.
 * Provides a centralized way to monitor Supabase Realtime connection health.
 *
 * Features:
 * - Global connection status tracking
 * - Retry logic with exponential backoff
 * - Visual status indicator support
 * - Connection quality monitoring
 *
 * @module lib/hooks/utils/useRealtimeStatus
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

import type { RealtimeChannel } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Connection status states
 */
export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

/**
 * Connection quality indicator
 */
export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'none';

/**
 * Options for the useRealtimeStatus hook
 */
export interface UseRealtimeStatusOptions {
  /** Enable automatic status monitoring (default: true) */
  enabled?: boolean;
  /** Enable automatic reconnection attempts (default: true) */
  autoReconnect?: boolean;
  /** Maximum number of reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Base delay in ms for reconnection (default: 1000) */
  reconnectBaseDelay?: number;
  /** Maximum delay in ms for reconnection (default: 30000) */
  reconnectMaxDelay?: number;
  /** Callback when status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Callback when reconnection starts */
  onReconnecting?: (attempt: number) => void;
  /** Callback when connection is established */
  onConnected?: () => void;
  /** Callback when connection is lost */
  onDisconnected?: () => void;
  /** Callback when max reconnect attempts reached */
  onMaxReconnectAttemptsReached?: () => void;
}

/**
 * Return type for the useRealtimeStatus hook
 */
export interface UseRealtimeStatusReturn {
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether the connection is currently active */
  isConnected: boolean;
  /** Whether the connection is currently attempting to connect */
  isConnecting: boolean;
  /** Whether the connection is currently reconnecting */
  isReconnecting: boolean;
  /** Whether there was a connection error */
  hasError: boolean;
  /** Number of reconnection attempts made */
  reconnectAttempts: number;
  /** Last error that occurred */
  lastError: Error | null;
  /** Connection quality indicator */
  connectionQuality: ConnectionQuality;
  /** Time since last successful connection (ms) */
  timeSinceLastConnection: number | null;
  /** Manually trigger reconnection */
  reconnect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Determine connection quality based on reconnect attempts
 */
function getConnectionQuality(
  status: ConnectionStatus,
  reconnectAttempts: number
): ConnectionQuality {
  if (status === 'connected') {
    if (reconnectAttempts === 0) {
      return 'excellent';
    }
    if (reconnectAttempts < 3) {
      return 'good';
    }
    return 'poor';
  }
  return 'none';
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to track and manage realtime connection status.
 *
 * @example
 * ```tsx
 * function RealtimeStatusIndicator() {
 *   const {
 *     status,
 *     isConnected,
 *     connectionQuality,
 *     reconnectAttempts,
 *     reconnect
 *   } = useRealtimeStatus({
 *     onDisconnected: () => console.log('Connection lost'),
 *     onConnected: () => console.log('Connection established'),
 *   });
 *
 *   return (
 *     <div className="flex items-center gap-2">
 *       <StatusDot quality={connectionQuality} />
 *       <span>{status}</span>
 *       {!isConnected && (
 *         <button onClick={reconnect}>Reconnect</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealtimeStatus(options: UseRealtimeStatusOptions = {}): UseRealtimeStatusReturn {
  const {
    enabled = true,
    autoReconnect = true,
    maxReconnectAttempts = 10,
    reconnectBaseDelay = 1000,
    reconnectMaxDelay = 30000,
    onStatusChange,
    onReconnecting,
    onConnected,
    onDisconnected,
    onMaxReconnectAttemptsReached,
  } = options;

  // State
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [lastConnectionTime, setLastConnectionTime] = useState<number | null>(null);

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Update status and trigger callback
   */
  const updateStatus = useCallback(
    (newStatus: ConnectionStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);

      if (newStatus === 'connected') {
        setLastConnectionTime(Date.now());
        onConnected?.();
      } else if (newStatus === 'disconnected') {
        onDisconnected?.();
      }
    },
    [onStatusChange, onConnected, onDisconnected]
  );

  /**
   * Clear reconnection timeout
   */
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Subscribe to a heartbeat channel to monitor connection
   */
  const subscribe = useCallback(() => {
    if (!enabled) {
      return;
    }

    updateStatus('connecting');
    const supabase = createClient();

    // Create a heartbeat channel to monitor connection
    const channel = supabase
      .channel('realtime-status-monitor')
      .subscribe((subscriptionStatus, err) => {
        if (subscriptionStatus === 'SUBSCRIBED') {
          setReconnectAttempts(0);
          setLastError(null);
          updateStatus('connected');
        } else if (subscriptionStatus === 'CHANNEL_ERROR') {
          const error = err ? new Error(err.message) : new Error('Channel error');
          setLastError(error);
          updateStatus('error');
        } else if (subscriptionStatus === 'TIMED_OUT') {
          setLastError(new Error('Connection timed out'));
          updateStatus('disconnected');
        } else if (subscriptionStatus === 'CLOSED') {
          updateStatus('disconnected');
        }
      });

    channelRef.current = channel;
  }, [enabled, updateStatus]);

  /**
   * Unsubscribe from the heartbeat channel
   */
  const unsubscribe = useCallback(async () => {
    clearReconnectTimeout();

    if (channelRef.current) {
      const supabase = createClient();
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [clearReconnectTimeout]);

  /**
   * Attempt reconnection with exponential backoff
   */
  const attemptReconnect = useCallback(() => {
    if (!autoReconnect || !enabled) {
      return;
    }

    if (reconnectAttempts >= maxReconnectAttempts) {
      updateStatus('error');
      setLastError(new Error(`Max reconnect attempts (${maxReconnectAttempts}) reached`));
      onMaxReconnectAttemptsReached?.();
      return;
    }

    updateStatus('reconnecting');
    onReconnecting?.(reconnectAttempts + 1);

    const delay = calculateBackoffDelay(reconnectAttempts, reconnectBaseDelay, reconnectMaxDelay);

    reconnectTimeoutRef.current = setTimeout(async () => {
      setReconnectAttempts((prev) => prev + 1);
      await unsubscribe();
      subscribe();
    }, delay);
  }, [
    autoReconnect,
    enabled,
    reconnectAttempts,
    maxReconnectAttempts,
    reconnectBaseDelay,
    reconnectMaxDelay,
    updateStatus,
    onReconnecting,
    onMaxReconnectAttemptsReached,
    unsubscribe,
    subscribe,
  ]);

  // Export attemptReconnect for potential future use
  void attemptReconnect;

  /**
   * Manual reconnect
   */
  const reconnect = useCallback(() => {
    setReconnectAttempts(0);
    setLastError(null);
    unsubscribe().then(() => {
      subscribe();
    });
  }, [unsubscribe, subscribe]);

  /**
   * Manual disconnect
   */
  const disconnect = useCallback(() => {
    unsubscribe();
    updateStatus('disconnected');
  }, [unsubscribe, updateStatus]);

  // Subscribe on mount, cleanup on unmount
  useEffect(() => {
    if (enabled) {
      subscribe();
    }

    return () => {
      clearReconnectTimeout();
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, subscribe, clearReconnectTimeout]);

  // Calculate time since last connection
  const timeSinceLastConnection = lastConnectionTime ? Date.now() - lastConnectionTime : null;

  // Calculate connection quality
  const connectionQuality = getConnectionQuality(status, reconnectAttempts);

  return {
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isReconnecting: status === 'reconnecting',
    hasError: status === 'error',
    reconnectAttempts,
    lastError,
    connectionQuality,
    timeSinceLastConnection,
    reconnect,
    disconnect,
  };
}

// =============================================================================
// STATUS DISPLAY HELPERS
// =============================================================================

/**
 * Get a human-readable status message
 */
export function getStatusMessage(status: ConnectionStatus): string {
  switch (status) {
    case 'connecting':
      return 'Connecting...';
    case 'connected':
      return 'Connected';
    case 'disconnected':
      return 'Disconnected';
    case 'reconnecting':
      return 'Reconnecting...';
    case 'error':
      return 'Connection Error';
    default:
      return 'Unknown';
  }
}

/**
 * Get status color for UI display
 */
export function getStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'green';
    case 'connecting':
    case 'reconnecting':
      return 'yellow';
    case 'disconnected':
      return 'gray';
    case 'error':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Get quality color for UI display
 */
export function getQualityColor(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent':
      return 'green';
    case 'good':
      return 'lime';
    case 'poor':
      return 'yellow';
    case 'none':
      return 'gray';
    default:
      return 'gray';
  }
}
