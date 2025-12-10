/**
 * Data Hooks
 *
 * TanStack Query v5 wrappers for Supabase operations.
 * Provides typed, cached data fetching and mutations
 * with automatic state management and error handling.
 *
 * @module lib/hooks/data
 */

// Query hook for SELECT operations
export {
  useSupabaseQuery,
  type UseSupabaseQueryOptions,
  type UseSupabaseQueryResult,
} from './useSupabaseQuery';

// Mutation hook for INSERT, UPDATE, UPSERT, DELETE operations
export {
  useSupabaseMutation,
  type UseSupabaseMutationOptions,
  type UseSupabaseMutationResult,
  type MutationType,
  type MutationVariables,
  type InsertMutationVariables,
  type UpdateMutationVariables,
  type UpsertMutationVariables,
  type DeleteMutationVariables,
} from './useSupabaseMutation';

// Realtime hook for Postgres Changes subscriptions
export {
  useRealtime,
  type UseRealtimeOptions,
  type UseRealtimeReturn,
  type UseRealtimePayload,
  type RealtimeEvent,
  type RealtimePayload,
  type RealtimeConnectionStatus,
  type ReconnectionConfig,
} from './useRealtime';

// ============================================
// Customer Hooks
// ============================================

// Customer list with pagination and search
export {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useInvalidateCustomers,
  type Customer,
  type CustomerInsert,
  type CustomerUpdate,
  type UseCustomersOptions,
  type UseCustomersReturn,
} from './useCustomers';

// Single customer with balance info
export {
  useCustomer,
  usePrefetchCustomer,
  useCustomersByIds,
  useCustomerSearch,
  type CustomerWithDetails,
  type UseCustomerOptions,
  type UseCustomerReturn,
} from './useCustomer';

// Customer transactions (IMMUTABLE LEDGER - READ ONLY)
export {
  useCustomerTransactions,
  useCustomerTransactionsInfinite,
  useCustomerTransactionSummary,
  useRecentCustomerTransactions,
  type CustomerTransaction,
  type CustomerTransactionWithDetails,
  type TransactionType,
  type UseCustomerTransactionsOptions,
  type UseCustomerTransactionsReturn,
} from './useCustomerTransactions';

// ============================================
// Catalog Hooks
// ============================================

// Product Categories
export {
  useCategories,
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useInvalidateCategories,
  categoryKeys,
  type ProductCategory,
  type ProductCategoryInsert,
  type ProductCategoryUpdate,
  type UseCategoriesOptions,
} from './useCategories';

// Metal Types and Purities
export {
  // Metal Types
  useMetalTypes,
  useMetalType,
  useCreateMetalType,
  useUpdateMetalType,
  useDeleteMetalType,
  // Metal Purities
  useMetalPurities,
  useMetalPurity,
  useCreateMetalPurity,
  useUpdateMetalPurity,
  useDeleteMetalPurity,
  // Utility
  useInvalidateMetals,
  metalKeys,
  // Types - Metal Types
  type MetalType,
  type MetalTypeInsert,
  type MetalTypeUpdate,
  type UseMetalTypesOptions,
  // Types - Metal Purities
  type MetalPurity,
  type MetalPurityWithType,
  type MetalPurityInsert,
  type MetalPurityUpdate,
  type UseMetalPuritiesOptions,
} from './useMetals';

// Stone Types
export {
  useStoneTypes,
  useStoneType,
  useStoneCategories,
  useCreateStoneType,
  useUpdateStoneType,
  useDeleteStoneType,
  useInvalidateStones,
  stoneKeys,
  type StoneType,
  type StoneTypeInsert,
  type StoneTypeUpdate,
  type StoneCategory,
  type UseStoneTypesOptions,
} from './useStones';

// Product Sizes
export {
  useSizes,
  useSize,
  useSizeSystems,
  useCreateSize,
  useUpdateSize,
  useDeleteSize,
  useInvalidateSizes,
  sizeKeys,
  type ProductSize,
  type ProductSizeWithCategory,
  type ProductSizeInsert,
  type ProductSizeUpdate,
  type SizeSystem,
  type UseSizesOptions,
} from './useSizes';

// Metal Prices
// NOTE: metal_prices table does not exist in the database schema
// These exports have been disabled until the table is created
// export {
//   useMetalPrices,
//   useMetalPrice,
//   useCurrentMetalPrices,
//   useLatestMetalPrice,
//   useCreateMetalPrice,
//   useUpdateMetalPrice,
//   useDeleteMetalPrice,
//   useInvalidateMetalPrices,
//   metalPriceKeys,
//   type MetalPrice,
//   type MetalPriceWithDetails,
//   type MetalPriceInsert,
//   type MetalPriceUpdate,
//   type DateRangeFilter,
//   type UseMetalPricesOptions,
// } from './useMetalPrices';

// ============================================
// Inventory Hooks
// ============================================

// Inventory items list with pagination, filtering, and real-time
export {
  useInventoryItems,
  useInventoryItemsInfinite,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  useUpdateInventoryItemStatus,
  useBulkUpdateInventoryItemStatus,
  useInvalidateInventory,
  inventoryKeys,
  type InventoryItem,
  type InventoryItemInsert,
  type InventoryItemUpdate,
  type InventoryItemWithRelations,
  type UseInventoryItemsOptions,
  type UseInventoryItemsReturn,
} from './useInventoryItems';

// Single inventory item with stones and certifications
export {
  useInventoryItem,
  usePrefetchInventoryItem,
  useInventoryItemByBarcode,
  useInventoryItemsByIds,
  // Stone mutations
  useAddItemStone,
  useUpdateItemStone,
  useDeleteItemStone,
  // Certification mutations
  useAddItemCertification,
  useUpdateItemCertification,
  useDeleteItemCertification,
  // Types
  type ItemStone,
  type ItemStoneInsert,
  type ItemStoneUpdate,
  type ItemStoneWithType,
  type ItemCertification,
  type ItemCertificationInsert,
  type ItemCertificationUpdate,
  type InventoryItemFull,
  type UseInventoryItemOptions,
  type UseInventoryItemReturn,
  type ItemDeletionState,
} from './useInventoryItem';

// Inventory filter state management
export {
  useInventoryFilters,
  useInventorySearch,
  DEFAULT_INVENTORY_FILTERS,
  INVENTORY_FILTER_PRESETS,
  type InventoryFiltersState,
  type UseInventoryFiltersOptions,
  type UseInventoryFiltersReturn,
  type InventoryFilterPreset,
} from './useInventoryFilters';

// Inventory real-time subscription hook
export {
  useInventoryRealtime,
  formatInventoryEvent,
  getInventoryEventIcon,
  getInventoryEventColor,
  type InventoryRealtimeEventType,
  type InventoryRealtimeEvent,
  type UseInventoryRealtimeOptions,
  type UseInventoryRealtimeReturn,
} from './useInventoryRealtime';

// ============================================
// Sales Hooks
// ============================================

// Sales list with pagination and filtering
export {
  useSales,
  useSalesByCustomer,
  useSalesByDateRange,
  useCreateSale,
  useUpdateSale,
  useCancelSale,
  useInvalidateSales,
  saleKeys,
  type Sale,
  type SaleInsert,
  type SaleUpdate,
  type SaleItemInsert,
  type SalePaymentInsert,
  type SaleWithCustomer,
  type SaleStatus,
  type PaymentStatus,
  type DateRangeFilter as SaleDateRangeFilter,
  type UseSalesOptions,
  type UseSalesReturn,
  type CreateSaleData,
} from './useSales';

// Single sale with full details
export {
  useSale,
  usePrefetchSale,
  useSalesByIds,
  useSaleSearch,
  type SaleItemWithDetails,
  type SaleWithDetails,
  type UseSaleOptions,
  type UseSaleReturn,
} from './useSale';

// Sale items (line items within a sale)
export {
  useSaleItems,
  useAddSaleItem,
  useUpdateSaleItem,
  useReturnSaleItem,
  useRemoveSaleItem,
  useInvalidateSaleItems,
  saleItemKeys,
  type SaleItem,
  type SaleItemUpdate,
  type SaleItemWithInventory,
  type UseSaleItemsOptions,
  type UseSaleItemsReturn,
} from './useSaleItems';

// ============================================
// Supplier Hooks
// ============================================

// Supplier list with pagination and search
export {
  useSuppliers,
  useSupplier,
  useSupplierCategories,
  useSupplierTransactions,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useInvalidateSuppliers,
  supplierKeys,
  type Supplier,
  type SupplierInsert,
  type SupplierUpdate,
  type SupplierCategory,
  type SupplierCategoryInsert,
  type SupplierCategoryUpdate,
  type SupplierTransaction,
  type SupplierWithCategory,
  type UseSuppliersOptions,
  type UseSuppliersReturn,
  type UseSupplierTransactionsOptions,
  type UseSupplierTransactionsReturn,
} from './useSuppliers';

// ============================================
// Purchase Hooks
// ============================================

// Purchases list with pagination and filtering
export {
  usePurchases,
  usePurchasesBySupplier,
  usePurchasesByDateRange,
  usePendingPurchases,
  useCreatePurchase,
  useUpdatePurchase,
  useRecordPurchasePayment,
  useCancelPurchase,
  useGeneratePurchaseNumber,
  useInvalidatePurchases,
  purchaseKeys,
  type Purchase,
  type PurchaseInsert,
  type PurchaseUpdate,
  type PurchaseWithSupplier,
  type PurchasePaymentStatus,
  type DateRangeFilter as PurchaseDateRangeFilter,
  type AmountRangeFilter,
  type UsePurchasesOptions,
  type UsePurchasesReturn,
  type CreatePurchaseData,
} from './usePurchases';

// Single purchase with full details
export {
  usePurchase,
  usePrefetchPurchase,
  type UsePurchaseOptions,
  type UsePurchaseReturn,
} from './usePurchases';

// ============================================
// File Upload Hooks
// ============================================

// File uploads for purchases, inventory items, etc.
export {
  useEntityFiles,
  useUploadFile,
  useDeleteFile,
  useLinkFilesToEntity,
  fileUploadKeys,
  type FileEntityType,
  type FileUpload,
  type FileUploadResult,
  type UploadOptions,
} from './useFileUpload';

// ============================================
// Budget Hooks
// ============================================

// Budget categories, allocations, transactions, and summaries
export {
  // Category hooks
  useBudgetCategories,
  useBudgetCategory,
  useCreateBudgetCategory,
  useUpdateBudgetCategory,
  useDeleteBudgetCategory,
  // Allocation hooks
  useBudgetAllocations,
  useBudgetAllocation,
  useCreateBudgetAllocation,
  useUpdateBudgetAllocation,
  useAllocateBudget,
  useAdjustBudget,
  // Transaction hooks (immutable ledger - read only)
  useBudgetTransactions,
  // Summary hook
  useBudgetSummary,
  // Utility
  useInvalidateBudgets,
  budgetKeys,
  // Types - Categories
  type BudgetCategory,
  type BudgetCategoryInsert,
  type BudgetCategoryUpdate,
  type UseBudgetCategoriesOptions,
  type UseBudgetCategoriesReturn,
  // Types - Allocations
  type BudgetAllocation,
  type BudgetAllocationInsert,
  type BudgetAllocationUpdate,
  type BudgetAllocationWithCategory,
  type UseBudgetAllocationsOptions,
  type UseBudgetAllocationsReturn,
  // Types - Transactions
  type BudgetTransaction,
  type UseBudgetTransactionsOptions,
  type UseBudgetTransactionsReturn,
  // Types - Summary
  type BudgetSummary,
  type UseBudgetSummaryOptions,
} from './useBudgets';

// ============================================
// Payment Reminder Hooks
// ============================================

// Payment reminders list with pagination and filtering
export {
  // List and detail hooks
  usePaymentReminders,
  usePaymentReminder,
  useUpcomingReminders,
  useOverdueReminders,
  // Mutation hooks
  useCreatePaymentReminder,
  useUpdatePaymentReminder,
  useDeletePaymentReminder,
  useMarkReminderComplete,
  useSnoozeReminder,
  // Utility
  useInvalidatePaymentReminders,
  paymentReminderKeys,
  // Types
  type PaymentReminder,
  type PaymentReminderWithSupplier,
  type PaymentReminderInsert,
  type PaymentReminderUpdate,
  type ReminderSupplier,
  type UsePaymentRemindersOptions,
  type UsePaymentRemindersReturn,
  type UseUpcomingRemindersOptions,
  type UseOverdueRemindersOptions,
  type UseRemindersWidgetReturn,
} from './usePaymentReminders';

// ============================================
// Delivery Hooks
// ============================================

// Deliveries and couriers with pagination and filtering
export {
  // Delivery hooks
  useDeliveries,
  useDelivery,
  useCreateDelivery,
  useUpdateDelivery,
  useUpdateDeliveryStatus,
  // Courier hooks
  useCouriers,
  useCourier,
  useCourierTransactions,
  useCreateCourier,
  useUpdateCourier,
  useDeleteCourier,
  // Utility
  useInvalidateDeliveries,
  useInvalidateCouriers,
  deliveryKeys,
  courierKeys,
  // Types - Delivery
  type Delivery,
  type DeliveryInsert,
  type DeliveryUpdate,
  type DeliveryWithCourier,
  type DeliveryStatus,
  type UseDeliveriesOptions,
  type UseDeliveriesReturn,
  // Types - Courier
  type CourierCompany,
  type CourierCompanyInsert,
  type CourierCompanyUpdate,
  type CourierTransaction,
  type CourierStatus,
  type UseCouriersOptions,
  type UseCouriersReturn,
  type UseCourierTransactionsOptions,
  type UseCourierTransactionsReturn,
} from './useDeliveries';

// ============================================
// Workshop Hooks
// ============================================

// Workshops and orders with pagination and filtering
export {
  // Workshop hooks
  useWorkshops,
  useWorkshop,
  useCreateWorkshop,
  useUpdateWorkshop,
  useDeleteWorkshop,
  // Order hooks
  useWorkshopOrders,
  useWorkshopOrder,
  useCreateWorkshopOrder,
  useUpdateWorkshopOrderStatus,
  // Transaction hooks (immutable ledger - read only)
  useWorkshopTransactions,
  // Utility
  useInvalidateWorkshops,
  workshopKeys,
  // Types - Workshop
  type Workshop,
  type WorkshopInsert,
  type WorkshopUpdate,
  type UseWorkshopsOptions,
  type UseWorkshopsReturn,
  // Types - Order
  type WorkshopOrder,
  type WorkshopOrderWithWorkshop,
  type WorkshopOrderFull,
  type WorkshopOrderItem,
  type UseWorkshopOrdersOptions,
  type UseWorkshopOrdersReturn,
  // Types - Transaction
  type WorkshopTransaction,
  type UseWorkshopTransactionsOptions,
  type UseWorkshopTransactionsReturn,
} from './useWorkshops';

// ============================================
// Expense Hooks
// ============================================

// Expenses with pagination, filtering, and approval workflow
export {
  // Expense list hooks
  useExpenses,
  useExpense,
  // Category hooks
  useExpenseCategories,
  useExpenseCategory,
  // Recurring expense hooks
  useRecurringExpenses,
  // Expense mutations
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  // Approval workflow mutations
  useApproveExpense,
  useRejectExpense,
  // Category mutations
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
  useDeleteExpenseCategory,
  // Recurring expense mutations
  useCreateRecurringExpense,
  useUpdateRecurringExpense,
  usePauseRecurringExpense,
  useResumeRecurringExpense,
  useDeleteRecurringExpense,
  // Utility
  useInvalidateExpenses,
  expenseKeys,
  // Types - Expense
  type Expense,
  type ExpenseInsert,
  type ExpenseUpdate,
  type ExpenseWithCategory,
  type UseExpensesOptions,
  type UseExpensesReturn,
  // Types - Category
  type ExpenseCategory,
  type ExpenseCategoryInsert,
  type ExpenseCategoryUpdate,
  // Types - Recurring
  type RecurringExpense,
  type RecurringExpenseInsert,
  type RecurringExpenseUpdate,
  type RecurringExpenseWithCategory,
  type UseRecurringExpensesOptions,
  type UseRecurringExpensesReturn,
} from './useExpenses';

// ============================================
// Shop Settings Hooks
// ============================================

// Shop settings with update and logo upload
export {
  useShopSettings,
  useUpdateShopSettings,
  useUploadShopLogo,
  useInvalidateShopSettings,
  shopSettingsKeys,
  type Shop,
  type ShopUpdate,
  type ShopSettings,
  type ShopSettingsUpdate,
  type UseShopSettingsReturn,
  type UploadLogoResult,
} from './useShopSettings';

// ============================================
// Team Management Hooks
// ============================================

// Team members, roles, and invitations
export {
  // Query hooks
  useTeamMembers,
  useRoles,
  usePendingInvitations,
  // Mutation hooks
  useInviteTeamMember,
  useRemoveTeamMember,
  useReactivateTeamMember,
  useUpdateMemberRole,
  useCancelInvitation,
  useResendInvitation,
  // Utility
  useInvalidateTeam,
  teamKeys,
  // Types - Base
  type ShopAccess,
  type ShopAccessInsert,
  type ShopAccessUpdate,
  type Role,
  type User,
  type StaffInvitation,
  type StaffInvitationInsert,
  // Types - Composite
  type TeamMember,
  type TeamMemberDisplay,
  type PendingInvitation,
  // Types - Options
  type UseTeamMembersOptions,
  type UsePendingInvitationsOptions,
  type UseRolesOptions,
  // Types - Returns
  type UseTeamMembersReturn,
  type UseRolesReturn,
  type UsePendingInvitationsReturn,
  // Types - Inputs
  type InviteTeamMemberInput,
  type UpdateMemberRoleInput,
} from './useTeam';

// ============================================
// AI Hooks
// ============================================

// AI conversations, messages, and credits
export {
  // Query hooks
  useAIConversations,
  useAIConversation,
  useAIMessages,
  useAICredits,
  // Mutation hooks
  useCreateConversation,
  useSendMessage,
  // Utility
  useInvalidateAI,
  aiKeys,
  // Types - Base
  type AIConversation,
  type AIConversationInsert,
  type AIConversationUpdate,
  type AIMessage,
  type AIMessageInsert,
  type AICreditPool,
  type AICreditAllocation,
  type AITokenUsage,
  type MessageRole,
  // Types - Composite
  type AIConversationWithStats,
  type AICreditSummary,
  // Types - Options
  type UseAIConversationsOptions,
  type UseAIConversationOptions,
  type UseAIMessagesOptions,
  type UseAICreditsOptions,
  // Types - Returns
  type UseAIConversationsReturn,
  type UseAIConversationReturn,
  type UseAIMessagesReturn,
  type UseAICreditsReturn,
  // Types - Inputs
  type CreateConversationInput,
  type SendMessageInput,
} from './useAI';

// ============================================
// Analytics Hooks
// ============================================

// Analytics metrics for dashboards, reports, and insights
export {
  // Sales analytics
  useSalesAnalytics,
  // Financial analytics
  useFinancialAnalytics,
  // Inventory analytics
  useInventoryAnalytics,
  // Category breakdown
  useSalesByCategory,
  // Metal breakdown
  useSalesByMetal,
  // Customer analytics
  useCustomerAnalytics,
  // Top products
  useTopProducts,
  // Monthly metrics
  useMonthlyMetrics,
  // Utility
  useInvalidateAnalytics,
  analyticsKeys,
  // Types - Raw Metrics
  type DailyShopMetrics,
  type DailyFinancialMetrics,
  type DailyCustomerMetrics,
  type DailySalesByCategory,
  type DailySalesByMetal,
  type MonthlyShopMetrics,
  type InventoryTurnoverMetrics,
  type TopProduct,
  // Types - Aggregated Results
  type SalesAnalyticsSummary,
  type FinancialAnalyticsSummary,
  type CategoryBreakdown,
  type MetalBreakdown,
  type CustomerAnalyticsSummary,
  // Types - Date Range
  type AnalyticsDateRange,
  // Types - Options
  type UseSalesAnalyticsOptions,
  type UseFinancialAnalyticsOptions,
  type UseInventoryAnalyticsOptions,
  type UseSalesByCategoryOptions,
  type UseSalesByMetalOptions,
  type UseCustomerAnalyticsOptions,
  type UseTopProductsOptions,
  type UseMonthlyMetricsOptions,
  // Types - Returns
  type UseSalesAnalyticsReturn,
  type UseFinancialAnalyticsReturn,
  type UseInventoryAnalyticsReturn,
  type UseSalesByCategoryReturn,
  type UseSalesByMetalReturn,
  type UseCustomerAnalyticsReturn,
  type UseTopProductsReturn,
  type UseMonthlyMetricsReturn,
} from './useAnalytics';

// ============================================
// Optimistic Update Hooks
// ============================================

// Optimistic update with version-based conflict detection
export {
  useOptimisticUpdate,
  useOptimisticInventoryUpdate,
  useOptimisticCustomerUpdate,
  useOptimisticSupplierUpdate,
  useOptimisticShopUpdate,
  VersionConflictError,
  type VersionedRecord,
  type ConflictInfo,
  type UseOptimisticUpdateOptions,
  type OptimisticUpdateVariables,
  type UseOptimisticUpdateReturn,
} from './useOptimisticUpdate';

// ============================================
// Subscription Hooks
// ============================================

// Subscription and plan data for the current shop
export {
  // Query hooks
  useSubscriptionPlan,
  useInvalidateSubscription,
  // Helper functions
  planNameToTier,
  // Query keys
  subscriptionKeys,
  // Types - Subscription
  type SubscriptionPlan,
  type SubscriptionStatus,
  type UseSubscriptionPlanReturn,
  // Types - Plan
  type Plan,
  type PlanTier,
  type PlanFeatures,
} from './useSubscription';
