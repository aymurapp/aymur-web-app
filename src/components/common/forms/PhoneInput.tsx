'use client';

/**
 * PhoneInput Component
 *
 * A reusable international phone number input with country selector and validation.
 * Uses react-international-phone for country detection, formatting, and validation.
 *
 * Features:
 * - Country selector with flags (Twemoji)
 * - Auto-formats phone numbers based on country
 * - Country auto-detection from phone number
 * - E.164 format output (includes country code)
 * - Validation support via isPhoneValid utility
 * - Ant Design styling integration
 * - RTL support
 *
 * @example
 * // Basic usage
 * <PhoneInput
 *   value={phone}
 *   onChange={(phone) => setPhone(phone)}
 *   defaultCountry="sa"
 * />
 *
 * @example
 * // With validation
 * <PhoneInput
 *   value={phone}
 *   onChange={(phone, meta) => {
 *     setPhone(phone);
 *     setIsValid(meta.isValid);
 *   }}
 * />
 *
 * @module components/common/forms/PhoneInput
 */

import React, { useCallback, useState } from 'react';

import {
  defaultCountries,
  FlagImage,
  parseCountry,
  usePhoneInput,
  type CountryIso2,
} from 'react-international-phone';
import 'react-international-phone/style.css';

import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Phone number metadata returned on change
 */
export interface PhoneInputMeta {
  /** The selected country ISO2 code */
  country: CountryIso2;
  /** Whether the phone number is valid */
  isValid: boolean;
  /** The phone number without formatting */
  inputValue: string;
}

/**
 * PhoneInput component props
 */
export interface PhoneInputProps {
  /**
   * Current phone value (E.164 format with country code)
   */
  value?: string;

  /**
   * Callback when phone number changes
   * @param phone - Phone number in E.164 format (e.g., "+966501234567")
   * @param meta - Additional metadata including country and validation
   */
  onChange?: (phone: string, meta: PhoneInputMeta) => void;

  /**
   * Default country ISO2 code
   * @default 'sa' (Saudi Arabia)
   */
  defaultCountry?: CountryIso2;

  /**
   * Placeholder text for the input
   */
  placeholder?: string;

  /**
   * Whether the input is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether the input is read-only
   * @default false
   */
  readOnly?: boolean;

  /**
   * Additional CSS class name for the container
   */
  className?: string;

  /**
   * Input size (matches Ant Design sizes)
   * @default 'middle'
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * Form field status for Ant Design Form integration
   */
  status?: 'error' | 'warning';

  /**
   * Whether to show the country selector
   * @default true
   */
  showCountrySelector?: boolean;

  /**
   * Whether the country selector is disabled (can still change via typing)
   * @default false
   */
  disableCountrySelector?: boolean;

  /**
   * Preferred countries to show at the top of the country list
   */
  preferredCountries?: CountryIso2[];

  /**
   * Callback when input is focused
   */
  onFocus?: () => void;

  /**
   * Callback when input is blurred
   */
  onBlur?: () => void;

  /**
   * Whether to hide the dial code in the input
   * @default false
   */
  hideDialCode?: boolean;

  /**
   * Auto-detect country from phone number
   * @default true
   */
  autoDetectCountry?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Size mappings for Ant Design compatibility
 */
const SIZE_CLASSES = {
  small: 'h-[24px] text-sm',
  middle: 'h-[32px] text-base',
  large: 'h-[40px] text-base',
} as const;

const INPUT_SIZE_CLASSES = {
  small: 'py-0 px-2',
  middle: 'py-1 px-3',
  large: 'py-1.5 px-3',
} as const;

const DROPDOWN_SIZE_CLASSES = {
  small: 'py-0 px-1.5',
  middle: 'py-1 px-2',
  large: 'py-1.5 px-2',
} as const;

/**
 * Default preferred countries for the region
 */
const DEFAULT_PREFERRED_COUNTRIES: CountryIso2[] = ['sa', 'ae', 'eg', 'jo', 'kw', 'bh', 'qa', 'om'];

// =============================================================================
// COMPONENT
// =============================================================================

export function PhoneInput({
  value,
  onChange,
  defaultCountry = 'sa',
  placeholder,
  disabled = false,
  readOnly = false,
  className,
  size = 'middle',
  status,
  showCountrySelector = true,
  disableCountrySelector = false,
  preferredCountries = DEFAULT_PREFERRED_COUNTRIES,
  onFocus,
  onBlur,
  hideDialCode = false,
  autoDetectCountry = true,
}: PhoneInputProps): React.JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Use the phone input hook
  const {
    inputValue,
    phone: _phone, // Phone value available but we use data.phone in onChange
    country,
    setCountry,
    handlePhoneValueChange,
    inputRef,
  } = usePhoneInput({
    defaultCountry,
    value: value || '',
    countries: defaultCountries,
    disableCountryGuess: !autoDetectCountry,
    disableDialCodePrefill: hideDialCode,
    onChange: (data) => {
      // Validate the phone number
      const isValid = data.phone.length > 4 && /^\+\d{7,15}$/.test(data.phone);

      onChange?.(data.phone, {
        country: data.country.iso2,
        isValid,
        inputValue: data.inputValue,
      });
    },
  });

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  // Get status classes
  const getStatusClasses = (): string => {
    if (status === 'error') {
      return 'border-red-500 hover:border-red-400 focus-within:border-red-500 focus-within:ring-red-500/20';
    }
    if (status === 'warning') {
      return 'border-amber-500 hover:border-amber-400 focus-within:border-amber-500 focus-within:ring-amber-500/20';
    }
    return '';
  };

  // Sort countries with preferred at top
  const sortedCountries = React.useMemo(() => {
    const preferred = preferredCountries
      .map((iso2) => defaultCountries.find((c) => parseCountry(c).iso2 === iso2))
      .filter(Boolean) as typeof defaultCountries;

    const others = defaultCountries.filter(
      (c) => !preferredCountries.includes(parseCountry(c).iso2)
    );

    return [...preferred, ...others];
  }, [preferredCountries]);

  return (
    <div
      className={cn(
        // Base container styles
        'phone-input-container flex items-center w-full',
        // Border and background
        'border rounded-lg transition-all duration-200',
        'bg-white dark:bg-stone-900',
        'border-stone-300 dark:border-stone-600',
        // Hover state
        !disabled && 'hover:border-amber-400 dark:hover:border-amber-500',
        // Focus state
        isFocused &&
          !disabled &&
          'border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20 dark:ring-amber-400/20',
        // Disabled state
        disabled && 'opacity-60 cursor-not-allowed bg-stone-50 dark:bg-stone-800',
        // Size
        SIZE_CLASSES[size],
        // Status
        getStatusClasses(),
        className
      )}
    >
      {/* Country Selector */}
      {showCountrySelector && (
        <div className="relative">
          <button
            type="button"
            disabled={disabled || disableCountrySelector}
            onClick={() =>
              !disabled && !disableCountrySelector && setIsDropdownOpen(!isDropdownOpen)
            }
            className={cn(
              'flex items-center gap-1.5 border-e border-stone-200 dark:border-stone-600',
              'hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors rounded-s-lg',
              DROPDOWN_SIZE_CLASSES[size],
              (disabled || disableCountrySelector) && 'cursor-not-allowed'
            )}
          >
            <FlagImage iso2={country.iso2} size="20px" />
            <span className="text-stone-500 dark:text-stone-400 text-xs">+{country.dialCode}</span>
            <svg
              className={cn(
                'w-3 h-3 text-stone-400 transition-transform',
                isDropdownOpen && 'rotate-180'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Country Dropdown */}
          {isDropdownOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />

              {/* Dropdown */}
              <div
                className={cn(
                  'absolute top-full start-0 mt-1 z-50',
                  'w-64 max-h-60 overflow-y-auto',
                  'bg-white dark:bg-stone-800',
                  'border border-stone-200 dark:border-stone-600',
                  'rounded-lg shadow-lg',
                  'py-1'
                )}
              >
                {sortedCountries.map((countryData, index) => {
                  const parsed = parseCountry(countryData);
                  const isPreferred = preferredCountries.includes(parsed.iso2);
                  const isLastPreferred =
                    isPreferred &&
                    !preferredCountries.includes(
                      parseCountry(sortedCountries[index + 1] || countryData).iso2
                    );

                  return (
                    <React.Fragment key={parsed.iso2}>
                      <button
                        type="button"
                        onClick={() => {
                          setCountry(parsed.iso2);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-start',
                          'hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors',
                          country.iso2 === parsed.iso2 && 'bg-amber-50 dark:bg-amber-900/20'
                        )}
                      >
                        <FlagImage iso2={parsed.iso2} size="20px" />
                        <span className="flex-1 text-sm text-stone-900 dark:text-stone-100 truncate">
                          {parsed.name}
                        </span>
                        <span className="text-xs text-stone-500 dark:text-stone-400">
                          +{parsed.dialCode}
                        </span>
                      </button>
                      {isLastPreferred && (
                        <div className="border-b border-stone-200 dark:border-stone-600 my-1" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Phone Input */}
      <input
        ref={inputRef}
        type="tel"
        value={inputValue}
        onChange={handlePhoneValueChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder || 'Enter phone number'}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(
          'flex-1 min-w-0 bg-transparent outline-none',
          'text-stone-900 dark:text-stone-100',
          'placeholder:text-stone-400 dark:placeholder:text-stone-500',
          INPUT_SIZE_CLASSES[size],
          !showCountrySelector && 'rounded-s-lg',
          'rounded-e-lg'
        )}
        dir="ltr"
      />
    </div>
  );
}

// =============================================================================
// VALIDATION UTILITY
// =============================================================================

/**
 * Validates a phone number in E.164 format
 * Basic validation - checks format and length
 *
 * @param phone - Phone number to validate (e.g., "+966501234567")
 * @returns Whether the phone number is valid
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) {
    return false;
  }
  // E.164 format: + followed by 7-15 digits
  return /^\+\d{7,15}$/.test(phone);
}

/**
 * Formats a phone number for display
 * Adds spaces for readability
 *
 * @param phone - Phone number in E.164 format
 * @returns Formatted phone number
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) {
    return '';
  }
  // Remove non-digits except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 4) {
    return cleaned;
  }

  // Format: +XXX XXX XXX XXX
  const parts: string[] = [];
  let remaining = cleaned;

  // Country code (1-3 digits after +)
  const countryMatch = remaining.match(/^\+(\d{1,3})/);
  if (countryMatch) {
    parts.push('+' + countryMatch[1]);
    remaining = remaining.slice(countryMatch[0].length);
  }

  // Rest in groups of 3
  while (remaining.length > 0) {
    parts.push(remaining.slice(0, 3));
    remaining = remaining.slice(3);
  }

  return parts.join(' ');
}

export default PhoneInput;
