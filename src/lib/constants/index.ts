/**
 * Constants
 * Application-wide constant values
 */

// Permission constants and types
export {
  PERMISSION_KEYS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLES,
  ROLE_HIERARCHY,
  OWNER_DEFAULT_PERMISSIONS,
  MANAGER_DEFAULT_PERMISSIONS,
  FINANCE_DEFAULT_PERMISSIONS,
  STAFF_DEFAULT_PERMISSIONS,
  getDefaultPermissions,
} from './permissions';

export type { PermissionKey, RoleName } from './permissions';

// Status constants and types
export {
  // Inventory
  ITEM_STATUS,
  ITEM_STATUS_LABELS,
  ITEM_STATUS_COLORS,
  ITEM_TYPE,
  ITEM_TYPE_LABELS,
  SOURCE_TYPE,
  OWNERSHIP_TYPE,
  OWNERSHIP_TYPE_LABELS,
  // Sales
  SALE_STATUS,
  SALE_STATUS_LABELS,
  SALE_STATUS_COLORS,
  // Payment
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_TYPE,
  PAYMENT_TYPE_LABELS,
  // Purchase
  PURCHASE_STATUS,
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_COLORS,
  // Delivery
  DELIVERY_STATUS,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_COLORS,
  DELIVERY_COST_PAID_BY,
  // Workshop
  WORKSHOP_ORDER_STATUS,
  WORKSHOP_ORDER_STATUS_LABELS,
  WORKSHOP_ORDER_STATUS_COLORS,
  // Approval
  APPROVAL_STATUS,
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_COLORS,
  // Cheque
  CHEQUE_STATUS,
  CHEQUE_STATUS_LABELS,
  CHEQUE_STATUS_COLORS,
  // Salary
  SALARY_STATUS,
  SALARY_STATUS_LABELS,
  SALARY_PERIOD_STATUS,
  // Transfer
  TRANSFER_STATUS,
  TRANSFER_STATUS_LABELS,
  // Entity
  ENTITY_STATUS,
  ENTITY_STATUS_LABELS,
  // Subscription
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_COLORS,
  // Transaction
  TRANSACTION_TYPE,
  TRANSACTION_TYPE_LABELS,
  // Invitation
  INVITATION_STATUS,
  INVITATION_STATUS_LABELS,
} from './status';

export type {
  ItemStatus,
  ItemType,
  SourceType,
  OwnershipType,
  SaleStatus,
  PaymentStatus,
  PaymentType,
  PurchaseStatus,
  DeliveryStatus,
  DeliveryCostPaidBy,
  WorkshopOrderStatus,
  ApprovalStatus,
  ChequeStatus,
  SalaryStatus,
  SalaryPeriodStatus,
  TransferStatus,
  EntityStatus,
  SubscriptionStatus,
  TransactionType,
  InvitationStatus,
} from './status';

// Configuration constants and types
export {
  // App info
  APP_CONFIG,
  // Locales
  LOCALES,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  LOCALE_LABELS,
  // Currency
  CURRENCIES,
  DEFAULT_CURRENCY,
  CURRENCY_SYMBOLS,
  CURRENCY_LABELS,
  // Timezone
  TIMEZONES,
  DEFAULT_TIMEZONE,
  TIMEZONE_LABELS,
  // Pagination
  PAGINATION,
  // File upload
  FILE_UPLOAD,
  // Jewelry
  METAL_KARATS,
  RING_SIZES,
  CHAIN_LENGTHS,
  BRACELET_SIZES,
  // UI
  THEME,
  SIDEBAR,
  TOAST_DURATION,
  // API
  API_CONFIG,
  QUERY_CONFIG,
  // Security
  SECURITY,
  // Plans
  PLAN_NAMES,
  PLAN_LIMITS,
  // Date formats
  DATE_FORMATS,
  // Field limits
  FIELD_LIMITS,
} from './config';

export type { Locale, Currency, Timezone, PlanName } from './config';

// Navigation constants and types
export {
  navigationConfig,
  flattenNavItems,
  findNavItemByPath,
  findNavItemByKey,
  findParentNavItem,
  getBreadcrumbTrail,
  pathToKeyMap,
  getNavKeyFromPath,
  getOpenKeysForPath,
} from './navigation';

export type { NavItem, NavGroup, NavBadge } from './navigation';
