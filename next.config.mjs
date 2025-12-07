import createNextIntlPlugin from 'next-intl/plugin';
import bundleAnalyzer from '@next/bundle-analyzer';

/**
 * next-intl plugin configuration
 * Points to the request configuration file for server-side locale handling
 */
const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

/**
 * Bundle analyzer configuration
 * Enable with ANALYZE=true environment variable
 * Run: npm run analyze
 */
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for development
  reactStrictMode: true,

  // Optimize images from external sources if needed
  images: {
    remotePatterns: [
      // Add external image domains here if needed
      // { protocol: 'https', hostname: 'example.com' },
    ],
    // Image optimization settings
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },

  // Experimental features
  experimental: {
    // Enable typed routes for better TypeScript support
    typedRoutes: true,
    // Optimize package imports for tree shaking
    optimizePackageImports: [
      'antd',
      '@ant-design/icons',
      '@ant-design/charts',
      'lucide-react',
      'date-fns',
      '@tanstack/react-query',
    ],
  },

  // Compiler options for production optimization
  compiler: {
    // Remove console logs in production (except error and warn)
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },

  // Webpack configuration for tree shaking verification
  webpack: (config, { isServer }) => {
    // Ensure tree shaking is enabled
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: true,
    };

    // Add bundle analyzer plugin info to build output
    if (process.env.ANALYZE === 'true' && !isServer) {
      console.log('[Bundle Analyzer] Generating client bundle analysis...');
    }

    return config;
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
