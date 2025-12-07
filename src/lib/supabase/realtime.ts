/**
 * Supabase Realtime Subscription Helpers
 *
 * Provides typed helpers for subscribing to realtime database changes,
 * presence tracking, and broadcast messaging.
 *
 * Usage:
 * ```typescript
 * import { subscribeToTable, unsubscribe } from '@/lib/supabase/realtime';
 *
 * // Subscribe to table changes
 * const channel = subscribeToTable<Customer>({
 *   channel: 'customers-changes',
 *   table: 'customers',
 *   event: '*',
 *   onInsert: (customer) => console.log('New customer:', customer),
 *   onUpdate: ({ old, new: updated }) => console.log('Updated:', updated),
 *   onDelete: (customer) => console.log('Deleted:', customer),
 * });
 *
 * // Clean up when done
 * unsubscribe(channel);
 * ```
 *
 * @module lib/supabase/realtime
 */

import { createClient } from './client';

import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  REALTIME_SUBSCRIBE_STATES,
  RealtimeChannelOptions,
} from '@supabase/supabase-js';

/**
 * Realtime event types for postgres changes.
 */
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * Subscription status callback type.
 */
export type SubscriptionStatusCallback = (
  status: `${REALTIME_SUBSCRIBE_STATES}`,
  error?: Error
) => void;

/**
 * Configuration for table subscriptions.
 */
export interface TableSubscriptionConfig<T extends Record<string, unknown>> {
  /** Unique channel name for this subscription */
  channel: string;
  /** Table name to subscribe to */
  table: string;
  /** Database schema (defaults to 'public') */
  schema?: string;
  /** Filter expression (e.g., 'id_shop=eq.123') */
  filter?: string;
  /** Event type to listen for */
  event?: RealtimeEvent;
  /** Callback for INSERT events */
  onInsert?: (payload: T) => void;
  /** Callback for UPDATE events (receives both old and new records) */
  onUpdate?: (payload: { old: T; new: T }) => void;
  /** Callback for DELETE events */
  onDelete?: (payload: T) => void;
  /** Callback for all events (alternative to individual callbacks) */
  onAny?: (
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: RealtimePostgresChangesPayload<T>
  ) => void;
  /** Callback for subscription status changes */
  onStatusChange?: SubscriptionStatusCallback;
}

/**
 * Configuration for presence subscriptions.
 */
export interface PresenceSubscriptionConfig<T extends Record<string, unknown>> {
  /** Unique channel name for this subscription */
  channel: string;
  /** Unique key identifying this client */
  presenceKey?: string;
  /** Callback when presence state syncs */
  onSync?: (state: Record<string, T[]>) => void;
  /** Callback when a user joins */
  onJoin?: (key: string, newPresences: T[]) => void;
  /** Callback when a user leaves */
  onLeave?: (key: string, leftPresences: T[]) => void;
  /** Callback for subscription status changes */
  onStatusChange?: SubscriptionStatusCallback;
}

/**
 * Configuration for broadcast subscriptions.
 */
export interface BroadcastSubscriptionConfig<T extends Record<string, unknown>> {
  /** Unique channel name for this subscription */
  channel: string;
  /** Event name to listen for */
  event: string;
  /** Callback when a broadcast message is received */
  onMessage: (payload: T) => void;
  /** Whether to receive your own broadcasts (default: false) */
  self?: boolean;
  /** Whether to wait for server acknowledgment (default: false) */
  ack?: boolean;
  /** Callback for subscription status changes */
  onStatusChange?: SubscriptionStatusCallback;
}

/**
 * Subscribes to realtime changes on a database table.
 *
 * This function sets up listeners for INSERT, UPDATE, and DELETE events
 * on the specified table. RLS policies are respected - you will only
 * receive changes for rows the current user has access to.
 *
 * @param config - Subscription configuration
 * @returns The realtime channel (used for unsubscribing)
 *
 * @example
 * ```typescript
 * const channel = subscribeToTable<Customer>({
 *   channel: 'shop-customers',
 *   table: 'customers',
 *   filter: 'id_shop=eq.abc123',
 *   onInsert: (customer) => {
 *     toast.success(`New customer: ${customer.name}`);
 *   },
 *   onUpdate: ({ old, new: updated }) => {
 *     console.log('Customer updated:', updated.name);
 *   },
 * });
 * ```
 */
export function subscribeToTable<T extends Record<string, unknown>>({
  channel: channelName,
  table,
  schema = 'public',
  filter,
  event = '*',
  onInsert,
  onUpdate,
  onDelete,
  onAny,
  onStatusChange,
}: TableSubscriptionConfig<T>): RealtimeChannel {
  const supabase = createClient();

  // Build the channel configuration
  // Using type assertion to match Supabase's expected types
  const channelConfig = {
    event,
    schema,
    table,
    ...(filter ? { filter } : {}),
  } as const;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes' as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channelConfig as any,
      (payload: RealtimePostgresChangesPayload<T>) => {
        const eventType = payload.eventType;

        // Call the onAny callback if provided
        if (onAny) {
          onAny(eventType, payload);
        }

        // Call specific callbacks based on event type
        switch (eventType) {
          case 'INSERT':
            if (onInsert && payload.new) {
              onInsert(payload.new as T);
            }
            break;
          case 'UPDATE':
            if (onUpdate && payload.old && payload.new) {
              onUpdate({
                old: payload.old as T,
                new: payload.new as T,
              });
            }
            break;
          case 'DELETE':
            if (onDelete && payload.old) {
              onDelete(payload.old as T);
            }
            break;
        }
      }
    )
    .subscribe((status, error) => {
      if (onStatusChange) {
        onStatusChange(status, error);
      }

      // Log errors in development
      if (status === 'CHANNEL_ERROR' && error) {
        console.error(`[Realtime] Channel ${channelName} error:`, error.message);
      }
    });

  return channel;
}

/**
 * Subscribes to presence updates for tracking online users.
 *
 * Presence allows you to track which users are currently online
 * and share ephemeral state between clients.
 *
 * @param config - Presence subscription configuration
 * @returns The realtime channel
 *
 * @example
 * ```typescript
 * const channel = subscribeToPresence<{ id: string; name: string }>({
 *   channel: 'online-users',
 *   presenceKey: currentUser.id,
 *   onSync: (state) => {
 *     const onlineUsers = Object.values(state).flat();
 *     setOnlineUsers(onlineUsers);
 *   },
 *   onJoin: (key, presences) => {
 *     console.log(`User ${presences[0]?.name} came online`);
 *   },
 *   onLeave: (key, presences) => {
 *     console.log(`User ${presences[0]?.name} went offline`);
 *   },
 * });
 *
 * // Track your own presence
 * await trackPresence(channel, { id: currentUser.id, name: currentUser.name });
 * ```
 */
export function subscribeToPresence<T extends Record<string, unknown>>({
  channel: channelName,
  presenceKey,
  onSync,
  onJoin,
  onLeave,
  onStatusChange,
}: PresenceSubscriptionConfig<T>): RealtimeChannel {
  const supabase = createClient();

  // Build channel options with presence config
  const channelOptions: RealtimeChannelOptions = {
    config: {
      presence: presenceKey ? { key: presenceKey } : {},
    },
  };

  const channel = supabase.channel(channelName, channelOptions);

  if (onSync) {
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      // Cast the state to the expected type
      onSync(state as unknown as Record<string, T[]>);
    });
  }

  if (onJoin) {
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      onJoin(key, newPresences as unknown as T[]);
    });
  }

  if (onLeave) {
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      onLeave(key, leftPresences as unknown as T[]);
    });
  }

  channel.subscribe((status, error) => {
    if (onStatusChange) {
      onStatusChange(status, error);
    }

    if (status === 'CHANNEL_ERROR' && error) {
      console.error(`[Realtime] Presence channel ${channelName} error:`, error.message);
    }
  });

  return channel;
}

/**
 * Tracks presence state on a channel.
 *
 * Call this after subscribing to presence to announce your presence
 * to other connected clients.
 *
 * @param channel - The realtime channel
 * @param state - The presence state to track
 * @returns Promise resolving to 'ok' on success
 */
export async function trackPresence<T extends Record<string, unknown>>(
  channel: RealtimeChannel,
  state: T
): Promise<string> {
  return await channel.track(state);
}

/**
 * Untracks presence state on a channel.
 *
 * Call this to remove your presence from the channel.
 *
 * @param channel - The realtime channel
 * @returns Promise resolving to 'ok' on success
 */
export async function untrackPresence(channel: RealtimeChannel): Promise<string> {
  return await channel.untrack();
}

/**
 * Subscribes to broadcast messages on a channel.
 *
 * Broadcast allows you to send messages to all connected clients
 * on a channel without persisting them to the database.
 *
 * @param config - Broadcast subscription configuration
 * @returns The realtime channel
 *
 * @example
 * ```typescript
 * const channel = subscribeToBroadcast<{ cursor: { x: number; y: number } }>({
 *   channel: 'cursor-tracking',
 *   event: 'cursor-move',
 *   onMessage: (payload) => {
 *     updateRemoteCursor(payload.cursor);
 *   },
 * });
 *
 * // Send broadcast messages
 * await broadcast(channel, 'cursor-move', { cursor: { x: 100, y: 200 } });
 * ```
 */
export function subscribeToBroadcast<T extends Record<string, unknown>>({
  channel: channelName,
  event,
  onMessage,
  self = false,
  ack = false,
  onStatusChange,
}: BroadcastSubscriptionConfig<T>): RealtimeChannel {
  const supabase = createClient();

  const channelOptions: RealtimeChannelOptions = {
    config: {
      broadcast: { self, ack },
    },
  };

  const channel = supabase
    .channel(channelName, channelOptions)
    .on('broadcast', { event }, (payload) => {
      onMessage(payload.payload as T);
    })
    .subscribe((status, error) => {
      if (onStatusChange) {
        onStatusChange(status, error);
      }

      if (status === 'CHANNEL_ERROR' && error) {
        console.error(`[Realtime] Broadcast channel ${channelName} error:`, error.message);
      }
    });

  return channel;
}

/**
 * Sends a broadcast message to all clients on a channel.
 *
 * @param channel - The realtime channel
 * @param event - The event name
 * @param payload - The message payload
 * @returns Promise resolving to 'ok' on success (if ack is enabled)
 */
export async function broadcast<T extends Record<string, unknown>>(
  channel: RealtimeChannel,
  event: string,
  payload: T
): Promise<'ok' | 'error' | 'timed out'> {
  const result = await channel.send({
    type: 'broadcast',
    event,
    payload,
  });
  return result;
}

/**
 * Unsubscribes from a realtime channel.
 *
 * Always call this when you're done with a subscription to prevent
 * memory leaks and unnecessary network traffic.
 *
 * @param channel - The realtime channel to unsubscribe from
 *
 * @example
 * ```typescript
 * // In a React component
 * useEffect(() => {
 *   const channel = subscribeToTable({...});
 *
 *   return () => {
 *     unsubscribe(channel);
 *   };
 * }, []);
 * ```
 */
export function unsubscribe(channel: RealtimeChannel): void {
  const supabase = createClient();
  channel.unsubscribe();
  supabase.removeChannel(channel);
}

/**
 * Unsubscribes from all realtime channels.
 *
 * Useful for cleanup when the user logs out or navigates away.
 */
export function unsubscribeAll(): void {
  const supabase = createClient();
  supabase.removeAllChannels();
}

/**
 * Gets all active realtime channels.
 *
 * @returns Array of active channels
 */
export function getActiveChannels(): RealtimeChannel[] {
  const supabase = createClient();
  return supabase.getChannels();
}
