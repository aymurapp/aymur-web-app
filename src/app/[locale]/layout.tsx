import React from 'react';

import { notFound } from 'next/navigation';

import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';

import { routing, isRtlLocale, type Locale } from '@/lib/i18n/routing';

/**
 * Generate static params for all supported locales
 * This enables static generation for each locale
 */
export function generateStaticParams(): { locale: string }[] {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Locale Layout Props
 */
interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Locale Layout
 *
 * This is the SINGLE [locale] layout that wraps all localized pages.
 * It provides:
 * - next-intl message provider for translations
 * - RTL direction support for Arabic locale
 * - Validation that the locale is supported
 *
 * All route groups (auth, platform, marketing) are nested inside this layout.
 */
export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps): Promise<React.JSX.Element> {
  const { locale } = await params;

  // Validate the locale is supported
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Load messages for this locale
  const messages = await getMessages();

  // Determine text direction
  const isRtl = isRtlLocale(locale as Locale);

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen">
      <NextIntlClientProvider messages={messages} locale={locale}>
        {children}
      </NextIntlClientProvider>
    </div>
  );
}
