'use client';

/**
 * Receipt Component
 *
 * Print-optimized receipt layout for completed sales.
 * Designed for 80mm thermal printer paper width.
 *
 * Features:
 * - Shop header with logo, name, address, contact
 * - Sale info: receipt number, date/time, cashier
 * - Items section with jewelry-specific details
 * - Totals: subtotal, discount, tax, grand total
 * - Payment section with method(s) and change
 * - Footer with thank you message and policy
 * - RTL support for Arabic
 * - Print media CSS for thermal printers
 *
 * @module components/domain/sales/Receipt
 */

import React, { forwardRef } from 'react';

import { useTranslations, useLocale } from 'next-intl';

import type { SaleWithDetails, SaleItemWithDetails } from '@/lib/hooks/data/useSale';
import type { ShopWithDetails } from '@/lib/hooks/shop/useShop';
import { isRtlLocale, type Locale } from '@/lib/i18n/routing';
import type { Tables } from '@/lib/types/database';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';

import { ReceiptItem } from './ReceiptItem';

// =============================================================================
// TYPES
// =============================================================================

type Customer = Tables<'customers'>;
type SalePayment = Tables<'sale_payments'>;

/**
 * Extended shop info for receipt display
 * Fields aligned with shops table schema: shop_logo, shop_name, currency, language, timezone
 * Note: The database shops table does NOT have address, phone, tax_id, website fields
 * Those would come from shop_settings if needed
 */
export interface ReceiptShopInfo {
  shop_name: string;
  /** Shop logo URL - database field is shop_logo */
  shop_logo?: string | null;
  currency?: string;
}

export interface ReceiptProps {
  /** Sale data with full details */
  sale: SaleWithDetails;
  /** Shop information for header - can be ShopWithDetails or minimal ReceiptShopInfo */
  shop: ShopWithDetails | ReceiptShopInfo;
  /** Sale line items */
  items: SaleItemWithDetails[];
  /** Payment records */
  payments: SalePayment[];
  /** Customer info (optional for walk-in sales) */
  customer?: Customer | null;
  /** Whether to show barcode/QR code */
  showBarcode?: boolean;
  /** Custom thank you message (overrides default) */
  thankYouMessage?: string;
  /** Custom return policy text (overrides default) */
  returnPolicy?: string;
}

// =============================================================================
// STYLES
// =============================================================================

/**
 * Receipt CSS styles for print optimization
 */
const receiptStyles = `
  .receipt {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    line-height: 1.4;
    width: 72mm;
    max-width: 72mm;
    padding: 4mm;
    margin: 0 auto;
    background: #fff;
    color: #000;
  }

  .receipt-header {
    text-align: center;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px dashed #000;
  }

  .receipt-logo {
    max-width: 40mm;
    max-height: 15mm;
    margin: 0 auto 4px;
    display: block;
  }

  .receipt-shop-name {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 2px;
  }

  .receipt-shop-info {
    font-size: 9px;
    color: #333;
  }

  .receipt-sale-info {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px dashed #000;
  }

  .receipt-sale-row {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
  }

  .receipt-items {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px dashed #000;
  }

  .receipt-items-header {
    font-size: 10px;
    font-weight: bold;
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .receipt-item {
    margin-bottom: 6px;
  }

  .receipt-totals {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px dashed #000;
  }

  .receipt-total-row {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
  }

  .receipt-grand-total {
    font-size: 14px;
    font-weight: bold;
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px solid #000;
  }

  .receipt-payments {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px dashed #000;
  }

  .receipt-payment-row {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
  }

  .receipt-change {
    font-weight: bold;
    background: #f5f5f5;
    padding: 2px 4px;
    margin-top: 4px;
  }

  .receipt-footer {
    text-align: center;
    font-size: 9px;
    color: #333;
  }

  .receipt-thank-you {
    font-size: 11px;
    font-weight: bold;
    margin-bottom: 4px;
  }

  .receipt-policy {
    font-size: 8px;
    color: #666;
    margin-top: 4px;
  }

  .receipt-barcode {
    text-align: center;
    margin-top: 8px;
    font-size: 10px;
  }

  .receipt-divider {
    border: none;
    border-top: 1px dashed #000;
    margin: 8px 0;
  }

  /* RTL Support */
  .receipt[dir="rtl"] {
    direction: rtl;
    text-align: right;
  }

  .receipt[dir="rtl"] .receipt-header,
  .receipt[dir="rtl"] .receipt-footer {
    text-align: center;
  }

  /* Print-specific styles */
  @media print {
    @page {
      size: 80mm auto;
      margin: 0;
    }

    body {
      margin: 0;
      padding: 0;
    }

    body * {
      visibility: hidden;
    }

    .receipt,
    .receipt * {
      visibility: visible;
    }

    .receipt {
      position: absolute;
      left: 0;
      top: 0;
      width: 80mm;
      max-width: 80mm;
      padding: 2mm;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .receipt-logo {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Hide non-printable elements */
    .no-print {
      display: none !important;
    }
  }
`;

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Receipt Component
 *
 * Printable receipt for completed sales optimized for 80mm thermal printers.
 * Uses forwardRef to allow parent components to get a ref for printing.
 */
export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(function Receipt(
  { sale, shop, items, payments, customer, showBarcode = false, thankYouMessage, returnPolicy },
  ref
): React.JSX.Element {
  const t = useTranslations('sales.receipt');
  const locale = useLocale() as Locale;
  const isRtl = isRtlLocale(locale);

  // Get currency from shop settings or default
  const currency = shop.currency || 'USD';

  // Calculate totals
  const subtotal = Number(sale.subtotal || sale.total_amount || 0);
  const discount = Number(sale.discount_amount || 0);
  // Use tax_percentage if available, otherwise calculate from taxAmount and subtotal
  const taxRate = (sale as { tax_percentage?: number }).tax_percentage
    ? Number((sale as { tax_percentage?: number }).tax_percentage) / 100
    : 0;
  const taxAmount = Number(sale.tax_amount || 0);
  const grandTotal = Number(sale.total_amount || 0);
  const paidAmount = Number(sale.paid_amount || 0);
  const changeAmount = Math.max(0, paidAmount - grandTotal);

  // Get cashier name
  const cashierName = sale.created_by_user?.full_name || t('unknownCashier');

  // Default messages
  const defaultThankYou = t('thankYouMessage');
  const defaultReturnPolicy = t('returnPolicy');

  return (
    <>
      {/* Inject receipt styles */}
      <style>{receiptStyles}</style>

      <div ref={ref} className="receipt" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* ==================== HEADER SECTION ==================== */}
        <div className="receipt-header">
          {/* Shop Logo - field is shop_logo in database */}
          {shop.shop_logo && (
            <img
              src={shop.shop_logo}
              alt={shop.shop_name || 'Shop Logo'}
              className="receipt-logo"
            />
          )}

          {/* Shop Name */}
          <div className="receipt-shop-name">{shop.shop_name}</div>

          {/* Note: Shop address, phone, tax_id are NOT in the shops table */}
          {/* Those fields would need to come from shop_settings if required */}
        </div>

        {/* ==================== SALE INFO SECTION ==================== */}
        <div className="receipt-sale-info">
          {/* Receipt Number - database field is invoice_number */}
          <div className="receipt-sale-row">
            <span>{t('receiptNumber')}:</span>
            <span style={{ fontWeight: 'bold' }}>{sale.invoice_number}</span>
          </div>

          {/* Date and Time */}
          <div className="receipt-sale-row">
            <span>{t('dateTime')}:</span>
            <span>{formatDateTime(sale.sale_date || sale.created_at, locale)}</span>
          </div>

          {/* Cashier */}
          <div className="receipt-sale-row">
            <span>{t('cashier')}:</span>
            <span>{cashierName}</span>
          </div>

          {/* Customer (if not walk-in) */}
          {customer && (
            <div className="receipt-sale-row">
              <span>{t('customer')}:</span>
              <span>{customer.full_name}</span>
            </div>
          )}
        </div>

        {/* ==================== ITEMS SECTION ==================== */}
        <div className="receipt-items">
          <div className="receipt-items-header">{t('itemsHeader')}</div>
          {items.map((item, index) => (
            <ReceiptItem
              key={item.id_sale_item || index}
              item={item}
              currency={currency}
              locale={locale}
              isRtl={isRtl}
            />
          ))}
        </div>

        {/* ==================== TOTALS SECTION ==================== */}
        <div className="receipt-totals">
          {/* Subtotal */}
          <div className="receipt-total-row">
            <span>{t('subtotal')}:</span>
            <span>{formatCurrency(subtotal, currency, locale)}</span>
          </div>

          {/* Discount (if any) */}
          {discount > 0 && (
            <div className="receipt-total-row" style={{ color: '#666' }}>
              <span>{t('discount')}:</span>
              <span>-{formatCurrency(discount, currency, locale)}</span>
            </div>
          )}

          {/* Tax (if any) */}
          {taxAmount > 0 && (
            <div className="receipt-total-row" style={{ color: '#666' }}>
              <span>
                {t('tax')} {taxRate > 0 && `(${(taxRate * 100).toFixed(1)}%)`}:
              </span>
              <span>{formatCurrency(taxAmount, currency, locale)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="receipt-total-row receipt-grand-total">
            <span>{t('grandTotal')}:</span>
            <span>{formatCurrency(grandTotal, currency, locale)}</span>
          </div>
        </div>

        {/* ==================== PAYMENT SECTION ==================== */}
        <div className="receipt-payments">
          <div className="receipt-items-header">{t('paymentHeader')}</div>

          {payments.map((payment, index) => (
            <div key={payment.id_payment || index} className="receipt-payment-row">
              <span>{t(`paymentMethod.${payment.payment_type}`) || payment.payment_type}:</span>
              <span>{formatCurrency(Number(payment.amount), currency, locale)}</span>
            </div>
          ))}

          {/* Total Paid */}
          <div className="receipt-payment-row" style={{ marginTop: '4px', fontWeight: 'bold' }}>
            <span>{t('totalPaid')}:</span>
            <span>{formatCurrency(paidAmount, currency, locale)}</span>
          </div>

          {/* Change (for cash payments) */}
          {changeAmount > 0 && (
            <div className="receipt-payment-row receipt-change">
              <span>{t('change')}:</span>
              <span>{formatCurrency(changeAmount, currency, locale)}</span>
            </div>
          )}

          {/* Outstanding (if partial payment) */}
          {paidAmount < grandTotal && (
            <div
              className="receipt-payment-row"
              style={{ color: '#c00', fontWeight: 'bold', marginTop: '4px' }}
            >
              <span>{t('outstanding')}:</span>
              <span>{formatCurrency(grandTotal - paidAmount, currency, locale)}</span>
            </div>
          )}
        </div>

        {/* ==================== FOOTER SECTION ==================== */}
        <div className="receipt-footer">
          {/* Thank You Message */}
          <div className="receipt-thank-you">{thankYouMessage || defaultThankYou}</div>

          {/* Return Policy */}
          <div className="receipt-policy">{returnPolicy || defaultReturnPolicy}</div>

          {/* Note: Website is NOT in the shops table - would come from shop_settings */}

          {/* Barcode / QR Code of sale ID - database field is invoice_number */}
          {showBarcode && sale.invoice_number && (
            <div className="receipt-barcode">
              <div
                style={{
                  fontFamily: "'Libre Barcode 128', cursive",
                  fontSize: '28px',
                  letterSpacing: '2px',
                }}
              >
                {sale.invoice_number}
              </div>
              <div style={{ fontSize: '8px' }}>{sale.invoice_number}</div>
            </div>
          )}

          {/* Powered by (optional) */}
          <div
            style={{
              marginTop: '8px',
              fontSize: '7px',
              color: '#999',
            }}
          >
            {t('poweredBy')}
          </div>
        </div>
      </div>
    </>
  );
});

export default Receipt;
