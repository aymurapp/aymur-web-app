import React, { Suspense } from 'react';

import { Spin } from 'antd';

import { ResetPasswordForm } from '@/components/domain/auth/ResetPasswordForm';

import type { Metadata } from 'next';

// Force dynamic rendering - auth pages need request context
export const dynamic = 'force-dynamic';

/**
 * Reset Password Page Metadata
 */
export const metadata: Metadata = {
  title: 'Set New Password',
  description: 'Set a new password for your Aymur Platform account.',
};

/**
 * Reset Password Page
 *
 * Server Component that renders the reset password form.
 * Uses Suspense because ResetPasswordForm uses useSearchParams.
 */
export default function ResetPasswordPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="w-full flex items-center justify-center py-12">
          <Spin size="large" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
