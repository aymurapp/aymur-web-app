'use client';

/**
 * ItemStoneModal Component
 *
 * Modal wrapper for the stone form component.
 * Provides "Add Stone" or "Edit Stone" modal with loading states.
 *
 * @module components/domain/inventory/ItemStoneModal
 */

import React from 'react';

import { Modal, Spin } from 'antd';
import { useTranslations } from 'next-intl';

import { ItemStoneForm, ItemStoneFormSkeleton } from './ItemStoneForm';

import type { ItemStoneData } from './ItemStoneCard';
import type { ItemStoneFormValues } from './ItemStoneForm';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for ItemStoneModal component
 */
export interface ItemStoneModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean;

  /**
   * Callback when modal is closed
   */
  onClose: () => void;

  /**
   * Callback when form is submitted
   */
  onSubmit: (data: ItemStoneFormValues) => Promise<void>;

  /**
   * Initial stone data for edit mode
   */
  initialData?: Partial<ItemStoneData>;

  /**
   * Whether the form is currently submitting
   */
  isSubmitting?: boolean;

  /**
   * Whether data is loading (for edit mode)
   */
  isLoading?: boolean;

  /**
   * Modal mode
   */
  mode?: 'create' | 'edit';

  /**
   * Modal width
   */
  width?: number | string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ItemStoneModal Component
 *
 * Modal wrapper for adding or editing stones on inventory items.
 */
export function ItemStoneModal({
  open,
  onClose,
  onSubmit,
  initialData,
  isSubmitting = false,
  isLoading = false,
  mode = 'create',
  width = 640,
}: ItemStoneModalProps): JSX.Element {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');

  // Determine modal title
  const title =
    mode === 'create'
      ? `${tCommon('actions.add')} ${t('stones.title')}`
      : `${tCommon('actions.edit')} ${t('stones.title')}`;

  // Handle form submission
  const handleSubmit = async (data: ItemStoneFormValues): Promise<void> => {
    await onSubmit(data);
  };

  // Handle cancel
  const handleCancel = (): void => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onCancel={handleCancel}
      footer={null}
      width={width}
      destroyOnClose
      maskClosable={!isSubmitting}
      closable={!isSubmitting}
      className="item-stone-modal"
    >
      {isLoading ? (
        <div className="py-8">
          <Spin size="large" className="w-full flex justify-center mb-4" />
          <ItemStoneFormSkeleton />
        </div>
      ) : (
        <ItemStoneForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          mode={mode}
        />
      )}
    </Modal>
  );
}

export default ItemStoneModal;
