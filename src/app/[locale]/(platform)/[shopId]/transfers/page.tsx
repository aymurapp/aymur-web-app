'use client';

/**
 * Transfers Page
 *
 * Main shop transfers listing page with DataTable.
 * Displays incoming and outgoing transfers with status badges.
 *
 * Features:
 * - DataTable with transfer list
 * - Tabs for "Outgoing" vs "Incoming" transfers
 * - Search by transfer number
 * - Filter by status and date range
 * - Status badges with colors (pending, shipped, received, rejected)
 * - Quick actions: view details, ship, receive, reject
 * - Create transfer button with permission check
 *
 * @module app/(platform)/[locale]/[shopId]/transfers/page
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  PlusOutlined,
  SwapOutlined,
  SendOutlined,
  InboxOutlined,
  EyeOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { Tag, Typography, Segmented } from 'antd';
import { useTranslations } from 'next-intl';

import { DataTable } from '@/components/common/data/DataTable';
import type { ActionConfig } from '@/components/common/data/DataTable';
import type { FilterConfig } from '@/components/common/data/FilterPanel';
import { TransferDetailDrawer } from '@/components/domain/transfers/TransferDetailDrawer';
import { TransferForm } from '@/components/domain/transfers/TransferForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  useTransfers,
  type TransferWithDetails,
  type TransferStatus,
  type TransferDirection,
} from '@/lib/hooks/data/useTransfers';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/format';

import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface FilterState {
  status?: TransferStatus;
  dateRange?: [Dayjs, Dayjs] | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PAGE_SIZE = 20;

/**
 * Status color mapping for transfer status badges
 */
const STATUS_COLORS: Record<TransferStatus, string> = {
  pending: 'blue',
  shipped: 'orange',
  received: 'green',
  rejected: 'red',
};

/**
 * Status icons mapping
 */
const STATUS_ICONS: Record<TransferStatus, React.ReactNode> = {
  pending: <SwapOutlined />,
  shipped: <RocketOutlined />,
  received: <CheckCircleOutlined />,
  rejected: <CloseCircleOutlined />,
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Transfer status badge component
 */
function TransferStatusBadge({
  status,
  t,
}: {
  status: TransferStatus;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const statusLabels: Record<TransferStatus, string> = {
    pending: t('pending'),
    shipped: t('shipped'),
    received: t('received'),
    rejected: t('rejected'),
  };

  return (
    <Tag icon={STATUS_ICONS[status]} color={STATUS_COLORS[status]}>
      {statusLabels[status]}
    </Tag>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Transfers Page Component
 *
 * Client component that displays a data table of shop transfers with
 * search, filtering, and pagination capabilities.
 */
export default function TransfersPage(): React.JSX.Element {
  const t = useTranslations('transfers');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();
  const { shopId } = useShop();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [direction, setDirection] = useState<TransferDirection | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({});

  // Form drawer state
  const [formOpen, setFormOpen] = useState(false);

  // Detail drawer state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferWithDetails | null>(null);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  // Build date range params
  const dateFrom = filters.dateRange?.[0]?.format('YYYY-MM-DD');
  const dateTo = filters.dateRange?.[1]?.format('YYYY-MM-DD');

  // Fetch transfers with pagination and filters
  const { transfers, totalCount, isLoading, isFetching, refetch } = useTransfers({
    direction,
    search,
    page,
    pageSize: PAGE_SIZE,
    status: filters.status,
    dateFrom,
    dateTo,
    sortBy: 'created_at',
    sortDirection: 'desc',
  });

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleDirectionChange = useCallback((value: string | number) => {
    if (value === 'all') {
      setDirection(undefined);
    } else {
      setDirection(value as TransferDirection);
    }
    setPage(1);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((values: Record<string, unknown>) => {
    setFilters({
      status: values.status as TransferStatus | undefined,
      dateRange: values.dateRange as [Dayjs, Dayjs] | null | undefined,
    });
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleAddTransfer = useCallback(() => {
    setFormOpen(true);
  }, []);

  const handleViewDetails = useCallback((transfer: TransferWithDetails) => {
    setSelectedTransfer(transfer);
    setDetailOpen(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setFormOpen(false);
    refetch();
  }, [refetch]);

  const handleDetailClose = useCallback(() => {
    setDetailOpen(false);
    setSelectedTransfer(null);
  }, []);

  const handleStatusUpdated = useCallback(() => {
    refetch();
  }, [refetch]);

  // ==========================================================================
  // TABLE CONFIGURATION
  // ==========================================================================

  // Status options for filter
  const statusOptions = useMemo(() => {
    const statuses: TransferStatus[] = ['pending', 'shipped', 'received', 'rejected'];
    return statuses.map((status) => ({
      label: t(status),
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
      key: 'dateRange',
      label: t('filters.dateRange'),
      type: 'dateRange',
      fullWidth: true,
    },
  ];

  // Determine if a transfer is outgoing from current shop
  const isOutgoing = useCallback(
    (transfer: TransferWithDetails) => {
      return transfer.from_shop === shopId;
    },
    [shopId]
  );

  // Table columns
  const columns: ColumnsType<TransferWithDetails> = [
    {
      key: 'transfer_number',
      title: t('transferNumber'),
      dataIndex: 'transfer_number',
      width: 140,
      render: (value: string | null, record) => (
        <div>
          <Text strong className="font-mono text-sm">
            {value || `#${record.id_transfer.slice(0, 8).toUpperCase()}`}
          </Text>
          <div className="mt-0.5">
            {isOutgoing(record) ? (
              <Tag icon={<SendOutlined />} color="blue" className="text-xs">
                {t('outgoing')}
              </Tag>
            ) : (
              <Tag icon={<InboxOutlined />} color="purple" className="text-xs">
                {t('incoming')}
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'from_to',
      title: `${t('fromShop')} / ${t('toShop')}`,
      width: 220,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Text type="secondary" className="text-xs block">
              {t('fromShop')}:
            </Text>
            <Text className="block truncate">{record.from_shop?.shop_name || '-'}</Text>
          </div>
          <SwapOutlined className="text-stone-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <Text type="secondary" className="text-xs block">
              {t('toShop')}:
            </Text>
            <Text className="block truncate">{record.to_shop?.shop_name || '-'}</Text>
          </div>
        </div>
      ),
    },
    {
      key: 'items_count',
      title: t('itemsCount'),
      dataIndex: 'items_count',
      width: 100,
      align: 'center',
      render: (value: number | undefined) => (
        <Tag color="default">
          {value ?? 0} {t('items')}
        </Tag>
      ),
    },
    {
      key: 'status',
      title: tCommon('labels.status'),
      dataIndex: 'status',
      width: 130,
      render: (status: TransferStatus) => <TransferStatusBadge status={status} t={t} />,
    },
    {
      key: 'created_at',
      title: tCommon('labels.createdAt'),
      dataIndex: 'created_at',
      width: 130,
      render: (value: string | null) => (
        <Text type="secondary">{value ? formatDate(value, 'en-US', 'short') : '-'}</Text>
      ),
    },
  ];

  // Row actions
  const actions: ActionConfig<TransferWithDetails>[] = [
    {
      key: 'view',
      label: tCommon('actions.view'),
      icon: <EyeOutlined />,
      onClick: handleViewDetails,
      permission: 'inventory.transfer',
    },
  ];

  // Direction toggle options
  const directionOptions = [
    { label: tCommon('labels.all'), value: 'all' },
    { label: t('outgoing'), value: 'outgoing' },
    { label: t('incoming'), value: 'incoming' },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="transfers-page">
      {/* Page Header */}
      <PageHeader title={t('title')}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddTransfer}
          permission="inventory.transfer"
        >
          {t('newTransfer')}
        </Button>
      </PageHeader>

      {/* Direction Toggle */}
      <div className="mb-4">
        <Segmented
          options={directionOptions}
          value={direction || 'all'}
          onChange={handleDirectionChange}
          className="bg-stone-100"
        />
      </div>

      {/* Data Table */}
      <DataTable<TransferWithDetails>
        dataSource={transfers}
        columns={columns}
        rowKey="id_transfer"
        loading={isLoading}
        searchable
        searchPlaceholder={t('searchTransfer')}
        searchValue={search}
        onSearch={handleSearch}
        filters={filterConfigs}
        filterValues={{
          status: filters.status,
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
        emptyTitle={t('noTransfers')}
        emptyDescription={t('noTransfersDescription')}
        emptyAction={
          can('inventory.transfer') ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTransfer}>
              {t('newTransfer')}
            </Button>
          ) : undefined
        }
        emptyIcon={<SwapOutlined style={{ fontSize: 48, color: '#d4d4d4' }} />}
        wrapperClassName={cn(isFetching && 'opacity-70')}
      />

      {/* Transfer Form Drawer */}
      <TransferForm open={formOpen} onClose={handleFormClose} onSuccess={handleFormSuccess} />

      {/* Transfer Detail Drawer */}
      <TransferDetailDrawer
        open={detailOpen}
        transfer={selectedTransfer}
        onClose={handleDetailClose}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}
