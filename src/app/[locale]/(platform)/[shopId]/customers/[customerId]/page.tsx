'use client';

/**
 * Customer Detail Page
 *
 * Displays comprehensive customer information with tabs for different views.
 *
 * Features:
 * - Full customer info display (name, phone, email, address)
 * - Contact information section
 * - Social media links
 * - Balance display with breakdown
 * - Tabs: Overview, Transactions, Sales, Payments
 * - Transaction history table (immutable ledger)
 * - Edit and Delete actions in header
 *
 * @module app/(platform)/[locale]/[shopId]/customers/[customerId]/page
 */

import React, { useState, useCallback, useMemo } from 'react';

import { useParams } from 'next/navigation';

import {
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  UserOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  CrownOutlined,
  BankOutlined,
  ExclamationCircleOutlined,
  InstagramOutlined,
  FacebookOutlined,
  WhatsAppOutlined,
  ShoppingOutlined,
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
} from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { CustomerForm } from '@/components/domain/customers';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table, type ColumnsType } from '@/components/ui/Table';
import { useCustomer } from '@/lib/hooks/data/useCustomer';
import { useDeleteCustomer } from '@/lib/hooks/data/useCustomers';
import {
  useCustomerTransactions,
  type CustomerTransactionWithDetails,
} from '@/lib/hooks/data/useCustomerTransactions';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatPhone, formatDate } from '@/lib/utils/format';

const { Text, Title, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

type TabKey = 'overview' | 'transactions' | 'sales' | 'payments';

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
  const t = useTranslations('customers');

  const formattedBalance = formatCurrency(Math.abs(balance), currency);
  const owesBalance = balance > 0; // Customer owes shop
  const hasCredit = balance < 0; // Shop owes customer

  return (
    <div className="text-center py-4">
      <Text type="secondary" className="text-sm block mb-1">
        {t('currentBalance')}
      </Text>
      <Title
        level={2}
        className={cn(
          '!mb-1',
          owesBalance && '!text-red-600',
          hasCredit && '!text-emerald-600',
          !owesBalance && !hasCredit && '!text-stone-400'
        )}
      >
        {balance === 0
          ? formattedBalance
          : owesBalance
            ? `+${formattedBalance}`
            : `-${formattedBalance}`}
      </Title>
      {balance !== 0 && (
        <Text type="secondary" className="text-xs">
          {owesBalance ? t('creditAccount.balance') : t('creditAccount.available')}
        </Text>
      )}
    </div>
  );
}

/**
 * Loading skeleton for customer detail
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
 * Customer Detail Page Component
 */
export default function CustomerDetailPage(): React.JSX.Element {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();
  const router = useRouter();
  const params = useParams();
  const { shop } = useShop();

  const customerId = params.customerId as string;
  const currency = shop?.currency || 'USD';

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [transactionPage, setTransactionPage] = useState(1);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { customer, isLoading, error, refetch } = useCustomer({ customerId, includeUsers: true });
  const deleteCustomer = useDeleteCustomer();

  // Fetch transactions for the transactions tab
  const {
    transactions,
    totalCount: transactionCount,
    isLoading: transactionsLoading,
  } = useCustomerTransactions({
    customerId,
    page: transactionPage,
    pageSize: 10,
  });

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleEdit = useCallback(() => {
    setIsEditDrawerOpen(true);
  }, []);

  const handleEditSuccess = useCallback(() => {
    setIsEditDrawerOpen(false);
    refetch();
  }, [refetch]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteCustomer.mutateAsync(customerId);
      message.success(t('messages.deleteSuccess'));
      router.push(`/${params.locale}/${params.shopId}/customers`);
    } catch (err) {
      console.error('[CustomerDetail] Delete error:', err);
      message.error(t('messages.deleteError'));
    }
  }, [customerId, deleteCustomer, router, params, t]);

  const handleBack = useCallback(() => {
    router.push(`/${params.locale}/${params.shopId}/customers`);
  }, [router, params]);

  // ==========================================================================
  // TRANSACTION TABLE COLUMNS
  // ==========================================================================

  const transactionColumns: ColumnsType<CustomerTransactionWithDetails> = useMemo(
    () => [
      {
        title: tCommon('labels.date'),
        dataIndex: 'created_at',
        key: 'date',
        width: 120,
        render: (date: string) => formatDate(date, 'en-US', 'short'),
      },
      {
        title: tCommon('labels.type'),
        dataIndex: 'transaction_type',
        key: 'type',
        width: 120,
        render: (type: string) => {
          const colorMap: Record<string, string> = {
            sale: 'blue',
            payment: 'green',
            refund: 'orange',
            adjustment: 'default',
            return: 'orange',
            opening_balance: 'purple',
          };
          return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
        },
      },
      {
        title: tCommon('labels.description'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: t('creditAccount.debit'),
        dataIndex: 'debit_amount',
        key: 'debit',
        width: 120,
        align: 'end',
        render: (amount: number) =>
          amount > 0 ? (
            <Text className="text-red-600 font-medium">+{formatCurrency(amount, currency)}</Text>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
      {
        title: t('creditAccount.credit'),
        dataIndex: 'credit_amount',
        key: 'credit',
        width: 120,
        align: 'end',
        render: (amount: number) =>
          amount > 0 ? (
            <Text className="text-emerald-600 font-medium">
              -{formatCurrency(amount, currency)}
            </Text>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
      {
        title: t('creditAccount.balance'),
        dataIndex: 'balance_after',
        key: 'balance_after',
        width: 140,
        align: 'end',
        render: (balance: number) => (
          <Text
            className={cn(
              'font-medium',
              balance > 0 ? 'text-red-600' : balance < 0 ? 'text-emerald-600' : ''
            )}
          >
            {formatCurrency(balance, currency)}
          </Text>
        ),
      },
    ],
    [t, tCommon, currency]
  );

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  /**
   * Get client type icon and color
   */
  const getClientTypeConfig = (clientType: string | null) => {
    switch (clientType) {
      case 'vip':
        return { icon: <CrownOutlined />, color: 'gold', label: t('clientTypes.vip') };
      case 'collaboration':
        return { icon: <BankOutlined />, color: 'blue', label: t('clientTypes.collaboration') };
      case 'regular':
        return { icon: <UserOutlined />, color: 'default', label: t('clientTypes.regular') };
      default:
        return { icon: <UserOutlined />, color: 'default', label: t('clientTypes.walk-in') };
    }
  };

  // ==========================================================================
  // TAB CONTENT
  // ==========================================================================

  const renderOverviewTab = () => {
    if (!customer) {
      return null;
    }

    const clientTypeConfig = getClientTypeConfig(customer.client_type);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card title={t('sections.contactInfo')} className="border-stone-200">
            <Descriptions column={{ xs: 1, sm: 2 }} colon={false}>
              {customer.phone && (
                <Descriptions.Item label={tCommon('labels.phone')}>
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    dir="ltr"
                  >
                    <PhoneOutlined />
                    {formatPhone(customer.phone)}
                  </a>
                </Descriptions.Item>
              )}
              {customer.email && (
                <Descriptions.Item label={tCommon('labels.email')}>
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    <MailOutlined />
                    {customer.email}
                  </a>
                </Descriptions.Item>
              )}
              {customer.address && (
                <Descriptions.Item label={tCommon('labels.address')} span={2}>
                  <span className="flex items-start gap-1">
                    <EnvironmentOutlined className="text-stone-400 mt-1" />
                    {customer.address}
                  </span>
                </Descriptions.Item>
              )}
              {customer.city && (
                <Descriptions.Item label={t('city')}>{customer.city}</Descriptions.Item>
              )}
              {customer.area && (
                <Descriptions.Item label={t('area')}>{customer.area}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Social Media */}
          {(customer.instagram || customer.facebook || customer.whatsapp || customer.tiktok) && (
            <Card title={t('sections.socialMedia')} className="border-stone-200">
              <div className="flex flex-wrap gap-4">
                {customer.instagram && (
                  <a
                    href={`https://instagram.com/${customer.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-pink-600 hover:text-pink-700"
                  >
                    <InstagramOutlined className="text-lg" />
                    <span>@{customer.instagram}</span>
                  </a>
                )}
                {customer.facebook && (
                  <a
                    href={`https://facebook.com/${customer.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <FacebookOutlined className="text-lg" />
                    <span>{customer.facebook}</span>
                  </a>
                )}
                {customer.whatsapp && (
                  <a
                    href={`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-green-600 hover:text-green-700"
                  >
                    <WhatsAppOutlined className="text-lg" />
                    <span>{customer.whatsapp}</span>
                  </a>
                )}
              </div>
            </Card>
          )}

          {/* Notes */}
          {customer.notes && (
            <Card
              title={
                <span className="flex items-center gap-2">
                  <FileTextOutlined className="text-amber-500" />
                  {tCommon('labels.notes')}
                </span>
              }
              className="border-stone-200"
            >
              <Paragraph className="whitespace-pre-wrap mb-0">{customer.notes}</Paragraph>
            </Card>
          )}
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">
          {/* Balance Card */}
          <Card className="border-stone-200">
            <BalanceDisplay balance={customer.current_balance} currency={currency} />
          </Card>

          {/* Quick Info */}
          <Card className="border-stone-200">
            <div className="space-y-4">
              {/* Client Type */}
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  {t('clientType')}
                </Text>
                <Tag icon={clientTypeConfig.icon} color={clientTypeConfig.color}>
                  {clientTypeConfig.label}
                </Tag>
              </div>

              {/* VIP Status */}
              {customer.is_vip && (
                <div className="flex items-center justify-between">
                  <Text type="secondary" className="text-sm">
                    {t('vipStatus')}
                  </Text>
                  <Tag icon={<CrownOutlined />} color="gold">
                    {t('segments.vip')}
                  </Tag>
                </div>
              )}

              {/* Financial Status */}
              {customer.financial_status && (
                <div className="flex items-center justify-between">
                  <Text type="secondary" className="text-sm">
                    {t('financialStatus')}
                  </Text>
                  <Tag
                    color={
                      customer.financial_status === 'good'
                        ? 'success'
                        : customer.financial_status === 'warning'
                          ? 'warning'
                          : customer.financial_status === 'critical'
                            ? 'error'
                            : 'default'
                    }
                  >
                    {customer.financial_status}
                  </Tag>
                </div>
              )}

              {/* Total Purchases */}
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  {t('totalPurchases')}
                </Text>
                <Text className="font-medium">
                  {formatCurrency(customer.total_purchases, currency)}
                </Text>
              </div>

              {/* Total Payments */}
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  {t('totalPayments')}
                </Text>
                <Text className="font-medium">
                  {formatCurrency(customer.total_payments, currency)}
                </Text>
              </div>

              {/* Created Date */}
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  {tCommon('labels.createdAt')}
                </Text>
                <Text className="flex items-center gap-1">
                  <CalendarOutlined className="text-stone-400" />
                  {formatDate(customer.created_at, 'en-US', 'short')}
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

  const renderSalesTab = () => {
    return (
      <Card className="border-stone-200">
        <EmptyState
          icon={<ShoppingOutlined />}
          title={t('salesHistory')}
          description={tCommon('labels.comingSoon')}
          size="md"
        />
      </Card>
    );
  };

  const renderPaymentsTab = () => {
    return (
      <Card className="border-stone-200">
        <EmptyState
          icon={<DollarOutlined />}
          title={t('paymentHistory')}
          description={tCommon('labels.comingSoon')}
          size="md"
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
      <div className="customer-detail-page">
        <PageHeader title={t('customerDetails')} showBack onBack={handleBack} />
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
      <div className="customer-detail-page">
        <PageHeader title={t('customerDetails')} showBack onBack={handleBack} />
        <DetailSkeleton />
      </div>
    );
  }

  // Not found state
  if (!customer) {
    return (
      <div className="customer-detail-page">
        <PageHeader title={t('customerDetails')} showBack onBack={handleBack} />
        <EmptyState
          icon={<UserOutlined />}
          title={t('messages.notFound')}
          description={t('messages.notFoundDescription')}
          action={{
            label: t('backToCustomers'),
            onClick: handleBack,
          }}
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="customer-detail-page">
      {/* Page Header */}
      <PageHeader
        title={customer.full_name}
        subtitle={customer.phone ? formatPhone(customer.phone) : undefined}
        showBack
        onBack={handleBack}
        breadcrumbOverrides={[{ key: 'customerId', label: customer.full_name }]}
      >
        <Space>
          {can('customers.manage') && (
            <Button icon={<EditOutlined />} onClick={handleEdit}>
              {tCommon('actions.edit')}
            </Button>
          )}
          {can('customers.delete') && (
            <Popconfirm
              title={t('deleteConfirmTitle')}
              description={t('deleteConfirmDescription')}
              onConfirm={handleDelete}
              okText={tCommon('actions.delete')}
              cancelText={tCommon('actions.cancel')}
              okButtonProps={{ danger: true, loading: deleteCustomer.isPending }}
            >
              <Button danger icon={<DeleteOutlined />} loading={deleteCustomer.isPending}>
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
            key: 'sales',
            label: t('tabs.sales'),
            children: renderSalesTab(),
          },
          {
            key: 'payments',
            label: t('tabs.payments'),
            children: renderPaymentsTab(),
          },
        ]}
        className="customer-detail-tabs"
      />

      {/* Edit Drawer */}
      <Drawer
        open={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        title={t('editCustomer')}
        width={600}
        placement="right"
        destroyOnClose
      >
        <CustomerForm
          customer={customer}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditDrawerOpen(false)}
        />
      </Drawer>
    </div>
  );
}
