'use client';

/**
 * SaleDetail Component
 *
 * Comprehensive sale detail view showing full information about a completed sale.
 * Displays header, customer info, items, payments, financial summary, and notes.
 *
 * Features:
 * - Sale header with number, date, status badges
 * - Customer section with contact info and link to profile
 * - Items table with images, details, weights, prices
 * - Payments table with methods and status
 * - Financial summary with subtotal, discounts, tax, total
 * - Notes section
 * - Audit info (created by, created at)
 * - Quick actions bar
 * - Loading and error states
 * - RTL support
 *
 * @module components/domain/sales/SaleDetail
 */

import React, { useMemo, useCallback } from 'react';

import {
  ShoppingCartOutlined,
  UserOutlined,
  BankOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
  WalletOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import { Card, Tag, Typography, Descriptions, Space, Skeleton, Alert } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { Button } from '@/components/ui/Button';
import { useSale } from '@/lib/hooks/data/useSale';
import { usePermissions, PERMISSION_KEYS } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { useRouter } from '@/lib/i18n/navigation';
import { type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDateTime, formatPhone } from '@/lib/utils/format';

import { SaleActions } from './SaleActions';
import { SaleItemsTable } from './SaleItemsTable';
import { SalePaymentsTable } from './SalePaymentsTable';

const { Text, Title, Link } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface SaleDetailProps {
  /** Sale ID to display */
  saleId: string;
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
  /** Additional class name */
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get sale status configuration
 */
function getSaleStatusConfig(status: string | null): {
  icon: React.ReactNode;
  color: string;
  label: string;
} {
  switch (status) {
    case 'completed':
      return {
        icon: <CheckCircleOutlined />,
        color: 'success',
        label: 'completed',
      };
    case 'pending':
    case 'draft':
      return {
        icon: <ClockCircleOutlined />,
        color: 'warning',
        label: 'pending',
      };
    case 'cancelled':
    case 'voided':
      return {
        icon: <StopOutlined />,
        color: 'error',
        label: 'cancelled',
      };
    case 'refunded':
      return {
        icon: <ExclamationCircleOutlined />,
        color: 'default',
        label: 'refunded',
      };
    default:
      return {
        icon: <ClockCircleOutlined />,
        color: 'default',
        label: status || 'unknown',
      };
  }
}

/**
 * Get payment status configuration
 */
function getPaymentStatusConfig(status: string | null): {
  icon: React.ReactNode;
  color: string;
  label: string;
} {
  switch (status) {
    case 'paid':
      return {
        icon: <CheckCircleOutlined />,
        color: 'success',
        label: 'fullyPaid',
      };
    case 'partial':
      return {
        icon: <WalletOutlined />,
        color: 'warning',
        label: 'partiallyPaid',
      };
    case 'unpaid':
      return {
        icon: <ExclamationCircleOutlined />,
        color: 'error',
        label: 'unpaid',
      };
    case 'refunded':
      return {
        icon: <StopOutlined />,
        color: 'default',
        label: 'refunded',
      };
    default:
      return {
        icon: <ClockCircleOutlined />,
        color: 'default',
        label: status || 'unknown',
      };
  }
}

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

/**
 * Skeleton loading state for SaleDetail
 */
export function SaleDetailSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <Card className="border border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton.Input active className="!w-40" />
            <Skeleton.Input active size="small" className="!w-48" />
            <div className="flex gap-2">
              <Skeleton.Button active size="small" className="!w-24" />
              <Skeleton.Button active size="small" className="!w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton.Button active className="!w-28" />
            <Skeleton.Button active className="!w-28" />
          </div>
        </div>
      </Card>

      {/* Customer skeleton */}
      <Card className="border border-stone-200">
        <div className="flex items-center gap-4">
          <Skeleton.Avatar active size={48} />
          <div className="flex-1">
            <Skeleton.Input active size="small" className="!w-36 mb-2" />
            <Skeleton.Input active size="small" className="!w-48" />
          </div>
        </div>
      </Card>

      {/* Items skeleton */}
      <Card className="border border-stone-200">
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>

      {/* Summary skeleton */}
      <Card className="border border-stone-200">
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SaleDetail Component
 *
 * Displays comprehensive sale information with all related data.
 */
export function SaleDetail({
  saleId,
  onPrint,
  onAddPayment,
  onVoidSale,
  onCreateReturn,
  onDuplicate,
  className,
}: SaleDetailProps): React.JSX.Element {
  const t = useTranslations('sales');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { shopId, shop } = useShop();
  const { can } = usePermissions();

  const currency = shop?.currency || 'USD';

  // Fetch sale data
  const { sale, isLoading, error, refetch } = useSale({
    saleId,
    includeItems: true,
    includePayments: true,
    includeCustomer: true,
    includeUsers: true,
    includeItemDetails: true,
  });

  // Navigate to customer profile
  const handleCustomerClick = useCallback(() => {
    if (shopId && sale?.customer?.id_customer) {
      router.push(`/${shopId}/customers/${sale.customer.id_customer}`);
    }
  }, [shopId, sale?.customer?.id_customer, router]);

  // Status configurations - database field is 'status' (not 'sale_status')
  const saleStatusConfig = useMemo(() => getSaleStatusConfig(sale?.status ?? null), [sale?.status]);

  const paymentStatusConfig = useMemo(
    () => getPaymentStatusConfig(sale?.payment_status ?? null),
    [sale?.payment_status]
  );

  // Financial calculations
  const financials = useMemo(() => {
    if (!sale) {
      return null;
    }

    const subtotal = Number(sale.subtotal ?? 0);
    const discountAmount = Number(sale.discount_amount ?? 0);
    const taxAmount = Number(sale.tax_amount ?? 0);
    const totalAmount = Number(sale.total_amount ?? 0);
    const paidAmount = Number(sale.paid_amount ?? 0);
    const balanceDue = totalAmount - paidAmount;

    return {
      subtotal,
      discountAmount,
      discountPercentage: subtotal > 0 ? (discountAmount / subtotal) * 100 : 0,
      taxAmount,
      totalAmount,
      paidAmount,
      balanceDue: Math.max(0, balanceDue),
    };
  }, [sale]);

  // Loading state
  if (isLoading) {
    return <SaleDetailSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <EmptyState
        icon={<ExclamationCircleFilled className="text-red-500" />}
        title={tCommon('messages.error')}
        description={error.message || tCommon('messages.unexpectedError')}
        action={{
          label: tCommon('actions.refresh'),
          onClick: () => refetch(),
        }}
        size="lg"
      />
    );
  }

  // Not found state
  if (!sale) {
    return (
      <EmptyState
        icon={<ShoppingCartOutlined />}
        title={t('saleNotFound')}
        description={t('saleNotFoundDescription')}
        action={{
          label: t('backToSales'),
          onClick: () => router.push(`/${shopId}/sales`),
        }}
        size="lg"
      />
    );
  }

  const isCompany = sale.customer?.phone?.includes('@') === false;

  return (
    <div className={cn('sale-detail space-y-6', className)}>
      {/* Cancelled Sale Alert - database field is 'status' (not 'sale_status') */}
      {sale.status === 'cancelled' && (
        <Alert
          type="error"
          showIcon
          icon={<StopOutlined />}
          message={t('saleCancelled')}
          description={t('saleCancelledDescription')}
        />
      )}

      {/* Header Section */}
      <Card className="border border-stone-200">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Left side - Sale info */}
          <div className="space-y-3">
            {/* Sale Number - database field is 'invoice_number' (not 'sale_number') */}
            <div className="flex items-center gap-3">
              <Title level={3} className="!mb-0 !text-amber-700">
                {sale.invoice_number}
              </Title>
            </div>

            {/* Date and time */}
            <div className="flex items-center gap-2 text-stone-600">
              <CalendarOutlined />
              <Text>{formatDateTime(sale.sale_date, locale)}</Text>
            </div>

            {/* Status badges */}
            <Space size={8} wrap>
              <Tag icon={saleStatusConfig.icon} color={saleStatusConfig.color} className="text-sm">
                {t(`status.${saleStatusConfig.label}`)}
              </Tag>
              <Tag
                icon={paymentStatusConfig.icon}
                color={paymentStatusConfig.color}
                className="text-sm"
              >
                {t(`status.${paymentStatusConfig.label}`)}
              </Tag>
            </Space>
          </div>

          {/* Right side - Actions */}
          <SaleActions
            sale={sale}
            onPrint={onPrint}
            onAddPayment={onAddPayment}
            onVoidSale={onVoidSale}
            onCreateReturn={onCreateReturn}
            onDuplicate={onDuplicate}
          />
        </div>
      </Card>

      {/* Customer Section */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <UserOutlined />
            {t('customer')}
          </span>
        }
        className="border border-stone-200"
      >
        {sale.customer ? (
          <div className="flex items-start gap-4">
            {/* Customer avatar */}
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-full text-white text-lg font-semibold',
                isCompany ? 'bg-blue-500' : 'bg-amber-500'
              )}
            >
              {isCompany ? <BankOutlined /> : <UserOutlined />}
            </div>

            {/* Customer info */}
            <div className="flex-1 min-w-0">
              <Link
                onClick={handleCustomerClick}
                className="font-semibold text-lg text-stone-900 hover:text-amber-600 cursor-pointer"
              >
                {sale.customer.full_name}
              </Link>

              <div className="flex flex-wrap gap-4 mt-2 text-sm text-stone-600">
                {sale.customer.phone && (
                  <span className="flex items-center gap-1">
                    <PhoneOutlined />
                    <a
                      href={`tel:${sale.customer.phone}`}
                      className="text-amber-600 hover:text-amber-700"
                      dir="ltr"
                    >
                      {formatPhone(sale.customer.phone)}
                    </a>
                  </span>
                )}
                {sale.customer.email && (
                  <span className="flex items-center gap-1">
                    <MailOutlined />
                    <a
                      href={`mailto:${sale.customer.email}`}
                      className="text-amber-600 hover:text-amber-700"
                    >
                      {sale.customer.email}
                    </a>
                  </span>
                )}
              </div>

              {/* Customer balance */}
              {sale.customer.current_balance !== undefined &&
                sale.customer.current_balance !== 0 && (
                  <div className="mt-2">
                    <Text type="secondary" className="text-xs">
                      {t('customerBalance')}:{' '}
                    </Text>
                    <Text
                      strong
                      className={cn(
                        sale.customer.current_balance > 0 ? 'text-red-600' : 'text-emerald-600'
                      )}
                    >
                      {formatCurrency(Math.abs(sale.customer.current_balance), currency, locale)}
                    </Text>
                    <Text type="secondary" className="text-xs ms-1">
                      {sale.customer.current_balance > 0 ? `(${t('owes')})` : `(${t('credit')})`}
                    </Text>
                  </div>
                )}
            </div>

            {/* View customer button */}
            {can(PERMISSION_KEYS.CUSTOMERS_VIEW) && (
              <Button type="link" onClick={handleCustomerClick}>
                {t('viewCustomer')}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-stone-500">
            <UserOutlined className="text-xl" />
            <Text type="secondary" italic>
              {t('walkInCustomer')}
            </Text>
          </div>
        )}
      </Card>

      {/* Items Section */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <ShoppingCartOutlined />
            {t('items')} ({sale.sale_items?.length ?? 0})
          </span>
        }
        className="border border-stone-200"
      >
        <SaleItemsTable items={sale.sale_items ?? []} currency={currency} />
      </Card>

      {/* Payments Section */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <WalletOutlined />
            {t('payments')} ({sale.sale_payments?.length ?? 0})
          </span>
        }
        className="border border-stone-200"
      >
        <SalePaymentsTable payments={sale.sale_payments ?? []} currency={currency} />
      </Card>

      {/* Financial Summary */}
      {financials && (
        <Card title={t('financialSummary')} className="border border-stone-200">
          <Descriptions
            column={{ xs: 1, sm: 2 }}
            size="small"
            labelStyle={{ fontWeight: 500, color: '#78716c' }}
          >
            <Descriptions.Item label={t('subtotal')}>
              <Text>{formatCurrency(financials.subtotal, currency, locale)}</Text>
            </Descriptions.Item>

            {financials.discountAmount > 0 && (
              <Descriptions.Item label={t('discount')}>
                <Text className="text-amber-600">
                  -{formatCurrency(financials.discountAmount, currency, locale)}
                  <Text type="secondary" className="ms-1 text-xs">
                    ({financials.discountPercentage.toFixed(1)}%)
                  </Text>
                </Text>
              </Descriptions.Item>
            )}

            {financials.taxAmount > 0 && (
              <Descriptions.Item label={t('tax')}>
                <Text>{formatCurrency(financials.taxAmount, currency, locale)}</Text>
              </Descriptions.Item>
            )}

            <Descriptions.Item label={t('grandTotal')}>
              <Text strong className="text-lg text-stone-900">
                {formatCurrency(financials.totalAmount, currency, locale)}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label={t('amountPaid')}>
              <Text className="text-emerald-600">
                {formatCurrency(financials.paidAmount, currency, locale)}
              </Text>
            </Descriptions.Item>

            {financials.balanceDue > 0 && (
              <Descriptions.Item label={t('balanceDue')}>
                <Text strong className="text-red-600 text-lg">
                  {formatCurrency(financials.balanceDue, currency, locale)}
                </Text>
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Balance Due Alert */}
          {financials.balanceDue > 0 && (
            <Alert
              type="warning"
              showIcon
              className="mt-4"
              message={t('outstandingBalance')}
              description={t('outstandingBalanceDescription', {
                amount: formatCurrency(financials.balanceDue, currency, locale),
              })}
            />
          )}
        </Card>
      )}

      {/* Notes Section */}
      {sale.notes && (
        <Card
          title={
            <span className="flex items-center gap-2">
              <FileTextOutlined />
              {tCommon('labels.notes')}
            </span>
          }
          className="border border-stone-200"
        >
          <Text className="text-stone-600 whitespace-pre-wrap">{sale.notes}</Text>
        </Card>
      )}

      {/* Audit Info */}
      <Card className="border border-stone-200 bg-stone-50">
        <div className="text-xs text-stone-500 space-y-1">
          {sale.created_by_user && (
            <div>
              {tCommon('labels.createdBy')}: {sale.created_by_user.full_name}
              {sale.created_at && (
                <span className="ms-2">({formatDateTime(sale.created_at, locale)})</span>
              )}
            </div>
          )}
          {sale.updated_by_user && sale.updated_at && (
            <div>
              {tCommon('labels.updatedBy')}: {sale.updated_by_user.full_name}
              <span className="ms-2">({formatDateTime(sale.updated_at, locale)})</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default SaleDetail;
