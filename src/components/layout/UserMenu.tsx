'use client';

/**
 * UserMenu Component
 *
 * User avatar dropdown with profile, settings, and sign out options.
 * Uses the signOut server action for secure logout.
 *
 * Features:
 * - Avatar with user initials or image
 * - User name and email display
 * - Profile and Settings navigation
 * - Sign Out with server action
 * - RTL support using CSS logical properties
 *
 * @module components/layout/UserMenu
 */

import React, { useCallback, useState } from 'react';

import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { Avatar, Dropdown, Typography, Spin } from 'antd';
import { useTranslations } from 'next-intl';

import { signOut } from '@/lib/actions/auth';
import { useUser } from '@/lib/hooks/auth';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';
import { useShopStore } from '@/stores/shopStore';

import type { MenuProps } from 'antd';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface UserMenuProps {
  /** Show user name next to avatar (hidden on mobile by default) */
  showName?: boolean;
  /** Show account settings links (for non-shop context like shops page) */
  showAccountSettings?: boolean;
  /** Additional CSS class name */
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get user initials from full name
 */
function getInitials(name: string | null | undefined): string {
  if (!name) {
    return 'U';
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'U';
  }

  const firstPart = parts[0];
  if (parts.length === 1 && firstPart) {
    return firstPart.substring(0, 2).toUpperCase();
  }

  const lastPart = parts[parts.length - 1];
  if (firstPart && lastPart && firstPart[0] && lastPart[0]) {
    return (firstPart[0] + lastPart[0]).toUpperCase();
  }

  return 'U';
}

/**
 * Get avatar background color based on name
 */
function getAvatarColor(name: string | null | undefined): string {
  if (!name) {
    return 'bg-amber-100';
  }

  const colors = [
    'bg-amber-100',
    'bg-emerald-100',
    'bg-blue-100',
    'bg-violet-100',
    'bg-rose-100',
    'bg-cyan-100',
    'bg-orange-100',
  ];

  const index = name.charCodeAt(0) % colors.length;
  return colors[index] ?? 'bg-amber-100';
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * UserMenu Component
 *
 * Dropdown menu for user actions including profile, settings, and logout.
 * Displays user avatar with optional name.
 *
 * @example
 * // Basic usage
 * <UserMenu />
 *
 * @example
 * // With visible name
 * <UserMenu showName={true} />
 */
export function UserMenu({
  showName = true,
  showAccountSettings = false,
  className,
}: UserMenuProps): React.JSX.Element {
  const t = useTranslations();
  const { user, isLoading } = useUser();
  const currentShopId = useShopStore((state) => state.currentShopId);

  // Determine link paths based on context
  // When showAccountSettings is true (e.g., on shops page), always use account settings path
  // regardless of any stale currentShopId in the store
  const getSettingsPath = (suffix: string): string => {
    if (showAccountSettings) {
      return `/settings${suffix}`;
    }
    if (currentShopId) {
      return `/${currentShopId}/settings${suffix}`;
    }
    return '/shops';
  };
  const profilePath = getSettingsPath('/profile');
  const settingsPath = getSettingsPath('');

  const [isSigningOut, setIsSigningOut] = useState(false);

  // Handle sign out with server action
  const handleSignOut = useCallback(async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      // signOut redirects, so we won't reach here normally
    } catch (error) {
      // signOut throws a NEXT_REDIRECT, which is expected behavior
      // If we get a real error, reset the state
      console.error('[UserMenu] Sign out error:', error);
      setIsSigningOut(false);
    }
  }, []);

  // Build menu items
  const menuItems: MenuProps['items'] = [
    // User Info Header
    {
      key: 'user-info',
      type: 'group',
      label: (
        <div className="px-2 py-2">
          <Text strong className="block truncate text-stone-900 dark:text-stone-100">
            {user?.full_name ?? t('common.labels.name')}
          </Text>
          <Text type="secondary" className="text-xs truncate block">
            {user?.email ?? ''}
          </Text>
        </div>
      ),
    },
    { type: 'divider' },
    // Profile
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: (
        <Link href={profilePath} className="block">
          {t('navigation.profile')}
        </Link>
      ),
    },
    // Settings
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: (
        <Link href={settingsPath} className="block">
          {t('navigation.settings')}
        </Link>
      ),
    },
    { type: 'divider' },
    // Sign Out
    {
      key: 'logout',
      icon: isSigningOut ? <Spin size="small" /> : <LogoutOutlined />,
      label: isSigningOut ? t('common.messages.loading') : t('navigation.logout'),
      onClick: handleSignOut,
      danger: true,
      disabled: isSigningOut,
    },
  ];

  // User display values
  const userName = user?.full_name ?? t('common.labels.name');
  const initials = getInitials(user?.full_name);
  const avatarColor = getAvatarColor(user?.full_name);

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
      <button
        className={cn(
          'flex items-center gap-2 cursor-pointer',
          'hover:bg-stone-100 dark:hover:bg-stone-800',
          'rounded-lg px-2 py-1 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1',
          className
        )}
        aria-label={t('navigation.profile')}
      >
        {/* Avatar */}
        {isLoading ? (
          <Spin size="small" />
        ) : (
          <Avatar
            size="small"
            icon={<UserOutlined />}
            className={cn(avatarColor, 'text-amber-600')}
          >
            {initials}
          </Avatar>
        )}

        {/* User Name - hidden on small screens unless showName is true */}
        {showName && (
          <span
            className={cn(
              'hidden md:block text-sm font-medium',
              'text-stone-700 dark:text-stone-300',
              'max-w-24 truncate'
            )}
          >
            {userName}
          </span>
        )}
      </button>
    </Dropdown>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default UserMenu;
