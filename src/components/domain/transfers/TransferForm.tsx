'use client';

/**
 * TransferForm Component
 *
 * Drawer form for creating new shop transfers.
 * Allows selecting destination shop and items to transfer.
 *
 * Features:
 * - Select destination shop (from neighbor_shops)
 * - Select items to transfer (multi-select from inventory)
 * - Notes field
 * - Submit creates transfer with status "pending"
 * - RTL support
 *
 * @module components/domain/transfers/TransferForm
 */

import React, { useCallback, useEffect, useState } from 'react';

import { SwapOutlined, ShopOutlined, FileTextOutlined } from '@ant-design/icons';
import { Drawer, Form, Select, Input, message, Divider, Alert } from 'antd';
import { useTranslations } from 'next-intl';

import { TransferItemSelector } from '@/components/domain/transfers/TransferItemSelector';
import { Button } from '@/components/ui/Button';
import {
  useNeighborShops,
  useCreateTransfer,
  getNeighborDisplayName,
} from '@/lib/hooks/data/useTransfers';
import { useShop } from '@/lib/hooks/shop';

const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

interface TransferFormProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Success callback */
  onSuccess?: () => void;
}

interface TransferFormValues {
  neighborId: string;
  itemIds: string[];
  notes?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * TransferForm - Drawer form for creating transfers
 */
export function TransferForm({ open, onClose, onSuccess }: TransferFormProps): React.JSX.Element {
  const t = useTranslations('transfers');
  const tCommon = useTranslations('common');

  const { shop } = useShop();
  const [form] = Form.useForm<TransferFormValues>();

  // Selected items state
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Mutations
  const createMutation = useCreateTransfer();

  // Fetch neighbor shops for dropdown
  const { neighborShops, isLoading: neighborShopsLoading } = useNeighborShops({
    pageSize: 100,
  });

  // Derived state
  const isSubmitting = createMutation.isPending;

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields();
      setSelectedItemIds([]);
    }
  }, [open, form]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleClose = useCallback(() => {
    form.resetFields();
    setSelectedItemIds([]);
    onClose();
  }, [form, onClose]);

  const handleItemsChange = useCallback(
    (itemIds: string[]) => {
      setSelectedItemIds(itemIds);
      form.setFieldValue('itemIds', itemIds);
    },
    [form]
  );

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      if (selectedItemIds.length === 0) {
        message.error(t('validation.selectItems'));
        return;
      }

      await createMutation.mutateAsync({
        neighborId: values.neighborId,
        itemIds: selectedItemIds,
        notes: values.notes?.trim() || undefined,
      });

      message.success(t('transferCreated'));
      handleClose();
      onSuccess?.();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error(tCommon('messages.operationFailed'));
      }
    }
  }, [form, selectedItemIds, createMutation, t, tCommon, handleClose, onSuccess]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Build destination shop options
  const destinationOptions = neighborShops.map((ns) => ({
    label: getNeighborDisplayName(ns),
    value: ns.id_neighbor,
  }));

  return (
    <Drawer
      open={open}
      title={
        <div className="flex items-center gap-2">
          <SwapOutlined className="text-amber-500" />
          <span>{t('newTransfer')}</span>
        </div>
      }
      onClose={handleClose}
      placement="right"
      width={700}
      destroyOnClose
      maskClosable={!isSubmitting}
      closable={!isSubmitting}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} disabled={isSubmitting}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={selectedItemIds.length === 0}
            permission="inventory.transfer"
          >
            {tCommon('actions.create')}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional" className="mt-4">
        {/* Source Shop Info */}
        <Alert
          type="info"
          showIcon
          icon={<ShopOutlined />}
          message={t('transferFrom')}
          description={shop?.shop_name || '-'}
          className="mb-4"
        />

        {/* Destination Shop Selection */}
        <Divider orientation="left" className="!text-sm !text-stone-500">
          <span className="flex items-center gap-2">
            <ShopOutlined />
            {t('selectDestination')}
          </span>
        </Divider>

        <Form.Item
          name="neighborId"
          label={t('toShop')}
          rules={[{ required: true, message: tCommon('validation.required') }]}
        >
          <Select
            placeholder={t('selectDestinationShop')}
            options={destinationOptions}
            loading={neighborShopsLoading}
            showSearch
            optionFilterProp="label"
            suffixIcon={<ShopOutlined />}
            notFoundContent={
              neighborShopsLoading ? tCommon('messages.loading') : t('noNeighborShops')
            }
          />
        </Form.Item>

        {/* Items Selection */}
        <Divider orientation="left" className="!text-sm !text-stone-500">
          <span className="flex items-center gap-2">
            <SwapOutlined />
            {t('selectItems')} ({selectedItemIds.length} {t('selected')})
          </span>
        </Divider>

        <Form.Item
          name="itemIds"
          rules={[
            {
              validator: () => {
                if (selectedItemIds.length === 0) {
                  return Promise.reject(new Error(t('validation.selectItems')));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <TransferItemSelector selectedItemIds={selectedItemIds} onChange={handleItemsChange} />
        </Form.Item>

        {/* Notes */}
        <Divider orientation="left" className="!text-sm !text-stone-500">
          <span className="flex items-center gap-2">
            <FileTextOutlined />
            {tCommon('labels.notes')}
          </span>
        </Divider>

        <Form.Item
          name="notes"
          label={tCommon('labels.notes')}
          rules={[{ max: 2000, message: tCommon('validation.maxLength', { max: 2000 }) }]}
        >
          <TextArea rows={3} placeholder={t('notesPlaceholder')} showCount maxLength={2000} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

export default TransferForm;
