'use client';

/**
 * PurchaseForm Component
 *
 * Form for creating and editing purchase orders.
 * Includes supplier selection, date picker, line items, and totals.
 *
 * Features:
 * - Supplier selection (searchable dropdown)
 * - Expected delivery date picker
 * - Line items section with add/remove
 * - Item fields: description, metal type, purity, weight, quantity, price
 * - Auto-calculate line totals and grand total
 * - Invoice image upload (multiple files)
 * - Notes field
 * - Save as draft or submit
 *
 * @module components/domain/purchases/PurchaseForm
 */

import React, { useState, useCallback, useMemo } from 'react';

import { PlusOutlined, DeleteOutlined, SaveOutlined, FileImageOutlined } from '@ant-design/icons';
import {
  Form,
  Input,
  DatePicker,
  InputNumber,
  Select,
  Card,
  Divider,
  Typography,
  Row,
  Col,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslations, useLocale } from 'next-intl';

import { InvoiceImageUpload } from '@/components/domain/purchases/InvoiceImageUpload';
import { SupplierSelect } from '@/components/domain/suppliers/SupplierSelect';
import { Button } from '@/components/ui/Button';
import { useLinkFilesToEntity, type FileUploadResult } from '@/lib/hooks/data/useFileUpload';
import { useCreatePurchase, useUpdatePurchase } from '@/lib/hooks/data/usePurchases';
import { useShop } from '@/lib/hooks/shop';
import type { Locale } from '@/lib/i18n/routing';
import { formatCurrency } from '@/lib/utils/format';

const { TextArea } = Input;
const { Title, Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface PurchaseLineItem {
  id: string;
  description: string;
  metalType: string;
  purity: string;
  weightGrams: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseFormData {
  supplierId: string | null;
  invoiceNumber: string;
  purchaseDate: string;
  items: PurchaseLineItem[];
  notes: string;
}

export interface PurchaseFormProps {
  /** Initial form data for editing */
  initialData?: Partial<PurchaseFormData>;
  /** Purchase ID for editing */
  purchaseId?: string;
  /** Callback after successful save */
  onSuccess?: (purchaseId: string) => void;
  /** Callback on cancel */
  onCancel?: () => void;
  /** Whether the form is in edit mode */
  isEditing?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const METAL_TYPES = [
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'palladium', label: 'Palladium' },
];

const PURITY_OPTIONS = {
  gold: [
    { value: '24k', label: '24K (999)' },
    { value: '22k', label: '22K (916)' },
    { value: '21k', label: '21K (875)' },
    { value: '18k', label: '18K (750)' },
    { value: '14k', label: '14K (585)' },
  ],
  silver: [
    { value: '999', label: 'Fine Silver (999)' },
    { value: '925', label: 'Sterling (925)' },
  ],
  platinum: [
    { value: '950', label: '950 Platinum' },
    { value: '900', label: '900 Platinum' },
  ],
  palladium: [{ value: '950', label: '950 Palladium' }],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createEmptyItem(): PurchaseLineItem {
  return {
    id: generateItemId(),
    description: '',
    metalType: 'gold',
    purity: '21k',
    weightGrams: 0,
    quantity: 1,
    unitPrice: 0,
    lineTotal: 0,
  };
}

function calculateLineTotal(item: PurchaseLineItem): number {
  return item.quantity * item.unitPrice;
}

// =============================================================================
// LINE ITEM COMPONENT
// =============================================================================

interface LineItemRowProps {
  item: PurchaseLineItem;
  index: number;
  currency: string;
  locale: Locale;
  onChange: (id: string, field: keyof PurchaseLineItem, value: unknown) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  t: ReturnType<typeof useTranslations>;
  tInventory: ReturnType<typeof useTranslations>;
}

function LineItemRow({
  item,
  index,
  currency,
  locale,
  onChange,
  onRemove,
  canRemove,
  t,
  tInventory,
}: LineItemRowProps): React.JSX.Element {
  const purityOptions = PURITY_OPTIONS[item.metalType as keyof typeof PURITY_OPTIONS] || [];

  return (
    <Card
      size="small"
      className="border border-stone-200 mb-3"
      title={
        <span className="text-stone-600">
          {t('lineItem')} #{index + 1}
        </span>
      }
      extra={
        canRemove && (
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => onRemove(item.id)}
          />
        )
      }
    >
      <Row gutter={[12, 12]}>
        {/* Description */}
        <Col xs={24} sm={12}>
          <Form.Item label={t('itemDescription')} className="mb-0">
            <Input
              value={item.description}
              onChange={(e) => onChange(item.id, 'description', e.target.value)}
              placeholder={t('itemDescriptionPlaceholder')}
            />
          </Form.Item>
        </Col>

        {/* Metal Type */}
        <Col xs={12} sm={6}>
          <Form.Item label={tInventory('metals.title')} className="mb-0">
            <Select
              value={item.metalType}
              onChange={(value) => {
                onChange(item.id, 'metalType', value);
                // Reset purity when metal type changes
                const newPurityOptions = PURITY_OPTIONS[value as keyof typeof PURITY_OPTIONS] || [];
                const firstPurity = newPurityOptions[0];
                if (firstPurity) {
                  onChange(item.id, 'purity', firstPurity.value);
                }
              }}
              options={METAL_TYPES.map((m) => ({
                value: m.value,
                label: tInventory(`metals.${m.value}`),
              }))}
            />
          </Form.Item>
        </Col>

        {/* Purity */}
        <Col xs={12} sm={6}>
          <Form.Item label={tInventory('metals.purity')} className="mb-0">
            <Select
              value={item.purity}
              onChange={(value) => onChange(item.id, 'purity', value)}
              options={purityOptions}
            />
          </Form.Item>
        </Col>

        {/* Weight */}
        <Col xs={12} sm={6}>
          <Form.Item label={tInventory('metals.weight')} className="mb-0">
            <InputNumber
              value={item.weightGrams}
              onChange={(value) => onChange(item.id, 'weightGrams', value || 0)}
              min={0}
              step={0.01}
              precision={2}
              addonAfter="g"
              className="w-full"
            />
          </Form.Item>
        </Col>

        {/* Quantity */}
        <Col xs={12} sm={6}>
          <Form.Item label={t('quantity')} className="mb-0">
            <InputNumber
              value={item.quantity}
              onChange={(value) => onChange(item.id, 'quantity', value || 1)}
              min={1}
              className="w-full"
            />
          </Form.Item>
        </Col>

        {/* Unit Price */}
        <Col xs={12} sm={6}>
          <Form.Item label={t('unitPrice')} className="mb-0">
            <InputNumber
              value={item.unitPrice}
              onChange={(value) => onChange(item.id, 'unitPrice', value || 0)}
              min={0}
              step={0.01}
              precision={2}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/,/g, '') as unknown as number}
              className="w-full"
            />
          </Form.Item>
        </Col>

        {/* Line Total */}
        <Col xs={12} sm={6}>
          <Form.Item label={t('lineTotal')} className="mb-0">
            <div className="h-8 flex items-center">
              <Text strong className="text-amber-700">
                {formatCurrency(item.lineTotal, currency, locale)}
              </Text>
            </div>
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PurchaseForm({
  initialData,
  purchaseId,
  onSuccess,
  onCancel,
  isEditing = false,
}: PurchaseFormProps): React.JSX.Element {
  const t = useTranslations('purchases');
  const tCommon = useTranslations('common');
  const tInventory = useTranslations('inventory');
  const locale = useLocale() as Locale;
  const { shop } = useShop();
  const currency = shop?.currency || 'USD';

  // Mutations
  const createPurchase = useCreatePurchase();
  const updatePurchase = useUpdatePurchase();
  const linkFiles = useLinkFilesToEntity();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [supplierId, setSupplierId] = useState<string | null>(initialData?.supplierId || null);
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || '');
  const [purchaseDate, setPurchaseDate] = useState<string>(
    initialData?.purchaseDate || dayjs().format('YYYY-MM-DD')
  );
  const [items, setItems] = useState<PurchaseLineItem[]>(initialData?.items || [createEmptyItem()]);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Invoice images - stores uploaded file info for linking after purchase creation
  const [uploadedInvoiceImages, setUploadedInvoiceImages] = useState<FileUploadResult[]>([]);

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const totals = useMemo(() => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalWeight = items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
    return { totalItems, totalWeight, totalAmount };
  }, [items]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleItemChange = useCallback(
    (id: string, field: keyof PurchaseLineItem, value: unknown) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) {
            return item;
          }
          const updatedItem = { ...item, [field]: value };
          // Recalculate line total
          updatedItem.lineTotal = calculateLineTotal(updatedItem);
          return updatedItem;
        })
      );
    },
    []
  );

  const handleAddItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyItem()]);
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  /**
   * Handles invoice image uploads for new purchases.
   * Files are uploaded immediately but linked to the purchase after creation.
   */
  const handleInvoiceImagesChange = useCallback((files: FileUploadResult[]) => {
    setUploadedInvoiceImages(files);
  }, []);

  const handleSubmit = useCallback(
    async (_asDraft: boolean = false) => {
      // Validation
      if (!supplierId) {
        message.error(t('validation.supplierRequired'));
        return;
      }

      if (items.length === 0 || items.every((item) => !item.description)) {
        message.error(t('validation.itemsRequired'));
        return;
      }

      setIsSubmitting(true);

      try {
        const purchaseData = {
          id_supplier: supplierId,
          invoice_number: invoiceNumber || null,
          purchase_date: purchaseDate,
          currency,
          total_items: totals.totalItems,
          total_weight_grams: totals.totalWeight,
          total_amount: totals.totalAmount,
          paid_amount: 0,
          notes: notes || null,
        };

        if (isEditing && purchaseId) {
          await updatePurchase.mutateAsync({
            purchaseId,
            data: purchaseData,
          });
          message.success(t('updateSuccess'));
        } else {
          const result = await createPurchase.mutateAsync(purchaseData);

          // Link uploaded invoice images to the newly created purchase
          if (uploadedInvoiceImages.length > 0) {
            try {
              await linkFiles.mutateAsync({
                fileIds: uploadedInvoiceImages.map((f) => f.id_file),
                entityType: 'purchase',
                entityId: result.id_purchase,
              });
            } catch (linkError) {
              console.error('Failed to link invoice images:', linkError);
              // Don't fail the purchase creation, just log the error
            }
          }

          message.success(t('createSuccess'));
          onSuccess?.(result.id_purchase);
        }
      } catch (error) {
        console.error('Failed to save purchase:', error);
        message.error(isEditing ? t('updateError') : t('createError'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      supplierId,
      invoiceNumber,
      purchaseDate,
      items,
      notes,
      totals,
      currency,
      isEditing,
      purchaseId,
      createPurchase,
      updatePurchase,
      linkFiles,
      uploadedInvoiceImages,
      onSuccess,
      t,
    ]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Form layout="vertical" className="space-y-6">
      {/* Supplier and Basic Info */}
      <Card title={t('purchaseDetails')} className="border border-stone-200">
        <Row gutter={[16, 16]}>
          {/* Supplier */}
          <Col xs={24} sm={12}>
            <Form.Item
              label={t('supplier')}
              required
              validateStatus={!supplierId ? 'error' : undefined}
            >
              <SupplierSelect
                value={supplierId}
                onChange={setSupplierId}
                placeholder={t('selectSupplier')}
              />
            </Form.Item>
          </Col>

          {/* Invoice Number */}
          <Col xs={24} sm={12}>
            <Form.Item label={t('invoiceNumber')}>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder={t('invoiceNumberPlaceholder')}
              />
            </Form.Item>
          </Col>

          {/* Purchase Date */}
          <Col xs={24} sm={12}>
            <Form.Item label={t('purchaseDate')} required>
              <DatePicker
                value={purchaseDate ? dayjs(purchaseDate) : null}
                onChange={(date) => setPurchaseDate(date?.format('YYYY-MM-DD') || '')}
                format="YYYY-MM-DD"
                className="w-full"
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* Line Items */}
      <Card
        title={t('lineItems')}
        className="border border-stone-200"
        extra={
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem}>
            {t('addItem')}
          </Button>
        }
      >
        {items.map((item, index) => (
          <LineItemRow
            key={item.id}
            item={item}
            index={index}
            currency={currency}
            locale={locale}
            onChange={handleItemChange}
            onRemove={handleRemoveItem}
            canRemove={items.length > 1}
            t={t}
            tInventory={tInventory}
          />
        ))}

        {/* Totals Summary */}
        <Divider />
        <div className="flex flex-col items-end space-y-2">
          <div className="flex justify-between w-full max-w-xs">
            <Text type="secondary">{t('totalItems')}:</Text>
            <Text>{totals.totalItems}</Text>
          </div>
          <div className="flex justify-between w-full max-w-xs">
            <Text type="secondary">{t('totalWeight')}:</Text>
            <Text>{totals.totalWeight.toFixed(2)} g</Text>
          </div>
          <div className="flex justify-between w-full max-w-xs">
            <Text type="secondary" strong>
              {t('grandTotal')}:
            </Text>
            <Title level={4} className="!mb-0 text-amber-700">
              {formatCurrency(totals.totalAmount, currency, locale)}
            </Title>
          </div>
        </div>
      </Card>

      {/* Invoice Images */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <FileImageOutlined className="text-amber-500" />
            <span>{t('invoiceImages.title')}</span>
          </div>
        }
        className="border border-stone-200"
      >
        <InvoiceImageUpload
          purchaseId={isEditing ? (purchaseId ?? null) : null}
          onFilesChange={handleInvoiceImagesChange}
          maxFiles={10}
          disabled={isSubmitting}
        />
      </Card>

      {/* Notes */}
      <Card title={tCommon('labels.notes')} className="border border-stone-200">
        <TextArea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('notesPlaceholder')}
          rows={3}
          maxLength={2000}
          showCount
        />
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button onClick={onCancel} disabled={isSubmitting}>
            {tCommon('actions.cancel')}
          </Button>
        )}
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={() => handleSubmit(false)}
          loading={isSubmitting}
        >
          {isEditing ? tCommon('actions.save') : t('createPurchase')}
        </Button>
      </div>
    </Form>
  );
}

export default PurchaseForm;
