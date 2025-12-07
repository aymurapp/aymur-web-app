/**
 * Library Index
 * Central export for utilities, hooks, and services
 *
 * Note: We use selective re-exports to avoid duplicate identifier conflicts
 * when the same type names exist in multiple modules. Import directly from
 * submodules when needed:
 * - Types: import from './types'
 * - Constants: import from './constants'
 * - Schemas: import from './utils/schemas'
 */

// Re-export hooks (primary source for runtime functionality)
export * from './hooks';

// Re-export query keys
export * from './query';

// Types (import directly from ./types when needed to avoid conflicts)
// export * from './types';

// Constants - DO NOT re-export here due to type conflicts with hooks
// Import from '@/lib/constants' directly when needed
// export * from './constants';

// Utils - selectively export to avoid conflicts with hook types
export {
  cn,
  formatCurrency,
  formatWeight,
  formatDate,
  formatDateTime,
  formatPhone,
  formatPercentage,
  formatNumber,
  formatDecimal,
  formatFileSize,
  formatBarcode,
  truncateText,
  formatMetalPurity,
} from './utils';
