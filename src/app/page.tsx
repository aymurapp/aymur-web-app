import { redirect } from 'next/navigation';

import { defaultLocale } from '@/middleware';

/**
 * Root Page
 *
 * Redirects to the default locale.
 * The middleware handles locale detection, but this serves as a fallback.
 */
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
