/**
 * useMediaQuery Hook
 * Responsive breakpoint detection with SSR safety
 *
 * Features:
 * - Match arbitrary media query strings
 * - SSR-safe (returns false during server render)
 * - Predefined breakpoint hooks based on Tailwind CSS
 * - Real-time updates when viewport changes
 * - Cleanup on unmount
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Tailwind CSS default breakpoints
 * @see https://tailwindcss.com/docs/responsive-design
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Breakpoint key type
 */
export type BreakpointKey = keyof typeof BREAKPOINTS;

/**
 * Options for useMediaQuery hook
 */
export interface UseMediaQueryOptions {
  /** Default value to use during SSR (default: false) */
  defaultValue?: boolean;
  /** Initialize with the actual value on first client render (default: true) */
  initializeWithValue?: boolean;
}

/**
 * Return type for useBreakpoint hook
 */
export interface BreakpointState {
  /** Current breakpoint name */
  breakpoint: BreakpointKey | 'xs';
  /** Whether viewport is smaller than sm (640px) */
  isXs: boolean;
  /** Whether viewport is at least sm (640px) */
  isSm: boolean;
  /** Whether viewport is at least md (768px) */
  isMd: boolean;
  /** Whether viewport is at least lg (1024px) */
  isLg: boolean;
  /** Whether viewport is at least xl (1280px) */
  isXl: boolean;
  /** Whether viewport is at least 2xl (1536px) */
  is2Xl: boolean;
  /** Whether viewport is between sm and md (640px - 767px) */
  isSmOnly: boolean;
  /** Whether viewport is between md and lg (768px - 1023px) */
  isMdOnly: boolean;
  /** Whether viewport is between lg and xl (1024px - 1279px) */
  isLgOnly: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if code is running on the server
 */
const isServer = typeof window === 'undefined';

/**
 * Get the current match state for a media query
 */
function getMediaQueryMatch(query: string): boolean {
  if (isServer) {
    return false;
  }
  return window.matchMedia(query).matches;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook that returns whether a media query matches
 *
 * This hook is SSR-safe and will return false during server-side rendering.
 * On the client, it updates in real-time as the viewport changes.
 *
 * @param query - The media query string to match
 * @param options - Options for SSR behavior
 * @returns Whether the media query matches
 *
 * @example
 * // Basic usage with raw media query
 * const isLargeScreen = useMediaQuery('(min-width: 1024px)');
 *
 * @example
 * // With default value for SSR
 * const isDark = useMediaQuery('(prefers-color-scheme: dark)', {
 *   defaultValue: true, // Assume dark mode on server
 * });
 *
 * @example
 * // Print media query
 * const isPrint = useMediaQuery('print');
 */
export function useMediaQuery(query: string, options: UseMediaQueryOptions = {}): boolean {
  const { defaultValue = false, initializeWithValue = true } = options;

  // Get initial value
  const getInitialValue = useCallback((): boolean => {
    if (isServer) {
      return defaultValue;
    }
    if (initializeWithValue) {
      return getMediaQueryMatch(query);
    }
    return defaultValue;
  }, [query, defaultValue, initializeWithValue]);

  const [matches, setMatches] = useState<boolean>(getInitialValue);

  // Handle media query changes
  useEffect(() => {
    if (isServer) {
      return;
    }

    const mediaQueryList = window.matchMedia(query);

    // Set initial value on client if we didn't initialize with value
    if (!initializeWithValue) {
      setMatches(mediaQueryList.matches);
    }

    // Event handler for media query changes
    const handleChange = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    // Add event listener
    // Use addEventListener for modern browsers, addListener for older ones
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers (Safari < 14)
      mediaQueryList.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers (Safari < 14)
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, [query, initializeWithValue]);

  return matches;
}

/**
 * Hook that returns whether the viewport is mobile-sized (below md breakpoint)
 *
 * Mobile: < 768px
 *
 * @param options - Options for SSR behavior
 * @returns Whether the viewport is mobile-sized
 *
 * @example
 * const isMobile = useMobile();
 *
 * return isMobile ? <MobileNav /> : <DesktopNav />;
 */
export function useMobile(options?: UseMediaQueryOptions): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`, options);
}

/**
 * Hook that returns whether the viewport is tablet-sized (md to lg breakpoint)
 *
 * Tablet: 768px - 1023px
 *
 * @param options - Options for SSR behavior
 * @returns Whether the viewport is tablet-sized
 *
 * @example
 * const isTablet = useTablet();
 *
 * if (isTablet) {
 *   return <TabletLayout />;
 * }
 */
export function useTablet(options?: UseMediaQueryOptions): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
    options
  );
}

/**
 * Hook that returns whether the viewport is desktop-sized (lg and above)
 *
 * Desktop: >= 1024px
 *
 * @param options - Options for SSR behavior
 * @returns Whether the viewport is desktop-sized
 *
 * @example
 * const isDesktop = useDesktop();
 *
 * return (
 *   <div className={isDesktop ? 'grid-cols-3' : 'grid-cols-1'}>
 *     {content}
 *   </div>
 * );
 */
export function useDesktop(options?: UseMediaQueryOptions): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`, options);
}

/**
 * Hook that returns whether the viewport is at least a certain breakpoint
 *
 * @param breakpoint - The minimum breakpoint to match
 * @param options - Options for SSR behavior
 * @returns Whether the viewport is at least the specified breakpoint
 *
 * @example
 * const isAtLeastMd = useMinBreakpoint('md');
 * const isAtLeastXl = useMinBreakpoint('xl');
 */
export function useMinBreakpoint(
  breakpoint: BreakpointKey,
  options?: UseMediaQueryOptions
): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[breakpoint]}px)`, options);
}

/**
 * Hook that returns whether the viewport is below a certain breakpoint
 *
 * @param breakpoint - The maximum breakpoint (exclusive)
 * @param options - Options for SSR behavior
 * @returns Whether the viewport is below the specified breakpoint
 *
 * @example
 * const isBelowLg = useMaxBreakpoint('lg');
 */
export function useMaxBreakpoint(
  breakpoint: BreakpointKey,
  options?: UseMediaQueryOptions
): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS[breakpoint] - 1}px)`, options);
}

/**
 * Hook that returns whether the viewport is between two breakpoints
 *
 * @param minBreakpoint - The minimum breakpoint (inclusive)
 * @param maxBreakpoint - The maximum breakpoint (exclusive)
 * @param options - Options for SSR behavior
 * @returns Whether the viewport is between the specified breakpoints
 *
 * @example
 * const isMdToLg = useBetweenBreakpoints('md', 'lg');
 */
export function useBetweenBreakpoints(
  minBreakpoint: BreakpointKey,
  maxBreakpoint: BreakpointKey,
  options?: UseMediaQueryOptions
): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS[minBreakpoint]}px) and (max-width: ${BREAKPOINTS[maxBreakpoint] - 1}px)`,
    options
  );
}

/**
 * Hook that returns comprehensive breakpoint state
 *
 * Provides detailed information about the current viewport size
 * relative to all Tailwind breakpoints.
 *
 * @param options - Options for SSR behavior
 * @returns Object with breakpoint state information
 *
 * @example
 * const { breakpoint, isMobile, isDesktop, isMdOnly } = useBreakpoint();
 *
 * console.log(`Current breakpoint: ${breakpoint}`);
 *
 * if (isMdOnly) {
 *   return <TabletLayout />;
 * }
 */
export function useBreakpoint(options?: UseMediaQueryOptions): BreakpointState {
  const isSm = useMinBreakpoint('sm', options);
  const isMd = useMinBreakpoint('md', options);
  const isLg = useMinBreakpoint('lg', options);
  const isXl = useMinBreakpoint('xl', options);
  const is2Xl = useMinBreakpoint('2xl', options);

  const breakpointState = useMemo((): BreakpointState => {
    // Determine current breakpoint
    let breakpoint: BreakpointKey | 'xs' = 'xs';
    if (is2Xl) {
      breakpoint = '2xl';
    } else if (isXl) {
      breakpoint = 'xl';
    } else if (isLg) {
      breakpoint = 'lg';
    } else if (isMd) {
      breakpoint = 'md';
    } else if (isSm) {
      breakpoint = 'sm';
    }

    return {
      breakpoint,
      isXs: !isSm,
      isSm,
      isMd,
      isLg,
      isXl,
      is2Xl,
      isSmOnly: isSm && !isMd,
      isMdOnly: isMd && !isLg,
      isLgOnly: isLg && !isXl,
    };
  }, [isSm, isMd, isLg, isXl, is2Xl]);

  return breakpointState;
}

/**
 * Hook that returns whether user prefers reduced motion
 *
 * @param options - Options for SSR behavior
 * @returns Whether the user prefers reduced motion
 *
 * @example
 * const prefersReducedMotion = usePrefersReducedMotion();
 *
 * const animationDuration = prefersReducedMotion ? 0 : 300;
 */
export function usePrefersReducedMotion(options?: UseMediaQueryOptions): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)', options);
}

/**
 * Hook that returns whether user prefers dark color scheme
 *
 * @param options - Options for SSR behavior
 * @returns Whether the user prefers dark color scheme
 *
 * @example
 * const prefersDark = usePrefersDarkMode();
 *
 * useEffect(() => {
 *   setTheme(prefersDark ? 'dark' : 'light');
 * }, [prefersDark]);
 */
export function usePrefersDarkMode(options?: UseMediaQueryOptions): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)', options);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useMediaQuery;
