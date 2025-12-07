/**
 * Layout Components
 * Page layouts, navigation, headers, sidebars
 */

// =============================================================================
// BREADCRUMBS
// =============================================================================

export { Breadcrumbs, BreadcrumbProvider } from './Breadcrumbs';
export type { BreadcrumbsProps } from './Breadcrumbs';

// Re-export breadcrumb types for convenience
export type { BreadcrumbItem, BreadcrumbOverride } from '@/lib/hooks/ui/useBreadcrumbs';

// =============================================================================
// SIDEBAR
// =============================================================================

export { Sidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH, MOBILE_BREAKPOINT } from './Sidebar';
export type { SidebarProps } from './Sidebar';

export { SidebarNav } from './SidebarNav';
export type { SidebarNavProps } from './SidebarNav';

export { SidebarItem } from './SidebarItem';
export type { SidebarItemProps } from './SidebarItem';

// =============================================================================
// HEADER
// =============================================================================

export { Header, HEADER_HEIGHT } from './Header';
export type { HeaderProps } from './Header';

// =============================================================================
// PAGE HEADER
// =============================================================================

export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

// =============================================================================
// FAB (Floating Action Button)
// =============================================================================

export { FAB } from './FAB';
export type { FABProps, FABAction } from './FAB';

// =============================================================================
// LOCKED FEATURE
// =============================================================================

export { LockedFeature } from './LockedFeature';
export type { LockedFeatureProps } from './LockedFeature';

// =============================================================================
// SHOP SWITCHER
// =============================================================================

export { ShopSwitcher, useShopSwitcher } from './ShopSwitcher';
export type { ShopSwitcherProps } from './ShopSwitcher';

// =============================================================================
// NOTIFICATION CENTER
// =============================================================================

export { NotificationCenter } from './NotificationCenter';
export type { NotificationCenterProps } from './NotificationCenter';

// =============================================================================
// USER MENU
// =============================================================================

export { UserMenu } from './UserMenu';
export type { UserMenuProps } from './UserMenu';

// =============================================================================
// THEME TOGGLE
// =============================================================================

export { ThemeToggle } from './ThemeToggle';
export type { ThemeToggleProps } from './ThemeToggle';

// =============================================================================
// LOCALE SWITCHER
// =============================================================================

export { LocaleSwitcher } from './LocaleSwitcher';
export type { LocaleSwitcherProps } from './LocaleSwitcher';

// =============================================================================
// GLOBAL SEARCH
// =============================================================================

export { GlobalSearch } from './GlobalSearch';
export type { GlobalSearchProps } from './GlobalSearch';
