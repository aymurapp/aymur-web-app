import React from 'react';

import type { Preview, Decorator } from '@storybook/react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { NextIntlClientProvider } from 'next-intl';

import { antdTheme as lightTheme, antdDarkTheme as darkTheme } from '../src/styles/antd-theme';

// Import global styles
import '../src/app/globals.css';

/**
 * Mock translations for Storybook
 * In production, these come from next-intl message files
 */
const mockMessages = {
  common: {
    actions: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      add: 'Add',
      remove: 'Remove',
      clear: 'Clear',
      submit: 'Submit',
      loading: 'Loading...',
    },
    messages: {
      noData: 'No data available',
      noResults: 'No results found',
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Operation successful',
    },
  },
};

/**
 * Ant Design Theme Decorator
 *
 * Wraps stories with ConfigProvider for consistent theming.
 * Supports light/dark mode toggle via Storybook toolbar.
 */
const withAntDesign: Decorator = (Story, context) => {
  const isDarkMode = context.globals.theme === 'dark';
  const isRTL = context.globals.direction === 'rtl';

  // Select theme based on dark mode toggle
  const selectedTheme = isDarkMode ? darkTheme : lightTheme;

  // Apply dark mode class to document for Tailwind
  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Apply RTL direction
  React.useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = isRTL ? 'ar' : 'en';
  }, [isRTL]);

  return (
    <ConfigProvider
      theme={{
        ...selectedTheme,
        algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
      direction={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        className={`min-h-screen bg-background text-foreground p-4 ${isDarkMode ? 'dark' : ''}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <Story />
      </div>
    </ConfigProvider>
  );
};

/**
 * Internationalization Decorator
 *
 * Provides next-intl context for components using translations.
 */
const withNextIntl: Decorator = (Story, context) => {
  const locale = context.globals.direction === 'rtl' ? 'ar' : 'en';

  return (
    <NextIntlClientProvider locale={locale} messages={mockMessages}>
      <Story />
    </NextIntlClientProvider>
  );
};

/**
 * Mock Permissions Provider
 *
 * Provides a mock permissions context for permission-aware components.
 */
const MockPermissionsContext = React.createContext({
  can: () => true,
  permissions: [] as string[],
});

const withMockPermissions: Decorator = (Story, context) => {
  // Allow controlling permissions via story parameters
  const hasPermission = context.parameters.permissions?.hasPermission ?? true;

  const mockPermissions = {
    can: (permission: string) => {
      // Check if specific permission is denied in story parameters
      const deniedPermissions = context.parameters.permissions?.denied ?? [];
      if (deniedPermissions.includes(permission)) return false;
      return hasPermission;
    },
    permissions: context.parameters.permissions?.list ?? ['*'],
  };

  return (
    <MockPermissionsContext.Provider value={mockPermissions}>
      <Story />
    </MockPermissionsContext.Provider>
  );
};

// Export the mock context for use in components if needed
export { MockPermissionsContext };

/**
 * Preview Configuration
 */
const preview: Preview = {
  // Global parameters
  parameters: {
    // Disable Storybook's built-in backgrounds addon (we use Ant Design themes)
    backgrounds: {
      disable: true,
    },

    // Actions configuration
    actions: { argTypesRegex: '^on[A-Z].*' },

    // Controls configuration for automatic prop controls
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      sort: 'requiredFirst',
    },

    // Viewport presets for responsive testing
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        mobileLarge: {
          name: 'Mobile Large',
          styles: {
            width: '414px',
            height: '896px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        laptop: {
          name: 'Laptop',
          styles: {
            width: '1280px',
            height: '800px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
        desktopLarge: {
          name: 'Desktop Large',
          styles: {
            width: '1920px',
            height: '1080px',
          },
        },
      },
      defaultViewport: 'desktop',
    },

    // Layout configuration
    layout: 'padded',

    // Documentation options
    docs: {
      toc: true,
    },
  },

  // Global toolbar controls
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Toggle light/dark mode',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light Mode' },
          { value: 'dark', icon: 'moon', title: 'Dark Mode' },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
    direction: {
      name: 'Direction',
      description: 'Toggle LTR/RTL direction',
      defaultValue: 'ltr',
      toolbar: {
        icon: 'transfer',
        items: [
          { value: 'ltr', icon: 'arrowrightalt', title: 'Left to Right (LTR)' },
          { value: 'rtl', icon: 'arrowleftalt', title: 'Right to Left (RTL)' },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },

  // Decorators applied to all stories
  decorators: [withMockPermissions, withNextIntl, withAntDesign],

  // Tags for automatic documentation
  tags: ['autodocs'],
};

export default preview;
