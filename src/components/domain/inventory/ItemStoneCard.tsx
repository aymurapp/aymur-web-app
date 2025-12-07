'use client';

/**
 * ItemStoneCard Component
 *
 * Displays individual stone details attached to an inventory item.
 * Shows stone type with color indicator, carat weight, quality grades,
 * setting/cut types, quantity, and certificate information.
 *
 * @module components/domain/inventory/ItemStoneCard
 */

import React from 'react';

import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Card, Typography, Tag, Space, Tooltip, Popconfirm } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import type { StoneType } from '@/lib/hooks/data/useStones';
import { cn } from '@/lib/utils/cn';

const { Text, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Item stone data from database
 */
export interface ItemStoneData {
  id_item_stone: string;
  id_shop: string;
  id_item: string;
  id_stone_type: string;
  weight_carats: number;
  stone_count: number | null;
  position: string | null;
  clarity: string | null;
  color: string | null;
  cut: string | null;
  estimated_value: number | null;
  notes: string | null;
  created_at: string;
  // Joined data
  stone_type?: StoneType | null;
}

/**
 * Props for ItemStoneCard component
 */
export interface ItemStoneCardProps {
  /**
   * Stone data to display
   */
  stone: ItemStoneData;

  /**
   * Callback when edit button is clicked
   */
  onEdit?: (stone: ItemStoneData) => void;

  /**
   * Callback when delete button is clicked
   */
  onDelete?: (stoneId: string) => void;

  /**
   * Whether the card is in read-only mode
   */
  readOnly?: boolean;

  /**
   * Whether delete is in progress
   */
  isDeleting?: boolean;

  /**
   * Additional class name
   */
  className?: string;

  /**
   * Compact mode for use in drawers
   */
  compact?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Stone category colors for visual indicators
 */
const STONE_CATEGORY_COLORS: Record<string, string> = {
  precious: '#d4af37', // Gold
  'semi-precious': '#9966cc', // Amethyst purple
  synthetic: '#7dd3fc', // Light blue
  other: '#a1a1aa', // Gray
};

/**
 * Stone type color indicators (for common stones)
 */
const STONE_TYPE_COLORS: Record<string, string> = {
  diamond: '#e5e7eb', // Near colorless
  ruby: '#dc2626', // Red
  sapphire: '#2563eb', // Blue
  emerald: '#16a34a', // Green
  pearl: '#fef3c7', // Cream
  opal: '#e0e7ff', // Opal-like
  amethyst: '#9333ea', // Purple
  topaz: '#fcd34d', // Yellow
  turquoise: '#06b6d4', // Cyan
  aquamarine: '#67e8f9', // Light cyan
  tanzanite: '#6366f1', // Indigo
  garnet: '#991b1b', // Dark red
  peridot: '#84cc16', // Lime
  citrine: '#f97316', // Orange
  morganite: '#fda4af', // Pink
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get color indicator for a stone based on type or description
 * Note: stone_types table doesn't have a category field in the database schema
 */
function getStoneColor(stone: ItemStoneData): string {
  const stoneName = stone.stone_type?.stone_name?.toLowerCase() || '';
  const description = stone.stone_type?.description?.toLowerCase() || '';

  // Check specific stone type first
  for (const [type, color] of Object.entries(STONE_TYPE_COLORS)) {
    if (stoneName.includes(type)) {
      return color;
    }
  }

  const defaultColor = '#a1a1aa'; // stone-400 gray as fallback

  // Try to infer category from description or stone name
  // Common precious stones
  if (
    stoneName.includes('diamond') ||
    stoneName.includes('ruby') ||
    stoneName.includes('sapphire') ||
    stoneName.includes('emerald')
  ) {
    return STONE_CATEGORY_COLORS.precious ?? defaultColor;
  }

  // Check description for category hints
  if (description.includes('precious')) {
    return STONE_CATEGORY_COLORS.precious ?? defaultColor;
  }
  if (description.includes('semi-precious') || description.includes('semiprecious')) {
    return STONE_CATEGORY_COLORS['semi-precious'] ?? defaultColor;
  }
  if (description.includes('synthetic') || description.includes('lab')) {
    return STONE_CATEGORY_COLORS.synthetic ?? defaultColor;
  }

  // Fall back to default color
  return STONE_CATEGORY_COLORS.other ?? defaultColor;
}

/**
 * Format carat weight for display
 */
function formatCaratWeight(weight: number): string {
  return weight.toFixed(2);
}

/**
 * Infer stone category from stone name
 * Since stone_types table doesn't have a category field
 */
function inferStoneCategory(stoneName: string): string {
  const lowerName = stoneName.toLowerCase();

  // Precious stones
  if (
    lowerName.includes('diamond') ||
    lowerName.includes('ruby') ||
    lowerName.includes('sapphire') ||
    lowerName.includes('emerald')
  ) {
    return 'precious';
  }

  // Semi-precious stones
  if (
    lowerName.includes('amethyst') ||
    lowerName.includes('topaz') ||
    lowerName.includes('aquamarine') ||
    lowerName.includes('garnet') ||
    lowerName.includes('peridot') ||
    lowerName.includes('citrine') ||
    lowerName.includes('tanzanite') ||
    lowerName.includes('tourmaline') ||
    lowerName.includes('opal') ||
    lowerName.includes('turquoise')
  ) {
    return 'semi-precious';
  }

  // Synthetic/Lab-created
  if (lowerName.includes('synthetic') || lowerName.includes('lab')) {
    return 'synthetic';
  }

  return '';
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ItemStoneCard Component
 *
 * Displays a card with stone details including type, weight, grades,
 * and action buttons for editing/deleting.
 */
export function ItemStoneCard({
  stone,
  onEdit,
  onDelete,
  readOnly = false,
  isDeleting = false,
  className,
  compact = false,
}: ItemStoneCardProps): JSX.Element {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');

  const stoneColor = getStoneColor(stone);
  const stoneName = stone.stone_type?.stone_name || t('stones.title');
  // Infer category from stone name since stone_types table doesn't have a category field
  const stoneCategory = inferStoneCategory(stoneName);
  const totalCarats = stone.weight_carats * (stone.stone_count || 1);

  // Handle edit click
  const handleEdit = (): void => {
    onEdit?.(stone);
  };

  // Handle delete
  const handleDelete = (): void => {
    onDelete?.(stone.id_item_stone);
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors',
          className
        )}
      >
        <div className="flex items-center gap-3">
          {/* Color indicator */}
          <div
            className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0"
            style={{ backgroundColor: stoneColor }}
          />

          {/* Stone info */}
          <div>
            <Text strong className="text-sm">
              {stoneName}
            </Text>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span>
                {formatCaratWeight(stone.weight_carats)} {t('stones.carat')}
              </span>
              {stone.stone_count && stone.stone_count > 1 && <span>x {stone.stone_count}</span>}
              {stone.clarity && <span>{stone.clarity}</span>}
            </div>
          </div>
        </div>

        {/* Actions */}
        {!readOnly && (
          <Space size={4}>
            <Tooltip title={tCommon('actions.edit')}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={handleEdit}
                className="text-stone-500 hover:text-amber-600"
              />
            </Tooltip>
            <Popconfirm
              title={tCommon('messages.confirmDelete')}
              onConfirm={handleDelete}
              okText={tCommon('actions.delete')}
              cancelText={tCommon('actions.cancel')}
              okButtonProps={{ danger: true, loading: isDeleting }}
            >
              <Tooltip title={tCommon('actions.delete')}>
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                  loading={isDeleting}
                  className="text-stone-500 hover:text-red-600"
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        )}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'border border-stone-200 shadow-sm hover:shadow-md transition-shadow',
        className
      )}
      bodyStyle={{ padding: '1rem' }}
    >
      {/* Header with stone type and color indicator */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Color indicator */}
          <div
            className="w-10 h-10 rounded-full border-2 border-white shadow-md flex-shrink-0"
            style={{ backgroundColor: stoneColor }}
          />

          <div>
            <Title level={5} className="!mb-0 !text-base">
              {stoneName}
            </Title>
            {stoneCategory && (
              <Tag color={stoneCategory === 'precious' ? 'gold' : 'default'} className="mt-1">
                {stoneCategory}
              </Tag>
            )}
          </div>
        </div>

        {/* Actions */}
        {!readOnly && (
          <Space>
            <Tooltip title={tCommon('actions.edit')}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={handleEdit}
                className="text-stone-500 hover:text-amber-600"
              />
            </Tooltip>
            <Popconfirm
              title={tCommon('messages.confirmDelete')}
              onConfirm={handleDelete}
              okText={tCommon('actions.delete')}
              cancelText={tCommon('actions.cancel')}
              okButtonProps={{ danger: true, loading: isDeleting }}
            >
              <Tooltip title={tCommon('actions.delete')}>
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                  loading={isDeleting}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        )}
      </div>

      {/* Stone details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
        {/* Carat weight */}
        <div>
          <Text type="secondary" className="text-xs block">
            {t('stones.carat')}
          </Text>
          <Text strong className="text-amber-700">
            {formatCaratWeight(stone.weight_carats)} ct
          </Text>
        </div>

        {/* Quantity */}
        <div>
          <Text type="secondary" className="text-xs block">
            {tCommon('labels.quantity')}
          </Text>
          <Text strong>{stone.stone_count || 1}</Text>
        </div>

        {/* Total carat weight (if multiple stones) */}
        {stone.stone_count && stone.stone_count > 1 && (
          <div className="col-span-2">
            <Text type="secondary" className="text-xs block">
              {tCommon('labels.total')} {t('stones.carat')}
            </Text>
            <Text strong className="text-amber-700">
              {formatCaratWeight(totalCarats)} ct
            </Text>
          </div>
        )}

        {/* Clarity */}
        {stone.clarity && (
          <div>
            <Text type="secondary" className="text-xs block">
              {t('stones.clarity')}
            </Text>
            <Text>{stone.clarity}</Text>
          </div>
        )}

        {/* Color grade */}
        {stone.color && (
          <div>
            <Text type="secondary" className="text-xs block">
              {t('stones.color')}
            </Text>
            <Text>{stone.color}</Text>
          </div>
        )}

        {/* Cut */}
        {stone.cut && (
          <div>
            <Text type="secondary" className="text-xs block">
              {t('stones.cut')}
            </Text>
            <Text>{stone.cut}</Text>
          </div>
        )}

        {/* Position/Setting */}
        {stone.position && (
          <div>
            <Text type="secondary" className="text-xs block">
              Position
            </Text>
            <Text>{stone.position}</Text>
          </div>
        )}

        {/* Estimated value */}
        {stone.estimated_value && stone.estimated_value > 0 && (
          <div className="col-span-2">
            <Text type="secondary" className="text-xs block">
              Estimated Value
            </Text>
            <Text strong className="text-green-700">
              ${stone.estimated_value.toLocaleString()}
            </Text>
          </div>
        )}
      </div>

      {/* Notes */}
      {stone.notes && (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <Text type="secondary" className="text-xs block mb-1">
            {tCommon('labels.notes')}
          </Text>
          <Text className="text-sm text-stone-600">{stone.notes}</Text>
        </div>
      )}
    </Card>
  );
}

/**
 * Skeleton loader for ItemStoneCard
 */
export function ItemStoneCardSkeleton({ compact = false }: { compact?: boolean }): JSX.Element {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 bg-stone-50 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-stone-200" />
        <div className="flex-1">
          <div className="h-4 bg-stone-200 rounded w-24 mb-1" />
          <div className="h-3 bg-stone-200 rounded w-32" />
        </div>
      </div>
    );
  }

  return (
    <Card className="border border-stone-200 animate-pulse" bodyStyle={{ padding: '1rem' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-stone-200" />
        <div>
          <div className="h-5 bg-stone-200 rounded w-32 mb-2" />
          <div className="h-4 bg-stone-200 rounded w-20" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-10 bg-stone-200 rounded" />
        <div className="h-10 bg-stone-200 rounded" />
        <div className="h-10 bg-stone-200 rounded" />
        <div className="h-10 bg-stone-200 rounded" />
      </div>
    </Card>
  );
}

export default ItemStoneCard;
