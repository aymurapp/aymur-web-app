'use client';

/**
 * PhoneInput Component
 *
 * A reusable international phone number input with country selector and validation.
 * Uses react-international-phone for country detection, formatting, and validation.
 * Uses google-libphonenumber for accurate per-country phone validation.
 *
 * Features:
 * - Country selector with flags (Twemoji)
 * - Separated dial code display (non-editable, shown between flag and input)
 * - Auto-formats phone numbers based on country
 * - Country auto-detection from phone number
 * - E.164 format output (includes country code)
 * - Proper validation via google-libphonenumber
 * - Ant Design styling integration
 * - RTL support
 * - Portal-based dropdown (escapes overflow:hidden containers)
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

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { PhoneNumberUtil } from 'google-libphonenumber';
import { createPortal } from 'react-dom';
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

const BUTTON_SIZE_CLASSES = {
  small: 'py-0 px-1.5',
  middle: 'py-1 px-2',
  large: 'py-1.5 px-2',
} as const;

// =============================================================================
// COUNTRY DROPDOWN COMPONENT
// =============================================================================

interface CountryDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iso2: CountryIso2) => void;
  selectedCountry: CountryIso2;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

/**
 * Get all unique first letters from country names
 */
function getAlphabetLetters(): string[] {
  const letters = new Set<string>();
  defaultCountries.forEach((c) => {
    const parsed = parseCountry(c);
    const firstLetter = parsed.name.charAt(0).toUpperCase();
    letters.add(firstLetter);
  });
  return Array.from(letters).sort();
}

/**
 * Sort countries alphabetically by name
 */
function getSortedCountries() {
  return [...defaultCountries].sort((a, b) => {
    const nameA = parseCountry(a).name;
    const nameB = parseCountry(b).name;
    return nameA.localeCompare(nameB);
  });
}

const ALPHABET_LETTERS = getAlphabetLetters();
const SORTED_COUNTRIES = getSortedCountries();

function CountryDropdown({
  isOpen,
  onClose,
  onSelect,
  selectedCountry,
  triggerRef,
}: CountryDropdownProps): React.JSX.Element | null {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter countries based on search
  const filteredCountries = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return SORTED_COUNTRIES;
    }
    const query = searchQuery.toLowerCase();
    return SORTED_COUNTRIES.filter((c) => {
      const parsed = parseCountry(c);
      return (
        parsed.name.toLowerCase().includes(query) ||
        parsed.dialCode.includes(query) ||
        parsed.iso2.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  // Group countries by first letter
  const groupedCountries = React.useMemo(() => {
    const groups: Record<string, typeof filteredCountries> = {};
    filteredCountries.forEach((c) => {
      const parsed = parseCountry(c);
      const letter = parsed.name.charAt(0).toUpperCase();
      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(c);
    });
    return groups;
  }, [filteredCountries]);

  // Update position when dropdown opens
  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 4,
      left: rect.left,
    });

    // Focus search input
    setTimeout(() => searchInputRef.current?.focus(), 50);

    // Reset search when opening
    setSearchQuery('');

    // Close on scroll
    const handleScroll = () => onClose();
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen, triggerRef, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Quick letter jump (when not focused on search)
      if (
        document.activeElement !== searchInputRef.current &&
        e.key.length === 1 &&
        /[a-zA-Z]/.test(e.key)
      ) {
        const letter = e.key.toUpperCase();
        const letterEl = letterRefs.current[letter];
        if (letterEl) {
          letterEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Scroll to letter
  const scrollToLetter = (letter: string) => {
    const letterEl = letterRefs.current[letter];
    if (letterEl) {
      letterEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  };

  if (!isOpen || typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />

      {/* Dropdown */}
      <div
        className={cn(
          'fixed z-[9999] flex',
          'bg-white dark:bg-stone-800',
          'border border-stone-200 dark:border-stone-600',
          'rounded-lg shadow-xl overflow-hidden'
        )}
        style={{
          top: position.top,
          left: position.left,
          width: 320,
          maxHeight: 350,
        }}
      >
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search input */}
          <div className="p-2 border-b border-stone-200 dark:border-stone-600">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country..."
              className={cn(
                'w-full px-3 py-1.5 text-sm',
                'bg-stone-50 dark:bg-stone-700',
                'border border-stone-200 dark:border-stone-600 rounded',
                'text-stone-900 dark:text-stone-100',
                'placeholder:text-stone-400 dark:placeholder:text-stone-500',
                'focus:outline-none focus:ring-1 focus:ring-amber-500'
              )}
            />
          </div>

          {/* Country list */}
          <div ref={listRef} className="flex-1 overflow-y-auto">
            {Object.keys(groupedCountries).length === 0 ? (
              <div className="p-4 text-center text-sm text-stone-500">No countries found</div>
            ) : (
              Object.entries(groupedCountries).map(([letter, countries]) => (
                <div
                  key={letter}
                  ref={(el) => {
                    letterRefs.current[letter] = el;
                  }}
                >
                  {/* Letter header */}
                  <div className="sticky top-0 px-3 py-1 text-xs font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700">
                    {letter}
                  </div>
                  {/* Countries in this letter group */}
                  {countries.map((countryData) => {
                    const parsed = parseCountry(countryData);
                    return (
                      <button
                        key={parsed.iso2}
                        type="button"
                        onClick={() => {
                          onSelect(parsed.iso2);
                          onClose();
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-start',
                          'hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors',
                          selectedCountry === parsed.iso2 && 'bg-amber-50 dark:bg-amber-900/20'
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
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alphabet sidebar */}
        {!searchQuery && (
          <div className="w-6 bg-stone-50 dark:bg-stone-700 border-s border-stone-200 dark:border-stone-600 flex flex-col items-center py-1 overflow-y-auto">
            {ALPHABET_LETTERS.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => scrollToLetter(letter)}
                className={cn(
                  'w-5 h-5 text-[10px] font-medium rounded',
                  'text-stone-600 dark:text-stone-300',
                  'hover:bg-amber-100 dark:hover:bg-amber-900/30',
                  'hover:text-amber-700 dark:hover:text-amber-400',
                  'transition-colors'
                )}
              >
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

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

  // Handle country selection from dropdown
  const handleCountrySelect = useCallback(
    (iso2: CountryIso2) => {
      setCountry(iso2);
      // Focus input after selection
      inputRef.current?.focus();
    },
    [setCountry, inputRef]
  );

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
      {/* Country Selector Button */}
      {showCountrySelector && (
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled || disableCountrySelector}
          onClick={() => !disabled && !disableCountrySelector && setIsDropdownOpen(!isDropdownOpen)}
          className={cn(
            'flex items-center gap-1 border-e border-stone-200 dark:border-stone-600',
            'hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors rounded-s-lg',
            BUTTON_SIZE_CLASSES[size],
            (disabled || disableCountrySelector) && 'cursor-not-allowed'
          )}
          aria-label="Select country"
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
        >
          <FlagImage iso2={country.iso2} size="20px" />
          <svg
            className={cn(
              'w-3 h-3 text-stone-400 transition-transform',
              isDropdownOpen && 'rotate-180'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
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

      {/* Country Dropdown */}
      <CountryDropdown
        isOpen={isDropdownOpen}
        onClose={closeDropdown}
        onSelect={handleCountrySelect}
        selectedCountry={country.iso2}
        triggerRef={buttonRef}
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
