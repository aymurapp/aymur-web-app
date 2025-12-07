import React from 'react';

import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  SearchOutlined,
  DownloadOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';

import { Button } from '@/components/ui/Button';

import type { Meta, StoryObj } from '@storybook/react';

/**
 * Button Component Stories
 *
 * A permission-aware button wrapper around Ant Design Button.
 * Supports optional permission checking, gold-themed hover effects,
 * and all standard Ant Design Button props.
 *
 * ## Features
 * - Permission-based rendering (hide or disable when no permission)
 * - Gold-themed hover effects matching the Aymur luxury aesthetic
 * - Full RTL support
 * - All Ant Design Button variants and sizes
 */
const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A permission-aware button component that wraps Ant Design Button with gold-themed styling and optional permission checking.',
      },
    },
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['primary', 'default', 'dashed', 'link', 'text'],
      description: 'Button type/variant',
      table: {
        defaultValue: { summary: 'default' },
      },
    },
    size: {
      control: 'select',
      options: ['small', 'middle', 'large'],
      description: 'Button size',
      table: {
        defaultValue: { summary: 'middle' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    loading: {
      control: 'boolean',
      description: 'Whether the button is in loading state',
    },
    danger: {
      control: 'boolean',
      description: 'Whether the button is a danger button',
    },
    ghost: {
      control: 'boolean',
      description: 'Whether the button has transparent background',
    },
    block: {
      control: 'boolean',
      description: 'Whether the button takes full width',
    },
    shape: {
      control: 'select',
      options: ['default', 'circle', 'round'],
      description: 'Button shape',
    },
    permission: {
      control: 'text',
      description: 'Permission required to render the button',
    },
    showDisabledOnNoPermission: {
      control: 'boolean',
      description: 'Show disabled button instead of hiding when no permission',
    },
    children: {
      control: 'text',
      description: 'Button content',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// ===========================================
// Default States
// ===========================================

/**
 * The default button appearance
 */
export const Default: Story = {
  args: {
    children: 'Button',
  },
};

/**
 * Primary button - used for main actions
 */
export const Primary: Story = {
  args: {
    type: 'primary',
    children: 'Primary Button',
  },
};

/**
 * Dashed button - used for secondary actions
 */
export const Dashed: Story = {
  args: {
    type: 'dashed',
    children: 'Dashed Button',
  },
};

/**
 * Link button - used for navigation-like actions
 */
export const Link: Story = {
  args: {
    type: 'link',
    children: 'Link Button',
  },
};

/**
 * Text button - minimal styling
 */
export const Text: Story = {
  args: {
    type: 'text',
    children: 'Text Button',
  },
};

// ===========================================
// Loading States
// ===========================================

/**
 * Button in loading state - shows spinner
 */
export const Loading: Story = {
  args: {
    type: 'primary',
    loading: true,
    children: 'Loading',
  },
};

/**
 * Default button in loading state
 */
export const LoadingDefault: Story = {
  args: {
    loading: true,
    children: 'Processing...',
  },
};

/**
 * Loading with icon
 */
export const LoadingWithIcon: Story = {
  args: {
    type: 'primary',
    loading: true,
    icon: <SaveOutlined />,
    children: 'Saving',
  },
};

// ===========================================
// Disabled States
// ===========================================

/**
 * Disabled button
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

/**
 * Disabled primary button
 */
export const DisabledPrimary: Story = {
  args: {
    type: 'primary',
    disabled: true,
    children: 'Disabled Primary',
  },
};

// ===========================================
// Sizes
// ===========================================

/**
 * Small button size
 */
export const Small: Story = {
  args: {
    size: 'small',
    children: 'Small Button',
  },
};

/**
 * Middle (default) button size
 */
export const Middle: Story = {
  args: {
    size: 'middle',
    children: 'Middle Button',
  },
};

/**
 * Large button size
 */
export const Large: Story = {
  args: {
    size: 'large',
    children: 'Large Button',
  },
};

/**
 * All sizes comparison
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="small">Small</Button>
      <Button size="middle">Middle</Button>
      <Button size="large">Large</Button>
    </div>
  ),
};

// ===========================================
// With Icons
// ===========================================

/**
 * Button with icon on the left (start)
 */
export const WithIconStart: Story = {
  args: {
    type: 'primary',
    icon: <PlusOutlined />,
    children: 'Add Item',
  },
};

/**
 * Button with search icon
 */
export const WithSearchIcon: Story = {
  args: {
    icon: <SearchOutlined />,
    children: 'Search',
  },
};

/**
 * Edit button with icon
 */
export const EditButton: Story = {
  args: {
    icon: <EditOutlined />,
    children: 'Edit',
  },
};

/**
 * Delete button with danger styling
 */
export const DeleteButton: Story = {
  args: {
    danger: true,
    icon: <DeleteOutlined />,
    children: 'Delete',
  },
};

/**
 * Download button
 */
export const DownloadButton: Story = {
  args: {
    icon: <DownloadOutlined />,
    children: 'Download Report',
  },
};

/**
 * Icon only button (circle)
 */
export const IconOnly: Story = {
  args: {
    type: 'primary',
    shape: 'circle',
    icon: <PlusOutlined />,
  },
};

/**
 * Icon only button (default shape)
 */
export const IconOnlyDefault: Story = {
  args: {
    icon: <SearchOutlined />,
    'aria-label': 'Search',
  },
};

// ===========================================
// Shapes
// ===========================================

/**
 * Round button shape
 */
export const Round: Story = {
  args: {
    type: 'primary',
    shape: 'round',
    children: 'Round Button',
  },
};

/**
 * Circle button shape
 */
export const Circle: Story = {
  args: {
    type: 'primary',
    shape: 'circle',
    icon: <ShoppingCartOutlined />,
  },
};

// ===========================================
// Special Variants
// ===========================================

/**
 * Danger button for destructive actions
 */
export const Danger: Story = {
  args: {
    danger: true,
    children: 'Danger Button',
  },
};

/**
 * Danger primary button
 */
export const DangerPrimary: Story = {
  args: {
    type: 'primary',
    danger: true,
    children: 'Delete Item',
  },
};

/**
 * Ghost button - transparent background
 */
export const Ghost: Story = {
  args: {
    ghost: true,
    children: 'Ghost Button',
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-stone-800 p-8 rounded-lg">
        <Story />
      </div>
    ),
  ],
};

/**
 * Block button - full width
 */
export const Block: Story = {
  args: {
    type: 'primary',
    block: true,
    children: 'Full Width Button',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

// ===========================================
// Permission-Aware States
// ===========================================

/**
 * Button hidden when no permission (default behavior)
 */
export const NoPermissionHidden: Story = {
  args: {
    type: 'primary',
    permission: 'orders.create',
    children: 'Create Order',
  },
  parameters: {
    permissions: {
      denied: ['orders.create'],
    },
    docs: {
      description: {
        story: 'This button is hidden because the user lacks the required permission.',
      },
    },
  },
};

/**
 * Button disabled when no permission (with tooltip)
 */
export const NoPermissionDisabled: Story = {
  args: {
    type: 'primary',
    permission: 'orders.create',
    showDisabledOnNoPermission: true,
    noPermissionTooltip: 'You need permission to create orders',
    children: 'Create Order',
  },
  parameters: {
    permissions: {
      denied: ['orders.create'],
    },
    docs: {
      description: {
        story: 'This button is disabled instead of hidden, showing a tooltip when hovered.',
      },
    },
  },
};

/**
 * Button with permission granted
 */
export const WithPermissionGranted: Story = {
  args: {
    type: 'primary',
    permission: 'orders.create',
    children: 'Create Order',
  },
  parameters: {
    permissions: {
      hasPermission: true,
    },
    docs: {
      description: {
        story: 'This button renders normally because the user has the required permission.',
      },
    },
  },
};

// ===========================================
// Button Groups & Combinations
// ===========================================

/**
 * All button types comparison
 */
export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button type="primary">Primary</Button>
      <Button>Default</Button>
      <Button type="dashed">Dashed</Button>
      <Button type="text">Text</Button>
      <Button type="link">Link</Button>
    </div>
  ),
};

/**
 * Action buttons group (common pattern)
 */
export const ActionButtonsGroup: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Button type="primary" icon={<SaveOutlined />}>
        Save
      </Button>
      <Button>Cancel</Button>
      <Button danger icon={<DeleteOutlined />}>
        Delete
      </Button>
    </div>
  ),
};

/**
 * CRUD action buttons
 */
export const CrudActions: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button type="primary" icon={<PlusOutlined />}>
          Create
        </Button>
        <Button icon={<EditOutlined />}>Edit</Button>
        <Button danger icon={<DeleteOutlined />}>
          Delete
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button type="primary" size="small" icon={<PlusOutlined />}>
          Create
        </Button>
        <Button size="small" icon={<EditOutlined />}>
          Edit
        </Button>
        <Button danger size="small" icon={<DeleteOutlined />}>
          Delete
        </Button>
      </div>
    </div>
  ),
};

// ===========================================
// RTL Support Demo
// ===========================================

/**
 * RTL layout demonstration
 * Toggle RTL in the toolbar to see the button adapt
 */
export const RTLSupport: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-500">
        Toggle RTL in the toolbar to see buttons adapt their layout
      </p>
      <div className="flex items-center gap-4">
        <Button type="primary" icon={<PlusOutlined />}>
          Add Item
        </Button>
        <Button icon={<EditOutlined />}>Edit</Button>
        <Button type="dashed" icon={<SearchOutlined />}>
          Search
        </Button>
      </div>
    </div>
  ),
};
