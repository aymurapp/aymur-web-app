'use client';

/**
 * BarcodeLabelModal Component
 *
 * Modal dialog for configuring and printing barcode labels.
 * Supports single and multiple item label printing.
 *
 * Features:
 * - Single or multi-item selection
 * - Label size configuration
 * - Content options checkboxes
 * - Quantity per item setting
 * - Print preview with live updates
 * - Print button triggers browser print
 * - RTL support
 *
 * @module components/domain/inventory/BarcodeLabelModal
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';

import {
  PrinterOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Space, Typography, Alert, Tabs, Empty, List, InputNumber } from 'antd';
import { useTranslations } from 'next-intl';
import { useReactToPrint } from 'react-to-print';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { InventoryItemWithRelations } from '@/lib/hooks/data/useInventoryItems';

import {
  BarcodeLabelPreview,
  BarcodeLabelPreviewSkeleton,
  DEFAULT_CONTENT_OPTIONS,
} from './BarcodeLabelPreview';
import { BarcodeLabelSheet } from './BarcodeLabelSheet';

import type { LabelSize } from './BarcodeLabel';
import type { LabelContentOptions } from './BarcodeLabelPreview';
import type { LabelSheetFormat } from './BarcodeLabelSheet';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Item with quantity for batch printing
 */
export interface LabelPrintItem {
  item: InventoryItemWithRelations;
  quantity: number;
}

/**
 * Props for the BarcodeLabelModal component
 */
export interface BarcodeLabelModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Handler for modal close */
  onClose: () => void;
  /** Single item for printing (simple mode) */
  item?: InventoryItemWithRelations;
  /** Multiple items for batch printing */
  items?: InventoryItemWithRelations[];
  /** Currency for price display */
  currency?: string;
  /** Default label size */
  defaultSize?: LabelSize;
  /** Default sheet format for batch printing */
  defaultSheetFormat?: LabelSheetFormat;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * BarcodeLabelModal Component
 *
 * Modal for configuring and printing barcode labels.
 * Supports single item mode and batch mode for multiple items.
 */
export function BarcodeLabelModal({
  open,
  onClose,
  item,
  items = [],
  currency = 'USD',
  defaultSize = 'medium',
  defaultSheetFormat = 'avery_5160',
}: BarcodeLabelModalProps): JSX.Element {
  const t = useTranslations('inventory.barcodeLabel');
  const tCommon = useTranslations('common');

  // Determine mode: single item or batch
  const isBatchMode = items.length > 0;
  const allItems = useMemo(() => {
    if (isBatchMode) {
      return items;
    }
    if (item) {
      return [item];
    }
    return [];
  }, [item, items, isBatchMode]);

  // State
  const [size, setSize] = useState<LabelSize>(defaultSize);
  const [contentOptions, setContentOptions] =
    useState<LabelContentOptions>(DEFAULT_CONTENT_OPTIONS);
  const [quantity, setQuantity] = useState<number>(1);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(allItems.map((i) => [i.id_item, 1]))
  );
  const [sheetFormat] = useState<LabelSheetFormat>(defaultSheetFormat);
  const [activeTab, setActiveTab] = useState<string>(isBatchMode ? 'sheet' : 'single');
  const [isPrinting, setIsPrinting] = useState(false);

  // Print ref
  const printRef = useRef<HTMLDivElement>(null);

  // Build print items based on mode
  const printItems: LabelPrintItem[] = useMemo(() => {
    if (isBatchMode) {
      return allItems.map((item) => ({
        item,
        quantity: itemQuantities[item.id_item] || 1,
      }));
    }
    if (item) {
      return [{ item, quantity }];
    }
    return [];
  }, [allItems, isBatchMode, item, itemQuantities, quantity]);

  // Total label count
  const totalLabels = useMemo(
    () => printItems.reduce((sum, pi) => sum + pi.quantity, 0),
    [printItems]
  );

  // Print handler using react-to-print
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: t('printTitle'),
    onBeforePrint: () => {
      setIsPrinting(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsPrinting(false);
    },
    onPrintError: () => {
      setIsPrinting(false);
    },
  });

  // Handle item quantity change
  const handleItemQuantityChange = useCallback((itemId: string, value: number | null) => {
    if (value !== null && value >= 1 && value <= 100) {
      setItemQuantities((prev) => ({
        ...prev,
        [itemId]: value,
      }));
    }
  }, []);

  // Reset state on close
  const handleClose = useCallback(() => {
    setSize(defaultSize);
    setContentOptions(DEFAULT_CONTENT_OPTIONS);
    setQuantity(1);
    setItemQuantities(Object.fromEntries(allItems.map((i) => [i.id_item, 1])));
    setActiveTab(isBatchMode ? 'sheet' : 'single');
    onClose();
  }, [allItems, defaultSize, isBatchMode, onClose]);

  // No items case
  if (allItems.length === 0) {
    return (
      <Modal open={open} onCancel={handleClose} title={t('title')} hideFooter width={480}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('noItemsSelected')} />
      </Modal>
    );
  }

  // Single item mode
  if (!isBatchMode && item) {
    return (
      <Modal
        open={open}
        onCancel={handleClose}
        title={
          <Space>
            <PrinterOutlined />
            <span>{t('title')}</span>
          </Space>
        }
        width={520}
        footer={
          <Space className="w-full justify-between">
            <Text type="secondary" className="text-sm">
              {t('totalLabels', { count: quantity })}
            </Text>
            <Space>
              <Button onClick={handleClose}>{tCommon('actions.cancel')}</Button>
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                loading={isPrinting}
                onClick={() => handlePrint()}
              >
                {t('printLabels')}
              </Button>
            </Space>
          </Space>
        }
      >
        {/* Preview & Options */}
        <BarcodeLabelPreview
          item={item}
          size={size}
          onSizeChange={setSize}
          contentOptions={contentOptions}
          onContentOptionsChange={setContentOptions}
          quantity={quantity}
          onQuantityChange={setQuantity}
          currency={currency}
        />

        {/* Hidden Print Area */}
        <div className="hidden">
          <div ref={printRef}>
            <BarcodeLabelSheet
              items={printItems}
              size={size}
              format={sheetFormat}
              contentOptions={contentOptions}
              currency={currency}
            />
          </div>
        </div>
      </Modal>
    );
  }

  // Batch mode - multiple items
  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <Space>
          <PrinterOutlined />
          <span>{t('batchTitle')}</span>
        </Space>
      }
      width={720}
      footer={
        <Space className="w-full justify-between">
          <Text type="secondary" className="text-sm">
            {t('totalLabels', { count: totalLabels })} |{' '}
            {t('itemCount', { count: allItems.length })}
          </Text>
          <Space>
            <Button onClick={handleClose}>{tCommon('actions.cancel')}</Button>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              loading={isPrinting}
              onClick={() => handlePrint()}
            >
              {t('printLabels')}
            </Button>
          </Space>
        </Space>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'items',
            label: (
              <Space>
                <UnorderedListOutlined />
                <span>{t('itemsList')}</span>
              </Space>
            ),
            children: (
              <div className="space-y-4">
                {/* Items List with Quantity */}
                <List
                  dataSource={allItems}
                  size="small"
                  className="max-h-[300px] overflow-auto border rounded-lg"
                  renderItem={(listItem) => (
                    <List.Item
                      key={listItem.id_item}
                      className="px-3"
                      extra={
                        <Space>
                          <Text type="secondary" className="text-xs">
                            {t('qty')}:
                          </Text>
                          <InputNumber
                            min={1}
                            max={100}
                            value={itemQuantities[listItem.id_item] || 1}
                            onChange={(value) => handleItemQuantityChange(listItem.id_item, value)}
                            size="small"
                            className="w-16"
                          />
                        </Space>
                      }
                    >
                      <List.Item.Meta
                        title={
                          <Text className="text-sm">{listItem.item_name || t('untitled')}</Text>
                        }
                        description={
                          <Text type="secondary" className="text-xs">
                            {listItem.sku || listItem.barcode || '-'}
                          </Text>
                        }
                      />
                    </List.Item>
                  )}
                />

                {/* Alert about total */}
                <Alert
                  type="info"
                  icon={<InfoCircleOutlined />}
                  message={t('batchInfo', { count: totalLabels })}
                  showIcon
                />
              </div>
            ),
          },
          {
            key: 'sheet',
            label: (
              <Space>
                <AppstoreOutlined />
                <span>{t('sheetPreview')}</span>
              </Space>
            ),
            children: (
              <div className="space-y-4">
                {/* Preview component for options */}
                {allItems[0] && (
                  <BarcodeLabelPreview
                    item={allItems[0]}
                    size={size}
                    onSizeChange={setSize}
                    contentOptions={contentOptions}
                    onContentOptionsChange={setContentOptions}
                    quantity={itemQuantities[allItems[0].id_item] || 1}
                    onQuantityChange={(qty) => handleItemQuantityChange(allItems[0]!.id_item, qty)}
                    currency={currency}
                  />
                )}

                {/* Sheet Preview Info */}
                <Alert
                  type="info"
                  showIcon
                  message={t('sheetInfo', {
                    format: t(`sheetFormats.${sheetFormat}`),
                    total: totalLabels,
                  })}
                />
              </div>
            ),
          },
        ]}
      />

      {/* Hidden Print Area */}
      <div className="hidden">
        <div ref={printRef}>
          <BarcodeLabelSheet
            items={printItems}
            size={size}
            format={sheetFormat}
            contentOptions={contentOptions}
            currency={currency}
          />
        </div>
      </div>
    </Modal>
  );
}

// =============================================================================
// SKELETON VARIANT
// =============================================================================

/**
 * Loading skeleton variant of BarcodeLabelModal content
 */
export function BarcodeLabelModalSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      <BarcodeLabelPreviewSkeleton />
    </div>
  );
}

export default BarcodeLabelModal;
