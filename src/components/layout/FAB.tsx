'use client';

/**
 * FAB (Floating Action Button) Component
 * Quick access floating menu for common actions
 *
 * Features:
 * - Bottom-right positioning (RTL: bottom-left)
 * - Expandable menu with quick actions
 * - Context-aware actions based on current page
 * - AI chat button stacked above
 * - Smooth animations
 */

import React, { useMemo } from 'react';

import {
  PlusOutlined,
  RobotOutlined,
  ShoppingCartOutlined,
  UserAddOutlined,
  InboxOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { FloatButton, Tooltip } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { usePermissions } from '@/lib/hooks/permissions';
import { usePathname, useRouter } from '@/lib/i18n/navigation';
import { isRtlLocale, type Locale } from '@/lib/i18n/routing';
import { useAIStore } from '@/stores/aiStore';
import { useShopStore } from '@/stores/shopStore';

// =============================================================================
// TYPES
// =============================================================================

export interface FABAction {
  /** Unique key for the action */
  key: string;
  /** Icon component */
  icon: React.ReactNode;
  /** Tooltip text (translation key) */
  tooltipKey: string;
  /** Permission required (optional) */
  permission?: string;
  /** Click handler */
  onClick: () => void;
}

export interface FABProps {
  /** Custom actions to show (overrides context-aware defaults) */
  actions?: FABAction[];
  /** Hide the FAB completely */
  hidden?: boolean;
  /** Hide the AI chat button */
  hideAIButton?: boolean;
  /** Additional CSS class name */
  className?: string;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to get context-aware FAB actions based on current page
 */
function useContextActions(): FABAction[] {
  const pathname = usePathname();
  const router = useRouter();
  const currentShopId = useShopStore((state) => state.currentShopId);
  const { can } = usePermissions();

  return useMemo(() => {
    const actions: FABAction[] = [];

    // Get relative path (without locale and shopId)
    const segments = pathname.split('/').filter(Boolean);
    const relativePath = '/' + segments.slice(1).join('/'); // Remove shopId

    // Context-aware actions based on current page
    if (relativePath.startsWith('/inventory')) {
      actions.push({
        key: 'add-item',
        icon: <InboxOutlined />,
        tooltipKey: 'inventory.addItem',
        permission: 'inventory.create',
        onClick: () => router.push(`/${currentShopId}/inventory/items/new`),
      });
    }

    if (relativePath.startsWith('/sales') || relativePath === '/dashboard') {
      actions.push({
        key: 'new-sale',
        icon: <ShoppingCartOutlined />,
        tooltipKey: 'sales.newSale',
        permission: 'sales.create',
        onClick: () => router.push(`/${currentShopId}/pos`),
      });
    }

    if (relativePath.startsWith('/customers') || relativePath.startsWith('/sales')) {
      actions.push({
        key: 'add-customer',
        icon: <UserAddOutlined />,
        tooltipKey: 'customers.addCustomer',
        permission: 'customers.create',
        onClick: () => router.push(`/${currentShopId}/sales/customers/new`),
      });
    }

    if (relativePath.startsWith('/analytics') || relativePath.startsWith('/reports')) {
      actions.push({
        key: 'generate-report',
        icon: <FileTextOutlined />,
        tooltipKey: 'reports.generate',
        permission: 'reports.basic',
        onClick: () => router.push(`/${currentShopId}/analytics/reports`),
      });
    }

    // Filter by permissions
    return actions.filter((action) => !action.permission || can(action.permission));
  }, [pathname, currentShopId, can, router]);
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Floating Action Button Component
 *
 * Provides quick access to common actions:
 * - AI Chat button (always visible)
 * - Context-aware action buttons
 * - Expandable menu on hover/click
 *
 * Positioned at bottom-right (or bottom-left for RTL).
 *
 * @example
 * // Basic usage (context-aware)
 * <FAB />
 *
 * @example
 * // With custom actions
 * <FAB
 *   actions={[
 *     { key: 'custom', icon: <StarOutlined />, tooltipKey: 'custom.action', onClick: handleCustom }
 *   ]}
 * />
 *
 * @example
 * // Hide AI button
 * <FAB hideAIButton />
 */
export function FAB({
  actions: customActions,
  hidden = false,
  hideAIButton = false,
  className,
}: FABProps): JSX.Element | null {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const isRtl = isRtlLocale(locale);
  const contextActions = useContextActions();
  const { toggleChat, isOpen: isAIChatOpen } = useAIStore();

  // Use custom actions or context-aware actions
  const actions = customActions ?? contextActions;

  if (hidden) {
    return null;
  }

  // Position based on RTL
  const positionStyle = isRtl ? { left: 24, right: 'auto' } : { right: 24, left: 'auto' };

  return (
    <div
      className={className}
      style={{ position: 'fixed', bottom: 24, ...positionStyle, zIndex: 50 }}
    >
      {/* Main FAB Group */}
      <FloatButton.Group
        trigger="hover"
        icon={<PlusOutlined />}
        type="primary"
        style={{ bottom: hideAIButton ? 0 : 70 }}
        className="shadow-lg"
      >
        {actions.map((action) => (
          <Tooltip
            key={action.key}
            title={t(action.tooltipKey)}
            placement={isRtl ? 'right' : 'left'}
          >
            <FloatButton icon={action.icon} onClick={action.onClick} />
          </Tooltip>
        ))}
        <Tooltip title={t('navigation.help')} placement={isRtl ? 'right' : 'left'}>
          <FloatButton icon={<QuestionCircleOutlined />} />
        </Tooltip>
      </FloatButton.Group>

      {/* AI Chat Button */}
      {!hideAIButton && (
        <Tooltip title={t('ai.title')} placement={isRtl ? 'right' : 'left'}>
          <FloatButton
            icon={<RobotOutlined />}
            type={isAIChatOpen ? 'primary' : 'default'}
            onClick={toggleChat}
            style={{ bottom: 0 }}
            className="shadow-lg"
            badge={{ dot: true, color: 'gold' }}
          />
        </Tooltip>
      )}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default FAB;
