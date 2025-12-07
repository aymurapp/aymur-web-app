'use client';

/**
 * ItemStonesManager Component
 *
 * Main component for managing stones attached to an inventory item.
 * Provides listing of current stones, add/edit/delete functionality,
 * and displays total stones count with total carat weight.
 *
 * @module components/domain/inventory/ItemStonesManager
 */

import React, { useState, useCallback, useMemo } from 'react';

import { PlusOutlined, GoldOutlined } from '@ant-design/icons';
import { Card, Typography, Empty, Space, Statistic, Row, Col, message } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { addItemStones, removeItemStone } from '@/lib/actions/inventory';
import type { StoneType } from '@/lib/hooks/data/useStones';
import { usePermissions } from '@/lib/hooks/permissions/usePermissions';
import { useShop } from '@/lib/hooks/shop';
import { cn } from '@/lib/utils/cn';

import { ItemStoneCard, ItemStoneCardSkeleton } from './ItemStoneCard';
import { ItemStoneModal } from './ItemStoneModal';

import type { ItemStoneData } from './ItemStoneCard';
import type { ItemStoneFormValues } from './ItemStoneForm';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Extended stone type with joined stone_type data
 */
export interface ItemStone extends ItemStoneData {
  stone_type?: StoneType | null;
}

/**
 * Props for ItemStonesManager component
 */
export interface ItemStonesManagerProps {
  /**
   * The inventory item ID
   */
  itemId: string;

  /**
   * Current stones attached to the item
   */
  stones: ItemStone[];

  /**
   * Callback when stones list changes
   */
  onStonesChange?: (stones: ItemStone[]) => void;

  /**
   * Whether the component is in read-only mode
   */
  readOnly?: boolean;

  /**
   * Compact mode for use in detail drawer
   */
  compact?: boolean;

  /**
   * Additional class name
   */
  className?: string;

  /**
   * Whether data is loading
   */
  isLoading?: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ItemStonesManager Component
 *
 * Manages stones attached to an inventory item with full CRUD functionality.
 */
export function ItemStonesManager({
  itemId,
  stones,
  onStonesChange,
  readOnly = false,
  compact = false,
  className,
  isLoading = false,
}: ItemStonesManagerProps): JSX.Element {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');

  // ==========================================================================
  // HOOKS
  // ==========================================================================

  const { shopId } = useShop();
  const { can } = usePermissions();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStone, setEditingStone] = useState<ItemStone | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingStoneId, setDeletingStoneId] = useState<string | null>(null);

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const canManage = can('inventory.manage') && !readOnly;

  const totals = useMemo(() => {
    const totalCount = stones.reduce((sum, stone) => sum + (stone.stone_count || 1), 0);
    const totalCarats = stones.reduce(
      (sum, stone) => sum + stone.weight_carats * (stone.stone_count || 1),
      0
    );
    const totalValue = stones.reduce(
      (sum, stone) => sum + (stone.estimated_value || 0) * (stone.stone_count || 1),
      0
    );

    return {
      count: totalCount,
      carats: totalCarats,
      value: totalValue,
    };
  }, [stones]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleAddClick = useCallback(() => {
    setEditingStone(null);
    setIsModalOpen(true);
  }, []);

  const handleEditClick = useCallback((stone: ItemStone) => {
    setEditingStone(stone);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingStone(null);
  }, []);

  const handleSubmit = useCallback(
    async (data: ItemStoneFormValues) => {
      if (!shopId) {
        message.error('No shop selected');
        return;
      }

      setIsSubmitting(true);

      try {
        if (editingStone) {
          // For editing, we need to delete and re-create since there's no update action
          // First remove the old stone
          const removeResult = await removeItemStone(editingStone.id_item_stone);
          if (!removeResult.success) {
            throw new Error(removeResult.error);
          }
        }

        // Add the stone
        const result = await addItemStones({
          id_shop: shopId,
          id_item: itemId,
          id_stone_type: data.id_stone_type,
          weight_carats: data.weight_carats,
          stone_count: data.stone_count,
          position: data.position ?? undefined,
          clarity: data.clarity ?? undefined,
          color: data.color ?? undefined,
          cut: data.cut ?? undefined,
          estimated_value: data.estimated_value ?? undefined,
          notes: data.notes ?? undefined,
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        message.success(editingStone ? 'Stone updated successfully' : 'Stone added successfully');

        // Notify parent of changes if callback provided
        if (onStonesChange && result.data) {
          const newStone = result.data;
          if (editingStone) {
            // Replace the edited stone
            const updatedStones = stones.map((s) =>
              s.id_item_stone === editingStone.id_item_stone ? newStone : s
            );
            onStonesChange(updatedStones);
          } else {
            // Add new stone
            onStonesChange([...stones, newStone]);
          }
        }

        handleModalClose();
      } catch (error) {
        console.error('[ItemStonesManager] Submit error:', error);
        message.error(error instanceof Error ? error.message : 'Failed to save stone');
      } finally {
        setIsSubmitting(false);
      }
    },
    [shopId, itemId, editingStone, stones, onStonesChange, handleModalClose]
  );

  const handleDelete = useCallback(
    async (stoneId: string) => {
      setDeletingStoneId(stoneId);

      try {
        const result = await removeItemStone(stoneId);

        if (!result.success) {
          throw new Error(result.error);
        }

        message.success('Stone removed successfully');

        // Notify parent of changes
        if (onStonesChange) {
          const updatedStones = stones.filter((s) => s.id_item_stone !== stoneId);
          onStonesChange(updatedStones);
        }
      } catch (error) {
        console.error('[ItemStonesManager] Delete error:', error);
        message.error(error instanceof Error ? error.message : 'Failed to remove stone');
      } finally {
        setDeletingStoneId(null);
      }
    },
    [stones, onStonesChange]
  );

  // ==========================================================================
  // RENDER - LOADING STATE
  // ==========================================================================

  if (isLoading) {
    return (
      <Card className={cn('border border-stone-200', className)}>
        <div className="space-y-3">
          <ItemStoneCardSkeleton compact={compact} />
          <ItemStoneCardSkeleton compact={compact} />
        </div>
      </Card>
    );
  }

  // ==========================================================================
  // RENDER - COMPACT MODE
  // ==========================================================================

  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        {/* Header with totals */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GoldOutlined className="text-amber-600" />
            <Text strong>{t('stones.title')}</Text>
            <Text type="secondary" className="text-sm">
              ({stones.length})
            </Text>
          </div>
          {canManage && (
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddClick}
              className="text-amber-600 hover:text-amber-700"
            >
              {tCommon('actions.add')}
            </Button>
          )}
        </div>

        {/* Quick stats */}
        {stones.length > 0 && (
          <div className="flex gap-4 text-sm text-stone-500 mb-2">
            <span>
              {totals.count} {totals.count === 1 ? 'stone' : 'stones'}
            </span>
            <span>{totals.carats.toFixed(2)} ct total</span>
            {totals.value > 0 && (
              <span className="text-green-600">${totals.value.toLocaleString()}</span>
            )}
          </div>
        )}

        {/* Stones list */}
        {stones.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" className="text-sm">
                No stones added
              </Text>
            }
          />
        ) : (
          <div className="space-y-2">
            {stones.map((stone) => (
              <ItemStoneCard
                key={stone.id_item_stone}
                stone={stone}
                onEdit={canManage ? handleEditClick : undefined}
                onDelete={canManage ? handleDelete : undefined}
                readOnly={!canManage}
                isDeleting={deletingStoneId === stone.id_item_stone}
                compact
              />
            ))}
          </div>
        )}

        {/* Modal */}
        <ItemStoneModal
          open={isModalOpen}
          onClose={handleModalClose}
          onSubmit={handleSubmit}
          initialData={editingStone ?? undefined}
          isSubmitting={isSubmitting}
          mode={editingStone ? 'edit' : 'create'}
        />
      </div>
    );
  }

  // ==========================================================================
  // RENDER - FULL MODE
  // ==========================================================================

  return (
    <Card
      className={cn('border border-stone-200 shadow-sm', className)}
      title={
        <div className="flex items-center gap-2">
          <GoldOutlined className="text-amber-600" />
          <span>{t('stones.title')}</span>
        </div>
      }
      extra={
        canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddClick}>
            {tCommon('actions.add')} {t('stones.title')}
          </Button>
        )
      }
    >
      {/* Summary Statistics */}
      {stones.length > 0 && (
        <Row gutter={16} className="mb-6">
          <Col span={8}>
            <Statistic
              title="Total Stones"
              value={totals.count}
              valueStyle={{ color: '#d97706' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Total Carats"
              value={totals.carats}
              precision={2}
              suffix="ct"
              valueStyle={{ color: '#d97706' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Estimated Value"
              value={totals.value}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#16a34a' }}
            />
          </Col>
        </Row>
      )}

      {/* Stones Grid */}
      {stones.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size="small" className="text-center">
              <Text type="secondary">No stones attached to this item</Text>
              {canManage && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddClick}>
                  Add First Stone
                </Button>
              )}
            </Space>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stones.map((stone) => (
            <ItemStoneCard
              key={stone.id_item_stone}
              stone={stone}
              onEdit={canManage ? handleEditClick : undefined}
              onDelete={canManage ? handleDelete : undefined}
              readOnly={!canManage}
              isDeleting={deletingStoneId === stone.id_item_stone}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <ItemStoneModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        initialData={editingStone ?? undefined}
        isSubmitting={isSubmitting}
        mode={editingStone ? 'edit' : 'create'}
      />
    </Card>
  );
}

/**
 * Skeleton loader for ItemStonesManager
 */
export function ItemStonesManagerSkeleton({ compact = false }: { compact?: boolean }): JSX.Element {
  if (compact) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-stone-200 rounded" />
            <div className="h-5 w-24 bg-stone-200 rounded" />
          </div>
          <div className="h-8 w-16 bg-stone-200 rounded" />
        </div>
        <ItemStoneCardSkeleton compact />
        <ItemStoneCardSkeleton compact />
      </div>
    );
  }

  return (
    <Card className="border border-stone-200 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-stone-200 rounded" />
        <div className="h-10 w-32 bg-stone-200 rounded" />
      </div>
      <Row gutter={16} className="mb-6">
        <Col span={8}>
          <div className="h-16 bg-stone-200 rounded" />
        </Col>
        <Col span={8}>
          <div className="h-16 bg-stone-200 rounded" />
        </Col>
        <Col span={8}>
          <div className="h-16 bg-stone-200 rounded" />
        </Col>
      </Row>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ItemStoneCardSkeleton />
        <ItemStoneCardSkeleton />
        <ItemStoneCardSkeleton />
      </div>
    </Card>
  );
}

export default ItemStonesManager;
