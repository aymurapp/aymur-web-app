/**
 * Export Utilities
 *
 * Helper functions for exporting data to various formats (PDF, Excel/CSV, JSON).
 * These functions handle client-side download logic and API interactions.
 *
 * @module lib/utils/export
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Column definition for export
 */
export interface ExportColumn {
  /** Key to access data in row objects */
  key: string;
  /** Display title for the column header */
  title: string;
  /** Optional width hint for PDF exports (in pixels) */
  width?: number;
}

/**
 * Data structure for export operations
 */
export interface ExportData {
  /** Title of the export/report */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Column definitions */
  columns: ExportColumn[];
  /** Data rows to export */
  data: Record<string, unknown>[];
  /** Optional summary section (key-value pairs) */
  summary?: Record<string, string | number>;
  /** Optional footer text */
  footer?: string;
}

/**
 * Options for export operations
 */
export interface ExportOptions {
  /** Whether to include column headers (default: true) */
  includeHeaders?: boolean;
  /** Whether to include summary section (default: true) */
  includeSummary?: boolean;
  /** Custom filename (without extension) */
  filename?: string;
}

// =============================================================================
// PDF Export
// =============================================================================

/**
 * Export data to PDF format
 *
 * Opens a print-friendly view in a new window that can be printed as PDF.
 * Uses the server-side PDF API to generate HTML content.
 *
 * @param data - The data to export
 * @param options - Export options
 * @throws Error if PDF generation fails
 *
 * @example
 * ```typescript
 * await exportToPDF({
 *   title: 'Sales Report',
 *   columns: [
 *     { key: 'date', title: 'Date' },
 *     { key: 'amount', title: 'Amount' },
 *   ],
 *   data: salesData,
 *   summary: { total: 15000 },
 * });
 * ```
 */
export async function exportToPDF(data: ExportData, options: ExportOptions = {}): Promise<void> {
  const { includeHeaders = true, includeSummary = true } = options;

  const response = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...data,
      includeHeaders,
      includeSummary,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate PDF');
  }

  const result = await response.json();

  // Open HTML content in new window for printing as PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${data.title}</title>
          <style>${result.content.styles}</style>
        </head>
        <body>
          ${result.content.html}
        </body>
      </html>
    `);
    printWindow.document.close();
    // Slight delay to ensure content is rendered before print dialog
    setTimeout(() => {
      printWindow.print();
    }, 250);
  } else {
    throw new Error('Unable to open print window. Please check your popup blocker settings.');
  }
}

// =============================================================================
// Excel/CSV Export
// =============================================================================

/**
 * Export data to Excel/CSV format
 *
 * Downloads a CSV file that is compatible with Excel and other spreadsheet applications.
 * Uses UTF-8 encoding with BOM for proper character support.
 *
 * @param data - The data to export
 * @param options - Export options
 * @throws Error if CSV generation fails
 *
 * @example
 * ```typescript
 * await exportToExcel({
 *   title: 'Inventory Report',
 *   columns: [
 *     { key: 'sku', title: 'SKU' },
 *     { key: 'name', title: 'Item Name' },
 *     { key: 'quantity', title: 'Quantity' },
 *   ],
 *   data: inventoryData,
 * });
 * ```
 */
export async function exportToExcel(data: ExportData, options: ExportOptions = {}): Promise<void> {
  const { includeHeaders = true, includeSummary = true, filename } = options;

  const response = await fetch('/api/export/excel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...data,
      includeHeaders,
      includeSummary,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate Excel file');
  }

  // Get filename from response headers or use custom filename
  let downloadFilename: string;
  if (filename) {
    downloadFilename = `${filename}.csv`;
  } else {
    const contentDisposition = response.headers.get('Content-Disposition');
    const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
    const extractedFilename = filenameMatch?.[1];
    downloadFilename = extractedFilename ?? `export-${Date.now()}.csv`;
  }

  // Download the file
  const blob = await response.blob();
  downloadBlob(blob, downloadFilename);
}

// =============================================================================
// JSON Export
// =============================================================================

/**
 * Export data to JSON format
 *
 * Creates and downloads a JSON file with the export data.
 * This is a client-side only operation (no server call required).
 *
 * @param data - The data to export
 * @param options - Export options
 *
 * @example
 * ```typescript
 * exportToJSON({
 *   title: 'Customer Data Export',
 *   columns: [
 *     { key: 'name', title: 'Name' },
 *     { key: 'email', title: 'Email' },
 *   ],
 *   data: customerData,
 * });
 * ```
 */
export function exportToJSON(data: ExportData, options: ExportOptions = {}): void {
  const { filename } = options;

  const jsonContent = JSON.stringify(
    {
      title: data.title,
      subtitle: data.subtitle,
      generated_at: new Date().toISOString(),
      columns: data.columns,
      data: data.data,
      summary: data.summary,
      record_count: data.data.length,
    },
    null,
    2
  );

  const blob = new Blob([jsonContent], { type: 'application/json' });

  // Generate filename
  const downloadFilename =
    filename || `${sanitizeFilename(data.title)}-${new Date().toISOString().split('T')[0]}.json`;

  downloadBlob(
    blob,
    downloadFilename.endsWith('.json') ? downloadFilename : `${downloadFilename}.json`
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Download a blob as a file
 *
 * Creates a temporary anchor element to trigger browser download.
 *
 * @param blob - The blob to download
 * @param filename - The filename for the download
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the object URL after a short delay
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Sanitize a string for use as a filename
 *
 * Removes or replaces characters that are invalid in filenames.
 *
 * @param name - The string to sanitize
 * @returns Sanitized filename-safe string
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9\s-]/gi, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .toLowerCase()
    .substring(0, 50); // Limit length
}

// =============================================================================
// Export Format Detection
// =============================================================================

/**
 * Supported export formats
 */
export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';

/**
 * Export data to the specified format
 *
 * Convenience function that dispatches to the appropriate export function
 * based on the format parameter.
 *
 * @param format - The export format
 * @param data - The data to export
 * @param options - Export options
 *
 * @example
 * ```typescript
 * // Export to Excel
 * await exportTo('excel', reportData);
 *
 * // Export to PDF with custom options
 * await exportTo('pdf', reportData, { includeSummary: false });
 * ```
 */
export async function exportTo(
  format: ExportFormat,
  data: ExportData,
  options: ExportOptions = {}
): Promise<void> {
  switch (format) {
    case 'pdf':
      return exportToPDF(data, options);
    case 'excel':
    case 'csv':
      return exportToExcel(data, options);
    case 'json':
      return exportToJSON(data, options);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

// =============================================================================
// Data Preparation Helpers
// =============================================================================

/**
 * Prepare data for export by flattening nested objects
 *
 * Useful when exporting data that contains nested relationships
 * (e.g., customer.name instead of a nested customer object).
 *
 * @param data - Array of objects with potentially nested data
 * @param flattenKeys - Object mapping original keys to dot-notation paths
 * @returns Flattened data array
 *
 * @example
 * ```typescript
 * const salesData = [
 *   { id: 1, customer: { name: 'John', email: 'john@example.com' }, amount: 100 },
 * ];
 *
 * const flatData = flattenForExport(salesData, {
 *   customer_name: 'customer.name',
 *   customer_email: 'customer.email',
 * });
 *
 * // Result: [{ id: 1, customer_name: 'John', customer_email: 'john@example.com', amount: 100 }]
 * ```
 */
export function flattenForExport<T extends Record<string, unknown>>(
  data: T[],
  flattenKeys: Record<string, string>
): Record<string, unknown>[] {
  return data.map((item) => {
    const flattened: Record<string, unknown> = { ...item };

    for (const [newKey, path] of Object.entries(flattenKeys)) {
      const value = getNestedValue(item, path);
      flattened[newKey] = value;
    }

    return flattened;
  });
}

/**
 * Get a nested value from an object using dot notation
 *
 * @param obj - The object to get the value from
 * @param path - Dot-notation path (e.g., 'customer.address.city')
 * @returns The value at the path, or undefined if not found
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let value: unknown = obj;

  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value !== 'object') {
      return undefined;
    }
    value = (value as Record<string, unknown>)[key];
  }

  return value;
}

/**
 * Format currency values for export
 *
 * @param amount - The amount to format
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrencyForExport(
  amount: number | null | undefined,
  currency = 'USD'
): string {
  if (amount === null || amount === undefined) {
    return '';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date values for export
 *
 * @param date - The date to format (Date object or ISO string)
 * @param includeTime - Whether to include time (default: false)
 * @returns Formatted date string
 */
export function formatDateForExport(
  date: Date | string | null | undefined,
  includeTime = false
): string {
  if (!date) {
    return '';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  if (includeTime) {
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
