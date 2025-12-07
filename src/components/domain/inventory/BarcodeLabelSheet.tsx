'use client';

/**
 * BarcodeLabelSheet Component
 *
 * Sheet layout for printing multiple barcode labels.
 * Supports standard label sheet formats (Avery compatible).
 *
 * Features:
 * - Grid layout for multiple labels
 * - Page breaks for multi-page printing
 * - Standard label sheet format support (Avery 5160, 5162, etc.)
 * - Print-optimized CSS with no margins
 * - RTL support
 *
 * @module components/domain/inventory/BarcodeLabelSheet
 */

import React, { forwardRef, useMemo } from 'react';

import { useTranslations, useLocale } from 'next-intl';

import type { InventoryItemWithRelations } from '@/lib/hooks/data/useInventoryItems';
import { isRtlLocale, type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';

import { BarcodeLabel, BarcodeLabelSkeleton } from './BarcodeLabel';

import type { LabelSize } from './BarcodeLabel';
import type { LabelContentOptions } from './BarcodeLabelPreview';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Standard label sheet format presets
 */
export type LabelSheetFormat =
  | 'avery_5160' // 30 labels (3x10), 1" x 2-5/8"
  | 'avery_5162' // 14 labels (2x7), 1-1/3" x 4"
  | 'avery_5163' // 10 labels (2x5), 2" x 4"
  | 'avery_5164' // 6 labels (2x3), 3-1/3" x 4"
  | 'custom_small' // For 25x10mm labels
  | 'custom_medium' // For 40x20mm labels
  | 'custom_large'; // For 60x30mm labels

/**
 * Sheet format configuration
 */
export interface SheetFormatConfig {
  /** Labels per row */
  columns: number;
  /** Labels per column (rows per page) */
  rows: number;
  /** Total labels per page */
  labelsPerPage: number;
  /** Sheet width in mm */
  sheetWidth: number;
  /** Sheet height in mm */
  sheetHeight: number;
  /** Gap between labels horizontally in mm */
  gapX: number;
  /** Gap between labels vertically in mm */
  gapY: number;
  /** Margin left in mm */
  marginLeft: number;
  /** Margin top in mm */
  marginTop: number;
}

/**
 * Item with quantity for printing
 */
export interface LabelPrintItem {
  item: InventoryItemWithRelations;
  quantity: number;
}

/**
 * Props for the BarcodeLabelSheet component
 */
export interface BarcodeLabelSheetProps {
  /** Items to print with quantities */
  items: LabelPrintItem[];
  /** Label size */
  size?: LabelSize;
  /** Sheet format preset */
  format?: LabelSheetFormat;
  /** Custom format configuration (overrides preset) */
  customFormat?: Partial<SheetFormatConfig>;
  /** Content display options */
  contentOptions?: LabelContentOptions;
  /** Currency for price display */
  currency?: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * Ref handle for BarcodeLabelSheet
 */
export interface BarcodeLabelSheetRef {
  /** Get the sheet DOM element */
  getElement: () => HTMLDivElement | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Standard sheet format configurations
 */
const SHEET_FORMATS: Record<LabelSheetFormat, SheetFormatConfig> = {
  // Avery 5160 - Address labels
  avery_5160: {
    columns: 3,
    rows: 10,
    labelsPerPage: 30,
    sheetWidth: 216, // 8.5" in mm
    sheetHeight: 279, // 11" in mm
    gapX: 3,
    gapY: 0,
    marginLeft: 5,
    marginTop: 12.7,
  },
  // Avery 5162 - Address labels (larger)
  avery_5162: {
    columns: 2,
    rows: 7,
    labelsPerPage: 14,
    sheetWidth: 216,
    sheetHeight: 279,
    gapX: 5,
    gapY: 0,
    marginLeft: 4,
    marginTop: 21,
  },
  // Avery 5163 - Shipping labels
  avery_5163: {
    columns: 2,
    rows: 5,
    labelsPerPage: 10,
    sheetWidth: 216,
    sheetHeight: 279,
    gapX: 5,
    gapY: 0,
    marginLeft: 4,
    marginTop: 12.7,
  },
  // Avery 5164 - Shipping labels (large)
  avery_5164: {
    columns: 2,
    rows: 3,
    labelsPerPage: 6,
    sheetWidth: 216,
    sheetHeight: 279,
    gapX: 5,
    gapY: 0,
    marginLeft: 4,
    marginTop: 12.7,
  },
  // Custom format for small labels (25x10mm)
  custom_small: {
    columns: 8,
    rows: 27,
    labelsPerPage: 216,
    sheetWidth: 210, // A4 width
    sheetHeight: 297, // A4 height
    gapX: 1,
    gapY: 1,
    marginLeft: 2.5,
    marginTop: 3.5,
  },
  // Custom format for medium labels (40x20mm)
  custom_medium: {
    columns: 5,
    rows: 14,
    labelsPerPage: 70,
    sheetWidth: 210,
    sheetHeight: 297,
    gapX: 2,
    gapY: 1,
    marginLeft: 3,
    marginTop: 4,
  },
  // Custom format for large labels (60x30mm)
  custom_large: {
    columns: 3,
    rows: 9,
    labelsPerPage: 27,
    sheetWidth: 210,
    sheetHeight: 297,
    gapX: 3,
    gapY: 3,
    marginLeft: 5,
    marginTop: 5,
  },
};

/**
 * Map label sizes to recommended sheet formats
 */
const SIZE_TO_FORMAT: Record<LabelSize, LabelSheetFormat> = {
  small: 'custom_small',
  medium: 'custom_medium',
  large: 'custom_large',
};

// =============================================================================
// STYLES
// =============================================================================

/**
 * Print-optimized CSS for label sheets
 */
const sheetStyles = `
  .barcode-label-sheet {
    background: #fff;
    box-sizing: border-box;
  }

  .barcode-label-sheet-page {
    width: 210mm;
    min-height: 297mm;
    padding: 0;
    margin: 0;
    background: #fff;
    page-break-after: always;
    break-after: page;
    box-sizing: border-box;
    position: relative;
  }

  .barcode-label-sheet-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .barcode-label-sheet-grid {
    display: grid;
    box-sizing: border-box;
  }

  .barcode-label-sheet-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    overflow: hidden;
  }

  /* Print-specific styles */
  @media print {
    @page {
      size: A4;
      margin: 0;
    }

    html, body {
      margin: 0;
      padding: 0;
    }

    .barcode-label-sheet {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }

    .barcode-label-sheet-page {
      width: 210mm;
      height: 297mm;
      page-break-after: always;
      page-break-inside: avoid;
    }

    .barcode-label-sheet-page:last-child {
      page-break-after: auto;
    }

    /* Hide everything except the sheet when printing */
    body > *:not(.barcode-label-sheet-print-wrapper) {
      display: none !important;
    }
  }

  /* Preview mode styles */
  .barcode-label-sheet-preview .barcode-label-sheet-page {
    border: 1px solid #ddd;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
  }

  .barcode-label-sheet-preview .barcode-label-sheet-cell {
    border: 1px dashed #eee;
  }
`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get format configuration based on size and preset
 */
function getFormatConfig(
  size: LabelSize,
  format?: LabelSheetFormat,
  customFormat?: Partial<SheetFormatConfig>
): SheetFormatConfig {
  // Use specified format, or auto-select based on size
  const baseFormat = format || SIZE_TO_FORMAT[size];
  const config = { ...SHEET_FORMATS[baseFormat] };

  // Apply custom overrides
  if (customFormat) {
    Object.assign(config, customFormat);
  }

  return config;
}

/**
 * Expand items with quantities into flat array of labels
 */
function expandItems(items: LabelPrintItem[]): InventoryItemWithRelations[] {
  const expanded: InventoryItemWithRelations[] = [];

  for (const { item, quantity } of items) {
    for (let i = 0; i < quantity; i++) {
      expanded.push(item);
    }
  }

  return expanded;
}

/**
 * Split array into chunks
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * BarcodeLabelSheet Component
 *
 * Renders a printable sheet layout with multiple barcode labels.
 * Handles pagination and page breaks automatically.
 */
export const BarcodeLabelSheet = forwardRef<HTMLDivElement, BarcodeLabelSheetProps>(
  function BarcodeLabelSheet(
    {
      items,
      size = 'medium',
      format,
      customFormat,
      contentOptions = {
        showName: true,
        showSku: true,
        showPrice: true,
        showMetal: false,
        showWeight: false,
      },
      currency = 'USD',
      className,
    },
    ref
  ) {
    const t = useTranslations('inventory.barcodeLabel');
    const locale = useLocale() as Locale;
    const isRtl = isRtlLocale(locale);

    // Get format configuration
    const formatConfig = useMemo(
      () => getFormatConfig(size, format, customFormat),
      [size, format, customFormat]
    );

    // Expand items into flat array and split into pages
    const expandedItems = useMemo(() => expandItems(items), [items]);
    const pages = useMemo(
      () => chunkArray(expandedItems, formatConfig.labelsPerPage),
      [expandedItems, formatConfig.labelsPerPage]
    );

    // Calculate grid styles
    const gridStyle = useMemo(
      () => ({
        gridTemplateColumns: `repeat(${formatConfig.columns}, 1fr)`,
        gridTemplateRows: `repeat(${formatConfig.rows}, 1fr)`,
        gap: `${formatConfig.gapY}mm ${formatConfig.gapX}mm`,
        paddingLeft: `${formatConfig.marginLeft}mm`,
        paddingTop: `${formatConfig.marginTop}mm`,
        paddingRight: `${formatConfig.marginLeft}mm`,
        paddingBottom: `${formatConfig.marginTop}mm`,
      }),
      [formatConfig]
    );

    // No items case
    if (items.length === 0 || expandedItems.length === 0) {
      return (
        <div
          ref={ref}
          className={cn('barcode-label-sheet flex items-center justify-center', className)}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <p className="text-stone-500">{t('noLabels')}</p>
        </div>
      );
    }

    return (
      <>
        {/* Inject sheet styles */}
        <style>{sheetStyles}</style>

        <div ref={ref} className={cn('barcode-label-sheet', className)} dir={isRtl ? 'rtl' : 'ltr'}>
          {pages.map((pageItems, pageIndex) => (
            <div key={pageIndex} className="barcode-label-sheet-page">
              <div className="barcode-label-sheet-grid" style={gridStyle}>
                {/* Render labels for this page */}
                {pageItems.map((item, labelIndex) => (
                  <div
                    key={`${pageIndex}-${labelIndex}-${item.id_item}`}
                    className="barcode-label-sheet-cell"
                  >
                    <BarcodeLabel
                      item={item}
                      size={size}
                      showName={contentOptions.showName}
                      showSku={contentOptions.showSku}
                      showPrice={contentOptions.showPrice}
                      showMetal={contentOptions.showMetal}
                      showWeight={contentOptions.showWeight}
                      currency={currency}
                    />
                  </div>
                ))}

                {/* Fill remaining cells with empty placeholders for consistent grid */}
                {Array.from({
                  length: formatConfig.labelsPerPage - pageItems.length,
                }).map((_, emptyIndex) => (
                  <div
                    key={`empty-${pageIndex}-${emptyIndex}`}
                    className="barcode-label-sheet-cell"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }
);

// =============================================================================
// SKELETON VARIANT
// =============================================================================

/**
 * Loading skeleton variant of BarcodeLabelSheet
 */
export function BarcodeLabelSheetSkeleton({
  size = 'medium',
  labelsCount = 6,
}: {
  size?: LabelSize;
  labelsCount?: number;
}): JSX.Element {
  const formatConfig = getFormatConfig(size);
  const displayCount = Math.min(labelsCount, formatConfig.columns * 3);

  return (
    <div className="barcode-label-sheet-preview">
      <div className="barcode-label-sheet-page p-4">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${formatConfig.columns}, 1fr)`,
          }}
        >
          {Array.from({ length: displayCount }).map((_, i) => (
            <div key={i} className="flex items-center justify-center">
              <BarcodeLabelSkeleton size={size} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BarcodeLabelSheet;
