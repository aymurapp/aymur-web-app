/**
 * Shop Store
 * Manages current shop context and available shops for multi-tenant access
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

/**
 * Minimal shop representation for the store
 * Full shop data should be fetched via TanStack Query
 */
export interface ShopInfo {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  is_active: boolean;
}

interface ShopState {
  // State
  currentShopId: string | null;
  shops: ShopInfo[];

  // Actions
  setCurrentShop: (shopId: string) => void;
  setShops: (shops: ShopInfo[]) => void;
  clearCurrentShop: () => void;
  reset: () => void;
}

const initialState = {
  currentShopId: null,
  shops: [],
};

export const useShopStore = create<ShopState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setCurrentShop: (shopId: string) =>
          set({ currentShopId: shopId }, false, 'shop/setCurrentShop'),

        setShops: (shops: ShopInfo[]) => set({ shops }, false, 'shop/setShops'),

        clearCurrentShop: () => set({ currentShopId: null }, false, 'shop/clearCurrentShop'),

        reset: () => set(initialState, false, 'shop/reset'),
      }),
      {
        name: 'aymur-shop-storage',
        partialize: (state) => ({
          currentShopId: state.currentShopId,
          // Don't persist shops array - it should be fetched fresh
        }),
      }
    ),
    { name: 'ShopStore' }
  )
);

/**
 * Selector: Get current shop from the shops array
 */
export const useCurrentShop = () =>
  useShopStore((state) => state.shops.find((shop) => shop.id === state.currentShopId) ?? null);

/**
 * Selector: Check if user has access to multiple shops
 */
export const useHasMultipleShops = () => useShopStore((state) => state.shops.length > 1);
