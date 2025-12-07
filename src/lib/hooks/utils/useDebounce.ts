/**
 * useDebounce Hook
 * Provides debounced values and callbacks for performance optimization
 *
 * Features:
 * - Generic type support for any value type
 * - Configurable delay with sensible default (300ms)
 * - Proper cleanup on unmount to prevent memory leaks
 * - useDebounceCallback for debouncing functions
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for debounce behavior
 */
export interface DebounceOptions {
  /** Delay in milliseconds before the value updates */
  delay?: number;
  /** If true, update immediately on first call, then debounce subsequent calls */
  leading?: boolean;
}

/**
 * Return type for useDebounceCallback hook
 */
export interface DebouncedFunction<T extends (...args: unknown[]) => unknown> {
  /** The debounced function */
  (...args: Parameters<T>): void;
  /** Cancel any pending debounced call */
  cancel: () => void;
  /** Immediately execute the pending call */
  flush: () => void;
  /** Check if there's a pending call */
  isPending: () => boolean;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook that returns a debounced version of the provided value
 *
 * The value will only update after the specified delay has passed
 * without any new values being set. Useful for search inputs,
 * form validation, and other scenarios where you want to wait
 * for user input to "settle" before taking action.
 *
 * @template T - The type of value being debounced
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * // Basic usage with search input
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     fetchSearchResults(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 *
 * @example
 * // With form validation
 * const [email, setEmail] = useState('');
 * const debouncedEmail = useDebounce(email, 300);
 *
 * useEffect(() => {
 *   validateEmail(debouncedEmail);
 * }, [debouncedEmail]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set up new timer
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup on unmount or when value/delay changes
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that returns a debounced version of a callback function
 *
 * Unlike useDebounce which debounces a value, this hook debounces
 * a function call. The function will only be called after the
 * specified delay has passed without any new calls being made.
 *
 * @template T - The function type being debounced
 * @param callback - The function to debounce
 * @param options - Debounce options including delay and leading edge
 * @returns A debounced version of the callback with cancel/flush methods
 *
 * @example
 * // Basic usage with API calls
 * const debouncedSave = useDebounceCallback(
 *   (data: FormData) => saveToApi(data),
 *   { delay: 1000 }
 * );
 *
 * const handleChange = (data: FormData) => {
 *   debouncedSave(data);
 * };
 *
 * @example
 * // With leading edge (immediate first call)
 * const debouncedClick = useDebounceCallback(
 *   () => handleClick(),
 *   { delay: 500, leading: true }
 * );
 *
 * @example
 * // Cancel pending calls on unmount
 * const debouncedFetch = useDebounceCallback(
 *   (query: string) => fetchData(query),
 *   { delay: 300 }
 * );
 *
 * useEffect(() => {
 *   return () => debouncedFetch.cancel();
 * }, [debouncedFetch]);
 */
export function useDebounceCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  options: DebounceOptions = {}
): DebouncedFunction<T> {
  const { delay = 300, leading = false } = options;

  // Store the latest callback ref to avoid stale closures
  const callbackRef = useRef<T>(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);
  const hasLeadingCallRef = useRef<boolean>(false);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  /**
   * Cancel any pending debounced call
   */
  const cancel = useCallback((): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingArgsRef.current = null;
    hasLeadingCallRef.current = false;
  }, []);

  /**
   * Immediately execute the pending call
   */
  const flush = useCallback((): void => {
    if (timerRef.current && pendingArgsRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      callbackRef.current(...pendingArgsRef.current);
      pendingArgsRef.current = null;
      hasLeadingCallRef.current = false;
    }
  }, []);

  /**
   * Check if there's a pending call
   */
  const isPending = useCallback((): boolean => {
    return timerRef.current !== null;
  }, []);

  /**
   * The debounced function
   */
  const debouncedFn = useCallback(
    (...args: Parameters<T>): void => {
      pendingArgsRef.current = args;

      // Handle leading edge
      if (leading && !hasLeadingCallRef.current) {
        hasLeadingCallRef.current = true;
        callbackRef.current(...args);
      }

      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Set up new timer
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        // Only call on trailing edge if not leading, or if there were more calls after leading
        if (!leading || pendingArgsRef.current !== null) {
          if (pendingArgsRef.current) {
            callbackRef.current(...pendingArgsRef.current);
          }
        }
        pendingArgsRef.current = null;
        hasLeadingCallRef.current = false;
      }, delay);
    },
    [delay, leading]
  );

  // Create a stable function reference with attached methods
  const stableRef = useMemo(() => {
    const fn = debouncedFn as DebouncedFunction<T>;
    fn.cancel = cancel;
    fn.flush = flush;
    fn.isPending = isPending;
    return fn;
  }, [debouncedFn, cancel, flush, isPending]);

  return stableRef;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a debounced version of a function (non-hook utility)
 *
 * This is a standalone utility function for use outside of React components.
 * For use inside components, prefer useDebounceCallback.
 *
 * @template T - The function type being debounced
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns A debounced version of the function
 *
 * @example
 * const debouncedLog = debounce((message: string) => {
 *   console.log(message);
 * }, 300);
 *
 * debouncedLog('hello'); // Will log after 300ms of inactivity
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): DebouncedFunction<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;

  const cancel = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingArgs = null;
  };

  const flush = (): void => {
    if (timer && pendingArgs) {
      clearTimeout(timer);
      timer = null;
      fn(...pendingArgs);
      pendingArgs = null;
    }
  };

  const isPending = (): boolean => {
    return timer !== null;
  };

  const debouncedFn = ((...args: Parameters<T>): void => {
    pendingArgs = args;

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null;
      if (pendingArgs) {
        fn(...pendingArgs);
        pendingArgs = null;
      }
    }, delay);
  }) as DebouncedFunction<T>;

  debouncedFn.cancel = cancel;
  debouncedFn.flush = flush;
  debouncedFn.isPending = isPending;

  return debouncedFn;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useDebounce;
