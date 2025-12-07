/**
 * Next.js Middleware
 *
 * This middleware runs on every request and handles:
 * 1. Domain-based routing (aymur.com vs platform.aymur.com)
 * 2. Supabase session refresh (keeps auth tokens valid)
 * 3. Route protection (redirects unauthenticated users)
 * 4. i18n locale detection and routing
 *
 * Domain Routing:
 * - aymur.com → (marketing) pages
 * - platform.aymur.com → (platform) app pages
 *
 * Route Groups:
 * - (marketing) - Public marketing pages (no auth required)
 * - (auth) - Authentication pages (login, signup, etc.)
 * - (platform) - Protected app routes (requires authentication)
 *
 * @module middleware
 */

import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import { routing, type Locale } from '@/lib/i18n/routing';
import type { Database } from '@/lib/types/database';

/**
 * Domain configuration
 */
const MARKETING_DOMAINS = ['aymur.com', 'www.aymur.com'];
const PLATFORM_DOMAINS = ['platform.aymur.com'];
// Localhost and preview deployments work for both

/**
 * Locales from routing configuration - single source of truth
 */
const locales = routing.locales;
const defaultLocale = routing.defaultLocale;

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
 * Route patterns that should completely bypass middleware.
 * These are static assets, API routes, etc.
 */
const bypassPatterns = [
  '/_next',
  '/api',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
];

/**
 * Detects the preferred locale from the request.
 * Checks URL path first, then Accept-Language header, then defaults.
 *
 * @param request - The incoming request
 * @returns The detected locale
 */
function getLocale(request: NextRequest): Locale {
  // Check if locale is in the URL path
  const pathname = request.nextUrl.pathname;
  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameLocale) {
    return pathnameLocale;
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(',')
      .map((lang) => {
        const langPart = lang.split(';')[0];
        return langPart ? langPart.trim().substring(0, 2).toLowerCase() : '';
      })
      .filter((lang) => lang.length > 0)
      .find((lang) => locales.includes(lang as Locale));

    if (preferredLocale) {
      return preferredLocale as Locale;
    }
  }

  // Check cookie for previously set locale
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return localeCookie as Locale;
  }

  return defaultLocale;
}

/**
 * Removes the locale prefix from a pathname.
 *
 * @param pathname - The pathname to process
 * @returns The pathname without locale prefix
 */
function removeLocalePrefix(pathname: string): string {
  for (const locale of locales) {
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
 *
 * @param pathname - The pathname to check (without locale)
 * @returns Whether the route is public
 */
function isPublicRoute(pathname: string): boolean {
  // Normalize pathname
  const normalizedPath = pathname === '' ? '/' : pathname;

  return publicRoutes.some((route) => {
    // Exact match
    if (normalizedPath === route) {
      return true;
    }
    // Prefix match for nested routes under public paths
    if (route !== '/' && normalizedPath.startsWith(`${route}/`)) {
      return true;
    }
    return false;
  });
}

/**
 * Checks if a pathname should bypass middleware entirely.
 *
 * @param pathname - The pathname to check
 * @returns Whether to bypass middleware
 */
function shouldBypass(pathname: string): boolean {
  return bypassPatterns.some((pattern) => pathname.startsWith(pattern));
}

/**
 * Determines the domain type from the request hostname.
 *
 * @param hostname - The request hostname
 * @returns 'marketing' | 'platform' | 'development'
 */
function getDomainType(hostname: string): 'marketing' | 'platform' | 'development' {
  const host = hostname.toLowerCase();

  if (MARKETING_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    return 'marketing';
  }

  if (PLATFORM_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    return 'platform';
  }

  // Localhost, Vercel preview deployments, etc.
  return 'development';
}

/**
 * Checks if a path is trying to access platform routes.
 * Platform routes start with /[locale]/[shopId] pattern (UUID after locale).
 */
function isPlatformPath(pathname: string): boolean {
  // Remove locale prefix first
  const withoutLocale = removeLocalePrefix(pathname);

  // Check if it's a platform-specific route (shops, dashboard with shopId, etc.)
  const platformPaths = ['/shops', '/profile', '/subscription'];
  if (platformPaths.some((p) => withoutLocale.startsWith(p))) {
    return true;
  }

  // Check for UUID pattern (shopId) - platform routes have shopId in path
  const uuidPattern = /^\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;
  if (uuidPattern.test(withoutLocale)) {
    return true;
  }

  return false;
}

/**
 * Main middleware function.
 * Handles domain routing, session refresh, authentication, and i18n routing.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const hostname = request.headers.get('host') || '';

  // Skip middleware for static assets and API routes
  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  // Skip middleware for static file extensions
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$/.test(pathname)) {
    return NextResponse.next();
  }

  // Domain-based routing
  const domainType = getDomainType(hostname);

  // Marketing domain (aymur.com) - redirect platform routes to platform.aymur.com
  if (domainType === 'marketing' && isPlatformPath(pathname)) {
    const url = new URL(request.url);
    url.hostname = 'platform.aymur.com';
    return NextResponse.redirect(url);
  }

  // Platform domain marketing route handling is done AFTER auth check
  // to properly redirect authenticated users to /shops instead of aymur.com

  // Create response that we can modify
  let response = NextResponse.next({
    request,
  });

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Middleware] Missing Supabase environment variables');
    return response;
  }

  // Create Supabase client for session management
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Set cookies on the request for downstream middleware/pages
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        // Create new response with updated cookies
        response = NextResponse.next({
          request,
        });

        // Set cookies on the response for the browser
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session - IMPORTANT: Always call getUser() to refresh tokens
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Detect locale
  const locale = getLocale(request);

  // Get pathname without locale for route matching
  const pathnameWithoutLocale = removeLocalePrefix(pathname);

  // Check if the current path has a locale prefix
  const hasLocalePrefix = locales.some(
    (loc) => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`
  );

  // Handle locale routing for non-API routes
  // If path doesn't have locale prefix and isn't a bypass route, redirect to locale-prefixed path
  if (!hasLocalePrefix && !shouldBypass(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;

    // Set locale cookie for future requests
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });

    return redirectResponse;
  }

  // Check authentication for protected routes
  const isPublic = isPublicRoute(pathnameWithoutLocale);

  if (!user && !isPublic) {
    // User is not authenticated and trying to access protected route
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set('redirect', pathname);

    return NextResponse.redirect(url);
  }

  // NOTE: Auth page redirects for authenticated users are NOT handled in middleware.
  // The login page itself handles redirecting to /shops after successful authentication.
  // This avoids redirect loops caused by auth state inconsistency between middleware and layouts.

  // Platform domain (platform.aymur.com) - redirect marketing routes to aymur.com
  if (domainType === 'platform') {
    const marketingOnlyPaths = [
      '/about',
      '/pricing',
      '/contact',
      '/terms',
      '/privacy',
      '/features',
    ];
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

  // Set locale cookie on the response
  response.cookies.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  });

  return response;
}

/**
 * Middleware configuration.
 * Defines which routes the middleware should run on.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static file extensions
     *
     * This pattern ensures middleware runs on pages but not on static assets.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
