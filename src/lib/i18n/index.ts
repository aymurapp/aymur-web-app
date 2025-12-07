/**
 * Internationalization
 * Language support and translations using next-intl
 *
 * This module provides:
 * - Locale configuration and routing
 * - Typed navigation helpers for locale-aware links and redirects
 * - Utilities for RTL detection and locale metadata
 *
 * @example
 * // In a Client Component
 * import { Link, useRouter, usePathname } from '@/lib/i18n';
 * import { useTranslations } from 'next-intl';
 *
 * function MyComponent() {
 *   const t = useTranslations('common');
 *   const router = useRouter();
 *
 *   return (
 *     <Link href="/dashboard">{t('navigation.dashboard')}</Link>
 *   );
 * }
 *
 * @example
 * // In a Server Component
 * import { getTranslations } from 'next-intl/server';
 *
 * async function MyServerComponent() {
 *   const t = await getTranslations('common');
 *   return <h1>{t('navigation.dashboard')}</h1>;
 * }
 */

// Routing configuration
export {
  routing,
  locales,
  rtlLocales,
  isRtlLocale,
  localeNames,
  localeFlags,
  type Locale,
} from './routing';

// Navigation helpers
export { Link, redirect, usePathname, useRouter, getPathname } from './navigation';
