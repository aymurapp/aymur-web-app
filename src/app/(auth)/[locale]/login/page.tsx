import React, { Suspense } from 'react';

import { Spin } from 'antd';

import { LoginForm } from '@/components/domain/auth/LoginForm';

import type { Metadata } from 'next';

// Force dynamic rendering - auth pages need request context
export const dynamic = 'force-dynamic';

/**
 * Login Page Metadata
 */
export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Aymur Platform account to manage your jewelry business.',
};

/**
 * Login Page
 *
 * Server Component that renders the login form.
 * Uses Suspense for the LoginForm since it uses useSearchParams.
 */
export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="w-full flex items-center justify-center py-12">
          <Spin size="large" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
