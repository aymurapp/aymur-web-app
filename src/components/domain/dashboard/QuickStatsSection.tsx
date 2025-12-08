'use client';

/**
 * QuickStatsSection Component
 *
 * Client-side component that renders dashboard stat cards with icons.
 * Icons are resolved on the client side to avoid server-client serialization issues.
 *
 * @module components/domain/dashboard/QuickStatsSection
 */

import React from 'react';

import { ShoppingOutlined, DollarOutlined, InboxOutlined, UserOutlined } from '@ant-design/icons';

import { StatCard, StatCardGrid } from '@/components/common/data/StatCard';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Icon keys for stat cards
 */
export type StatIconKey = 'inventory' | 'sales' | 'orders' | 'customers';

/**
 * Quick stat data structure (serializable from server)
 */
export interface QuickStatData {
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

export interface QuickStatsSectionProps {
  stats: QuickStatData[];
  translations: Record<string, string>;
}

// =============================================================================
// ICON MAPPING
// =============================================================================

/**
 * Map icon keys to actual Ant Design icon components
 * This is done on the client side to avoid serialization issues
 */
const iconMap: Record<StatIconKey, React.ReactNode> = {
  inventory: <InboxOutlined />,
  sales: <DollarOutlined />,
  orders: <ShoppingOutlined />,
  customers: <UserOutlined />,
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * QuickStatsSection Component
 *
 * Renders a grid of stat cards with icons resolved on the client side.
 */
export function QuickStatsSection({
  stats,
  translations,
}: QuickStatsSectionProps): React.JSX.Element {
  return (
    <StatCardGrid columns={4} className="mb-6">
      {stats.map((stat) => (
        <StatCard
          key={stat.key}
          title={translations[stat.titleKey] ?? stat.titleKey}
          value={stat.value}
          prefix={
            <span style={{ color: stat.color }} className="text-xl">
              {iconMap[stat.iconKey]}
            </span>
          }
          suffix={stat.suffix}
          trend={stat.trend}
        />
      ))}
    </StatCardGrid>
  );
}

export default QuickStatsSection;
