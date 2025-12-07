/**
 * Excel/CSV Export API Route
 *
 * Generates Excel-compatible CSV exports from report data.
 * Supports UTF-8 encoding with BOM for proper Excel compatibility.
 *
 * @module app/api/export/excel/route
 */

import { type NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Types
// =============================================================================

/**
 * Column definition for export
 */
interface ExportColumn {
  /** Key to access data in row objects */
  key: string;
  /** Display title for the column header */
  title: string;
}

/**
 * Request body for CSV/Excel export
 */
interface ExportRequest {
  /** Title of the report */
  title: string;
  /** Column definitions */
  columns: ExportColumn[];
  /** Data rows to export */
  data: Record<string, unknown>[];
  /** Optional summary section */
  summary?: Record<string, string | number>;
  /** Whether to include column headers (default: true) */
  includeHeaders?: boolean;
  /** Whether to include summary section (default: true) */
  includeSummary?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Maximum number of rows allowed in a single export */
const MAX_ROWS = 10000;

/** BOM (Byte Order Mark) for UTF-8 encoding - ensures Excel opens CSV with correct encoding */
const UTF8_BOM = '\uFEFF';

// =============================================================================
// POST Handler
// =============================================================================

/**
 * POST /api/export/excel
 *
 * Generates a CSV/Excel file from the provided report data.
 *
 * @param request - The incoming request with export data
 * @returns CSV file as downloadable response
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/export/excel', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     title: 'Sales Report',
 *     columns: [
 *       { key: 'date', title: 'Date' },
 *       { key: 'customer', title: 'Customer' },
 *       { key: 'amount', title: 'Amount' },
 *     ],
 *     data: [
 *       { date: '2024-01-15', customer: 'John Doe', amount: 1500 },
 *       { date: '2024-01-16', customer: 'Jane Smith', amount: 2300 },
 *     ],
 *     summary: {
 *       total_sales: 3800,
 *       transaction_count: 2,
 *     },
 *   }),
 * });
 *
 * // Download the file
 * const blob = await response.blob();
 * ```
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body: ExportRequest = await request.json();
    const { title, columns, data, summary, includeHeaders = true, includeSummary = true } = body;

    // Validate required fields
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: title' },
        { status: 400 }
      );
    }

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid required field: columns (must be non-empty array)' },
        { status: 400 }
      );
    }

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Missing or invalid required field: data (must be array)' },
        { status: 400 }
      );
    }

    // Validate column structure
    for (const col of columns) {
      if (!col.key || !col.title) {
        return NextResponse.json(
          { error: 'Each column must have "key" and "title" properties' },
          { status: 400 }
        );
      }
    }

    // Enforce row limit
    if (data.length > MAX_ROWS) {
      return NextResponse.json(
        {
          error: `Data exceeds maximum allowed rows (${MAX_ROWS}). Please filter your data or export in batches.`,
        },
        { status: 400 }
      );
    }

    // 3. Generate CSV content
    const csvContent = generateCSV({
      title,
      columns,
      data,
      summary,
      includeHeaders,
      includeSummary,
    });

    // 4. Create filename (sanitized)
    const sanitizedTitle = title
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 50);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${sanitizedTitle}-${timestamp}.csv`;

    // 5. Return CSV file response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('[Excel/CSV Export Error]', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate export' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler
// =============================================================================

/**
 * GET /api/export/excel
 *
 * Returns information about the export endpoint capabilities.
 * Useful for client-side feature detection.
 *
 * @returns JSON with export options and limits
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    formats: ['csv'],
    maxRows: MAX_ROWS,
    supportedFeatures: ['headers', 'summary', 'utf8', 'excel-compatible', 'special-characters'],
    usage: {
      method: 'POST',
      contentType: 'application/json',
      requiredFields: ['title', 'columns', 'data'],
      optionalFields: ['summary', 'includeHeaders', 'includeSummary'],
    },
  });
}

// =============================================================================
// CSV Generation Helpers
// =============================================================================

/**
 * Generate complete CSV content from export parameters
 */
function generateCSV(params: {
  title: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  summary?: Record<string, string | number>;
  includeHeaders: boolean;
  includeSummary: boolean;
}): string {
  const { title, columns, data, summary, includeHeaders, includeSummary } = params;
  const rows: string[] = [];

  // Title row
  rows.push(escapeCSVValue(title));

  // Generated timestamp
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  rows.push(`Generated: ${dateStr} at ${timeStr}`);

  // Row count
  rows.push(`Total Records: ${data.length}`);

  // Empty row before data
  rows.push('');

  // Header row
  if (includeHeaders) {
    rows.push(columns.map((col) => escapeCSVValue(col.title)).join(','));
  }

  // Data rows
  for (const row of data) {
    const values = columns.map((col) => {
      const value = row[col.key];
      return escapeCSVValue(formatCellValue(value));
    });
    rows.push(values.join(','));
  }

  // Summary section
  if (includeSummary && summary && Object.keys(summary).length > 0) {
    rows.push(''); // Empty row before summary
    rows.push(escapeCSVValue('Summary'));

    for (const [key, value] of Object.entries(summary)) {
      // Convert snake_case to Title Case
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      rows.push(`${escapeCSVValue(label)},${escapeCSVValue(formatCellValue(value))}`);
    }
  }

  // Add BOM and return complete CSV
  return UTF8_BOM + rows.join('\n');
}

/**
 * Escape a value for CSV format
 *
 * Rules:
 * - If value contains comma, quote, newline, or carriage return, wrap in quotes
 * - If value contains quotes, escape them by doubling
 * - Null/undefined become empty string
 */
function escapeCSVValue(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Check if value needs quoting
  const needsQuoting =
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r') ||
    stringValue.includes('\t');

  if (needsQuoting) {
    // Escape double quotes by doubling them, then wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Format a cell value for display in CSV
 *
 * Handles various data types:
 * - null/undefined -> empty string
 * - numbers -> formatted with appropriate precision
 * - booleans -> "Yes"/"No"
 * - Date objects -> ISO date string
 * - objects -> JSON string
 */
function formatCellValue(value: unknown): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Handle numbers
  if (typeof value === 'number') {
    // Check for NaN or Infinity
    if (!Number.isFinite(value)) {
      return '';
    }
    // Format integers without decimals, floats with 2 decimal places
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toFixed(2);
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle Date objects
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return '';
    }
    const isoString = value.toISOString();
    return isoString.split('T')[0] ?? isoString;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item) => formatCellValue(item)).join('; ');
  }

  // Handle objects
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }

  // Default: convert to string
  return String(value);
}
