import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import { routing } from '@/lib/i18n/routing';
import type { Database } from '@/lib/types/database';

import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Email Confirmation Route Handler
 *
 * Handles email confirmation links with token_hash and type parameters.
 * This is an alternative flow to the code-based callback.
 *
 * Supabase may redirect here for:
 * - Email signup confirmation
 * - Password recovery
 * - Email change confirmation
 *
 * Query parameters:
 * - token_hash: The OTP token hash from the email link
 * - type: The type of confirmation (signup, recovery, email_change)
 * - next: Optional redirect URL after confirmation
 *
 * @see https://supabase.com/docs/guides/auth/server-side/email-based-auth-with-pkce-flow-for-ssr
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

  // Get token_hash and type from the URL
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  // Default to /shops for authenticated users
  const next = requestUrl.searchParams.get('next') ?? '/shops';

  // Check for error parameters
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error) {
    // Handle error - redirect to appropriate page with error info (with locale prefix)
    const errorUrl = createLocalizedUrl('/login', request);
    errorUrl.searchParams.set('error', error);
    if (errorDescription) {
      errorUrl.searchParams.set('error_description', errorDescription);
    }
    return NextResponse.redirect(errorUrl);
  }

  if (tokenHash && type) {
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

    // Verify the OTP token
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (verifyError) {
      console.error('Email confirmation error:', verifyError);

      // Handle specific error types
      if (verifyError.message.includes('expired') || verifyError.message.includes('invalid')) {
        const errorUrl = createLocalizedUrl('/verify-email', request);
        errorUrl.searchParams.set('error', 'token_expired');
        errorUrl.searchParams.set(
          'error_description',
          'This verification link has expired or is invalid. Please request a new one.'
        );
        return NextResponse.redirect(errorUrl);
      }

      // Generic error redirect
      const errorUrl = createLocalizedUrl('/login', request);
      errorUrl.searchParams.set('error', 'verification_error');
      errorUrl.searchParams.set('error_description', verifyError.message);
      return NextResponse.redirect(errorUrl);
    }

    // Handle different confirmation types
    switch (type) {
      case 'signup': {
        // Email signup confirmation successful
        const verifySuccessUrl = createLocalizedUrl('/verify-email', request);
        verifySuccessUrl.searchParams.set('type', 'signup');
        verifySuccessUrl.searchParams.set('success', 'true');
        return NextResponse.redirect(verifySuccessUrl);
      }

      case 'recovery': {
        // Password recovery - redirect to reset password page
        const resetUrl = createLocalizedUrl('/reset-password', request);
        return NextResponse.redirect(resetUrl);
      }

      case 'invite':
        // Team invitation - redirect to shops
        return NextResponse.redirect(createLocalizedUrl('/shops', request));

      case 'email_change': {
        // Email change confirmation
        const settingsUrl = createLocalizedUrl('/settings', request);
        settingsUrl.searchParams.set('message', 'email_updated');
        return NextResponse.redirect(settingsUrl);
      }

      case 'magiclink':
        // Magic link sign-in
        return NextResponse.redirect(createLocalizedUrl(next, request));

      default:
        // Unknown type - redirect to next URL
        return NextResponse.redirect(createLocalizedUrl(next, request));
    }
  }

  // No valid parameters - redirect to home
  return NextResponse.redirect(createLocalizedUrl('/', request));
}
