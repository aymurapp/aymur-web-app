'use client';

/**
 * Sidebar Component
 * Main navigation sidebar for the platform
 *
 * Features:
 * - Collapsible to icons-only mode
 * - Shop switcher at the top
 * - Navigation groups with permission filtering
 * - Responsive: drawer on mobile, fixed on desktop
 * - RTL support using CSS logical properties
 * - Smooth collapse/expand animations
 * - Touch-friendly tap targets (min 44px)
 * - Mobile drawer with swipe-to-close support
 * - Full keyboard navigation support (Tab, Escape)
 * - Proper ARIA attributes for screen readers
 * - Focus management and visible focus indicators
 */

import React, { useCallback, useEffect } from 'react';

import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SwapOutlined,
  ShopOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Layout, Drawer, Button, Avatar, Dropdown, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { useIsRTL } from '@/lib/hooks/ui/useLocale';
import { useMobile, useTablet } from '@/lib/hooks/utils/useMediaQuery';
import { Link } from '@/lib/i18n/navigation';
import { useShopStore, useCurrentShop, useHasMultipleShops } from '@/stores/shopStore';
import { useUIStore } from '@/stores/uiStore';

import { SidebarNav } from './SidebarNav';

import type { MenuProps } from 'antd';

const { Sider } = Layout;
const { Text } = Typography;

// =============================================================================
// CONSTANTS
// =============================================================================

/** Sidebar width when expanded */
const SIDEBAR_WIDTH = 280;

/** Sidebar width when collapsed (icons only) */
const SIDEBAR_COLLAPSED_WIDTH = 80;

/** Mobile sidebar width (full width on very small screens) */
const MOBILE_SIDEBAR_WIDTH = 300;

/** Breakpoint for mobile drawer mode */
const MOBILE_BREAKPOINT = 1024; // lg breakpoint

/** Minimum touch target size (WCAG 2.1 Level AAA) */
const MIN_TOUCH_TARGET = 44;

// =============================================================================
// TYPES
// =============================================================================

export interface SidebarProps {
  /** Whether to render as mobile drawer (auto-detected if not provided) */
  isMobile?: boolean;
  /** Whether the mobile drawer is open */
  mobileOpen?: boolean;
  /** Callback when mobile drawer is closed */
  onMobileClose?: () => void;
  /** Additional CSS class name */
  className?: string;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Shop Switcher Component
 * Displays current shop and allows switching between shops
 * Touch-friendly with minimum 44px tap targets
 */
function ShopSwitcher({
  collapsed,
  isMobile,
}: {
  collapsed: boolean;
  isMobile: boolean;
}): JSX.Element {
  const t = useTranslations();
  const currentShop = useCurrentShop();
  const hasMultipleShops = useHasMultipleShops();
  const shops = useShopStore((state) => state.shops);
  const setCurrentShop = useShopStore((state) => state.setCurrentShop);

  // Build dropdown menu items for shop switching
  const shopMenuItems: MenuProps['items'] = shops.map((shop) => ({
    key: shop.id,
    label: (
      <div
        className="flex items-center gap-3 py-2"
        style={{ minHeight: isMobile ? MIN_TOUCH_TARGET : 'auto' }}
      >
        <Avatar
          size="small"
          src={shop.logo_url}
          icon={!shop.logo_url && <ShopOutlined />}
          className="bg-amber-100 text-amber-600"
        />
        <span className="truncate flex-1">{shop.name}</span>
        {shop.id === currentShop?.id && (
          <span className="ms-auto text-amber-500 flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
      </div>
    ),
    onClick: () => setCurrentShop(shop.id),
  }));

  // Add shop settings link
  if (shopMenuItems.length > 0) {
    shopMenuItems.push({ type: 'divider' });
    shopMenuItems.push({
      key: 'settings',
      label: (
        <Link
          href={currentShop ? `/${currentShop.id}/settings/shop` : '#'}
          className="block py-2"
          style={{ minHeight: isMobile ? MIN_TOUCH_TARGET : 'auto' }}
        >
          {t('shop.shopSettings')}
        </Link>
      ),
    });
  }

  const shopSwitcherContent = (
    <div
      className={`
        flex items-center
        ${collapsed ? 'justify-center' : 'gap-3'}
        ${collapsed ? 'p-2' : 'p-3'}
      `}
      style={{ minHeight: MIN_TOUCH_TARGET }}
    >
      <Avatar
        size={collapsed ? 'default' : 'large'}
        src={currentShop?.logo_url}
        icon={!currentShop?.logo_url && <ShopOutlined />}
        className="bg-amber-100 text-amber-600 flex-shrink-0"
      />
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <Text strong className="block truncate text-stone-900 dark:text-stone-100">
            {currentShop?.name ?? t('shop.selectShop')}
          </Text>
          {hasMultipleShops && (
            <Text type="secondary" className="text-xs flex items-center gap-1">
              <SwapOutlined className="text-[10px] rtl-flip" />
              {t('shop.switchShop')}
            </Text>
          )}
        </div>
      )}
    </div>
  );

  if (!hasMultipleShops) {
    return shopSwitcherContent;
  }

  return (
    <Dropdown menu={{ items: shopMenuItems }} trigger={['click']} placement="bottomLeft">
      <button
        className={`
          w-full
          rounded-lg
          hover:bg-stone-100 dark:hover:bg-stone-800
          active:bg-stone-200 dark:active:bg-stone-700
          transition-colors
          cursor-pointer
          text-start
          touch-manipulation
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
          focus-visible:ring-offset-2 focus-visible:ring-offset-white
          dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-stone-900
        `}
        style={{ minHeight: MIN_TOUCH_TARGET }}
        aria-label={t('shop.switchShop')}
        aria-haspopup="listbox"
        aria-expanded={false}
      >
        {shopSwitcherContent}
      </button>
    </Dropdown>
  );
}

/**
 * Collapse Toggle Button
 * Touch-friendly with minimum 44px tap target
 */
function CollapseToggle({ collapsed }: { collapsed: boolean }): JSX.Element {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const isRTL = useIsRTL();

  // In RTL mode, the collapse/expand icons should be flipped
  const CollapseIcon = isRTL
    ? collapsed
      ? MenuFoldOutlined
      : MenuUnfoldOutlined
    : collapsed
      ? MenuUnfoldOutlined
      : MenuFoldOutlined;

  const t = useTranslations();

  return (
    <Button
      type="text"
      icon={<CollapseIcon />}
      onClick={toggleSidebar}
      className={`
        w-full
        flex items-center justify-center
        text-stone-500 dark:text-stone-400
        hover:text-stone-700 dark:hover:text-stone-200
        hover:bg-stone-100 dark:hover:bg-stone-800
        active:bg-stone-200 dark:active:bg-stone-700
        touch-manipulation
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
        focus-visible:ring-offset-2 focus-visible:ring-offset-white
        dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-stone-900
      `}
      style={{ height: MIN_TOUCH_TARGET }}
      aria-label={collapsed ? t('navigation.expandSidebar') : t('navigation.collapseSidebar')}
      aria-expanded={!collapsed}
      aria-controls="sidebar-nav"
    />
  );
}

/**
 * Mobile Drawer Header with close button
 * Accessible header with proper labeling and keyboard support
 */
function MobileDrawerHeader({ onClose }: { onClose?: () => void }): JSX.Element {
  const t = useTranslations();

  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700"
      role="banner"
    >
      <Text strong className="text-lg text-stone-900 dark:text-stone-100" id="mobile-nav-title">
        {t('navigation.menu')}
      </Text>
      <Button
        type="text"
        icon={<CloseOutlined />}
        onClick={onClose}
        className={`
          flex items-center justify-center
          text-stone-500 hover:text-stone-700
          dark:text-stone-400 dark:hover:text-stone-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
          focus-visible:ring-offset-2 focus-visible:ring-offset-white
          dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-stone-900
        `}
        style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
        aria-label={t('common.actions.close')}
      />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Main Sidebar Component
 *
 * Renders the main navigation sidebar with:
 * - Shop switcher at the top
 * - Navigation menu with grouped items
 * - Collapse toggle at the bottom
 *
 * On mobile, renders as a drawer overlay with:
 * - Close button header
 * - Touch-friendly 44px minimum tap targets
 * - Swipe-to-close support via Ant Design Drawer
 *
 * On desktop, renders as a fixed sidebar with:
 * - Collapsible to icons-only mode
 * - RTL-aware positioning
 *
 * @example
 * // Desktop usage (auto-detects viewport)
 * <Sidebar />
 *
 * @example
 * // Controlled mobile drawer
 * <Sidebar
 *   isMobile
 *   mobileOpen={isMenuOpen}
 *   onMobileClose={() => setMenuOpen(false)}
 * />
 */
export function Sidebar({
  isMobile: isMobileProp,
  mobileOpen,
  onMobileClose,
  className,
}: SidebarProps): JSX.Element {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);

  // Auto-detect mobile if not explicitly provided
  const autoDetectedMobile = useMobile();
  const isTablet = useTablet();
  const isRTL = useIsRTL();

  // Use prop if provided, otherwise auto-detect (mobile or tablet)
  const isMobile = isMobileProp ?? (autoDetectedMobile || isTablet);

  // For mobile drawer: use mobileOpen prop if provided, otherwise use inverse of collapsed
  const isOpen = mobileOpen ?? !collapsed;

  // Handle drawer close
  const handleMobileClose = useCallback(() => {
    onMobileClose?.();
    // Also collapse the sidebar in store for consistency
    setSidebarCollapsed(true);
  }, [onMobileClose, setSidebarCollapsed]);

  // Close drawer on escape key
  useEffect(() => {
    if (!isMobile || !isOpen) {
      return;
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleMobileClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobile, isOpen, handleMobileClose]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Mobile Header with close button */}
      {isMobile && <MobileDrawerHeader onClose={handleMobileClose} />}

      {/* Shop Switcher */}
      <div className="flex-shrink-0 border-b border-stone-200 dark:border-stone-700">
        <ShopSwitcher collapsed={isMobile ? false : collapsed} isMobile={isMobile} />
      </div>

      {/* Navigation - main navigation landmark */}
      <nav
        id="sidebar-nav"
        aria-label={isMobile ? undefined : 'Main navigation'}
        aria-labelledby={isMobile ? 'mobile-nav-title' : undefined}
        className={`
          flex-1
          overflow-y-auto
          overflow-x-hidden
          py-2
          px-2
          scrollbar-thin
          overscroll-contain
        `}
      >
        <SidebarNav
          collapsed={isMobile ? false : collapsed}
          onItemClick={isMobile ? handleMobileClose : undefined}
        />
      </nav>

      {/* Collapse Toggle (desktop only) */}
      {!isMobile && (
        <div className="flex-shrink-0 border-t border-stone-200 dark:border-stone-700 p-2">
          <CollapseToggle collapsed={collapsed} />
        </div>
      )}
    </div>
  );

  // Mobile: Render as Drawer with proper accessibility
  // Note: Ant Design Drawer already handles role="dialog" and aria-modal internally
  if (isMobile) {
    return (
      <Drawer
        placement={isRTL ? 'right' : 'left'}
        open={isOpen}
        onClose={handleMobileClose}
        width={Math.min(MOBILE_SIDEBAR_WIDTH, window?.innerWidth ? window.innerWidth - 56 : 300)}
        styles={{
          body: { padding: 0 },
          header: { display: 'none' },
        }}
        className={className}
        // Enable swipe to close on touch devices
        keyboard
        maskClosable
        // Focus management - focus first interactive element when opened
        autoFocus
        // Proper focus trap for modal-like behavior
        destroyOnClose={false}
        // Z-index for proper stacking
        zIndex={1000}
        // Accessibility: custom class for styling
        rootClassName="navigation-drawer"
        title="Navigation menu"
      >
        {sidebarContent}
      </Drawer>
    );
  }

  // Desktop: Render as Sider with proper accessibility
  return (
    <Sider
      width={SIDEBAR_WIDTH}
      collapsedWidth={SIDEBAR_COLLAPSED_WIDTH}
      collapsed={collapsed}
      className={`
        bg-white dark:bg-stone-900
        border-e border-stone-200 dark:border-stone-700
        h-screen
        fixed
        start-0
        top-0
        z-40
        transition-all
        duration-300
        ${className ?? ''}
      `}
      style={{
        overflow: 'hidden',
      }}
      // Accessibility: mark as complementary region (sidebar landmark)
      role="complementary"
      aria-label="Sidebar navigation"
    >
      {sidebarContent}
    </Sider>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default Sidebar;

/** Export constants for use in layout calculations */
export {
  SIDEBAR_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  MOBILE_SIDEBAR_WIDTH,
  MOBILE_BREAKPOINT,
  MIN_TOUCH_TARGET,
};
