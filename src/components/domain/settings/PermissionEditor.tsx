'use client';

/**
 * PermissionEditor Component
 *
 * A component for displaying and editing individual permissions organized by groups.
 * Supports both controlled and uncontrolled modes, read-only display with status icons,
 * and optional permission descriptions.
 *
 * Features:
 * - Permission groups organized logically (Inventory, Sales, Customers, etc.)
 * - Controlled and uncontrolled modes
 * - Read-only mode with CheckCircle/CloseCircle icons
 * - Enable All / Disable All buttons per group
 * - Optional permission descriptions
 * - Full i18n support with RTL compatibility
 * - Permission-aware using project permission system
 *
 * @example
 * ```tsx
 * // Controlled mode
 * const [permissions, setPermissions] = useState({});
 * <PermissionEditor
 *   permissions={permissions}
 *   onChange={setPermissions}
 * />
 *
 * // Read-only mode
 * <PermissionEditor
 *   permissions={userPermissions}
 *   readOnly
 *   showDescriptions
 * />
 * ```
 *
 * @module components/domain/settings/PermissionEditor
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CheckSquareOutlined,
  BorderOutlined,
} from '@ant-design/icons';
import { Card, Row, Col, Checkbox, Typography, Space, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { PERMISSION_GROUPS } from '@/lib/constants/permissions';
import { cn } from '@/lib/utils/cn';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface PermissionEditorProps {
  /** Current permissions state - Record of permission keys to boolean values */
  permissions: Record<string, boolean>;
  /** Callback when permissions change (for controlled mode) */
  onChange?: (permissions: Record<string, boolean>) => void;
  /** If true, display permissions as read-only with status icons */
  readOnly?: boolean;
  /** If true, show permission descriptions below each permission label */
  showDescriptions?: boolean;
  /** If true, use compact layout suitable for modals (single column) */
  compact?: boolean;
  /** Additional CSS class for the container */
  className?: string;
}

// =============================================================================
// PERMISSION GROUP TYPE
// =============================================================================

type PermissionGroupKey = keyof typeof PERMISSION_GROUPS;

// =============================================================================
// COMPONENT
// =============================================================================

export function PermissionEditor({
  permissions: externalPermissions,
  onChange,
  readOnly = false,
  showDescriptions = false,
  compact = false,
  className,
}: PermissionEditorProps): React.JSX.Element {
  const t = useTranslations('permissions');

  // Internal state for uncontrolled mode
  const [internalPermissions, setInternalPermissions] =
    useState<Record<string, boolean>>(externalPermissions);

  // Sync internal state with external permissions when they change
  useEffect(() => {
    setInternalPermissions(externalPermissions);
  }, [externalPermissions]);

  // Determine which permissions to use (controlled vs uncontrolled)
  const currentPermissions = onChange ? externalPermissions : internalPermissions;

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle individual permission toggle
   */
  const handlePermissionChange = useCallback(
    (permission: string, checked: boolean) => {
      const newPermissions = {
        ...currentPermissions,
        [permission]: checked,
      };

      if (onChange) {
        // Controlled mode
        onChange(newPermissions);
      } else {
        // Uncontrolled mode
        setInternalPermissions(newPermissions);
      }
    },
    [currentPermissions, onChange]
  );

  /**
   * Enable all permissions in a group
   */
  const handleEnableAll = useCallback(
    (groupKey: PermissionGroupKey) => {
      const groupPermissions = PERMISSION_GROUPS[groupKey];
      const newPermissions = { ...currentPermissions };

      groupPermissions.forEach((permission) => {
        newPermissions[permission] = true;
      });

      if (onChange) {
        onChange(newPermissions);
      } else {
        setInternalPermissions(newPermissions);
      }
    },
    [currentPermissions, onChange]
  );

  /**
   * Disable all permissions in a group
   */
  const handleDisableAll = useCallback(
    (groupKey: PermissionGroupKey) => {
      const groupPermissions = PERMISSION_GROUPS[groupKey];
      const newPermissions = { ...currentPermissions };

      groupPermissions.forEach((permission) => {
        newPermissions[permission] = false;
      });

      if (onChange) {
        onChange(newPermissions);
      } else {
        setInternalPermissions(newPermissions);
      }
    },
    [currentPermissions, onChange]
  );

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Get translated label for a permission
   */
  const getPermissionLabel = useCallback(
    (permission: string): string => {
      // Convert permission key to translation key
      // e.g., "inventory.view" -> "labels.inventory_view"
      const translationKey = `labels.${permission.replace('.', '_')}`;
      return t(translationKey);
    },
    [t]
  );

  /**
   * Get translated description for a permission
   */
  const getPermissionDescription = useCallback(
    (permission: string): string => {
      // e.g., "inventory.view" -> "descriptions.inventory_view"
      const translationKey = `descriptions.${permission.replace('.', '_')}`;
      return t(translationKey);
    },
    [t]
  );

  /**
   * Get translated group title
   */
  const getGroupTitle = useCallback(
    (groupKey: string): string => {
      return t(`groups.${groupKey}`);
    },
    [t]
  );

  /**
   * Check if all permissions in a group are enabled
   */
  const isGroupFullyEnabled = useCallback(
    (groupKey: PermissionGroupKey): boolean => {
      const groupPermissions = PERMISSION_GROUPS[groupKey];
      return groupPermissions.every((permission) => currentPermissions[permission] === true);
    },
    [currentPermissions]
  );

  /**
   * Check if all permissions in a group are disabled
   */
  const isGroupFullyDisabled = useCallback(
    (groupKey: PermissionGroupKey): boolean => {
      const groupPermissions = PERMISSION_GROUPS[groupKey];
      return groupPermissions.every((permission) => !currentPermissions[permission]);
    },
    [currentPermissions]
  );

  /**
   * Count enabled permissions in a group
   */
  const getGroupEnabledCount = useCallback(
    (groupKey: PermissionGroupKey): { enabled: number; total: number } => {
      const groupPermissions = PERMISSION_GROUPS[groupKey];
      const enabled = groupPermissions.filter(
        (permission) => currentPermissions[permission] === true
      ).length;
      return { enabled, total: groupPermissions.length };
    },
    [currentPermissions]
  );

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  /**
   * Render group title with count badge
   */
  const renderGroupTitle = useCallback(
    (groupKey: PermissionGroupKey) => {
      const { enabled, total } = getGroupEnabledCount(groupKey);

      return (
        <div className="flex items-center justify-between w-full">
          <span className="font-medium text-stone-700">{getGroupTitle(groupKey)}</span>
          <Text
            type="secondary"
            className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              enabled === total
                ? 'bg-green-100 text-green-700'
                : enabled === 0
                  ? 'bg-stone-100 text-stone-500'
                  : 'bg-amber-100 text-amber-700'
            )}
          >
            {enabled}/{total}
          </Text>
        </div>
      );
    },
    [getGroupTitle, getGroupEnabledCount]
  );

  /**
   * Render a single permission in read-only mode
   */
  const renderReadOnlyPermission = useCallback(
    (permission: string) => {
      const isEnabled = currentPermissions[permission] === true;
      const label = getPermissionLabel(permission);
      const description = showDescriptions ? getPermissionDescription(permission) : null;

      return (
        <div className="flex items-start gap-2">
          {isEnabled ? (
            <CheckCircleOutlined className="text-green-500 mt-0.5 flex-shrink-0" />
          ) : (
            <CloseCircleOutlined className="text-stone-400 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex flex-col">
            <Text className={cn(isEnabled ? 'text-stone-700' : 'text-stone-500')}>{label}</Text>
            {description && (
              <Text type="secondary" className="text-xs mt-0.5">
                {description}
              </Text>
            )}
          </div>
        </div>
      );
    },
    [currentPermissions, getPermissionLabel, getPermissionDescription, showDescriptions]
  );

  /**
   * Render a single permission checkbox in edit mode
   */
  const renderEditablePermission = useCallback(
    (permission: string) => {
      const isChecked = currentPermissions[permission] === true;
      const label = getPermissionLabel(permission);
      const description = showDescriptions ? getPermissionDescription(permission) : null;

      return (
        <Checkbox
          checked={isChecked}
          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
          className="text-sm w-full"
        >
          <div className="flex flex-col">
            <span className="text-stone-700">{label}</span>
            {description && (
              <Text type="secondary" className="text-xs mt-0.5 font-normal">
                {description}
              </Text>
            )}
          </div>
        </Checkbox>
      );
    },
    [
      currentPermissions,
      getPermissionLabel,
      getPermissionDescription,
      showDescriptions,
      handlePermissionChange,
    ]
  );

  /**
   * Render group action buttons
   */
  const renderGroupActions = useCallback(
    (groupKey: PermissionGroupKey) => {
      const isFullyEnabled = isGroupFullyEnabled(groupKey);
      const isFullyDisabled = isGroupFullyDisabled(groupKey);

      return (
        <Space size="small" className="mt-3 pt-3 border-t border-stone-100">
          <Tooltip title={t('actions.enableAllTooltip')}>
            <Button
              size="small"
              type="text"
              icon={<CheckSquareOutlined />}
              onClick={() => handleEnableAll(groupKey)}
              disabled={isFullyEnabled}
              className={cn(
                'text-xs',
                isFullyEnabled
                  ? 'text-stone-400'
                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
              )}
            >
              {t('actions.enableAll')}
            </Button>
          </Tooltip>
          <Tooltip title={t('actions.disableAllTooltip')}>
            <Button
              size="small"
              type="text"
              icon={<BorderOutlined />}
              onClick={() => handleDisableAll(groupKey)}
              disabled={isFullyDisabled}
              className={cn(
                'text-xs',
                isFullyDisabled
                  ? 'text-stone-400'
                  : 'text-stone-600 hover:text-stone-700 hover:bg-stone-100'
              )}
            >
              {t('actions.disableAll')}
            </Button>
          </Tooltip>
        </Space>
      );
    },
    [t, isGroupFullyEnabled, isGroupFullyDisabled, handleEnableAll, handleDisableAll]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const sortedGroups = useMemo(() => {
    // Define a custom order for groups to ensure logical organization
    const groupOrder: PermissionGroupKey[] = [
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

    return groupOrder.filter((key) => key in PERMISSION_GROUPS);
  }, []);

  return (
    <div className={cn('permission-editor space-y-4', className)}>
      {sortedGroups.map((groupKey) => {
        const permissions = PERMISSION_GROUPS[groupKey];

        return (
          <Card
            key={groupKey}
            size="small"
            title={renderGroupTitle(groupKey)}
            className="border-stone-200 shadow-sm hover:shadow-md transition-shadow"
            styles={{
              header: {
                borderBottom: '1px solid #e7e5e4',
                backgroundColor: '#fafaf9',
              },
            }}
          >
            <Row gutter={[16, 8]}>
              {permissions.map((permission) => (
                <Col span={compact ? 24 : 12} key={permission}>
                  {readOnly
                    ? renderReadOnlyPermission(permission)
                    : renderEditablePermission(permission)}
                </Col>
              ))}
            </Row>

            {!readOnly && renderGroupActions(groupKey)}
          </Card>
        );
      })}
    </div>
  );
}

export default PermissionEditor;
