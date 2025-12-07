'use client';

/**
 * SidebarNav Component
 * Navigation menu for the sidebar with grouped items
 *
 * Features:
 * - Grouped navigation items
 * - Collapsible submenu support
 * - Permission-based filtering
 * - Active state tracking
 * - RTL support
 */

import React, { useState, useMemo, useEffect } from 'react';

import { Menu } from 'antd';
import { useTranslations } from 'next-intl';

import {
  navigationConfig,
  getNavKeyFromPath,
  getOpenKeysForPath,
  type NavGroup,
  type NavItem,
} from '@/lib/constants/navigation';
import { usePermissions } from '@/lib/hooks/permissions';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { useShopStore } from '@/stores/shopStore';

import type { MenuProps } from 'antd';

// =============================================================================
// TYPES
// =============================================================================

export interface SidebarNavProps {
  /** Whether the sidebar is collapsed */
  collapsed?: boolean;
  /** Callback when a menu item is clicked (for mobile drawer close) */
  onItemClick?: () => void;
  /** Additional CSS class name */
  className?: string;
}

type MenuItem = Required<MenuProps>['items'][number];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Sidebar navigation component using Ant Design Menu
 *
 * Renders navigation groups with their items, handling:
 * - Permission filtering
 * - Submenu expansion
 * - Active state tracking
 * - Collapsed mode
 *
 * @example
 * <SidebarNav collapsed={false} onItemClick={handleClose} />
 */
export function SidebarNav({
  collapsed = false,
  onItemClick,
  className,
}: SidebarNavProps): JSX.Element {
  const t = useTranslations();
  const pathname = usePathname();
  const { can } = usePermissions();
  const currentShopId = useShopStore((state) => state.currentShopId);

  // Track open submenu keys
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // Get current path relative to shop context
  // pathname format: /shopId/inventory/items -> /inventory/items
  const relativePath = useMemo(() => {
    if (!currentShopId) {
      return pathname;
    }
    const segments = pathname.split('/');
    // Remove shopId segment
    const pathWithoutShopId = segments.slice(2).join('/');
    return '/' + pathWithoutShopId;
  }, [pathname, currentShopId]);

  // Get the active menu key
  const selectedKey = useMemo(() => {
    return getNavKeyFromPath(relativePath) ?? '';
  }, [relativePath]);

  // Set initial open keys based on current path
  useEffect(() => {
    if (!collapsed) {
      const keys = getOpenKeysForPath(relativePath);
      setOpenKeys(keys);
    }
  }, [relativePath, collapsed]);

  // Handle submenu open/close
  const handleOpenChange = (keys: string[]) => {
    if (!collapsed) {
      setOpenKeys(keys);
    }
  };

  /**
   * Filter items based on permissions
   */
  const filterByPermission = (items: NavItem[]): NavItem[] => {
    return items.filter((item) => {
      if (!item.permission) {
        return true;
      }
      return can(item.permission);
    });
  };

  /**
   * Convert NavItem to Ant Design MenuItem
   */
  const convertToMenuItem = (item: NavItem): MenuItem => {
    const IconComponent = item.icon;
    const fullPath = currentShopId ? `/${currentShopId}${item.path}` : item.path;

    // Filter children by permission
    const visibleChildren = item.children ? filterByPermission(item.children) : undefined;

    // If this item has children, render as SubMenu
    if (visibleChildren && visibleChildren.length > 0) {
      return {
        key: item.key,
        icon: <IconComponent />,
        label: t(item.labelKey),
        children: visibleChildren.map(convertToMenuItem),
      };
    }

    // Render as regular menu item with Link
    return {
      key: item.key,
      icon: <IconComponent />,
      label: (
        <Link href={fullPath} onClick={onItemClick}>
          {t(item.labelKey)}
          {item.badge === 'new' && (
            <span className="ms-2 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded dark:bg-amber-900/30 dark:text-amber-400">
              NEW
            </span>
          )}
          {item.badge === 'beta' && (
            <span className="ms-2 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded dark:bg-blue-900/30 dark:text-blue-400">
              BETA
            </span>
          )}
        </Link>
      ),
    };
  };

  /**
   * Build menu items from navigation config
   */
  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [];

    navigationConfig.forEach((group: NavGroup) => {
      // Filter items in this group by permission
      const visibleItems = filterByPermission(group.items);

      if (visibleItems.length === 0) {
        return;
      }

      // Add group label (only if not collapsed)
      if (!collapsed) {
        items.push({
          key: `group-${group.key}`,
          type: 'group',
          label: (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              {t(group.labelKey)}
            </span>
          ),
          children: visibleItems.map(convertToMenuItem),
        });
      } else {
        // In collapsed mode, add items directly without group
        visibleItems.forEach((item) => {
          items.push(convertToMenuItem(item));
        });
      }
    });

    return items;
  }, [collapsed, currentShopId, t, can]);

  return (
    <Menu
      mode="inline"
      theme="light"
      inlineCollapsed={collapsed}
      selectedKeys={[selectedKey]}
      openKeys={collapsed ? [] : openKeys}
      onOpenChange={handleOpenChange}
      items={menuItems}
      className={`
        border-none
        bg-transparent
        ${className ?? ''}
      `}
      style={{
        borderInlineEnd: 'none',
      }}
    />
  );
}

export default SidebarNav;
