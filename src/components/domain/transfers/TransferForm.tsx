'use client';

/**
 * TransferForm Component
 *
 * Drawer form for creating new shop transfers.
 * Supports both outgoing and incoming transfers.
 *
 * Features:
 * - Direction toggle (outgoing/incoming)
 * - Select source/destination shop (from neighbor_shops)
 * - For outgoing: Select items from inventory (TransferItemSelector)
 * - For incoming: Manually enter item details (ManualItemEntry)
 * - Notes field
 * - Submit creates transfer with status "pending"
 * - RTL support
 *
 * @module components/domain/transfers/TransferForm
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';

import {
  SwapOutlined,
  ShopOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  ExportOutlined,
  ImportOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { Drawer, Form, Select, Input, message, Divider, Alert, Segmented } from 'antd';
import { useTranslations } from 'next-intl';

import { ManualItemEntry, type ManualItem } from '@/components/domain/transfers/ManualItemEntry';
import { TransferItemSelector } from '@/components/domain/transfers/TransferItemSelector';
import { Button } from '@/components/ui/Button';
import {
  useNeighborShops,
  useCreateTransfer,
  getNeighborDisplayName,
  type TransferDirection,
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
  direction: TransferDirection;
  neighborId: string;
  itemIds?: string[];
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

  // Direction state
  const [direction, setDirection] = useState<TransferDirection>('outgoing');

  // Selected items state (for outgoing transfers)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Manual items state (for incoming transfers)
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);

  // Mutations
  const createMutation = useCreateTransfer();

  // Fetch neighbor shops for dropdown
  const { neighborShops, isLoading: neighborShopsLoading } = useNeighborShops({
    pageSize: 100,
  });

  // Derived state
  const isSubmitting = createMutation.isPending;
  const isOutgoing = direction === 'outgoing';

  // Check if we have valid items for submission
  const hasValidItems = useMemo(() => {
    if (isOutgoing) {
      return selectedItemIds.length > 0;
    } else {
      // For incoming, check that we have at least one item with required fields
      return (
        manualItems.length > 0 &&
        manualItems.every((item) => item.item_name.trim() !== '' && item.item_value > 0)
      );
    }
  }, [isOutgoing, selectedItemIds, manualItems]);

  // Direction options for segmented control
  const directionOptions = useMemo(
    () => [
      {
        label: (
          <span className="flex items-center gap-2 px-2">
            <ExportOutlined />
            <span>{t('outgoingTransfer')}</span>
          </span>
        ),
        value: 'outgoing' as TransferDirection,
      },
      {
        label: (
          <span className="flex items-center gap-2 px-2">
            <ImportOutlined />
            <span>{t('incomingTransfer')}</span>
          </span>
        ),
        value: 'incoming' as TransferDirection,
      },
    ],
    [t]
  );

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields();
      setSelectedItemIds([]);
      setManualItems([]);
      setDirection('outgoing');
    }
  }, [open, form]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleClose = useCallback(() => {
    form.resetFields();
    setSelectedItemIds([]);
    setManualItems([]);
    setDirection('outgoing');
    onClose();
  }, [form, onClose]);

  const handleDirectionChange = useCallback(
    (value: TransferDirection) => {
      setDirection(value);
      form.setFieldValue('direction', value);
      // Clear neighbor selection when direction changes
      form.setFieldValue('neighborId', undefined);
      // Clear items when direction changes
      setSelectedItemIds([]);
      setManualItems([]);
    },
    [form]
  );

  const handleItemsChange = useCallback(
    (itemIds: string[]) => {
      setSelectedItemIds(itemIds);
      form.setFieldValue('itemIds', itemIds);
    },
    [form]
  );

  const handleManualItemsChange = useCallback((items: ManualItem[]) => {
    setManualItems(items);
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      // Validate items based on direction
      if (isOutgoing) {
        if (selectedItemIds.length === 0) {
          message.error(t('validation.selectItems'));
          return;
        }
      } else {
        // Incoming transfer validation
        if (manualItems.length === 0) {
          message.error(t('validation.addItems'));
          return;
        }

        // Check that all manual items have required fields
        const invalidItems = manualItems.filter(
          (item) => !item.item_name.trim() || item.item_value <= 0
        );
        if (invalidItems.length > 0) {
          message.error(t('validation.completeItemDetails'));
          return;
        }
      }

      await createMutation.mutateAsync({
        neighborId: values.neighborId,
        itemIds: isOutgoing ? selectedItemIds : undefined,
        manualItems: isOutgoing ? undefined : manualItems,
        notes: values.notes?.trim() || undefined,
        direction,
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
  }, [
    form,
    isOutgoing,
    selectedItemIds,
    manualItems,
    createMutation,
    t,
    tCommon,
    handleClose,
    onSuccess,
    direction,
  ]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Build neighbor shop options
  const neighborOptions = neighborShops.map((ns) => ({
    label: getNeighborDisplayName(ns),
    value: ns.id_neighbor,
  }));

  // Dynamic labels based on direction
  const shopInfoLabel = isOutgoing ? t('transferFrom') : t('transferTo');
  const neighborLabel = isOutgoing ? t('toShop') : t('fromShop');
  const neighborPlaceholder = isOutgoing ? t('selectDestinationShop') : t('selectSourceShop');
  const sectionTitle = isOutgoing ? t('selectDestination') : t('selectSource');

  // Items section title
  const itemsSectionTitle = isOutgoing
    ? `${t('selectItems')} (${selectedItemIds.length} ${t('selected')})`
    : `${t('manualEntry.title')} (${manualItems.length} ${t('items')})`;

  const itemsSectionIcon = isOutgoing ? <SwapOutlined /> : <EditOutlined />;

  // Direction-based styling
  const directionIcon = isOutgoing ? (
    <ArrowRightOutlined className="text-amber-500" />
  ) : (
    <ArrowLeftOutlined className="text-emerald-500" />
  );
  const alertType = isOutgoing ? ('warning' as const) : ('success' as const);
  const alertIconColor = isOutgoing ? 'text-amber-500' : 'text-emerald-500';

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
            disabled={!hasValidItems}
            permission="inventory.transfer"
          >
            {tCommon('actions.create')}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional" className="mt-4">
        {/* Direction Selector */}
        <div className="mb-6">
          <Segmented
            block
            value={direction}
            onChange={(value) => handleDirectionChange(value as TransferDirection)}
            options={directionOptions}
            className={isOutgoing ? 'transfer-direction-outgoing' : 'transfer-direction-incoming'}
          />
        </div>

        {/* Direction Description Alert */}
        <Alert
          type="info"
          showIcon
          icon={directionIcon}
          message={isOutgoing ? t('outgoingDescription') : t('incomingDescription')}
          className="mb-4"
        />

        {/* Current Shop Info */}
        <Alert
          type={alertType}
          showIcon
          icon={<ShopOutlined className={alertIconColor} />}
          message={shopInfoLabel}
          description={shop?.shop_name || '-'}
          className="mb-4"
        />

        {/* Neighbor Shop Selection */}
        <Divider orientation="left" className="!text-sm !text-stone-500">
          <span className="flex items-center gap-2">
            <ShopOutlined />
            {sectionTitle}
          </span>
        </Divider>

        <Form.Item
          name="neighborId"
          label={neighborLabel}
          rules={[{ required: true, message: tCommon('validation.required') }]}
        >
          <Select
            placeholder={neighborPlaceholder}
            options={neighborOptions}
            loading={neighborShopsLoading}
            showSearch
            optionFilterProp="label"
            suffixIcon={<ShopOutlined />}
            notFoundContent={
              neighborShopsLoading ? tCommon('messages.loading') : t('noNeighborShops')
            }
          />
        </Form.Item>

        {/* Items Selection/Entry */}
        <Divider orientation="left" className="!text-sm !text-stone-500">
          <span className="flex items-center gap-2">
            {itemsSectionIcon}
            {itemsSectionTitle}
          </span>
        </Divider>

        {isOutgoing ? (
          /* Outgoing Transfer: Select from inventory */
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
            <TransferItemSelector
              selectedItemIds={selectedItemIds}
              onChange={handleItemsChange}
              disabled={isSubmitting}
            />
          </Form.Item>
        ) : (
          /* Incoming Transfer: Manual item entry */
          <ManualItemEntry
            items={manualItems}
            onChange={handleManualItemsChange}
            disabled={isSubmitting}
          />
        )}

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
