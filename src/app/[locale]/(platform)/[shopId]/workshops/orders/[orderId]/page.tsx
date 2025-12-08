'use client';

/**
 * Workshop Order Detail Page
 *
 * Comprehensive workshop order detail view showing full information.
 * Displays order header, workshop info, items, costs, status timeline, and payments.
 *
 * Features:
 * - Order header with status badge
 * - Workshop info card
 * - Items list (if applicable)
 * - Cost breakdown (estimated vs actual)
 * - Status history/timeline
 * - Payment history
 * - Actions: Update Status, Record Payment, Complete
 * - Loading and error states
 * - RTL support
 *
 * @module app/(platform)/[locale]/[shopId]/workshops/orders/[orderId]/page
 */

import React, { useState, useMemo, useCallback } from 'react';

import {
  ShopOutlined,
  HomeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
  ExclamationCircleFilled,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  WalletOutlined,
  PlayCircleOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import {
  Card,
  Tag,
  Typography,
  Descriptions,
  Space,
  Skeleton,
  Alert,
  Timeline,
  Popconfirm,
  message,
  Modal,
  InputNumber,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslations, useLocale } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { RecordPaymentModal } from '@/components/domain/workshops/RecordPaymentModal';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useWorkshopOrder, useUpdateWorkshopOrderStatus } from '@/lib/hooks/data/useWorkshops';
import { usePermissions, PERMISSION_KEYS } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { useRouter } from '@/lib/i18n/navigation';
import { type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate, formatDateTime, formatPhone } from '@/lib/utils/format';
import type { WorkshopOrderStatus } from '@/lib/utils/schemas/workshop';

const { Text, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface WorkshopOrderDetailPageProps {
  params: Promise<{
    locale: string;
    shopId: string;
    orderId: string;
  }>;
}

// Status configurations
const STATUS_CONFIG: Record<
  WorkshopOrderStatus,
  { icon: React.ReactNode; color: string; label: string }
> = {
  pending: {
    icon: <ClockCircleOutlined />,
    color: 'warning',
    label: 'pending',
  },
  in_progress: {
    icon: <SyncOutlined />,
    color: 'processing',
    label: 'inProgress',
  },
  completed: {
    icon: <CheckCircleOutlined />,
    color: 'success',
    label: 'completed',
  },
  cancelled: {
    icon: <StopOutlined />,
    color: 'error',
    label: 'cancelled',
  },
};

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

/**
 * Skeleton loading state for WorkshopOrderDetail
 */
function WorkshopOrderDetailSkeleton(): React.JSX.Element {
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

      {/* Workshop info skeleton */}
      <Card className="border border-stone-200">
        <div className="flex items-center gap-4">
          <Skeleton.Avatar active size={48} />
          <div className="flex-1">
            <Skeleton.Input active size="small" className="!w-36 mb-2" />
            <Skeleton.Input active size="small" className="!w-48" />
          </div>
        </div>
      </Card>

      {/* Cost skeleton */}
      <Card className="border border-stone-200">
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    </div>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Workshop Order Detail Page Component
 *
 * Client component that displays comprehensive workshop order information.
 */
export default function WorkshopOrderDetailPage({
  params,
}: WorkshopOrderDetailPageProps): React.JSX.Element {
  const t = useTranslations('workshops');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { shop, shopId } = useShop();
  const { can } = usePermissions();

  const currency = shop?.currency || 'USD';

  // Unwrap params (Next.js 15+)
  const [resolvedParams, setResolvedParams] = React.useState<{
    orderId: string;
  } | null>(null);

  React.useEffect(() => {
    params.then(({ orderId }) => setResolvedParams({ orderId }));
  }, [params]);

  const orderId = resolvedParams?.orderId || '';

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<WorkshopOrderStatus | null>(null);
  const [actualCost, setActualCost] = useState<number | null>(null);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useWorkshopOrder(orderId, { enabled: !!orderId });

  // Mutations
  const updateStatus = useUpdateWorkshopOrderStatus();

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const statusConfig = useMemo(
    () => (order?.status ? STATUS_CONFIG[order.status] : STATUS_CONFIG.pending),
    [order?.status]
  );

  // Financial calculations
  const financials = useMemo(() => {
    if (!order) {
      return null;
    }

    const estimatedCost = Number(order.estimated_cost ?? 0);
    const actualCostValue = Number(order.actual_cost ?? estimatedCost);
    const paidAmount = Number(order.paid_amount ?? 0);
    const balanceDue = actualCostValue - paidAmount;

    return {
      estimatedCost,
      actualCost: actualCostValue,
      paidAmount,
      balanceDue: Math.max(0, balanceDue),
      hasVariance: order.actual_cost !== null && order.actual_cost !== order.estimated_cost,
    };
  }, [order]);

  // Check if order is overdue
  const isOverdue = useMemo(() => {
    if (!order?.estimated_completion_date) {
      return false;
    }
    if (order.status === 'completed' || order.status === 'cancelled') {
      return false;
    }
    return dayjs(order.estimated_completion_date).isBefore(dayjs(), 'day');
  }, [order]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleUpdateStatus = useCallback(
    async (status: WorkshopOrderStatus, cost?: number) => {
      if (!order) {
        return;
      }

      try {
        await updateStatus.mutateAsync({
          orderId: order.id_workshop_order,
          status,
          actualCost: cost,
        });
        message.success(t('orders.statusUpdated'));
        refetch();
        setIsStatusModalOpen(false);
        setNewStatus(null);
        setActualCost(null);
      } catch (error) {
        console.error('[WorkshopOrderDetail] Update status error:', error);
        message.error(t('orders.statusUpdateError'));
      }
    },
    [order, updateStatus, t, refetch]
  );

  const handleStartOrder = useCallback(() => {
    handleUpdateStatus('in_progress');
  }, [handleUpdateStatus]);

  const handleCompleteOrder = useCallback(() => {
    setNewStatus('completed');
    setActualCost(order?.estimated_cost ?? null);
    setIsStatusModalOpen(true);
  }, [order]);

  const handleCancelOrder = useCallback(() => {
    handleUpdateStatus('cancelled');
  }, [handleUpdateStatus]);

  const handleConfirmStatusChange = useCallback(() => {
    if (newStatus) {
      handleUpdateStatus(newStatus, actualCost ?? undefined);
    }
  }, [newStatus, actualCost, handleUpdateStatus]);

  const handlePaymentSuccess = useCallback(() => {
    setIsPaymentModalOpen(false);
    refetch();
  }, [refetch]);

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  // Loading state
  if (!resolvedParams || isLoading) {
    return (
      <>
        <PageHeader
          title={t('orders.orderDetails')}
          showBack
          backUrl={`/${shopId}/workshops/orders`}
        />
        <WorkshopOrderDetailSkeleton />
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <PageHeader
          title={t('orders.orderDetails')}
          showBack
          backUrl={`/${shopId}/workshops/orders`}
        />
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
      </>
    );
  }

  // Not found state
  if (!order) {
    return (
      <>
        <PageHeader
          title={t('orders.orderDetails')}
          showBack
          backUrl={`/${shopId}/workshops/orders`}
        />
        <EmptyState
          icon={<FileTextOutlined />}
          title={t('orders.notFound')}
          description={t('orders.notFoundDescription')}
          action={{
            label: t('orders.backToOrders'),
            onClick: () => router.push(`/${shopId}/workshops/orders`),
          }}
          size="lg"
        />
      </>
    );
  }

  const workshop = order.workshops;

  return (
    <div className="workshop-order-detail">
      <PageHeader
        title={order.order_number}
        subtitle={t(`orders.${order.order_type}`)}
        showBack
        backUrl={`/${shopId}/workshops/orders`}
        breadcrumbOverrides={[{ key: 'orderId', label: order.order_number }]}
      >
        {/* Record Payment Button */}
        {order.status !== 'cancelled' && financials && financials.balanceDue > 0 && (
          <Button
            icon={<WalletOutlined />}
            onClick={() => setIsPaymentModalOpen(true)}
            permission={PERMISSION_KEYS.WORKSHOPS_PAYMENTS}
          >
            {t('orders.recordPayment')}
          </Button>
        )}
      </PageHeader>

      <div className="space-y-6">
        {/* Overdue Alert */}
        {isOverdue && (
          <Alert
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            message={t('orders.overdueAlert')}
            description={t('orders.overdueDescription', {
              date: formatDate(order.estimated_completion_date!, locale, 'long'),
            })}
          />
        )}

        {/* Cancelled Alert */}
        {order.status === 'cancelled' && (
          <Alert
            type="error"
            showIcon
            icon={<StopOutlined />}
            message={t('orders.cancelledAlert')}
            description={t('orders.cancelledDescription')}
          />
        )}

        {/* Header Card */}
        <Card className="border border-stone-200">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Left side - Order info */}
            <div className="space-y-3">
              {/* Order Number */}
              <div className="flex items-center gap-3">
                <Title level={3} className="!mb-0 !text-amber-700">
                  {order.order_number}
                </Title>
              </div>

              {/* Order Type */}
              <div className="flex items-center gap-2 text-stone-600">
                <FileTextOutlined />
                <Text>{t(`orders.${order.order_type}`)}</Text>
              </div>

              {/* Status badge */}
              <Space size={8} wrap>
                <Tag icon={statusConfig.icon} color={statusConfig.color} className="text-sm">
                  {t(`orders.status.${statusConfig.label}`)}
                </Tag>
                {order.payment_status && (
                  <Tag
                    color={
                      order.payment_status === 'paid'
                        ? 'success'
                        : order.payment_status === 'partial'
                          ? 'warning'
                          : 'error'
                    }
                    className="text-sm"
                  >
                    {t(`orders.payment.${order.payment_status}`)}
                  </Tag>
                )}
              </Space>
            </div>

            {/* Right side - Actions */}
            <Space wrap>
              {/* Start Order Button */}
              {order.status === 'pending' && (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStartOrder}
                  permission={PERMISSION_KEYS.WORKSHOPS_ORDERS}
                >
                  {t('orders.startOrder')}
                </Button>
              )}

              {/* Complete Order Button */}
              {order.status === 'in_progress' && (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleCompleteOrder}
                  permission={PERMISSION_KEYS.WORKSHOPS_ORDERS}
                >
                  {t('orders.completeOrder')}
                </Button>
              )}

              {/* Cancel Order Button */}
              {(order.status === 'pending' || order.status === 'in_progress') && (
                <Popconfirm
                  title={t('orders.confirmCancel')}
                  description={t('orders.cancelWarning')}
                  onConfirm={handleCancelOrder}
                  okText={tCommon('actions.confirm')}
                  cancelText={tCommon('actions.cancel')}
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    permission={PERMISSION_KEYS.WORKSHOPS_ORDERS}
                  >
                    {t('orders.cancelOrder')}
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </div>
        </Card>

        {/* Workshop Info Card */}
        {workshop && (
          <Card
            title={
              <span className="flex items-center gap-2">
                <ShopOutlined />
                {t('workshop')}
              </span>
            }
            className="border border-stone-200"
          >
            <div className="flex items-start gap-4">
              {/* Workshop icon */}
              <div
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-full text-white text-lg font-semibold',
                  workshop.is_internal ? 'bg-amber-500' : 'bg-blue-500'
                )}
              >
                {workshop.is_internal ? <HomeOutlined /> : <ShopOutlined />}
              </div>

              {/* Workshop info */}
              <div className="flex-1 min-w-0">
                <Text strong className="font-semibold text-lg text-stone-900">
                  {workshop.workshop_name}
                </Text>

                <div className="mt-1">
                  <Tag color={workshop.is_internal ? 'gold' : 'blue'}>
                    {workshop.is_internal ? t('internal') : t('external')}
                  </Tag>
                  {workshop.specialization && (
                    <Text type="secondary" className="ms-2">
                      {workshop.specialization}
                    </Text>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 mt-2 text-sm text-stone-600">
                  {workshop.contact_person && <span>{workshop.contact_person}</span>}
                  {workshop.phone && (
                    <span className="flex items-center gap-1">
                      <PhoneOutlined />
                      <a
                        href={`tel:${workshop.phone}`}
                        className="text-amber-600 hover:text-amber-700"
                        dir="ltr"
                      >
                        {formatPhone(workshop.phone)}
                      </a>
                    </span>
                  )}
                  {workshop.email && (
                    <span className="flex items-center gap-1">
                      <MailOutlined />
                      <a
                        href={`mailto:${workshop.email}`}
                        className="text-amber-600 hover:text-amber-700"
                      >
                        {workshop.email}
                      </a>
                    </span>
                  )}
                </div>
              </div>

              {/* View workshop button */}
              {can(PERMISSION_KEYS.WORKSHOPS_VIEW) && (
                <Button
                  type="link"
                  onClick={() =>
                    router.push(`/${shopId}/workshops?workshopId=${workshop.id_workshop}`)
                  }
                >
                  {t('viewWorkshop')}
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Description Card */}
        {order.description && (
          <Card
            title={
              <span className="flex items-center gap-2">
                <FileTextOutlined />
                {t('orders.description')}
              </span>
            }
            className="border border-stone-200"
          >
            <Text className="text-stone-600 whitespace-pre-wrap">{order.description}</Text>
          </Card>
        )}

        {/* Schedule & Cost Card */}
        <Card title={t('orders.scheduleAndCost')} className="border border-stone-200">
          <Descriptions
            column={{ xs: 1, sm: 2 }}
            size="small"
            labelStyle={{ fontWeight: 500, color: '#78716c' }}
          >
            {/* Due Date */}
            <Descriptions.Item
              label={
                <span className="flex items-center gap-1">
                  <CalendarOutlined />
                  {t('orders.estimatedDate')}
                </span>
              }
            >
              {order.estimated_completion_date ? (
                <Text className={cn(isOverdue && 'text-red-600')}>
                  {formatDate(order.estimated_completion_date, locale, 'long')}
                  {isOverdue && (
                    <Text type="danger" className="ms-2 text-xs">
                      ({t('orders.overdue')})
                    </Text>
                  )}
                </Text>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Descriptions.Item>

            {/* Actual Completion Date */}
            {order.completed_date && (
              <Descriptions.Item
                label={
                  <span className="flex items-center gap-1">
                    <CheckCircleOutlined />
                    {t('orders.actualDate')}
                  </span>
                }
              >
                <Text className="text-emerald-600">
                  {formatDate(order.completed_date, locale, 'long')}
                </Text>
              </Descriptions.Item>
            )}

            {/* Estimated Cost */}
            <Descriptions.Item
              label={
                <span className="flex items-center gap-1">
                  <DollarOutlined />
                  {t('orders.estimatedCost')}
                </span>
              }
            >
              {financials?.estimatedCost ? (
                <Text className={cn(financials.hasVariance && 'line-through text-stone-400')}>
                  {formatCurrency(financials.estimatedCost, currency, locale)}
                </Text>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Descriptions.Item>

            {/* Actual Cost */}
            {financials?.hasVariance && (
              <Descriptions.Item label={t('orders.actualCost')}>
                <Text strong className="text-lg">
                  {formatCurrency(financials.actualCost, currency, locale)}
                </Text>
                {financials.actualCost > financials.estimatedCost ? (
                  <Tag color="red" className="ms-2">
                    +
                    {formatCurrency(
                      financials.actualCost - financials.estimatedCost,
                      currency,
                      locale
                    )}
                  </Tag>
                ) : (
                  <Tag color="green" className="ms-2">
                    -
                    {formatCurrency(
                      financials.estimatedCost - financials.actualCost,
                      currency,
                      locale
                    )}
                  </Tag>
                )}
              </Descriptions.Item>
            )}

            {/* Amount Paid */}
            <Descriptions.Item label={t('orders.amountPaid')}>
              <Text className="text-emerald-600">
                {formatCurrency(financials?.paidAmount || 0, currency, locale)}
              </Text>
            </Descriptions.Item>

            {/* Balance Due */}
            {financials && financials.balanceDue > 0 && (
              <Descriptions.Item label={t('orders.balanceDue')}>
                <Text strong className="text-red-600 text-lg">
                  {formatCurrency(financials.balanceDue, currency, locale)}
                </Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Payment History Card */}
        {order.workshop_transactions && order.workshop_transactions.length > 0 && (
          <Card
            title={
              <span className="flex items-center gap-2">
                <WalletOutlined />
                {t('orders.paymentHistory')} ({order.workshop_transactions.length})
              </span>
            }
            className="border border-stone-200"
          >
            <Timeline
              items={order.workshop_transactions.map((tx) => {
                const isDebit = tx.debit_amount > 0;
                const txAmount = isDebit ? tx.debit_amount : tx.credit_amount;
                return {
                  color: isDebit ? 'green' : 'blue',
                  children: (
                    <div className="flex justify-between items-start">
                      <div>
                        <Text strong>
                          {tx.description || t(`orders.transaction.${tx.transaction_type}`)}
                        </Text>
                        <br />
                        <Text type="secondary" className="text-xs">
                          {formatDateTime(tx.created_at, locale)}
                        </Text>
                        {tx.reference_id && (
                          <>
                            <br />
                            <Text type="secondary" className="text-xs">
                              Ref: {tx.reference_id}
                            </Text>
                          </>
                        )}
                      </div>
                      <Text strong className={isDebit ? 'text-emerald-600' : 'text-blue-600'}>
                        {isDebit ? '-' : '+'}
                        {formatCurrency(Math.abs(Number(txAmount)), currency, locale)}
                      </Text>
                    </div>
                  ),
                };
              })}
            />
          </Card>
        )}

        {/* Notes Card */}
        {order.notes && (
          <Card
            title={
              <span className="flex items-center gap-2">
                <FileTextOutlined />
                {tCommon('labels.notes')}
              </span>
            }
            className="border border-stone-200"
          >
            <Text className="text-stone-600 whitespace-pre-wrap">{order.notes}</Text>
          </Card>
        )}

        {/* Audit Info */}
        <Card className="border border-stone-200 bg-stone-50">
          <div className="text-xs text-stone-500 space-y-1">
            <div>
              {tCommon('labels.createdAt')}: {formatDateTime(order.created_at, locale)}
            </div>
            {order.updated_at && order.updated_at !== order.created_at && (
              <div>
                {tCommon('labels.updatedAt')}: {formatDateTime(order.updated_at, locale)}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Complete Order Modal - for setting actual cost */}
      <Modal
        open={isStatusModalOpen}
        title={t('orders.completeOrder')}
        onCancel={() => {
          setIsStatusModalOpen(false);
          setNewStatus(null);
          setActualCost(null);
        }}
        onOk={handleConfirmStatusChange}
        okText={tCommon('actions.confirm')}
        cancelText={tCommon('actions.cancel')}
        confirmLoading={updateStatus.isPending}
      >
        <div className="space-y-4 py-4">
          <Alert type="info" showIcon message={t('orders.completionNote')} />

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {t('orders.finalCost')}
            </label>
            <InputNumber
              size="large"
              className="!w-full"
              value={actualCost}
              onChange={(value) => setActualCost(value as number)}
              min={0}
              step={0.01}
              formatter={(value) => `${currency} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value!.replace(new RegExp(`${currency}\\s?|,`, 'g'), ''))}
              prefix={<DollarOutlined />}
            />
            {order.estimated_cost && (
              <Text type="secondary" className="text-xs mt-1 block">
                {t('orders.estimatedCost')}:{' '}
                {formatCurrency(order.estimated_cost, currency, locale)}
              </Text>
            )}
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      {order && financials && (
        <RecordPaymentModal
          open={isPaymentModalOpen}
          order={order}
          balanceDue={financials.balanceDue}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setIsPaymentModalOpen(false)}
        />
      )}
    </div>
  );
}
