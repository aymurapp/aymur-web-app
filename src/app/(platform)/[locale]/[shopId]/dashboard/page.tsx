/**
 * Dashboard Page
 *
 * Main dashboard view for the jewelry shop management platform.
 * Displays welcome message, KPI stats, and interactive widgets for
 * quick access to key business information.
 *
 * Features:
 * - Welcome header with shop name
 * - KPI stat cards (inventory, sales, orders, customers)
 * - Metal price widget (compact mode)
 * - Quick actions widget
 * - Recent activity feed
 * - Low stock alerts
 * - Payments due widget
 *
 * @module app/(platform)/[locale]/[shopId]/dashboard/page
 */

import React from 'react';

import {
  ShoppingOutlined,
  DollarOutlined,
  InboxOutlined,
  UserOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  WarningOutlined,
  GoldOutlined,
} from '@ant-design/icons';
import { Typography } from 'antd';
import { getTranslations } from 'next-intl/server';

import { StatCard, StatCardGrid } from '@/components/common/data/StatCard';
import { DashboardGrid, DashboardWidget } from '@/components/domain/dashboard/DashboardGrid';
import { LowStockAlertWidget } from '@/components/domain/dashboard/LowStockAlertWidget';
import { PaymentsDueWidget } from '@/components/domain/dashboard/PaymentsDueWidget';
import { QuickActionsWidget } from '@/components/domain/dashboard/QuickActionsWidget';
import { RecentActivityWidget } from '@/components/domain/dashboard/RecentActivityWidget';
import { MetalPriceWidget } from '@/components/domain/settings/MetalPriceWidget';
import { createClient } from '@/lib/supabase/server';

const { Title, Text } = Typography;

// Force dynamic rendering for real-time data
export const dynamic = 'force-dynamic';

// =============================================================================
// TYPES
// =============================================================================

interface DashboardPageProps {
  params: Promise<{
    locale: string;
    shopId: string;
  }>;
}

interface QuickStat {
  key: string;
  titleKey: string;
  value: number | string;
  prefix: React.ReactNode;
  suffix?: string;
  color: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

// =============================================================================
// DATA FETCHING
// =============================================================================

/**
 * Fetches shop details for the dashboard header
 */
async function getShopDetails(shopId: string) {
  const supabase = await createClient();

  const { data: shop, error } = await supabase
    .from('shops')
    .select('id_shop, shop_name, shop_logo, currency, timezone')
    .eq('id_shop', shopId)
    .single();

  if (error) {
    console.error('[Dashboard] Error fetching shop:', error.message);
    return null;
  }

  return shop;
}

/**
 * Fetches quick stats for the dashboard
 * These are placeholder values - will be replaced with real data
 */
async function getQuickStats(_shopId: string): Promise<QuickStat[]> {
  // TODO: Replace with actual database queries using _shopId
  // For now, return placeholder stats with mock data
  return [
    {
      key: 'inventory',
      titleKey: 'inventoryItems',
      value: 156,
      prefix: <InboxOutlined />,
      suffix: undefined,
      color: '#f59e0b', // amber-500
    },
    {
      key: 'sales',
      titleKey: 'todaySales',
      value: '$4,250',
      prefix: <DollarOutlined />,
      suffix: undefined,
      color: '#10b981', // emerald-500
      trend: { value: 12.5, direction: 'up' },
    },
    {
      key: 'orders',
      titleKey: 'pendingOrders',
      value: 8,
      prefix: <ShoppingOutlined />,
      suffix: undefined,
      color: '#3b82f6', // blue-500
    },
    {
      key: 'customers',
      titleKey: 'totalCustomers',
      value: 234,
      prefix: <UserOutlined />,
      suffix: undefined,
      color: '#8b5cf6', // violet-500
      trend: { value: 3.2, direction: 'up' },
    },
  ];
}

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Welcome Header Section
 */
function WelcomeHeader({
  shopName,
  welcomeText,
  subtitleText,
}: {
  shopName: string;
  welcomeText: string;
  subtitleText: string;
}) {
  return (
    <div className="mb-6">
      <Title level={2} className="!mb-1 !text-stone-900 dark:!text-stone-100">
        {welcomeText} {shopName}
      </Title>
      <Text type="secondary" className="text-base">
        {subtitleText}
      </Text>
    </div>
  );
}

/**
 * Quick Stats Grid using StatCard component
 */
function QuickStatsSection({
  stats,
  translations,
}: {
  stats: QuickStat[];
  translations: Record<string, string>;
}) {
  return (
    <StatCardGrid columns={4} className="mb-6">
      {stats.map((stat) => (
        <StatCard
          key={stat.key}
          title={translations[stat.titleKey] ?? stat.titleKey}
          value={stat.value}
          prefix={
            <span style={{ color: stat.color }} className="text-xl">
              {stat.prefix}
            </span>
          }
          suffix={stat.suffix}
          trend={stat.trend}
        />
      ))}
    </StatCardGrid>
  );
}

// =============================================================================
// DASHBOARD WIDGETS SECTION (Client Component Wrapper)
// =============================================================================

/**
 * Dashboard Widgets Container
 *
 * This is rendered as a client component container that wraps
 * the interactive widgets. The individual widgets are client components
 * that handle their own data fetching and state.
 */
function DashboardWidgetsSection({
  translations,
}: {
  translations: {
    metalPrices: string;
    quickActions: string;
    recentActivity: string;
    lowStockAlerts: string;
    paymentsDue: string;
  };
}) {
  return (
    <DashboardGrid>
      {/* Metal Price Widget - Compact Mode */}
      <DashboardWidget
        title={translations.metalPrices}
        icon={<GoldOutlined />}
        size="md"
        collapsible
      >
        <MetalPriceWidget compact />
      </DashboardWidget>

      {/* Quick Actions Widget */}
      <DashboardWidget title={translations.quickActions} icon={<ThunderboltOutlined />} size="md">
        <QuickActionsWidget />
      </DashboardWidget>

      {/* Recent Activity Widget - Large */}
      <DashboardWidget
        title={translations.recentActivity}
        icon={<HistoryOutlined />}
        size="lg"
        collapsible
      >
        <RecentActivityWidget maxItems={5} />
      </DashboardWidget>

      {/* Low Stock Alert Widget */}
      <DashboardWidget
        title={translations.lowStockAlerts}
        icon={<WarningOutlined />}
        size="md"
        collapsible
      >
        <LowStockAlertWidget maxItems={4} />
      </DashboardWidget>

      {/* Payments Due Widget */}
      <DashboardWidget
        title={translations.paymentsDue}
        icon={<DollarOutlined />}
        size="md"
        collapsible
      >
        <PaymentsDueWidget maxItems={4} />
      </DashboardWidget>
    </DashboardGrid>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Dashboard Page Component
 *
 * Server component that displays the main dashboard with:
 * - Welcome message with shop name
 * - Quick stats cards (inventory, sales, orders, customers)
 * - Interactive widgets for business insights
 */
export default async function DashboardPage({
  params,
}: DashboardPageProps): Promise<React.JSX.Element> {
  const { shopId, locale } = await params;

  // Fetch translations and data in parallel
  const [t, shop, stats] = await Promise.all([
    getTranslations({ locale, namespace: 'dashboard' }),
    getShopDetails(shopId),
    getQuickStats(shopId),
  ]);

  // Prepare stat translations
  const statTranslations: Record<string, string> = {
    inventoryItems: t('stats.inventoryItems'),
    todaySales: t('stats.todaySales'),
    pendingOrders: t('stats.pendingOrders'),
    totalCustomers: t('stats.totalCustomers'),
  };

  // Widget translations
  const widgetTranslations = {
    metalPrices: t('widgets.metalPrices', { defaultValue: 'Metal Prices' }),
    quickActions: t('widgets.quickActions'),
    recentActivity: t('widgets.recentActivity'),
    lowStockAlerts: t('lowStock.title'),
    paymentsDue: t('payments.title'),
  };

  const shopName = shop?.shop_name ?? t('defaultShopName');

  return (
    <div className="dashboard-page">
      {/* Welcome Header */}
      <WelcomeHeader shopName={shopName} welcomeText={t('welcome')} subtitleText={t('subtitle')} />

      {/* Quick Stats */}
      <QuickStatsSection stats={stats} translations={statTranslations} />

      {/* Dashboard Widgets */}
      <DashboardWidgetsSection translations={widgetTranslations} />
    </div>
  );
}
