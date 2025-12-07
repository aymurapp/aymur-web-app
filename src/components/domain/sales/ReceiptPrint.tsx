'use client';

/**
 * ReceiptPrint Component
 *
 * Wrapper component that handles printing the receipt.
 * Uses react-to-print for reliable cross-browser printing.
 *
 * Features:
 * - Print button with icon
 * - Opens browser print dialog
 * - Print preview support
 * - Automatic page sizing for 80mm thermal
 * - Fallback to window.print() if needed
 *
 * @module components/domain/sales/ReceiptPrint
 */

import React, { useRef } from 'react';

import { PrinterOutlined, LoadingOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import { useReactToPrint } from 'react-to-print';

import { Button } from '@/components/ui/Button';
import type { SaleWithDetails, SaleItemWithDetails } from '@/lib/hooks/data/useSale';
import type { ShopWithDetails } from '@/lib/hooks/shop/useShop';
import type { Tables } from '@/lib/types/database';

import { Receipt } from './Receipt';

// =============================================================================
// TYPES
// =============================================================================

type Customer = Tables<'customers'>;
type SalePayment = Tables<'sale_payments'>;

export interface ReceiptPrintProps {
  /** Sale data with full details */
  sale: SaleWithDetails;
  /** Shop information for header */
  shop: ShopWithDetails;
  /** Sale line items */
  items: SaleItemWithDetails[];
  /** Payment records */
  payments: SalePayment[];
  /** Customer info (optional for walk-in sales) */
  customer?: Customer | null;
  /** Whether to show barcode */
  showBarcode?: boolean;
  /** Custom thank you message */
  thankYouMessage?: string;
  /** Custom return policy text */
  returnPolicy?: string;
  /** Button size */
  buttonSize?: 'small' | 'middle' | 'large';
  /** Button type */
  buttonType?: 'default' | 'primary' | 'dashed' | 'link' | 'text';
  /** Show only icon (no text) */
  iconOnly?: boolean;
  /** Custom button text */
  buttonText?: string;
  /** Callback after print */
  onAfterPrint?: () => void;
  /** Callback before print */
  onBeforePrint?: () => Promise<void>;
  /** Additional class name for button */
  className?: string;
  /** Whether button is disabled */
  disabled?: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ReceiptPrint Component
 *
 * Renders a print button and handles the printing workflow.
 * The receipt is rendered hidden and revealed only for printing.
 */
export function ReceiptPrint({
  sale,
  shop,
  items,
  payments,
  customer,
  showBarcode,
  thankYouMessage,
  returnPolicy,
  buttonSize = 'middle',
  buttonType = 'default',
  iconOnly = false,
  buttonText,
  onAfterPrint,
  onBeforePrint,
  className,
  disabled = false,
}: ReceiptPrintProps): React.JSX.Element {
  const t = useTranslations('sales.receipt');

  // Reference to the receipt component for printing
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = React.useState(false);

  // Handle print using react-to-print
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Receipt-${sale.invoice_number}`,
    onBeforePrint: async () => {
      setIsPrinting(true);
      if (onBeforePrint) {
        await onBeforePrint();
      }
    },
    onAfterPrint: () => {
      setIsPrinting(false);
      if (onAfterPrint) {
        onAfterPrint();
      }
    },
    onPrintError: (error) => {
      setIsPrinting(false);
      console.error('Print error:', error);
    },
    // Page style for thermal printer
    pageStyle: `
      @page {
        size: 80mm auto;
        margin: 0;
      }
      @media print {
        html, body {
          margin: 0;
          padding: 0;
          width: 80mm;
        }
      }
    `,
  });

  // Determine button content
  const buttonContent = iconOnly ? null : buttonText || t('printReceipt');

  return (
    <>
      {/* Print Button */}
      <Button
        type={buttonType}
        size={buttonSize}
        icon={isPrinting ? <LoadingOutlined /> : <PrinterOutlined />}
        onClick={() => handlePrint()}
        disabled={disabled || isPrinting}
        className={className}
        title={iconOnly ? t('printReceipt') : undefined}
      >
        {buttonContent}
      </Button>

      {/* Hidden Receipt for Printing */}
      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '80mm',
          visibility: 'hidden',
        }}
        aria-hidden="true"
      >
        <Receipt
          ref={receiptRef}
          sale={sale}
          shop={shop}
          items={items}
          payments={payments}
          customer={customer}
          showBarcode={showBarcode}
          thankYouMessage={thankYouMessage}
          returnPolicy={returnPolicy}
        />
      </div>
    </>
  );
}

export default ReceiptPrint;
