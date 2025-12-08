/**
 * Navigation Helpers
 * Typed navigation utilities for locale-aware routing
 *
 * These utilities provide locale-aware routing WITHOUT using next-intl's
 * createNavigation, which causes INSUFFICIENT_PATH errors with dynamic
 * route segments (like [shopId]).
 *
 * Usage:
 * - Link: <Link href="/dashboard">Dashboard</Link>
 * - usePathname: const path = usePathname() // returns path without locale
 * - useRouter: const router = useRouter(); router.push('/dashboard')
 *
 * For server-side redirects, use `redirect` from 'next/navigation' directly.
 */

'use client';

import { forwardRef, useCallback, useMemo } from 'react';
import type { ComponentProps } from 'react';

import NextLink from 'next/link';
import { usePathname as useNextPathname, useRouter as useNextRouter } from 'next/navigation';

import { useLocale } from 'next-intl';

import { routing } from './routing';

// =============================================================================
// TYPES
// =============================================================================

type NextLinkProps = ComponentProps<typeof NextLink>;

export interface LinkProps extends Omit<NextLinkProps, 'href'> {
  /** The path to navigate to (without locale prefix) */
  href: string;
  /** Override the current locale for this link */
  locale?: string;
}

/**
 * Router interface returned by useRouter
 */
interface LocaleAwareRouter {
  push: (href: string, options?: { scroll?: boolean }) => void;
  replace: (href: string, options?: { scroll?: boolean }) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: (href: string) => void;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Add locale prefix to path if not already present
 */
function addLocalePrefix(path: string, locale: string): string {
  // If path already has locale prefix, return as-is
  for (const loc of routing.locales) {
    if (path === `/${loc}` || path.startsWith(`/${loc}/`)) {
      return path;
    }
  }

  // Add locale prefix
  if (path.startsWith('/')) {
    return `/${locale}${path}`;
  }

  return `/${locale}/${path}`;
}

/**
 * Remove locale prefix from pathname
 */
function removeLocalePrefix(pathname: string): string {
  if (!pathname) {
    return '/';
  }

  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) {
      return '/';
    }
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.substring(locale.length + 1);
    }
  }

  return pathname;
}

// =============================================================================
// LINK COMPONENT
// =============================================================================

/**
 * Locale-aware Link component
 *
 * Wraps Next.js Link to automatically add the current locale prefix.
 * Use this instead of next/link for internal navigation.
 *
 * @example
 * <Link href="/dashboard">Dashboard</Link>
 * // When locale is 'en', renders: <a href="/en/dashboard">Dashboard</a>
 *
 * @example
 * // Override locale for specific link
 * <Link href="/about" locale="fr">À propos</Link>
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, locale: localeProp, ...props },
  ref
) {
  const currentLocale = useLocale();
  const locale = localeProp || currentLocale;

  // Add locale prefix to href
  const localizedHref = addLocalePrefix(href, locale);

  // Type assertion needed because Next.js typedRoutes expects RouteImpl
  return <NextLink ref={ref} href={localizedHref as NextLinkProps['href']} {...props} />;
});

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Custom usePathname hook that safely returns the pathname without locale prefix.
 * Uses next/navigation directly to avoid INSUFFICIENT_PATH errors with dynamic routes.
 *
 * @returns The pathname without the locale prefix (e.g., '/shop-id/dashboard')
 *
 * @example
 * const pathname = usePathname();
 * // When on /en/abc-123/dashboard, returns '/abc-123/dashboard'
 */
export function usePathname(): string {
  const fullPathname = useNextPathname();

  const pathnameWithoutLocale = useMemo(() => removeLocalePrefix(fullPathname), [fullPathname]);

  return pathnameWithoutLocale;
}

/**
 * Custom useRouter hook that provides locale-aware navigation.
 * Uses next/navigation directly to avoid INSUFFICIENT_PATH errors.
 *
 * @returns Router with locale-aware push, replace, and other navigation methods
 *
 * @example
 * const router = useRouter();
 * router.push('/dashboard'); // Navigates to /en/dashboard (if locale is 'en')
 */
export function useRouter(): LocaleAwareRouter {
  const nextRouter = useNextRouter();
  const locale = useLocale();

  const push = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      const localizedHref = addLocalePrefix(href, locale);
      nextRouter.push(localizedHref as Parameters<typeof nextRouter.push>[0], options);
    },
    [nextRouter, locale]
  );

  const replace = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      const localizedHref = addLocalePrefix(href, locale);
      nextRouter.replace(localizedHref as Parameters<typeof nextRouter.replace>[0], options);
    },
    [nextRouter, locale]
  );

  const back = useCallback(() => {
    nextRouter.back();
  }, [nextRouter]);

  const forward = useCallback(() => {
    nextRouter.forward();
  }, [nextRouter]);

  const refresh = useCallback(() => {
    nextRouter.refresh();
  }, [nextRouter]);

  const prefetch = useCallback(
    (href: string) => {
      const localizedHref = addLocalePrefix(href, locale);
      nextRouter.prefetch(localizedHref as Parameters<typeof nextRouter.prefetch>[0]);
    },
    [nextRouter, locale]
  );

  return useMemo(
    () => ({
      push,
      replace,
      back,
      forward,
      refresh,
      prefetch,
    }),
    [push, replace, back, forward, refresh, prefetch]
  );
}
