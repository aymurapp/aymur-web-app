'use client';

/**
 * Catalog Settings Layout
 *
 * Layout component for catalog settings pages with a sidebar navigation
 * for different catalog sections (categories, metals, purities, stones, sizes).
 *
 * Features:
 * - Left sidebar with section links
 * - Active section highlighting
 * - Responsive design (sidebar collapses on mobile)
 * - RTL support
 * - Permission-based visibility
 *
 * @module app/(platform)/[locale]/[shopId]/settings/catalog/layout
 */

import React from 'react';

import { useParams, usePathname } from 'next/navigation';

import {
  AppstoreOutlined,
  GoldOutlined,
  PercentageOutlined,
  ExperimentOutlined,
  ColumnWidthOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Menu, Card, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/layout/PageHeader';
import { usePermissions } from '@/lib/hooks/permissions';
import { useRouter } from '@/lib/i18n/navigation';

import type { MenuProps } from 'antd';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface CatalogLayoutProps {
  children: React.ReactNode;
}

type MenuItem = Required<MenuProps>['items'][number];

// =============================================================================
// NAVIGATION ITEMS
// =============================================================================

/**
 * Get catalog navigation items
 */
function useCatalogNavItems(): MenuItem[] {
  const t = useTranslations('settings');
  const tInventory = useTranslations('inventory');

  return [
    {
      key: 'categories',
      icon: <AppstoreOutlined />,
      label: tInventory('categories.title'),
    },
    {
      key: 'metals',
      icon: <GoldOutlined />,
      label: tInventory('metals.title'),
    },
    {
      key: 'purities',
      icon: <PercentageOutlined />,
      label: t('catalog.purities'),
    },
    {
      key: 'stones',
      icon: <ExperimentOutlined />,
      label: tInventory('stones.title'),
    },
    {
      key: 'sizes',
      icon: <ColumnWidthOutlined />,
      label: t('catalog.sizes'),
    },
  ];
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Catalog Settings Layout
 */
export default function CatalogSettingsLayout({ children }: CatalogLayoutProps): React.JSX.Element {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { can } = usePermissions();

  const locale = (params.locale as string) || 'en';
  const shopId = (params.shopId as string) || '';

  // Get navigation items
  const navItems = useCatalogNavItems();

  // Determine active section from pathname
  const activeSection = React.useMemo((): string => {
    const segments = pathname.split('/');
    const catalogIndex = segments.indexOf('catalog');
    const nextSegment = catalogIndex !== -1 ? segments[catalogIndex + 1] : undefined;
    return nextSegment || 'categories'; // Default to categories
  }, [pathname]);

  // Handle navigation
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    router.push(`/${locale}/${shopId}/settings/catalog/${key}`);
  };

  // Check permission
  const hasPermission = can('catalog.manage');

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <SettingOutlined className="text-4xl text-stone-300 mb-4" />
        <Text type="secondary" className="text-lg">
          {tCommon('messages.noData')}
        </Text>
      </div>
    );
  }

  return (
    <div className="catalog-settings-layout">
      {/* Page Header */}
      <PageHeader title={t('catalog.title')} subtitle={t('catalog.subtitle')} />

      {/* Main Content with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <Card className="lg:w-64 flex-shrink-0" bodyStyle={{ padding: 0 }}>
          <div className="p-4 border-b border-stone-200">
            <Text strong className="text-stone-700">
              {t('catalog.sections')}
            </Text>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[activeSection]}
            onClick={handleMenuClick}
            items={navItems}
            className="border-0"
            style={{ borderInlineEnd: 'none' }}
          />
        </Card>

        {/* Content Area */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
