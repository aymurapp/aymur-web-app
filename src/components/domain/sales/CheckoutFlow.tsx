'use client';

/**
 * CheckoutFlow Component
 *
 * Full-screen modal checkout process that orchestrates the sale completion flow.
 * This is the main orchestrator that coordinates all checkout steps.
 *
 * Flow: Review Order -> Customer -> Payment -> Complete
 *
 * Features:
 * - Full-screen modal overlay
 * - Step indicator at top (CheckoutProgress)
 * - Step content rendering (Review, Customer, Payment, Complete)
 * - Back/Next navigation with validation
 * - Cancel with confirmation dialog
 * - Keyboard shortcuts (Enter to proceed, Esc to cancel)
 * - Loading states during processing
 * - Error handling with retry
 * - Auto-clear cart on completion
 * - RTL support
 *
 * @module components/domain/sales/CheckoutFlow
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';

import {
  CloseOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Modal, Typography, message } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { useCheckout, type CheckoutStep } from '@/hooks/useCheckout';
import type { Customer } from '@/lib/hooks/data/useCustomers';
import { useShop } from '@/lib/hooks/shop';
import { cn } from '@/lib/utils/cn';
import { useCartStore, type CartCustomer } from '@/stores/cartStore';

import {
  CheckoutComplete,
  CheckoutProcessing,
  CheckoutError,
  type ReceiptData,
} from './CheckoutComplete';
import { CheckoutProgress } from './CheckoutProgress';
import { CheckoutReview } from './CheckoutReview';
import { CustomerSelector } from './CustomerSelector';
import { PaymentForm } from './PaymentForm';

import type { Payment } from './PaymentForm';

const { Text } = Typography;
const { confirm } = Modal;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for CheckoutFlow component
 */
export interface CheckoutFlowProps {
  /**
   * Whether the checkout flow is open
   */
  open: boolean;

  /**
   * Callback when checkout is closed/cancelled
   */
  onClose: () => void;

  /**
   * Callback when checkout completes successfully
   */
  onComplete?: (saleId: string) => void;

  /**
   * Tax rate percentage (e.g., 5 for 5%)
   * @default 0
   */
  taxRate?: number;

  /**
   * Additional class names for the modal content
   */
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Map cart customer to payment customer format
 */
function mapToPaymentCustomer(customer: CartCustomer | null) {
  if (!customer) {
    return null;
  }
  return {
    id_customer: customer.id,
    full_name: customer.name,
    phone: customer.phone,
    credit_balance: customer.balance,
    is_vip: false,
  };
}

/**
 * Create receipt data from checkout state
 */
function createReceiptData(
  state: ReturnType<typeof useCheckout>['state'],
  totals: ReturnType<typeof useCheckout>['totals'],
  customer: CartCustomer | null,
  currency: string,
  itemCount: number
): ReceiptData {
  return {
    saleNumber: state.sale?.invoice_number || '',
    saleDate: state.sale?.sale_date || new Date().toISOString(),
    customerName: customer?.name,
    customerEmail: customer?.email,
    itemCount,
    subtotal: totals.subtotal,
    discount: totals.lineDiscounts + totals.orderDiscount,
    tax: totals.taxAmount,
    total: totals.grandTotal,
    paid: totals.paidAmount,
    change: Math.max(0, totals.paidAmount - totals.grandTotal),
    currency,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * CheckoutFlow Component
 *
 * Orchestrates the complete checkout flow from cart review to sale completion.
 *
 * @example
 * ```tsx
 * <CheckoutFlow
 *   open={isCheckoutOpen}
 *   onClose={() => setIsCheckoutOpen(false)}
 *   onComplete={(saleId) => router.push(`/sales/${saleId}`)}
 *   taxRate={5}
 * />
 * ```
 */
export function CheckoutFlow({
  open,
  onClose,
  onComplete,
  taxRate = 0,
  className,
}: CheckoutFlowProps): JSX.Element {
  const t = useTranslations('sales.checkout');
  const tCommon = useTranslations('common');

  // Shop context
  const { shopId, shop } = useShop();
  const currency = shop?.currency || 'USD';

  // Cart state
  const { items, customer, notes, setCustomer } = useCartStore();

  // Local state
  const [customerSelectorOpen, setCustomerSelectorOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);

  // Refs for focus management
  const modalRef = useRef<HTMLDivElement>(null);

  // Checkout hook
  const {
    state,
    totals,
    nextStep,
    previousStep,
    goToStep,
    createSaleFromCart,
    recordPayments,
    finalizeSale,
    cancelCheckout,
    retryCheckout,
    clearAndComplete,
    canProceed,
    canGoBack,
  } = useCheckout({
    taxRate,
    onComplete: (sale) => {
      onComplete?.(sale.id_sale);
    },
    onError: (error) => {
      message.error(error);
    },
  });

  // =============================================================================
  // EFFECTS
  // =============================================================================

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if in input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (event.key) {
        case 'Enter':
          // Proceed to next step on Enter (if possible)
          if (canProceed && state.currentStep !== 'complete') {
            event.preventDefault();
            handleNext();
          }
          break;
        case 'Escape':
          // Show cancel confirmation on Escape
          event.preventDefault();
          handleCancelClick();
          break;
        case 'Backspace':
          // Go back on Backspace (if possible)
          if (canGoBack) {
            event.preventDefault();
            handleBack();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, canProceed, canGoBack, state.currentStep]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  /**
   * Handle cancel click with confirmation
   */
  const handleCancelClick = useCallback(() => {
    // Don't show confirmation if cart is empty or already complete
    if (items.length === 0 || state.currentStep === 'complete') {
      cancelCheckout();
      onClose();
      return;
    }

    confirm({
      title: t('cancelConfirmTitle'),
      icon: <ExclamationCircleOutlined />,
      content: t('cancelConfirmMessage'),
      okText: t('cancelConfirmOk'),
      cancelText: t('cancelConfirmCancel'),
      okButtonProps: { danger: true },
      onOk() {
        cancelCheckout();
        onClose();
      },
    });
  }, [items.length, state.currentStep, t, cancelCheckout, onClose]);

  /**
   * Handle next step
   */
  const handleNext = useCallback(async () => {
    switch (state.currentStep) {
      case 'review':
        // Create sale from cart before moving to customer step
        const sale = await createSaleFromCart();
        if (sale) {
          await nextStep();
        }
        break;
      case 'customer':
        // Customer step - just move to payment
        await nextStep();
        break;
      case 'payment':
        // Payment step - finalize the sale
        await finalizeSale();
        break;
      default:
        await nextStep();
    }
  }, [state.currentStep, createSaleFromCart, nextStep, finalizeSale]);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    previousStep();
  }, [previousStep]);

  /**
   * Handle edit from review (go back to POS)
   */
  const handleEditOrder = useCallback(() => {
    cancelCheckout();
    onClose();
  }, [cancelCheckout, onClose]);

  /**
   * Handle change customer click
   */
  const handleChangeCustomer = useCallback(() => {
    setCustomerSelectorOpen(true);
  }, []);

  /**
   * Handle customer selection
   */
  const handleCustomerSelect = useCallback(
    (selectedCustomer: Customer | null) => {
      if (selectedCustomer) {
        setCustomer({
          id: selectedCustomer.id_customer,
          name: selectedCustomer.full_name,
          phone: selectedCustomer.phone || undefined,
          email: selectedCustomer.email || undefined,
          balance: 0, // Could fetch actual balance
        });
      } else {
        setCustomer(null);
      }
      setCustomerSelectorOpen(false);
    },
    [setCustomer]
  );

  /**
   * Handle payment completion
   */
  const handlePaymentComplete = useCallback(
    async (payments: Payment[]) => {
      // Record payments (if customer is selected)
      if (customer) {
        await recordPayments(payments);
      }
      // Finalize the sale
      await finalizeSale();
    },
    [customer, recordPayments, finalizeSale]
  );

  /**
   * Handle payment cancel
   */
  const handlePaymentCancel = useCallback(() => {
    previousStep();
  }, [previousStep]);

  /**
   * Handle new sale (after completion)
   */
  const handleNewSale = useCallback(() => {
    clearAndComplete();
    onClose();
  }, [clearAndComplete, onClose]);

  /**
   * Handle print receipt
   */
  const handlePrintReceipt = useCallback(() => {
    setIsPrinting(true);
    // TODO: Implement actual printing
    setTimeout(() => {
      setIsPrinting(false);
      message.success(t('printSuccess'));
    }, 1500);
  }, [t]);

  /**
   * Handle email receipt
   */
  const handleEmailReceipt = useCallback(() => {
    setIsEmailing(true);
    // TODO: Implement actual email sending
    setTimeout(() => {
      setIsEmailing(false);
      message.success(t('emailSuccess'));
    }, 1500);
  }, [t]);

  /**
   * Handle view sale details
   */
  const handleViewSale = useCallback(() => {
    if (state.sale) {
      // TODO: Navigate to sale details
      console.log('View sale:', state.sale.id_sale);
    }
  }, [state.sale]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    retryCheckout();
  }, [retryCheckout]);

  /**
   * Handle step click (for navigation back)
   */
  const handleStepClick = useCallback(
    (step: CheckoutStep) => {
      goToStep(step);
    },
    [goToStep]
  );

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  /**
   * Render step content based on current step
   */
  const renderStepContent = (): React.ReactNode => {
    switch (state.currentStep) {
      case 'review':
        return (
          <CheckoutReview
            items={items}
            customer={customer}
            totals={{
              subtotal: totals.subtotal,
              lineDiscounts: totals.lineDiscounts,
              orderDiscount: totals.orderDiscount,
              taxAmount: totals.taxAmount,
              grandTotal: totals.grandTotal,
            }}
            currency={currency}
            notes={notes}
            onEdit={handleEditOrder}
            onChangeCustomer={handleChangeCustomer}
            onProceed={handleNext}
            proceedDisabled={!canProceed}
            isLoading={state.isProcessing}
          />
        );

      case 'customer':
        return (
          <div className="space-y-6">
            <CheckoutReview
              items={items}
              customer={customer}
              totals={{
                subtotal: totals.subtotal,
                lineDiscounts: totals.lineDiscounts,
                orderDiscount: totals.orderDiscount,
                taxAmount: totals.taxAmount,
                grandTotal: totals.grandTotal,
              }}
              currency={currency}
              onChangeCustomer={handleChangeCustomer}
            />
            <div className="flex gap-3 pt-4">
              <Button
                type="default"
                size="large"
                icon={<ArrowLeftOutlined />}
                onClick={handleBack}
                className="flex-1"
              >
                {t('back')}
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<ArrowRightOutlined />}
                onClick={handleNext}
                className="flex-1"
              >
                {t('proceedToPayment')}
              </Button>
            </div>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-4">
            {/* Compact order summary */}
            <div className="bg-stone-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <Text type="secondary">{t('orderTotal')}</Text>
                <Text strong className="text-xl text-amber-600">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency,
                  }).format(totals.grandTotal)}
                </Text>
              </div>
              {customer && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-stone-200">
                  <Text type="secondary">{t('customer')}</Text>
                  <Text>{customer.name}</Text>
                </div>
              )}
            </div>

            <PaymentForm
              saleId={state.sale?.id_sale || ''}
              totalAmount={totals.grandTotal}
              customer={mapToPaymentCustomer(customer)}
              onPaymentComplete={handlePaymentComplete}
              onCancel={handlePaymentCancel}
              currency={currency}
              paidAmount={totals.paidAmount}
            />
          </div>
        );

      case 'processing':
        return <CheckoutProcessing />;

      case 'complete':
        return (
          <CheckoutComplete
            sale={state.sale}
            receiptData={createReceiptData(state, totals, customer, currency, items.length)}
            onPrintReceipt={handlePrintReceipt}
            onEmailReceipt={customer?.email ? handleEmailReceipt : undefined}
            onNewSale={handleNewSale}
            onViewSale={handleViewSale}
            isPrinting={isPrinting}
            isEmailing={isEmailing}
          />
        );

      case 'error':
        return (
          <CheckoutError
            error={state.error || t('unknownError')}
            onRetry={handleRetry}
            onCancel={handleCancelClick}
          />
        );

      default:
        return null;
    }
  };

  /**
   * Get step title for header
   */
  const getStepTitle = (): string => {
    switch (state.currentStep) {
      case 'review':
        return t('steps.review');
      case 'customer':
        return t('steps.customer');
      case 'payment':
        return t('steps.payment');
      case 'processing':
        return t('steps.processing');
      case 'complete':
        return t('steps.complete');
      case 'error':
        return t('steps.error');
      default:
        return t('title');
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <>
      {/* Main Checkout Modal */}
      <Modal
        open={open}
        onCancel={handleCancelClick}
        footer={null}
        width="100%"
        className="checkout-flow-modal"
        styles={{
          content: {
            maxWidth: 640,
            margin: '0 auto',
            borderRadius: 16,
            padding: 0,
          },
          body: {
            padding: 0,
          },
          mask: {
            backdropFilter: 'blur(4px)',
          },
        }}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
        centered
      >
        <div ref={modalRef} className={cn('flex flex-col', className)}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
            <div className="flex items-center gap-3">
              {canGoBack && state.currentStep !== 'complete' && (
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={handleBack}
                  className="!p-2"
                />
              )}
              <Text strong className="text-lg">
                {getStepTitle()}
              </Text>
            </div>

            {state.currentStep !== 'complete' && state.currentStep !== 'processing' && (
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={handleCancelClick}
                aria-label={tCommon('actions.close')}
              />
            )}
          </div>

          {/* Progress Indicator */}
          {state.currentStep !== 'processing' && state.currentStep !== 'error' && (
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-100">
              <CheckoutProgress
                currentStep={state.currentStep}
                onStepClick={handleStepClick}
                disabled={state.isProcessing}
                compact={false}
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 max-h-[calc(100vh-220px)]">
            {renderStepContent()}
          </div>

          {/* Keyboard shortcuts hint */}
          {state.currentStep !== 'complete' &&
            state.currentStep !== 'processing' &&
            state.currentStep !== 'error' && (
              <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 text-center">
                <Text type="secondary" className="text-xs">
                  {t('keyboardHint')}
                </Text>
              </div>
            )}
        </div>
      </Modal>

      {/* Customer Selector Drawer */}
      <CustomerSelector
        open={customerSelectorOpen}
        onClose={() => setCustomerSelectorOpen(false)}
        onSelect={handleCustomerSelect}
        selectedCustomer={
          customer
            ? ({
                id_customer: customer.id,
                full_name: customer.name,
                phone: customer.phone || null,
                email: customer.email || null,
              } as Customer)
            : null
        }
        shopId={shopId || ''}
      />
    </>
  );
}

export default CheckoutFlow;
