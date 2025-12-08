import React from 'react';

import type { Metadata } from 'next';

/**
 * Marketing Layout Metadata
 */
export const metadata: Metadata = {
  title: {
    template: '%s | Aymur',
    default: 'Aymur - Premium Jewelry Business Management',
  },
  description:
    'Aymur is a comprehensive jewelry business management platform for inventory, sales, customers, and analytics.',
};

/**
 * Marketing Layout
 *
 * Layout for marketing/landing pages.
 * NOTE: NextIntlClientProvider is provided by parent [locale]/layout.tsx
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
