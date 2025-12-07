/**
 * UI State Hooks
 * Theme, locale, sidebar, modal, and other UI state management
 */

// Breadcrumb hook (note: .tsx extension for JSX support)
export { useBreadcrumbs, useBreadcrumbContext, BreadcrumbProvider } from './useBreadcrumbs';
export type { BreadcrumbItem, BreadcrumbOverride, UseBreadcrumbsOptions } from './useBreadcrumbs';

// Navigation hook
export { useNavigation, parseNavigationPath, joinPath } from './useNavigation';
export type { UseNavigationReturn, NavigateOptions } from './useNavigation';

// Theme hook
export { useTheme } from './useTheme';
export type { UseThemeReturn, ResolvedTheme } from './useTheme';

// Locale hook
export {
  useLocale,
  useIsRTL,
  useTextDirection,
  locales,
  rtlLocales,
  localeNames,
  localeFlags,
  isRtlLocale,
} from './useLocale';
export type { UseLocaleReturn, LocaleInfo, Locale } from './useLocale';

// Sidebar hook
export {
  useSidebar,
  useIsSidebarCollapsed,
  useSidebarToggle,
  MOBILE_BREAKPOINT,
  TABLET_BREAKPOINT,
} from './useSidebar';
export type { UseSidebarReturn, ViewportSize } from './useSidebar';

// Modal hook
export { useModal, useModals, useGlobalModal } from './useModal';
export type {
  UseModalReturn,
  UseModalsReturn,
  UseGlobalModalReturn,
  ModalState,
  ModalRegistryEntry,
  ModalType,
  ModalData,
} from './useModal';

// Swipe gesture hook
export { useSwipe } from './useSwipe';
export type { UseSwipeReturn, UseSwipeOptions, SwipeState, SwipeDirection } from './useSwipe';
