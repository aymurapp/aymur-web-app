import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './stories/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary - Gold palette for jewelry brand
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)', // Main gold
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
          DEFAULT: 'var(--primary-500)',
        },
        // Neutral - Warm grays
        neutral: {
          50: 'var(--neutral-50)',
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          300: 'var(--neutral-300)',
          400: 'var(--neutral-400)',
          500: 'var(--neutral-500)',
          600: 'var(--neutral-600)',
          700: 'var(--neutral-700)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
          950: 'var(--neutral-950)',
        },
        // Accent - Deep burgundy/wine for luxury feel
        accent: {
          50: 'var(--accent-50)',
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)', // Main burgundy
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
          800: 'var(--accent-800)',
          900: 'var(--accent-900)',
          DEFAULT: 'var(--accent-500)',
        },
        // Semantic colors
        success: {
          50: 'var(--success-50)',
          100: 'var(--success-100)',
          500: 'var(--success-500)',
          600: 'var(--success-600)',
          700: 'var(--success-700)',
          DEFAULT: 'var(--success-500)',
        },
        warning: {
          50: 'var(--warning-50)',
          100: 'var(--warning-100)',
          500: 'var(--warning-500)',
          600: 'var(--warning-600)',
          700: 'var(--warning-700)',
          DEFAULT: 'var(--warning-500)',
        },
        error: {
          50: 'var(--error-50)',
          100: 'var(--error-100)',
          500: 'var(--error-500)',
          600: 'var(--error-600)',
          700: 'var(--error-700)',
          DEFAULT: 'var(--error-500)',
        },
        // Background and foreground
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Surface colors for cards, modals, etc.
        surface: {
          DEFAULT: 'var(--surface)',
          elevated: 'var(--surface-elevated)',
          muted: 'var(--surface-muted)',
        },
        // Border colors
        border: {
          DEFAULT: 'var(--border)',
          muted: 'var(--border-muted)',
        },
        // Input colors
        input: {
          DEFAULT: 'var(--input)',
          focus: 'var(--input-focus)',
        },
        // Ring (focus ring)
        ring: 'var(--ring)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'Plus Jakarta Sans',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Custom scale for jewelry/luxury feel
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        xs: ['0.75rem', { lineHeight: '1rem' }], // 12px
        sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
        base: ['1rem', { lineHeight: '1.5rem' }], // 16px
        lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
        xl: ['1.25rem', { lineHeight: '1.75rem' }], // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
        '5xl': ['3rem', { lineHeight: '1' }], // 48px
      },
      spacing: {
        // Extended spacing for jewelry product grids
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      borderRadius: {
        // Custom border radius for softer jewelry aesthetic
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        // Luxury shadows with gold tint
        'gold-sm': '0 1px 2px 0 rgba(245, 158, 11, 0.05)',
        gold: '0 1px 3px 0 rgba(245, 158, 11, 0.1), 0 1px 2px -1px rgba(245, 158, 11, 0.1)',
        'gold-md': '0 4px 6px -1px rgba(245, 158, 11, 0.1), 0 2px 4px -2px rgba(245, 158, 11, 0.1)',
        'gold-lg':
          '0 10px 15px -3px rgba(245, 158, 11, 0.1), 0 4px 6px -4px rgba(245, 158, 11, 0.1)',
        'gold-xl':
          '0 20px 25px -5px rgba(245, 158, 11, 0.1), 0 8px 10px -6px rgba(245, 158, 11, 0.1)',
        // Elevated shadows for cards
        elevated: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'elevated-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        // Custom animations
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-in',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionDuration: {
        '400': '400ms',
      },
      // Z-index scale for layering
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [],
};

export default config;
