'use client';

/**
 * Deliveries Page
 *
 * Main deliveries listing page with DataTable.
 * Displays delivery information with filters and status badges.
 *
 * Features:
 * - DataTable with delivery list
 * - Search by tracking number or recipient
 * - Filter by status, courier, and date range
 * - Status badges with colors
 * - Quick actions: track, update status, view details
 * - Create delivery button with permission check
 *
 * @module app/(platform)/[locale]/[shopId]/deliveries/page
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  PlusOutlined,
  TruckOutlined,
  EditOutlined,
  EyeOutlined,
  EnvironmentOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { Tag, message, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { DataTable } from '@/components/common/data/DataTable';
import type { ActionConfig } from '@/components/common/data/DataTable';
import type { FilterConfig } from '@/components/common/data/FilterPanel';
import { DeliveryDetailDrawer } from '@/components/domain/deliveries/DeliveryDetailDrawer';
import { DeliveryForm } from '@/components/domain/deliveries/DeliveryForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  useDeliveries,
  useCouriers,
  type DeliveryWithCourier,
  type DeliveryStatus,
} from '@/lib/hooks/data/useDeliveries';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/format';

import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface FilterState {
  status?: DeliveryStatus;
  courierId?: string;
  dateRange?: [Dayjs, Dayjs] | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PAGE_SIZE = 20;

/**
 * Status color mapping for delivery status badges
 */
const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: 'blue',
  picked_up: 'cyan',
  in_transit: 'orange',
  delivered: 'green',
  failed: 'red',
  cancelled: 'default',
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Delivery status badge component
 */
function DeliveryStatusBadge({
  status,
  t,
}: {
  status: DeliveryStatus;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const statusLabels: Record<DeliveryStatus, string> = {
    pending: t('status.pending'),
    picked_up: t('status.pickedUp'),
    in_transit: t('status.inTransit'),
    delivered: t('status.delivered'),
    failed: t('status.failed'),
    cancelled: t('status.cancelled'),
  };

  return <Tag color={STATUS_COLORS[status]}>{statusLabels[status]}</Tag>;
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Deliveries Page Component
 *
 * Client component that displays a data table of deliveries with
 * search, filtering, and pagination capabilities.
 */
export default function DeliveriesPage(): React.JSX.Element {
  const t = useTranslations('deliveries');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({});

  // Form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryWithCourier | null>(null);

  // Detail drawer state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryWithCourier | null>(null);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  // Fetch couriers for filter dropdown
  const { couriers } = useCouriers({ status: 'active', pageSize: 100 });

  // Build date range params
  const dateFrom = filters.dateRange?.[0]?.format('YYYY-MM-DD');
  const dateTo = filters.dateRange?.[1]?.format('YYYY-MM-DD');

  // Fetch deliveries with pagination and filters
  const { deliveries, totalCount, isLoading, isFetching, refetch } = useDeliveries({
    search,
    page,
    pageSize: PAGE_SIZE,
    status: filters.status,
    courierId: filters.courierId,
    dateFrom,
    dateTo,
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

  const handleFilterChange = useCallback((values: Record<string, unknown>) => {
    setFilters({
      status: values.status as DeliveryStatus | undefined,
      courierId: values.courierId as string | undefined,
      dateRange: values.dateRange as [Dayjs, Dayjs] | null | undefined,
    });
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleAddDelivery = useCallback(() => {
    setEditingDelivery(null);
    setFormOpen(true);
  }, []);

  const handleEditDelivery = useCallback(
    (delivery: DeliveryWithCourier) => {
      // Check if delivery can be edited
      if (['delivered', 'cancelled'].includes(delivery.status || '')) {
        message.warning(t('cannotEditDelivered'));
        return;
      }
      setEditingDelivery(delivery);
      setFormOpen(true);
    },
    [t]
  );

  const handleViewDetails = useCallback((delivery: DeliveryWithCourier) => {
    setSelectedDelivery(delivery);
    setDetailOpen(true);
  }, []);

  const handleTrackDelivery = useCallback(
    (delivery: DeliveryWithCourier) => {
      // If courier has tracking URL template, open tracking URL
      const courier = delivery.courier_companies;
      if (courier && delivery.tracking_number) {
        // Check for tracking_url_template in courier notes or custom field
        // For now, we'll just show the tracking number in detail drawer
        setSelectedDelivery(delivery);
        setDetailOpen(true);
      } else {
        message.info(tCommon('messages.noData'));
      }
    },
    [tCommon]
  );

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditingDelivery(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setFormOpen(false);
    setEditingDelivery(null);
    refetch();
  }, [refetch]);

  const handleDetailClose = useCallback(() => {
    setDetailOpen(false);
    setSelectedDelivery(null);
  }, []);

  const handleStatusUpdated = useCallback(() => {
    refetch();
  }, [refetch]);

  // ==========================================================================
  // TABLE CONFIGURATION
  // ==========================================================================

  // Build courier options for filter
  const courierOptions = useMemo(() => {
    return couriers.map((c) => ({
      label: c.company_name,
      value: c.id_courier,
    }));
  }, [couriers]);

  // Status options for filter
  const statusOptions = useMemo(() => {
    const statuses: DeliveryStatus[] = [
      'pending',
      'picked_up',
      'in_transit',
      'delivered',
      'failed',
      'cancelled',
    ];
    return statuses.map((status) => ({
      label: t(
        `status.${status === 'picked_up' ? 'pickedUp' : status === 'in_transit' ? 'inTransit' : status}`
      ),
      value: status,
    }));
  }, [t]);

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: tCommon('labels.status'),
      type: 'select',
      options: statusOptions,
      placeholder: t('filters.allStatuses'),
    },
    {
      key: 'courierId',
      label: t('courier'),
      type: 'select',
      options: courierOptions,
      placeholder: t('filters.allCouriers'),
    },
    {
      key: 'dateRange',
      label: t('filters.dateRange'),
      type: 'dateRange',
      fullWidth: true,
    },
  ];

  // Table columns
  const columns: ColumnsType<DeliveryWithCourier> = [
    {
      key: 'tracking_number',
      title: t('trackingNumber'),
      dataIndex: 'tracking_number',
      width: 150,
      render: (value: string | null) => (
        <div>
          {value ? (
            <Text strong className="font-mono text-sm">
              {value}
            </Text>
          ) : (
            <Text type="secondary" className="text-xs">
              {tCommon('messages.noData')}
            </Text>
          )}
        </div>
      ),
    },
    {
      key: 'recipient',
      title: t('recipient'),
      width: 200,
      render: (_, record) => (
        <div className="flex items-start gap-2">
          <EnvironmentOutlined className="text-stone-400 mt-0.5" />
          <div className="min-w-0">
            <Text className="block truncate">{record.recipient_name || '-'}</Text>
            {record.delivery_address && (
              <Text type="secondary" className="text-xs block truncate">
                {record.delivery_address}
              </Text>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'courier',
      title: t('courier'),
      width: 150,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <TruckOutlined className="text-amber-500" />
          <Text>{record.courier_companies?.company_name || '-'}</Text>
        </div>
      ),
    },
    {
      key: 'status',
      title: tCommon('labels.status'),
      dataIndex: 'status',
      width: 130,
      render: (status: DeliveryStatus) => <DeliveryStatusBadge status={status} t={t} />,
    },
    {
      key: 'scheduled_date',
      title: t('estimatedDelivery'),
      dataIndex: 'estimated_delivery_date',
      width: 130,
      render: (value: string | null) => (
        <Text type="secondary">{value ? formatDate(value, 'en-US', 'short') : '-'}</Text>
      ),
    },
    {
      key: 'delivery_cost',
      title: t('deliveryCost'),
      dataIndex: 'delivery_cost',
      width: 100,
      align: 'end',
      render: (value: number | null) => (
        <Text className="font-mono">{value != null ? `$${Number(value).toFixed(2)}` : '-'}</Text>
      ),
    },
  ];

  // Row actions
  const actions: ActionConfig<DeliveryWithCourier>[] = [
    {
      key: 'view',
      label: tCommon('actions.view'),
      icon: <EyeOutlined />,
      onClick: handleViewDetails,
      permission: 'deliveries.view',
    },
    {
      key: 'track',
      label: t('trackDelivery'),
      icon: <LinkOutlined />,
      onClick: handleTrackDelivery,
      permission: 'deliveries.view',
      hidden: (record) => !record.tracking_number,
    },
    {
      key: 'edit',
      label: tCommon('actions.edit'),
      icon: <EditOutlined />,
      onClick: handleEditDelivery,
      permission: 'deliveries.update',
      disabled: (record) => ['delivered', 'cancelled'].includes(record.status || ''),
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="deliveries-page">
      {/* Page Header */}
      <PageHeader title={t('title')}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddDelivery}
          permission="deliveries.create"
        >
          {t('newDelivery')}
        </Button>
      </PageHeader>

      {/* Data Table */}
      <DataTable<DeliveryWithCourier>
        dataSource={deliveries}
        columns={columns}
        rowKey="id_delivery"
        loading={isLoading}
        searchable
        searchPlaceholder={t('searchDelivery')}
        searchValue={search}
        onSearch={handleSearch}
        filters={filterConfigs}
        filterValues={{
          status: filters.status,
          courierId: filters.courierId,
          dateRange: filters.dateRange,
        }}
        onFilterChange={handleFilterChange}
        actions={actions}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: totalCount,
          onChange: handlePageChange,
          showSizeChanger: false,
        }}
        emptyTitle={t('noDeliveries')}
        emptyDescription={t('noDeliveriesDescription')}
        emptyAction={
          can('deliveries.create') ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDelivery}>
              {t('newDelivery')}
            </Button>
          ) : undefined
        }
        emptyIcon={<TruckOutlined style={{ fontSize: 48, color: '#d4d4d4' }} />}
        wrapperClassName={cn(isFetching && 'opacity-70')}
      />

      {/* Delivery Form Modal */}
      <DeliveryForm
        open={formOpen}
        delivery={editingDelivery}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      {/* Delivery Detail Drawer */}
      <DeliveryDetailDrawer
        open={detailOpen}
        delivery={selectedDelivery}
        onClose={handleDetailClose}
        onStatusUpdated={handleStatusUpdated}
        onEdit={handleEditDelivery}
      />
    </div>
  );
}
