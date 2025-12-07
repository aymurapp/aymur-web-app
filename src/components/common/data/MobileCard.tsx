'use client';

/**
 * MobileCard Component
 *
 * A flexible, touch-friendly card component designed for mobile data display.
 * Used as an alternative to tables on small screens for better usability.
 *
 * Features:
 * - Touch-friendly with 44px minimum tap targets
 * - Actions dropdown or inline buttons
 * - RTL-compatible layout with logical properties
 * - Status badge support
 * - Customizable sections (header, body, footer)
 * - Swipe action support (when used with useSwipe hook)
 *
 * @example
 * <MobileCard
 *   title="Diamond Ring"
 *   subtitle="SKU: DR-001"
 *   status={{ label: 'In Stock', variant: 'success' }}
 *   fields={[
 *     { label: 'Price', value: '$2,500' },
 *     { label: 'Category', value: 'Rings' },
 *   ]}
 *   actions={[
 *     { key: 'edit', label: 'Edit', onClick: handleEdit },
 *     { key: 'delete', label: 'Delete', danger: true, onClick: handleDelete }
 *   ]}
 * />
 */

import React from 'react';

import { MoreOutlined } from '@ant-design/icons';
import { Card, Dropdown, Button, Tag, Space, Typography, Avatar } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';

import type { MenuProps } from 'antd';

const { Text, Title } = Typography;

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum touch target size (WCAG 2.1 Level AAA) */
const MIN_TOUCH_TARGET = 44;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Status badge configuration
 */
export interface StatusConfig {
  /** Label text */
  label: string;
  /** Visual variant */
  variant: 'success' | 'warning' | 'error' | 'info' | 'default';
  /** Optional icon */
  icon?: React.ReactNode;
}

/**
 * Field configuration for card body
 */
export interface FieldConfig {
  /** Field label */
  label: string;
  /** Field value (can be string, number, or custom node) */
  value: React.ReactNode;
  /** Whether to display value with emphasis */
  highlight?: boolean;
  /** Custom class for the field */
  className?: string;
}

/**
 * Action configuration
 */
export interface ActionConfig {
  /** Unique key for the action */
  key: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Whether this is a dangerous action (red styling) */
  danger?: boolean;
  /** Whether the action is disabled */
  disabled?: boolean;
}

/**
 * MobileCard component props
 */
export interface MobileCardProps {
  /** Card title */
  title: string;
  /** Card subtitle (e.g., SKU, ID) */
  subtitle?: string;
  /** Optional image or avatar */
  image?: string | React.ReactNode;
  /** Status badge configuration */
  status?: StatusConfig;
  /** Fields to display in card body */
  fields?: FieldConfig[];
  /** Actions for the card */
  actions?: ActionConfig[];
  /** Maximum number of inline actions (rest go to dropdown) */
  maxInlineActions?: number;
  /** Whether to show actions as dropdown only */
  actionsAsDropdown?: boolean;
  /** Custom footer content */
  footer?: React.ReactNode;
  /** Click handler for the card (navigation) */
  onClick?: () => void;
  /** Additional class name */
  className?: string;
  /** Whether the card is selected */
  selected?: boolean;
  /** Whether the card is loading */
  loading?: boolean;
  /** Custom header content */
  headerExtra?: React.ReactNode;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get tag color based on variant
 */
function getTagColor(variant: StatusConfig['variant']): string {
  switch (variant) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'info':
      return 'processing';
    default:
      return 'default';
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Card Header with title, subtitle, and status
 */
function CardHeader({
  title,
  subtitle,
  status,
  image,
  headerExtra,
}: Pick<MobileCardProps, 'title' | 'subtitle' | 'status' | 'image' | 'headerExtra'>) {
  return (
    <div className="flex items-start gap-3">
      {/* Image/Avatar */}
      {image && (
        <div className="flex-shrink-0">
          {typeof image === 'string' ? (
            <Avatar src={image} size={48} shape="square" className="rounded-md" />
          ) : (
            image
          )}
        </div>
      )}

      {/* Title and subtitle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Title level={5} className="!mb-0 !text-base truncate flex-1" ellipsis={{ rows: 1 }}>
            {title}
          </Title>
          {status && (
            <Tag color={getTagColor(status.variant)} icon={status.icon} className="flex-shrink-0">
              {status.label}
            </Tag>
          )}
        </div>
        {subtitle && (
          <Text type="secondary" className="text-sm truncate block">
            {subtitle}
          </Text>
        )}
      </div>

      {/* Extra content */}
      {headerExtra && <div className="flex-shrink-0">{headerExtra}</div>}
    </div>
  );
}

/**
 * Card Body with fields
 */
function CardBody({ fields }: { fields: FieldConfig[] }) {
  if (!fields || fields.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
      {fields.map((field, index) => (
        <div key={index} className={cn('min-w-0', field.className)}>
          <Text type="secondary" className="text-xs block mb-0.5">
            {field.label}
          </Text>
          <Text strong={field.highlight} className="text-sm truncate block">
            {field.value}
          </Text>
        </div>
      ))}
    </div>
  );
}

/**
 * Actions dropdown menu
 */
function ActionsDropdown({ actions }: { actions: ActionConfig[] }) {
  const tCommon = useTranslations('common');

  if (!actions || actions.length === 0) {
    return null;
  }

  const menuItems: MenuProps['items'] = actions.map((action) => ({
    key: action.key,
    icon: action.icon,
    label: action.label,
    danger: action.danger,
    disabled: action.disabled,
    onClick: action.onClick,
  }));

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
      <Button
        type="text"
        icon={<MoreOutlined className="text-lg" aria-hidden="true" />}
        className="touch-manipulation text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
        style={{
          width: MIN_TOUCH_TARGET,
          height: MIN_TOUCH_TARGET,
        }}
        aria-label={tCommon('actions.showMore')}
      />
    </Dropdown>
  );
}

/**
 * Inline action buttons
 */
function InlineActions({
  actions,
  maxActions = 2,
}: {
  actions: ActionConfig[];
  maxActions?: number;
}) {
  if (!actions || actions.length === 0) {
    return null;
  }

  const inlineActions = actions.slice(0, maxActions);
  const overflowActions = actions.slice(maxActions);

  return (
    <Space size={8}>
      {inlineActions.map((action) => (
        <Button
          key={action.key}
          type="text"
          icon={action.icon}
          danger={action.danger}
          disabled={action.disabled}
          onClick={action.onClick}
          className="touch-manipulation text-sm"
          style={{ minHeight: MIN_TOUCH_TARGET }}
        >
          {action.label}
        </Button>
      ))}
      {overflowActions.length > 0 && <ActionsDropdown actions={overflowActions} />}
    </Space>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * MobileCard Component
 *
 * A touch-friendly card component for mobile data display.
 * Serves as an alternative to table rows on small screens.
 */
export function MobileCard({
  title,
  subtitle,
  image,
  status,
  fields,
  actions,
  maxInlineActions = 2,
  actionsAsDropdown = true,
  footer,
  onClick,
  className,
  selected = false,
  loading = false,
  headerExtra,
}: MobileCardProps): JSX.Element {
  const hasActions = actions && actions.length > 0;

  return (
    <Card
      className={cn(
        'w-full transition-all duration-200',
        'border border-stone-200 dark:border-stone-700',
        'hover:border-amber-300 dark:hover:border-amber-600',
        selected && 'border-amber-500 dark:border-amber-500 ring-1 ring-amber-500/20',
        onClick && 'cursor-pointer',
        className
      )}
      bodyStyle={{ padding: '16px' }}
      loading={loading}
      onClick={onClick}
      hoverable={!!onClick}
    >
      {/* Header with actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <CardHeader
            title={title}
            subtitle={subtitle}
            image={image}
            status={status}
            headerExtra={headerExtra}
          />
        </div>

        {/* Actions */}
        {hasActions && (
          <div className="flex-shrink-0 -me-2 -mt-1">
            {actionsAsDropdown ? (
              <ActionsDropdown actions={actions!} />
            ) : (
              <InlineActions actions={actions!} maxActions={maxInlineActions} />
            )}
          </div>
        )}
      </div>

      {/* Body with fields */}
      <CardBody fields={fields || []} />

      {/* Footer */}
      {footer && (
        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">{footer}</div>
      )}
    </Card>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default MobileCard;

/** Export constants for external use */
export { MIN_TOUCH_TARGET };
