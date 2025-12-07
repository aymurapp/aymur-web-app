'use client';

/**
 * ShopSwitcher Component
 * Dropdown for switching between shops in multi-tenant context
 *
 * Features:
 * - Display current shop name and logo
 * - Dropdown list of accessible shops
 * - Visual indicator for current selection
 * - Link to shop settings
 * - RTL support
 */

import React, { useCallback } from 'react';

import { CheckOutlined, ShopOutlined, SwapOutlined } from '@ant-design/icons';
import { Avatar, Dropdown, Typography } from 'antd';
import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/lib/i18n/navigation';
import {
  useCurrentShop,
  useHasMultipleShops,
  useShopStore,
  type ShopInfo,
} from '@/stores/shopStore';

import type { MenuProps } from 'antd';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface ShopSwitcherProps {
  /** Whether to show in compact mode (collapsed sidebar) */
  compact?: boolean;
  /** Callback when shop is changed */
  onShopChange?: (shopId: string) => void;
  /** Additional CSS class name */
  className?: string;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook for shop switching logic
 */
export function useShopSwitcher(): {
  currentShop: ShopInfo | null;
  shops: ShopInfo[];
  hasMultipleShops: boolean;
  switchShop: (shopId: string) => void;
} {
  const locale = useLocale();
  const currentShop = useCurrentShop();
  const hasMultipleShops = useHasMultipleShops();
  const shops = useShopStore((state) => state.shops);
  const setCurrentShop = useShopStore((state) => state.setCurrentShop);

  const switchShop = useCallback(
    (shopId: string): void => {
      setCurrentShop(shopId);
      // Navigate to the new shop's dashboard using window.location
      // to avoid typed route issues with dynamic shop IDs
      window.location.href = `/${locale}/${shopId}/dashboard`;
    },
    [setCurrentShop, locale]
  );

  return {
    currentShop,
    shops,
    hasMultipleShops,
    switchShop,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Shop Switcher Component
 *
 * Displays the current shop and provides a dropdown to switch between shops.
 * Shows shop logo/avatar and name, with a badge if multiple shops are available.
 *
 * @example
 * // Basic usage
 * <ShopSwitcher />
 *
 * @example
 * // Compact mode (for collapsed sidebar)
 * <ShopSwitcher compact />
 *
 * @example
 * // With change callback
 * <ShopSwitcher onShopChange={(shopId) => console.log('Switched to:', shopId)} />
 */
export function ShopSwitcher({
  compact = false,
  onShopChange,
  className,
}: ShopSwitcherProps): JSX.Element {
  const t = useTranslations();
  const { currentShop, shops, hasMultipleShops, switchShop } = useShopSwitcher();

  const handleShopSelect = (shopId: string): void => {
    switchShop(shopId);
    onShopChange?.(shopId);
  };

  // Build dropdown menu items for shop switching
  const shopMenuItems: MenuProps['items'] = [
    {
      key: 'header',
      type: 'group',
      label: (
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          {t('shop.switchShop')}
        </span>
      ),
    },
    { type: 'divider' },
    ...shops.map((shop) => ({
      key: shop.id,
      label: (
        <div className="flex items-center gap-2 py-1">
          <Avatar
            size="small"
            src={shop.logo_url}
            icon={!shop.logo_url && <ShopOutlined />}
            className="bg-amber-100 text-amber-600"
          />
          <span className="truncate flex-1">{shop.name}</span>
          {shop.id === currentShop?.id && <CheckOutlined className="text-amber-500" />}
        </div>
      ),
      onClick: () => handleShopSelect(shop.id),
    })),
    { type: 'divider' },
    {
      key: 'settings',
      label: (
        <Link
          href={currentShop ? `/${currentShop.id}/settings/shop` : '#'}
          className="text-stone-600"
        >
          {t('shop.shopSettings')}
        </Link>
      ),
    },
  ];

  // Content to display
  const switcherContent = (
    <div
      className={`flex items-center ${compact ? 'justify-center' : 'gap-3'} ${compact ? 'p-2' : 'p-3'}`}
    >
      <Avatar
        size={compact ? 'default' : 'large'}
        src={currentShop?.logo_url}
        icon={!currentShop?.logo_url && <ShopOutlined />}
        className="bg-amber-100 text-amber-600 flex-shrink-0"
      />
      {!compact && (
        <div className="flex-1 min-w-0">
          <Text strong className="block truncate text-stone-900 dark:text-stone-100">
            {currentShop?.name ?? t('shop.selectShop')}
          </Text>
          {hasMultipleShops && (
            <Text type="secondary" className="text-xs flex items-center gap-1">
              <SwapOutlined className="text-[10px]" />
              {t('shop.switchShop')}
            </Text>
          )}
        </div>
      )}
    </div>
  );

  // If no multiple shops, just display current shop without dropdown
  if (!hasMultipleShops) {
    return <div className={className}>{switcherContent}</div>;
  }

  // Render with dropdown
  return (
    <Dropdown
      menu={{ items: shopMenuItems }}
      trigger={['click']}
      placement="bottomLeft"
      className={className}
    >
      <button
        className={`
          w-full
          rounded-lg
          hover:bg-stone-100 dark:hover:bg-stone-800
          transition-colors
          cursor-pointer
          text-start
        `}
        type="button"
      >
        {switcherContent}
      </button>
    </Dropdown>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ShopSwitcher;
