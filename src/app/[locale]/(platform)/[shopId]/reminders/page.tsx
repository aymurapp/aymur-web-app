'use client';

/**
 * Payment Reminders Page
 *
 * Main payment reminders listing page with data table, filters, and summary statistics.
 * Displays reminder information in a searchable, filterable table.
 *
 * Features:
 * - DataTable with reminders using usePaymentReminders hook
 * - Tabs for entity types: All, Suppliers, Workshops, Couriers, Customers
 * - Filters: date range, status (pending, completed, snoozed)
 * - Columns: entity name, type, amount, due_date, status
 * - Status badges with colors
 * - Overdue highlighting (red background/text)
 * - Actions: Mark Complete, Snooze, Edit, Delete
 * - Summary cards: Total Due, Overdue Count, This Week
 * - Create reminder button
 * - Calendar view toggle
 *
 * @module app/(platform)/[locale]/[shopId]/reminders/page
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TableOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Badge,
  DatePicker,
  Dropdown,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { StatCard, StatCardGrid } from '@/components/common/data/StatCard';
import { ReminderCalendar } from '@/components/domain/reminders/ReminderCalendar';
import { ReminderForm } from '@/components/domain/reminders/ReminderForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  useDeletePaymentReminder,
  useMarkReminderComplete,
  useOverdueReminders,
  usePaymentReminders,
  useSnoozeReminder,
  useUpcomingReminders,
  type PaymentReminderWithSupplier,
} from '@/lib/hooks/data/usePaymentReminders';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';
import { getDaysUntilDue, isReminderOverdue } from '@/lib/utils/schemas/paymentReminder';
import type { ReminderStatus, ReminderType } from '@/lib/utils/schemas/paymentReminder';

import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { RangePicker } = DatePicker;

// =============================================================================
// TYPES
// =============================================================================

type ViewMode = 'table' | 'calendar';
type StatusFilter = 'all' | ReminderStatus;

interface FilterState {
  status: StatusFilter;
  dateRange: [string, string] | null;
  reminderType: ReminderType | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, string> = {
  pending: 'gold',
  completed: 'green',
  snoozed: 'blue',
};

const TYPE_COLORS: Record<string, string> = {
  payment_due: 'default',
  follow_up: 'cyan',
  overdue: 'red',
  scheduled: 'purple',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date string
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Payment Reminders Page Component
 *
 * Client component that displays a table/calendar of payment reminders with
 * search, filtering, and pagination capabilities.
 */
export default function RemindersPage(): React.JSX.Element {
  const t = useTranslations('reminders');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    dateRange: null,
    reminderType: null,
  });

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<PaymentReminderWithSupplier | null>(null);

  // Snooze state
  const [snoozeReminderId, setSnoozeReminderId] = useState<string | null>(null);
  const [snoozeDays, setSnoozeDays] = useState(7);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { reminders, totalCount, isInitialLoading, isFetching, refetch } = usePaymentReminders({
    page,
    pageSize: PAGE_SIZE,
    sortBy: 'due_date',
    sortDirection: 'asc',
    status: filters.status === 'all' ? undefined : (filters.status as ReminderStatus),
    dueDateFrom: filters.dateRange?.[0] || undefined,
    dueDateTo: filters.dateRange?.[1] || undefined,
  });

  // Summary data
  const {
    totalAmount: upcomingAmount,
    totalCount: upcomingCount,
    isLoading: upcomingLoading,
  } = useUpcomingReminders({ daysAhead: 7 });

  const {
    totalAmount: overdueAmount,
    totalCount: overdueCount,
    isLoading: overdueLoading,
  } = useOverdueReminders();

  // Mutations
  const markComplete = useMarkReminderComplete();
  const snoozeReminder = useSnoozeReminder();
  const deleteReminder = useDeletePaymentReminder();

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const summaryStats = useMemo(() => {
    // Calculate total pending amount
    const pendingReminders = reminders.filter((r) => r.status !== 'completed');
    const totalDue = pendingReminders.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return {
      totalDue,
      overdueCount,
      overdueAmount,
      upcomingCount,
      upcomingAmount,
    };
  }, [reminders, overdueCount, overdueAmount, upcomingCount, upcomingAmount]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.status !== 'all' ||
      filters.dateRange !== null ||
      filters.reminderType !== null ||
      debouncedSearch.length > 0
    );
  }, [filters, debouncedSearch]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') {
      count++;
    }
    if (filters.dateRange !== null) {
      count++;
    }
    if (filters.reminderType !== null) {
      count++;
    }
    return count;
  }, [filters]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);

    const timeoutId = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, []);

  const handleFilterChange = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      dateRange: null,
      reminderType: null,
    });
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  }, []);

  const handleAddReminder = useCallback(() => {
    setEditingReminder(null);
    setFormOpen(true);
  }, []);

  const handleEditReminder = useCallback((reminder: PaymentReminderWithSupplier) => {
    setEditingReminder(reminder);
    setFormOpen(true);
  }, []);

  const handleMarkComplete = useCallback(
    async (reminder: PaymentReminderWithSupplier) => {
      try {
        await markComplete.mutateAsync({
          reminderId: reminder.id_reminder,
        });
        message.success(t('markedComplete'));
        refetch();
      } catch {
        message.error(tCommon('messages.operationFailed'));
      }
    },
    [markComplete, refetch, t, tCommon]
  );

  const handleSnooze = useCallback(
    async (reminderId: string, days: number) => {
      try {
        await snoozeReminder.mutateAsync({
          reminderId,
          snoozeDays: days,
        });
        message.success(t('snoozed', { days }));
        setSnoozeReminderId(null);
        setSnoozeDays(7);
        refetch();
      } catch {
        message.error(tCommon('messages.operationFailed'));
      }
    },
    [snoozeReminder, refetch, t, tCommon]
  );

  const handleDelete = useCallback(
    async (reminderId: string) => {
      try {
        await deleteReminder.mutateAsync(reminderId);
        message.success(tCommon('messages.operationSuccess'));
        refetch();
      } catch {
        message.error(tCommon('messages.operationFailed'));
      }
    },
    [deleteReminder, refetch, tCommon]
  );

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditingReminder(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setFormOpen(false);
    setEditingReminder(null);
    refetch();
  }, [refetch]);

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================

  const getActionMenuItems = useCallback(
    (reminder: PaymentReminderWithSupplier): MenuProps['items'] => {
      const items: MenuProps['items'] = [];

      // Mark Complete
      if (reminder.status !== 'completed' && can('reminders.update')) {
        items.push({
          key: 'complete',
          icon: <CheckOutlined />,
          label: t('markPaid'),
          onClick: () => handleMarkComplete(reminder),
        });
      }

      // Snooze
      if (reminder.status !== 'completed' && can('reminders.update')) {
        items.push({
          key: 'snooze',
          icon: <ClockCircleOutlined />,
          label: (
            <Popconfirm
              title={t('snoozeReminder')}
              description={
                <div className="py-2">
                  <p className="mb-2 text-sm text-stone-600">{t('snoozeDescription')}</p>
                  <InputNumber
                    min={1}
                    max={30}
                    value={snoozeDays}
                    onChange={(val) => setSnoozeDays(val ?? 7)}
                    addonAfter={t('days')}
                    className="w-32"
                  />
                </div>
              }
              okText={t('snooze')}
              cancelText={tCommon('actions.cancel')}
              open={snoozeReminderId === reminder.id_reminder}
              onOpenChange={(open) => {
                if (open) {
                  setSnoozeReminderId(reminder.id_reminder);
                  setSnoozeDays(7);
                } else {
                  setSnoozeReminderId(null);
                }
              }}
              onConfirm={() => handleSnooze(reminder.id_reminder, snoozeDays)}
              okButtonProps={{ loading: snoozeReminder.isPending }}
            >
              <span onClick={(e) => e.stopPropagation()}>{t('snooze')}</span>
            </Popconfirm>
          ),
        });
      }

      // Edit
      if (can('reminders.update')) {
        items.push({
          key: 'edit',
          icon: <EditOutlined />,
          label: tCommon('actions.edit'),
          onClick: () => handleEditReminder(reminder),
        });
      }

      // Delete
      if (can('reminders.delete')) {
        items.push({
          type: 'divider',
        });
        items.push({
          key: 'delete',
          icon: <DeleteOutlined />,
          label: tCommon('actions.delete'),
          danger: true,
          onClick: () => handleDelete(reminder.id_reminder),
        });
      }

      return items;
    },
    [
      can,
      handleMarkComplete,
      handleEditReminder,
      handleSnooze,
      handleDelete,
      snoozeReminderId,
      snoozeDays,
      snoozeReminder.isPending,
      t,
      tCommon,
    ]
  );

  const columns: ColumnsType<PaymentReminderWithSupplier> = useMemo(
    () => [
      {
        title: t('entity'),
        key: 'entity',
        render: (_: unknown, record: PaymentReminderWithSupplier) => {
          const isOverdue = isReminderOverdue(record.due_date) && record.status !== 'completed';
          return (
            <div>
              <div className={cn('font-medium', isOverdue ? 'text-red-700' : 'text-stone-900')}>
                {record.supplier?.company_name || t('unknownSupplier')}
              </div>
              <div className="text-xs text-stone-400">
                <Tag color="blue" className="me-0 text-xs">
                  {t('entity.supplier')}
                </Tag>
              </div>
            </div>
          );
        },
      },
      {
        title: t('reminderType'),
        dataIndex: 'reminder_type',
        key: 'reminder_type',
        width: 130,
        render: (type: string) => (
          <Tag color={TYPE_COLORS[type] || 'default'}>{t(`type.${type}`)}</Tag>
        ),
      },
      {
        title: tCommon('labels.amount'),
        dataIndex: 'amount',
        key: 'amount',
        width: 130,
        align: 'end',
        render: (amount: number, record: PaymentReminderWithSupplier) => {
          const isOverdue = isReminderOverdue(record.due_date) && record.status !== 'completed';
          return (
            <span className={cn('font-semibold', isOverdue ? 'text-red-700' : 'text-stone-900')}>
              {formatCurrency(amount)}
            </span>
          );
        },
      },
      {
        title: t('dueDate'),
        dataIndex: 'due_date',
        key: 'due_date',
        width: 150,
        render: (date: string, record: PaymentReminderWithSupplier) => {
          const daysUntil = getDaysUntilDue(date);
          const isOverdue = daysUntil < 0 && record.status !== 'completed';

          return (
            <div>
              <div
                className={cn('text-sm', isOverdue ? 'text-red-600 font-medium' : 'text-stone-600')}
              >
                {formatDate(date)}
              </div>
              <div className="text-xs mt-0.5">
                {record.status === 'completed' ? (
                  <Tag color="green" className="m-0">
                    {tCommon('status.completed')}
                  </Tag>
                ) : isOverdue ? (
                  <Tag color="red" className="m-0">
                    <WarningOutlined className="me-1" />
                    {Math.abs(daysUntil)} {t('daysOverdue')}
                  </Tag>
                ) : daysUntil === 0 ? (
                  <Tag color="orange" className="m-0">
                    {t('dueToday')}
                  </Tag>
                ) : daysUntil === 1 ? (
                  <Tag color="gold" className="m-0">
                    {t('dueTomorrow')}
                  </Tag>
                ) : (
                  <Tag color="default" className="m-0">
                    {daysUntil} {t('daysUntil')}
                  </Tag>
                )}
              </div>
            </div>
          );
        },
      },
      {
        title: tCommon('labels.status'),
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => (
          <Tag color={STATUS_COLORS[status] || 'default'}>{tCommon(`status.${status}`)}</Tag>
        ),
      },
      {
        title: tCommon('labels.actions'),
        key: 'actions',
        width: 80,
        align: 'center',
        render: (_: unknown, record: PaymentReminderWithSupplier) => (
          <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
            <Button type="text" size="small">
              ...
            </Button>
          </Dropdown>
        ),
      },
    ],
    [t, tCommon, getActionMenuItems]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="reminders-page">
      {/* Page Header */}
      <PageHeader title={t('title')}>
        <Space>
          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as ViewMode)}
            options={[
              {
                label: (
                  <Tooltip title={t('tableView')}>
                    <TableOutlined />
                  </Tooltip>
                ),
                value: 'table',
              },
              {
                label: (
                  <Tooltip title={t('calendarView')}>
                    <CalendarOutlined />
                  </Tooltip>
                ),
                value: 'calendar',
              },
            ]}
          />

          <Tooltip title={tCommon('actions.refresh')}>
            <Button icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()} />
          </Tooltip>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddReminder}
            permission="reminders.create"
          >
            {t('createReminder')}
          </Button>
        </Space>
      </PageHeader>

      {/* Summary Cards */}
      <StatCardGrid columns={3} className="mb-6">
        <StatCard
          title={t('totalDue')}
          value={formatCurrency(summaryStats.totalDue)}
          prefix={<DollarOutlined className="text-amber-500" />}
          loading={isInitialLoading}
        />
        <StatCard
          title={t('overdue')}
          value={summaryStats.overdueCount}
          prefix={<WarningOutlined className="text-red-500" />}
          loading={overdueLoading}
          valueStyle={summaryStats.overdueCount > 0 ? { color: '#dc2626' } : undefined}
        />
        <StatCard
          title={t('dueThisWeek')}
          value={summaryStats.upcomingCount}
          prefix={<ClockCircleOutlined className="text-blue-500" />}
          loading={upcomingLoading}
        />
      </StatCardGrid>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="mb-6">
          <ReminderCalendar
            onReminderClick={handleEditReminder}
            onDateClick={(date) => {
              handleFilterChange('dateRange', [date, date]);
              setViewMode('table');
            }}
          />
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <>
          {/* Search and Filter Bar */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder={`${tCommon('actions.search')}...`}
                prefix={<SearchOutlined className="text-stone-400" />}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                allowClear
                className="flex-1 max-w-md"
                size="large"
              />

              <Badge count={activeFilterCount} size="small" offset={[-5, 5]}>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setShowFilters(!showFilters)}
                  type={showFilters ? 'primary' : 'default'}
                >
                  {tCommon('actions.filter')}
                </Button>
              </Badge>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="bg-stone-50 rounded-lg p-4 border border-stone-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-1">
                      {tCommon('labels.status')}
                    </label>
                    <Select
                      value={filters.status}
                      onChange={(value) => handleFilterChange('status', value)}
                      className="w-full"
                      options={[
                        { label: tCommon('labels.all'), value: 'all' },
                        { label: tCommon('status.pending'), value: 'pending' },
                        { label: tCommon('status.completed'), value: 'completed' },
                        { label: t('status.snoozed'), value: 'snoozed' },
                      ]}
                    />
                  </div>

                  {/* Reminder Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-1">
                      {t('reminderType')}
                    </label>
                    <Select
                      value={filters.reminderType}
                      onChange={(value) => handleFilterChange('reminderType', value)}
                      allowClear
                      className="w-full"
                      placeholder={tCommon('select.placeholder')}
                      options={[
                        { label: t('type.paymentDue'), value: 'payment_due' },
                        { label: t('type.followUp'), value: 'follow_up' },
                        { label: t('type.overdue'), value: 'overdue' },
                        { label: t('type.scheduled'), value: 'scheduled' },
                      ]}
                    />
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-1">
                      {tCommon('labels.dateRange')}
                    </label>
                    <RangePicker
                      onChange={(dates) => {
                        if (dates && dates[0] && dates[1]) {
                          handleFilterChange('dateRange', [
                            dates[0].format('YYYY-MM-DD'),
                            dates[1].format('YYYY-MM-DD'),
                          ]);
                        } else {
                          handleFilterChange('dateRange', null);
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <div className="pt-2 border-t border-stone-200">
                    <Button
                      type="link"
                      onClick={handleClearFilters}
                      className="px-0 text-stone-500 hover:text-stone-700"
                    >
                      {tCommon('actions.clear')} {tCommon('actions.filter').toLowerCase()}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results Count */}
          {!isInitialLoading && (
            <div className="mb-4 text-sm text-stone-500">
              {tCommon('pagination.showing', {
                from: Math.min((page - 1) * PAGE_SIZE + 1, totalCount),
                to: Math.min(page * PAGE_SIZE, totalCount),
                total: totalCount,
              })}
            </div>
          )}

          {/* Reminders Table */}
          {reminders.length === 0 && !isInitialLoading ? (
            <EmptyState
              icon={<CalendarOutlined />}
              title={hasActiveFilters ? tCommon('messages.noResults') : tCommon('messages.noData')}
              description={hasActiveFilters ? tCommon('messages.tryAgain') : t('noRemindersDesc')}
              action={
                hasActiveFilters
                  ? {
                      label: tCommon('actions.clear'),
                      onClick: handleClearFilters,
                      type: 'default',
                    }
                  : can('reminders.create')
                    ? {
                        label: t('createReminder'),
                        onClick: handleAddReminder,
                        icon: <PlusOutlined />,
                      }
                    : undefined
              }
              size="lg"
            />
          ) : (
            <Table
              columns={columns}
              dataSource={reminders}
              rowKey="id_reminder"
              loading={isInitialLoading}
              className={cn(isFetching && 'opacity-60')}
              pagination={{
                current: page,
                total: totalCount,
                pageSize: PAGE_SIZE,
                onChange: setPage,
                showSizeChanger: false,
                showTotal: (total, range) =>
                  tCommon('pagination.showTotal', {
                    start: range[0],
                    end: range[1],
                    total,
                  }),
              }}
              scroll={{ x: 800 }}
              rowClassName={(record) =>
                isReminderOverdue(record.due_date) && record.status !== 'completed'
                  ? 'bg-red-50/50'
                  : ''
              }
              onRow={(record) => ({
                onClick: () => can('reminders.update') && handleEditReminder(record),
                className: cn(
                  'cursor-pointer hover:bg-amber-50/50',
                  isReminderOverdue(record.due_date) &&
                    record.status !== 'completed' &&
                    'hover:bg-red-100/50'
                ),
              })}
            />
          )}
        </>
      )}

      {/* Reminder Form Modal */}
      <ReminderForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        reminder={editingReminder}
      />
    </div>
  );
}
