/**
 * useModal Hook
 * Provides generic modal state management with typed data support
 *
 * Features:
 * - Generic modal controller with typed data
 * - Support for multiple concurrent modals
 * - Open/close helpers with typed data
 * - Integration with uiStore for global modals
 * - Local state support for component-scoped modals
 */

'use client';

import { useCallback, useMemo, useState } from 'react';

import { useUIStore, type ModalType, type ModalData } from '@/stores/uiStore';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Modal state for a single modal instance
 */
export interface ModalState<T = unknown> {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Data associated with the modal */
  data: T | null;
}

/**
 * Return type for useModal hook (single modal)
 */
export interface UseModalReturn<T = unknown> {
  /**
   * Whether the modal is currently open
   */
  isOpen: boolean;

  /**
   * Data passed to the modal (null when closed)
   */
  data: T | null;

  /**
   * Open the modal, optionally with data
   * @param data - Data to pass to the modal
   */
  open: (data?: T) => void;

  /**
   * Close the modal and clear data
   */
  close: () => void;

  /**
   * Toggle the modal open/closed
   * @param data - Data to pass when opening
   */
  toggle: (data?: T) => void;

  /**
   * Update the modal's data without changing open state
   * @param data - New data for the modal
   */
  setData: (data: T | null) => void;
}

/**
 * Modal registry entry for multiple modals
 */
export interface ModalRegistryEntry<T = unknown> extends ModalState<T> {
  /** Unique identifier for this modal */
  id: string;
}

/**
 * Return type for useModals hook (multiple modals)
 */
export interface UseModalsReturn<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Check if a specific modal is open
   * @param id - Modal identifier
   */
  isOpen: (id: keyof T) => boolean;

  /**
   * Get data for a specific modal
   * @param id - Modal identifier
   */
  getData: <K extends keyof T>(id: K) => T[K] | null;

  /**
   * Open a specific modal with optional data
   * @param id - Modal identifier
   * @param data - Data to pass to the modal
   */
  open: <K extends keyof T>(id: K, data?: T[K]) => void;

  /**
   * Close a specific modal
   * @param id - Modal identifier
   */
  close: (id: keyof T) => void;

  /**
   * Close all modals
   */
  closeAll: () => void;

  /**
   * Toggle a specific modal
   * @param id - Modal identifier
   * @param data - Data to pass when opening
   */
  toggle: <K extends keyof T>(id: K, data?: T[K]) => void;

  /**
   * Get the currently open modal id (if any)
   */
  activeModal: keyof T | null;

  /**
   * Get all modal states
   */
  modals: Record<keyof T, ModalState<T[keyof T]>>;
}

/**
 * Return type for useGlobalModal hook (uiStore integration)
 */
export interface UseGlobalModalReturn {
  /**
   * Currently active modal type
   */
  activeModal: ModalType;

  /**
   * Data for the current modal
   */
  modalData: ModalData | null;

  /**
   * Whether any modal is currently open
   */
  isOpen: boolean;

  /**
   * Open a confirm dialog
   * @param data - Modal configuration
   */
  confirm: (data: ModalData) => void;

  /**
   * Open an alert dialog
   * @param data - Modal configuration
   */
  alert: (data: ModalData) => void;

  /**
   * Open a custom modal
   * @param data - Modal configuration with custom component
   */
  custom: (data: ModalData) => void;

  /**
   * Open a modal by type
   * @param type - Modal type
   * @param data - Modal configuration
   */
  open: (type: Exclude<ModalType, null>, data?: ModalData) => void;

  /**
   * Close the current modal
   */
  close: () => void;
}

// =============================================================================
// SINGLE MODAL HOOK
// =============================================================================

/**
 * Single modal state hook for component-local modal management
 *
 * @template T - Type of data associated with the modal
 *
 * @example
 * interface CustomerFormData {
 *   customerId?: string;
 *   mode: 'create' | 'edit';
 * }
 *
 * const customerModal = useModal<CustomerFormData>();
 *
 * // Open for creating
 * customerModal.open({ mode: 'create' });
 *
 * // Open for editing
 * customerModal.open({ customerId: '123', mode: 'edit' });
 *
 * // In the modal component
 * if (customerModal.isOpen) {
 *   const { customerId, mode } = customerModal.data!;
 * }
 */
export function useModal<T = unknown>(): UseModalReturn<T> {
  const [state, setState] = useState<ModalState<T>>({
    isOpen: false,
    data: null,
  });

  const open = useCallback((data?: T): void => {
    setState({
      isOpen: true,
      data: data ?? null,
    });
  }, []);

  const close = useCallback((): void => {
    setState({
      isOpen: false,
      data: null,
    });
  }, []);

  const toggle = useCallback((data?: T): void => {
    setState((prev) => ({
      isOpen: !prev.isOpen,
      data: prev.isOpen ? null : (data ?? null),
    }));
  }, []);

  const setData = useCallback((data: T | null): void => {
    setState((prev) => ({
      ...prev,
      data,
    }));
  }, []);

  return {
    isOpen: state.isOpen,
    data: state.data,
    open,
    close,
    toggle,
    setData,
  };
}

// =============================================================================
// MULTIPLE MODALS HOOK
// =============================================================================

/**
 * Multiple modals state hook for managing several modals in a component
 *
 * @template T - Record type mapping modal IDs to their data types
 *
 * @example
 * interface MyModals {
 *   create: { defaultName?: string };
 *   edit: { id: string; name: string };
 *   delete: { id: string };
 * }
 *
 * const modals = useModals<MyModals>();
 *
 * // Open create modal
 * modals.open('create', { defaultName: 'New Item' });
 *
 * // Check if edit modal is open
 * if (modals.isOpen('edit')) {
 *   const editData = modals.getData('edit');
 * }
 */
export function useModals<
  T extends Record<string, unknown> = Record<string, unknown>,
>(): UseModalsReturn<T> {
  const [modalStates, setModalStates] = useState<Record<keyof T, ModalState<T[keyof T]>>>(
    {} as Record<keyof T, ModalState<T[keyof T]>>
  );

  const isOpen = useCallback(
    (id: keyof T): boolean => {
      return modalStates[id]?.isOpen ?? false;
    },
    [modalStates]
  );

  const getData = useCallback(
    <K extends keyof T>(id: K): T[K] | null => {
      return (modalStates[id]?.data as T[K]) ?? null;
    },
    [modalStates]
  );

  const open = useCallback(<K extends keyof T>(id: K, data?: T[K]): void => {
    setModalStates((prev) => ({
      ...prev,
      [id]: {
        isOpen: true,
        data: data ?? null,
      },
    }));
  }, []);

  const close = useCallback((id: keyof T): void => {
    setModalStates((prev) => ({
      ...prev,
      [id]: {
        isOpen: false,
        data: null,
      },
    }));
  }, []);

  const closeAll = useCallback((): void => {
    setModalStates((prev) => {
      const newState = { ...prev };
      for (const key of Object.keys(newState) as (keyof T)[]) {
        newState[key] = {
          isOpen: false,
          data: null,
        };
      }
      return newState;
    });
  }, []);

  const toggle = useCallback(<K extends keyof T>(id: K, data?: T[K]): void => {
    setModalStates((prev) => {
      const current = prev[id];
      return {
        ...prev,
        [id]: {
          isOpen: !current?.isOpen,
          data: current?.isOpen ? null : (data ?? null),
        },
      };
    });
  }, []);

  const activeModal = useMemo((): keyof T | null => {
    for (const [key, state] of Object.entries(modalStates)) {
      if ((state as ModalState<unknown>).isOpen) {
        return key as keyof T;
      }
    }
    return null;
  }, [modalStates]);

  return {
    isOpen,
    getData,
    open,
    close,
    closeAll,
    toggle,
    activeModal,
    modals: modalStates,
  };
}

// =============================================================================
// GLOBAL MODAL HOOK
// =============================================================================

/**
 * Global modal hook for uiStore-managed modals
 * Use this for application-wide modal dialogs (confirm, alert, custom)
 *
 * @example
 * const { confirm, alert, close } = useGlobalModal();
 *
 * // Show confirmation dialog
 * confirm({
 *   title: 'Delete Item',
 *   message: 'Are you sure you want to delete this item?',
 *   confirmText: 'Delete',
 *   cancelText: 'Cancel',
 *   onConfirm: () => deleteItem(id),
 * });
 *
 * // Show alert
 * alert({
 *   title: 'Success',
 *   message: 'Item has been saved successfully.',
 * });
 */
export function useGlobalModal(): UseGlobalModalReturn {
  const activeModal = useUIStore((state) => state.activeModal);
  const modalData = useUIStore((state) => state.modalData);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);

  const isOpen = activeModal !== null;

  const confirm = useCallback(
    (data: ModalData): void => {
      openModal('confirm', data);
    },
    [openModal]
  );

  const alert = useCallback(
    (data: ModalData): void => {
      openModal('alert', data);
    },
    [openModal]
  );

  const custom = useCallback(
    (data: ModalData): void => {
      openModal('custom', data);
    },
    [openModal]
  );

  const open = useCallback(
    (type: Exclude<ModalType, null>, data?: ModalData): void => {
      openModal(type, data);
    },
    [openModal]
  );

  const close = useCallback((): void => {
    closeModal();
  }, [closeModal]);

  return {
    activeModal,
    modalData,
    isOpen,
    confirm,
    alert,
    custom,
    open,
    close,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useModal;

// Re-export store types for convenience
export type { ModalType, ModalData };
