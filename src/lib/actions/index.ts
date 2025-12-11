/**
 * Server Actions Exports
 *
 * Centralized exports for all server actions used in the Aymur Platform.
 *
 * Import Guide:
 * - Auth actions: Use functions from './auth'
 * - Shop actions: Use functions from './shop'
 *
 * All server actions:
 * - Run on the server only
 * - Return structured ActionResult types
 * - Handle errors gracefully
 * - Use the Supabase server client for database operations
 *
 * @module lib/actions
 */

// Auth actions
export {
  // Core auth actions
  signIn,
  signUp,
  signOut,
  signOutWithoutRedirect,
  // Password management
  resetPasswordRequest,
  updatePassword,
  // Email verification
  resendVerificationEmail,
  // OAuth
  signInWithOAuth,
  // Session helpers
  getCurrentUser,
  getCurrentSession,
} from './auth';

// Auth types
export type {
  ActionResult,
  SignInFormData,
  SignUpFormData,
  SignInResult,
  SignUpResult,
  OAuthSignInResult,
} from './auth';

// Shop actions
export {
  // Shop management
  createShop,
  updateShop,
  deleteShop,
  getShopDetails,
  // Subscription limits
  getShopLimits,
  canCreateShop,
} from './shop';

// Shop types
export type { CreateShopInput, UpdateShopInput, CreatedShop, SubscriptionLimits } from './shop';

// Profile actions
export {
  // Profile management
  getProfile,
  updateProfile,
  // Avatar management
  uploadAvatar,
  deleteAvatar,
} from './profile';

// Profile types
export type { UserProfile, UpdateProfileInput, AvatarUploadResult } from './profile';

// Customer actions
export {
  // Customer CRUD
  createCustomer,
  updateCustomer,
  deleteCustomer,
  // Balance (read-only)
  getCustomerBalance,
  // File uploads
  uploadCustomerIdCard,
} from './customer';

// Customer types
export type { CustomerBalance, IdCardUploadResult } from './customer';

// Supplier actions
export {
  // Supplier CRUD
  createSupplier,
  updateSupplier,
  deleteSupplier,
  // Balance (read-only)
  getSupplierBalance,
  // Payments
  recordSupplierPayment,
} from './supplier';

// Supplier types
export type {
  ActionResult as SupplierActionResult,
  SupplierBalance,
  PaymentResult,
} from './supplier';

// Purchase actions
export {
  // Purchase CRUD
  createPurchase,
  updatePurchase,
  cancelPurchase,
  deletePurchase,
  // Payment
  recordPurchasePayment,
  // Number generation
  generatePurchaseNumber,
} from './purchase';

// Purchase types
export type {
  Purchase,
  PurchaseWithSupplier,
  ActionResult as PurchaseActionResult,
} from './purchase';

// Budget actions
export {
  // Budget category CRUD
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  // Budget allocation
  allocateBudget,
  adjustBudget,
  // Budget summary and comparison
  getBudgetSummary,
  getBudgetVsActual,
  // Budget transfer
  transferBudget,
} from './budget';

// Budget types
export type {
  ActionResult as BudgetActionResult,
  BudgetCategory,
  BudgetAllocation,
  BudgetAllocationWithCategory,
  BudgetTransaction,
  BudgetVsActual,
  BudgetSummary,
} from './budget';

// Payment Reminder actions
export {
  // Reminder CRUD
  createReminder,
  updateReminder,
  deleteReminder,
  // Status actions
  markAsCompleted,
  snoozeReminder,
  // Dashboard widgets
  getUpcomingReminders,
  getOverdueReminders,
} from './paymentReminder';

// Payment Reminder types
export type {
  ActionResult as PaymentReminderActionResult,
  PaymentReminderWithSupplier,
  UpcomingRemindersResult,
} from './paymentReminder';

// Delivery actions
export {
  // Delivery CRUD
  createDelivery,
  updateDelivery,
  updateDeliveryStatus,
  // Courier CRUD
  createCourier,
  updateCourier,
  deleteCourier,
  // Courier balance and payments
  getCourierBalance,
  recordCourierPayment,
} from './delivery';

// Delivery types
export type {
  ActionResult as DeliveryActionResult,
  CourierBalance,
  CourierPaymentResult,
} from './delivery';

// Workshop actions
export {
  // Workshop CRUD
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  // Order management
  createWorkshopOrder,
  updateOrderStatus,
  // Number generation
  generateOrderNumber,
  // Payments (immutable ledger INSERT)
  recordWorkshopPayment,
} from './workshop';

// Workshop types
export type {
  ActionResult as WorkshopActionResult,
  Workshop,
  WorkshopOrder,
  WorkshopTransaction,
  PaymentResult as WorkshopPaymentResult,
} from './workshop';

// Expense actions
export {
  // Expense CRUD
  createExpense,
  updateExpense,
  deleteExpense,
  // Approval workflow
  approveExpense,
  rejectExpense,
  // Category management
  createExpenseCategory,
  updateExpenseCategory,
  // Recurring expense management
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  pauseRecurringExpense,
  resumeRecurringExpense,
  // Generate expense from recurring template
  generateExpenseFromRecurring,
} from './expense';

// Expense types
export type {
  ActionResult as ExpenseActionResult,
  Expense,
  ExpenseCategory,
  RecurringExpense,
} from './expense';

// Shop Settings actions
export {
  // Get settings
  getShopSettings,
  // Update settings
  updateShopSettings,
  updateShopLogo,
  // Reference data
  getAvailableCurrencies,
  getAvailableTimezones,
  getAvailableLanguages,
  // Constants
  SUPPORTED_CURRENCIES,
  SUPPORTED_TIMEZONES,
  SUPPORTED_LANGUAGES,
  // Validation schema
  UpdateShopSettingsSchema,
} from './shopSettings';

// Shop Settings types
export type {
  ShopSettings,
  CurrencyOption,
  TimezoneOption,
  UpdateShopSettingsInput,
} from './shopSettings';

// Team actions
export {
  // Team members
  getTeamMembers,
  getRoles,
  // Invitations
  getPendingInvitations,
  inviteTeamMember,
  cancelInvitation,
  resendInvitation,
  // Member management
  updateMemberRole,
  updateMemberPermissions,
  deactivateMember,
  reactivateMember,
  // Validation schemas
  InviteTeamMemberSchema,
  UpdateMemberRoleSchema,
  UpdateMemberPermissionsSchema,
} from './team';

// Team types
export type {
  Role,
  TeamMember,
  PendingInvitation,
  InviteTeamMemberInput,
  UpdateMemberRoleInput,
} from './team';

// AI actions
export {
  // Conversation management
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  // Message management
  addMessage,
  // Credit management
  getAICredits,
  trackTokenUsage,
  checkCreditsAvailable,
  // Validation schemas
  CreateConversationSchema,
  AddMessageSchema,
  TokenUsageSchema,
  CheckCreditsSchema,
} from './ai';

// AI types
export type {
  ActionResult as AIActionResult,
  ConversationWithMessages,
  CreditPoolInfo,
  UserCreditInfo,
  TokenUsageInput,
  AddMessageInput,
} from './ai';

// Analytics actions
export {
  // Sales metrics
  getSalesMetrics,
  // Financial metrics
  getFinancialMetrics,
  // Inventory metrics
  getInventoryMetrics,
  // Product analytics
  getTopProducts,
  // Category breakdown
  getSalesByCategory,
  // Metal breakdown
  getSalesByMetal,
  // Customer metrics
  getCustomerMetrics,
  // Time-series data
  getRevenueByPeriod,
} from './analytics';

// Analytics types
export type {
  ActionResult as AnalyticsActionResult,
  DateRange,
  SalesMetrics,
  DailySalesData,
  FinancialMetrics,
  InventoryMetrics,
  TopProduct,
  SalesByCategory,
  SalesByMetal,
  CustomerMetrics,
  RevenuePeriodData,
  PeriodType,
} from './analytics';

// Metal Prices actions
export {
  // Price queries
  getMetalPrices,
  getCurrentMetalPrices,
  getMetalPriceHistory,
  getMetalPrice,
  // Price mutations
  createMetalPrice,
  updateMetalPrice,
  deleteMetalPrice,
  // Reference data
  getMetalTypes,
  getMetalPurities,
} from './metal-prices';

// Metal Prices types
export type {
  MetalType,
  MetalPurity,
  MetalPrice,
  MetalPriceWithDetails,
  PriceHistoryPoint,
  MetalPriceFilters,
  CreateMetalPriceInput,
  UpdateMetalPriceInput,
} from './metal-prices';

// Data Transfer actions
export {
  // Export functions
  exportInventory,
  exportCustomers,
  exportSales,
  exportSuppliers,
  getExportPreview,
  // Import functions
  validateImportFile,
  parseImportData,
  importInventory,
  importCustomers,
  getImportTemplate,
} from './data-transfer';

// Data Transfer types
export type {
  ExportFormat,
  ImportType,
  ImportOptions,
  ImportResult,
  ImportError,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ColumnMapping,
  ParsedImportData,
  ExportPreview,
  InventoryExportFilters,
  CustomerExportFilters,
  DateRange as DataTransferDateRange,
  ImportTemplate,
  TemplateColumn,
} from './data-transfer';

// Audit Log actions
export {
  // Query functions
  getAuditLogs,
  getAuditLogEntry,
  getAuditLogStats,
  exportAuditLogs,
} from './audit-log';

// Audit Log types
export type {
  AuditAction,
  AuditEntityType,
  AuditChange,
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPage,
  AuditLogStats,
  AuditExportFormat,
  AuditLogExport,
} from './audit-log';

// Onboarding actions
export {
  // Status and navigation
  getOnboardingStatus,
  updateOnboardingStep,
  determineCorrectStep,
  // Helper functions
  getNextStep,
  getStepPath,
  isStepCompleted,
} from './onboarding';

// Onboarding types
export type { OnboardingStep, OnboardingStatus } from './onboarding';
