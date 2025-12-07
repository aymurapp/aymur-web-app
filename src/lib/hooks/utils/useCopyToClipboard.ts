/**
 * useCopyToClipboard Hook
 * Clipboard utility for copying text with status feedback
 *
 * Features:
 * - Copy text to clipboard using modern Clipboard API
 * - Fallback for older browsers using execCommand
 * - Success/error state with automatic reset
 * - Configurable reset timeout
 * - Full TypeScript support
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Copy operation status
 */
export type CopyStatus = 'idle' | 'copied' | 'error';

/**
 * Options for useCopyToClipboard hook
 */
export interface UseCopyToClipboardOptions {
  /**
   * Timeout in milliseconds before resetting status to 'idle'
   * Set to 0 to disable auto-reset
   * @default 2000
   */
  resetTimeout?: number;
  /**
   * Callback fired on successful copy
   */
  onSuccess?: (text: string) => void;
  /**
   * Callback fired on copy error
   */
  onError?: (error: Error) => void;
}

/**
 * Return type for useCopyToClipboard hook
 */
export interface UseCopyToClipboardReturn {
  /**
   * Function to copy text to clipboard
   * @param text - The text to copy
   * @returns Promise that resolves to true on success, false on error
   */
  copy: (text: string) => Promise<boolean>;
  /**
   * Current status of the copy operation
   */
  status: CopyStatus;
  /**
   * Whether the copy operation is in 'copied' state
   */
  isCopied: boolean;
  /**
   * Whether the copy operation resulted in an error
   */
  isError: boolean;
  /**
   * The last copied text (null if never copied or on error)
   */
  copiedText: string | null;
  /**
   * The error from the last failed copy attempt
   */
  error: Error | null;
  /**
   * Reset the status back to 'idle'
   */
  reset: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if the modern Clipboard API is available
 */
function isClipboardApiSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.clipboard !== undefined &&
    typeof navigator.clipboard.writeText === 'function'
  );
}

/**
 * Fallback copy method using execCommand for older browsers
 * Creates a temporary textarea, copies the text, and cleans up
 */
async function fallbackCopyToClipboard(text: string): Promise<void> {
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    throw new Error('Clipboard API is not available in this environment');
  }

  const textArea = document.createElement('textarea');

  // Configure textarea to be invisible and not affect layout
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = '0';
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  textArea.style.opacity = '0';

  // Prevent scrolling on focus
  textArea.style.fontSize = '12pt';

  document.body.appendChild(textArea);

  try {
    textArea.focus();
    textArea.select();

    // For iOS devices
    textArea.setSelectionRange(0, text.length);

    const success = document.execCommand('copy');

    if (!success) {
      throw new Error('execCommand copy failed');
    }
  } finally {
    document.body.removeChild(textArea);
  }
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for copying text to the clipboard with status feedback
 *
 * Uses the modern Clipboard API when available, with a fallback
 * to execCommand for older browsers. Provides status feedback
 * and automatic reset after a configurable timeout.
 *
 * @param options - Configuration options
 * @returns Object with copy function and status information
 *
 * @example
 * // Basic usage
 * const { copy, isCopied } = useCopyToClipboard();
 *
 * return (
 *   <button onClick={() => copy('Hello, World!')}>
 *     {isCopied ? 'Copied!' : 'Copy'}
 *   </button>
 * );
 *
 * @example
 * // With callbacks
 * const { copy, status } = useCopyToClipboard({
 *   resetTimeout: 3000,
 *   onSuccess: (text) => console.log(`Copied: ${text}`),
 *   onError: (error) => console.error('Copy failed:', error),
 * });
 *
 * @example
 * // Copy button with icon feedback
 * const { copy, isCopied, isError } = useCopyToClipboard();
 *
 * return (
 *   <button onClick={() => copy(value)}>
 *     {isError ? <ErrorIcon /> : isCopied ? <CheckIcon /> : <CopyIcon />}
 *   </button>
 * );
 *
 * @example
 * // Copying dynamic content
 * const { copy, copiedText } = useCopyToClipboard();
 *
 * const handleCopyOrderId = () => {
 *   copy(order.id);
 * };
 */
export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardReturn {
  const { resetTimeout = 2000, onSuccess, onError } = options;

  const [status, setStatus] = useState<CopyStatus>('idle');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Reset status to idle
   */
  const reset = useCallback((): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus('idle');
    setError(null);
  }, []);

  /**
   * Schedule status reset after timeout
   */
  const scheduleReset = useCallback((): void => {
    if (resetTimeout > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setStatus('idle');
        timeoutRef.current = null;
      }, resetTimeout);
    }
  }, [resetTimeout]);

  /**
   * Copy text to clipboard
   */
  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      try {
        // Try modern Clipboard API first
        if (isClipboardApiSupported()) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fall back to execCommand
          await fallbackCopyToClipboard(text);
        }

        // Success
        setStatus('copied');
        setCopiedText(text);
        setError(null);
        onSuccess?.(text);
        scheduleReset();
        return true;
      } catch (err) {
        // Error handling
        const copyError = err instanceof Error ? err : new Error('Failed to copy to clipboard');

        setStatus('error');
        setCopiedText(null);
        setError(copyError);
        onError?.(copyError);
        scheduleReset();
        return false;
      }
    },
    [onSuccess, onError, scheduleReset]
  );

  return {
    copy,
    status,
    isCopied: status === 'copied',
    isError: status === 'error',
    copiedText,
    error,
    reset,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Standalone function to copy text to clipboard
 *
 * This is a non-hook utility for use outside of React components.
 * For use inside components, prefer useCopyToClipboard.
 *
 * @param text - The text to copy
 * @returns Promise that resolves to true on success, false on error
 *
 * @example
 * const success = await copyToClipboard('Hello, World!');
 * if (success) {
 *   console.log('Copied!');
 * }
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (isClipboardApiSupported()) {
      await navigator.clipboard.writeText(text);
    } else {
      await fallbackCopyToClipboard(text);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if clipboard operations are likely to be supported
 *
 * @returns Whether clipboard operations are likely supported
 */
export function isClipboardSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return isClipboardApiSupported() || typeof document.execCommand === 'function';
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useCopyToClipboard;
