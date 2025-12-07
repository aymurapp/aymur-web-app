import React from 'react';

import { redirect } from 'next/navigation';

import { QueryProvider } from '@/lib/query/provider';
import { createClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

/**
 * Platform Layout Metadata
 */
export const metadata: Metadata = {
  title: {
    template: '%s | Aymur Platform',
    default: 'Aymur Platform',
  },
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Platform Layout
 *
 * This is the root layout for all authenticated platform pages.
 * It performs an auth check and redirects to login if not authenticated.
 * Also wraps children with the QueryProvider for TanStack Query support.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-groups
 */
export default async function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  // Check authentication on the server
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (error || !user) {
    redirect('/login');
  }

  return <QueryProvider>{children}</QueryProvider>;
}
