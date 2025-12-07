import React from 'react';

import {
  InboxOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  FileOutlined,
  GoldOutlined,
  PlusOutlined,
  SettingOutlined,
  CalendarOutlined,
  BellOutlined,
  FilterOutlined,
  UploadOutlined,
} from '@ant-design/icons';

import { EmptyState, NoSearchResults, NoData } from '@/components/common/data/EmptyState';

import type { Meta, StoryObj } from '@storybook/react';

/**
 * EmptyState Component Stories
 *
 * A flexible empty state component with illustration, title, description,
 * and optional action button with permission support.
 *
 * ## Features
 * - Multiple size variants (sm, md, lg)
 * - Custom icon support
 * - Optional action button with permission checking
 * - RTL-compatible
 * - Luxury theme styling
 */
const meta: Meta<typeof EmptyState> = {
  title: 'Common/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A versatile empty state component for displaying when no data is available, with optional actions and permission-aware buttons.',
      },
    },
  },
  argTypes: {
    icon: {
      control: false,
      description: 'Custom icon or illustration',
    },
    title: {
      control: 'text',
      description: 'Title text',
    },
    description: {
      control: 'text',
      description: 'Description text',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    action: {
      control: 'object',
      description: 'Action button configuration',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[500px] border border-dashed border-stone-200 rounded-lg">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

// ===========================================
// Default States
// ===========================================

/**
 * Default empty state with title only
 */
export const Default: Story = {
  args: {
    title: 'No data available',
  },
};

/**
 * Empty state with description
 */
export const WithDescription: Story = {
  args: {
    title: 'No items found',
    description:
      'There are no items matching your criteria. Try adjusting your filters or add new items.',
  },
};

/**
 * Empty state with custom icon
 */
export const WithCustomIcon: Story = {
  args: {
    icon: <ShoppingCartOutlined />,
    title: 'Your cart is empty',
    description: 'Add some jewelry items to your cart to see them here.',
  },
};

// ===========================================
// Size Variants
// ===========================================

/**
 * Small size - for compact spaces like table rows
 */
export const SizeSmall: Story = {
  args: {
    size: 'sm',
    title: 'No results',
    description: 'Try different search terms',
  },
};

/**
 * Medium size (default) - for general use
 */
export const SizeMedium: Story = {
  args: {
    size: 'md',
    title: 'No orders yet',
    description: 'When customers place orders, they will appear here.',
  },
};

/**
 * Large size - for prominent empty states
 */
export const SizeLarge: Story = {
  args: {
    size: 'lg',
    title: 'Welcome to Aymur',
    description:
      'Get started by adding your first inventory item or importing your existing catalog.',
  },
};

/**
 * All sizes comparison
 */
export const SizeComparison: Story = {
  decorators: [
    (Story) => (
      <div className="w-[800px] space-y-8">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="space-y-8">
      <div className="border border-dashed border-stone-200 rounded-lg">
        <EmptyState size="sm" title="Small Size" description="Compact for tables" />
      </div>
      <div className="border border-dashed border-stone-200 rounded-lg">
        <EmptyState size="md" title="Medium Size" description="Default for general use" />
      </div>
      <div className="border border-dashed border-stone-200 rounded-lg">
        <EmptyState size="lg" title="Large Size" description="Prominent display for onboarding" />
      </div>
    </div>
  ),
};

// ===========================================
// With Action Button
// ===========================================

/**
 * Empty state with primary action button
 */
export const WithAction: Story = {
  args: {
    icon: <GoldOutlined />,
    title: 'No jewelry items',
    description: 'Start building your inventory by adding your first item.',
    action: {
      label: 'Add Item',
      onClick: () => console.log('Add item clicked'),
      type: 'primary',
      icon: <PlusOutlined />,
    },
  },
};

/**
 * Empty state with default action button
 */
export const WithDefaultAction: Story = {
  args: {
    icon: <SearchOutlined />,
    title: 'No search results',
    description: 'We could not find any items matching your search.',
    action: {
      label: 'Clear Search',
      onClick: () => console.log('Clear clicked'),
      type: 'default',
    },
  },
};

/**
 * Empty state with dashed action button
 */
export const WithDashedAction: Story = {
  args: {
    icon: <UploadOutlined />,
    title: 'No documents',
    description: 'Upload documents to store them securely.',
    action: {
      label: 'Upload Document',
      onClick: () => console.log('Upload clicked'),
      type: 'dashed',
      icon: <UploadOutlined />,
    },
  },
};

// ===========================================
// Permission-Aware Actions
// ===========================================

/**
 * Action hidden due to missing permission
 */
export const ActionHiddenNoPermission: Story = {
  args: {
    icon: <GoldOutlined />,
    title: 'No inventory items',
    description: 'You do not have permission to add items.',
    action: {
      label: 'Add Item',
      onClick: () => console.log('Add item'),
      permission: 'inventory.create',
    },
  },
  parameters: {
    permissions: {
      denied: ['inventory.create'],
    },
    docs: {
      description: {
        story: 'The action button is hidden because the user lacks the required permission.',
      },
    },
  },
};

/**
 * Action visible with permission
 */
export const ActionVisibleWithPermission: Story = {
  args: {
    icon: <GoldOutlined />,
    title: 'No inventory items',
    description: 'Start adding items to your inventory.',
    action: {
      label: 'Add Item',
      onClick: () => console.log('Add item'),
      permission: 'inventory.create',
      type: 'primary',
      icon: <PlusOutlined />,
    },
  },
  parameters: {
    permissions: {
      hasPermission: true,
    },
    docs: {
      description: {
        story: 'The action button is visible because the user has the required permission.',
      },
    },
  },
};

// ===========================================
// With Custom Children
// ===========================================

/**
 * Empty state with custom children instead of action
 */
export const WithChildren: Story = {
  args: {
    icon: <SettingOutlined />,
    title: 'Configuration Required',
    description: 'Please complete the setup before using this feature.',
  },
  render: (args) => (
    <EmptyState {...args}>
      <div className="flex gap-2">
        <button className="px-4 py-2 text-sm bg-amber-500 text-white rounded-md hover:bg-amber-600">
          Configure Now
        </button>
        <button className="px-4 py-2 text-sm border border-stone-300 rounded-md hover:bg-stone-50">
          Learn More
        </button>
      </div>
    </EmptyState>
  ),
};

// ===========================================
// Different Icon Examples
// ===========================================

/**
 * Inbox icon (default)
 */
export const IconInbox: Story = {
  args: {
    icon: <InboxOutlined />,
    title: 'Inbox is empty',
    description: 'New messages will appear here.',
  },
};

/**
 * User icon for customers
 */
export const IconUser: Story = {
  args: {
    icon: <UserOutlined />,
    title: 'No customers yet',
    description: 'Your customer list is empty. Add your first customer to get started.',
    action: {
      label: 'Add Customer',
      onClick: () => {},
      type: 'primary',
      icon: <PlusOutlined />,
    },
  },
};

/**
 * File icon for documents
 */
export const IconFile: Story = {
  args: {
    icon: <FileOutlined />,
    title: 'No documents',
    description: 'No documents have been uploaded yet.',
    action: {
      label: 'Upload Document',
      onClick: () => {},
      type: 'dashed',
      icon: <UploadOutlined />,
    },
  },
};

/**
 * Calendar icon for events
 */
export const IconCalendar: Story = {
  args: {
    icon: <CalendarOutlined />,
    title: 'No upcoming events',
    description: 'You have no scheduled appointments or reminders.',
    action: {
      label: 'Schedule Event',
      onClick: () => {},
      type: 'primary',
      icon: <PlusOutlined />,
    },
  },
};

/**
 * Bell icon for notifications
 */
export const IconNotification: Story = {
  args: {
    icon: <BellOutlined />,
    title: 'All caught up!',
    description: 'You have no new notifications.',
  },
};

// ===========================================
// Pre-configured Variants
// ===========================================

/**
 * No search results variant
 */
export const NoSearchResultsVariant: Story = {
  render: () => (
    <NoSearchResults searchTerm="diamond ring" onClear={() => console.log('Clear search')} />
  ),
};

/**
 * No search results without clear action
 */
export const NoSearchResultsNoAction: Story = {
  render: () => <NoSearchResults searchTerm="gold necklace" />,
};

/**
 * No data variant with action
 */
export const NoDataVariant: Story = {
  render: () => (
    <NoData
      title="No orders found"
      description="When customers place orders, they will appear here."
      actionLabel="Create Order"
      onAction={() => console.log('Create order')}
      actionPermission="orders.create"
    />
  ),
};

/**
 * No data variant without action
 */
export const NoDataSimple: Story = {
  render: () => (
    <NoData
      title="No items in this category"
      description="Items you add to this category will appear here."
    />
  ),
};

// ===========================================
// Jewelry Business Specific
// ===========================================

/**
 * Empty inventory
 */
export const EmptyInventory: Story = {
  args: {
    icon: <GoldOutlined />,
    title: 'No inventory items',
    description:
      'Your inventory is empty. Start by adding jewelry items or importing from a spreadsheet.',
    action: {
      label: 'Add First Item',
      onClick: () => {},
      type: 'primary',
      icon: <PlusOutlined />,
    },
  },
};

/**
 * Empty orders
 */
export const EmptyOrders: Story = {
  args: {
    icon: <ShoppingCartOutlined />,
    title: 'No orders yet',
    description: 'When customers make purchases, their orders will appear here.',
  },
};

/**
 * Filtered results empty
 */
export const FilteredEmpty: Story = {
  args: {
    icon: <FilterOutlined />,
    title: 'No matching items',
    description: 'No items match your current filters. Try adjusting your criteria.',
    action: {
      label: 'Clear Filters',
      onClick: () => {},
      type: 'default',
    },
  },
};

/**
 * Empty workshop queue
 */
export const EmptyWorkshop: Story = {
  args: {
    icon: <SettingOutlined />,
    title: 'Workshop queue is empty',
    description: 'No items are currently in the workshop for repair or customization.',
  },
};

// ===========================================
// Context-specific Examples
// ===========================================

/**
 * In a card container
 */
export const InCard: Story = {
  decorators: [
    (Story) => (
      <div className="w-[500px] bg-white border border-stone-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-stone-200">
          <h3 className="font-medium">Recent Orders</h3>
        </div>
        <Story />
      </div>
    ),
  ],
  args: {
    size: 'sm',
    title: 'No recent orders',
    description: 'Orders from the last 7 days will appear here.',
  },
};

/**
 * In a table context
 */
export const InTable: Story = {
  decorators: [
    (Story) => (
      <div className="w-[700px]">
        <table className="w-full">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-stone-600">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-stone-600">Category</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-stone-600">Price</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-stone-600">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="border-b border-stone-100">
                <Story />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  ],
  args: {
    size: 'sm',
    icon: <SearchOutlined />,
    title: 'No items found',
    description: 'Try adjusting your search or filters.',
  },
};

// ===========================================
// RTL Support
// ===========================================

/**
 * RTL layout demonstration
 */
export const RTLSupport: Story = {
  args: {
    icon: <GoldOutlined />,
    title: 'No items found',
    description: 'Toggle RTL in the toolbar to see the component adapt its layout.',
    action: {
      label: 'Add Item',
      onClick: () => {},
      type: 'primary',
      icon: <PlusOutlined />,
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Toggle RTL in the toolbar to see the empty state adapt for Arabic and other RTL languages.',
      },
    },
  },
};
