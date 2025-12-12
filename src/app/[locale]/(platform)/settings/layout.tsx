'use client';

/**
 * User Settings Layout
 *
 * Enterprise-grade user settings layout with branded header and sidebar navigation.
 * Provides a consistent, professional experience for managing user account settings.
 *
 * Features:
 * - AYMUR branding with dark header
 * - Left sidebar navigation with icons
 * - Responsive design (drawer on mobile)
 * - Dark mode toggle
 * - RTL support
 * - Setup indicators for items needing attention
 *
 * @module app/(platform)/[locale]/settings/layout
 */

import React, { useState } from 'react';

import { usePathname } from 'next/navigation';

import {
  ArrowLeftOutlined,
  UserOutlined,
  CreditCardOutlined,
  LockOutlined,
  DesktopOutlined,
  BellOutlined,
  MenuOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { Menu, Avatar, Drawer, Button, Switch, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { useUser } from '@/lib/hooks/auth/useUser';
import { useTheme } from '@/lib/hooks/ui/useTheme';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

import type { MenuProps } from 'antd';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Brand colors derived from AYMUR logo
 */
const BRAND_COLORS = {
  gold: '#C9A227',
  goldLight: '#E5C76B',
  goldDark: '#A68B1F',
  stone: '#1C1917',
  stoneMuted: '#57534E',
};

/**
 * Navigation items configuration
 */
interface NavItem {
  key: string;
  icon: React.ReactNode;
  labelKey: string;
  path: string;
  /** Function to determine if a setup indicator dot should show */
  showIndicator?: (user: ReturnType<typeof useUser>['user']) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'profile',
    icon: <UserOutlined />,
    labelKey: 'profile',
    path: '/settings/profile',
  },
  {
    key: 'billing',
    icon: <CreditCardOutlined />,
    labelKey: 'billing',
    path: '/settings/billing',
  },
  {
    key: 'security',
    icon: <LockOutlined />,
    labelKey: 'security',
    path: '/settings/security',
    // Show indicator if 2FA is not enabled
    // Note: 2FA status is stored in user_security_settings table, not in user
    // This would need a separate query to check - for now, always show indicator
    showIndicator: () => {
      // TODO: Integrate with useUserSecuritySettings hook to check 2FA status
      return false;
    },
  },
  {
    key: 'sessions',
    icon: <DesktopOutlined />,
    labelKey: 'sessions',
    path: '/settings/sessions',
  },
  {
    key: 'notifications',
    icon: <BellOutlined />,
    labelKey: 'notifications',
    path: '/settings/notifications',
  },
];

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Navigation item with optional setup indicator
 */
function NavItemLabel({
  label,
  showIndicator,
}: {
  label: string;
  showIndicator: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between w-full">
      <span>{label}</span>
      {showIndicator && (
        <span className="w-2 h-2 rounded-full bg-amber-500" aria-label="Setup needed" />
      )}
    </div>
  );
}

/**
 * Dark mode toggle component
 */
function DarkModeToggle(): React.JSX.Element {
  const { isDark, toggleTheme, mounted } = useTheme();
  const t = useTranslations('settings.appearance');

  if (!mounted) {
    return (
      <div className="flex items-center justify-between px-4 py-3">
        <Skeleton.Input active size="small" className="!w-24" />
        <Skeleton.Button active size="small" shape="round" className="!w-10" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200 dark:border-stone-700">
      <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
        {isDark ? <MoonOutlined /> : <SunOutlined />}
        <span className="text-sm">{isDark ? t('darkMode') : t('lightMode')}</span>
      </div>
      <Switch checked={isDark} onChange={toggleTheme} size="small" aria-label={t('theme')} />
    </div>
  );
}

/**
 * Settings header with back navigation, logo, and user info
 */
function SettingsHeader({ onMenuClick }: { onMenuClick: () => void }): React.JSX.Element {
  const { user, isLoading } = useUser();
  const t = useTranslations('userSettings');

  // Get user initials for avatar fallback
  const getInitials = (name: string | null | undefined): string => {
    if (!name) {
      return 'U';
    }
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-stone-900 border-b border-stone-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Left: Back button and Logo */}
          <div className="flex items-center gap-4">
            {/* Back to shops */}
            <Link
              href="/shops"
              className="flex items-center gap-2 text-stone-400 hover:text-amber-400 transition-colors"
              aria-label={t('backToShops')}
            >
              <ArrowLeftOutlined className="text-lg rtl:rotate-180" />
              <span className="hidden sm:inline text-sm">{t('backToShops')}</span>
            </Link>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-stone-700" />

            {/* Logo */}
            <img src="/images/AYMUR-Full-Text-Logo.png" alt="AYMUR" className="h-8 sm:h-10" />
          </div>

          {/* Right: User info and mobile menu */}
          <div className="flex items-center gap-4">
            {/* Language Selector - hidden on mobile */}
            <div className="hidden sm:block">
              <LocaleSwitcher
                size="small"
                showLabel
                className="!text-stone-300 hover:!text-amber-400"
              />
            </div>

            {/* User Avatar and Name */}
            <div className="hidden sm:flex items-center gap-3">
              {isLoading ? (
                <>
                  <Skeleton.Avatar active size="default" />
                  <Skeleton.Input active size="small" className="!w-24" />
                </>
              ) : (
                <>
                  <Avatar icon={<UserOutlined />} className="bg-amber-600">
                    {getInitials(user?.full_name)}
                  </Avatar>
                  <span className="text-stone-200 text-sm font-medium">
                    {user?.full_name || t('user')}
                  </span>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={onMenuClick}
              className="lg:hidden text-stone-300 hover:text-amber-400"
              aria-label={t('menu')}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Desktop sidebar navigation
 */
function DesktopSidebar({
  activeKey,
  onNavigate,
}: {
  activeKey: string;
  onNavigate: (path: string) => void;
}): React.JSX.Element {
  const t = useTranslations('userSettings.navigation');
  const { user } = useUser();

  const menuItems: MenuProps['items'] = NAV_ITEMS.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: (
      <NavItemLabel label={t(item.labelKey)} showIndicator={item.showIndicator?.(user) ?? false} />
    ),
    onClick: () => onNavigate(item.path),
  }));

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-stone-900 border-e border-stone-200 dark:border-stone-800">
      {/* Navigation */}
      <nav className="flex-1 py-4">
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          items={menuItems}
          className="settings-nav border-0"
          style={{ borderInlineEnd: 'none' }}
        />
      </nav>

      {/* Footer with Dark Mode Toggle */}
      <div className="mt-auto">
        <DarkModeToggle />
      </div>

      {/* Custom styles for navigation */}
      <style jsx global>{`
        .settings-nav .ant-menu-item {
          margin: 4px 12px !important;
          border-radius: 8px !important;
          padding-inline-start: 16px !important;
        }
        .settings-nav .ant-menu-item-selected {
          background-color: rgba(201, 162, 39, 0.1) !important;
          border-inline-start: 3px solid ${BRAND_COLORS.gold} !important;
        }
        .settings-nav .ant-menu-item-selected .ant-menu-title-content,
        .settings-nav .ant-menu-item-selected .anticon {
          color: ${BRAND_COLORS.gold} !important;
        }
        .settings-nav .ant-menu-item:hover:not(.ant-menu-item-selected) {
          background-color: rgba(201, 162, 39, 0.05) !important;
        }
        .settings-nav .ant-menu-item:hover:not(.ant-menu-item-selected) .ant-menu-title-content,
        .settings-nav .ant-menu-item:hover:not(.ant-menu-item-selected) .anticon {
          color: ${BRAND_COLORS.goldDark} !important;
        }
        .dark .settings-nav .ant-menu-item {
          color: #a8a29e !important;
        }
        .dark .settings-nav .ant-menu-item-selected {
          background-color: rgba(201, 162, 39, 0.15) !important;
        }
      `}</style>
    </aside>
  );
}

/**
 * Mobile sidebar drawer
 */
function MobileSidebar({
  open,
  onClose,
  activeKey,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  activeKey: string;
  onNavigate: (path: string) => void;
}): React.JSX.Element {
  const t = useTranslations('userSettings');
  const tNav = useTranslations('userSettings.navigation');
  const { user, isLoading } = useUser();

  const menuItems: MenuProps['items'] = NAV_ITEMS.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: (
      <NavItemLabel
        label={tNav(item.labelKey)}
        showIndicator={item.showIndicator?.(user) ?? false}
      />
    ),
    onClick: () => {
      onNavigate(item.path);
      onClose();
    },
  }));

  // Get user initials for avatar fallback
  const getInitials = (name: string | null | undefined): string => {
    if (!name) {
      return 'U';
    }
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Drawer
      title={
        <div className="flex items-center gap-3">
          {isLoading ? (
            <>
              <Skeleton.Avatar active size="default" />
              <Skeleton.Input active size="small" className="!w-24" />
            </>
          ) : (
            <>
              <Avatar icon={<UserOutlined />} className="bg-amber-600">
                {getInitials(user?.full_name)}
              </Avatar>
              <div>
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {user?.full_name || t('user')}
                </div>
                <div className="text-xs text-stone-500">{user?.email}</div>
              </div>
            </>
          )}
        </div>
      }
      placement="left"
      onClose={onClose}
      open={open}
      width={280}
      className="settings-mobile-drawer"
    >
      <div className="flex flex-col h-full">
        {/* Navigation */}
        <nav className="flex-1 -mx-6">
          <Menu
            mode="inline"
            selectedKeys={[activeKey]}
            items={menuItems}
            className="settings-nav border-0"
            style={{ borderInlineEnd: 'none' }}
          />
        </nav>

        {/* Language Switcher */}
        <div className="py-3 border-t border-stone-200 dark:border-stone-700">
          <div className="flex items-center justify-between px-4">
            <span className="text-sm text-stone-600 dark:text-stone-400">{t('language')}</span>
            <LocaleSwitcher size="small" />
          </div>
        </div>

        {/* Dark Mode Toggle */}
        <DarkModeToggle />
      </div>
    </Drawer>
  );
}

// =============================================================================
// MAIN LAYOUT
// =============================================================================

export default function UserSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations('userSettings');

  // Determine active section from pathname
  const activeKey = React.useMemo((): string => {
    const segments = pathname.split('/');
    const settingsIndex = segments.indexOf('settings');
    const nextSegment = settingsIndex !== -1 ? segments[settingsIndex + 1] : undefined;
    return nextSegment || 'profile';
  }, [pathname]);

  // Handle navigation
  const handleNavigate = (path: string): void => {
    router.push(path);
  };

  return (
    <div className={cn('min-h-screen flex flex-col', 'bg-stone-50 dark:bg-stone-950')}>
      {/* Header */}
      <SettingsHeader onMenuClick={() => setMobileMenuOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <DesktopSidebar activeKey={activeKey} onNavigate={handleNavigate} />

        {/* Mobile Sidebar */}
        <MobileSidebar
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          activeKey={activeKey}
          onNavigate={handleNavigate}
        />

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-stone-100 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 py-4">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-stone-500">
            {new Date().getFullYear()} AYMUR. {t('allRightsReserved')}
          </p>
        </div>
      </footer>
    </div>
  );
}
