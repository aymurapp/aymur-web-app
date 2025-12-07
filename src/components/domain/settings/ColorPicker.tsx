'use client';

/**
 * ColorPicker Component
 *
 * A wrapper around Ant Design ColorPicker with presets for jewelry/gemstone colors.
 * Includes common stone colors as presets for easy selection.
 *
 * Features:
 * - Ant Design ColorPicker integration
 * - Preset colors for gemstones
 * - Custom color input
 * - Color preview
 * - RTL support
 *
 * @module components/domain/settings/ColorPicker
 */

import React from 'react';

import { ColorPicker as AntColorPicker, Input, Space, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';

import type { Color } from 'antd/es/color-picker';

const { Text } = Typography;

// =============================================================================
// PRESET COLORS
// =============================================================================

/**
 * Common gemstone colors organized by category
 */
export const STONE_COLOR_PRESETS = {
  precious: [
    { color: '#E31837', label: 'Ruby Red' },
    { color: '#0F52BA', label: 'Sapphire Blue' },
    { color: '#50C878', label: 'Emerald Green' },
    { color: '#B9F2FF', label: 'Diamond (White)' },
  ],
  'semi-precious': [
    { color: '#9966CC', label: 'Amethyst Purple' },
    { color: '#40E0D0', label: 'Turquoise' },
    { color: '#FFD700', label: 'Citrine Gold' },
    { color: '#FFC0CB', label: 'Rose Quartz' },
    { color: '#00CED1', label: 'Aquamarine' },
    { color: '#F4A460', label: 'Topaz' },
    { color: '#FF7F50', label: 'Coral' },
    { color: '#8B0000', label: 'Garnet' },
  ],
  metals: [
    { color: '#FFD700', label: 'Gold' },
    { color: '#C0C0C0', label: 'Silver' },
    { color: '#E5E4E2', label: 'Platinum' },
    { color: '#B87333', label: 'Copper' },
    { color: '#F5F5DC', label: 'White Gold' },
    { color: '#FFC0CB', label: 'Rose Gold' },
  ],
  basic: [
    { color: '#FFFFFF', label: 'White' },
    { color: '#000000', label: 'Black' },
    { color: '#808080', label: 'Gray' },
    { color: '#8B4513', label: 'Brown' },
    { color: '#228B22', label: 'Green' },
    { color: '#4169E1', label: 'Blue' },
    { color: '#DC143C', label: 'Red' },
    { color: '#FF8C00', label: 'Orange' },
    { color: '#FFD700', label: 'Yellow' },
    { color: '#EE82EE', label: 'Violet' },
  ],
};

// Flatten presets for Ant Design ColorPicker
export const ALL_STONE_PRESETS = [
  ...STONE_COLOR_PRESETS.precious,
  ...STONE_COLOR_PRESETS['semi-precious'],
  ...STONE_COLOR_PRESETS.metals,
  ...STONE_COLOR_PRESETS.basic,
].map((p) => p.color);

// =============================================================================
// TYPES
// =============================================================================

export interface StoneColorPickerProps {
  /** Current color value (hex string) */
  value?: string;
  /** Change handler */
  onChange?: (color: string) => void;
  /** Placeholder when no color selected */
  placeholder?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Show input field for manual hex entry */
  showInput?: boolean;
  /** Size of the color swatch */
  size?: 'small' | 'default' | 'large';
  /** Additional class name */
  className?: string;
  /** Show alpha/transparency picker */
  showAlpha?: boolean;
  /** Format to use */
  format?: 'hex' | 'rgb' | 'hsb';
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * StoneColorPicker - Color picker with gemstone presets
 */
export function StoneColorPicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  showInput = true,
  size = 'default',
  className,
  showAlpha = false,
  format = 'hex',
}: StoneColorPickerProps): React.JSX.Element {
  const t = useTranslations('common');
  const tSettings = useTranslations('settings');

  // Handle color change from picker
  const handleColorChange = (color: Color) => {
    const hexValue = color.toHexString();
    onChange?.(hexValue);
  };

  // Handle manual input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Basic validation for hex color
    if (/^#?[0-9A-Fa-f]{0,6}$/.test(inputValue.replace('#', ''))) {
      const normalized = inputValue.startsWith('#') ? inputValue : `#${inputValue}`;
      onChange?.(normalized.toUpperCase());
    }
  };

  // Build presets for Ant Design ColorPicker
  const presets = [
    {
      label: tSettings('catalog.preciousStones'),
      colors: STONE_COLOR_PRESETS.precious.map((p) => p.color),
    },
    {
      label: tSettings('catalog.semiPreciousStones'),
      colors: STONE_COLOR_PRESETS['semi-precious'].map((p) => p.color),
    },
    {
      label: tSettings('catalog.metals'),
      colors: STONE_COLOR_PRESETS.metals.map((p) => p.color),
    },
    {
      label: t('labels.other'),
      colors: STONE_COLOR_PRESETS.basic.map((p) => p.color),
    },
  ];

  return (
    <Space className={cn('stone-color-picker', className)}>
      <AntColorPicker
        value={value}
        onChange={handleColorChange}
        disabled={disabled}
        showText={false}
        presets={presets}
        disabledAlpha={!showAlpha}
        format={format}
        size={size === 'large' ? 'large' : size === 'small' ? 'small' : 'middle'}
      />

      {showInput && (
        <Input
          value={value?.toUpperCase() || ''}
          onChange={handleInputChange}
          placeholder={placeholder || '#FFFFFF'}
          disabled={disabled}
          maxLength={7}
          className="w-24 font-mono text-sm"
          size={size === 'large' ? 'large' : size === 'small' ? 'small' : 'middle'}
        />
      )}
    </Space>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Color swatch display component
 */
export function ColorSwatch({
  color,
  size = 'default',
  showBorder = true,
  className,
  label,
}: {
  color: string | null | undefined;
  size?: 'small' | 'default' | 'large';
  showBorder?: boolean;
  className?: string;
  label?: string;
}): React.JSX.Element {
  const sizeClasses = {
    small: 'w-4 h-4',
    default: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  if (!color) {
    return (
      <div
        className={cn(
          'rounded-full bg-stone-200 flex items-center justify-center',
          sizeClasses[size],
          showBorder && 'border border-stone-300',
          className
        )}
        title="No color"
      >
        <span className="text-xs text-stone-400">-</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'rounded-full shadow-sm',
          sizeClasses[size],
          showBorder && 'border-2 border-white ring-1 ring-stone-200',
          className
        )}
        style={{ backgroundColor: color }}
        title={label || color}
      />
      {label && <Text className="text-sm text-stone-600">{label}</Text>}
    </div>
  );
}

/**
 * Color with label display
 */
export function ColorDisplay({
  color,
  label,
  className,
}: {
  color: string | null | undefined;
  label?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <ColorSwatch color={color} size="small" />
      <Text className="text-sm font-mono text-stone-600">{color || '-'}</Text>
      {label && (
        <Text type="secondary" className="text-xs">
          ({label})
        </Text>
      )}
    </div>
  );
}

export default StoneColorPicker;
