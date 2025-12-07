/**
 * Application Configuration Constants
 * Centralized configuration values for the Aymur Platform
 */

// =============================================================================
// APPLICATION INFORMATION
// =============================================================================

/**
 * Application metadata
 */
export const APP_CONFIG = {
  name: 'Aymur',
  fullName: 'Aymur Platform',
  version: '0.1.0',
  description: 'B2B SaaS Multi-tenant Jewelry Business Management System',
  company: 'Aymur',
  supportEmail: 'support@aymur.io',
  websiteUrl: 'https://aymur.io',
} as const;

// =============================================================================
// LOCALE & INTERNATIONALIZATION
// =============================================================================

/**
 * Supported locales
 */
export const LOCALES = {
  EN: 'en',
  AR: 'ar',
  KU: 'ku',
} as const;

export type Locale = (typeof LOCALES)[keyof typeof LOCALES];

/**
 * Default locale
 */
export const DEFAULT_LOCALE: Locale = LOCALES.EN;

/**
 * RTL locales
 */
export const RTL_LOCALES: Locale[] = [LOCALES.AR, LOCALES.KU];

/**
 * Locale labels for display
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  [LOCALES.EN]: 'English',
  [LOCALES.AR]: 'العربية',
  [LOCALES.KU]: 'کوردی',
};

// =============================================================================
// CURRENCY CONFIGURATION
// =============================================================================

/**
 * Supported currencies
 */
export const CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  IQD: 'IQD',
  AED: 'AED',
  GBP: 'GBP',
  TRY: 'TRY',
} as const;

export type Currency = (typeof CURRENCIES)[keyof typeof CURRENCIES];

/**
 * Default currency
 */
export const DEFAULT_CURRENCY: Currency = CURRENCIES.USD;

/**
 * Currency symbols
 */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  [CURRENCIES.USD]: '$',
  [CURRENCIES.EUR]: '€',
  [CURRENCIES.IQD]: 'IQD',
  [CURRENCIES.AED]: 'AED',
  [CURRENCIES.GBP]: '£',
  [CURRENCIES.TRY]: '₺',
};

/**
 * Currency labels for display
 */
export const CURRENCY_LABELS: Record<Currency, string> = {
  [CURRENCIES.USD]: 'US Dollar',
  [CURRENCIES.EUR]: 'Euro',
  [CURRENCIES.IQD]: 'Iraqi Dinar',
  [CURRENCIES.AED]: 'UAE Dirham',
  [CURRENCIES.GBP]: 'British Pound',
  [CURRENCIES.TRY]: 'Turkish Lira',
};

// =============================================================================
// TIMEZONE CONFIGURATION
// =============================================================================

/**
 * Common timezones for the target regions
 */
export const TIMEZONES = {
  UTC: 'UTC',
  BAGHDAD: 'Asia/Baghdad',
  DUBAI: 'Asia/Dubai',
  ISTANBUL: 'Europe/Istanbul',
  LONDON: 'Europe/London',
  NEW_YORK: 'America/New_York',
} as const;

export type Timezone = (typeof TIMEZONES)[keyof typeof TIMEZONES];

/**
 * Default timezone
 */
export const DEFAULT_TIMEZONE: Timezone = TIMEZONES.UTC;

/**
 * Timezone labels for display
 */
export const TIMEZONE_LABELS: Record<Timezone, string> = {
  [TIMEZONES.UTC]: 'UTC (Coordinated Universal Time)',
  [TIMEZONES.BAGHDAD]: 'Baghdad (GMT+3)',
  [TIMEZONES.DUBAI]: 'Dubai (GMT+4)',
  [TIMEZONES.ISTANBUL]: 'Istanbul (GMT+3)',
  [TIMEZONES.LONDON]: 'London (GMT/BST)',
  [TIMEZONES.NEW_YORK]: 'New York (EST/EDT)',
};

// =============================================================================
// PAGINATION DEFAULTS
// =============================================================================

/**
 * Default pagination settings
 */
export const PAGINATION = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100] as const,
  maxPageSize: 100,
} as const;

// =============================================================================
// FILE UPLOAD CONFIGURATION
// =============================================================================

/**
 * File upload limits and allowed types
 */
export const FILE_UPLOAD = {
  maxSizeMB: 10,
  maxSizeBytes: 10 * 1024 * 1024, // 10MB

  // Image upload settings
  image: {
    maxSizeMB: 5,
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const,
  },

  // Document upload settings
  document: {
    maxSizeMB: 10,
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ] as const,
    allowedExtensions: ['.pdf', '.doc', '.docx'] as const,
  },

  // Certificate upload settings (for jewelry certifications)
  certificate: {
    maxSizeMB: 5,
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'] as const,
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'] as const,
  },
} as const;

// =============================================================================
// JEWELRY SPECIFIC CONFIGURATION
// =============================================================================

/**
 * Standard metal karat values with fineness (parts per thousand)
 */
export const METAL_KARATS = {
  K24: { karat: 24, fineness: 999, label: '24K (999)' },
  K23: { karat: 23, fineness: 958, label: '23K (958)' },
  K22: { karat: 22, fineness: 916, label: '22K (916)' },
  K21: { karat: 21, fineness: 875, label: '21K (875)' },
  K18: { karat: 18, fineness: 750, label: '18K (750)' },
  K14: { karat: 14, fineness: 585, label: '14K (585)' },
  K10: { karat: 10, fineness: 417, label: '10K (417)' },
  K9: { karat: 9, fineness: 375, label: '9K (375)' },
} as const;

/**
 * Standard ring sizes (US sizing)
 */
export const RING_SIZES = [
  '3',
  '3.5',
  '4',
  '4.5',
  '5',
  '5.5',
  '6',
  '6.5',
  '7',
  '7.5',
  '8',
  '8.5',
  '9',
  '9.5',
  '10',
  '10.5',
  '11',
  '11.5',
  '12',
  '12.5',
  '13',
] as const;

/**
 * Standard chain lengths (in inches)
 */
export const CHAIN_LENGTHS = [
  '14',
  '16',
  '18',
  '20',
  '22',
  '24',
  '26',
  '28',
  '30',
  '32',
  '36',
] as const;

/**
 * Standard bracelet sizes (in inches)
 */
export const BRACELET_SIZES = ['6', '6.5', '7', '7.5', '8', '8.5', '9'] as const;

// =============================================================================
// UI CONFIGURATION
// =============================================================================

/**
 * Theme configuration
 */
export const THEME = {
  defaultMode: 'light' as const,
  modes: ['light', 'dark'] as const,

  // Gold color palette (primary brand colors)
  colors: {
    primary: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B', // Primary
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
  },
} as const;

/**
 * Sidebar configuration
 */
export const SIDEBAR = {
  collapsedWidth: 80,
  expandedWidth: 280,
  mobileBreakpoint: 768,
} as const;

/**
 * Toast notification durations (in milliseconds)
 */
export const TOAST_DURATION = {
  short: 3000,
  medium: 5000,
  long: 8000,
} as const;

// =============================================================================
// API CONFIGURATION
// =============================================================================

/**
 * API and request configuration
 */
export const API_CONFIG = {
  // Request timeout in milliseconds
  timeout: 30000,

  // Retry configuration
  retryCount: 3,
  retryDelay: 1000,

  // Rate limiting (requests per minute)
  rateLimit: 100,
} as const;

/**
 * TanStack Query configuration
 */
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  retryCount: 3,
  refetchOnWindowFocus: true,
} as const;

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

/**
 * Security settings
 */
export const SECURITY = {
  // Session timeout in milliseconds (30 minutes)
  sessionTimeout: 30 * 60 * 1000,

  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: false,
  },

  // Rate limiting for auth
  auth: {
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },
} as const;

// =============================================================================
// SUBSCRIPTION PLAN CONFIGURATION
// =============================================================================

/**
 * Subscription plan names
 */
export const PLAN_NAMES = {
  FREE: 'free',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

export type PlanName = (typeof PLAN_NAMES)[keyof typeof PLAN_NAMES];

/**
 * Plan feature limits (default values)
 */
export const PLAN_LIMITS = {
  [PLAN_NAMES.FREE]: {
    maxShops: 1,
    maxStaffPerShop: 2,
    storageLimitMB: 100,
    aiCreditsMonthly: 0,
  },
  [PLAN_NAMES.STARTER]: {
    maxShops: 1,
    maxStaffPerShop: 5,
    storageLimitMB: 1024, // 1GB
    aiCreditsMonthly: 100,
  },
  [PLAN_NAMES.PROFESSIONAL]: {
    maxShops: 3,
    maxStaffPerShop: 15,
    storageLimitMB: 5120, // 5GB
    aiCreditsMonthly: 500,
  },
  [PLAN_NAMES.ENTERPRISE]: {
    maxShops: 10,
    maxStaffPerShop: 50,
    storageLimitMB: 51200, // 50GB
    aiCreditsMonthly: 2000,
  },
} as const;

// =============================================================================
// DATE FORMAT PATTERNS
// =============================================================================

/**
 * Date format patterns for date-fns
 */
export const DATE_FORMATS = {
  short: 'MM/dd/yyyy',
  long: 'MMMM d, yyyy',
  withTime: 'MM/dd/yyyy HH:mm',
  timeOnly: 'HH:mm',
  iso: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  display: 'PPP', // locale-aware
} as const;

// =============================================================================
// VALIDATION LIMITS
// =============================================================================

/**
 * Field length limits for validation
 */
export const FIELD_LIMITS = {
  name: {
    min: 2,
    max: 100,
  },
  email: {
    max: 254,
  },
  phone: {
    min: 7,
    max: 15,
  },
  description: {
    max: 1000,
  },
  notes: {
    max: 2000,
  },
  address: {
    max: 500,
  },
  barcode: {
    max: 50,
  },
  sku: {
    max: 50,
  },
} as const;
