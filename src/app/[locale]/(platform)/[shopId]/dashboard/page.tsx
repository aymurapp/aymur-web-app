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

import { Typography } from 'antd';
import { getTranslations } from 'next-intl/server';

import { DashboardWidgetsSection } from '@/components/domain/dashboard/DashboardWidgetsSection';
import { QuickStatsSection } from '@/components/domain/dashboard/QuickStatsSection';
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

/**
 * Icon keys for stat cards (resolved to actual icons in client component)
 */
type StatIconKey = 'inventory' | 'sales' | 'orders' | 'customers';

interface QuickStat {
  key: string;
  titleKey: string;
  value: number | string;
  iconKey: StatIconKey;
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
      iconKey: 'inventory',
      suffix: undefined,
      color: '#f59e0b', // amber-500
    },
    {
      key: 'sales',
      titleKey: 'todaySales',
      value: '$4,250',
      iconKey: 'sales',
      suffix: undefined,
      color: '#10b981', // emerald-500
      trend: { value: 12.5, direction: 'up' },
    },
    {
      key: 'orders',
      titleKey: 'pendingOrders',
      value: 8,
      iconKey: 'orders',
      suffix: undefined,
      color: '#3b82f6', // blue-500
    },
    {
      key: 'customers',
      titleKey: 'totalCustomers',
      value: 234,
      iconKey: 'customers',
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
