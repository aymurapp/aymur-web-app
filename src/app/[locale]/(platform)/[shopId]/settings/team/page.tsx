'use client';

/**
 * Team Members Settings Page
 *
 * Manages team members and pending invitations for the current shop.
 * Features:
 * - Active team members table with role badges
 * - Pending invitations tab with cancel/resend actions
 * - Permission-based action visibility
 * - Deactivate/reactivate team members
 *
 * @module app/(platform)/[locale]/[shopId]/settings/team/page
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  PlusOutlined,
  UserOutlined,
  MailOutlined,
  ClockCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  Card,
  Tabs,
  Table,
  Tag,
  Avatar,
  Space,
  Typography,
  Popconfirm,
  Skeleton,
  Badge,
  message,
  Tooltip,
} from 'antd';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/lib/hooks/auth';
import {
  useTeamMembers,
  usePendingInvitations,
  useRemoveTeamMember,
  useReactivateTeamMember,
  useCancelInvitation,
  useResendInvitation,
  type TeamMemberDisplay,
  type PendingInvitation,
} from '@/lib/hooks/data/useTeam';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';

import type { ColumnsType } from 'antd/es/table';

const { Text, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

type TabKey = 'active' | 'pending';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Role badge color mapping
 */
const ROLE_COLORS: Record<string, string> = {
  owner: 'gold',
  manager: 'blue',
  finance: 'green',
  staff: 'default',
};

/**
 * Get color for role badge
 */
function getRoleColor(roleName: string): string {
  const normalizedRole = roleName.toLowerCase();
  return ROLE_COLORS[normalizedRole] || 'default';
}

/**
 * Generate initials from full name
 */
function getInitials(name: string): string {
  if (!name) {
    return '?';
  }
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0]?.charAt(0).toUpperCase() ?? '?';
  }
  return ((parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')).toUpperCase();
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with time
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Check if date is in the past
 */
function isExpired(dateString: string): boolean {
  return new Date(dateString) < new Date();
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Team Members Settings Page
 */
export default function TeamMembersPage(): React.JSX.Element {
  const t = useTranslations('common');
  const tSettings = useTranslations('settings');
  const tShop = useTranslations('shop');

  const { can } = usePermissions();
  const { user } = useUser();
  const { shop } = useShop();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('active');

  // Data hooks - include inactive members to show deactivated users
  const {
    members,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useTeamMembers({ includeInactive: true });

  const {
    invitations,
    totalCount: invitationCount,
    isLoading: invitationsLoading,
    refetch: refetchInvitations,
  } = usePendingInvitations();

  // Mutation hooks
  const removeTeamMember = useRemoveTeamMember();
  const reactivateTeamMember = useReactivateTeamMember();
  const cancelInvitation = useCancelInvitation();
  const resendInvitation = useResendInvitation();

  // Permission check
  const canManageStaff = can('staff.manage');

  // Current user ID for self-check
  const currentUserId = user?.id_user;

  // Shop owner ID
  const ownerId = shop?.id_owner;

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle inviting a new member (placeholder - will open modal)
   */
  const handleInvite = useCallback(() => {
    // TODO: Open invite modal
    message.info('Invite team member modal coming soon');
  }, []);

  /**
   * Handle deactivating a team member
   */
  const handleDeactivate = useCallback(
    async (member: TeamMemberDisplay) => {
      try {
        await removeTeamMember.mutateAsync(member.id_access);
        message.success(t('messages.operationSuccess'));
        refetchMembers();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('messages.operationFailed');
        message.error(errorMessage);
      }
    },
    [removeTeamMember, refetchMembers, t]
  );

  /**
   * Handle reactivating a team member
   */
  const handleReactivate = useCallback(
    async (member: TeamMemberDisplay) => {
      try {
        await reactivateTeamMember.mutateAsync(member.id_access);
        message.success(t('messages.operationSuccess'));
        refetchMembers();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('messages.operationFailed');
        message.error(errorMessage);
      }
    },
    [reactivateTeamMember, refetchMembers, t]
  );

  /**
   * Handle cancelling an invitation
   */
  const handleCancelInvitation = useCallback(
    async (invitation: PendingInvitation) => {
      try {
        await cancelInvitation.mutateAsync(invitation.id_invitation);
        message.success(t('messages.operationSuccess'));
        refetchInvitations();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('messages.operationFailed');
        message.error(errorMessage);
      }
    },
    [cancelInvitation, refetchInvitations, t]
  );

  /**
   * Handle resending an invitation
   */
  const handleResendInvitation = useCallback(
    async (invitation: PendingInvitation) => {
      try {
        await resendInvitation.mutateAsync(invitation.id_invitation);
        message.success(tSettings('team.invitationResent'));
        refetchInvitations();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('messages.operationFailed');
        message.error(errorMessage);
      }
    },
    [resendInvitation, refetchInvitations, t, tSettings]
  );

  /**
   * Check if member can be deactivated
   * - Cannot deactivate self
   * - Cannot deactivate owner
   */
  const canDeactivateMember = useCallback(
    (member: TeamMemberDisplay): boolean => {
      // Cannot deactivate self
      if (member.id_user === currentUserId) {
        return false;
      }
      // Cannot deactivate owner
      if (member.id_user === ownerId) {
        return false;
      }
      // Check permission
      return canManageStaff;
    },
    [currentUserId, ownerId, canManageStaff]
  );

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================

  /**
   * Team members table columns
   */
  const memberColumns: ColumnsType<TeamMemberDisplay> = useMemo(
    () => [
      {
        key: 'member',
        title: tSettings('team.member'),
        dataIndex: 'full_name',
        width: '40%',
        render: (_: unknown, record: TeamMemberDisplay) => (
          <div className="flex items-center gap-3">
            <Avatar
              size={40}
              className={`bg-amber-100 text-amber-700 font-medium ${
                !record.is_active ? 'opacity-50' : ''
              }`}
            >
              {getInitials(record.full_name)}
            </Avatar>
            <div className={!record.is_active ? 'opacity-60' : ''}>
              <div className="flex items-center gap-2">
                <Text strong className="text-stone-900 dark:text-stone-100">
                  {record.full_name || t('labels.name')}
                </Text>
                {record.id_user === currentUserId && (
                  <Tag color="blue" className="text-xs">
                    {tSettings('team.you')}
                  </Tag>
                )}
                {record.id_user === ownerId && (
                  <Tag color="gold" className="text-xs">
                    {tShop('roles.owner')}
                  </Tag>
                )}
              </div>
              <Text type="secondary" className="text-sm">
                {record.email}
              </Text>
            </div>
          </div>
        ),
      },
      {
        key: 'role',
        title: tSettings('team.role'),
        dataIndex: 'role_name',
        width: '20%',
        render: (roleName: string, record: TeamMemberDisplay) => (
          <Tag color={getRoleColor(roleName)} className={!record.is_active ? 'opacity-50' : ''}>
            {roleName}
          </Tag>
        ),
      },
      {
        key: 'status',
        title: t('labels.status'),
        dataIndex: 'is_active',
        width: '15%',
        render: (isActive: boolean) => (
          <Badge
            status={isActive ? 'success' : 'default'}
            text={isActive ? t('status.active') : t('status.inactive')}
          />
        ),
      },
      {
        key: 'joined',
        title: tSettings('team.joined'),
        dataIndex: 'created_at',
        width: '15%',
        render: (createdAt: string) => (
          <Text type="secondary" className="text-sm">
            {formatDate(createdAt)}
          </Text>
        ),
      },
      {
        key: 'actions',
        title: t('labels.actions'),
        width: '10%',
        align: 'end' as const,
        render: (_: unknown, record: TeamMemberDisplay) => {
          if (!canManageStaff) {
            return null;
          }

          // Show reactivate for inactive members
          if (!record.is_active) {
            return (
              <Tooltip title={tSettings('team.reactivate')}>
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => handleReactivate(record)}
                  loading={reactivateTeamMember.isPending}
                  className="text-emerald-600 hover:text-emerald-700"
                />
              </Tooltip>
            );
          }

          // Cannot deactivate self or owner
          if (!canDeactivateMember(record)) {
            return null;
          }

          return (
            <Popconfirm
              title={tSettings('team.deactivateConfirm')}
              description={tSettings('team.deactivateDescription')}
              onConfirm={() => handleDeactivate(record)}
              okText={t('actions.confirm')}
              cancelText={t('actions.cancel')}
              okButtonProps={{ danger: true }}
            >
              <Tooltip title={tSettings('team.deactivate')}>
                <Button
                  type="text"
                  size="small"
                  icon={<StopOutlined />}
                  danger
                  loading={removeTeamMember.isPending}
                />
              </Tooltip>
            </Popconfirm>
          );
        },
      },
    ],
    [
      t,
      tSettings,
      tShop,
      currentUserId,
      ownerId,
      canManageStaff,
      canDeactivateMember,
      handleDeactivate,
      handleReactivate,
      removeTeamMember.isPending,
      reactivateTeamMember.isPending,
    ]
  );

  /**
   * Pending invitations table columns
   */
  const invitationColumns: ColumnsType<PendingInvitation> = useMemo(
    () => [
      {
        key: 'email',
        title: t('labels.email'),
        dataIndex: 'email',
        width: '30%',
        render: (email: string) => (
          <div className="flex items-center gap-3">
            <Avatar size={40} icon={<MailOutlined />} className="bg-stone-100 text-stone-500" />
            <Text className="text-stone-900 dark:text-stone-100">{email}</Text>
          </div>
        ),
      },
      {
        key: 'role',
        title: tSettings('team.role'),
        dataIndex: 'role',
        width: '15%',
        render: (role: PendingInvitation['role'] | undefined) => {
          const roleName = role?.role_name ?? 'Unknown';
          return <Tag color={getRoleColor(roleName)}>{roleName}</Tag>;
        },
      },
      {
        key: 'invitedBy',
        title: tSettings('team.invitedBy'),
        dataIndex: 'inviter',
        width: '20%',
        render: (inviter: PendingInvitation['inviter'] | undefined) => (
          <Text type="secondary">{inviter?.full_name ?? inviter?.email ?? '-'}</Text>
        ),
      },
      {
        key: 'expiresAt',
        title: tSettings('team.expiresAt'),
        dataIndex: 'expires_at',
        width: '20%',
        render: (expiresAt: string) => {
          const expired = isExpired(expiresAt);
          return (
            <Space>
              <ClockCircleOutlined className={expired ? 'text-red-500' : 'text-stone-400'} />
              <Text type={expired ? 'danger' : 'secondary'} className="text-sm">
                {formatDateTime(expiresAt)}
              </Text>
            </Space>
          );
        },
      },
      {
        key: 'actions',
        title: t('labels.actions'),
        width: '15%',
        align: 'end' as const,
        render: (_: unknown, record: PendingInvitation) => {
          if (!canManageStaff) {
            return null;
          }

          return (
            <Space size="small">
              <Tooltip title={tSettings('team.resend')}>
                <Button
                  type="text"
                  size="small"
                  icon={<SendOutlined />}
                  onClick={() => handleResendInvitation(record)}
                  loading={resendInvitation.isPending}
                  className="text-blue-600 hover:text-blue-700"
                />
              </Tooltip>
              <Popconfirm
                title={tSettings('team.cancelInvitationConfirm')}
                onConfirm={() => handleCancelInvitation(record)}
                okText={t('actions.confirm')}
                cancelText={t('actions.cancel')}
                okButtonProps={{ danger: true }}
              >
                <Tooltip title={tSettings('team.cancelInvitation')}>
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseCircleOutlined />}
                    danger
                    loading={cancelInvitation.isPending}
                  />
                </Tooltip>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [
      t,
      tSettings,
      canManageStaff,
      handleResendInvitation,
      handleCancelInvitation,
      resendInvitation.isPending,
      cancelInvitation.isPending,
    ]
  );

  // ==========================================================================
  // TAB ITEMS
  // ==========================================================================

  const tabItems = [
    {
      key: 'active',
      label: (
        <Space>
          <UserOutlined />
          {tSettings('team.activeMembers')}
        </Space>
      ),
      children: membersLoading ? (
        <div className="p-6">
          <Skeleton active avatar paragraph={{ rows: 3 }} />
          <Skeleton active avatar paragraph={{ rows: 3 }} className="mt-4" />
        </div>
      ) : (
        <Table
          dataSource={members}
          columns={memberColumns}
          rowKey="id_access"
          pagination={false}
          locale={{
            emptyText: (
              <div className="py-12 text-center">
                <UserOutlined className="text-4xl text-stone-300 mb-4" />
                <Paragraph type="secondary">{tSettings('team.noMembers')}</Paragraph>
              </div>
            ),
          }}
        />
      ),
    },
    {
      key: 'pending',
      label: (
        <Space>
          <MailOutlined />
          {tSettings('team.pendingInvitations')}
          {invitationCount > 0 && <Badge count={invitationCount} size="small" className="ms-1" />}
        </Space>
      ),
      children: invitationsLoading ? (
        <div className="p-6">
          <Skeleton active avatar paragraph={{ rows: 2 }} />
          <Skeleton active avatar paragraph={{ rows: 2 }} className="mt-4" />
        </div>
      ) : (
        <Table
          dataSource={invitations}
          columns={invitationColumns}
          rowKey="id_invitation"
          pagination={false}
          locale={{
            emptyText: (
              <div className="py-12 text-center">
                <MailOutlined className="text-4xl text-stone-300 mb-4" />
                <Paragraph type="secondary">{tSettings('team.noInvitations')}</Paragraph>
              </div>
            ),
          }}
        />
      ),
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="team-members-page">
      {/* Page Header */}
      <PageHeader title={tSettings('team.title')} subtitle={tSettings('team.subtitle')} showBack>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleInvite}
          permission="staff.manage"
        >
          {tSettings('team.inviteMember')}
        </Button>
      </PageHeader>

      {/* Info Section */}
      <div className="mb-6">
        <Paragraph type="secondary" className="!mb-0">
          {tSettings('team.description')}
        </Paragraph>
      </div>

      {/* Main Content */}
      <Card styles={{ body: { padding: 0 } }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          items={tabItems}
          className="team-tabs"
          tabBarStyle={{ padding: '0 24px' }}
        />
      </Card>
    </div>
  );
}
