import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { createServerClient } from '@supabase/ssr';

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
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);

  // Get token_hash and type from the URL
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const next = requestUrl.searchParams.get('next') ?? '/';

  // Check for error parameters
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error) {
    // Handle error - redirect to appropriate page with error info
    const errorUrl = new URL('/login', requestUrl.origin);
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
        const errorUrl = new URL('/verify-email', requestUrl.origin);
        errorUrl.searchParams.set('error', 'token_expired');
        errorUrl.searchParams.set(
          'error_description',
          'This verification link has expired or is invalid. Please request a new one.'
        );
        return NextResponse.redirect(errorUrl);
      }

      // Generic error redirect
      const errorUrl = new URL('/login', requestUrl.origin);
      errorUrl.searchParams.set('error', 'verification_error');
      errorUrl.searchParams.set('error_description', verifyError.message);
      return NextResponse.redirect(errorUrl);
    }

    // Handle different confirmation types
    switch (type) {
      case 'signup':
        // Email signup confirmation successful
        const verifySuccessUrl = new URL('/verify-email', requestUrl.origin);
        verifySuccessUrl.searchParams.set('type', 'signup');
        return NextResponse.redirect(verifySuccessUrl);

      case 'recovery':
        // Password recovery - redirect to reset password page
        const resetUrl = new URL('/reset-password', requestUrl.origin);
        return NextResponse.redirect(resetUrl);

      case 'invite':
        // Team invitation
        return NextResponse.redirect(new URL('/', requestUrl.origin));

      case 'email_change':
        // Email change confirmation
        const settingsUrl = new URL('/settings', requestUrl.origin);
        settingsUrl.searchParams.set('message', 'email_updated');
        return NextResponse.redirect(settingsUrl);

      case 'magiclink':
        // Magic link sign-in
        return NextResponse.redirect(new URL(next, requestUrl.origin));

      default:
        // Unknown type - redirect to next URL
        return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // No valid parameters - redirect to home
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
