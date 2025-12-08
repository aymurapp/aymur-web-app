'use client';

/**
 * Recurring Expenses Page
 *
 * Manages recurring expense schedules for automated expense generation.
 *
 * Features:
 * - List of recurring expense schedules
 * - Columns: description, category, amount, frequency, next_occurrence
 * - Frequency badge
 * - Next occurrence date display
 * - Actions: pause/resume, edit, delete
 * - Create recurring expense button
 * - Recurring expense form with:
 *   - Category, amount, vendor
 *   - Recurrence type (daily, weekly, monthly, yearly)
 *   - Recurrence day input
 *   - Active toggle
 *
 * @module app/(platform)/[locale]/[shopId]/expenses/recurring/page
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  CalendarOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import {
  Input,
  Table,
  Tag,
  Select,
  Tooltip,
  Space,
  Dropdown,
  message,
  Form,
  InputNumber,
  DatePicker,
  Drawer,
  Button as AntButton,
  Typography,
  Switch,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { StatCard, StatCardGrid } from '@/components/common/data/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  useRecurringExpenses,
  useExpenseCategories,
  useCreateRecurringExpense,
  useUpdateRecurringExpense,
  usePauseRecurringExpense,
  useResumeRecurringExpense,
  useDeleteRecurringExpense,
  type RecurringExpenseWithCategory,
} from '@/lib/hooks/data/useExpenses';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';

import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface FormValues {
  description: string;
  id_expense_category: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  day_of_month?: number;
  day_of_week?: number;
  start_date: dayjs.Dayjs;
  end_date?: dayjs.Dayjs;
  auto_approve: boolean;
}

type StatusFilter = 'all' | 'active' | 'paused';
type FrequencyFilter = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly';

// =============================================================================
// CONSTANTS
// =============================================================================

const PAGE_SIZE = 20;

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get tag color for frequency
 */
function getFrequencyColor(frequency: string): string {
  switch (frequency) {
    case 'daily':
      return 'blue';
    case 'weekly':
      return 'cyan';
    case 'monthly':
      return 'gold';
    case 'yearly':
      return 'purple';
    default:
      return 'default';
  }
}

/**
 * Get tag color for is_active status
 */
function getStatusColor(isActive: boolean | null): string {
  if (isActive === true) {
    return 'green';
  }
  if (isActive === false) {
    return 'orange';
  }
  return 'gold';
}

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

/**
 * Calculate days until next occurrence
 */
function getDaysUntil(dateString: string): number {
  const nextDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = nextDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function RecurringExpensesPage(): React.JSX.Element {
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('all');

  // Form state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpenseWithCategory | null>(
    null
  );
  const [form] = Form.useForm<FormValues>();

  // Watch frequency for conditional fields
  const selectedFrequency = Form.useWatch('frequency', form);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { data: categories = [] } = useExpenseCategories();

  const { recurringExpenses, totalCount, isLoading, refetch } = useRecurringExpenses({
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    frequency: frequencyFilter === 'all' ? undefined : frequencyFilter,
  });

  // Mutations
  const createMutation = useCreateRecurringExpense();
  const updateMutation = useUpdateRecurringExpense();
  const pauseMutation = usePauseRecurringExpense();
  const resumeMutation = useResumeRecurringExpense();
  const deleteMutation = useDeleteRecurringExpense();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isEditing = !!editingRecurring;

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const summaryStats = useMemo(() => {
    let totalMonthly = 0;
    let activeCount = 0;
    let upcomingThisWeek = 0;

    recurringExpenses.forEach((expense) => {
      if (expense.is_active) {
        activeCount++;

        // Calculate monthly equivalent
        switch (expense.frequency) {
          case 'daily':
            totalMonthly += expense.amount * 30;
            break;
          case 'weekly':
            totalMonthly += expense.amount * 4;
            break;
          case 'monthly':
            totalMonthly += expense.amount;
            break;
          case 'yearly':
            totalMonthly += expense.amount / 12;
            break;
        }

        // Check if due within a week
        const daysUntil = getDaysUntil(expense.next_due_date);
        if (daysUntil >= 0 && daysUntil <= 7) {
          upcomingThisWeek++;
        }
      }
    });

    return {
      totalMonthly,
      activeCount,
      upcomingThisWeek,
    };
  }, [recurringExpenses]);

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

  const handleAdd = useCallback(() => {
    setEditingRecurring(null);
    form.resetFields();
    form.setFieldsValue({
      start_date: dayjs(),
      frequency: 'monthly',
      auto_approve: true,
    });
    setDrawerOpen(true);
  }, [form]);

  const handleEdit = useCallback(
    (record: RecurringExpenseWithCategory) => {
      setEditingRecurring(record);
      form.setFieldsValue({
        description: record.description,
        id_expense_category: record.id_expense_category,
        amount: record.amount,
        frequency: record.frequency as FormValues['frequency'],
        day_of_month: record.day_of_month || undefined,
        day_of_week: record.day_of_week || undefined,
        start_date: dayjs(record.start_date),
        end_date: record.end_date ? dayjs(record.end_date) : undefined,
        auto_approve: record.auto_approve ?? true,
      });
      setDrawerOpen(true);
    },
    [form]
  );

  const handlePause = useCallback(
    async (id: string) => {
      try {
        await pauseMutation.mutateAsync(id);
        message.success(tCommon('messages.operationSuccess'));
        refetch();
      } catch {
        message.error(tCommon('messages.operationFailed'));
      }
    },
    [pauseMutation, tCommon, refetch]
  );

  const handleResume = useCallback(
    async (id: string) => {
      try {
        await resumeMutation.mutateAsync(id);
        message.success(tCommon('messages.operationSuccess'));
        refetch();
      } catch {
        message.error(tCommon('messages.operationFailed'));
      }
    },
    [resumeMutation, tCommon, refetch]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        message.success(tCommon('messages.operationSuccess'));
        refetch();
      } catch {
        message.error(tCommon('messages.operationFailed'));
      }
    },
    [deleteMutation, tCommon, refetch]
  );

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingRecurring(null);
    form.resetFields();
  }, [form]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const baseData = {
          description: values.description,
          id_expense_category: values.id_expense_category,
          amount: values.amount,
          frequency: values.frequency,
          day_of_month:
            values.frequency === 'monthly' || values.frequency === 'yearly'
              ? (values.day_of_month ?? null)
              : null,
          day_of_week: values.frequency === 'weekly' ? (values.day_of_week ?? null) : null,
          start_date: values.start_date.format('YYYY-MM-DD'),
          end_date: values.end_date?.format('YYYY-MM-DD') || null,
          auto_approve: values.auto_approve,
        };

        if (isEditing && editingRecurring) {
          await updateMutation.mutateAsync({
            recurringExpenseId: editingRecurring.id_recurring_expense,
            data: baseData,
          });
        } else {
          await createMutation.mutateAsync({
            ...baseData,
            is_active: true,
          });
        }

        message.success(tCommon('messages.operationSuccess'));
        handleDrawerClose();
        refetch();
      } catch {
        message.error(tCommon('messages.operationFailed'));
      }
    },
    [
      isEditing,
      editingRecurring,
      createMutation,
      updateMutation,
      handleDrawerClose,
      refetch,
      tCommon,
    ]
  );

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================

  const getActionMenuItems = useCallback(
    (record: RecurringExpenseWithCategory): MenuProps['items'] => {
      const items: MenuProps['items'] = [
        {
          key: 'edit',
          icon: <EditOutlined />,
          label: tCommon('actions.edit'),
          onClick: () => handleEdit(record),
        },
      ];

      if (record.is_active) {
        items.push({
          key: 'pause',
          icon: <PauseCircleOutlined />,
          label: 'Pause',
          onClick: () => handlePause(record.id_recurring_expense),
        });
      } else {
        items.push({
          key: 'resume',
          icon: <PlayCircleOutlined />,
          label: 'Resume',
          onClick: () => handleResume(record.id_recurring_expense),
        });
      }

      items.push({
        type: 'divider',
      });

      items.push({
        key: 'delete',
        icon: <DeleteOutlined />,
        label: tCommon('actions.delete'),
        danger: true,
        onClick: () => handleDelete(record.id_recurring_expense),
      });

      return items;
    },
    [handleEdit, handlePause, handleResume, handleDelete, tCommon]
  );

  const columns: ColumnsType<RecurringExpenseWithCategory> = useMemo(
    () => [
      {
        title: t('description'),
        dataIndex: 'description',
        key: 'description',
        render: (description: string) => (
          <div className="font-medium text-stone-900">{description}</div>
        ),
      },
      {
        title: t('category'),
        dataIndex: ['expense_categories', 'category_name'],
        key: 'category',
        width: 150,
        render: (_: unknown, record: RecurringExpenseWithCategory) => (
          <Tag className="border-amber-200 bg-amber-50 text-amber-700">
            {record.expense_categories?.category_name || '-'}
          </Tag>
        ),
      },
      {
        title: t('amount'),
        dataIndex: 'amount',
        key: 'amount',
        width: 120,
        align: 'end',
        render: (amount: number) => (
          <span className="font-semibold text-stone-900">{formatCurrency(amount)}</span>
        ),
      },
      {
        title: t('frequency'),
        dataIndex: 'frequency',
        key: 'frequency',
        width: 100,
        render: (frequency: string) => (
          <Tag color={getFrequencyColor(frequency)}>
            {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
          </Tag>
        ),
      },
      {
        title: 'Next Due',
        dataIndex: 'next_due_date',
        key: 'next_due_date',
        width: 140,
        render: (date: string, record: RecurringExpenseWithCategory) => {
          const daysUntil = getDaysUntil(date);
          const isOverdue = daysUntil < 0;
          const isSoon = daysUntil >= 0 && daysUntil <= 3;

          return (
            <div>
              <div
                className={cn(
                  'font-medium',
                  isOverdue && 'text-red-600',
                  isSoon && 'text-amber-600',
                  !isOverdue && !isSoon && 'text-stone-600'
                )}
              >
                {formatDate(date)}
              </div>
              {record.is_active && (
                <div
                  className={cn(
                    'text-xs',
                    isOverdue && 'text-red-500',
                    isSoon && 'text-amber-500',
                    !isOverdue && !isSoon && 'text-stone-400'
                  )}
                >
                  {isOverdue
                    ? `${Math.abs(daysUntil)} days overdue`
                    : daysUntil === 0
                      ? 'Today'
                      : daysUntil === 1
                        ? 'Tomorrow'
                        : `In ${daysUntil} days`}
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: tCommon('labels.status'),
        dataIndex: 'is_active',
        key: 'is_active',
        width: 100,
        render: (isActive: boolean | null) => (
          <Tag color={getStatusColor(isActive)}>
            {isActive ? tCommon('status.active') : 'Paused'}
          </Tag>
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 60,
        align: 'center',
        render: (_: unknown, record: RecurringExpenseWithCategory) => (
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
    <div className="recurring-expenses-page">
      {/* Page Header */}
      <PageHeader title={`${t('recurring')} ${t('title')}`} showBack>
        <Space>
          <Tooltip title={tCommon('actions.refresh')}>
            <Button icon={<ReloadOutlined spin={isLoading} />} onClick={() => refetch()} />
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            permission="expenses.create"
          >
            {tCommon('actions.add')} {t('recurring')}
          </Button>
        </Space>
      </PageHeader>

      {/* Summary Cards */}
      <StatCardGrid columns={3} className="mb-6">
        <StatCard
          title="Est. Monthly Total"
          value={formatCurrency(summaryStats.totalMonthly)}
          prefix={<DollarOutlined className="text-amber-500" />}
          loading={isLoading}
        />
        <StatCard
          title={tCommon('status.active')}
          value={summaryStats.activeCount}
          prefix={<CheckCircleOutlined className="text-emerald-500" />}
          loading={isLoading}
        />
        <StatCard
          title="Due This Week"
          value={summaryStats.upcomingThisWeek}
          prefix={<ClockCircleOutlined className="text-amber-500" />}
          loading={isLoading}
        />
      </StatCardGrid>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <Input
          placeholder={`${tCommon('actions.search')}...`}
          prefix={<SearchOutlined className="text-stone-400" />}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          allowClear
          className="flex-1 max-w-md"
        />

        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          className="w-40"
          options={[
            { label: tCommon('labels.all'), value: 'all' },
            { label: tCommon('status.active'), value: 'active' },
            { label: 'Paused', value: 'paused' },
            { label: tCommon('status.completed'), value: 'completed' },
          ]}
        />

        <Select
          value={frequencyFilter}
          onChange={setFrequencyFilter}
          className="w-40"
          options={[
            { label: `${tCommon('labels.all')} ${t('frequency')}`, value: 'all' },
            ...FREQUENCY_OPTIONS,
          ]}
        />
      </div>

      {/* Table */}
      {recurringExpenses.length === 0 && !isLoading ? (
        <EmptyState
          icon={<CalendarOutlined />}
          title={tCommon('messages.noData')}
          description="Set up recurring expenses for automatic tracking of regular payments."
          action={
            can('expenses.create')
              ? {
                  label: `${tCommon('actions.add')} ${t('recurring')}`,
                  onClick: handleAdd,
                  icon: <PlusOutlined />,
                }
              : undefined
          }
          size="lg"
        />
      ) : (
        <Table
          columns={columns}
          dataSource={recurringExpenses}
          rowKey="id_recurring_expense"
          loading={isLoading}
          pagination={{
            current: page,
            total: totalCount,
            pageSize: PAGE_SIZE,
            onChange: setPage,
            showSizeChanger: false,
          }}
          scroll={{ x: 900 }}
        />
      )}

      {/* Add/Edit Drawer */}
      <Drawer
        title={
          isEditing
            ? `${tCommon('actions.edit')} ${t('recurring')}`
            : `${tCommon('actions.add')} ${t('recurring')}`
        }
        placement="right"
        width={480}
        onClose={handleDrawerClose}
        open={drawerOpen}
        destroyOnClose
        extra={
          <Space>
            <AntButton onClick={handleDrawerClose}>{tCommon('actions.cancel')}</AntButton>
            <Button type="primary" onClick={() => form.submit()} loading={isSubmitting}>
              {tCommon('actions.save')}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          {/* Description */}
          <Form.Item
            name="description"
            label={t('description')}
            rules={[
              { required: true, message: tCommon('validation.required') },
              { max: 200, message: tCommon('validation.maxLength', { max: 200 }) },
            ]}
          >
            <Input placeholder={t('description')} />
          </Form.Item>

          {/* Category */}
          <Form.Item
            name="id_expense_category"
            label={t('category')}
            rules={[{ required: true, message: tCommon('validation.required') }]}
          >
            <Select
              placeholder={tCommon('select.placeholder')}
              options={categories.map((cat) => ({
                label: cat.category_name,
                value: cat.id_expense_category,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          {/* Amount */}
          <Form.Item
            name="amount"
            label={t('amount')}
            rules={[
              { required: true, message: tCommon('validation.required') },
              { type: 'number', min: 0.01, message: tCommon('validation.minValue', { min: 0.01 }) },
            ]}
          >
            <InputNumber<number>
              placeholder="0.00"
              prefix={<DollarOutlined className="text-stone-400" />}
              min={0}
              precision={2}
              className="w-full"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => {
                const parsed = value?.replace(/\$\s?|(,*)/g, '');
                return parsed ? Number(parsed) : 0;
              }}
            />
          </Form.Item>

          {/* Frequency */}
          <Form.Item
            name="frequency"
            label={t('frequency')}
            rules={[{ required: true, message: tCommon('validation.required') }]}
          >
            <Select options={FREQUENCY_OPTIONS} />
          </Form.Item>

          {/* Conditional day inputs */}
          {selectedFrequency === 'weekly' && (
            <Form.Item
              name="day_of_week"
              label="Day of Week"
              rules={[{ required: true, message: tCommon('validation.required') }]}
            >
              <Select options={DAYS_OF_WEEK} placeholder="Select day" />
            </Form.Item>
          )}

          {(selectedFrequency === 'monthly' || selectedFrequency === 'yearly') && (
            <Form.Item
              name="day_of_month"
              label="Day of Month"
              rules={[
                { required: true, message: tCommon('validation.required') },
                { type: 'number', min: 1, max: 31, message: 'Enter a day between 1 and 31' },
              ]}
            >
              <InputNumber min={1} max={31} placeholder="1-31" className="w-full" />
            </Form.Item>
          )}

          {/* Start and End Dates */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="start_date"
              label="Start Date"
              rules={[{ required: true, message: tCommon('validation.required') }]}
            >
              <DatePicker className="w-full" format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item name="end_date" label="End Date (Optional)">
              <DatePicker className="w-full" format="YYYY-MM-DD" />
            </Form.Item>
          </div>

          {/* Auto Approve Toggle */}
          <Form.Item name="auto_approve" label="Auto Approve Expenses" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Text type="secondary" className="block mb-4 text-xs">
            When enabled, generated expenses will be automatically approved.
          </Text>
        </Form>
      </Drawer>
    </div>
  );
}
