'use client';

/**
 * InviteMemberModal Component
 *
 * Modal for inviting new team members to a shop.
 *
 * Features:
 * - Email input with validation
 * - Role selector (excludes Owner role)
 * - Optional custom permissions override
 * - Success/error messaging
 * - Form reset on success
 *
 * @module components/domain/settings/InviteMemberModal
 */

import React, { useEffect, useCallback, useMemo } from 'react';

import { UserAddOutlined, MailOutlined } from '@ant-design/icons';
import { Modal, Form, Input, Select, Collapse, Checkbox, Typography, Spin, message } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  getDefaultPermissions,
  type PermissionKey,
  type RoleName,
} from '@/lib/constants/permissions';
import { useRoles, useInviteTeamMember } from '@/lib/hooks/data/useTeam';
import type { Json } from '@/lib/types/database';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface InviteMemberModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Handler for closing the modal */
  onClose: () => void;
  /** Shop ID to invite member to */
  shopId: string;
}

interface FormValues {
  email: string;
  id_role: string;
  permissions?: Record<string, boolean>;
}

// =============================================================================
// PERMISSION GROUP LABELS
// =============================================================================

const PERMISSION_GROUP_LABELS: Record<string, string> = {
  inventory: 'Inventory',
  sales: 'Sales',
  customers: 'Customers',
  suppliers: 'Suppliers',
  purchases: 'Purchases',
  expenses: 'Expenses',
  workshops: 'Workshops',
  deliveries: 'Deliveries',
  payroll: 'Payroll',
  staff: 'Staff',
  analytics: 'Analytics',
  settings: 'Settings',
  ai: 'AI Features',
  tax: 'Tax',
  budget: 'Budget',
  reminders: 'Reminders',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function InviteMemberModal({ open, onClose }: InviteMemberModalProps): React.JSX.Element {
  const t = useTranslations('team');
  const tCommon = useTranslations('common');

  // Form instance
  const [formInstance] = Form.useForm<FormValues>();

  // Fetch roles
  const { roles, isLoading: rolesLoading } = useRoles();

  // Filter out Owner role from selection
  const availableRoles = useMemo(() => {
    return roles.filter((role) => role.role_name?.toLowerCase() !== 'owner');
  }, [roles]);

  // Invite mutation
  const inviteTeamMember = useInviteTeamMember();

  // Watch selected role to show default permissions
  const selectedRoleId = Form.useWatch('id_role', formInstance);
  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id_role === selectedRoleId);
  }, [roles, selectedRoleId]);

  // Get default permissions for selected role
  const defaultPermissions = useMemo(() => {
    if (!selectedRole?.role_name) {
      return null;
    }
    const roleName = selectedRole.role_name.toLowerCase() as RoleName;
    return getDefaultPermissions(roleName);
  }, [selectedRole]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      formInstance.resetFields();
    }
  }, [open, formInstance]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSubmit = useCallback(async () => {
    try {
      const values = await formInstance.validateFields();

      // Build permissions override if any custom permissions were set
      let permissionsOverride: Json | undefined;
      if (values.permissions) {
        const overrides: Record<string, boolean> = {};
        let hasOverrides = false;

        Object.entries(values.permissions).forEach(([key, value]) => {
          // Only include if different from default
          if (defaultPermissions && defaultPermissions[key as PermissionKey] !== value) {
            overrides[key] = value;
            hasOverrides = true;
          }
        });

        if (hasOverrides) {
          permissionsOverride = overrides;
        }
      }

      await inviteTeamMember.mutateAsync({
        email: values.email.trim().toLowerCase(),
        roleId: values.id_role,
        permissions: permissionsOverride,
      });

      message.success(t('inviteSent'));
      formInstance.resetFields();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific error messages
        if (error.message.includes('already has access')) {
          message.error(t('errors.alreadyHasAccess'));
        } else if (error.message.includes('pending invitation')) {
          message.error(t('errors.pendingInvitation'));
        } else {
          message.error(error.message);
        }
      } else {
        message.error(t('errors.inviteFailed'));
      }
    }
  }, [formInstance, inviteTeamMember, defaultPermissions, t, onClose]);

  const handleClose = useCallback(() => {
    formInstance.resetFields();
    onClose();
  }, [formInstance, onClose]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <UserAddOutlined className="text-amber-500" />
          <span>{t('inviteMember')}</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={560}
      destroyOnClose
      maskClosable={!inviteTeamMember.isPending}
      closable={!inviteTeamMember.isPending}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} disabled={inviteTeamMember.isPending}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={inviteTeamMember.isPending}
            permission="staff.invite"
          >
            {t('sendInvitation')}
          </Button>
        </div>
      }
    >
      {rolesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spin size="large" />
        </div>
      ) : (
        <Form form={formInstance} layout="vertical" requiredMark="optional" className="mt-4">
          {/* Email */}
          <Form.Item
            name="email"
            label={t('email')}
            rules={[
              { required: true, message: tCommon('validation.required') },
              { type: 'email', message: tCommon('validation.invalidEmail') },
            ]}
          >
            <Input
              placeholder={t('emailPlaceholder')}
              prefix={<MailOutlined className="text-stone-400" />}
              autoComplete="email"
            />
          </Form.Item>

          {/* Role */}
          <Form.Item
            name="id_role"
            label={t('role')}
            rules={[{ required: true, message: tCommon('validation.required') }]}
          >
            <Select placeholder={t('selectRole')} optionLabelProp="label">
              {availableRoles.map((role) => (
                <Select.Option
                  key={role.id_role}
                  value={role.id_role}
                  label={role.role_name}
                  disabled={role.role_name?.toLowerCase() === 'owner'}
                >
                  <div className="py-1">
                    <div className="font-medium">{role.role_name}</div>
                    {role.description && (
                      <Text type="secondary" className="text-xs">
                        {role.description}
                      </Text>
                    )}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Role description helper */}
          {selectedRole?.description && (
            <div className="bg-stone-50 rounded-lg p-3 mb-4 -mt-2">
              <Text type="secondary" className="text-sm">
                {selectedRole.description}
              </Text>
            </div>
          )}

          {/* Custom Permissions */}
          <Form.Item label={t('customPermissions')} className="mb-0">
            <Collapse
              ghost
              className="bg-stone-50 rounded-lg"
              items={[
                {
                  key: 'permissions',
                  label: <span className="text-stone-600">{t('overrideDefaultPermissions')}</span>,
                  children: (
                    <PermissionCheckboxes
                      defaultPermissions={defaultPermissions}
                      disabled={!selectedRole}
                    />
                  ),
                },
              ]}
            />
          </Form.Item>

          {/* Info text */}
          <div className="mt-4 text-sm text-stone-500">
            <Text type="secondary">{t('invitationExpiryNote')}</Text>
          </div>
        </Form>
      )}
    </Modal>
  );
}

// =============================================================================
// PERMISSION CHECKBOXES COMPONENT
// =============================================================================

interface PermissionCheckboxesProps {
  defaultPermissions: Record<PermissionKey, boolean> | null;
  disabled?: boolean;
}

function PermissionCheckboxes({
  defaultPermissions,
  disabled,
}: PermissionCheckboxesProps): React.JSX.Element {
  const t = useTranslations('team');

  if (!defaultPermissions) {
    return <div className="text-stone-500 text-sm py-2">{t('selectRoleFirst')}</div>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(PERMISSION_GROUPS).map(([groupKey, permissions]) => (
        <div key={groupKey}>
          <div className="font-medium text-stone-700 mb-2">
            {PERMISSION_GROUP_LABELS[groupKey] || groupKey}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {permissions.map((permissionKey) => {
              const defaultValue = defaultPermissions[permissionKey as PermissionKey];
              const label = PERMISSION_LABELS[permissionKey as PermissionKey];

              return (
                <Form.Item
                  key={permissionKey}
                  name={['permissions', permissionKey]}
                  valuePropName="checked"
                  initialValue={defaultValue}
                  className="mb-1"
                  noStyle
                >
                  <Checkbox disabled={disabled} className="text-sm">
                    <span className="text-stone-600">{label}</span>
                  </Checkbox>
                </Form.Item>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default InviteMemberModal;
