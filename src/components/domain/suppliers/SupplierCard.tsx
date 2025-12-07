'use client';

/**
 * SupplierCard Component
 *
 * Displays supplier information in a card format with:
 * - Company name and contact person prominently displayed
 * - Balance indicator with color coding (positive = we owe them, negative = credit)
 * - Category badge
 * - Phone/email quick actions
 * - Click to open detail modal or navigate
 *
 * @example
 * ```tsx
 * <SupplierCard
 *   supplier={supplier}
 *   onClick={(s) => router.push(`/suppliers/${s.id_supplier}`)}
 *   showBalance
 * />
 *
 * // Compact mode for dropdowns/selects
 * <SupplierCard
 *   supplier={supplier}
 *   compact
 *   onClick={handleSelect}
 * />
 * ```
 *
 * @module components/domain/suppliers/SupplierCard
 */

import React, { useMemo } from 'react';

import {
  PhoneOutlined,
  MailOutlined,
  ShopOutlined,
  TagOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { Avatar, Tag, Typography, Space } from 'antd';
import { useTranslations } from 'next-intl';

import { Card } from '@/components/ui/Card';
import type { Supplier, SupplierCategory } from '@/lib/hooks/data/useSuppliers';
import { useShop } from '@/lib/hooks/shop';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatPhone } from '@/lib/utils/format';

const { Text } = Typography;

/**
 * Extended Supplier type with optional category
 */
export interface SupplierWithCategory extends Supplier {
  supplier_categories?: SupplierCategory | null;
}

/**
 * Props for the SupplierCard component
 */
export interface SupplierCardProps {
  /** Supplier data from useSuppliers hook */
  supplier: SupplierWithCategory;
  /** Click handler - opens detail modal or navigates to detail page */
  onClick?: (supplier: SupplierWithCategory) => void;
  /** Whether this card is currently selected */
  selected?: boolean;
  /** Whether to show balance information */
  showBalance?: boolean;
  /** Compact mode for use in dropdowns/selects */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Extracts initials from company name for avatar fallback
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return (words[0]?.substring(0, 2) ?? '').toUpperCase();
  }
  const firstChar = words[0]?.[0] ?? '';
  const lastChar = words[words.length - 1]?.[0] ?? '';
  return (firstChar + lastChar).toUpperCase();
}

/**
 * Determines balance color based on value
 * For suppliers:
 * - Positive = we owe them (red - payable)
 * - Negative = credit/overpayment (green)
 * - Zero = neutral (gray)
 */
function getBalanceColor(balance: number): 'green' | 'red' | 'gray' {
  if (balance > 0) {
    return 'red';
  } // We owe supplier (payable)
  if (balance < 0) {
    return 'green';
  } // Overpayment/credit
  return 'gray';
}

/**
 * SupplierCard Component
 *
 * A card component displaying supplier information with visual indicators
 * for balance, category, and status.
 */
export function SupplierCard({
  supplier,
  onClick,
  selected = false,
  showBalance = true,
  compact = false,
  className,
}: SupplierCardProps): React.JSX.Element {
  const t = useTranslations('suppliers');
  const tCommon = useTranslations('common');
  const { shop } = useShop();

  // Memoize derived values
  const initials = useMemo(() => getInitials(supplier.company_name), [supplier.company_name]);
  const balanceColor = useMemo(
    () => getBalanceColor(supplier.current_balance),
    [supplier.current_balance]
  );

  // Format balance with shop currency
  const formattedBalance = useMemo(() => {
    const currency = shop?.currency || 'USD';
    return formatCurrency(Math.abs(supplier.current_balance), currency);
  }, [supplier.current_balance, shop?.currency]);

  // Format phone number
  const formattedPhone = useMemo(
    () => (supplier.phone ? formatPhone(supplier.phone) : null),
    [supplier.phone]
  );

  // Handle card click
  const handleClick = () => {
    if (onClick) {
      onClick(supplier);
    }
  };

  // Handle phone click (click-to-call)
  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Handle email click
  const handleEmailClick = (e: React.MouseEvent) => {
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
        <Avatar size="small" icon={<ShopOutlined />} className="flex-shrink-0 bg-blue-500">
          {initials}
        </Avatar>

        {/* Name and Contact */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Text strong className="truncate text-sm">
              {supplier.company_name}
            </Text>
            {supplier.status === 'active' ? (
              <CheckCircleOutlined className="text-emerald-500 text-xs" />
            ) : (
              <CloseCircleOutlined className="text-stone-400 text-xs" />
            )}
          </div>
          {supplier.contact_person && (
            <Text type="secondary" className="text-xs truncate block">
              {supplier.contact_person}
            </Text>
          )}
        </div>

        {/* Balance (compact) */}
        {showBalance && supplier.current_balance !== 0 && (
          <Text
            className={cn(
              'text-xs font-medium flex-shrink-0',
              balanceColor === 'red' && 'text-red-600',
              balanceColor === 'green' && 'text-emerald-600'
            )}
          >
            {supplier.current_balance > 0 ? '' : '-'}
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
      className={cn(
        'relative',
        selected && 'ring-2 ring-amber-400 border-amber-300',
        supplier.status !== 'active' && 'opacity-75',
        className
      )}
    >
      {/* Status Badge - positioned at top right */}
      <div className="absolute top-3 end-3">
        {supplier.status === 'active' ? (
          <Tag color="success" className="m-0 flex items-center gap-1">
            <CheckCircleOutlined />
            {tCommon('status.active')}
          </Tag>
        ) : (
          <Tag color="default" className="m-0 flex items-center gap-1">
            <CloseCircleOutlined />
            {tCommon('status.inactive')}
          </Tag>
        )}
      </div>

      <div className="flex gap-4">
        {/* Avatar Section */}
        <div className="flex-shrink-0">
          <Avatar size={64} icon={<ShopOutlined />} className="text-lg bg-blue-500">
            {initials}
          </Avatar>
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          {/* Company Name Row */}
          <div className="flex items-center gap-2 mb-1">
            <Text strong className="text-lg truncate">
              {supplier.company_name}
            </Text>
          </div>

          {/* Contact Name */}
          {supplier.contact_person && (
            <Text type="secondary" className="block mb-2 truncate">
              {supplier.contact_person}
            </Text>
          )}

          {/* Contact Info Row */}
          <Space size="middle" className="mb-2">
            {formattedPhone && (
              <a
                href={`tel:${supplier.phone}`}
                onClick={handlePhoneClick}
                className="text-stone-600 hover:text-amber-600 transition-colors flex items-center gap-1"
                dir="ltr"
              >
                <PhoneOutlined className="text-stone-400" />
                <span className="text-sm">{formattedPhone}</span>
              </a>
            )}
            {supplier.email && (
              <a
                href={`mailto:${supplier.email}`}
                onClick={handleEmailClick}
                className="text-stone-600 hover:text-amber-600 transition-colors flex items-center gap-1 truncate max-w-[180px]"
              >
                <MailOutlined className="text-stone-400" />
                <span className="text-sm truncate">{supplier.email}</span>
              </a>
            )}
          </Space>

          {/* Category Badge */}
          {supplier.supplier_categories && (
            <Tag icon={<TagOutlined />} color="processing" className="m-0">
              {supplier.supplier_categories.category_name}
            </Tag>
          )}
        </div>

        {/* Balance Section */}
        {showBalance && (
          <div className="flex-shrink-0 text-end">
            <Text type="secondary" className="text-xs block mb-1">
              {t('balance')}
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
              {supplier.current_balance === 0 ? (
                formattedBalance
              ) : supplier.current_balance > 0 ? (
                <>{formattedBalance}</>
              ) : (
                <>-{formattedBalance}</>
              )}
            </Text>
            {supplier.current_balance !== 0 && (
              <Text type="secondary" className="text-xs block">
                {supplier.current_balance > 0
                  ? t('payables') // We owe them
                  : t('credit')}{' '}
                {/* They owe us / overpayment */}
              </Text>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export default SupplierCard;
