/**
 * Type Definitions
 * Shared TypeScript types and interfaces for the Aymur Platform
 */

// Database types auto-generated from Supabase schema
export type { Database, Json, Tables, InsertTables, UpdateTables } from './database';

// Re-export with alternative names for convenience
export type { InsertTables as TablesInsert } from './database';
export type { UpdateTables as TablesUpdate } from './database';

// Export commonly used table types
export type {
  Shop,
  User,
  Customer,
  CustomerTransaction,
  InventoryItem,
  ItemStone,
  Sale,
  SaleItem,
  SalePayment,
  Supplier,
  SupplierCategory,
  SupplierTransaction,
  SupplierPayment,
  Purchase,
  Workshop,
  WorkshopOrder,
  WorkshopTransaction,
  WorkshopPayment,
  CourierCompany,
  CourierTransaction,
  CourierPayment,
  Delivery,
  Expense,
  ExpenseCategory,
  ExpensePayment,
  ExpenseApproval,
  RecurringExpense,
  BudgetCategory,
  BudgetAllocation,
  BudgetTransaction,
  RecycledItem,
  ProductCategory,
  MetalType,
  MetalPurity,
  MetalPrice,
  StoneType,
  ProductSize,
  ShopSetting,
  FileUpload,
  ItemCertification,
  PaymentReminder,
  Role,
  ShopAccess,
  StaffInvitation,
} from './database';

// Address types for Google Places autocomplete
export type { ParsedAddress } from './address';
export { EMPTY_PARSED_ADDRESS } from './address';
