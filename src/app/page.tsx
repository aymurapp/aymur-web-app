import { redirect } from 'next/navigation';

import { routing } from '@/lib/i18n/routing';

/**
 * Root Page
 *
 * Redirects to the default locale.
 * The middleware handles locale detection, but this serves as a fallback.
 */
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
