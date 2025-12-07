import React from 'react';

import { RegisterForm } from '@/components/domain/auth/RegisterForm';

import type { Metadata } from 'next';

// Force dynamic rendering - auth pages need request context
export const dynamic = 'force-dynamic';

/**
 * Register Page Metadata
 */
export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create your Aymur Platform account and start managing your jewelry business today.',
};

/**
 * Register Page
 *
 * Server Component that renders the registration form.
 */
export default function RegisterPage(): React.JSX.Element {
  return <RegisterForm />;
}
