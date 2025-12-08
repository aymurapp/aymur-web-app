'use client';

/**
 * DashboardWidgetsSection Component
 *
 * Client-side component that renders the dashboard widgets grid.
 * Icons are created on the client side to avoid server-client serialization issues.
 *
 * @module components/domain/dashboard/DashboardWidgetsSection
 */

import React from 'react';

import {
  GoldOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  WarningOutlined,
  DollarOutlined,
} from '@ant-design/icons';

import { DashboardGrid, DashboardWidget } from '@/components/domain/dashboard/DashboardGrid';
import { LowStockAlertWidget } from '@/components/domain/dashboard/LowStockAlertWidget';
import { PaymentsDueWidget } from '@/components/domain/dashboard/PaymentsDueWidget';
import { QuickActionsWidget } from '@/components/domain/dashboard/QuickActionsWidget';
import { RecentActivityWidget } from '@/components/domain/dashboard/RecentActivityWidget';
import { MetalPriceWidget } from '@/components/domain/settings/MetalPriceWidget';

// =============================================================================
// TYPES
// =============================================================================

export interface DashboardWidgetsSectionProps {
  translations: {
    metalPrices: string;
    quickActions: string;
    recentActivity: string;
    lowStockAlerts: string;
    paymentsDue: string;
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Dashboard Widgets Container
 *
 * Renders the grid of dashboard widgets with proper icons.
 * All icons are created on the client side to ensure proper serialization.
 */
export function DashboardWidgetsSection({
  translations,
}: DashboardWidgetsSectionProps): React.JSX.Element {
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

export default DashboardWidgetsSection;
