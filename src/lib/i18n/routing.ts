/**
 * Locale Configuration
 * Defines available locales and routing behavior for next-intl
 *
 * Supported Locales:
 * - en: English (default)
 * - fr: French
 * - es: Spanish
 * - nl: Dutch
 * - ar: Arabic (RTL)
 *
 * NOTE: We use a plain config object instead of defineRouting() to avoid
 * INSUFFICIENT_PATH errors with dynamic route segments like [shopId].
 * The defineRouting function does internal path registration that conflicts
 * with dynamic UUID-based routes.
 */

/**
 * Routing configuration for next-intl
 * - localePrefix: 'always' ensures URLs always include locale (e.g., /en/dashboard)
 * - defaultLocale: 'en' is used when no locale is detected
 */
export const routing = {
  locales: ['en', 'fr', 'es', 'nl', 'ar'] as const,
  defaultLocale: 'en' as const,
  localePrefix: 'always' as const,
};

/**
 * Available locales array for type safety and iteration
 */
export const locales = routing.locales;

/**
 * Locale type derived from the routing configuration
 * Use this type when you need to type a locale parameter
 */
export type Locale = (typeof locales)[number];

/**
 * RTL (Right-to-Left) locales
 * Arabic requires RTL layout direction
 */
export const rtlLocales: Locale[] = ['ar'];

/**
 * Check if a locale is RTL
 */
export function isRtlLocale(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

/**
 * Locale display names for UI dropdowns and selectors
 */
export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Francais',
  es: 'Espanol',
  nl: 'Nederlands',
  ar: 'العربية',
};

/**
 * Locale flags for visual identification (emoji or icon code)
 */
export const localeFlags: Record<Locale, string> = {
  en: 'GB', // United Kingdom flag code
  fr: 'FR', // France flag code
  es: 'ES', // Spain flag code
  nl: 'NL', // Netherlands flag code
  ar: 'SA', // Saudi Arabia flag code (common for Arabic)
};
