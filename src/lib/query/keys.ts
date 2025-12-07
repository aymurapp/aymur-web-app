/**
 * TanStack Query Key Factory
 *
 * Centralized query key management using the factory pattern.
 * This ensures consistent, type-safe query keys throughout the application.
 *
 * Query keys follow a hierarchical structure:
 * - Base keys: ['resource']
 * - Scoped keys: ['resource', shopId]
 * - Detail keys: ['resource', shopId, id]
 * - Filtered keys: ['resource', shopId, { filters }]
 *
 * Benefits:
 * - Type-safe query key generation
 * - Consistent key structure across the app
 * - Easy cache invalidation by scope
 * - Auto-complete support in IDE
 */

/**
 * Query key definitions organized by domain
 */
export const queryKeys = {
  // ============================================
  // Authentication & User
  // ============================================

  /** Current authenticated user data */
  user: ['user'] as const,

  /** Current session information */
  session: ['session'] as const,

  /** User profile data */
  profile: (userId: string) => ['profile', userId] as const,

  // ============================================
  // Organizations & Shops
  // ============================================

  /** All shops accessible to the user */
  shops: ['shops'] as const,

  /** Single shop details */
  shop: (shopId: string) => ['shops', shopId] as const,

  /** Shop access/permissions for current user */
  shopAccess: (shopId: string) => ['shop-access', shopId] as const,

  /** Shop settings */
  shopSettings: (shopId: string) => ['shop-settings', shopId] as const,

  /** Shop members/staff */
  shopMembers: (shopId: string) => ['shop-members', shopId] as const,

  /** Staff invitations */
  staffInvitations: (shopId: string) => ['staff-invitations', shopId] as const,

  /** Single staff invitation */
  staffInvitation: (shopId: string, invitationId: string) =>
    ['staff-invitations', shopId, invitationId] as const,

  /** All available roles (global) */
  roles: () => ['roles'] as const,

  /** Single role */
  role: (roleId: string) => ['roles', roleId] as const,

  // ============================================
  // Customers
  // ============================================

  /** All customers for a shop */
  customers: (shopId: string) => ['customers', shopId] as const,

  /** Single customer details */
  customer: (shopId: string, customerId: string) => ['customers', shopId, customerId] as const,

  /** Customer search results */
  customerSearch: (shopId: string, query: string) =>
    ['customers', shopId, 'search', query] as const,

  /** Customer purchase history */
  customerHistory: (shopId: string, customerId: string) =>
    ['customers', shopId, customerId, 'history'] as const,

  // ============================================
  // Inventory & Products
  // ============================================

  /** All inventory items for a shop */
  inventory: (shopId: string) => ['inventory', shopId] as const,

  /** Single inventory item details */
  inventoryItem: (shopId: string, itemId: string) => ['inventory', shopId, itemId] as const,

  /** Inventory by category */
  inventoryByCategory: (shopId: string, categoryId: string) =>
    ['inventory', shopId, 'category', categoryId] as const,

  /** Low stock alerts */
  lowStockItems: (shopId: string) => ['inventory', shopId, 'low-stock'] as const,

  /** Product categories */
  categories: (shopId: string) => ['categories', shopId] as const,

  /** Product category details */
  category: (shopId: string, categoryId: string) => ['categories', shopId, categoryId] as const,

  // ============================================
  // Sales & Orders
  // ============================================

  /** All sales for a shop */
  sales: (shopId: string) => ['sales', shopId] as const,

  /** Single sale details */
  sale: (shopId: string, saleId: string) => ['sales', shopId, saleId] as const,

  /** Sales by date range */
  salesByDateRange: (shopId: string, startDate: string, endDate: string) =>
    ['sales', shopId, 'range', startDate, endDate] as const,

  /** Sales by customer */
  salesByCustomer: (shopId: string, customerId: string) =>
    ['sales', shopId, 'customer', customerId] as const,

  /** Pending/draft sales */
  pendingSales: (shopId: string) => ['sales', shopId, 'pending'] as const,

  // ============================================
  // Suppliers
  // ============================================

  /** All suppliers for a shop */
  suppliers: (shopId: string) => ['suppliers', shopId] as const,

  /** Single supplier details */
  supplier: (shopId: string, supplierId: string) => ['suppliers', shopId, supplierId] as const,

  /** Supplier products */
  supplierProducts: (shopId: string, supplierId: string) =>
    ['suppliers', shopId, supplierId, 'products'] as const,

  /** Supplier search results */
  supplierSearch: (shopId: string, query: string) =>
    ['suppliers', shopId, 'search', query] as const,

  /** Supplier categories for a shop */
  supplierCategories: (shopId: string) => ['supplier-categories', shopId] as const,

  /** Single supplier category */
  supplierCategory: (shopId: string, categoryId: string) =>
    ['supplier-categories', shopId, categoryId] as const,

  /** Supplier transactions (ledger) */
  supplierTransactions: (shopId: string, supplierId: string) =>
    ['supplier-transactions', shopId, supplierId] as const,

  /** Supplier balance */
  supplierBalance: (shopId: string, supplierId: string) =>
    ['suppliers', shopId, supplierId, 'balance'] as const,

  // ============================================
  // Purchases
  // ============================================

  /** All purchases for a shop */
  purchases: (shopId: string) => ['purchases', shopId] as const,

  /** Single purchase details */
  purchase: (shopId: string, purchaseId: string) => ['purchases', shopId, purchaseId] as const,

  /** Purchases by supplier */
  purchasesBySupplier: (shopId: string, supplierId: string) =>
    ['purchases', shopId, 'supplier', supplierId] as const,

  /** Purchases by date range */
  purchasesByDateRange: (shopId: string, startDate: string, endDate: string) =>
    ['purchases', shopId, 'range', startDate, endDate] as const,

  /** Purchases by payment status */
  purchasesByPaymentStatus: (shopId: string, paymentStatus: string) =>
    ['purchases', shopId, 'payment-status', paymentStatus] as const,

  /** Pending purchases (unpaid or partial) */
  pendingPurchases: (shopId: string) => ['purchases', shopId, 'pending'] as const,

  // ============================================
  // Workshops & Manufacturing
  // ============================================

  /** All workshops for a shop */
  workshops: (shopId: string) => ['workshops', shopId] as const,

  /** Single workshop details */
  workshop: (shopId: string, workshopId: string) => ['workshops', shopId, workshopId] as const,

  /** Workshop orders */
  workshopOrders: (shopId: string) => ['workshop-orders', shopId] as const,

  /** Single workshop order */
  workshopOrder: (shopId: string, orderId: string) => ['workshop-orders', shopId, orderId] as const,

  /** Workshop orders by status */
  workshopOrdersByStatus: (shopId: string, status: string) =>
    ['workshop-orders', shopId, 'status', status] as const,

  /** Workshop transactions (ledger) */
  workshopTransactions: (shopId: string, workshopId: string) =>
    ['workshop-transactions', shopId, workshopId] as const,

  // ============================================
  // Deliveries & Logistics
  // ============================================

  /** All deliveries for a shop */
  deliveries: (shopId: string) => ['deliveries', shopId] as const,

  /** Single delivery details */
  delivery: (shopId: string, deliveryId: string) => ['deliveries', shopId, deliveryId] as const,

  /** Pending deliveries */
  pendingDeliveries: (shopId: string) => ['deliveries', shopId, 'pending'] as const,

  /** All couriers for a shop */
  couriers: (shopId: string) => ['couriers', shopId] as const,

  /** Single courier details */
  courier: (shopId: string, courierId: string) => ['couriers', shopId, courierId] as const,

  /** Courier transactions (immutable ledger) */
  courierTransactions: (shopId: string, courierId: string) =>
    ['courier-transactions', shopId, courierId] as const,

  /** Courier balance */
  courierBalance: (shopId: string, courierId: string) =>
    ['couriers', shopId, courierId, 'balance'] as const,

  // ============================================
  // Expenses & Budgets
  // ============================================

  /** All expenses for a shop */
  expenses: (shopId: string) => ['expenses', shopId] as const,

  /** Single expense details */
  expense: (shopId: string, expenseId: string) => ['expenses', shopId, expenseId] as const,

  /** Expenses by category */
  expensesByCategory: (shopId: string, categoryId: string) =>
    ['expenses', shopId, 'category', categoryId] as const,

  /** All budgets for a shop */
  budgets: (shopId: string) => ['budgets', shopId] as const,

  /** Single budget details */
  budget: (shopId: string, budgetId: string) => ['budgets', shopId, budgetId] as const,

  /** Expense categories */
  expenseCategories: (shopId: string) => ['expense-categories', shopId] as const,

  /** Recurring expenses for a shop */
  recurringExpenses: (shopId: string) => ['recurring-expenses', shopId] as const,

  /** Single recurring expense details */
  recurringExpense: (shopId: string, recurringExpenseId: string) =>
    ['recurring-expenses', shopId, recurringExpenseId] as const,

  /** Budget categories for a shop */
  budgetCategories: (shopId: string) => ['budget-categories', shopId] as const,

  /** Single budget category */
  budgetCategory: (shopId: string, categoryId: string) =>
    ['budget-categories', shopId, categoryId] as const,

  /** Budget allocations for a shop */
  budgetAllocations: (shopId: string) => ['budget-allocations', shopId] as const,

  /** Single budget allocation */
  budgetAllocation: (shopId: string, allocationId: string) =>
    ['budget-allocations', shopId, allocationId] as const,

  /** Budget transactions (immutable ledger) */
  budgetTransactions: (shopId: string) => ['budget-transactions', shopId] as const,

  /** Budget summary for a period */
  budgetSummary: (shopId: string) => ['budget-summary', shopId] as const,

  // ============================================
  // Payroll & HR
  // ============================================

  /** All salary periods for a shop */
  salaryPeriods: (shopId: string) => ['salary-periods', shopId] as const,

  /** Single salary period */
  salaryPeriod: (shopId: string, periodId: string) => ['salary-periods', shopId, periodId] as const,

  /** Salary records for a period */
  salaryRecords: (shopId: string, periodId: string) =>
    ['salary-records', shopId, periodId] as const,

  /** Single salary record */
  salaryRecord: (shopId: string, periodId: string, recordId: string) =>
    ['salary-records', shopId, periodId, recordId] as const,

  /** Employees for a shop */
  employees: (shopId: string) => ['employees', shopId] as const,

  /** Single employee details */
  employee: (shopId: string, employeeId: string) => ['employees', shopId, employeeId] as const,

  // ============================================
  // Analytics & Reports
  // ============================================

  /** Metrics by type (dashboard, sales, inventory, etc.) */
  metrics: (shopId: string, metricType: string) => ['metrics', shopId, metricType] as const,

  /** Dashboard summary */
  dashboardSummary: (shopId: string) => ['metrics', shopId, 'dashboard'] as const,

  /** Sales analytics */
  salesAnalytics: (shopId: string) => ['metrics', shopId, 'sales-analytics'] as const,

  /** Inventory analytics */
  inventoryAnalytics: (shopId: string) => ['metrics', shopId, 'inventory-analytics'] as const,

  /** Customer analytics */
  customerAnalytics: (shopId: string) => ['metrics', shopId, 'customer-analytics'] as const,

  /** Financial reports */
  financialReports: (shopId: string, reportType: string) =>
    ['reports', shopId, 'financial', reportType] as const,

  /** All analytics queries for a shop */
  analytics: (shopId: string) => ['analytics', shopId] as const,

  /** Sales analytics with date range */
  analyticsSales: (shopId: string, startDate: string, endDate: string) =>
    ['analytics', shopId, 'sales', startDate, endDate] as const,

  /** Financial analytics with date range */
  analyticsFinancial: (shopId: string, startDate: string, endDate: string) =>
    ['analytics', shopId, 'financial', startDate, endDate] as const,

  /** Inventory turnover analytics */
  analyticsInventory: (shopId: string, yearMonth: string) =>
    ['analytics', shopId, 'inventory', yearMonth] as const,

  /** Sales by category analytics */
  analyticsByCategory: (shopId: string, startDate: string, endDate: string) =>
    ['analytics', shopId, 'by-category', startDate, endDate] as const,

  /** Sales by metal analytics */
  analyticsByMetal: (shopId: string, startDate: string, endDate: string) =>
    ['analytics', shopId, 'by-metal', startDate, endDate] as const,

  /** Customer analytics with date range */
  analyticsCustomers: (shopId: string, startDate: string, endDate: string) =>
    ['analytics', shopId, 'customers', startDate, endDate] as const,

  /** Top selling products */
  analyticsTopProducts: (shopId: string, limit: number) =>
    ['analytics', shopId, 'top-products', limit] as const,

  /** Monthly shop metrics */
  analyticsMonthly: (shopId: string, startMonth: string, endMonth: string) =>
    ['analytics', shopId, 'monthly', startMonth, endMonth] as const,

  // ============================================
  // Notifications
  // ============================================

  /** User notifications */
  notifications: (userId: string) => ['notifications', userId] as const,

  /** Unread notification count */
  unreadNotifications: (userId: string) => ['notifications', userId, 'unread'] as const,

  // ============================================
  // AI & Conversations
  // ============================================

  /** AI conversations for a shop */
  conversations: (shopId: string) => ['ai-conversations', shopId] as const,

  /** Single conversation thread */
  conversation: (shopId: string, conversationId: string) =>
    ['ai-conversations', shopId, conversationId] as const,

  /** AI messages for a conversation */
  aiMessages: (conversationId: string) => ['ai-messages', conversationId] as const,

  /** AI credit pool for a shop */
  aiCredits: (shopId: string) => ['ai-credits', shopId] as const,

  /** AI credit allocation for a user */
  aiUserCredits: (shopId: string, userId: string) => ['ai-credits', shopId, userId] as const,

  /** AI suggestions */
  aiSuggestions: (shopId: string, context: string) => ['ai-suggestions', shopId, context] as const,

  // ============================================
  // Catalog / Reference Data (Shop-scoped)
  // ============================================

  /** Product categories for a shop */
  productCategories: (shopId: string) => ['categories', shopId] as const,

  /** Single product category */
  productCategory: (shopId: string, categoryId: string) =>
    ['categories', shopId, categoryId] as const,

  /** Metal types for a shop */
  metalTypes: (shopId: string) => ['metal-types', shopId] as const,

  /** Single metal type */
  metalType: (shopId: string, typeId: string) => ['metal-types', shopId, typeId] as const,

  /** Metal purities for a shop */
  metalPurities: (shopId: string) => ['metal-purities', shopId] as const,

  /** Metal purities filtered by metal type */
  metalPuritiesByType: (shopId: string, typeId: string) =>
    ['metal-purities', shopId, 'by-type', typeId] as const,

  /** Single metal purity */
  metalPurity: (shopId: string, purityId: string) => ['metal-purities', shopId, purityId] as const,

  /** Stone types for a shop */
  stoneTypes: (shopId: string) => ['stone-types', shopId] as const,

  /** Stone types filtered by category */
  stoneTypesByCategory: (shopId: string, category: string) =>
    ['stone-types', shopId, 'category', category] as const,

  /** Single stone type */
  stoneType: (shopId: string, stoneId: string) => ['stone-types', shopId, stoneId] as const,

  /** Product sizes for a shop */
  productSizes: (shopId: string) => ['product-sizes', shopId] as const,

  /** Product sizes filtered by category */
  productSizesByCategory: (shopId: string, categoryId: string) =>
    ['product-sizes', shopId, 'category', categoryId] as const,

  /** Single product size */
  productSize: (shopId: string, sizeId: string) => ['product-sizes', shopId, sizeId] as const,

  /** Metal prices for a shop */
  metalPrices: (shopId: string) => ['metal-prices', shopId] as const,

  /** Current (latest) metal prices */
  metalPricesCurrent: (shopId: string) => ['metal-prices', shopId, 'current'] as const,

  /** Metal prices for a specific date */
  metalPricesByDate: (shopId: string, date: string) =>
    ['metal-prices', shopId, 'date', date] as const,

  /** Metal prices for a date range */
  metalPricesByDateRange: (shopId: string, startDate: string, endDate: string) =>
    ['metal-prices', shopId, 'range', startDate, endDate] as const,

  /** Single metal price */
  metalPrice: (shopId: string, priceId: string) => ['metal-prices', shopId, priceId] as const,

  // ============================================
  // Global Reference Data (Not shop-scoped)
  // ============================================

  /** Unit types */
  unitTypes: () => ['reference', 'unit-types'] as const,

  /** Currency rates */
  currencyRates: () => ['reference', 'currency-rates'] as const,

  /** Global gold prices (market rates) */
  goldPrices: () => ['reference', 'gold-prices'] as const,

  // ============================================
  // Payment Reminders
  // ============================================

  /** All payment reminders for a shop */
  paymentReminders: (shopId: string) => ['payment-reminders', shopId] as const,

  /** Single payment reminder details */
  paymentReminder: (shopId: string, reminderId: string) =>
    ['payment-reminders', shopId, reminderId] as const,

  /** Upcoming payment reminders (due within X days) */
  upcomingReminders: (shopId: string, daysAhead: number) =>
    ['payment-reminders', shopId, 'upcoming', daysAhead] as const,

  /** Overdue payment reminders */
  overdueReminders: (shopId: string) => ['payment-reminders', shopId, 'overdue'] as const,

  /** Payment reminders by supplier */
  remindersBySupplier: (shopId: string, supplierId: string) =>
    ['payment-reminders', shopId, 'supplier', supplierId] as const,

  /** Payment reminders by status */
  remindersByStatus: (shopId: string, status: string) =>
    ['payment-reminders', shopId, 'status', status] as const,
} as const;

/**
 * Type helper to extract query key types
 */
export type QueryKeys = typeof queryKeys;

/**
 * Helper type to extract return type from function or value itself for readonly arrays
 */
type ExtractQueryKey<T> = T extends (...args: unknown[]) => infer R
  ? R
  : T extends readonly unknown[]
    ? T
    : never;

/**
 * Type for any query key in the system
 */
export type QueryKey = ExtractQueryKey<QueryKeys[keyof QueryKeys]>;

/**
 * Helper to create scoped invalidation patterns
 *
 * @example
 * // Invalidate all customer-related queries for a shop
 * queryClient.invalidateQueries({ queryKey: invalidateScope.customers('shop-123') })
 */
export const invalidateScope = {
  /** Invalidate all customer queries for a shop */
  customers: (shopId: string) => ['customers', shopId] as const,

  /** Invalidate all inventory queries for a shop */
  inventory: (shopId: string) => ['inventory', shopId] as const,

  /** Invalidate all sales queries for a shop */
  sales: (shopId: string) => ['sales', shopId] as const,

  /** Invalidate all supplier queries for a shop */
  suppliers: (shopId: string) => ['suppliers', shopId] as const,

  /** Invalidate all supplier category queries for a shop */
  supplierCategories: (shopId: string) => ['supplier-categories', shopId] as const,

  /** Invalidate all supplier transaction queries for a shop */
  supplierTransactions: (shopId: string) => ['supplier-transactions', shopId] as const,

  /** Invalidate all purchase queries for a shop */
  purchases: (shopId: string) => ['purchases', shopId] as const,

  /** Invalidate all workshop queries for a shop */
  workshops: (shopId: string) => ['workshops', shopId] as const,

  /** Invalidate all workshop order queries for a shop */
  workshopOrders: (shopId: string) => ['workshop-orders', shopId] as const,

  /** Invalidate all workshop transaction queries for a shop */
  workshopTransactions: (shopId: string) => ['workshop-transactions', shopId] as const,

  /** Invalidate all delivery queries for a shop */
  deliveries: (shopId: string) => ['deliveries', shopId] as const,

  /** Invalidate all courier queries for a shop */
  couriers: (shopId: string) => ['couriers', shopId] as const,

  /** Invalidate all courier transaction queries for a shop */
  courierTransactions: (shopId: string) => ['courier-transactions', shopId] as const,

  /** Invalidate all expense queries for a shop */
  expenses: (shopId: string) => ['expenses', shopId] as const,

  /** Invalidate all budget queries for a shop */
  budgets: (shopId: string) => ['budgets', shopId] as const,

  /** Invalidate all budget category queries for a shop */
  budgetCategories: (shopId: string) => ['budget-categories', shopId] as const,

  /** Invalidate all budget allocation queries for a shop */
  budgetAllocations: (shopId: string) => ['budget-allocations', shopId] as const,

  /** Invalidate all budget transaction queries for a shop */
  budgetTransactions: (shopId: string) => ['budget-transactions', shopId] as const,

  /** Invalidate budget summary queries for a shop */
  budgetSummary: (shopId: string) => ['budget-summary', shopId] as const,

  /** Invalidate all payroll queries for a shop */
  payroll: (shopId: string) => ['salary-periods', shopId] as const,

  /** Invalidate all metrics queries for a shop */
  metrics: (shopId: string) => ['metrics', shopId] as const,

  /** Invalidate all queries for a shop */
  allShopData: (shopId: string) => [shopId] as const,

  /** Invalidate all user-related queries */
  user: () => ['user'] as const,

  // Catalog data invalidation scopes

  /** Invalidate all category queries for a shop */
  categories: (shopId: string) => ['categories', shopId] as const,

  /** Invalidate all metal type queries for a shop */
  metalTypes: (shopId: string) => ['metal-types', shopId] as const,

  /** Invalidate all metal purity queries for a shop */
  metalPurities: (shopId: string) => ['metal-purities', shopId] as const,

  /** Invalidate all stone type queries for a shop */
  stoneTypes: (shopId: string) => ['stone-types', shopId] as const,

  /** Invalidate all product size queries for a shop */
  productSizes: (shopId: string) => ['product-sizes', shopId] as const,

  /** Invalidate all metal price queries for a shop */
  metalPrices: (shopId: string) => ['metal-prices', shopId] as const,

  /** Invalidate all payment reminder queries for a shop */
  paymentReminders: (shopId: string) => ['payment-reminders', shopId] as const,

  // Team data invalidation scopes

  /** Invalidate all shop member queries for a shop */
  shopMembers: (shopId: string) => ['shop-members', shopId] as const,

  /** Invalidate all staff invitation queries for a shop */
  staffInvitations: (shopId: string) => ['staff-invitations', shopId] as const,

  /** Invalidate all team-related queries for a shop */
  allTeam: (shopId: string) => ['team', shopId] as const,

  /** Invalidate all roles queries (global) */
  roles: () => ['roles'] as const,

  /** Invalidate all catalog data for a shop */
  allCatalog: (shopId: string) => {
    return [
      ['categories', shopId],
      ['metal-types', shopId],
      ['metal-purities', shopId],
      ['stone-types', shopId],
      ['product-sizes', shopId],
      ['metal-prices', shopId],
    ] as const;
  },

  // AI data invalidation scopes

  /** Invalidate all AI conversation queries for a shop */
  aiConversations: (shopId: string) => ['ai-conversations', shopId] as const,

  /** Invalidate AI credit queries for a shop */
  aiCredits: (shopId: string) => ['ai-credits', shopId] as const,

  // Analytics data invalidation scopes

  /** Invalidate all analytics queries for a shop */
  analytics: (shopId: string) => ['analytics', shopId] as const,

  /** Invalidate sales analytics queries for a shop */
  analyticsSales: (shopId: string) => ['analytics', shopId, 'sales'] as const,

  /** Invalidate financial analytics queries for a shop */
  analyticsFinancial: (shopId: string) => ['analytics', shopId, 'financial'] as const,

  /** Invalidate inventory analytics queries for a shop */
  analyticsInventory: (shopId: string) => ['analytics', shopId, 'inventory'] as const,

  /** Invalidate customer analytics queries for a shop */
  analyticsCustomers: (shopId: string) => ['analytics', shopId, 'customers'] as const,
} as const;
