'use server';

/**
 * Data Transfer Server Actions
 *
 * Server actions for data import and export operations in the Aymur Platform.
 * Provides functionality for:
 * - Exporting inventory, customers, sales, and suppliers to CSV/JSON/Excel
 * - Importing data with validation and mapping
 * - Preview and template generation
 *
 * NOTE: This uses mock data for demonstration purposes.
 * When the database integration is complete, replace mock data with actual queries.
 *
 * @module lib/actions/data-transfer
 */

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

// =============================================================================
// ACTION RESULT TYPE
// =============================================================================

/**
 * Standard result type for server actions
 */
type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

// =============================================================================
// EXPORTED TYPES
// =============================================================================

/**
 * Supported export formats
 */
export type ExportFormat = 'csv' | 'json' | 'excel';

/**
 * Supported import data types
 */
export type ImportType = 'inventory' | 'customers' | 'suppliers' | 'sales';

/**
 * Options for import operations
 */
export interface ImportOptions {
  /** Skip rows that would create duplicates (based on unique identifiers) */
  skipDuplicates: boolean;
  /** Update existing records instead of skipping duplicates */
  updateExisting: boolean;
  /** Perform a dry run without actually importing data */
  dryRun: boolean;
}

/**
 * Result of an import operation
 */
export interface ImportResult {
  /** Whether the import operation succeeded */
  success: boolean;
  /** Number of records successfully imported */
  imported: number;
  /** Number of records skipped (duplicates or invalid) */
  skipped: number;
  /** Array of error messages for failed rows */
  errors: ImportError[];
  /** Timestamp of the import operation */
  timestamp: string;
}

/**
 * Individual import error with row context
 */
export interface ImportError {
  /** Row number where the error occurred (1-indexed) */
  row: number;
  /** Field that caused the error */
  field: string;
  /** Error message */
  message: string;
}

/**
 * Result of file validation before import
 */
export interface ValidationResult {
  /** Whether the file is valid for import */
  valid: boolean;
  /** Array of validation errors */
  errors: ValidationError[];
  /** Array of warnings (non-blocking issues) */
  warnings: ValidationWarning[];
  /** Total number of data rows in the file */
  rowCount: number;
  /** Detected columns in the file */
  detectedColumns: string[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  /** Row number where the error occurred (0 for file-level errors) */
  row: number;
  /** Column name or index */
  column: string;
  /** Error message */
  message: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  /** Row number where the warning occurred (0 for file-level warnings) */
  row: number;
  /** Column name or index */
  column: string;
  /** Warning message */
  message: string;
}

/**
 * Column mapping for import operations
 */
export interface ColumnMapping {
  /** Source column name from the import file */
  sourceColumn: string;
  /** Target field name in the database */
  targetField: string;
  /** Optional transformation to apply */
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'number' | 'date';
}

/**
 * Parsed import data ready for processing
 */
export interface ParsedImportData {
  /** Array of parsed records */
  records: Record<string, unknown>[];
  /** Number of successfully parsed records */
  parsedCount: number;
  /** Number of records that failed to parse */
  failedCount: number;
  /** Parsing errors */
  errors: ImportError[];
}

/**
 * Export preview data
 */
export interface ExportPreview {
  /** Type of data being exported */
  type: ImportType;
  /** Total records available for export */
  totalRecords: number;
  /** Sample records for preview */
  sampleRecords: Record<string, unknown>[];
  /** Available columns for export */
  columns: string[];
}

/**
 * Export filters for inventory
 */
export interface InventoryExportFilters {
  /** Filter by category ID */
  categoryId?: string;
  /** Filter by status */
  status?: string;
  /** Filter by metal type */
  metalType?: string;
  /** Include deleted items */
  includeDeleted?: boolean;
}

/**
 * Export filters for customers
 */
export interface CustomerExportFilters {
  /** Filter by customer type */
  customerType?: 'individual' | 'business';
  /** Filter by active status */
  isActive?: boolean;
  /** Minimum total purchases */
  minPurchases?: number;
}

/**
 * Date range for sales export
 */
export interface DateRange {
  /** Start date (ISO string) */
  startDate: string;
  /** End date (ISO string) */
  endDate: string;
}

/**
 * Import template with column definitions
 */
export interface ImportTemplate {
  /** Type of data this template is for */
  type: ImportType;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Required columns */
  requiredColumns: TemplateColumn[];
  /** Optional columns */
  optionalColumns: TemplateColumn[];
  /** Sample CSV content */
  sampleCsv: string;
}

/**
 * Template column definition
 */
export interface TemplateColumn {
  /** Column name */
  name: string;
  /** Column description */
  description: string;
  /** Data type */
  type: 'string' | 'number' | 'date' | 'boolean';
  /** Example value */
  example: string;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const exportFormatSchema = z.enum(['csv', 'json', 'excel']);
const importTypeSchema = z.enum(['inventory', 'customers', 'suppliers', 'sales']);

const inventoryFiltersSchema = z.object({
  categoryId: z.string().uuid().optional(),
  status: z.string().optional(),
  metalType: z.string().optional(),
  includeDeleted: z.boolean().optional(),
});

const customerFiltersSchema = z.object({
  customerType: z.enum(['individual', 'business']).optional(),
  isActive: z.boolean().optional(),
  minPurchases: z.number().min(0).optional(),
});

const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

const importOptionsSchema = z.object({
  skipDuplicates: z.boolean().default(true),
  updateExisting: z.boolean().default(false),
  dryRun: z.boolean().default(false),
});

const columnMappingSchema = z.object({
  sourceColumn: z.string().min(1),
  targetField: z.string().min(1),
  transform: z.enum(['uppercase', 'lowercase', 'trim', 'number', 'date']).optional(),
});

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

function generateMockInventoryData(): Record<string, unknown>[] {
  return [
    {
      id: 'INV-001',
      sku: 'GR-22K-001',
      name: 'Gold Ring 22K',
      category: 'Rings',
      metal_type: 'Gold',
      purity: '22K',
      weight_grams: 5.5,
      purchase_price: 450.0,
      selling_price: 650.0,
      status: 'available',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'INV-002',
      sku: 'SN-925-001',
      name: 'Silver Necklace 925',
      category: 'Necklaces',
      metal_type: 'Silver',
      purity: '925',
      weight_grams: 25.0,
      purchase_price: 85.0,
      selling_price: 150.0,
      status: 'available',
      created_at: '2024-01-16T11:30:00Z',
    },
    {
      id: 'INV-003',
      sku: 'DE-18K-001',
      name: 'Diamond Earrings 18K',
      category: 'Earrings',
      metal_type: 'Gold',
      purity: '18K',
      weight_grams: 3.2,
      stone_type: 'Diamond',
      stone_carats: 0.5,
      purchase_price: 1200.0,
      selling_price: 1850.0,
      status: 'reserved',
      created_at: '2024-01-17T14:00:00Z',
    },
    {
      id: 'INV-004',
      sku: 'GB-24K-001',
      name: 'Gold Bracelet 24K',
      category: 'Bracelets',
      metal_type: 'Gold',
      purity: '24K',
      weight_grams: 15.0,
      purchase_price: 1500.0,
      selling_price: 2100.0,
      status: 'available',
      created_at: '2024-01-18T09:00:00Z',
    },
    {
      id: 'INV-005',
      sku: 'PP-PT-001',
      name: 'Platinum Pendant',
      category: 'Pendants',
      metal_type: 'Platinum',
      purity: '950',
      weight_grams: 8.0,
      purchase_price: 800.0,
      selling_price: 1200.0,
      status: 'sold',
      created_at: '2024-01-19T16:30:00Z',
    },
  ];
}

function generateMockCustomerData(): Record<string, unknown>[] {
  return [
    {
      id: 'CUST-001',
      full_name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '+1-555-0101',
      customer_type: 'individual',
      total_purchases: 5250.0,
      last_purchase_date: '2024-01-20T15:00:00Z',
      loyalty_points: 525,
      is_active: true,
      created_at: '2023-06-15T10:00:00Z',
    },
    {
      id: 'CUST-002',
      full_name: 'Emma Johnson',
      email: 'emma.j@email.com',
      phone: '+1-555-0102',
      customer_type: 'individual',
      total_purchases: 12500.0,
      last_purchase_date: '2024-01-18T11:30:00Z',
      loyalty_points: 1250,
      is_active: true,
      created_at: '2023-03-10T14:00:00Z',
    },
    {
      id: 'CUST-003',
      full_name: 'Luxury Boutique LLC',
      email: 'orders@luxuryboutique.com',
      phone: '+1-555-0103',
      customer_type: 'business',
      contact_person: 'Sarah Williams',
      total_purchases: 45000.0,
      last_purchase_date: '2024-01-15T09:00:00Z',
      credit_limit: 10000.0,
      is_active: true,
      created_at: '2022-11-20T08:00:00Z',
    },
    {
      id: 'CUST-004',
      full_name: 'Michael Brown',
      email: 'mbrown@email.com',
      phone: '+1-555-0104',
      customer_type: 'individual',
      total_purchases: 3200.0,
      last_purchase_date: '2023-12-05T16:00:00Z',
      loyalty_points: 320,
      is_active: true,
      created_at: '2023-09-01T12:00:00Z',
    },
    {
      id: 'CUST-005',
      full_name: 'Diamond Gallery Inc',
      email: 'purchasing@diamondgallery.com',
      phone: '+1-555-0105',
      customer_type: 'business',
      contact_person: 'Robert Chen',
      total_purchases: 78500.0,
      last_purchase_date: '2024-01-22T10:00:00Z',
      credit_limit: 25000.0,
      is_active: true,
      created_at: '2022-05-15T09:00:00Z',
    },
  ];
}

function generateMockSalesData(): Record<string, unknown>[] {
  return [
    {
      id: 'SALE-001',
      invoice_number: 'INV-2024-0001',
      customer_name: 'John Smith',
      items: [{ sku: 'GR-22K-001', name: 'Gold Ring 22K', quantity: 1, price: 650.0 }],
      subtotal: 650.0,
      tax: 52.0,
      total: 702.0,
      payment_method: 'credit_card',
      status: 'completed',
      sale_date: '2024-01-20T15:00:00Z',
    },
    {
      id: 'SALE-002',
      invoice_number: 'INV-2024-0002',
      customer_name: 'Emma Johnson',
      items: [
        { sku: 'DE-18K-001', name: 'Diamond Earrings 18K', quantity: 1, price: 1850.0 },
        { sku: 'SN-925-001', name: 'Silver Necklace 925', quantity: 1, price: 150.0 },
      ],
      subtotal: 2000.0,
      tax: 160.0,
      total: 2160.0,
      payment_method: 'bank_transfer',
      status: 'completed',
      sale_date: '2024-01-18T11:30:00Z',
    },
    {
      id: 'SALE-003',
      invoice_number: 'INV-2024-0003',
      customer_name: 'Luxury Boutique LLC',
      items: [
        { sku: 'GB-24K-001', name: 'Gold Bracelet 24K', quantity: 3, price: 6300.0 },
        { sku: 'GR-22K-001', name: 'Gold Ring 22K', quantity: 5, price: 3250.0 },
      ],
      subtotal: 9550.0,
      tax: 764.0,
      total: 10314.0,
      payment_method: 'credit',
      status: 'completed',
      sale_date: '2024-01-15T09:00:00Z',
    },
    {
      id: 'SALE-004',
      invoice_number: 'INV-2024-0004',
      customer_name: 'Michael Brown',
      items: [{ sku: 'PP-PT-001', name: 'Platinum Pendant', quantity: 1, price: 1200.0 }],
      subtotal: 1200.0,
      tax: 96.0,
      total: 1296.0,
      payment_method: 'cash',
      status: 'completed',
      sale_date: '2024-01-19T16:30:00Z',
    },
    {
      id: 'SALE-005',
      invoice_number: 'INV-2024-0005',
      customer_name: 'Diamond Gallery Inc',
      items: [{ sku: 'DE-18K-001', name: 'Diamond Earrings 18K', quantity: 10, price: 18500.0 }],
      subtotal: 18500.0,
      tax: 1480.0,
      total: 19980.0,
      payment_method: 'credit',
      status: 'pending',
      sale_date: '2024-01-22T10:00:00Z',
    },
  ];
}

function generateMockSupplierData(): Record<string, unknown>[] {
  return [
    {
      id: 'SUP-001',
      company_name: 'Golden Suppliers Ltd',
      contact_name: 'David Wilson',
      email: 'david@goldensuppliers.com',
      phone: '+1-555-0201',
      address: '123 Gold Street, New York, NY 10001',
      specialty: 'Gold jewelry and raw materials',
      payment_terms: 'Net 30',
      total_orders: 45,
      total_spent: 125000.0,
      rating: 4.8,
      is_active: true,
      created_at: '2022-01-15T10:00:00Z',
    },
    {
      id: 'SUP-002',
      company_name: 'Silver Masters Inc',
      contact_name: 'Lisa Anderson',
      email: 'lisa@silvermasters.com',
      phone: '+1-555-0202',
      address: '456 Silver Ave, Los Angeles, CA 90001',
      specialty: 'Sterling silver products',
      payment_terms: 'Net 15',
      total_orders: 32,
      total_spent: 45000.0,
      rating: 4.5,
      is_active: true,
      created_at: '2022-03-20T11:00:00Z',
    },
    {
      id: 'SUP-003',
      company_name: 'Diamond Direct Co',
      contact_name: 'James Miller',
      email: 'james@diamonddirect.com',
      phone: '+1-555-0203',
      address: '789 Diamond Blvd, Miami, FL 33101',
      specialty: 'Certified diamonds and gemstones',
      payment_terms: 'Net 45',
      total_orders: 18,
      total_spent: 250000.0,
      rating: 4.9,
      is_active: true,
      created_at: '2021-11-10T09:00:00Z',
    },
    {
      id: 'SUP-004',
      company_name: 'Platinum Partners',
      contact_name: 'Jennifer Davis',
      email: 'jennifer@platinumpartners.com',
      phone: '+1-555-0204',
      address: '321 Platinum Way, Chicago, IL 60601',
      specialty: 'Platinum and palladium',
      payment_terms: 'Net 30',
      total_orders: 12,
      total_spent: 180000.0,
      rating: 4.7,
      is_active: true,
      created_at: '2022-06-05T14:00:00Z',
    },
    {
      id: 'SUP-005',
      company_name: 'Gem World Trading',
      contact_name: 'Carlos Rodriguez',
      email: 'carlos@gemworld.com',
      phone: '+1-555-0205',
      address: '567 Gem Lane, Houston, TX 77001',
      specialty: 'Colored gemstones and pearls',
      payment_terms: 'Net 30',
      total_orders: 28,
      total_spent: 75000.0,
      rating: 4.6,
      is_active: false,
      created_at: '2021-08-22T10:00:00Z',
    },
  ];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Converts data to CSV format
 */
function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0] as Record<string, unknown>);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = (row as Record<string, unknown>)[header];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma
        const escaped = value.replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped;
      }
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Generates export filename with timestamp
 */
function generateExportFilename(type: string, format: ExportFormat): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${type}-export-${timestamp}.${format === 'excel' ? 'xlsx' : format}`;
}

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================

/**
 * Export inventory data to specified format
 *
 * @param format - Export format (csv, json, excel)
 * @param filters - Optional filters to apply
 * @returns ActionResult with export data and filename
 */
export async function exportInventory(
  format: ExportFormat,
  filters?: InventoryExportFilters
): Promise<ActionResult<{ content: string; filename: string; recordCount: number }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate format
    const formatResult = exportFormatSchema.safeParse(format);
    if (!formatResult.success) {
      return { success: false, error: 'Invalid export format' };
    }

    // Validate filters if provided
    if (filters) {
      const filtersResult = inventoryFiltersSchema.safeParse(filters);
      if (!filtersResult.success) {
        return { success: false, error: 'Invalid export filters' };
      }
    }

    // Generate mock data (replace with actual DB query when ready)
    let data = generateMockInventoryData();

    // Apply filters (mock implementation)
    if (filters?.status) {
      data = data.filter((item) => item.status === filters.status);
    }
    if (filters?.metalType) {
      data = data.filter((item) => item.metal_type === filters.metalType);
    }
    if (!filters?.includeDeleted) {
      data = data.filter((item) => item.status !== 'deleted');
    }

    // Convert to requested format
    let content: string;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      content = convertToCSV(data);
    } else {
      // Excel format - return JSON with metadata for client-side processing
      content = JSON.stringify({ format: 'excel', data, sheetName: 'Inventory' });
    }

    const filename = generateExportFilename('inventory', format);

    return {
      success: true,
      data: {
        content,
        filename,
        recordCount: data.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export inventory',
    };
  }
}

/**
 * Export customer data to specified format
 *
 * @param format - Export format (csv, json, excel)
 * @param filters - Optional filters to apply
 * @returns ActionResult with export data and filename
 */
export async function exportCustomers(
  format: ExportFormat,
  filters?: CustomerExportFilters
): Promise<ActionResult<{ content: string; filename: string; recordCount: number }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate format
    const formatResult = exportFormatSchema.safeParse(format);
    if (!formatResult.success) {
      return { success: false, error: 'Invalid export format' };
    }

    // Validate filters if provided
    if (filters) {
      const filtersResult = customerFiltersSchema.safeParse(filters);
      if (!filtersResult.success) {
        return { success: false, error: 'Invalid export filters' };
      }
    }

    // Generate mock data
    let data = generateMockCustomerData();

    // Apply filters (mock implementation)
    if (filters?.customerType) {
      data = data.filter((c) => c.customer_type === filters.customerType);
    }
    if (filters?.isActive !== undefined) {
      data = data.filter((c) => c.is_active === filters.isActive);
    }
    if (filters?.minPurchases !== undefined) {
      data = data.filter((c) => (c.total_purchases as number) >= (filters.minPurchases ?? 0));
    }

    // Convert to requested format
    let content: string;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      content = convertToCSV(data);
    } else {
      content = JSON.stringify({ format: 'excel', data, sheetName: 'Customers' });
    }

    const filename = generateExportFilename('customers', format);

    return {
      success: true,
      data: {
        content,
        filename,
        recordCount: data.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export customers',
    };
  }
}

/**
 * Export sales data to specified format
 *
 * @param format - Export format (csv, json, excel)
 * @param dateRange - Optional date range filter
 * @returns ActionResult with export data and filename
 */
export async function exportSales(
  format: ExportFormat,
  dateRange?: DateRange
): Promise<ActionResult<{ content: string; filename: string; recordCount: number }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate format
    const formatResult = exportFormatSchema.safeParse(format);
    if (!formatResult.success) {
      return { success: false, error: 'Invalid export format' };
    }

    // Validate date range if provided
    if (dateRange) {
      const dateRangeResult = dateRangeSchema.safeParse(dateRange);
      if (!dateRangeResult.success) {
        return { success: false, error: 'Invalid date range' };
      }
    }

    // Generate mock data
    let data = generateMockSalesData();

    // Apply date range filter (mock implementation)
    if (dateRange) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      data = data.filter((sale) => {
        const saleDate = new Date(sale.sale_date as string);
        return saleDate >= startDate && saleDate <= endDate;
      });
    }

    // Flatten items for CSV export
    const flatData =
      format === 'csv'
        ? data.map((sale) => ({
            ...sale,
            items: JSON.stringify(sale.items),
          }))
        : data;

    // Convert to requested format
    let content: string;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      content = convertToCSV(flatData);
    } else {
      content = JSON.stringify({ format: 'excel', data, sheetName: 'Sales' });
    }

    const filename = generateExportFilename('sales', format);

    return {
      success: true,
      data: {
        content,
        filename,
        recordCount: data.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export sales',
    };
  }
}

/**
 * Export supplier data to specified format
 *
 * @param format - Export format (csv, json, excel)
 * @returns ActionResult with export data and filename
 */
export async function exportSuppliers(
  format: ExportFormat
): Promise<ActionResult<{ content: string; filename: string; recordCount: number }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate format
    const formatResult = exportFormatSchema.safeParse(format);
    if (!formatResult.success) {
      return { success: false, error: 'Invalid export format' };
    }

    // Generate mock data
    const data = generateMockSupplierData();

    // Convert to requested format
    let content: string;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      content = convertToCSV(data);
    } else {
      content = JSON.stringify({ format: 'excel', data, sheetName: 'Suppliers' });
    }

    const filename = generateExportFilename('suppliers', format);

    return {
      success: true,
      data: {
        content,
        filename,
        recordCount: data.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export suppliers',
    };
  }
}

/**
 * Get a preview of data to export
 *
 * @param type - Type of data to preview
 * @param limit - Maximum number of records to return
 * @returns ActionResult with preview data
 */
export async function getExportPreview(
  type: ImportType,
  limit: number = 5
): Promise<ActionResult<ExportPreview>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate type
    const typeResult = importTypeSchema.safeParse(type);
    if (!typeResult.success) {
      return { success: false, error: 'Invalid data type' };
    }

    // Validate limit
    const safeLimit = Math.min(Math.max(1, limit), 20);

    // Get mock data based on type
    let allData: Record<string, unknown>[];
    switch (type) {
      case 'inventory':
        allData = generateMockInventoryData();
        break;
      case 'customers':
        allData = generateMockCustomerData();
        break;
      case 'sales':
        allData = generateMockSalesData();
        break;
      case 'suppliers':
        allData = generateMockSupplierData();
        break;
      default:
        return { success: false, error: 'Unsupported data type' };
    }

    const sampleRecords = allData.slice(0, safeLimit);
    const columns = allData.length > 0 ? Object.keys(allData[0] as Record<string, unknown>) : [];

    return {
      success: true,
      data: {
        type,
        totalRecords: allData.length,
        sampleRecords,
        columns,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get export preview',
    };
  }
}

// =============================================================================
// IMPORT FUNCTIONS
// =============================================================================

/**
 * Validate an import file before processing
 *
 * @param fileContent - The raw file content (CSV or JSON string)
 * @param type - The type of data being imported
 * @returns ActionResult with validation results
 */
export async function validateImportFile(
  fileContent: string,
  type: ImportType
): Promise<ActionResult<ValidationResult>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate type
    const typeResult = importTypeSchema.safeParse(type);
    if (!typeResult.success) {
      return { success: false, error: 'Invalid import type' };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let rowCount = 0;
    let detectedColumns: string[] = [];

    // Try to parse as JSON first
    let parsedData: Record<string, unknown>[] = [];
    try {
      const jsonData = JSON.parse(fileContent);
      if (Array.isArray(jsonData)) {
        parsedData = jsonData;
        rowCount = parsedData.length;
        if (parsedData.length > 0) {
          detectedColumns = Object.keys(parsedData[0] as Record<string, unknown>);
        }
      } else {
        errors.push({
          row: 0,
          column: '',
          message: 'JSON content must be an array of objects',
        });
      }
    } catch {
      // Try to parse as CSV
      const lines = fileContent.split('\n').filter((line) => line.trim());
      if (lines.length < 2) {
        errors.push({
          row: 0,
          column: '',
          message: 'File must contain at least a header row and one data row',
        });
      } else {
        detectedColumns = lines[0]?.split(',').map((col) => col.trim().replace(/^"|"$/g, '')) ?? [];
        rowCount = lines.length - 1; // Exclude header
      }
    }

    // Validate required columns based on type
    const requiredColumns = getRequiredColumns(type);
    const missingColumns = requiredColumns.filter((col) => !detectedColumns.includes(col));

    if (missingColumns.length > 0) {
      errors.push({
        row: 0,
        column: missingColumns.join(', '),
        message: `Missing required columns: ${missingColumns.join(', ')}`,
      });
    }

    // Add warnings for unknown columns
    const knownColumns = [...requiredColumns, ...getOptionalColumns(type)];
    const unknownColumns = detectedColumns.filter((col) => !knownColumns.includes(col));
    if (unknownColumns.length > 0) {
      warnings.push({
        row: 0,
        column: unknownColumns.join(', '),
        message: `Unknown columns will be ignored: ${unknownColumns.join(', ')}`,
      });
    }

    // Row count warning
    if (rowCount > 1000) {
      warnings.push({
        row: 0,
        column: '',
        message: `Large import detected (${rowCount} rows). Consider breaking into smaller batches.`,
      });
    }

    return {
      success: true,
      data: {
        valid: errors.length === 0,
        errors,
        warnings,
        rowCount,
        detectedColumns,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate import file',
    };
  }
}

/**
 * Parse and map import data according to column mappings
 *
 * @param fileContent - The raw file content
 * @param type - The type of data being imported
 * @param mapping - Column mappings from source to target
 * @returns ActionResult with parsed data
 */
export async function parseImportData(
  fileContent: string,
  type: ImportType,
  mapping: ColumnMapping[]
): Promise<ActionResult<ParsedImportData>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate type
    const typeResult = importTypeSchema.safeParse(type);
    if (!typeResult.success) {
      return { success: false, error: 'Invalid import type' };
    }

    // Validate mappings
    for (const m of mapping) {
      const mappingResult = columnMappingSchema.safeParse(m);
      if (!mappingResult.success) {
        return { success: false, error: 'Invalid column mapping' };
      }
    }

    const records: Record<string, unknown>[] = [];
    const errors: ImportError[] = [];
    let parsedCount = 0;
    let failedCount = 0;

    // Try to parse as JSON first
    let rawData: Record<string, unknown>[] = [];
    try {
      const jsonData = JSON.parse(fileContent);
      if (Array.isArray(jsonData)) {
        rawData = jsonData;
      }
    } catch {
      // Parse as CSV
      const lines = fileContent.split('\n').filter((line) => line.trim());
      if (lines.length >= 2) {
        const headers = lines[0]?.split(',').map((col) => col.trim().replace(/^"|"$/g, '')) ?? [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i]?.split(',').map((val) => val.trim().replace(/^"|"$/g, '')) ?? [];
          const row: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] ?? '';
          });
          rawData.push(row);
        }
      }
    }

    // Apply mappings and transformations
    for (let i = 0; i < rawData.length; i++) {
      try {
        const sourceRow = rawData[i] as Record<string, unknown>;
        const targetRow: Record<string, unknown> = {};

        for (const m of mapping) {
          let value = sourceRow[m.sourceColumn];

          // Apply transformations
          if (value !== undefined && value !== null && m.transform) {
            switch (m.transform) {
              case 'uppercase':
                value = String(value).toUpperCase();
                break;
              case 'lowercase':
                value = String(value).toLowerCase();
                break;
              case 'trim':
                value = String(value).trim();
                break;
              case 'number':
                value = parseFloat(String(value)) || 0;
                break;
              case 'date':
                value = new Date(String(value)).toISOString();
                break;
            }
          }

          targetRow[m.targetField] = value;
        }

        records.push(targetRow);
        parsedCount++;
      } catch (err) {
        failedCount++;
        errors.push({
          row: i + 2, // 1-indexed, plus header row
          field: 'unknown',
          message: err instanceof Error ? err.message : 'Failed to parse row',
        });
      }
    }

    return {
      success: true,
      data: {
        records,
        parsedCount,
        failedCount,
        errors,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse import data',
    };
  }
}

/**
 * Import inventory items
 *
 * @param data - Array of inventory records to import
 * @param options - Import options
 * @returns ActionResult with import results
 */
export async function importInventory(
  data: Record<string, unknown>[],
  options: ImportOptions
): Promise<ActionResult<ImportResult>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate options
    const optionsResult = importOptionsSchema.safeParse(options);
    if (!optionsResult.success) {
      return { success: false, error: 'Invalid import options' };
    }

    const errors: ImportError[] = [];
    let imported = 0;
    let skipped = 0;

    // Mock import processing
    for (let i = 0; i < data.length; i++) {
      const record = data[i] as Record<string, unknown>;

      // Validate required fields
      if (!record.name || !record.sku) {
        errors.push({
          row: i + 1,
          field: !record.name ? 'name' : 'sku',
          message: 'Required field is missing',
        });
        skipped++;
        continue;
      }

      // Check for duplicates (mock - check SKU)
      const existingSkus = generateMockInventoryData().map((item) => item.sku);
      if (existingSkus.includes(record.sku as string)) {
        if (options.skipDuplicates && !options.updateExisting) {
          skipped++;
          continue;
        }
        if (!options.updateExisting) {
          errors.push({
            row: i + 1,
            field: 'sku',
            message: `Duplicate SKU: ${record.sku}`,
          });
          skipped++;
          continue;
        }
      }

      // If not a dry run, "import" the record
      if (!options.dryRun) {
        imported++;
      } else {
        imported++; // Count as would-be-imported for dry run
      }
    }

    return {
      success: true,
      data: {
        success: errors.length === 0,
        imported,
        skipped,
        errors,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import inventory',
    };
  }
}

/**
 * Import customers
 *
 * @param data - Array of customer records to import
 * @param options - Import options
 * @returns ActionResult with import results
 */
export async function importCustomers(
  data: Record<string, unknown>[],
  options: ImportOptions
): Promise<ActionResult<ImportResult>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate options
    const optionsResult = importOptionsSchema.safeParse(options);
    if (!optionsResult.success) {
      return { success: false, error: 'Invalid import options' };
    }

    const errors: ImportError[] = [];
    let imported = 0;
    let skipped = 0;

    // Mock import processing
    for (let i = 0; i < data.length; i++) {
      const record = data[i] as Record<string, unknown>;

      // Validate required fields
      if (!record.full_name) {
        errors.push({
          row: i + 1,
          field: 'full_name',
          message: 'Customer name is required',
        });
        skipped++;
        continue;
      }

      // Validate email format if provided
      if (record.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(record.email as string)) {
          errors.push({
            row: i + 1,
            field: 'email',
            message: 'Invalid email format',
          });
          skipped++;
          continue;
        }
      }

      // Check for duplicates (mock - check email)
      if (record.email) {
        const existingEmails = generateMockCustomerData().map((c) => c.email);
        if (existingEmails.includes(record.email as string)) {
          if (options.skipDuplicates && !options.updateExisting) {
            skipped++;
            continue;
          }
          if (!options.updateExisting) {
            errors.push({
              row: i + 1,
              field: 'email',
              message: `Duplicate email: ${record.email}`,
            });
            skipped++;
            continue;
          }
        }
      }

      // If not a dry run, "import" the record
      if (!options.dryRun) {
        imported++;
      } else {
        imported++;
      }
    }

    return {
      success: true,
      data: {
        success: errors.length === 0,
        imported,
        skipped,
        errors,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import customers',
    };
  }
}

/**
 * Get import template for a specific data type
 *
 * @param type - The type of data template to generate
 * @returns ActionResult with template information
 */
export async function getImportTemplate(type: ImportType): Promise<ActionResult<ImportTemplate>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate type
    const typeResult = importTypeSchema.safeParse(type);
    if (!typeResult.success) {
      return { success: false, error: 'Invalid import type' };
    }

    const templates: Record<ImportType, ImportTemplate> = {
      inventory: {
        type: 'inventory',
        name: 'Inventory Import Template',
        description:
          'Template for importing inventory items. Include SKU, name, and pricing information.',
        requiredColumns: [
          {
            name: 'sku',
            description: 'Unique stock keeping unit',
            type: 'string',
            example: 'GR-22K-001',
          },
          { name: 'name', description: 'Item name', type: 'string', example: 'Gold Ring 22K' },
          {
            name: 'purchase_price',
            description: 'Purchase price',
            type: 'number',
            example: '450.00',
          },
        ],
        optionalColumns: [
          { name: 'category', description: 'Product category', type: 'string', example: 'Rings' },
          { name: 'metal_type', description: 'Type of metal', type: 'string', example: 'Gold' },
          { name: 'purity', description: 'Metal purity', type: 'string', example: '22K' },
          { name: 'weight_grams', description: 'Weight in grams', type: 'number', example: '5.5' },
          {
            name: 'selling_price',
            description: 'Selling price',
            type: 'number',
            example: '650.00',
          },
          { name: 'status', description: 'Item status', type: 'string', example: 'available' },
        ],
        sampleCsv:
          'sku,name,purchase_price,category,metal_type,purity,weight_grams,selling_price,status\nGR-22K-001,Gold Ring 22K,450.00,Rings,Gold,22K,5.5,650.00,available\nSN-925-001,Silver Necklace 925,85.00,Necklaces,Silver,925,25.0,150.00,available',
      },
      customers: {
        type: 'customers',
        name: 'Customer Import Template',
        description: 'Template for importing customer data. Include name and contact information.',
        requiredColumns: [
          {
            name: 'full_name',
            description: 'Customer full name or company name',
            type: 'string',
            example: 'John Smith',
          },
        ],
        optionalColumns: [
          {
            name: 'email',
            description: 'Email address',
            type: 'string',
            example: 'john@email.com',
          },
          { name: 'phone', description: 'Phone number', type: 'string', example: '+1-555-0101' },
          {
            name: 'customer_type',
            description: 'individual or business',
            type: 'string',
            example: 'individual',
          },
          {
            name: 'address',
            description: 'Street address',
            type: 'string',
            example: '123 Main St',
          },
          { name: 'city', description: 'City', type: 'string', example: 'New York' },
          {
            name: 'notes',
            description: 'Additional notes',
            type: 'string',
            example: 'VIP customer',
          },
        ],
        sampleCsv:
          'full_name,email,phone,customer_type,address,city,notes\nJohn Smith,john@email.com,+1-555-0101,individual,123 Main St,New York,VIP customer\nAcme Corp,orders@acme.com,+1-555-0102,business,456 Business Ave,Los Angeles,',
      },
      suppliers: {
        type: 'suppliers',
        name: 'Supplier Import Template',
        description:
          'Template for importing supplier data. Include company and contact information.',
        requiredColumns: [
          {
            name: 'company_name',
            description: 'Supplier company name',
            type: 'string',
            example: 'Golden Suppliers Ltd',
          },
          {
            name: 'contact_name',
            description: 'Primary contact name',
            type: 'string',
            example: 'David Wilson',
          },
        ],
        optionalColumns: [
          {
            name: 'email',
            description: 'Email address',
            type: 'string',
            example: 'david@goldensuppliers.com',
          },
          { name: 'phone', description: 'Phone number', type: 'string', example: '+1-555-0201' },
          {
            name: 'address',
            description: 'Business address',
            type: 'string',
            example: '123 Gold Street, NY',
          },
          {
            name: 'specialty',
            description: 'Supplier specialty',
            type: 'string',
            example: 'Gold jewelry',
          },
          {
            name: 'payment_terms',
            description: 'Payment terms',
            type: 'string',
            example: 'Net 30',
          },
        ],
        sampleCsv:
          'company_name,contact_name,email,phone,address,specialty,payment_terms\nGolden Suppliers Ltd,David Wilson,david@goldensuppliers.com,+1-555-0201,"123 Gold Street, NY",Gold jewelry,Net 30\nSilver Masters Inc,Lisa Anderson,lisa@silvermasters.com,+1-555-0202,"456 Silver Ave, LA",Sterling silver,Net 15',
      },
      sales: {
        type: 'sales',
        name: 'Sales Import Template',
        description: 'Template for importing sales transactions. For historical data migration.',
        requiredColumns: [
          {
            name: 'invoice_number',
            description: 'Invoice or receipt number',
            type: 'string',
            example: 'INV-2024-0001',
          },
          {
            name: 'customer_name',
            description: 'Customer name',
            type: 'string',
            example: 'John Smith',
          },
          { name: 'total', description: 'Total sale amount', type: 'number', example: '702.00' },
          {
            name: 'sale_date',
            description: 'Date of sale (ISO format)',
            type: 'date',
            example: '2024-01-20',
          },
        ],
        optionalColumns: [
          {
            name: 'subtotal',
            description: 'Subtotal before tax',
            type: 'number',
            example: '650.00',
          },
          { name: 'tax', description: 'Tax amount', type: 'number', example: '52.00' },
          {
            name: 'payment_method',
            description: 'Payment method used',
            type: 'string',
            example: 'credit_card',
          },
          { name: 'status', description: 'Sale status', type: 'string', example: 'completed' },
          { name: 'notes', description: 'Additional notes', type: 'string', example: '' },
        ],
        sampleCsv:
          'invoice_number,customer_name,total,sale_date,subtotal,tax,payment_method,status\nINV-2024-0001,John Smith,702.00,2024-01-20,650.00,52.00,credit_card,completed\nINV-2024-0002,Emma Johnson,2160.00,2024-01-18,2000.00,160.00,bank_transfer,completed',
      },
    };

    const template = templates[type];
    if (!template) {
      return { success: false, error: 'Template not found for the specified type' };
    }

    return {
      success: true,
      data: template,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get import template',
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS FOR VALIDATION
// =============================================================================

/**
 * Get required columns for a given import type
 */
function getRequiredColumns(type: ImportType): string[] {
  switch (type) {
    case 'inventory':
      return ['sku', 'name', 'purchase_price'];
    case 'customers':
      return ['full_name'];
    case 'suppliers':
      return ['company_name', 'contact_name'];
    case 'sales':
      return ['invoice_number', 'customer_name', 'total', 'sale_date'];
    default:
      return [];
  }
}

/**
 * Get optional columns for a given import type
 */
function getOptionalColumns(type: ImportType): string[] {
  switch (type) {
    case 'inventory':
      return [
        'category',
        'metal_type',
        'purity',
        'weight_grams',
        'selling_price',
        'status',
        'description',
        'stone_type',
        'stone_carats',
      ];
    case 'customers':
      return [
        'email',
        'phone',
        'customer_type',
        'address',
        'city',
        'notes',
        'contact_person',
        'credit_limit',
      ];
    case 'suppliers':
      return ['email', 'phone', 'address', 'specialty', 'payment_terms', 'rating', 'is_active'];
    case 'sales':
      return ['subtotal', 'tax', 'payment_method', 'status', 'notes', 'items'];
    default:
      return [];
  }
}
