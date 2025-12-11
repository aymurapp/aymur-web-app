'use client';

/**
 * LoginForm Component
 *
 * A fully-featured login form with:
 * - Email/password authentication
 * - Zod validation
 * - Remember me option
 * - Forgot password link
 * - Google OAuth placeholder
 * - Error handling with Ant Design message
 * - Loading states
 * - RTL support via logical properties
 */

import React, { useCallback, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { Alert, Checkbox, Divider, Input, message } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Form } from '@/components/ui/Form';
import { useAuth } from '@/lib/hooks/auth/useAuth';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { loginSchema, type LoginInput } from '@/lib/utils/validation';

/**
 * Props for the LoginForm component
 */
export interface LoginFormProps {
  /**
   * Redirect URL after successful login.
   * Defaults to dashboard if not provided.
   */
  redirectUrl?: string;
}

/**
 * LoginForm Component
 *
 * Handles user authentication with email and password.
 */
export function LoginForm({ redirectUrl }: LoginFormProps) {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isSigningIn, error, clearError } = useAuth();

  const [rememberMe, setRememberMe] = useState(false);
  const [showError, setShowError] = useState(false);

  // Get redirect URL from props, search params, or default to /shops
  // Checks both 'callbackUrl' (OAuth flows) and 'redirect' (middleware redirect param)
  const getRedirectUrl = useCallback(() => {
    if (redirectUrl) {
      return redirectUrl;
    }
    // OAuth flows use 'callbackUrl'
    const callbackUrl = searchParams.get('callbackUrl');
    if (callbackUrl) {
      return callbackUrl;
    }
    // Middleware sets 'redirect' when redirecting unauthenticated users to login
    const redirectParam = searchParams.get('redirect');
    if (redirectParam) {
      return redirectParam;
    }
    // Default to /shops for authenticated platform users
    return '/shops';
  }, [redirectUrl, searchParams]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: LoginInput) => {
      clearError();
      setShowError(false);

      const result = await signIn(data.email, data.password);

      if (result.success) {
        message.success(t('signIn') + ' ' + t('subtitle').split('!')[0] + '!');
        router.push(getRedirectUrl());
        router.refresh();
      } else {
        setShowError(true);
      }
    },
    [signIn, clearError, router, getRedirectUrl, t]
  );

  /**
   * Handle Google OAuth (placeholder)
   */
  const handleGoogleSignIn = useCallback(() => {
    message.info('Google OAuth coming soon');
  }, []);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2 tracking-tight">
          {t('title')}
        </h1>
        <p className="text-stone-500 text-sm sm:text-base">{t('subtitle')}</p>
      </div>

      {/* Error Alert */}
      {showError && error && (
        <Alert
          message={error.message || t('invalidCredentials')}
          type="error"
          showIcon
          closable
          onClose={() => setShowError(false)}
          className="mb-6"
        />
      )}

      {/* Login Form */}
      <Form<LoginInput>
        schema={loginSchema}
        onSubmit={handleSubmit}
        defaultValues={{
          email: '',
          password: '',
        }}
        className="space-y-1"
      >
        {/* Email Field */}
        <Form.Item<LoginInput> name="email" label={t('email')} required>
          <Input
            type="email"
            placeholder="you@example.com"
            size="large"
            autoComplete="email"
            autoFocus
          />
        </Form.Item>

        {/* Password Field */}
        <Form.Item<LoginInput> name="password" label={t('password')} required>
          <Input.Password placeholder="********" size="large" autoComplete="current-password" />
        </Form.Item>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between mb-6">
          <Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}>
            <span className="text-sm text-stone-600">{t('rememberMe')}</span>
          </Checkbox>
          <Link
            href="/forgot-password"
            className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
          >
            {t('forgotPassword')}
          </Link>
        </div>

        {/* Submit Button */}
        <Form.Submit className="mt-2">
          <Button
            type="primary"
            size="large"
            block
            loading={isSigningIn}
            className="h-12 text-base font-semibold"
          >
            {isSigningIn ? t('signingIn') : t('signIn')}
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
        onClick={handleGoogleSignIn}
        className="
          w-full h-12
          flex items-center justify-center gap-3
          bg-white hover:bg-stone-50
          border border-stone-300 hover:border-stone-400
          rounded-lg
          text-stone-700 font-medium
          transition-all duration-200
          shadow-sm hover:shadow
        "
      >
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
        <span>Continue with Google</span>
      </button>

      {/* Sign Up Link */}
      <p className="text-center mt-8 text-stone-500 text-sm">
        {t('noAccount')}{' '}
        <Link
          href="/register"
          className="text-amber-600 hover:text-amber-700 font-semibold transition-colors"
        >
          {t('createAccount')}
        </Link>
      </p>
    </div>
  );
}

export default LoginForm;
