/**
 * useBarcodeScanner Hook
 * Hardware and camera barcode scanning functionality
 *
 * Features:
 * - Hardware scanner support (keyboard input detection)
 * - Camera scanner integration using html5-qrcode library
 * - Debounced input handling for keyboard scanners
 * - Configurable barcode length validation
 * - Support for multiple barcode formats
 * - Full TypeScript support
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { Html5Qrcode, Html5QrcodeSupportedFormats, type Html5QrcodeResult } from 'html5-qrcode';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported scanner types
 */
export type ScannerType = 'keyboard' | 'camera' | 'both';

/**
 * Scanner status
 */
export type ScannerStatus = 'idle' | 'scanning' | 'error' | 'permission_denied';

/**
 * Barcode formats supported by the scanner
 */
export type BarcodeFormat =
  | 'QR_CODE'
  | 'EAN_13'
  | 'EAN_8'
  | 'UPC_A'
  | 'UPC_E'
  | 'CODE_128'
  | 'CODE_39'
  | 'CODE_93'
  | 'CODABAR'
  | 'ITF'
  | 'DATA_MATRIX'
  | 'PDF_417'
  | 'AZTEC';

/**
 * Options for useBarcodeScanner hook
 */
export interface UseBarcodeScannerOptions {
  /**
   * Whether the scanner is enabled
   * @default true
   */
  enabled?: boolean;
  /**
   * Callback fired when a barcode is successfully scanned
   */
  onScan: (barcode: string) => void;
  /**
   * Callback fired on scanner error
   */
  onError?: (error: Error) => void;
  /**
   * Type of scanner to use
   * @default 'both'
   */
  scannerType?: ScannerType;
  /**
   * Minimum barcode length to accept
   * @default 3
   */
  minLength?: number;
  /**
   * Maximum barcode length to accept
   * @default 100
   */
  maxLength?: number;
  /**
   * Debounce time in milliseconds for keyboard input
   * @default 50
   */
  debounceMs?: number;
  /**
   * Barcode formats to support for camera scanning
   * @default All common formats
   */
  formats?: BarcodeFormat[];
  /**
   * Camera frames per second
   * @default 10
   */
  fps?: number;
  /**
   * Size of the QR scanning box
   * @default { width: 250, height: 250 }
   */
  qrbox?: { width: number; height: number };
  /**
   * Prevent duplicate scans within this time window (ms)
   * @default 1000
   */
  duplicateReadDelay?: number;
}

/**
 * Return type for useBarcodeScanner hook
 */
export interface UseBarcodeScannerReturn {
  /**
   * Whether the camera scanner is currently active
   */
  isScanning: boolean;
  /**
   * Current scanner status
   */
  status: ScannerStatus;
  /**
   * The last successfully scanned barcode value
   */
  lastScanned: string | null;
  /**
   * Timestamp of the last scan
   */
  lastScannedAt: Date | null;
  /**
   * Start the camera scanner
   */
  startCameraScanner: () => Promise<void>;
  /**
   * Stop the camera scanner
   */
  stopCameraScanner: () => void;
  /**
   * Reference to attach to the camera viewfinder container
   */
  cameraRef: React.RefObject<HTMLDivElement>;
  /**
   * The last error that occurred
   */
  error: Error | null;
  /**
   * Reset the scanner state
   */
  reset: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Map of barcode format strings to Html5QrcodeSupportedFormats
 */
const FORMAT_MAP: Record<BarcodeFormat, Html5QrcodeSupportedFormats> = {
  QR_CODE: Html5QrcodeSupportedFormats.QR_CODE,
  EAN_13: Html5QrcodeSupportedFormats.EAN_13,
  EAN_8: Html5QrcodeSupportedFormats.EAN_8,
  UPC_A: Html5QrcodeSupportedFormats.UPC_A,
  UPC_E: Html5QrcodeSupportedFormats.UPC_E,
  CODE_128: Html5QrcodeSupportedFormats.CODE_128,
  CODE_39: Html5QrcodeSupportedFormats.CODE_39,
  CODE_93: Html5QrcodeSupportedFormats.CODE_93,
  CODABAR: Html5QrcodeSupportedFormats.CODABAR,
  ITF: Html5QrcodeSupportedFormats.ITF,
  DATA_MATRIX: Html5QrcodeSupportedFormats.DATA_MATRIX,
  PDF_417: Html5QrcodeSupportedFormats.PDF_417,
  AZTEC: Html5QrcodeSupportedFormats.AZTEC,
};

/**
 * Default barcode formats to support
 */
const DEFAULT_FORMATS: BarcodeFormat[] = [
  'QR_CODE',
  'EAN_13',
  'EAN_8',
  'UPC_A',
  'UPC_E',
  'CODE_128',
  'CODE_39',
];

/**
 * Default scanner options
 */
const DEFAULT_OPTIONS: Required<Omit<UseBarcodeScannerOptions, 'onScan' | 'onError'>> = {
  enabled: true,
  scannerType: 'both',
  minLength: 3,
  maxLength: 100,
  debounceMs: 50,
  formats: DEFAULT_FORMATS,
  fps: 10,
  qrbox: { width: 250, height: 250 },
  duplicateReadDelay: 1000,
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if the code is running in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Generate a unique element ID for the scanner
 */
function generateScannerId(): string {
  return `barcode-scanner-${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for hardware and camera barcode scanning
 *
 * Supports both hardware barcode scanners (which emulate keyboard input)
 * and camera-based scanning using the html5-qrcode library.
 *
 * @param options - Configuration options
 * @returns Object with scanner state and control functions
 *
 * @example
 * // Basic usage with keyboard scanner
 * const { lastScanned } = useBarcodeScanner({
 *   onScan: (barcode) => console.log('Scanned:', barcode),
 *   scannerType: 'keyboard',
 * });
 *
 * @example
 * // Camera scanner with custom formats
 * const { cameraRef, startCameraScanner, stopCameraScanner, isScanning } =
 *   useBarcodeScanner({
 *     onScan: (barcode) => handleBarcode(barcode),
 *     scannerType: 'camera',
 *     formats: ['EAN_13', 'UPC_A'],
 *   });
 *
 * return (
 *   <div>
 *     <div ref={cameraRef} style={{ width: 300, height: 300 }} />
 *     <button onClick={isScanning ? stopCameraScanner : startCameraScanner}>
 *       {isScanning ? 'Stop' : 'Start'} Scanner
 *     </button>
 *   </div>
 * );
 *
 * @example
 * // Both keyboard and camera scanning
 * const { cameraRef, isScanning, lastScanned, startCameraScanner } =
 *   useBarcodeScanner({
 *     onScan: (barcode) => {
 *       // Handle barcode from either source
 *       lookupProduct(barcode);
 *     },
 *     scannerType: 'both',
 *     minLength: 8,
 *     maxLength: 14,
 *   });
 */
export function useBarcodeScanner(options: UseBarcodeScannerOptions): UseBarcodeScannerReturn {
  const {
    enabled = DEFAULT_OPTIONS.enabled,
    onScan,
    onError,
    scannerType = DEFAULT_OPTIONS.scannerType,
    minLength = DEFAULT_OPTIONS.minLength,
    maxLength = DEFAULT_OPTIONS.maxLength,
    debounceMs = DEFAULT_OPTIONS.debounceMs,
    formats = DEFAULT_OPTIONS.formats,
    fps = DEFAULT_OPTIONS.fps,
    qrbox = DEFAULT_OPTIONS.qrbox,
    duplicateReadDelay = DEFAULT_OPTIONS.duplicateReadDelay,
  } = options;

  // State
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [lastScannedAt, setLastScannedAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const cameraRef = useRef<HTMLDivElement>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerIdRef = useRef<string>(generateScannerId());
  const keyboardBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const keyboardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  // Keep callbacks refs updated
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  /**
   * Validate barcode against length constraints
   */
  const isValidBarcode = useCallback(
    (barcode: string): boolean => {
      const trimmed = barcode.trim();
      return trimmed.length >= minLength && trimmed.length <= maxLength;
    },
    [minLength, maxLength]
  );

  /**
   * Check if this is a duplicate scan within the delay window
   */
  const isDuplicateScan = useCallback(
    (barcode: string): boolean => {
      const now = Date.now();
      if (barcode === lastScanned && now - lastScanTimeRef.current < duplicateReadDelay) {
        return true;
      }
      return false;
    },
    [lastScanned, duplicateReadDelay]
  );

  /**
   * Process a successful barcode scan
   */
  const processScan = useCallback(
    (barcode: string): void => {
      const trimmed = barcode.trim();

      if (!isValidBarcode(trimmed)) {
        return;
      }

      if (isDuplicateScan(trimmed)) {
        return;
      }

      lastScanTimeRef.current = Date.now();
      setLastScanned(trimmed);
      setLastScannedAt(new Date());
      onScanRef.current(trimmed);
    },
    [isValidBarcode, isDuplicateScan]
  );

  /**
   * Handle keyboard input for hardware barcode scanners
   */
  const handleKeyboardInput = useCallback(
    (event: KeyboardEvent): void => {
      // Ignore if scanning is not enabled or keyboard scanning is disabled
      if (!enabled || (scannerType !== 'keyboard' && scannerType !== 'both')) {
        return;
      }

      // Ignore if focus is on an input element (unless it's specifically for barcode input)
      const target = event.target as HTMLElement;
      const isInputElement =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Check if the input has a data attribute indicating it's for barcode scanning
      const isBarcodeInput = target.hasAttribute('data-barcode-input');

      if (isInputElement && !isBarcodeInput) {
        return;
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      // If Enter is pressed, process the buffer
      if (event.key === 'Enter') {
        event.preventDefault();

        if (keyboardBufferRef.current.length > 0) {
          processScan(keyboardBufferRef.current);
          keyboardBufferRef.current = '';
        }

        // Clear any pending timeout
        if (keyboardTimeoutRef.current) {
          clearTimeout(keyboardTimeoutRef.current);
          keyboardTimeoutRef.current = null;
        }

        lastKeyTimeRef.current = 0;
        return;
      }

      // If too much time has passed, reset the buffer
      if (timeSinceLastKey > debounceMs && keyboardBufferRef.current.length > 0) {
        keyboardBufferRef.current = '';
      }

      // Only accept printable characters
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        keyboardBufferRef.current += event.key;
        lastKeyTimeRef.current = now;

        // Clear any existing timeout
        if (keyboardTimeoutRef.current) {
          clearTimeout(keyboardTimeoutRef.current);
        }

        // Set a timeout to clear the buffer if no more input comes
        keyboardTimeoutRef.current = setTimeout(() => {
          // If buffer has content and it's been too long since last key,
          // the user might have typed manually without pressing Enter
          // Clear the buffer since barcode scanners always end with Enter
          keyboardBufferRef.current = '';
          keyboardTimeoutRef.current = null;
        }, 500); // 500ms timeout for manual typing detection
      }
    },
    [enabled, scannerType, debounceMs, processScan]
  );

  /**
   * Start the camera scanner
   */
  const startCameraScanner = useCallback(async (): Promise<void> => {
    if (!isBrowser()) {
      const browserError = new Error('Camera scanning is only available in browser environment');
      setError(browserError);
      onErrorRef.current?.(browserError);
      return;
    }

    if (scannerType !== 'camera' && scannerType !== 'both') {
      const typeError = new Error('Camera scanning is not enabled for this scanner type');
      setError(typeError);
      onErrorRef.current?.(typeError);
      return;
    }

    // Check if camera ref has an element
    if (!cameraRef.current) {
      const refError = new Error(
        'Camera container element not found. Attach cameraRef to a div element.'
      );
      setError(refError);
      onErrorRef.current?.(refError);
      return;
    }

    try {
      setStatus('scanning');
      setError(null);

      // Create a child element for the scanner if it doesn't exist
      let scannerElement = document.getElementById(scannerIdRef.current);
      if (!scannerElement) {
        scannerElement = document.createElement('div');
        scannerElement.id = scannerIdRef.current;
        cameraRef.current.appendChild(scannerElement);
      }

      // Convert format strings to Html5QrcodeSupportedFormats
      const supportedFormats = formats.map((format) => FORMAT_MAP[format]);

      // Create Html5Qrcode instance
      const html5Qrcode = new Html5Qrcode(scannerIdRef.current, {
        formatsToSupport: supportedFormats,
        verbose: false,
      });

      html5QrcodeRef.current = html5Qrcode;

      // Success callback
      const onScanSuccess = (decodedText: string, _decodedResult: Html5QrcodeResult): void => {
        processScan(decodedText);
      };

      // Error callback (called frequently during scanning, usually ignorable)
      const onScanError = (_errorMessage: string): void => {
        // Most scan errors are just "no QR code found" which is expected
        // Only log actual errors, not routine scanning failures
      };

      // Start scanning
      await html5Qrcode.start(
        { facingMode: 'environment' }, // Prefer back camera
        {
          fps,
          qrbox,
          aspectRatio: 1.0,
        },
        onScanSuccess,
        onScanError
      );

      setIsScanning(true);
    } catch (err) {
      const scanError = err instanceof Error ? err : new Error('Failed to start camera scanner');

      // Check for permission denied
      if (
        scanError.message.includes('Permission') ||
        scanError.message.includes('NotAllowedError')
      ) {
        setStatus('permission_denied');
      } else {
        setStatus('error');
      }

      setError(scanError);
      setIsScanning(false);
      onErrorRef.current?.(scanError);
    }
  }, [scannerType, formats, fps, qrbox, processScan]);

  /**
   * Stop the camera scanner
   */
  const stopCameraScanner = useCallback((): void => {
    if (html5QrcodeRef.current) {
      html5QrcodeRef.current
        .stop()
        .then(() => {
          html5QrcodeRef.current?.clear();
          html5QrcodeRef.current = null;
          setIsScanning(false);
          setStatus('idle');
        })
        .catch((err) => {
          // Scanner might already be stopped
          console.warn('Error stopping camera scanner:', err);
          html5QrcodeRef.current = null;
          setIsScanning(false);
          setStatus('idle');
        });
    }
  }, []);

  /**
   * Reset the scanner state
   */
  const reset = useCallback((): void => {
    setLastScanned(null);
    setLastScannedAt(null);
    setError(null);
    setStatus('idle');
    keyboardBufferRef.current = '';
    lastKeyTimeRef.current = 0;
    lastScanTimeRef.current = 0;

    if (keyboardTimeoutRef.current) {
      clearTimeout(keyboardTimeoutRef.current);
      keyboardTimeoutRef.current = null;
    }
  }, []);

  // Set up keyboard event listener
  useEffect(() => {
    if (!isBrowser()) {
      return undefined;
    }

    if (enabled && (scannerType === 'keyboard' || scannerType === 'both')) {
      document.addEventListener('keydown', handleKeyboardInput, true);

      return () => {
        document.removeEventListener('keydown', handleKeyboardInput, true);

        if (keyboardTimeoutRef.current) {
          clearTimeout(keyboardTimeoutRef.current);
        }
      };
    }

    return undefined;
  }, [enabled, scannerType, handleKeyboardInput]);

  // Clean up camera scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current
          .stop()
          .then(() => {
            html5QrcodeRef.current?.clear();
          })
          .catch(() => {
            // Ignore cleanup errors
          });
      }

      if (keyboardTimeoutRef.current) {
        clearTimeout(keyboardTimeoutRef.current);
      }
    };
  }, []);

  // Stop camera when disabled
  useEffect(() => {
    if (!enabled && isScanning) {
      stopCameraScanner();
    }
  }, [enabled, isScanning, stopCameraScanner]);

  return {
    isScanning,
    status,
    lastScanned,
    lastScannedAt,
    startCameraScanner,
    stopCameraScanner,
    cameraRef,
    error,
    reset,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if camera scanning is supported in the current browser
 *
 * @returns Whether camera scanning is likely supported
 */
export function isCameraScanningSupported(): boolean {
  if (!isBrowser()) {
    return false;
  }

  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}

/**
 * Get available cameras for scanning
 *
 * @returns Promise resolving to array of camera devices
 */
export async function getAvailableCameras(): Promise<Array<{ id: string; label: string }>> {
  if (!isBrowser()) {
    return [];
  }

  try {
    const cameras = await Html5Qrcode.getCameras();
    return cameras.map((camera) => ({
      id: camera.id,
      label: camera.label || `Camera ${camera.id}`,
    }));
  } catch {
    return [];
  }
}

/**
 * Validate a barcode string format
 *
 * @param barcode - The barcode to validate
 * @param options - Validation options
 * @returns Whether the barcode is valid
 */
export function isValidBarcodeFormat(
  barcode: string,
  options: { minLength?: number; maxLength?: number; pattern?: RegExp } = {}
): boolean {
  const { minLength = 1, maxLength = 100, pattern } = options;

  if (!barcode || typeof barcode !== 'string') {
    return false;
  }

  const trimmed = barcode.trim();

  if (trimmed.length < minLength || trimmed.length > maxLength) {
    return false;
  }

  if (pattern && !pattern.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Common barcode validation patterns
 */
export const BARCODE_PATTERNS = {
  /** EAN-13: 13 digits */
  EAN_13: /^\d{13}$/,
  /** EAN-8: 8 digits */
  EAN_8: /^\d{8}$/,
  /** UPC-A: 12 digits */
  UPC_A: /^\d{12}$/,
  /** UPC-E: 6-8 digits */
  UPC_E: /^\d{6,8}$/,
  /** Code 128: Variable length alphanumeric */
  CODE_128: /^[\x00-\x7F]+$/,
  /** Code 39: Uppercase letters, numbers, and special chars */
  CODE_39: /^[A-Z0-9\-. $/+%]+$/,
  /** Numeric only */
  NUMERIC: /^\d+$/,
  /** Alphanumeric */
  ALPHANUMERIC: /^[A-Za-z0-9]+$/,
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

export default useBarcodeScanner;
