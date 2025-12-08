/**
 * Next.js Middleware
 *
 * This middleware runs on every request and handles:
 * 1. Locale routing (manual implementation - NO next-intl createMiddleware)
 * 2. Supabase session refresh (keeps auth tokens valid)
 * 3. Route protection (redirects unauthenticated users)
 * 4. Domain-based routing (aymur.com vs platform.aymur.com)
 *
 * IMPORTANT: We intentionally DON'T use next-intl's createMiddleware
 * because it was causing redirect loops. Instead, we handle locale
 * detection and routing manually.
 *
 * @module middleware
 */

import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import { routing } from '@/lib/i18n/routing';
import type { Database } from '@/lib/types/database';

/**
 * Domain configuration
 */
const MARKETING_DOMAINS = ['aymur.com', 'www.aymur.com'];
const PLATFORM_DOMAINS = ['platform.aymur.com', 'app.aymur.com'];

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
 * Extracts the locale from a pathname that has a locale prefix.
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
 * IMPORTANT: Check platform domains FIRST, since they are subdomains of aymur.com
 * and would otherwise match the marketing `.aymur.com` pattern.
 */
function getDomainType(hostname: string): 'marketing' | 'platform' | 'development' {
  const host = hostname.toLowerCase();

  // Check platform domains FIRST (they are subdomains like app.aymur.com, platform.aymur.com)
  if (PLATFORM_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    return 'platform';
  }

  // Then check marketing domains
  if (MARKETING_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    return 'marketing';
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
 * Detects the preferred locale from request headers and cookies.
 */
function detectLocale(request: NextRequest): string {
  // 1. Check NEXT_LOCALE cookie first
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && routing.locales.includes(cookieLocale as (typeof routing.locales)[number])) {
    return cookieLocale;
  }

  // 2. Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,fr;q=0.8")
    const languages: string[] = [];
    for (const part of acceptLanguage.split(',')) {
      const code = part.trim().split(';')[0] ?? '';
      const langCode = code.split('-')[0] ?? '';
      if (langCode) {
        languages.push(langCode.toLowerCase());
      }
    }

    // Find first matching locale
    for (const lang of languages) {
      if (routing.locales.includes(lang as (typeof routing.locales)[number])) {
        return lang;
      }
    }
  }

  // 3. Fall back to default locale
  return routing.defaultLocale;
}

/**
 * Main middleware function.
 * Handles locale routing, auth, and domain routing WITHOUT next-intl middleware.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const hostname = request.headers.get('host') || '';
  const domainType = getDomainType(hostname);

  // === STEP 1: Cross-domain redirects (before locale handling) ===

  // Marketing domain → redirect platform routes to platform.aymur.com
  if (domainType === 'marketing' && isPlatformPath(pathname)) {
    const url = new URL(request.url);
    url.hostname = 'platform.aymur.com';
    return NextResponse.redirect(url);
  }

  // === STEP 2: Locale routing (manual implementation) ===

  let locale: string;
  let response: NextResponse;

  if (hasLocalePrefix(pathname)) {
    // Path already has locale (e.g., /en/shops) - just proceed
    locale = getLocaleFromPath(pathname);
    response = NextResponse.next();
  } else {
    // Path needs locale prefix (e.g., /shops → /en/shops)
    locale = detectLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
    const localeRedirect = NextResponse.redirect(url);
    localeRedirect.headers.set('x-aymur-redirect-reason', 'add-locale-prefix');
    localeRedirect.headers.set('x-aymur-target', url.pathname);
    return localeRedirect;
  }

  // Set NEXT_LOCALE cookie if not already set
  if (!request.cookies.has('NEXT_LOCALE')) {
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  // DEBUG: Add custom header to verify middleware execution
  response.headers.set('x-aymur-middleware', 'executed');
  response.headers.set('x-aymur-domain', domainType);
  response.headers.set('x-aymur-pathname', pathname);

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

  if (!user && !isPublic) {
    // User is not authenticated and trying to access protected route
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set('redirect', pathname);
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set('x-aymur-redirect-reason', 'auth-protection');
    redirectResponse.headers.set('x-aymur-target', url.pathname);
    return redirectResponse;
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
