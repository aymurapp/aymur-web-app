/**
 * Utility Functions
 * Pure helper functions for data transformation, formatting, etc.
 */

// Class name merger
export { cn } from './cn';

// Formatting utilities
export {
  formatCurrency,
  formatWeight,
  formatDate,
  formatDateTime,
  formatPhone,
  formatPercentage,
  formatNumber,
  formatDecimal,
  formatFileSize,
  formatBarcode,
  truncateText,
  formatMetalPurity,
} from './format';

// Validation schemas and types
export {
  // Primitive schemas
  emailSchema,
  phoneSchema,
  phoneRequiredSchema,
  passwordSchema,
  strongPasswordSchema,
  currencySchema,
  optionalCurrencySchema,
  weightSchema,
  jewelryWeightSchema,
  // ID schemas
  uuidSchema,
  shopIdSchema,
  userIdSchema,
  entityIdSchema,
  // Name and text schemas
  fullNameSchema,
  shopNameSchema,
  descriptionSchema,
  notesSchema,
  // Address schemas
  addressSchema,
  partialAddressSchema,
  // Auth form schemas
  loginSchema,
  registerSchema,
  registerWithConfirmSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  // Business entity schemas
  customerSchema,
  supplierSchema,
  // Jewelry-specific schemas
  metalPuritySchema,
  barcodeSchema,
  skuSchema,
  // Date schemas
  dateStringSchema,
  dateRangeSchema,
  // Pagination and filtering
  paginationSchema,
  sortSchema,
  listQuerySchema,
} from './validation';

// Validation types
export type {
  LoginInput,
  RegisterInput,
  RegisterWithConfirmInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  CustomerInput,
  SupplierInput,
  AddressInput,
  DateRangeInput,
  PaginationInput,
  SortInput,
  ListQueryInput,
} from './validation';

// Customer schemas (domain-specific)
export {
  // Enums
  clientTypeEnum,
  financialStatusEnum,
  // Main schemas
  customerSchema as customerFormSchema, // Renamed to avoid conflict with validation.ts customerSchema
  customerCreateSchema,
  customerUpdateSchema,
  customerQuickAddSchema,
  creditLimitSchema,
  creditLimitUpdateSchema,
  customerSearchSchema,
  // Validation helpers
  validateCustomer,
  validateCustomerQuickAdd,
  validateCreditLimit,
  validateCustomerSearch,
  formatCustomerErrors,
} from './schemas';

// Customer types
export type {
  ClientType,
  FinancialStatus,
  CustomerInput as CustomerFormInput, // Renamed to avoid conflict
  CustomerCreateInput,
  CustomerUpdateInput,
  CustomerQuickAddInput,
  CreditLimitInput,
  CreditLimitUpdateInput,
  CustomerSearchInput,
} from './schemas';

// Inventory schemas (domain-specific)
export {
  // Enums
  itemTypeEnum,
  ownershipTypeEnum,
  sourceTypeEnum,
  inventoryStatusEnum,
  goldColorEnum,
  certificationTypeEnum,
  // Main schemas
  inventoryItemSchema,
  inventoryItemSimpleSchema,
  inventoryItemUpdateSchema,
  itemStoneSchema,
  itemStoneCreateSchema,
  itemStoneUpdateSchema,
  itemCertificationSchema,
  itemCertificationCreateSchema,
  itemCertificationUpdateSchema,
  inventoryFilterSchema,
  // Validation helpers
  validateInventoryItem,
  validateItemStone,
  validateItemCertification,
  validateInventoryFilter,
} from './schemas';

// Inventory types
export type {
  ItemType,
  OwnershipType,
  SourceType,
  InventoryStatus,
  GoldColor,
  CertificationType,
  InventoryItemInput,
  InventoryItemSimpleInput,
  InventoryItemUpdateInput,
  ItemStoneInput,
  ItemStoneCreateInput,
  ItemStoneUpdateInput,
  ItemCertificationInput,
  ItemCertificationCreateInput,
  ItemCertificationUpdateInput,
  InventoryFilterInput,
  PriceRangeInput,
  WeightRangeInput,
} from './schemas';

// Sales schemas (domain-specific)
export {
  // Enums
  saleStatusEnum,
  paymentStatusEnum,
  paymentTypeEnum,
  discountTypeEnum,
  chequeStatusEnum,
  saleItemStatusEnum,
  // Main schemas
  saleSchema,
  saleCreateSchema,
  saleUpdateSchema,
  saleCompleteSchema,
  saleVoidSchema,
  saleItemSchema,
  saleItemCreateSchema,
  saleItemUpdateSchema,
  saleItemReturnSchema,
  salePaymentSchema,
  salePaymentSimpleSchema,
  discountSchema,
  optionalDiscountSchema,
  saleFilterSchema,
  // Validation helpers
  validateSale,
  validateSaleItem,
  validateSalePayment,
  validateDiscount,
  validateSaleFilter,
  formatSaleErrors,
  calculateDiscountAmount,
  determinePaymentStatus,
} from './schemas';

// Sales types
export type {
  SaleStatus,
  SalePaymentStatus,
  PaymentType,
  DiscountType,
  ChequeStatus,
  SaleItemStatus,
  SaleInput,
  SaleCreateInput,
  SaleUpdateInput,
  SaleCompleteInput,
  SaleVoidInput,
  SaleItemInput,
  SaleItemCreateInput,
  SaleItemUpdateInput,
  SaleItemReturnInput,
  SalePaymentInput,
  SalePaymentSimpleInput,
  DiscountInput,
  OptionalDiscountInput,
  SaleFilterInput,
  SaleDateRangeInput,
  AmountRangeInput,
} from './schemas';

// Export utilities
export {
  exportToPDF,
  exportToExcel,
  exportToJSON,
  exportTo,
  flattenForExport,
  formatCurrencyForExport,
  formatDateForExport,
} from './export';

// Export types
export type { ExportColumn, ExportData, ExportOptions, ExportFormat } from './export';

// Google Places parsing
export { parseGooglePlace } from './parseGooglePlace';
