'use client';

/**
 * ExportDialog Component
 *
 * A dialog for exporting data from the system in various formats.
 * Supports inventory, customers, sales, and suppliers exports.
 *
 * Features:
 * - Export type selection (inventory, customers, sales, suppliers)
 * - Format selection (CSV, JSON, Excel)
 * - Date range filter for sales exports
 * - Column selection for each export type
 * - Preview count of records to export
 * - Progress indicator during export
 * - Mock download functionality
 *
 * @module components/domain/settings/ExportDialog
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';

import {
  DownloadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  CodeOutlined,
  DatabaseOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  PictureOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import {
  Modal,
  Radio,
  Checkbox,
  DatePicker,
  Select,
  Progress,
  Typography,
  Divider,
  Space,
  Alert,
  Spin,
} from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

import type { RadioChangeEvent } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export type ExportType = 'inventory' | 'customers' | 'sales' | 'suppliers';
export type ExportFormat = 'csv' | 'json' | 'excel';

export interface ExportDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Handler for closing the dialog */
  onClose: () => void;
  /** Default export type selection */
  defaultType?: ExportType;
}

interface ColumnOption {
  key: string;
  label: string;
  default: boolean;
}

type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

// =============================================================================
// CONSTANTS
// =============================================================================

const EXPORT_TYPES: { value: ExportType; icon: React.ReactNode }[] = [
  { value: 'inventory', icon: <DatabaseOutlined /> },
  { value: 'customers', icon: <UserOutlined /> },
  { value: 'sales', icon: <ShoppingCartOutlined /> },
  { value: 'suppliers', icon: <TeamOutlined /> },
];

const EXPORT_FORMATS: { value: ExportFormat; label: string; icon: React.ReactNode }[] = [
  { value: 'csv', label: 'CSV', icon: <FileTextOutlined /> },
  { value: 'json', label: 'JSON', icon: <CodeOutlined /> },
  { value: 'excel', label: 'Excel', icon: <FileExcelOutlined /> },
];

// Column definitions by export type
const COLUMN_OPTIONS: Record<ExportType, ColumnOption[]> = {
  inventory: [
    { key: 'sku', label: 'SKU', default: true },
    { key: 'barcode', label: 'Barcode', default: true },
    { key: 'item_name', label: 'Name', default: true },
    { key: 'weight_grams', label: 'Weight', default: true },
    { key: 'purchase_price', label: 'Purchase Price', default: true },
    { key: 'selling_price', label: 'Selling Price', default: true },
    { key: 'category', label: 'Category', default: true },
    { key: 'metal_type', label: 'Metal Type', default: true },
    { key: 'metal_purity', label: 'Metal Purity', default: true },
    { key: 'stone_type', label: 'Stone Type', default: false },
    { key: 'status', label: 'Status', default: true },
    { key: 'ownership_type', label: 'Ownership Type', default: false },
    { key: 'created_at', label: 'Created Date', default: false },
  ],
  customers: [
    { key: 'full_name', label: 'Full Name', default: true },
    { key: 'phone', label: 'Phone', default: true },
    { key: 'email', label: 'Email', default: true },
    { key: 'current_balance', label: 'Balance', default: true },
    { key: 'credit_limit', label: 'Credit Limit', default: true },
    { key: 'address', label: 'Address', default: false },
    { key: 'city', label: 'City', default: false },
    { key: 'country', label: 'Country', default: false },
    { key: 'total_purchases', label: 'Total Purchases', default: true },
    { key: 'last_purchase_date', label: 'Last Purchase', default: false },
    { key: 'notes', label: 'Notes', default: false },
    { key: 'created_at', label: 'Customer Since', default: false },
  ],
  sales: [
    { key: 'sale_number', label: 'Sale Number', default: true },
    { key: 'sale_date', label: 'Date', default: true },
    { key: 'customer_name', label: 'Customer', default: true },
    { key: 'items_count', label: 'Items Count', default: true },
    { key: 'items_list', label: 'Items List', default: false },
    { key: 'subtotal', label: 'Subtotal', default: true },
    { key: 'discount', label: 'Discount', default: true },
    { key: 'total_amount', label: 'Total Amount', default: true },
    { key: 'payment_status', label: 'Payment Status', default: true },
    { key: 'payment_method', label: 'Payment Method', default: true },
    { key: 'notes', label: 'Notes', default: false },
  ],
  suppliers: [
    { key: 'supplier_name', label: 'Supplier Name', default: true },
    { key: 'contact_person', label: 'Contact Person', default: true },
    { key: 'phone', label: 'Phone', default: true },
    { key: 'email', label: 'Email', default: true },
    { key: 'current_balance', label: 'Balance', default: true },
    { key: 'address', label: 'Address', default: false },
    { key: 'category', label: 'Category', default: true },
    { key: 'total_purchases', label: 'Total Purchases', default: false },
    { key: 'notes', label: 'Notes', default: false },
  ],
};

// Mock record counts for preview
const MOCK_RECORD_COUNTS: Record<ExportType, number> = {
  inventory: 1247,
  customers: 523,
  sales: 3891,
  suppliers: 48,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate mock data for export
 */
function generateMockData(exportType: ExportType, columns: string[], format: ExportFormat): string {
  const sampleRow: Record<string, unknown> = {};

  columns.forEach((col) => {
    switch (col) {
      case 'sku':
        sampleRow[col] = 'SKU-001234';
        break;
      case 'barcode':
        sampleRow[col] = '1234567890123';
        break;
      case 'item_name':
      case 'full_name':
      case 'supplier_name':
        sampleRow[col] = 'Sample Name';
        break;
      case 'weight_grams':
        sampleRow[col] = 15.5;
        break;
      case 'purchase_price':
      case 'selling_price':
      case 'subtotal':
      case 'total_amount':
      case 'current_balance':
      case 'credit_limit':
        sampleRow[col] = 1250.0;
        break;
      case 'phone':
        sampleRow[col] = '+1234567890';
        break;
      case 'email':
        sampleRow[col] = 'sample@example.com';
        break;
      case 'status':
      case 'payment_status':
        sampleRow[col] = 'active';
        break;
      case 'sale_date':
      case 'created_at':
      case 'last_purchase_date':
        sampleRow[col] = new Date().toISOString();
        break;
      case 'items_count':
      case 'total_purchases':
        sampleRow[col] = 10;
        break;
      default:
        sampleRow[col] = 'Sample Value';
    }
  });

  // Create multiple sample rows
  const rows: Record<string, unknown>[] = Array(5)
    .fill(null)
    .map((_, i) => ({
      ...sampleRow,
      id: i + 1,
    }));

  if (format === 'json') {
    return JSON.stringify(
      { data: rows, exportType, exportedAt: new Date().toISOString() },
      null,
      2
    );
  }

  if (format === 'csv') {
    const headers = columns.join(',');
    const dataRows = rows.map((row) =>
      columns
        .map((col) => {
          const value = row[col];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        })
        .join(',')
    );
    return [headers, ...dataRows].join('\n');
  }

  // For Excel, we return CSV-like format (actual Excel would require a library)
  const headers = columns.join('\t');
  const dataRows = rows.map((row) => columns.map((col) => row[col]).join('\t'));
  return [headers, ...dataRows].join('\n');
}

/**
 * Get file extension for format
 */
function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'json':
      return 'json';
    case 'excel':
      return 'xlsx';
    case 'csv':
    default:
      return 'csv';
  }
}

/**
 * Get MIME type for format
 */
function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'json':
      return 'application/json';
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'csv':
    default:
      return 'text/csv';
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ExportDialog - Modal for exporting data from the system
 */
export function ExportDialog({
  open,
  onClose,
  defaultType = 'inventory',
}: ExportDialogProps): React.JSX.Element {
  const t = useTranslations('settings.export');
  const tCommon = useTranslations('common');

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [exportType, setExportType] = useState<ExportType>(defaultType);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [selectedColumns, setSelectedColumns] = useState<Record<ExportType, string[]>>({
    inventory: COLUMN_OPTIONS.inventory.filter((c) => c.default).map((c) => c.key),
    customers: COLUMN_OPTIONS.customers.filter((c) => c.default).map((c) => c.key),
    sales: COLUMN_OPTIONS.sales.filter((c) => c.default).map((c) => c.key),
    suppliers: COLUMN_OPTIONS.suppliers.filter((c) => c.default).map((c) => c.key),
  });
  const [dateRange, setDateRange] = useState<DateRangeValue>(null);
  const [includeImages, setIncludeImages] = useState(false);
  const [includeTransactions, setIncludeTransactions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewCount, setPreviewCount] = useState<number>(0);

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const currentColumns = useMemo(() => COLUMN_OPTIONS[exportType], [exportType]);
  const currentSelectedColumns = useMemo(
    () => selectedColumns[exportType],
    [selectedColumns, exportType]
  );

  const showDateRange = exportType === 'sales';
  const showIncludeImages = exportType === 'inventory';
  const showIncludeTransactions = exportType === 'customers';

  const canExport = useMemo(() => {
    if (currentSelectedColumns.length === 0) {
      return false;
    }
    if (exportType === 'sales' && !dateRange) {
      return false;
    }
    return true;
  }, [currentSelectedColumns, exportType, dateRange]);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setExportType(defaultType);
      setExportFormat('csv');
      setDateRange(null);
      setIncludeImages(false);
      setIncludeTransactions(false);
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [open, defaultType]);

  // Simulate loading preview count when export type changes
  useEffect(() => {
    if (open) {
      setIsLoadingPreview(true);
      const timer = setTimeout(() => {
        setPreviewCount(MOCK_RECORD_COUNTS[exportType]);
        setIsLoadingPreview(false);
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, exportType]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleExportTypeChange = useCallback((e: RadioChangeEvent) => {
    setExportType(e.target.value);
  }, []);

  const handleFormatChange = useCallback((value: ExportFormat) => {
    setExportFormat(value);
  }, []);

  const handleColumnToggle = useCallback(
    (columnKey: string, checked: boolean) => {
      setSelectedColumns((prev) => ({
        ...prev,
        [exportType]: checked
          ? [...prev[exportType], columnKey]
          : prev[exportType].filter((k) => k !== columnKey),
      }));
    },
    [exportType]
  );

  const handleSelectAllColumns = useCallback(
    (checked: boolean) => {
      setSelectedColumns((prev) => ({
        ...prev,
        [exportType]: checked ? currentColumns.map((c) => c.key) : [],
      }));
    },
    [exportType, currentColumns]
  );

  const handleDateRangeChange = useCallback((dates: DateRangeValue) => {
    setDateRange(dates);
  }, []);

  const handleIncludeImagesChange = useCallback((e: CheckboxChangeEvent) => {
    setIncludeImages(e.target.checked);
  }, []);

  const handleIncludeTransactionsChange = useCallback((e: CheckboxChangeEvent) => {
    setIncludeTransactions(e.target.checked);
  }, []);

  const handleClose = useCallback(() => {
    if (!isExporting) {
      onClose();
    }
  }, [isExporting, onClose]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);

    // Simulate export progress
    const progressInterval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    // Simulate export delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    clearInterval(progressInterval);
    setExportProgress(100);

    // Generate mock data and trigger download
    const data = generateMockData(exportType, currentSelectedColumns, exportFormat);
    const blob = new Blob([data], { type: getMimeType(exportFormat) });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportType}_export_${new Date().toISOString().split('T')[0]}.${getFileExtension(exportFormat)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Reset and close
    setTimeout(() => {
      setIsExporting(false);
      setExportProgress(0);
      onClose();
    }, 500);
  }, [exportType, currentSelectedColumns, exportFormat, onClose]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const allColumnsSelected = currentSelectedColumns.length === currentColumns.length;
  const someColumnsSelected =
    currentSelectedColumns.length > 0 && currentSelectedColumns.length < currentColumns.length;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <DownloadOutlined className="text-amber-500" />
          <span>{t('title')}</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={640}
      destroyOnClose
      maskClosable={!isExporting}
      closable={!isExporting}
      footer={
        <div className="flex justify-between items-center">
          <div className="text-sm text-stone-500">
            {isLoadingPreview ? (
              <Spin size="small" />
            ) : (
              <span>{t('recordsToExport', { count: previewCount.toLocaleString() })}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleClose} disabled={isExporting}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              type="primary"
              onClick={handleExport}
              loading={isExporting}
              disabled={!canExport}
              icon={<DownloadOutlined />}
              permission="settings.export"
            >
              {isExporting ? t('exporting') : tCommon('actions.export')}
            </Button>
          </div>
        </div>
      }
    >
      {isExporting ? (
        <div className="py-12 px-4">
          <div className="text-center mb-6">
            <Title level={4} className="text-stone-700 mb-2">
              {t('exportingData')}
            </Title>
            <Text type="secondary">{t('pleaseWait')}</Text>
          </div>
          <Progress
            percent={exportProgress}
            status={exportProgress < 100 ? 'active' : 'success'}
            strokeColor={{
              '0%': '#f59e0b',
              '100%': '#d97706',
            }}
          />
          <div className="text-center mt-4 text-sm text-stone-500">
            {exportProgress < 100 ? t('preparingFile') : t('downloadStarting')}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Export Type Selection */}
          <div>
            <Text strong className="block mb-3">
              {t('selectDataType')}
            </Text>
            <Radio.Group value={exportType} onChange={handleExportTypeChange} className="w-full">
              <div className="grid grid-cols-2 gap-3">
                {EXPORT_TYPES.map(({ value, icon }) => (
                  <Radio.Button
                    key={value}
                    value={value}
                    className={cn(
                      'h-auto py-3 px-4 flex items-center justify-center gap-2',
                      'hover:border-amber-400 hover:text-amber-600',
                      exportType === value && 'border-amber-500 bg-amber-50 text-amber-700'
                    )}
                  >
                    <span className="text-lg">{icon}</span>
                    <span>{t(`types.${value}`)}</span>
                  </Radio.Button>
                ))}
              </div>
            </Radio.Group>
          </div>

          <Divider className="my-4" />

          {/* Export Format Selection */}
          <div>
            <Text strong className="block mb-3">
              {t('selectFormat')}
            </Text>
            <Select
              value={exportFormat}
              onChange={handleFormatChange}
              className="w-full"
              options={EXPORT_FORMATS.map(({ value, label, icon }) => ({
                value,
                label: (
                  <div className="flex items-center gap-2">
                    {icon}
                    <span>{label}</span>
                  </div>
                ),
              }))}
            />
          </div>

          {/* Date Range for Sales */}
          {showDateRange && (
            <div>
              <Text strong className="block mb-3">
                {t('dateRange')} <Text type="danger">*</Text>
              </Text>
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                className="w-full"
                format="YYYY-MM-DD"
              />
              {!dateRange && (
                <Text type="secondary" className="text-xs mt-1 block">
                  {t('dateRangeRequired')}
                </Text>
              )}
            </div>
          )}

          <Divider className="my-4" />

          {/* Column Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Text strong>{t('selectColumns')}</Text>
              <Checkbox
                checked={allColumnsSelected}
                indeterminate={someColumnsSelected}
                onChange={(e) => handleSelectAllColumns(e.target.checked)}
              >
                {tCommon('actions.selectAll')}
              </Checkbox>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-48 overflow-y-auto p-3 bg-stone-50 rounded-lg border border-stone-200">
              {currentColumns.map((column) => (
                <Checkbox
                  key={column.key}
                  checked={currentSelectedColumns.includes(column.key)}
                  onChange={(e) => handleColumnToggle(column.key, e.target.checked)}
                  className="text-sm"
                >
                  {column.label}
                </Checkbox>
              ))}
            </div>
            {currentSelectedColumns.length === 0 && (
              <Text type="danger" className="text-xs mt-1 block">
                {t('selectAtLeastOneColumn')}
              </Text>
            )}
          </div>

          {/* Additional Options */}
          {(showIncludeImages || showIncludeTransactions) && (
            <>
              <Divider className="my-4" />
              <div>
                <Text strong className="block mb-3">
                  {t('additionalOptions')}
                </Text>
                <Space direction="vertical" className="w-full">
                  {showIncludeImages && (
                    <Checkbox checked={includeImages} onChange={handleIncludeImagesChange}>
                      <Space>
                        <PictureOutlined />
                        {t('includeImageUrls')}
                      </Space>
                    </Checkbox>
                  )}
                  {showIncludeTransactions && (
                    <Checkbox
                      checked={includeTransactions}
                      onChange={handleIncludeTransactionsChange}
                    >
                      <Space>
                        <SwapOutlined />
                        {t('includeTransactions')}
                      </Space>
                    </Checkbox>
                  )}
                </Space>
              </div>
            </>
          )}

          {/* Export Info */}
          <Alert
            message={t('exportInfo')}
            description={t('exportInfoDescription')}
            type="info"
            showIcon
            className="bg-amber-50 border-amber-200"
          />
        </div>
      )}
    </Modal>
  );
}

export default ExportDialog;
