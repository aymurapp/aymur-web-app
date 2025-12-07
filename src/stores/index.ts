/**
 * Zustand Stores Index
 * Central export for all state stores
 */

// Shop Store - Multi-tenant shop context management
export { useShopStore, useCurrentShop, useHasMultipleShops, type ShopInfo } from './shopStore';

// UI Store - Sidebar, theme, and modal management
export {
  useUIStore,
  useIsModalOpen,
  useResolvedTheme,
  type Theme,
  type ModalType,
  type ModalData,
} from './uiStore';

// Notification Store - In-app notifications (ephemeral)
export {
  useNotificationStore,
  useUnreadCount,
  useUnreadNotifications,
  useNotificationsByType,
  toast,
  type Notification,
  type NotificationInput,
  type NotificationType,
} from './notificationStore';

// AI Store - AI chat panel and streaming state
export {
  useAIStore,
  useAIBusy,
  useAIContext,
  useIsConversationActive,
  type AIOperationType,
  type PendingOperation,
} from './aiStore';

// Cart Store - POS cart state management
export {
  useCartStore,
  useCartItemCount,
  useCartUniqueItemCount,
  useCartSubtotal,
  useCartLineDiscounts,
  useCartOrderDiscount,
  useCartIsEmpty,
  useHeldOrdersCount,
  useIsItemInCart,
  useCartItemByItemId,
  calculateLineTotal,
  calculateSubtotal,
  calculateLineDiscounts,
  calculateOrderDiscountAmount,
  calculateTaxAmount,
  calculateGrandTotal,
  type CartItem,
  type CartCustomer,
  type OrderDiscount,
  type HeldOrder,
  type DiscountType,
} from './cartStore';
