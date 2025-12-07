'use client';

/**
 * PaymentMethodSelector Component
 *
 * A grid of payment method buttons for selecting the payment type.
 * Features:
 * - Grid layout of payment method options
 * - Icons for each method (Cash, Card, Bank, Credit, Split)
 * - Active state styling with gold border
 * - Disabled state for unavailable methods
 * - Support for shop-specific payment methods
 * - RTL support with logical properties
 *
 * @module components/domain/sales/PaymentMethodSelector
 */

import React, { useCallback } from 'react';

import {
  DollarOutlined,
  CreditCardOutlined,
  BankOutlined,
  WalletOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';
import type { PaymentType } from '@/lib/utils/schemas/sales';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Payment method configuration
 */
interface PaymentMethodConfig {
  value: PaymentType;
  labelKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  iconClassName: string;
}

/**
 * Props for PaymentMethodSelector component
 */
export interface PaymentMethodSelectorProps {
  /**
   * Currently selected payment method
   */
  value: PaymentType | null;

  /**
   * Callback when payment method changes
   */
  onChange: (method: PaymentType) => void;

  /**
   * Payment methods to disable
   */
  disabledMethods?: PaymentType[];

  /**
   * Payment methods to hide entirely
   */
  hiddenMethods?: PaymentType[];

  /**
   * Whether the selector is disabled
   */
  disabled?: boolean;

  /**
   * Whether to show descriptions under method names
   */
  showDescriptions?: boolean;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Whether customer has store credit available
   */
  hasStoreCredit?: boolean;

  /**
   * Store credit balance available
   */
  storeCreditBalance?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Payment method configurations
 * Note: 'cheque' is supported in the schema but we show it as BANK_TRANSFER
 * 'mixed' and 'refund' are system-managed, not user-selectable
 */
const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    value: 'cash',
    labelKey: 'methods.cash',
    descriptionKey: 'methods.cashDescription',
    icon: <DollarOutlined />,
    iconClassName: 'text-emerald-600',
  },
  {
    value: 'card',
    labelKey: 'methods.card',
    descriptionKey: 'methods.cardDescription',
    icon: <CreditCardOutlined />,
    iconClassName: 'text-blue-600',
  },
  {
    value: 'bank_transfer',
    labelKey: 'methods.bankTransfer',
    descriptionKey: 'methods.bankTransferDescription',
    icon: <BankOutlined />,
    iconClassName: 'text-purple-600',
  },
  {
    value: 'cheque',
    labelKey: 'methods.cheque',
    descriptionKey: 'methods.chequeDescription',
    icon: <WalletOutlined />,
    iconClassName: 'text-orange-600',
  },
  {
    value: 'mixed',
    labelKey: 'methods.split',
    descriptionKey: 'methods.splitDescription',
    icon: <SwapOutlined />,
    iconClassName: 'text-amber-600',
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * PaymentMethodSelector Component
 *
 * Renders a grid of payment method buttons with active state styling.
 * Supports disabling specific methods and showing store credit option.
 */
export function PaymentMethodSelector({
  value,
  onChange,
  disabledMethods = [],
  hiddenMethods = [],
  disabled = false,
  showDescriptions = true,
  className,
  hasStoreCredit = false,
  storeCreditBalance = 0,
}: PaymentMethodSelectorProps): JSX.Element {
  const t = useTranslations('sales.payment');

  /**
   * Handle method selection
   */
  const handleSelect = useCallback(
    (method: PaymentType) => {
      if (!disabled && !disabledMethods.includes(method)) {
        onChange(method);
      }
    },
    [disabled, disabledMethods, onChange]
  );

  /**
   * Filter visible methods
   */
  const visibleMethods = PAYMENT_METHODS.filter((method) => !hiddenMethods.includes(method.value));

  return (
    <div className={cn('space-y-3', className)}>
      {/* Payment method grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {visibleMethods.map((method) => {
          const isSelected = value === method.value;
          const isDisabled = disabled || disabledMethods.includes(method.value);
          // Special handling for store credit - only show if customer has credit
          const isStoreCreditDisabled = method.value === 'cheque' && !hasStoreCredit;

          return (
            <button
              key={method.value}
              type="button"
              onClick={() => handleSelect(method.value)}
              disabled={isDisabled || isStoreCreditDisabled}
              className={cn(
                // Base styles
                'relative flex flex-col items-center justify-center',
                'p-4 rounded-lg border-2 transition-all duration-200',
                'min-h-[100px] w-full',
                // Focus styles for accessibility
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2',
                // Default state
                !isSelected &&
                  !isDisabled && [
                    'border-stone-200 bg-white hover:border-amber-300 hover:bg-amber-50/30',
                    'cursor-pointer',
                  ],
                // Selected state - gold theme
                isSelected && [
                  'border-amber-400 bg-amber-50/50 shadow-sm',
                  'ring-1 ring-amber-200',
                ],
                // Disabled state
                (isDisabled || isStoreCreditDisabled) && [
                  'border-stone-100 bg-stone-50 cursor-not-allowed opacity-50',
                ]
              )}
              aria-pressed={isSelected}
              aria-disabled={isDisabled || isStoreCreditDisabled}
            >
              {/* Icon */}
              <span
                className={cn(
                  'text-2xl mb-2 transition-colors',
                  method.iconClassName,
                  isDisabled && 'text-stone-400'
                )}
              >
                {method.icon}
              </span>

              {/* Label */}
              <Text
                strong={isSelected}
                className={cn(
                  'text-sm transition-colors',
                  isSelected ? 'text-amber-700' : 'text-stone-700',
                  isDisabled && 'text-stone-400'
                )}
              >
                {t(method.labelKey)}
              </Text>

              {/* Description */}
              {showDescriptions && (
                <Text
                  type="secondary"
                  className={cn('text-xs mt-1 text-center', isDisabled && 'text-stone-300')}
                >
                  {t(method.descriptionKey)}
                </Text>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <span
                  className={cn('absolute top-2 end-2 w-3 h-3 rounded-full bg-amber-500')}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Store credit info if available */}
      {hasStoreCredit && storeCreditBalance > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <WalletOutlined className="text-amber-600" />
          <Text className="text-sm text-amber-800">
            {t('storeCreditAvailable', {
              amount: storeCreditBalance.toFixed(2),
            })}
          </Text>
        </div>
      )}
    </div>
  );
}

export default PaymentMethodSelector;
