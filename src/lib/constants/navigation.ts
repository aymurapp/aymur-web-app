/**
 * Navigation Configuration
 * Centralized navigation structure for the Aymur Platform
 *
 * This configuration defines:
 * - Navigation items with i18n keys
 * - Permission requirements for each item
 * - Icon mappings using Ant Design icons
 * - Hierarchical menu structure
 */

import type { ComponentType } from 'react';

import {
  DashboardOutlined,
  TeamOutlined,
  ShopOutlined,
  ToolOutlined,
  CarOutlined,
  WalletOutlined,
  BarChartOutlined,
  RobotOutlined,
  SettingOutlined,
  AppstoreOutlined,
  TagsOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  TruckOutlined,
  LineChartOutlined,
  SafetyOutlined,
} from '@ant-design/icons';

import { PERMISSION_KEYS } from './permissions';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Badge types for navigation items
 */
export type NavBadge = 'new' | 'beta';

/**
 * Navigation item configuration
 */
export interface NavItem {
  /** Unique identifier for the navigation item */
  key: string;
  /** i18n translation key (e.g., 'navigation.dashboard') */
  labelKey: string;
  /** Ant Design icon component */
  icon: ComponentType;
  /** Route path (relative to /{locale}/{shopId}) */
  path: string;
  /** Required permission key to view this item */
  permission?: string;
  /** Child navigation items for submenus */
  children?: NavItem[];
  /** Optional badge to display */
  badge?: NavBadge;
  /** Whether this item opens in a new tab */
  external?: boolean;
}

/**
 * Navigation group containing related items
 */
export interface NavGroup {
  /** Unique identifier for the group */
  key: string;
  /** i18n translation key for group label */
  labelKey: string;
  /** Navigation items in this group */
  items: NavItem[];
}

// =============================================================================
// NAVIGATION CONFIGURATION
// =============================================================================

/**
 * Main navigation configuration
 * Organized by business domain following jewelry shop operations
 */
export const navigationConfig: NavGroup[] = [
  // ---------------------------------------------------------------------------
  // MAIN - Dashboard and overview
  // ---------------------------------------------------------------------------
  {
    key: 'main',
    labelKey: 'navigation.groups.main',
    items: [
      {
        key: 'dashboard',
        labelKey: 'navigation.dashboard',
        icon: DashboardOutlined,
        path: '/dashboard',
        // Dashboard is visible to everyone with shop access
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // COMMERCE - Inventory and Sales
  // ---------------------------------------------------------------------------
  {
    key: 'commerce',
    labelKey: 'navigation.groups.commerce',
    items: [
      {
        key: 'inventory',
        labelKey: 'navigation.inventory',
        icon: AppstoreOutlined,
        path: '/inventory',
        permission: PERMISSION_KEYS.INVENTORY_VIEW,
        // Note: Categories, metals, stones are managed in Settings > Catalog
      },
      {
        key: 'sales',
        labelKey: 'navigation.sales',
        icon: ShoppingCartOutlined,
        path: '/sales',
        permission: PERMISSION_KEYS.SALES_VIEW,
      },
      {
        key: 'customers',
        labelKey: 'navigation.customers',
        icon: UserOutlined,
        path: '/customers',
        permission: PERMISSION_KEYS.CUSTOMERS_VIEW,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // OPERATIONS - Purchases, Workshops, Deliveries, Expenses
  // ---------------------------------------------------------------------------
  {
    key: 'operations',
    labelKey: 'navigation.groups.operations',
    items: [
      {
        key: 'purchases',
        labelKey: 'navigation.purchases',
        icon: ShopOutlined,
        path: '/purchases',
        permission: PERMISSION_KEYS.PURCHASES_VIEW,
      },
      {
        key: 'suppliers',
        labelKey: 'navigation.suppliers',
        icon: TruckOutlined,
        path: '/suppliers',
        permission: PERMISSION_KEYS.SUPPLIERS_VIEW,
      },
      {
        key: 'workshops',
        labelKey: 'navigation.workshops',
        icon: ToolOutlined,
        path: '/workshops',
        permission: PERMISSION_KEYS.WORKSHOPS_VIEW,
      },
      {
        key: 'deliveries',
        labelKey: 'navigation.deliveries',
        icon: CarOutlined,
        path: '/deliveries',
        permission: PERMISSION_KEYS.DELIVERIES_VIEW,
      },
      {
        key: 'expenses',
        labelKey: 'navigation.expenses',
        icon: WalletOutlined,
        path: '/expenses',
        permission: PERMISSION_KEYS.EXPENSES_VIEW,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // INSIGHTS - Analytics and AI
  // ---------------------------------------------------------------------------
  {
    key: 'insights',
    labelKey: 'navigation.groups.insights',
    items: [
      {
        key: 'analytics',
        labelKey: 'navigation.analytics',
        icon: BarChartOutlined,
        path: '/analytics',
        permission: PERMISSION_KEYS.ANALYTICS_VIEW,
      },
      {
        key: 'reports',
        labelKey: 'navigation.reports',
        icon: LineChartOutlined,
        path: '/reports',
        permission: PERMISSION_KEYS.REPORTS_BASIC,
      },
      {
        key: 'ai-assistant',
        labelKey: 'navigation.aiAssistant',
        icon: RobotOutlined,
        path: '/ai',
        permission: PERMISSION_KEYS.AI_USE,
        badge: 'beta',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ADMIN - Settings and configuration
  // ---------------------------------------------------------------------------
  {
    key: 'admin',
    labelKey: 'navigation.groups.admin',
    items: [
      {
        key: 'settings',
        labelKey: 'navigation.settings._label',
        icon: SettingOutlined,
        path: '/settings',
        permission: PERMISSION_KEYS.SETTINGS_VIEW,
        children: [
          {
            key: 'settings-general',
            labelKey: 'navigation.settings.general',
            icon: ShopOutlined,
            path: '/settings/general',
            permission: PERMISSION_KEYS.SHOP_SETTINGS,
          },
          {
            key: 'settings-catalog',
            labelKey: 'navigation.settings.catalog',
            icon: TagsOutlined,
            path: '/settings/catalog',
            permission: PERMISSION_KEYS.INVENTORY_VIEW,
          },
          {
            key: 'settings-team',
            labelKey: 'navigation.settings.team',
            icon: TeamOutlined,
            path: '/settings/team',
            permission: PERMISSION_KEYS.STAFF_VIEW,
          },
          {
            key: 'settings-roles',
            labelKey: 'navigation.settings.roles',
            icon: SafetyOutlined,
            path: '/settings/roles',
            permission: PERMISSION_KEYS.STAFF_MANAGE_ROLES,
          },
        ],
      },
    ],
  },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Flatten navigation config into a single array of items
 * Useful for searching or iterating over all items
 */
export function flattenNavItems(groups: NavGroup[] = navigationConfig): NavItem[] {
  const items: NavItem[] = [];

  for (const group of groups) {
    for (const item of group.items) {
      items.push(item);
      if (item.children) {
        items.push(...item.children);
      }
    }
  }

  return items;
}

/**
 * Find a navigation item by its path
 */
export function findNavItemByPath(
  path: string,
  groups: NavGroup[] = navigationConfig
): NavItem | undefined {
  const items = flattenNavItems(groups);
  return items.find((item) => item.path === path);
}

/**
 * Find a navigation item by its key
 */
export function findNavItemByKey(
  key: string,
  groups: NavGroup[] = navigationConfig
): NavItem | undefined {
  const items = flattenNavItems(groups);
  return items.find((item) => item.key === key);
}

/**
 * Get the parent item for a child item (if exists)
 */
export function findParentNavItem(
  childKey: string,
  groups: NavGroup[] = navigationConfig
): NavItem | undefined {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.children?.some((child) => child.key === childKey)) {
        return item;
      }
    }
  }
  return undefined;
}

/**
 * Get breadcrumb trail for a given path
 * Returns array of nav items from root to current
 */
export function getBreadcrumbTrail(path: string, groups: NavGroup[] = navigationConfig): NavItem[] {
  const trail: NavItem[] = [];

  for (const group of groups) {
    for (const item of group.items) {
      // Check if this item matches
      if (item.path === path) {
        trail.push(item);
        return trail;
      }

      // Check children
      if (item.children) {
        for (const child of item.children) {
          if (child.path === path) {
            trail.push(item);
            trail.push(child);
            return trail;
          }
        }
      }
    }
  }

  return trail;
}

/**
 * Navigation path to key mapping
 * Used for determining active menu items from URL
 */
export const pathToKeyMap: Record<string, string> = flattenNavItems().reduce(
  (acc, item) => {
    acc[item.path] = item.key;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Get the navigation key for a given path
 * Handles partial path matching for nested routes
 */
export function getNavKeyFromPath(path: string): string | undefined {
  // First try exact match
  if (pathToKeyMap[path]) {
    return pathToKeyMap[path];
  }

  // Try to find the closest parent path
  const pathParts = path.split('/').filter(Boolean);
  while (pathParts.length > 0) {
    const testPath = '/' + pathParts.join('/');
    if (pathToKeyMap[testPath]) {
      return pathToKeyMap[testPath];
    }
    pathParts.pop();
  }

  return undefined;
}

/**
 * Get open keys for sidebar (parent items that should be expanded)
 */
export function getOpenKeysForPath(path: string, groups: NavGroup[] = navigationConfig): string[] {
  const openKeys: string[] = [];

  for (const group of groups) {
    for (const item of group.items) {
      if (item.children) {
        const matchesChild = item.children.some((child) => path.startsWith(child.path));
        if (matchesChild || path.startsWith(item.path)) {
          openKeys.push(item.key);
        }
      }
    }
  }

  return openKeys;
}
