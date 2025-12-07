'use client';

/**
 * ThemeToggle Component
 *
 * Toggle button for switching between light, dark, and system themes.
 * Uses the uiStore for persisted theme state.
 *
 * Features:
 * - Three-state toggle: light -> dark -> system
 * - Sun/Moon icons for visual feedback
 * - Tooltip showing current mode
 * - Persisted state via zustand
 * - RTL support
 *
 * @module components/layout/ThemeToggle
 */

import React, { useCallback, useEffect, useState } from 'react';

import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';
import { useUIStore, useResolvedTheme, type Theme } from '@/stores/uiStore';

// =============================================================================
// TYPES
// =============================================================================

export interface ThemeToggleProps {
  /** Show tooltip with current mode */
  showTooltip?: boolean;
  /** Button size */
  size?: 'small' | 'middle' | 'large';
  /** Additional CSS class name */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Theme cycle order
 */
const THEME_CYCLE: Theme[] = ['light', 'dark', 'system'];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ThemeToggle Component
 *
 * A button that cycles through light, dark, and system theme modes.
 * The icon displayed reflects the current resolved theme (light or dark).
 *
 * @example
 * // Basic usage
 * <ThemeToggle />
 *
 * @example
 * // With tooltip disabled
 * <ThemeToggle showTooltip={false} />
 *
 * @example
 * // Small size
 * <ThemeToggle size="small" />
 */
export function ThemeToggle({
  showTooltip = true,
  size = 'middle',
  className,
}: ThemeToggleProps): React.JSX.Element {
  const t = useTranslations('settings.appearance');

  // Store state
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const resolvedTheme = useResolvedTheme();

  // Hydration-safe state for icon
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle theme toggle - cycles through light -> dark -> system
  const handleToggle = useCallback(() => {
    const currentIndex = THEME_CYCLE.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    const nextTheme = THEME_CYCLE[nextIndex];
    if (nextTheme) {
      setTheme(nextTheme);
    }
  }, [theme, setTheme]);

  // Get tooltip text based on current theme
  const getTooltipText = (): string => {
    switch (theme) {
      case 'light':
        return t('lightMode');
      case 'dark':
        return t('darkMode');
      case 'system':
        return t('systemDefault');
      default:
        return '';
    }
  };

  // Render appropriate icon based on resolved theme
  // Show sun for light, moon for dark
  const renderIcon = () => {
    // During SSR/hydration, show a neutral icon
    if (!mounted) {
      return <SunOutlined className="text-lg" />;
    }

    // Show current resolved theme's opposite icon (clicking will change to it)
    const isDark = resolvedTheme === 'dark';
    return isDark ? <SunOutlined className="text-lg" /> : <MoonOutlined className="text-lg" />;
  };

  const button = (
    <Button
      type="text"
      size={size}
      onClick={handleToggle}
      icon={renderIcon()}
      className={cn(
        'flex items-center justify-center',
        'text-stone-600 dark:text-stone-300',
        'hover:text-amber-600 dark:hover:text-amber-400',
        'transition-colors',
        className
      )}
      aria-label={getTooltipText()}
    />
  );

  if (showTooltip) {
    return (
      <Tooltip title={getTooltipText()} placement="bottom">
        {button}
      </Tooltip>
    );
  }

  return button;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ThemeToggle;
