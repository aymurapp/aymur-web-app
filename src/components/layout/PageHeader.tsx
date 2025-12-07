'use client';

/**
 * PageHeader Component
 * Page title area with breadcrumbs and action buttons
 *
 * Features:
 * - Title and optional subtitle
 * - Breadcrumb navigation
 * - Action buttons slot
 * - Optional back button
 * - RTL support using CSS logical properties
 * - Proper heading hierarchy for screen readers
 * - ARIA landmarks and labels for accessibility
 * - Focus-visible indicators for keyboard navigation
 */

import React from 'react';

import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Button, Typography, Space } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { useRouter } from '@/lib/i18n/navigation';
import { isRtlLocale, type Locale } from '@/lib/i18n/routing';

import { Breadcrumbs, type BreadcrumbItem, type BreadcrumbOverride } from './Breadcrumbs';

const { Title, Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Show back button */
  showBack?: boolean;
  /** Custom back URL (defaults to browser history) */
  backUrl?: string;
  /** Callback when back button is clicked */
  onBack?: () => void;
  /** Action buttons (passed as children) */
  children?: React.ReactNode;
  /** Custom breadcrumb items (overrides auto-generated) */
  breadcrumbs?: BreadcrumbItem[];
  /** Override specific breadcrumb labels */
  breadcrumbOverrides?: BreadcrumbOverride[];
  /** Hide breadcrumbs completely */
  hideBreadcrumbs?: boolean;
  /** Additional CSS class name */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Page Header Component
 *
 * Provides a consistent page header with:
 * - Breadcrumb navigation
 * - Title and optional subtitle
 * - Action buttons area
 * - Optional back button
 *
 * @example
 * // Basic usage
 * <PageHeader title="Inventory" />
 *
 * @example
 * // With subtitle and back button
 * <PageHeader
 *   title="Edit Item"
 *   subtitle="Update item details"
 *   showBack
 * />
 *
 * @example
 * // With action buttons
 * <PageHeader title="Customers">
 *   <Button type="primary" icon={<PlusOutlined />}>
 *     Add Customer
 *   </Button>
 * </PageHeader>
 *
 * @example
 * // With custom breadcrumbs
 * <PageHeader
 *   title="John Doe"
 *   breadcrumbOverrides={[{ key: 'customer-id', label: 'John Doe' }]}
 * />
 */
export function PageHeader({
  title,
  subtitle,
  showBack = false,
  backUrl,
  onBack,
  children,
  breadcrumbs,
  breadcrumbOverrides,
  hideBreadcrumbs = false,
  className,
}: PageHeaderProps): JSX.Element {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale() as Locale;
  const isRtl = isRtlLocale(locale);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  const BackIcon = isRtl ? ArrowRightOutlined : ArrowLeftOutlined;

  // Generate unique ID for title element
  const titleId = `page-title-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <header className={`mb-6 ${className ?? ''}`} role="banner" aria-labelledby={titleId}>
      {/* Breadcrumbs - navigation landmark */}
      {!hideBreadcrumbs && (
        <nav className="mb-3" aria-label={t('navigation.breadcrumbs')}>
          <Breadcrumbs items={breadcrumbs} overrides={breadcrumbOverrides} />
        </nav>
      )}

      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Back button + Title */}
        <div className="flex items-center gap-3">
          {/* Back Button - with keyboard shortcut hint */}
          {showBack && (
            <Button
              type="text"
              icon={<BackIcon aria-hidden="true" />}
              onClick={handleBack}
              className={`
                flex items-center justify-center
                text-stone-500 hover:text-stone-700
                dark:text-stone-400 dark:hover:text-stone-200
                -ms-2
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                focus-visible:ring-offset-2 focus-visible:ring-offset-white
                dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-stone-900
              `}
              aria-label={t('common.actions.back')}
            />
          )}

          {/* Title and Subtitle */}
          <div>
            <Title
              level={1}
              id={titleId}
              className="!mb-0 !text-xl !text-stone-900 dark:!text-stone-100"
            >
              {title}
            </Title>
            {subtitle && (
              <Text type="secondary" className="text-sm" id={`${titleId}-description`}>
                {subtitle}
              </Text>
            )}
          </div>
        </div>

        {/* Right: Action Buttons - grouped as toolbar */}
        {children && (
          <div
            className="flex items-center gap-2 flex-wrap"
            role="toolbar"
            aria-label={t('common.actions.pageActions')}
          >
            <Space wrap>{children}</Space>
          </div>
        )}
      </div>
    </header>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default PageHeader;
