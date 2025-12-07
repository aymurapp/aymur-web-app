import React from 'react';

import { QueryProvider } from '@/lib/query/provider';

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
 * Authentication is handled by middleware - this layout only provides
 * the QueryProvider wrapper for TanStack Query support.
 *
 * NOTE: Auth checks were removed from this layout to prevent redirect loops
 * caused by auth state inconsistency between middleware (uses request.cookies)
 * and server components (uses next/headers cookies()). Middleware is now the
 * single source of truth for route protection.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-groups
 */
export default function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return <QueryProvider>{children}</QueryProvider>;
}
