/**
 * UI Store
 * Manages UI state including sidebar, theme, and modals
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

export type ModalType = 'confirm' | 'alert' | 'custom' | null;

export interface ModalData {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  component?: React.ComponentType<unknown>;
  props?: Record<string, unknown>;
}

interface UIState {
  // Sidebar state
  sidebarCollapsed: boolean;

  // Theme state
  theme: Theme;

  // Modal state
  activeModal: ModalType;
  modalData: ModalData | null;

  // Sidebar actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Theme actions
  setTheme: (theme: Theme) => void;

  // Modal actions
  openModal: (type: Exclude<ModalType, null>, data?: ModalData) => void;
  closeModal: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  sidebarCollapsed: false,
  theme: 'system' as Theme,
  activeModal: null as ModalType,
  modalData: null as ModalData | null,
};

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // Sidebar actions
        setSidebarCollapsed: (collapsed: boolean) =>
          set({ sidebarCollapsed: collapsed }, false, 'ui/setSidebarCollapsed'),

        toggleSidebar: () =>
          set(
            (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
            false,
            'ui/toggleSidebar'
          ),

        // Theme actions
        setTheme: (theme: Theme) => set({ theme }, false, 'ui/setTheme'),

        // Modal actions
        openModal: (type: Exclude<ModalType, null>, data?: ModalData) =>
          set({ activeModal: type, modalData: data ?? null }, false, 'ui/openModal'),

        closeModal: () => set({ activeModal: null, modalData: null }, false, 'ui/closeModal'),

        // Reset
        reset: () => set(initialState, false, 'ui/reset'),
      }),
      {
        name: 'aymur-ui-storage',
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
          // Don't persist modal state
        }),
      }
    ),
    { name: 'UIStore' }
  )
);

/**
 * Selector: Check if a specific modal is open
 */
export const useIsModalOpen = (type: ModalType) =>
  useUIStore((state) => state.activeModal === type);

/**
 * Selector: Get the resolved theme (handles 'system')
 */
export const useResolvedTheme = () =>
  useUIStore((state) => {
    if (state.theme === 'system') {
      // This will be determined at runtime by the theme provider
      return typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return state.theme;
  });
