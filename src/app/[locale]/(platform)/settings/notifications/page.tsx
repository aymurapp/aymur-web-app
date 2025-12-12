'use client';

/**
 * Notifications Settings Page
 *
 * Allows users to manage their notification preferences across channels.
 *
 * Features:
 * - Email notification toggles by category
 * - Push notification preferences
 * - Quiet hours configuration
 * - Marketing communications opt-in/out
 *
 * @module app/(platform)/[locale]/settings/notifications/page
 */

import React, { useEffect, useState } from 'react';

import {
  MailOutlined,
  MobileOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  SafetyOutlined,
  GiftOutlined,
  NotificationOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { Switch, TimePicker, message } from 'antd';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  getUserNotificationSettings,
  updateUserNotificationSettings,
  type NotificationSettings,
  type UpdateNotificationSettingsInput,
} from '@/lib/actions/user-notifications';
import { useUser } from '@/lib/hooks/auth/useUser';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Email notification category configuration
 * Maps server fields to UI categories
 */
interface EmailCategory {
  key: keyof Pick<
    NotificationSettings,
    'email_marketing' | 'email_product_updates' | 'email_security_alerts' | 'email_billing_alerts'
  >;
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
}

/**
 * Push notification category configuration
 * Maps server fields to UI categories
 */
interface PushCategory {
  key: keyof Pick<NotificationSettings, 'push_security_alerts' | 'push_billing_alerts'>;
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Email notification categories mapped to server fields
 */
const EMAIL_CATEGORIES: EmailCategory[] = [
  {
    key: 'email_product_updates',
    icon: <BellOutlined />,
    titleKey: 'notifications.categories.productUpdates.title',
    descriptionKey: 'notifications.categories.productUpdates.description',
  },
  {
    key: 'email_billing_alerts',
    icon: <DollarOutlined />,
    titleKey: 'notifications.categories.billing.title',
    descriptionKey: 'notifications.categories.billing.description',
  },
  {
    key: 'email_security_alerts',
    icon: <SafetyOutlined />,
    titleKey: 'notifications.categories.security.title',
    descriptionKey: 'notifications.categories.security.description',
  },
];

/**
 * Push notification categories mapped to server fields
 */
const PUSH_CATEGORIES: PushCategory[] = [
  {
    key: 'push_billing_alerts',
    icon: <DollarOutlined />,
    titleKey: 'notifications.categories.billing.title',
    descriptionKey: 'notifications.categories.billing.description',
  },
  {
    key: 'push_security_alerts',
    icon: <SafetyOutlined />,
    titleKey: 'notifications.categories.security.title',
    descriptionKey: 'notifications.categories.security.description',
  },
];

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Loading skeleton for notifications page
 */
function NotificationsSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-8 bg-stone-200 rounded w-56 mb-2 animate-pulse" />
        <div className="h-5 bg-stone-200 rounded w-80 animate-pulse" />
      </div>

      {/* Email notifications skeleton */}
      <Card className="p-6">
        <div className="h-5 bg-stone-200 rounded w-40 mb-4 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-stone-200 rounded-lg animate-pulse" />
                <div>
                  <div className="h-4 bg-stone-200 rounded w-32 mb-2 animate-pulse" />
                  <div className="h-3 bg-stone-200 rounded w-48 animate-pulse" />
                </div>
              </div>
              <div className="h-6 bg-stone-200 rounded w-12 animate-pulse" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/**
 * Generic notification toggle row
 */
function NotificationToggleRow({
  icon,
  titleKey,
  descriptionKey,
  enabled,
  onChange,
  t,
}: {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg',
            'bg-stone-100 dark:bg-stone-800',
            'flex items-center justify-center',
            'text-stone-600 dark:text-stone-400'
          )}
        >
          {icon}
        </div>
        <div>
          <p className="font-medium text-stone-900 dark:text-stone-100">{t(titleKey)}</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">{t(descriptionKey)}</p>
        </div>
      </div>
      <Switch checked={enabled} onChange={onChange} className={enabled ? '!bg-[#C9A227]' : ''} />
    </div>
  );
}

/**
 * Email notifications section
 */
function EmailNotificationsSection({
  settings,
  onToggle,
  t,
}: {
  settings: NotificationSettings | null;
  onToggle: (key: EmailCategory['key'], enabled: boolean) => void;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <MailOutlined className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {t('notifications.email.title')}
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {t('notifications.email.description')}
          </p>
        </div>
      </div>

      <div className="divide-y divide-stone-100 dark:divide-stone-800">
        {EMAIL_CATEGORIES.map((category) => (
          <NotificationToggleRow
            key={category.key}
            icon={category.icon}
            titleKey={category.titleKey}
            descriptionKey={category.descriptionKey}
            enabled={settings?.[category.key] ?? false}
            onChange={(enabled) => onToggle(category.key, enabled)}
            t={t}
          />
        ))}
      </div>
    </Card>
  );
}

/**
 * Push notifications section
 */
function PushNotificationsSection({
  settings,
  onToggle,
  onPushToggle,
  t,
}: {
  settings: NotificationSettings | null;
  onToggle: (key: PushCategory['key'], enabled: boolean) => void;
  onPushToggle: (enabled: boolean) => void;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const pushEnabled = settings?.push_enabled ?? false;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <MobileOutlined className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              {t('notifications.push.title')}
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {t('notifications.push.description')}
            </p>
          </div>
        </div>
        <Switch
          checked={pushEnabled}
          onChange={onPushToggle}
          className={pushEnabled ? '!bg-[#C9A227]' : ''}
        />
      </div>

      {pushEnabled && (
        <div className="divide-y divide-stone-100 dark:divide-stone-800 mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
          {PUSH_CATEGORIES.map((category) => (
            <NotificationToggleRow
              key={category.key}
              icon={category.icon}
              titleKey={category.titleKey}
              descriptionKey={category.descriptionKey}
              enabled={settings?.[category.key] ?? false}
              onChange={(enabled) => onToggle(category.key, enabled)}
              t={t}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

/**
 * Quiet hours section
 */
function QuietHoursSection({
  settings,
  onToggle,
  onTimeChange,
  t,
}: {
  settings: NotificationSettings | null;
  onToggle: (enabled: boolean) => void;
  onTimeChange: (field: 'quiet_hours_start' | 'quiet_hours_end', time: string) => void;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const enabled = settings?.quiet_hours_enabled ?? false;
  // Server uses HH:MM:SS format, UI displays HH:mm
  const startTime = settings?.quiet_hours_start?.slice(0, 5) ?? '22:00';
  const endTime = settings?.quiet_hours_end?.slice(0, 5) ?? '08:00';

  const handleStartTimeChange = (time: dayjs.Dayjs | null) => {
    if (time) {
      onTimeChange('quiet_hours_start', time.format('HH:mm:ss'));
    }
  };

  const handleEndTimeChange = (time: dayjs.Dayjs | null) => {
    if (time) {
      onTimeChange('quiet_hours_end', time.format('HH:mm:ss'));
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <ClockCircleOutlined className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              {t('notifications.quietHours.title')}
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {t('notifications.quietHours.description')}
            </p>
          </div>
        </div>
        <Switch checked={enabled} onChange={onToggle} className={enabled ? '!bg-[#C9A227]' : ''} />
      </div>

      {enabled && (
        <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                {t('notifications.quietHours.startTime')}
              </label>
              <TimePicker
                value={dayjs(startTime, 'HH:mm')}
                onChange={handleStartTimeChange}
                format="HH:mm"
                className="w-32"
              />
            </div>
            <div className="text-stone-400 pt-6">{t('notifications.quietHours.to')}</div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                {t('notifications.quietHours.endTime')}
              </label>
              <TimePicker
                value={dayjs(endTime, 'HH:mm')}
                onChange={handleEndTimeChange}
                format="HH:mm"
                className="w-32"
              />
            </div>
          </div>
          <p className="text-sm text-stone-500 mt-3">{t('notifications.quietHours.note')}</p>
        </div>
      )}
    </Card>
  );
}

/**
 * Marketing communications section
 */
function MarketingSection({
  settings,
  onChange,
  t,
}: {
  settings: NotificationSettings | null;
  onChange: (enabled: boolean) => void;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const marketingEnabled = settings?.email_marketing ?? false;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <GiftOutlined className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              {t('notifications.marketing.title')}
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {t('notifications.marketing.description')}
            </p>
          </div>
        </div>
        <Switch
          checked={marketingEnabled}
          onChange={onChange}
          className={marketingEnabled ? '!bg-[#C9A227]' : ''}
        />
      </div>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function NotificationsSettingsPage(): React.JSX.Element {
  const t = useTranslations('userSettings');
  const { isLoading: userLoading } = useUser();

  // Local state for settings (allows immediate UI updates)
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch initial settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const result = await getUserNotificationSettings();
        if (result.success && result.data) {
          setSettings(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch notification settings:', error);
        message.error(t('notifications.loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [t]);

  // Update local state and mark as changed
  const updateLocalSettings = (updates: Partial<NotificationSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...updates } : null));
    setHasChanges(true);
  };

  // Handle email category toggle
  const handleEmailToggle = (key: EmailCategory['key'], enabled: boolean) => {
    updateLocalSettings({ [key]: enabled });
  };

  // Handle push category toggle
  const handlePushToggle = (key: PushCategory['key'], enabled: boolean) => {
    updateLocalSettings({ [key]: enabled });
  };

  // Handle push master toggle
  const handlePushMasterToggle = (enabled: boolean) => {
    updateLocalSettings({ push_enabled: enabled });
  };

  // Handle quiet hours toggle
  const handleQuietHoursToggle = (enabled: boolean) => {
    updateLocalSettings({ quiet_hours_enabled: enabled });
  };

  // Handle quiet hours time change
  const handleQuietHoursTimeChange = (
    field: 'quiet_hours_start' | 'quiet_hours_end',
    time: string
  ) => {
    updateLocalSettings({ [field]: time });
  };

  // Handle marketing toggle
  const handleMarketingToggle = (enabled: boolean) => {
    updateLocalSettings({ email_marketing: enabled });
  };

  // Save changes to server
  const handleSave = async () => {
    if (!settings || !hasChanges) {
      return;
    }

    setIsSaving(true);
    try {
      const updateData: UpdateNotificationSettingsInput = {
        email_marketing: settings.email_marketing,
        email_product_updates: settings.email_product_updates,
        email_security_alerts: settings.email_security_alerts,
        email_billing_alerts: settings.email_billing_alerts,
        push_enabled: settings.push_enabled,
        push_security_alerts: settings.push_security_alerts,
        push_billing_alerts: settings.push_billing_alerts,
        quiet_hours_enabled: settings.quiet_hours_enabled,
        quiet_hours_start: settings.quiet_hours_start,
        quiet_hours_end: settings.quiet_hours_end,
      };

      const result = await updateUserNotificationSettings(updateData);

      if (result.success) {
        message.success(t('notifications.saveSuccess'));
        setHasChanges(false);
      } else {
        message.error(result.error || t('notifications.saveError'));
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      message.error(t('notifications.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (userLoading || isLoading) {
    return <NotificationsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1">
            {t('notifications.title')}
          </h1>
          <p className="text-stone-600 dark:text-stone-400">{t('notifications.subtitle')}</p>
        </div>

        <Button
          type="primary"
          onClick={handleSave}
          loading={isSaving}
          disabled={!hasChanges}
          className="bg-gradient-to-r from-[#C9A227] to-[#A68B1F] border-none disabled:opacity-50"
        >
          {t('notifications.saveChanges')}
        </Button>
      </div>

      {/* Email Notifications */}
      <EmailNotificationsSection settings={settings} onToggle={handleEmailToggle} t={t} />

      {/* Push Notifications */}
      <PushNotificationsSection
        settings={settings}
        onToggle={handlePushToggle}
        onPushToggle={handlePushMasterToggle}
        t={t}
      />

      {/* Quiet Hours */}
      <QuietHoursSection
        settings={settings}
        onToggle={handleQuietHoursToggle}
        onTimeChange={handleQuietHoursTimeChange}
        t={t}
      />

      {/* Marketing */}
      <MarketingSection settings={settings} onChange={handleMarketingToggle} t={t} />

      {/* Info Card */}
      <Card className="p-6 bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700">
        <div className="flex gap-3">
          <NotificationOutlined className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-stone-600 dark:text-stone-400">
            <p className="font-medium text-stone-900 dark:text-stone-100 mb-1">
              {t('notifications.info.title')}
            </p>
            <p>{t('notifications.info.description')}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
