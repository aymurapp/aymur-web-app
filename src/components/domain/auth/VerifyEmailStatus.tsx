'use client';

/**
 * VerifyEmailStatus Component
 *
 * Displays email verification status:
 * - Verification in progress state
 * - Success state with redirect
 * - Error state with resend option
 * - RTL support via logical properties
 */

import React, { useCallback, useState, useEffect } from 'react';

import { useSearchParams } from 'next/navigation';

import { Alert, message } from 'antd';

import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Verification status type
 */
type VerificationStatus = 'verifying' | 'success' | 'error' | 'already-verified';

/**
 * VerifyEmailStatus Component
 *
 * Shows the status of email verification and handles resend.
 */
export function VerifyEmailStatus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Check verification status on mount
  useEffect(() => {
    const checkVerification = async () => {
      const supabase = createClient();

      // Check for error in URL params (from Supabase redirect)
      const errorDescription = searchParams.get('error_description');
      if (errorDescription) {
        setStatus('error');
        setErrorMessage(errorDescription);
        return;
      }

      // Check if we have a type=signup (successful verification redirect)
      const type = searchParams.get('type');
      if (type === 'signup') {
        setStatus('success');
        return;
      }

      // Check current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.email_confirmed_at) {
        setStatus('already-verified');
        setUserEmail(session.user.email ?? null);
      } else if (session?.user) {
        // User is logged in but email not confirmed
        setUserEmail(session.user.email ?? null);
        setStatus('error');
        setErrorMessage(
          'Your email has not been verified yet. Please check your inbox or request a new verification link.'
        );
      } else {
        // No session, redirect to login
        router.push('/login');
      }
    };

    checkVerification();
  }, [searchParams, router]);

  /**
   * Handle resend verification email
   */
  const handleResend = useCallback(async () => {
    if (!userEmail) {
      message.error('Unable to resend verification. Please try logging in again.');
      return;
    }

    setIsResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      message.success('Verification email sent! Please check your inbox.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  }, [userEmail]);

  // Verifying state
  if (status === 'verifying') {
    return (
      <div className="w-full text-center py-4">
        <div className="mb-6">
          <LoadingSpinner size="large" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-3">Verifying your email</h2>
        <p className="text-stone-500">Please wait while we verify your email address...</p>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="w-full text-center">
        <div className="mb-6">
          <div
            className="
              inline-flex items-center justify-center
              w-16 h-16 rounded-full
              bg-emerald-100
            "
          >
            <svg
              className="w-8 h-8 text-emerald-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-3">Email verified!</h2>
        <p className="text-stone-600 mb-6">
          Your email has been verified successfully. Let&apos;s get you set up!
        </p>
        <Link href="/onboarding/welcome">
          <Button type="primary" size="large" className="h-12 px-8">
            Continue Setup
          </Button>
        </Link>
      </div>
    );
  }

  // Already verified state
  if (status === 'already-verified') {
    return (
      <div className="w-full text-center">
        <div className="mb-6">
          <div
            className="
              inline-flex items-center justify-center
              w-16 h-16 rounded-full
              bg-blue-100
            "
          >
            <svg
              className="w-8 h-8 text-blue-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-3">Already verified</h2>
        <p className="text-stone-600 mb-6">
          Your email <span className="font-medium text-stone-800">{userEmail}</span> is already
          verified.
        </p>
        <Link href="/">
          <Button type="primary" size="large" className="h-12 px-8">
            Go to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // Error state
  return (
    <div className="w-full text-center">
      <div className="mb-6">
        <div
          className="
            inline-flex items-center justify-center
            w-16 h-16 rounded-full
            bg-red-100
          "
        >
          <svg
            className="w-8 h-8 text-red-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-stone-900 mb-3">Verification failed</h2>

      {errorMessage && <Alert message={errorMessage} type="error" className="mb-6 text-start" />}

      <p className="text-stone-600 mb-6">
        {userEmail ? (
          <>
            We could not verify the email{' '}
            <span className="font-medium text-stone-800">{userEmail}</span>.
            <br />
            Please try requesting a new verification link.
          </>
        ) : (
          'Something went wrong with the verification. Please try again.'
        )}
      </p>

      <div className="space-y-4">
        {userEmail && (
          <Button
            type="primary"
            size="large"
            block
            loading={isResending}
            onClick={handleResend}
            className="h-12"
          >
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </Button>
        )}
        <Link
          href="/login"
          className="block text-amber-600 hover:text-amber-700 font-semibold transition-colors"
        >
          Back to Log In
        </Link>
      </div>
    </div>
  );
}

export default VerifyEmailStatus;
