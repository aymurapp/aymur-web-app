'use client';

/**
 * Header Component
 * Top navigation bar for the platform
 *
 * Features:
 * - Global search input (hidden on mobile, shows in modal)
 * - Notification bell with unread count badge
 * - User avatar dropdown (profile, settings, logout)
 * - Theme toggle (sun/moon icon)
 * - Locale switcher dropdown
 * - Mobile menu toggle with 44px touch targets
 * - RTL support using CSS logical properties
 * - Responsive layout for all screen sizes
 * - Full keyboard navigation support
 * - Proper ARIA attributes for screen readers
 * - Focus-visible indicators for accessibility
 */

import React, { useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  SearchOutlined,
  BellOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  GlobalOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { Layout, Input, Badge, Avatar, Dropdown, Button, Divider, Typography, Modal } from 'antd';
import { useTranslations } from 'next-intl';

import { useUser } from '@/lib/hooks/auth';
import { useMobile } from '@/lib/hooks/utils/useMediaQuery';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { locales, localeNames, type Locale } from '@/lib/i18n/routing';
import { createClient } from '@/lib/supabase/client';
import { useUnreadCount } from '@/stores/notificationStore';
import { useShopStore } from '@/stores/shopStore';
import { useUIStore, useResolvedTheme } from '@/stores/uiStore';

import type { MenuProps } from 'antd';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

// =============================================================================
// CONSTANTS
// =============================================================================

/** Header height - standard on desktop, slightly smaller on mobile */
const HEADER_HEIGHT = 64;
const HEADER_HEIGHT_MOBILE = 56;

/** Minimum touch target size (WCAG 2.1 Level AAA) */
const MIN_TOUCH_TARGET = 44;

// =============================================================================
// TYPES
// =============================================================================

export interface HeaderProps {
  /** Callback to toggle mobile sidebar */
  onMobileMenuToggle?: () => void;
  /** Whether mobile menu button should be visible (auto-detected if not provided) */
  showMobileMenu?: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Whether sidebar is currently collapsed (for padding adjustment) */
  sidebarCollapsed?: boolean;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Search Input Component - Desktop version
 * Accessible search input with proper labeling
 */
function SearchInputDesktop(): JSX.Element {
  const t = useTranslations();

  return (
    <div role="search" className="hidden md:block">
      <Input
        placeholder={t('common.actions.search')}
        prefix={<SearchOutlined className="text-stone-400" aria-hidden="true" />}
        className="w-64 max-w-xs focus-visible:ring-2 focus-visible:ring-amber-500"
        size="middle"
        aria-label={t('common.actions.search')}
      />
    </div>
  );
}

/**
 * Mobile Search Button - Opens search modal
 * Accessible button with proper ARIA attributes
 */
function MobileSearchButton({ onClick }: { onClick: () => void }): JSX.Element {
  const t = useTranslations();

  return (
    <Button
      type="text"
      icon={<SearchOutlined className="text-lg" aria-hidden="true" />}
      onClick={onClick}
      className={`
        md:hidden flex items-center justify-center
        text-stone-600 dark:text-stone-300 touch-manipulation
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
        focus-visible:ring-offset-2 focus-visible:ring-offset-white
        dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-stone-900
      `}
      style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
      aria-label={t('common.actions.search')}
      aria-haspopup="dialog"
    />
  );
}

/**
 * Mobile Search Modal
 * Accessible modal with proper ARIA attributes and keyboard support
 */
function MobileSearchModal({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element {
  const t = useTranslations();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={t('common.actions.search')}
      closable
      centered
      width="90%"
      keyboard
      styles={{
        body: { padding: '16px' },
        content: { borderRadius: '12px' },
        header: { display: 'none' },
      }}
      aria-label={t('common.actions.search')}
    >
      <div role="search">
        <Input
          placeholder={t('common.actions.search')}
          prefix={<SearchOutlined className="text-stone-400" aria-hidden="true" />}
          size="large"
          autoFocus
          allowClear
          onPressEnter={onClose}
          style={{ minHeight: MIN_TOUCH_TARGET }}
          aria-label={t('common.actions.search')}
        />
      </div>
    </Modal>
  );
}

/**
 * Notification Bell Component
 * Touch-friendly with minimum 44px tap target and accessible notifications
 */
function NotificationBell({ isMobile }: { isMobile: boolean }): JSX.Element {
  const unreadCount = useUnreadCount();
  const currentShopId = useShopStore((state) => state.currentShopId);
  const t = useTranslations();

  const notificationItems: MenuProps['items'] = [
    {
      key: 'header',
      type: 'group',
      label: (
        <div className="flex items-center justify-between px-2 py-2">
          <Text strong>{t('navigation.notifications')}</Text>
          {unreadCount > 0 && (
            <Button
              type="link"
              size="small"
              style={{ minHeight: isMobile ? MIN_TOUCH_TARGET : 'auto' }}
            >
              {t('common.actions.clear')}
            </Button>
          )}
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'empty',
      label: <div className="py-8 text-center text-stone-500">{t('common.messages.noData')}</div>,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'view-all',
      label: (
        <Link
          href={currentShopId ? `/${currentShopId}/notifications` : '#'}
          className="block text-center py-2"
          style={{ minHeight: isMobile ? MIN_TOUCH_TARGET : 'auto' }}
        >
          {t('common.actions.viewAll')}
        </Link>
      ),
    },
  ];

  // Build accessible label with unread count
  const accessibleLabel =
    unreadCount > 0
      ? `${t('navigation.notifications')} (${unreadCount} unread)`
      : t('navigation.notifications');

  return (
    <Dropdown menu={{ items: notificationItems }} trigger={['click']} placement="bottomRight">
      <Button
        type="text"
        className={`
          flex items-center justify-center touch-manipulation
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
          focus-visible:ring-offset-2 focus-visible:ring-offset-white
          dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-stone-900
        `}
        style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
        aria-label={accessibleLabel}
        aria-haspopup="menu"
        icon={
          <Badge count={unreadCount} size="small" offset={[2, -2]}>
            <BellOutlined
              className="text-lg text-stone-600 dark:text-stone-300"
              aria-hidden="true"
            />
          </Badge>
        }
      />
    </Dropdown>
  );
}

/**
 * Theme Toggle Component
 * Touch-friendly with minimum 44px tap target and accessible toggle
 */
function ThemeToggle(): JSX.Element {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const resolvedTheme = useResolvedTheme();

  const isDark = resolvedTheme === 'dark';

  const handleToggle = () => {
    // Cycle through: light -> dark -> system
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  // Determine next theme for aria-label
  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const themeLabel = `Switch to ${nextTheme} theme`;

  return (
    <Button
      type="text"
      onClick={handleToggle}
      icon={
        isDark ? (
          <SunOutlined className="text-lg" aria-hidden="true" />
        ) : (
          <MoonOutlined className="text-lg" aria-hidden="true" />
        )
      }
      className={`
        flex items-center justify-center text-stone-600 dark:text-stone-300 touch-manipulation
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
        focus-visible:ring-offset-2 focus-visible:ring-offset-white
        dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-stone-900
      `}
      style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
      aria-label={themeLabel}
      aria-pressed={isDark}
    />
  );
}

/**
 * Locale Switcher Component
 * Accessible language selector with proper ARIA attributes
 */
function LocaleSwitcher(): JSX.Element {
  const t = useTranslations();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: Locale) => {
    // Navigate to the same path with the new locale
    // next-intl Link component handles locale changes, use window.location for now
    window.location.href = `/${newLocale}${pathname}`;
  };

  const localeItems: MenuProps['items'] = locales.map((locale) => ({
    key: locale,
    label: (
      <span className="flex items-center gap-2">
        <span className="text-xs uppercase font-medium w-5">{locale}</span>
        <span>{localeNames[locale]}</span>
      </span>
    ),
    onClick: () => handleLocaleChange(locale),
  }));

  return (
    <Dropdown menu={{ items: localeItems }} trigger={['click']} placement="bottomRight">
      <Button
        type="text"
        icon={<GlobalOutlined className="text-lg" aria-hidden="true" />}
        className={`
          flex items-center justify-center text-stone-600 dark:text-stone-300
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
          focus-visible:ring-offset-2 focus-visible:ring-offset-white
          dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-stone-900
        `}
        style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
        aria-label={t('common.language')}
        aria-haspopup="listbox"
      />
    </Dropdown>
  );
}

/**
 * User Menu Component
 * Accessible user menu with proper ARIA attributes
 */
function UserMenu(): JSX.Element {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useUser();
  const currentShopId = useShopStore((state) => state.currentShopId);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      type: 'group',
      label: (
        <div className="px-2 py-2">
          <Text strong className="block truncate">
            {user?.full_name ?? 'User'}
          </Text>
          <Text type="secondary" className="text-xs truncate block">
            {user?.email ?? ''}
          </Text>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: (
        <Link href={currentShopId ? `/${currentShopId}/settings/profile` : '#'}>
          {t('navigation.profile')}
        </Link>
      ),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: (
        <Link href={currentShopId ? `/${currentShopId}/settings` : '#'}>
          {t('navigation.settings')}
        </Link>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('navigation.logout'),
      onClick: handleLogout,
      danger: true,
    },
  ];

  const userName = user?.full_name ?? 'User';

  return (
    <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
      <button
        className={`
          flex items-center gap-2 cursor-pointer
          hover:bg-stone-100 dark:hover:bg-stone-800
          rounded-lg px-2 py-1 transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
          focus-visible:ring-offset-2 focus-visible:ring-offset-white
          dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-stone-900
        `}
        style={{ minHeight: MIN_TOUCH_TARGET }}
        aria-label={`User menu for ${userName}`}
        aria-haspopup="menu"
      >
        <Avatar
          size="small"
          icon={<UserOutlined />}
          className="bg-amber-100 text-amber-600"
          aria-hidden="true"
        />
        <span className="hidden md:block text-sm text-stone-700 dark:text-stone-300 font-medium max-w-24 truncate">
          {userName}
        </span>
      </button>
    </Dropdown>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Main Header Component
 *
 * Renders the top navigation bar with:
 * - Mobile menu toggle (on small screens)
 * - Global search input
 * - Notification bell with badge
 * - Theme toggle
 * - Locale switcher
 * - User menu dropdown
 *
 * Accessibility features:
 * - Proper ARIA landmarks (banner role)
 * - Focus-visible indicators for all interactive elements
 * - Keyboard navigable with logical tab order
 *
 * @example
 * <Header
 *   onMobileMenuToggle={handleToggle}
 *   showMobileMenu={true}
 * />
 */
export function Header({
  onMobileMenuToggle,
  showMobileMenu: showMobileMenuProp,
  className,
}: HeaderProps): JSX.Element {
  const t = useTranslations();
  const isMobile = useMobile();
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Auto-detect if mobile menu should be shown
  const showMobileMenu = showMobileMenuProp ?? isMobile;

  // Responsive header height
  const headerHeight = isMobile ? HEADER_HEIGHT_MOBILE : HEADER_HEIGHT;

  return (
    <>
      <AntHeader
        className={`
          bg-white dark:bg-stone-900
          border-b border-stone-200 dark:border-stone-700
          px-3 sm:px-4 md:px-6
          flex items-center justify-between
          sticky top-0 z-30
          w-full
          max-w-full
          overflow-x-hidden
          ${className ?? ''}
        `}
        style={{
          height: headerHeight,
          lineHeight: `${headerHeight}px`,
          minHeight: headerHeight,
        }}
        // Accessibility: header element serves as banner landmark
        role="banner"
        aria-label="Site header"
      >
        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Mobile Menu Toggle */}
          {showMobileMenu && (
            <Button
              type="text"
              icon={<MenuOutlined className="text-lg" aria-hidden="true" />}
              onClick={onMobileMenuToggle}
              className={`
                lg:hidden flex items-center justify-center
                text-stone-600 dark:text-stone-300 touch-manipulation
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                focus-visible:ring-offset-2 focus-visible:ring-offset-white
                dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-stone-900
              `}
              style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
              aria-label={t('navigation.openMenu')}
              aria-expanded={false}
              aria-controls="sidebar-nav"
            />
          )}

          {/* Desktop Search */}
          <SearchInputDesktop />

          {/* Mobile Search Button */}
          <MobileSearchButton onClick={() => setSearchModalOpen(true)} />
        </div>

        {/* Right Section - grouped as toolbar for screen readers */}
        <div
          className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0"
          role="toolbar"
          aria-label="Quick actions"
        >
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Locale Switcher */}
          <LocaleSwitcher />

          {/* Notifications */}
          <NotificationBell isMobile={isMobile} />

          {/* Divider - decorative, hidden from screen readers */}
          <Divider
            type="vertical"
            className="h-6 mx-1 sm:mx-2 hidden sm:block"
            aria-hidden="true"
          />

          {/* User Menu */}
          <UserMenu />
        </div>
      </AntHeader>

      {/* Mobile Search Modal */}
      <MobileSearchModal open={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default Header;

/** Export constants for layout calculations */
export { HEADER_HEIGHT, HEADER_HEIGHT_MOBILE, MIN_TOUCH_TARGET };
