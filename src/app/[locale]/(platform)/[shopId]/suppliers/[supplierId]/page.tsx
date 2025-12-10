'use client';

/**
 * Supplier Detail Page
 *
 * Displays comprehensive supplier information with tabs for different views.
 *
 * Features:
 * - Full supplier info display (company name, contact, etc.)
 * - Contact information section
 * - Bank details section (masked display)
 * - Balance display with breakdown
 * - Tabs: Overview, Transactions, Purchases, Payments
 * - Transaction history table
 * - Purchase history table
 * - Edit and Delete actions in header
 *
 * @module app/(platform)/[locale]/[shopId]/suppliers/[supplierId]/page
 */

import React, { useState, useCallback, useMemo } from 'react';

import { useParams } from 'next/navigation';

import {
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  TagOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  CreditCardOutlined,
  BankOutlined,
  GoldOutlined,
  SwapOutlined,
  PlusOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import {
  Tabs,
  Typography,
  Tag,
  Space,
  Descriptions,
  Skeleton,
  Card,
  Alert,
  Empty,
  message,
  Popconfirm,
  Drawer,
  Tooltip,
  Form,
  InputNumber,
  DatePicker,
  Select,
  Input,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslations, useLocale } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { SupplierForm } from '@/components/domain/suppliers';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table, type ColumnsType } from '@/components/ui/Table';
import { recordSupplierPayment } from '@/lib/actions/supplier';
import { usePurchases, type PurchaseWithSupplier } from '@/lib/hooks/data/usePurchases';
import {
  useSupplier,
  useSupplierTransactions,
  useSupplierPayments,
  useDeleteSupplier,
  type Supplier,
  type SupplierTransaction,
  type SupplierPaymentWithPurchase,
} from '@/lib/hooks/data/useSuppliers';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { useRouter, Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatPhone, formatDate } from '@/lib/utils/format';

const { Text, Title, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

type TabKey = 'overview' | 'transactions' | 'purchases' | 'payments';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Balance display with color coding
 */
function BalanceDisplay({
  balance,
  currency,
}: {
  balance: number;
  currency: string;
}): React.JSX.Element {
  const t = useTranslations('suppliers');

  const formattedBalance = formatCurrency(Math.abs(balance), currency);
  const isPayable = balance > 0;
  const isCredit = balance < 0;

  return (
    <div className="text-center py-4">
      <Text type="secondary" className="text-sm block mb-1">
        {t('currentBalance')}
      </Text>
      <Title
        level={2}
        className={cn(
          '!mb-1',
          isPayable && '!text-red-600',
          isCredit && '!text-emerald-600',
          !isPayable && !isCredit && '!text-stone-400'
        )}
      >
        {balance === 0 ? formattedBalance : isPayable ? formattedBalance : `-${formattedBalance}`}
      </Title>
      {balance !== 0 && (
        <Text type="secondary" className="text-xs">
          {isPayable ? t('payables') : t('credit')}
        </Text>
      )}
    </div>
  );
}

/**
 * Loading skeleton for supplier detail
 */
function DetailSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton.Avatar active size={80} />
        <div className="flex-1">
          <Skeleton.Input active size="large" className="!w-64 mb-2" />
          <Skeleton.Input active size="small" className="!w-48" />
        </div>
      </div>
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    </div>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Supplier Detail Page Component
 */
export default function SupplierDetailPage(): React.JSX.Element {
  const t = useTranslations('suppliers');
  const tCommon = useTranslations('common');
  const tPurchases = useTranslations('purchases');
  const locale = useLocale() as Locale;
  const { can } = usePermissions();
  const router = useRouter();
  const params = useParams();
  const { shop } = useShop();

  const supplierId = params.supplierId as string;
  const shopId = params.shopId as string;
  const currency = shop?.currency || 'USD';

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [transactionPage, setTransactionPage] = useState(1);
  const [purchasePage, setPurchasePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentForm] = Form.useForm();

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { data: supplier, isLoading, error } = useSupplier(supplierId);
  const deleteSupplier = useDeleteSupplier();

  // Fetch transactions for the transactions tab
  const {
    transactions,
    totalCount: transactionCount,
    isLoading: transactionsLoading,
  } = useSupplierTransactions(supplierId, {
    page: transactionPage,
    pageSize: 10,
  });

  // Fetch purchases for the purchases tab
  const {
    purchases,
    totalCount: purchaseCount,
    isLoading: purchasesLoading,
  } = usePurchases({
    supplierId,
    page: purchasePage,
    pageSize: 10,
    sortBy: 'purchase_date',
    sortDirection: 'desc',
  });

  // Fetch payments for the payments tab
  const {
    payments,
    totalCount: paymentCount,
    isLoading: paymentsLoading,
  } = useSupplierPayments(supplierId, {
    page: paymentPage,
    pageSize: 10,
  });

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleEdit = useCallback(() => {
    setIsEditModalOpen(true);
  }, []);

  const handleEditSuccess = useCallback(() => {
    setIsEditModalOpen(false);
  }, []);

  const handleDelete = useCallback(async () => {
    try {
      await deleteSupplier.mutateAsync(supplierId);
      message.success(t('messages.deleteSuccess'));
      router.push(`/${params.locale}/${params.shopId}/suppliers`);
    } catch (error) {
      console.error('[SupplierDetail] Delete error:', error);
      message.error(t('messages.deleteError'));
    }
  }, [supplierId, deleteSupplier, router, params, t]);

  const handleBack = useCallback(() => {
    router.push(`/${params.locale}/${params.shopId}/suppliers`);
  }, [router, params]);

  const handleOpenPaymentDrawer = useCallback(() => {
    paymentForm.resetFields();
    paymentForm.setFieldsValue({
      payment_date: dayjs(),
      payment_type: 'cash',
    });
    setIsPaymentDrawerOpen(true);
  }, [paymentForm]);

  const handleClosePaymentDrawer = useCallback(() => {
    setIsPaymentDrawerOpen(false);
    paymentForm.resetFields();
  }, [paymentForm]);

  const handleRecordPayment = useCallback(
    async (values: {
      amount: number;
      payment_date: dayjs.Dayjs;
      payment_type: 'cash' | 'card' | 'transfer' | 'cheque' | 'gold';
      id_purchase?: string;
      notes?: string;
      // Cheque fields
      cheque_number?: string;
      cheque_bank?: string;
      cheque_date?: dayjs.Dayjs;
      // Gold fields
      gold_weight_grams?: number;
      gold_rate_per_gram?: number;
    }) => {
      if (!supplier) {
        return;
      }

      setIsRecordingPayment(true);
      try {
        const result = await recordSupplierPayment({
          id_supplier: supplierId,
          amount: values.amount,
          transaction_date: values.payment_date.format('YYYY-MM-DD'),
          notes: values.notes || null,
          reference_type: values.id_purchase ? 'purchase' : 'payment',
          reference_id: values.id_purchase || null,
          payment_type: values.payment_type,
          // Cheque fields
          cheque_number: values.cheque_number || null,
          cheque_bank: values.cheque_bank || null,
          cheque_date: values.cheque_date?.format('YYYY-MM-DD') || null,
          // Gold fields
          gold_weight_grams: values.gold_weight_grams || null,
          gold_rate_per_gram: values.gold_rate_per_gram || null,
        });

        if (result.success) {
          message.success(t('messages.paymentRecorded'));
          handleClosePaymentDrawer();
          // Refresh data - the hooks will auto-refetch on next render
          window.location.reload();
        } else {
          message.error(result.error || t('messages.paymentError'));
        }
      } catch (error) {
        console.error('[SupplierDetail] Record payment error:', error);
        message.error(t('messages.paymentError'));
      } finally {
        setIsRecordingPayment(false);
      }
    },
    [supplier, supplierId, t, handleClosePaymentDrawer]
  );

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================

  // Transaction columns (ledger)
  const transactionColumns: ColumnsType<SupplierTransaction> = useMemo(
    () => [
      {
        title: tCommon('labels.date'),
        dataIndex: 'transaction_date',
        key: 'date',
        width: 110,
        render: (date: string) => formatDate(date, locale, 'short'),
      },
      {
        title: tCommon('labels.type'),
        dataIndex: 'transaction_type',
        key: 'type',
        width: 100,
        render: (type: string) => {
          const config: Record<string, { color: string; label: string }> = {
            purchase: { color: 'blue', label: tPurchases('purchase') },
            payment: { color: 'green', label: t('payments') },
          };
          const { color, label } = config[type] || { color: 'default', label: type };
          return <Tag color={color}>{label}</Tag>;
        },
      },
      {
        title: tCommon('labels.description'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: t('debit'),
        dataIndex: 'debit_amount',
        key: 'debit',
        width: 120,
        align: 'end',
        render: (amount: number) =>
          amount > 0 ? (
            <Text className="font-medium text-red-600">
              {formatCurrency(amount, currency, locale)}
            </Text>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
      {
        title: t('credit'),
        dataIndex: 'credit_amount',
        key: 'credit',
        width: 120,
        align: 'end',
        render: (amount: number) =>
          amount > 0 ? (
            <Text className="font-medium text-emerald-600">
              {formatCurrency(amount, currency, locale)}
            </Text>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
      {
        title: t('runningBalance'),
        dataIndex: 'balance_after',
        key: 'balance_after',
        width: 130,
        align: 'end',
        render: (balance: number) => (
          <Text className={cn('font-medium', balance > 0 ? 'text-red-600' : 'text-emerald-600')}>
            {formatCurrency(balance, currency, locale)}
          </Text>
        ),
      },
    ],
    [t, tCommon, tPurchases, currency, locale]
  );

  // Purchase columns
  const purchaseColumns: ColumnsType<PurchaseWithSupplier> = useMemo(
    () => [
      {
        title: tPurchases('purchaseNumber'),
        dataIndex: 'purchase_number',
        key: 'purchase_number',
        width: 140,
        render: (number: string, record: PurchaseWithSupplier) => (
          <Link
            href={`/${locale}/${shopId}/purchases/${record.id_purchase}`}
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            {number}
          </Link>
        ),
      },
      {
        title: tPurchases('purchaseDate'),
        dataIndex: 'purchase_date',
        key: 'date',
        width: 110,
        render: (date: string) => formatDate(date, locale, 'short'),
      },
      {
        title: tPurchases('totalAmount'),
        dataIndex: 'total_amount',
        key: 'total',
        width: 120,
        align: 'end',
        render: (amount: number) => (
          <Text className="font-medium">{formatCurrency(amount, currency, locale)}</Text>
        ),
      },
      {
        title: tPurchases('paidAmount'),
        dataIndex: 'paid_amount',
        key: 'paid',
        width: 120,
        align: 'end',
        render: (amount: number) => (
          <Text className="text-emerald-600">{formatCurrency(amount, currency, locale)}</Text>
        ),
      },
      {
        title: tPurchases('balanceDue'),
        key: 'balance',
        width: 120,
        align: 'end',
        render: (_: unknown, record: PurchaseWithSupplier) => {
          const balance = Number(record.total_amount) - Number(record.paid_amount);
          return (
            <Text className={cn('font-medium', balance > 0 ? 'text-orange-500' : 'text-stone-400')}>
              {formatCurrency(balance, currency, locale)}
            </Text>
          );
        },
      },
      {
        title: tCommon('labels.status'),
        dataIndex: 'payment_status',
        key: 'status',
        width: 110,
        render: (status: string | null) => {
          const config: Record<string, { color: string; label: string }> = {
            paid: { color: 'success', label: tPurchases('paymentStatus.paid') },
            partial: { color: 'warning', label: tPurchases('paymentStatus.partial') },
            unpaid: { color: 'default', label: tPurchases('paymentStatus.unpaid') },
          };
          const { color, label } = config[status || 'unpaid'] || {
            color: 'default',
            label: status,
          };
          return <Tag color={color}>{label}</Tag>;
        },
      },
      {
        title: tCommon('labels.actions'),
        key: 'actions',
        width: 80,
        align: 'center',
        render: (_: unknown, record: PurchaseWithSupplier) => (
          <Link href={`/${locale}/${shopId}/purchases/${record.id_purchase}`}>
            <Button size="small" type="text" icon={<EyeOutlined />} />
          </Link>
        ),
      },
    ],
    [tCommon, tPurchases, currency, locale, shopId]
  );

  // Payment columns
  const paymentColumns: ColumnsType<SupplierPaymentWithPurchase> = useMemo(
    () => [
      {
        title: tCommon('labels.date'),
        dataIndex: 'payment_date',
        key: 'date',
        width: 110,
        render: (date: string) => formatDate(date, locale, 'short'),
      },
      {
        title: t('paymentType'),
        dataIndex: 'payment_type',
        key: 'type',
        width: 100,
        render: (type: string) => {
          const config: Record<string, { color: string; icon: React.ReactNode }> = {
            cash: { color: 'green', icon: <DollarOutlined /> },
            card: { color: 'blue', icon: <CreditCardOutlined /> },
            transfer: { color: 'purple', icon: <SwapOutlined /> },
            cheque: { color: 'orange', icon: <BankOutlined /> },
            gold: { color: 'gold', icon: <GoldOutlined /> },
          };
          const { color, icon } = config[type] || { color: 'default', icon: null };
          return (
            <Tag color={color} icon={icon}>
              {t(`paymentTypes.${type}`)}
            </Tag>
          );
        },
      },
      {
        title: tCommon('labels.amount'),
        dataIndex: 'amount',
        key: 'amount',
        width: 120,
        align: 'end',
        render: (amount: number) => (
          <Text className="font-medium text-emerald-600">
            {formatCurrency(amount, currency, locale)}
          </Text>
        ),
      },
      {
        title: t('relatedPurchase'),
        key: 'purchase',
        width: 140,
        render: (_: unknown, record: SupplierPaymentWithPurchase) =>
          record.purchase ? (
            <Link
              href={`/${locale}/${shopId}/purchases/${record.purchase.id_purchase}`}
              className="text-amber-600 hover:text-amber-700"
            >
              {record.purchase.purchase_number}
            </Link>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
      {
        title: t('paymentBreakdown'),
        key: 'breakdown',
        ellipsis: true,
        render: (_: unknown, record: SupplierPaymentWithPurchase) => {
          const parts: string[] = [];
          if (record.cash_amount && record.cash_amount > 0) {
            parts.push(
              `${t('paymentTypes.cash')}: ${formatCurrency(record.cash_amount, currency, locale)}`
            );
          }
          if (record.card_amount && record.card_amount > 0) {
            parts.push(
              `${t('paymentTypes.card')}: ${formatCurrency(record.card_amount, currency, locale)}`
            );
          }
          if (record.transfer_amount && record.transfer_amount > 0) {
            parts.push(
              `${t('paymentTypes.transfer')}: ${formatCurrency(record.transfer_amount, currency, locale)}`
            );
          }
          if (record.cheque_amount && record.cheque_amount > 0) {
            parts.push(
              `${t('paymentTypes.cheque')}: ${formatCurrency(record.cheque_amount, currency, locale)}`
            );
          }
          if (record.gold_weight_grams && record.gold_weight_grams > 0) {
            parts.push(`${t('paymentTypes.gold')}: ${record.gold_weight_grams}g`);
          }
          return parts.length > 0 ? (
            <Tooltip title={parts.join(' | ')}>
              <Text type="secondary" className="text-xs">
                {parts.join(' | ')}
              </Text>
            </Tooltip>
          ) : (
            <Text type="secondary">-</Text>
          );
        },
      },
      {
        title: tCommon('labels.notes'),
        dataIndex: 'notes',
        key: 'notes',
        ellipsis: true,
        render: (notes: string | null) =>
          notes ? (
            <Tooltip title={notes}>
              <Text type="secondary">{notes}</Text>
            </Tooltip>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
    ],
    [t, tCommon, currency, locale, shopId]
  );

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  /**
   * Get supplier address
   */
  const getAddress = (s: Supplier): string | null => {
    return s.address || null;
  };

  // ==========================================================================
  // TAB CONTENT
  // ==========================================================================

  const renderOverviewTab = () => {
    if (!supplier) {
      return null;
    }

    const address = getAddress(supplier);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card title={t('sections.contactInfo')} className="border-stone-200">
            <Descriptions column={{ xs: 1, sm: 2 }} colon={false}>
              {supplier.contact_person && (
                <Descriptions.Item label={t('contactPerson')}>
                  {supplier.contact_person}
                </Descriptions.Item>
              )}
              {supplier.phone && (
                <Descriptions.Item label={t('phone')}>
                  <a
                    href={`tel:${supplier.phone}`}
                    className="text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    dir="ltr"
                  >
                    <PhoneOutlined />
                    {formatPhone(supplier.phone)}
                  </a>
                </Descriptions.Item>
              )}
              {supplier.email && (
                <Descriptions.Item label={t('email')}>
                  <a
                    href={`mailto:${supplier.email}`}
                    className="text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    <MailOutlined />
                    {supplier.email}
                  </a>
                </Descriptions.Item>
              )}
              {address && (
                <Descriptions.Item label={tCommon('labels.address')} span={2}>
                  <span className="flex items-start gap-1">
                    <EnvironmentOutlined className="text-stone-400 mt-1" />
                    {address}
                  </span>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Notes */}
          {supplier.notes && (
            <Card
              title={
                <span className="flex items-center gap-2">
                  <FileTextOutlined className="text-amber-500" />
                  {tCommon('labels.notes')}
                </span>
              }
              className="border-stone-200"
            >
              <Paragraph className="whitespace-pre-wrap mb-0">{supplier.notes}</Paragraph>
            </Card>
          )}
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">
          {/* Balance Card */}
          <Card className="border-stone-200">
            <BalanceDisplay balance={supplier.current_balance} currency={currency} />
          </Card>

          {/* Quick Info */}
          <Card className="border-stone-200">
            <div className="space-y-4">
              {/* Category */}
              {supplier.supplier_categories && (
                <div className="flex items-center justify-between">
                  <Text type="secondary" className="text-sm">
                    {tCommon('labels.category')}
                  </Text>
                  <Tag icon={<TagOutlined />} color="processing">
                    {supplier.supplier_categories.category_name}
                  </Tag>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  {tCommon('labels.status')}
                </Text>
                {supplier.status === 'active' ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    {tCommon('status.active')}
                  </Tag>
                ) : (
                  <Tag color="default" icon={<CloseCircleOutlined />}>
                    {tCommon('status.inactive')}
                  </Tag>
                )}
              </div>

              {/* Created Date */}
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  {tCommon('labels.createdAt')}
                </Text>
                <Text className="flex items-center gap-1">
                  <CalendarOutlined className="text-stone-400" />
                  {formatDate(supplier.created_at, 'en-US', 'short')}
                </Text>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderTransactionsTab = () => {
    return (
      <Card className="border-stone-200">
        <Table
          dataSource={transactions}
          columns={transactionColumns}
          rowKey="id_transaction"
          loading={transactionsLoading}
          pagination={{
            current: transactionPage,
            pageSize: 10,
            total: transactionCount,
            onChange: setTransactionPage,
            showSizeChanger: false,
          }}
          emptyText={
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('noTransactions')} />
          }
        />
      </Card>
    );
  };

  const renderPurchasesTab = () => {
    return (
      <Card
        className="border-stone-200"
        title={
          <div className="flex items-center justify-between">
            <span>{t('tabs.purchases')}</span>
            {can('purchases.create') && (
              <Link href={`/${locale}/${shopId}/purchases/new?supplier=${supplierId}`}>
                <Button type="primary" size="small" icon={<PlusOutlined />}>
                  {tPurchases('newPurchase')}
                </Button>
              </Link>
            )}
          </div>
        }
      >
        <Table
          dataSource={purchases}
          columns={purchaseColumns}
          rowKey="id_purchase"
          loading={purchasesLoading}
          pagination={{
            current: purchasePage,
            pageSize: 10,
            total: purchaseCount,
            onChange: setPurchasePage,
            showSizeChanger: false,
          }}
          emptyText={
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('noPurchasesYet')} />
          }
        />
      </Card>
    );
  };

  const renderPaymentsTab = () => {
    return (
      <Card
        className="border-stone-200"
        title={
          <div className="flex items-center justify-between">
            <span>{t('tabs.payments')}</span>
            {can('suppliers.payments') && supplier && supplier.current_balance > 0 && (
              <Button
                type="primary"
                size="small"
                icon={<DollarOutlined />}
                onClick={handleOpenPaymentDrawer}
              >
                {t('recordPayment')}
              </Button>
            )}
          </div>
        }
      >
        <Table
          dataSource={payments}
          columns={paymentColumns}
          rowKey="id_payment"
          loading={paymentsLoading}
          pagination={{
            current: paymentPage,
            pageSize: 10,
            total: paymentCount,
            onChange: setPaymentPage,
            showSizeChanger: false,
          }}
          emptyText={
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('noPaymentsYet')} />
          }
        />
      </Card>
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Error state
  if (error) {
    return (
      <div className="supplier-detail-page">
        <PageHeader title={t('supplierDetails')} showBack onBack={handleBack} />
        <Alert
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message={t('messages.loadError')}
          description={tCommon('messages.tryAgain')}
          action={
            <Button onClick={() => window.location.reload()}>{tCommon('actions.retry')}</Button>
          }
        />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="supplier-detail-page">
        <PageHeader title={t('supplierDetails')} showBack onBack={handleBack} />
        <DetailSkeleton />
      </div>
    );
  }

  // Not found state
  if (!supplier) {
    return (
      <div className="supplier-detail-page">
        <PageHeader title={t('supplierDetails')} showBack onBack={handleBack} />
        <EmptyState
          icon={<ShopOutlined />}
          title={t('messages.notFound')}
          description={t('messages.notFoundDescription')}
          action={{
            label: t('backToSuppliers'),
            onClick: handleBack,
          }}
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="supplier-detail-page">
      {/* Page Header */}
      <PageHeader
        title={supplier.company_name}
        subtitle={supplier.contact_person || undefined}
        showBack
        onBack={handleBack}
        breadcrumbOverrides={[{ key: 'supplierId', label: supplier.company_name }]}
      >
        <Space>
          {can('suppliers.manage') && (
            <Button icon={<EditOutlined />} onClick={handleEdit}>
              {tCommon('actions.edit')}
            </Button>
          )}
          {can('suppliers.delete') && (
            <Popconfirm
              title={t('deleteConfirmTitle')}
              description={t('deleteConfirmDescription')}
              onConfirm={handleDelete}
              okText={tCommon('actions.delete')}
              cancelText={tCommon('actions.cancel')}
              okButtonProps={{ danger: true, loading: deleteSupplier.isPending }}
            >
              <Button danger icon={<DeleteOutlined />} loading={deleteSupplier.isPending}>
                {tCommon('actions.delete')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      </PageHeader>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        items={[
          {
            key: 'overview',
            label: t('tabs.overview'),
            children: renderOverviewTab(),
          },
          {
            key: 'transactions',
            label: t('tabs.transactions'),
            children: renderTransactionsTab(),
          },
          {
            key: 'purchases',
            label: t('tabs.purchases'),
            children: renderPurchasesTab(),
          },
          {
            key: 'payments',
            label: t('tabs.payments'),
            children: renderPaymentsTab(),
          },
        ]}
        className="supplier-detail-tabs"
      />

      {/* Edit Drawer */}
      <Drawer
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t('editSupplier')}
        width={600}
        placement="right"
        destroyOnClose
      >
        <SupplierForm
          supplier={supplier}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Drawer>

      {/* Record Payment Drawer */}
      <Drawer
        open={isPaymentDrawerOpen}
        onClose={handleClosePaymentDrawer}
        title={t('recordPayment')}
        width={480}
        placement="right"
        destroyOnClose
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={handleClosePaymentDrawer}>{tCommon('actions.cancel')}</Button>
            <Button
              type="primary"
              onClick={() => paymentForm.submit()}
              loading={isRecordingPayment}
              icon={<DollarOutlined />}
            >
              {t('recordPayment')}
            </Button>
          </div>
        }
      >
        <div className="mb-6">
          <Alert
            type="info"
            showIcon
            message={t('currentBalance')}
            description={
              <Text strong className="text-lg text-red-600">
                {formatCurrency(supplier.current_balance, currency, locale)}
              </Text>
            }
          />
        </div>

        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handleRecordPayment}
          initialValues={{
            payment_date: dayjs(),
            payment_type: 'cash',
          }}
        >
          <Form.Item
            name="amount"
            label={tCommon('labels.amount')}
            rules={[
              { required: true, message: t('validation.amountRequired') },
              {
                type: 'number',
                min: 0.01,
                message: t('validation.amountPositive'),
              },
              {
                type: 'number',
                max: supplier.current_balance,
                message: t('validation.amountExceedsBalance'),
              },
            ]}
          >
            <InputNumber
              className="!w-full"
              size="large"
              min={0.01}
              max={supplier.current_balance}
              precision={2}
              prefix={currency}
              placeholder={t('placeholders.enterAmount')}
            />
          </Form.Item>

          <Form.Item name="id_purchase" label={t('applyToPurchase')}>
            <Select
              size="large"
              allowClear
              placeholder={t('placeholders.selectPurchase')}
              options={purchases
                .filter((p) => p.payment_status === 'unpaid' || p.payment_status === 'partial')
                .map((p) => ({
                  value: p.id_purchase,
                  label: `${p.purchase_number} - ${formatCurrency(Number(p.total_amount) - Number(p.paid_amount), currency, locale)} ${tPurchases('balanceDue').toLowerCase()}`,
                }))}
            />
          </Form.Item>

          <Form.Item
            name="payment_date"
            label={t('paymentDate')}
            rules={[{ required: true, message: t('validation.dateRequired') }]}
          >
            <DatePicker className="!w-full" size="large" format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item name="payment_type" label={t('paymentType')}>
            <Select size="large">
              <Select.Option value="cash">
                <Space>
                  <DollarOutlined />
                  {t('paymentTypes.cash')}
                </Space>
              </Select.Option>
              <Select.Option value="card">
                <Space>
                  <CreditCardOutlined />
                  {t('paymentTypes.card')}
                </Space>
              </Select.Option>
              <Select.Option value="transfer">
                <Space>
                  <SwapOutlined />
                  {t('paymentTypes.transfer')}
                </Space>
              </Select.Option>
              <Select.Option value="cheque">
                <Space>
                  <BankOutlined />
                  {t('paymentTypes.cheque')}
                </Space>
              </Select.Option>
              <Select.Option value="gold">
                <Space>
                  <GoldOutlined />
                  {t('paymentTypes.gold')}
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>

          {/* Cheque Fields - shown when payment_type is 'cheque' */}
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.payment_type !== curr.payment_type}>
            {({ getFieldValue }) =>
              getFieldValue('payment_type') === 'cheque' && (
                <>
                  <Form.Item
                    name="cheque_number"
                    label={t('chequeNumber')}
                    rules={[{ required: true, message: t('validation.chequeNumberRequired') }]}
                  >
                    <Input size="large" placeholder={t('placeholders.chequeNumber')} />
                  </Form.Item>
                  <Form.Item
                    name="cheque_bank"
                    label={t('chequeBank')}
                    rules={[{ required: true, message: t('validation.chequeBankRequired') }]}
                  >
                    <Input size="large" placeholder={t('placeholders.chequeBank')} />
                  </Form.Item>
                  <Form.Item
                    name="cheque_date"
                    label={t('chequeDate')}
                    rules={[{ required: true, message: t('validation.chequeDateRequired') }]}
                  >
                    <DatePicker className="!w-full" size="large" format="YYYY-MM-DD" />
                  </Form.Item>
                </>
              )
            }
          </Form.Item>

          {/* Gold Fields - shown when payment_type is 'gold' */}
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.payment_type !== curr.payment_type}>
            {({ getFieldValue }) =>
              getFieldValue('payment_type') === 'gold' && (
                <>
                  <Form.Item
                    name="gold_weight_grams"
                    label={t('goldWeightGrams')}
                    rules={[
                      { required: true, message: t('validation.goldWeightRequired') },
                      { type: 'number', min: 0.001, message: t('validation.goldWeightPositive') },
                    ]}
                  >
                    <InputNumber
                      className="!w-full"
                      size="large"
                      min={0.001}
                      precision={3}
                      placeholder={t('placeholders.goldWeight')}
                      suffix="g"
                    />
                  </Form.Item>
                  <Form.Item
                    name="gold_rate_per_gram"
                    label={t('goldRatePerGram')}
                    rules={[
                      { required: true, message: t('validation.goldRateRequired') },
                      { type: 'number', min: 0.01, message: t('validation.goldRatePositive') },
                    ]}
                  >
                    <InputNumber
                      className="!w-full"
                      size="large"
                      min={0.01}
                      precision={2}
                      prefix={currency}
                      placeholder={t('placeholders.goldRate')}
                    />
                  </Form.Item>
                </>
              )
            }
          </Form.Item>

          <Form.Item name="notes" label={tCommon('labels.notes')}>
            <Input.TextArea
              rows={3}
              placeholder={t('placeholders.paymentNotes')}
              maxLength={1000}
              showCount
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
