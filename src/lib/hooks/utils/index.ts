/**
 * Utility Hooks
 * General purpose hooks for common patterns
 */

// =============================================================================
// DEBOUNCE
// =============================================================================

export {
  useDebounce,
  useDebounceCallback,
  debounce,
  type DebounceOptions,
  type DebouncedFunction,
} from './useDebounce';

// =============================================================================
// MEDIA QUERY / RESPONSIVE
// =============================================================================

export {
  useMediaQuery,
  useMobile,
  useTablet,
  useDesktop,
  useMinBreakpoint,
  useMaxBreakpoint,
  useBetweenBreakpoints,
  useBreakpoint,
  usePrefersReducedMotion,
  usePrefersDarkMode,
  BREAKPOINTS,
  type BreakpointKey,
  type BreakpointState,
  type UseMediaQueryOptions,
} from './useMediaQuery';

// =============================================================================
// CLIPBOARD
// =============================================================================

export {
  useCopyToClipboard,
  copyToClipboard,
  isClipboardSupported,
  type CopyStatus,
  type UseCopyToClipboardOptions,
  type UseCopyToClipboardReturn,
} from './useCopyToClipboard';

// =============================================================================
// BARCODE SCANNER
// =============================================================================

export {
  useBarcodeScanner,
  isCameraScanningSupported,
  getAvailableCameras,
  isValidBarcodeFormat,
  BARCODE_PATTERNS,
  type ScannerType,
  type ScannerStatus,
  type BarcodeFormat,
  type UseBarcodeScannerOptions,
  type UseBarcodeScannerReturn,
} from './useBarcodeScanner';

// =============================================================================
// REALTIME STATUS
// =============================================================================

export {
  useRealtimeStatus,
  getStatusMessage,
  getStatusColor,
  getQualityColor,
  type ConnectionStatus,
  type ConnectionQuality,
  type UseRealtimeStatusOptions,
  type UseRealtimeStatusReturn,
} from './useRealtimeStatus';

// =============================================================================
// NETWORK STATUS
// =============================================================================

export {
  useNetworkStatus,
  useIsOnline,
  useOnReconnect,
  getQualityLabel,
  getQualityColor as getNetworkQualityColor,
  formatOfflineDuration,
  type ConnectionType,
  type EffectiveConnectionType,
  type ConnectionQuality as NetworkConnectionQuality,
  type NetworkStatus,
  type UseNetworkStatusOptions,
  type UseNetworkStatusReturn,
} from './useNetworkStatus';
