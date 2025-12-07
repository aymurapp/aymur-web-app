'use client';

/**
 * SidebarItem Component
 * Individual navigation item for the sidebar menu
 *
 * Features:
 * - Active state highlighting with gold accent
 * - Icon and label display
 * - Permission-based visibility
 * - RTL support using CSS logical properties
 * - Badge support (new, beta)
 */

import React from 'react';

import { Tag } from 'antd';
import { useTranslations } from 'next-intl';

import type { NavItem, NavBadge } from '@/lib/constants/navigation';
import { usePermissions } from '@/lib/hooks/permissions';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { useShopStore } from '@/stores/shopStore';

// =============================================================================
// TYPES
// =============================================================================

export interface SidebarItemProps {
  /** The navigation item configuration */
  item: NavItem;
  /** Whether the sidebar is collapsed */
  collapsed?: boolean;
  /** Callback when item is clicked (for mobile drawer close) */
  onClick?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Renders a badge for navigation items
 */
function NavBadgeTag({ badge }: { badge: NavBadge }): JSX.Element | null {
  if (badge === 'new') {
    return (
      <Tag color="gold" className="ms-2 text-[10px] px-1.5 py-0 leading-4">
        NEW
      </Tag>
    );
  }

  if (badge === 'beta') {
    return (
      <Tag color="blue" className="ms-2 text-[10px] px-1.5 py-0 leading-4">
        BETA
      </Tag>
    );
  }

  return null;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Individual sidebar navigation item
 *
 * Handles:
 * - Permission checking for visibility
 * - Active state based on current route
 * - Icon rendering
 * - Collapsed mode (icon only)
 *
 * @example
 * <SidebarItem
 *   item={{
 *     key: 'dashboard',
 *     labelKey: 'nav.dashboard',
 *     icon: DashboardOutlined,
 *     path: '/dashboard',
 *   }}
 *   collapsed={false}
 * />
 */
export function SidebarItem({
  item,
  collapsed = false,
  onClick,
}: SidebarItemProps): JSX.Element | null {
  const t = useTranslations();
  const pathname = usePathname();
  const { can } = usePermissions();
  const currentShopId = useShopStore((state) => state.currentShopId);

  // Check permission if required
  if (item.permission && !can(item.permission)) {
    return null;
  }

  // Build the full path with shopId
  const fullPath = currentShopId ? `/${currentShopId}${item.path}` : item.path;

  // Check if this item is active
  // Strip the locale and shopId from the pathname for comparison
  const pathWithoutContext = pathname
    .split('/')
    .filter((_segment, index) => index !== 0) // Remove first empty segment
    .slice(1) // Remove shopId
    .join('/');

  const itemPathClean = item.path.startsWith('/') ? item.path.slice(1) : item.path;
  const isActive =
    pathWithoutContext === itemPathClean ||
    (itemPathClean && pathWithoutContext.startsWith(itemPathClean + '/'));

  // Get the translated label
  const label = t(item.labelKey);

  // Render the icon
  const IconComponent = item.icon;

  return (
    <Link
      href={fullPath}
      onClick={onClick}
      className={`
        group
        flex items-center
        ${collapsed ? 'justify-center px-3' : 'justify-start px-4'}
        py-3
        rounded-lg
        transition-all duration-200
        ${
          isActive
            ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
            : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
        }
      `}
      title={collapsed ? label : undefined}
    >
      {/* Icon */}
      <span
        className={`
          flex-shrink-0
          text-lg
          ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500 dark:text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-300'}
        `}
      >
        <IconComponent />
      </span>

      {/* Label (hidden when collapsed) */}
      {!collapsed && <span className="ms-3 truncate flex-1 text-sm font-medium">{label}</span>}

      {/* Badge (hidden when collapsed) */}
      {!collapsed && item.badge && <NavBadgeTag badge={item.badge} />}

      {/* Active indicator */}
      {isActive && (
        <span
          className={`
            absolute
            ${collapsed ? 'start-0' : 'start-0'}
            top-1/2
            -translate-y-1/2
            w-1
            h-6
            bg-amber-500
            rounded-e-full
          `}
        />
      )}
    </Link>
  );
}

export default SidebarItem;
