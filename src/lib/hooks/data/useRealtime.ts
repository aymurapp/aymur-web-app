/**
 * useRealtime Hook
 *
 * A React hook for subscribing to Supabase Realtime Postgres Changes.
 * Automatically manages subscriptions, integrates with TanStack Query
 * for cache invalidation, and provides callbacks for INSERT, UPDATE, DELETE events.
 *
 * Features:
 * - Automatic subscription management (subscribe on mount, cleanup on unmount)
 * - Reconnection with exponential backoff
 * - Connection status tracking
 * - Integration with TanStack Query for automatic cache invalidation
 * - Typed callbacks for INSERT, UPDATE, DELETE events
 * - Support for filters to limit received events
 *
 * @module lib/hooks/data/useRealtime
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/types/database';

import type { RealtimeChannel } from '@supabase/supabase-js';

// Extract table names from database schema
type TableName = keyof Database['public']['Tables'];

// Extract row type for a given table
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

/**
 * Realtime event types
 */
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * Connection status for realtime subscriptions
 */
export type RealtimeConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

/**
 * Reconnection configuration options
 */
export interface ReconnectionConfig {
  /** Maximum number of reconnection attempts (default: 10) */
  maxAttempts?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in ms between attempts (default: 30000) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
}

/**
 * Payload structure for realtime events
 */
export interface RealtimePayload<T extends TableName> {
  /** The type of event that occurred */
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  /** The new record (for INSERT and UPDATE) */
  new: Partial<TableRow<T>> | null;
  /** The old record (for UPDATE and DELETE, requires replica identity full) */
  old: Partial<TableRow<T>> | null;
  /** The table that was modified */
  table: string;
  /** The schema of the table */
  schema: string;
  /** Commit timestamp */
  commit_timestamp: string;
  /** Any errors that occurred */
  errors: string[] | null;
}

/**
 * Raw postgres changes payload from Supabase
 */
interface PostgresChangesPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
  table: string;
  schema: string;
  commit_timestamp: string;
  errors: string[] | null;
}

/**
 * Options for configuring the Realtime subscription
 */
export interface UseRealtimeOptions<T extends TableName> {
  /** The database table to subscribe to */
  table: T;

  /** The schema to listen to (default: 'public') */
  schema?: string;

  /**
   * Event types to listen for.
   * Use '*' to listen to all events, or specify specific events.
   * Default: '*'
   */
  event?: RealtimeEvent;

  /**
   * Filter expression for the subscription.
   * Format: 'column=eq.value' (e.g., 'id_shop=eq.abc123')
   */
  filter?: string;

  /**
   * Query keys to invalidate when changes are detected.
   * Each element is a query key array.
   */
  queryKey?: readonly unknown[];

  /**
   * Whether to automatically invalidate the queryKey on any change.
   * Default: true
   */
  autoInvalidate?: boolean;

  /** Callback when a new record is inserted */
  onInsert?: (record: TableRow<T>, payload: RealtimePayload<T>) => void;

  /** Callback when a record is updated */
  onUpdate?: (
    record: TableRow<T>,
    oldRecord: Partial<TableRow<T>> | null,
    payload: RealtimePayload<T>
  ) => void;

  /** Callback when a record is deleted */
  onDelete?: (oldRecord: Partial<TableRow<T>>, payload: RealtimePayload<T>) => void;

  /** Callback for any change event */
  onChange?: (payload: RealtimePayload<T>) => void;

  /** Callback when subscription status changes */
  onStatusChange?: (status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED') => void;

  /** Callback when connection status changes (for UI indicators) */
  onConnectionStatusChange?: (status: RealtimeConnectionStatus) => void;

  /** Callback when an error occurs */
  onError?: (error: Error) => void;

  /** Whether the subscription is enabled (default: true) */
  enabled?: boolean;

  /**
   * Enable automatic reconnection on connection loss.
   * Default: true
   */
  autoReconnect?: boolean;

  /**
   * Configuration for reconnection behavior
   */
  reconnectionConfig?: ReconnectionConfig;
}

/**
 * Return value from useRealtime hook
 */
export interface UseRealtimeReturn {
  /** The current channel instance */
  channel: RealtimeChannel | null;
  /** Whether the subscription is active */
  isSubscribed: boolean;
  /** Current connection status */
  connectionStatus: RealtimeConnectionStatus;
  /** Number of reconnection attempts made */
  reconnectAttempts: number;
  /** Last error that occurred */
  lastError: Error | null;
  /** Manually unsubscribe from the channel */
  unsubscribe: () => Promise<void>;
  /** Manually resubscribe to the channel */
  resubscribe: () => void;
}

/**
 * A React hook for subscribing to Supabase Realtime Postgres Changes.
 *
 * Features:
 * - Automatic subscription management (subscribe on mount, cleanup on unmount)
 * - Integration with TanStack Query for automatic cache invalidation
 * - Typed callbacks for INSERT, UPDATE, DELETE events
 * - Support for filters to limit received events
 * - Reconnection handling
 *
 * @example
 * // Basic usage - invalidate query on any change
 * useRealtime({
 *   table: 'customers',
 *   filter: `id_shop=eq.${shopId}`,
 *   queryKey: ['customers', shopId]
 * });
 *
 * @example
 * // With specific event handlers
 * useRealtime({
 *   table: 'customers',
 *   filter: `id_shop=eq.${shopId}`,
 *   queryKey: ['customers', shopId],
 *   onInsert: (customer) => {
 *     toast.success(`New customer: ${customer.full_name}`);
 *   },
 *   onUpdate: (customer, oldCustomer) => {
 *     console.log('Customer updated:', customer.id_customer);
 *   },
 *   onDelete: (oldCustomer) => {
 *     toast.info('Customer removed');
 *   }
 * });
 *
 * @example
 * // Listen only to INSERT events
 * useRealtime({
 *   table: 'sales',
 *   event: 'INSERT',
 *   filter: `id_shop=eq.${shopId}`,
 *   onInsert: (sale) => {
 *     playNotificationSound();
 *     toast.success(`New sale: ${sale.sale_number}`);
 *   }
 * });
 *
 * @example
 * // Manual control without auto-invalidation
 * const { isSubscribed, unsubscribe, resubscribe } = useRealtime({
 *   table: 'inventory_items',
 *   filter: `id_shop=eq.${shopId}`,
 *   autoInvalidate: false,
 *   onChange: (payload) => {
 *     // Handle change manually
 *     if (payload.eventType === 'UPDATE') {
 *       updateLocalState(payload.new);
 *     }
 *   }
 * });
 */
// Default reconnection configuration
const DEFAULT_RECONNECTION_CONFIG: Required<ReconnectionConfig> = {
  maxAttempts: 10,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(attempt: number, config: Required<ReconnectionConfig>): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

export function useRealtime<T extends TableName>(
  options: UseRealtimeOptions<T>
): UseRealtimeReturn {
  const {
    table,
    schema = 'public',
    event = '*',
    filter,
    queryKey,
    autoInvalidate = true,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    onStatusChange,
    onConnectionStatusChange,
    onError,
    enabled = true,
    autoReconnect = true,
    reconnectionConfig,
  } = options;

  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // State for connection status
  const [connectionStatus, setConnectionStatus] =
    useState<RealtimeConnectionStatus>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Merge reconnection config with defaults
  const mergedReconnectionConfig: Required<ReconnectionConfig> = {
    ...DEFAULT_RECONNECTION_CONFIG,
    ...reconnectionConfig,
  };

  /**
   * Update connection status and notify callback
   */
  const updateConnectionStatus = useCallback(
    (status: RealtimeConnectionStatus) => {
      setConnectionStatus(status);
      onConnectionStatusChange?.(status);
    },
    [onConnectionStatusChange]
  );

  /**
   * Clear any pending reconnection timeout
   */
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Handles incoming realtime payloads
   */
  const handlePayload = useCallback(
    (payload: PostgresChangesPayload) => {
      const realtimePayload: RealtimePayload<T> = {
        eventType: payload.eventType,
        new: (payload.new || null) as Partial<TableRow<T>> | null,
        old: (payload.old || null) as Partial<TableRow<T>> | null,
        table: payload.table,
        schema: payload.schema,
        commit_timestamp: payload.commit_timestamp,
        errors: payload.errors,
      };

      // Call onChange for all events
      if (onChange) {
        onChange(realtimePayload);
      }

      // Call specific event handlers
      switch (payload.eventType) {
        case 'INSERT':
          if (onInsert && payload.new) {
            onInsert(payload.new as TableRow<T>, realtimePayload);
          }
          break;

        case 'UPDATE':
          if (onUpdate && payload.new) {
            onUpdate(
              payload.new as TableRow<T>,
              (payload.old || null) as Partial<TableRow<T>> | null,
              realtimePayload
            );
          }
          break;

        case 'DELETE':
          if (onDelete && payload.old) {
            onDelete(payload.old as Partial<TableRow<T>>, realtimePayload);
          }
          break;
      }

      // Auto-invalidate query cache
      if (autoInvalidate && queryKey) {
        queryClient.invalidateQueries({ queryKey: queryKey as unknown[] });
      }
    },
    [onChange, onInsert, onUpdate, onDelete, autoInvalidate, queryKey, queryClient]
  );

  /**
   * Attempt reconnection with exponential backoff
   */
  const attemptReconnect = useCallback(() => {
    if (!autoReconnect || !enabled) {
      return;
    }

    const attempts = reconnectAttemptsRef.current;

    if (attempts >= mergedReconnectionConfig.maxAttempts) {
      updateConnectionStatus('error');
      setLastError(new Error(`Failed to reconnect after ${attempts} attempts`));
      onError?.(new Error(`Failed to reconnect after ${attempts} attempts`));
      return;
    }

    updateConnectionStatus('reconnecting');
    const delay = calculateBackoffDelay(attempts, mergedReconnectionConfig);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1;
      setReconnectAttempts(reconnectAttemptsRef.current);
      // subscribe will be called after this timeout
      channelRef.current = null;
      isSubscribedRef.current = false;
    }, delay);
  }, [autoReconnect, enabled, mergedReconnectionConfig, updateConnectionStatus, onError]);

  /**
   * Subscribe to the realtime channel
   */
  const subscribe = useCallback(() => {
    if (!enabled) {
      return;
    }

    updateConnectionStatus('connecting');
    const supabase = createClient();

    // Generate a unique channel name
    const channelName = filter ? `${table}-${filter}-${Date.now()}` : `${table}-${Date.now()}`;

    // Create the channel and subscribe to postgres changes
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as 'system', // Type assertion needed for Supabase types
        {
          event,
          schema,
          table,
          filter,
        } as { event: string },
        (payload: unknown) => handlePayload(payload as PostgresChangesPayload)
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          // Reset reconnect attempts on successful connection
          reconnectAttemptsRef.current = 0;
          setReconnectAttempts(0);
          setLastError(null);
          updateConnectionStatus('connected');
          onStatusChange?.('SUBSCRIBED');
        } else if (status === 'CHANNEL_ERROR') {
          isSubscribedRef.current = false;
          const error = err ? new Error(err.message) : new Error('Channel error');
          setLastError(error);
          onStatusChange?.('CHANNEL_ERROR');
          if (err) {
            onError?.(error);
          }
          // Attempt reconnection
          attemptReconnect();
        } else if (status === 'TIMED_OUT') {
          isSubscribedRef.current = false;
          updateConnectionStatus('disconnected');
          setLastError(new Error('Connection timed out'));
          onStatusChange?.('TIMED_OUT');
          // Attempt reconnection
          attemptReconnect();
        } else if (status === 'CLOSED') {
          isSubscribedRef.current = false;
          updateConnectionStatus('disconnected');
          onStatusChange?.('CLOSED');
        }
      });

    channelRef.current = channel;
  }, [
    enabled,
    table,
    schema,
    event,
    filter,
    handlePayload,
    onStatusChange,
    onError,
    updateConnectionStatus,
    attemptReconnect,
  ]);

  /**
   * Unsubscribe from the channel
   */
  const unsubscribe = useCallback(async () => {
    // Clear any pending reconnection timeout
    clearReconnectTimeout();

    if (channelRef.current) {
      const supabase = createClient();
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
      updateConnectionStatus('disconnected');
    }
  }, [clearReconnectTimeout, updateConnectionStatus]);

  /**
   * Resubscribe to the channel (resets reconnection attempts)
   */
  const resubscribe = useCallback(() => {
    // Reset reconnection attempts on manual resubscribe
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    setLastError(null);

    unsubscribe().then(() => {
      subscribe();
    });
  }, [unsubscribe, subscribe]);

  // Subscribe on mount, cleanup on unmount
  useEffect(() => {
    if (enabled) {
      subscribe();
    }

    return () => {
      // Clear reconnect timeout
      clearReconnectTimeout();

      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [enabled, subscribe, clearReconnectTimeout]);

  // Resubscribe when key dependencies change
  useEffect(() => {
    if (enabled && channelRef.current) {
      resubscribe();
    }
    // We intentionally only depend on table, filter, and event
    // to avoid excessive resubscriptions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, event]);

  return {
    channel: channelRef.current,
    isSubscribed: isSubscribedRef.current,
    connectionStatus,
    reconnectAttempts,
    lastError,
    unsubscribe,
    resubscribe,
  };
}

/**
 * Type helper for the realtime payload
 */
export type UseRealtimePayload<T extends TableName> = RealtimePayload<T>;
