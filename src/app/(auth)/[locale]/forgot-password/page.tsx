import React from 'react';

import { ForgotPasswordForm } from '@/components/domain/auth/ForgotPasswordForm';

import type { Metadata } from 'next';

// Force dynamic rendering - auth pages need request context
export const dynamic = 'force-dynamic';

/**
 * Forgot Password Page Metadata
 */
export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Reset your Aymur Platform password. We will send you a link to reset it.',
};

/**
 * Forgot Password Page
 *
 * Server Component that renders the forgot password form.
 */
export default function ForgotPasswordPage(): React.JSX.Element {
  return <ForgotPasswordForm />;
}
