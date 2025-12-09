'use client';

/**
 * Workshop Providers Page
 *
 * Displays the list of workshop service providers (internal/external).
 * This page allows management of workshop entities that provide services.
 *
 * Features:
 * - DataTable with workshops data
 * - Internal/external toggle filter
 * - Specialization filter
 * - Balance with color indicator
 * - Quick view orders action
 * - Add workshop button with permission check
 *
 * @module app/(platform)/[locale]/[shopId]/workshops/providers/page
 */

import React, { useState, useMemo, useCallback } from 'react';

import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShopOutlined,
  HomeOutlined,
  PhoneOutlined,
  MailOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Tag, Typography, Segmented, message, Tooltip } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { DataTable, type ActionConfig } from '@/components/common/data/DataTable';
import type { FilterConfig } from '@/components/common/data/FilterPanel';
import { WorkshopForm } from '@/components/domain/workshops/WorkshopForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useWorkshops, useDeleteWorkshop, type Workshop } from '@/lib/hooks/data/useWorkshops';
import { usePermissions, PERMISSION_KEYS } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { useRouter } from '@/lib/i18n/navigation';
import { type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatPhone } from '@/lib/utils/format';

import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

type WorkshopTypeFilter = 'all' | 'internal' | 'external';

// =============================================================================
// CONSTANTS
// =============================================================================

const PAGE_SIZE = 20;

// Specialization options for filter
const SPECIALIZATION_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Repairs', value: 'repairs' },
  { label: 'Custom Work', value: 'custom' },
  { label: 'Resizing', value: 'resizing' },
  { label: 'Polishing', value: 'polishing' },
  { label: 'Engraving', value: 'engraving' },
  { label: 'Stone Setting', value: 'stone_setting' },
];

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Workshop Providers Page Component
 *
 * Client component that displays a list of workshop service providers with
 * search, filtering, and action capabilities.
 */
export default function WorkshopProvidersPage(): React.JSX.Element {
  const t = useTranslations('workshops');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { shop, shopId } = useShop();
  const { can } = usePermissions();

  const currency = shop?.currency || 'USD';

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [workshopType, setWorkshopType] = useState<WorkshopTypeFilter>('all');
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { workshops, totalCount, isLoading, isFetching, refetch } = useWorkshops({
    search,
    page,
    pageSize: PAGE_SIZE,
    sortBy: 'workshop_name',
    sortDirection: 'asc',
    isInternal: workshopType === 'all' ? undefined : workshopType === 'internal',
    specialization: filterValues.specialization as string | undefined,
    status: 'active',
  });

  // Delete mutation
  const deleteWorkshop = useDeleteWorkshop();

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

  const handleTypeChange = useCallback((value: WorkshopTypeFilter) => {
    setWorkshopType(value);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((values: Record<string, unknown>) => {
    setFilterValues(values);
    setPage(1);
  }, []);

  const handleAddWorkshop = useCallback(() => {
    setEditingWorkshop(null);
    setIsFormOpen(true);
  }, []);

  const handleEditWorkshop = useCallback((workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setIsFormOpen(true);
  }, []);

  const handleViewOrders = useCallback(
    (workshop: Workshop) => {
      router.push(`/${shopId}/workshops/orders?workshopId=${workshop.id_workshop}`);
    },
    [router, shopId]
  );

  const handleDeleteWorkshop = useCallback(
    async (workshop: Workshop) => {
      try {
        await deleteWorkshop.mutateAsync(workshop.id_workshop);
        message.success(t('messages.deleteSuccess'));
      } catch (error) {
        console.error('[WorkshopProvidersPage] Delete error:', error);
        message.error(t('messages.deleteError'));
      }
    },
    [deleteWorkshop, t]
  );

  const handleFormSuccess = useCallback(() => {
    setIsFormOpen(false);
    setEditingWorkshop(null);
    refetch();
  }, [refetch]);

  const handleFormCancel = useCallback(() => {
    setIsFormOpen(false);
    setEditingWorkshop(null);
  }, []);

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================

  const columns: ColumnsType<Workshop> = useMemo(
    () => [
      {
        title: t('name'),
        dataIndex: 'workshop_name',
        key: 'workshop_name',
        width: 200,
        render: (name: string, record: Workshop) => (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-white text-sm',
                record.is_internal ? 'bg-amber-500' : 'bg-blue-500'
              )}
            >
              {record.is_internal ? <HomeOutlined /> : <ShopOutlined />}
            </div>
            <div className="min-w-0">
              <Text strong className="block truncate">
                {name}
              </Text>
              {record.contact_person && (
                <Text type="secondary" className="text-xs truncate block">
                  {record.contact_person}
                </Text>
              )}
            </div>
          </div>
        ),
      },
      {
        title: t('contactPerson'),
        dataIndex: 'phone',
        key: 'contact',
        width: 180,
        render: (_: unknown, record: Workshop) => (
          <div className="space-y-1">
            {record.phone && (
              <div className="flex items-center gap-1 text-sm">
                <PhoneOutlined className="text-stone-400" />
                <a
                  href={`tel:${record.phone}`}
                  className="text-amber-600 hover:text-amber-700"
                  dir="ltr"
                >
                  {formatPhone(record.phone)}
                </a>
              </div>
            )}
            {record.email && (
              <div className="flex items-center gap-1 text-sm">
                <MailOutlined className="text-stone-400" />
                <Tooltip title={record.email}>
                  <a
                    href={`mailto:${record.email}`}
                    className="text-amber-600 hover:text-amber-700 truncate max-w-[120px]"
                  >
                    {record.email}
                  </a>
                </Tooltip>
              </div>
            )}
            {!record.phone && !record.email && (
              <Text type="secondary" className="text-xs">
                {tCommon('messages.noData')}
              </Text>
            )}
          </div>
        ),
      },
      {
        title: t('type'),
        dataIndex: 'is_internal',
        key: 'type',
        width: 120,
        render: (isInternal: boolean) => (
          <Tag color={isInternal ? 'gold' : 'blue'}>
            {isInternal ? t('internal') : t('external')}
          </Tag>
        ),
      },
      {
        title: t('specialization'),
        dataIndex: 'specialization',
        key: 'specialization',
        width: 150,
        render: (specialization: string | null) =>
          specialization ? (
            <Text className="text-sm">{specialization}</Text>
          ) : (
            <Text type="secondary" className="text-xs">
              -
            </Text>
          ),
      },
      {
        title: tCommon('labels.status'),
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => (
          <Tag color={status === 'active' ? 'success' : 'default'}>
            {tCommon(`status.${status}`)}
          </Tag>
        ),
      },
      {
        title: t('balance'),
        dataIndex: 'current_balance',
        key: 'balance',
        width: 140,
        align: 'end' as const,
        render: (balance: number) => {
          const formattedBalance = formatCurrency(Math.abs(balance), currency, locale);

          // Positive balance means we owe the workshop
          // Negative balance means workshop owes us (advance/credit)
          if (balance > 0) {
            return (
              <Tooltip title={t('balanceOwed')}>
                <Text className="text-red-600 font-medium">-{formattedBalance}</Text>
              </Tooltip>
            );
          } else if (balance < 0) {
            return (
              <Tooltip title={t('balanceCredit')}>
                <Text className="text-emerald-600 font-medium">+{formattedBalance}</Text>
              </Tooltip>
            );
          }
          return (
            <Text type="secondary" className="text-sm">
              {formattedBalance}
            </Text>
          );
        },
      },
    ],
    [t, tCommon, currency, locale]
  );

  // ==========================================================================
  // TABLE ACTIONS
  // ==========================================================================

  const tableActions: ActionConfig<Workshop>[] = useMemo(
    () => [
      {
        key: 'viewOrders',
        label: t('orders.title'),
        icon: <FileTextOutlined />,
        onClick: handleViewOrders,
        permission: PERMISSION_KEYS.WORKSHOPS_ORDERS,
      },
      {
        key: 'edit',
        label: tCommon('actions.edit'),
        icon: <EditOutlined />,
        onClick: handleEditWorkshop,
        permission: PERMISSION_KEYS.WORKSHOPS_MANAGE,
      },
      {
        key: 'delete',
        label: tCommon('actions.delete'),
        icon: <DeleteOutlined />,
        onClick: handleDeleteWorkshop,
        permission: PERMISSION_KEYS.WORKSHOPS_MANAGE,
        danger: true,
        disabled: (record: Workshop) => record.current_balance !== 0,
        confirm: {
          title: tCommon('messages.confirmDelete'),
          description: t('messages.deleteWarning'),
          confirmText: tCommon('actions.delete'),
          cancelText: tCommon('actions.cancel'),
        },
      },
    ],
    [t, tCommon, handleViewOrders, handleEditWorkshop, handleDeleteWorkshop]
  );

  // ==========================================================================
  // FILTERS
  // ==========================================================================

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        key: 'specialization',
        label: t('specialization'),
        type: 'select',
        options: SPECIALIZATION_OPTIONS,
        placeholder: tCommon('select.placeholder'),
      },
    ],
    [t, tCommon]
  );

  // ==========================================================================
  // WORKSHOP TYPE SEGMENTED OPTIONS
  // ==========================================================================

  const typeOptions = useMemo(
    () => [
      { label: tCommon('labels.all'), value: 'all' as const },
      { label: t('internal'), value: 'internal' as const, icon: <HomeOutlined /> },
      { label: t('external'), value: 'external' as const, icon: <ShopOutlined /> },
    ],
    [t, tCommon]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="workshop-providers-page">
      {/* Page Header */}
      <PageHeader title={t('workshopProviders')} showBack backUrl={`/${shopId}/workshops/orders`}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddWorkshop}
          permission={PERMISSION_KEYS.WORKSHOPS_MANAGE}
        >
          {t('addWorkshop')}
        </Button>
      </PageHeader>

      {/* Workshop Type Filter */}
      <div className="mb-4">
        <Segmented
          options={typeOptions}
          value={workshopType}
          onChange={(value) => handleTypeChange(value as WorkshopTypeFilter)}
          className="bg-stone-100"
        />
      </div>

      {/* Data Table */}
      <DataTable<Workshop>
        dataSource={workshops}
        columns={columns}
        rowKey="id_workshop"
        loading={isLoading || isFetching}
        searchable
        searchPlaceholder={t('searchWorkshop')}
        searchValue={search}
        onSearch={handleSearch}
        filters={filters}
        filterValues={filterValues}
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
        emptyDescription={t('workshopList')}
        emptyAction={
          can(PERMISSION_KEYS.WORKSHOPS_MANAGE) ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddWorkshop}>
              {t('addWorkshop')}
            </Button>
          ) : undefined
        }
      />

      {/* Workshop Form Drawer */}
      <WorkshopForm
        open={isFormOpen}
        workshop={editingWorkshop}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    </div>
  );
}
