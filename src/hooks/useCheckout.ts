/**
 * useCheckout Hook
 *
 * Custom hook for managing checkout flow state.
 * Handles step navigation, sale creation, payment recording,
 * and error handling throughout the checkout process.
 *
 * State Machine:
 * REVIEW -> CUSTOMER -> PAYMENT -> PROCESSING -> COMPLETE
 *                                     |
 *                                     v
 *                                   ERROR
 *
 * @module hooks/useCheckout
 */

'use client';

import { useState, useCallback, useMemo } from 'react';

import { message } from 'antd';
import { useTranslations } from 'next-intl';

import type { Payment } from '@/components/domain/sales/PaymentForm';
import { createSale, addSaleItem, recordPayment, completeSale } from '@/lib/actions/sales';
import type { Sale, SalePayment } from '@/lib/actions/sales';
import { useUser } from '@/lib/hooks/auth';
import { useShop } from '@/lib/hooks/shop';
import {
  useCartStore,
  calculateSubtotal,
  calculateOrderDiscountAmount,
  calculateGrandTotal,
  calculateTaxAmount,
} from '@/stores/cartStore';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Checkout step identifiers
 */
export type CheckoutStep =
  | 'review'
  | 'customer'
  | 'delivery'
  | 'payment'
  | 'processing'
  | 'complete'
  | 'error';

/**
 * Delivery information for checkout
 */
export interface DeliveryInfo {
  /** Selected courier company ID */
  courierId: string;
  /** Courier company name (for display) */
  courierName?: string;
  /** Recipient name for delivery */
  recipientName: string;
  /** Delivery address */
  deliveryAddress: string;
  /** Cost of delivery */
  deliveryCost: number;
  /** Who pays for delivery */
  costPaidBy: 'shop' | 'customer' | 'split';
  /** Estimated delivery date (optional) */
  estimatedDate?: string;
}

/**
 * Checkout state interface
 */
export interface CheckoutState {
  /** Current step in the checkout flow */
  currentStep: CheckoutStep;
  /** Created sale record (after review step) */
  sale: Sale | null;
  /** Recorded payments */
  payments: SalePayment[];
  /** Error message if any */
  error: string | null;
  /** Whether checkout is in progress */
  isProcessing: boolean;
}

/**
 * Checkout computed values
 */
export interface CheckoutTotals {
  /** Subtotal before discounts */
  subtotal: number;
  /** Line item discounts total */
  lineDiscounts: number;
  /** Order-level discount amount */
  orderDiscount: number;
  /** Tax amount */
  taxAmount: number;
  /** Grand total after all discounts and tax */
  grandTotal: number;
  /** Total amount already paid */
  paidAmount: number;
  /** Remaining balance to pay */
  remainingBalance: number;
}

/**
 * Hook options
 */
export interface UseCheckoutOptions {
  /** Tax rate percentage (e.g., 5 for 5%) */
  taxRate?: number;
  /** Callback when checkout completes successfully */
  onComplete?: (sale: Sale) => void;
  /** Callback when checkout is cancelled */
  onCancel?: () => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
}

/**
 * Hook return type
 */
export interface UseCheckoutReturn {
  // State
  /** Current checkout state */
  state: CheckoutState;
  /** Computed totals */
  totals: CheckoutTotals;
  /** Whether checkout is active */
  isActive: boolean;

  // Step navigation
  /** Go to next step */
  nextStep: () => Promise<void>;
  /** Go to previous step */
  previousStep: () => void;
  /** Go to specific step (only for going back) */
  goToStep: (step: CheckoutStep) => void;

  // Step-specific actions
  /** Create sale from cart (used in review step) */
  createSaleFromCart: () => Promise<Sale | null>;
  /** Record payment(s) for the sale */
  recordPayments: (payments: Payment[]) => Promise<boolean>;
  /** Complete the sale and finalize */
  finalizeSale: () => Promise<boolean>;

  // Checkout control
  /** Start the checkout flow */
  startCheckout: () => void;
  /** Cancel and reset checkout */
  cancelCheckout: () => void;
  /** Retry after error */
  retryCheckout: () => void;
  /** Clear cart and complete checkout */
  clearAndComplete: () => void;

  // Helpers
  /** Check if can proceed to next step */
  canProceed: boolean;
  /** Check if can go back */
  canGoBack: boolean;
  /** Get step index (0-based) */
  stepIndex: number;
  /** Total number of steps */
  totalSteps: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Step order for navigation
 */
const STEP_ORDER: CheckoutStep[] = ['review', 'customer', 'payment', 'processing', 'complete'];

/**
 * Initial state
 */
const initialState: CheckoutState = {
  currentStep: 'review',
  sale: null,
  payments: [],
  error: null,
  isProcessing: false,
};

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * useCheckout Hook
 *
 * Manages the complete checkout flow from cart review to sale completion.
 *
 * @example
 * ```tsx
 * function CheckoutPage() {
 *   const {
 *     state,
 *     totals,
 *     nextStep,
 *     previousStep,
 *     cancelCheckout,
 *     canProceed,
 *   } = useCheckout({
 *     taxRate: 5,
 *     onComplete: (sale) => {
 *       // Note: DB field is invoice_number (not sale_number)
 *       console.log('Sale completed:', sale.invoice_number);
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       <CheckoutProgress step={state.currentStep} />
 *       {state.currentStep === 'review' && <ReviewStep />}
 *       {state.currentStep === 'payment' && <PaymentStep />}
 *       {state.currentStep === 'complete' && <CompleteStep />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCheckout(options: UseCheckoutOptions = {}): UseCheckoutReturn {
  const { taxRate = 0, onComplete, onCancel, onError } = options;

  const t = useTranslations('sales.checkout');
  const { shopId, shop } = useShop();
  const { user } = useUser();

  // Cart state
  const { items, customer, discount, notes, clearCart } = useCartStore();

  // Local checkout state
  const [state, setState] = useState<CheckoutState>(initialState);
  const [isActive, setIsActive] = useState(false);

  // Currency from shop
  const currency = shop?.currency || 'USD';

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  /**
   * Calculate all totals from cart
   */
  const totals = useMemo<CheckoutTotals>(() => {
    const subtotal = calculateSubtotal(items);
    const orderDiscountAmount = calculateOrderDiscountAmount(subtotal, discount);
    const taxAmount = calculateTaxAmount(subtotal, orderDiscountAmount, taxRate);
    const grandTotal = calculateGrandTotal(subtotal, orderDiscountAmount, taxAmount);

    // Calculate line discounts
    const lineDiscounts = items.reduce((sum, item) => {
      const basePrice = item.price * item.quantity;
      if (!item.discountType || !item.discountValue) {
        return sum;
      }
      if (item.discountType === 'percentage') {
        return sum + (basePrice * item.discountValue) / 100;
      }
      return sum + item.discountValue;
    }, 0);

    // Calculate paid amount from recorded payments
    const paidAmount = state.payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      subtotal,
      lineDiscounts,
      orderDiscount: orderDiscountAmount,
      taxAmount,
      grandTotal,
      paidAmount,
      remainingBalance: Math.max(0, grandTotal - paidAmount),
    };
  }, [items, discount, taxRate, state.payments]);

  /**
   * Current step index
   */
  const stepIndex = useMemo(() => {
    const idx = STEP_ORDER.indexOf(state.currentStep);
    return idx >= 0 ? idx : 0;
  }, [state.currentStep]);

  /**
   * Can proceed to next step
   */
  const canProceed = useMemo(() => {
    switch (state.currentStep) {
      case 'review':
        return items.length > 0;
      case 'customer':
        return true; // Customer is optional (walk-in allowed)
      case 'payment':
        return totals.remainingBalance <= 0.01; // Allow small float tolerance
      case 'processing':
        return false; // Can't proceed during processing
      case 'complete':
        return false; // Already complete
      case 'error':
        return false; // Must retry
      default:
        return false;
    }
  }, [state.currentStep, items.length, totals.remainingBalance]);

  /**
   * Can go back to previous step
   */
  const canGoBack = useMemo(() => {
    return state.currentStep !== 'processing' && state.currentStep !== 'complete' && stepIndex > 0;
  }, [state.currentStep, stepIndex]);

  // =============================================================================
  // STATE UPDATES
  // =============================================================================

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<CheckoutState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Set error state
   */
  const setError = useCallback(
    (error: string) => {
      updateState({
        currentStep: 'error',
        error,
        isProcessing: false,
      });
      onError?.(error);
    },
    [updateState, onError]
  );

  // =============================================================================
  // ACTIONS
  // =============================================================================

  /**
   * Start checkout flow
   */
  const startCheckout = useCallback(() => {
    if (items.length === 0) {
      message.warning(t('errors.emptyCart'));
      return;
    }
    setIsActive(true);
    setState(initialState);
  }, [items.length, t]);

  /**
   * Cancel checkout
   */
  const cancelCheckout = useCallback(() => {
    setIsActive(false);
    setState(initialState);
    onCancel?.();
  }, [onCancel]);

  /**
   * Retry after error
   */
  const retryCheckout = useCallback(() => {
    updateState({
      currentStep: 'review',
      error: null,
      isProcessing: false,
    });
  }, [updateState]);

  /**
   * Go to next step
   */
  const nextStep = useCallback(async () => {
    if (!canProceed) {
      return;
    }

    const currentIndex = stepIndex;
    const nextStepValue = STEP_ORDER[currentIndex + 1];

    if (nextStepValue) {
      updateState({ currentStep: nextStepValue });
    }
  }, [canProceed, stepIndex, updateState]);

  /**
   * Go to previous step
   */
  const previousStep = useCallback(() => {
    if (!canGoBack) {
      return;
    }

    const prevStep = STEP_ORDER[stepIndex - 1];
    if (prevStep) {
      updateState({
        currentStep: prevStep,
        error: null,
      });
    }
  }, [canGoBack, stepIndex, updateState]);

  /**
   * Go to specific step (only backwards)
   */
  const goToStep = useCallback(
    (step: CheckoutStep) => {
      const targetIndex = STEP_ORDER.indexOf(step);
      if (targetIndex >= 0 && targetIndex < stepIndex) {
        updateState({
          currentStep: step,
          error: null,
        });
      }
    },
    [stepIndex, updateState]
  );

  /**
   * Create sale from cart
   */
  const createSaleFromCart = useCallback(async (): Promise<Sale | null> => {
    if (!shopId || !user?.id_user) {
      setError(t('errors.noShopOrUser'));
      return null;
    }

    updateState({ isProcessing: true });

    try {
      // Create the sale record
      const today = new Date().toISOString().split('T')[0] ?? '';
      const saleResult = await createSale({
        id_shop: shopId,
        id_customer: customer?.id || null,
        sale_date: today,
        currency,
        discount_type: discount?.type || null,
        discount_value: discount?.value || null,
        tax_amount: totals.taxAmount,
        notes: notes || null,
      });

      if (!saleResult.success) {
        throw new Error(saleResult.error ?? t('errors.createSaleFailed'));
      }

      if (!saleResult.data) {
        throw new Error(t('errors.createSaleFailed'));
      }

      const sale = saleResult.data;

      // Add sale items
      for (const item of items) {
        const itemResult = await addSaleItem({
          id_sale: sale.id_sale,
          id_item: item.itemId,
          unit_price: item.price,
          quantity: item.quantity,
        });

        if (!itemResult.success) {
          // Continue with other items but log error
          console.error(`Failed to add item ${item.itemId}:`, itemResult.error);
        }
      }

      updateState({
        sale,
        isProcessing: false,
      });

      return sale;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('errors.createSaleFailed');
      setError(errorMessage);
      return null;
    }
  }, [
    shopId,
    user?.id_user,
    customer?.id,
    currency,
    discount,
    notes,
    items,
    totals.taxAmount,
    t,
    updateState,
    setError,
  ]);

  /**
   * Record payments for the sale
   */
  const recordPayments = useCallback(
    async (payments: Payment[]): Promise<boolean> => {
      if (!state.sale || !customer?.id) {
        // For walk-in, we still need a customer record or handle differently
        // For now, we'll skip payment recording for walk-in customers
        if (!customer?.id) {
          message.info(t('messages.walkInPayment'));
          return true;
        }
        setError(t('errors.noSaleOrCustomer'));
        return false;
      }

      updateState({ isProcessing: true });

      try {
        const recordedPayments: SalePayment[] = [];

        for (const payment of payments) {
          // Skip refund payment types - they should be handled separately
          if (payment.payment_type === 'refund') {
            console.warn('[useCheckout] Skipping refund payment type in checkout flow');
            continue;
          }

          const paymentDate = new Date().toISOString().split('T')[0] ?? '';
          const paymentResult = await recordPayment({
            id_sale: state.sale.id_sale,
            id_customer: customer.id,
            payment_type: payment.payment_type as Exclude<typeof payment.payment_type, 'refund'>,
            amount: payment.amount,
            payment_date: paymentDate,
            notes: payment.notes ?? null,
          });

          if (paymentResult.success && paymentResult.data) {
            recordedPayments.push(paymentResult.data);
          } else if (!paymentResult.success) {
            console.error('Failed to record payment:', paymentResult.error);
          }
        }

        updateState({
          payments: [...state.payments, ...recordedPayments],
          isProcessing: false,
        });

        return recordedPayments.length > 0;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('errors.paymentFailed');
        setError(errorMessage);
        return false;
      }
    },
    [state.sale, state.payments, customer?.id, t, updateState, setError]
  );

  /**
   * Finalize the sale
   */
  const finalizeSale = useCallback(async (): Promise<boolean> => {
    if (!state.sale) {
      setError(t('errors.noSale'));
      return false;
    }

    updateState({
      currentStep: 'processing',
      isProcessing: true,
    });

    try {
      const result = await completeSale({
        id_sale: state.sale.id_sale,
      });

      if (!result.success) {
        throw new Error(result.error ?? t('errors.completeSaleFailed'));
      }

      if (!result.data) {
        throw new Error(t('errors.completeSaleFailed'));
      }

      updateState({
        sale: result.data,
        currentStep: 'complete',
        isProcessing: false,
      });

      onComplete?.(result.data);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('errors.completeSaleFailed');
      setError(errorMessage);
      return false;
    }
  }, [state.sale, t, updateState, setError, onComplete]);

  /**
   * Clear cart and complete checkout
   */
  const clearAndComplete = useCallback(() => {
    clearCart();
    setIsActive(false);
    setState(initialState);
  }, [clearCart]);

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    // State
    state,
    totals,
    isActive,

    // Navigation
    nextStep,
    previousStep,
    goToStep,

    // Actions
    createSaleFromCart,
    recordPayments,
    finalizeSale,

    // Control
    startCheckout,
    cancelCheckout,
    retryCheckout,
    clearAndComplete,

    // Helpers
    canProceed,
    canGoBack,
    stepIndex,
    totalSteps: STEP_ORDER.length - 1, // Exclude 'complete' from count
  };
}

export default useCheckout;
