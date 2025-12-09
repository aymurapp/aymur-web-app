'use client';

/**
 * QuickActionsWidget Component
 *
 * Dashboard widget providing quick action buttons for common tasks.
 * Uses permission checks to show/hide actions based on user role.
 *
 * Features:
 * - New Sale, Add Inventory, Add Customer, Record Expense buttons
 * - Permission-aware: buttons only show if user has permission
 * - Compact grid layout with icons
 * - Gold/amber luxury theme styling
 * - RTL-compatible with logical CSS properties
 *
 * @module components/domain/dashboard/QuickActionsWidget
 */

import React from 'react';

import {
  ShoppingCartOutlined,
  PlusCircleOutlined,
  UserAddOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Card, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Quick action configuration
 */
interface QuickAction {
  /** Unique key for the action */
  key: string;
  /** Translation key for the label */
  labelKey: string;
  /** Icon component */
  icon: React.ReactNode;
  /** Navigation href */
  href: string;
  /** Required permission to show this action */
  permission: string;
  /** Color theme for the action */
  color: 'amber' | 'emerald' | 'blue' | 'rose';
}

/**
 * QuickActionsWidget props
 */
export interface QuickActionsWidgetProps {
  /** Additional class name */
  className?: string;
  /** Whether the widget is loading */
  loading?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Quick actions configuration
 */
const QUICK_ACTIONS: QuickAction[] = [
  {
    key: 'newSale',
    labelKey: 'newSale',
    icon: <ShoppingCartOutlined />,
    href: '/sales/pos',
    permission: 'sales.create',
    color: 'amber',
  },
  {
    key: 'addInventory',
    labelKey: 'addInventory',
    icon: <PlusCircleOutlined />,
    href: '/inventory?action=add',
    permission: 'inventory.manage',
    color: 'emerald',
  },
  {
    key: 'addCustomer',
    labelKey: 'addCustomer',
    icon: <UserAddOutlined />,
    href: '/customers?action=add',
    permission: 'customers.manage',
    color: 'blue',
  },
  {
    key: 'recordExpense',
    labelKey: 'recordExpense',
    icon: <WalletOutlined />,
    href: '/expenses?action=add',
    permission: 'expenses.create',
    color: 'rose',
  },
];

/**
 * Color classes for each action color theme
 */
const COLOR_CLASSES = {
  amber: {
    bg: 'bg-amber-50 hover:bg-amber-100',
    icon: 'text-amber-600',
    border: 'border-amber-200 hover:border-amber-300',
  },
  emerald: {
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    icon: 'text-emerald-600',
    border: 'border-emerald-200 hover:border-emerald-300',
  },
  blue: {
    bg: 'bg-blue-50 hover:bg-blue-100',
    icon: 'text-blue-600',
    border: 'border-blue-200 hover:border-blue-300',
  },
  rose: {
    bg: 'bg-rose-50 hover:bg-rose-100',
    icon: 'text-rose-600',
    border: 'border-rose-200 hover:border-rose-300',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * QuickActionsWidget Component
 *
 * Displays a grid of quick action buttons for common tasks.
 * Respects user permissions to show only accessible actions.
 */
export function QuickActionsWidget({
  className,
  loading = false,
}: QuickActionsWidgetProps): React.JSX.Element {
  const t = useTranslations('dashboard');
  const { can, isLoading: permissionsLoading } = usePermissions();
  const { shopId } = useShop();

  const isLoading = loading || permissionsLoading;

  // Filter actions based on permissions
  const visibleActions = QUICK_ACTIONS.filter((action) => can(action.permission));

  /**
   * Build the full href with shopId prefix
   */
  const buildHref = (path: string): string => {
    if (!shopId) {
      return path;
    }
    return `/${shopId}${path}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <Card
        className={cn('border border-stone-200 bg-white', className)}
        styles={{
          body: {
            padding: '20px',
          },
        }}
      >
        <Skeleton active paragraph={false} title={{ width: '40%' }} className="mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton.Button key={i} active block style={{ height: 72, borderRadius: 8 }} />
          ))}
        </div>
      </Card>
    );
  }

  // Empty state - no actions available
  if (visibleActions.length === 0) {
    return (
      <Card
        className={cn('border border-stone-200 bg-white', className)}
        styles={{
          body: {
            padding: '20px',
          },
        }}
      >
        <h3 className="text-base font-semibold text-stone-900 mb-4">{t('quickActions.title')}</h3>
        <p className="text-sm text-stone-500 text-center py-4">
          {t('quickActions.noActionsAvailable')}
        </p>
      </Card>
    );
  }

  return (
    <Card
      className={cn('border border-stone-200 bg-white', className)}
      styles={{
        body: {
          padding: '20px',
        },
      }}
    >
      {/* Header */}
      <h3 className="text-base font-semibold text-stone-900 mb-4">{t('quickActions.title')}</h3>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        {visibleActions.map((action) => {
          const colors = COLOR_CLASSES[action.color];

          return (
            <Link key={action.key} href={buildHref(action.href)} className="block">
              <Button
                type="text"
                className={cn(
                  'w-full h-auto py-4 px-3 flex flex-col items-center justify-center gap-2',
                  'rounded-lg border transition-all duration-200',
                  colors.bg,
                  colors.border,
                  // Remove default button hover styles
                  '!hover:border-current !hover:text-current'
                )}
              >
                <span className={cn('text-2xl', colors.icon)}>{action.icon}</span>
                <span className="text-sm font-medium text-stone-700">
                  {t(`quickActions.${action.labelKey}`)}
                </span>
              </Button>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

export default QuickActionsWidget;
