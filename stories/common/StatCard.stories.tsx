import React from 'react';

import {
  DollarOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  ShoppingOutlined,
  GoldOutlined,
  TeamOutlined,
  FileTextOutlined,
  PercentageOutlined,
} from '@ant-design/icons';

import { StatCard, StatCardGrid } from '@/components/common/data/StatCard';

import type { Meta, StoryObj } from '@storybook/react';

/**
 * StatCard Component Stories
 *
 * A dashboard metric card displaying a value with optional trend indicator,
 * prefix (icon/currency), and suffix.
 *
 * ## Features
 * - Trend indicator with up/down styling
 * - Loading skeleton state
 * - Clickable for navigation
 * - Prefix icon/currency support
 * - RTL-compatible
 * - Luxury gold theme hover effects
 */
const meta: Meta<typeof StatCard> = {
  title: 'Common/StatCard',
  component: StatCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A dashboard metric card for displaying KPIs and statistics with optional trend indicators, perfect for the Aymur jewelry business dashboard.',
      },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Card title/label',
    },
    value: {
      control: 'text',
      description: 'Primary value to display',
    },
    prefix: {
      control: false,
      description: 'Prefix element (icon or currency symbol)',
    },
    suffix: {
      control: 'text',
      description: 'Suffix string (e.g., "items", "%")',
    },
    trend: {
      control: 'object',
      description: 'Trend indicator configuration',
    },
    loading: {
      control: 'boolean',
      description: 'Whether to show loading skeleton',
    },
    onClick: {
      action: 'clicked',
      description: 'Click handler - makes card interactive',
    },
    precision: {
      control: 'number',
      description: 'Value precision for number formatting',
    },
    groupSeparator: {
      control: 'boolean',
      description: 'Whether to group digits with separators',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[280px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StatCard>;

// ===========================================
// Default States
// ===========================================

/**
 * Basic stat card with title and value
 */
export const Default: Story = {
  args: {
    title: 'Total Sales',
    value: 12450,
  },
};

/**
 * Stat card with currency prefix
 */
export const WithCurrencyPrefix: Story = {
  args: {
    title: 'Total Revenue',
    value: 45231,
    prefix: '$',
  },
};

/**
 * Stat card with icon prefix
 */
export const WithIconPrefix: Story = {
  args: {
    title: 'Total Revenue',
    value: 45231,
    prefix: <DollarOutlined className="text-amber-500" />,
  },
};

/**
 * Stat card with suffix
 */
export const WithSuffix: Story = {
  args: {
    title: 'Items in Stock',
    value: 1847,
    suffix: 'items',
    prefix: <ShoppingOutlined className="text-amber-500" />,
  },
};

// ===========================================
// Trend Indicators
// ===========================================

/**
 * Stat card with upward trend (positive)
 */
export const TrendUp: Story = {
  args: {
    title: 'Monthly Sales',
    value: 24500,
    prefix: '$',
    trend: {
      value: 12.5,
      direction: 'up',
      label: 'vs last month',
    },
  },
};

/**
 * Stat card with downward trend (negative)
 */
export const TrendDown: Story = {
  args: {
    title: 'Returns',
    value: 156,
    suffix: 'items',
    trend: {
      value: 8.2,
      direction: 'down',
      label: 'vs last month',
    },
  },
};

/**
 * Trend without label
 */
export const TrendWithoutLabel: Story = {
  args: {
    title: 'New Customers',
    value: 89,
    prefix: <UserOutlined className="text-amber-500" />,
    trend: {
      value: 15,
      direction: 'up',
    },
  },
};

/**
 * Small percentage trend
 */
export const SmallTrend: Story = {
  args: {
    title: 'Conversion Rate',
    value: 3.2,
    suffix: '%',
    precision: 1,
    trend: {
      value: 0.3,
      direction: 'up',
      label: 'from yesterday',
    },
  },
};

// ===========================================
// Loading States
// ===========================================

/**
 * Stat card in loading state
 */
export const Loading: Story = {
  args: {
    title: 'Total Revenue',
    value: 0,
    loading: true,
  },
};

/**
 * Multiple loading cards
 */
export const LoadingGrid: Story = {
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <StatCardGrid columns={2}>
      <StatCard title="Revenue" value={0} loading />
      <StatCard title="Orders" value={0} loading />
      <StatCard title="Customers" value={0} loading />
      <StatCard title="Products" value={0} loading />
    </StatCardGrid>
  ),
};

// ===========================================
// Interactive States
// ===========================================

/**
 * Clickable stat card (hover to see effect)
 */
export const Clickable: Story = {
  args: {
    title: 'Pending Orders',
    value: 23,
    prefix: <ShoppingCartOutlined className="text-amber-500" />,
    onClick: () => console.log('Navigate to orders'),
    trend: {
      value: 5,
      direction: 'up',
      label: 'new today',
    },
  },
};

/**
 * Clickable with different values
 */
export const ClickableVariants: Story = {
  decorators: [
    (Story) => (
      <div className="w-[900px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <StatCardGrid columns={3}>
      <StatCard
        title="Total Revenue"
        value={125340}
        prefix="$"
        onClick={() => console.log('Revenue')}
        trend={{ value: 8.5, direction: 'up', label: 'this month' }}
      />
      <StatCard
        title="Active Orders"
        value={47}
        prefix={<ShoppingCartOutlined className="text-amber-500" />}
        onClick={() => console.log('Orders')}
        trend={{ value: 12, direction: 'up', label: 'this week' }}
      />
      <StatCard
        title="Customers"
        value={1284}
        prefix={<TeamOutlined className="text-amber-500" />}
        onClick={() => console.log('Customers')}
        trend={{ value: 3.2, direction: 'up', label: 'this month' }}
      />
    </StatCardGrid>
  ),
};

// ===========================================
// Different Value Types
// ===========================================

/**
 * Large number with separators
 */
export const LargeNumber: Story = {
  args: {
    title: 'Total Inventory Value',
    value: 2456789,
    prefix: '$',
    groupSeparator: true,
  },
};

/**
 * Decimal precision
 */
export const DecimalPrecision: Story = {
  args: {
    title: 'Average Order Value',
    value: 847.5,
    prefix: '$',
    precision: 2,
  },
};

/**
 * Percentage value
 */
export const PercentageValue: Story = {
  args: {
    title: 'Profit Margin',
    value: 23.5,
    suffix: '%',
    prefix: <PercentageOutlined className="text-amber-500" />,
    precision: 1,
    trend: {
      value: 2.1,
      direction: 'up',
      label: 'vs Q3',
    },
  },
};

/**
 * String value (formatted externally)
 */
export const StringValue: Story = {
  args: {
    title: 'Best Selling Item',
    value: 'Diamond Ring',
    prefix: <GoldOutlined className="text-amber-500" />,
  },
};

// ===========================================
// Custom Styling
// ===========================================

/**
 * Custom value style
 */
export const CustomValueStyle: Story = {
  args: {
    title: 'VIP Customers',
    value: 156,
    prefix: <UserOutlined className="text-amber-500" />,
    valueStyle: {
      color: '#f59e0b', // Gold color
    },
  },
};

/**
 * With custom class
 */
export const WithCustomClass: Story = {
  args: {
    title: 'Special Metric',
    value: 999,
    className: 'border-amber-300 bg-amber-50/50',
  },
};

// ===========================================
// Dashboard Grid Layouts
// ===========================================

/**
 * 4-column dashboard grid
 */
export const DashboardGrid4: Story = {
  decorators: [
    (Story) => (
      <div className="w-[1200px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <StatCardGrid columns={4}>
      <StatCard
        title="Total Revenue"
        value={125340}
        prefix="$"
        trend={{ value: 12.5, direction: 'up', label: 'vs last month' }}
        onClick={() => {}}
      />
      <StatCard
        title="Orders"
        value={847}
        prefix={<ShoppingCartOutlined className="text-amber-500" />}
        trend={{ value: 8.2, direction: 'up', label: 'vs last month' }}
        onClick={() => {}}
      />
      <StatCard
        title="Customers"
        value={1284}
        prefix={<TeamOutlined className="text-amber-500" />}
        trend={{ value: 5.1, direction: 'up', label: 'vs last month' }}
        onClick={() => {}}
      />
      <StatCard
        title="Items Sold"
        value={2156}
        prefix={<GoldOutlined className="text-amber-500" />}
        trend={{ value: 3.7, direction: 'down', label: 'vs last month' }}
        onClick={() => {}}
      />
    </StatCardGrid>
  ),
};

/**
 * 3-column dashboard grid
 */
export const DashboardGrid3: Story = {
  decorators: [
    (Story) => (
      <div className="w-[900px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <StatCardGrid columns={3}>
      <StatCard
        title="Today's Sales"
        value={8450}
        prefix="$"
        trend={{ value: 15, direction: 'up', label: 'vs yesterday' }}
      />
      <StatCard
        title="Pending Orders"
        value={12}
        prefix={<FileTextOutlined className="text-amber-500" />}
      />
      <StatCard
        title="Low Stock Items"
        value={8}
        prefix={<ShoppingOutlined className="text-amber-500" />}
        trend={{ value: 2, direction: 'down', label: 'from last week' }}
      />
    </StatCardGrid>
  ),
};

/**
 * 2-column dashboard grid
 */
export const DashboardGrid2: Story = {
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <StatCardGrid columns={2}>
      <StatCard
        title="Monthly Revenue"
        value={89450}
        prefix="$"
        trend={{ value: 12.5, direction: 'up' }}
      />
      <StatCard
        title="Monthly Orders"
        value={234}
        prefix={<ShoppingCartOutlined className="text-amber-500" />}
        trend={{ value: 8, direction: 'up' }}
      />
    </StatCardGrid>
  ),
};

// ===========================================
// Jewelry Business Specific Examples
// ===========================================

/**
 * Gold inventory value
 */
export const GoldInventory: Story = {
  args: {
    title: 'Gold Inventory (18K)',
    value: 1250.5,
    suffix: 'grams',
    prefix: <GoldOutlined className="text-amber-500" />,
    precision: 1,
    trend: {
      value: 50,
      direction: 'up',
      label: 'received today',
    },
  },
};

/**
 * Jewelry business dashboard
 */
export const JewelryDashboard: Story = {
  decorators: [
    (Story) => (
      <div className="w-[1200px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="space-y-4">
      <StatCardGrid columns={4}>
        <StatCard
          title="Today's Sales"
          value={15680}
          prefix="$"
          onClick={() => {}}
          trend={{ value: 23, direction: 'up', label: 'vs yesterday' }}
        />
        <StatCard
          title="Items Sold Today"
          value={12}
          prefix={<GoldOutlined className="text-amber-500" />}
          onClick={() => {}}
        />
        <StatCard
          title="Active Customers"
          value={847}
          prefix={<UserOutlined className="text-amber-500" />}
          onClick={() => {}}
          trend={{ value: 5, direction: 'up', label: 'this week' }}
        />
        <StatCard
          title="Pending Repairs"
          value={8}
          prefix={<ShoppingOutlined className="text-amber-500" />}
          onClick={() => {}}
        />
      </StatCardGrid>
      <StatCardGrid columns={3}>
        <StatCard
          title="Gold Price (24K/gram)"
          value={67.5}
          prefix="$"
          precision={2}
          trend={{ value: 1.2, direction: 'up', label: 'from open' }}
        />
        <StatCard
          title="Inventory Items"
          value={2456}
          prefix={<ShoppingOutlined className="text-amber-500" />}
          onClick={() => {}}
        />
        <StatCard
          title="Conversion Rate"
          value={18.5}
          suffix="%"
          precision={1}
          trend={{ value: 2.3, direction: 'up', label: 'this month' }}
        />
      </StatCardGrid>
    </div>
  ),
};

// ===========================================
// RTL Support
// ===========================================

/**
 * RTL layout demonstration
 */
export const RTLSupport: Story = {
  args: {
    title: 'Total Revenue',
    value: 45231,
    prefix: '$',
    trend: {
      value: 12.5,
      direction: 'up',
      label: 'vs last month',
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Toggle RTL in the toolbar to see the card adapt its layout for Arabic and other RTL languages.',
      },
    },
  },
};
