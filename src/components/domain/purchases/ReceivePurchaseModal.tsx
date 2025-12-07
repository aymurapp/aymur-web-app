'use client';

/**
 * ReceivePurchaseModal Component
 *
 * Modal for receiving items from a purchase order and optionally
 * creating inventory items.
 *
 * Features:
 * - Show purchase items
 * - Checkbox for each item received
 * - Quantity received input (for partial)
 * - Generate SKU/barcode for each item
 * - Option to auto-create inventory items
 * - Confirm receiving button
 *
 * @module components/domain/purchases/ReceivePurchaseModal
 */

import React, { useState, useCallback, useEffect } from 'react';

import {
  CheckCircleOutlined,
  InboxOutlined,
  BarcodeOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Modal,
  Checkbox,
  InputNumber,
  Input,
  Table,
  Typography,
  Switch,
  Space,
  Alert,
  message,
} from 'antd';
import { useTranslations } from 'next-intl';

import type { PurchaseWithSupplier } from '@/lib/hooks/data/usePurchases';
import { useShop } from '@/lib/hooks/shop';
import { cn } from '@/lib/utils/cn';

import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface ReceivePurchaseModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Handler for closing the modal */
  onClose: () => void;
  /** Handler for successful receiving */
  onSuccess: () => void;
  /** Purchase to receive items for */
  purchase: PurchaseWithSupplier;
}

interface ReceiveItem {
  id: string;
  description: string;
  quantity: number;
  received: boolean;
  quantityReceived: number;
  sku: string;
  barcode: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function generateSKU(shopPrefix: string, index: number): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const seq = (index + 1).toString().padStart(3, '0');
  return `${shopPrefix}-${timestamp}-${seq}`;
}

function generateBarcode(index: number): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${timestamp}${random}${index}`.slice(-13);
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReceivePurchaseModal({
  open,
  onClose,
  onSuccess,
  purchase,
}: ReceivePurchaseModalProps): React.JSX.Element {
  const t = useTranslations('purchases');
  const tCommon = useTranslations('common');
  const tInventory = useTranslations('inventory');
  const { shop } = useShop();
  const shopPrefix = shop?.shop_name?.slice(0, 3).toUpperCase() || 'AYM';

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [items, setItems] = useState<ReceiveItem[]>([]);
  const [createInventory, setCreateInventory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize items when modal opens
  useEffect(() => {
    if (open && purchase) {
      // For now, create mock items based on total_items
      // In a real implementation, this would come from purchase_items table
      const totalItems = purchase.total_items || 1;
      const mockItems: ReceiveItem[] = Array.from({ length: totalItems }, (_, i) => ({
        id: `item-${i}`,
        description: `${t('itemFromPurchase')} #${i + 1}`,
        quantity: 1,
        received: true,
        quantityReceived: 1,
        sku: generateSKU(shopPrefix, i),
        barcode: generateBarcode(i),
      }));
      setItems(mockItems);
    }
  }, [open, purchase, shopPrefix, t]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleItemChange = useCallback((id: string, field: keyof ReceiveItem, value: unknown) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        return { ...item, [field]: value };
      })
    );
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        received: checked,
        quantityReceived: checked ? item.quantity : 0,
      }))
    );
  }, []);

  const handleRegenerateSKU = useCallback(
    (id: string, index: number) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) {
            return item;
          }
          return { ...item, sku: generateSKU(shopPrefix, index) };
        })
      );
    },
    [shopPrefix]
  );

  const handleRegenerateBarcode = useCallback((id: string, index: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        return { ...item, barcode: generateBarcode(index) };
      })
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    const receivedItems = items.filter((item) => item.received && item.quantityReceived > 0);

    if (receivedItems.length === 0) {
      message.warning(t('noItemsSelected'));
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Implement actual receiving logic
      // This would:
      // 1. Update purchase receiving status
      // 2. Optionally create inventory items
      // 3. Update purchase totals

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      message.success(t('itemsReceivedSuccess', { count: receivedItems.length }));
      onSuccess();
    } catch (error) {
      console.error('Failed to receive items:', error);
      message.error(t('receiveError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [items, t, onSuccess]);

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================

  const columns: ColumnsType<ReceiveItem> = [
    {
      title: (
        <Checkbox
          checked={items.every((item) => item.received)}
          indeterminate={
            items.some((item) => item.received) && !items.every((item) => item.received)
          }
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      dataIndex: 'received',
      key: 'received',
      width: 50,
      render: (received: boolean, record) => (
        <Checkbox
          checked={received}
          onChange={(e) => handleItemChange(record.id, 'received', e.target.checked)}
        />
      ),
    },
    {
      title: t('itemDescription'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: t('qtyOrdered'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'center',
    },
    {
      title: t('qtyReceived'),
      dataIndex: 'quantityReceived',
      key: 'quantityReceived',
      width: 120,
      render: (value: number, record) => (
        <InputNumber
          value={value}
          min={0}
          max={record.quantity}
          onChange={(val) => handleItemChange(record.id, 'quantityReceived', val || 0)}
          disabled={!record.received}
          size="small"
          className="w-full"
        />
      ),
    },
    {
      title: tInventory('sku'),
      dataIndex: 'sku',
      key: 'sku',
      width: 160,
      render: (value: string, record, index) => (
        <Space size="small">
          <Input
            value={value}
            onChange={(e) => handleItemChange(record.id, 'sku', e.target.value)}
            disabled={!record.received || !createInventory}
            size="small"
            className="w-28"
          />
          <a
            onClick={() => handleRegenerateSKU(record.id, index)}
            className="text-amber-600 hover:text-amber-700"
            title={t('regenerate')}
          >
            <BarcodeOutlined />
          </a>
        </Space>
      ),
    },
    {
      title: tInventory('barcode'),
      dataIndex: 'barcode',
      key: 'barcode',
      width: 160,
      render: (value: string, record, index) => (
        <Space size="small">
          <Input
            value={value}
            onChange={(e) => handleItemChange(record.id, 'barcode', e.target.value)}
            disabled={!record.received || !createInventory}
            size="small"
            className="w-28"
          />
          <a
            onClick={() => handleRegenerateBarcode(record.id, index)}
            className="text-amber-600 hover:text-amber-700"
            title={t('regenerate')}
          >
            <BarcodeOutlined />
          </a>
        </Space>
      ),
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const receivedCount = items.filter((item) => item.received).length;
  const totalQuantityReceived = items.reduce(
    (sum, item) => sum + (item.received ? item.quantityReceived : 0),
    0
  );

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <InboxOutlined className="text-amber-500" />
          <span>{t('receivePurchase')}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={t('confirmReceive')}
      cancelText={tCommon('actions.cancel')}
      okButtonProps={{
        loading: isSubmitting,
        disabled: receivedCount === 0,
        icon: <CheckCircleOutlined />,
      }}
      width={800}
      destroyOnClose
    >
      {/* Purchase Info */}
      <div className="bg-stone-50 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <Text type="secondary">{t('purchaseNumber')}</Text>
          <Text strong className="text-amber-700">
            {purchase.purchase_number}
          </Text>
        </div>
        <div className="flex justify-between items-center">
          <Text type="secondary">{t('supplier')}</Text>
          <Text>{purchase.supplier?.company_name || '-'}</Text>
        </div>
      </div>

      {/* Auto-create inventory option */}
      <div className="flex items-center justify-between mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-center gap-2">
          <PlusOutlined className="text-amber-600" />
          <span>{t('autoCreateInventory')}</span>
        </div>
        <Switch checked={createInventory} onChange={setCreateInventory} />
      </div>

      {createInventory && (
        <Alert message={t('inventoryCreationNote')} type="info" showIcon className="mb-4" />
      )}

      {/* Items Table */}
      <Table
        columns={columns}
        dataSource={items}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={{ y: 300 }}
        className={cn(
          '[&_.ant-table-thead_th]:bg-stone-50',
          '[&_.ant-table-thead_th]:text-stone-600'
        )}
      />

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-stone-200">
        <div className="flex justify-between items-center">
          <Text type="secondary">
            {t('itemsToReceive', { count: receivedCount, total: items.length })}
          </Text>
          <Text strong>
            {t('totalQuantity')}: {totalQuantityReceived}
          </Text>
        </div>
      </div>
    </Modal>
  );
}

export default ReceivePurchaseModal;
