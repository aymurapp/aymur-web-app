/**
 * Next.js Middleware
 *
 * This middleware runs on every request and handles:
 * 1. i18n locale routing (via next-intl createMiddleware)
 * 2. Supabase session refresh (keeps auth tokens valid)
 * 3. Route protection (redirects unauthenticated users)
 * 4. Domain-based routing (aymur.com vs platform.aymur.com)
 *
 * IMPORTANT: Uses next-intl's createMiddleware for locale handling.
 * Custom locale handling was removed to prevent conflicts with next-intl plugin.
 *
 * @see https://next-intl-docs.vercel.app/docs/routing/middleware
 * @module middleware
 */

import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';

import { routing } from '@/lib/i18n/routing';
import type { Database } from '@/lib/types/database';

/**
 * Domain configuration
 */
const MARKETING_DOMAINS = ['aymur.com', 'www.aymur.com'];
const PLATFORM_DOMAINS = ['platform.aymur.com'];

/**
 * Routes that don't require authentication.
 * These patterns are matched against the pathname after locale prefix.
 */
const publicRoutes = [
  // Marketing pages
  '/',
  '/about',
  '/pricing',
  '/contact',
  '/terms',
  '/privacy',
  '/features',
  // Auth pages
  '/login',
  '/signup',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
  '/auth/confirm',
];

/**
 * Marketing-only paths that should redirect to aymur.com on platform domain
 */
const marketingOnlyPaths = ['/about', '/pricing', '/contact', '/terms', '/privacy', '/features'];

/**
 * Platform paths that should redirect to platform.aymur.com on marketing domain
 */
const platformPaths = ['/shops', '/profile', '/subscription'];

/**
 * Create the next-intl middleware for i18n handling
 * This handles ALL locale detection, redirects, and cookie management
 */
const handleI18nRouting = createIntlMiddleware(routing);

/**
 * Removes the locale prefix from a pathname.
 */
function removeLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.substring(locale.length + 1);
    }
    if (pathname === `/${locale}`) {
      return '/';
    }
  }
  return pathname;
}

/**
 * Checks if a pathname matches a public route.
 */
function isPublicRoute(pathname: string): boolean {
  const normalizedPath = pathname === '' ? '/' : pathname;

  return publicRoutes.some((route) => {
    if (normalizedPath === route) {
      return true;
    }
    if (route !== '/' && normalizedPath.startsWith(`${route}/`)) {
      return true;
    }
    return false;
  });
}

/**
 * Determines the domain type from the request hostname.
 */
function getDomainType(hostname: string): 'marketing' | 'platform' | 'development' {
  const host = hostname.toLowerCase();

  if (MARKETING_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    return 'marketing';
  }

  if (PLATFORM_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    return 'platform';
  }

  return 'development';
}

/**
 * Checks if a path is trying to access platform routes.
 */
function isPlatformPath(pathname: string): boolean {
  const withoutLocale = removeLocalePrefix(pathname);

  if (platformPaths.some((p) => withoutLocale.startsWith(p))) {
    return true;
  }

  // Check for UUID pattern (shopId)
  const uuidPattern = /^\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;
  return uuidPattern.test(withoutLocale);
}

/**
 * Gets the locale from the pathname or defaults
 */
function getLocaleFromPath(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale;
    }
  }
  return routing.defaultLocale;
}

/**
 * Checks if the pathname already has a valid locale prefix.
 */
function hasLocalePrefix(pathname: string): boolean {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return true;
    }
  }
  return false;
}

/**
 * Main middleware function.
 * Composes next-intl i18n routing with Supabase auth and domain routing.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const hostname = request.headers.get('host') || '';
  const domainType = getDomainType(hostname);

  // === STEP 1: Cross-domain redirects (before i18n) ===

  // Marketing domain → redirect platform routes to platform.aymur.com
  if (domainType === 'marketing' && isPlatformPath(pathname)) {
    const url = new URL(request.url);
    url.hostname = 'platform.aymur.com';
    return NextResponse.redirect(url);
  }

  // === STEP 2: Handle i18n routing ===
  // IMPORTANT: Only use next-intl's middleware for paths WITHOUT a locale prefix.
  // For paths that already have a locale (like /en/shops), we skip it entirely
  // to avoid redirect loops caused by next-intl's cookie/redirect behavior.

  let response: NextResponse;

  if (hasLocalePrefix(pathname)) {
    // Path already has locale - skip next-intl, just create a basic response
    response = NextResponse.next();
  } else {
    // Path needs locale detection - let next-intl handle it
    const intlResponse = handleI18nRouting(request);

    // If next-intl wants to redirect (e.g., / -> /en), return that redirect
    const isRedirect = intlResponse.status >= 300 && intlResponse.status < 400;
    if (isRedirect) {
      return intlResponse;
    }

    response = intlResponse;
  }

  // === STEP 3: Supabase session refresh ===
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user = null;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // Refresh session - IMPORTANT: Always call getUser() to refresh tokens
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  // === STEP 4: Auth protection ===
  const pathnameWithoutLocale = removeLocalePrefix(pathname);
  const isPublic = isPublicRoute(pathnameWithoutLocale);
  const locale = getLocaleFromPath(pathname);

  if (!user && !isPublic) {
    // User is not authenticated and trying to access protected route
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // === STEP 5: Platform domain specific routing ===
  if (domainType === 'platform') {
    const isMarketingOnlyPath = marketingOnlyPaths.includes(pathnameWithoutLocale);

    // Redirect marketing-only paths to aymur.com
    if (isMarketingOnlyPath) {
      const url = new URL(request.url);
      url.hostname = 'aymur.com';
      return NextResponse.redirect(url);
    }

    // Handle root path on platform domain
    if (pathnameWithoutLocale === '/' || pathnameWithoutLocale === '') {
      if (user) {
        // Authenticated users on platform root go to shops
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/shops`;
        return NextResponse.redirect(url);
      } else {
        // Unauthenticated users on platform root go to marketing site
        const url = new URL(request.url);
        url.hostname = 'aymur.com';
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

/**
 * Middleware configuration.
 * Uses the recommended next-intl matcher pattern.
 */
export const config = {
  matcher: [
    // Match all pathnames except:
    // - API routes (/api)
    // - Next.js internals (/_next)
    // - Vercel internals (/_vercel)
    // - Static files (files with extensions like .svg, .png, etc.)
    '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
  ],
};
