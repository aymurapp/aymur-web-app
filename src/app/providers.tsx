'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, App as AntdApp, theme } from 'antd';

import { QueryProvider } from '@/lib/query/provider';
import { antdTheme, antdDarkTheme } from '@/styles/antd-theme';

/**
 * Props for the Providers component
 */
interface ProvidersProps {
  children: ReactNode;
}

/**
 * Application Providers
 *
 * Wraps the application with necessary providers:
 * - AntdRegistry: Ensures proper SSR hydration for Ant Design styles
 * - ConfigProvider: Applies the gold luxury theme to all Ant Design components
 * - AntdApp: Provides static method contexts (message, notification, modal)
 *
 * The theme automatically detects and responds to system color scheme preferences.
 */
export function Providers({ children }: ProvidersProps): React.JSX.Element {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Detect system color scheme preference
  useEffect(() => {
    setMounted(true);

    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent): void => {
      setIsDarkMode(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Select the appropriate theme based on color scheme
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
