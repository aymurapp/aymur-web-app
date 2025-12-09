'use client';

/**
 * Workshop Orders Page
 *
 * Main workshop orders listing page with DataTable.
 * Displays workshop order information with filters and actions.
 *
 * Features:
 * - DataTable with workshop orders data
 * - Status filter (pending, in_progress, completed)
 * - Workshop filter
 * - Date range filter
 * - Status badges
 * - Due date highlighting (overdue in red)
 * - Create new order button
 *
 * @module app/(platform)/[locale]/[shopId]/workshops/orders/page
 */

import React, { useState, useMemo, useCallback } from 'react';

import { useSearchParams } from 'next/navigation';

import {
  PlusOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
  ShopOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { Tag, Typography, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useTranslations, useLocale } from 'next-intl';

import { DataTable, type ActionConfig } from '@/components/common/data/DataTable';
import type { FilterConfig } from '@/components/common/data/FilterPanel';
import { WorkshopOrderForm } from '@/components/domain/workshops/WorkshopOrderForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  useWorkshopOrders,
  useWorkshops,
  type WorkshopOrderWithWorkshop,
} from '@/lib/hooks/data/useWorkshops';
import { usePermissions, PERMISSION_KEYS } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { useRouter } from '@/lib/i18n/navigation';
import { type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { WorkshopOrderStatus } from '@/lib/utils/schemas/workshop';

import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface FilterState {
  status?: WorkshopOrderStatus;
  workshopId?: string;
  dateRange?: [Dayjs, Dayjs];
  orderType?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PAGE_SIZE = 20;

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
    icon: <SyncOutlined spin />,
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

// Order type options
const ORDER_TYPE_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: 'Repair', value: 'repair' },
  { label: 'Custom', value: 'custom' },
  { label: 'Resize', value: 'resize' },
  { label: 'Polish', value: 'polish' },
  { label: 'Engrave', value: 'engrave' },
  { label: 'Other', value: 'other' },
];

// Status filter options
const STATUS_OPTIONS = [
  { label: 'All Status', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if an order is overdue
 */
function isOrderOverdue(order: WorkshopOrderWithWorkshop): boolean {
  if (!order.estimated_completion_date) {
    return false;
  }
  if (order.status === 'completed' || order.status === 'cancelled') {
    return false;
  }

  const dueDate = dayjs(order.estimated_completion_date);
  return dueDate.isBefore(dayjs(), 'day');
}

/**
 * Get days until due or days overdue
 */
function getDueDays(order: WorkshopOrderWithWorkshop): number | null {
  if (!order.estimated_completion_date) {
    return null;
  }
  const dueDate = dayjs(order.estimated_completion_date);
  return dueDate.diff(dayjs(), 'day');
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Workshop Orders Page Component
 *
 * Client component that displays a list of workshop orders with
 * search, filtering, and action capabilities.
 */
export default function WorkshopOrdersPage(): React.JSX.Element {
  const t = useTranslations('workshops');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shop, shopId } = useShop();
  const { can } = usePermissions();

  const currency = shop?.currency || 'USD';

  // Get workshop ID from URL params (for quick filter from workshop list)
  const initialWorkshopId = searchParams.get('workshopId') || undefined;

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterValues, setFilterValues] = useState<FilterState>({
    workshopId: initialWorkshopId,
  });

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  // Fetch workshops for filter dropdown
  const { workshops } = useWorkshops({
    pageSize: 100,
    status: 'active',
  });

  // Build workshop options for filter
  const workshopOptions = useMemo(() => {
    const options = [{ label: 'All Workshops', value: '' }];
    workshops.forEach((w) => {
      options.push({ label: w.workshop_name, value: w.id_workshop });
    });
    return options;
  }, [workshops]);

  // Parse date range from filter
  const startDate = filterValues.dateRange?.[0]?.format('YYYY-MM-DD');
  const endDate = filterValues.dateRange?.[1]?.format('YYYY-MM-DD');

  // Fetch orders
  const { orders, totalCount, isLoading, refetch } = useWorkshopOrders({
    workshopId: filterValues.workshopId || undefined,
    status: filterValues.status || undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orderType: (filterValues.orderType as any) || undefined,
    startDate,
    endDate,
    page,
    pageSize: PAGE_SIZE,
    sortBy: 'created_at',
    sortDirection: 'desc',
  });

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleFilterChange = useCallback((values: Record<string, unknown>) => {
    setFilterValues(values as FilterState);
    setPage(1);
  }, []);

  const handleCreateOrder = useCallback(() => {
    setIsFormOpen(true);
  }, []);

  const handleViewOrder = useCallback(
    (order: WorkshopOrderWithWorkshop) => {
      router.push(`/${shopId}/workshops/orders/${order.id_workshop_order}`);
    },
    [router, shopId]
  );

  const handleFormSuccess = useCallback(() => {
    setIsFormOpen(false);
    refetch();
  }, [refetch]);

  const handleFormCancel = useCallback(() => {
    setIsFormOpen(false);
  }, []);

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================

  const columns: ColumnsType<WorkshopOrderWithWorkshop> = useMemo(
    () => [
      {
        title: t('orders.orderNumber'),
        dataIndex: 'order_number',
        key: 'order_number',
        width: 160,
        render: (orderNumber: string, record: WorkshopOrderWithWorkshop) => {
          const overdue = isOrderOverdue(record);
          return (
            <div className="flex items-center gap-2">
              {overdue && (
                <Tooltip title={t('orders.overdue')}>
                  <ExclamationCircleOutlined className="text-red-500" />
                </Tooltip>
              )}
              <Text strong className={cn(overdue && 'text-red-600')}>
                {orderNumber}
              </Text>
            </div>
          );
        },
      },
      {
        title: t('workshop'),
        dataIndex: ['workshops', 'workshop_name'],
        key: 'workshop',
        width: 180,
        render: (_: unknown, record: WorkshopOrderWithWorkshop) => (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-white text-xs',
                record.workshops?.is_internal ? 'bg-amber-500' : 'bg-blue-500'
              )}
            >
              <ShopOutlined />
            </div>
            <Text className="truncate max-w-[140px]">{record.workshops?.workshop_name || '-'}</Text>
          </div>
        ),
      },
      {
        title: t('orders.type'),
        dataIndex: 'order_type',
        key: 'order_type',
        width: 120,
        render: (type: string) => <Tag color="default">{t(`orders.${type}`)}</Tag>,
      },
      {
        title: tCommon('labels.status'),
        dataIndex: 'status',
        key: 'status',
        width: 130,
        render: (status: WorkshopOrderStatus) => {
          const config = STATUS_CONFIG[status];
          if (!config) {
            return <Tag>{status}</Tag>;
          }
          return (
            <Tag icon={config.icon} color={config.color}>
              {t(`orders.status.${config.label}`)}
            </Tag>
          );
        },
      },
      {
        title: t('orders.estimatedDate'),
        dataIndex: 'estimated_completion_date',
        key: 'estimated_completion_date',
        width: 150,
        render: (date: string | null, record: WorkshopOrderWithWorkshop) => {
          if (!date) {
            return <Text type="secondary">-</Text>;
          }

          const overdue = isOrderOverdue(record);
          const dueDays = getDueDays(record);
          const isCompleted = record.status === 'completed' || record.status === 'cancelled';

          return (
            <div className={cn('flex flex-col', overdue && !isCompleted && 'text-red-600')}>
              <div className="flex items-center gap-1">
                <CalendarOutlined
                  className={overdue && !isCompleted ? 'text-red-500' : 'text-stone-400'}
                />
                <Text className={overdue && !isCompleted ? 'text-red-600' : ''}>
                  {formatDate(date, locale, 'short')}
                </Text>
              </div>
              {!isCompleted && dueDays !== null && (
                <Text
                  type={overdue ? undefined : 'secondary'}
                  className={cn('text-xs', overdue && 'text-red-500')}
                >
                  {overdue
                    ? t('orders.daysOverdue', { days: Math.abs(dueDays) })
                    : dueDays === 0
                      ? t('orders.dueToday')
                      : t('orders.daysRemaining', { days: dueDays })}
                </Text>
              )}
            </div>
          );
        },
      },
      {
        title: t('orders.estimatedCost'),
        dataIndex: 'estimated_cost',
        key: 'cost',
        width: 130,
        align: 'end' as const,
        render: (cost: number | null, record: WorkshopOrderWithWorkshop) => {
          const displayCost = record.actual_cost ?? cost;
          if (!displayCost) {
            return <Text type="secondary">-</Text>;
          }
          return (
            <div className="text-end">
              <Text strong={!!record.actual_cost}>
                {formatCurrency(displayCost, currency, locale)}
              </Text>
              {record.actual_cost && cost && record.actual_cost !== cost && (
                <Text type="secondary" className="text-xs block line-through">
                  {formatCurrency(cost, currency, locale)}
                </Text>
              )}
            </div>
          );
        },
      },
      {
        title: t('orders.paymentStatus'),
        key: 'payment',
        width: 120,
        render: (_: unknown, record: WorkshopOrderWithWorkshop) => {
          const paymentStatus = record.payment_status || 'unpaid';
          const colorMap: Record<string, string> = {
            paid: 'success',
            partial: 'warning',
            unpaid: 'error',
          };
          return (
            <Tag color={colorMap[paymentStatus] || 'default'}>
              {t(`orders.payment.${paymentStatus}`)}
            </Tag>
          );
        },
      },
    ],
    [t, tCommon, currency, locale]
  );

  // ==========================================================================
  // TABLE ACTIONS
  // ==========================================================================

  const tableActions: ActionConfig<WorkshopOrderWithWorkshop>[] = useMemo(
    () => [
      {
        key: 'view',
        label: tCommon('actions.view'),
        icon: <EyeOutlined />,
        onClick: handleViewOrder,
        permission: PERMISSION_KEYS.WORKSHOPS_ORDERS,
      },
    ],
    [tCommon, handleViewOrder]
  );

  // ==========================================================================
  // FILTERS
  // ==========================================================================

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        key: 'workshopId',
        label: t('workshop'),
        type: 'select',
        options: workshopOptions,
        placeholder: t('selectWorkshop'),
      },
      {
        key: 'status',
        label: tCommon('labels.status'),
        type: 'select',
        options: STATUS_OPTIONS,
        placeholder: tCommon('select.placeholder'),
      },
      {
        key: 'orderType',
        label: t('orders.type'),
        type: 'select',
        options: ORDER_TYPE_OPTIONS,
        placeholder: tCommon('select.placeholder'),
      },
      {
        key: 'dateRange',
        label: tCommon('labels.dateRange'),
        type: 'dateRange',
        placeholder: tCommon('labels.dateRange'),
      },
    ],
    [t, tCommon, workshopOptions]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="workshop-orders-page">
      {/* Page Header */}
      <PageHeader title={t('orders.title')}>
        <div className="flex items-center gap-2">
          <Button
            icon={<ShopOutlined />}
            onClick={() => router.push(`/${shopId}/workshops/providers`)}
            permission={PERMISSION_KEYS.WORKSHOPS_MANAGE}
          >
            {t('workshopProviders')}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateOrder}
            permission={PERMISSION_KEYS.WORKSHOPS_ORDERS}
          >
            {t('orders.newOrder')}
          </Button>
        </div>
      </PageHeader>

      {/* Data Table */}
      <DataTable<WorkshopOrderWithWorkshop>
        dataSource={orders}
        columns={columns}
        rowKey="id_workshop_order"
        loading={isLoading}
        searchable
        searchPlaceholder={t('orders.searchOrder')}
        searchValue={search}
        onSearch={handleSearch}
        filters={filters}
        filterValues={filterValues as Record<string, unknown>}
        onFilterChange={handleFilterChange}
        actions={tableActions}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: totalCount,
          onChange: handlePageChange,
          showSizeChanger: false,
          showTotal: true,
        }}
        emptyTitle={tCommon('messages.noData')}
        emptyDescription={t('orders.noOrders')}
        emptyAction={
          can(PERMISSION_KEYS.WORKSHOPS_ORDERS) ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateOrder}>
              {t('orders.newOrder')}
            </Button>
          ) : undefined
        }
        onRow={(record) => ({
          onClick: () => handleViewOrder(record),
          className: cn(
            'cursor-pointer hover:bg-stone-50',
            isOrderOverdue(record) && 'bg-red-50/50'
          ),
        })}
      />

      {/* Order Form Drawer */}
      <WorkshopOrderForm
        open={isFormOpen}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    </div>
  );
}
