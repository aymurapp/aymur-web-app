/**
 * Permission Keys
 * Based on the DB shop_access.permissions JSONB structure
 * Matches the permission system defined in the database documentation
 */

// =============================================================================
// PERMISSION KEY CONSTANTS
// =============================================================================

/**
 * All available permission keys in the system
 * These match the JSONB structure stored in shop_access.permissions
 */
export const PERMISSION_KEYS = {
  // Inventory Permissions
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_MANAGE: 'inventory.manage',
  INVENTORY_DELETE: 'inventory.delete',
  INVENTORY_TRANSFER: 'inventory.transfer',

  // Sales Permissions
  SALES_VIEW: 'sales.view',
  SALES_CREATE: 'sales.create',
  SALES_EDIT: 'sales.edit',
  SALES_VOID: 'sales.void',
  SALES_DISCOUNT: 'sales.discount',
  SALES_REFUND: 'sales.refund',

  // Customer Permissions
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_MANAGE: 'customers.manage',
  CUSTOMERS_DELETE: 'customers.delete',
  CUSTOMERS_CREDIT: 'customers.credit',

  // Supplier Permissions
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_MANAGE: 'suppliers.manage',
  SUPPLIERS_DELETE: 'suppliers.delete',
  SUPPLIERS_PAYMENTS: 'suppliers.payments',

  // Purchase Permissions
  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_CREATE: 'purchases.create',
  PURCHASES_EDIT: 'purchases.edit',
  PURCHASES_DELETE: 'purchases.delete',

  // Expense Permissions
  EXPENSES_VIEW: 'expenses.view',
  EXPENSES_CREATE: 'expenses.create',
  EXPENSES_APPROVE: 'expenses.approve',
  EXPENSES_DELETE: 'expenses.delete',

  // Workshop Permissions
  WORKSHOPS_VIEW: 'workshops.view',
  WORKSHOPS_MANAGE: 'workshops.manage',
  WORKSHOPS_ORDERS: 'workshops.orders',
  WORKSHOPS_PAYMENTS: 'workshops.payments',

  // Delivery Permissions
  DELIVERIES_VIEW: 'deliveries.view',
  DELIVERIES_MANAGE: 'deliveries.manage',
  COURIERS_MANAGE: 'couriers.manage',

  // Payroll Permissions
  PAYROLL_VIEW: 'payroll.view',
  PAYROLL_MANAGE: 'payroll.manage',
  SALARY_APPROVE: 'salary.approve',
  ADVANCES_APPROVE: 'advances.approve',

  // Staff Management Permissions
  STAFF_VIEW: 'staff.view',
  STAFF_MANAGE: 'staff.manage',
  STAFF_MANAGE_ROLES: 'staff.manage_roles',
  STAFF_INVITE: 'staff.invite',
  STAFF_REMOVE: 'staff.remove',

  // Analytics & Reports Permissions
  ANALYTICS_VIEW: 'analytics.view',
  REPORTS_BASIC: 'reports.basic',
  REPORTS_FINANCIAL: 'reports.financial',
  REPORTS_EXPORT: 'reports.export',

  // Settings Permissions
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',
  SHOP_SETTINGS: 'shop.settings',

  // AI Permissions
  AI_USE: 'ai.use',
  AI_APPROVE_OPERATIONS: 'ai.approve_operations',

  // Tax Permissions
  TAX_VIEW: 'tax.view',
  TAX_MANAGE: 'tax.manage',

  // Budget Permissions
  BUDGET_VIEW: 'budget.view',
  BUDGET_MANAGE: 'budget.manage',

  // Payment Reminders Permissions
  REMINDERS_VIEW: 'reminders.view',
  REMINDERS_CREATE: 'reminders.create',
  REMINDERS_UPDATE: 'reminders.update',
  REMINDERS_DELETE: 'reminders.delete',
} as const;

/**
 * Type for permission keys
 */
export type PermissionKey = (typeof PERMISSION_KEYS)[keyof typeof PERMISSION_KEYS];

// =============================================================================
// PERMISSION GROUPS
// =============================================================================

/**
 * Permissions grouped by domain for easier management
 */
export const PERMISSION_GROUPS = {
  inventory: [
    PERMISSION_KEYS.INVENTORY_VIEW,
    PERMISSION_KEYS.INVENTORY_MANAGE,
    PERMISSION_KEYS.INVENTORY_DELETE,
    PERMISSION_KEYS.INVENTORY_TRANSFER,
  ],
  sales: [
    PERMISSION_KEYS.SALES_VIEW,
    PERMISSION_KEYS.SALES_CREATE,
    PERMISSION_KEYS.SALES_EDIT,
    PERMISSION_KEYS.SALES_VOID,
    PERMISSION_KEYS.SALES_DISCOUNT,
    PERMISSION_KEYS.SALES_REFUND,
  ],
  customers: [
    PERMISSION_KEYS.CUSTOMERS_VIEW,
    PERMISSION_KEYS.CUSTOMERS_MANAGE,
    PERMISSION_KEYS.CUSTOMERS_DELETE,
    PERMISSION_KEYS.CUSTOMERS_CREDIT,
  ],
  suppliers: [
    PERMISSION_KEYS.SUPPLIERS_VIEW,
    PERMISSION_KEYS.SUPPLIERS_MANAGE,
    PERMISSION_KEYS.SUPPLIERS_DELETE,
    PERMISSION_KEYS.SUPPLIERS_PAYMENTS,
  ],
  purchases: [
    PERMISSION_KEYS.PURCHASES_VIEW,
    PERMISSION_KEYS.PURCHASES_CREATE,
    PERMISSION_KEYS.PURCHASES_EDIT,
    PERMISSION_KEYS.PURCHASES_DELETE,
  ],
  expenses: [
    PERMISSION_KEYS.EXPENSES_VIEW,
    PERMISSION_KEYS.EXPENSES_CREATE,
    PERMISSION_KEYS.EXPENSES_APPROVE,
    PERMISSION_KEYS.EXPENSES_DELETE,
  ],
  workshops: [
    PERMISSION_KEYS.WORKSHOPS_VIEW,
    PERMISSION_KEYS.WORKSHOPS_MANAGE,
    PERMISSION_KEYS.WORKSHOPS_ORDERS,
    PERMISSION_KEYS.WORKSHOPS_PAYMENTS,
  ],
  deliveries: [
    PERMISSION_KEYS.DELIVERIES_VIEW,
    PERMISSION_KEYS.DELIVERIES_MANAGE,
    PERMISSION_KEYS.COURIERS_MANAGE,
  ],
  payroll: [
    PERMISSION_KEYS.PAYROLL_VIEW,
    PERMISSION_KEYS.PAYROLL_MANAGE,
    PERMISSION_KEYS.SALARY_APPROVE,
    PERMISSION_KEYS.ADVANCES_APPROVE,
  ],
  staff: [
    PERMISSION_KEYS.STAFF_VIEW,
    PERMISSION_KEYS.STAFF_MANAGE,
    PERMISSION_KEYS.STAFF_MANAGE_ROLES,
    PERMISSION_KEYS.STAFF_INVITE,
    PERMISSION_KEYS.STAFF_REMOVE,
  ],
  analytics: [
    PERMISSION_KEYS.ANALYTICS_VIEW,
    PERMISSION_KEYS.REPORTS_BASIC,
    PERMISSION_KEYS.REPORTS_FINANCIAL,
    PERMISSION_KEYS.REPORTS_EXPORT,
  ],
  settings: [
    PERMISSION_KEYS.SETTINGS_VIEW,
    PERMISSION_KEYS.SETTINGS_MANAGE,
    PERMISSION_KEYS.SHOP_SETTINGS,
  ],
  ai: [PERMISSION_KEYS.AI_USE, PERMISSION_KEYS.AI_APPROVE_OPERATIONS],
  tax: [PERMISSION_KEYS.TAX_VIEW, PERMISSION_KEYS.TAX_MANAGE],
  budget: [PERMISSION_KEYS.BUDGET_VIEW, PERMISSION_KEYS.BUDGET_MANAGE],
  reminders: [
    PERMISSION_KEYS.REMINDERS_VIEW,
    PERMISSION_KEYS.REMINDERS_CREATE,
    PERMISSION_KEYS.REMINDERS_UPDATE,
    PERMISSION_KEYS.REMINDERS_DELETE,
  ],
} as const;

// =============================================================================
// ROLE TYPES
// =============================================================================

/**
 * Available roles in the system (matches database roles table)
 */
export const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  FINANCE: 'finance',
  STAFF: 'staff',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/**
 * Role hierarchy levels (lower number = higher privileges)
 */
export const ROLE_HIERARCHY: Record<RoleName, number> = {
  [ROLES.OWNER]: 1,
  [ROLES.MANAGER]: 2,
  [ROLES.FINANCE]: 3,
  [ROLES.STAFF]: 4,
} as const;

// =============================================================================
// DEFAULT PERMISSIONS BY ROLE
// =============================================================================

/**
 * Default permissions for Owner role (full access)
 */
export const OWNER_DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  // Inventory - Full access
  [PERMISSION_KEYS.INVENTORY_VIEW]: true,
  [PERMISSION_KEYS.INVENTORY_MANAGE]: true,
  [PERMISSION_KEYS.INVENTORY_DELETE]: true,
  [PERMISSION_KEYS.INVENTORY_TRANSFER]: true,

  // Sales - Full access
  [PERMISSION_KEYS.SALES_VIEW]: true,
  [PERMISSION_KEYS.SALES_CREATE]: true,
  [PERMISSION_KEYS.SALES_EDIT]: true,
  [PERMISSION_KEYS.SALES_VOID]: true,
  [PERMISSION_KEYS.SALES_DISCOUNT]: true,
  [PERMISSION_KEYS.SALES_REFUND]: true,

  // Customers - Full access
  [PERMISSION_KEYS.CUSTOMERS_VIEW]: true,
  [PERMISSION_KEYS.CUSTOMERS_MANAGE]: true,
  [PERMISSION_KEYS.CUSTOMERS_DELETE]: true,
  [PERMISSION_KEYS.CUSTOMERS_CREDIT]: true,

  // Suppliers - Full access
  [PERMISSION_KEYS.SUPPLIERS_VIEW]: true,
  [PERMISSION_KEYS.SUPPLIERS_MANAGE]: true,
  [PERMISSION_KEYS.SUPPLIERS_DELETE]: true,
  [PERMISSION_KEYS.SUPPLIERS_PAYMENTS]: true,

  // Purchases - Full access
  [PERMISSION_KEYS.PURCHASES_VIEW]: true,
  [PERMISSION_KEYS.PURCHASES_CREATE]: true,
  [PERMISSION_KEYS.PURCHASES_EDIT]: true,
  [PERMISSION_KEYS.PURCHASES_DELETE]: true,

  // Expenses - Full access
  [PERMISSION_KEYS.EXPENSES_VIEW]: true,
  [PERMISSION_KEYS.EXPENSES_CREATE]: true,
  [PERMISSION_KEYS.EXPENSES_APPROVE]: true,
  [PERMISSION_KEYS.EXPENSES_DELETE]: true,

  // Workshops - Full access
  [PERMISSION_KEYS.WORKSHOPS_VIEW]: true,
  [PERMISSION_KEYS.WORKSHOPS_MANAGE]: true,
  [PERMISSION_KEYS.WORKSHOPS_ORDERS]: true,
  [PERMISSION_KEYS.WORKSHOPS_PAYMENTS]: true,

  // Deliveries - Full access
  [PERMISSION_KEYS.DELIVERIES_VIEW]: true,
  [PERMISSION_KEYS.DELIVERIES_MANAGE]: true,
  [PERMISSION_KEYS.COURIERS_MANAGE]: true,

  // Payroll - Full access
  [PERMISSION_KEYS.PAYROLL_VIEW]: true,
  [PERMISSION_KEYS.PAYROLL_MANAGE]: true,
  [PERMISSION_KEYS.SALARY_APPROVE]: true,
  [PERMISSION_KEYS.ADVANCES_APPROVE]: true,

  // Staff - Full access
  [PERMISSION_KEYS.STAFF_VIEW]: true,
  [PERMISSION_KEYS.STAFF_MANAGE]: true,
  [PERMISSION_KEYS.STAFF_MANAGE_ROLES]: true,
  [PERMISSION_KEYS.STAFF_INVITE]: true,
  [PERMISSION_KEYS.STAFF_REMOVE]: true,

  // Analytics - Full access
  [PERMISSION_KEYS.ANALYTICS_VIEW]: true,
  [PERMISSION_KEYS.REPORTS_BASIC]: true,
  [PERMISSION_KEYS.REPORTS_FINANCIAL]: true,
  [PERMISSION_KEYS.REPORTS_EXPORT]: true,

  // Settings - Full access
  [PERMISSION_KEYS.SETTINGS_VIEW]: true,
  [PERMISSION_KEYS.SETTINGS_MANAGE]: true,
  [PERMISSION_KEYS.SHOP_SETTINGS]: true,

  // AI - Full access
  [PERMISSION_KEYS.AI_USE]: true,
  [PERMISSION_KEYS.AI_APPROVE_OPERATIONS]: true,

  // Tax - Full access
  [PERMISSION_KEYS.TAX_VIEW]: true,
  [PERMISSION_KEYS.TAX_MANAGE]: true,

  // Budget - Full access
  [PERMISSION_KEYS.BUDGET_VIEW]: true,
  [PERMISSION_KEYS.BUDGET_MANAGE]: true,

  // Reminders - Full access
  [PERMISSION_KEYS.REMINDERS_VIEW]: true,
  [PERMISSION_KEYS.REMINDERS_CREATE]: true,
  [PERMISSION_KEYS.REMINDERS_UPDATE]: true,
  [PERMISSION_KEYS.REMINDERS_DELETE]: true,
};

/**
 * Default permissions for Manager role
 */
export const MANAGER_DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  ...OWNER_DEFAULT_PERMISSIONS,
  // Restricted permissions for Manager
  [PERMISSION_KEYS.STAFF_MANAGE_ROLES]: false,
  [PERMISSION_KEYS.STAFF_REMOVE]: false,
  [PERMISSION_KEYS.SHOP_SETTINGS]: false,
  [PERMISSION_KEYS.AI_APPROVE_OPERATIONS]: false,
};

/**
 * Default permissions for Finance role
 */
export const FINANCE_DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  // Inventory - View only
  [PERMISSION_KEYS.INVENTORY_VIEW]: true,
  [PERMISSION_KEYS.INVENTORY_MANAGE]: false,
  [PERMISSION_KEYS.INVENTORY_DELETE]: false,
  [PERMISSION_KEYS.INVENTORY_TRANSFER]: false,

  // Sales - View and basic access
  [PERMISSION_KEYS.SALES_VIEW]: true,
  [PERMISSION_KEYS.SALES_CREATE]: false,
  [PERMISSION_KEYS.SALES_EDIT]: false,
  [PERMISSION_KEYS.SALES_VOID]: false,
  [PERMISSION_KEYS.SALES_DISCOUNT]: false,
  [PERMISSION_KEYS.SALES_REFUND]: false,

  // Customers - View and credit management
  [PERMISSION_KEYS.CUSTOMERS_VIEW]: true,
  [PERMISSION_KEYS.CUSTOMERS_MANAGE]: false,
  [PERMISSION_KEYS.CUSTOMERS_DELETE]: false,
  [PERMISSION_KEYS.CUSTOMERS_CREDIT]: true,

  // Suppliers - Full access for payments
  [PERMISSION_KEYS.SUPPLIERS_VIEW]: true,
  [PERMISSION_KEYS.SUPPLIERS_MANAGE]: true,
  [PERMISSION_KEYS.SUPPLIERS_DELETE]: false,
  [PERMISSION_KEYS.SUPPLIERS_PAYMENTS]: true,

  // Purchases - View and create
  [PERMISSION_KEYS.PURCHASES_VIEW]: true,
  [PERMISSION_KEYS.PURCHASES_CREATE]: true,
  [PERMISSION_KEYS.PURCHASES_EDIT]: true,
  [PERMISSION_KEYS.PURCHASES_DELETE]: false,

  // Expenses - Full access
  [PERMISSION_KEYS.EXPENSES_VIEW]: true,
  [PERMISSION_KEYS.EXPENSES_CREATE]: true,
  [PERMISSION_KEYS.EXPENSES_APPROVE]: true,
  [PERMISSION_KEYS.EXPENSES_DELETE]: false,

  // Workshops - View and payments
  [PERMISSION_KEYS.WORKSHOPS_VIEW]: true,
  [PERMISSION_KEYS.WORKSHOPS_MANAGE]: false,
  [PERMISSION_KEYS.WORKSHOPS_ORDERS]: false,
  [PERMISSION_KEYS.WORKSHOPS_PAYMENTS]: true,

  // Deliveries - View only
  [PERMISSION_KEYS.DELIVERIES_VIEW]: true,
  [PERMISSION_KEYS.DELIVERIES_MANAGE]: false,
  [PERMISSION_KEYS.COURIERS_MANAGE]: false,

  // Payroll - Full access
  [PERMISSION_KEYS.PAYROLL_VIEW]: true,
  [PERMISSION_KEYS.PAYROLL_MANAGE]: true,
  [PERMISSION_KEYS.SALARY_APPROVE]: true,
  [PERMISSION_KEYS.ADVANCES_APPROVE]: true,

  // Staff - View only
  [PERMISSION_KEYS.STAFF_VIEW]: true,
  [PERMISSION_KEYS.STAFF_MANAGE]: false,
  [PERMISSION_KEYS.STAFF_MANAGE_ROLES]: false,
  [PERMISSION_KEYS.STAFF_INVITE]: false,
  [PERMISSION_KEYS.STAFF_REMOVE]: false,

  // Analytics - Full financial access
  [PERMISSION_KEYS.ANALYTICS_VIEW]: true,
  [PERMISSION_KEYS.REPORTS_BASIC]: true,
  [PERMISSION_KEYS.REPORTS_FINANCIAL]: true,
  [PERMISSION_KEYS.REPORTS_EXPORT]: true,

  // Settings - View only
  [PERMISSION_KEYS.SETTINGS_VIEW]: true,
  [PERMISSION_KEYS.SETTINGS_MANAGE]: false,
  [PERMISSION_KEYS.SHOP_SETTINGS]: false,

  // AI - Basic use
  [PERMISSION_KEYS.AI_USE]: true,
  [PERMISSION_KEYS.AI_APPROVE_OPERATIONS]: false,

  // Tax - Full access
  [PERMISSION_KEYS.TAX_VIEW]: true,
  [PERMISSION_KEYS.TAX_MANAGE]: true,

  // Budget - Full access
  [PERMISSION_KEYS.BUDGET_VIEW]: true,
  [PERMISSION_KEYS.BUDGET_MANAGE]: true,

  // Reminders - Full access for finance
  [PERMISSION_KEYS.REMINDERS_VIEW]: true,
  [PERMISSION_KEYS.REMINDERS_CREATE]: true,
  [PERMISSION_KEYS.REMINDERS_UPDATE]: true,
  [PERMISSION_KEYS.REMINDERS_DELETE]: true,
};

/**
 * Default permissions for Staff role (most restricted)
 */
export const STAFF_DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  // Inventory - View and basic manage
  [PERMISSION_KEYS.INVENTORY_VIEW]: true,
  [PERMISSION_KEYS.INVENTORY_MANAGE]: true,
  [PERMISSION_KEYS.INVENTORY_DELETE]: false,
  [PERMISSION_KEYS.INVENTORY_TRANSFER]: false,

  // Sales - Create and basic operations
  [PERMISSION_KEYS.SALES_VIEW]: true,
  [PERMISSION_KEYS.SALES_CREATE]: true,
  [PERMISSION_KEYS.SALES_EDIT]: false,
  [PERMISSION_KEYS.SALES_VOID]: false,
  [PERMISSION_KEYS.SALES_DISCOUNT]: false,
  [PERMISSION_KEYS.SALES_REFUND]: false,

  // Customers - View and basic manage
  [PERMISSION_KEYS.CUSTOMERS_VIEW]: true,
  [PERMISSION_KEYS.CUSTOMERS_MANAGE]: true,
  [PERMISSION_KEYS.CUSTOMERS_DELETE]: false,
  [PERMISSION_KEYS.CUSTOMERS_CREDIT]: false,

  // Suppliers - View only
  [PERMISSION_KEYS.SUPPLIERS_VIEW]: true,
  [PERMISSION_KEYS.SUPPLIERS_MANAGE]: false,
  [PERMISSION_KEYS.SUPPLIERS_DELETE]: false,
  [PERMISSION_KEYS.SUPPLIERS_PAYMENTS]: false,

  // Purchases - View only
  [PERMISSION_KEYS.PURCHASES_VIEW]: true,
  [PERMISSION_KEYS.PURCHASES_CREATE]: false,
  [PERMISSION_KEYS.PURCHASES_EDIT]: false,
  [PERMISSION_KEYS.PURCHASES_DELETE]: false,

  // Expenses - No access
  [PERMISSION_KEYS.EXPENSES_VIEW]: false,
  [PERMISSION_KEYS.EXPENSES_CREATE]: false,
  [PERMISSION_KEYS.EXPENSES_APPROVE]: false,
  [PERMISSION_KEYS.EXPENSES_DELETE]: false,

  // Workshops - View and basic orders
  [PERMISSION_KEYS.WORKSHOPS_VIEW]: true,
  [PERMISSION_KEYS.WORKSHOPS_MANAGE]: false,
  [PERMISSION_KEYS.WORKSHOPS_ORDERS]: true,
  [PERMISSION_KEYS.WORKSHOPS_PAYMENTS]: false,

  // Deliveries - View and basic manage
  [PERMISSION_KEYS.DELIVERIES_VIEW]: true,
  [PERMISSION_KEYS.DELIVERIES_MANAGE]: true,
  [PERMISSION_KEYS.COURIERS_MANAGE]: false,

  // Payroll - No access
  [PERMISSION_KEYS.PAYROLL_VIEW]: false,
  [PERMISSION_KEYS.PAYROLL_MANAGE]: false,
  [PERMISSION_KEYS.SALARY_APPROVE]: false,
  [PERMISSION_KEYS.ADVANCES_APPROVE]: false,

  // Staff - No access
  [PERMISSION_KEYS.STAFF_VIEW]: false,
  [PERMISSION_KEYS.STAFF_MANAGE]: false,
  [PERMISSION_KEYS.STAFF_MANAGE_ROLES]: false,
  [PERMISSION_KEYS.STAFF_INVITE]: false,
  [PERMISSION_KEYS.STAFF_REMOVE]: false,

  // Analytics - Basic only
  [PERMISSION_KEYS.ANALYTICS_VIEW]: true,
  [PERMISSION_KEYS.REPORTS_BASIC]: true,
  [PERMISSION_KEYS.REPORTS_FINANCIAL]: false,
  [PERMISSION_KEYS.REPORTS_EXPORT]: false,

  // Settings - No access
  [PERMISSION_KEYS.SETTINGS_VIEW]: false,
  [PERMISSION_KEYS.SETTINGS_MANAGE]: false,
  [PERMISSION_KEYS.SHOP_SETTINGS]: false,

  // AI - Basic use
  [PERMISSION_KEYS.AI_USE]: true,
  [PERMISSION_KEYS.AI_APPROVE_OPERATIONS]: false,

  // Tax - No access
  [PERMISSION_KEYS.TAX_VIEW]: false,
  [PERMISSION_KEYS.TAX_MANAGE]: false,

  // Budget - No access
  [PERMISSION_KEYS.BUDGET_VIEW]: false,
  [PERMISSION_KEYS.BUDGET_MANAGE]: false,

  // Reminders - View only for staff
  [PERMISSION_KEYS.REMINDERS_VIEW]: true,
  [PERMISSION_KEYS.REMINDERS_CREATE]: false,
  [PERMISSION_KEYS.REMINDERS_UPDATE]: false,
  [PERMISSION_KEYS.REMINDERS_DELETE]: false,
};

/**
 * Get default permissions for a role
 */
export function getDefaultPermissions(role: RoleName): Record<PermissionKey, boolean> {
  switch (role) {
    case ROLES.OWNER:
      return OWNER_DEFAULT_PERMISSIONS;
    case ROLES.MANAGER:
      return MANAGER_DEFAULT_PERMISSIONS;
    case ROLES.FINANCE:
      return FINANCE_DEFAULT_PERMISSIONS;
    case ROLES.STAFF:
      return STAFF_DEFAULT_PERMISSIONS;
    default:
      return STAFF_DEFAULT_PERMISSIONS;
  }
}

/**
 * Permission labels for UI display
 */
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  [PERMISSION_KEYS.INVENTORY_VIEW]: 'View Inventory',
  [PERMISSION_KEYS.INVENTORY_MANAGE]: 'Manage Inventory',
  [PERMISSION_KEYS.INVENTORY_DELETE]: 'Delete Inventory Items',
  [PERMISSION_KEYS.INVENTORY_TRANSFER]: 'Transfer Inventory',

  [PERMISSION_KEYS.SALES_VIEW]: 'View Sales',
  [PERMISSION_KEYS.SALES_CREATE]: 'Create Sales',
  [PERMISSION_KEYS.SALES_EDIT]: 'Edit Sales',
  [PERMISSION_KEYS.SALES_VOID]: 'Void Sales',
  [PERMISSION_KEYS.SALES_DISCOUNT]: 'Apply Discounts',
  [PERMISSION_KEYS.SALES_REFUND]: 'Process Refunds',

  [PERMISSION_KEYS.CUSTOMERS_VIEW]: 'View Customers',
  [PERMISSION_KEYS.CUSTOMERS_MANAGE]: 'Manage Customers',
  [PERMISSION_KEYS.CUSTOMERS_DELETE]: 'Delete Customers',
  [PERMISSION_KEYS.CUSTOMERS_CREDIT]: 'Manage Customer Credit',

  [PERMISSION_KEYS.SUPPLIERS_VIEW]: 'View Suppliers',
  [PERMISSION_KEYS.SUPPLIERS_MANAGE]: 'Manage Suppliers',
  [PERMISSION_KEYS.SUPPLIERS_DELETE]: 'Delete Suppliers',
  [PERMISSION_KEYS.SUPPLIERS_PAYMENTS]: 'Manage Supplier Payments',

  [PERMISSION_KEYS.PURCHASES_VIEW]: 'View Purchases',
  [PERMISSION_KEYS.PURCHASES_CREATE]: 'Create Purchases',
  [PERMISSION_KEYS.PURCHASES_EDIT]: 'Edit Purchases',
  [PERMISSION_KEYS.PURCHASES_DELETE]: 'Delete Purchases',

  [PERMISSION_KEYS.EXPENSES_VIEW]: 'View Expenses',
  [PERMISSION_KEYS.EXPENSES_CREATE]: 'Create Expenses',
  [PERMISSION_KEYS.EXPENSES_APPROVE]: 'Approve Expenses',
  [PERMISSION_KEYS.EXPENSES_DELETE]: 'Delete Expenses',

  [PERMISSION_KEYS.WORKSHOPS_VIEW]: 'View Workshops',
  [PERMISSION_KEYS.WORKSHOPS_MANAGE]: 'Manage Workshops',
  [PERMISSION_KEYS.WORKSHOPS_ORDERS]: 'Manage Workshop Orders',
  [PERMISSION_KEYS.WORKSHOPS_PAYMENTS]: 'Manage Workshop Payments',

  [PERMISSION_KEYS.DELIVERIES_VIEW]: 'View Deliveries',
  [PERMISSION_KEYS.DELIVERIES_MANAGE]: 'Manage Deliveries',
  [PERMISSION_KEYS.COURIERS_MANAGE]: 'Manage Couriers',

  [PERMISSION_KEYS.PAYROLL_VIEW]: 'View Payroll',
  [PERMISSION_KEYS.PAYROLL_MANAGE]: 'Manage Payroll',
  [PERMISSION_KEYS.SALARY_APPROVE]: 'Approve Salaries',
  [PERMISSION_KEYS.ADVANCES_APPROVE]: 'Approve Advances',

  [PERMISSION_KEYS.STAFF_VIEW]: 'View Staff',
  [PERMISSION_KEYS.STAFF_MANAGE]: 'Manage Staff',
  [PERMISSION_KEYS.STAFF_MANAGE_ROLES]: 'Manage Staff Roles',
  [PERMISSION_KEYS.STAFF_INVITE]: 'Invite Staff',
  [PERMISSION_KEYS.STAFF_REMOVE]: 'Remove Staff',

  [PERMISSION_KEYS.ANALYTICS_VIEW]: 'View Analytics',
  [PERMISSION_KEYS.REPORTS_BASIC]: 'Basic Reports',
  [PERMISSION_KEYS.REPORTS_FINANCIAL]: 'Financial Reports',
  [PERMISSION_KEYS.REPORTS_EXPORT]: 'Export Reports',

  [PERMISSION_KEYS.SETTINGS_VIEW]: 'View Settings',
  [PERMISSION_KEYS.SETTINGS_MANAGE]: 'Manage Settings',
  [PERMISSION_KEYS.SHOP_SETTINGS]: 'Shop Settings',

  [PERMISSION_KEYS.AI_USE]: 'Use AI Features',
  [PERMISSION_KEYS.AI_APPROVE_OPERATIONS]: 'Approve AI Operations',

  [PERMISSION_KEYS.TAX_VIEW]: 'View Tax',
  [PERMISSION_KEYS.TAX_MANAGE]: 'Manage Tax',

  [PERMISSION_KEYS.BUDGET_VIEW]: 'View Budget',
  [PERMISSION_KEYS.BUDGET_MANAGE]: 'Manage Budget',

  [PERMISSION_KEYS.REMINDERS_VIEW]: 'View Payment Reminders',
  [PERMISSION_KEYS.REMINDERS_CREATE]: 'Create Payment Reminders',
  [PERMISSION_KEYS.REMINDERS_UPDATE]: 'Update Payment Reminders',
  [PERMISSION_KEYS.REMINDERS_DELETE]: 'Delete Payment Reminders',
};
