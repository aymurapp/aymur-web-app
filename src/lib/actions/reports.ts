'use server';

/**
 * Reports Server Actions
 *
 * Server actions for reports management including:
 * - CRUD operations for saved reports
 * - Report generation in multiple formats
 * - Report templates management
 *
 * NOTE: This uses mock data since the reports table doesn't exist yet.
 * When the database schema is updated, replace mock data with actual queries.
 *
 * @module lib/actions/reports
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
// VALIDATION SCHEMAS
// =============================================================================

// Used for type inference below
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const reportFiltersSchema = z.object({
  type: z.enum(['sales', 'inventory', 'customers', 'suppliers', 'expenses', 'custom']).optional(),
  search: z.string().optional(),
  schedule: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
});

const createReportSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['sales', 'inventory', 'customers', 'suppliers', 'expenses', 'custom']),
  template_id: z.string().uuid().optional(),
  filters: z.record(z.unknown()),
  date_range_start: z.string().optional(),
  date_range_end: z.string().optional(),
  schedule: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
});

const updateReportSchema = createReportSchema.partial();

export type ReportFilters = z.infer<typeof reportFiltersSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;

// =============================================================================
// TYPES
// =============================================================================

export interface Report {
  id_report: string;
  id_shop: string;
  name: string;
  description?: string;
  type: 'sales' | 'inventory' | 'customers' | 'suppliers' | 'expenses' | 'custom';
  template_id?: string;
  filters: Record<string, unknown>;
  date_range_start?: string;
  date_range_end?: string;
  schedule: 'none' | 'daily' | 'weekly' | 'monthly';
  last_generated?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: Report['type'];
  default_filters: Record<string, unknown>;
  columns: string[];
}

interface GeneratedReportData {
  id: string;
  report_id: string;
  data: Record<string, unknown>[];
  summary: Record<string, number | string>;
  generated_at: string;
  format: 'json' | 'pdf' | 'excel';
  download_url?: string;
}

// =============================================================================
// MOCK DATA STORE (In-memory for demo purposes)
// =============================================================================

const mockReports: Report[] = [
  {
    id_report: '1',
    id_shop: 'demo-shop',
    name: 'Monthly Sales Report',
    description: 'Overview of monthly sales performance',
    type: 'sales',
    filters: {},
    schedule: 'monthly',
    last_generated: '2024-01-15T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id_report: '2',
    id_shop: 'demo-shop',
    name: 'Inventory Status',
    description: 'Current stock levels and valuation',
    type: 'inventory',
    filters: { include_zero_stock: false },
    schedule: 'weekly',
    last_generated: '2024-01-14T08:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-14T08:00:00Z',
  },
  {
    id_report: '3',
    id_shop: 'demo-shop',
    name: 'Top Customers',
    description: 'Highest value customers by purchase amount',
    type: 'customers',
    filters: { sort_by: 'total_purchases', limit: 50 },
    schedule: 'none',
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
];

// =============================================================================
// REPORT QUERIES
// =============================================================================

/**
 * Get all reports for the current shop
 */
export async function getReports(filters?: ReportFilters): Promise<ActionResult<Report[]>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Filter mock data
    let filteredReports = [...mockReports];

    if (filters?.type) {
      filteredReports = filteredReports.filter((r) => r.type === filters.type);
    }
    if (filters?.schedule) {
      filteredReports = filteredReports.filter((r) => r.schedule === filters.schedule);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filteredReports = filteredReports.filter(
        (r) =>
          r.name.toLowerCase().includes(search) || r.description?.toLowerCase().includes(search)
      );
    }

    // Sort by updated_at descending
    filteredReports.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return { success: true, data: filteredReports };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch reports',
    };
  }
}

/**
 * Get a single report by ID
 */
export async function getReport(id: string): Promise<ActionResult<Report>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const report = mockReports.find((r) => r.id_report === id);
    if (!report) {
      return { success: false, error: 'Report not found' };
    }

    return { success: true, data: report };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch report',
    };
  }
}

/**
 * Get available report templates
 */
export async function getReportTemplates(): Promise<ActionResult<ReportTemplate[]>> {
  const templates: ReportTemplate[] = [
    {
      id: 'sales-summary',
      name: 'Sales Summary',
      description: 'Overview of sales performance with totals and trends',
      type: 'sales',
      default_filters: { include_returns: true },
      columns: ['date', 'total_sales', 'total_items', 'average_order_value'],
    },
    {
      id: 'sales-by-product',
      name: 'Sales by Product',
      description: 'Detailed breakdown of sales by product',
      type: 'sales',
      default_filters: {},
      columns: ['product_name', 'sku', 'quantity_sold', 'revenue', 'profit'],
    },
    {
      id: 'inventory-status',
      name: 'Inventory Status',
      description: 'Current stock levels and valuation',
      type: 'inventory',
      default_filters: { include_zero_stock: false },
      columns: ['product_name', 'sku', 'quantity', 'cost_value', 'retail_value'],
    },
    {
      id: 'low-stock-alert',
      name: 'Low Stock Alert',
      description: 'Products below reorder point',
      type: 'inventory',
      default_filters: { below_reorder_point: true },
      columns: ['product_name', 'sku', 'current_stock', 'reorder_point', 'supplier'],
    },
    {
      id: 'customer-list',
      name: 'Customer List',
      description: 'Complete customer directory with purchase history',
      type: 'customers',
      default_filters: {},
      columns: ['name', 'email', 'phone', 'total_purchases', 'last_purchase'],
    },
    {
      id: 'top-customers',
      name: 'Top Customers',
      description: 'Highest value customers by purchase amount',
      type: 'customers',
      default_filters: { sort_by: 'total_purchases', limit: 50 },
      columns: ['name', 'total_purchases', 'order_count', 'average_order'],
    },
    {
      id: 'supplier-summary',
      name: 'Supplier Summary',
      description: 'Supplier performance and purchase history',
      type: 'suppliers',
      default_filters: {},
      columns: ['supplier_name', 'total_orders', 'total_spent', 'pending_orders'],
    },
    {
      id: 'expense-report',
      name: 'Expense Report',
      description: 'Detailed expense breakdown by category',
      type: 'expenses',
      default_filters: {},
      columns: ['date', 'category', 'description', 'amount', 'payment_method'],
    },
    {
      id: 'profit-loss',
      name: 'Profit & Loss',
      description: 'Income and expense summary with net profit',
      type: 'custom',
      default_filters: {},
      columns: ['category', 'income', 'expenses', 'net'],
    },
  ];

  return { success: true, data: templates };
}

// =============================================================================
// REPORT MUTATIONS
// =============================================================================

/**
 * Create a new report
 */
export async function createReport(input: CreateReportInput): Promise<ActionResult<Report>> {
  try {
    const validated = createReportSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const now = new Date().toISOString();
    const newReport: Report = {
      id_report: crypto.randomUUID(),
      id_shop: 'demo-shop',
      name: validated.name,
      description: validated.description,
      type: validated.type,
      template_id: validated.template_id,
      filters: validated.filters,
      date_range_start: validated.date_range_start,
      date_range_end: validated.date_range_end,
      schedule: validated.schedule,
      created_at: now,
      updated_at: now,
    };

    mockReports.push(newReport);

    return { success: true, data: newReport };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Validation error' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create report',
    };
  }
}

/**
 * Update an existing report
 */
export async function updateReport(
  id: string,
  input: UpdateReportInput
): Promise<ActionResult<Report>> {
  try {
    const validated = updateReportSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const index = mockReports.findIndex((r) => r.id_report === id);
    if (index === -1) {
      return { success: false, error: 'Report not found' };
    }

    const existingReport = mockReports[index];
    if (!existingReport) {
      return { success: false, error: 'Report not found' };
    }

    const updatedReport: Report = {
      ...existingReport,
      ...validated,
      updated_at: new Date().toISOString(),
    };

    mockReports[index] = updatedReport;

    return { success: true, data: updatedReport };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Validation error' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update report',
    };
  }
}

/**
 * Delete a report
 */
export async function deleteReport(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const index = mockReports.findIndex((r) => r.id_report === id);
    if (index === -1) {
      return { success: false, error: 'Report not found' };
    }

    mockReports.splice(index, 1);

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete report',
    };
  }
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

/**
 * Generate a report in the specified format
 */
export async function generateReport(
  reportId: string,
  format: 'json' | 'pdf' | 'excel'
): Promise<ActionResult<GeneratedReportData>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const report = mockReports.find((r) => r.id_report === reportId);
    if (!report) {
      return { success: false, error: 'Report not found' };
    }

    let reportData: Record<string, unknown>[] = [];
    let summary: Record<string, number | string> = {};

    switch (report.type) {
      case 'sales':
        reportData = generateSalesData();
        summary = calculateSalesSummary(reportData);
        break;
      case 'inventory':
        reportData = generateInventoryData();
        summary = calculateInventorySummary(reportData);
        break;
      case 'customers':
        reportData = generateCustomerData();
        summary = calculateCustomerSummary(reportData);
        break;
      case 'suppliers':
        reportData = generateSupplierData();
        summary = calculateSupplierSummary(reportData);
        break;
      case 'expenses':
        reportData = generateExpenseData();
        summary = calculateExpenseSummary(reportData);
        break;
      default:
        reportData = [];
        summary = { message: 'Custom reports require specific configuration' };
    }

    // Update last_generated
    const index = mockReports.findIndex((r) => r.id_report === reportId);
    if (index !== -1 && mockReports[index]) {
      mockReports[index] = {
        ...mockReports[index],
        last_generated: new Date().toISOString(),
      };
    }

    const generatedReport: GeneratedReportData = {
      id: crypto.randomUUID(),
      report_id: reportId,
      data: reportData,
      summary,
      generated_at: new Date().toISOString(),
      format,
    };

    return { success: true, data: generatedReport };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate report',
    };
  }
}

// =============================================================================
// DATA GENERATION HELPERS (Mock data for demo)
// =============================================================================

function generateSalesData() {
  return [
    { date: '2024-01-01', product: 'Gold Ring', quantity: 5, revenue: 2500, profit: 500 },
    { date: '2024-01-02', product: 'Silver Necklace', quantity: 8, revenue: 1600, profit: 320 },
    { date: '2024-01-03', product: 'Diamond Earrings', quantity: 3, revenue: 4500, profit: 900 },
  ];
}

function generateInventoryData() {
  return [
    { product: 'Gold Ring', sku: 'GR-001', quantity: 25, cost_value: 5000, retail_value: 7500 },
    {
      product: 'Silver Necklace',
      sku: 'SN-001',
      quantity: 50,
      cost_value: 2500,
      retail_value: 5000,
    },
  ];
}

function generateCustomerData() {
  return [
    { name: 'John Doe', email: 'john@example.com', total_purchases: 5000, order_count: 10 },
    { name: 'Jane Smith', email: 'jane@example.com', total_purchases: 3500, order_count: 7 },
  ];
}

function generateSupplierData() {
  return [
    { supplier: 'Gold Suppliers Inc', total_orders: 25, total_spent: 50000, pending_orders: 2 },
    { supplier: 'Silver Masters', total_orders: 18, total_spent: 25000, pending_orders: 1 },
  ];
}

function generateExpenseData() {
  return [
    { date: '2024-01-01', category: 'Rent', description: 'Monthly rent', amount: 2000 },
    { date: '2024-01-05', category: 'Utilities', description: 'Electricity', amount: 350 },
  ];
}

function calculateSalesSummary(data: Record<string, unknown>[]) {
  const totalRevenue = data.reduce((sum, row) => sum + (Number(row.revenue) || 0), 0);
  const totalProfit = data.reduce((sum, row) => sum + (Number(row.profit) || 0), 0);
  const totalQuantity = data.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  return { total_revenue: totalRevenue, total_profit: totalProfit, total_items: totalQuantity };
}

function calculateInventorySummary(data: Record<string, unknown>[]) {
  const totalCost = data.reduce((sum, row) => sum + (Number(row.cost_value) || 0), 0);
  const totalRetail = data.reduce((sum, row) => sum + (Number(row.retail_value) || 0), 0);
  const totalItems = data.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  return { total_cost_value: totalCost, total_retail_value: totalRetail, total_items: totalItems };
}

function calculateCustomerSummary(data: Record<string, unknown>[]) {
  const totalPurchases = data.reduce((sum, row) => sum + (Number(row.total_purchases) || 0), 0);
  const totalOrders = data.reduce((sum, row) => sum + (Number(row.order_count) || 0), 0);
  return {
    total_customers: data.length,
    total_purchases: totalPurchases,
    total_orders: totalOrders,
  };
}

function calculateSupplierSummary(data: Record<string, unknown>[]) {
  const totalSpent = data.reduce((sum, row) => sum + (Number(row.total_spent) || 0), 0);
  const totalOrders = data.reduce((sum, row) => sum + (Number(row.total_orders) || 0), 0);
  return { total_suppliers: data.length, total_spent: totalSpent, total_orders: totalOrders };
}

function calculateExpenseSummary(data: Record<string, unknown>[]) {
  const totalExpenses = data.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  return { total_expenses: totalExpenses, transaction_count: data.length };
}
