'use client';

/**
 * Dashboard Layout
 *
 * Wraps dashboard pages with dashboard-specific context and PageHeader.
 * Provides consistent header with title and breadcrumbs across all dashboard views.
 *
 * @module app/(platform)/[locale]/[shopId]/dashboard/layout
 */

import React from 'react';

import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/layout/PageHeader';

// =============================================================================
// TYPES
// =============================================================================

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Dashboard Layout Component
 *
 * Provides a consistent layout wrapper for all dashboard pages with:
 * - PageHeader with "Dashboard" title
 * - Automatic breadcrumb navigation
 * - Dashboard-specific styling context
 *
 * @example
 * // This layout is automatically applied to all pages under /dashboard
 * // The page content will be rendered as children
 */
export default function DashboardLayout({ children }: DashboardLayoutProps): React.JSX.Element {
  const t = useTranslations('navigation');

  return (
    <div className="dashboard-layout">
      {/* Page Header with Dashboard Title */}
      <PageHeader title={t('dashboard')} hideBreadcrumbs={false} />

      {/* Dashboard Content */}
      <div className="dashboard-content">{children}</div>
    </div>
  );
}
