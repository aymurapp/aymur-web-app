'use client';

/**
 * CustomerSelectorItem Component
 *
 * Individual customer row in the customer selector for POS.
 * Displays customer avatar, name, phone, balance indicator, and VIP status.
 *
 * Features:
 * - Avatar with initials or company icon
 * - Name and phone number display
 * - Balance badge (green if credit available, red if owes)
 * - VIP/loyalty indicator
 * - Click to select with keyboard support
 * - Hover state with gold accent
 * - RTL support with CSS logical properties
 *
 * @module components/domain/sales/CustomerSelectorItem
 */

import React, { useMemo, useCallback } from 'react';

import { CrownOutlined, UserOutlined, BankOutlined, CheckOutlined } from '@ant-design/icons';
import { Avatar, Typography, Tag } from 'antd';
import { useTranslations } from 'next-intl';

import { useShop } from '@/lib/hooks/shop';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatPhone } from '@/lib/utils/format';

import type { CustomerWithVip } from '../customers/CustomerCard';

// Re-export CustomerWithVip from the canonical source in customers domain
export type { CustomerWithVip } from '../customers/CustomerCard';

const { Text } = Typography;

/**
 * Props for the CustomerSelectorItem component
 */
export interface CustomerSelectorItemProps {
  /** Customer data */
  customer: CustomerWithVip;
  /** Whether this item is currently selected */
  selected?: boolean;
  /** Whether this item is highlighted (keyboard navigation) */
  highlighted?: boolean;
  /** Click handler */
  onClick?: (customer: CustomerWithVip) => void;
  /** Show balance information */
  showBalance?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Extracts initials from customer name for avatar fallback
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '??';
  }
  if (words.length === 1) {
    return (words[0]?.substring(0, 2) || '??').toUpperCase();
  }
  const firstInitial = words[0]?.[0] || '?';
  const lastInitial = words[words.length - 1]?.[0] || '?';
  return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Determines balance color based on value
 * Positive = customer owes money (red)
 * Negative = shop owes customer (green - credit)
 * Zero = neutral (no badge)
 */
function getBalanceConfig(balance: number): {
  color: 'green' | 'red' | null;
  label: 'owes' | 'credit' | null;
} {
  if (balance > 0) {
    return { color: 'red', label: 'owes' };
  }
  if (balance < 0) {
    return { color: 'green', label: 'credit' };
  }
  return { color: null, label: null };
}

/**
 * CustomerSelectorItem Component
 *
 * Individual customer row for selection in POS customer selector.
 */
export function CustomerSelectorItem({
  customer,
  selected = false,
  highlighted = false,
  onClick,
  showBalance = true,
  className,
}: CustomerSelectorItemProps): JSX.Element {
  const t = useTranslations('customers');
  const tSales = useTranslations('sales');
  const { shop } = useShop();

  // Memoize derived values
  const initials = useMemo(() => getInitials(customer.full_name), [customer.full_name]);
  const balanceConfig = useMemo(
    () => getBalanceConfig(customer.current_balance),
    [customer.current_balance]
  );

  // Format balance with shop currency
  const formattedBalance = useMemo(() => {
    const currency = shop?.currency || 'USD';
    return formatCurrency(Math.abs(customer.current_balance), currency);
  }, [customer.current_balance, shop?.currency]);

  // Format phone number
  const formattedPhone = useMemo(
    () => (customer.phone ? formatPhone(customer.phone) : null),
    [customer.phone]
  );

  // Check if customer is VIP
  const isVip = customer.is_vip ?? false;

  // Check if customer is a company
  const isCompany = customer.client_type === 'company';

  // Handle click
  const handleClick = useCallback(() => {
    onClick?.(customer);
  }, [onClick, customer]);

  // Handle keyboard interaction
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.(customer);
      }
    },
    [onClick, customer]
  );

  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        // Base styles
        'flex items-center gap-3 px-4 py-3 cursor-pointer',
        'transition-all duration-150 ease-out',
        // Border for visual separation
        'border-b border-stone-100 last:border-b-0',
        // Default state
        'bg-white',
        // Hover state with gold accent
        !selected && 'hover:bg-amber-50/50',
        // Highlighted state (keyboard navigation)
        highlighted && !selected && 'bg-amber-50/70 ring-1 ring-inset ring-amber-200',
        // Selected state
        selected && [
          'bg-amber-50',
          'border-s-4 border-s-amber-500',
          'ps-3', // Adjust padding to account for border
        ],
        // Focus state
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset',
        className
      )}
    >
      {/* Avatar */}
      <Avatar
        size={40}
        icon={isCompany ? <BankOutlined /> : <UserOutlined />}
        className={cn('flex-shrink-0 text-sm', isCompany ? 'bg-blue-500' : 'bg-amber-500')}
      >
        {initials}
      </Avatar>

      {/* Customer Info */}
      <div className="flex-1 min-w-0">
        {/* Name Row */}
        <div className="flex items-center gap-2">
          <Text
            strong
            className={cn('truncate text-sm text-stone-800', selected && 'text-amber-900')}
          >
            {customer.full_name}
          </Text>

          {/* VIP Badge */}
          {isVip && (
            <CrownOutlined
              className="text-amber-500 text-xs flex-shrink-0"
              aria-label={t('segments.vip')}
            />
          )}

          {/* Company Badge */}
          {isCompany && (
            <Tag color="blue" className="m-0 text-xs px-1.5 py-0 leading-tight flex-shrink-0">
              {t('segments.wholesale')}
            </Tag>
          )}
        </div>

        {/* Phone Row */}
        {formattedPhone && (
          <Text type="secondary" className="text-xs truncate block" dir="ltr">
            {formattedPhone}
          </Text>
        )}
      </div>

      {/* Balance Badge */}
      {showBalance && balanceConfig.color && (
        <div
          className={cn(
            'flex-shrink-0 text-end px-2 py-1 rounded-md',
            balanceConfig.color === 'red' && 'bg-red-50',
            balanceConfig.color === 'green' && 'bg-emerald-50'
          )}
        >
          <Text
            className={cn(
              'text-xs font-medium block',
              balanceConfig.color === 'red' && 'text-red-600',
              balanceConfig.color === 'green' && 'text-emerald-600'
            )}
          >
            {balanceConfig.label === 'owes' ? '+' : '-'}
            {formattedBalance}
          </Text>
          <Text
            className={cn(
              'text-[10px]',
              balanceConfig.color === 'red' && 'text-red-500',
              balanceConfig.color === 'green' && 'text-emerald-500'
            )}
          >
            {balanceConfig.label === 'owes'
              ? tSales('customerSelector.owes')
              : tSales('customerSelector.credit')}
          </Text>
        </div>
      )}

      {/* Selected Checkmark */}
      {selected && (
        <div className="flex-shrink-0">
          <CheckOutlined className="text-amber-600 text-lg" />
        </div>
      )}
    </div>
  );
}

export default CustomerSelectorItem;
