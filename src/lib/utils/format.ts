/**
 * Formatting Utilities
 * Pure helper functions for data transformation and display formatting
 */

import { formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Formats a number as currency with proper locale support
 * @param amount - The numeric amount to format
 * @param currency - ISO 4217 currency code (e.g., 'USD', 'EUR', 'IQD')
 * @param locale - Optional locale string (defaults to 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string, locale: string = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported currencies
    return `${currency} ${formatNumber(amount, locale)}`;
  }
}

/**
 * Formats weight in grams with proper locale support
 * Automatically handles conversion to kg for larger weights
 * @param grams - Weight in grams
 * @param locale - Optional locale string (defaults to 'en-US')
 * @returns Formatted weight string with unit
 */
export function formatWeight(grams: number, locale: string = 'en-US'): string {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });

  if (grams >= 1000) {
    return `${formatter.format(grams / 1000)} kg`;
  }
  return `${formatter.format(grams)} g`;
}

/**
 * Formats a date with various display options
 * @param date - Date object or ISO date string
 * @param locale - Optional locale string (defaults to 'en-US')
 * @param formatType - Display format: 'short', 'long', or 'relative'
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  locale: string = 'en-US',
  formatType: 'short' | 'long' | 'relative' = 'short'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  switch (formatType) {
    case 'relative':
      return formatDistanceToNow(dateObj, { addSuffix: true });

    case 'long':
      // Use Intl for locale-aware long format
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(dateObj);

    case 'short':
    default:
      // Use Intl for locale-aware short format
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(dateObj);
  }
}

/**
 * Formats a date with time
 * @param date - Date object or ISO date string
 * @param locale - Optional locale string (defaults to 'en-US')
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string, locale: string = 'en-US'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Formats a phone number for display
 * Handles various input formats and normalizes them
 * @param phone - Raw phone number string
 * @returns Formatted phone number
 */
export function formatPhone(phone: string): string {
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // If starts with +, it's international format
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1);

    // Handle common country codes
    if (digits.startsWith('1') && digits.length === 11) {
      // US/Canada format: +1 (XXX) XXX-XXXX
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    if (digits.startsWith('964') && digits.length >= 12) {
      // Iraq format: +964 XXX XXX XXXX
      return `+964 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    }

    // Generic international format: group in threes after country code
    if (digits.length > 3) {
      const countryCode = digits.slice(0, digits.length > 10 ? 3 : 2);
      const rest = digits.slice(countryCode.length);
      const groups = rest.match(/.{1,3}/g) ?? [];
      return `+${countryCode} ${groups.join(' ')}`;
    }

    return cleaned;
  }

  // Local number without country code
  if (cleaned.length === 10) {
    // US-style: (XXX) XXX-XXXX
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    // Many countries use 0 prefix for local calls
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  // Return as-is for other formats
  return phone;
}

/**
 * Formats a decimal number as a percentage
 * @param value - Decimal value (e.g., 0.15 for 15%)
 * @param decimals - Number of decimal places (defaults to 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formats a number with locale-aware thousand separators
 * @param value - Number to format
 * @param locale - Optional locale string (defaults to 'en-US')
 * @returns Formatted number string
 */
export function formatNumber(value: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Formats a number with specific decimal places
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @param locale - Optional locale string (defaults to 'en-US')
 * @returns Formatted number string
 */
export function formatDecimal(value: number, decimals: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats a file size in bytes to human-readable format
 * @param bytes - Size in bytes
 * @param locale - Optional locale string (defaults to 'en-US')
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number, locale: string = 'en-US'): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: unitIndex === 0 ? 0 : 2,
  });

  return `${formatter.format(size)} ${units[unitIndex]}`;
}

/**
 * Formats a barcode or SKU for display with spacing
 * @param code - The barcode/SKU string
 * @param groupSize - Size of each group (defaults to 4)
 * @returns Formatted code with spaces
 */
export function formatBarcode(code: string, groupSize: number = 4): string {
  const cleaned = code.replace(/\s/g, '');
  const groups = cleaned.match(new RegExp(`.{1,${groupSize}}`, 'g')) ?? [];
  return groups.join(' ');
}

/**
 * Truncates text to a specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Formats a metal purity for display (e.g., "750" -> "18K (750)")
 * @param purity - Purity in parts per thousand (e.g., 750 for 18K)
 * @returns Formatted purity string
 */
export function formatMetalPurity(purity: number): string {
  const karatMap: Record<number, string> = {
    999: '24K',
    958: '23K',
    916: '22K',
    875: '21K',
    750: '18K',
    585: '14K',
    417: '10K',
    375: '9K',
  };

  const karat = karatMap[purity];
  if (karat) {
    return `${karat} (${purity})`;
  }

  // For non-standard purities, show percentage
  return `${(purity / 10).toFixed(1)}% (${purity})`;
}
