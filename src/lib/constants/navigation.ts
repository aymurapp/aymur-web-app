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
  ShoppingOutlined,
  TeamOutlined,
  ShopOutlined,
  ToolOutlined,
  CarOutlined,
  WalletOutlined,
  DollarOutlined,
  BarChartOutlined,
  RobotOutlined,
  SettingOutlined,
  AppstoreOutlined,
  TagsOutlined,
  GoldOutlined,
  DatabaseOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  TruckOutlined,
  CalendarOutlined,
  BankOutlined,
  PieChartOutlined,
  LineChartOutlined,
  SafetyOutlined,
  ApiOutlined,
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
        labelKey: 'navigation.inventory._label',
        icon: AppstoreOutlined,
        path: '/inventory',
        permission: PERMISSION_KEYS.INVENTORY_VIEW,
        children: [
          {
            key: 'inventory-items',
            labelKey: 'navigation.inventory.items',
            icon: ShoppingOutlined,
            path: '/inventory/items',
            permission: PERMISSION_KEYS.INVENTORY_VIEW,
          },
          {
            key: 'inventory-categories',
            labelKey: 'navigation.inventory.categories',
            icon: TagsOutlined,
            path: '/inventory/categories',
            permission: PERMISSION_KEYS.INVENTORY_VIEW,
          },
          {
            key: 'inventory-metals',
            labelKey: 'navigation.inventory.metals',
            icon: GoldOutlined,
            path: '/inventory/metals',
            permission: PERMISSION_KEYS.INVENTORY_VIEW,
          },
          {
            key: 'inventory-stones',
            labelKey: 'navigation.inventory.stones',
            icon: DatabaseOutlined,
            path: '/inventory/stones',
            permission: PERMISSION_KEYS.INVENTORY_VIEW,
          },
        ],
      },
      {
        key: 'sales',
        labelKey: 'navigation.sales._label',
        icon: ShoppingCartOutlined,
        path: '/sales',
        permission: PERMISSION_KEYS.SALES_VIEW,
        children: [
          {
            key: 'sales-transactions',
            labelKey: 'navigation.sales.transactions',
            icon: FileTextOutlined,
            path: '/sales/transactions',
            permission: PERMISSION_KEYS.SALES_VIEW,
          },
          {
            key: 'sales-customers',
            labelKey: 'navigation.sales.customers',
            icon: UserOutlined,
            path: '/sales/customers',
            permission: PERMISSION_KEYS.CUSTOMERS_VIEW,
          },
          {
            key: 'sales-payments',
            labelKey: 'navigation.sales.payments',
            icon: CreditCardOutlined,
            path: '/sales/payments',
            permission: PERMISSION_KEYS.SALES_VIEW,
          },
        ],
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
        labelKey: 'navigation.purchases._label',
        icon: ShopOutlined,
        path: '/purchases',
        permission: PERMISSION_KEYS.PURCHASES_VIEW,
        children: [
          {
            key: 'purchases-orders',
            labelKey: 'navigation.purchases.orders',
            icon: FileTextOutlined,
            path: '/purchases/orders',
            permission: PERMISSION_KEYS.PURCHASES_VIEW,
          },
          {
            key: 'purchases-suppliers',
            labelKey: 'navigation.purchases.suppliers',
            icon: TruckOutlined,
            path: '/purchases/suppliers',
            permission: PERMISSION_KEYS.SUPPLIERS_VIEW,
          },
          {
            key: 'purchases-payments',
            labelKey: 'navigation.purchases.payments',
            icon: CreditCardOutlined,
            path: '/purchases/payments',
            permission: PERMISSION_KEYS.SUPPLIERS_PAYMENTS,
          },
        ],
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
        labelKey: 'navigation.expenses._label',
        icon: WalletOutlined,
        path: '/expenses',
        permission: PERMISSION_KEYS.EXPENSES_VIEW,
        children: [
          {
            key: 'expenses-records',
            labelKey: 'navigation.expenses.records',
            icon: FileTextOutlined,
            path: '/expenses/records',
            permission: PERMISSION_KEYS.EXPENSES_VIEW,
          },
          {
            key: 'expenses-budgets',
            labelKey: 'navigation.expenses.budgets',
            icon: BankOutlined,
            path: '/expenses/budgets',
            permission: PERMISSION_KEYS.BUDGET_VIEW,
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // STAFF - Payroll management
  // ---------------------------------------------------------------------------
  {
    key: 'staff',
    labelKey: 'navigation.groups.staff',
    items: [
      {
        key: 'payroll',
        labelKey: 'navigation.payroll._label',
        icon: DollarOutlined,
        path: '/payroll',
        permission: PERMISSION_KEYS.PAYROLL_VIEW,
        children: [
          {
            key: 'payroll-periods',
            labelKey: 'navigation.payroll.periods',
            icon: CalendarOutlined,
            path: '/payroll/periods',
            permission: PERMISSION_KEYS.PAYROLL_VIEW,
          },
          {
            key: 'payroll-records',
            labelKey: 'navigation.payroll.records',
            icon: FileTextOutlined,
            path: '/payroll/records',
            permission: PERMISSION_KEYS.PAYROLL_VIEW,
          },
          {
            key: 'payroll-advances',
            labelKey: 'navigation.payroll.advances',
            icon: CreditCardOutlined,
            path: '/payroll/advances',
            permission: PERMISSION_KEYS.ADVANCES_APPROVE,
          },
        ],
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
        labelKey: 'navigation.analytics._label',
        icon: BarChartOutlined,
        path: '/analytics',
        permission: PERMISSION_KEYS.ANALYTICS_VIEW,
        children: [
          {
            key: 'analytics-dashboard',
            labelKey: 'navigation.analytics.dashboard',
            icon: PieChartOutlined,
            path: '/analytics/dashboard',
            permission: PERMISSION_KEYS.ANALYTICS_VIEW,
          },
          {
            key: 'analytics-reports',
            labelKey: 'navigation.analytics.reports',
            icon: LineChartOutlined,
            path: '/analytics/reports',
            permission: PERMISSION_KEYS.REPORTS_BASIC,
          },
        ],
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
            key: 'settings-shop',
            labelKey: 'navigation.settings.shop',
            icon: ShopOutlined,
            path: '/settings/shop',
            permission: PERMISSION_KEYS.SHOP_SETTINGS,
          },
          {
            key: 'settings-staff',
            labelKey: 'navigation.settings.staff',
            icon: TeamOutlined,
            path: '/settings/staff',
            permission: PERMISSION_KEYS.STAFF_VIEW,
          },
          {
            key: 'settings-roles',
            labelKey: 'navigation.settings.roles',
            icon: SafetyOutlined,
            path: '/settings/roles',
            permission: PERMISSION_KEYS.STAFF_MANAGE_ROLES,
          },
          {
            key: 'settings-integrations',
            labelKey: 'navigation.settings.integrations',
            icon: ApiOutlined,
            path: '/settings/integrations',
            permission: PERMISSION_KEYS.SETTINGS_MANAGE,
            badge: 'new',
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
