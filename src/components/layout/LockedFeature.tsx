'use client';

/**
 * LockedFeature Component
 * Permission check wrapper with upgrade prompt
 *
 * Features:
 * - Permission check using usePermissions hook
 * - Optional subscription tier check
 * - Upgrade prompt UI when feature is locked
 * - Blur/overlay effect on locked content
 * - Customizable lock message
 */

import React from 'react';

import { LockOutlined, CrownOutlined } from '@ant-design/icons';
import { Button, Result, Typography, Card } from 'antd';
import { useTranslations } from 'next-intl';

import { useSubscriptionPlan } from '@/lib/hooks/data';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { Link } from '@/lib/i18n/navigation';
import { useShopStore } from '@/stores/shopStore';

const { Text, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface LockedFeatureProps {
  /** Permission required to view this feature */
  permission?: string;
  /** Subscription tier required (e.g., 'pro', 'enterprise') */
  requiredTier?: string;
  /** Content to show when feature is locked (blur overlay) */
  children: React.ReactNode;
  /** Custom title for the lock message */
  title?: string;
  /** Custom description for the lock message */
  description?: string;
  /** Whether to show the upgrade button */
  showUpgrade?: boolean;
  /** Whether to completely hide content (vs blur overlay) */
  hideContent?: boolean;
  /** Fallback content when locked (alternative to blur) */
  fallback?: React.ReactNode;
  /** Additional CSS class name */
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if subscription tier meets requirement
 */
function checkTier(currentTier: string | undefined, requiredTier: string): boolean {
  const tierHierarchy: Record<string, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    business: 3,
    enterprise: 4,
  };

  const currentLevel = tierHierarchy[currentTier?.toLowerCase() ?? 'free'] ?? 0;
  const requiredLevel = tierHierarchy[requiredTier.toLowerCase()] ?? 999;

  return currentLevel >= requiredLevel;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Lock Overlay Component
 */
function LockOverlay({
  title,
  description,
  showUpgrade,
  isPermissionLock,
}: {
  title?: string;
  description?: string;
  showUpgrade: boolean;
  isPermissionLock: boolean;
}): JSX.Element {
  const t = useTranslations();
  const currentShopId = useShopStore((state) => state.currentShopId);

  const defaultTitle = isPermissionLock ? t('errors.unauthorized.title') : 'Upgrade Required';

  const defaultDescription = isPermissionLock
    ? t('errors.unauthorized.message')
    : 'This feature is not available on your current plan. Upgrade to unlock.';

  return (
    <div
      className="
        absolute inset-0
        flex items-center justify-center
        bg-white/80 dark:bg-stone-900/80
        backdrop-blur-sm
        z-10
        rounded-lg
      "
    >
      <Card className="max-w-sm mx-4 text-center shadow-lg">
        <div className="mb-4">
          {isPermissionLock ? (
            <LockOutlined className="text-4xl text-stone-400" />
          ) : (
            <CrownOutlined className="text-4xl text-amber-500" />
          )}
        </div>
        <Title level={5} className="!mb-2">
          {title ?? defaultTitle}
        </Title>
        <Text type="secondary" className="block mb-4">
          {description ?? defaultDescription}
        </Text>
        {showUpgrade && !isPermissionLock && (
          <Link href={currentShopId ? `/${currentShopId}/settings/billing` : '#'}>
            <Button type="primary" icon={<CrownOutlined />}>
              Upgrade Plan
            </Button>
          </Link>
        )}
        {isPermissionLock && (
          <Text type="secondary" className="text-sm">
            {t('errors.unauthorized.action')}
          </Text>
        )}
      </Card>
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Locked Feature Component
 *
 * Wraps content that requires specific permissions or subscription tiers.
 * Shows a lock overlay with upgrade prompt when access is denied.
 *
 * @example
 * // Permission-based lock
 * <LockedFeature permission="analytics.advanced">
 *   <AdvancedAnalytics />
 * </LockedFeature>
 *
 * @example
 * // Tier-based lock
 * <LockedFeature requiredTier="pro" showUpgrade>
 *   <PremiumFeature />
 * </LockedFeature>
 *
 * @example
 * // With custom message
 * <LockedFeature
 *   permission="ai.use"
 *   title="AI Assistant Locked"
 *   description="Contact your administrator to enable AI features."
 * >
 *   <AIChat />
 * </LockedFeature>
 *
 * @example
 * // Hide content completely
 * <LockedFeature permission="secret.view" hideContent>
 *   <SecretContent />
 * </LockedFeature>
 */
export function LockedFeature({
  permission,
  requiredTier,
  children,
  title,
  description,
  showUpgrade = true,
  hideContent = false,
  fallback,
  className,
}: LockedFeatureProps): JSX.Element | null {
  const { can, isLoading: permissionsLoading } = usePermissions();
  const { isLoading: shopLoading } = useShop();
  const { subscription, isLoading: subscriptionLoading } = useSubscriptionPlan();

  const isLoading = permissionsLoading || shopLoading || subscriptionLoading;

  // Check permission
  const hasPermission = permission ? can(permission) : true;

  // Check subscription tier
  // Get the tier from subscription, default to undefined if no subscription
  const currentTier = subscription?.plan?.tier;
  const hasTier = requiredTier ? checkTier(currentTier, requiredTier) : true;

  // Determine if locked
  const isLocked = !hasPermission || !hasTier;
  const isPermissionLock = !hasPermission;

  // Show loading state
  if (isLoading) {
    return (
      <div className={`animate-pulse ${className ?? ''}`}>
        <div className="h-32 bg-stone-100 dark:bg-stone-800 rounded-lg" />
      </div>
    );
  }

  // Not locked - render children
  if (!isLocked) {
    return <>{children}</>;
  }

  // Locked - show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Locked - hide content completely
  if (hideContent) {
    return (
      <Result
        status="403"
        title={title ?? (isPermissionLock ? 'Access Denied' : 'Upgrade Required')}
        subTitle={description}
        extra={
          showUpgrade &&
          !isPermissionLock && (
            <Button type="primary" icon={<CrownOutlined />}>
              Upgrade Plan
            </Button>
          )
        }
        className={className}
      />
    );
  }

  // Locked - show with blur overlay
  return (
    <div className={`relative ${className ?? ''}`}>
      {/* Blurred content */}
      <div className="filter blur-sm pointer-events-none select-none">{children}</div>

      {/* Lock overlay */}
      <LockOverlay
        title={title}
        description={description}
        showUpgrade={showUpgrade}
        isPermissionLock={isPermissionLock}
      />
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default LockedFeature;
