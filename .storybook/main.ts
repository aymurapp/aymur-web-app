import type { StorybookConfig } from '@storybook/nextjs';

/**
 * Storybook Configuration for Aymur Platform
 *
 * Configured for:
 * - Next.js 14+ App Router
 * - Ant Design 5
 * - Tailwind CSS
 * - TypeScript
 */
const config: StorybookConfig = {
  // Story file locations
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],

  // Addons for enhanced functionality
  addons: [
    '@storybook/addon-essentials', // Includes Controls, Actions, Viewport, Backgrounds, etc.
    '@storybook/addon-links',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y', // Accessibility testing
    '@storybook/addon-themes', // Theme switching (dark mode, RTL)
  ],

  // Framework configuration for Next.js
  framework: {
    name: '@storybook/nextjs',
    options: {
      // Next.js App Router support
      nextConfigPath: '../next.config.mjs',
    },
  },

  // Static files directory
  staticDirs: ['../public'],

  // TypeScript configuration
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },

  // Webpack configuration for Ant Design and path aliases
  webpackFinal: async (config) => {
    // Add path alias for @ imports
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname, '../src'),
      };
    }

    return config;
  },

  // Documentation features
  docs: {
    autodocs: 'tag',
  },
};

export default config;
