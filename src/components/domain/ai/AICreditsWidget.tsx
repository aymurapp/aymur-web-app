'use client';

/**
 * AICreditsWidget Component
 *
 * Displays AI credit usage for a shop with visual progress bar.
 * Supports both full and compact modes for different UI contexts.
 *
 * Features:
 * - Total, used, and remaining credits display
 * - Visual progress bar with color coding
 * - Low credit warning when below 20%
 * - Compact mode for sidebar/header placement
 * - Loading skeleton state
 * - RTL support with logical CSS properties
 *
 * @module components/domain/ai/AICreditsWidget
 */

import React, { useMemo } from 'react';

import { ThunderboltOutlined, WarningOutlined } from '@ant-design/icons';
import { Card, Progress, Skeleton, Tooltip, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { useAICredits } from '@/lib/hooks/data/useAI';
import { cn } from '@/lib/utils/cn';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the AICreditsWidget component
 */
export interface AICreditsWidgetProps {
  /**
   * The shop ID to fetch credits for
   */
  shopId: string;

  /**
   * Whether to display in compact mode (for sidebar)
   * @default false
   */
  compact?: boolean;

  /**
   * Additional class name
   */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Threshold percentage for low credit warning
 */
const LOW_CREDIT_THRESHOLD = 20;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AICreditsWidget Component
 *
 * Displays AI credit usage with visual progress bar and warnings.
 */
export function AICreditsWidget({
  shopId,
  compact = false,
  className,
}: AICreditsWidgetProps): React.JSX.Element {
  const t = useTranslations('ai.credits');

  // Fetch AI credits data
  const { totalCredits, usedCredits, remainingCredits, isLoading, error } = useAICredits({
    enabled: !!shopId,
  });

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const { percentUsed, percentRemaining, isLowCredits, progressStatus } = useMemo(() => {
    if (totalCredits === 0) {
      return {
        percentUsed: 0,
        percentRemaining: 100,
        isLowCredits: false,
        progressStatus: 'normal' as const,
      };
    }

    const used = Math.round((usedCredits / totalCredits) * 100);
    const remaining = 100 - used;
    const isLow = remaining <= LOW_CREDIT_THRESHOLD;

    return {
      percentUsed: used,
      percentRemaining: remaining,
      isLowCredits: isLow,
      progressStatus: isLow ? ('exception' as const) : ('normal' as const),
    };
  }, [totalCredits, usedCredits]);

  // ==========================================================================
  // RENDER - COMPACT MODE
  // ==========================================================================

  if (compact) {
    if (isLoading) {
      return (
        <div className={cn('flex items-center gap-2 px-3 py-2', className)}>
          <Skeleton.Avatar active size="small" shape="circle" />
          <Skeleton.Input active size="small" style={{ width: 60 }} />
        </div>
      );
    }

    if (error) {
      return (
        <Tooltip title={t('error')}>
          <div className={cn('flex items-center gap-2 px-3 py-2 text-red-500', className)}>
            <WarningOutlined />
          </div>
        </Tooltip>
      );
    }

    return (
      <Tooltip
        title={
          <div className="text-xs">
            <div>
              {t('total')}: {totalCredits.toLocaleString()}
            </div>
            <div>
              {t('used')}: {usedCredits.toLocaleString()}
            </div>
            <div>
              {t('remaining')}: {remainingCredits.toLocaleString()}
            </div>
          </div>
        }
      >
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
            isLowCredits
              ? 'bg-red-50 text-red-600'
              : 'bg-amber-50 text-amber-600 hover:bg-amber-100',
            className
          )}
        >
          <ThunderboltOutlined className="text-sm" />
          <span className="text-xs font-medium">{remainingCredits.toLocaleString()}</span>
          {isLowCredits && <WarningOutlined className="text-xs animate-pulse" />}
        </div>
      </Tooltip>
    );
  }

  // ==========================================================================
  // RENDER - FULL MODE
  // ==========================================================================

  if (isLoading) {
    return (
      <Card
        className={cn('border border-stone-200 bg-white', className)}
        styles={{ body: { padding: '16px' } }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Skeleton.Avatar active size="default" shape="square" />
          <Skeleton.Input active size="small" style={{ width: 120 }} />
        </div>
        <Skeleton active paragraph={{ rows: 2 }} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={cn('border border-red-200 bg-red-50', className)}
        styles={{ body: { padding: '16px' } }}
      >
        <div className="flex items-center gap-3 text-red-600">
          <WarningOutlined className="text-lg" />
          <Text type="danger">{t('error')}</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'border bg-white overflow-hidden',
        isLowCredits ? 'border-red-200' : 'border-stone-200',
        className
      )}
      styles={{ body: { padding: '16px' } }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg',
              isLowCredits ? 'bg-red-50' : 'bg-amber-50'
            )}
          >
            <ThunderboltOutlined
              className={cn('text-lg', isLowCredits ? 'text-red-600' : 'text-amber-600')}
            />
          </div>
          <div>
            <Text strong className="text-stone-900">
              {t('title')}
            </Text>
            {isLowCredits && (
              <div className="flex items-center gap-1 text-red-600">
                <WarningOutlined className="text-xs" />
                <Text type="danger" className="text-xs">
                  {t('lowCreditsWarning')}
                </Text>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress
        percent={percentUsed}
        status={progressStatus}
        strokeColor={isLowCredits ? '#dc2626' : '#f59e0b'}
        trailColor={isLowCredits ? '#fee2e2' : '#fef3c7'}
        showInfo={false}
        size="small"
        className="mb-4"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total Credits */}
        <div className="text-center">
          <Text type="secondary" className="text-xs block mb-1">
            {t('total')}
          </Text>
          <Text strong className="text-base text-stone-900">
            {totalCredits.toLocaleString()}
          </Text>
        </div>

        {/* Used Credits */}
        <div className="text-center">
          <Text type="secondary" className="text-xs block mb-1">
            {t('used')}
          </Text>
          <Text strong className="text-base text-stone-700">
            {usedCredits.toLocaleString()}
          </Text>
        </div>

        {/* Remaining Credits */}
        <div className="text-center">
          <Text type="secondary" className="text-xs block mb-1">
            {t('remaining')}
          </Text>
          <Text
            strong
            className={cn('text-base', isLowCredits ? 'text-red-600' : 'text-emerald-600')}
          >
            {remainingCredits.toLocaleString()}
          </Text>
        </div>
      </div>

      {/* Low Credit Alert */}
      {isLowCredits && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
          <div className="flex items-start gap-2">
            <WarningOutlined className="text-red-500 mt-0.5" />
            <div>
              <Text type="danger" className="text-sm font-medium block">
                {t('lowCreditsTitle')}
              </Text>
              <Text type="secondary" className="text-xs">
                {t('lowCreditsDescription', { percent: percentRemaining })}
              </Text>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default AICreditsWidget;
