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
 */

import React, { useCallback, useState, useMemo } from 'react';

import { Alert, Checkbox, Input, Progress, message, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Form } from '@/components/ui/Form';
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

  // Calculate password strength
  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: RegisterWithConfirmInput) => {
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
          message={error.message || tCommon('messages.unexpectedError')}
          type="error"
          showIcon
          closable
          onClose={() => setShowError(false)}
          className="mb-6"
        />
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
          >
            {isSigningUp ? t('creating') : t('createAccount')}
          </Button>
        </Form.Submit>
      </Form>

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
