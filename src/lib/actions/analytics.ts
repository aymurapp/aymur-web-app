'use server';

/**
 * Analytics Server Actions
 *
 * Server-side actions for fetching analytics and metrics data in the Aymur Platform.
 * These actions provide read-only access to pre-aggregated analytics tables for
 * dashboard displays, reports, and business intelligence features.
 *
 * Key features:
 * - Sales metrics (revenue, volume, averages)
 * - Financial metrics (profit, expenses, margins)
 * - Inventory metrics (turnover, aging, valuation)
 * - Product performance (top sellers, category/metal breakdowns)
 * - Customer metrics (acquisition, retention, value)
 * - Time-series data for charts (by period aggregation)
 *
 * RLS Note: All queries are automatically filtered by get_user_shop_ids()
 * embedded in JWT claims. No manual shop filtering needed beyond the
 * explicit shopId parameter which provides additional client-side validation.
 *
 * @module lib/actions/analytics
 */

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Generic action result type for consistent error handling.
 * All server actions should return this type.
 */
export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };

// =============================================================================
// TYPED DATABASE HELPERS
// =============================================================================

/**
 * Helper type for Supabase query results.
 * Used for tables not yet in generated types (analytics tables).
 */
type DbResultList<T> = { data: T[] | null; error: { message: string; code?: string } | null };
type DbResult<T> = { data: T | null; error: { message: string; code?: string } | null };

/**
 * Analytics tables are not yet in generated types.
 * We use these helper types to work around TypeScript errors while maintaining
 * runtime functionality. The database tables exist and work correctly.
 *
 * TODO: Regenerate database types to include analytics tables and remove these helpers.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// =============================================================================
// DATABASE ROW TYPES (for type safety with untyped tables)
// =============================================================================

interface DailyShopMetricsRow {
  metric_date: string;
  total_sales: number | null;
  total_sales_count: number | null;
  total_items_sold: number | null;
  total_weight_sold_grams: number | null;
}

interface DailyFinancialMetricsRow {
  total_revenue: number | null;
  cost_of_goods_sold: number | null;
  gross_profit: number | null;
  total_expenses: number | null;
  operating_profit: number | null;
  net_cash_flow: number | null;
  accounts_receivable: number | null;
  accounts_payable: number | null;
}

interface InventoryTurnoverMetricsRow {
  year_month: string;
  beginning_inventory_value: number | null;
  ending_inventory_value: number | null;
  avg_inventory_value: number | null;
  cost_of_goods_sold: number | null;
  turnover_ratio: number | null;
  days_inventory_outstanding: number | null;
}

interface SaleItemRow {
  id_item: string;
  item_name: string;
  metal_type: string | null;
  quantity: number;
  total_price: number;
  created_at: string;
}

interface DailySalesByCategoryRow {
  id_category: string | null;
  category_name: string | null;
  sales_count: number | null;
  items_sold: number | null;
  total_revenue: number | null;
  gross_profit: number | null;
  weight_sold_grams: number | null;
}

interface DailySalesByMetalRow {
  id_metal_type: string | null;
  metal_name: string | null;
  purity_name: string | null;
  items_sold: number | null;
  total_revenue: number | null;
  weight_sold_grams: number | null;
  avg_price_per_gram: number | null;
}

interface DailyCustomerMetricsRow {
  new_customers: number | null;
  returning_customers: number | null;
  total_active_customers: number | null;
  total_transactions: number | null;
  avg_transaction_value: number | null;
  customers_with_balance: number | null;
  total_outstanding_balance: number | null;
}

// =============================================================================
// EXPORTED TYPES
// =============================================================================

/**
 * Date range for analytics queries
 */
export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/**
 * Sales metrics summary
 */
export interface SalesMetrics {
  totalRevenue: number;
  totalSales: number;
  totalItemsSold: number;
  avgSaleValue: number;
  totalWeightSoldGrams: number;
  dailyData: DailySalesData[];
}

/**
 * Daily sales data point for charts
 */
export interface DailySalesData {
  date: string;
  revenue: number;
  salesCount: number;
  itemsSold: number;
  weightSoldGrams: number;
}

/**
 * Financial metrics summary
 */
export interface FinancialMetrics {
  totalRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalExpenses: number;
  operatingProfit: number;
  operatingMarginPercent: number;
  netCashFlow: number;
  accountsReceivable: number;
  accountsPayable: number;
}

/**
 * Inventory metrics
 */
export interface InventoryMetrics {
  turnoverRatio: number;
  daysInventoryOutstanding: number;
  avgInventoryValue: number;
  beginningInventoryValue: number;
  endingInventoryValue: number;
  costOfGoodsSold: number;
  yearMonth: string;
}

/**
 * Top product data
 */
export interface TopProduct {
  itemId: string;
  itemName: string;
  categoryName: string | null;
  metalType: string | null;
  quantitySold: number;
  totalRevenue: number;
  avgUnitPrice: number;
}

/**
 * Sales by category data
 */
export interface SalesByCategory {
  categoryId: string | null;
  categoryName: string;
  salesCount: number;
  itemsSold: number;
  totalRevenue: number;
  grossProfit: number;
  weightSoldGrams: number;
  revenuePercentage: number;
}

/**
 * Sales by metal type data
 */
export interface SalesByMetal {
  metalTypeId: string | null;
  metalName: string;
  purityName: string | null;
  itemsSold: number;
  totalRevenue: number;
  weightSoldGrams: number;
  avgPricePerGram: number;
  revenuePercentage: number;
}

/**
 * Customer metrics summary
 */
export interface CustomerMetrics {
  newCustomers: number;
  returningCustomers: number;
  totalActiveCustomers: number;
  totalTransactions: number;
  avgTransactionValue: number;
  customersWithBalance: number;
  totalOutstandingBalance: number;
}

/**
 * Revenue by period data point
 */
export interface RevenuePeriodData {
  period: string; // Date, week start, or month (YYYY-MM)
  revenue: number;
  salesCount: number;
  itemsSold: number;
}

/**
 * Period type for aggregation
 */
export type PeriodType = 'day' | 'week' | 'month';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Shop ID validation schema
 */
const ShopIdSchema = z.string().uuid('Invalid shop ID');

/**
 * Date validation schema (YYYY-MM-DD format)
 */
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

/**
 * Date range validation schema
 */
const DateRangeSchema = z
  .object({
    startDate: DateSchema,
    endDate: DateSchema,
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'Start date must be before or equal to end date',
  });

/**
 * Period type validation schema
 */
const PeriodTypeSchema = z.enum(['day', 'week', 'month']);

/**
 * Limit validation schema
 */
const LimitSchema = z.number().int().min(1).max(100).default(10);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the authenticated user.
 * Returns null if not authenticated.
 */
async function getAuthenticatedUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  return user;
}

/**
 * Calculate percentage safely (avoid division by zero)
 */
function calculatePercentage(value: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((value / total) * 10000) / 100; // Two decimal places
}

/**
 * Calculate margin percentage
 */
function calculateMargin(profit: number, revenue: number): number {
  if (revenue === 0) {
    return 0;
  }
  return Math.round((profit / revenue) * 10000) / 100;
}

// =============================================================================
// SALES METRICS
// =============================================================================

/**
 * Gets sales metrics for a shop within a date range.
 *
 * Queries the daily_shop_metrics table to aggregate:
 * - Total revenue
 * - Total number of sales
 * - Total items sold
 * - Average sale value
 * - Daily breakdown for charts
 *
 * @param shopId - The shop ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns ActionResult with SalesMetrics on success
 */
export async function getSalesMetrics(
  shopId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<SalesMetrics>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate inputs
    const shopIdResult = ShopIdSchema.safeParse(shopId);
    if (!shopIdResult.success) {
      return { success: false, error: 'Invalid shop ID', code: 'validation_error' };
    }

    const dateRangeResult = DateRangeSchema.safeParse({ startDate, endDate });
    if (!dateRangeResult.success) {
      return {
        success: false,
        error: dateRangeResult.error.errors[0]?.message || 'Invalid date range',
        code: 'validation_error',
      };
    }

    // 3. Query daily_shop_metrics
    const { data: metrics, error: metricsError } = (await db
      .from('daily_shop_metrics')
      .select(
        'metric_date, total_sales, total_sales_count, total_items_sold, total_weight_sold_grams'
      )
      .eq('id_shop', shopId)
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)
      .order('metric_date', { ascending: true })) as DbResultList<DailyShopMetricsRow>;

    if (metricsError) {
      console.error('[getSalesMetrics] Query error:', metricsError);
      return { success: false, error: 'Failed to fetch sales metrics', code: 'database_error' };
    }

    // 4. Aggregate totals
    const totalRevenue = metrics?.reduce((sum, m) => sum + Number(m.total_sales || 0), 0) || 0;
    const totalSales = metrics?.reduce((sum, m) => sum + Number(m.total_sales_count || 0), 0) || 0;
    const totalItemsSold =
      metrics?.reduce((sum, m) => sum + Number(m.total_items_sold || 0), 0) || 0;
    const totalWeightSoldGrams =
      metrics?.reduce((sum, m) => sum + Number(m.total_weight_sold_grams || 0), 0) || 0;
    const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // 5. Build daily data for charts
    const dailyData: DailySalesData[] = (metrics || []).map((m) => ({
      date: m.metric_date,
      revenue: Number(m.total_sales || 0),
      salesCount: Number(m.total_sales_count || 0),
      itemsSold: Number(m.total_items_sold || 0),
      weightSoldGrams: Number(m.total_weight_sold_grams || 0),
    }));

    return {
      success: true,
      data: {
        totalRevenue,
        totalSales,
        totalItemsSold,
        avgSaleValue: Math.round(avgSaleValue * 100) / 100,
        totalWeightSoldGrams,
        dailyData,
      },
    };
  } catch (err) {
    console.error('[getSalesMetrics] Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred', code: 'unexpected_error' };
  }
}

// =============================================================================
// FINANCIAL METRICS
// =============================================================================

/**
 * Gets financial metrics for a shop within a date range.
 *
 * Queries the daily_financial_metrics table to aggregate:
 * - Revenue breakdown (sales, workshop, recycled)
 * - Cost of goods sold
 * - Gross profit and margin
 * - Expenses breakdown
 * - Operating profit and margin
 * - Cash flow metrics
 *
 * @param shopId - The shop ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns ActionResult with FinancialMetrics on success
 */
export async function getFinancialMetrics(
  shopId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<FinancialMetrics>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate inputs
    const shopIdResult = ShopIdSchema.safeParse(shopId);
    if (!shopIdResult.success) {
      return { success: false, error: 'Invalid shop ID', code: 'validation_error' };
    }

    const dateRangeResult = DateRangeSchema.safeParse({ startDate, endDate });
    if (!dateRangeResult.success) {
      return {
        success: false,
        error: dateRangeResult.error.errors[0]?.message || 'Invalid date range',
        code: 'validation_error',
      };
    }

    // 3. Query daily_financial_metrics
    const { data: metrics, error: metricsError } = (await db
      .from('daily_financial_metrics')
      .select(
        `
        total_revenue,
        cost_of_goods_sold,
        gross_profit,
        total_expenses,
        operating_profit,
        net_cash_flow,
        accounts_receivable,
        accounts_payable
      `
      )
      .eq('id_shop', shopId)
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)) as DbResultList<DailyFinancialMetricsRow>;

    if (metricsError) {
      console.error('[getFinancialMetrics] Query error:', metricsError);
      return { success: false, error: 'Failed to fetch financial metrics', code: 'database_error' };
    }

    // 4. Aggregate totals
    const totalRevenue = metrics?.reduce((sum, m) => sum + Number(m.total_revenue || 0), 0) || 0;
    const costOfGoodsSold =
      metrics?.reduce((sum, m) => sum + Number(m.cost_of_goods_sold || 0), 0) || 0;
    const grossProfit = metrics?.reduce((sum, m) => sum + Number(m.gross_profit || 0), 0) || 0;
    const totalExpenses = metrics?.reduce((sum, m) => sum + Number(m.total_expenses || 0), 0) || 0;
    const operatingProfit =
      metrics?.reduce((sum, m) => sum + Number(m.operating_profit || 0), 0) || 0;
    const netCashFlow = metrics?.reduce((sum, m) => sum + Number(m.net_cash_flow || 0), 0) || 0;

    // Get the latest accounts receivable/payable (point-in-time snapshot)
    const latestMetric = metrics?.[metrics.length - 1];
    const accountsReceivable = Number(latestMetric?.accounts_receivable || 0);
    const accountsPayable = Number(latestMetric?.accounts_payable || 0);

    // 5. Calculate margins
    const grossMarginPercent = calculateMargin(grossProfit, totalRevenue);
    const operatingMarginPercent = calculateMargin(operatingProfit, totalRevenue);

    return {
      success: true,
      data: {
        totalRevenue,
        costOfGoodsSold,
        grossProfit,
        grossMarginPercent,
        totalExpenses,
        operatingProfit,
        operatingMarginPercent,
        netCashFlow,
        accountsReceivable,
        accountsPayable,
      },
    };
  } catch (err) {
    console.error('[getFinancialMetrics] Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred', code: 'unexpected_error' };
  }
}

// =============================================================================
// INVENTORY METRICS
// =============================================================================

/**
 * Gets inventory turnover metrics for a shop.
 *
 * Queries the inventory_turnover_metrics table to get:
 * - Turnover ratio (COGS / Average Inventory)
 * - Days inventory outstanding (365 / Turnover Ratio)
 * - Inventory valuation data
 *
 * Returns the most recent month's data by default.
 *
 * @param shopId - The shop ID
 * @param yearMonth - Optional specific month (YYYY-MM format), defaults to latest
 * @returns ActionResult with InventoryMetrics on success
 */
export async function getInventoryMetrics(
  shopId: string,
  yearMonth?: string
): Promise<ActionResult<InventoryMetrics>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate shop ID
    const shopIdResult = ShopIdSchema.safeParse(shopId);
    if (!shopIdResult.success) {
      return { success: false, error: 'Invalid shop ID', code: 'validation_error' };
    }

    // 3. Build query
    let query = db
      .from('inventory_turnover_metrics')
      .select(
        `
        year_month,
        beginning_inventory_value,
        ending_inventory_value,
        avg_inventory_value,
        cost_of_goods_sold,
        turnover_ratio,
        days_inventory_outstanding
      `
      )
      .eq('id_shop', shopId);

    // Filter by specific month if provided
    if (yearMonth) {
      const yearMonthPattern = /^\d{4}-\d{2}$/;
      if (!yearMonthPattern.test(yearMonth)) {
        return {
          success: false,
          error: 'Invalid year-month format (YYYY-MM)',
          code: 'validation_error',
        };
      }
      query = query.eq('year_month', yearMonth);
    } else {
      // Get the most recent month
      query = query.order('year_month', { ascending: false }).limit(1);
    }

    const { data: metrics, error: metricsError } =
      (await query.single()) as DbResult<InventoryTurnoverMetricsRow>;

    if (metricsError) {
      if (metricsError.code === 'PGRST116') {
        // No data found
        return {
          success: true,
          data: {
            turnoverRatio: 0,
            daysInventoryOutstanding: 0,
            avgInventoryValue: 0,
            beginningInventoryValue: 0,
            endingInventoryValue: 0,
            costOfGoodsSold: 0,
            yearMonth: yearMonth || 'N/A',
          },
        };
      }
      console.error('[getInventoryMetrics] Query error:', metricsError);
      return { success: false, error: 'Failed to fetch inventory metrics', code: 'database_error' };
    }

    return {
      success: true,
      data: {
        turnoverRatio: Number(metrics?.turnover_ratio || 0),
        daysInventoryOutstanding: Number(metrics?.days_inventory_outstanding || 0),
        avgInventoryValue: Number(metrics?.avg_inventory_value || 0),
        beginningInventoryValue: Number(metrics?.beginning_inventory_value || 0),
        endingInventoryValue: Number(metrics?.ending_inventory_value || 0),
        costOfGoodsSold: Number(metrics?.cost_of_goods_sold || 0),
        yearMonth: metrics?.year_month || yearMonth || 'N/A',
      },
    };
  } catch (err) {
    console.error('[getInventoryMetrics] Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred', code: 'unexpected_error' };
  }
}

// =============================================================================
// TOP PRODUCTS
// =============================================================================

/**
 * Gets top selling products for a shop.
 *
 * Queries sale_items to find:
 * - Most sold items by quantity
 * - Revenue generated per item
 * - Average unit price
 *
 * @param shopId - The shop ID
 * @param limit - Maximum number of products to return (default: 10, max: 100)
 * @param startDate - Optional start date filter (YYYY-MM-DD)
 * @param endDate - Optional end date filter (YYYY-MM-DD)
 * @returns ActionResult with TopProduct[] on success
 */
export async function getTopProducts(
  shopId: string,
  limit: number = 10,
  startDate?: string,
  endDate?: string
): Promise<ActionResult<TopProduct[]>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate inputs
    const shopIdResult = ShopIdSchema.safeParse(shopId);
    if (!shopIdResult.success) {
      return { success: false, error: 'Invalid shop ID', code: 'validation_error' };
    }

    const limitResult = LimitSchema.safeParse(limit);
    if (!limitResult.success) {
      return { success: false, error: 'Limit must be between 1 and 100', code: 'validation_error' };
    }

    // Validate dates if provided
    if (startDate || endDate) {
      if (startDate && !DateSchema.safeParse(startDate).success) {
        return { success: false, error: 'Invalid start date format', code: 'validation_error' };
      }
      if (endDate && !DateSchema.safeParse(endDate).success) {
        return { success: false, error: 'Invalid end date format', code: 'validation_error' };
      }
    }

    // 3. Query sale_items
    let query = db
      .from('sale_items')
      .select('id_item, item_name, metal_type, quantity, total_price, created_at')
      .eq('id_shop', shopId);

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    const { data: saleItems, error: queryError } = (await query) as DbResultList<SaleItemRow>;

    if (queryError) {
      console.error('[getTopProducts] Query error:', queryError);
      return { success: false, error: 'Failed to fetch top products', code: 'database_error' };
    }

    // 4. Aggregate by item
    const itemAggregates = new Map<
      string,
      {
        itemName: string;
        metalType: string | null;
        quantitySold: number;
        totalRevenue: number;
      }
    >();

    for (const item of saleItems || []) {
      const existing = itemAggregates.get(item.id_item);

      if (existing) {
        existing.quantitySold += Number(item.quantity || 1);
        existing.totalRevenue += Number(item.total_price || 0);
      } else {
        itemAggregates.set(item.id_item, {
          itemName: item.item_name,
          metalType: item.metal_type,
          quantitySold: Number(item.quantity || 1),
          totalRevenue: Number(item.total_price || 0),
        });
      }
    }

    // 5. Sort by quantity sold and limit
    const topProducts: TopProduct[] = Array.from(itemAggregates.entries())
      .map(([itemId, data]) => ({
        itemId,
        itemName: data.itemName,
        categoryName: null, // Category would require additional join
        metalType: data.metalType,
        quantitySold: data.quantitySold,
        totalRevenue: data.totalRevenue,
        avgUnitPrice:
          data.quantitySold > 0
            ? Math.round((data.totalRevenue / data.quantitySold) * 100) / 100
            : 0,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, limitResult.data);

    return {
      success: true,
      data: topProducts,
    };
  } catch (err) {
    console.error('[getTopProducts] Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred', code: 'unexpected_error' };
  }
}

// =============================================================================
// SALES BY CATEGORY
// =============================================================================

/**
 * Gets sales breakdown by product category.
 *
 * Queries the daily_sales_by_category table to aggregate:
 * - Revenue per category
 * - Items sold per category
 * - Profit per category
 * - Percentage of total revenue
 *
 * @param shopId - The shop ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns ActionResult with SalesByCategory[] on success
 */
export async function getSalesByCategory(
  shopId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<SalesByCategory[]>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate inputs
    const shopIdResult = ShopIdSchema.safeParse(shopId);
    if (!shopIdResult.success) {
      return { success: false, error: 'Invalid shop ID', code: 'validation_error' };
    }

    const dateRangeResult = DateRangeSchema.safeParse({ startDate, endDate });
    if (!dateRangeResult.success) {
      return {
        success: false,
        error: dateRangeResult.error.errors[0]?.message || 'Invalid date range',
        code: 'validation_error',
      };
    }

    // 3. Query daily_sales_by_category
    const { data: categoryMetrics, error: metricsError } = (await db
      .from('daily_sales_by_category')
      .select(
        `
        id_category,
        category_name,
        sales_count,
        items_sold,
        total_revenue,
        gross_profit,
        weight_sold_grams
      `
      )
      .eq('id_shop', shopId)
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)) as DbResultList<DailySalesByCategoryRow>;

    if (metricsError) {
      console.error('[getSalesByCategory] Query error:', metricsError);
      return { success: false, error: 'Failed to fetch sales by category', code: 'database_error' };
    }

    // 4. Aggregate by category
    const categoryAggregates = new Map<
      string,
      {
        categoryId: string | null;
        categoryName: string;
        salesCount: number;
        itemsSold: number;
        totalRevenue: number;
        grossProfit: number;
        weightSoldGrams: number;
      }
    >();

    for (const metric of categoryMetrics || []) {
      const key = metric.id_category || 'uncategorized';
      const existing = categoryAggregates.get(key);

      if (existing) {
        existing.salesCount += Number(metric.sales_count || 0);
        existing.itemsSold += Number(metric.items_sold || 0);
        existing.totalRevenue += Number(metric.total_revenue || 0);
        existing.grossProfit += Number(metric.gross_profit || 0);
        existing.weightSoldGrams += Number(metric.weight_sold_grams || 0);
      } else {
        categoryAggregates.set(key, {
          categoryId: metric.id_category,
          categoryName: metric.category_name || 'Uncategorized',
          salesCount: Number(metric.sales_count || 0),
          itemsSold: Number(metric.items_sold || 0),
          totalRevenue: Number(metric.total_revenue || 0),
          grossProfit: Number(metric.gross_profit || 0),
          weightSoldGrams: Number(metric.weight_sold_grams || 0),
        });
      }
    }

    // 5. Calculate total revenue for percentage calculation
    const totalRevenue = Array.from(categoryAggregates.values()).reduce(
      (sum, cat) => sum + cat.totalRevenue,
      0
    );

    // 6. Build result with percentages
    const salesByCategory: SalesByCategory[] = Array.from(categoryAggregates.values())
      .map((cat) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        salesCount: cat.salesCount,
        itemsSold: cat.itemsSold,
        totalRevenue: cat.totalRevenue,
        grossProfit: cat.grossProfit,
        weightSoldGrams: cat.weightSoldGrams,
        revenuePercentage: calculatePercentage(cat.totalRevenue, totalRevenue),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      success: true,
      data: salesByCategory,
    };
  } catch (err) {
    console.error('[getSalesByCategory] Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred', code: 'unexpected_error' };
  }
}

// =============================================================================
// SALES BY METAL
// =============================================================================

/**
 * Gets sales breakdown by metal type.
 *
 * Queries the daily_sales_by_metal table to aggregate:
 * - Revenue per metal type/purity
 * - Weight sold per metal
 * - Average price per gram
 * - Percentage of total revenue
 *
 * @param shopId - The shop ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns ActionResult with SalesByMetal[] on success
 */
export async function getSalesByMetal(
  shopId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<SalesByMetal[]>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate inputs
    const shopIdResult = ShopIdSchema.safeParse(shopId);
    if (!shopIdResult.success) {
      return { success: false, error: 'Invalid shop ID', code: 'validation_error' };
    }

    const dateRangeResult = DateRangeSchema.safeParse({ startDate, endDate });
    if (!dateRangeResult.success) {
      return {
        success: false,
        error: dateRangeResult.error.errors[0]?.message || 'Invalid date range',
        code: 'validation_error',
      };
    }

    // 3. Query daily_sales_by_metal
    const { data: metalMetrics, error: metricsError } = (await db
      .from('daily_sales_by_metal')
      .select(
        `
        id_metal_type,
        metal_name,
        purity_name,
        items_sold,
        total_revenue,
        weight_sold_grams,
        avg_price_per_gram
      `
      )
      .eq('id_shop', shopId)
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)) as DbResultList<DailySalesByMetalRow>;

    if (metricsError) {
      console.error('[getSalesByMetal] Query error:', metricsError);
      return { success: false, error: 'Failed to fetch sales by metal', code: 'database_error' };
    }

    // 4. Aggregate by metal type (combine purities for now)
    const metalAggregates = new Map<
      string,
      {
        metalTypeId: string | null;
        metalName: string;
        purityName: string | null;
        itemsSold: number;
        totalRevenue: number;
        weightSoldGrams: number;
      }
    >();

    for (const metric of metalMetrics || []) {
      // Key by metal_name + purity_name for detailed breakdown
      const key = `${metric.metal_name || 'Unknown'}-${metric.purity_name || 'N/A'}`;
      const existing = metalAggregates.get(key);

      if (existing) {
        existing.itemsSold += Number(metric.items_sold || 0);
        existing.totalRevenue += Number(metric.total_revenue || 0);
        existing.weightSoldGrams += Number(metric.weight_sold_grams || 0);
      } else {
        metalAggregates.set(key, {
          metalTypeId: metric.id_metal_type,
          metalName: metric.metal_name || 'Unknown',
          purityName: metric.purity_name,
          itemsSold: Number(metric.items_sold || 0),
          totalRevenue: Number(metric.total_revenue || 0),
          weightSoldGrams: Number(metric.weight_sold_grams || 0),
        });
      }
    }

    // 5. Calculate total revenue for percentage calculation
    const totalRevenue = Array.from(metalAggregates.values()).reduce(
      (sum, metal) => sum + metal.totalRevenue,
      0
    );

    // 6. Build result with percentages and avg price per gram
    const salesByMetal: SalesByMetal[] = Array.from(metalAggregates.values())
      .map((metal) => ({
        metalTypeId: metal.metalTypeId,
        metalName: metal.metalName,
        purityName: metal.purityName,
        itemsSold: metal.itemsSold,
        totalRevenue: metal.totalRevenue,
        weightSoldGrams: metal.weightSoldGrams,
        avgPricePerGram:
          metal.weightSoldGrams > 0
            ? Math.round((metal.totalRevenue / metal.weightSoldGrams) * 100) / 100
            : 0,
        revenuePercentage: calculatePercentage(metal.totalRevenue, totalRevenue),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      success: true,
      data: salesByMetal,
    };
  } catch (err) {
    console.error('[getSalesByMetal] Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred', code: 'unexpected_error' };
  }
}

// =============================================================================
// CUSTOMER METRICS
// =============================================================================

/**
 * Gets customer metrics for a shop within a date range.
 *
 * Queries the daily_customer_metrics table to aggregate:
 * - New customers acquired
 * - Returning customers
 * - Total active customers
 * - Transaction metrics
 * - Outstanding balances
 *
 * @param shopId - The shop ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns ActionResult with CustomerMetrics on success
 */
export async function getCustomerMetrics(
  shopId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<CustomerMetrics>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate inputs
    const shopIdResult = ShopIdSchema.safeParse(shopId);
    if (!shopIdResult.success) {
      return { success: false, error: 'Invalid shop ID', code: 'validation_error' };
    }

    const dateRangeResult = DateRangeSchema.safeParse({ startDate, endDate });
    if (!dateRangeResult.success) {
      return {
        success: false,
        error: dateRangeResult.error.errors[0]?.message || 'Invalid date range',
        code: 'validation_error',
      };
    }

    // 3. Query daily_customer_metrics
    const { data: metrics, error: metricsError } = (await db
      .from('daily_customer_metrics')
      .select(
        `
        new_customers,
        returning_customers,
        total_active_customers,
        total_transactions,
        avg_transaction_value,
        customers_with_balance,
        total_outstanding_balance
      `
      )
      .eq('id_shop', shopId)
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)) as DbResultList<DailyCustomerMetricsRow>;

    if (metricsError) {
      console.error('[getCustomerMetrics] Query error:', metricsError);
      return { success: false, error: 'Failed to fetch customer metrics', code: 'database_error' };
    }

    // 4. Aggregate (sum for counts, latest for point-in-time values)
    const newCustomers = metrics?.reduce((sum, m) => sum + Number(m.new_customers || 0), 0) || 0;
    const returningCustomers =
      metrics?.reduce((sum, m) => sum + Number(m.returning_customers || 0), 0) || 0;
    const totalTransactions =
      metrics?.reduce((sum, m) => sum + Number(m.total_transactions || 0), 0) || 0;

    // Get the latest snapshot values
    const latestMetric = metrics?.[metrics.length - 1];
    const totalActiveCustomers = Number(latestMetric?.total_active_customers || 0);
    const customersWithBalance = Number(latestMetric?.customers_with_balance || 0);
    const totalOutstandingBalance = Number(latestMetric?.total_outstanding_balance || 0);

    // Calculate average transaction value across the period
    const totalAvgValues =
      metrics?.reduce((sum, m) => sum + Number(m.avg_transaction_value || 0), 0) || 0;
    const avgTransactionValue =
      metrics && metrics.length > 0 ? Math.round((totalAvgValues / metrics.length) * 100) / 100 : 0;

    return {
      success: true,
      data: {
        newCustomers,
        returningCustomers,
        totalActiveCustomers,
        totalTransactions,
        avgTransactionValue,
        customersWithBalance,
        totalOutstandingBalance,
      },
    };
  } catch (err) {
    console.error('[getCustomerMetrics] Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred', code: 'unexpected_error' };
  }
}

// =============================================================================
// REVENUE BY PERIOD
// =============================================================================

/**
 * Gets revenue aggregated by time period for chart displays.
 *
 * Queries daily_shop_metrics and aggregates by:
 * - Day: Individual daily totals
 * - Week: Weekly totals (starting Monday)
 * - Month: Monthly totals
 *
 * @param shopId - The shop ID
 * @param period - Aggregation period ('day' | 'week' | 'month')
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns ActionResult with RevenuePeriodData[] on success
 */
export async function getRevenueByPeriod(
  shopId: string,
  period: PeriodType,
  startDate: string,
  endDate: string
): Promise<ActionResult<RevenuePeriodData[]>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate inputs
    const shopIdResult = ShopIdSchema.safeParse(shopId);
    if (!shopIdResult.success) {
      return { success: false, error: 'Invalid shop ID', code: 'validation_error' };
    }

    const periodResult = PeriodTypeSchema.safeParse(period);
    if (!periodResult.success) {
      return { success: false, error: 'Invalid period type', code: 'validation_error' };
    }

    const dateRangeResult = DateRangeSchema.safeParse({ startDate, endDate });
    if (!dateRangeResult.success) {
      return {
        success: false,
        error: dateRangeResult.error.errors[0]?.message || 'Invalid date range',
        code: 'validation_error',
      };
    }

    // 3. Query daily_shop_metrics
    const { data: metrics, error: metricsError } = (await db
      .from('daily_shop_metrics')
      .select('metric_date, total_sales, total_sales_count, total_items_sold')
      .eq('id_shop', shopId)
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)
      .order('metric_date', { ascending: true })) as DbResultList<DailyShopMetricsRow>;

    if (metricsError) {
      console.error('[getRevenueByPeriod] Query error:', metricsError);
      return { success: false, error: 'Failed to fetch revenue data', code: 'database_error' };
    }

    // 4. Aggregate by period
    const periodAggregates = new Map<
      string,
      {
        revenue: number;
        salesCount: number;
        itemsSold: number;
      }
    >();

    for (const metric of metrics || []) {
      const date = new Date(metric.metric_date);
      let periodKey: string;

      switch (period) {
        case 'day':
          periodKey = metric.metric_date;
          break;
        case 'week': {
          // Get the Monday of the week
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(date);
          monday.setDate(diff);
          periodKey = monday.toISOString().slice(0, 10);
          break;
        }
        case 'month':
          periodKey = metric.metric_date.slice(0, 7); // YYYY-MM
          break;
        default:
          periodKey = metric.metric_date;
      }

      const existing = periodAggregates.get(periodKey);
      if (existing) {
        existing.revenue += Number(metric.total_sales || 0);
        existing.salesCount += Number(metric.total_sales_count || 0);
        existing.itemsSold += Number(metric.total_items_sold || 0);
      } else {
        periodAggregates.set(periodKey, {
          revenue: Number(metric.total_sales || 0),
          salesCount: Number(metric.total_sales_count || 0),
          itemsSold: Number(metric.total_items_sold || 0),
        });
      }
    }

    // 5. Build sorted result
    const revenueByPeriod: RevenuePeriodData[] = Array.from(periodAggregates.entries())
      .map(([periodKey, data]) => ({
        period: periodKey,
        revenue: data.revenue,
        salesCount: data.salesCount,
        itemsSold: data.itemsSold,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return {
      success: true,
      data: revenueByPeriod,
    };
  } catch (err) {
    console.error('[getRevenueByPeriod] Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred', code: 'unexpected_error' };
  }
}
