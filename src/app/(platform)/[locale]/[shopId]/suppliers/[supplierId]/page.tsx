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
} from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { SupplierForm } from '@/components/domain/suppliers';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table, type ColumnsType } from '@/components/ui/Table';
import {
  useSupplier,
  useSupplierTransactions,
  useDeleteSupplier,
  type Supplier,
  type SupplierTransaction,
} from '@/lib/hooks/data/useSuppliers';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { useRouter } from '@/lib/i18n/navigation';
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
  const { can } = usePermissions();
  const router = useRouter();
  const params = useParams();
  const { shop } = useShop();

  const supplierId = params.supplierId as string;
  const currency = shop?.currency || 'USD';

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [transactionPage, setTransactionPage] = useState(1);

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

  // ==========================================================================
  // TRANSACTION TABLE COLUMNS
  // ==========================================================================

  const transactionColumns: ColumnsType<SupplierTransaction> = useMemo(
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
            purchase: 'blue',
            payment: 'green',
            return: 'orange',
            adjustment: 'default',
          };
          return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
        },
      },
      {
        title: tCommon('labels.reference'),
        dataIndex: 'reference_number',
        key: 'reference',
        ellipsis: true,
      },
      {
        title: tCommon('labels.description'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: tCommon('labels.amount'),
        dataIndex: 'amount',
        key: 'amount',
        width: 140,
        align: 'end',
        render: (amount: number) => (
          <Text className={cn('font-medium', amount > 0 ? 'text-red-600' : 'text-emerald-600')}>
            {amount > 0 ? '+' : ''}
            {formatCurrency(amount, currency)}
          </Text>
        ),
      },
      {
        title: t('runningBalance'),
        dataIndex: 'running_balance',
        key: 'running_balance',
        width: 140,
        align: 'end',
        render: (balance: number) => (
          <Text className="font-medium">{formatCurrency(balance, currency)}</Text>
        ),
      },
    ],
    [t, tCommon, currency]
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
      <Card className="border-stone-200">
        <EmptyState
          icon={<ShopOutlined />}
          title={t('purchase.title')}
          description={t('purchase.comingSoon')}
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
          title={t('payments')}
          description={t('paymentsComingSoon')}
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

      {/* Edit Modal */}
      <Modal
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        title={t('editSupplier')}
        width={720}
        hideFooter
        destroyOnClose
      >
        <SupplierForm
          supplier={supplier}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
