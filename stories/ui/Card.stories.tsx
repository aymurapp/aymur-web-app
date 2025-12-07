import React from 'react';

import {
  EditOutlined,
  EllipsisOutlined,
  SettingOutlined,
  ShoppingOutlined,
  HeartOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Typography } from 'antd';

import { Card, CardMeta } from '@/components/ui/Card';

import type { Meta, StoryObj } from '@storybook/react';

const { Text, Paragraph } = Typography;

/**
 * Card Component Stories
 *
 * A styled card wrapper around Ant Design Card with enhanced hover effects
 * and skeleton loading state support.
 *
 * ## Features
 * - Skeleton loading state for better UX
 * - Enhanced hover effects with gold accent
 * - RTL-compatible styling
 * - Consistent with platform's luxury theme
 */
const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An enhanced Card component with skeleton loading, hover effects, and gold-themed styling for the Aymur luxury jewelry platform.',
      },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Card title',
    },
    extra: {
      control: false,
      description: 'Extra content in card header',
    },
    loading: {
      control: 'boolean',
      description: 'Whether the card is in loading state',
    },
    skeleton: {
      control: 'boolean',
      description: 'Use skeleton loading instead of spinner',
    },
    skeletonRows: {
      control: { type: 'number', min: 1, max: 10 },
      description: 'Number of skeleton rows',
    },
    skeletonAvatar: {
      control: 'boolean',
      description: 'Show skeleton avatar',
    },
    hoverable: {
      control: 'boolean',
      description: 'Enable hover effects',
    },
    bordered: {
      control: 'boolean',
      description: 'Show card border',
    },
    size: {
      control: 'select',
      options: ['default', 'small'],
      description: 'Card size',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[350px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Card>;

// ===========================================
// Default States
// ===========================================

/**
 * Default card with title and content
 */
export const Default: Story = {
  args: {
    title: 'Card Title',
    children: (
      <Paragraph>
        This is a basic card with a title and content. Cards are used throughout the Aymur platform
        to group related information.
      </Paragraph>
    ),
  },
};

/**
 * Card without title
 */
export const WithoutTitle: Story = {
  args: {
    children: <Paragraph>This card has no title, useful for simple content containers.</Paragraph>,
  },
};

/**
 * Card with extra header content
 */
export const WithExtra: Story = {
  args: {
    title: 'Recent Orders',
    extra: <Button type="link">View All</Button>,
    children: (
      <div className="space-y-2">
        <Text>Order #1234 - Completed</Text>
        <br />
        <Text>Order #1235 - Processing</Text>
        <br />
        <Text>Order #1236 - Pending</Text>
      </div>
    ),
  },
};

// ===========================================
// Loading States
// ===========================================

/**
 * Card with default loading spinner
 */
export const Loading: Story = {
  args: {
    title: 'Loading Card',
    loading: true,
    children: <Paragraph>This content is hidden while loading.</Paragraph>,
  },
};

/**
 * Card with skeleton loading (preferred for better UX)
 */
export const SkeletonLoading: Story = {
  args: {
    title: 'Loading with Skeleton',
    loading: true,
    skeleton: true,
    skeletonRows: 4,
    children: <Paragraph>This content will appear after loading.</Paragraph>,
  },
};

/**
 * Skeleton loading with avatar
 */
export const SkeletonWithAvatar: Story = {
  args: {
    loading: true,
    skeleton: true,
    skeletonAvatar: true,
    skeletonRows: 3,
    children: <Paragraph>User profile content here.</Paragraph>,
  },
};

/**
 * Skeleton with fewer rows
 */
export const SkeletonCompact: Story = {
  args: {
    loading: true,
    skeleton: true,
    skeletonRows: 2,
    children: <Paragraph>Compact content here.</Paragraph>,
  },
};

// ===========================================
// Disabled/Inactive States
// ===========================================

/**
 * Visually muted card (using custom styling)
 */
export const Muted: Story = {
  args: {
    title: 'Inactive Feature',
    className: 'opacity-60 pointer-events-none',
    children: <Paragraph type="secondary">This feature is currently unavailable.</Paragraph>,
  },
};

// ===========================================
// Sizes
// ===========================================

/**
 * Small card size
 */
export const Small: Story = {
  args: {
    size: 'small',
    title: 'Small Card',
    children: <Text>Compact card with reduced padding.</Text>,
  },
};

/**
 * Default card size
 */
export const DefaultSize: Story = {
  args: {
    size: 'default',
    title: 'Default Card',
    children: <Text>Standard card with normal padding.</Text>,
  },
};

// ===========================================
// Hoverable Cards
// ===========================================

/**
 * Hoverable card with gold shadow effect
 */
export const Hoverable: Story = {
  args: {
    hoverable: true,
    title: 'Hover Me',
    children: (
      <Paragraph>
        Hover over this card to see the gold-themed shadow effect and subtle lift animation.
      </Paragraph>
    ),
  },
};

/**
 * Hoverable product card
 */
export const HoverableProduct: Story = {
  args: {
    hoverable: true,
    cover: (
      <div className="h-48 bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center">
        <ShoppingOutlined className="text-6xl text-amber-400" />
      </div>
    ),
    children: <CardMeta title="Gold Diamond Ring" description="18K Gold with 0.5ct Diamond" />,
  },
};

// ===========================================
// With Actions
// ===========================================

/**
 * Card with action icons in footer
 */
export const WithActions: Story = {
  args: {
    title: 'Product Card',
    actions: [
      <SettingOutlined key="setting" />,
      <EditOutlined key="edit" />,
      <EllipsisOutlined key="ellipsis" />,
    ],
    children: (
      <CardMeta
        avatar={<Avatar src="https://api.dicebear.com/7.x/shapes/svg?seed=jewelry" />}
        title="Diamond Necklace"
        description="Luxury 18K white gold necklace"
      />
    ),
  },
};

/**
 * Card with custom action buttons
 */
export const WithCustomActions: Story = {
  args: {
    hoverable: true,
    cover: (
      <div className="h-40 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
        <ShoppingOutlined className="text-5xl text-stone-400" />
      </div>
    ),
    actions: [
      <Button key="cart" type="text" icon={<ShoppingOutlined />}>
        Add to Cart
      </Button>,
      <Button key="wishlist" type="text" icon={<HeartOutlined />}>
        Wishlist
      </Button>,
      <Button key="share" type="text" icon={<ShareAltOutlined />}>
        Share
      </Button>,
    ],
    children: (
      <div>
        <Text strong className="text-lg">
          Sapphire Earrings
        </Text>
        <br />
        <Text type="secondary">$2,450.00</Text>
      </div>
    ),
  },
};

// ===========================================
// With Cover Image
// ===========================================

/**
 * Card with cover image
 */
export const WithCover: Story = {
  args: {
    hoverable: true,
    cover: (
      <img
        alt="jewelry"
        src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=200&fit=crop"
        className="h-48 object-cover"
      />
    ),
    children: (
      <CardMeta title="Luxury Watch Collection" description="Explore our premium timepieces" />
    ),
  },
};

/**
 * Card with placeholder cover
 */
export const WithPlaceholderCover: Story = {
  args: {
    hoverable: true,
    cover: (
      <div className="h-48 bg-gradient-to-br from-amber-100 via-amber-50 to-white flex items-center justify-center">
        <div className="text-center">
          <ShoppingOutlined className="text-4xl text-amber-400 mb-2" />
          <Text type="secondary" className="text-sm">
            Product Image
          </Text>
        </div>
      </div>
    ),
    children: <CardMeta title="Product Name" description="Product description goes here" />,
  },
};

// ===========================================
// With Meta Component
// ===========================================

/**
 * Card with Meta component showing avatar
 */
export const WithMeta: Story = {
  args: {
    children: (
      <CardMeta
        avatar={<Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=john" />}
        title="John Smith"
        description="Premium Customer since 2020"
      />
    ),
  },
};

/**
 * Card with Meta and description
 */
export const WithMetaDescription: Story = {
  args: {
    cover: <div className="h-32 bg-gradient-to-r from-amber-400 to-amber-600" />,
    children: (
      <CardMeta
        title="VIP Membership"
        description="Enjoy exclusive benefits including priority access, special discounts, and personalized service."
      />
    ),
  },
};

// ===========================================
// Card Combinations
// ===========================================

/**
 * Dashboard stat card pattern
 */
export const DashboardCard: Story = {
  args: {
    title: 'Total Revenue',
    extra: <Text type="secondary">This month</Text>,
    children: (
      <div>
        <Text className="text-3xl font-bold text-stone-900">$45,231</Text>
        <br />
        <Text type="success" className="text-sm">
          +12.5% from last month
        </Text>
      </div>
    ),
  },
};

/**
 * Order summary card
 */
export const OrderSummaryCard: Story = {
  args: {
    title: 'Order #12345',
    extra: (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
        Completed
      </span>
    ),
    children: (
      <div className="space-y-2">
        <div className="flex justify-between">
          <Text type="secondary">Customer</Text>
          <Text>Sarah Johnson</Text>
        </div>
        <div className="flex justify-between">
          <Text type="secondary">Items</Text>
          <Text>3</Text>
        </div>
        <div className="flex justify-between">
          <Text type="secondary">Total</Text>
          <Text strong>$4,250.00</Text>
        </div>
      </div>
    ),
  },
};

/**
 * Multiple cards layout
 */
export const CardGrid: Story = {
  decorators: [
    (Story) => (
      <div className="w-[800px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <Card hoverable>
        <CardMeta
          avatar={<Avatar style={{ backgroundColor: '#f59e0b' }}>R</Avatar>}
          title="Rings"
          description="45 items"
        />
      </Card>
      <Card hoverable>
        <CardMeta
          avatar={<Avatar style={{ backgroundColor: '#f59e0b' }}>N</Avatar>}
          title="Necklaces"
          description="32 items"
        />
      </Card>
      <Card hoverable>
        <CardMeta
          avatar={<Avatar style={{ backgroundColor: '#f59e0b' }}>E</Avatar>}
          title="Earrings"
          description="28 items"
        />
      </Card>
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
    title: 'RTL Card',
    extra: <Button type="link">More</Button>,
    children: (
      <CardMeta
        avatar={<Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=rtl" />}
        title="Customer Name"
        description="Toggle RTL in toolbar to see the card adapt its layout"
      />
    ),
  },
};

// ===========================================
// Bordered vs Borderless
// ===========================================

/**
 * Card without border
 */
export const Borderless: Story = {
  args: {
    bordered: false,
    title: 'Borderless Card',
    className: 'shadow-md',
    children: <Paragraph>A card without border, relying on shadow.</Paragraph>,
  },
};

/**
 * Cards with different borders
 */
export const BorderComparison: Story = {
  decorators: [
    (Story) => (
      <div className="w-[700px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="flex gap-4">
      <Card bordered title="Bordered" className="flex-1">
        <Text>Default bordered card</Text>
      </Card>
      <Card bordered={false} title="Borderless" className="flex-1 shadow-lg">
        <Text>Card without border</Text>
      </Card>
    </div>
  ),
};
