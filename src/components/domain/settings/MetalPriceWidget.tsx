'use client';

/**
 * MetalPriceWidget Component
 *
 * Dashboard widget displaying current metal prices for the jewelry shop.
 * Shows buy/sell prices with spread for Gold (24K, 22K, 18K), Silver, and Platinum.
 *
 * Features:
 * - Current prices for multiple metal types and purities
 * - Buy/sell prices with spread calculation
 * - Price change indicator (up/down arrow with color coding)
 * - Last updated timestamp
 * - Compact mode for dashboard, full mode for settings page
 * - Loading skeleton state
 * - Empty state when no prices available
 * - RTL support with logical CSS properties
 *
 * @module components/domain/settings/MetalPriceWidget
 */

import React, { useMemo, useState, useEffect } from 'react';

import {
  GoldOutlined,
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Card, Skeleton, Tag, Table, Tooltip, Typography, Space } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { Button } from '@/components/ui/Button';
import { useShop } from '@/lib/hooks/shop';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Metal price data structure
 */
interface MetalPrice {
  /** Unique identifier */
  id: string;
  /** Metal type (gold, silver, platinum) */
  metalType: 'gold' | 'silver' | 'platinum';
  /** Purity for gold (24K, 22K, 18K) or null for others */
  purity: string | null;
  /** Display name */
  name: string;
  /** Buy price per gram */
  buyPrice: number;
  /** Sell price per gram */
  sellPrice: number;
  /** Price change percentage (positive or negative) */
  priceChange: number;
  /** Currency code */
  currency: string;
  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * Props for the MetalPriceWidget component
 */
export interface MetalPriceWidgetProps {
  /**
   * Whether to display in compact mode (for dashboard)
   * @default false
   */
  compact?: boolean;

  /**
   * Whether to show mini sparkline chart
   * @default false
   */
  showChart?: boolean;

  /**
   * Additional class name
   */
  className?: string;
}

// =============================================================================
// MOCK DATA
// =============================================================================

/**
 * Generate mock metal prices with realistic values
 * This will be replaced with actual hook data when the tables are available
 */
function generateMockPrices(): MetalPrice[] {
  const now = new Date();

  return [
    {
      id: 'gold-24k',
      metalType: 'gold',
      purity: '24K',
      name: 'Gold 24K',
      buyPrice: 62.85,
      sellPrice: 64.25,
      priceChange: 1.24,
      currency: 'USD',
      lastUpdated: now,
    },
    {
      id: 'gold-22k',
      metalType: 'gold',
      purity: '22K',
      name: 'Gold 22K',
      buyPrice: 57.62,
      sellPrice: 58.95,
      priceChange: 1.18,
      currency: 'USD',
      lastUpdated: now,
    },
    {
      id: 'gold-18k',
      metalType: 'gold',
      purity: '18K',
      name: 'Gold 18K',
      buyPrice: 47.14,
      sellPrice: 48.25,
      priceChange: -0.45,
      currency: 'USD',
      lastUpdated: now,
    },
    {
      id: 'silver',
      metalType: 'silver',
      purity: null,
      name: 'Silver',
      buyPrice: 0.74,
      sellPrice: 0.78,
      priceChange: 2.15,
      currency: 'USD',
      lastUpdated: now,
    },
    {
      id: 'platinum',
      metalType: 'platinum',
      purity: null,
      name: 'Platinum',
      buyPrice: 31.25,
      sellPrice: 32.5,
      priceChange: -0.82,
      currency: 'USD',
      lastUpdated: now,
    },
  ];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price with currency
 */
function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Format percentage change
 */
function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format timestamp for display
 */
function formatLastUpdated(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Get metal type color for styling
 */
function getMetalColor(metalType: 'gold' | 'silver' | 'platinum'): {
  bg: string;
  text: string;
  border: string;
} {
  switch (metalType) {
    case 'gold':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
      };
    case 'silver':
      return {
        bg: 'bg-stone-100',
        text: 'text-stone-600',
        border: 'border-stone-300',
      };
    case 'platinum':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-300',
      };
  }
}

// =============================================================================
// COMPACT PRICE CARD COMPONENT
// =============================================================================

interface CompactPriceCardProps {
  price: MetalPrice;
}

/**
 * Compact price card for dashboard view
 */
function CompactPriceCard({ price }: CompactPriceCardProps): React.JSX.Element {
  const metalColors = getMetalColor(price.metalType);
  const isPositive = price.priceChange >= 0;

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        metalColors.bg,
        metalColors.border
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full',
            price.metalType === 'gold' ? 'bg-amber-100' : 'bg-stone-200'
          )}
        >
          <GoldOutlined
            className={cn(
              'text-sm',
              price.metalType === 'gold' ? 'text-amber-600' : 'text-stone-500'
            )}
          />
        </div>
        <div>
          <Text strong className={cn('text-sm block', metalColors.text)}>
            {price.purity ? `${price.purity}` : price.name}
          </Text>
          <Text className="text-xs text-stone-500">
            {formatPrice(price.sellPrice, price.currency)}/g
          </Text>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isPositive ? (
          <RiseOutlined className="text-xs text-emerald-500" />
        ) : (
          <FallOutlined className="text-xs text-red-500" />
        )}
        <Text
          className={cn('text-xs font-medium', isPositive ? 'text-emerald-600' : 'text-red-600')}
        >
          {formatPercentage(price.priceChange)}
        </Text>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * MetalPriceWidget Component
 *
 * Displays current metal prices with buy/sell spreads and change indicators.
 * Supports compact mode for dashboard use and full mode for settings pages.
 */
export function MetalPriceWidget({
  compact = false,
  showChart: _showChart = false,
  className,
}: MetalPriceWidgetProps): React.JSX.Element {
  const t = useTranslations('settings.metalPrices');
  const tWidget = useTranslations('settings.metalPrices.widget');
  const tColumns = useTranslations('settings.metalPrices.columns');
  const tMetals = useTranslations('settings.metalPrices.metals');
  const tCommon = useTranslations('common');
  const { shopId } = useShop();

  // ==========================================================================
  // STATE - Mock loading simulation
  // ==========================================================================

  const [isLoading, setIsLoading] = useState(true);
  const [prices, setPrices] = useState<MetalPrice[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate initial data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setPrices(generateMockPrices());
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    setPrices(generateMockPrices());
    setIsRefreshing(false);
  };

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const lastUpdated = useMemo(() => {
    const firstPrice = prices[0];
    if (!firstPrice) {
      return null;
    }
    return firstPrice.lastUpdated;
  }, [prices]);

  // Gold prices for compact display
  const goldPrices = useMemo(() => prices.filter((p) => p.metalType === 'gold'), [prices]);

  // Other metals for compact display
  const otherMetals = useMemo(() => prices.filter((p) => p.metalType !== 'gold'), [prices]);

  // ==========================================================================
  // TABLE COLUMNS (Full Mode)
  // ==========================================================================

  const columns: ColumnsType<MetalPrice> = useMemo(
    () => [
      {
        title: tColumns('metal'),
        dataIndex: 'name',
        key: 'name',
        render: (name: string, record: MetalPrice) => {
          const metalColors = getMetalColor(record.metalType);
          return (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg',
                  metalColors.bg
                )}
              >
                <GoldOutlined className={cn('text-sm', metalColors.text)} />
              </div>
              <div>
                <Text strong className="block">
                  {name}
                </Text>
                {record.purity && (
                  <Tag
                    className="m-0 mt-1"
                    color={record.metalType === 'gold' ? 'gold' : 'default'}
                  >
                    {record.purity}
                  </Tag>
                )}
              </div>
            </div>
          );
        },
      },
      {
        title: tColumns('buyPrice'),
        dataIndex: 'buyPrice',
        key: 'buyPrice',
        align: 'end' as const,
        render: (value: number, record: MetalPrice) => (
          <Text className="font-mono text-stone-700">{formatPrice(value, record.currency)}</Text>
        ),
      },
      {
        title: tColumns('sellPrice'),
        dataIndex: 'sellPrice',
        key: 'sellPrice',
        align: 'end' as const,
        render: (value: number, record: MetalPrice) => (
          <Text strong className="font-mono text-stone-900">
            {formatPrice(value, record.currency)}
          </Text>
        ),
      },
      {
        title: tWidget('spread'),
        key: 'spread',
        align: 'end' as const,
        render: (_: unknown, record: MetalPrice) => {
          const spread = record.sellPrice - record.buyPrice;
          const spreadPercent = ((spread / record.buyPrice) * 100).toFixed(2);
          return (
            <Tooltip
              title={`${formatPrice(spread, record.currency)} ${tWidget('spread').toLowerCase()}`}
            >
              <Tag color="blue" className="m-0">
                {spreadPercent}%
              </Tag>
            </Tooltip>
          );
        },
      },
      {
        title: tColumns('change'),
        dataIndex: 'priceChange',
        key: 'priceChange',
        align: 'end' as const,
        render: (value: number) => {
          const isPositive = value >= 0;
          return (
            <div className="flex items-center justify-end gap-1">
              {isPositive ? (
                <RiseOutlined className="text-emerald-500" />
              ) : (
                <FallOutlined className="text-red-500" />
              )}
              <Text className={cn('font-medium', isPositive ? 'text-emerald-600' : 'text-red-600')}>
                {formatPercentage(value)}
              </Text>
            </div>
          );
        },
      },
    ],
    [tColumns, tWidget]
  );

  // ==========================================================================
  // RENDER - LOADING STATE
  // ==========================================================================

  if (isLoading) {
    if (compact) {
      return (
        <Card
          className={cn('border border-stone-200 bg-white', className)}
          styles={{ body: { padding: '16px' } }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Skeleton.Avatar active size="default" shape="square" />
            <Skeleton.Input active size="small" style={{ width: 120 }} />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton.Input key={i} active block style={{ height: 48 }} />
            ))}
          </div>
        </Card>
      );
    }

    return (
      <Card
        className={cn('border border-stone-200 bg-white', className)}
        styles={{ body: { padding: 0 } }}
      >
        <div className="px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <Skeleton.Avatar active size="default" shape="square" />
            <Skeleton.Input active size="small" style={{ width: 150 }} />
          </div>
        </div>
        <div className="p-5">
          <Skeleton active paragraph={{ rows: 5 }} />
        </div>
      </Card>
    );
  }

  // ==========================================================================
  // RENDER - EMPTY STATE
  // ==========================================================================

  if (prices.length === 0) {
    return (
      <Card
        className={cn('border border-stone-200 bg-white', className)}
        styles={{ body: { padding: '24px' } }}
      >
        <EmptyState
          icon={<GoldOutlined />}
          title={t('noData')}
          description={t('noDataDescription')}
          action={{
            label: t('addPrice'),
            onClick: () => {
              /* Navigate to settings */
            },
            type: 'primary',
            icon: <SettingOutlined />,
          }}
          size={compact ? 'sm' : 'md'}
        />
      </Card>
    );
  }

  // ==========================================================================
  // RENDER - COMPACT MODE
  // ==========================================================================

  if (compact) {
    return (
      <Card
        className={cn('border border-stone-200 bg-white h-full', className)}
        styles={{ body: { padding: 0 } }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50">
              <GoldOutlined className="text-lg text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900">{tWidget('title')}</h3>
              {lastUpdated && (
                <p className="text-xs text-stone-500 flex items-center gap-1">
                  <ClockCircleOutlined className="text-[10px]" />
                  {formatLastUpdated(lastUpdated)}
                </p>
              )}
            </div>
          </div>

          <Tooltip title={tCommon('actions.refresh')}>
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined spin={isRefreshing} />}
              onClick={handleRefresh}
              loading={isRefreshing}
              className="text-stone-500 hover:text-amber-600"
            />
          </Tooltip>
        </div>

        {/* Gold Prices */}
        <div className="px-5 py-3">
          <Text type="secondary" className="text-xs uppercase tracking-wider mb-2 block">
            {tMetals('gold')}
          </Text>
          <div className="space-y-2">
            {goldPrices.map((price) => (
              <CompactPriceCard key={price.id} price={price} />
            ))}
          </div>
        </div>

        {/* Other Metals */}
        <div className="px-5 py-3 border-t border-stone-100">
          <Text type="secondary" className="text-xs uppercase tracking-wider mb-2 block">
            {tCommon('labels.other')}
          </Text>
          <div className="space-y-2">
            {otherMetals.map((price) => (
              <CompactPriceCard key={price.id} price={price} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-100">
          <Link
            href={shopId ? `/${shopId}/settings/metal-prices` : '/settings/metal-prices'}
            className="flex items-center justify-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            {tWidget('viewAll')}
            <RightOutlined className="text-xs" />
          </Link>
        </div>
      </Card>
    );
  }

  // ==========================================================================
  // RENDER - FULL MODE
  // ==========================================================================

  return (
    <Card
      className={cn('border border-stone-200 bg-white', className)}
      styles={{ body: { padding: 0 } }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50">
            <GoldOutlined className="text-lg text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-stone-900">{tWidget('title')}</h3>
            <p className="text-sm text-stone-500">{t('subtitle')}</p>
          </div>
        </div>

        <Space>
          {lastUpdated && (
            <Tag icon={<ClockCircleOutlined />} color="default" className="m-0">
              {t('lastUpdated')}: {formatLastUpdated(lastUpdated)}
            </Tag>
          )}
          <Button
            type="default"
            size="small"
            icon={<ReloadOutlined spin={isRefreshing} />}
            onClick={handleRefresh}
            loading={isRefreshing}
          >
            {tCommon('actions.refresh')}
          </Button>
        </Space>
      </div>

      {/* Table */}
      <Table
        dataSource={prices}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="middle"
        className="metal-prices-table"
        rowClassName={(record) => {
          return cn('hover:bg-stone-50', record.metalType === 'gold' && 'bg-amber-50/30');
        }}
      />

      {/* Footer Note */}
      <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/50">
        <Text type="secondary" className="text-xs">
          {tWidget('perGram')}
        </Text>
      </div>
    </Card>
  );
}

export default MetalPriceWidget;
