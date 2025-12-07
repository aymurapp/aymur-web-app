'use client';

/**
 * BarcodeScannerModal Component
 *
 * Modal wrapper for the BarcodeScanner component with additional features:
 * - Full-screen camera view on mobile devices
 * - Close button and cancel action
 * - Recent scans history (last 5)
 * - Manual entry fallback input
 * - Responsive design with RTL support
 *
 * @module components/domain/inventory/BarcodeScannerModal
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
  ScanOutlined,
  CloseOutlined,
  HistoryOutlined,
  DeleteOutlined,
  SearchOutlined,
  CheckOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { Input, List, Typography, Divider, Empty, message, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils/cn';

import { BarcodeScanner, type ScannerMode } from './BarcodeScanner';

const { Text, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Recent scan entry
 */
export interface RecentScan {
  /** The scanned barcode value */
  barcode: string;
  /** Timestamp of the scan */
  timestamp: Date;
}

/**
 * Props for the BarcodeScannerModal component
 */
export interface BarcodeScannerModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean;

  /**
   * Callback when modal is closed
   */
  onClose: () => void;

  /**
   * Callback when a barcode is scanned or manually entered
   */
  onScan: (barcode: string) => void;

  /**
   * Modal title
   */
  title?: string;

  /**
   * Default scanner mode
   * @default 'auto'
   */
  mode?: ScannerMode;

  /**
   * Maximum number of recent scans to keep
   * @default 5
   */
  maxRecentScans?: number;

  /**
   * Whether to show recent scans history
   * @default true
   */
  showHistory?: boolean;

  /**
   * Whether to show manual entry input
   * @default true
   */
  showManualEntry?: boolean;

  /**
   * Whether to close modal after successful scan
   * @default false
   */
  closeOnScan?: boolean;

  /**
   * Additional class name for the modal content
   */
  className?: string;

  /**
   * Modal width
   * @default 600
   */
  width?: number | string;

  /**
   * Whether to use full screen on mobile
   * @default true
   */
  fullScreenOnMobile?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default max recent scans */
const DEFAULT_MAX_RECENT_SCANS = 5;

/** Local storage key for recent scans */
const RECENT_SCANS_STORAGE_KEY = 'aymur-barcode-recent-scans';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Load recent scans from local storage
 */
function loadRecentScans(): RecentScan[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(RECENT_SCANS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((item: { barcode: string; timestamp: string }) => ({
        barcode: item.barcode,
        timestamp: new Date(item.timestamp),
      }));
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Save recent scans to local storage
 */
function saveRecentScans(scans: RecentScan[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const serialized = scans.map((scan) => ({
      barcode: scan.barcode,
      timestamp: scan.timestamp.toISOString(),
    }));
    localStorage.setItem(RECENT_SCANS_STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  // More than 24 hours - show date
  return date.toLocaleDateString();
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * BarcodeScannerModal Component
 *
 * Full-featured modal for barcode scanning with history and manual entry.
 */
export function BarcodeScannerModal({
  open,
  onClose,
  onScan,
  title,
  mode = 'auto',
  maxRecentScans = DEFAULT_MAX_RECENT_SCANS,
  showHistory = true,
  showManualEntry = true,
  closeOnScan = false,
  className,
  width = 600,
  fullScreenOnMobile = true,
}: BarcodeScannerModalProps): JSX.Element {
  const t = useTranslations();

  // ==========================================================================
  // STATE
  // ==========================================================================

  // Recent scans history
  const [recentScans, setRecentScans] = useState<RecentScan[]>(() => loadRecentScans());

  // Manual entry input
  const [manualInput, setManualInput] = useState('');

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle barcode scan (from scanner or manual entry)
   */
  const handleScan = useCallback(
    (barcode: string) => {
      // Add to recent scans
      const newScan: RecentScan = {
        barcode,
        timestamp: new Date(),
      };

      setRecentScans((prev) => {
        // Remove duplicate if exists
        const filtered = prev.filter((s) => s.barcode !== barcode);
        // Add new scan at the beginning
        const updated = [newScan, ...filtered].slice(0, maxRecentScans);
        // Save to local storage
        saveRecentScans(updated);
        return updated;
      });

      // Call parent callback
      onScan(barcode);

      // Close modal if configured
      if (closeOnScan) {
        onClose();
      }

      // Show success message
      message.success(t('scanner.barcodeScanned', { barcode }));
    },
    [maxRecentScans, onScan, closeOnScan, onClose, t]
  );

  /**
   * Handle manual entry submit
   */
  const handleManualSubmit = useCallback(() => {
    const trimmed = manualInput.trim();
    if (trimmed) {
      handleScan(trimmed);
      setManualInput('');
    }
  }, [manualInput, handleScan]);

  /**
   * Handle manual entry key press
   */
  const handleManualKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleManualSubmit();
      }
    },
    [handleManualSubmit]
  );

  /**
   * Handle selecting a recent scan
   */
  const handleSelectRecent = useCallback(
    (barcode: string) => {
      handleScan(barcode);
    },
    [handleScan]
  );

  /**
   * Handle removing a recent scan
   */
  const handleRemoveRecent = useCallback((barcode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentScans((prev) => {
      const updated = prev.filter((s) => s.barcode !== barcode);
      saveRecentScans(updated);
      return updated;
    });
  }, []);

  /**
   * Handle copying barcode to clipboard
   */
  const handleCopyBarcode = useCallback(
    async (barcode: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(barcode);
        message.success(t('common.messages.copied'));
      } catch {
        message.error(t('common.messages.copyFailed'));
      }
    },
    [t]
  );

  /**
   * Handle clearing all recent scans
   */
  const handleClearHistory = useCallback(() => {
    setRecentScans([]);
    saveRecentScans([]);
    message.success(t('scanner.historyCleared'));
  }, [t]);

  /**
   * Handle scanner error
   */
  const handleError = useCallback(
    (error: Error) => {
      message.error(error.message || t('scanner.scanError'));
    },
    [t]
  );

  // ==========================================================================
  // COMPUTED
  // ==========================================================================

  // Modal responsive classes
  const modalClasses = useMemo(
    () =>
      cn(
        // Full screen on mobile
        fullScreenOnMobile && [
          '[&_.ant-modal]:!w-full [&_.ant-modal]:!max-w-full [&_.ant-modal]:!m-0 [&_.ant-modal]:!top-0',
          '[&_.ant-modal-content]:!rounded-none [&_.ant-modal-content]:!h-screen',
          'sm:[&_.ant-modal]:!w-auto sm:[&_.ant-modal]:!max-w-[600px] sm:[&_.ant-modal]:!m-auto sm:[&_.ant-modal]:!top-[100px]',
          'sm:[&_.ant-modal-content]:!rounded-xl sm:[&_.ant-modal-content]:!h-auto',
        ],
        className
      ),
    [fullScreenOnMobile, className]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <span className="flex items-center gap-2">
          <ScanOutlined className="text-amber-600" />
          {title || t('scanner.title')}
        </span>
      }
      width={width}
      hideFooter
      className={modalClasses}
      destroyOnClose
    >
      <div className="flex flex-col gap-6">
        {/* Barcode Scanner */}
        <BarcodeScanner
          onScan={handleScan}
          onError={handleError}
          mode={mode}
          autoFocus
          soundEnabled
        />

        {/* Manual Entry */}
        {showManualEntry && (
          <div className="space-y-2">
            <Divider className="!my-0">
              <Text type="secondary" className="text-xs">
                {t('scanner.orEnterManually')}
              </Text>
            </Divider>

            <div className="flex gap-2">
              <Input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={handleManualKeyDown}
                placeholder={t('scanner.manualEntryPlaceholder')}
                prefix={<SearchOutlined className="text-stone-400" />}
                suffix={
                  manualInput && (
                    <CloseOutlined
                      className="text-stone-400 cursor-pointer hover:text-stone-600"
                      onClick={() => setManualInput('')}
                    />
                  )
                }
                size="large"
                className="flex-1"
              />
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleManualSubmit}
                disabled={!manualInput.trim()}
                size="large"
              >
                {t('common.actions.submit')}
              </Button>
            </div>
          </div>
        )}

        {/* Recent Scans History */}
        {showHistory && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Title level={5} className="!m-0 flex items-center gap-2">
                <HistoryOutlined className="text-stone-500" />
                {t('scanner.recentScans')}
              </Title>
              {recentScans.length > 0 && (
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleClearHistory}
                >
                  {t('common.actions.clear')}
                </Button>
              )}
            </div>

            {recentScans.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('scanner.noRecentScans')}
                className="!my-4"
              />
            ) : (
              <List
                size="small"
                bordered
                className="rounded-lg bg-stone-50 max-h-48 overflow-auto"
                dataSource={recentScans}
                renderItem={(scan) => (
                  <List.Item
                    className={cn(
                      'cursor-pointer hover:bg-stone-100 transition-colors',
                      '!px-3 !py-2'
                    )}
                    onClick={() => handleSelectRecent(scan.barcode)}
                    actions={[
                      <Tooltip key="copy" title={t('common.actions.copy')}>
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={(e) => handleCopyBarcode(scan.barcode, e)}
                          className="text-stone-400 hover:text-amber-600"
                        />
                      </Tooltip>,
                      <Tooltip key="remove" title={t('common.actions.remove')}>
                        <Button
                          type="text"
                          size="small"
                          icon={<CloseOutlined />}
                          onClick={(e) => handleRemoveRecent(scan.barcode, e)}
                          className="text-stone-400 hover:text-red-600"
                        />
                      </Tooltip>,
                    ]}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <ScanOutlined className="text-amber-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <Text strong ellipsis className="font-mono text-sm block">
                          {scan.barcode}
                        </Text>
                      </div>
                      <Text type="secondary" className="text-xs flex-shrink-0">
                        {formatTimestamp(scan.timestamp)}
                      </Text>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end pt-2 border-t border-stone-200">
          <Button type="default" onClick={onClose}>
            {t('common.actions.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default BarcodeScannerModal;
