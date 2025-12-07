/**
 * Supabase Middleware Client
 *
 * Creates a Supabase client for use in Next.js middleware.
 * Handles session refresh and cookie management on every request.
 *
 * This is used in middleware.ts at the project root to:
 * - Refresh expired auth tokens before they reach the page
 * - Ensure Server Components have valid session data
 * - Handle auth redirects (e.g., redirect to login if not authenticated)
 *
 * Usage in middleware.ts:
 * ```typescript
 * import { updateSession } from '@/lib/supabase/middleware';
 *
 * export async function middleware(request: NextRequest) {
 *   return await updateSession(request);
 * }
 * ```
 *
 * @module lib/supabase/middleware
 */

import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/lib/types/database';

/**
 * Updates the Supabase session in middleware.
 *
 * This function:
 * - Creates a Supabase client with access to request/response cookies
 * - Refreshes the auth token if it's expired
 * - Updates cookies on the response with new tokens
 * - Returns a NextResponse that can be modified or returned directly
 *
 * @param {NextRequest} request - The incoming Next.js request
 * @returns {Promise<NextResponse>} Response with updated cookies
 */
export async function updateSession(request: NextRequest) {
  // Create a response that we can modify
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * Gets all cookies from the incoming request.
         */
        getAll() {
          return request.cookies.getAll();
        },
        /**
         * Sets cookies on the response.
         * Also mirrors cookies to the request for downstream middleware/pages.
         */
        setAll(cookiesToSet) {
          // Set cookies on the request (for Server Components downstream)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          // Create a new response with updated cookies
          supabaseResponse = NextResponse.next({
            request,
          });

          // Set cookies on the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: DO NOT remove this line.
  // This refreshes the auth token if expired and updates cookies.
  // Even if you don't use the user data here, calling getUser()
  // ensures the session is refreshed.
  const {
    data: { user: _user },
  } = await supabase.auth.getUser();

  // Optional: Redirect unauthenticated users to login
  // Uncomment and customize the paths as needed:
  //
  // const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
  // const isPublicPage = request.nextUrl.pathname === '/';
  //
  // if (!user && !isAuthPage && !isPublicPage) {
  //   const url = request.nextUrl.clone();
  //   url.pathname = '/auth/login';
  //   return NextResponse.redirect(url);
  // }

  return supabaseResponse;
}
