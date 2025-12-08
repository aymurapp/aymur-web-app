'use client';

/**
 * Roles & Permissions Page
 *
 * Displays predefined roles and their default permissions.
 * This is a read-only view - roles are defined in the database
 * and cannot be modified. Permission overrides can be made per team member.
 *
 * @module app/(platform)/[locale]/[shopId]/settings/roles/page
 */

import React, { useMemo } from 'react';

import { CheckCircleOutlined } from '@ant-design/icons';
import { Alert, Badge, Card, Col, Divider, Row, Skeleton, Space, Tag, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/layout/PageHeader';
import {
  PERMISSION_GROUPS,
  ROLES,
  getDefaultPermissions,
  type PermissionKey,
  type RoleName,
} from '@/lib/constants/permissions';
import { useRoles, useTeamMembers } from '@/lib/hooks/data/useTeam';

const { Text, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface RoleInfo {
  key: RoleName;
  color: string;
  icon?: React.ReactNode;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Role metadata for display
 */
const ROLE_INFO: Record<RoleName, RoleInfo> = {
  [ROLES.OWNER]: {
    key: ROLES.OWNER,
    color: 'gold',
  },
  [ROLES.MANAGER]: {
    key: ROLES.MANAGER,
    color: 'blue',
  },
  [ROLES.FINANCE]: {
    key: ROLES.FINANCE,
    color: 'green',
  },
  [ROLES.STAFF]: {
    key: ROLES.STAFF,
    color: 'default',
  },
};

/**
 * Permission group display names and icons
 */
const PERMISSION_GROUP_ORDER: Array<keyof typeof PERMISSION_GROUPS> = [
  'inventory',
  'sales',
  'customers',
  'suppliers',
  'purchases',
  'expenses',
  'workshops',
  'deliveries',
  'payroll',
  'staff',
  'analytics',
  'settings',
  'ai',
  'tax',
  'budget',
  'reminders',
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the role color for badges
 */
function getRoleColor(roleName: string): string {
  const normalized = roleName.toLowerCase() as RoleName;
  return ROLE_INFO[normalized]?.color || 'default';
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface PermissionListProps {
  permissions: Record<PermissionKey, boolean>;
  t: ReturnType<typeof useTranslations>;
}

/**
 * Displays permissions grouped by category
 */
function PermissionList({ permissions, t }: PermissionListProps): JSX.Element {
  const groupedPermissions = useMemo(() => {
    const groups: Array<{
      group: keyof typeof PERMISSION_GROUPS;
      permissions: Array<{ key: PermissionKey; enabled: boolean }>;
    }> = [];

    for (const group of PERMISSION_GROUP_ORDER) {
      const groupPerms = PERMISSION_GROUPS[group] as readonly PermissionKey[];
      const permsWithStatus = groupPerms.map((key) => ({
        key,
        enabled: permissions[key] ?? false,
      }));

      // Only include groups that have at least one enabled permission
      const hasEnabledPermissions = permsWithStatus.some((p) => p.enabled);
      if (hasEnabledPermissions) {
        groups.push({ group, permissions: permsWithStatus });
      }
    }

    return groups;
  }, [permissions]);

  if (groupedPermissions.length === 0) {
    return (
      <Text type="secondary" className="text-sm">
        {t('roles.noPermissions')}
      </Text>
    );
  }

  return (
    <div className="space-y-3">
      {groupedPermissions.map(({ group, permissions: perms }) => (
        <div key={group}>
          <Text strong className="text-xs uppercase text-stone-500 dark:text-stone-400 block mb-1">
            {t(`roles.permissionGroups.${group}`)}
          </Text>
          <div className="flex flex-wrap gap-1">
            {perms
              .filter((p) => p.enabled)
              .map(({ key }) => (
                <Tag
                  key={key}
                  icon={<CheckCircleOutlined />}
                  color="success"
                  className="text-xs mb-1"
                >
                  {t(`roles.permissions.${key.replace('.', '_')}`)}
                </Tag>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface RoleCardProps {
  roleName: string;
  memberCount: number;
  t: ReturnType<typeof useTranslations>;
  tSettings: ReturnType<typeof useTranslations>;
}

/**
 * Role card displaying role info and permissions
 */
function RoleCard({ roleName, memberCount, t, tSettings }: RoleCardProps): JSX.Element {
  const normalizedRole = roleName.toLowerCase() as RoleName;
  const roleColor = getRoleColor(roleName);
  const permissions = getDefaultPermissions(normalizedRole);

  return (
    <Card
      className="h-full"
      title={
        <Space>
          <Tag color={roleColor} className="!m-0">
            {t(`roles.roleNames.${normalizedRole}`)}
          </Tag>
        </Space>
      }
      extra={
        <Badge
          count={memberCount}
          showZero
          color={memberCount > 0 ? 'blue' : 'default'}
          title={tSettings('roles.memberCount', { count: memberCount })}
        />
      }
    >
      <Paragraph type="secondary" className="!mb-4 text-sm">
        {t(`roles.descriptions.${normalizedRole}`)}
      </Paragraph>

      <Divider className="!my-3" />

      <div>
        <Text strong className="block mb-3 text-stone-700 dark:text-stone-300">
          {tSettings('roles.defaultPermissions')}
        </Text>
        <PermissionList permissions={permissions} t={t} />
      </div>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Roles & Permissions Page
 */
export default function RolesPage(): JSX.Element {
  const t = useTranslations('shop');
  const tSettings = useTranslations('settings');

  // Fetch roles from database
  const { roles, isLoading: rolesLoading } = useRoles();

  // Fetch team members to get member count per role
  const { members, isLoading: membersLoading } = useTeamMembers({ includeInactive: false });

  // Calculate member count per role
  const memberCountByRole = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const member of members) {
      const roleName = member.role_name.toLowerCase();
      counts[roleName] = (counts[roleName] || 0) + 1;
    }

    return counts;
  }, [members]);

  // Define display order for roles
  const roleOrder: RoleName[] = [ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE, ROLES.STAFF];

  // Sort roles by defined order
  const sortedRoles = useMemo(() => {
    if (!roles.length) {
      return [];
    }

    return [...roles].sort((a, b) => {
      const aIndex = roleOrder.indexOf(a.role_name.toLowerCase() as RoleName);
      const bIndex = roleOrder.indexOf(b.role_name.toLowerCase() as RoleName);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  }, [roles]);

  const isLoading = rolesLoading || membersLoading;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="roles-page">
      {/* Page Header */}
      <PageHeader
        title={tSettings('roles.title')}
        subtitle={tSettings('roles.subtitle')}
        showBack
      />

      {/* Info Alert */}
      <Alert type="info" showIcon message={tSettings('roles.infoMessage')} className="mb-6" />

      {/* Roles Grid */}
      {isLoading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map((i) => (
            <Col xs={24} lg={12} key={i}>
              <Card>
                <Skeleton active avatar paragraph={{ rows: 6 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Row gutter={[16, 16]}>
          {sortedRoles.map((role) => (
            <Col xs={24} lg={12} key={role.id_role}>
              <RoleCard
                roleName={role.role_name}
                memberCount={memberCountByRole[role.role_name.toLowerCase()] || 0}
                t={t}
                tSettings={tSettings}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
