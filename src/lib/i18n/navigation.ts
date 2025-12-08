/**
 * Navigation Helpers
 * Typed navigation utilities for locale-aware routing
 *
 * These utilities provide locale-aware routing while avoiding
 * INSUFFICIENT_PATH errors that can occur with next-intl's createNavigation
 * when used with dynamic route segments (like [shopId]).
 *
 * Usage:
 * - Link: <Link href="/dashboard">Dashboard</Link>
 * - redirect: redirect('/login') (server-side)
 * - usePathname: const path = usePathname() // returns path without locale
 * - useRouter: const router = useRouter(); router.push('/dashboard')
 */

'use client';

import { useCallback, useMemo } from 'react';

import { usePathname as useNextPathname, useRouter as useNextRouter } from 'next/navigation';

import { useLocale } from 'next-intl';
import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/**
 * Create next-intl navigation for Link and redirect
 * These are safer and work well with dynamic routes
 */
const nextIntlNav = createNavigation(routing);

/**
 * Re-export Link from next-intl - it handles locale prefixes correctly
 */
export const Link = nextIntlNav.Link;

/**
 * Re-export redirect from next-intl for server-side redirects
 */
export const redirect = nextIntlNav.redirect;

/**
 * Re-export getPathname from next-intl
 */
export const getPathname = nextIntlNav.getPathname;

/**
 * Custom usePathname hook that safely returns the pathname without locale prefix.
 * Uses next/navigation directly to avoid INSUFFICIENT_PATH errors with dynamic routes.
 *
 * @returns The pathname without the locale prefix (e.g., '/shop-id/dashboard')
 */
export function usePathname(): string {
  const fullPathname = useNextPathname();

  // Strip locale prefix from pathname
  const pathnameWithoutLocale = useMemo(() => {
    if (!fullPathname) {
      return '/';
    }

    // Check if pathname starts with a locale prefix
    for (const locale of routing.locales) {
      if (fullPathname === `/${locale}`) {
        return '/';
      }
      if (fullPathname.startsWith(`/${locale}/`)) {
        return fullPathname.substring(locale.length + 1);
      }
    }

    return fullPathname;
  }, [fullPathname]);

  return pathnameWithoutLocale;
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

/**
 * Custom useRouter hook that provides locale-aware navigation.
 * Uses next/navigation directly to avoid INSUFFICIENT_PATH errors.
 *
 * @returns Router with locale-aware push, replace, and other navigation methods
 */
export function useRouter(): LocaleAwareRouter {
  const nextRouter = useNextRouter();
  const locale = useLocale();

  /**
   * Add locale prefix to path if not already present
   */
  const addLocalePrefix = useCallback(
    (path: string): string => {
      // If path already has locale prefix, return as-is
      for (const loc of routing.locales) {
        if (path === `/${loc}` || path.startsWith(`/${loc}/`)) {
          return path;
        }
      }

      // Add current locale prefix
      if (path.startsWith('/')) {
        return `/${locale}${path}`;
      }

      return `/${locale}/${path}`;
    },
    [locale]
  );

  /**
   * Push to a new route with locale handling
   */
  const push = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      const localizedHref = addLocalePrefix(href);
      // Type assertion needed because Next.js typedRoutes expects RouteImpl
      nextRouter.push(localizedHref as Parameters<typeof nextRouter.push>[0], options);
    },
    [nextRouter, addLocalePrefix]
  );

  /**
   * Replace current route with locale handling
   */
  const replace = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      const localizedHref = addLocalePrefix(href);
      // Type assertion needed because Next.js typedRoutes expects RouteImpl
      nextRouter.replace(localizedHref as Parameters<typeof nextRouter.replace>[0], options);
    },
    [nextRouter, addLocalePrefix]
  );

  /**
   * Navigate back in history
   */
  const back = useCallback(() => {
    nextRouter.back();
  }, [nextRouter]);

  /**
   * Navigate forward in history
   */
  const forward = useCallback(() => {
    nextRouter.forward();
  }, [nextRouter]);

  /**
   * Refresh the current route
   */
  const refresh = useCallback(() => {
    nextRouter.refresh();
  }, [nextRouter]);

  /**
   * Prefetch a route
   */
  const prefetch = useCallback(
    (href: string) => {
      const localizedHref = addLocalePrefix(href);
      // Type assertion needed because Next.js typedRoutes expects RouteImpl
      nextRouter.prefetch(localizedHref as Parameters<typeof nextRouter.prefetch>[0]);
    },
    [nextRouter, addLocalePrefix]
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
