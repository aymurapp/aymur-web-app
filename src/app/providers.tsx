'use client';

import { type ReactNode, useEffect, useState, useCallback } from 'react';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, App as AntdApp, theme } from 'antd';

import { QueryProvider } from '@/lib/query/provider';
import { useUIStore, type Theme } from '@/stores/uiStore';
import { antdTheme, antdDarkTheme } from '@/styles/antd-theme';

/**
 * Props for the Providers component
 */
interface ProvidersProps {
  children: ReactNode;
}

/**
 * Resolves the actual dark mode state based on theme preference
 * @param themePreference - The theme preference from the store ('light' | 'dark' | 'system')
 * @param systemPrefersDark - Whether the system prefers dark mode
 * @returns Whether dark mode should be active
 */
function resolveIsDark(themePreference: Theme, systemPrefersDark: boolean): boolean {
  if (themePreference === 'system') {
    return systemPrefersDark;
  }
  return themePreference === 'dark';
}

/**
 * Application Providers
 *
 * Wraps the application with necessary providers:
 * - AntdRegistry: Ensures proper SSR hydration for Ant Design styles
 * - ConfigProvider: Applies the gold luxury theme to all Ant Design components
 * - AntdApp: Provides static method contexts (message, notification, modal)
 * - Theme synchronization: Syncs uiStore theme with both Ant Design and Tailwind
 *
 * The theme is controlled by the uiStore and can be set to 'light', 'dark', or 'system'.
 * When set to 'system', it automatically follows the OS preference.
 */
export function Providers({ children }: ProvidersProps): React.JSX.Element {
  const themePreference = useUIStore((state) => state.theme);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Apply dark class to HTML element and sync themes
  const applyTheme = useCallback((isDark: boolean) => {
    const htmlElement = document.documentElement;
    if (isDark) {
      htmlElement.classList.add('dark');
      htmlElement.style.colorScheme = 'dark';
    } else {
      htmlElement.classList.remove('dark');
      htmlElement.style.colorScheme = 'light';
    }
  }, []);

  // Initialize and listen to system color scheme preference
  useEffect(() => {
    setMounted(true);

    // Check initial system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);

    // Apply initial theme
    const initialIsDark = resolveIsDark(themePreference, mediaQuery.matches);
    applyTheme(initialIsDark);

    // Listen for system preference changes
    const handleChange = (event: MediaQueryListEvent): void => {
      setSystemPrefersDark(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [applyTheme, themePreference]);

  // Sync theme when preference or system preference changes
  useEffect(() => {
    if (mounted) {
      const isDark = resolveIsDark(themePreference, systemPrefersDark);
      applyTheme(isDark);
    }
  }, [themePreference, systemPrefersDark, mounted, applyTheme]);

  // Resolve the actual dark mode state
  const isDarkMode = resolveIsDark(themePreference, systemPrefersDark);

  // Select the appropriate theme based on resolved dark mode
  const currentTheme = isDarkMode ? antdDarkTheme : antdTheme;

  // Add Ant Design's algorithm for dark mode
  const themeWithAlgorithm = {
    ...currentTheme,
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
  };

  // Prevent hydration mismatch by not rendering until mounted
  // This ensures server and client render the same initial state
  if (!mounted) {
    return (
      <AntdRegistry>
        <ConfigProvider theme={antdTheme}>
          <AntdApp>
            <QueryProvider>{children}</QueryProvider>
          </AntdApp>
        </ConfigProvider>
      </AntdRegistry>
    );
  }

  return (
    <AntdRegistry>
      <ConfigProvider theme={themeWithAlgorithm}>
        <AntdApp>
          <QueryProvider>{children}</QueryProvider>
        </AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  );
}

/**
 * Theme provider hook for accessing Ant Design's App instance
 *
 * Use this to access static methods like message, notification, and modal
 * with proper theming support.
 *
 * @example
 * ```tsx
 * import { App } from 'antd';
 *
 * function MyComponent() {
 *   const { message, notification, modal } = App.useApp();
 *
 *   const showMessage = () => {
 *     message.success('Operation completed successfully!');
 *   };
 *
 *   return <button onClick={showMessage}>Click me</button>;
 * }
 * ```
 */
export { App as AntdApp } from 'antd';
