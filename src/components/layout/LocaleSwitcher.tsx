'use client';

/**
 * LocaleSwitcher Component
 *
 * Dropdown for switching between available locales.
 * Preserves the current path when changing locale.
 *
 * Features:
 * - Dropdown with all available locales
 * - Current locale indicator
 * - Flag/locale code display
 * - Preserves current URL path on switch
 * - RTL support
 *
 * Supported Locales:
 * - en: English
 * - fr: French
 * - es: Spanish
 * - nl: Dutch
 * - ar: Arabic (RTL)
 *
 * @module components/layout/LocaleSwitcher
 */

import React, { useCallback } from 'react';

import { GlobalOutlined, CheckOutlined } from '@ant-design/icons';
import { Button, Dropdown } from 'antd';
import { useLocale, useTranslations } from 'next-intl';

import { usePathname } from '@/lib/i18n/navigation';
import { locales, localeNames, type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';

import type { MenuProps } from 'antd';

// =============================================================================
// TYPES
// =============================================================================

export interface LocaleSwitcherProps {
  /** Show the current locale label */
  showLabel?: boolean;
  /** Button size */
  size?: 'small' | 'middle' | 'large';
  /** Additional CSS class name */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Locale flag emoji mapping
 * Using regional indicator symbols for flag representation
 */
const localeFlags: Record<Locale, string> = {
  en: 'GB',
  fr: 'FR',
  es: 'ES',
  nl: 'NL',
  ar: 'SA',
};

/**
 * Convert country code to flag emoji
 */
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * LocaleSwitcher Component
 *
 * A dropdown for selecting the application language.
 * Changes are applied immediately and preserve the current route.
 *
 * @example
 * // Basic usage
 * <LocaleSwitcher />
 *
 * @example
 * // With label
 * <LocaleSwitcher showLabel />
 *
 * @example
 * // Small size
 * <LocaleSwitcher size="small" />
 */
export function LocaleSwitcher({
  showLabel = false,
  size = 'middle',
  className,
}: LocaleSwitcherProps): React.JSX.Element {
  const t = useTranslations('settings.appearance');
  const currentLocale = useLocale() as Locale;
  const pathname = usePathname();

  // Handle locale change
  const handleLocaleChange = useCallback(
    (newLocale: Locale) => {
      if (newLocale === currentLocale) {
        return;
      }

      // Use window.location for locale switching to avoid INSUFFICIENT_PATH errors
      // with dynamic route segments (like shopId UUIDs)
      // The pathname from usePathname() doesn't include locale prefix
      window.location.href = `/${newLocale}${pathname}`;
    },
    [currentLocale, pathname]
  );

  // Build dropdown menu items
  const menuItems: MenuProps['items'] = locales.map((locale) => {
    const isActive = locale === currentLocale;
    const flag = getFlagEmoji(localeFlags[locale]);
    const name = localeNames[locale];

    return {
      key: locale,
      label: (
        <div className="flex items-center justify-between gap-3 min-w-32">
          <div className="flex items-center gap-2">
            <span className="text-base">{flag}</span>
            <span
              className={cn(
                isActive
                  ? 'font-medium text-stone-900 dark:text-stone-100'
                  : 'text-stone-600 dark:text-stone-400'
              )}
            >
              {name}
            </span>
          </div>
          {isActive && <CheckOutlined className="text-amber-600 text-sm" />}
        </div>
      ),
      onClick: () => handleLocaleChange(locale),
      className: isActive ? 'bg-amber-50 dark:bg-amber-900/20' : undefined,
    };
  });

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
      <Button
        type="text"
        size={size}
        className={cn(
          'flex items-center justify-center gap-2',
          'text-stone-600 dark:text-stone-300',
          'hover:text-amber-600 dark:hover:text-amber-400',
          className
        )}
        icon={<GlobalOutlined className="text-lg" />}
        aria-label={t('language')}
      >
        {showLabel && (
          <span className="hidden sm:inline text-sm uppercase font-medium">{currentLocale}</span>
        )}
      </Button>
    </Dropdown>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default LocaleSwitcher;
