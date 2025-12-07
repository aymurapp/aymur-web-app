'use client';

/**
 * NotificationCenter Component
 *
 * Dropdown notification panel accessible from the header.
 * Displays a list of notifications with unread count badge,
 * mark-as-read functionality, and empty state handling.
 *
 * Features:
 * - Bell icon with unread count badge
 * - Notification list with type-based styling
 * - Mark individual or all as read
 * - Clear all notifications
 * - Empty state when no notifications
 * - RTL support using CSS logical properties
 *
 * @module components/layout/NotificationCenter
 */

import React, { useCallback } from 'react';

import {
  BellOutlined,
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { Badge, Button, Dropdown, Empty, List, Typography, Space, Divider } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';
import {
  useNotificationStore,
  useUnreadCount,
  type Notification,
  type NotificationType,
} from '@/stores/notificationStore';

const { Text, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface NotificationCenterProps {
  /** Maximum number of notifications to display */
  maxItems?: number;
  /** Additional CSS class name */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Icon and color configuration for each notification type
 */
const notificationTypeConfig: Record<
  NotificationType,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  info: {
    icon: <InfoCircleOutlined />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  success: {
    icon: <CheckCircleOutlined />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  warning: {
    icon: <WarningOutlined />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  error: {
    icon: <CloseCircleOutlined />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Individual Notification Item
 */
function NotificationItem({
  notification,
  onMarkAsRead,
  onRemove,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const config = notificationTypeConfig[notification.type];

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    return `${diffDays}d ago`;
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg transition-colors',
        notification.read ? 'bg-white dark:bg-stone-900' : 'bg-amber-50/50 dark:bg-amber-900/10'
      )}
    >
      {/* Type Icon */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full',
          config.bgColor,
          config.color
        )}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Text
            strong={!notification.read}
            className={cn(
              'block truncate',
              notification.read
                ? 'text-stone-600 dark:text-stone-400'
                : 'text-stone-900 dark:text-stone-100'
            )}
          >
            {notification.title}
          </Text>

          {/* Actions - visible on hover */}
          <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!notification.read && (
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined className="text-xs" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                className="!w-6 !h-6 !min-w-0 text-stone-400 hover:text-emerald-600"
              />
            )}
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined className="text-xs" />}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(notification.id);
              }}
              className="!w-6 !h-6 !min-w-0 text-stone-400 hover:text-red-600"
            />
          </div>
        </div>

        {notification.message && (
          <Text type="secondary" className="block text-sm mt-0.5 line-clamp-2">
            {notification.message}
          </Text>
        )}

        <Text type="secondary" className="block text-xs mt-1">
          {formatTime(notification.createdAt)}
        </Text>

        {/* Action Button */}
        {notification.action && (
          <Button
            type="link"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              notification.action?.onClick();
            }}
            className="!px-0 mt-1 text-amber-600 hover:text-amber-700"
          >
            {notification.action.label}
          </Button>
        )}
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 mt-2" />
      )}
    </div>
  );
}

/**
 * Notification Panel Header
 */
function PanelHeader({
  unreadCount,
  onMarkAllRead,
  t,
}: {
  unreadCount: number;
  onMarkAllRead: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700">
      <Title level={5} className="!mb-0 !text-stone-900 dark:!text-stone-100">
        {t('navigation.notifications')}
        {unreadCount > 0 && (
          <Badge
            count={unreadCount}
            size="small"
            className="ms-2"
            style={{ backgroundColor: '#f59e0b' }}
          />
        )}
      </Title>

      <Space size="small">
        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            onClick={onMarkAllRead}
            className="!px-0 text-amber-600 hover:text-amber-700"
          >
            {t('notifications.markAllRead')}
          </Button>
        )}
      </Space>
    </div>
  );
}

/**
 * Empty State Component
 */
function EmptyNotifications({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="py-12">
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={<Text type="secondary">{t('notifications.empty')}</Text>}
      />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * NotificationCenter Component
 *
 * A dropdown panel showing in-app notifications with actions.
 *
 * @example
 * // Basic usage in header
 * <NotificationCenter />
 *
 * @example
 * // With custom max items
 * <NotificationCenter maxItems={10} />
 */
export function NotificationCenter({
  maxItems = 5,
  className,
}: NotificationCenterProps): React.JSX.Element {
  const t = useTranslations();
  const unreadCount = useUnreadCount();

  // Store actions
  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const clearAll = useNotificationStore((state) => state.clearAll);

  // Get limited notifications
  const displayedNotifications = notifications.slice(0, maxItems);
  const hasMore = notifications.length > maxItems;

  // Handlers
  const handleMarkAsRead = useCallback(
    (id: string) => {
      markAsRead(id);
    },
    [markAsRead]
  );

  const handleRemove = useCallback(
    (id: string) => {
      removeNotification(id);
    },
    [removeNotification]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const handleClearAll = useCallback(() => {
    clearAll();
  }, [clearAll]);

  // Dropdown content
  const dropdownContent = (
    <div className="w-80 sm:w-96 bg-white dark:bg-stone-900 rounded-lg shadow-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
      {/* Header */}
      <PanelHeader unreadCount={unreadCount} onMarkAllRead={handleMarkAllRead} t={t} />

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {displayedNotifications.length === 0 ? (
          <EmptyNotifications t={t} />
        ) : (
          <List
            dataSource={displayedNotifications}
            renderItem={(notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onRemove={handleRemove}
              />
            )}
            split={false}
            className="p-2"
          />
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Divider className="!my-0" />
          <div className="flex items-center justify-between px-4 py-2">
            {hasMore && (
              <Button
                type="link"
                size="small"
                className="!px-0 text-amber-600 hover:text-amber-700"
              >
                {t('common.actions.viewAll')} ({notifications.length})
              </Button>
            )}
            <Button
              type="link"
              size="small"
              onClick={handleClearAll}
              className="!px-0 text-stone-500 hover:text-red-600 ms-auto"
            >
              {t('common.actions.clear')}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      placement="bottomRight"
      overlayClassName="notification-dropdown"
    >
      <Button
        type="text"
        className={cn(
          'flex items-center justify-center text-stone-600 dark:text-stone-300',
          className
        )}
        icon={
          <Badge count={unreadCount} size="small" offset={[2, -2]}>
            <BellOutlined className="text-lg" />
          </Badge>
        }
        aria-label={t('navigation.notifications')}
      />
    </Dropdown>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default NotificationCenter;
