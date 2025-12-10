import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import { routing } from '@/lib/i18n/routing';
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
 * 4. Redirects to the appropriate page with locale prefix
 *
 * Supabase redirects here after:
 * - OAuth sign-in (Google, etc.)
 * - Email confirmation after sign-up
 * - Password reset email link click
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

/**
 * Creates a URL with the correct locale prefix
 * Detects locale from Accept-Language header or uses default
 */
function createLocalizedUrl(path: string, request: NextRequest): URL {
  const requestUrl = new URL(request.url);

  // Try to detect locale from Accept-Language header
  const acceptLanguage = request.headers.get('accept-language') || '';
  const preferredLocale = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();

  // Check if preferred locale is supported, otherwise use default
  const locale = routing.locales.includes(preferredLocale as (typeof routing.locales)[number])
    ? preferredLocale
    : routing.defaultLocale;

  return new URL(`/${locale}${path}`, requestUrl.origin);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);

  // Get the code and type from the URL
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  // Default to /shops for authenticated users
  const next = requestUrl.searchParams.get('next') ?? '/shops';

  // Error handling for OAuth errors
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error) {
    // Redirect to login with error message (with locale prefix)
    const errorUrl = createLocalizedUrl('/login', request);
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
        const errorUrl = createLocalizedUrl('/login', request);
        errorUrl.searchParams.set('error', 'link_expired');
        errorUrl.searchParams.set(
          'error_description',
          'This link has expired. Please request a new one.'
        );
        return NextResponse.redirect(errorUrl);
      }

      // Generic error redirect
      const errorUrl = createLocalizedUrl('/login', request);
      errorUrl.searchParams.set('error', 'auth_error');
      errorUrl.searchParams.set('error_description', exchangeError.message);
      return NextResponse.redirect(errorUrl);
    }

    // Handle different callback types
    switch (type) {
      case 'signup': {
        // Email confirmation successful - redirect to pricing page to select a plan
        // Session is already established from exchangeCodeForSession above
        return NextResponse.redirect(createLocalizedUrl('/pricing', request));
      }

      case 'recovery': {
        // Password reset - redirect to reset password page
        const resetUrl = createLocalizedUrl('/reset-password', request);
        return NextResponse.redirect(resetUrl);
      }

      case 'invite':
        // Team invite - redirect to shops page
        return NextResponse.redirect(createLocalizedUrl('/shops', request));

      case 'magiclink':
        // Magic link sign-in
        return NextResponse.redirect(createLocalizedUrl(next, request));

      default:
        // OAuth or unknown type - redirect to next URL or home
        return NextResponse.redirect(createLocalizedUrl(next, request));
    }
  }

  // No code provided - redirect to shops (middleware will handle unauthenticated users)
  return NextResponse.redirect(createLocalizedUrl('/shops', request));
}
