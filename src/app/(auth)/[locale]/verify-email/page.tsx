import React, { Suspense } from 'react';

import { Spin } from 'antd';

import { VerifyEmailStatus } from '@/components/domain/auth/VerifyEmailStatus';

import type { Metadata } from 'next';

// Force dynamic rendering - auth pages need request context
export const dynamic = 'force-dynamic';

/**
 * Verify Email Page Metadata
 */
export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'Verify your email address for your Aymur Platform account.',
};

/**
 * Verify Email Page
 *
 * Server Component that renders the email verification status.
 * Uses Suspense because VerifyEmailStatus uses useSearchParams.
 */
export default function VerifyEmailPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="w-full flex items-center justify-center py-12">
          <Spin size="large" />
        </div>
      }
    >
      <VerifyEmailStatus />
    </Suspense>
  );
}
