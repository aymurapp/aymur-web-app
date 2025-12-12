'use client';

/**
 * Sessions Settings Page
 *
 * Allows users to view and manage their active sessions across devices.
 *
 * Features:
 * - Current session highlight with gold border
 * - All active sessions list
 * - Device and browser detection
 * - Location display
 * - Session revocation
 * - Revoke all other sessions
 *
 * @module app/(platform)/[locale]/settings/sessions/page
 */

import React, { useState } from 'react';

import {
  DesktopOutlined,
  MobileOutlined,
  TabletOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  AppleOutlined,
  WindowsOutlined,
} from '@ant-design/icons';
import { Input, Modal, Tag, Empty, message, Popconfirm } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getUserSessions, revokeSession, revokeAllOtherSessions } from '@/lib/actions/sessions';
import { useUser } from '@/lib/hooks/auth/useUser';
import {
  useUserSessions,
  useRevokeSession,
  useRevokeAllOtherSessions,
} from '@/lib/hooks/settings/useUserSessions';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

interface SessionData {
  id: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip_address: string;
  location: string | null;
  country_code: string | null;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the appropriate device icon
 */
function getDeviceIcon(deviceType: SessionData['device_type']): React.ReactNode {
  const iconClass = 'text-xl';
  switch (deviceType) {
    case 'mobile':
      return <MobileOutlined className={iconClass} />;
    case 'tablet':
      return <TabletOutlined className={iconClass} />;
    default:
      return <DesktopOutlined className={iconClass} />;
  }
}

/**
 * Get OS icon based on OS name
 */
function getOsIcon(os: string): React.ReactNode {
  const osLower = os.toLowerCase();
  if (osLower.includes('mac') || osLower.includes('ios') || osLower.includes('ipad')) {
    return <AppleOutlined className="text-stone-400" />;
  }
  if (osLower.includes('windows')) {
    return <WindowsOutlined className="text-stone-400" />;
  }
  return <GlobalOutlined className="text-stone-400" />;
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return date.toLocaleDateString();
}

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Loading skeleton for sessions page
 */
function SessionsSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-8 bg-stone-200 rounded w-48 mb-2 animate-pulse" />
        <div className="h-5 bg-stone-200 rounded w-72 animate-pulse" />
      </div>

      {/* Current session skeleton */}
      <div className="h-32 bg-stone-200 rounded-xl animate-pulse" />

      {/* Sessions list skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-stone-200 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/**
 * Current session card with gold highlight
 */
function CurrentSessionCard({
  session,
  t,
}: {
  session: SessionData;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  return (
    <Card
      className={cn(
        'p-6 relative overflow-hidden',
        'border-2 border-[#C9A227]',
        'bg-gradient-to-br from-amber-50/50 to-white',
        'dark:from-amber-900/10 dark:to-stone-900'
      )}
    >
      {/* Current badge */}
      <div className="absolute top-0 end-0">
        <div className="bg-[#C9A227] text-white text-xs font-bold px-3 py-1 rounded-es-lg">
          {t('sessions.currentSession')}
        </div>
      </div>

      <div className="flex items-start gap-4">
        {/* Device icon */}
        <div
          className={cn(
            'flex-shrink-0 w-14 h-14 rounded-xl',
            'bg-gradient-to-br from-[#C9A227] to-[#A68B1F]',
            'flex items-center justify-center text-white'
          )}
        >
          {getDeviceIcon(session.device_type)}
        </div>

        {/* Session details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              {session.browser}
            </h3>
            <Tag color="success" icon={<CheckCircleOutlined />} className="!m-0">
              {t('sessions.active')}
            </Tag>
          </div>

          <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 mb-2">
            {getOsIcon(session.os)}
            <span>{session.os}</span>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-stone-500">
            {session.location && (
              <div className="flex items-center gap-1">
                <GlobalOutlined />
                <span>{session.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <ClockCircleOutlined />
              <span>
                {t('sessions.signedIn')}: {new Date(session.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Session list item
 */
function SessionItem({
  session,
  onRevoke,
  isRevoking,
  t,
}: {
  session: SessionData;
  onRevoke: () => void;
  isRevoking: boolean;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-4',
        'bg-white dark:bg-stone-800',
        'border border-stone-200 dark:border-stone-700',
        'rounded-lg',
        'hover:shadow-md transition-shadow'
      )}
    >
      <div className="flex items-center gap-4">
        {/* Device icon */}
        <div
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-lg',
            'bg-stone-100 dark:bg-stone-700',
            'flex items-center justify-center',
            'text-stone-600 dark:text-stone-300'
          )}
        >
          {getDeviceIcon(session.device_type)}
        </div>

        {/* Session details */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-medium text-stone-900 dark:text-stone-100">{session.browser}</h4>
          </div>

          <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
            {getOsIcon(session.os)}
            <span>{session.os}</span>
            {session.location && (
              <>
                <span className="text-stone-300 dark:text-stone-600">|</span>
                <span>{session.location}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-stone-400 mt-1">
            <ClockCircleOutlined />
            <span>
              {t('sessions.lastActive')}: {formatRelativeTime(session.last_active_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Revoke button */}
      <Popconfirm
        title={t('sessions.revokeConfirmTitle')}
        description={t('sessions.revokeConfirmDescription')}
        onConfirm={onRevoke}
        okText={t('sessions.revoke')}
        cancelText={t('common.actions.cancel')}
        okButtonProps={{ danger: true }}
      >
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          loading={isRevoking}
          className="flex-shrink-0"
        >
          <span className="hidden sm:inline">{t('sessions.revoke')}</span>
        </Button>
      </Popconfirm>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SessionsSettingsPage(): React.JSX.Element {
  const t = useTranslations('userSettings');
  const { isLoading: userLoading } = useUser();

  // Fetch sessions using hooks
  const { data: sessionsData, isLoading: sessionsLoading } = useUserSessions({ getUserSessions });
  const { mutate: revokeSessionMutation, isPending: isRevokingSession } = useRevokeSession({
    revokeSession,
  });
  const { mutate: revokeAllMutation, isPending: isRevokingAll } = useRevokeAllOtherSessions({
    revokeAllOtherSessions,
  });

  // Local state for UI
  const [searchQuery, setSearchQuery] = useState('');
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokeAllModalOpen, setRevokeAllModalOpen] = useState(false);

  // Map UserSession to SessionData format
  const sessions: SessionData[] = (sessionsData || []).map((s) => ({
    id: s.id_session,
    device_type: s.device_type === 'unknown' ? 'desktop' : s.device_type,
    browser: s.browser || 'Unknown Browser',
    os: s.os || 'Unknown OS',
    ip_address: s.ip_address || '',
    location: s.location,
    country_code: s.country_code,
    last_active_at: s.last_activity_at || s.created_at,
    created_at: s.created_at,
    is_current: s.is_current,
  }));

  // Separate current and other sessions
  const currentSession = sessions.find((s) => s.is_current);
  const otherSessions = sessions.filter((s) => !s.is_current);

  // Filter sessions by search query
  const filteredSessions = otherSessions.filter((session) => {
    if (!searchQuery) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    return (
      session.browser.toLowerCase().includes(query) ||
      session.os.toLowerCase().includes(query) ||
      session.location?.toLowerCase().includes(query)
    );
  });

  const handleRevokeSession = (sessionId: string): void => {
    setRevokingSessionId(sessionId);
    revokeSessionMutation(sessionId, {
      onSuccess: () => {
        message.success(t('sessions.revokeSuccess'));
        setRevokingSessionId(null);
      },
      onError: (error) => {
        message.error(error.message || t('sessions.revokeError'));
        setRevokingSessionId(null);
      },
    });
  };

  const handleRevokeAllOther = (): void => {
    revokeAllMutation(undefined, {
      onSuccess: () => {
        message.success(t('sessions.revokeAllSuccess'));
        setRevokeAllModalOpen(false);
      },
      onError: (error) => {
        message.error(error.message || t('sessions.revokeAllError'));
      },
    });
  };

  if (userLoading || sessionsLoading) {
    return <SessionsSkeleton />;
  }

  const renderSessionsList = (): React.JSX.Element => {
    if (filteredSessions.length > 0) {
      return (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              onRevoke={() => handleRevokeSession(session.id)}
              isRevoking={isRevokingSession && revokingSessionId === session.id}
              t={t}
            />
          ))}
        </div>
      );
    }

    if (otherSessions.length > 0) {
      return (
        <Card className="p-8">
          <Empty
            description={t('sessions.noMatchingSessions')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      );
    }

    return (
      <Card className="p-8">
        <Empty description={t('sessions.noOtherSessions')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1">
            {t('sessions.title')}
          </h1>
          <p className="text-stone-600 dark:text-stone-400">{t('sessions.subtitle')}</p>
        </div>

        {otherSessions.length > 0 && (
          <Button danger onClick={() => setRevokeAllModalOpen(true)} icon={<DeleteOutlined />}>
            {t('sessions.revokeAllOther')}
          </Button>
        )}
      </div>

      {/* Current Session */}
      {currentSession && <CurrentSessionCard session={currentSession} t={t} />}

      {/* Other Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {t('sessions.otherSessions')} ({otherSessions.length})
          </h2>

          {otherSessions.length > 2 && (
            <Input.Search
              placeholder={t('sessions.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="max-w-xs"
            />
          )}
        </div>

        {renderSessionsList()}
      </div>

      {/* Session Info Card */}
      <Card className="p-6 bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700">
        <div className="flex gap-3">
          <ExclamationCircleOutlined className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-stone-600 dark:text-stone-400">
            <p className="font-medium text-stone-900 dark:text-stone-100 mb-1">
              {t('sessions.securityTip.title')}
            </p>
            <p>{t('sessions.securityTip.description')}</p>
          </div>
        </div>
      </Card>

      {/* Revoke All Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-red-600">
            <ExclamationCircleOutlined />
            <span>{t('sessions.revokeAllModalTitle')}</span>
          </div>
        }
        open={revokeAllModalOpen}
        onCancel={() => setRevokeAllModalOpen(false)}
        footer={null}
        width={400}
      >
        <div className="py-4 space-y-4">
          <p className="text-stone-600 dark:text-stone-400">
            {t('sessions.revokeAllModalDescription', { count: otherSessions.length })}
          </p>

          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {t('sessions.revokeAllWarning')}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-700">
            <Button onClick={() => setRevokeAllModalOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button danger type="primary" onClick={handleRevokeAllOther} loading={isRevokingAll}>
              {t('sessions.revokeAllConfirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
