'use client';

/**
 * IconSelector Component
 *
 * A component for selecting icons for categories.
 * Uses Ant Design icons with a searchable dropdown.
 *
 * Features:
 * - Grid display of available icons
 * - Search/filter functionality
 * - Preview of selected icon
 * - Common jewelry-related icons
 *
 * @module components/domain/settings/IconSelector
 */

import React, { useState, useMemo } from 'react';

import {
  // Jewelry related
  CrownOutlined,
  StarOutlined,
  StarFilled,
  HeartOutlined,
  HeartFilled,
  GiftOutlined,
  TrophyOutlined,
  FireOutlined,
  ThunderboltOutlined,
  // Shape/item related
  AppstoreOutlined,
  BorderOutlined,
  RadiusSettingOutlined,
  StopOutlined,
  // Commerce
  ShoppingOutlined,
  ShopOutlined,
  DollarOutlined,
  GoldOutlined,
  // Status/quality
  SafetyCertificateOutlined,
  VerifiedOutlined,
  // Misc useful
  TagOutlined,
  TagsOutlined,
  BulbOutlined,
  RocketOutlined,
  // Default
  QuestionOutlined,
} from '@ant-design/icons';
import { Popover, Input, Button, Tooltip, Empty } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';

// =============================================================================
// ICON REGISTRY
// =============================================================================

/**
 * Available icons for category selection
 */
export const CATEGORY_ICONS = {
  // Jewelry items
  crown: { icon: CrownOutlined, label: 'Crown' },
  star: { icon: StarOutlined, label: 'Star' },
  'star-filled': { icon: StarFilled, label: 'Star Filled' },
  heart: { icon: HeartOutlined, label: 'Heart' },
  'heart-filled': { icon: HeartFilled, label: 'Heart Filled' },
  gift: { icon: GiftOutlined, label: 'Gift' },
  trophy: { icon: TrophyOutlined, label: 'Trophy' },
  fire: { icon: FireOutlined, label: 'Fire' },
  thunderbolt: { icon: ThunderboltOutlined, label: 'Thunderbolt' },
  // Shapes
  appstore: { icon: AppstoreOutlined, label: 'Grid' },
  border: { icon: BorderOutlined, label: 'Square' },
  radius: { icon: RadiusSettingOutlined, label: 'Radius' },
  stop: { icon: StopOutlined, label: 'Circle' },
  // Commerce
  shopping: { icon: ShoppingOutlined, label: 'Shopping' },
  shop: { icon: ShopOutlined, label: 'Shop' },
  dollar: { icon: DollarOutlined, label: 'Dollar' },
  gold: { icon: GoldOutlined, label: 'Gold' },
  // Quality
  certificate: { icon: SafetyCertificateOutlined, label: 'Certificate' },
  verified: { icon: VerifiedOutlined, label: 'Verified' },
  // Tags
  tag: { icon: TagOutlined, label: 'Tag' },
  tags: { icon: TagsOutlined, label: 'Tags' },
  // Misc
  bulb: { icon: BulbOutlined, label: 'Bulb' },
  rocket: { icon: RocketOutlined, label: 'Rocket' },
} as const;

export type IconKey = keyof typeof CATEGORY_ICONS;

// =============================================================================
// TYPES
// =============================================================================

export interface IconSelectorProps {
  /** Currently selected icon key */
  value?: string | null;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Size of the icon preview */
  size?: 'small' | 'default' | 'large';
  /** Additional class name */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * IconSelector - Icon picker for categories
 */
export function IconSelector({
  value,
  onChange,
  placeholder: _placeholder,
  disabled = false,
  size = 'default',
  className,
}: IconSelectorProps): React.JSX.Element {
  const t = useTranslations('common');
  const tSettings = useTranslations('settings');

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!search) {
      return Object.entries(CATEGORY_ICONS);
    }

    const searchLower = search.toLowerCase();
    return Object.entries(CATEGORY_ICONS).filter(
      ([key, { label }]) =>
        key.toLowerCase().includes(searchLower) || label.toLowerCase().includes(searchLower)
    );
  }, [search]);

  // Get the selected icon component
  const selectedIcon = useMemo(() => {
    if (!value) {
      return null;
    }
    const iconEntry = CATEGORY_ICONS[value as IconKey];
    return iconEntry ? iconEntry.icon : null;
  }, [value]);

  // Size classes
  const sizeClasses = {
    small: 'text-base',
    default: 'text-xl',
    large: 'text-2xl',
  };

  const buttonSizeClasses = {
    small: 'h-8 w-8',
    default: 'h-10 w-10',
    large: 'h-12 w-12',
  };

  // Handle icon selection
  const handleSelect = (iconKey: string) => {
    onChange?.(iconKey);
    setOpen(false);
    setSearch('');
  };

  // Icon grid content
  const iconGridContent = (
    <div className="w-72">
      {/* Search input */}
      <Input
        placeholder={t('actions.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        allowClear
        className="mb-3"
        autoFocus
      />

      {/* Icon grid */}
      {filteredIcons.length > 0 ? (
        <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
          {filteredIcons.map(([key, { icon: Icon, label }]) => (
            <Tooltip key={key} title={label}>
              <button
                type="button"
                onClick={() => handleSelect(key)}
                className={cn(
                  'p-2 rounded-md hover:bg-amber-100 transition-colors',
                  'flex items-center justify-center',
                  value === key && 'bg-amber-200 ring-2 ring-amber-500'
                )}
              >
                <Icon className="text-lg" />
              </button>
            </Tooltip>
          ))}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('messages.noResults')}
          className="py-4"
        />
      )}

      {/* Clear selection */}
      {value && (
        <div className="mt-3 pt-3 border-t border-stone-200">
          <Button
            type="link"
            size="small"
            onClick={() => {
              onChange?.('');
              setOpen(false);
            }}
            className="text-stone-500 p-0"
          >
            {t('actions.clear')}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Popover
      content={iconGridContent}
      title={tSettings('catalog.selectIcon')}
      trigger="click"
      open={open && !disabled}
      onOpenChange={(visible) => {
        setOpen(visible);
        if (!visible) {
          setSearch('');
        }
      }}
      placement="bottomLeft"
    >
      <Button
        disabled={disabled}
        className={cn(
          'flex items-center justify-center rounded-lg border-2 border-dashed',
          'border-stone-300 hover:border-amber-400 transition-colors',
          selectedIcon ? 'bg-amber-50 border-solid border-amber-400' : '',
          buttonSizeClasses[size],
          className
        )}
      >
        {selectedIcon ? (
          React.createElement(selectedIcon, {
            className: cn(sizeClasses[size], 'text-amber-600'),
          })
        ) : (
          <QuestionOutlined className={cn(sizeClasses[size], 'text-stone-400')} />
        )}
      </Button>
    </Popover>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Display an icon by key
 */
export function CategoryIcon({
  iconKey,
  className,
  size = 'default',
}: {
  iconKey: string | null | undefined;
  className?: string;
  size?: 'small' | 'default' | 'large';
}): React.JSX.Element {
  const sizeClasses = {
    small: 'text-sm',
    default: 'text-base',
    large: 'text-lg',
  };

  if (!iconKey) {
    return <QuestionOutlined className={cn(sizeClasses[size], 'text-stone-400', className)} />;
  }

  const iconEntry = CATEGORY_ICONS[iconKey as IconKey];
  if (!iconEntry) {
    return <QuestionOutlined className={cn(sizeClasses[size], 'text-stone-400', className)} />;
  }

  const Icon = iconEntry.icon;
  return <Icon className={cn(sizeClasses[size], className)} />;
}

export default IconSelector;
