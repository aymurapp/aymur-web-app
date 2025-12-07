/**
 * Cart Store
 *
 * Zustand store for POS cart state management.
 * Handles cart items, discounts, customer selection, and held orders.
 *
 * Features:
 * - Item management (add, remove, update quantity/discount)
 * - Customer selection for the sale
 * - Order-level discount
 * - Notes/memo field
 * - Hold/restore orders for later
 * - Persist middleware for recovery on page refresh
 *
 * @module stores/cartStore
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Discount type for line items or order
 */
export type DiscountType = 'percentage' | 'fixed';

/**
 * Cart line item
 */
export interface CartItem {
  /** Unique cart item ID (generated) */
  id: string;
  /** Reference to inventory item ID */
  itemId: string;
  /** Item name (snapshot) */
  name: string;
  /** SKU (snapshot) */
  sku: string;
  /** Barcode (snapshot) */
  barcode?: string;
  /** Unit price */
  price: number;
  /** Quantity (default 1 for unique jewelry items) */
  quantity: number;
  /** Weight in grams (snapshot) */
  weight?: number;
  /** Metal type name (snapshot) */
  metalType?: string;
  /** Metal purity name (snapshot) */
  purity?: string;
  /** Category name (snapshot) */
  category?: string;
  /** Image URL */
  imageUrl?: string;
  /** Line item discount type */
  discountType?: DiscountType;
  /** Line item discount value */
  discountValue?: number;
}

/**
 * Minimal customer info for cart
 */
export interface CartCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  balance?: number;
}

/**
 * Order-level discount
 */
export interface OrderDiscount {
  type: DiscountType;
  value: number;
}

/**
 * Held order for later retrieval
 */
export interface HeldOrder {
  /** Unique held order ID */
  id: string;
  /** Cart items at time of hold */
  items: CartItem[];
  /** Selected customer at time of hold */
  customer: CartCustomer | null;
  /** Order discount at time of hold */
  discount: OrderDiscount | null;
  /** Notes at time of hold */
  notes: string;
  /** Timestamp when held */
  heldAt: string;
  /** Optional label/name for the held order */
  label?: string;
}

/**
 * Cart state interface
 */
interface CartState {
  // State
  items: CartItem[];
  customer: CartCustomer | null;
  discount: OrderDiscount | null;
  notes: string;
  heldOrders: HeldOrder[];

  // Computed (use selectors)
  // getSubtotal, getDiscountAmount, getTaxAmount, getTotal

  // Item Actions
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setItemDiscount: (id: string, type: DiscountType | null, value: number) => void;
  clearItems: () => void;

  // Customer Actions
  setCustomer: (customer: CartCustomer | null) => void;

  // Discount Actions
  setOrderDiscount: (type: DiscountType | null, value: number) => void;

  // Notes Actions
  setNotes: (notes: string) => void;

  // Hold/Restore Actions
  holdOrder: (label?: string) => string | null;
  restoreOrder: (id: string) => boolean;
  deleteHeldOrder: (id: string) => void;
  clearHeldOrders: () => void;

  // General Actions
  clearCart: () => void;
  reset: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate a unique ID for cart items
 */
function generateId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Generate a unique ID for held orders
 */
function generateHeldOrderId(): string {
  return `hold_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Calculate line item total (after discount)
 */
export function calculateLineTotal(item: CartItem): number {
  const baseTotal = item.price * item.quantity;

  if (!item.discountType || !item.discountValue || item.discountValue <= 0) {
    return baseTotal;
  }

  if (item.discountType === 'percentage') {
    const discountAmount = (baseTotal * item.discountValue) / 100;
    return Math.max(0, baseTotal - discountAmount);
  }

  // Fixed discount
  return Math.max(0, baseTotal - item.discountValue);
}

/**
 * Calculate subtotal (sum of all line totals before order discount)
 */
export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
}

/**
 * Calculate total line discounts
 */
export function calculateLineDiscounts(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const baseTotal = item.price * item.quantity;
    const lineTotal = calculateLineTotal(item);
    return sum + (baseTotal - lineTotal);
  }, 0);
}

/**
 * Calculate order discount amount
 */
export function calculateOrderDiscountAmount(
  subtotal: number,
  discount: OrderDiscount | null
): number {
  if (!discount || !discount.value || discount.value <= 0) {
    return 0;
  }

  if (discount.type === 'percentage') {
    return (subtotal * discount.value) / 100;
  }

  // Fixed discount (can't exceed subtotal)
  return Math.min(discount.value, subtotal);
}

/**
 * Calculate tax amount based on subtotal and tax rate
 */
export function calculateTaxAmount(
  subtotal: number,
  orderDiscount: number,
  taxRate: number
): number {
  const taxableAmount = Math.max(0, subtotal - orderDiscount);
  return taxableAmount * (taxRate / 100);
}

/**
 * Calculate grand total
 */
export function calculateGrandTotal(
  subtotal: number,
  orderDiscountAmount: number,
  taxAmount: number
): number {
  return Math.max(0, subtotal - orderDiscountAmount + taxAmount);
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  items: [] as CartItem[],
  customer: null as CartCustomer | null,
  discount: null as OrderDiscount | null,
  notes: '',
  heldOrders: [] as HeldOrder[],
};

// =============================================================================
// STORE
// =============================================================================

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // =====================================================================
        // ITEM ACTIONS
        // =====================================================================

        addItem: (itemData) =>
          set(
            (state) => {
              // Check if item already exists in cart
              const existingIndex = state.items.findIndex((i) => i.itemId === itemData.itemId);

              if (existingIndex >= 0) {
                // Update quantity if item exists
                const existingItem = state.items[existingIndex];
                if (!existingItem) {
                  return state;
                }
                const updatedItems = [...state.items];
                updatedItems[existingIndex] = {
                  ...existingItem,
                  quantity: existingItem.quantity + (itemData.quantity || 1),
                };
                return { items: updatedItems };
              }

              // Add new item
              const newItem: CartItem = {
                id: generateId(),
                itemId: itemData.itemId,
                name: itemData.name,
                sku: itemData.sku,
                barcode: itemData.barcode,
                price: itemData.price,
                quantity: itemData.quantity || 1,
                weight: itemData.weight,
                metalType: itemData.metalType,
                purity: itemData.purity,
                category: itemData.category,
                imageUrl: itemData.imageUrl,
                discountType: itemData.discountType,
                discountValue: itemData.discountValue,
              };

              return { items: [...state.items, newItem] };
            },
            false,
            'cart/addItem'
          ),

        removeItem: (id) =>
          set(
            (state) => ({
              items: state.items.filter((item) => item.id !== id),
            }),
            false,
            'cart/removeItem'
          ),

        updateQuantity: (id, quantity) =>
          set(
            (state) => {
              if (quantity < 1) {
                // Remove item if quantity is less than 1
                return { items: state.items.filter((item) => item.id !== id) };
              }

              return {
                items: state.items.map((item) => (item.id === id ? { ...item, quantity } : item)),
              };
            },
            false,
            'cart/updateQuantity'
          ),

        setItemDiscount: (id, type, value) =>
          set(
            (state) => ({
              items: state.items.map((item) =>
                item.id === id
                  ? {
                      ...item,
                      discountType: type ?? undefined,
                      discountValue: type ? value : undefined,
                    }
                  : item
              ),
            }),
            false,
            'cart/setItemDiscount'
          ),

        clearItems: () => set({ items: [] }, false, 'cart/clearItems'),

        // =====================================================================
        // CUSTOMER ACTIONS
        // =====================================================================

        setCustomer: (customer) => set({ customer }, false, 'cart/setCustomer'),

        // =====================================================================
        // DISCOUNT ACTIONS
        // =====================================================================

        setOrderDiscount: (type, value) =>
          set(
            {
              discount: type && value > 0 ? { type, value } : null,
            },
            false,
            'cart/setOrderDiscount'
          ),

        // =====================================================================
        // NOTES ACTIONS
        // =====================================================================

        setNotes: (notes) => set({ notes }, false, 'cart/setNotes'),

        // =====================================================================
        // HOLD/RESTORE ACTIONS
        // =====================================================================

        holdOrder: (label) => {
          const state = get();

          // Don't hold empty carts
          if (state.items.length === 0) {
            return null;
          }

          const heldOrder: HeldOrder = {
            id: generateHeldOrderId(),
            items: [...state.items],
            customer: state.customer,
            discount: state.discount,
            notes: state.notes,
            heldAt: new Date().toISOString(),
            label,
          };

          set(
            (s) => ({
              heldOrders: [...s.heldOrders, heldOrder],
              // Clear current cart after holding
              items: [],
              customer: null,
              discount: null,
              notes: '',
            }),
            false,
            'cart/holdOrder'
          );

          return heldOrder.id;
        },

        restoreOrder: (id) => {
          const state = get();
          const heldOrder = state.heldOrders.find((o) => o.id === id);

          if (!heldOrder) {
            return false;
          }

          set(
            (s) => ({
              // Restore the held order
              items: heldOrder.items,
              customer: heldOrder.customer,
              discount: heldOrder.discount,
              notes: heldOrder.notes,
              // Remove from held orders
              heldOrders: s.heldOrders.filter((o) => o.id !== id),
            }),
            false,
            'cart/restoreOrder'
          );

          return true;
        },

        deleteHeldOrder: (id) =>
          set(
            (state) => ({
              heldOrders: state.heldOrders.filter((o) => o.id !== id),
            }),
            false,
            'cart/deleteHeldOrder'
          ),

        clearHeldOrders: () => set({ heldOrders: [] }, false, 'cart/clearHeldOrders'),

        // =====================================================================
        // GENERAL ACTIONS
        // =====================================================================

        clearCart: () =>
          set(
            {
              items: [],
              customer: null,
              discount: null,
              notes: '',
            },
            false,
            'cart/clearCart'
          ),

        reset: () => set(initialState, false, 'cart/reset'),
      }),
      {
        name: 'aymur-cart-storage',
        partialize: (state) => ({
          // Persist items and held orders for recovery
          items: state.items,
          customer: state.customer,
          discount: state.discount,
          notes: state.notes,
          heldOrders: state.heldOrders,
        }),
      }
    ),
    { name: 'CartStore' }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

/**
 * Get total item count in cart (sum of quantities)
 */
export const useCartItemCount = () =>
  useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

/**
 * Get number of unique items in cart
 */
export const useCartUniqueItemCount = () => useCartStore((state) => state.items.length);

/**
 * Get subtotal (before order discount)
 */
export const useCartSubtotal = () => useCartStore((state) => calculateSubtotal(state.items));

/**
 * Get total line discounts amount
 */
export const useCartLineDiscounts = () =>
  useCartStore((state) => calculateLineDiscounts(state.items));

/**
 * Get order discount amount
 */
export const useCartOrderDiscount = () =>
  useCartStore((state) => {
    const subtotal = calculateSubtotal(state.items);
    return calculateOrderDiscountAmount(subtotal, state.discount);
  });

/**
 * Check if cart is empty
 */
export const useCartIsEmpty = () => useCartStore((state) => state.items.length === 0);

/**
 * Get held orders count
 */
export const useHeldOrdersCount = () => useCartStore((state) => state.heldOrders.length);

/**
 * Check if an item is in the cart
 */
export const useIsItemInCart = (itemId: string) =>
  useCartStore((state) => state.items.some((item) => item.itemId === itemId));

/**
 * Get cart item by item ID
 */
export const useCartItemByItemId = (itemId: string) =>
  useCartStore((state) => state.items.find((item) => item.itemId === itemId));
