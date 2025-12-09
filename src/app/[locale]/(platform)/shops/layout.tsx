/**
 * Shops Layout
 *
 * Forces dynamic rendering for the shops selection page
 * to prevent static prerendering during build when
 * Supabase environment variables are not available.
 */

import React from 'react';

// Force dynamic rendering - prevents static prerendering at build time
export const dynamic = 'force-dynamic';

export default function ShopsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return <>{children}</>;
}
