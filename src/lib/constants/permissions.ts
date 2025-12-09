/**
 * Permission Keys
 * Based on the DB shop_access.permissions JSONB structure
 * Matches the permission system defined in the database documentation
 *
 * IMPORTANT: All 103 permission keys from database are defined here
 */

// =============================================================================
// PERMISSION KEY CONSTANTS
// =============================================================================

/**
 * All available permission keys in the system
 * These match the JSONB structure stored in shop_access.permissions
 */
export const PERMISSION_KEYS = {
  // =========================================================================
  // ADVANCES PERMISSIONS
  // =========================================================================
  ADVANCES_APPROVE: 'advances.approve',

  // =========================================================================
  // AI PERMISSIONS
  // =========================================================================
  AI_ALLOCATE_CREDITS: 'ai.allocate_credits',
  AI_APPROVE_OPERATIONS: 'ai.approve_operations',
  AI_USE: 'ai.use',
  AI_VIEW_OPERATIONS: 'ai.view_operations',

  // =========================================================================
  // ANALYTICS PERMISSIONS
  // =========================================================================
  ANALYTICS_EXPORT: 'analytics.export',
  ANALYTICS_VIEW: 'analytics.view',

  // =========================================================================
  // BUDGET PERMISSIONS (singular)
  // =========================================================================
  BUDGET_MANAGE: 'budget.manage',
  BUDGET_VIEW: 'budget.view',

  // =========================================================================
  // BUDGETS PERMISSIONS (plural - legacy)
  // =========================================================================
  BUDGETS_APPROVE: 'budgets.approve',
  BUDGETS_MANAGE: 'budgets.manage',
  BUDGETS_VIEW: 'budgets.view',

  // =========================================================================
  // COURIERS PERMISSIONS
  // =========================================================================
  COURIERS_MANAGE: 'couriers.manage',

  // =========================================================================
  // CUSTOMERS PERMISSIONS
  // =========================================================================
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_CREDIT: 'customers.credit',
  CUSTOMERS_DELETE: 'customers.delete',
  CUSTOMERS_MANAGE: 'customers.manage',
  CUSTOMERS_MANAGE_BALANCE: 'customers.manage_balance',
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_VIEW_BALANCE: 'customers.view_balance',

  // =========================================================================
  // DELIVERIES PERMISSIONS
  // =========================================================================
  DELIVERIES_CREATE: 'deliveries.create',
  DELIVERIES_MANAGE: 'deliveries.manage',
  DELIVERIES_MANAGE_COURIERS: 'deliveries.manage_couriers',
  DELIVERIES_MANAGE_PAYMENTS: 'deliveries.manage_payments',
  DELIVERIES_VIEW: 'deliveries.view',

  // =========================================================================
  // EXPENSES PERMISSIONS
  // =========================================================================
  EXPENSES_APPROVE: 'expenses.approve',
  EXPENSES_CREATE: 'expenses.create',
  EXPENSES_DELETE: 'expenses.delete',
  EXPENSES_EDIT: 'expenses.edit',
  EXPENSES_MANAGE_CATEGORIES: 'expenses.manage_categories',
  EXPENSES_MANAGE_RECURRING: 'expenses.manage_recurring',
  EXPENSES_VIEW: 'expenses.view',

  // =========================================================================
  // INVENTORY PERMISSIONS
  // =========================================================================
  INVENTORY_ADJUST_STOCK: 'inventory.adjust_stock',
  INVENTORY_CREATE: 'inventory.create',
  INVENTORY_DELETE: 'inventory.delete',
  INVENTORY_MANAGE: 'inventory.manage',
  INVENTORY_MANAGE_CATEGORIES: 'inventory.manage_categories',
  INVENTORY_MANAGE_PRICES: 'inventory.manage_prices',
  INVENTORY_TRANSFER: 'inventory.transfer',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_VIEW_AGING: 'inventory.view_aging',

  // =========================================================================
  // PAYROLL PERMISSIONS
  // =========================================================================
  PAYROLL_APPROVE: 'payroll.approve',
  PAYROLL_MANAGE: 'payroll.manage',
  PAYROLL_MANAGE_ADJUSTMENTS: 'payroll.manage_adjustments',
  PAYROLL_MANAGE_ADVANCES: 'payroll.manage_advances',
  PAYROLL_PROCESS: 'payroll.process',
  PAYROLL_VIEW: 'payroll.view',

  // =========================================================================
  // PURCHASES PERMISSIONS
  // =========================================================================
  PURCHASES_CREATE: 'purchases.create',
  PURCHASES_DELETE: 'purchases.delete',
  PURCHASES_EDIT: 'purchases.edit',
  PURCHASES_VIEW: 'purchases.view',

  // =========================================================================
  // RECYCLED PERMISSIONS
  // =========================================================================
  RECYCLED_MANAGE: 'recycled.manage',
  RECYCLED_VIEW: 'recycled.view',

  // =========================================================================
  // REMINDERS PERMISSIONS
  // =========================================================================
  REMINDERS_CREATE: 'reminders.create',
  REMINDERS_DELETE: 'reminders.delete',
  REMINDERS_UPDATE: 'reminders.update',
  REMINDERS_VIEW: 'reminders.view',

  // =========================================================================
  // REPORTS PERMISSIONS
  // =========================================================================
  REPORTS_BASIC: 'reports.basic',
  REPORTS_EXPORT: 'reports.export',
  REPORTS_FINANCIAL: 'reports.financial',

  // =========================================================================
  // SALARY PERMISSIONS
  // =========================================================================
  SALARY_APPROVE: 'salary.approve',

  // =========================================================================
  // SALES PERMISSIONS
  // =========================================================================
  SALES_CREATE: 'sales.create',
  SALES_DISCOUNT: 'sales.discount',
  SALES_EDIT: 'sales.edit',
  SALES_REFUND: 'sales.refund',
  SALES_VIEW: 'sales.view',
  SALES_VOID: 'sales.void',

  // =========================================================================
  // SETTINGS PERMISSIONS
  // =========================================================================
  SETTINGS_MANAGE: 'settings.manage',
  SETTINGS_MANAGE_NOTIFICATIONS: 'settings.manage_notifications',
  SETTINGS_MANAGE_PREFERENCES: 'settings.manage_preferences',
  SETTINGS_MANAGE_SHOP: 'settings.manage_shop',
  SETTINGS_MANAGE_TEMPLATES: 'settings.manage_templates',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_VIEW_AUDIT: 'settings.view_audit',

  // =========================================================================
  // SHOP PERMISSIONS
  // =========================================================================
  SHOP_SETTINGS: 'shop.settings',

  // =========================================================================
  // STAFF PERMISSIONS
  // =========================================================================
  STAFF_INVITE: 'staff.invite',
  STAFF_MANAGE: 'staff.manage',
  STAFF_MANAGE_PERMISSIONS: 'staff.manage_permissions',
  STAFF_MANAGE_ROLES: 'staff.manage_roles',
  STAFF_REMOVE: 'staff.remove',
  STAFF_VIEW: 'staff.view',
  STAFF_VIEW_PERFORMANCE: 'staff.view_performance',

  // =========================================================================
  // SUPPLIERS PERMISSIONS
  // =========================================================================
  SUPPLIERS_DELETE: 'suppliers.delete',
  SUPPLIERS_MANAGE: 'suppliers.manage',
  SUPPLIERS_MANAGE_BALANCE: 'suppliers.manage_balance',
  SUPPLIERS_MANAGE_PAYMENTS: 'suppliers.manage_payments',
  SUPPLIERS_PAYMENTS: 'suppliers.payments',
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_VIEW_BALANCE: 'suppliers.view_balance',

  // =========================================================================
  // TAX PERMISSIONS (singular)
  // =========================================================================
  TAX_MANAGE: 'tax.manage',
  TAX_VIEW: 'tax.view',

  // =========================================================================
  // TAXES PERMISSIONS (plural - extended)
  // =========================================================================
  TAXES_FILE: 'taxes.file',
  TAXES_MANAGE: 'taxes.manage',
  TAXES_MANAGE_PAYMENTS: 'taxes.manage_payments',
  TAXES_VIEW: 'taxes.view',

  // =========================================================================
  // TRANSFERS PERMISSIONS
  // =========================================================================
  TRANSFERS_APPROVE: 'transfers.approve',
  TRANSFERS_CREATE: 'transfers.create',
  TRANSFERS_MANAGE_NEIGHBORS: 'transfers.manage_neighbors',
  TRANSFERS_VIEW: 'transfers.view',

  // =========================================================================
  // WORKSHOP PERMISSIONS (singular - primary)
  // =========================================================================
  WORKSHOP_CREATE_ORDERS: 'workshop.create_orders',
  WORKSHOP_MANAGE: 'workshop.manage',
  WORKSHOP_MANAGE_ORDERS: 'workshop.manage_orders',
  WORKSHOP_MANAGE_PAYMENTS: 'workshop.manage_payments',
  WORKSHOP_VIEW: 'workshop.view',

  // =========================================================================
  // WORKSHOPS PERMISSIONS (plural - legacy)
  // =========================================================================
  WORKSHOPS_MANAGE: 'workshops.manage',
  WORKSHOPS_ORDERS: 'workshops.orders',
  WORKSHOPS_PAYMENTS: 'workshops.payments',
  WORKSHOPS_VIEW: 'workshops.view',
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
  advances: [PERMISSION_KEYS.ADVANCES_APPROVE],

  ai: [
    PERMISSION_KEYS.AI_ALLOCATE_CREDITS,
    PERMISSION_KEYS.AI_APPROVE_OPERATIONS,
    PERMISSION_KEYS.AI_USE,
    PERMISSION_KEYS.AI_VIEW_OPERATIONS,
  ],

  analytics: [PERMISSION_KEYS.ANALYTICS_EXPORT, PERMISSION_KEYS.ANALYTICS_VIEW],

  budget: [
    PERMISSION_KEYS.BUDGET_MANAGE,
    PERMISSION_KEYS.BUDGET_VIEW,
    PERMISSION_KEYS.BUDGETS_APPROVE,
    PERMISSION_KEYS.BUDGETS_MANAGE,
    PERMISSION_KEYS.BUDGETS_VIEW,
  ],

  couriers: [PERMISSION_KEYS.COURIERS_MANAGE],

  customers: [
    PERMISSION_KEYS.CUSTOMERS_CREATE,
    PERMISSION_KEYS.CUSTOMERS_CREDIT,
    PERMISSION_KEYS.CUSTOMERS_DELETE,
    PERMISSION_KEYS.CUSTOMERS_MANAGE,
    PERMISSION_KEYS.CUSTOMERS_MANAGE_BALANCE,
    PERMISSION_KEYS.CUSTOMERS_VIEW,
    PERMISSION_KEYS.CUSTOMERS_VIEW_BALANCE,
  ],

  deliveries: [
    PERMISSION_KEYS.DELIVERIES_CREATE,
    PERMISSION_KEYS.DELIVERIES_MANAGE,
    PERMISSION_KEYS.DELIVERIES_MANAGE_COURIERS,
    PERMISSION_KEYS.DELIVERIES_MANAGE_PAYMENTS,
    PERMISSION_KEYS.DELIVERIES_VIEW,
  ],

  expenses: [
    PERMISSION_KEYS.EXPENSES_APPROVE,
    PERMISSION_KEYS.EXPENSES_CREATE,
    PERMISSION_KEYS.EXPENSES_DELETE,
    PERMISSION_KEYS.EXPENSES_EDIT,
    PERMISSION_KEYS.EXPENSES_MANAGE_CATEGORIES,
    PERMISSION_KEYS.EXPENSES_MANAGE_RECURRING,
    PERMISSION_KEYS.EXPENSES_VIEW,
  ],

  inventory: [
    PERMISSION_KEYS.INVENTORY_ADJUST_STOCK,
    PERMISSION_KEYS.INVENTORY_CREATE,
    PERMISSION_KEYS.INVENTORY_DELETE,
    PERMISSION_KEYS.INVENTORY_MANAGE,
    PERMISSION_KEYS.INVENTORY_MANAGE_CATEGORIES,
    PERMISSION_KEYS.INVENTORY_MANAGE_PRICES,
    PERMISSION_KEYS.INVENTORY_TRANSFER,
    PERMISSION_KEYS.INVENTORY_VIEW,
    PERMISSION_KEYS.INVENTORY_VIEW_AGING,
  ],

  payroll: [
    PERMISSION_KEYS.PAYROLL_APPROVE,
    PERMISSION_KEYS.PAYROLL_MANAGE,
    PERMISSION_KEYS.PAYROLL_MANAGE_ADJUSTMENTS,
    PERMISSION_KEYS.PAYROLL_MANAGE_ADVANCES,
    PERMISSION_KEYS.PAYROLL_PROCESS,
    PERMISSION_KEYS.PAYROLL_VIEW,
    PERMISSION_KEYS.SALARY_APPROVE,
    PERMISSION_KEYS.ADVANCES_APPROVE,
  ],

  purchases: [
    PERMISSION_KEYS.PURCHASES_CREATE,
    PERMISSION_KEYS.PURCHASES_DELETE,
    PERMISSION_KEYS.PURCHASES_EDIT,
    PERMISSION_KEYS.PURCHASES_VIEW,
  ],

  recycled: [PERMISSION_KEYS.RECYCLED_MANAGE, PERMISSION_KEYS.RECYCLED_VIEW],

  reminders: [
    PERMISSION_KEYS.REMINDERS_CREATE,
    PERMISSION_KEYS.REMINDERS_DELETE,
    PERMISSION_KEYS.REMINDERS_UPDATE,
    PERMISSION_KEYS.REMINDERS_VIEW,
  ],

  reports: [
    PERMISSION_KEYS.REPORTS_BASIC,
    PERMISSION_KEYS.REPORTS_EXPORT,
    PERMISSION_KEYS.REPORTS_FINANCIAL,
  ],

  sales: [
    PERMISSION_KEYS.SALES_CREATE,
    PERMISSION_KEYS.SALES_DISCOUNT,
    PERMISSION_KEYS.SALES_EDIT,
    PERMISSION_KEYS.SALES_REFUND,
    PERMISSION_KEYS.SALES_VIEW,
    PERMISSION_KEYS.SALES_VOID,
  ],

  settings: [
    PERMISSION_KEYS.SETTINGS_MANAGE,
    PERMISSION_KEYS.SETTINGS_MANAGE_NOTIFICATIONS,
    PERMISSION_KEYS.SETTINGS_MANAGE_PREFERENCES,
    PERMISSION_KEYS.SETTINGS_MANAGE_SHOP,
    PERMISSION_KEYS.SETTINGS_MANAGE_TEMPLATES,
    PERMISSION_KEYS.SETTINGS_VIEW,
    PERMISSION_KEYS.SETTINGS_VIEW_AUDIT,
    PERMISSION_KEYS.SHOP_SETTINGS,
  ],

  staff: [
    PERMISSION_KEYS.STAFF_INVITE,
    PERMISSION_KEYS.STAFF_MANAGE,
    PERMISSION_KEYS.STAFF_MANAGE_PERMISSIONS,
    PERMISSION_KEYS.STAFF_MANAGE_ROLES,
    PERMISSION_KEYS.STAFF_REMOVE,
    PERMISSION_KEYS.STAFF_VIEW,
    PERMISSION_KEYS.STAFF_VIEW_PERFORMANCE,
  ],

  suppliers: [
    PERMISSION_KEYS.SUPPLIERS_DELETE,
    PERMISSION_KEYS.SUPPLIERS_MANAGE,
    PERMISSION_KEYS.SUPPLIERS_MANAGE_BALANCE,
    PERMISSION_KEYS.SUPPLIERS_MANAGE_PAYMENTS,
    PERMISSION_KEYS.SUPPLIERS_PAYMENTS,
    PERMISSION_KEYS.SUPPLIERS_VIEW,
    PERMISSION_KEYS.SUPPLIERS_VIEW_BALANCE,
  ],

  tax: [
    PERMISSION_KEYS.TAX_MANAGE,
    PERMISSION_KEYS.TAX_VIEW,
    PERMISSION_KEYS.TAXES_FILE,
    PERMISSION_KEYS.TAXES_MANAGE,
    PERMISSION_KEYS.TAXES_MANAGE_PAYMENTS,
    PERMISSION_KEYS.TAXES_VIEW,
  ],

  transfers: [
    PERMISSION_KEYS.TRANSFERS_APPROVE,
    PERMISSION_KEYS.TRANSFERS_CREATE,
    PERMISSION_KEYS.TRANSFERS_MANAGE_NEIGHBORS,
    PERMISSION_KEYS.TRANSFERS_VIEW,
  ],

  workshop: [
    PERMISSION_KEYS.WORKSHOP_CREATE_ORDERS,
    PERMISSION_KEYS.WORKSHOP_MANAGE,
    PERMISSION_KEYS.WORKSHOP_MANAGE_ORDERS,
    PERMISSION_KEYS.WORKSHOP_MANAGE_PAYMENTS,
    PERMISSION_KEYS.WORKSHOP_VIEW,
    PERMISSION_KEYS.WORKSHOPS_MANAGE,
    PERMISSION_KEYS.WORKSHOPS_ORDERS,
    PERMISSION_KEYS.WORKSHOPS_PAYMENTS,
    PERMISSION_KEYS.WORKSHOPS_VIEW,
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
 * Default permissions for Owner role (full access - all 103 permissions)
 */
export const OWNER_DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  // Advances
  [PERMISSION_KEYS.ADVANCES_APPROVE]: true,

  // AI
  [PERMISSION_KEYS.AI_ALLOCATE_CREDITS]: true,
  [PERMISSION_KEYS.AI_APPROVE_OPERATIONS]: true,
  [PERMISSION_KEYS.AI_USE]: true,
  [PERMISSION_KEYS.AI_VIEW_OPERATIONS]: true,

  // Analytics
  [PERMISSION_KEYS.ANALYTICS_EXPORT]: true,
  [PERMISSION_KEYS.ANALYTICS_VIEW]: true,

  // Budget
  [PERMISSION_KEYS.BUDGET_MANAGE]: true,
  [PERMISSION_KEYS.BUDGET_VIEW]: true,
  [PERMISSION_KEYS.BUDGETS_APPROVE]: true,
  [PERMISSION_KEYS.BUDGETS_MANAGE]: true,
  [PERMISSION_KEYS.BUDGETS_VIEW]: true,

  // Couriers
  [PERMISSION_KEYS.COURIERS_MANAGE]: true,

  // Customers
  [PERMISSION_KEYS.CUSTOMERS_CREATE]: true,
  [PERMISSION_KEYS.CUSTOMERS_CREDIT]: true,
  [PERMISSION_KEYS.CUSTOMERS_DELETE]: true,
  [PERMISSION_KEYS.CUSTOMERS_MANAGE]: true,
  [PERMISSION_KEYS.CUSTOMERS_MANAGE_BALANCE]: true,
  [PERMISSION_KEYS.CUSTOMERS_VIEW]: true,
  [PERMISSION_KEYS.CUSTOMERS_VIEW_BALANCE]: true,

  // Deliveries
  [PERMISSION_KEYS.DELIVERIES_CREATE]: true,
  [PERMISSION_KEYS.DELIVERIES_MANAGE]: true,
  [PERMISSION_KEYS.DELIVERIES_MANAGE_COURIERS]: true,
  [PERMISSION_KEYS.DELIVERIES_MANAGE_PAYMENTS]: true,
  [PERMISSION_KEYS.DELIVERIES_VIEW]: true,

  // Expenses
  [PERMISSION_KEYS.EXPENSES_APPROVE]: true,
  [PERMISSION_KEYS.EXPENSES_CREATE]: true,
  [PERMISSION_KEYS.EXPENSES_DELETE]: true,
  [PERMISSION_KEYS.EXPENSES_EDIT]: true,
  [PERMISSION_KEYS.EXPENSES_MANAGE_CATEGORIES]: true,
  [PERMISSION_KEYS.EXPENSES_MANAGE_RECURRING]: true,
  [PERMISSION_KEYS.EXPENSES_VIEW]: true,

  // Inventory
  [PERMISSION_KEYS.INVENTORY_ADJUST_STOCK]: true,
  [PERMISSION_KEYS.INVENTORY_CREATE]: true,
  [PERMISSION_KEYS.INVENTORY_DELETE]: true,
  [PERMISSION_KEYS.INVENTORY_MANAGE]: true,
  [PERMISSION_KEYS.INVENTORY_MANAGE_CATEGORIES]: true,
  [PERMISSION_KEYS.INVENTORY_MANAGE_PRICES]: true,
  [PERMISSION_KEYS.INVENTORY_TRANSFER]: true,
  [PERMISSION_KEYS.INVENTORY_VIEW]: true,
  [PERMISSION_KEYS.INVENTORY_VIEW_AGING]: true,

  // Payroll
  [PERMISSION_KEYS.PAYROLL_APPROVE]: true,
  [PERMISSION_KEYS.PAYROLL_MANAGE]: true,
  [PERMISSION_KEYS.PAYROLL_MANAGE_ADJUSTMENTS]: true,
  [PERMISSION_KEYS.PAYROLL_MANAGE_ADVANCES]: true,
  [PERMISSION_KEYS.PAYROLL_PROCESS]: true,
  [PERMISSION_KEYS.PAYROLL_VIEW]: true,

  // Purchases
  [PERMISSION_KEYS.PURCHASES_CREATE]: true,
  [PERMISSION_KEYS.PURCHASES_DELETE]: true,
  [PERMISSION_KEYS.PURCHASES_EDIT]: true,
  [PERMISSION_KEYS.PURCHASES_VIEW]: true,

  // Recycled
  [PERMISSION_KEYS.RECYCLED_MANAGE]: true,
  [PERMISSION_KEYS.RECYCLED_VIEW]: true,

  // Reminders
  [PERMISSION_KEYS.REMINDERS_CREATE]: true,
  [PERMISSION_KEYS.REMINDERS_DELETE]: true,
  [PERMISSION_KEYS.REMINDERS_UPDATE]: true,
  [PERMISSION_KEYS.REMINDERS_VIEW]: true,

  // Reports
  [PERMISSION_KEYS.REPORTS_BASIC]: true,
  [PERMISSION_KEYS.REPORTS_EXPORT]: true,
  [PERMISSION_KEYS.REPORTS_FINANCIAL]: true,

  // Salary
  [PERMISSION_KEYS.SALARY_APPROVE]: true,

  // Sales
  [PERMISSION_KEYS.SALES_CREATE]: true,
  [PERMISSION_KEYS.SALES_DISCOUNT]: true,
  [PERMISSION_KEYS.SALES_EDIT]: true,
  [PERMISSION_KEYS.SALES_REFUND]: true,
  [PERMISSION_KEYS.SALES_VIEW]: true,
  [PERMISSION_KEYS.SALES_VOID]: true,

  // Settings
  [PERMISSION_KEYS.SETTINGS_MANAGE]: true,
  [PERMISSION_KEYS.SETTINGS_MANAGE_NOTIFICATIONS]: true,
  [PERMISSION_KEYS.SETTINGS_MANAGE_PREFERENCES]: true,
  [PERMISSION_KEYS.SETTINGS_MANAGE_SHOP]: true,
  [PERMISSION_KEYS.SETTINGS_MANAGE_TEMPLATES]: true,
  [PERMISSION_KEYS.SETTINGS_VIEW]: true,
  [PERMISSION_KEYS.SETTINGS_VIEW_AUDIT]: true,
  [PERMISSION_KEYS.SHOP_SETTINGS]: true,

  // Staff
  [PERMISSION_KEYS.STAFF_INVITE]: true,
  [PERMISSION_KEYS.STAFF_MANAGE]: true,
  [PERMISSION_KEYS.STAFF_MANAGE_PERMISSIONS]: true,
  [PERMISSION_KEYS.STAFF_MANAGE_ROLES]: true,
  [PERMISSION_KEYS.STAFF_REMOVE]: true,
  [PERMISSION_KEYS.STAFF_VIEW]: true,
  [PERMISSION_KEYS.STAFF_VIEW_PERFORMANCE]: true,

  // Suppliers
  [PERMISSION_KEYS.SUPPLIERS_DELETE]: true,
  [PERMISSION_KEYS.SUPPLIERS_MANAGE]: true,
  [PERMISSION_KEYS.SUPPLIERS_MANAGE_BALANCE]: true,
  [PERMISSION_KEYS.SUPPLIERS_MANAGE_PAYMENTS]: true,
  [PERMISSION_KEYS.SUPPLIERS_PAYMENTS]: true,
  [PERMISSION_KEYS.SUPPLIERS_VIEW]: true,
  [PERMISSION_KEYS.SUPPLIERS_VIEW_BALANCE]: true,

  // Tax
  [PERMISSION_KEYS.TAX_MANAGE]: true,
  [PERMISSION_KEYS.TAX_VIEW]: true,
  [PERMISSION_KEYS.TAXES_FILE]: true,
  [PERMISSION_KEYS.TAXES_MANAGE]: true,
  [PERMISSION_KEYS.TAXES_MANAGE_PAYMENTS]: true,
  [PERMISSION_KEYS.TAXES_VIEW]: true,

  // Transfers
  [PERMISSION_KEYS.TRANSFERS_APPROVE]: true,
  [PERMISSION_KEYS.TRANSFERS_CREATE]: true,
  [PERMISSION_KEYS.TRANSFERS_MANAGE_NEIGHBORS]: true,
  [PERMISSION_KEYS.TRANSFERS_VIEW]: true,

  // Workshop
  [PERMISSION_KEYS.WORKSHOP_CREATE_ORDERS]: true,
  [PERMISSION_KEYS.WORKSHOP_MANAGE]: true,
  [PERMISSION_KEYS.WORKSHOP_MANAGE_ORDERS]: true,
  [PERMISSION_KEYS.WORKSHOP_MANAGE_PAYMENTS]: true,
  [PERMISSION_KEYS.WORKSHOP_VIEW]: true,
  [PERMISSION_KEYS.WORKSHOPS_MANAGE]: true,
  [PERMISSION_KEYS.WORKSHOPS_ORDERS]: true,
  [PERMISSION_KEYS.WORKSHOPS_PAYMENTS]: true,
  [PERMISSION_KEYS.WORKSHOPS_VIEW]: true,
};

/**
 * Default permissions for Manager role
 */
export const MANAGER_DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  ...OWNER_DEFAULT_PERMISSIONS,
  // Restricted permissions for Manager
  [PERMISSION_KEYS.STAFF_MANAGE_ROLES]: false,
  [PERMISSION_KEYS.STAFF_MANAGE_PERMISSIONS]: false,
  [PERMISSION_KEYS.STAFF_REMOVE]: false,
  [PERMISSION_KEYS.SHOP_SETTINGS]: false,
  [PERMISSION_KEYS.SETTINGS_MANAGE_SHOP]: false,
  [PERMISSION_KEYS.AI_APPROVE_OPERATIONS]: false,
  [PERMISSION_KEYS.AI_ALLOCATE_CREDITS]: false,
};

/**
 * Default permissions for Finance role
 */
export const FINANCE_DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  // Advances
  [PERMISSION_KEYS.ADVANCES_APPROVE]: true,

  // AI - Basic use
  [PERMISSION_KEYS.AI_ALLOCATE_CREDITS]: false,
  [PERMISSION_KEYS.AI_APPROVE_OPERATIONS]: false,
  [PERMISSION_KEYS.AI_USE]: true,
  [PERMISSION_KEYS.AI_VIEW_OPERATIONS]: true,

  // Analytics - Full
  [PERMISSION_KEYS.ANALYTICS_EXPORT]: true,
  [PERMISSION_KEYS.ANALYTICS_VIEW]: true,

  // Budget - Full
  [PERMISSION_KEYS.BUDGET_MANAGE]: true,
  [PERMISSION_KEYS.BUDGET_VIEW]: true,
  [PERMISSION_KEYS.BUDGETS_APPROVE]: true,
  [PERMISSION_KEYS.BUDGETS_MANAGE]: true,
  [PERMISSION_KEYS.BUDGETS_VIEW]: true,

  // Couriers - No
  [PERMISSION_KEYS.COURIERS_MANAGE]: false,

  // Customers - View and credit
  [PERMISSION_KEYS.CUSTOMERS_CREATE]: false,
  [PERMISSION_KEYS.CUSTOMERS_CREDIT]: true,
  [PERMISSION_KEYS.CUSTOMERS_DELETE]: false,
  [PERMISSION_KEYS.CUSTOMERS_MANAGE]: false,
  [PERMISSION_KEYS.CUSTOMERS_MANAGE_BALANCE]: true,
  [PERMISSION_KEYS.CUSTOMERS_VIEW]: true,
  [PERMISSION_KEYS.CUSTOMERS_VIEW_BALANCE]: true,

  // Deliveries - View only
  [PERMISSION_KEYS.DELIVERIES_CREATE]: false,
  [PERMISSION_KEYS.DELIVERIES_MANAGE]: false,
  [PERMISSION_KEYS.DELIVERIES_MANAGE_COURIERS]: false,
  [PERMISSION_KEYS.DELIVERIES_MANAGE_PAYMENTS]: true,
  [PERMISSION_KEYS.DELIVERIES_VIEW]: true,

  // Expenses - Full
  [PERMISSION_KEYS.EXPENSES_APPROVE]: true,
  [PERMISSION_KEYS.EXPENSES_CREATE]: true,
  [PERMISSION_KEYS.EXPENSES_DELETE]: false,
  [PERMISSION_KEYS.EXPENSES_EDIT]: true,
  [PERMISSION_KEYS.EXPENSES_MANAGE_CATEGORIES]: true,
  [PERMISSION_KEYS.EXPENSES_MANAGE_RECURRING]: true,
  [PERMISSION_KEYS.EXPENSES_VIEW]: true,

  // Inventory - View only
  [PERMISSION_KEYS.INVENTORY_ADJUST_STOCK]: false,
  [PERMISSION_KEYS.INVENTORY_CREATE]: false,
  [PERMISSION_KEYS.INVENTORY_DELETE]: false,
  [PERMISSION_KEYS.INVENTORY_MANAGE]: false,
  [PERMISSION_KEYS.INVENTORY_MANAGE_CATEGORIES]: false,
  [PERMISSION_KEYS.INVENTORY_MANAGE_PRICES]: true,
  [PERMISSION_KEYS.INVENTORY_TRANSFER]: false,
  [PERMISSION_KEYS.INVENTORY_VIEW]: true,
  [PERMISSION_KEYS.INVENTORY_VIEW_AGING]: true,

  // Payroll - Full
  [PERMISSION_KEYS.PAYROLL_APPROVE]: true,
  [PERMISSION_KEYS.PAYROLL_MANAGE]: true,
  [PERMISSION_KEYS.PAYROLL_MANAGE_ADJUSTMENTS]: true,
  [PERMISSION_KEYS.PAYROLL_MANAGE_ADVANCES]: true,
  [PERMISSION_KEYS.PAYROLL_PROCESS]: true,
  [PERMISSION_KEYS.PAYROLL_VIEW]: true,

  // Purchases - View and create
  [PERMISSION_KEYS.PURCHASES_CREATE]: true,
  [PERMISSION_KEYS.PURCHASES_DELETE]: false,
  [PERMISSION_KEYS.PURCHASES_EDIT]: true,
  [PERMISSION_KEYS.PURCHASES_VIEW]: true,

  // Recycled - View
  [PERMISSION_KEYS.RECYCLED_MANAGE]: false,
  [PERMISSION_KEYS.RECYCLED_VIEW]: true,

  // Reminders - Full
  [PERMISSION_KEYS.REMINDERS_CREATE]: true,
  [PERMISSION_KEYS.REMINDERS_DELETE]: true,
  [PERMISSION_KEYS.REMINDERS_UPDATE]: true,
  [PERMISSION_KEYS.REMINDERS_VIEW]: true,

  // Reports - Full
  [PERMISSION_KEYS.REPORTS_BASIC]: true,
  [PERMISSION_KEYS.REPORTS_EXPORT]: true,
  [PERMISSION_KEYS.REPORTS_FINANCIAL]: true,

  // Salary
  [PERMISSION_KEYS.SALARY_APPROVE]: true,

  // Sales - View
  [PERMISSION_KEYS.SALES_CREATE]: false,
  [PERMISSION_KEYS.SALES_DISCOUNT]: false,
  [PERMISSION_KEYS.SALES_EDIT]: false,
  [PERMISSION_KEYS.SALES_REFUND]: true,
  [PERMISSION_KEYS.SALES_VIEW]: true,
  [PERMISSION_KEYS.SALES_VOID]: false,

  // Settings - View only
  [PERMISSION_KEYS.SETTINGS_MANAGE]: false,
  [PERMISSION_KEYS.SETTINGS_MANAGE_NOTIFICATIONS]: false,
  [PERMISSION_KEYS.SETTINGS_MANAGE_PREFERENCES]: false,
  [PERMISSION_KEYS.SETTINGS_MANAGE_SHOP]: false,
  [PERMISSION_KEYS.SETTINGS_MANAGE_TEMPLATES]: false,
  [PERMISSION_KEYS.SETTINGS_VIEW]: true,
  [PERMISSION_KEYS.SETTINGS_VIEW_AUDIT]: true,
  [PERMISSION_KEYS.SHOP_SETTINGS]: false,

  // Staff - View only
  [PERMISSION_KEYS.STAFF_INVITE]: false,
  [PERMISSION_KEYS.STAFF_MANAGE]: false,
  [PERMISSION_KEYS.STAFF_MANAGE_PERMISSIONS]: false,
  [PERMISSION_KEYS.STAFF_MANAGE_ROLES]: false,
  [PERMISSION_KEYS.STAFF_REMOVE]: false,
  [PERMISSION_KEYS.STAFF_VIEW]: true,
  [PERMISSION_KEYS.STAFF_VIEW_PERFORMANCE]: true,

  // Suppliers - Full payments
  [PERMISSION_KEYS.SUPPLIERS_DELETE]: false,
  [PERMISSION_KEYS.SUPPLIERS_MANAGE]: true,
  [PERMISSION_KEYS.SUPPLIERS_MANAGE_BALANCE]: true,
  [PERMISSION_KEYS.SUPPLIERS_MANAGE_PAYMENTS]: true,
  [PERMISSION_KEYS.SUPPLIERS_PAYMENTS]: true,
  [PERMISSION_KEYS.SUPPLIERS_VIEW]: true,
  [PERMISSION_KEYS.SUPPLIERS_VIEW_BALANCE]: true,

  // Tax - Full
  [PERMISSION_KEYS.TAX_MANAGE]: true,
  [PERMISSION_KEYS.TAX_VIEW]: true,
  [PERMISSION_KEYS.TAXES_FILE]: true,
  [PERMISSION_KEYS.TAXES_MANAGE]: true,
  [PERMISSION_KEYS.TAXES_MANAGE_PAYMENTS]: true,
  [PERMISSION_KEYS.TAXES_VIEW]: true,

  // Transfers - View
  [PERMISSION_KEYS.TRANSFERS_APPROVE]: false,
  [PERMISSION_KEYS.TRANSFERS_CREATE]: false,
  [PERMISSION_KEYS.TRANSFERS_MANAGE_NEIGHBORS]: false,
  [PERMISSION_KEYS.TRANSFERS_VIEW]: true,

  // Workshop - View and payments
  [PERMISSION_KEYS.WORKSHOP_CREATE_ORDERS]: false,
  [PERMISSION_KEYS.WORKSHOP_MANAGE]: false,
  [PERMISSION_KEYS.WORKSHOP_MANAGE_ORDERS]: false,
  [PERMISSION_KEYS.WORKSHOP_MANAGE_PAYMENTS]: true,
  [PERMISSION_KEYS.WORKSHOP_VIEW]: true,
  [PERMISSION_KEYS.WORKSHOPS_MANAGE]: false,
  [PERMISSION_KEYS.WORKSHOPS_ORDERS]: false,
  [PERMISSION_KEYS.WORKSHOPS_PAYMENTS]: true,
  [PERMISSION_KEYS.WORKSHOPS_VIEW]: true,
};

/**
 * Default permissions for Staff role (most restricted)
 */
export const STAFF_DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  // Advances
  [PERMISSION_KEYS.ADVANCES_APPROVE]: false,

  // AI - Basic use
  [PERMISSION_KEYS.AI_ALLOCATE_CREDITS]: false,
  [PERMISSION_KEYS.AI_APPROVE_OPERATIONS]: false,
  [PERMISSION_KEYS.AI_USE]: true,
  [PERMISSION_KEYS.AI_VIEW_OPERATIONS]: false,

  // Analytics - Basic
  [PERMISSION_KEYS.ANALYTICS_EXPORT]: false,
  [PERMISSION_KEYS.ANALYTICS_VIEW]: true,

  // Budget - No
  [PERMISSION_KEYS.BUDGET_MANAGE]: false,
  [PERMISSION_KEYS.BUDGET_VIEW]: false,
  [PERMISSION_KEYS.BUDGETS_APPROVE]: false,
  [PERMISSION_KEYS.BUDGETS_MANAGE]: false,
  [PERMISSION_KEYS.BUDGETS_VIEW]: false,

  // Couriers - No
  [PERMISSION_KEYS.COURIERS_MANAGE]: false,

  // Customers - View and manage
  [PERMISSION_KEYS.CUSTOMERS_CREATE]: true,
  [PERMISSION_KEYS.CUSTOMERS_CREDIT]: false,
  [PERMISSION_KEYS.CUSTOMERS_DELETE]: false,
  [PERMISSION_KEYS.CUSTOMERS_MANAGE]: true,
  [PERMISSION_KEYS.CUSTOMERS_MANAGE_BALANCE]: false,
  [PERMISSION_KEYS.CUSTOMERS_VIEW]: true,
  [PERMISSION_KEYS.CUSTOMERS_VIEW_BALANCE]: false,

  // Deliveries - View and manage
  [PERMISSION_KEYS.DELIVERIES_CREATE]: true,
  [PERMISSION_KEYS.DELIVERIES_MANAGE]: true,
  [PERMISSION_KEYS.DELIVERIES_MANAGE_COURIERS]: false,
  [PERMISSION_KEYS.DELIVERIES_MANAGE_PAYMENTS]: false,
  [PERMISSION_KEYS.DELIVERIES_VIEW]: true,

  // Expenses - No
  [PERMISSION_KEYS.EXPENSES_APPROVE]: false,
  [PERMISSION_KEYS.EXPENSES_CREATE]: false,
  [PERMISSION_KEYS.EXPENSES_DELETE]: false,
  [PERMISSION_KEYS.EXPENSES_EDIT]: false,
  [PERMISSION_KEYS.EXPENSES_MANAGE_CATEGORIES]: false,
  [PERMISSION_KEYS.EXPENSES_MANAGE_RECURRING]: false,
  [PERMISSION_KEYS.EXPENSES_VIEW]: false,

  // Inventory - View and manage
  [PERMISSION_KEYS.INVENTORY_ADJUST_STOCK]: false,
  [PERMISSION_KEYS.INVENTORY_CREATE]: true,
  [PERMISSION_KEYS.INVENTORY_DELETE]: false,
  [PERMISSION_KEYS.INVENTORY_MANAGE]: true,
  [PERMISSION_KEYS.INVENTORY_MANAGE_CATEGORIES]: false,
  [PERMISSION_KEYS.INVENTORY_MANAGE_PRICES]: false,
  [PERMISSION_KEYS.INVENTORY_TRANSFER]: false,
  [PERMISSION_KEYS.INVENTORY_VIEW]: true,
  [PERMISSION_KEYS.INVENTORY_VIEW_AGING]: false,

  // Payroll - No
  [PERMISSION_KEYS.PAYROLL_APPROVE]: false,
  [PERMISSION_KEYS.PAYROLL_MANAGE]: false,
  [PERMISSION_KEYS.PAYROLL_MANAGE_ADJUSTMENTS]: false,
  [PERMISSION_KEYS.PAYROLL_MANAGE_ADVANCES]: false,
  [PERMISSION_KEYS.PAYROLL_PROCESS]: false,
  [PERMISSION_KEYS.PAYROLL_VIEW]: false,

  // Purchases - View only
  [PERMISSION_KEYS.PURCHASES_CREATE]: false,
  [PERMISSION_KEYS.PURCHASES_DELETE]: false,
  [PERMISSION_KEYS.PURCHASES_EDIT]: false,
  [PERMISSION_KEYS.PURCHASES_VIEW]: true,

  // Recycled - No
  [PERMISSION_KEYS.RECYCLED_MANAGE]: false,
  [PERMISSION_KEYS.RECYCLED_VIEW]: false,

  // Reminders - View only
  [PERMISSION_KEYS.REMINDERS_CREATE]: false,
  [PERMISSION_KEYS.REMINDERS_DELETE]: false,
  [PERMISSION_KEYS.REMINDERS_UPDATE]: false,
  [PERMISSION_KEYS.REMINDERS_VIEW]: true,

  // Reports - Basic
  [PERMISSION_KEYS.REPORTS_BASIC]: true,
  [PERMISSION_KEYS.REPORTS_EXPORT]: false,
  [PERMISSION_KEYS.REPORTS_FINANCIAL]: false,

  // Salary
  [PERMISSION_KEYS.SALARY_APPROVE]: false,

  // Sales - Create and basic
  [PERMISSION_KEYS.SALES_CREATE]: true,
  [PERMISSION_KEYS.SALES_DISCOUNT]: false,
  [PERMISSION_KEYS.SALES_EDIT]: false,
  [PERMISSION_KEYS.SALES_REFUND]: false,
  [PERMISSION_KEYS.SALES_VIEW]: true,
  [PERMISSION_KEYS.SALES_VOID]: false,

  // Settings - No
  [PERMISSION_KEYS.SETTINGS_MANAGE]: false,
  [PERMISSION_KEYS.SETTINGS_MANAGE_NOTIFICATIONS]: false,
  [PERMISSION_KEYS.SETTINGS_MANAGE_PREFERENCES]: false,
  [PERMISSION_KEYS.SETTINGS_MANAGE_SHOP]: false,
  [PERMISSION_KEYS.SETTINGS_MANAGE_TEMPLATES]: false,
  [PERMISSION_KEYS.SETTINGS_VIEW]: false,
  [PERMISSION_KEYS.SETTINGS_VIEW_AUDIT]: false,
  [PERMISSION_KEYS.SHOP_SETTINGS]: false,

  // Staff - No
  [PERMISSION_KEYS.STAFF_INVITE]: false,
  [PERMISSION_KEYS.STAFF_MANAGE]: false,
  [PERMISSION_KEYS.STAFF_MANAGE_PERMISSIONS]: false,
  [PERMISSION_KEYS.STAFF_MANAGE_ROLES]: false,
  [PERMISSION_KEYS.STAFF_REMOVE]: false,
  [PERMISSION_KEYS.STAFF_VIEW]: false,
  [PERMISSION_KEYS.STAFF_VIEW_PERFORMANCE]: false,

  // Suppliers - View only
  [PERMISSION_KEYS.SUPPLIERS_DELETE]: false,
  [PERMISSION_KEYS.SUPPLIERS_MANAGE]: false,
  [PERMISSION_KEYS.SUPPLIERS_MANAGE_BALANCE]: false,
  [PERMISSION_KEYS.SUPPLIERS_MANAGE_PAYMENTS]: false,
  [PERMISSION_KEYS.SUPPLIERS_PAYMENTS]: false,
  [PERMISSION_KEYS.SUPPLIERS_VIEW]: true,
  [PERMISSION_KEYS.SUPPLIERS_VIEW_BALANCE]: false,

  // Tax - No
  [PERMISSION_KEYS.TAX_MANAGE]: false,
  [PERMISSION_KEYS.TAX_VIEW]: false,
  [PERMISSION_KEYS.TAXES_FILE]: false,
  [PERMISSION_KEYS.TAXES_MANAGE]: false,
  [PERMISSION_KEYS.TAXES_MANAGE_PAYMENTS]: false,
  [PERMISSION_KEYS.TAXES_VIEW]: false,

  // Transfers - No
  [PERMISSION_KEYS.TRANSFERS_APPROVE]: false,
  [PERMISSION_KEYS.TRANSFERS_CREATE]: false,
  [PERMISSION_KEYS.TRANSFERS_MANAGE_NEIGHBORS]: false,
  [PERMISSION_KEYS.TRANSFERS_VIEW]: false,

  // Workshop - View and orders
  [PERMISSION_KEYS.WORKSHOP_CREATE_ORDERS]: true,
  [PERMISSION_KEYS.WORKSHOP_MANAGE]: false,
  [PERMISSION_KEYS.WORKSHOP_MANAGE_ORDERS]: true,
  [PERMISSION_KEYS.WORKSHOP_MANAGE_PAYMENTS]: false,
  [PERMISSION_KEYS.WORKSHOP_VIEW]: true,
  [PERMISSION_KEYS.WORKSHOPS_MANAGE]: false,
  [PERMISSION_KEYS.WORKSHOPS_ORDERS]: true,
  [PERMISSION_KEYS.WORKSHOPS_PAYMENTS]: false,
  [PERMISSION_KEYS.WORKSHOPS_VIEW]: true,
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
  // Advances
  [PERMISSION_KEYS.ADVANCES_APPROVE]: 'Approve Advances',

  // AI
  [PERMISSION_KEYS.AI_ALLOCATE_CREDITS]: 'Allocate AI Credits',
  [PERMISSION_KEYS.AI_APPROVE_OPERATIONS]: 'Approve AI Operations',
  [PERMISSION_KEYS.AI_USE]: 'Use AI Features',
  [PERMISSION_KEYS.AI_VIEW_OPERATIONS]: 'View AI Operations',

  // Analytics
  [PERMISSION_KEYS.ANALYTICS_EXPORT]: 'Export Analytics',
  [PERMISSION_KEYS.ANALYTICS_VIEW]: 'View Analytics',

  // Budget
  [PERMISSION_KEYS.BUDGET_MANAGE]: 'Manage Budget',
  [PERMISSION_KEYS.BUDGET_VIEW]: 'View Budget',
  [PERMISSION_KEYS.BUDGETS_APPROVE]: 'Approve Budgets',
  [PERMISSION_KEYS.BUDGETS_MANAGE]: 'Manage Budgets',
  [PERMISSION_KEYS.BUDGETS_VIEW]: 'View Budgets',

  // Couriers
  [PERMISSION_KEYS.COURIERS_MANAGE]: 'Manage Couriers',

  // Customers
  [PERMISSION_KEYS.CUSTOMERS_CREATE]: 'Create Customers',
  [PERMISSION_KEYS.CUSTOMERS_CREDIT]: 'Manage Customer Credit',
  [PERMISSION_KEYS.CUSTOMERS_DELETE]: 'Delete Customers',
  [PERMISSION_KEYS.CUSTOMERS_MANAGE]: 'Manage Customers',
  [PERMISSION_KEYS.CUSTOMERS_MANAGE_BALANCE]: 'Manage Customer Balance',
  [PERMISSION_KEYS.CUSTOMERS_VIEW]: 'View Customers',
  [PERMISSION_KEYS.CUSTOMERS_VIEW_BALANCE]: 'View Customer Balance',

  // Deliveries
  [PERMISSION_KEYS.DELIVERIES_CREATE]: 'Create Deliveries',
  [PERMISSION_KEYS.DELIVERIES_MANAGE]: 'Manage Deliveries',
  [PERMISSION_KEYS.DELIVERIES_MANAGE_COURIERS]: 'Manage Delivery Couriers',
  [PERMISSION_KEYS.DELIVERIES_MANAGE_PAYMENTS]: 'Manage Delivery Payments',
  [PERMISSION_KEYS.DELIVERIES_VIEW]: 'View Deliveries',

  // Expenses
  [PERMISSION_KEYS.EXPENSES_APPROVE]: 'Approve Expenses',
  [PERMISSION_KEYS.EXPENSES_CREATE]: 'Create Expenses',
  [PERMISSION_KEYS.EXPENSES_DELETE]: 'Delete Expenses',
  [PERMISSION_KEYS.EXPENSES_EDIT]: 'Edit Expenses',
  [PERMISSION_KEYS.EXPENSES_MANAGE_CATEGORIES]: 'Manage Expense Categories',
  [PERMISSION_KEYS.EXPENSES_MANAGE_RECURRING]: 'Manage Recurring Expenses',
  [PERMISSION_KEYS.EXPENSES_VIEW]: 'View Expenses',

  // Inventory
  [PERMISSION_KEYS.INVENTORY_ADJUST_STOCK]: 'Adjust Stock',
  [PERMISSION_KEYS.INVENTORY_CREATE]: 'Create Inventory Items',
  [PERMISSION_KEYS.INVENTORY_DELETE]: 'Delete Inventory Items',
  [PERMISSION_KEYS.INVENTORY_MANAGE]: 'Manage Inventory',
  [PERMISSION_KEYS.INVENTORY_MANAGE_CATEGORIES]: 'Manage Inventory Categories',
  [PERMISSION_KEYS.INVENTORY_MANAGE_PRICES]: 'Manage Inventory Prices',
  [PERMISSION_KEYS.INVENTORY_TRANSFER]: 'Transfer Inventory',
  [PERMISSION_KEYS.INVENTORY_VIEW]: 'View Inventory',
  [PERMISSION_KEYS.INVENTORY_VIEW_AGING]: 'View Inventory Aging',

  // Payroll
  [PERMISSION_KEYS.PAYROLL_APPROVE]: 'Approve Payroll',
  [PERMISSION_KEYS.PAYROLL_MANAGE]: 'Manage Payroll',
  [PERMISSION_KEYS.PAYROLL_MANAGE_ADJUSTMENTS]: 'Manage Payroll Adjustments',
  [PERMISSION_KEYS.PAYROLL_MANAGE_ADVANCES]: 'Manage Payroll Advances',
  [PERMISSION_KEYS.PAYROLL_PROCESS]: 'Process Payroll',
  [PERMISSION_KEYS.PAYROLL_VIEW]: 'View Payroll',

  // Purchases
  [PERMISSION_KEYS.PURCHASES_CREATE]: 'Create Purchases',
  [PERMISSION_KEYS.PURCHASES_DELETE]: 'Delete Purchases',
  [PERMISSION_KEYS.PURCHASES_EDIT]: 'Edit Purchases',
  [PERMISSION_KEYS.PURCHASES_VIEW]: 'View Purchases',

  // Recycled
  [PERMISSION_KEYS.RECYCLED_MANAGE]: 'Manage Recycled Items',
  [PERMISSION_KEYS.RECYCLED_VIEW]: 'View Recycled Items',

  // Reminders
  [PERMISSION_KEYS.REMINDERS_CREATE]: 'Create Payment Reminders',
  [PERMISSION_KEYS.REMINDERS_DELETE]: 'Delete Payment Reminders',
  [PERMISSION_KEYS.REMINDERS_UPDATE]: 'Update Payment Reminders',
  [PERMISSION_KEYS.REMINDERS_VIEW]: 'View Payment Reminders',

  // Reports
  [PERMISSION_KEYS.REPORTS_BASIC]: 'Basic Reports',
  [PERMISSION_KEYS.REPORTS_EXPORT]: 'Export Reports',
  [PERMISSION_KEYS.REPORTS_FINANCIAL]: 'Financial Reports',

  // Salary
  [PERMISSION_KEYS.SALARY_APPROVE]: 'Approve Salaries',

  // Sales
  [PERMISSION_KEYS.SALES_CREATE]: 'Create Sales',
  [PERMISSION_KEYS.SALES_DISCOUNT]: 'Apply Discounts',
  [PERMISSION_KEYS.SALES_EDIT]: 'Edit Sales',
  [PERMISSION_KEYS.SALES_REFUND]: 'Process Refunds',
  [PERMISSION_KEYS.SALES_VIEW]: 'View Sales',
  [PERMISSION_KEYS.SALES_VOID]: 'Void Sales',

  // Settings
  [PERMISSION_KEYS.SETTINGS_MANAGE]: 'Manage Settings',
  [PERMISSION_KEYS.SETTINGS_MANAGE_NOTIFICATIONS]: 'Manage Notification Settings',
  [PERMISSION_KEYS.SETTINGS_MANAGE_PREFERENCES]: 'Manage Preferences',
  [PERMISSION_KEYS.SETTINGS_MANAGE_SHOP]: 'Manage Shop Settings',
  [PERMISSION_KEYS.SETTINGS_MANAGE_TEMPLATES]: 'Manage Templates',
  [PERMISSION_KEYS.SETTINGS_VIEW]: 'View Settings',
  [PERMISSION_KEYS.SETTINGS_VIEW_AUDIT]: 'View Audit Log',
  [PERMISSION_KEYS.SHOP_SETTINGS]: 'Shop Settings',

  // Staff
  [PERMISSION_KEYS.STAFF_INVITE]: 'Invite Staff',
  [PERMISSION_KEYS.STAFF_MANAGE]: 'Manage Staff',
  [PERMISSION_KEYS.STAFF_MANAGE_PERMISSIONS]: 'Manage Staff Permissions',
  [PERMISSION_KEYS.STAFF_MANAGE_ROLES]: 'Manage Staff Roles',
  [PERMISSION_KEYS.STAFF_REMOVE]: 'Remove Staff',
  [PERMISSION_KEYS.STAFF_VIEW]: 'View Staff',
  [PERMISSION_KEYS.STAFF_VIEW_PERFORMANCE]: 'View Staff Performance',

  // Suppliers
  [PERMISSION_KEYS.SUPPLIERS_DELETE]: 'Delete Suppliers',
  [PERMISSION_KEYS.SUPPLIERS_MANAGE]: 'Manage Suppliers',
  [PERMISSION_KEYS.SUPPLIERS_MANAGE_BALANCE]: 'Manage Supplier Balance',
  [PERMISSION_KEYS.SUPPLIERS_MANAGE_PAYMENTS]: 'Manage Supplier Payments',
  [PERMISSION_KEYS.SUPPLIERS_PAYMENTS]: 'Supplier Payments',
  [PERMISSION_KEYS.SUPPLIERS_VIEW]: 'View Suppliers',
  [PERMISSION_KEYS.SUPPLIERS_VIEW_BALANCE]: 'View Supplier Balance',

  // Tax
  [PERMISSION_KEYS.TAX_MANAGE]: 'Manage Tax',
  [PERMISSION_KEYS.TAX_VIEW]: 'View Tax',
  [PERMISSION_KEYS.TAXES_FILE]: 'File Taxes',
  [PERMISSION_KEYS.TAXES_MANAGE]: 'Manage Taxes',
  [PERMISSION_KEYS.TAXES_MANAGE_PAYMENTS]: 'Manage Tax Payments',
  [PERMISSION_KEYS.TAXES_VIEW]: 'View Taxes',

  // Transfers
  [PERMISSION_KEYS.TRANSFERS_APPROVE]: 'Approve Transfers',
  [PERMISSION_KEYS.TRANSFERS_CREATE]: 'Create Transfers',
  [PERMISSION_KEYS.TRANSFERS_MANAGE_NEIGHBORS]: 'Manage Neighbor Shops',
  [PERMISSION_KEYS.TRANSFERS_VIEW]: 'View Transfers',

  // Workshop
  [PERMISSION_KEYS.WORKSHOP_CREATE_ORDERS]: 'Create Workshop Orders',
  [PERMISSION_KEYS.WORKSHOP_MANAGE]: 'Manage Workshop',
  [PERMISSION_KEYS.WORKSHOP_MANAGE_ORDERS]: 'Manage Workshop Orders',
  [PERMISSION_KEYS.WORKSHOP_MANAGE_PAYMENTS]: 'Manage Workshop Payments',
  [PERMISSION_KEYS.WORKSHOP_VIEW]: 'View Workshop',
  [PERMISSION_KEYS.WORKSHOPS_MANAGE]: 'Manage Workshops',
  [PERMISSION_KEYS.WORKSHOPS_ORDERS]: 'Workshop Orders',
  [PERMISSION_KEYS.WORKSHOPS_PAYMENTS]: 'Workshop Payments',
  [PERMISSION_KEYS.WORKSHOPS_VIEW]: 'View Workshops',
};
