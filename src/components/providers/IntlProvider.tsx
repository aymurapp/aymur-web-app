'use client';

/**
 * IntlProvider - Client-side internationalization provider
 *
 * Wraps NextIntlClientProvider with error handling for:
 * - Missing translations (logs in development only)
 * - INSUFFICIENT_PATH errors (common with dynamic routes, non-critical)
 * - Other i18n errors
 *
 * This component must be a Client Component because it defines event handlers
 * (onError, getMessageFallback) that cannot be serialized from Server to Client.
 *
 * @module components/providers/IntlProvider
 */

import React from 'react';

import { NextIntlClientProvider, IntlErrorCode } from 'next-intl';

import type { AbstractIntlMessages } from 'next-intl';

// =============================================================================
// TYPES
// =============================================================================

export interface IntlProviderProps {
  /** Translation messages object */
  messages: AbstractIntlMessages;
  /** Current locale code */
  locale: string;
  /** Child components */
  children: React.ReactNode;
}

interface IntlError {
  code: string;
  message?: string;
}

// =============================================================================
// ERROR HANDLERS
// =============================================================================

/**
 * Error handler for next-intl
 * Suppresses non-critical errors in production while logging them in development
 */
function onIntlError(error: IntlError): void {
  // Suppress non-critical errors that don't affect functionality
  const nonCriticalCodes = [
    IntlErrorCode.MISSING_MESSAGE,
    'INSUFFICIENT_PATH',
    'ENVIRONMENT_FALLBACK',
  ];

  const isNonCritical =
    nonCriticalCodes.includes(error.code) ||
    error.message?.includes('INSUFFICIENT_PATH') ||
    error.message?.includes('ENVIRONMENT_FALLBACK');

  if (error.code === IntlErrorCode.MISSING_MESSAGE) {
    // Missing translations - log warning in development only
    if (process.env.NODE_ENV === 'development') {
      console.warn('[next-intl] Missing translation:', error.message);
    }
  } else if (isNonCritical) {
    // Path resolution and environment errors with dynamic routes - suppress in production
    if (process.env.NODE_ENV === 'development') {
      console.debug('[next-intl] Non-critical warning:', error.code, error.message);
    }
  } else {
    // Other errors - always log
    console.error('[next-intl] Error:', error);
  }
}

/**
 * Fallback for missing messages
 * Returns the message key path as fallback to help identify missing translations
 */
function getMessageFallback({
  namespace,
  key,
  error,
}: {
  namespace?: string;
  key: string;
  error: IntlError;
}): string {
  const path = [namespace, key].filter(Boolean).join('.');

  if (error.code === IntlErrorCode.MISSING_MESSAGE) {
    return path; // Return the key path as fallback
  }

  return `[${path}]`;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * IntlProvider Component
 *
 * Client-side wrapper for NextIntlClientProvider with built-in error handling.
 * Use this instead of NextIntlClientProvider directly to get proper error suppression
 * for non-critical i18n issues like INSUFFICIENT_PATH with dynamic routes.
 *
 * @example
 * // In a Server Component layout
 * import { IntlProvider } from '@/components/providers/IntlProvider';
 *
 * export default async function LocaleLayout({ children, params }) {
 *   const messages = await getMessages();
 *   return (
 *     <IntlProvider messages={messages} locale={params.locale}>
 *       {children}
 *     </IntlProvider>
 *   );
 * }
 */
export function IntlProvider({ messages, locale, children }: IntlProviderProps): React.JSX.Element {
  return (
    <NextIntlClientProvider
      messages={messages}
      locale={locale}
      onError={onIntlError}
      getMessageFallback={getMessageFallback}
    >
      {children}
    </NextIntlClientProvider>
  );
}

export default IntlProvider;
