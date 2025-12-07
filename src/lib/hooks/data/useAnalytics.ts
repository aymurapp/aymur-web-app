/**
 * useAnalytics Hooks
 *
 * TanStack Query v5 hooks for fetching analytics and metrics data.
 * Provides typed, cached data for dashboards, reports, and insights.
 *
 * Analytics tables:
 * - daily_shop_metrics: Daily totals (revenue, sales_count, etc.)
 * - daily_financial_metrics: Financial data (profit, expenses, margins)
 * - daily_customer_metrics: Customer stats (new, returning customers)
 * - daily_sales_by_category: Sales breakdown by category
 * - daily_sales_by_metal: Sales breakdown by metal type
 * - monthly_shop_metrics: Monthly aggregates
 * - inventory_turnover_metrics: Inventory performance
 *
 * Note: Analytics tables exist in the database but are not yet in generated types.
 * We use explicit type assertions until database types are regenerated.
 *
 * @module lib/hooks/data/useAnalytics
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { createClient } from '@/lib/supabase/client';

// ============================================
// Types - Daily Shop Metrics
// ============================================

/**
 * Daily shop metrics row type
 */
export interface DailyShopMetrics {
  id_daily_metric: string;
  id_shop: string;
  metric_date: string;
  total_sales: number | null;
  total_sales_count: number | null;
  total_items_sold: number | null;
  total_weight_sold_grams: number | null;
  total_purchases: number | null;
  total_purchases_count: number | null;
  total_weight_purchased_grams: number | null;
  total_expenses: number | null;
  total_payments_received: number | null;
  total_payments_made: number | null;
  gross_profit: number | null;
  cash_inflow: number | null;
  cash_outflow: number | null;
  new_customers: number | null;
  active_customers: number | null;
  workshop_orders_created: number | null;
  workshop_orders_completed: number | null;
  recycled_items_count: number | null;
  recycled_items_value: number | null;
  prev_total_sales: number | null;
  prev_total_items_sold: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Types - Daily Financial Metrics
// ============================================

/**
 * Daily financial metrics row type
 */
export interface DailyFinancialMetrics {
  id_metric: string;
  id_shop: string;
  metric_date: string;
  revenue_sales: number | null;
  revenue_workshop: number | null;
  revenue_recycled_resale: number | null;
  total_revenue: number | null;
  cost_of_goods_sold: number | null;
  gross_profit: number | null;
  expense_operational: number | null;
  expense_marketing: number | null;
  expense_salaries: number | null;
  expense_other: number | null;
  total_expenses: number | null;
  operating_profit: number | null;
  cash_received: number | null;
  cash_paid_out: number | null;
  net_cash_flow: number | null;
  accounts_receivable: number | null;
  accounts_payable: number | null;
  prev_day_revenue: number | null;
  prev_day_gross_profit: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Types - Daily Customer Metrics
// ============================================

/**
 * Daily customer metrics row type
 */
export interface DailyCustomerMetrics {
  id_metric: string;
  id_shop: string;
  metric_date: string;
  new_customers: number | null;
  returning_customers: number | null;
  total_active_customers: number | null;
  total_transactions: number | null;
  avg_transaction_value: number | null;
  customers_with_balance: number | null;
  total_outstanding_balance: number | null;
  prev_day_new_customers: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Types - Daily Sales by Category
// ============================================

/**
 * Daily sales by category row type
 */
export interface DailySalesByCategory {
  id_record: string;
  id_shop: string;
  metric_date: string;
  id_category: string | null;
  category_name: string | null;
  sales_count: number | null;
  items_sold: number | null;
  total_revenue: number | null;
  total_cost: number | null;
  gross_profit: number | null;
  weight_sold_grams: number | null;
  avg_item_price: number | null;
  prev_day_revenue: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Types - Daily Sales by Metal
// ============================================

/**
 * Daily sales by metal row type
 */
export interface DailySalesByMetal {
  id_record: string;
  id_shop: string;
  metric_date: string;
  id_metal_type: string | null;
  id_metal_purity: string | null;
  metal_name: string | null;
  purity_name: string | null;
  items_sold: number | null;
  total_revenue: number | null;
  weight_sold_grams: number | null;
  avg_price_per_gram: number | null;
  prev_day_weight_sold: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Types - Monthly Shop Metrics
// ============================================

/**
 * Monthly shop metrics row type
 */
export interface MonthlyShopMetrics {
  id_monthly_metric: string;
  id_shop: string;
  year_month: string;
  month_start: string;
  month_end: string;
  total_sales: number | null;
  total_sales_count: number | null;
  total_items_sold: number | null;
  total_weight_sold_grams: number | null;
  avg_sale_value: number | null;
  total_purchases: number | null;
  total_expenses: number | null;
  total_salaries_paid: number | null;
  total_taxes_paid: number | null;
  gross_profit: number | null;
  net_profit: number | null;
  net_cash_flow: number | null;
  new_customers: number | null;
  total_active_customers: number | null;
  customer_retention_rate: number | null;
  inventory_turnover_rate: number | null;
  prev_month_total_sales: number | null;
  prev_month_gross_profit: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Types - Inventory Turnover Metrics
// ============================================

/**
 * Inventory turnover metrics row type
 */
export interface InventoryTurnoverMetrics {
  id_turnover: string;
  id_shop: string;
  year_month: string;
  beginning_inventory_value: number | null;
  ending_inventory_value: number | null;
  avg_inventory_value: number | null;
  cost_of_goods_sold: number | null;
  turnover_ratio: number | null;
  days_inventory_outstanding: number | null;
  prev_month_turnover_ratio: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Types - Top Products
// ============================================

/**
 * Top product result from sale_items aggregation
 */
export interface TopProduct {
  id_item: string;
  item_name: string;
  total_quantity: number;
  total_revenue: number;
  total_weight_grams: number;
  sale_count: number;
}

/**
 * Sale item for top products query
 */
interface SaleItemForAggregation {
  id_item: string;
  item_name: string;
  quantity: number;
  total_price: number;
  weight_grams: number | null;
  id_sale: string;
}

/**
 * Sale for filtering top products
 */
interface SaleForFiltering {
  id_sale: string;
  sale_status: string;
  sale_date: string;
}

// ============================================
// Types - Date Range
// ============================================

/**
 * Date range filter for analytics queries
 */
export interface AnalyticsDateRange {
  /** Start date in YYYY-MM-DD format */
  startDate: string;
  /** End date in YYYY-MM-DD format */
  endDate: string;
}

// ============================================
// Types - Aggregated Results
// ============================================

/**
 * Sales analytics summary with trends
 */
export interface SalesAnalyticsSummary {
  /** Array of daily metrics within date range */
  dailyMetrics: DailyShopMetrics[];
  /** Totals for the entire period */
  totals: {
    totalRevenue: number;
    totalSalesCount: number;
    totalItemsSold: number;
    totalWeightSold: number;
    avgSaleValue: number;
    grossProfit: number;
  };
  /** Comparison with previous period */
  trends: {
    revenueChange: number;
    revenueChangePercent: number;
    salesCountChange: number;
    salesCountChangePercent: number;
  };
}

/**
 * Financial analytics summary
 */
export interface FinancialAnalyticsSummary {
  /** Array of daily financial metrics */
  dailyMetrics: DailyFinancialMetrics[];
  /** Totals for the period */
  totals: {
    totalRevenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    grossMarginPercent: number;
    totalExpenses: number;
    operatingProfit: number;
    operatingMarginPercent: number;
    netCashFlow: number;
  };
}

/**
 * Category breakdown for charts
 */
export interface CategoryBreakdown {
  categoryId: string | null;
  categoryName: string;
  totalRevenue: number;
  itemsSold: number;
  grossProfit: number;
  percentOfTotal: number;
}

/**
 * Metal breakdown for charts
 */
export interface MetalBreakdown {
  metalTypeId: string | null;
  metalPurityId: string | null;
  metalName: string;
  purityName: string;
  totalRevenue: number;
  itemsSold: number;
  weightSoldGrams: number;
  percentOfTotal: number;
}

/**
 * Customer analytics summary
 */
export interface CustomerAnalyticsSummary {
  /** Array of daily customer metrics */
  dailyMetrics: DailyCustomerMetrics[];
  /** Totals for the period */
  totals: {
    totalNewCustomers: number;
    totalReturningCustomers: number;
    totalTransactions: number;
    avgTransactionValue: number;
    customersWithBalance: number;
    totalOutstandingBalance: number;
  };
}

// ============================================
// Query Key Factory
// ============================================

/**
 * Query key factory for analytics
 */
export const analyticsKeys = {
  all: (shopId: string) => ['analytics', shopId] as const,
  sales: (shopId: string) => [...analyticsKeys.all(shopId), 'sales'] as const,
  salesRange: (shopId: string, startDate: string, endDate: string) =>
    [...analyticsKeys.sales(shopId), startDate, endDate] as const,
  financial: (shopId: string) => [...analyticsKeys.all(shopId), 'financial'] as const,
  financialRange: (shopId: string, startDate: string, endDate: string) =>
    [...analyticsKeys.financial(shopId), startDate, endDate] as const,
  inventory: (shopId: string) => [...analyticsKeys.all(shopId), 'inventory'] as const,
  inventoryMonth: (shopId: string, yearMonth: string) =>
    [...analyticsKeys.inventory(shopId), yearMonth] as const,
  byCategory: (shopId: string) => [...analyticsKeys.all(shopId), 'by-category'] as const,
  byCategoryRange: (shopId: string, startDate: string, endDate: string) =>
    [...analyticsKeys.byCategory(shopId), startDate, endDate] as const,
  byMetal: (shopId: string) => [...analyticsKeys.all(shopId), 'by-metal'] as const,
  byMetalRange: (shopId: string, startDate: string, endDate: string) =>
    [...analyticsKeys.byMetal(shopId), startDate, endDate] as const,
  customers: (shopId: string) => [...analyticsKeys.all(shopId), 'customers'] as const,
  customersRange: (shopId: string, startDate: string, endDate: string) =>
    [...analyticsKeys.customers(shopId), startDate, endDate] as const,
  topProducts: (shopId: string, limit: number) =>
    [...analyticsKeys.all(shopId), 'top-products', limit] as const,
  monthly: (shopId: string) => [...analyticsKeys.all(shopId), 'monthly'] as const,
  monthlyRange: (shopId: string, startMonth: string, endMonth: string) =>
    [...analyticsKeys.monthly(shopId), startMonth, endMonth] as const,
};

// ============================================
// Options Types
// ============================================

/**
 * Options for useSalesAnalytics hook
 */
export interface UseSalesAnalyticsOptions {
  /** Date range for the query */
  dateRange: AnalyticsDateRange;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

/**
 * Options for useFinancialAnalytics hook
 */
export interface UseFinancialAnalyticsOptions {
  /** Date range for the query */
  dateRange: AnalyticsDateRange;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

/**
 * Options for useInventoryAnalytics hook
 */
export interface UseInventoryAnalyticsOptions {
  /** Year-month filter (e.g., '2024-01') - defaults to current month */
  yearMonth?: string;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

/**
 * Options for useSalesByCategory hook
 */
export interface UseSalesByCategoryOptions {
  /** Date range for the query */
  dateRange: AnalyticsDateRange;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

/**
 * Options for useSalesByMetal hook
 */
export interface UseSalesByMetalOptions {
  /** Date range for the query */
  dateRange: AnalyticsDateRange;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

/**
 * Options for useCustomerAnalytics hook
 */
export interface UseCustomerAnalyticsOptions {
  /** Date range for the query */
  dateRange: AnalyticsDateRange;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

/**
 * Options for useTopProducts hook
 */
export interface UseTopProductsOptions {
  /** Maximum number of products to return (default: 10) */
  limit?: number;
  /** Date range filter (optional) */
  dateRange?: AnalyticsDateRange;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

/**
 * Options for useMonthlyMetrics hook
 */
export interface UseMonthlyMetricsOptions {
  /** Start month (e.g., '2024-01') */
  startMonth?: string;
  /** End month (e.g., '2024-12') */
  endMonth?: string;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

// ============================================
// Return Types
// ============================================

/**
 * Return type for useSalesAnalytics hook
 */
export interface UseSalesAnalyticsReturn {
  /** Sales analytics data with trends */
  data: SalesAnalyticsSummary | null;
  /** Raw daily metrics */
  dailyMetrics: DailyShopMetrics[];
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Return type for useFinancialAnalytics hook
 */
export interface UseFinancialAnalyticsReturn {
  /** Financial analytics data */
  data: FinancialAnalyticsSummary | null;
  /** Raw daily metrics */
  dailyMetrics: DailyFinancialMetrics[];
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Return type for useInventoryAnalytics hook
 */
export interface UseInventoryAnalyticsReturn {
  /** Inventory turnover metrics */
  data: InventoryTurnoverMetrics | null;
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Return type for useSalesByCategory hook
 */
export interface UseSalesByCategoryReturn {
  /** Category breakdown data */
  data: CategoryBreakdown[];
  /** Raw daily records */
  rawData: DailySalesByCategory[];
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Return type for useSalesByMetal hook
 */
export interface UseSalesByMetalReturn {
  /** Metal breakdown data */
  data: MetalBreakdown[];
  /** Raw daily records */
  rawData: DailySalesByMetal[];
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Return type for useCustomerAnalytics hook
 */
export interface UseCustomerAnalyticsReturn {
  /** Customer analytics data */
  data: CustomerAnalyticsSummary | null;
  /** Raw daily metrics */
  dailyMetrics: DailyCustomerMetrics[];
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Return type for useTopProducts hook
 */
export interface UseTopProductsReturn {
  /** Top selling products */
  data: TopProduct[];
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Return type for useMonthlyMetrics hook
 */
export interface UseMonthlyMetricsReturn {
  /** Monthly metrics data */
  data: MonthlyShopMetrics[];
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculates totals and trends from daily shop metrics
 */
function calculateSalesAnalytics(metrics: DailyShopMetrics[]): SalesAnalyticsSummary {
  const totals = {
    totalRevenue: 0,
    totalSalesCount: 0,
    totalItemsSold: 0,
    totalWeightSold: 0,
    avgSaleValue: 0,
    grossProfit: 0,
  };

  let prevTotalRevenue = 0;
  let prevSalesCount = 0;

  for (const metric of metrics) {
    totals.totalRevenue += metric.total_sales ?? 0;
    totals.totalSalesCount += metric.total_sales_count ?? 0;
    totals.totalItemsSold += metric.total_items_sold ?? 0;
    totals.totalWeightSold += metric.total_weight_sold_grams ?? 0;
    totals.grossProfit += metric.gross_profit ?? 0;
    prevTotalRevenue += metric.prev_total_sales ?? 0;
    prevSalesCount += metric.prev_total_items_sold ?? 0;
  }

  totals.avgSaleValue =
    totals.totalSalesCount > 0 ? totals.totalRevenue / totals.totalSalesCount : 0;

  const revenueChange = totals.totalRevenue - prevTotalRevenue;
  const salesCountChange = totals.totalSalesCount - prevSalesCount;

  return {
    dailyMetrics: metrics,
    totals,
    trends: {
      revenueChange,
      revenueChangePercent: prevTotalRevenue > 0 ? (revenueChange / prevTotalRevenue) * 100 : 0,
      salesCountChange,
      salesCountChangePercent: prevSalesCount > 0 ? (salesCountChange / prevSalesCount) * 100 : 0,
    },
  };
}

/**
 * Calculates financial summary from daily financial metrics
 */
function calculateFinancialAnalytics(metrics: DailyFinancialMetrics[]): FinancialAnalyticsSummary {
  const totals = {
    totalRevenue: 0,
    costOfGoodsSold: 0,
    grossProfit: 0,
    grossMarginPercent: 0,
    totalExpenses: 0,
    operatingProfit: 0,
    operatingMarginPercent: 0,
    netCashFlow: 0,
  };

  for (const metric of metrics) {
    totals.totalRevenue += metric.total_revenue ?? 0;
    totals.costOfGoodsSold += metric.cost_of_goods_sold ?? 0;
    totals.grossProfit += metric.gross_profit ?? 0;
    totals.totalExpenses += metric.total_expenses ?? 0;
    totals.operatingProfit += metric.operating_profit ?? 0;
    totals.netCashFlow += metric.net_cash_flow ?? 0;
  }

  totals.grossMarginPercent =
    totals.totalRevenue > 0 ? (totals.grossProfit / totals.totalRevenue) * 100 : 0;
  totals.operatingMarginPercent =
    totals.totalRevenue > 0 ? (totals.operatingProfit / totals.totalRevenue) * 100 : 0;

  return {
    dailyMetrics: metrics,
    totals,
  };
}

/**
 * Aggregates daily sales by category into breakdown
 */
function aggregateCategoryBreakdown(records: DailySalesByCategory[]): CategoryBreakdown[] {
  const categoryMap = new Map<string, CategoryBreakdown>();

  let totalRevenue = 0;

  for (const record of records) {
    const key = record.id_category ?? 'uncategorized';
    const existing = categoryMap.get(key);
    const revenue = record.total_revenue ?? 0;

    totalRevenue += revenue;

    if (existing) {
      existing.totalRevenue += revenue;
      existing.itemsSold += record.items_sold ?? 0;
      existing.grossProfit += record.gross_profit ?? 0;
    } else {
      categoryMap.set(key, {
        categoryId: record.id_category,
        categoryName: record.category_name ?? 'Uncategorized',
        totalRevenue: revenue,
        itemsSold: record.items_sold ?? 0,
        grossProfit: record.gross_profit ?? 0,
        percentOfTotal: 0,
      });
    }
  }

  // Calculate percentages
  const breakdown = Array.from(categoryMap.values());
  for (const item of breakdown) {
    item.percentOfTotal = totalRevenue > 0 ? (item.totalRevenue / totalRevenue) * 100 : 0;
  }

  // Sort by revenue descending
  return breakdown.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Aggregates daily sales by metal into breakdown
 */
function aggregateMetalBreakdown(records: DailySalesByMetal[]): MetalBreakdown[] {
  const metalMap = new Map<string, MetalBreakdown>();

  let totalRevenue = 0;

  for (const record of records) {
    const key = `${record.id_metal_type ?? 'unknown'}-${record.id_metal_purity ?? 'unknown'}`;
    const existing = metalMap.get(key);
    const revenue = record.total_revenue ?? 0;

    totalRevenue += revenue;

    if (existing) {
      existing.totalRevenue += revenue;
      existing.itemsSold += record.items_sold ?? 0;
      existing.weightSoldGrams += record.weight_sold_grams ?? 0;
    } else {
      metalMap.set(key, {
        metalTypeId: record.id_metal_type,
        metalPurityId: record.id_metal_purity,
        metalName: record.metal_name ?? 'Unknown',
        purityName: record.purity_name ?? '',
        totalRevenue: revenue,
        itemsSold: record.items_sold ?? 0,
        weightSoldGrams: record.weight_sold_grams ?? 0,
        percentOfTotal: 0,
      });
    }
  }

  // Calculate percentages
  const breakdown = Array.from(metalMap.values());
  for (const item of breakdown) {
    item.percentOfTotal = totalRevenue > 0 ? (item.totalRevenue / totalRevenue) * 100 : 0;
  }

  // Sort by revenue descending
  return breakdown.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Calculates customer analytics summary from daily metrics
 */
function calculateCustomerAnalytics(metrics: DailyCustomerMetrics[]): CustomerAnalyticsSummary {
  const totals = {
    totalNewCustomers: 0,
    totalReturningCustomers: 0,
    totalTransactions: 0,
    avgTransactionValue: 0,
    customersWithBalance: 0,
    totalOutstandingBalance: 0,
  };

  let totalTransactionValue = 0;

  for (const metric of metrics) {
    totals.totalNewCustomers += metric.new_customers ?? 0;
    totals.totalReturningCustomers += metric.returning_customers ?? 0;
    totals.totalTransactions += metric.total_transactions ?? 0;
    totalTransactionValue += (metric.avg_transaction_value ?? 0) * (metric.total_transactions ?? 0);
  }

  // Get the latest day's balance info (most accurate snapshot)
  if (metrics.length > 0) {
    const latestMetric = metrics[metrics.length - 1]!;
    totals.customersWithBalance = latestMetric.customers_with_balance ?? 0;
    totals.totalOutstandingBalance = latestMetric.total_outstanding_balance ?? 0;
  }

  totals.avgTransactionValue =
    totals.totalTransactions > 0 ? totalTransactionValue / totals.totalTransactions : 0;

  return {
    dailyMetrics: metrics,
    totals,
  };
}

// ============================================
// Analytics Query Helper
// ============================================

/**
 * Helper to query analytics tables that aren't in generated types yet.
 * Uses raw SQL via the `rpc` function or direct table access with type casting.
 */
async function queryAnalyticsTable<T>(
  tableName: string,
  shopId: string,
  options: {
    dateColumn?: string;
    startDate?: string;
    endDate?: string;
    yearMonth?: string;
    orderBy?: string;
    ascending?: boolean;
  } = {}
): Promise<T[]> {
  const supabase = createClient();
  const { dateColumn, startDate, endDate, yearMonth, orderBy, ascending = true } = options;

  // Build the query dynamically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any).from(tableName).select('*').eq('id_shop', shopId);

  // Apply date filters
  if (dateColumn && startDate) {
    query = query.gte(dateColumn, startDate);
  }
  if (dateColumn && endDate) {
    query = query.lte(dateColumn, endDate);
  }
  if (yearMonth) {
    query = query.eq('year_month', yearMonth);
  }

  // Apply ordering
  if (orderBy) {
    query = query.order(orderBy, { ascending });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
  }

  return (data ?? []) as T[];
}

/**
 * Helper to query a single row from analytics tables
 */
async function queryAnalyticsTableSingle<T>(
  tableName: string,
  shopId: string,
  options: {
    yearMonth?: string;
  } = {}
): Promise<T | null> {
  const supabase = createClient();
  const { yearMonth } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any).from(tableName).select('*').eq('id_shop', shopId);

  if (yearMonth) {
    query = query.eq('year_month', yearMonth);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
  }

  return data as T | null;
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to fetch sales analytics for a date range.
 *
 * Fetches daily_shop_metrics and calculates totals, averages, and trends.
 *
 * @param options - Query options including date range
 * @returns Sales analytics data with loading/error states
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useSalesAnalytics({
 *   dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' }
 * });
 *
 * if (data) {
 *   console.log('Total Revenue:', data.totals.totalRevenue);
 *   console.log('Revenue Change:', data.trends.revenueChangePercent, '%');
 * }
 * ```
 */
export function useSalesAnalytics(options: UseSalesAnalyticsOptions): UseSalesAnalyticsReturn {
  const { shopId, hasAccess } = useShop();
  const { dateRange, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: analyticsKeys.salesRange(shopId ?? '', dateRange.startDate, dateRange.endDate),
    queryFn: async () => {
      if (!shopId) {
        return null;
      }

      const data = await queryAnalyticsTable<DailyShopMetrics>('daily_shop_metrics', shopId, {
        dateColumn: 'metric_date',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        orderBy: 'metric_date',
        ascending: true,
      });

      return calculateSalesAnalytics(data);
    },
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    data: queryResult.data ?? null,
    dailyMetrics: queryResult.data?.dailyMetrics ?? [],
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error as Error | null,
    refetch: queryResult.refetch,
  };
}

/**
 * Hook to fetch financial analytics for a date range.
 *
 * Fetches daily_financial_metrics and calculates profit margins, cash flow, etc.
 *
 * @param options - Query options including date range
 * @returns Financial analytics data with loading/error states
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useFinancialAnalytics({
 *   dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' }
 * });
 *
 * if (data) {
 *   console.log('Gross Margin:', data.totals.grossMarginPercent, '%');
 *   console.log('Operating Profit:', data.totals.operatingProfit);
 * }
 * ```
 */
export function useFinancialAnalytics(
  options: UseFinancialAnalyticsOptions
): UseFinancialAnalyticsReturn {
  const { shopId, hasAccess } = useShop();
  const { dateRange, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: analyticsKeys.financialRange(shopId ?? '', dateRange.startDate, dateRange.endDate),
    queryFn: async () => {
      if (!shopId) {
        return null;
      }

      const data = await queryAnalyticsTable<DailyFinancialMetrics>(
        'daily_financial_metrics',
        shopId,
        {
          dateColumn: 'metric_date',
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          orderBy: 'metric_date',
          ascending: true,
        }
      );

      return calculateFinancialAnalytics(data);
    },
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    data: queryResult.data ?? null,
    dailyMetrics: queryResult.data?.dailyMetrics ?? [],
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error as Error | null,
    refetch: queryResult.refetch,
  };
}

/**
 * Hook to fetch inventory turnover analytics.
 *
 * Fetches inventory_turnover_metrics for the specified month.
 *
 * @param options - Query options including year-month
 * @returns Inventory turnover data with loading/error states
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useInventoryAnalytics({
 *   yearMonth: '2024-01'
 * });
 *
 * if (data) {
 *   console.log('Turnover Ratio:', data.turnover_ratio);
 *   console.log('Days Inventory Outstanding:', data.days_inventory_outstanding);
 * }
 * ```
 */
export function useInventoryAnalytics(
  options: UseInventoryAnalyticsOptions = {}
): UseInventoryAnalyticsReturn {
  const { shopId, hasAccess } = useShop();
  const {
    yearMonth = new Date().toISOString().slice(0, 7), // Default to current month
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: analyticsKeys.inventoryMonth(shopId ?? '', yearMonth),
    queryFn: async () => {
      if (!shopId) {
        return null;
      }

      return queryAnalyticsTableSingle<InventoryTurnoverMetrics>(
        'inventory_turnover_metrics',
        shopId,
        { yearMonth }
      );
    },
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  return {
    data: queryResult.data ?? null,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error as Error | null,
    refetch: queryResult.refetch,
  };
}

/**
 * Hook to fetch sales breakdown by category.
 *
 * Fetches daily_sales_by_category and aggregates into category breakdown.
 *
 * @param options - Query options including date range
 * @returns Category breakdown data with loading/error states
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useSalesByCategory({
 *   dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' }
 * });
 *
 * // Use for pie chart
 * data.forEach(category => {
 *   console.log(category.categoryName, category.percentOfTotal, '%');
 * });
 * ```
 */
export function useSalesByCategory(options: UseSalesByCategoryOptions): UseSalesByCategoryReturn {
  const { shopId, hasAccess } = useShop();
  const { dateRange, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: analyticsKeys.byCategoryRange(shopId ?? '', dateRange.startDate, dateRange.endDate),
    queryFn: async () => {
      if (!shopId) {
        return { breakdown: [], raw: [] };
      }

      const raw = await queryAnalyticsTable<DailySalesByCategory>(
        'daily_sales_by_category',
        shopId,
        {
          dateColumn: 'metric_date',
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          orderBy: 'metric_date',
          ascending: true,
        }
      );

      const breakdown = aggregateCategoryBreakdown(raw);

      return { breakdown, raw };
    },
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    data: queryResult.data?.breakdown ?? [],
    rawData: queryResult.data?.raw ?? [],
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error as Error | null,
    refetch: queryResult.refetch,
  };
}

/**
 * Hook to fetch sales breakdown by metal type.
 *
 * Fetches daily_sales_by_metal and aggregates into metal breakdown.
 *
 * @param options - Query options including date range
 * @returns Metal breakdown data with loading/error states
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useSalesByMetal({
 *   dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' }
 * });
 *
 * // Use for bar chart
 * data.forEach(metal => {
 *   console.log(`${metal.metalName} ${metal.purityName}:`, metal.weightSoldGrams, 'g');
 * });
 * ```
 */
export function useSalesByMetal(options: UseSalesByMetalOptions): UseSalesByMetalReturn {
  const { shopId, hasAccess } = useShop();
  const { dateRange, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: analyticsKeys.byMetalRange(shopId ?? '', dateRange.startDate, dateRange.endDate),
    queryFn: async () => {
      if (!shopId) {
        return { breakdown: [], raw: [] };
      }

      const raw = await queryAnalyticsTable<DailySalesByMetal>('daily_sales_by_metal', shopId, {
        dateColumn: 'metric_date',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        orderBy: 'metric_date',
        ascending: true,
      });

      const breakdown = aggregateMetalBreakdown(raw);

      return { breakdown, raw };
    },
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    data: queryResult.data?.breakdown ?? [],
    rawData: queryResult.data?.raw ?? [],
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error as Error | null,
    refetch: queryResult.refetch,
  };
}

/**
 * Hook to fetch customer analytics for a date range.
 *
 * Fetches daily_customer_metrics and calculates new vs returning customers.
 *
 * @param options - Query options including date range
 * @returns Customer analytics data with loading/error states
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useCustomerAnalytics({
 *   dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' }
 * });
 *
 * if (data) {
 *   console.log('New Customers:', data.totals.totalNewCustomers);
 *   console.log('Returning:', data.totals.totalReturningCustomers);
 * }
 * ```
 */
export function useCustomerAnalytics(
  options: UseCustomerAnalyticsOptions
): UseCustomerAnalyticsReturn {
  const { shopId, hasAccess } = useShop();
  const { dateRange, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: analyticsKeys.customersRange(shopId ?? '', dateRange.startDate, dateRange.endDate),
    queryFn: async () => {
      if (!shopId) {
        return null;
      }

      const data = await queryAnalyticsTable<DailyCustomerMetrics>(
        'daily_customer_metrics',
        shopId,
        {
          dateColumn: 'metric_date',
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          orderBy: 'metric_date',
          ascending: true,
        }
      );

      return calculateCustomerAnalytics(data);
    },
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    data: queryResult.data ?? null,
    dailyMetrics: queryResult.data?.dailyMetrics ?? [],
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error as Error | null,
    refetch: queryResult.refetch,
  };
}

/**
 * Hook to fetch top selling products.
 *
 * Aggregates sale_items to find best performing products by revenue.
 *
 * @param options - Query options including limit and optional date range
 * @returns Top products data with loading/error states
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useTopProducts({ limit: 10 });
 *
 * data.forEach((product, index) => {
 *   console.log(`#${index + 1}: ${product.item_name} - $${product.total_revenue}`);
 * });
 * ```
 */
export function useTopProducts(options: UseTopProductsOptions = {}): UseTopProductsReturn {
  const { shopId, hasAccess } = useShop();
  const { limit = 10, dateRange, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: analyticsKeys.topProducts(shopId ?? '', limit),
    queryFn: async () => {
      if (!shopId) {
        return [];
      }

      const supabase = createClient();

      // Query sale_items - using type assertion due to schema mismatch
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: saleItems, error: itemsError } = await (supabase as any)
        .from('sale_items')
        .select('id_item, item_name, quantity, total_price, weight_grams, id_sale')
        .eq('id_shop', shopId);

      if (itemsError) {
        throw new Error(`Failed to fetch sale items: ${itemsError.message}`);
      }

      const typedSaleItems = (saleItems ?? []) as SaleItemForAggregation[];

      // Get the corresponding sales to filter by status and optionally by date
      const saleIds = [...new Set(typedSaleItems.map((item) => item.id_sale))];

      if (saleIds.length === 0) {
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let salesQuery = (supabase as any)
        .from('sales')
        .select('id_sale, sale_status, sale_date')
        .eq('id_shop', shopId)
        .eq('sale_status', 'completed')
        .in('id_sale', saleIds);

      if (dateRange) {
        salesQuery = salesQuery
          .gte('sale_date', dateRange.startDate)
          .lte('sale_date', dateRange.endDate);
      }

      const { data: completedSales, error: salesError } = await salesQuery;

      if (salesError) {
        throw new Error(`Failed to fetch sales: ${salesError.message}`);
      }

      const typedSales = (completedSales ?? []) as SaleForFiltering[];

      // Create a set of valid sale IDs
      const validSaleIds = new Set(typedSales.map((s) => s.id_sale));

      // Filter and aggregate
      const itemMap = new Map<string, TopProduct>();

      for (const item of typedSaleItems) {
        if (!validSaleIds.has(item.id_sale)) {
          continue;
        }

        const existing = itemMap.get(item.id_item);

        if (existing) {
          existing.total_quantity += item.quantity;
          existing.total_revenue += item.total_price;
          existing.total_weight_grams += item.weight_grams ?? 0;
          existing.sale_count += 1;
        } else {
          itemMap.set(item.id_item, {
            id_item: item.id_item,
            item_name: item.item_name,
            total_quantity: item.quantity,
            total_revenue: item.total_price,
            total_weight_grams: item.weight_grams ?? 0,
            sale_count: 1,
          });
        }
      }

      // Sort by revenue and limit
      return Array.from(itemMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, limit);
    },
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    data: queryResult.data ?? [],
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error as Error | null,
    refetch: queryResult.refetch,
  };
}

/**
 * Hook to fetch monthly shop metrics.
 *
 * Fetches monthly_shop_metrics for trend analysis.
 *
 * @param options - Query options including month range
 * @returns Monthly metrics data with loading/error states
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useMonthlyMetrics({
 *   startMonth: '2024-01',
 *   endMonth: '2024-12'
 * });
 *
 * // Plot monthly trend
 * data.forEach(month => {
 *   console.log(month.year_month, 'Revenue:', month.total_sales);
 * });
 * ```
 */
export function useMonthlyMetrics(options: UseMonthlyMetricsOptions = {}): UseMonthlyMetricsReturn {
  const { shopId, hasAccess } = useShop();
  const { startMonth, endMonth, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: analyticsKeys.monthlyRange(shopId ?? '', startMonth ?? '', endMonth ?? ''),
    queryFn: async () => {
      if (!shopId) {
        return [];
      }

      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('monthly_shop_metrics')
        .select('*')
        .eq('id_shop', shopId)
        .order('year_month', { ascending: true });

      if (startMonth) {
        query = query.gte('year_month', startMonth);
      }
      if (endMonth) {
        query = query.lte('year_month', endMonth);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch monthly metrics: ${error.message}`);
      }

      return (data ?? []) as MonthlyShopMetrics[];
    },
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  return {
    data: queryResult.data ?? [],
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error as Error | null,
    refetch: queryResult.refetch,
  };
}

// ============================================
// Utility Hooks
// ============================================

/**
 * Hook to invalidate all analytics caches for the current shop.
 *
 * @example
 * ```tsx
 * const { invalidateAll, invalidateSales } = useInvalidateAnalytics();
 *
 * // After data changes
 * await invalidateSales();
 * ```
 */
export function useInvalidateAnalytics() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all analytics queries for current shop */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: analyticsKeys.all(shopId),
        });
      }
      return undefined;
    },
    /** Invalidate sales analytics */
    invalidateSales: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: analyticsKeys.sales(shopId),
        });
      }
      return undefined;
    },
    /** Invalidate financial analytics */
    invalidateFinancial: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: analyticsKeys.financial(shopId),
        });
      }
      return undefined;
    },
    /** Invalidate inventory analytics */
    invalidateInventory: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: analyticsKeys.inventory(shopId),
        });
      }
      return undefined;
    },
    /** Invalidate customer analytics */
    invalidateCustomers: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: analyticsKeys.customers(shopId),
        });
      }
      return undefined;
    },
  };
}
