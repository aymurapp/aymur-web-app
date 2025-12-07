/**
 * Supabase Client Exports
 *
 * Centralized exports for all Supabase client configurations.
 *
 * Import Guide:
 * - Browser/Client Components: Use createClient from './client'
 * - Server Components/Actions: Use createClient from './server'
 * - API Routes/Webhooks ONLY: Use createAdminClient from './admin'
 * - Middleware: Use updateSession from './middleware'
 * - Realtime: Use subscribeToTable, unsubscribe, etc. from './realtime'
 *
 * @module lib/supabase
 */

// Browser client - for client components
export { createClient as createBrowserClient } from './client';

// Server client - for Server Components and Server Actions
export { createClient as createServerClient } from './server';

// Admin client - ONLY for API routes and webhooks
// WARNING: Bypasses RLS - use with caution
export { createAdminClient } from './admin';

// Middleware helper - for session refresh
export { updateSession } from './middleware';

// Realtime helpers - for table subscriptions, presence, and broadcasts
export {
  subscribeToTable,
  subscribeToPresence,
  subscribeToBroadcast,
  trackPresence,
  untrackPresence,
  broadcast,
  unsubscribe,
  unsubscribeAll,
  getActiveChannels,
} from './realtime';

// Realtime types
export type {
  RealtimeEvent,
  SubscriptionStatusCallback,
  TableSubscriptionConfig,
  PresenceSubscriptionConfig,
  BroadcastSubscriptionConfig,
} from './realtime';

// Re-export types from Supabase for convenience
export type { Session, User, AuthError, RealtimeChannel } from '@supabase/supabase-js';
