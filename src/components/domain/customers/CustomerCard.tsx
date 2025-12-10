'use client';

/**
 * CustomerCard Component
 *
 * Displays customer information in a card format with:
 * - Name and phone prominently displayed
 * - Balance indicator with color coding
 * - Client type badge (individual/company)
 * - VIP crown indicator
 * - Financial status indicator
 * - Click to open detail modal
 *
 * @example
 * ```tsx
 * <CustomerCard
 *   customer={customer}
 *   onClick={(c) => openModal(c)}
 *   showBalance
 * />
 *
 * // Compact mode for dropdowns/selects
 * <CustomerCard
 *   customer={customer}
 *   compact
 *   onClick={handleSelect}
 * />
 * ```
 */

import React, { useMemo } from 'react';

import {
  CrownOutlined,
  PhoneOutlined,
  UserOutlined,
  BankOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Avatar, Tag, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { Card } from '@/components/ui/Card';
import type { Customer } from '@/lib/hooks/data/useCustomers';
import { useShop } from '@/lib/hooks/shop';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatPhone } from '@/lib/utils/format';

const { Text } = Typography;

/**
 * Customer type alias for components that need VIP info
 * is_vip is now part of the base Customer type in the database
 */
export type CustomerWithVip = Customer;

/**
 * Props for the CustomerCard component
 */
export interface CustomerCardProps {
  /** Customer data from useCustomers hook (with optional is_vip field) */
  customer: CustomerWithVip;
  /** Click handler - opens detail modal or selects customer */
  onClick?: (customer: CustomerWithVip) => void;
  /** Whether this card is currently selected */
  selected?: boolean;
  /** Whether to show balance information */
  showBalance?: boolean;
  /** Compact mode for use in dropdowns/selects */
  compact?: boolean;
  /** Override VIP status (useful when is_vip comes from a different source) */
  isVip?: boolean;
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
 * Zero = neutral (gray)
 */
function getBalanceColor(balance: number): 'green' | 'red' | 'gray' {
  if (balance > 0) {
    return 'red';
  } // Customer owes
  if (balance < 0) {
    return 'green';
  } // Shop owes (customer has credit)
  return 'gray';
}

/**
 * Gets client type tag configuration for Ant Design Tag component
 */
function getClientTypeTagConfig(clientType: string | null): {
  color: 'default' | 'success' | 'gold' | 'blue';
  icon: React.ReactNode;
  avatarBg: string;
} {
  switch (clientType) {
    case 'regular':
      return {
        color: 'success',
        icon: <UserOutlined />,
        avatarBg: 'bg-emerald-500',
      };
    case 'vip':
      return {
        color: 'gold',
        icon: <CrownOutlined />,
        avatarBg: 'bg-amber-500',
      };
    case 'collaboration':
      return {
        color: 'blue',
        icon: <BankOutlined />,
        avatarBg: 'bg-blue-500',
      };
    case 'walk-in':
    default:
      return {
        color: 'default',
        icon: <UserOutlined />,
        avatarBg: 'bg-stone-400',
      };
  }
}

/**
 * Gets financial status tag configuration for Ant Design Tag component
 */
function getFinancialStatusTagConfig(status: string | null): {
  color: 'success' | 'warning' | 'error' | 'default';
  icon: React.ReactNode;
} {
  switch (status) {
    case 'good':
      return {
        color: 'success',
        icon: <CheckCircleOutlined />,
      };
    case 'warning':
      return {
        color: 'warning',
        icon: <WarningOutlined />,
      };
    case 'critical':
      return {
        color: 'error',
        icon: <ExclamationCircleOutlined />,
      };
    default:
      return {
        color: 'default',
        icon: null,
      };
  }
}

/**
 * CustomerCard Component
 *
 * A card component displaying customer information with visual indicators
 * for VIP status, balance, client type, and financial status.
 */
export function CustomerCard({
  customer,
  onClick,
  selected = false,
  showBalance = true,
  compact = false,
  isVip: isVipProp,
  className,
}: CustomerCardProps) {
  const t = useTranslations('customers');
  const { shop } = useShop();

  // Memoize derived values
  const initials = useMemo(() => getInitials(customer.full_name), [customer.full_name]);
  const balanceColor = useMemo(
    () => getBalanceColor(customer.current_balance),
    [customer.current_balance]
  );
  const financialStatusTag = useMemo(
    () => getFinancialStatusTagConfig(customer.financial_status),
    [customer.financial_status]
  );
  const clientTypeTag = useMemo(
    () => getClientTypeTagConfig(customer.client_type),
    [customer.client_type]
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
  // Priority: prop override > customer.is_vip field > false
  const isVip = isVipProp ?? customer.is_vip ?? false;

  // Handle card click
  const handleClick = () => {
    if (onClick) {
      onClick(customer);
    }
  };

  // Handle phone click (click-to-call)
  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Compact mode for dropdowns/selects
  if (compact) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        className={cn(
          'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
          'hover:bg-stone-50',
          selected && 'bg-amber-50 border border-amber-200',
          className
        )}
      >
        {/* Avatar */}
        <Avatar
          size="small"
          icon={clientTypeTag.icon}
          className={cn('flex-shrink-0', clientTypeTag.avatarBg)}
        >
          {initials}
        </Avatar>

        {/* Name and Phone */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Text strong className="truncate text-sm">
              {customer.full_name}
            </Text>
            {isVip && <CrownOutlined className="text-amber-500 text-xs" />}
          </div>
          {formattedPhone && (
            <Text type="secondary" className="text-xs truncate block">
              {formattedPhone}
            </Text>
          )}
        </div>

        {/* Balance (compact) */}
        {showBalance && customer.current_balance !== 0 && (
          <Text
            className={cn(
              'text-xs font-medium flex-shrink-0',
              balanceColor === 'red' && 'text-red-600',
              balanceColor === 'green' && 'text-emerald-600'
            )}
          >
            {customer.current_balance > 0 ? '+' : '-'}
            {formattedBalance}
          </Text>
        )}
      </div>
    );
  }

  // Full card mode
  return (
    <Card
      hoverable={!!onClick}
      onClick={handleClick}
      className={cn('relative', selected && 'ring-2 ring-amber-400 border-amber-300', className)}
    >
      {/* VIP Badge - positioned at top right */}
      {isVip && (
        <div className="absolute top-3 end-3">
          <Tag icon={<CrownOutlined />} color="gold" className="m-0 flex items-center gap-1">
            {t('segments.vip')}
          </Tag>
        </div>
      )}

      <div className="flex gap-4">
        {/* Avatar Section */}
        <div className="flex-shrink-0">
          <Avatar
            size={64}
            icon={clientTypeTag.icon}
            className={cn('text-lg', clientTypeTag.avatarBg)}
          >
            {initials}
          </Avatar>
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          {/* Name Row */}
          <div className="flex items-center gap-2 mb-1">
            <Text strong className="text-lg truncate">
              {customer.full_name}
            </Text>
          </div>

          {/* Phone Row */}
          {formattedPhone && (
            <div className="flex items-center gap-2 mb-2">
              <PhoneOutlined className="text-stone-400" />
              <a
                href={`tel:${customer.phone}`}
                onClick={handlePhoneClick}
                className="text-stone-600 hover:text-amber-600 transition-colors"
                dir="ltr"
              >
                {formattedPhone}
              </a>
            </div>
          )}

          {/* Tags Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Client Type Badge */}
            <Tag icon={clientTypeTag.icon} color={clientTypeTag.color} className="m-0">
              {t(`clientTypes.${customer.client_type || 'walk-in'}`)}
            </Tag>

            {/* Financial Status Indicator */}
            {customer.financial_status && (
              <Tag icon={financialStatusTag.icon} color={financialStatusTag.color} className="m-0">
                {t(`financialStatuses.${customer.financial_status}`)}
              </Tag>
            )}
          </div>
        </div>

        {/* Balance Section */}
        {showBalance && (
          <div className="flex-shrink-0 text-end">
            <Text type="secondary" className="text-xs block mb-1">
              {t('currentBalance')}
            </Text>
            <Text
              strong
              className={cn(
                'text-lg',
                balanceColor === 'red' && 'text-red-600',
                balanceColor === 'green' && 'text-emerald-600',
                balanceColor === 'gray' && 'text-stone-400'
              )}
            >
              {customer.current_balance === 0 ? (
                formattedBalance
              ) : customer.current_balance > 0 ? (
                <>+{formattedBalance}</>
              ) : (
                <>-{formattedBalance}</>
              )}
            </Text>
            {customer.current_balance !== 0 && (
              <Text type="secondary" className="text-xs block">
                {customer.current_balance > 0
                  ? t('creditAccount.balance') // Customer owes
                  : t('creditAccount.available')}
              </Text>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export default CustomerCard;
