import localFont from 'next/font/local';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { Providers } from './providers';

import type { Metadata, Viewport } from 'next';

import './globals.css';

/**
 * Custom fonts for the Aymur Platform
 *
 * Using Geist font family for a modern, professional look
 * that complements the gold luxury aesthetic.
 */
const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
});

/**
 * Application Metadata
 *
 * SEO and social sharing configuration for the Aymur Platform.
 */
export const metadata: Metadata = {
  title: {
    default: 'Aymur Platform',
    template: '%s | Aymur Platform',
  },
  description:
    'Premium jewelry business management platform. Streamline inventory, sales, customers, and operations with our comprehensive solution for modern jewelers.',
  keywords: [
    'jewelry',
    'business management',
    'inventory',
    'POS',
    'gold',
    'precious metals',
    'jewelry shop',
    'retail management',
  ],
  authors: [{ name: 'Aymur' }],
  creator: 'Aymur',
  publisher: 'Aymur',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Aymur Platform',
    title: 'Aymur Platform - Jewelry Business Management',
    description: 'Premium jewelry business management platform for modern jewelers.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aymur Platform',
    description: 'Premium jewelry business management platform for modern jewelers.',
  },
};

/**
 * Viewport Configuration
 *
 * Mobile-first responsive design with proper theme colors.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0a09' },
  ],
};

/**
 * Root Layout
 *
 * The root layout wraps the entire application with:
 * - Custom fonts (Geist Sans and Geist Mono)
 * - Provider components (Ant Design ConfigProvider, AntdRegistry, etc.)
 * - Global styles
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
