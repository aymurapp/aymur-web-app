/**
 * Sales Components
 * POS, transactions, invoices
 *
 * @module components/domain/sales
 */

// =============================================================================
// PRODUCT SEARCH COMPONENTS
// =============================================================================

/**
 * ProductSearch - Main product search grid for POS
 * Features: search input, category tabs, filters, responsive grid, cart integration
 */
export { ProductSearch, ProductSearchSkeleton } from './ProductSearch';
export type { ProductSearchProps } from './ProductSearch';

/**
 * ProductSearchItem - Compact card for POS product grid
 * Features: thumbnail, price, purity badge, click to add, in-cart indicator
 */
export { ProductSearchItem, ProductSearchItemSkeleton } from './ProductSearchItem';
export type { ProductSearchItemProps } from './ProductSearchItem';

/**
 * CategoryTabs - Horizontal scrollable category filter tabs
 * Features: "All" tab, scrollable, active state, optional counts
 */
export { CategoryTabs, CategoryTabsSkeleton } from './CategoryTabs';
export type { CategoryTabsProps, CategoryOption } from './CategoryTabs';

/**
 * ProductSearchFilters - Collapsible advanced filters panel
 * Features: metal type, purity, price range, weight range filters
 */
export { ProductSearchFilters, ProductSearchFiltersInline } from './ProductSearchFilters';
export type {
  ProductSearchFiltersProps,
  ProductFilters,
  MetalTypeOption,
  MetalPurityOption,
} from './ProductSearchFilters';

// =============================================================================
// CUSTOMER SELECTOR COMPONENTS
// =============================================================================

/**
 * CustomerSelector - Modal/Drawer for selecting customers in POS
 * Features: search, recent customers, walk-in option, quick create
 */
export { CustomerSelector } from './CustomerSelector';
export type { CustomerSelectorProps } from './CustomerSelector';

/**
 * CustomerSelectorItem - Individual customer row in selector
 * Features: avatar, name, phone, balance badge, VIP indicator
 */
export { CustomerSelectorItem } from './CustomerSelectorItem';
export type { CustomerSelectorItemProps, CustomerWithVip } from './CustomerSelectorItem';

/**
 * QuickCustomerForm - Inline form for quick customer creation
 * Features: minimal fields, instant selection on create
 */
export { QuickCustomerForm } from './QuickCustomerForm';
export type { QuickCustomerFormProps } from './QuickCustomerForm';

// =============================================================================
// PAYMENT COMPONENTS
// =============================================================================

/**
 * PaymentForm - Comprehensive payment form for POS
 * Features: method selection, split payments, change calculation, store credit
 */
export { PaymentForm } from './PaymentForm';
export type { PaymentFormProps, PaymentCustomer, Payment } from './PaymentForm';

/**
 * PaymentMethodSelector - Grid of payment method buttons
 * Features: icons, active state, disabled state, store credit support
 */
export { PaymentMethodSelector } from './PaymentMethodSelector';
export type { PaymentMethodSelectorProps } from './PaymentMethodSelector';

/**
 * PaymentSummary - Payment status display component
 * Features: progress bar, status badge, change calculation, remaining balance
 */
export { PaymentSummary } from './PaymentSummary';
export type { PaymentSummaryProps } from './PaymentSummary';

/**
 * SplitPayment - Multiple payment methods handler
 * Features: add/remove entries, running total, validation
 */
export { SplitPayment } from './SplitPayment';
export type { SplitPaymentProps, SplitPaymentEntry } from './SplitPayment';

// =============================================================================
// CART COMPONENTS
// =============================================================================

/**
 * CartBuilder - Main POS cart/invoice builder component
 * Features: item list, quantity/discount controls, customer display, held orders
 */
export { CartBuilder, CartBuilderSkeleton } from './CartBuilder';
export type { CartBuilderProps } from './CartBuilder';

/**
 * CartItem - Individual line item in the cart
 * Features: image, details, quantity controls, line discount, remove
 */
export { CartItem, CartItemSkeleton } from './CartItem';
export type { CartItemProps } from './CartItem';

/**
 * CartSummary - Order totals and summary display
 * Features: subtotal, discounts breakdown, tax, grand total
 */
export {
  CartSummary,
  CartSummaryCompact,
  CartSummaryDetailed,
  CartSummarySkeleton,
} from './CartSummary';
export type { CartSummaryProps } from './CartSummary';

// =============================================================================
// SALES LIST COMPONENTS
// =============================================================================

/**
 * SalesList - Table/Card view for sales history
 * Features: responsive table/cards, status badges, actions, prefetch on hover
 */
export { SalesList } from './SalesList';
export type { SalesListProps } from './SalesList';

/**
 * SaleCard - Mobile/grid card view for individual sale
 * Features: compact layout, status badges, quick actions, tap to view
 */
export { SaleCard, SaleCardSkeleton } from './SaleCard';
export type { SaleCardProps } from './SaleCard';

/**
 * SalesFilters - Filter panel for sales list
 * Features: date presets, status filters, payment status, customer search
 */
export { SalesFilters } from './SalesFilters';
export type { SalesFiltersProps, SalesFiltersState } from './SalesFilters';

/**
 * SalesStats - Summary statistics cards
 * Features: today's count, revenue, avg value, trend comparison
 */
export { SalesStats } from './SalesStats';
export type { SalesStatsProps } from './SalesStats';

// =============================================================================
// RECEIPT COMPONENTS
// =============================================================================

/**
 * Receipt - Printable receipt component for completed sales
 * Features: 80mm thermal printer optimized, shop header, items, totals, payments
 */
export { Receipt } from './Receipt';
export type { ReceiptProps, ReceiptShopInfo } from './Receipt';

/**
 * ReceiptItem - Individual line item row for receipts
 * Features: item name, quantity, price, jewelry-specific details
 */
export { ReceiptItem } from './ReceiptItem';
export type { ReceiptItemProps } from './ReceiptItem';

/**
 * ReceiptPrint - Wrapper component that handles printing
 * Features: print button, browser print dialog, react-to-print integration
 */
export { ReceiptPrint } from './ReceiptPrint';
export type { ReceiptPrintProps } from './ReceiptPrint';

/**
 * ReceiptModal - Modal dialog with receipt preview and actions
 * Features: preview, print, download PDF, email receipt buttons
 */
export { ReceiptModal } from './ReceiptModal';
export type { ReceiptModalProps } from './ReceiptModal';

// =============================================================================
// CHECKOUT COMPONENTS
// =============================================================================

/**
 * CheckoutFlow - Full-screen modal checkout process orchestrator
 * Features: step-by-step flow, keyboard shortcuts, cancel confirmation, RTL support
 */
export { CheckoutFlow } from './CheckoutFlow';
export type { CheckoutFlowProps } from './CheckoutFlow';

/**
 * CheckoutProgress - Step indicator for checkout flow
 * Features: visual steps, current step highlighting, clickable navigation, RTL support
 */
export { CheckoutProgress, CheckoutProgressCompact } from './CheckoutProgress';
export type { CheckoutProgressProps, CheckoutStepType } from './CheckoutProgress';

/**
 * CheckoutReview - Order summary before payment
 * Features: items list, customer info, totals, discounts breakdown, edit capability
 */
export { CheckoutReview } from './CheckoutReview';
export type { CheckoutReviewProps } from './CheckoutReview';

/**
 * CheckoutComplete - Success state after sale completion
 * Features: success animation, sale number, receipt preview, print/email/new sale actions
 */
export { CheckoutComplete, CheckoutProcessing, CheckoutError } from './CheckoutComplete';
export type { CheckoutCompleteProps, ReceiptData } from './CheckoutComplete';

// =============================================================================
// SALE DETAIL COMPONENTS
// =============================================================================

/**
 * SaleDetail - Comprehensive sale detail view
 * Features: header, customer info, items, payments, financial summary, notes, audit info
 */
export { SaleDetail, SaleDetailSkeleton } from './SaleDetail';
export type { SaleDetailProps } from './SaleDetail';

/**
 * SaleItemsTable - Table of items in a sale
 * Features: image thumbnails, item details, metal type, weight, price, discount, line total
 */
export { SaleItemsTable, SaleItemsTableSkeleton } from './SaleItemsTable';
export type { SaleItemsTableProps } from './SaleItemsTable';

/**
 * SalePaymentsTable - Table of payments received for a sale
 * Features: payment method icons, amounts, references, dates, status badges
 */
export { SalePaymentsTable, SalePaymentsTableSkeleton } from './SalePaymentsTable';
export type { SalePaymentsTableProps } from './SalePaymentsTable';

/**
 * SaleActions - Action buttons bar for sale operations
 * Features: print receipt, add payment, void sale, create return, duplicate
 */
export { SaleActions, SaleActionsCompact } from './SaleActions';
export type { SaleActionsProps } from './SaleActions';
