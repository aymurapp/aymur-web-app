/**
 * useInventoryRealtime Hook
 *
 * Dedicated hook for inventory real-time subscriptions.
 * Provides a centralized way to manage inventory real-time updates
 * with optimistic cache management and cross-tab synchronization.
 *
 * Features:
 * - Automatic subscription to inventory changes
 * - Optimistic cache updates
 * - Cross-tab notification via BroadcastChannel
 * - Connection status tracking
 * - Event callbacks for UI notifications
 *
 * @module lib/hooks/data/useInventoryRealtime
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  useRealtime,
  type RealtimeConnectionStatus,
  type RealtimePayload,
} from '@/lib/hooks/data/useRealtime';
import { useShop } from '@/lib/hooks/shop';
import { queryKeys } from '@/lib/query/keys';
import type { Tables } from '@/lib/types/database';

import {
  inventoryKeys,
  type InventoryItem,
  type InventoryItemWithRelations,
} from './useInventoryItems';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Inventory realtime event types
 */
export type InventoryRealtimeEventType = 'insert' | 'update' | 'delete';

/**
 * Inventory realtime event payload
 */
export interface InventoryRealtimeEvent {
  type: InventoryRealtimeEventType;
  item: Partial<InventoryItem>;
  oldItem?: Partial<InventoryItem> | null;
  timestamp: string;
  shopId: string;
}

/**
 * Options for the useInventoryRealtime hook
 */
export interface UseInventoryRealtimeOptions {
  /** Enable the realtime subscription (default: true) */
  enabled?: boolean;
  /**
   * Enable optimistic cache updates.
   * When true, the TanStack Query cache is updated immediately.
   * Default: true
   */
  optimisticUpdates?: boolean;
  /**
   * Enable cross-tab notifications via BroadcastChannel.
   * Allows other tabs to react to inventory changes.
   * Default: true
   */
  broadcastToOtherTabs?: boolean;
  /** Callback when an item is inserted */
  onInsert?: (item: InventoryItem) => void;
  /** Callback when an item is updated */
  onUpdate?: (item: InventoryItem, oldItem: Partial<InventoryItem> | null) => void;
  /** Callback when an item is deleted */
  onDelete?: (oldItem: Partial<InventoryItem>) => void;
  /** Callback for any inventory change */
  onChange?: (event: InventoryRealtimeEvent) => void;
  /** Callback when connection status changes */
  onConnectionStatusChange?: (status: RealtimeConnectionStatus) => void;
}

/**
 * Return type for the useInventoryRealtime hook
 */
export interface UseInventoryRealtimeReturn {
  /** Whether the realtime subscription is active */
  isConnected: boolean;
  /** Current connection status */
  connectionStatus: RealtimeConnectionStatus;
  /** Number of reconnection attempts made */
  reconnectAttempts: number;
  /** Last error that occurred */
  lastError: Error | null;
  /** Manually reconnect */
  reconnect: () => void;
  /** Manually disconnect */
  disconnect: () => Promise<void>;
  /** Recent events (last 50) */
  recentEvents: InventoryRealtimeEvent[];
  /** Clear recent events */
  clearRecentEvents: () => void;
}

// =============================================================================
// BROADCAST CHANNEL
// =============================================================================

const BROADCAST_CHANNEL_NAME = 'inventory-realtime';

/**
 * Create a BroadcastChannel for cross-tab communication
 */
function createBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return null;
  }
  try {
    return new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch {
    return null;
  }
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Dedicated hook for inventory real-time subscriptions.
 *
 * Use this hook to subscribe to inventory changes for the current shop.
 * It automatically manages the subscription lifecycle and provides
 * optimistic cache updates for a smooth user experience.
 *
 * @example
 * ```tsx
 * function InventoryManager() {
 *   const {
 *     isConnected,
 *     connectionStatus,
 *     recentEvents,
 *   } = useInventoryRealtime({
 *     onInsert: (item) => {
 *       toast.success(`New item added: ${item.item_name}`);
 *     },
 *     onUpdate: (item) => {
 *       toast.info(`Item updated: ${item.item_name}`);
 *     },
 *     onDelete: (oldItem) => {
 *       toast.warning(`Item removed: ${oldItem.item_name}`);
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       <StatusIndicator connected={isConnected} status={connectionStatus} />
 *       <InventoryList />
 *       <RecentActivityFeed events={recentEvents} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useInventoryRealtime(
  options: UseInventoryRealtimeOptions = {}
): UseInventoryRealtimeReturn {
  const {
    enabled = true,
    optimisticUpdates = true,
    broadcastToOtherTabs = true,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    onConnectionStatusChange,
  } = options;

  const { shopId, hasAccess } = useShop();
  const queryClient = useQueryClient();

  // State
  const [connectionStatus, setConnectionStatus] =
    useState<RealtimeConnectionStatus>('disconnected');
  const [recentEvents, setRecentEvents] = useState<InventoryRealtimeEvent[]>([]);

  // Refs
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  /**
   * Add event to recent events list (max 50)
   */
  const addRecentEvent = useCallback((event: InventoryRealtimeEvent) => {
    setRecentEvents((prev) => {
      const updated = [event, ...prev];
      return updated.slice(0, 50); // Keep only last 50 events
    });
  }, []);

  /**
   * Clear recent events
   */
  const clearRecentEvents = useCallback(() => {
    setRecentEvents([]);
  }, []);

  /**
   * Broadcast event to other tabs
   */
  const broadcastEvent = useCallback(
    (event: InventoryRealtimeEvent) => {
      if (broadcastToOtherTabs && broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage(event);
        } catch {
          // Ignore broadcast errors
        }
      }
    },
    [broadcastToOtherTabs]
  );

  /**
   * Handle INSERT event
   */
  const handleInsert = useCallback(
    (record: Tables<'inventory_items'>, payload: RealtimePayload<'inventory_items'>) => {
      const event: InventoryRealtimeEvent = {
        type: 'insert',
        item: record,
        timestamp: payload.commit_timestamp,
        shopId: shopId!,
      };

      // Add to recent events
      addRecentEvent(event);

      // Broadcast to other tabs
      broadcastEvent(event);

      // Optimistic cache update
      if (optimisticUpdates) {
        queryClient.setQueriesData<{ items: InventoryItemWithRelations[]; totalCount: number }>(
          { queryKey: ['inventory', shopId, 'list'] },
          (oldData) => {
            if (!oldData) {
              return oldData;
            }

            // Check if item already exists
            const exists = oldData.items.some((item) => item.id_item === record.id_item);
            if (exists) {
              return oldData;
            }

            return {
              ...oldData,
              items: [record as InventoryItemWithRelations, ...oldData.items],
              totalCount: oldData.totalCount + 1,
            };
          }
        );
      }

      // Call user callback
      onInsert?.(record);
      onChange?.(event);
    },
    [shopId, queryClient, optimisticUpdates, addRecentEvent, broadcastEvent, onInsert, onChange]
  );

  /**
   * Handle UPDATE event
   */
  const handleUpdate = useCallback(
    (
      record: Tables<'inventory_items'>,
      oldRecord: Partial<Tables<'inventory_items'>> | null,
      payload: RealtimePayload<'inventory_items'>
    ) => {
      const event: InventoryRealtimeEvent = {
        type: 'update',
        item: record,
        oldItem: oldRecord,
        timestamp: payload.commit_timestamp,
        shopId: shopId!,
      };

      // Add to recent events
      addRecentEvent(event);

      // Broadcast to other tabs
      broadcastEvent(event);

      // Optimistic cache update
      if (optimisticUpdates) {
        // Update list caches
        queryClient.setQueriesData<{ items: InventoryItemWithRelations[]; totalCount: number }>(
          { queryKey: ['inventory', shopId, 'list'] },
          (oldData) => {
            if (!oldData) {
              return oldData;
            }

            return {
              ...oldData,
              items: oldData.items.map((item) =>
                item.id_item === record.id_item ? { ...item, ...record } : item
              ),
            };
          }
        );

        // Update single item cache
        queryClient.setQueryData<InventoryItemWithRelations>(
          inventoryKeys.detail(shopId!, record.id_item),
          (oldData) => {
            if (!oldData) {
              return oldData;
            }
            return { ...oldData, ...record };
          }
        );
      }

      // Call user callback
      onUpdate?.(record, oldRecord);
      onChange?.(event);
    },
    [shopId, queryClient, optimisticUpdates, addRecentEvent, broadcastEvent, onUpdate, onChange]
  );

  /**
   * Handle DELETE event
   */
  const handleDelete = useCallback(
    (
      oldRecord: Partial<Tables<'inventory_items'>>,
      payload: RealtimePayload<'inventory_items'>
    ) => {
      const event: InventoryRealtimeEvent = {
        type: 'delete',
        item: oldRecord,
        timestamp: payload.commit_timestamp,
        shopId: shopId!,
      };

      // Add to recent events
      addRecentEvent(event);

      // Broadcast to other tabs
      broadcastEvent(event);

      // Optimistic cache update
      if (optimisticUpdates && oldRecord.id_item) {
        // Remove from list caches
        queryClient.setQueriesData<{ items: InventoryItemWithRelations[]; totalCount: number }>(
          { queryKey: ['inventory', shopId, 'list'] },
          (oldData) => {
            if (!oldData) {
              return oldData;
            }

            return {
              ...oldData,
              items: oldData.items.filter((item) => item.id_item !== oldRecord.id_item),
              totalCount: Math.max(0, oldData.totalCount - 1),
            };
          }
        );

        // Remove single item cache
        queryClient.removeQueries({
          queryKey: inventoryKeys.detail(shopId!, oldRecord.id_item),
        });
      }

      // Call user callback
      onDelete?.(oldRecord);
      onChange?.(event);
    },
    [shopId, queryClient, optimisticUpdates, addRecentEvent, broadcastEvent, onDelete, onChange]
  );

  /**
   * Handle connection status change
   */
  const handleConnectionStatusChange = useCallback(
    (status: RealtimeConnectionStatus) => {
      setConnectionStatus(status);
      onConnectionStatusChange?.(status);
    },
    [onConnectionStatusChange]
  );

  // Setup BroadcastChannel for cross-tab communication
  useEffect(() => {
    if (broadcastToOtherTabs) {
      broadcastChannelRef.current = createBroadcastChannel();

      // Listen for events from other tabs
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.onmessage = (event: MessageEvent<InventoryRealtimeEvent>) => {
          // Only process events from other tabs (same shopId)
          if (event.data.shopId === shopId) {
            addRecentEvent(event.data);
          }
        };
      }
    }

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [broadcastToOtherTabs, shopId, addRecentEvent]);

  // Setup realtime subscription
  const {
    isSubscribed: isConnected,
    reconnectAttempts,
    lastError,
    resubscribe: reconnect,
    unsubscribe: disconnect,
  } = useRealtime({
    table: 'inventory_items',
    filter: shopId ? `id_shop=eq.${shopId}` : undefined,
    queryKey: queryKeys.inventory(shopId ?? ''),
    autoInvalidate: false, // We handle updates manually for optimistic behavior
    enabled: enabled && !!shopId && hasAccess,
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
    onConnectionStatusChange: handleConnectionStatusChange,
    autoReconnect: true,
  });

  return {
    isConnected,
    connectionStatus,
    reconnectAttempts,
    lastError,
    reconnect,
    disconnect,
    recentEvents,
    clearRecentEvents,
  };
}

// =============================================================================
// HELPER EXPORTS
// =============================================================================

/**
 * Format an inventory event for display
 */
export function formatInventoryEvent(event: InventoryRealtimeEvent): string {
  const itemName = event.item.item_name || 'Unknown item';

  switch (event.type) {
    case 'insert':
      return `New item added: ${itemName}`;
    case 'update':
      return `Item updated: ${itemName}`;
    case 'delete':
      return `Item removed: ${itemName}`;
    default:
      return `Unknown event: ${itemName}`;
  }
}

/**
 * Get event icon name (for use with icon libraries)
 */
export function getInventoryEventIcon(type: InventoryRealtimeEventType): string {
  switch (type) {
    case 'insert':
      return 'plus-circle';
    case 'update':
      return 'edit';
    case 'delete':
      return 'trash';
    default:
      return 'info';
  }
}

/**
 * Get event color for UI display
 */
export function getInventoryEventColor(type: InventoryRealtimeEventType): string {
  switch (type) {
    case 'insert':
      return 'green';
    case 'update':
      return 'blue';
    case 'delete':
      return 'red';
    default:
      return 'gray';
  }
}
