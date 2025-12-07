'use client';

/**
 * SalePaymentsTable Component
 *
 * Displays a table of payments received for a sale transaction.
 * Shows payment method, amount, date, and notes.
 *
 * Note: The sale_payments table does NOT have 'status' or 'reference_number' fields.
 * Available fields: id_payment, id_sale, id_shop, payment_type, amount, payment_date, notes,
 * created_at, created_by, and cheque-related fields (cheque_number, cheque_date, cheque_bank,
 * cheque_status, cheque_cleared_date).
 *
 * Features:
 * - Payment method icons
 * - Cheque details display (number, status for cheque payments)
 * - Running totals
 * - RTL support with logical CSS properties
 *
 * @module components/domain/sales/SalePaymentsTable
 */

import React, { useMemo } from 'react';

import {
  DollarOutlined,
  CreditCardOutlined,
  BankOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Table, Tag, Typography, Skeleton } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { type Locale } from '@/lib/i18n/routing';
import type { Tables } from '@/lib/types/database';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';

import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

type SalePayment = Tables<'sale_payments'>;

export interface SalePaymentsTableProps {
  /** Payments to display */
  payments: SalePayment[];
  /** Currency code for formatting */
  currency: string;
  /** Loading state */
  isLoading?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get icon for payment method
 */
function getPaymentMethodIcon(method: string | null): React.ReactNode {
  switch (method?.toLowerCase()) {
    case 'cash':
      return <DollarOutlined />;
    case 'card':
    case 'credit_card':
    case 'debit_card':
      return <CreditCardOutlined />;
    case 'bank_transfer':
    case 'bank':
      return <BankOutlined />;
    case 'store_credit':
    case 'credit':
      return <WalletOutlined />;
    default:
      return <DollarOutlined />;
  }
}

/**
 * Get color for payment method tag
 */
function getPaymentMethodColor(method: string | null): string {
  switch (method?.toLowerCase()) {
    case 'cash':
      return 'green';
    case 'card':
    case 'credit_card':
    case 'debit_card':
      return 'blue';
    case 'bank_transfer':
    case 'bank':
      return 'purple';
    case 'store_credit':
    case 'credit':
      return 'gold';
    case 'cheque':
    case 'check':
      return 'orange';
    default:
      return 'default';
  }
}

/**
 * Get cheque status configuration
 * Note: Only cheque payments have a status field (cheque_status)
 */
function getChequeStatusConfig(status: string | null): {
  icon: React.ReactNode;
  color: string;
  label: string;
} {
  switch (status?.toLowerCase()) {
    case 'cleared':
      return {
        icon: <CheckCircleOutlined />,
        color: 'success',
        label: 'cleared',
      };
    case 'pending':
      return {
        icon: <ClockCircleOutlined />,
        color: 'warning',
        label: 'pending',
      };
    case 'bounced':
      return {
        icon: <ClockCircleOutlined />,
        color: 'error',
        label: 'bounced',
      };
    default:
      return {
        icon: <CheckCircleOutlined />,
        color: 'default',
        label: status || 'pending',
      };
  }
}

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

/**
 * Skeleton loading state for SalePaymentsTable
 */
export function SalePaymentsTableSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-3">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border border-stone-200 rounded-lg">
          <Skeleton.Avatar active shape="square" size={32} />
          <div className="flex-1">
            <Skeleton.Input active size="small" className="!w-24 !min-w-0 mb-1" />
            <Skeleton.Input active size="small" className="!w-32 !min-w-0" />
          </div>
          <Skeleton.Input active size="small" className="!w-20 !min-w-0" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SalePaymentsTable Component
 *
 * Displays a detailed table of payments for a sale transaction.
 */
export function SalePaymentsTable({
  payments,
  currency,
  isLoading = false,
  compact = false,
  className,
}: SalePaymentsTableProps): React.JSX.Element {
  const t = useTranslations('sales');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;

  // Table columns
  const columns: ColumnsType<SalePayment> = useMemo(
    () => [
      // Payment method column
      {
        title: t('paymentMethod'),
        dataIndex: 'payment_type',
        key: 'method',
        width: 150,
        render: (method: string | null) => (
          <Tag
            icon={getPaymentMethodIcon(method)}
            color={getPaymentMethodColor(method)}
            className="capitalize"
          >
            {method ? t(`paymentMethods.${method.toLowerCase()}`, { fallback: method }) : '-'}
          </Tag>
        ),
      },
      // Amount column
      {
        title: tCommon('labels.amount'),
        dataIndex: 'amount',
        key: 'amount',
        width: 130,
        align: 'end' as const,
        render: (amount: number) => (
          <Text strong className="text-base text-stone-900">
            {formatCurrency(amount, currency, locale)}
          </Text>
        ),
      },
      // Cheque/Notes column (hidden in compact mode) - shows cheque_number for cheques, notes otherwise
      ...(compact
        ? []
        : [
            {
              title: t('reference'),
              key: 'reference',
              width: 150,
              render: (_: unknown, record: SalePayment) => {
                // For cheque payments, show cheque number
                if (record.payment_type?.toLowerCase() === 'cheque' && record.cheque_number) {
                  return (
                    <Text code className="text-xs">
                      {record.cheque_number}
                    </Text>
                  );
                }
                // For other payments, show notes if available
                if (record.notes) {
                  return (
                    <Text
                      className="text-xs text-stone-600 truncate max-w-[140px]"
                      title={record.notes}
                    >
                      {record.notes}
                    </Text>
                  );
                }
                return <Text type="secondary">-</Text>;
              },
            } as ColumnsType<SalePayment>[number],
          ]),
      // Date column
      {
        title: tCommon('labels.date'),
        dataIndex: 'payment_date',
        key: 'date',
        width: 160,
        render: (date: string) =>
          date ? (
            <Text className="text-sm text-stone-600">{formatDateTime(date, locale)}</Text>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
      // Cheque Status column - only cheque payments have a status (cheque_status)
      {
        title: tCommon('labels.status'),
        key: 'cheque_status',
        width: 120,
        render: (_: unknown, record: SalePayment) => {
          // Only cheque payments have a status field
          if (record.payment_type?.toLowerCase() === 'cheque') {
            const config = getChequeStatusConfig(record.cheque_status);
            return (
              <Tag icon={config.icon} color={config.color}>
                {t(`chequeStatus.${config.label}`, { fallback: config.label })}
              </Tag>
            );
          }
          // Non-cheque payments are always considered confirmed
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              {t('paymentStatus.confirmed', { fallback: 'Confirmed' })}
            </Tag>
          );
        },
      },
    ],
    [t, tCommon, currency, locale, compact]
  );

  // Calculate totals
  // Note: sale_payments table doesn't have a general 'status' field.
  // Only cheque payments have cheque_status. All other payments are considered confirmed.
  const totals = useMemo(() => {
    // Non-cheque payments + cleared/no-status cheques
    const confirmed = payments.filter(
      (p) =>
        p.payment_type?.toLowerCase() !== 'cheque' ||
        !p.cheque_status ||
        p.cheque_status?.toLowerCase() === 'cleared'
    );
    // Bounced cheques
    const bounced = payments.filter(
      (p) =>
        p.payment_type?.toLowerCase() === 'cheque' && p.cheque_status?.toLowerCase() === 'bounced'
    );
    // Pending cheques
    const pending = payments.filter(
      (p) =>
        p.payment_type?.toLowerCase() === 'cheque' && p.cheque_status?.toLowerCase() === 'pending'
    );

    const confirmedTotal = confirmed.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    const bouncedTotal = bounced.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    const pendingTotal = pending.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

    return {
      confirmedTotal,
      bouncedTotal,
      pendingTotal,
      netTotal: confirmedTotal, // Bounced cheques don't count towards net total
      paymentCount: payments.length,
    };
  }, [payments]);

  if (isLoading) {
    return <SalePaymentsTableSkeleton />;
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={<WalletOutlined />}
        title={t('noPayments')}
        description={t('noPaymentsRecorded')}
        size="sm"
      />
    );
  }

  return (
    <div className={cn('sale-payments-table', className)}>
      <Table<SalePayment>
        dataSource={payments}
        columns={columns}
        rowKey="id_payment"
        pagination={false}
        scroll={{ x: compact ? 400 : 650 }}
        size="small"
        rowClassName={(record) =>
          // Highlight bounced cheques
          record.payment_type?.toLowerCase() === 'cheque' &&
          record.cheque_status?.toLowerCase() === 'bounced'
            ? 'bg-red-50 opacity-75'
            : ''
        }
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row className="bg-stone-50">
              <Table.Summary.Cell index={0}>
                <Text strong className="text-stone-700">
                  {t('paymentsSummary', { count: totals.paymentCount })}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Text strong className="text-stone-900 text-base">
                  {formatCurrency(totals.netTotal, currency, locale)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={compact ? 2 : 3} />
            </Table.Summary.Row>
            {totals.bouncedTotal > 0 && (
              <Table.Summary.Row className="bg-red-50/50">
                <Table.Summary.Cell index={0}>
                  <Text type="secondary" className="text-xs">
                    {t('bouncedCheques')}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text className="text-red-500 text-sm">
                    {formatCurrency(totals.bouncedTotal, currency, locale)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={compact ? 2 : 3} />
              </Table.Summary.Row>
            )}
            {totals.pendingTotal > 0 && (
              <Table.Summary.Row className="bg-amber-50/50">
                <Table.Summary.Cell index={0}>
                  <Text type="secondary" className="text-xs">
                    {t('pendingCheques')}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text className="text-amber-600 text-sm">
                    {formatCurrency(totals.pendingTotal, currency, locale)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={compact ? 2 : 3} />
              </Table.Summary.Row>
            )}
          </Table.Summary>
        )}
      />
    </div>
  );
}

export default SalePaymentsTable;
