/**
 * Supabase Browser Client
 *
 * Creates a Supabase client for use in browser/client components.
 * Uses the anon key which respects Row Level Security (RLS) policies.
 *
 * Usage:
 * ```typescript
 * import { createClient } from '@/lib/supabase/client';
 *
 * const supabase = createClient();
 * const { data } = await supabase.from('customers').select('*');
 * ```
 *
 * @module lib/supabase/client
 */

import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/lib/types/database';

/**
 * Singleton instance for browser client.
 * Reused across the application to maintain consistent auth state.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Creates or returns the existing Supabase browser client.
 *
 * This client:
 * - Uses the public anon key (safe to expose in browser)
 * - Respects all RLS policies
 * - Automatically refreshes auth tokens
 * - Maintains session state across browser tabs
 *
 * @returns {SupabaseClient<Database>} Typed Supabase client instance
 */
export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return browserClient;
}
