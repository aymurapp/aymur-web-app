/**
 * useTheme Hook
 * Provides theme management with system preference detection and persistence
 *
 * Features:
 * - Get/set theme preference (light/dark/system)
 * - Detect and react to system preference changes
 * - Persist to localStorage via uiStore
 * - Smooth 200ms transition on toggle
 * - Integration with Ant Design ConfigProvider
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useUIStore, type Theme } from '@/stores/uiStore';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * CSS transition duration for theme changes (ms)
 */
const THEME_TRANSITION_DURATION = 200;

/**
 * CSS class applied to document during theme transition
 */
const THEME_TRANSITION_CLASS = 'theme-transitioning';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Resolved theme value (never 'system')
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Return type for useTheme hook
 */
export interface UseThemeReturn {
  /**
   * Current theme setting (may be 'system')
   */
  theme: Theme;

  /**
   * Resolved theme value - actual theme being displayed
   * When theme is 'system', this reflects the system preference
   */
  resolvedTheme: ResolvedTheme;

  /**
   * Whether dark mode is currently active
   */
  isDark: boolean;

  /**
   * Whether light mode is currently active
   */
  isLight: boolean;

  /**
   * Whether theme is set to follow system preference
   */
  isSystem: boolean;

  /**
   * System's preferred color scheme
   */
  systemPreference: ResolvedTheme;

  /**
   * Set the theme preference
   * @param theme - The theme to set ('light', 'dark', or 'system')
   */
  setTheme: (theme: Theme) => void;

  /**
   * Toggle between light and dark mode
   * If currently on 'system', switches to the opposite of system preference
   */
  toggleTheme: () => void;

  /**
   * Reset theme to system preference
   */
  resetToSystem: () => void;

  /**
   * Whether the component has mounted (for hydration safety)
   */
  mounted: boolean;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get the system's preferred color scheme
 * @returns 'dark' if system prefers dark mode, 'light' otherwise
 */
function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply theme transition styles to the document
 * This enables smooth color transitions when switching themes
 */
function applyThemeTransition(): void {
  if (typeof document === 'undefined') {
    return;
  }

  const style = document.createElement('style');
  style.id = 'theme-transition-style';
  style.textContent = `
    .${THEME_TRANSITION_CLASS} * {
      transition: background-color ${THEME_TRANSITION_DURATION}ms ease-in-out,
                  border-color ${THEME_TRANSITION_DURATION}ms ease-in-out,
                  color ${THEME_TRANSITION_DURATION}ms ease-in-out !important;
    }
  `;

  // Remove existing transition style if present
  const existing = document.getElementById('theme-transition-style');
  if (existing) {
    existing.remove();
  }

  document.head.appendChild(style);
  document.documentElement.classList.add(THEME_TRANSITION_CLASS);

  // Remove transition class after animation completes
  setTimeout(() => {
    document.documentElement.classList.remove(THEME_TRANSITION_CLASS);
  }, THEME_TRANSITION_DURATION);
}

/**
 * Update document classes to reflect current theme
 * @param isDark - Whether dark mode should be active
 */
function updateDocumentTheme(isDark: boolean): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;

  if (isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Theme management hook with system preference detection
 *
 * @example
 * const { theme, resolvedTheme, isDark, setTheme, toggleTheme } = useTheme();
 *
 * // Set theme explicitly
 * setTheme('dark');
 *
 * // Toggle between light and dark
 * toggleTheme();
 *
 * // Use in conditional rendering
 * <Icon name={isDark ? 'sun' : 'moon'} onClick={toggleTheme} />
 */
export function useTheme(): UseThemeReturn {
  const theme = useUIStore((state) => state.theme);
  const setThemeStore = useUIStore((state) => state.setTheme);

  const [mounted, setMounted] = useState(false);
  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>('light');

  // Initialize and listen for system preference changes
  useEffect(() => {
    setMounted(true);

    // Get initial system preference
    setSystemPreference(getSystemPreference());

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (event: MediaQueryListEvent): void => {
      setSystemPreference(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Calculate resolved theme
  const resolvedTheme = useMemo((): ResolvedTheme => {
    if (theme === 'system') {
      return systemPreference;
    }
    return theme;
  }, [theme, systemPreference]);

  // Update document when theme changes
  useEffect(() => {
    if (mounted) {
      updateDocumentTheme(resolvedTheme === 'dark');
    }
  }, [resolvedTheme, mounted]);

  // Convenience booleans
  const isDark = resolvedTheme === 'dark';
  const isLight = resolvedTheme === 'light';
  const isSystem = theme === 'system';

  /**
   * Set theme with transition animation
   */
  const setTheme = useCallback(
    (newTheme: Theme): void => {
      applyThemeTransition();
      setThemeStore(newTheme);
    },
    [setThemeStore]
  );

  /**
   * Toggle between light and dark
   */
  const toggleTheme = useCallback((): void => {
    applyThemeTransition();
    // If on system, switch to opposite of current resolved theme
    // Otherwise, just flip between light and dark
    const newTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setThemeStore(newTheme);
  }, [resolvedTheme, setThemeStore]);

  /**
   * Reset to system preference
   */
  const resetToSystem = useCallback((): void => {
    applyThemeTransition();
    setThemeStore('system');
  }, [setThemeStore]);

  return {
    theme,
    resolvedTheme,
    isDark,
    isLight,
    isSystem,
    systemPreference,
    setTheme,
    toggleTheme,
    resetToSystem,
    mounted,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useTheme;
