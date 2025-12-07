'use client';

/**
 * PaymentRemindersWidget Component
 *
 * Compact dashboard widget displaying upcoming and overdue payment reminders.
 * Shows payments due in the next 7 days and highlights overdue payments.
 *
 * Features:
 * - Upcoming payments (next 7 days) using useUpcomingReminders
 * - Overdue payments highlighted in red using useOverdueReminders
 * - List format: entity name, amount, due date, days until/overdue
 * - Quick actions: Mark Paid, Snooze
 * - "View All" link to full reminders page
 * - Empty state when no reminders
 *
 * @module components/domain/dashboard/PaymentRemindersWidget
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  BellOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Card, List, Tag, Skeleton, Space, Popconfirm, Tooltip, InputNumber, message } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { Button } from '@/components/ui/Button';
import {
  useUpcomingReminders,
  useOverdueReminders,
  useMarkReminderComplete,
  useSnoozeReminder,
  type PaymentReminderWithSupplier,
} from '@/lib/hooks/data/usePaymentReminders';
import { usePermissions } from '@/lib/hooks/permissions';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';
import { getDaysUntilDue } from '@/lib/utils/schemas/paymentReminder';

// =============================================================================
// TYPES
// =============================================================================

export interface PaymentRemindersWidgetProps {
  /** Additional class name */
  className?: string;
  /** Number of days ahead to show (default: 7) */
  daysAhead?: number;
  /** Maximum items to show (default: 5) */
  maxItems?: number;
}

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

/**
 * Format due date for display
 */
function formatDueDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * PaymentRemindersWidget Component
 *
 * Dashboard widget showing payment reminders with quick actions.
 * Combines upcoming and overdue reminders in a compact list view.
 */
export function PaymentRemindersWidget({
  className,
  daysAhead = 7,
  maxItems = 5,
}: PaymentRemindersWidgetProps): React.JSX.Element {
  const t = useTranslations('reminders');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  // Snooze popover state
  const [snoozeReminderId, setSnoozeReminderId] = useState<string | null>(null);
  const [snoozeDays, setSnoozeDays] = useState(7);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const {
    reminders: upcomingReminders,
    totalAmount: upcomingAmount,
    isLoading: upcomingLoading,
    refetch: refetchUpcoming,
  } = useUpcomingReminders({ daysAhead, limit: maxItems });

  const {
    reminders: overdueReminders,
    totalCount: overdueCount,
    totalAmount: overdueAmount,
    isLoading: overdueLoading,
    refetch: refetchOverdue,
  } = useOverdueReminders({ limit: maxItems });

  // Mutations
  const markComplete = useMarkReminderComplete();
  const snoozeReminder = useSnoozeReminder();

  const isLoading = upcomingLoading || overdueLoading;

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  // Combine and sort reminders (overdue first, then by due date)
  const allReminders = useMemo(() => {
    const combined = [
      ...overdueReminders.map((r) => ({ ...r, isOverdue: true })),
      ...upcomingReminders.map((r) => ({ ...r, isOverdue: false })),
    ];

    // Remove duplicates by id_reminder
    const unique = combined.filter(
      (reminder, index, self) =>
        index === self.findIndex((r) => r.id_reminder === reminder.id_reminder)
    );

    // Sort: overdue first, then by due date ascending
    return unique
      .sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) {
          return -1;
        }
        if (!a.isOverdue && b.isOverdue) {
          return 1;
        }
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })
      .slice(0, maxItems);
  }, [overdueReminders, upcomingReminders, maxItems]);

  const totalDue = upcomingAmount + overdueAmount;

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleMarkPaid = useCallback(
    async (reminder: PaymentReminderWithSupplier) => {
      try {
        await markComplete.mutateAsync({
          reminderId: reminder.id_reminder,
          completionNotes: 'Marked as paid from dashboard',
        });
        message.success(t('markedComplete'));
        refetchUpcoming();
        refetchOverdue();
      } catch {
        message.error(tCommon('messages.operationFailed'));
      }
    },
    [markComplete, refetchUpcoming, refetchOverdue, t, tCommon]
  );

  const handleSnooze = useCallback(
    async (reminderId: string, days: number) => {
      try {
        await snoozeReminder.mutateAsync({
          reminderId,
          snoozeDays: days,
          snoozeReason: 'Snoozed from dashboard',
        });
        message.success(t('snoozed', { days }));
        setSnoozeReminderId(null);
        setSnoozeDays(7);
        refetchUpcoming();
        refetchOverdue();
      } catch {
        message.error(tCommon('messages.operationFailed'));
      }
    },
    [snoozeReminder, refetchUpcoming, refetchOverdue, t, tCommon]
  );

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  const renderDaysBadge = (reminder: PaymentReminderWithSupplier & { isOverdue: boolean }) => {
    const daysUntil = getDaysUntilDue(reminder.due_date);

    if (reminder.isOverdue || daysUntil < 0) {
      return (
        <Tag color="red" className="m-0">
          <WarningOutlined className="me-1" />
          {Math.abs(daysUntil)} {t('daysOverdue')}
        </Tag>
      );
    }

    if (daysUntil === 0) {
      return (
        <Tag color="orange" className="m-0">
          {t('dueToday')}
        </Tag>
      );
    }

    if (daysUntil === 1) {
      return (
        <Tag color="gold" className="m-0">
          {t('dueTomorrow')}
        </Tag>
      );
    }

    return (
      <Tag color="blue" className="m-0">
        {daysUntil} {t('daysUntil')}
      </Tag>
    );
  };

  const renderActions = (reminder: PaymentReminderWithSupplier & { isOverdue: boolean }) => {
    const canEdit = can('reminders.update');

    if (!canEdit) {
      return null;
    }

    return (
      <Space size="small">
        {/* Mark Paid */}
        <Popconfirm
          title={t('confirmMarkPaid')}
          description={t('confirmMarkPaidDesc')}
          okText={tCommon('actions.confirm')}
          cancelText={tCommon('actions.cancel')}
          onConfirm={() => handleMarkPaid(reminder)}
          okButtonProps={{ loading: markComplete.isPending }}
        >
          <Tooltip title={t('markPaid')}>
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            />
          </Tooltip>
        </Popconfirm>

        {/* Snooze */}
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
          <Tooltip title={t('snooze')}>
            <Button
              type="text"
              size="small"
              icon={<ClockCircleOutlined />}
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            />
          </Tooltip>
        </Popconfirm>
      </Space>
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Card
      className={cn('border border-stone-200 bg-white h-full', className)}
      styles={{
        body: {
          padding: 0,
        },
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50">
            <BellOutlined className="text-lg text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900">{t('paymentReminders')}</h3>
            {!isLoading && totalDue > 0 && (
              <p className="text-sm text-stone-500">
                {formatCurrency(totalDue)} {t('totalDue')}
              </p>
            )}
          </div>
        </div>

        {/* Overdue Badge */}
        {!isLoading && overdueCount > 0 && (
          <Tag color="red" className="m-0">
            {overdueCount} {t('overdue')}
          </Tag>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton.Avatar active size="small" />
                <Skeleton active paragraph={false} title={{ width: '80%' }} />
              </div>
            ))}
          </div>
        ) : allReminders.length === 0 ? (
          <EmptyState
            icon={<BellOutlined />}
            title={t('noReminders')}
            description={t('noRemindersDesc')}
            size="sm"
          />
        ) : (
          <List
            dataSource={allReminders}
            split={false}
            renderItem={(reminder) => (
              <List.Item
                className={cn(
                  'px-3 py-2 rounded-lg mb-2 last:mb-0 border',
                  reminder.isOverdue
                    ? 'bg-red-50/50 border-red-200'
                    : 'bg-stone-50/50 border-stone-100 hover:bg-stone-100/50'
                )}
                actions={[renderActions(reminder)]}
              >
                <List.Item.Meta
                  title={
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'font-medium truncate',
                          reminder.isOverdue ? 'text-red-700' : 'text-stone-900'
                        )}
                      >
                        {reminder.supplier?.company_name || t('unknownSupplier')}
                      </span>
                      <span
                        className={cn(
                          'font-semibold whitespace-nowrap',
                          reminder.isOverdue ? 'text-red-700' : 'text-stone-900'
                        )}
                      >
                        {formatCurrency(reminder.amount)}
                      </span>
                    </div>
                  }
                  description={
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-stone-500">
                        {t('due')}: {formatDueDate(reminder.due_date)}
                      </span>
                      {renderDaysBadge(reminder)}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>

      {/* Footer with View All Link */}
      {!isLoading && allReminders.length > 0 && (
        <div className="px-5 py-3 border-t border-stone-100">
          <Link
            href="/reminders"
            className="flex items-center justify-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            {tCommon('actions.viewAll')}
            <RightOutlined className="text-xs" />
          </Link>
        </div>
      )}
    </Card>
  );
}

export default PaymentRemindersWidget;
