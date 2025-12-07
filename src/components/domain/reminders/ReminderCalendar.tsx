'use client';

/**
 * ReminderCalendar Component
 *
 * Calendar visualization for payment reminders using Ant Design Calendar.
 * Shows reminders on their due dates with color-coding by entity type.
 *
 * Features:
 * - Calendar visualization using Ant Design Calendar
 * - Reminders shown on their due dates
 * - Color-coded by entity type (supplier=blue, workshop=purple, courier=orange, customer=green)
 * - Click date to see reminders for that day
 * - Click reminder to view details
 * - Month/year view toggle
 * - Overdue reminders highlighted in red
 *
 * @module components/domain/reminders/ReminderCalendar
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  Calendar,
  Badge,
  Card,
  Modal,
  List,
  Tag,
  Space,
  Typography,
  Tooltip,
  message,
  Popconfirm,
  InputNumber,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  usePaymentReminders,
  useMarkReminderComplete,
  useSnoozeReminder,
  type PaymentReminderWithSupplier,
} from '@/lib/hooks/data/usePaymentReminders';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';
import { isReminderOverdue, getDaysUntilDue } from '@/lib/utils/schemas/paymentReminder';

import type { CalendarMode } from 'antd/es/calendar/generateCalendar';
import type { Dayjs } from 'dayjs';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface ReminderCalendarProps {
  /** Callback when a reminder is clicked */
  onReminderClick?: (reminder: PaymentReminderWithSupplier) => void;
  /** Callback when a date is clicked */
  onDateClick?: (date: string) => void;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Color coding by entity type
const ENTITY_TYPE_COLORS = {
  supplier: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  workshop: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  courier: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  customer: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
} as const;

const STATUS_COLORS: Record<string, string> = {
  pending: 'gold',
  completed: 'green',
  snoozed: 'blue',
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ReminderCalendar Component
 *
 * Calendar view showing payment reminders on their due dates.
 */
export function ReminderCalendar({
  onReminderClick,
  onDateClick,
  className,
}: ReminderCalendarProps): React.JSX.Element {
  const t = useTranslations('reminders');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  // State
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [mode, setMode] = useState<CalendarMode>('month');

  // Snooze state
  const [snoozeReminderId, setSnoozeReminderId] = useState<string | null>(null);
  const [snoozeDays, setSnoozeDays] = useState(7);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  // Fetch reminders for a 3-month range around current date
  const { reminders, isLoading, refetch } = usePaymentReminders({
    pageSize: 500, // Get all reminders for calendar view
    sortBy: 'due_date',
    sortDirection: 'asc',
  });

  // Mutations
  const markComplete = useMarkReminderComplete();
  const snoozeReminder = useSnoozeReminder();

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  // Group reminders by date for efficient lookup
  const remindersByDate = useMemo(() => {
    const map = new Map<string, PaymentReminderWithSupplier[]>();

    reminders.forEach((reminder) => {
      const dateKey = reminder.due_date;
      const existing = map.get(dateKey) || [];
      existing.push(reminder);
      map.set(dateKey, existing);
    });

    return map;
  }, [reminders]);

  // Get reminders for selected date
  const selectedDateReminders = useMemo(() => {
    if (!selectedDate) {
      return [];
    }
    return remindersByDate.get(selectedDate.format('YYYY-MM-DD')) || [];
  }, [selectedDate, remindersByDate]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleDateSelect = useCallback(
    (date: Dayjs) => {
      const dateReminders = remindersByDate.get(date.format('YYYY-MM-DD')) || [];

      if (dateReminders.length > 0) {
        setSelectedDate(date);
        setDetailModalOpen(true);
      } else if (onDateClick) {
        onDateClick(date.format('YYYY-MM-DD'));
      }
    },
    [remindersByDate, onDateClick]
  );

  const handleReminderClick = useCallback(
    (reminder: PaymentReminderWithSupplier) => {
      setDetailModalOpen(false);
      onReminderClick?.(reminder);
    },
    [onReminderClick]
  );

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

  const handlePanelChange = useCallback((_date: Dayjs, newMode: CalendarMode) => {
    setMode(newMode);
  }, []);

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  /**
   * Render cell content for month view
   */
  const dateCellRender = useCallback(
    (date: Dayjs) => {
      const dateReminders = remindersByDate.get(date.format('YYYY-MM-DD')) || [];

      if (dateReminders.length === 0) {
        return null;
      }

      // Group by status
      const overdue = dateReminders.filter(
        (r) => isReminderOverdue(r.due_date) && r.status !== 'completed'
      );
      const pending = dateReminders.filter(
        (r) => !isReminderOverdue(r.due_date) && r.status === 'pending'
      );
      const completed = dateReminders.filter((r) => r.status === 'completed');
      const snoozed = dateReminders.filter((r) => r.status === 'snoozed');

      const totalAmount = dateReminders
        .filter((r) => r.status !== 'completed')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);

      return (
        <div className="px-1 py-0.5">
          {/* Badges */}
          <div className="flex flex-wrap gap-1 mb-1">
            {overdue.length > 0 && (
              <Badge
                count={overdue.length}
                style={{ backgroundColor: '#dc2626' }}
                size="small"
                title={`${overdue.length} ${t('overdue')}`}
              />
            )}
            {pending.length > 0 && (
              <Badge
                count={pending.length}
                style={{ backgroundColor: '#f59e0b' }}
                size="small"
                title={`${pending.length} ${tCommon('status.pending')}`}
              />
            )}
            {snoozed.length > 0 && (
              <Badge
                count={snoozed.length}
                style={{ backgroundColor: '#3b82f6' }}
                size="small"
                title={`${snoozed.length} ${t('status.snoozed')}`}
              />
            )}
            {completed.length > 0 && (
              <Badge
                count={completed.length}
                style={{ backgroundColor: '#16a34a' }}
                size="small"
                title={`${completed.length} ${tCommon('status.completed')}`}
              />
            )}
          </div>

          {/* Total amount if there are pending/overdue */}
          {totalAmount > 0 && (
            <Text
              className={cn(
                'text-xs font-medium block truncate',
                overdue.length > 0 ? 'text-red-600' : 'text-stone-600'
              )}
            >
              {formatCurrency(totalAmount)}
            </Text>
          )}
        </div>
      );
    },
    [remindersByDate, t, tCommon]
  );

  /**
   * Render cell content for year view
   */
  const monthCellRender = useCallback(
    (date: Dayjs) => {
      const monthStart = date.startOf('month');
      const monthEnd = date.endOf('month');

      // Count reminders in this month
      let count = 0;
      let overdueCount = 0;
      let totalAmount = 0;

      reminders.forEach((reminder) => {
        const dueDate = dayjs(reminder.due_date);
        if (dueDate.isAfter(monthStart) && dueDate.isBefore(monthEnd)) {
          count++;
          if (isReminderOverdue(reminder.due_date) && reminder.status !== 'completed') {
            overdueCount++;
          }
          if (reminder.status !== 'completed') {
            totalAmount += Number(reminder.amount || 0);
          }
        }
      });

      if (count === 0) {
        return null;
      }

      return (
        <div className="text-center">
          <Badge
            count={count}
            style={{ backgroundColor: overdueCount > 0 ? '#dc2626' : '#f59e0b' }}
          />
          {totalAmount > 0 && (
            <Text className="text-xs text-stone-500 block mt-1">{formatCurrency(totalAmount)}</Text>
          )}
        </div>
      );
    },
    [reminders]
  );

  /**
   * Render reminder item in detail modal
   */
  const renderReminderItem = useCallback(
    (reminder: PaymentReminderWithSupplier) => {
      const isOverdue = isReminderOverdue(reminder.due_date) && reminder.status !== 'completed';
      const daysUntil = getDaysUntilDue(reminder.due_date);
      const entityColors = ENTITY_TYPE_COLORS.supplier; // Currently only suppliers

      return (
        <List.Item
          key={reminder.id_reminder}
          className={cn(
            'rounded-lg mb-2 border cursor-pointer',
            isOverdue ? 'bg-red-50 border-red-200' : `${entityColors.bg} ${entityColors.border}`
          )}
          onClick={() => handleReminderClick(reminder)}
          actions={
            reminder.status !== 'completed' && can('reminders.update')
              ? [
                  <Tooltip key="complete" title={t('markPaid')}>
                    <Popconfirm
                      title={t('confirmMarkPaid')}
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleMarkComplete(reminder);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText={tCommon('actions.confirm')}
                      cancelText={tCommon('actions.cancel')}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<CheckCircleOutlined />}
                        className="text-emerald-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </Tooltip>,
                  <Tooltip key="snooze" title={t('snooze')}>
                    <Popconfirm
                      title={t('snoozeReminder')}
                      description={
                        <div className="py-2">
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
                      open={snoozeReminderId === reminder.id_reminder}
                      onOpenChange={(open) => {
                        if (open) {
                          setSnoozeReminderId(reminder.id_reminder);
                        } else {
                          setSnoozeReminderId(null);
                        }
                      }}
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleSnooze(reminder.id_reminder, snoozeDays);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText={t('snooze')}
                      cancelText={tCommon('actions.cancel')}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<ClockCircleOutlined />}
                        className="text-amber-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </Tooltip>,
                ]
              : undefined
          }
        >
          <List.Item.Meta
            title={
              <div className="flex items-center justify-between">
                <span className={cn('font-medium', isOverdue ? 'text-red-700' : entityColors.text)}>
                  {reminder.supplier?.company_name || t('unknownSupplier')}
                </span>
                <span
                  className={cn('font-semibold', isOverdue ? 'text-red-700' : 'text-stone-900')}
                >
                  {formatCurrency(reminder.amount)}
                </span>
              </div>
            }
            description={
              <div className="flex items-center justify-between mt-1">
                <Space size="small">
                  <Tag color={STATUS_COLORS[reminder.status || 'pending']}>
                    {tCommon(`status.${reminder.status || 'pending'}`)}
                  </Tag>
                  <Tag color="blue">{t('entity.supplier')}</Tag>
                </Space>
                {isOverdue ? (
                  <Tag color="red">
                    <WarningOutlined className="me-1" />
                    {Math.abs(daysUntil)} {t('daysOverdue')}
                  </Tag>
                ) : daysUntil === 0 ? (
                  <Tag color="orange">{t('dueToday')}</Tag>
                ) : null}
              </div>
            }
          />
        </List.Item>
      );
    },
    [
      handleReminderClick,
      handleMarkComplete,
      handleSnooze,
      snoozeReminderId,
      snoozeDays,
      can,
      t,
      tCommon,
    ]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Card
      className={cn('border border-stone-200', className)}
      loading={isLoading}
      styles={{ body: { padding: '12px' } }}
    >
      <Calendar
        mode={mode}
        onPanelChange={handlePanelChange}
        onSelect={handleDateSelect}
        cellRender={(current, info) => {
          if (info.type === 'date') {
            return dateCellRender(current);
          }
          if (info.type === 'month') {
            return monthCellRender(current);
          }
          return info.originNode;
        }}
        className="reminder-calendar"
      />

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-stone-200">
        <div className="flex flex-wrap items-center gap-4 text-sm text-stone-600">
          <span className="font-medium">{t('legend')}:</span>
          <span className="flex items-center gap-1">
            <Badge color="#dc2626" />
            {t('overdue')}
          </span>
          <span className="flex items-center gap-1">
            <Badge color="#f59e0b" />
            {tCommon('status.pending')}
          </span>
          <span className="flex items-center gap-1">
            <Badge color="#3b82f6" />
            {t('status.snoozed')}
          </span>
          <span className="flex items-center gap-1">
            <Badge color="#16a34a" />
            {tCommon('status.completed')}
          </span>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <DollarOutlined className="text-amber-500" />
            {selectedDate?.format('MMMM D, YYYY')} - {t('reminders')}
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedDateReminders.length > 0 ? (
          <List
            dataSource={selectedDateReminders}
            renderItem={renderReminderItem}
            className="reminder-detail-list"
          />
        ) : (
          <div className="text-center py-8 text-stone-500">{t('noRemindersForDate')}</div>
        )}
      </Modal>

      <style jsx global>{`
        .reminder-calendar .ant-picker-calendar-date-content {
          height: auto !important;
          min-height: 40px;
        }

        .reminder-calendar .ant-picker-cell-selected .ant-picker-calendar-date {
          background: rgba(245, 158, 11, 0.1);
        }

        .reminder-calendar .ant-picker-cell-selected .ant-picker-calendar-date-value {
          color: #d97706;
        }

        .reminder-detail-list .ant-list-item {
          padding: 12px;
        }
      `}</style>
    </Card>
  );
}

export default ReminderCalendar;
