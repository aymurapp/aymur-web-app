'use client';

/**
 * SaleActions Component
 *
 * Action buttons bar for sale detail page.
 * Provides quick access to common sale operations with permission checks.
 *
 * Features:
 * - Print Receipt button
 * - Add Payment (if partial payment)
 * - Void Sale (with confirmation modal)
 * - Create Return
 * - Duplicate as New Sale
 * - Permission-based visibility
 * - RTL support
 *
 * @module components/domain/sales/SaleActions
 */

import React, { useState, useCallback } from 'react';

import {
  PrinterOutlined,
  WalletOutlined,
  StopOutlined,
  UndoOutlined,
  CopyOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Space, Modal, Input, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import type { SaleWithDetails } from '@/lib/hooks/data/useSale';
import { usePermissions, PERMISSION_KEYS } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';

const { Text } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

export interface SaleActionsProps {
  /** Sale data */
  sale: SaleWithDetails;
  /** Callback for print action */
  onPrint?: () => void;
  /** Callback for add payment action */
  onAddPayment?: () => void;
  /** Callback for void sale action */
  onVoidSale?: (reason: string) => Promise<void> | void;
  /** Callback for create return action */
  onCreateReturn?: () => void;
  /** Callback for duplicate sale action */
  onDuplicate?: () => void;
  /** Whether void action is loading */
  isVoiding?: boolean;
  /** Vertical layout for mobile */
  vertical?: boolean;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SaleActions Component
 *
 * Displays action buttons for sale operations with permission checks.
 */
export function SaleActions({
  sale,
  onPrint,
  onAddPayment,
  onVoidSale,
  onCreateReturn,
  onDuplicate,
  isVoiding = false,
  vertical = false,
  className,
}: SaleActionsProps): React.JSX.Element {
  const t = useTranslations('sales');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  // State for void confirmation modal
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // Determine sale state - DB field is 'status' (not 'sale_status')
  const isCancelled = sale.status === 'cancelled';
  const isCompleted = sale.status === 'completed';
  const isPartiallyPaid = sale.payment_status === 'partial';
  const isUnpaid = sale.payment_status === 'unpaid';
  const canAddMorePayment = isPartiallyPaid || isUnpaid;

  // Permission checks
  const canVoidSales = can(PERMISSION_KEYS.SALES_VOID);
  const canCreateSales = can(PERMISSION_KEYS.SALES_CREATE);
  const canRefundSales = can(PERMISSION_KEYS.SALES_REFUND);
  const canPrintReports = can(PERMISSION_KEYS.REPORTS_BASIC);

  // Handle void confirmation
  const handleVoidConfirm = useCallback(async () => {
    if (onVoidSale) {
      await onVoidSale(voidReason);
      setVoidModalOpen(false);
      setVoidReason('');
    }
  }, [onVoidSale, voidReason]);

  // Handle void modal open
  const handleVoidClick = useCallback(() => {
    setVoidModalOpen(true);
  }, []);

  // Handle void modal cancel
  const handleVoidCancel = useCallback(() => {
    setVoidModalOpen(false);
    setVoidReason('');
  }, []);

  return (
    <>
      <div
        className={cn(
          'sale-actions',
          vertical ? 'flex flex-col gap-2' : 'flex flex-wrap items-center gap-2',
          className
        )}
      >
        {/* Print Receipt */}
        {canPrintReports && onPrint && (
          <Button icon={<PrinterOutlined />} onClick={onPrint} className={vertical ? 'w-full' : ''}>
            {t('printReceipt')}
          </Button>
        )}

        {/* Add Payment - Only show if not fully paid and not cancelled */}
        {canCreateSales && onAddPayment && canAddMorePayment && !isCancelled && (
          <Button
            type="primary"
            icon={<WalletOutlined />}
            onClick={onAddPayment}
            className={cn(vertical ? 'w-full' : '', 'bg-emerald-600 hover:bg-emerald-700')}
          >
            {t('addPayment')}
          </Button>
        )}

        {/* Create Return - Only for completed sales */}
        {canRefundSales && onCreateReturn && isCompleted && !isCancelled && (
          <Button
            icon={<UndoOutlined />}
            onClick={onCreateReturn}
            className={vertical ? 'w-full' : ''}
          >
            {t('createReturn')}
          </Button>
        )}

        {/* Duplicate Sale */}
        {canCreateSales && onDuplicate && (
          <Button
            icon={<CopyOutlined />}
            onClick={onDuplicate}
            className={vertical ? 'w-full' : ''}
          >
            {t('duplicateSale')}
          </Button>
        )}

        {/* Void Sale - Only if not already cancelled */}
        {canVoidSales && onVoidSale && !isCancelled && (
          <Button
            danger
            icon={<StopOutlined />}
            onClick={handleVoidClick}
            loading={isVoiding}
            className={vertical ? 'w-full' : ''}
          >
            {t('voidSale')}
          </Button>
        )}
      </div>

      {/* Void Confirmation Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined className="text-red-500" />
            <span>{t('voidSaleConfirmation')}</span>
          </Space>
        }
        open={voidModalOpen}
        onOk={handleVoidConfirm}
        onCancel={handleVoidCancel}
        okText={t('voidSale')}
        cancelText={tCommon('actions.cancel')}
        okButtonProps={{
          danger: true,
          loading: isVoiding,
        }}
        destroyOnClose
      >
        <div className="space-y-4 py-4">
          <Text>{t('voidSaleWarning', { saleNumber: sale.invoice_number })}</Text>
          <div>
            <Text type="secondary" className="block mb-2">
              {t('voidReasonLabel')}
            </Text>
            <TextArea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder={t('voidReasonPlaceholder')}
              rows={3}
              maxLength={500}
              showCount
            />
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <Text type="danger" className="text-sm">
              {t('voidSaleIrreversible')}
            </Text>
          </div>
        </div>
      </Modal>
    </>
  );
}

/**
 * Compact action buttons for mobile or inline use
 */
export function SaleActionsCompact({
  sale,
  onPrint,
  onVoidSale,
  isVoiding,
}: Pick<SaleActionsProps, 'sale' | 'onPrint' | 'onVoidSale' | 'isVoiding'>): React.JSX.Element {
  const t = useTranslations('sales');
  const { can } = usePermissions();

  // DB field is 'status' (not 'sale_status')
  const isCancelled = sale.status === 'cancelled';
  const canVoidSales = can(PERMISSION_KEYS.SALES_VOID);
  const canPrintReports = can(PERMISSION_KEYS.REPORTS_BASIC);

  return (
    <Space size="small">
      {canPrintReports && onPrint && (
        <Button
          type="text"
          size="small"
          icon={<PrinterOutlined />}
          onClick={onPrint}
          title={t('printReceipt')}
        />
      )}
      {canVoidSales && onVoidSale && !isCancelled && (
        <Button
          type="text"
          size="small"
          danger
          icon={<StopOutlined />}
          onClick={() => onVoidSale('')}
          loading={isVoiding}
          title={t('voidSale')}
        />
      )}
    </Space>
  );
}

export default SaleActions;
