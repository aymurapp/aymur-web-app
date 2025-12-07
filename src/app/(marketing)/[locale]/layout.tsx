import React from 'react';

import { notFound } from 'next/navigation';

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { routing, isRtlLocale, type Locale } from '@/lib/i18n/routing';

import type { Metadata } from 'next';

/**
 * Marketing Layout Metadata
 */
export const metadata: Metadata = {
  title: {
    template: '%s | Aymur',
    default: 'Aymur - Premium Jewelry Business Management',
  },
  description:
    'Aymur is a comprehensive jewelry business management platform for inventory, sales, customers, and analytics.',
};

/**
 * Generate static params for all supported locales
 */
export function generateStaticParams(): { locale: string }[] {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Marketing Layout Props
 */
interface MarketingLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Marketing Layout
 *
 * Layout for marketing/landing pages with i18n support.
 */
export default async function MarketingLayout({
  children,
  params,
}: MarketingLayoutProps): Promise<React.JSX.Element> {
  const { locale } = await params;

  // Validate the locale is supported
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

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
