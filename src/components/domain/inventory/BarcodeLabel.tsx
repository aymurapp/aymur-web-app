'use client';

/**
 * BarcodeLabel Component
 *
 * Printable barcode label for inventory items with multiple size options.
 * Designed for jewelry business inventory management with CODE128 format.
 *
 * Features:
 * - Multiple label sizes (small, medium, large)
 * - Configurable content display options
 * - Print-optimized CSS (black/white, no shadows)
 * - RTL support for Arabic locale
 * - JsBarcode for CODE128 barcode generation
 *
 * @module components/domain/inventory/BarcodeLabel
 */

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

import JsBarcode from 'jsbarcode';
import { useTranslations, useLocale } from 'next-intl';

import type { InventoryItemWithRelations } from '@/lib/hooks/data/useInventoryItems';
import { isRtlLocale, type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Label size options
 */
export type LabelSize = 'small' | 'medium' | 'large';

/**
 * Label dimension configurations in millimeters
 */
export interface LabelDimensions {
  width: number;
  height: number;
  barcodeWidth: number;
  barcodeHeight: number;
  fontSize: {
    name: number;
    sku: number;
    price: number;
    details: number;
  };
}

/**
 * Props for the BarcodeLabel component
 */
export interface BarcodeLabelProps {
  /** The inventory item to create a label for */
  item: InventoryItemWithRelations;
  /** Label size preset */
  size?: LabelSize;
  /** Show item name on label */
  showName?: boolean;
  /** Show SKU on label */
  showSku?: boolean;
  /** Show price on label */
  showPrice?: boolean;
  /** Show metal type and purity on label */
  showMetal?: boolean;
  /** Show weight on label */
  showWeight?: boolean;
  /** Currency for price display */
  currency?: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * Ref handle for BarcodeLabel component
 */
export interface BarcodeLabelRef {
  /** Get the label DOM element */
  getElement: () => HTMLDivElement | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Label dimension presets in millimeters
 */
const LABEL_DIMENSIONS: Record<LabelSize, LabelDimensions> = {
  small: {
    width: 25,
    height: 10,
    barcodeWidth: 1,
    barcodeHeight: 8,
    fontSize: {
      name: 5,
      sku: 4,
      price: 5,
      details: 3,
    },
  },
  medium: {
    width: 40,
    height: 20,
    barcodeWidth: 1.2,
    barcodeHeight: 15,
    fontSize: {
      name: 7,
      sku: 5,
      price: 7,
      details: 4,
    },
  },
  large: {
    width: 60,
    height: 30,
    barcodeWidth: 1.5,
    barcodeHeight: 20,
    fontSize: {
      name: 9,
      sku: 6,
      price: 9,
      details: 5,
    },
  },
};

// =============================================================================
// STYLES
// =============================================================================

/**
 * Print-optimized CSS for barcode labels
 */
const labelStyles = `
  .barcode-label {
    font-family: 'Arial', 'Helvetica Neue', sans-serif;
    background: #fff;
    color: #000;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .barcode-label-small {
    width: 25mm;
    height: 10mm;
    padding: 0.5mm;
  }

  .barcode-label-medium {
    width: 40mm;
    height: 20mm;
    padding: 1mm;
  }

  .barcode-label-large {
    width: 60mm;
    height: 30mm;
    padding: 1.5mm;
  }

  .barcode-label-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5mm;
  }

  .barcode-label-name {
    font-weight: 600;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .barcode-label-name-small { font-size: 5pt; }
  .barcode-label-name-medium { font-size: 7pt; }
  .barcode-label-name-large { font-size: 9pt; }

  .barcode-label-sku {
    font-size: 4pt;
    color: #333;
    text-align: center;
  }

  .barcode-label-sku-small { font-size: 4pt; }
  .barcode-label-sku-medium { font-size: 5pt; }
  .barcode-label-sku-large { font-size: 6pt; }

  .barcode-label-barcode {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0.5mm 0;
  }

  .barcode-label-barcode svg {
    display: block;
  }

  .barcode-label-barcode-small svg { height: 6mm; }
  .barcode-label-barcode-medium svg { height: 10mm; }
  .barcode-label-barcode-large svg { height: 14mm; }

  .barcode-label-details {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2mm;
    width: 100%;
  }

  .barcode-label-price {
    font-weight: 700;
    text-align: center;
  }

  .barcode-label-price-small { font-size: 5pt; }
  .barcode-label-price-medium { font-size: 7pt; }
  .barcode-label-price-large { font-size: 9pt; }

  .barcode-label-meta {
    font-size: 3pt;
    color: #666;
    text-align: center;
    display: flex;
    gap: 1mm;
  }

  .barcode-label-meta-small { font-size: 3pt; }
  .barcode-label-meta-medium { font-size: 4pt; }
  .barcode-label-meta-large { font-size: 5pt; }

  .barcode-label-fallback {
    font-family: 'Courier New', monospace;
    font-size: 6pt;
    letter-spacing: 1px;
    text-align: center;
    border: 1px solid #000;
    padding: 1mm;
  }

  /* RTL Support */
  .barcode-label[dir="rtl"] {
    direction: rtl;
  }

  .barcode-label[dir="rtl"] .barcode-label-details {
    flex-direction: row-reverse;
  }

  /* Print-specific styles */
  @media print {
    .barcode-label {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }

    .barcode-label-barcode svg {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price with currency
 */
function formatPrice(
  price: number | null | undefined,
  currency: string = 'USD',
  locale: string = 'en'
): string {
  if (price === null || price === undefined) {
    return '-';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Format weight in grams
 */
function formatWeight(weightGrams: number | null | undefined): string {
  if (weightGrams === null || weightGrams === undefined) {
    return '-';
  }
  return `${weightGrams.toFixed(2)}g`;
}

/**
 * Truncate text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 1) + '...';
}

/**
 * Get max name length based on label size
 */
function getMaxNameLength(size: LabelSize): number {
  switch (size) {
    case 'small':
      return 15;
    case 'medium':
      return 25;
    case 'large':
      return 40;
    default:
      return 25;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * BarcodeLabel Component
 *
 * Renders a printable barcode label for an inventory item.
 * Supports multiple sizes and configurable content display.
 */
export const BarcodeLabel = forwardRef<BarcodeLabelRef, BarcodeLabelProps>(function BarcodeLabel(
  {
    item,
    size = 'medium',
    showName = true,
    showSku = true,
    showPrice = true,
    showMetal = false,
    showWeight = false,
    currency = 'USD',
    className,
  },
  ref
) {
  const t = useTranslations('inventory');
  const locale = useLocale() as Locale;
  const isRtl = isRtlLocale(locale);

  const labelRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

  // Expose ref methods
  useImperativeHandle(ref, () => ({
    getElement: () => labelRef.current,
  }));

  // Get barcode value (prefer barcode, fallback to SKU)
  const barcodeValue = item.barcode || item.sku || item.id_item;
  const hasBarcodeValue = Boolean(barcodeValue);

  // Generate barcode using JsBarcode
  useEffect(() => {
    if (barcodeRef.current && hasBarcodeValue) {
      try {
        JsBarcode(barcodeRef.current, barcodeValue!, {
          format: 'CODE128',
          width: LABEL_DIMENSIONS[size].barcodeWidth,
          height: LABEL_DIMENSIONS[size].barcodeHeight,
          displayValue: false, // We show the value separately
          margin: 0,
          background: 'transparent',
          lineColor: '#000000',
        });
      } catch (error) {
        // Barcode generation failed, will show fallback
        console.error('Barcode generation failed:', error);
      }
    }
  }, [barcodeValue, hasBarcodeValue, size]);

  // Get display values
  const itemName = item.item_name || t('labels.untitled');
  const truncatedName = truncateText(itemName, getMaxNameLength(size));
  const sku = item.sku || '-';
  const price = formatPrice(item.purchase_price, currency, locale);
  const weight = formatWeight(item.weight_grams);
  const metalType = item.metal_type?.metal_name || '';
  const purity = item.metal_purity?.purity_name || '';
  const metalInfo = [metalType, purity].filter(Boolean).join(' ');

  return (
    <>
      {/* Inject label styles */}
      <style>{labelStyles}</style>

      <div
        ref={labelRef}
        className={cn('barcode-label', `barcode-label-${size}`, className)}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="barcode-label-content">
          {/* Item Name */}
          {showName && (
            <div
              className={cn('barcode-label-name', `barcode-label-name-${size}`)}
              title={itemName}
            >
              {truncatedName}
            </div>
          )}

          {/* SKU */}
          {showSku && (
            <div className={cn('barcode-label-sku', `barcode-label-sku-${size}`)}>{sku}</div>
          )}

          {/* Barcode */}
          <div className={cn('barcode-label-barcode', `barcode-label-barcode-${size}`)}>
            {hasBarcodeValue ? (
              <svg ref={barcodeRef} />
            ) : (
              <div className="barcode-label-fallback">{t('labels.noBarcode')}</div>
            )}
          </div>

          {/* Details Row - Price, Metal, Weight */}
          <div className="barcode-label-details">
            {showPrice && (
              <div className={cn('barcode-label-price', `barcode-label-price-${size}`)}>
                {price}
              </div>
            )}

            {(showMetal || showWeight) && (
              <div className={cn('barcode-label-meta', `barcode-label-meta-${size}`)}>
                {showMetal && metalInfo && <span>{metalInfo}</span>}
                {showWeight && <span>{weight}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

// =============================================================================
// SKELETON VARIANT
// =============================================================================

/**
 * Loading skeleton variant of BarcodeLabel
 */
export function BarcodeLabelSkeleton({ size = 'medium' }: { size?: LabelSize }): JSX.Element {
  return (
    <div
      className={cn(
        'bg-stone-100 animate-pulse flex flex-col items-center justify-center',
        size === 'small' && 'w-[25mm] h-[10mm]',
        size === 'medium' && 'w-[40mm] h-[20mm]',
        size === 'large' && 'w-[60mm] h-[30mm]'
      )}
    >
      <div className="w-3/4 h-1.5 bg-stone-200 rounded mb-1" />
      <div className="w-1/2 h-1 bg-stone-200 rounded mb-2" />
      <div
        className={cn(
          'bg-stone-200 rounded',
          size === 'small' && 'w-[18mm] h-[4mm]',
          size === 'medium' && 'w-[30mm] h-[8mm]',
          size === 'large' && 'w-[45mm] h-[12mm]'
        )}
      />
      <div className="w-1/3 h-1 bg-stone-200 rounded mt-1" />
    </div>
  );
}

export default BarcodeLabel;
