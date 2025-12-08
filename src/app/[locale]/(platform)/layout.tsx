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
 * This layout wraps all authenticated platform pages.
 * Authentication is handled by middleware - this layout only provides
 * the QueryProvider wrapper for TanStack Query support.
 *
 * NOTE: NextIntlClientProvider is provided by parent [locale]/layout.tsx
 */
export default function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return <QueryProvider>{children}</QueryProvider>;
}
