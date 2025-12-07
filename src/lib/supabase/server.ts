/**
 * Supabase Server Client
 *
 * Creates a Supabase client for use in React Server Components and Server Actions.
 * Handles cookie-based session management with Next.js App Router.
 *
 * Usage in Server Components:
 * ```typescript
 * import { createClient } from '@/lib/supabase/server';
 *
 * export default async function Page() {
 *   const supabase = await createClient();
 *   const { data } = await supabase.from('customers').select('*');
 *   return <div>{JSON.stringify(data)}</div>;
 * }
 * ```
 *
 * Usage in Server Actions:
 * ```typescript
 * 'use server'
 * import { createClient } from '@/lib/supabase/server';
 *
 * export async function myAction() {
 *   const supabase = await createClient();
 *   // ... perform mutations
 * }
 * ```
 *
 * @module lib/supabase/server
 */

import { cookies } from 'next/headers';

import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/lib/types/database';

/**
 * Creates a Supabase client for server-side use.
 *
 * This client:
 * - Uses the public anon key (RLS policies apply)
 * - Reads auth tokens from cookies
 * - Can set cookies in Server Actions and Route Handlers
 * - Cannot set cookies in Server Components (middleware handles refresh)
 *
 * IMPORTANT: Always create a new client per request to ensure proper
 * cookie handling and to avoid sharing auth state between requests.
 *
 * @returns {Promise<SupabaseClient<Database>>} Typed Supabase client instance
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * Gets all cookies from the request.
         * Used by Supabase to read auth tokens.
         */
        getAll() {
          return cookieStore.getAll();
        },
        /**
         * Sets cookies on the response.
         * Used by Supabase to update auth tokens.
         *
         * Note: This will silently fail in Server Components since
         * cookies can only be modified in Server Actions and Route Handlers.
         * The middleware handles token refresh for Server Components.
         */
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component - the middleware will handle
            // session refresh. This is expected behavior.
          }
        },
      },
    }
  );
}
