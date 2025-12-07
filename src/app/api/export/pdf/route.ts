/**
 * PDF Export API Route
 *
 * Generates PDF reports from report data for the Aymur Platform.
 * Supports tabular data export with headers, summaries, and custom styling.
 *
 * Features:
 * - User authentication via Supabase
 * - Input validation with type safety
 * - Generates styled HTML/CSS for PDF conversion
 * - Supports summary sections and footer text
 * - Returns structured content for client-side PDF generation
 *
 * @module app/api/export/pdf/route
 */

import { type NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

/**
 * Column configuration for the PDF table.
 */
interface ColumnConfig {
  /** Unique key matching the data field */
  key: string;
  /** Display title for the column header */
  title: string;
  /** Optional fixed width in pixels */
  width?: number;
  /** Optional text alignment */
  align?: 'left' | 'center' | 'right';
}

/**
 * Request body for PDF generation.
 */
interface ExportRequest {
  /** Report title displayed at the top */
  title: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Column definitions for the table */
  columns: ColumnConfig[];
  /** Array of data records to display */
  data: Record<string, unknown>[];
  /** Optional summary key-value pairs */
  summary?: Record<string, string | number>;
  /** Optional footer text */
  footer?: string;
  /** Optional shop name for branding */
  shopName?: string;
  /** Optional locale for number/date formatting */
  locale?: string;
}

/**
 * Generated PDF content structure.
 */
interface PDFContent {
  /** Complete HTML document */
  html: string;
  /** CSS styles for the document */
  styles: string;
  /** PDF metadata */
  metadata: {
    title: string;
    author: string;
    subject: string;
    creator: string;
    createdAt: string;
  };
}

/**
 * Success response from PDF generation.
 */
interface ExportResponse {
  success: true;
  /** Suggested filename for the PDF */
  filename: string;
  /** Generated content for PDF conversion */
  content: PDFContent;
  /** ISO timestamp of generation */
  generated_at: string;
}

/**
 * Error response from PDF generation.
 */
interface ErrorResponse {
  error: string;
  details?: string;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates the export request body.
 * @param body - The request body to validate
 * @returns Validation result with parsed data or error message
 */
function validateRequest(body: unknown): {
  valid: boolean;
  data?: ExportRequest;
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const request = body as Record<string, unknown>;

  // Validate title
  if (!request.title || typeof request.title !== 'string') {
    return { valid: false, error: 'title is required and must be a string' };
  }

  if (request.title.length > 200) {
    return { valid: false, error: 'title must be 200 characters or less' };
  }

  // Validate columns
  if (!request.columns || !Array.isArray(request.columns)) {
    return { valid: false, error: 'columns is required and must be an array' };
  }

  if (request.columns.length === 0) {
    return { valid: false, error: 'columns must contain at least one column' };
  }

  if (request.columns.length > 50) {
    return { valid: false, error: 'columns cannot exceed 50 columns' };
  }

  for (let i = 0; i < request.columns.length; i++) {
    const col = request.columns[i];
    if (!col || typeof col !== 'object') {
      return { valid: false, error: `columns[${i}] must be an object` };
    }
    if (!col.key || typeof col.key !== 'string') {
      return { valid: false, error: `columns[${i}].key is required` };
    }
    if (!col.title || typeof col.title !== 'string') {
      return { valid: false, error: `columns[${i}].title is required` };
    }
  }

  // Validate data
  if (!request.data || !Array.isArray(request.data)) {
    return { valid: false, error: 'data is required and must be an array' };
  }

  if (request.data.length > 10000) {
    return {
      valid: false,
      error: 'data cannot exceed 10,000 rows for PDF generation',
    };
  }

  // Validate optional fields
  if (request.subtitle !== undefined && typeof request.subtitle !== 'string') {
    return { valid: false, error: 'subtitle must be a string if provided' };
  }

  if (request.footer !== undefined && typeof request.footer !== 'string') {
    return { valid: false, error: 'footer must be a string if provided' };
  }

  if (request.shopName !== undefined && typeof request.shopName !== 'string') {
    return { valid: false, error: 'shopName must be a string if provided' };
  }

  if (request.locale !== undefined && typeof request.locale !== 'string') {
    return { valid: false, error: 'locale must be a string if provided' };
  }

  if (
    request.summary !== undefined &&
    (typeof request.summary !== 'object' || Array.isArray(request.summary))
  ) {
    return { valid: false, error: 'summary must be an object if provided' };
  }

  return { valid: true, data: request as unknown as ExportRequest };
}

// ============================================================================
// PDF Content Generation
// ============================================================================

/**
 * Escapes HTML special characters to prevent XSS.
 * @param text - Text to escape
 * @returns Escaped text safe for HTML
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char);
}

/**
 * Formats a value for display in the PDF.
 * @param value - The value to format
 * @param locale - Optional locale for number formatting
 * @returns Formatted string representation
 */
function formatValue(value: unknown, locale: string = 'en-US'): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'number') {
    // Format numbers with locale-specific separators
    return value.toLocaleString(locale);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value instanceof Date) {
    return value.toLocaleDateString(locale);
  }

  // Handle date strings (ISO format)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString(locale);
      }
    } catch {
      // Fall through to string conversion
    }
  }

  return escapeHtml(String(value));
}

/**
 * Generates a safe filename from the title.
 * @param title - The report title
 * @returns Sanitized filename with timestamp
 */
function generateFilename(title: string): string {
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${sanitized}-${timestamp}.pdf`;
}

/**
 * Generates the CSS styles for the PDF document.
 * Uses Aymur Platform brand colors (gold/amber tones).
 */
function generateStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;
      font-size: 10pt;
      color: #1c1917;
      line-height: 1.4;
      padding: 40px;
      background-color: #ffffff;
    }

    .document {
      max-width: 100%;
      margin: 0 auto;
    }

    /* Header Section */
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #d97706;
    }

    .shop-name {
      font-size: 9pt;
      color: #78716c;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    .title {
      font-size: 20pt;
      font-weight: 700;
      color: #1c1917;
      margin: 0 0 6px 0;
    }

    .subtitle {
      font-size: 11pt;
      color: #57534e;
      margin: 0;
    }

    .generated-date {
      font-size: 8pt;
      color: #a8a29e;
      margin-top: 10px;
    }

    /* Table Section */
    .table-container {
      margin-bottom: 24px;
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }

    thead {
      background-color: #fef3c7;
    }

    th {
      color: #92400e;
      font-weight: 600;
      text-align: left;
      padding: 10px 12px;
      border-bottom: 2px solid #d97706;
      white-space: nowrap;
    }

    th.align-center {
      text-align: center;
    }

    th.align-right {
      text-align: right;
    }

    td {
      padding: 8px 12px;
      border-bottom: 1px solid #e7e5e4;
      vertical-align: top;
    }

    td.align-center {
      text-align: center;
    }

    td.align-right {
      text-align: right;
    }

    tbody tr:nth-child(even) {
      background-color: #fafaf9;
    }

    tbody tr:hover {
      background-color: #f5f5f4;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #78716c;
      font-style: italic;
    }

    /* Summary Section */
    .summary {
      background-color: #fef3c7;
      border-radius: 8px;
      padding: 16px 20px;
      margin-top: 24px;
    }

    .summary-title {
      font-size: 11pt;
      font-weight: 600;
      color: #92400e;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #fcd34d;
    }

    .summary-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }

    .summary-item {
      flex: 1 1 150px;
      text-align: center;
      padding: 8px;
    }

    .summary-label {
      font-size: 8pt;
      color: #78716c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .summary-value {
      font-size: 14pt;
      font-weight: 700;
      color: #92400e;
    }

    /* Footer Section */
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e7e5e4;
      text-align: center;
    }

    .footer-text {
      font-size: 8pt;
      color: #a8a29e;
    }

    .footer-brand {
      font-size: 7pt;
      color: #d6d3d1;
      margin-top: 8px;
    }

    /* Print Optimizations */
    @media print {
      body {
        padding: 20px;
      }

      .header {
        page-break-after: avoid;
      }

      table {
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }

      thead {
        display: table-header-group;
      }

      .summary {
        page-break-inside: avoid;
      }

      .footer {
        page-break-before: avoid;
      }
    }
  `;
}

/**
 * Generates the complete HTML content for the PDF.
 * @param params - Export request parameters
 * @returns Complete HTML document as string
 */
function generateHtml(params: ExportRequest): string {
  const { title, subtitle, columns, data, summary, footer, shopName, locale = 'en-US' } = params;

  const generatedDate = new Date().toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Generate table headers
  const tableHeaders = columns
    .map((col) => {
      const widthStyle = col.width ? ` style="width: ${col.width}px"` : '';
      const alignClass = col.align ? ` class="align-${col.align}"` : '';
      return `<th${widthStyle}${alignClass}>${escapeHtml(col.title)}</th>`;
    })
    .join('\n            ');

  // Generate table rows
  const tableRows =
    data.length > 0
      ? data
          .map((row) => {
            const cells = columns
              .map((col) => {
                const value = row[col.key];
                const formattedValue = formatValue(value, locale);
                const alignClass = col.align ? ` class="align-${col.align}"` : '';
                return `<td${alignClass}>${formattedValue}</td>`;
              })
              .join('\n              ');
            return `          <tr>\n              ${cells}\n            </tr>`;
          })
          .join('\n')
      : `          <tr><td colspan="${columns.length}" class="empty-state">No data available</td></tr>`;

  // Generate summary section
  let summaryHtml = '';
  if (summary && Object.keys(summary).length > 0) {
    const summaryItems = Object.entries(summary)
      .map(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        const formattedValue =
          typeof value === 'number' ? value.toLocaleString(locale) : escapeHtml(String(value));
        return `
          <div class="summary-item">
            <div class="summary-label">${escapeHtml(label)}</div>
            <div class="summary-value">${formattedValue}</div>
          </div>`;
      })
      .join('');

    summaryHtml = `
      <div class="summary">
        <div class="summary-title">Summary</div>
        <div class="summary-grid">
          ${summaryItems}
        </div>
      </div>`;
  }

  // Generate footer section
  const footerHtml = `
      <div class="footer">
        ${footer ? `<div class="footer-text">${escapeHtml(footer)}</div>` : ''}
        <div class="footer-brand">Generated by Aymur Platform</div>
      </div>`;

  // Assemble complete HTML document
  return `<!DOCTYPE html>
<html lang="${locale.split('-')[0]}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${generateStyles()}</style>
</head>
<body>
  <div class="document">
    <div class="header">
      ${shopName ? `<div class="shop-name">${escapeHtml(shopName)}</div>` : ''}
      <h1 class="title">${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
      <div class="generated-date">Generated: ${generatedDate}</div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            ${tableHeaders}
          </tr>
        </thead>
        <tbody>
${tableRows}
        </tbody>
      </table>
    </div>
    ${summaryHtml}
    ${footerHtml}
  </div>
</body>
</html>`;
}

/**
 * Generates complete PDF content structure.
 * @param params - Export request parameters
 * @returns PDF content including HTML, styles, and metadata
 */
function generatePDFContent(params: ExportRequest): PDFContent {
  const { title, subtitle, shopName } = params;

  return {
    html: generateHtml(params),
    styles: generateStyles(),
    metadata: {
      title,
      author: shopName || 'Aymur Platform',
      subject: subtitle || 'Business Report',
      creator: 'Aymur Reports',
      createdAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * POST /api/export/pdf
 *
 * Generates PDF content from the provided report data.
 *
 * Request body (JSON):
 * - title: string (required) - Report title
 * - subtitle: string (optional) - Report subtitle
 * - columns: ColumnConfig[] (required) - Column definitions
 * - data: Record<string, unknown>[] (required) - Table data
 * - summary: Record<string, string | number> (optional) - Summary values
 * - footer: string (optional) - Footer text
 * - shopName: string (optional) - Shop name for branding
 * - locale: string (optional) - Locale for formatting (default: 'en-US')
 *
 * Response (200):
 * - success: true
 * - filename: string - Suggested filename
 * - content: PDFContent - Generated HTML, styles, and metadata
 * - generated_at: string - ISO timestamp
 *
 * Error responses:
 * - 400: Invalid request body or validation errors
 * - 401: Unauthorized (not authenticated)
 * - 500: Internal server error
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ExportResponse | ErrorResponse>> {
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const validation = validateRequest(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json({ error: validation.error || 'Invalid request' }, { status: 400 });
    }

    const exportRequest = validation.data;

    // 3. Generate PDF content
    const pdfContent = generatePDFContent(exportRequest);
    const filename = generateFilename(exportRequest.title);

    // 4. Return success response
    const response: ExportResponse = {
      success: true,
      filename,
      content: pdfContent,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    // Log error for debugging (never log sensitive data)
    console.error('[PDF Export Error]', {
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/export/pdf
 *
 * Returns API information and usage documentation.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    name: 'PDF Export API',
    version: '1.0.0',
    description: 'Generates PDF report content from structured data',
    method: 'POST',
    authentication: 'Required (Supabase JWT)',
    request_body: {
      title: 'string (required)',
      subtitle: 'string (optional)',
      columns: [
        {
          key: 'string (required)',
          title: 'string (required)',
          width: 'number (optional)',
          align: "'left' | 'center' | 'right' (optional)",
        },
      ],
      data: 'Record<string, unknown>[] (required)',
      summary: 'Record<string, string | number> (optional)',
      footer: 'string (optional)',
      shopName: 'string (optional)',
      locale: "string (optional, default: 'en-US')",
    },
    limits: {
      max_rows: 10000,
      max_columns: 50,
      max_title_length: 200,
    },
  });
}
