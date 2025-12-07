/**
 * useNavigation Hook
 * Provides navigation utilities with automatic locale and shop prefixing
 *
 * Features:
 * - Auto-prepends locale and shopId to URLs
 * - Navigate programmatically with type safety
 * - Get current path without locale/shopId prefix
 * - Build URLs for use in components
 * - Go back with history management
 */

'use client';

import { useCallback, useMemo } from 'react';

import { useParams } from 'next/navigation';

import { useRouter, usePathname } from '@/lib/i18n/navigation';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Navigation options for navigate function
 */
export interface NavigateOptions {
  /** Replace current history entry instead of pushing */
  replace?: boolean;
  /** Scroll to top after navigation */
  scroll?: boolean;
}

/**
 * Return type for useNavigation hook
 */
export interface UseNavigationReturn {
  /**
   * Navigate to a path with automatic locale/shopId prefixing
   * @param path - The path to navigate to (e.g., '/dashboard', '/inventory/items')
   * @param options - Navigation options
   */
  navigate: (path: string, options?: NavigateOptions) => void;

  /**
   * Go back in browser history
   * Falls back to dashboard if no history
   */
  goBack: () => void;

  /**
   * Switch to a different shop
   * @param shopId - The shop ID to switch to
   * @param path - Optional path to navigate to after switching (defaults to dashboard)
   */
  goToShop: (shopId: string, path?: string) => void;

  /**
   * Build a full URL path with locale and shopId
   * @param path - The path to build (e.g., '/dashboard')
   * @returns Full path including locale and shopId
   */
  buildUrl: (path: string) => string;

  /**
   * Current pathname without locale prefix
   * Note: This is the path as returned by next-intl's usePathname,
   * which already strips the locale prefix
   */
  currentPath: string;

  /**
   * Current shop ID from URL params
   */
  shopId: string | undefined;

  /**
   * Current locale from URL params
   */
  locale: string | undefined;

  /**
   * Check if a path is currently active
   * @param path - The path to check
   * @param exact - Whether to match exactly or allow nested routes
   */
  isActive: (path: string, exact?: boolean) => boolean;

  /**
   * Prefetch a path for faster navigation
   * @param path - The path to prefetch
   */
  prefetch: (path: string) => void;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Navigation hook with locale and shop context awareness
 *
 * @example
 * const { navigate, goBack, buildUrl, currentPath } = useNavigation();
 *
 * // Navigate to a page
 * navigate('/inventory/items');
 *
 * // Go back to previous page
 * goBack();
 *
 * // Switch shops
 * goToShop('new-shop-id');
 *
 * // Build a URL for a link
 * const url = buildUrl('/customers'); // Returns '/{locale}/{shopId}/customers'
 *
 * // Check if route is active
 * const isInventoryActive = isActive('/inventory', false); // true for /inventory/*
 */
export function useNavigation(): UseNavigationReturn {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  // Extract locale and shopId from params
  const locale = params?.locale as string | undefined;
  const shopId = params?.shopId as string | undefined;

  /**
   * Build a full URL with locale and shopId prefix
   */
  const buildUrl = useCallback(
    (path: string): string => {
      // Ensure path starts with /
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;

      // If we have a shopId, include it in the path
      // The locale is handled by next-intl's router automatically
      if (shopId) {
        return `/${shopId}${normalizedPath}`;
      }

      return normalizedPath;
    },
    [shopId]
  );

  /**
   * Navigate to a path
   */
  const navigate = useCallback(
    (path: string, options: NavigateOptions = {}): void => {
      const { replace = false, scroll = true } = options;

      const fullPath = buildUrl(path);

      if (replace) {
        router.replace(fullPath, { scroll });
      } else {
        router.push(fullPath, { scroll });
      }
    },
    [router, buildUrl]
  );

  /**
   * Go back in history or to dashboard
   */
  const goBack = useCallback((): void => {
    // Check if we have history to go back to
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      // Fallback to dashboard
      navigate('/dashboard');
    }
  }, [router, navigate]);

  /**
   * Switch to a different shop
   */
  const goToShop = useCallback(
    (newShopId: string, path: string = '/dashboard'): void => {
      // Ensure path starts with /
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;

      // Navigate to the new shop's path
      router.push(`/${newShopId}${normalizedPath}`);
    },
    [router]
  );

  /**
   * Check if a path is currently active
   */
  const isActive = useCallback(
    (path: string, exact: boolean = true): boolean => {
      if (!pathname) {
        return false;
      }

      // Remove shopId prefix from current pathname for comparison
      let currentPathWithoutShop = pathname;
      if (shopId && pathname.startsWith(`/${shopId}`)) {
        currentPathWithoutShop = pathname.substring(shopId.length + 1) || '/';
      }

      if (exact) {
        return currentPathWithoutShop === path;
      }

      // For non-exact matching, check if current path starts with the given path
      return currentPathWithoutShop.startsWith(path);
    },
    [pathname, shopId]
  );

  /**
   * Prefetch a path for faster navigation
   */
  const prefetch = useCallback(
    (path: string): void => {
      const fullPath = buildUrl(path);
      router.prefetch(fullPath);
    },
    [router, buildUrl]
  );

  /**
   * Get current path without locale/shopId prefix
   */
  const currentPath = useMemo((): string => {
    if (!pathname) {
      return '/';
    }

    // Remove shopId prefix if present
    if (shopId && pathname.startsWith(`/${shopId}`)) {
      return pathname.substring(shopId.length + 1) || '/';
    }

    return pathname;
  }, [pathname, shopId]);

  return {
    navigate,
    goBack,
    goToShop,
    buildUrl,
    currentPath,
    shopId,
    locale,
    isActive,
    prefetch,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Parse a full URL path to extract locale, shopId, and path components
 */
export function parseNavigationPath(fullPath: string): {
  locale: string | null;
  shopId: string | null;
  path: string;
} {
  const segments = fullPath.split('/').filter(Boolean);

  // Assuming URL structure: /{locale}/{shopId}/...path
  // Locale is always first, shopId is second

  const locale = segments[0] ?? null;
  const shopId = segments[1] ?? null;
  const path = '/' + segments.slice(2).join('/');

  return {
    locale,
    shopId,
    path: path || '/',
  };
}

/**
 * Join path segments safely
 */
export function joinPath(...segments: (string | undefined | null)[]): string {
  return (
    '/' +
    segments
      .filter(Boolean)
      .map((s) => (s as string).replace(/^\/+|\/+$/g, ''))
      .join('/')
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useNavigation;
