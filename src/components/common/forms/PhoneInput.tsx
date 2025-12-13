'use client';

/**
 * PhoneInput Component
 *
 * A reusable international phone number input with country selector and validation.
 * Uses react-international-phone for country detection, formatting, and validation.
 * Uses google-libphonenumber for accurate per-country phone validation.
 * Uses Ant Design Select for the country dropdown.
 *
 * Features:
 * - Country selector with flags (Twemoji) using antd Select
 * - Separated dial code display (non-editable, shown between flag and input)
 * - Auto-formats phone numbers based on country
 * - Country auto-detection from phone number
 * - E.164 format output (includes country code)
 * - Proper validation via google-libphonenumber
 * - Ant Design styling integration
 * - RTL support
 * - Search functionality in country dropdown
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

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Select } from 'antd';
import { PhoneNumberUtil } from 'google-libphonenumber';
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
// PHONE VALIDATION UTILITY
// =============================================================================

const phoneUtil = PhoneNumberUtil.getInstance();

/**
 * Validates a phone number using google-libphonenumber
 * This provides accurate per-country validation
 *
 * @param phone - Phone number to validate (e.g., "+966501234567")
 * @returns Whether the phone number is valid for its country
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone || phone.length < 4) {
    return false;
  }
  try {
    const parsedNumber = phoneUtil.parseAndKeepRawInput(phone);
    return phoneUtil.isValidNumber(parsedNumber);
  } catch {
    return false;
  }
}

// Get ValidationResult enum for checking TOO_LONG
const ValidationResult = PhoneNumberUtil.ValidationResult;

/**
 * Checks if a phone number is too long using libphonenumber's metadata
 * Uses isPossibleNumberWithReason which dynamically checks against country rules
 *
 * @param phone - Full phone number in E.164 format (e.g., "+966501234567")
 * @returns true if the number exceeds the maximum length for its country
 */
function isPhoneTooLong(phone: string): boolean {
  if (!phone || phone.length < 4) {
    return false;
  }
  try {
    const parsed = phoneUtil.parseAndKeepRawInput(phone);
    const reason = phoneUtil.isPossibleNumberWithReason(parsed);
    return reason === ValidationResult.TOO_LONG;
  } catch {
    // If parsing fails, don't block input
    return false;
  }
}

/**
 * Extracts only digits from a string
 */
function extractDigits(str: string): string {
  return str.replace(/\D/g, '');
}

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
   * Callback when input is focused
   */
  onFocus?: () => void;

  /**
   * Callback when input is blurred
   */
  onBlur?: () => void;

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

// =============================================================================
// COUNTRY OPTIONS FOR SELECT
// =============================================================================

interface CountryOption {
  value: string;
  label: string;
  dialCode: string;
  searchText: string;
}

/**
 * Build sorted country options for antd Select
 */
function buildCountryOptions(): CountryOption[] {
  return [...defaultCountries]
    .map((c) => {
      const parsed = parseCountry(c);
      return {
        value: parsed.iso2,
        label: parsed.name,
        dialCode: parsed.dialCode,
        // Pre-compute searchable text for performance
        searchText: `${parsed.name} ${parsed.dialCode} ${parsed.iso2}`.toLowerCase(),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

const COUNTRY_OPTIONS = buildCountryOptions();

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
  onFocus,
  onBlur,
  autoDetectCountry = true,
}: PhoneInputProps): React.JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use the phone input hook with separated dial code
  const { inputValue, country, setCountry, handlePhoneValueChange, inputRef } = usePhoneInput({
    defaultCountry,
    value: value || '',
    countries: defaultCountries,
    disableCountryGuess: !autoDetectCountry,
    forceDialCode: true,
    disableDialCodeAndPrefix: true,
    onChange: (data) => {
      // Validate using google-libphonenumber
      const isValid = isValidPhone(data.phone);

      onChange?.(data.phone, {
        country: data.country.iso2,
        isValid,
        inputValue: data.inputValue,
      });
    },
  });

  // Custom input handler that blocks input if number would be too long
  // Uses libphonenumber's isPossibleNumberWithReason for dynamic validation
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const newDigits = extractDigits(newValue);
      const currentDigits = extractDigits(inputValue);

      // If user is deleting, always allow
      if (newDigits.length <= currentDigits.length) {
        handlePhoneValueChange(e);
        return;
      }

      // Construct full E.164 phone to check if it would be too long
      const fullPhone = `+${country.dialCode}${newDigits}`;

      // Check if this number would be too long using libphonenumber
      if (!isPhoneTooLong(fullPhone)) {
        handlePhoneValueChange(e);
      }
      // If too long, simply don't process the change (blocks input)
    },
    [handlePhoneValueChange, inputValue, country.dialCode]
  );

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

  // Handle country selection from Select
  const handleCountryChange = useCallback(
    (iso2: string) => {
      setCountry(iso2 as CountryIso2);
      // Focus input after selection
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [setCountry, inputRef]
  );

  // Filter function for country search
  const filterCountryOption = useCallback((input: string, option?: CountryOption): boolean => {
    if (!input || !option) {
      return true;
    }
    return option.searchText.includes(input.toLowerCase());
  }, []);

  // Memoize the Select size mapping
  const selectSize = useMemo(() => {
    if (size === 'small') {
      return 'small';
    }
    if (size === 'large') {
      return 'large';
    }
    return 'middle';
  }, [size]);

  return (
    <div
      ref={containerRef}
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
      {/* Country Selector using antd Select */}
      {showCountrySelector && (
        <Select<string, CountryOption>
          value={country.iso2}
          onChange={handleCountryChange}
          disabled={disabled || disableCountrySelector}
          showSearch
          filterOption={filterCountryOption}
          options={COUNTRY_OPTIONS}
          size={selectSize}
          variant="borderless"
          popupMatchSelectWidth={280}
          className="phone-input-country-select"
          popupClassName="phone-input-country-popup"
          getPopupContainer={() => containerRef.current || document.body}
          listHeight={300}
          optionRender={(option) => (
            <div className="flex items-center gap-2 py-0.5">
              <FlagImage iso2={option.data.value} size="20px" />
              <span className="flex-1 truncate">{option.data.label}</span>
              <span className="text-xs text-gray-400">+{option.data.dialCode}</span>
            </div>
          )}
          labelRender={({ value: val }) => (
            <div className="flex items-center gap-1">
              <FlagImage iso2={val as string} size="20px" />
            </div>
          )}
          suffixIcon={
            <svg
              className="w-3 h-3 text-stone-400"
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
          }
        />
      )}

      {/* Dial Code Display (non-editable) */}
      <span
        className={cn(
          'text-stone-500 dark:text-stone-400 select-none whitespace-nowrap',
          'px-1.5',
          size === 'small' && 'text-xs',
          size === 'middle' && 'text-sm',
          size === 'large' && 'text-base'
        )}
      >
        +{country.dialCode}
      </span>

      {/* Phone Input (national number only) */}
      <input
        ref={inputRef}
        type="tel"
        value={inputValue}
        onChange={handleInputChange}
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
          'rounded-e-lg'
        )}
        dir="ltr"
        aria-label="Phone number"
      />
    </div>
  );
}

// =============================================================================
// DISPLAY UTILITY
// =============================================================================

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
