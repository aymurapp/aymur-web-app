/**
 * useLocale Hook
 * Provides internationalization utilities with RTL support and language switching
 *
 * Features:
 * - Get current locale from next-intl
 * - RTL detection for Arabic
 * - Language switching helper with persistence
 * - Locale metadata (display names, flags)
 */

'use client';

import { useCallback, useMemo, useTransition } from 'react';

import { useLocale as useNextIntlLocale, useTranslations } from 'next-intl';

import { useRouter, usePathname } from '@/lib/i18n/navigation';
import {
  type Locale,
  locales,
  rtlLocales,
  isRtlLocale,
  localeNames,
  localeFlags,
} from '@/lib/i18n/routing';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Locale metadata with display information
 */
export interface LocaleInfo {
  /** Locale code (e.g., 'en', 'ar') */
  code: Locale;
  /** Display name (e.g., 'English', 'العربية') */
  name: string;
  /** Country/flag code (e.g., 'GB', 'SA') */
  flag: string;
  /** Whether locale uses RTL layout */
  isRTL: boolean;
}

/**
 * Return type for useLocale hook
 */
export interface UseLocaleReturn {
  /**
   * Current active locale code
   */
  locale: Locale;

  /**
   * Whether current locale uses Right-to-Left layout
   */
  isRTL: boolean;

  /**
   * Text direction for CSS (either 'rtl' or 'ltr')
   */
  dir: 'rtl' | 'ltr';

  /**
   * Display name of current locale
   */
  localeName: string;

  /**
   * Flag code of current locale
   */
  localeFlag: string;

  /**
   * All available locales with metadata
   */
  availableLocales: LocaleInfo[];

  /**
   * Get info for a specific locale
   * @param localeCode - The locale code to get info for
   */
  getLocaleInfo: (localeCode: Locale) => LocaleInfo;

  /**
   * Switch to a different locale
   * Preserves the current path and navigates to the same page in new locale
   * @param newLocale - The locale to switch to
   */
  switchLocale: (newLocale: Locale) => void;

  /**
   * Whether a locale switch is currently in progress
   */
  isSwitching: boolean;

  /**
   * Check if a locale code is valid
   * @param code - The code to validate
   */
  isValidLocale: (code: string) => code is Locale;

  /**
   * The translations function for the current locale
   * Re-exported for convenience
   */
  t: ReturnType<typeof useTranslations>;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Internationalization hook with RTL support and language switching
 *
 * @param namespace - Optional translation namespace (defaults to 'common')
 *
 * @example
 * const { locale, isRTL, dir, switchLocale, availableLocales } = useLocale();
 *
 * // Apply RTL styles
 * <div dir={dir}>...</div>
 *
 * // Language selector
 * {availableLocales.map((loc) => (
 *   <button key={loc.code} onClick={() => switchLocale(loc.code)}>
 *     {loc.name}
 *   </button>
 * ))}
 *
 * // Conditional RTL styling
 * <div className={isRTL ? 'mr-4' : 'ml-4'}>...</div>
 */
export function useLocale(namespace: string = 'common'): UseLocaleReturn {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useNextIntlLocale() as Locale;
  const t = useTranslations(namespace);
  const [isPending, startTransition] = useTransition();

  // Calculate RTL status
  const isRTL = useMemo(() => isRtlLocale(currentLocale), [currentLocale]);
  const dir = isRTL ? 'rtl' : 'ltr';

  // Current locale metadata
  const localeName = localeNames[currentLocale];
  const localeFlag = localeFlags[currentLocale];

  /**
   * Build available locales list with metadata
   */
  const availableLocales = useMemo((): LocaleInfo[] => {
    return locales.map((code) => ({
      code,
      name: localeNames[code],
      flag: localeFlags[code],
      isRTL: rtlLocales.includes(code),
    }));
  }, []);

  /**
   * Get info for a specific locale
   */
  const getLocaleInfo = useCallback((localeCode: Locale): LocaleInfo => {
    return {
      code: localeCode,
      name: localeNames[localeCode],
      flag: localeFlags[localeCode],
      isRTL: rtlLocales.includes(localeCode),
    };
  }, []);

  /**
   * Switch to a different locale while preserving the current path
   */
  const switchLocale = useCallback(
    (newLocale: Locale): void => {
      startTransition(() => {
        // The router from next-intl handles locale switching automatically
        // It will navigate to the same path but with the new locale prefix
        router.replace(pathname, { locale: newLocale });
      });
    },
    [router, pathname]
  );

  /**
   * Validate if a string is a valid locale code
   */
  const isValidLocale = useCallback((code: string): code is Locale => {
    return (locales as readonly string[]).includes(code);
  }, []);

  return {
    locale: currentLocale,
    isRTL,
    dir,
    localeName,
    localeFlag,
    availableLocales,
    getLocaleInfo,
    switchLocale,
    isSwitching: isPending,
    isValidLocale,
    t,
  };
}

// =============================================================================
// ADDITIONAL HOOKS
// =============================================================================

/**
 * Simplified hook for just RTL detection
 * Use when you only need to know the text direction
 *
 * @example
 * const isRTL = useIsRTL();
 * <div className={isRTL ? 'flex-row-reverse' : 'flex-row'}>...</div>
 */
export function useIsRTL(): boolean {
  const locale = useNextIntlLocale() as Locale;
  return useMemo(() => isRtlLocale(locale), [locale]);
}

/**
 * Hook for text direction string
 * Convenient for setting dir attribute
 *
 * @example
 * const dir = useTextDirection();
 * <html dir={dir}>...</html>
 */
export function useTextDirection(): 'rtl' | 'ltr' {
  const isRTL = useIsRTL();
  return isRTL ? 'rtl' : 'ltr';
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useLocale;

// Re-export types and constants for convenience
export type { Locale };
export { locales, rtlLocales, localeNames, localeFlags, isRtlLocale };
