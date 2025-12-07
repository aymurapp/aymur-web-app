'use client';

/**
 * CheckoutProgress Component
 *
 * Step indicator for the checkout flow displaying progress through:
 * Review -> Customer -> Payment -> Complete
 *
 * Features:
 * - Visual step indicator with icons
 * - Current step highlighting (gold theme)
 * - Completed steps with checkmarks
 * - Clickable navigation to previous steps
 * - RTL support
 * - Responsive design
 *
 * @module components/domain/sales/CheckoutProgress
 */

import React from 'react';

import {
  ShoppingCartOutlined,
  UserOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { Steps, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Checkout step type
 */
export type CheckoutStepType =
  | 'review'
  | 'customer'
  | 'payment'
  | 'processing'
  | 'complete'
  | 'error';

/**
 * Props for CheckoutProgress component
 */
export interface CheckoutProgressProps {
  /**
   * Current step in the checkout flow
   */
  currentStep: CheckoutStepType;

  /**
   * Callback when a step is clicked (for navigation back)
   */
  onStepClick?: (step: CheckoutStepType) => void;

  /**
   * Whether navigation is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Compact mode for mobile
   * @default false
   */
  compact?: boolean;

  /**
   * Additional class names
   */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Step configuration
 */
const STEPS = [
  { key: 'review' as const, icon: ShoppingCartOutlined },
  { key: 'customer' as const, icon: UserOutlined },
  { key: 'payment' as const, icon: CreditCardOutlined },
  { key: 'complete' as const, icon: CheckCircleOutlined },
];

/**
 * Map current step to Steps component status index
 */
const STEP_INDEX_MAP: Record<CheckoutStepType, number> = {
  review: 0,
  customer: 1,
  payment: 2,
  processing: 2, // Still on payment step visually
  complete: 3,
  error: -1, // Error state
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * CheckoutProgress Component
 *
 * Visual step indicator showing progress through checkout flow.
 * Supports clicking on previous steps to navigate back.
 *
 * @example
 * ```tsx
 * <CheckoutProgress
 *   currentStep="payment"
 *   onStepClick={(step) => goToStep(step)}
 * />
 * ```
 */
export function CheckoutProgress({
  currentStep,
  onStepClick,
  disabled = false,
  compact = false,
  className,
}: CheckoutProgressProps): JSX.Element {
  const t = useTranslations('sales.checkout');

  const currentIndex = STEP_INDEX_MAP[currentStep] ?? 0;
  const isProcessing = currentStep === 'processing';
  const isError = currentStep === 'error';

  /**
   * Handle step click - only allow navigating back
   */
  const handleStepClick = (stepIndex: number) => {
    if (disabled || !onStepClick) {
      return;
    }

    // Only allow clicking on completed steps
    if (stepIndex < currentIndex) {
      const step = STEPS[stepIndex];
      if (step) {
        onStepClick(step.key);
      }
    }
  };

  /**
   * Get step status
   */
  const getStepStatus = (stepIndex: number): 'wait' | 'process' | 'finish' | 'error' => {
    if (isError && stepIndex === currentIndex) {
      return 'error';
    }
    if (stepIndex < currentIndex) {
      return 'finish';
    }
    if (stepIndex === currentIndex) {
      return isProcessing ? 'process' : 'process';
    }
    return 'wait';
  };

  /**
   * Get step icon
   */
  const getStepIcon = (step: (typeof STEPS)[number], index: number): React.ReactNode => {
    const StepIcon = step.icon;
    const status = getStepStatus(index);

    // Processing state shows loading icon
    if (isProcessing && index === currentIndex) {
      return <LoadingOutlined className="text-amber-500" />;
    }

    // Completed steps show checkmark
    if (status === 'finish') {
      return <CheckCircleOutlined className="text-green-500" />;
    }

    // Error state
    if (status === 'error') {
      return <StepIcon className="text-red-500" />;
    }

    // Current step
    if (status === 'process') {
      return <StepIcon className="text-amber-500" />;
    }

    // Waiting step
    return <StepIcon className="text-stone-400" />;
  };

  // Compact mobile version
  if (compact) {
    return (
      <div className={cn('flex items-center justify-center gap-2', className)}>
        {STEPS.map((step, index) => {
          const status = getStepStatus(index);
          const isClickable = !disabled && onStepClick && index < currentIndex;

          return (
            <React.Fragment key={step.key}>
              <button
                type="button"
                onClick={() => handleStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  'transition-all duration-200',
                  status === 'finish' && 'bg-green-100 text-green-600',
                  status === 'process' && 'bg-amber-100 text-amber-600 ring-2 ring-amber-400',
                  status === 'wait' && 'bg-stone-100 text-stone-400',
                  status === 'error' && 'bg-red-100 text-red-600',
                  isClickable && 'cursor-pointer hover:ring-2 hover:ring-amber-300',
                  !isClickable && 'cursor-default'
                )}
              >
                {getStepIcon(step, index)}
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-8 h-0.5 rounded-full',
                    index < currentIndex ? 'bg-green-400' : 'bg-stone-200'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // Full desktop version using Ant Design Steps
  return (
    <div className={cn('checkout-progress', className)}>
      <Steps
        current={currentIndex}
        status={isError ? 'error' : isProcessing ? 'process' : undefined}
        items={STEPS.map((step, index) => {
          const isClickable = !disabled && onStepClick && index < currentIndex;

          return {
            title: (
              <Text
                className={cn(
                  'text-sm font-medium',
                  index === currentIndex && 'text-amber-600',
                  index < currentIndex && 'text-green-600',
                  index > currentIndex && 'text-stone-400'
                )}
              >
                {t(`steps.${step.key}`)}
              </Text>
            ),
            icon: getStepIcon(step, index),
            onClick: isClickable ? () => handleStepClick(index) : undefined,
            className: cn(isClickable && 'cursor-pointer'),
          };
        })}
        className={cn(
          '[&_.ant-steps-item-icon]:border-stone-200',
          '[&_.ant-steps-item-finish_.ant-steps-item-icon]:border-green-400',
          '[&_.ant-steps-item-finish_.ant-steps-item-icon]:bg-green-50',
          '[&_.ant-steps-item-process_.ant-steps-item-icon]:border-amber-400',
          '[&_.ant-steps-item-process_.ant-steps-item-icon]:bg-amber-50',
          '[&_.ant-steps-item-finish_.ant-steps-item-tail::after]:bg-green-400',
          '[&_.ant-steps-item-process_.ant-steps-item-tail::after]:bg-amber-300'
        )}
      />
    </div>
  );
}

/**
 * Compact progress indicator for headers
 */
export function CheckoutProgressCompact({
  currentStep,
  className,
}: Pick<CheckoutProgressProps, 'currentStep' | 'className'>): JSX.Element {
  const t = useTranslations('sales.checkout');
  const currentIndex = STEP_INDEX_MAP[currentStep] ?? 0;
  const totalSteps = STEPS.length;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Text type="secondary" className="text-sm">
        {t('stepOf', { current: currentIndex + 1, total: totalSteps })}
      </Text>
      <div className="flex gap-1">
        {STEPS.map((_, index) => (
          <div
            key={index}
            className={cn(
              'w-2 h-2 rounded-full transition-colors duration-200',
              index <= currentIndex ? 'bg-amber-500' : 'bg-stone-200'
            )}
          />
        ))}
      </div>
    </div>
  );
}

export default CheckoutProgress;
