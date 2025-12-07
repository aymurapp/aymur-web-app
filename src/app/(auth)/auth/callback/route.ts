import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/lib/types/database';

/**
 * Auth Callback Route Handler
 *
 * Handles OAuth and email confirmation callbacks from Supabase.
 *
 * This route:
 * 1. Receives the authorization code from Supabase
 * 2. Exchanges it for a session
 * 3. Sets the session cookies
 * 4. Redirects to the appropriate page
 *
 * Supabase redirects here after:
 * - OAuth sign-in (Google, etc.)
 * - Email confirmation after sign-up
 * - Password reset email link click
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);

  // Get the code and type from the URL
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/';

  // Error handling for OAuth errors
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error) {
    // Redirect to login with error message
    const errorUrl = new URL('/login', requestUrl.origin);
    errorUrl.searchParams.set('error', error);
    if (errorDescription) {
      errorUrl.searchParams.set('error_description', errorDescription);
    }
    return NextResponse.redirect(errorUrl);
  }

  if (code) {
    const cookieStore = await cookies();

    // Create a Supabase client with cookie handling
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    );

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Auth callback error:', exchangeError);

      // Handle specific error types
      if (exchangeError.message.includes('expired')) {
        const errorUrl = new URL('/login', requestUrl.origin);
        errorUrl.searchParams.set('error', 'link_expired');
        errorUrl.searchParams.set(
          'error_description',
          'This link has expired. Please request a new one.'
        );
        return NextResponse.redirect(errorUrl);
      }

      // Generic error redirect
      const errorUrl = new URL('/login', requestUrl.origin);
      errorUrl.searchParams.set('error', 'auth_error');
      errorUrl.searchParams.set('error_description', exchangeError.message);
      return NextResponse.redirect(errorUrl);
    }

    // Handle different callback types
    switch (type) {
      case 'signup':
        // Email confirmation successful - redirect to verify-email with success
        const verifyUrl = new URL('/verify-email', requestUrl.origin);
        verifyUrl.searchParams.set('type', 'signup');
        return NextResponse.redirect(verifyUrl);

      case 'recovery':
        // Password reset - redirect to reset password page
        const resetUrl = new URL('/reset-password', requestUrl.origin);
        return NextResponse.redirect(resetUrl);

      case 'invite':
        // Team invite - redirect to complete profile or dashboard
        return NextResponse.redirect(new URL('/', requestUrl.origin));

      case 'magiclink':
        // Magic link sign-in
        return NextResponse.redirect(new URL(next, requestUrl.origin));

      default:
        // OAuth or unknown type - redirect to next URL or home
        return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // No code provided - redirect to home
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
