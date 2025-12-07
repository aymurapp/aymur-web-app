'use client';

/**
 * AIInsightsWidget Component
 *
 * A dashboard widget that displays AI-generated business insights.
 * Shows quick insights with the ability to refresh and get more.
 *
 * Features:
 * - Displays 2-3 AI-generated business insights
 * - Loading skeleton while generating insights
 * - Refresh button to generate new insights
 * - "Get more insights" button for expanded analysis
 * - Empty state when no insights available
 * - RTL support with logical CSS properties
 *
 * @module components/domain/ai/AIInsightsWidget
 */

import React, { useState, useCallback } from 'react';

import {
  BulbOutlined,
  ReloadOutlined,
  RightOutlined,
  RiseOutlined,
  WarningOutlined,
  DollarOutlined,
  ShoppingOutlined,
  TeamOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { Card, Skeleton, Typography, Tag, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { Button } from '@/components/ui/Button';
import { usePermissions } from '@/lib/hooks/permissions';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the AIInsightsWidget component
 */
export interface AIInsightsWidgetProps {
  /**
   * The shop ID to fetch insights for
   */
  shopId: string;

  /**
   * Additional class name
   */
  className?: string;
}

/**
 * Insight type definition
 */
interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'opportunity';
  title: string;
  description: string;
  metric?: string;
  icon: React.ReactNode;
}

/**
 * Insight type to styling mapping
 */
const INSIGHT_STYLES: Record<Insight['type'], { bg: string; text: string; icon: string }> = {
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: 'text-emerald-500',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    icon: 'text-amber-500',
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: 'text-blue-500',
  },
  opportunity: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    icon: 'text-purple-500',
  },
};

// =============================================================================
// MOCK DATA GENERATOR
// =============================================================================

/**
 * Generate mock insights for demonstration
 * TODO: Replace with actual AI-generated insights from API
 */
function generateMockInsights(t: (key: string) => string): Insight[] {
  const allInsights: Insight[] = [
    {
      id: '1',
      type: 'success',
      title: t('mockInsights.salesUp.title'),
      description: t('mockInsights.salesUp.description'),
      metric: '+23%',
      icon: <RiseOutlined />,
    },
    {
      id: '2',
      type: 'warning',
      title: t('mockInsights.lowStock.title'),
      description: t('mockInsights.lowStock.description'),
      metric: '5',
      icon: <InboxOutlined />,
    },
    {
      id: '3',
      type: 'opportunity',
      title: t('mockInsights.topProduct.title'),
      description: t('mockInsights.topProduct.description'),
      metric: t('mockInsights.topProduct.metric'),
      icon: <ShoppingOutlined />,
    },
    {
      id: '4',
      type: 'info',
      title: t('mockInsights.customerGrowth.title'),
      description: t('mockInsights.customerGrowth.description'),
      metric: '+12',
      icon: <TeamOutlined />,
    },
    {
      id: '5',
      type: 'success',
      title: t('mockInsights.profitMargin.title'),
      description: t('mockInsights.profitMargin.description'),
      metric: '32%',
      icon: <DollarOutlined />,
    },
  ];

  // Randomly select 2-3 insights
  const shuffled = allInsights.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * 2) + 2);
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AIInsightsWidget Component
 *
 * Dashboard widget displaying AI-generated business insights.
 */
export function AIInsightsWidget({ className }: AIInsightsWidgetProps): React.JSX.Element {
  const t = useTranslations('ai.insights');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  // Local state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [insights, setInsights] = useState<Insight[]>(() => generateMockInsights(t));
  const [error, setError] = useState<string | null>(null);

  // Check AI permission
  const canUseAI = can('ai.use');

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      // TODO: Replace with actual API call to generate new insights
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setInsights(generateMockInsights(t));
    } catch (_err) {
      setError(t('errorGenerating'));
    } finally {
      setIsRefreshing(false);
    }
  }, [t]);

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  const renderInsight = (insight: Insight) => {
    const styles = INSIGHT_STYLES[insight.type];

    return (
      <div
        key={insight.id}
        className={cn(
          'p-3 rounded-lg border transition-colors',
          styles.bg,
          'border-transparent hover:border-stone-200'
        )}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
              'bg-white/80'
            )}
          >
            <span className={cn('text-base', styles.icon)}>{insight.icon}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <Text strong className={cn('text-sm', styles.text)}>
                {insight.title}
              </Text>
              {insight.metric && (
                <Tag className={cn('m-0 border-0 text-xs font-semibold', styles.bg, styles.text)}>
                  {insight.metric}
                </Tag>
              )}
            </div>
            <Text type="secondary" className="text-xs leading-relaxed block">
              {insight.description}
            </Text>
          </div>
        </div>
      </div>
    );
  };

  const renderLoadingSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 bg-stone-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Skeleton.Avatar active size="default" shape="square" />
            <div className="flex-1">
              <Skeleton active paragraph={{ rows: 1, width: ['80%'] }} title={{ width: '60%' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Permission check
  if (!canUseAI) {
    return (
      <Card
        className={cn('border border-stone-200 bg-white h-full', className)}
        styles={{ body: { padding: '16px' } }}
      >
        <EmptyState
          icon={<BulbOutlined />}
          title={t('noAccess')}
          description={t('noAccessDescription')}
          size="sm"
        />
      </Card>
    );
  }

  return (
    <Card
      className={cn('border border-stone-200 bg-white h-full', className)}
      styles={{
        body: {
          padding: 0,
        },
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50">
            <BulbOutlined className="text-lg text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900">{t('title')}</h3>
            <p className="text-sm text-stone-500">{t('subtitle')}</p>
          </div>
        </div>

        {/* Refresh Button */}
        <Tooltip title={t('refresh')}>
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined spin={isRefreshing} />}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-stone-500 hover:text-amber-600"
          />
        </Tooltip>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {isRefreshing ? (
          renderLoadingSkeleton()
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <WarningOutlined className="text-2xl text-red-500 mb-2" />
            <Text type="danger" className="text-sm">
              {error}
            </Text>
            <Button type="link" size="small" onClick={handleRefresh} className="mt-2">
              {tCommon('actions.retry')}
            </Button>
          </div>
        ) : insights.length === 0 ? (
          <EmptyState
            icon={<BulbOutlined />}
            title={t('noInsights')}
            description={t('noInsightsDescription')}
            size="sm"
          />
        ) : (
          <div className="space-y-3">{insights.map(renderInsight)}</div>
        )}
      </div>

      {/* Footer - Get More Insights */}
      {!isRefreshing && !error && insights.length > 0 && (
        <div className="px-5 py-3 border-t border-stone-100">
          <Link
            href="/ai/assistant"
            className="flex items-center justify-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            {t('getMoreInsights')}
            <RightOutlined className="text-xs" />
          </Link>
        </div>
      )}
    </Card>
  );
}

export default AIInsightsWidget;
