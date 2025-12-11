'use client';

/**
 * RegisterForm Component
 *
 * A comprehensive registration form with:
 * - Full name, email, password, confirm password fields
 * - Password strength indicator
 * - Terms acceptance checkbox
 * - Zod validation with password confirmation
 * - Email verification flow trigger
 * - Loading states
 * - RTL support via logical properties
 * - Honeypot field for bot protection
 * - AYMUR branding with logo
 */

import React, { useCallback, useState, useMemo, useRef } from 'react';

import Image from 'next/image';

import { Alert, Checkbox, Divider, Input, Progress, message, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Form } from '@/components/ui/Form';
import { signInWithOAuth } from '@/lib/actions/auth';
import { useAuth } from '@/lib/hooks/auth/useAuth';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { registerWithConfirmSchema, type RegisterWithConfirmInput } from '@/lib/utils/validation';

const { Text } = Typography;

/**
 * Password strength levels
 */
type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

/**
 * Calculate password strength
 */
function calculatePasswordStrength(password: string): {
  strength: PasswordStrength;
  percent: number;
  color: string;
} {
  if (!password) {
    return { strength: 'weak', percent: 0, color: '#e7e5e4' };
  }

  let score = 0;

  // Length checks
  if (password.length >= 8) {
    score += 1;
  }
  if (password.length >= 12) {
    score += 1;
  }

  // Character type checks
  if (/[a-z]/.test(password)) {
    score += 1;
  }
  if (/[A-Z]/.test(password)) {
    score += 1;
  }
  if (/[0-9]/.test(password)) {
    score += 1;
  }
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  }

  // Map score to strength
  if (score <= 2) {
    return { strength: 'weak', percent: 25, color: '#dc2626' };
  } else if (score <= 3) {
    return { strength: 'fair', percent: 50, color: '#f59e0b' };
  } else if (score <= 4) {
    return { strength: 'good', percent: 75, color: '#0ea5e9' };
  } else {
    return { strength: 'strong', percent: 100, color: '#059669' };
  }
}

/**
 * Props for the RegisterForm component
 */
export interface RegisterFormProps {
  /**
   * Redirect URL after successful registration.
   * Defaults to login with success message.
   */
  redirectUrl?: string;
}

/**
 * RegisterForm Component
 *
 * Handles user registration with email verification.
 */
export function RegisterForm({ redirectUrl }: RegisterFormProps) {
  const t = useTranslations('auth.register');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { signUp, isSigningUp, error, clearError } = useAuth();

  const [showError, setShowError] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [password, setPassword] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Honeypot field ref for bot detection - bots fill hidden fields, humans don't
  const honeypotRef = useRef<HTMLInputElement>(null);

  // Calculate password strength
  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: RegisterWithConfirmInput) => {
      // Bot detection: if honeypot field is filled, silently reject
      if (honeypotRef.current?.value) {
        console.warn('[RegisterForm] Bot detected via honeypot');
        return;
      }

      clearError();
      setShowError(false);
      setTermsError(false);

      // Check terms acceptance
      if (!termsAccepted) {
        setTermsError(true);
        return;
      }

      const result = await signUp({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      });

      if (result.success) {
        setRegistrationSuccess(true);
        message.success(result.message || 'Account created successfully!');

        // If there's a message about email confirmation, stay on page
        // Otherwise redirect
        if (!result.message?.includes('email')) {
          const destination = redirectUrl || '/login';
          router.push(destination);
        }
      } else {
        setShowError(true);
      }
    },
    [signUp, clearError, termsAccepted, router, redirectUrl]
  );

  /**
   * Handle Google OAuth sign up
   */
  const handleGoogleSignUp = useCallback(async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithOAuth('google');
      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
      } else {
        message.error(result.error || 'Failed to initiate Google sign up');
        setIsGoogleLoading(false);
      }
    } catch {
      message.error('An unexpected error occurred');
      setIsGoogleLoading(false);
    }
  }, []);

  // Show success message if registration was successful
  if (registrationSuccess) {
    return (
      <div className="w-full text-center py-4">
        <div className="mb-6">
          <div
            className="
              inline-flex items-center justify-center
              w-20 h-20 rounded-full
              bg-emerald-50
              border-2 border-emerald-100
            "
          >
            <svg
              className="w-10 h-10 text-emerald-500"
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
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-3 tracking-tight">
          Check your email
        </h2>
        <p className="text-stone-500 mb-8 text-sm sm:text-base leading-relaxed">
          We have sent a verification link to your email address.
          <br />
          Please click the link to verify your account.
        </p>
        <Link
          href="/login"
          className="
            inline-flex items-center gap-2
            text-amber-600 hover:text-amber-700
            font-semibold transition-colors
          "
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Return to Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <Image
          src="/images/AYMUR-Letter-A-Logo-and-webicon.png"
          alt="AYMUR"
          width={56}
          height={56}
          className="h-14 w-auto"
          priority
        />
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2 tracking-tight">
          {t('title')}
        </h1>
        <p className="text-stone-500 text-sm sm:text-base">{t('subtitle')}</p>
      </div>

      {/* Error Alert */}
      {showError && error && (
        <div className="auth-error-shake">
          <Alert
            message={
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Registration Failed</span>
                <span className="text-xs text-red-600/80 font-normal">
                  {error.message || tCommon('messages.unexpectedError')}
                </span>
              </div>
            }
            type="error"
            showIcon
            closable
            onClose={() => setShowError(false)}
            className="mb-6"
          />
        </div>
      )}

      {/* Registration Form */}
      <Form<RegisterWithConfirmInput>
        schema={registerWithConfirmSchema}
        onSubmit={handleSubmit}
        defaultValues={{
          fullName: '',
          email: '',
          password: '',
          confirmPassword: '',
        }}
        className="space-y-1"
      >
        {/* Honeypot field - hidden from humans, bots fill it */}
        <div
          aria-hidden="true"
          className="absolute -left-[9999px] -top-[9999px]"
          style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
        >
          <label htmlFor="company_website">Company Website</label>
          <input
            ref={honeypotRef}
            type="text"
            id="company_website"
            name="company_website"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Full Name Field */}
        <Form.Item<RegisterWithConfirmInput> name="fullName" label={t('fullName')} required>
          <Input placeholder="John Doe" size="large" autoComplete="name" autoFocus />
        </Form.Item>

        {/* Email Field */}
        <Form.Item<RegisterWithConfirmInput> name="email" label={t('email')} required>
          <Input type="email" placeholder="you@example.com" size="large" autoComplete="email" />
        </Form.Item>

        {/* Password Field with Strength Indicator */}
        <Form.Item<RegisterWithConfirmInput> name="password" label={t('password')} required>
          {({ field }) => (
            <div>
              <Input.Password
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  setPassword(e.target.value);
                }}
                placeholder="********"
                size="large"
                autoComplete="new-password"
              />
              {password && (
                <div className="mt-2">
                  <Progress
                    percent={passwordStrength.percent}
                    showInfo={false}
                    strokeColor={passwordStrength.color}
                    size="small"
                  />
                  <Text className="text-xs mt-1 block" style={{ color: passwordStrength.color }}>
                    Password strength: {passwordStrength.strength}
                  </Text>
                </div>
              )}
            </div>
          )}
        </Form.Item>

        {/* Confirm Password Field */}
        <Form.Item<RegisterWithConfirmInput>
          name="confirmPassword"
          label={t('confirmPassword')}
          required
        >
          <Input.Password placeholder="********" size="large" autoComplete="new-password" />
        </Form.Item>

        {/* Terms Checkbox */}
        <div className="mb-6">
          <Checkbox
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked);
              if (e.target.checked) {
                setTermsError(false);
              }
            }}
          >
            <span className={`text-sm ${termsError ? 'text-red-500' : 'text-stone-600'}`}>
              {t('termsAgree')}
            </span>
          </Checkbox>
          {termsError && (
            <p className="text-red-500 text-xs mt-1 ms-6">You must accept the terms to continue</p>
          )}
        </div>

        {/* Submit Button */}
        <Form.Submit className="mt-2">
          <Button
            type="primary"
            size="large"
            block
            loading={isSigningUp}
            className="h-12 text-base font-semibold"
            style={{ backgroundColor: '#C9A227' }}
          >
            {isSigningUp ? t('creating') : t('createAccount')}
          </Button>
        </Form.Submit>
      </Form>

      {/* Divider */}
      <Divider className="my-6">
        <span className="text-stone-400 text-sm font-medium">or continue with</span>
      </Divider>

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={isGoogleLoading || isSigningUp}
        className="
          w-full h-12
          flex items-center justify-center gap-3
          bg-white hover:bg-stone-50
          border border-stone-300 hover:border-stone-400
          rounded-lg
          text-stone-700 font-medium
          transition-all duration-200
          shadow-sm hover:shadow
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {isGoogleLoading ? (
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        <span>{isGoogleLoading ? 'Connecting...' : 'Continue with Google'}</span>
      </button>

      {/* Sign In Link */}
      <p className="text-center mt-8 text-stone-500 text-sm">
        {t('haveAccount')}{' '}
        <Link
          href="/login"
          className="text-amber-600 hover:text-amber-700 font-semibold transition-colors"
        >
          {t('signIn')}
        </Link>
      </p>
    </div>
  );
}

export default RegisterForm;
