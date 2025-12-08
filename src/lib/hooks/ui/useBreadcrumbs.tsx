/**
 * useBreadcrumbs Hook
 * Generates breadcrumb items based on the current route
 *
 * Features:
 * - Parses current pathname to extract route segments
 * - Maps segments to navigation labels using i18n
 * - Supports custom overrides via context
 * - Handles dynamic route parameters
 */

'use client';

import { useMemo, useState, createContext, useContext, type ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import { getBreadcrumbTrail, findNavItemByPath } from '@/lib/constants/navigation';
import { usePathname } from '@/lib/i18n/navigation';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Single breadcrumb item
 */
export interface BreadcrumbItem {
  /** Unique key for the breadcrumb */
  key: string;
  /** Display label (translated) */
  label: string;
  /** Route path for the breadcrumb link */
  path?: string;
  /** Icon component (optional) */
  icon?: React.ComponentType;
  /** Whether this is the current/active item */
  isActive?: boolean;
}

/**
 * Custom breadcrumb override
 */
export interface BreadcrumbOverride {
  /** Key of the breadcrumb to override */
  key: string;
  /** Custom label to display */
  label: string;
}

/**
 * Breadcrumb context value
 */
interface BreadcrumbContextValue {
  /** Custom overrides for dynamic content (e.g., entity names) */
  overrides: BreadcrumbOverride[];
  /** Set custom overrides */
  setOverrides: (overrides: BreadcrumbOverride[]) => void;
  /** Add a single override */
  addOverride: (override: BreadcrumbOverride) => void;
  /** Remove an override by key */
  removeOverride: (key: string) => void;
  /** Clear all overrides */
  clearOverrides: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

/**
 * Hook to access breadcrumb context for setting overrides
 * Use this in pages that need to set dynamic breadcrumb labels
 *
 * @example
 * const { addOverride } = useBreadcrumbContext();
 * useEffect(() => {
 *   addOverride({ key: 'customer-id', label: customer.name });
 * }, [customer.name]);
 */
export function useBreadcrumbContext(): BreadcrumbContextValue {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    // Return a no-op context if not wrapped in provider
    return {
      overrides: [],
      setOverrides: () => {},
      addOverride: () => {},
      removeOverride: () => {},
      clearOverrides: () => {},
    };
  }
  return context;
}

// =============================================================================
// PROVIDER
// =============================================================================

interface BreadcrumbProviderProps {
  children: ReactNode;
}

/**
 * Provider for breadcrumb overrides
 * Wrap this around your layout to enable dynamic breadcrumb labels
 */
export function BreadcrumbProvider({ children }: BreadcrumbProviderProps): JSX.Element {
  const [overrides, setOverrides] = useState<BreadcrumbOverride[]>([]);

  const value = useMemo(
    (): BreadcrumbContextValue => ({
      overrides,
      setOverrides,
      addOverride: (override) =>
        setOverrides((prev) => {
          const filtered = prev.filter((o) => o.key !== override.key);
          return [...filtered, override];
        }),
      removeOverride: (key) => setOverrides((prev) => prev.filter((o) => o.key !== key)),
      clearOverrides: () => setOverrides([]),
    }),
    [overrides]
  );

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Options for useBreadcrumbs hook
 */
export interface UseBreadcrumbsOptions {
  /** Include home/dashboard as first breadcrumb */
  includeHome?: boolean;
  /** Custom overrides for specific breadcrumbs */
  overrides?: BreadcrumbOverride[];
}

/**
 * Generate breadcrumb items for the current route
 *
 * @param options - Configuration options
 * @returns Array of breadcrumb items
 *
 * @example
 * const breadcrumbs = useBreadcrumbs();
 * // Returns: [{ key: 'dashboard', label: 'Dashboard', path: '/dashboard' }, ...]
 *
 * @example
 * // With custom override for dynamic content
 * const breadcrumbs = useBreadcrumbs({
 *   overrides: [{ key: 'customer-id', label: 'John Doe' }]
 * });
 */
export function useBreadcrumbs(options: UseBreadcrumbsOptions = {}): BreadcrumbItem[] {
  const { includeHome = true, overrides: propOverrides = [] } = options;

  const pathname = usePathname();
  const t = useTranslations();

  // Get overrides from context
  const contextValue = useContext(BreadcrumbContext);

  // Combine prop overrides with context overrides (props take precedence)
  const allOverrides = useMemo(() => {
    const contextOverrides = contextValue?.overrides ?? [];
    const merged = [...contextOverrides];
    for (const override of propOverrides) {
      const existingIndex = merged.findIndex((o) => o.key === override.key);
      if (existingIndex >= 0) {
        merged[existingIndex] = override;
      } else {
        merged.push(override);
      }
    }
    return merged;
  }, [contextValue?.overrides, propOverrides]);

  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];

    // Add home/dashboard as first item
    if (includeHome && pathname !== '/dashboard') {
      items.push({
        key: 'home',
        label: t('navigation.dashboard'),
        path: '/dashboard',
        isActive: false,
      });
    }

    // Get the breadcrumb trail from navigation config
    const navTrail = getBreadcrumbTrail(pathname);

    if (navTrail.length > 0) {
      // Use navigation config for known routes
      navTrail.forEach((navItem, index) => {
        const isLast = index === navTrail.length - 1;

        // Check for override
        const override = allOverrides.find((o) => o.key === navItem.key);

        items.push({
          key: navItem.key,
          label: override?.label ?? t(navItem.labelKey),
          path: isLast ? undefined : navItem.path,
          icon: navItem.icon,
          isActive: isLast,
        });
      });
    } else {
      // Parse path segments for dynamic routes not in navigation config
      const segments = pathname.split('/').filter(Boolean);

      segments.forEach((segment, index) => {
        const isLast = index === segments.length - 1;
        const pathUpToSegment = '/' + segments.slice(0, index + 1).join('/');

        // Try to find this path in navigation config
        const navItem = findNavItemByPath(pathUpToSegment);

        // Check for override
        const override = allOverrides.find((o) => o.key === segment);

        if (navItem) {
          items.push({
            key: navItem.key,
            label: override?.label ?? t(navItem.labelKey),
            path: isLast ? undefined : navItem.path,
            icon: navItem.icon,
            isActive: isLast,
          });
        } else {
          // Generate label from segment (capitalize, replace hyphens)
          const generatedLabel = formatSegmentLabel(segment);

          items.push({
            key: segment,
            label: override?.label ?? generatedLabel,
            path: isLast ? undefined : pathUpToSegment,
            isActive: isLast,
          });
        }
      });
    }

    return items;
  }, [pathname, includeHome, t, allOverrides]);

  return breadcrumbs;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format a URL segment into a display label
 * Handles UUIDs, slugs, and regular segments
 */
function formatSegmentLabel(segment: string): string {
  // Check if it looks like a UUID
  if (isUUID(segment)) {
    return 'Details';
  }

  // Replace hyphens and underscores with spaces, capitalize words
  return segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Check if a string is a UUID
 */
function isUUID(str: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(str);
}

/**
 * Default export for convenience
 */
export default useBreadcrumbs;
