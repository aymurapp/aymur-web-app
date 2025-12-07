/**
 * useSidebar Hook
 * Provides sidebar state management with responsive behavior
 *
 * Features:
 * - Wrapper around uiStore.sidebarCollapsed
 * - Toggle function with animation support
 * - Auto-collapse on mobile breakpoints
 * - Persist preference across sessions
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

import { useUIStore } from '@/stores/uiStore';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Breakpoint for mobile detection (in pixels)
 * Below this width, sidebar auto-collapses
 */
const MOBILE_BREAKPOINT = 768;

/**
 * Breakpoint for tablet detection (in pixels)
 * Between mobile and desktop, may have different behavior
 */
const TABLET_BREAKPOINT = 1024;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Viewport size category
 */
export type ViewportSize = 'mobile' | 'tablet' | 'desktop';

/**
 * Return type for useSidebar hook
 */
export interface UseSidebarReturn {
  /**
   * Whether the sidebar is currently collapsed
   */
  isCollapsed: boolean;

  /**
   * Whether the sidebar is expanded (opposite of collapsed)
   */
  isExpanded: boolean;

  /**
   * Toggle sidebar between collapsed and expanded states
   */
  toggle: () => void;

  /**
   * Collapse the sidebar
   */
  collapse: () => void;

  /**
   * Expand the sidebar
   */
  expand: () => void;

  /**
   * Set sidebar collapsed state directly
   * @param collapsed - Whether sidebar should be collapsed
   */
  setCollapsed: (collapsed: boolean) => void;

  /**
   * Current viewport size category
   */
  viewportSize: ViewportSize;

  /**
   * Whether viewport is mobile size
   */
  isMobile: boolean;

  /**
   * Whether viewport is tablet size
   */
  isTablet: boolean;

  /**
   * Whether viewport is desktop size
   */
  isDesktop: boolean;

  /**
   * Whether the hook has mounted (for hydration safety)
   */
  mounted: boolean;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get viewport size category based on window width
 */
function getViewportSize(): ViewportSize {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const width = window.innerWidth;

  if (width < MOBILE_BREAKPOINT) {
    return 'mobile';
  }

  if (width < TABLET_BREAKPOINT) {
    return 'tablet';
  }

  return 'desktop';
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Sidebar state hook with responsive behavior
 *
 * @example
 * const { isCollapsed, toggle, isMobile } = useSidebar();
 *
 * // Toggle sidebar
 * <Button onClick={toggle}>
 *   {isCollapsed ? 'Expand' : 'Collapse'}
 * </Button>
 *
 * // Responsive sidebar width
 * <aside className={isCollapsed ? 'w-16' : 'w-64'}>
 *   ...
 * </aside>
 *
 * // Mobile-specific behavior
 * {isMobile && !isCollapsed && <Overlay onClick={collapse} />}
 */
export function useSidebar(): UseSidebarReturn {
  const isCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  const [mounted, setMounted] = useState(false);
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');

  // Track mounting and initial viewport size
  useEffect(() => {
    setMounted(true);
    setViewportSize(getViewportSize());
  }, []);

  // Listen for window resize events
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let resizeTimeout: NodeJS.Timeout;

    const handleResize = (): void => {
      // Debounce resize events
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newSize = getViewportSize();
        setViewportSize(newSize);
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Auto-collapse on mobile
  useEffect(() => {
    if (!mounted) {
      return;
    }

    // Collapse sidebar when switching to mobile
    if (viewportSize === 'mobile' && !isCollapsed) {
      setSidebarCollapsed(true);
    }
  }, [viewportSize, mounted, isCollapsed, setSidebarCollapsed]);

  /**
   * Toggle sidebar state
   */
  const toggle = useCallback((): void => {
    toggleSidebar();
  }, [toggleSidebar]);

  /**
   * Collapse the sidebar
   */
  const collapse = useCallback((): void => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  /**
   * Expand the sidebar
   */
  const expand = useCallback((): void => {
    setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

  /**
   * Set collapsed state directly
   */
  const setCollapsed = useCallback(
    (collapsed: boolean): void => {
      setSidebarCollapsed(collapsed);
    },
    [setSidebarCollapsed]
  );

  // Viewport size booleans
  const isMobile = viewportSize === 'mobile';
  const isTablet = viewportSize === 'tablet';
  const isDesktop = viewportSize === 'desktop';

  return {
    isCollapsed,
    isExpanded: !isCollapsed,
    toggle,
    collapse,
    expand,
    setCollapsed,
    viewportSize,
    isMobile,
    isTablet,
    isDesktop,
    mounted,
  };
}

// =============================================================================
// ADDITIONAL HOOKS
// =============================================================================

/**
 * Simplified hook for just collapse state
 * Use when you only need to check if sidebar is collapsed
 *
 * @example
 * const isCollapsed = useIsSidebarCollapsed();
 */
export function useIsSidebarCollapsed(): boolean {
  return useUIStore((state) => state.sidebarCollapsed);
}

/**
 * Hook for sidebar toggle function only
 * Use when you only need to toggle the sidebar
 *
 * @example
 * const toggleSidebar = useSidebarToggle();
 * <Button onClick={toggleSidebar}>Toggle</Button>
 */
export function useSidebarToggle(): () => void {
  return useUIStore((state) => state.toggleSidebar);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useSidebar;

// Export constants for external use
export { MOBILE_BREAKPOINT, TABLET_BREAKPOINT };
