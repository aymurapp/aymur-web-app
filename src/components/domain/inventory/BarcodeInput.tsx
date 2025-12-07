'use client';

/**
 * BarcodeInput Component
 *
 * A simple input field optimized for hardware barcode scanners with features:
 * - Auto-submit on barcode pattern detection (fast sequential input)
 * - Clear button for resetting input
 * - Search/scan icon
 * - Integration with useBarcodeScanner hook
 * - Configurable submit delay for scanner detection
 * - RTL support for Arabic locale
 *
 * @module components/domain/inventory/BarcodeInput
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';

import { ScanOutlined, CloseOutlined, SearchOutlined, LoadingOutlined } from '@ant-design/icons';
import { Input, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';

import type { InputRef } from 'antd';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the BarcodeInput component
 */
export interface BarcodeInputProps {
  /**
   * Callback fired when a barcode is scanned or manually submitted
   */
  onScan: (barcode: string) => void;

  /**
   * Callback fired on input value change
   */
  onChange?: (value: string) => void;

  /**
   * Callback fired when input is cleared
   */
  onClear?: () => void;

  /**
   * Controlled input value
   */
  value?: string;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Input size
   * @default 'middle'
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * Whether the input is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether the input is loading
   * @default false
   */
  loading?: boolean;

  /**
   * Minimum barcode length to auto-submit
   * @default 3
   */
  minLength?: number;

  /**
   * Maximum time between keystrokes to consider it scanner input (ms)
   * @default 50
   */
  scannerDebounce?: number;

  /**
   * Whether to auto-submit when scanner input is detected
   * @default true
   */
  autoSubmit?: boolean;

  /**
   * Whether to clear input after scan/submit
   * @default true
   */
  clearOnScan?: boolean;

  /**
   * Whether to show the scan icon
   * @default true
   */
  showScanIcon?: boolean;

  /**
   * Whether to show the search icon
   * @default false
   */
  showSearchIcon?: boolean;

  /**
   * Whether to show the clear button
   * @default true
   */
  showClear?: boolean;

  /**
   * Whether to auto-focus the input
   * @default false
   */
  autoFocus?: boolean;

  /**
   * Additional class name
   */
  className?: string;

  /**
   * Input status for validation
   */
  status?: 'error' | 'warning';

  /**
   * Custom prefix element (replaces default icon)
   */
  prefix?: React.ReactNode;

  /**
   * Custom suffix element (added before clear button)
   */
  suffix?: React.ReactNode;

  /**
   * Keyboard shortcut hint to display
   */
  shortcutHint?: string;
}

/**
 * Ref methods exposed by BarcodeInput
 */
export interface BarcodeInputRef {
  /** Focus the input */
  focus: () => void;
  /** Blur the input */
  blur: () => void;
  /** Clear the input value */
  clear: () => void;
  /** Get the current input value */
  getValue: () => string;
  /** Set the input value */
  setValue: (value: string) => void;
  /** Select all text in input */
  select: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default scanner debounce time (ms) */
const DEFAULT_SCANNER_DEBOUNCE = 50;

/** Default minimum barcode length */
const DEFAULT_MIN_LENGTH = 3;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * BarcodeInput Component
 *
 * Simple input optimized for hardware barcode scanners with auto-detection
 * of scanner input vs manual typing.
 */
export const BarcodeInput = forwardRef<BarcodeInputRef, BarcodeInputProps>(
  (
    {
      onScan,
      onChange,
      onClear,
      value: controlledValue,
      placeholder,
      size = 'middle',
      disabled = false,
      loading = false,
      minLength = DEFAULT_MIN_LENGTH,
      scannerDebounce = DEFAULT_SCANNER_DEBOUNCE,
      autoSubmit = true,
      clearOnScan = true,
      showScanIcon = true,
      showSearchIcon = false,
      showClear = true,
      autoFocus = false,
      className,
      status,
      prefix,
      suffix,
      shortcutHint,
    },
    ref
  ) => {
    const t = useTranslations();

    // ========================================================================
    // STATE
    // ========================================================================

    // Internal value state (for uncontrolled mode)
    const [internalValue, setInternalValue] = useState('');

    // Current value (controlled or internal)
    const value = controlledValue !== undefined ? controlledValue : internalValue;

    // Scanner detection refs
    const lastKeyTimeRef = useRef<number>(0);
    const bufferRef = useRef<string>('');
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Input ref
    const inputRef = useRef<InputRef>(null);

    // ========================================================================
    // IMPERATIVE HANDLE
    // ========================================================================

    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
        clear: () => {
          setInternalValue('');
          bufferRef.current = '';
          onChange?.('');
          onClear?.();
        },
        getValue: () => value,
        setValue: (newValue: string) => {
          setInternalValue(newValue);
          onChange?.(newValue);
        },
        select: () => inputRef.current?.select(),
      }),
      [value, onChange, onClear]
    );

    // ========================================================================
    // EFFECTS
    // ========================================================================

    // Auto-focus on mount
    useEffect(() => {
      if (autoFocus) {
        inputRef.current?.focus();
      }
    }, [autoFocus]);

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    // ========================================================================
    // HANDLERS
    // ========================================================================

    /**
     * Handle barcode submission
     */
    const handleSubmit = useCallback(
      (barcode: string) => {
        const trimmed = barcode.trim();

        if (trimmed.length >= minLength) {
          onScan(trimmed);

          if (clearOnScan) {
            setInternalValue('');
            bufferRef.current = '';
            onChange?.('');
          }
        }
      },
      [minLength, onScan, clearOnScan, onChange]
    );

    /**
     * Handle input change
     */
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const now = Date.now();
        const timeSinceLastKey = now - lastKeyTimeRef.current;

        // Update internal value
        setInternalValue(newValue);
        onChange?.(newValue);

        // Scanner detection: if input is coming very fast, it's likely a scanner
        if (autoSubmit && timeSinceLastKey < scannerDebounce) {
          bufferRef.current = newValue;

          // Clear any existing timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          // Set a timeout to submit the buffer (scanner input usually ends abruptly)
          timeoutRef.current = setTimeout(() => {
            if (bufferRef.current.length >= minLength) {
              handleSubmit(bufferRef.current);
            }
            bufferRef.current = '';
            timeoutRef.current = null;
          }, scannerDebounce * 2);
        }

        lastKeyTimeRef.current = now;
      },
      [autoSubmit, scannerDebounce, minLength, handleSubmit, onChange]
    );

    /**
     * Handle key down events
     */
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Submit on Enter
        if (e.key === 'Enter') {
          e.preventDefault();

          // Clear any pending scanner timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          handleSubmit(value);
        }

        // Clear on Escape
        if (e.key === 'Escape') {
          e.preventDefault();
          setInternalValue('');
          bufferRef.current = '';
          onChange?.('');
          onClear?.();
        }
      },
      [value, handleSubmit, onChange, onClear]
    );

    /**
     * Handle clear button click
     */
    const handleClear = useCallback(() => {
      setInternalValue('');
      bufferRef.current = '';
      onChange?.('');
      onClear?.();
      inputRef.current?.focus();
    }, [onChange, onClear]);

    // ========================================================================
    // COMPUTED
    // ========================================================================

    // Determine prefix icon
    const prefixIcon =
      prefix ??
      (showScanIcon ? (
        <ScanOutlined className="text-stone-400" />
      ) : showSearchIcon ? (
        <SearchOutlined className="text-stone-400" />
      ) : null);

    // Build suffix elements
    const suffixElements = (
      <span className="flex items-center gap-1">
        {/* Custom suffix */}
        {suffix}

        {/* Loading indicator */}
        {loading && <LoadingOutlined className="text-stone-400" spin />}

        {/* Shortcut hint */}
        {shortcutHint && !value && !loading && (
          <Tooltip title={t('common.labels.shortcut')}>
            <span className="text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
              {shortcutHint}
            </span>
          </Tooltip>
        )}

        {/* Clear button */}
        {showClear && value && !loading && (
          <CloseOutlined
            className="text-stone-400 cursor-pointer hover:text-stone-600 transition-colors"
            onClick={handleClear}
          />
        )}
      </span>
    );

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || t('scanner.scanOrEnter')}
        prefix={prefixIcon}
        suffix={suffixElements}
        size={size}
        disabled={disabled || loading}
        status={status}
        className={cn(
          'transition-all duration-200',
          // Focus ring enhancement
          'focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:ring-offset-1',
          className
        )}
        data-barcode-input
        allowClear={false}
      />
    );
  }
);

BarcodeInput.displayName = 'BarcodeInput';

// =============================================================================
// SKELETON
// =============================================================================

/**
 * Loading skeleton for BarcodeInput
 */
export function BarcodeInputSkeleton({
  size = 'middle',
}: {
  size?: 'small' | 'middle' | 'large';
}): JSX.Element {
  const heightMap = {
    small: 'h-6',
    middle: 'h-8',
    large: 'h-10',
  };

  return <div className={cn('bg-stone-200 rounded animate-pulse', heightMap[size])} />;
}

export default BarcodeInput;
