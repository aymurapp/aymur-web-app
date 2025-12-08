'use client';

/**
 * Analytics Page
 *
 * Comprehensive analytics dashboard for the jewelry shop management platform.
 * Displays KPIs, sales trends, category breakdowns, and financial insights.
 *
 * Features:
 * - Date range selector with presets
 * - KPI cards with trend indicators
 * - Tab-based analytics views (Sales, Inventory, Customers, Financial)
 * - Interactive charts using Ant Design Charts
 * - RTL support and i18n
 *
 * @module app/(platform)/[locale]/[shopId]/analytics/page
 */

import React, { useState, useMemo } from 'react';

import { Line, Pie, Bar } from '@ant-design/charts';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  LineChartOutlined,
  WalletOutlined,
  UserOutlined,
  InboxOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Tabs, DatePicker, Spin, Empty, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslations } from 'next-intl';

import { StatCard, StatCardGrid } from '@/components/common/data/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  useSalesAnalytics,
  useFinancialAnalytics,
  useSalesByCategory,
  useSalesByMetal,
  useCustomerAnalytics,
  useInventoryAnalytics,
  useTopProducts,
  type AnalyticsDateRange,
  type DailyShopMetrics,
  type DailyFinancialMetrics,
  type DailyCustomerMetrics,
} from '@/lib/hooks/data/useAnalytics';
import { useShop } from '@/lib/hooks/shop';
import { formatCurrency } from '@/lib/utils/format';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// =============================================================================
// TYPES
// =============================================================================

type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

interface TabComponentProps {
  dateRange: AnalyticsDateRange;
}

// =============================================================================
// DATE PRESETS
// =============================================================================

const useDatePresets = () => {
  const t = useTranslations('common.time');

  return useMemo(
    () => [
      {
        label: t('lastWeek'),
        value: [dayjs().subtract(7, 'day'), dayjs()] as [Dayjs, Dayjs],
      },
      {
        label: t('lastMonth'),
        value: [dayjs().subtract(30, 'day'), dayjs()] as [Dayjs, Dayjs],
      },
      {
        label: t('thisMonth'),
        value: [dayjs().startOf('month'), dayjs()] as [Dayjs, Dayjs],
      },
      {
        label: `${t('lastMonth')} (${dayjs().subtract(1, 'month').format('MMM')})`,
        value: [
          dayjs().subtract(1, 'month').startOf('month'),
          dayjs().subtract(1, 'month').endOf('month'),
        ] as [Dayjs, Dayjs],
      },
    ],
    [t]
  );
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Formats a number for display in charts
 */
function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

/**
 * Calculate trend direction and percentage
 */
function calculateTrend(
  current: number,
  previous: number
): { direction: 'up' | 'down'; value: number } | undefined {
  if (previous === 0) {
    return undefined;
  }
  const change = ((current - previous) / previous) * 100;
  return {
    direction: change >= 0 ? 'up' : 'down',
    value: Math.abs(change),
  };
}

// =============================================================================
// CHART THEME
// =============================================================================

const chartTheme = {
  color: [
    '#f59e0b', // amber-500 (primary)
    '#10b981', // emerald-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#f97316', // orange-500
    '#14b8a6', // teal-500
  ],
};

// =============================================================================
// SALES ANALYTICS TAB
// =============================================================================

function SalesAnalyticsTab({ dateRange }: TabComponentProps) {
  const t = useTranslations('analytics');
  const tCommon = useTranslations('common');
  const { shop } = useShop();

  const { dailyMetrics, isLoading } = useSalesAnalytics({ dateRange });
  const { data: categoryData, isLoading: categoryLoading } = useSalesByCategory({ dateRange });
  const { data: metalData, isLoading: metalLoading } = useSalesByMetal({ dateRange });
  const { data: topProducts, isLoading: topProductsLoading } = useTopProducts({
    limit: 10,
    dateRange,
  });

  // Prepare line chart data
  const trendData = useMemo(() => {
    return dailyMetrics.map((metric: DailyShopMetrics) => ({
      date: dayjs(metric.metric_date).format('MMM DD'),
      revenue: metric.total_sales ?? 0,
      items: metric.total_items_sold ?? 0,
    }));
  }, [dailyMetrics]);

  // Prepare pie chart data for categories
  const categoryChartData = useMemo(() => {
    return categoryData.slice(0, 6).map((cat) => ({
      type: cat.categoryName,
      value: cat.totalRevenue,
    }));
  }, [categoryData]);

  // Prepare bar chart data for metals
  const metalChartData = useMemo(() => {
    return metalData.slice(0, 6).map((metal) => ({
      name: metal.purityName ? `${metal.metalName} ${metal.purityName}` : metal.metalName,
      value: metal.totalRevenue,
      weight: metal.weightSoldGrams,
    }));
  }, [metalData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  const currency = shop?.currency ?? 'USD';

  return (
    <div className="space-y-6">
      {/* Sales Trend Line Chart */}
      <Card title={t('charts.salesTrend')} className="border-stone-200">
        {trendData.length > 0 ? (
          <Line
            data={trendData}
            xField="date"
            yField="revenue"
            height={300}
            smooth
            color="#f59e0b"
            point={{ size: 3, shape: 'circle' }}
            tooltip={{
              formatter: (datum: { revenue: number }) => ({
                name: t('metrics.totalRevenue'),
                value: formatCurrency(datum.revenue, currency),
              }),
            }}
            yAxis={{
              label: {
                formatter: (v: string) => formatNumber(Number(v)),
              },
            }}
          />
        ) : (
          <Empty description={tCommon('messages.noData')} />
        )}
      </Card>

      <Row gutter={[16, 16]}>
        {/* Category Breakdown Pie Chart */}
        <Col xs={24} lg={12}>
          <Card
            title={t('charts.revenueByCategory')}
            className="border-stone-200"
            loading={categoryLoading}
          >
            {categoryChartData.length > 0 ? (
              <Pie
                data={categoryChartData}
                angleField="value"
                colorField="type"
                height={300}
                innerRadius={0.6}
                color={chartTheme.color}
                label={{
                  text: 'type',
                  position: 'outside',
                }}
                legend={{
                  color: {
                    position: 'right',
                    rowPadding: 5,
                  },
                }}
                tooltip={{
                  formatter: (datum: { type: string; value: number }) => ({
                    name: datum.type,
                    value: formatCurrency(datum.value, currency),
                  }),
                }}
              />
            ) : (
              <Empty description={tCommon('messages.noData')} />
            )}
          </Card>
        </Col>

        {/* Metal Breakdown Bar Chart */}
        <Col xs={24} lg={12}>
          <Card
            title={t('charts.topSellingItems')}
            className="border-stone-200"
            loading={metalLoading}
          >
            {metalChartData.length > 0 ? (
              <Bar
                data={metalChartData}
                xField="value"
                yField="name"
                height={300}
                color="#f59e0b"
                label={{
                  text: (datum: { value: number }) => formatCurrency(datum.value, currency),
                  position: 'right',
                  style: { fill: '#666' },
                }}
                tooltip={{
                  formatter: (datum: { name: string; value: number }) => ({
                    name: datum.name,
                    value: formatCurrency(datum.value, currency),
                  }),
                }}
              />
            ) : (
              <Empty description={tCommon('messages.noData')} />
            )}
          </Card>
        </Col>
      </Row>

      {/* Top Products */}
      <Card
        title={t('metrics.topProducts')}
        className="border-stone-200"
        loading={topProductsLoading}
      >
        {topProducts.length > 0 ? (
          <div className="space-y-3">
            {topProducts.slice(0, 5).map((product, index) => (
              <div
                key={product.id_item}
                className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 text-sm font-medium">
                    {index + 1}
                  </span>
                  <div>
                    <Text strong className="text-stone-900">
                      {product.item_name}
                    </Text>
                    <Text type="secondary" className="block text-xs">
                      {product.sale_count} {t('metrics.totalSales').toLowerCase()}
                    </Text>
                  </div>
                </div>
                <Text strong className="text-amber-600">
                  {formatCurrency(product.total_revenue, currency)}
                </Text>
              </div>
            ))}
          </div>
        ) : (
          <Empty description={tCommon('messages.noData')} />
        )}
      </Card>
    </div>
  );
}

// =============================================================================
// INVENTORY ANALYTICS TAB
// =============================================================================

function InventoryAnalyticsTab() {
  const t = useTranslations('analytics');
  const tCommon = useTranslations('common');
  const { shop } = useShop();

  const { data: inventoryData, isLoading } = useInventoryAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  const currency = shop?.currency ?? 'USD';

  const inventoryStats = [
    {
      title: t('metrics.inventoryValue'),
      value: inventoryData?.avg_inventory_value ?? 0,
      format: 'currency',
    },
    {
      title: 'Turnover Ratio',
      value: inventoryData?.turnover_ratio ?? 0,
      format: 'number',
      suffix: 'x',
    },
    {
      title: 'Days Outstanding',
      value: inventoryData?.days_inventory_outstanding ?? 0,
      format: 'number',
      suffix: ' days',
    },
    {
      title: 'COGS',
      value: inventoryData?.cost_of_goods_sold ?? 0,
      format: 'currency',
    },
  ];

  return (
    <div className="space-y-6">
      <StatCardGrid columns={4}>
        {inventoryStats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={
              stat.format === 'currency'
                ? formatCurrency(stat.value, currency)
                : `${stat.value.toFixed(1)}${stat.suffix ?? ''}`
            }
            prefix={<InboxOutlined className="text-amber-500" />}
          />
        ))}
      </StatCardGrid>

      {/* Inventory Value Comparison */}
      <Card title="Inventory Value Comparison" className="border-stone-200">
        {inventoryData ? (
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <div className="text-center p-4 bg-stone-50 rounded-lg">
                <Text type="secondary" className="block mb-2">
                  Beginning Inventory
                </Text>
                <Text strong className="text-2xl text-stone-900">
                  {formatCurrency(inventoryData.beginning_inventory_value ?? 0, currency)}
                </Text>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <Text type="secondary" className="block mb-2">
                  Average Inventory
                </Text>
                <Text strong className="text-2xl text-amber-600">
                  {formatCurrency(inventoryData.avg_inventory_value ?? 0, currency)}
                </Text>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="text-center p-4 bg-stone-50 rounded-lg">
                <Text type="secondary" className="block mb-2">
                  Ending Inventory
                </Text>
                <Text strong className="text-2xl text-stone-900">
                  {formatCurrency(inventoryData.ending_inventory_value ?? 0, currency)}
                </Text>
              </div>
            </Col>
          </Row>
        ) : (
          <Empty description={tCommon('messages.noData')} />
        )}
      </Card>
    </div>
  );
}

// =============================================================================
// CUSTOMER ANALYTICS TAB
// =============================================================================

function CustomerAnalyticsTab({ dateRange }: TabComponentProps) {
  const t = useTranslations('analytics');
  const tCommon = useTranslations('common');
  const { shop } = useShop();

  const { data: customerData, dailyMetrics, isLoading } = useCustomerAnalytics({ dateRange });

  // Prepare customer trend data
  const customerTrendData = useMemo(() => {
    return dailyMetrics
      .map((metric: DailyCustomerMetrics) => [
        {
          date: dayjs(metric.metric_date).format('MMM DD'),
          type: t('metrics.newCustomers'),
          value: metric.new_customers ?? 0,
        },
        {
          date: dayjs(metric.metric_date).format('MMM DD'),
          type: t('metrics.returningCustomers'),
          value: metric.returning_customers ?? 0,
        },
      ])
      .flat();
  }, [dailyMetrics, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  const currency = shop?.currency ?? 'USD';
  const totals = customerData?.totals;

  return (
    <div className="space-y-6">
      {/* Customer Stats */}
      <StatCardGrid columns={4}>
        <StatCard
          title={t('metrics.newCustomers')}
          value={totals?.totalNewCustomers ?? 0}
          prefix={<UserOutlined className="text-emerald-500" />}
        />
        <StatCard
          title={t('metrics.returningCustomers')}
          value={totals?.totalReturningCustomers ?? 0}
          prefix={<UserOutlined className="text-blue-500" />}
        />
        <StatCard
          title={t('metrics.averageOrderValue')}
          value={formatCurrency(totals?.avgTransactionValue ?? 0, currency)}
          prefix={<DollarOutlined className="text-amber-500" />}
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(totals?.totalOutstandingBalance ?? 0, currency)}
          prefix={<WalletOutlined className="text-violet-500" />}
        />
      </StatCardGrid>

      {/* Customer Growth Chart */}
      <Card title={t('charts.customerGrowth')} className="border-stone-200">
        {customerTrendData.length > 0 ? (
          <Line
            data={customerTrendData}
            xField="date"
            yField="value"
            seriesField="type"
            height={300}
            smooth
            color={['#10b981', '#3b82f6']}
            legend={{
              position: 'top',
            }}
            point={{ size: 3, shape: 'circle' }}
          />
        ) : (
          <Empty description={tCommon('messages.noData')} />
        )}
      </Card>

      {/* Customer Composition */}
      <Card title="Customer Composition" className="border-stone-200">
        {totals && (totals.totalNewCustomers > 0 || totals.totalReturningCustomers > 0) ? (
          <Pie
            data={[
              { type: t('metrics.newCustomers'), value: totals.totalNewCustomers },
              { type: t('metrics.returningCustomers'), value: totals.totalReturningCustomers },
            ]}
            angleField="value"
            colorField="type"
            height={300}
            innerRadius={0.6}
            color={['#10b981', '#3b82f6']}
            label={{
              text: 'type',
              position: 'outside',
            }}
            legend={{
              color: {
                position: 'bottom',
              },
            }}
          />
        ) : (
          <Empty description={tCommon('messages.noData')} />
        )}
      </Card>
    </div>
  );
}

// =============================================================================
// FINANCIAL ANALYTICS TAB
// =============================================================================

function FinancialAnalyticsTab({ dateRange }: TabComponentProps) {
  const t = useTranslations('analytics');
  const tCommon = useTranslations('common');
  const { shop } = useShop();

  const { data: financialData, dailyMetrics, isLoading } = useFinancialAnalytics({ dateRange });

  // Prepare financial trend data
  const financialTrendData = useMemo(() => {
    return dailyMetrics.map((metric: DailyFinancialMetrics) => ({
      date: dayjs(metric.metric_date).format('MMM DD'),
      revenue: metric.total_revenue ?? 0,
      profit: metric.gross_profit ?? 0,
      expenses: metric.total_expenses ?? 0,
    }));
  }, [dailyMetrics]);

  // Prepare expense breakdown
  const expenseBreakdownData = useMemo(() => {
    if (!dailyMetrics.length) {
      return [];
    }

    const totals = {
      operational: 0,
      marketing: 0,
      salaries: 0,
      other: 0,
    };

    dailyMetrics.forEach((metric: DailyFinancialMetrics) => {
      totals.operational += metric.expense_operational ?? 0;
      totals.marketing += metric.expense_marketing ?? 0;
      totals.salaries += metric.expense_salaries ?? 0;
      totals.other += metric.expense_other ?? 0;
    });

    return [
      { type: 'Operational', value: totals.operational },
      { type: 'Marketing', value: totals.marketing },
      { type: 'Salaries', value: totals.salaries },
      { type: 'Other', value: totals.other },
    ].filter((item) => item.value > 0);
  }, [dailyMetrics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  const currency = shop?.currency ?? 'USD';
  const totals = financialData?.totals;

  return (
    <div className="space-y-6">
      {/* Financial Stats */}
      <StatCardGrid columns={4}>
        <StatCard
          title={t('metrics.totalRevenue')}
          value={formatCurrency(totals?.totalRevenue ?? 0, currency)}
          prefix={<DollarOutlined className="text-amber-500" />}
        />
        <StatCard
          title={t('metrics.grossProfit')}
          value={formatCurrency(totals?.grossProfit ?? 0, currency)}
          prefix={<RiseOutlined className="text-emerald-500" />}
          trend={
            totals?.grossMarginPercent
              ? { direction: 'up', value: totals.grossMarginPercent, label: 'margin' }
              : undefined
          }
        />
        <StatCard
          title={t('metrics.expenses')}
          value={formatCurrency(totals?.totalExpenses ?? 0, currency)}
          prefix={<FallOutlined className="text-red-500" />}
        />
        <StatCard
          title={t('metrics.cashFlow')}
          value={formatCurrency(totals?.netCashFlow ?? 0, currency)}
          prefix={<WalletOutlined className="text-blue-500" />}
        />
      </StatCardGrid>

      {/* Revenue vs Profit Trend */}
      <Card title="Revenue & Profit Trend" className="border-stone-200">
        {financialTrendData.length > 0 ? (
          <Line
            data={financialTrendData.flatMap((item) => [
              { date: item.date, type: t('metrics.totalRevenue'), value: item.revenue },
              { date: item.date, type: t('metrics.grossProfit'), value: item.profit },
            ])}
            xField="date"
            yField="value"
            seriesField="type"
            height={300}
            smooth
            color={['#f59e0b', '#10b981']}
            legend={{
              position: 'top',
            }}
            yAxis={{
              label: {
                formatter: (v: string) => formatNumber(Number(v)),
              },
            }}
            tooltip={{
              formatter: (datum: { type: string; value: number }) => ({
                name: datum.type,
                value: formatCurrency(datum.value, currency),
              }),
            }}
          />
        ) : (
          <Empty description={tCommon('messages.noData')} />
        )}
      </Card>

      {/* Expense Breakdown */}
      <Card title={t('charts.expenseBreakdown')} className="border-stone-200">
        {expenseBreakdownData.length > 0 ? (
          <Pie
            data={expenseBreakdownData}
            angleField="value"
            colorField="type"
            height={300}
            innerRadius={0.6}
            color={chartTheme.color}
            label={{
              text: 'type',
              position: 'outside',
            }}
            legend={{
              color: {
                position: 'right',
                rowPadding: 5,
              },
            }}
            tooltip={{
              formatter: (datum: { type: string; value: number }) => ({
                name: datum.type,
                value: formatCurrency(datum.value, currency),
              }),
            }}
          />
        ) : (
          <Empty description={tCommon('messages.noData')} />
        )}
      </Card>

      {/* Profit Margins */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card className="border-stone-200 h-full">
            <div className="text-center py-6">
              <Text type="secondary" className="block mb-2">
                {t('metrics.profitMargin')} (Gross)
              </Text>
              <Text strong className="text-4xl text-emerald-600">
                {(totals?.grossMarginPercent ?? 0).toFixed(1)}%
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="border-stone-200 h-full">
            <div className="text-center py-6">
              <Text type="secondary" className="block mb-2">
                Operating Margin
              </Text>
              <Text strong className="text-4xl text-blue-600">
                {(totals?.operatingMarginPercent ?? 0).toFixed(1)}%
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const tNav = useTranslations('navigation');
  const { shop } = useShop();

  // Default to last 30 days
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>({
    startDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
  });

  const datePresets = useDatePresets();

  // Fetch main analytics data for KPIs
  const { data: salesData, isLoading: salesLoading } = useSalesAnalytics({ dateRange });
  const { data: financialData, isLoading: financialLoading } = useFinancialAnalytics({ dateRange });

  const currency = shop?.currency ?? 'USD';
  const isLoading = salesLoading || financialLoading;

  // Handle date range change
  const handleDateChange = (dates: DateRangeValue) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange({
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD'),
      });
    }
  };

  // Calculate KPI values
  const kpiValues = useMemo(() => {
    const salesTotals = salesData?.totals;
    const financialTotals = financialData?.totals;
    const salesTrends = salesData?.trends;

    return {
      revenue: salesTotals?.totalRevenue ?? 0,
      revenueTrend: salesTrends
        ? calculateTrend(
            salesTotals?.totalRevenue ?? 0,
            (salesTotals?.totalRevenue ?? 0) - salesTrends.revenueChange
          )
        : undefined,
      salesCount: salesTotals?.totalSalesCount ?? 0,
      salesTrend: salesTrends
        ? calculateTrend(
            salesTotals?.totalSalesCount ?? 0,
            (salesTotals?.totalSalesCount ?? 0) - salesTrends.salesCountChange
          )
        : undefined,
      avgSale: salesTotals?.avgSaleValue ?? 0,
      netProfit: financialTotals?.operatingProfit ?? 0,
      profitTrend:
        financialTotals?.operatingMarginPercent && financialTotals.operatingMarginPercent > 0
          ? { direction: 'up' as const, value: financialTotals.operatingMarginPercent }
          : undefined,
    };
  }, [salesData, financialData]);

  // Tab items
  const tabItems = [
    {
      key: 'sales',
      label: (
        <span className="flex items-center gap-2">
          <ShoppingCartOutlined />
          {t('salesAnalytics')}
        </span>
      ),
      children: <SalesAnalyticsTab dateRange={dateRange} />,
    },
    {
      key: 'inventory',
      label: (
        <span className="flex items-center gap-2">
          <InboxOutlined />
          {t('inventoryAnalytics')}
        </span>
      ),
      children: <InventoryAnalyticsTab />,
    },
    {
      key: 'customers',
      label: (
        <span className="flex items-center gap-2">
          <UserOutlined />
          {t('customerAnalytics')}
        </span>
      ),
      children: <CustomerAnalyticsTab dateRange={dateRange} />,
    },
    {
      key: 'financial',
      label: (
        <span className="flex items-center gap-2">
          <LineChartOutlined />
          {t('financialAnalytics')}
        </span>
      ),
      children: <FinancialAnalyticsTab dateRange={dateRange} />,
    },
  ];

  return (
    <div className="analytics-page">
      {/* Page Header */}
      <PageHeader title={tNav('analytics')} subtitle={t('overview')} />

      {/* Date Range Selector */}
      <Card className="mb-6 border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Text strong className="text-stone-700">
              {t('periods.custom')}
            </Text>
            <Text type="secondary" className="block text-sm">
              {dayjs(dateRange.startDate).format('MMM DD, YYYY')} -{' '}
              {dayjs(dateRange.endDate).format('MMM DD, YYYY')}
            </Text>
          </div>
          <RangePicker
            value={[dayjs(dateRange.startDate), dayjs(dateRange.endDate)]}
            onChange={handleDateChange}
            presets={datePresets}
            className="w-full sm:w-auto"
            allowClear={false}
          />
        </div>
      </Card>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('metrics.totalRevenue')}
            value={formatCurrency(kpiValues.revenue, currency)}
            prefix={<DollarOutlined className="text-amber-500" />}
            trend={kpiValues.revenueTrend}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('metrics.totalSales')}
            value={kpiValues.salesCount}
            prefix={<ShoppingCartOutlined className="text-emerald-500" />}
            trend={kpiValues.salesTrend}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('metrics.averageOrderValue')}
            value={formatCurrency(kpiValues.avgSale, currency)}
            prefix={<LineChartOutlined className="text-blue-500" />}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('metrics.netProfit')}
            value={formatCurrency(kpiValues.netProfit, currency)}
            prefix={<WalletOutlined className="text-violet-500" />}
            trend={kpiValues.profitTrend}
            loading={isLoading}
          />
        </Col>
      </Row>

      {/* Analytics Tabs */}
      <Card className="border-stone-200">
        <Tabs defaultActiveKey="sales" items={tabItems} size="large" className="analytics-tabs" />
      </Card>
    </div>
  );
}
