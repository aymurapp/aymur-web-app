'use client';

/**
 * ReceiptModal Component
 *
 * Modal dialog that shows a receipt preview with action buttons.
 * Provides options to print, download as PDF, or email the receipt.
 *
 * Features:
 * - Receipt preview inside modal
 * - Print button in footer
 * - Download as PDF button (optional)
 * - Email receipt button (optional)
 * - Close button
 * - RTL support
 *
 * @module components/domain/sales/ReceiptModal
 */

import React, { useRef, useCallback, useState } from 'react';

import {
  PrinterOutlined,
  DownloadOutlined,
  MailOutlined,
  CloseOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Modal, Space, message } from 'antd';
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

export interface ReceiptModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
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
  /** Whether to show download PDF button */
  showDownload?: boolean;
  /** Whether to show email button */
  showEmail?: boolean;
  /** Callback for download PDF action */
  onDownload?: () => Promise<void>;
  /** Callback for email action */
  onEmail?: () => Promise<void>;
  /** Callback after successful print */
  onAfterPrint?: () => void;
  /** Modal title (optional, defaults to "Receipt Preview") */
  title?: string;
  /** Modal width */
  width?: number | string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ReceiptModal Component
 *
 * Displays a modal with receipt preview and action buttons.
 */
export function ReceiptModal({
  open,
  onClose,
  sale,
  shop,
  items,
  payments,
  customer,
  showBarcode,
  thankYouMessage,
  returnPolicy,
  showDownload = false,
  showEmail = false,
  onDownload,
  onEmail,
  onAfterPrint,
  title,
  width = 400,
}: ReceiptModalProps): React.JSX.Element {
  const t = useTranslations('sales.receipt');

  // Reference to the receipt component for printing
  const receiptRef = useRef<HTMLDivElement>(null);

  // Loading states
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);

  // Handle print using react-to-print
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Receipt-${sale.invoice_number}`,
    onBeforePrint: async () => {
      setIsPrinting(true);
    },
    onAfterPrint: () => {
      setIsPrinting(false);
      message.success(t('printSuccess'));
      if (onAfterPrint) {
        onAfterPrint();
      }
    },
    onPrintError: (error) => {
      setIsPrinting(false);
      console.error('Print error:', error);
      message.error(t('printError'));
    },
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

  // Handle download PDF
  const handleDownload = useCallback(async () => {
    if (!onDownload) {
      return;
    }

    setIsDownloading(true);
    try {
      await onDownload();
      message.success(t('downloadSuccess'));
    } catch (error) {
      console.error('Download error:', error);
      message.error(t('downloadError'));
    } finally {
      setIsDownloading(false);
    }
  }, [onDownload, t]);

  // Handle email receipt
  const handleEmail = useCallback(async () => {
    if (!onEmail) {
      return;
    }

    // Check if customer has email
    if (!customer?.email) {
      message.warning(t('noCustomerEmail'));
      return;
    }

    setIsEmailing(true);
    try {
      await onEmail();
      message.success(t('emailSuccess'));
    } catch (error) {
      console.error('Email error:', error);
      message.error(t('emailError'));
    } finally {
      setIsEmailing(false);
    }
  }, [onEmail, customer, t]);

  // Modal footer buttons
  const footerButtons = (
    <Space
      size="small"
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: '8px',
      }}
    >
      {/* Email Button */}
      {showEmail && onEmail && (
        <Button
          type="default"
          icon={isEmailing ? <LoadingOutlined /> : <MailOutlined />}
          onClick={handleEmail}
          disabled={isEmailing || !customer?.email}
          title={!customer?.email ? t('noCustomerEmail') : undefined}
        >
          {t('emailReceipt')}
        </Button>
      )}

      {/* Download Button */}
      {showDownload && onDownload && (
        <Button
          type="default"
          icon={isDownloading ? <LoadingOutlined /> : <DownloadOutlined />}
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {t('downloadPdf')}
        </Button>
      )}

      {/* Print Button */}
      <Button
        type="primary"
        icon={isPrinting ? <LoadingOutlined /> : <PrinterOutlined />}
        onClick={() => handlePrint()}
        disabled={isPrinting}
      >
        {t('printReceipt')}
      </Button>
    </Space>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title || t('receiptPreview')}
      width={width}
      footer={footerButtons}
      centered
      destroyOnClose
      styles={{
        body: {
          maxHeight: '70vh',
          overflowY: 'auto',
          padding: '16px',
          backgroundColor: '#f5f5f5',
        },
      }}
      closeIcon={<CloseOutlined />}
    >
      {/* Receipt Preview Container */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        {/* Receipt Paper Effect */}
        <div
          style={{
            backgroundColor: '#fff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
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
      </div>

      {/* Sale Status Indicator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: '16px',
          gap: '8px',
          color: sale.payment_status === 'paid' ? '#52c41a' : '#faad14',
          fontSize: '12px',
        }}
      >
        <CheckCircleOutlined />
        <span>
          {sale.payment_status === 'paid'
            ? t('statusPaid')
            : sale.payment_status === 'partial'
              ? t('statusPartial')
              : t('statusUnpaid')}
        </span>
      </div>
    </Modal>
  );
}

export default ReceiptModal;
