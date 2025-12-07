/**
 * Server-side Locale Configuration
 * Handles locale detection and message loading for Server Components
 *
 * This file is used by the next-intl plugin to:
 * 1. Determine the current locale from the request
 * 2. Load the appropriate translation messages
 * 3. Provide locale context to Server Components
 *
 * Configuration in next.config.mjs should point to this file:
 * createNextIntlPlugin('./src/lib/i18n/request.ts')
 */

import { getRequestConfig } from 'next-intl/server';

import { routing, type Locale } from './routing';

import type { AbstractIntlMessages } from 'next-intl';

/**
 * Request configuration for next-intl
 * Called for each request to determine locale and load messages
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // Get the requested locale from the URL or headers
  let locale = await requestLocale;

  // Validate and fallback to default if locale is invalid
  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  // Dynamically import messages for the current locale
  // This enables code-splitting - only the needed locale is loaded
  const messages = (await import(`./messages/${locale}.json`)).default as AbstractIntlMessages;

  return {
    locale,
    messages,
    // Time zone for date/time formatting
    timeZone: 'UTC',
    // Default formatting options
    now: new Date(),
    formats: {
      dateTime: {
        short: {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        },
        long: {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        },
      },
      number: {
        currency: {
          style: 'currency',
          currency: 'EUR', // Default currency, can be overridden per-shop
        },
        weight: {
          style: 'decimal',
          minimumFractionDigits: 2,
          maximumFractionDigits: 3,
        },
      },
    },
  };
});
