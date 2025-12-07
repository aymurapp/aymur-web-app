'use client';

/**
 * EmptyState Component
 *
 * A flexible, accessible empty state component with illustration, title, description,
 * and optional action button with permission support.
 *
 * Accessibility features:
 * - Proper ARIA role for status messages
 * - Semantic heading structure
 * - Focus-visible indicators on action buttons
 * - Screen reader friendly descriptions
 *
 * @example
 * <EmptyState
 *   icon={<InboxOutlined />}
 *   title={t('noItems')}
 *   description={t('noItemsDescription')}
 *   action={{
 *     label: t('addItem'),
 *     onClick: handleAddItem,
 *     permission: 'items.create'
 *   }}
 * />
 */

import React, { useId } from 'react';

import { InboxOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';

import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';

/**
 * Action configuration for empty state
 */
export interface EmptyStateAction {
  /** Button label */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Required permission to show the action */
  permission?: string;
  /** Button type */
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  /** Button icon */
  icon?: React.ReactNode;
}

/**
 * EmptyState props
 */
export interface EmptyStateProps {
  /** Custom icon or illustration */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button configuration */
  action?: EmptyStateAction;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class name */
  className?: string;
  /** Children to render instead of/in addition to action button */
  children?: React.ReactNode;
}

/**
 * Size configurations
 */
const sizeConfig = {
  sm: {
    wrapper: 'py-6',
    icon: 'text-3xl',
    iconWrapper: 'mb-2',
    title: 'text-sm',
    description: 'text-xs',
    button: 'small' as const,
  },
  md: {
    wrapper: 'py-10',
    icon: 'text-5xl',
    iconWrapper: 'mb-3',
    title: 'text-base',
    description: 'text-sm',
    button: 'middle' as const,
  },
  lg: {
    wrapper: 'py-16',
    icon: 'text-7xl',
    iconWrapper: 'mb-4',
    title: 'text-lg',
    description: 'text-base',
    button: 'large' as const,
  },
};

/**
 * EmptyState component for displaying when no data is available
 *
 * Features:
 * - Multiple size variants (sm, md, lg)
 * - Custom icon support
 * - Optional action button with permission checking
 * - RTL-compatible
 * - Luxury theme styling
 * - Accessible with proper ARIA attributes
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  className,
  children,
}: EmptyStateProps) {
  const { can } = usePermissions();
  const uniqueId = useId();

  const config = sizeConfig[size];

  // Generate IDs for ARIA relationships
  const titleId = `empty-state-title-${uniqueId}`;
  const descriptionId = description ? `empty-state-desc-${uniqueId}` : undefined;

  // Check if action should be shown
  const showAction = action && (!action.permission || can(action.permission));

  // Render custom icon or default
  const renderIcon = () => {
    const iconElement = icon || <InboxOutlined />;
    return (
      <div
        className={cn(
          'flex items-center justify-center text-stone-300',
          config.icon,
          config.iconWrapper
        )}
        aria-hidden="true"
      >
        {iconElement}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        config.wrapper,
        className
      )}
      role="status"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      {renderIcon()}

      <h3
        id={titleId}
        className={cn('font-medium text-stone-700 dark:text-stone-300 mb-1', config.title)}
      >
        {title}
      </h3>

      {description && (
        <p
          id={descriptionId}
          className={cn('text-stone-500 dark:text-stone-400 max-w-sm mb-4', config.description)}
        >
          {description}
        </p>
      )}

      {/* Render action button if provided and user has permission */}
      {showAction && !children && (
        <Button
          type={action.type || 'primary'}
          size={config.button}
          icon={action.icon}
          onClick={action.onClick}
          className={cn(
            'mt-2',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-white',
            'dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-stone-900'
          )}
          aria-describedby={descriptionId}
        >
          {action.label}
        </Button>
      )}

      {/* Render children if provided */}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/**
 * Pre-configured empty state variants for common use cases
 */

export function NoSearchResults({
  searchTerm,
  onClear,
  className,
}: {
  searchTerm?: string;
  onClear?: () => void;
  className?: string;
}) {
  const t = useTranslations('common');

  return (
    <EmptyState
      title={t('messages.noResults')}
      description={searchTerm ? `No results found for "${searchTerm}"` : t('messages.noResults')}
      action={
        onClear
          ? {
              label: t('actions.clear'),
              onClick: onClear,
              type: 'default',
            }
          : undefined
      }
      size="md"
      className={className}
    />
  );
}

export function NoData({
  title,
  description,
  actionLabel,
  onAction,
  actionPermission,
  className,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionPermission?: string;
  className?: string;
}) {
  const t = useTranslations('common');

  return (
    <EmptyState
      title={title || t('messages.noData')}
      description={description}
      action={
        onAction && actionLabel
          ? {
              label: actionLabel,
              onClick: onAction,
              permission: actionPermission,
              type: 'primary',
            }
          : undefined
      }
      size="md"
      className={className}
    />
  );
}

export default EmptyState;
