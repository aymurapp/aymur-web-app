'use client';

/**
 * BarcodeScanner Component
 *
 * A comprehensive barcode scanning component supporting both hardware scanners
 * and camera-based scanning. Designed for inventory management in the jewelry
 * business platform.
 *
 * Features:
 * - Hardware scanner mode (keyboard input capture)
 * - Camera scanner mode (webcam barcode reading via html5-qrcode)
 * - Toggle between scanning modes
 * - Visual feedback when code is detected
 * - Sound feedback option (beep on scan)
 * - Auto-focusing input field for hardware scanner
 * - Camera view with overlay guides
 * - Loading state while camera initializes
 * - Error handling for camera permission denied
 * - RTL support for Arabic locale
 *
 * @module components/domain/inventory/BarcodeScanner
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import {
  ScanOutlined,
  CameraOutlined,
  CloseOutlined,
  SoundOutlined,
  AudioMutedOutlined,
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { Input, Alert, Spin, Segmented, Switch, Typography, Space } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  useBarcodeScanner,
  isCameraScanningSupported,
  type ScannerStatus,
} from '@/lib/hooks/utils/useBarcodeScanner';
import { cn } from '@/lib/utils/cn';

import type { InputRef } from 'antd';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Scanner mode types
 */
export type ScannerMode = 'hardware' | 'camera' | 'auto';

/**
 * Props for the BarcodeScanner component
 */
export interface BarcodeScannerProps {
  /**
   * Callback fired when a barcode is successfully scanned
   */
  onScan: (barcode: string) => void;

  /**
   * Callback fired on scanner error
   */
  onError?: (error: Error) => void;

  /**
   * Scanner mode
   * - 'hardware': Only keyboard input capture for hardware scanners
   * - 'camera': Only camera-based scanning
   * - 'auto': Both modes available with toggle (default)
   * @default 'auto'
   */
  mode?: ScannerMode;

  /**
   * Whether to auto-focus the input field for hardware scanner
   * @default true
   */
  autoFocus?: boolean;

  /**
   * Whether sound feedback is enabled by default
   * @default true
   */
  soundEnabled?: boolean;

  /**
   * Placeholder text for the input field
   */
  placeholder?: string;

  /**
   * Additional class name
   */
  className?: string;

  /**
   * Size variant
   * @default 'default'
   */
  size?: 'small' | 'default' | 'large';

  /**
   * Whether the scanner is disabled
   * @default false
   */
  disabled?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Beep audio data URL (short beep sound) */
const BEEP_AUDIO_DATA =
  'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' +
  'FvT19AAAAAAAEAAQABAAMCDQ0MCwoJCAcGBQQDAgEA';

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * BarcodeScanner Component
 *
 * Provides both hardware and camera-based barcode scanning capabilities
 * for inventory management operations.
 */
export function BarcodeScanner({
  onScan,
  onError,
  mode = 'auto',
  autoFocus = true,
  soundEnabled: initialSoundEnabled = true,
  placeholder,
  className,
  size = 'default',
  disabled = false,
}: BarcodeScannerProps): JSX.Element {
  const t = useTranslations();

  // ==========================================================================
  // STATE
  // ==========================================================================

  // Active scanner mode (for 'auto' mode)
  const [activeMode, setActiveMode] = useState<'hardware' | 'camera'>(
    mode === 'camera' ? 'camera' : 'hardware'
  );

  // Sound feedback toggle
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);

  // Manual input value for hardware mode
  const [inputValue, setInputValue] = useState('');

  // Visual feedback state
  const [showSuccess, setShowSuccess] = useState(false);

  // Camera support check
  const [cameraSupported, setCameraSupported] = useState<boolean | null>(null);

  // Input ref for auto-focus
  const inputRef = useRef<InputRef>(null);

  // Audio ref for beep sound
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ==========================================================================
  // HOOKS
  // ==========================================================================

  /**
   * Handle successful barcode scan
   */
  const handleScan = useCallback(
    (barcode: string) => {
      // Play beep sound if enabled
      if (soundEnabled && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          // Ignore audio play errors
        });
      }

      // Show visual feedback
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);

      // Clear input
      setInputValue('');

      // Call callback
      onScan(barcode);
    },
    [soundEnabled, onScan]
  );

  /**
   * Handle scanner error
   */
  const handleError = useCallback(
    (error: Error) => {
      onError?.(error);
    },
    [onError]
  );

  // Initialize barcode scanner hook
  const {
    isScanning,
    status,
    lastScanned,
    startCameraScanner,
    stopCameraScanner,
    cameraRef,
    error,
    reset,
  } = useBarcodeScanner({
    enabled: !disabled && (activeMode === 'camera' || mode !== 'camera'),
    onScan: handleScan,
    onError: handleError,
    scannerType: activeMode === 'camera' ? 'camera' : 'keyboard',
    minLength: 3,
    maxLength: 100,
    duplicateReadDelay: 1000,
  });

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Check camera support on mount
  useEffect(() => {
    setCameraSupported(isCameraScanningSupported());
  }, []);

  // Create audio element for beep sound
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(BEEP_AUDIO_DATA);
      audioRef.current.volume = 0.5;
    }

    return () => {
      audioRef.current = null;
    };
  }, []);

  // Auto-focus input on mount or mode change
  useEffect(() => {
    if (autoFocus && activeMode === 'hardware' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus, activeMode]);

  // Stop camera when switching to hardware mode
  useEffect(() => {
    if (activeMode === 'hardware' && isScanning) {
      stopCameraScanner();
    }
  }, [activeMode, isScanning, stopCameraScanner]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle mode toggle
   */
  const handleModeChange = useCallback(
    (value: string | number) => {
      const newMode = value as 'hardware' | 'camera';
      setActiveMode(newMode);
      reset();

      if (newMode === 'hardware') {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [reset]
  );

  /**
   * Handle manual input change
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  /**
   * Handle manual input submit (Enter key)
   */
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && inputValue.trim()) {
        e.preventDefault();
        handleScan(inputValue.trim());
      }
    },
    [inputValue, handleScan]
  );

  /**
   * Handle camera toggle
   */
  const handleCameraToggle = useCallback(() => {
    if (isScanning) {
      stopCameraScanner();
    } else {
      startCameraScanner();
    }
  }, [isScanning, startCameraScanner, stopCameraScanner]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    reset();
    if (activeMode === 'camera') {
      startCameraScanner();
    }
  }, [reset, activeMode, startCameraScanner]);

  // ==========================================================================
  // COMPUTED
  // ==========================================================================

  // Determine if mode toggle should be shown
  const showModeToggle = mode === 'auto' && cameraSupported;

  // Get input size mapping
  const inputSize = useMemo(() => {
    const sizeMap = {
      small: 'middle' as const,
      default: 'large' as const,
      large: 'large' as const,
    };
    return sizeMap[size];
  }, [size]);

  // Get status display info
  const statusInfo = useMemo(() => {
    const statusMap: Record<ScannerStatus, { color: string; icon: React.ReactNode; text: string }> =
      {
        idle: {
          color: 'text-stone-500',
          icon: <ScanOutlined />,
          text: t('scanner.ready'),
        },
        scanning: {
          color: 'text-green-600',
          icon: <LoadingOutlined spin />,
          text: t('scanner.scanning'),
        },
        error: {
          color: 'text-red-600',
          icon: <WarningOutlined />,
          text: t('scanner.error'),
        },
        permission_denied: {
          color: 'text-orange-600',
          icon: <WarningOutlined />,
          text: t('scanner.permissionDenied'),
        },
      };
    return statusMap[status] || statusMap.idle;
  }, [status, t]);

  // Use statusInfo to avoid unused variable warning (available for future status indicator UI)
  void statusInfo;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div
      className={cn(
        'flex flex-col gap-4 p-4 bg-white rounded-xl border border-stone-200',
        'shadow-sm',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {/* Header with Mode Toggle and Sound Toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Mode Toggle */}
        {showModeToggle && (
          <Segmented
            value={activeMode}
            onChange={handleModeChange}
            options={[
              {
                label: (
                  <span className="flex items-center gap-2">
                    <ScanOutlined />
                    <span className="hidden sm:inline">{t('scanner.hardware')}</span>
                  </span>
                ),
                value: 'hardware',
              },
              {
                label: (
                  <span className="flex items-center gap-2">
                    <CameraOutlined />
                    <span className="hidden sm:inline">{t('scanner.camera')}</span>
                  </span>
                ),
                value: 'camera',
              },
            ]}
            disabled={disabled}
          />
        )}

        {/* Sound Toggle */}
        <Space className="ms-auto">
          <Text type="secondary" className="text-sm">
            {soundEnabled ? <SoundOutlined /> : <AudioMutedOutlined />}
          </Text>
          <Switch
            size="small"
            checked={soundEnabled}
            onChange={setSoundEnabled}
            disabled={disabled}
          />
        </Space>
      </div>

      {/* Hardware Scanner Mode */}
      {activeMode === 'hardware' && (
        <div className="space-y-3">
          {/* Input Field */}
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder || t('scanner.scanOrEnter')}
            prefix={<ScanOutlined className="text-stone-400" />}
            suffix={
              inputValue ? (
                <CloseOutlined
                  className="text-stone-400 cursor-pointer hover:text-stone-600 transition-colors"
                  onClick={() => setInputValue('')}
                />
              ) : null
            }
            size={inputSize}
            disabled={disabled}
            className={cn(
              'transition-all duration-300',
              showSuccess && 'ring-2 ring-green-500 ring-offset-2'
            )}
            data-barcode-input
          />

          {/* Status and Hint */}
          <div className="flex items-center justify-between text-sm">
            <Text type="secondary">{t('scanner.hardwareHint')}</Text>
            {showSuccess && (
              <span className="flex items-center gap-1 text-green-600 animate-pulse">
                <CheckCircleOutlined />
                {t('scanner.scanned')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Camera Scanner Mode */}
      {activeMode === 'camera' && (
        <div className="space-y-3">
          {/* Camera View Container */}
          <div
            className={cn(
              'relative aspect-video bg-stone-900 rounded-lg overflow-hidden',
              'min-h-[200px] max-h-[400px]'
            )}
          >
            {/* Camera View */}
            <div
              ref={cameraRef}
              className={cn(
                'absolute inset-0',
                '[&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover'
              )}
            />

            {/* Scanning Overlay Guide */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Corner guides */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={cn(
                      'w-64 h-64 max-w-[80%] max-h-[80%] relative',
                      'border-2 border-amber-500/50 rounded-lg'
                    )}
                  >
                    {/* Animated scan line */}
                    <div
                      className={cn('absolute inset-x-0 h-0.5 bg-amber-500', 'animate-scan-line')}
                    />
                    {/* Corner markers */}
                    <div className="absolute -top-0.5 -start-0.5 w-6 h-6 border-t-2 border-s-2 border-amber-500 rounded-tl" />
                    <div className="absolute -top-0.5 -end-0.5 w-6 h-6 border-t-2 border-e-2 border-amber-500 rounded-tr" />
                    <div className="absolute -bottom-0.5 -start-0.5 w-6 h-6 border-b-2 border-s-2 border-amber-500 rounded-bl" />
                    <div className="absolute -bottom-0.5 -end-0.5 w-6 h-6 border-b-2 border-e-2 border-amber-500 rounded-br" />
                  </div>
                </div>

                {/* Status indicator */}
                <div className="absolute bottom-4 start-4 end-4 text-center">
                  <span
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-1.5',
                      'bg-black/60 backdrop-blur-sm rounded-full',
                      'text-white text-sm'
                    )}
                  >
                    <LoadingOutlined spin />
                    {t('scanner.pointAtBarcode')}
                  </span>
                </div>
              </div>
            )}

            {/* Loading State */}
            {status === 'scanning' && !isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-stone-900/80">
                <Spin size="large" tip={t('scanner.initializingCamera')} />
              </div>
            )}

            {/* Idle State (Camera Not Started) */}
            {!isScanning && status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900">
                <CameraOutlined className="text-5xl text-stone-600 mb-4" />
                <Text className="text-stone-400 mb-4">{t('scanner.cameraReady')}</Text>
                <Button
                  type="primary"
                  icon={<CameraOutlined />}
                  onClick={handleCameraToggle}
                  disabled={disabled}
                >
                  {t('scanner.startCamera')}
                </Button>
              </div>
            )}

            {/* Success Flash */}
            {showSuccess && (
              <div
                className={cn(
                  'absolute inset-0 bg-green-500/20',
                  'flex items-center justify-center',
                  'animate-pulse'
                )}
              >
                <CheckCircleOutlined className="text-6xl text-green-500" />
              </div>
            )}
          </div>

          {/* Camera Controls */}
          {isScanning && (
            <div className="flex items-center justify-center gap-3">
              <Button type="default" danger icon={<CloseOutlined />} onClick={stopCameraScanner}>
                {t('scanner.stopCamera')}
              </Button>
            </div>
          )}

          {/* Error State */}
          {(status === 'error' || status === 'permission_denied') && (
            <Alert
              type={status === 'permission_denied' ? 'warning' : 'error'}
              showIcon
              message={
                status === 'permission_denied'
                  ? t('scanner.permissionDeniedTitle')
                  : t('scanner.errorTitle')
              }
              description={
                status === 'permission_denied'
                  ? t('scanner.permissionDeniedDescription')
                  : error?.message || t('scanner.errorDescription')
              }
              action={
                <Button type="default" size="small" icon={<ReloadOutlined />} onClick={handleRetry}>
                  {t('common.actions.retry')}
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* Last Scanned Display */}
      {lastScanned && (
        <div
          className={cn('p-3 bg-stone-50 rounded-lg', 'flex items-center justify-between gap-3')}
        >
          <div className="flex items-center gap-2 min-w-0">
            <ScanOutlined className="text-amber-600 flex-shrink-0" />
            <Text ellipsis className="font-mono text-sm">
              {lastScanned}
            </Text>
          </div>
          <Text type="secondary" className="text-xs flex-shrink-0">
            {t('scanner.lastScanned')}
          </Text>
        </div>
      )}

      {/* Custom CSS for scan line animation */}
      <style jsx global>{`
        @keyframes scan-line {
          0% {
            top: 0;
          }
          50% {
            top: calc(100% - 2px);
          }
          100% {
            top: 0;
          }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

/**
 * Loading skeleton for BarcodeScanner
 */
export function BarcodeScannerSkeleton({
  size = 'default',
}: {
  size?: 'small' | 'default' | 'large';
}): JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-xl border border-stone-200 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-stone-200 rounded" />
        <div className="h-6 w-16 bg-stone-200 rounded" />
      </div>

      {/* Input skeleton */}
      <div
        className={cn(
          'bg-stone-200 rounded',
          size === 'small' ? 'h-8' : size === 'large' ? 'h-12' : 'h-10'
        )}
      />

      {/* Hint skeleton */}
      <div className="h-4 w-64 bg-stone-200 rounded" />
    </div>
  );
}

export default BarcodeScanner;
