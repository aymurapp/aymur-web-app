/**
 * Navigation Helpers
 * Typed navigation utilities for locale-aware routing
 *
 * These utilities wrap Next.js navigation primitives to automatically
 * handle locale prefixes in URLs.
 *
 * Usage:
 * - Link: <Link href="/dashboard">Dashboard</Link>
 * - redirect: redirect('/login') (server-side)
 * - usePathname: const path = usePathname()
 * - useRouter: const router = useRouter(); router.push('/dashboard')
 */

import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/**
 * Locale-aware navigation primitives
 *
 * Link - Replacement for next/link that handles locale prefixes
 * redirect - Server-side redirect that includes the current locale
 * usePathname - Returns the pathname without the locale prefix
 * useRouter - Router hook with locale-aware push/replace methods
 * getPathname - Get pathname with locale prefix applied
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
