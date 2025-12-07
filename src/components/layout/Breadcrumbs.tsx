/**
 * Breadcrumbs Component
 * Displays navigation breadcrumbs using Ant Design
 *
 * Features:
 * - Automatic breadcrumb generation from current route
 * - Clickable links for navigation
 * - Home icon for root
 * - Support for custom items
 * - RTL language support
 */

'use client';

import React, { useMemo } from 'react';

import { HomeOutlined } from '@ant-design/icons';
import { Breadcrumb } from 'antd';

import {
  useBreadcrumbs,
  type BreadcrumbItem,
  type BreadcrumbOverride,
} from '@/lib/hooks/ui/useBreadcrumbs';
import { Link } from '@/lib/i18n/navigation';

// =============================================================================
// TYPES
// =============================================================================

export interface BreadcrumbsProps {
  /** Custom breadcrumb items (overrides auto-generated) */
  items?: BreadcrumbItem[];
  /** Override specific breadcrumb labels */
  overrides?: BreadcrumbOverride[];
  /** Whether to show home icon for first item */
  showHomeIcon?: boolean;
  /** Whether to include home/dashboard as first breadcrumb */
  includeHome?: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Custom separator between items */
  separator?: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Breadcrumbs navigation component
 *
 * @example
 * // Basic usage - auto-generates from route
 * <Breadcrumbs />
 *
 * @example
 * // With custom overrides
 * <Breadcrumbs
 *   overrides={[{ key: 'customer-id', label: 'John Doe' }]}
 * />
 *
 * @example
 * // With custom items
 * <Breadcrumbs
 *   items={[
 *     { key: 'home', label: 'Dashboard', path: '/dashboard' },
 *     { key: 'customers', label: 'Customers', path: '/sales/customers' },
 *     { key: 'detail', label: 'John Doe', isActive: true },
 *   ]}
 * />
 */
export function Breadcrumbs({
  items: customItems,
  overrides,
  showHomeIcon = true,
  includeHome = true,
  className,
  separator = '/',
}: BreadcrumbsProps): JSX.Element {
  // Get auto-generated breadcrumbs from hook
  const autoBreadcrumbs = useBreadcrumbs({
    includeHome,
    overrides,
  });

  // Use custom items if provided, otherwise use auto-generated
  const breadcrumbItems = customItems ?? autoBreadcrumbs;

  // Convert to Ant Design Breadcrumb format
  const antdItems = useMemo(() => {
    return breadcrumbItems.map((item, index) => {
      const isFirst = index === 0;
      const isHome = item.key === 'home' || item.path === '/dashboard';

      // Render the title with optional icon
      const title = (
        <span className="inline-flex items-center gap-1">
          {isFirst && showHomeIcon && isHome && <HomeOutlined />}
          {item.icon && !isFirst && <item.icon />}
          <span>{item.label}</span>
        </span>
      );

      // If active (last item) or no path, render as plain text
      if (item.isActive || !item.path) {
        return {
          key: item.key,
          title,
        };
      }

      // Otherwise, render as link
      return {
        key: item.key,
        title: <Link href={item.path}>{title}</Link>,
      };
    });
  }, [breadcrumbItems, showHomeIcon]);

  // Don't render if only one item
  if (antdItems.length <= 1) {
    return <></>;
  }

  return <Breadcrumb className={className} separator={separator} items={antdItems} />;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default Breadcrumbs;

// Re-export related types and hooks for convenience
export {
  useBreadcrumbs,
  useBreadcrumbContext,
  BreadcrumbProvider,
} from '@/lib/hooks/ui/useBreadcrumbs';

export type { BreadcrumbItem, BreadcrumbOverride } from '@/lib/hooks/ui/useBreadcrumbs';
