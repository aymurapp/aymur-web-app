/**
 * Supabase Admin Client
 *
 * Creates a Supabase client with service_role privileges.
 * This client BYPASSES Row Level Security (RLS) policies.
 *
 * ============================================================================
 * WARNING: SECURITY-CRITICAL CODE
 * ============================================================================
 *
 * This client should ONLY be used in:
 * - API Route Handlers (/app/api/*)
 * - Webhook handlers (Stripe, Supabase webhooks)
 * - Server-side admin operations
 * - Background jobs and cron tasks
 *
 * NEVER:
 * - Import this in client components
 * - Import this in Server Components that render user data
 * - Use for operations that should respect user permissions
 * - Expose the service_role key to the browser
 *
 * Usage (API Routes only):
 * ```typescript
 * import { createAdminClient } from '@/lib/supabase/admin';
 *
 * export async function POST(request: Request) {
 *   const supabase = createAdminClient();
 *   // Perform admin operations...
 * }
 * ```
 *
 * @module lib/supabase/admin
 */

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/types/database';

/**
 * Creates a Supabase admin client with service_role privileges.
 *
 * This client:
 * - Uses the service_role key (BYPASSES RLS)
 * - Has full database access
 * - Does not persist sessions
 * - Does not auto-refresh tokens
 *
 * Security considerations:
 * - All operations bypass RLS policies
 * - Can read/write ANY data in the database
 * - Should validate permissions manually before operations
 * - Must never be exposed to client-side code
 *
 * @returns {SupabaseClient<Database>} Admin Supabase client instance
 * @throws {Error} If SUPABASE_SERVICE_ROLE_KEY is not configured
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
        'This key is required for admin operations and should only be used server-side.'
    );
  }

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: {
      // Disable auto-refresh since this is a service account
      autoRefreshToken: false,
      // Disable session persistence - each request is stateless
      persistSession: false,
    },
  });
}
