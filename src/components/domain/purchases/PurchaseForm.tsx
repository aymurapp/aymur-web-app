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
 * - Barcode generation and printing per item
 * - Bulk barcode printing
 * - Notes field
 * - Save as draft or submit
 *
 * @module components/domain/purchases/PurchaseForm
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  FileImageOutlined,
  PrinterOutlined,
  BarcodeOutlined,
  CameraOutlined,
} from '@ant-design/icons';
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
  Tooltip,
  Upload,
  Image,
} from 'antd';
import dayjs from 'dayjs';
import JsBarcode from 'jsbarcode';
import { useTranslations, useLocale } from 'next-intl';
import { useReactToPrint } from 'react-to-print';

import { InvoiceImageUpload } from '@/components/domain/purchases/InvoiceImageUpload';
import { SupplierSelect } from '@/components/domain/suppliers/SupplierSelect';
import { Button } from '@/components/ui/Button';
import { useLinkFilesToEntity, type FileUploadResult } from '@/lib/hooks/data/useFileUpload';
import { useCreatePurchase, useUpdatePurchase } from '@/lib/hooks/data/usePurchases';
import { useShop } from '@/lib/hooks/shop';
import type { Locale } from '@/lib/i18n/routing';
import { formatCurrency, formatNumber, formatDecimal } from '@/lib/utils/format';

import type { RcFile } from 'antd/es/upload';

const { TextArea } = Input;
const { Title, Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/** Item image for line items */
export interface ItemImage {
  uid: string;
  name: string;
  url?: string;
  thumbUrl?: string;
  status: 'done' | 'uploading' | 'error';
  file?: RcFile;
}

export interface PurchaseLineItem {
  id: string;
  description: string;
  metalType: string;
  purity: string;
  weightGrams: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  barcode: string;
  /** Item images (max 3 per item) */
  images: ItemImage[];
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

/** Counter for unique barcode sequence within a session */
let barcodeSequence = 0;

function generateItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a unique barcode for an item
 * Format: {SHOP_PREFIX}-{6_DIGIT_SEQUENCE}
 * Example: SHOP-000001
 */
function generateBarcode(shopName: string): string {
  barcodeSequence += 1;
  // Create shop prefix from first 4 letters of shop name (uppercase, alphanumeric only)
  const prefix = (shopName || 'SHOP')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 4)
    .toUpperCase()
    .padEnd(4, 'X');
  // Generate 6-digit sequence with leading zeros
  const sequence = String(barcodeSequence + (Date.now() % 10000))
    .padStart(6, '0')
    .slice(-6);
  return `${prefix}-${sequence}`;
}

function createEmptyItem(shopName: string): PurchaseLineItem {
  return {
    id: generateItemId(),
    description: '',
    metalType: 'gold',
    purity: '21k',
    weightGrams: 0,
    quantity: 1,
    unitPrice: 0,
    lineTotal: 0,
    barcode: generateBarcode(shopName),
    images: [],
  };
}

function calculateLineTotal(item: PurchaseLineItem): number {
  return item.quantity * item.unitPrice;
}

// =============================================================================
// BARCODE DISPLAY COMPONENT
// =============================================================================

interface BarcodeDisplayProps {
  barcode: string;
  onPrint: () => void;
  t: ReturnType<typeof useTranslations>;
}

function BarcodeDisplay({ barcode, onPrint, t }: BarcodeDisplayProps): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && barcode) {
      try {
        JsBarcode(svgRef.current, barcode, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 10,
          margin: 5,
          background: 'transparent',
          lineColor: '#000000',
        });
      } catch (error) {
        console.error('Barcode generation failed:', error);
      }
    }
  }, [barcode]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-white border border-stone-200 rounded p-2 flex justify-center">
        <svg ref={svgRef} />
      </div>
      <Tooltip title={t('printBarcode')}>
        <Button
          type="default"
          size="small"
          icon={<PrinterOutlined />}
          onClick={onPrint}
          className="flex-shrink-0"
        />
      </Tooltip>
    </div>
  );
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
  onPrintBarcode: (item: PurchaseLineItem) => void;
  onRegenerateBarcode: (id: string) => void;
  onImageChange: (id: string, images: ItemImage[]) => void;
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
  onPrintBarcode,
  onRegenerateBarcode,
  onImageChange,
  canRemove,
  t,
  tInventory,
}: LineItemRowProps): React.JSX.Element {
  const purityOptions = PURITY_OPTIONS[item.metalType as keyof typeof PURITY_OPTIONS] || [];
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  // Handle image upload for this item
  const handleImageUpload = useCallback(
    (file: RcFile): boolean => {
      if (item.images.length >= 3) {
        message.warning(t('itemImages.maxReached'));
        return false;
      }

      // Validate file type
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error(t('itemImages.invalidType'));
        return false;
      }

      // Validate file size (5MB max)
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error(t('itemImages.fileTooLarge'));
        return false;
      }

      // Create preview URL
      const url = URL.createObjectURL(file);
      const newImage: ItemImage = {
        uid: `${item.id}-${Date.now()}`,
        name: file.name,
        url,
        thumbUrl: url,
        status: 'done',
        file,
      };

      onImageChange(item.id, [...item.images, newImage]);
      return false; // Prevent default upload
    },
    [item.id, item.images, onImageChange, t]
  );

  // Handle image removal
  const handleImageRemove = useCallback(
    (uid: string) => {
      const newImages = item.images.filter((img) => img.uid !== uid);
      // Revoke the object URL to free memory
      const removedImg = item.images.find((img) => img.uid === uid);
      if (removedImg?.url && removedImg.url.startsWith('blob:')) {
        URL.revokeObjectURL(removedImg.url);
      }
      onImageChange(item.id, newImages);
    },
    [item.id, item.images, onImageChange]
  );

  // Handle preview
  const handlePreview = useCallback((url: string) => {
    setPreviewImage(url);
    setPreviewOpen(true);
  }, []);

  return (
    <Card
      size="small"
      className="border border-stone-200 mb-3"
      title={
        <div className="flex items-center gap-2">
          <BarcodeOutlined className="text-amber-500" />
          <span className="text-stone-600">
            {t('lineItem')} #{index + 1}
          </span>
        </div>
      }
      extra={
        <div className="flex items-center gap-1">
          <Tooltip title={t('regenerate')}>
            <Button
              type="text"
              size="small"
              icon={<BarcodeOutlined />}
              onClick={() => onRegenerateBarcode(item.id)}
            />
          </Tooltip>
          {canRemove && (
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => onRemove(item.id)}
            />
          )}
        </div>
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

        {/* Barcode Display */}
        <Col xs={24}>
          <Form.Item label={t('barcode.label')} className="mb-0">
            <BarcodeDisplay barcode={item.barcode} onPrint={() => onPrintBarcode(item)} t={t} />
          </Form.Item>
        </Col>

        {/* Item Images (max 3) */}
        <Col xs={24}>
          <Form.Item
            label={
              <div className="flex items-center gap-2">
                <CameraOutlined className="text-amber-500" />
                <span>
                  {t('itemImages.title')} ({item.images.length}/3)
                </span>
              </div>
            }
            className="mb-0"
          >
            <div className="flex flex-wrap gap-2">
              {/* Existing images */}
              {item.images.map((img) => (
                <div
                  key={img.uid}
                  className="relative w-20 h-20 border border-stone-200 rounded-lg overflow-hidden group"
                >
                  <Image
                    src={img.url || img.thumbUrl}
                    alt={img.name}
                    className="w-full h-full object-cover"
                    preview={{
                      visible: false,
                      mask: null,
                    }}
                    onClick={() => img.url && handlePreview(img.url)}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <Tooltip title={t('itemImages.preview')}>
                      <button
                        type="button"
                        className="p-1 text-white hover:text-amber-400"
                        onClick={() => img.url && handlePreview(img.url)}
                      >
                        <CameraOutlined />
                      </button>
                    </Tooltip>
                    <Tooltip title={t('itemImages.remove')}>
                      <button
                        type="button"
                        className="p-1 text-white hover:text-red-400"
                        onClick={() => handleImageRemove(img.uid)}
                      >
                        <DeleteOutlined />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))}

              {/* Upload button */}
              {item.images.length < 3 && (
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={handleImageUpload}
                  multiple={false}
                >
                  <div className="w-20 h-20 border-2 border-dashed border-stone-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/50 transition-colors">
                    <PlusOutlined className="text-stone-400" />
                    <span className="text-xs text-stone-400 mt-1">{t('itemImages.add')}</span>
                  </div>
                </Upload>
              )}
            </div>
          </Form.Item>
        </Col>
      </Row>

      {/* Image Preview Modal */}
      <Image
        style={{ display: 'none' }}
        preview={{
          visible: previewOpen,
          src: previewImage,
          onVisibleChange: (visible) => setPreviewOpen(visible),
        }}
      />
    </Card>
  );
}

// =============================================================================
// PRINTABLE BARCODE LABEL COMPONENT
// =============================================================================

interface PrintableBarcodeLabelProps {
  item: PurchaseLineItem;
  shopName: string;
}

/**
 * Printable barcode label for use in print views
 * Renders a CODE128 barcode with item details
 */
function PrintableBarcodeLabel({ item, shopName }: PrintableBarcodeLabelProps): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && item.barcode) {
      try {
        JsBarcode(svgRef.current, item.barcode, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 12,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (error) {
        console.error('Barcode generation failed:', error);
      }
    }
  }, [item.barcode]);

  return (
    <div
      className="border border-stone-300 rounded p-3 bg-white text-center"
      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
    >
      <div className="text-xs text-stone-500 mb-1">{shopName}</div>
      <div className="font-semibold text-sm mb-2 truncate" title={item.description}>
        {item.description || 'Item'}
      </div>
      <svg ref={svgRef} className="mx-auto" />
      <div className="text-xs text-stone-600 mt-2">
        {item.metalType.toUpperCase()} | {item.purity} | {item.weightGrams}g
      </div>
    </div>
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
  const shopName = shop?.shop_name || 'SHOP';

  // Mutations
  const createPurchase = useCreatePurchase();
  const updatePurchase = useUpdatePurchase();
  const linkFiles = useLinkFilesToEntity();

  // Print refs
  const singlePrintRef = useRef<HTMLDivElement>(null);
  const bulkPrintRef = useRef<HTMLDivElement>(null);
  const [printingItem, setPrintingItem] = useState<PurchaseLineItem | null>(null);

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [supplierId, setSupplierId] = useState<string | null>(initialData?.supplierId || null);
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || '');
  const [purchaseDate, setPurchaseDate] = useState<string>(
    initialData?.purchaseDate || dayjs().format('YYYY-MM-DD')
  );
  const [items, setItems] = useState<PurchaseLineItem[]>(
    () => initialData?.items || [createEmptyItem(shopName)]
  );
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
    setItems((prev) => [...prev, createEmptyItem(shopName)]);
  }, [shopName]);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  /**
   * Regenerates a barcode for a specific item
   */
  const handleRegenerateBarcode = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) {
            return item;
          }
          return { ...item, barcode: generateBarcode(shopName) };
        })
      );
    },
    [shopName]
  );

  /**
   * Handles image changes for a specific item
   */
  const handleItemImageChange = useCallback((id: string, images: ItemImage[]) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        return { ...item, images };
      })
    );
  }, []);

  /**
   * Handles invoice image uploads for new purchases.
   * Files are uploaded immediately but linked to the purchase after creation.
   */
  const handleInvoiceImagesChange = useCallback((files: FileUploadResult[]) => {
    setUploadedInvoiceImages(files);
  }, []);

  /**
   * Print single barcode label
   */
  const handlePrintSingleBarcode = useReactToPrint({
    content: () => singlePrintRef.current,
    documentTitle: 'Barcode Label',
    onAfterPrint: () => setPrintingItem(null),
  });

  /**
   * Print all barcode labels
   */
  const handlePrintAllBarcodes = useReactToPrint({
    content: () => bulkPrintRef.current,
    documentTitle: 'All Barcode Labels',
  });

  /**
   * Trigger printing for a single item
   */
  const handlePrintItemBarcode = useCallback(
    (item: PurchaseLineItem) => {
      setPrintingItem(item);
      // Small delay to ensure the print content is rendered
      setTimeout(() => {
        handlePrintSingleBarcode();
      }, 100);
    },
    [handlePrintSingleBarcode]
  );

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
                entityType: 'purchases',
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
      {/* Supplier and Basic Info - Including Invoice Images */}
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

          {/* Invoice Images - Moved BEFORE Purchase Date */}
          <Col xs={24}>
            <Form.Item
              label={
                <div className="flex items-center gap-2">
                  <FileImageOutlined className="text-amber-500" />
                  <span>{t('invoiceImages.title')}</span>
                </div>
              }
            >
              <InvoiceImageUpload
                purchaseId={isEditing ? (purchaseId ?? null) : null}
                onFilesChange={handleInvoiceImagesChange}
                maxFiles={10}
                disabled={isSubmitting}
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
        title={
          <div className="flex items-center gap-2">
            <BarcodeOutlined className="text-amber-500" />
            <span>{t('lineItems')}</span>
          </div>
        }
        className="border border-stone-200"
        extra={
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <Tooltip title={t('barcode.printAll')}>
                <Button
                  type="default"
                  icon={<PrinterOutlined />}
                  onClick={() => handlePrintAllBarcodes()}
                  disabled={items.length === 0}
                >
                  {t('barcode.printAll')}
                </Button>
              </Tooltip>
            )}
            <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem}>
              {t('addItem')}
            </Button>
          </div>
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
            onPrintBarcode={handlePrintItemBarcode}
            onRegenerateBarcode={handleRegenerateBarcode}
            onImageChange={handleItemImageChange}
            canRemove={items.length > 1}
            t={t}
            tInventory={tInventory}
          />
        ))}

        {/* Totals Summary - Enhanced display */}
        <Divider />
        <div className="bg-stone-50 rounded-lg p-4">
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={8}>
              <div className="text-center">
                <Text type="secondary" className="block text-sm">
                  {t('totalItems')}
                </Text>
                <Text strong className="text-xl">
                  {formatNumber(totals.totalItems, locale)}
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="text-center">
                <Text type="secondary" className="block text-sm">
                  {t('totalWeight')}
                </Text>
                <Text strong className="text-xl">
                  {formatDecimal(totals.totalWeight, 2, locale)} g
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="text-center">
                <Text type="secondary" className="block text-sm">
                  {t('grandTotal')}
                </Text>
                <Title level={3} className="!mb-0 text-amber-700">
                  {formatCurrency(totals.totalAmount, currency, locale)}
                </Title>
              </div>
            </Col>
          </Row>
        </div>
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

      {/* Hidden Print Areas */}
      {/* Single barcode print area */}
      <div className="hidden">
        <div ref={singlePrintRef} className="p-4">
          {printingItem && <PrintableBarcodeLabel item={printingItem} shopName={shopName} />}
        </div>
      </div>

      {/* Bulk barcode print area */}
      <div className="hidden">
        <div ref={bulkPrintRef} className="p-4">
          <div className="grid grid-cols-3 gap-4">
            {items.map((item) => (
              <PrintableBarcodeLabel key={item.id} item={item} shopName={shopName} />
            ))}
          </div>
        </div>
      </div>
    </Form>
  );
}

export default PurchaseForm;
