'use client';

/**
 * ForgotPasswordForm Component
 *
 * A simple form for requesting password reset:
 * - Email input with validation
 * - Success message with instructions
 * - Back to login link
 * - Loading states
 * - RTL support via logical properties
 */

import React, { useCallback, useState } from 'react';

import { Alert, Input } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Form } from '@/components/ui/Form';
import { useAuth } from '@/lib/hooks/auth/useAuth';
import { Link } from '@/lib/i18n/navigation';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/utils/validation';

/**
 * ForgotPasswordForm Component
 *
 * Handles password reset email requests.
 */
export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgotPassword');
  const tCommon = useTranslations('common');
  const { resetPassword, isResettingPassword, error, clearError } = useAuth();

  const [showError, setShowError] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: ForgotPasswordInput) => {
      clearError();
      setShowError(false);

      const result = await resetPassword(data.email);

      if (result.success) {
        setSubmittedEmail(data.email);
        setEmailSent(true);
      } else {
        setShowError(true);
      }
    },
    [resetPassword, clearError]
  );

  // Show success message if email was sent
  if (emailSent) {
    return (
      <div className="w-full text-center">
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
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-3">{t('emailSent')}</h2>
        <p className="text-stone-600 mb-2">{t('checkEmail')}</p>
        <p className="text-stone-500 text-sm mb-6">
          We sent an email to <span className="font-medium text-stone-700">{submittedEmail}</span>
        </p>
        <div className="space-y-4">
          <Button
            type="primary"
            size="large"
            block
            onClick={() => setEmailSent(false)}
            className="h-12"
          >
            Send again
          </Button>
          <Link
            href="/login"
            className="block text-amber-600 hover:text-amber-700 font-semibold transition-colors"
          >
            {t('backToLogin')}
          </Link>
        </div>
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

      {/* Forgot Password Form */}
      <Form<ForgotPasswordInput>
        schema={forgotPasswordSchema}
        onSubmit={handleSubmit}
        defaultValues={{
          email: '',
        }}
        className="space-y-1"
      >
        {/* Email Field */}
        <Form.Item<ForgotPasswordInput> name="email" label={t('email')} required>
          <Input
            type="email"
            placeholder="you@example.com"
            size="large"
            autoComplete="email"
            autoFocus
          />
        </Form.Item>

        {/* Submit Button */}
        <Form.Submit className="mt-4">
          <Button
            type="primary"
            size="large"
            block
            loading={isResettingPassword}
            className="h-12 text-base font-semibold"
          >
            {isResettingPassword ? tCommon('messages.processing') : t('sendLink')}
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
          {t('backToLogin')}
        </Link>
      </p>
    </div>
  );
}

export default ForgotPasswordForm;
