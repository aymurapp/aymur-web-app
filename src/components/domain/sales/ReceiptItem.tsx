'use client';

/**
 * ReceiptItem Component
 *
 * Individual line item row for the receipt.
 * Optimized for 80mm thermal printer width with monospace font.
 *
 * Features:
 * - Compact layout for thermal printers
 * - Item name (truncated if necessary)
 * - Quantity and unit price
 * - Line total aligned to the right
 * - Jewelry-specific: weight and purity info
 *
 * @module components/domain/sales/ReceiptItem
 */

import React from 'react';

import type { SaleItemWithDetails } from '@/lib/hooks/data/useSale';
import type { Locale } from '@/lib/i18n/routing';
import { formatCurrency, truncateText } from '@/lib/utils/format';

// =============================================================================
// TYPES
// =============================================================================

export interface ReceiptItemProps {
  /** Sale item data to display */
  item: SaleItemWithDetails;
  /** Currency code for formatting */
  currency: string;
  /** Current locale for formatting */
  locale: Locale;
  /** Whether the receipt is RTL layout */
  isRtl?: boolean;
  /** Maximum characters for item name before truncation */
  maxNameLength?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format item metal info (e.g., "18K Gold 5.2g")
 */
function formatMetalInfo(item: SaleItemWithDetails): string | null {
  const metalParts: string[] = [];

  // Add purity (e.g., "18K")
  if (item.inventory_item?.metal_purity?.purity_name) {
    metalParts.push(item.inventory_item.metal_purity.purity_name);
  }

  // Add metal type (e.g., "Gold")
  if (item.inventory_item?.metal_type?.metal_name) {
    metalParts.push(item.inventory_item.metal_type.metal_name);
  }

  // Add weight
  if (item.inventory_item?.weight_grams) {
    metalParts.push(`${item.inventory_item.weight_grams}g`);
  }

  return metalParts.length > 0 ? metalParts.join(' ') : null;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ReceiptItem Component
 *
 * Displays a single line item on the receipt in a print-optimized format.
 */
export function ReceiptItem({
  item,
  currency,
  locale,
  isRtl = false,
  maxNameLength = 28,
}: ReceiptItemProps): React.JSX.Element {
  // Get display values - item_name comes from inventory_item, DB field is line_total (not total_price)
  const itemName = item.inventory_item?.item_name || 'Unknown Item';
  const truncatedName = truncateText(itemName, maxNameLength);
  const unitPrice = Number(item.unit_price || 0);
  const lineTotal = Number(item.line_total || unitPrice);
  const metalInfo = formatMetalInfo(item);

  // Format currency values - for receipt we use minimal formatting
  const formattedUnitPrice = formatCurrency(unitPrice, currency, locale);
  const formattedTotal = formatCurrency(lineTotal, currency, locale);

  return (
    <div
      className="receipt-item"
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '11px',
        lineHeight: '1.4',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      {/* Item name row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <span
          style={{
            flex: 1,
            fontWeight: 500,
            paddingInlineEnd: '8px',
            wordBreak: 'break-word',
          }}
        >
          {truncatedName}
        </span>
        <span
          style={{
            fontWeight: 600,
            whiteSpace: 'nowrap',
            textAlign: isRtl ? 'left' : 'right',
          }}
        >
          {formattedTotal}
        </span>
      </div>

      {/* Quantity and price row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: '#666',
          fontSize: '10px',
          paddingInlineStart: '8px',
        }}
      >
        <span>1 x {formattedUnitPrice}</span>
        {item.discount_amount && Number(item.discount_amount) > 0 && (
          <span style={{ color: '#888' }}>
            (-{formatCurrency(Number(item.discount_amount), currency, locale)})
          </span>
        )}
      </div>

      {/* Metal info row (jewelry specific) */}
      {metalInfo && (
        <div
          style={{
            color: '#888',
            fontSize: '9px',
            paddingInlineStart: '8px',
          }}
        >
          {metalInfo}
        </div>
      )}

      {/* SKU/Barcode row if available */}
      {(item.inventory_item?.sku || item.inventory_item?.barcode) && (
        <div
          style={{
            color: '#999',
            fontSize: '8px',
            paddingInlineStart: '8px',
          }}
        >
          {item.inventory_item.sku || item.inventory_item.barcode}
        </div>
      )}
    </div>
  );
}

export default ReceiptItem;
