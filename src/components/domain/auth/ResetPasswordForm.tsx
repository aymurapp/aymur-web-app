'use client';

/**
 * ResetPasswordForm Component
 *
 * Password reset form with:
 * - New password and confirm password fields
 * - Password strength indicator
 * - Zod validation
 * - Token validation from URL
 * - Success redirect to login
 * - Loading states
 * - RTL support via logical properties
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react';

import { useSearchParams } from 'next/navigation';

import { Alert, Input, Progress, Typography, Result } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Form } from '@/components/ui/Form';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/lib/hooks/auth/useAuth';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/utils/validation';

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
 * ResetPasswordForm Component
 *
 * Handles setting a new password after reset request.
 */
export function ResetPasswordForm() {
  const t = useTranslations('auth.resetPassword');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updatePassword, isUpdatingPassword, error, clearError } = useAuth();

  const [showError, setShowError] = useState(false);
  const [password, setPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Calculate password strength
  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  // Check if we have a valid token/code in the URL
  // Supabase sends the user back with a code parameter after email link click
  useEffect(() => {
    const code = searchParams.get('code');
    const errorDescription = searchParams.get('error_description');

    if (errorDescription) {
      setTokenValid(false);
    } else if (code) {
      setTokenValid(true);
    } else {
      // No code in URL - might be arriving after Supabase has already processed it
      // In this case, the session should be set up
      setTokenValid(true);
    }
  }, [searchParams]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: ResetPasswordInput) => {
      clearError();
      setShowError(false);

      const result = await updatePassword(data.password);

      if (result.success) {
        setResetSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setShowError(true);
      }
    },
    [updatePassword, clearError, router]
  );

  // Show error if token is invalid
  if (tokenValid === false) {
    return (
      <Result
        status="error"
        title="Invalid or Expired Link"
        subTitle="This password reset link is invalid or has expired. Please request a new one."
        extra={
          <Link href="/forgot-password">
            <Button type="primary" size="large" style={{ backgroundColor: '#C9A227' }}>
              Request New Link
            </Button>
          </Link>
        }
      />
    );
  }

  // Show loading while checking token
  if (tokenValid === null) {
    return (
      <div className="w-full text-center py-8">
        <LoadingSpinner size="large" text="Validating reset link..." />
      </div>
    );
  }

  // Show success message if password was reset
  if (resetSuccess) {
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
        <h2 className="text-2xl font-bold text-stone-900 mb-3">{t('passwordReset')}</h2>
        <p className="text-stone-600 mb-6">{t('loginNow')}</p>
        <p className="text-stone-500 text-sm">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mb-6">
          <div
            className="
              inline-flex items-center justify-center
              w-16 h-16 rounded-full
              bg-amber-100
            "
          >
            <svg
              className="w-8 h-8 text-amber-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">{t('title')}</h2>
        <p className="text-stone-600">{t('subtitle')}</p>
      </div>

      {/* Error Alert */}
      {showError && error && (
        <Alert
          message={error.message || tCommon('messages.unexpectedError')}
          type="error"
          showIcon
          closable
          onClose={() => setShowError(false)}
          className="mb-6"
        />
      )}

      {/* Reset Password Form */}
      <Form<ResetPasswordInput>
        schema={resetPasswordSchema}
        onSubmit={handleSubmit}
        defaultValues={{
          password: '',
          confirmPassword: '',
        }}
        className="space-y-1"
      >
        {/* New Password Field with Strength Indicator */}
        <Form.Item<ResetPasswordInput> name="password" label={t('newPassword')} required>
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
                autoFocus
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
        <Form.Item<ResetPasswordInput> name="confirmPassword" label={t('confirmPassword')} required>
          <Input.Password placeholder="********" size="large" autoComplete="new-password" />
        </Form.Item>

        {/* Submit Button */}
        <Form.Submit className="mt-4">
          <Button
            type="primary"
            size="large"
            block
            loading={isUpdatingPassword}
            className="h-12 text-base font-semibold"
            style={{ backgroundColor: '#C9A227' }}
          >
            {isUpdatingPassword ? tCommon('messages.processing') : t('resetPassword')}
          </Button>
        </Form.Submit>
      </Form>

      {/* Back to Login Link */}
      <p className="text-center mt-8">
        <Link
          href="/login"
          className="text-amber-600 hover:text-amber-700 font-semibold transition-colors inline-flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Log In
        </Link>
      </p>
    </div>
  );
}

export default ResetPasswordForm;
