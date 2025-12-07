'use client';

/**
 * ImportWizard Component
 *
 * A multi-step wizard for importing data into the system.
 * Supports importing inventory items, customers, and suppliers from CSV/JSON files.
 *
 * Steps:
 * 1. Select Import Type (inventory, customers, suppliers)
 * 2. Upload File (CSV/JSON with drag-drop)
 * 3. Map Columns (match file columns to system fields)
 * 4. Preview & Validate (show preview table with errors highlighted)
 * 5. Import Results (show success/error summary)
 *
 * @module components/domain/settings/ImportWizard
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  UploadOutlined,
  FileTextOutlined,
  SwapOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  DownloadOutlined,
  InboxOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LoadingOutlined,
  DatabaseOutlined,
  UserOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import {
  Modal,
  Steps,
  Upload,
  Table,
  Alert,
  Select,
  Radio,
  Checkbox,
  Progress,
  Result,
  Tag,
  Typography,
  Divider,
  message,
} from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';

import type { UploadFile, UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Text, Title } = Typography;
const { Dragger } = Upload;

// =============================================================================
// TYPES
// =============================================================================

/** Import type options */
export type ImportType = 'inventory' | 'customers' | 'suppliers';

/** Import result structure */
export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

/** Import error structure */
interface ImportError {
  row: number;
  column: string;
  value: string;
  message: string;
}

/** Import warning structure */
interface ImportWarning {
  row: number;
  column: string;
  message: string;
}

/** Parsed row data */
interface ParsedRow {
  _rowNumber: number;
  _hasError: boolean;
  _errors: ImportError[];
  [key: string]: unknown;
}

/** Column mapping entry */
interface ColumnMapping {
  sourceColumn: string;
  targetField: string | null;
}

/** Import options */
interface ImportOptions {
  skipDuplicates: boolean;
  updateExisting: boolean;
  dryRun: boolean;
}

/** System field definition */
interface SystemField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'email' | 'phone';
}

/**
 * Props for ImportWizard component
 */
export interface ImportWizardProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Default import type to select */
  defaultType?: ImportType;
  /** Callback when import completes successfully */
  onSuccess?: (result: ImportResult) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Import type configuration */
const IMPORT_TYPES: {
  value: ImportType;
  icon: React.ReactNode;
  templateFields: string[];
}[] = [
  {
    value: 'inventory',
    icon: <DatabaseOutlined className="text-2xl" />,
    templateFields: [
      'sku',
      'name',
      'category',
      'metal_type',
      'purity',
      'weight',
      'price',
      'quantity',
      'description',
    ],
  },
  {
    value: 'customers',
    icon: <UserOutlined className="text-2xl" />,
    templateFields: ['full_name', 'email', 'phone', 'address', 'city', 'country', 'notes'],
  },
  {
    value: 'suppliers',
    icon: <ShopOutlined className="text-2xl" />,
    templateFields: [
      'company_name',
      'contact_name',
      'email',
      'phone',
      'address',
      'city',
      'country',
      'payment_terms',
    ],
  },
];

/** System fields per import type */
const SYSTEM_FIELDS: Record<ImportType, SystemField[]> = {
  inventory: [
    { key: 'sku', label: 'SKU', required: true, type: 'string' },
    { key: 'name', label: 'Item Name', required: true, type: 'string' },
    { key: 'category', label: 'Category', required: false, type: 'string' },
    { key: 'metal_type', label: 'Metal Type', required: false, type: 'string' },
    { key: 'purity', label: 'Purity', required: false, type: 'string' },
    { key: 'weight', label: 'Weight (g)', required: false, type: 'number' },
    { key: 'price', label: 'Price', required: true, type: 'number' },
    { key: 'quantity', label: 'Quantity', required: false, type: 'number' },
    { key: 'description', label: 'Description', required: false, type: 'string' },
  ],
  customers: [
    { key: 'full_name', label: 'Full Name', required: true, type: 'string' },
    { key: 'email', label: 'Email', required: false, type: 'email' },
    { key: 'phone', label: 'Phone', required: false, type: 'phone' },
    { key: 'address', label: 'Address', required: false, type: 'string' },
    { key: 'city', label: 'City', required: false, type: 'string' },
    { key: 'country', label: 'Country', required: false, type: 'string' },
    { key: 'notes', label: 'Notes', required: false, type: 'string' },
  ],
  suppliers: [
    { key: 'company_name', label: 'Company Name', required: true, type: 'string' },
    { key: 'contact_name', label: 'Contact Name', required: false, type: 'string' },
    { key: 'email', label: 'Email', required: false, type: 'email' },
    { key: 'phone', label: 'Phone', required: false, type: 'phone' },
    { key: 'address', label: 'Address', required: false, type: 'string' },
    { key: 'city', label: 'City', required: false, type: 'string' },
    { key: 'country', label: 'Country', required: false, type: 'string' },
    { key: 'payment_terms', label: 'Payment Terms', required: false, type: 'string' },
  ],
};

/** Default import options */
const DEFAULT_OPTIONS: ImportOptions = {
  skipDuplicates: true,
  updateExisting: false,
  dryRun: false,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse CSV string into array of objects
 */
function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  const firstLine = lines[0];
  if (lines.length === 0 || !firstLine) {
    return { headers: [], rows: [] };
  }

  // Parse headers
  const headers = firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

  // Parse rows
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });

  return { headers, rows };
}

/**
 * Parse JSON string into array of objects
 */
function parseJSON(content: string): { headers: string[]; rows: Record<string, string>[] } {
  try {
    const data = JSON.parse(content);
    const rows = Array.isArray(data) ? data : [data];

    if (rows.length === 0) {
      return { headers: [], rows: [] };
    }

    // Extract headers from first row
    const headers = Object.keys(rows[0]);

    // Normalize rows to strings
    const normalizedRows = rows.map((row) => {
      const normalized: Record<string, string> = {};
      headers.forEach((header) => {
        const value = row[header];
        normalized[header] = value !== null && value !== undefined ? String(value) : '';
      });
      return normalized;
    });

    return { headers, rows: normalizedRows };
  } catch {
    return { headers: [], rows: [] };
  }
}

/**
 * Validate a single row against system fields
 */
function validateRow(
  row: Record<string, string>,
  mapping: ColumnMapping[],
  systemFields: SystemField[],
  rowNumber: number
): ImportError[] {
  const errors: ImportError[] = [];

  // Check required fields
  systemFields.forEach((field) => {
    if (field.required) {
      const mappingEntry = mapping.find((m) => m.targetField === field.key);
      if (!mappingEntry || !mappingEntry.sourceColumn) {
        errors.push({
          row: rowNumber,
          column: field.key,
          value: '',
          message: `Required field "${field.label}" is not mapped`,
        });
        return;
      }

      const value = row[mappingEntry.sourceColumn];
      if (!value || value.trim() === '') {
        errors.push({
          row: rowNumber,
          column: field.key,
          value: value || '',
          message: `Required field "${field.label}" is empty`,
        });
      }
    }
  });

  // Validate field types
  mapping.forEach((mappingEntry) => {
    if (!mappingEntry.targetField || !mappingEntry.sourceColumn) {
      return;
    }

    const field = systemFields.find((f) => f.key === mappingEntry.targetField);
    if (!field) {
      return;
    }

    const value = row[mappingEntry.sourceColumn];
    if (!value || value.trim() === '') {
      return;
    } // Skip empty non-required fields

    switch (field.type) {
      case 'number':
        if (isNaN(Number(value))) {
          errors.push({
            row: rowNumber,
            column: field.key,
            value,
            message: `"${field.label}" must be a valid number`,
          });
        }
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push({
            row: rowNumber,
            column: field.key,
            value,
            message: `"${field.label}" must be a valid email address`,
          });
        }
        break;
      case 'phone':
        if (!/^[+\d\s()-]{7,}$/.test(value)) {
          errors.push({
            row: rowNumber,
            column: field.key,
            value,
            message: `"${field.label}" must be a valid phone number`,
          });
        }
        break;
    }
  });

  return errors;
}

/**
 * Generate CSV template content
 */
function generateTemplateCSV(fields: string[]): string {
  return fields.join(',') + '\n';
}

/**
 * Download a file
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ImportWizard Component
 *
 * Multi-step wizard for importing data into the system.
 */
export function ImportWizard({
  open,
  onClose,
  defaultType,
  onSuccess,
}: ImportWizardProps): React.JSX.Element {
  const t = useTranslations('settings.import');
  const tCommon = useTranslations('common');

  // ============================================================================
  // STATE
  // ============================================================================

  const [currentStep, setCurrentStep] = useState(0);
  const [importType, setImportType] = useState<ImportType | null>(defaultType || null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [parsedData, setParsedData] = useState<{
    headers: string[];
    rows: Record<string, string>[];
  } | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [importOptions, setImportOptions] = useState<ImportOptions>(DEFAULT_OPTIONS);
  const [validatedRows, setValidatedRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const systemFields = importType ? SYSTEM_FIELDS[importType] : [];
  const requiredFields = systemFields.filter((f) => f.required);

  const validationSummary = useMemo(() => {
    const totalErrors = validatedRows.reduce((acc, row) => acc + row._errors.length, 0);
    const rowsWithErrors = validatedRows.filter((row) => row._hasError).length;
    return { totalErrors, rowsWithErrors, totalRows: validatedRows.length };
  }, [validatedRows]);

  const canProceedToMapping =
    parsedData && parsedData.headers.length > 0 && parsedData.rows.length > 0;

  const canProceedToPreview = useMemo(() => {
    if (!columnMappings.length) {
      return false;
    }
    // Check all required fields are mapped
    return requiredFields.every((field) =>
      columnMappings.some((m) => m.targetField === field.key && m.sourceColumn)
    );
  }, [columnMappings, requiredFields]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Reset wizard state
   */
  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setImportType(defaultType || null);
    setFileList([]);
    setParsedData(null);
    setColumnMappings([]);
    setImportOptions(DEFAULT_OPTIONS);
    setValidatedRows([]);
    setIsImporting(false);
    setImportProgress(0);
    setImportResult(null);
  }, [defaultType]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    resetWizard();
    onClose();
  }, [resetWizard, onClose]);

  /**
   * Handle import type selection
   */
  const handleTypeSelect = useCallback((type: ImportType) => {
    setImportType(type);
  }, []);

  /**
   * Handle file upload
   */
  const handleUploadChange: UploadProps['onChange'] = useCallback(
    ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
      setFileList(newFileList.slice(-1)); // Only keep last file

      const file = newFileList[newFileList.length - 1];
      if (!file?.originFileObj) {
        setParsedData(null);
        setColumnMappings([]);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const fileName = file.name.toLowerCase();

        let parsed: { headers: string[]; rows: Record<string, string>[] };
        if (fileName.endsWith('.json')) {
          parsed = parseJSON(content);
        } else {
          parsed = parseCSV(content);
        }

        setParsedData(parsed);

        // Auto-map columns by matching names
        if (parsed.headers.length > 0 && importType) {
          const fields = SYSTEM_FIELDS[importType];
          const autoMappings: ColumnMapping[] = parsed.headers.map((header) => {
            const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, '');
            const matchedField = fields.find((field) => {
              const normalizedKey = field.key.toLowerCase().replace(/[_\s-]/g, '');
              const normalizedLabel = field.label.toLowerCase().replace(/[_\s-]/g, '');
              return normalizedHeader === normalizedKey || normalizedHeader === normalizedLabel;
            });
            return {
              sourceColumn: header,
              targetField: matchedField?.key || null,
            };
          });
          setColumnMappings(autoMappings);
        }
      };

      reader.readAsText(file.originFileObj);
    },
    [importType]
  );

  /**
   * Handle column mapping change
   */
  const handleMappingChange = useCallback((sourceColumn: string, targetField: string | null) => {
    setColumnMappings((prev) =>
      prev.map((m) => (m.sourceColumn === sourceColumn ? { ...m, targetField } : m))
    );
  }, []);

  /**
   * Validate all rows
   */
  const validateAllRows = useCallback(() => {
    if (!parsedData || !importType) {
      return;
    }

    const fields = SYSTEM_FIELDS[importType];
    const validated: ParsedRow[] = parsedData.rows.map((row, index) => {
      const errors = validateRow(row, columnMappings, fields, index + 1);
      return {
        _rowNumber: index + 1,
        _hasError: errors.length > 0,
        _errors: errors,
        ...row,
      };
    });

    setValidatedRows(validated);
  }, [parsedData, importType, columnMappings]);

  /**
   * Download template
   */
  const handleDownloadTemplate = useCallback(() => {
    if (!importType) {
      return;
    }

    const typeConfig = IMPORT_TYPES.find((t) => t.value === importType);
    if (!typeConfig) {
      return;
    }

    const content = generateTemplateCSV(typeConfig.templateFields);
    downloadFile(content, `${importType}_import_template.csv`, 'text/csv');
    message.success(t('templateDownloaded'));
  }, [importType, t]);

  /**
   * Perform import (mock)
   */
  const handleImport = useCallback(async () => {
    setIsImporting(true);
    setImportProgress(0);

    // Simulate import progress
    const totalRows = validatedRows.length;
    const rowsWithErrors = validatedRows.filter((r) => r._hasError);
    const validRows = validatedRows.filter((r) => !r._hasError);

    // Simulate progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setImportProgress(i);
    }

    // Mock result
    const result: ImportResult = {
      success: true,
      totalRows,
      importedCount: importOptions.dryRun ? 0 : validRows.length,
      skippedCount: importOptions.skipDuplicates ? Math.floor(validRows.length * 0.1) : 0,
      errorCount: rowsWithErrors.length,
      errors: rowsWithErrors.flatMap((r) => r._errors),
      warnings: [],
    };

    // Log mock import data
    console.log('=== IMPORT WIZARD: Mock Import ===');
    console.log('Import Type:', importType);
    console.log('Options:', importOptions);
    console.log('Column Mappings:', columnMappings);
    console.log('Valid Rows to Import:', validRows);
    console.log('Result:', result);
    console.log('================================');

    setImportResult(result);
    setIsImporting(false);

    if (result.success && !importOptions.dryRun) {
      message.success(t('importSuccess', { count: result.importedCount }));
      onSuccess?.(result);
    }
  }, [validatedRows, importOptions, importType, columnMappings, t, onSuccess]);

  /**
   * Navigate steps
   */
  const handleNext = useCallback(() => {
    if (currentStep === 2) {
      // Validate before preview
      validateAllRows();
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  }, [currentStep, validateAllRows]);

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // ============================================================================
  // STEP CONTENT RENDERERS
  // ============================================================================

  /**
   * Step 1: Select Import Type
   */
  const renderSelectType = () => (
    <div className="py-4">
      <Text className="block mb-6 text-stone-600">{t('selectTypeDescription')}</Text>

      <Radio.Group
        value={importType}
        onChange={(e) => handleTypeSelect(e.target.value)}
        className="w-full"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {IMPORT_TYPES.map((type) => (
            <Card
              key={type.value}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:border-amber-400',
                importType === type.value && 'border-amber-500 bg-amber-50/50'
              )}
              onClick={() => handleTypeSelect(type.value)}
            >
              <Radio value={type.value} className="w-full">
                <div className="flex items-center gap-3 py-2">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center',
                      importType === type.value
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-stone-100 text-stone-500'
                    )}
                  >
                    {type.icon}
                  </div>
                  <div>
                    <Text strong className="block">
                      {t(`types.${type.value}.title`)}
                    </Text>
                    <Text type="secondary" className="text-xs">
                      {t(`types.${type.value}.description`)}
                    </Text>
                  </div>
                </div>
              </Radio>
            </Card>
          ))}
        </div>
      </Radio.Group>

      {importType && (
        <div className="mt-6">
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
            className="ps-0"
          >
            {t('downloadTemplate')}
          </Button>
        </div>
      )}
    </div>
  );

  /**
   * Step 2: Upload File
   */
  const renderUploadFile = () => (
    <div className="py-4">
      <Alert
        type="info"
        showIcon
        message={t('uploadInfo')}
        description={t('uploadInfoDescription')}
        className="mb-6"
      />

      <Dragger
        name="file"
        multiple={false}
        accept=".csv,.json"
        fileList={fileList}
        onChange={handleUploadChange}
        beforeUpload={() => false}
        onRemove={() => {
          setFileList([]);
          setParsedData(null);
          setColumnMappings([]);
        }}
        className="mb-6"
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined className="text-4xl text-amber-500" />
        </p>
        <p className="ant-upload-text">{t('uploadDragText')}</p>
        <p className="ant-upload-hint">{t('uploadHint')}</p>
      </Dragger>

      {parsedData && (
        <Card className="bg-stone-50">
          <div className="flex items-center justify-between">
            <div>
              <Text strong className="block">
                {t('fileAnalysis')}
              </Text>
              <Text type="secondary">
                {t('rowsDetected', { count: parsedData.rows.length })} |{' '}
                {t('columnsDetected', { count: parsedData.headers.length })}
              </Text>
            </div>
            <Tag color="success" icon={<CheckCircleOutlined />}>
              {t('readyToMap')}
            </Tag>
          </div>
        </Card>
      )}
    </div>
  );

  /**
   * Step 3: Map Columns
   */
  const renderMapColumns = () => (
    <div className="py-4">
      <Alert
        type="info"
        showIcon
        message={t('mappingInfo')}
        description={t('mappingInfoDescription')}
        className="mb-6"
      />

      <div className="space-y-4">
        {/* Required fields indicator */}
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <span className="text-red-500">*</span>
          <span>{t('requiredFieldsNote')}</span>
        </div>

        {/* Mapping table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-medium text-stone-700">
                  {t('fileColumn')}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-stone-700 w-16">
                  <SwapOutlined />
                </th>
                <th className="px-4 py-3 text-start text-sm font-medium text-stone-700">
                  {t('systemField')}
                </th>
                <th className="px-4 py-3 text-start text-sm font-medium text-stone-700 w-32">
                  {t('sampleValue')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {columnMappings.map((mapping) => {
                const sampleValue = parsedData?.rows[0]?.[mapping.sourceColumn] || '';

                return (
                  <tr key={mapping.sourceColumn} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <Text code>{mapping.sourceColumn}</Text>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ArrowRightOutlined className="text-stone-400" />
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={mapping.targetField}
                        onChange={(value) => handleMappingChange(mapping.sourceColumn, value)}
                        placeholder={t('selectField')}
                        allowClear
                        className="w-full"
                        options={[
                          { value: null, label: <Text type="secondary">{t('skipColumn')}</Text> },
                          ...systemFields.map((f) => ({
                            value: f.key,
                            label: (
                              <span>
                                {f.label}
                                {f.required && <span className="text-red-500 ms-1">*</span>}
                              </span>
                            ),
                            disabled: columnMappings.some(
                              (m) =>
                                m.targetField === f.key && m.sourceColumn !== mapping.sourceColumn
                            ),
                          })),
                        ]}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Text type="secondary" className="text-xs truncate block max-w-[120px]">
                        {sampleValue || '-'}
                      </Text>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Unmapped required fields warning */}
        {!canProceedToPreview && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message={t('unmappedRequiredFields')}
            description={
              <ul className="list-disc list-inside mt-2">
                {requiredFields
                  .filter(
                    (f) => !columnMappings.some((m) => m.targetField === f.key && m.sourceColumn)
                  )
                  .map((f) => (
                    <li key={f.key}>{f.label}</li>
                  ))}
              </ul>
            }
          />
        )}
      </div>
    </div>
  );

  /**
   * Step 4: Preview & Validate
   */
  const renderPreviewValidate = () => {
    const previewColumns: ColumnsType<ParsedRow> = [
      {
        title: '#',
        dataIndex: '_rowNumber',
        key: '_rowNumber',
        width: 60,
        render: (value: number, record: ParsedRow) => (
          <span className={cn(record._hasError && 'text-red-500 font-medium')}>{value}</span>
        ),
      },
      ...columnMappings
        .filter((m) => m.targetField)
        .map((mapping) => {
          const field = systemFields.find((f) => f.key === mapping.targetField);
          return {
            title: field?.label || mapping.targetField,
            dataIndex: mapping.sourceColumn,
            key: mapping.sourceColumn,
            ellipsis: true,
            render: (value: string, record: ParsedRow) => {
              const hasError = record._errors.some((e) => e.column === mapping.targetField);
              return (
                <span className={cn(hasError && 'bg-red-100 text-red-700 px-1 rounded')}>
                  {value || '-'}
                </span>
              );
            },
          };
        }),
      {
        title: tCommon('labels.status'),
        key: 'status',
        width: 100,
        render: (_: unknown, record: ParsedRow) =>
          record._hasError ? (
            <Tag color="error" icon={<CloseCircleOutlined />}>
              {t('hasErrors')}
            </Tag>
          ) : (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              {t('valid')}
            </Tag>
          ),
      },
    ];

    return (
      <div className="py-4">
        {/* Validation Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="text-center">
            <div className="text-2xl font-bold text-stone-900">{validationSummary.totalRows}</div>
            <Text type="secondary">{t('totalRows')}</Text>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {validationSummary.totalRows - validationSummary.rowsWithErrors}
            </div>
            <Text type="secondary">{t('validRows')}</Text>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {validationSummary.rowsWithErrors}
            </div>
            <Text type="secondary">{t('rowsWithErrors')}</Text>
          </Card>
        </div>

        {/* Errors Alert */}
        {validationSummary.rowsWithErrors > 0 && (
          <Alert
            type="error"
            showIcon
            message={t('validationErrors', { count: validationSummary.totalErrors })}
            description={t('validationErrorsDescription')}
            className="mb-4"
          />
        )}

        {/* Preview Table */}
        <Card title={t('previewFirst5Rows')} className="mb-6">
          <Table
            dataSource={validatedRows.slice(0, 5)}
            columns={previewColumns}
            rowKey="_rowNumber"
            pagination={false}
            size="small"
            scroll={{ x: true }}
            rowClassName={(record) => (record._hasError ? 'bg-red-50' : '')}
          />
        </Card>

        {/* Import Options */}
        <Card title={t('importOptions')}>
          <div className="space-y-4">
            <Checkbox
              checked={importOptions.skipDuplicates}
              onChange={(e) =>
                setImportOptions((prev) => ({ ...prev, skipDuplicates: e.target.checked }))
              }
            >
              <div>
                <Text strong>{t('skipDuplicates')}</Text>
                <br />
                <Text type="secondary" className="text-xs">
                  {t('skipDuplicatesDescription')}
                </Text>
              </div>
            </Checkbox>

            <Checkbox
              checked={importOptions.updateExisting}
              onChange={(e) =>
                setImportOptions((prev) => ({ ...prev, updateExisting: e.target.checked }))
              }
            >
              <div>
                <Text strong>{t('updateExisting')}</Text>
                <br />
                <Text type="secondary" className="text-xs">
                  {t('updateExistingDescription')}
                </Text>
              </div>
            </Checkbox>

            <Checkbox
              checked={importOptions.dryRun}
              onChange={(e) => setImportOptions((prev) => ({ ...prev, dryRun: e.target.checked }))}
            >
              <div>
                <Text strong>{t('dryRun')}</Text>
                <br />
                <Text type="secondary" className="text-xs">
                  {t('dryRunDescription')}
                </Text>
              </div>
            </Checkbox>
          </div>
        </Card>
      </div>
    );
  };

  /**
   * Step 5: Import Results
   */
  const renderImportResults = () => {
    if (isImporting) {
      return (
        <div className="py-12 text-center">
          <LoadingOutlined className="text-4xl text-amber-500 mb-4" />
          <Title level={4}>{t('importing')}</Title>
          <Progress percent={importProgress} status="active" className="max-w-md mx-auto" />
          <Text type="secondary" className="block mt-4">
            {t('importingDescription')}
          </Text>
        </div>
      );
    }

    if (!importResult) {
      return null;
    }

    return (
      <div className="py-4">
        <Result
          status={importResult.errorCount > 0 ? 'warning' : 'success'}
          title={
            importOptions.dryRun
              ? t('dryRunComplete')
              : importResult.errorCount > 0
                ? t('importCompleteWithErrors')
                : t('importSuccess', { count: importResult.importedCount })
          }
          subTitle={importOptions.dryRun ? t('dryRunDescription') : t('importResultSummary')}
          extra={[
            <Button key="close" type="primary" onClick={handleClose}>
              {tCommon('actions.close')}
            </Button>,
            importResult.errorCount > 0 && (
              <Button
                key="download"
                icon={<DownloadOutlined />}
                onClick={() => {
                  const errorReport = importResult.errors
                    .map((e) => `Row ${e.row}: ${e.column} - ${e.message} (value: "${e.value}")`)
                    .join('\n');
                  downloadFile(errorReport, 'import_errors.txt', 'text/plain');
                }}
              >
                {t('downloadErrors')}
              </Button>
            ),
          ].filter(Boolean)}
        />

        {/* Results Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className="text-center">
            <div className="text-xl font-bold text-stone-900">{importResult.totalRows}</div>
            <Text type="secondary" className="text-xs">
              {t('totalProcessed')}
            </Text>
          </Card>
          <Card className="text-center bg-green-50">
            <div className="text-xl font-bold text-green-600">{importResult.importedCount}</div>
            <Text type="secondary" className="text-xs">
              {t('imported')}
            </Text>
          </Card>
          <Card className="text-center bg-amber-50">
            <div className="text-xl font-bold text-amber-600">{importResult.skippedCount}</div>
            <Text type="secondary" className="text-xs">
              {t('skipped')}
            </Text>
          </Card>
          <Card className="text-center bg-red-50">
            <div className="text-xl font-bold text-red-600">{importResult.errorCount}</div>
            <Text type="secondary" className="text-xs">
              {t('errors')}
            </Text>
          </Card>
        </div>

        {/* Error Details */}
        {importResult.errors.length > 0 && (
          <Card title={t('errorDetails')} className="mt-6">
            <div className="max-h-48 overflow-y-auto">
              <ul className="space-y-2">
                {importResult.errors.slice(0, 10).map((error, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CloseCircleOutlined className="text-red-500 mt-0.5" />
                    <span>
                      <Text strong>Row {error.row}:</Text> {error.message}
                      {error.value && (
                        <Text code className="ms-1">
                          {error.value}
                        </Text>
                      )}
                    </span>
                  </li>
                ))}
                {importResult.errors.length > 10 && (
                  <li className="text-stone-500 text-sm">
                    {t('andMoreErrors', { count: importResult.errors.length - 10 })}
                  </li>
                )}
              </ul>
            </div>
          </Card>
        )}
      </div>
    );
  };

  // ============================================================================
  // STEP CONFIGURATION
  // ============================================================================

  const steps = [
    {
      key: 'type',
      title: t('steps.selectType'),
      icon: <FileTextOutlined />,
      content: renderSelectType,
      canProceed: !!importType,
    },
    {
      key: 'upload',
      title: t('steps.uploadFile'),
      icon: <UploadOutlined />,
      content: renderUploadFile,
      canProceed: canProceedToMapping,
    },
    {
      key: 'map',
      title: t('steps.mapColumns'),
      icon: <SwapOutlined />,
      content: renderMapColumns,
      canProceed: canProceedToPreview,
    },
    {
      key: 'preview',
      title: t('steps.preview'),
      icon: <EyeOutlined />,
      content: renderPreviewValidate,
      canProceed: validatedRows.length > 0,
    },
    {
      key: 'results',
      title: t('steps.results'),
      icon: <CheckCircleOutlined />,
      content: renderImportResults,
      canProceed: true,
    },
  ];

  const currentStepConfig = steps[currentStep]!;

  // ============================================================================
  // RENDER
  // ============================================================================

  // Guard against invalid step (should never happen)
  if (!currentStepConfig) {
    return <></>;
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <UploadOutlined className="text-lg text-amber-600" />
          </div>
          <div>
            <Text strong className="text-lg block">
              {t('title')}
            </Text>
            <Text type="secondary" className="text-sm">
              {t('subtitle')}
            </Text>
          </div>
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={900}
      footer={null}
      destroyOnClose
      className={cn(
        '[&_.ant-modal-content]:rounded-xl',
        '[&_.ant-modal-header]:border-b [&_.ant-modal-header]:border-stone-200'
      )}
    >
      {/* Steps Progress */}
      <Steps
        current={currentStep}
        className="mb-6 mt-4 px-4"
        size="small"
        items={steps.map((step) => ({
          title: step.title,
          icon: step.icon,
        }))}
      />

      <Divider className="my-0" />

      {/* Step Content */}
      <div className="px-2 min-h-[400px]">{currentStepConfig.content()}</div>

      <Divider className="my-0" />

      {/* Navigation Footer */}
      {currentStep < 4 && (
        <div className="flex justify-between items-center py-4 px-2">
          <div>
            {currentStep > 0 && currentStep < 4 && (
              <Button onClick={handlePrevious} icon={<ArrowLeftOutlined />} disabled={isImporting}>
                {tCommon('actions.back')}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleClose} disabled={isImporting}>
              {tCommon('actions.cancel')}
            </Button>

            {currentStep < 3 && (
              <Button type="primary" onClick={handleNext} disabled={!currentStepConfig.canProceed}>
                {tCommon('actions.next')} <ArrowRightOutlined />
              </Button>
            )}

            {currentStep === 3 && (
              <Button
                type="primary"
                onClick={handleImport}
                loading={isImporting}
                icon={importOptions.dryRun ? <EyeOutlined /> : <CheckCircleOutlined />}
                disabled={validationSummary.totalRows === 0}
              >
                {importOptions.dryRun ? t('runDryImport') : t('startImport')}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default ImportWizard;
