'use client';

/**
 * Shop Selection Page
 *
 * Premium shop selection hub for AYMUR platform.
 * Features:
 * - AYMUR branded design with gold accents
 * - Shop cards with role badges and hover effects
 * - Create new shop button (subscription required)
 * - Join shop with invitation code
 * - Premium empty state for new users
 * - NO auto-redirect - user must explicitly choose shop
 *
 * @module app/(platform)/[locale]/shops/page
 */

import React, { useCallback, useEffect, useState } from 'react';

import Image from 'next/image';

import {
  PlusOutlined,
  ShopOutlined,
  CrownOutlined,
  TeamOutlined,
  RightOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  CloudOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Tag, Skeleton, Modal, Input, Alert, message, Progress, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getUserSubscriptionLimitsAction } from '@/lib/actions/billing';
import {
  validateInvitationCode,
  acceptInvitation,
  type InvitationDetails,
} from '@/lib/actions/invitation';
import { canCreateShop } from '@/lib/actions/shop';
import { useShops, type ShopWithRole } from '@/lib/hooks/shop/useShops';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';
import { useShopStore } from '@/stores/shopStore';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Brand colors derived from AYMUR logo
 */
const BRAND_COLORS = {
  gold: '#C9A227',
  goldLight: '#E5C76B',
  goldDark: '#A68B1F',
} as const;

/**
 * Role badge colors mapping
 */
const ROLE_COLORS: Record<string, string> = {
  owner: 'gold',
  manager: 'blue',
  finance: 'green',
  staff: 'default',
};

/**
 * Role icons mapping
 */
const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <CrownOutlined />,
  manager: <TeamOutlined />,
  finance: <DollarOutlined />,
  staff: <SafetyCertificateOutlined />,
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Subscription limits data from the plans table
 */
interface SubscriptionLimits {
  planName: string | null;
  planId: string | null;
  subscriptionStatus: string | null;
  ownedShopsCount: number;
  memberShopsCount: number;
  maxShops: number | null;
  totalStorageUsedMb: number;
  storageLimitMb: number | null;
  maxStaffPerShop: number | null;
  aiCreditsMonthly: number | null;
  isContactSales: boolean;
}

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Format storage size for display
 */
function formatStorage(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

/**
 * Subscription limits bar showing usage vs plan limits
 * All limits are fetched from the plans table in the database
 */
function SubscriptionLimitsBar({
  limits,
  isLoading,
}: {
  limits: SubscriptionLimits | null;
  isLoading: boolean;
}) {
  const t = useTranslations('shop');

  if (isLoading) {
    return (
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-8">
            <Skeleton.Input active size="small" className="!w-32" />
            <Skeleton.Input active size="small" className="!w-32" />
            <Skeleton.Input active size="small" className="!w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!limits || !limits.planName) {
    return null;
  }

  // Calculate percentages for progress bars
  const shopPercentage = limits.maxShops
    ? Math.round((limits.ownedShopsCount / limits.maxShops) * 100)
    : 0;
  const storagePercentage = limits.storageLimitMb
    ? Math.round((limits.totalStorageUsedMb / limits.storageLimitMb) * 100)
    : 0;

  // Determine progress bar colors based on usage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) {
      return '#ef4444';
    } // red
    if (percentage >= 70) {
      return '#f59e0b';
    } // amber
    return BRAND_COLORS.gold;
  };

  return (
    <div className="bg-white border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Plan Badge */}
          <div className="flex items-center gap-3">
            <Tag color="gold" className="text-sm font-semibold px-3 py-1" icon={<CrownOutlined />}>
              {limits.planName}
            </Tag>
            {limits.isContactSales && <span className="text-xs text-stone-500">Unlimited</span>}
          </div>

          {/* Usage Stats */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            {/* Owned Shops */}
            <Tooltip
              title={
                <div>
                  <div className="font-medium">Owned Shops</div>
                  <div className="text-xs text-stone-300">
                    Only shops you own count against your limit
                  </div>
                </div>
              }
            >
              <div className="flex items-center gap-2">
                <ShopOutlined className="text-lg" style={{ color: BRAND_COLORS.gold }} />
                <div className="text-sm">
                  <span className="font-semibold text-stone-900">{limits.ownedShopsCount}</span>
                  <span className="text-stone-400">/{limits.maxShops ?? '∞'}</span>
                  <span className="text-stone-500 ms-1 hidden sm:inline">
                    {t('ownedShops', { defaultValue: 'owned' })}
                  </span>
                </div>
                {limits.maxShops && (
                  <Progress
                    percent={shopPercentage}
                    size="small"
                    showInfo={false}
                    strokeColor={getProgressColor(shopPercentage)}
                    className="!w-16 !m-0"
                  />
                )}
              </div>
            </Tooltip>

            {/* Member Shops (informational, doesn't count) */}
            {limits.memberShopsCount > 0 && (
              <Tooltip
                title={
                  <div>
                    <div className="font-medium">Member Shops</div>
                    <div className="text-xs text-stone-300">
                      Shops you&apos;re a member of (doesn&apos;t count against limit)
                    </div>
                  </div>
                }
              >
                <div className="flex items-center gap-2">
                  <TeamOutlined className="text-lg text-blue-500" />
                  <div className="text-sm">
                    <span className="font-semibold text-stone-900">{limits.memberShopsCount}</span>
                    <span className="text-stone-500 ms-1 hidden sm:inline">
                      {t('memberShops', { defaultValue: 'member' })}
                    </span>
                  </div>
                </div>
              </Tooltip>
            )}

            {/* Storage */}
            <Tooltip
              title={
                <div>
                  <div className="font-medium">Storage Used</div>
                  <div className="text-xs text-stone-300">Total across all your owned shops</div>
                </div>
              }
            >
              <div className="flex items-center gap-2">
                <CloudOutlined className="text-lg" style={{ color: BRAND_COLORS.gold }} />
                <div className="text-sm">
                  <span className="font-semibold text-stone-900">
                    {formatStorage(limits.totalStorageUsedMb)}
                  </span>
                  <span className="text-stone-400">
                    /{limits.storageLimitMb ? formatStorage(limits.storageLimitMb) : '∞'}
                  </span>
                </div>
                {limits.storageLimitMb && (
                  <Progress
                    percent={storagePercentage}
                    size="small"
                    showInfo={false}
                    strokeColor={getProgressColor(storagePercentage)}
                    className="!w-16 !m-0"
                  />
                )}
              </div>
            </Tooltip>

            {/* Staff per Shop */}
            {limits.maxStaffPerShop && (
              <Tooltip
                title={
                  <div>
                    <div className="font-medium">Staff Limit</div>
                    <div className="text-xs text-stone-300">Maximum team members per shop</div>
                  </div>
                }
              >
                <div className="flex items-center gap-2">
                  <TeamOutlined className="text-lg" style={{ color: BRAND_COLORS.gold }} />
                  <div className="text-sm">
                    <span className="font-semibold text-stone-900">{limits.maxStaffPerShop}</span>
                    <span className="text-stone-500 ms-1 hidden sm:inline">
                      {t('staffPerShop', { defaultValue: 'staff/shop' })}
                    </span>
                  </div>
                </div>
              </Tooltip>
            )}

            {/* AI Credits */}
            {limits.aiCreditsMonthly && (
              <Tooltip
                title={
                  <div>
                    <div className="font-medium">AI Credits</div>
                    <div className="text-xs text-stone-300">Monthly AI assistant credits</div>
                  </div>
                }
              >
                <div className="flex items-center gap-2">
                  <ThunderboltOutlined className="text-lg" style={{ color: BRAND_COLORS.gold }} />
                  <div className="text-sm">
                    <span className="font-semibold text-stone-900">
                      {limits.aiCreditsMonthly.toLocaleString()}
                    </span>
                    <span className="text-stone-500 ms-1 hidden sm:inline">
                      {t('aiCredits', { defaultValue: 'AI/mo' })}
                    </span>
                  </div>
                </div>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hero header section with AYMUR branding
 */
function HeroHeader({ shopCount, onJoinClick }: { shopCount: number; onJoinClick: () => void }) {
  const t = useTranslations('shop');

  return (
    <section
      className={cn(
        'relative overflow-hidden',
        'bg-gradient-to-b from-stone-900 via-stone-900 to-stone-800',
        'py-12 sm:py-16'
      )}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Radial gradient overlay with gold */}
        <div
          className="absolute top-0 start-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-30"
          style={{
            background: `radial-gradient(ellipse at center, ${BRAND_COLORS.gold}15 0%, transparent 70%)`,
          }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(${BRAND_COLORS.gold}20 1px, transparent 1px),
                              linear-gradient(90deg, ${BRAND_COLORS.gold}20 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Abstract circles */}
        <div
          className="absolute -top-20 -end-20 w-80 h-80 rounded-full opacity-5"
          style={{
            background: `radial-gradient(circle, ${BRAND_COLORS.gold} 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          {/* Left side - Title and subtitle */}
          <div className="text-center sm:text-start">
            {/* AYMUR Logo */}
            <div className="mb-4 flex justify-center sm:justify-start">
              <Image
                src="/images/AYMUR-Letter-A-Logo-and-webicon.png"
                alt="AYMUR"
                width={48}
                height={48}
                className="h-12 w-auto"
                priority
              />
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 tracking-tight">
              {t('selectShop')}
            </h1>
            <p className="text-stone-400 text-sm sm:text-base">
              {shopCount > 0
                ? `${shopCount} ${shopCount === 1 ? 'shop' : 'shops'} available`
                : 'Start by creating your first shop'}
            </p>
          </div>

          {/* Right side - Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-end gap-3">
            {/* Join Shop button */}
            <Button
              size="large"
              icon={<UserAddOutlined />}
              onClick={onJoinClick}
              className="h-12 px-6 text-base font-semibold border-2 border-stone-600 text-stone-300 bg-transparent hover:bg-stone-800 hover:border-stone-500 hover:text-white transition-all duration-200"
            >
              {t('joinShop', { defaultValue: 'Join Shop' })}
            </Button>

            {/* Create Shop button */}
            <Link href="/shops/new">
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                className="h-12 px-6 text-base font-semibold border-none shadow-lg hover:shadow-xl transition-all duration-200"
                style={{
                  backgroundColor: BRAND_COLORS.gold,
                }}
              >
                {t('createShop')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Gold accent line */}
        <div
          className="mt-8 mx-auto sm:mx-0 w-24 h-1 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${BRAND_COLORS.gold}, transparent)`,
          }}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}

/**
 * Invitation Code Modal for joining a shop
 */
function JoinShopModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();

  // Form state
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  /**
   * Format code input - uppercase and limit length
   */
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    setCode(value);
    setError(null);
    setInvitationDetails(null);
  }, []);

  /**
   * Validate the invitation code
   */
  const handleValidate = useCallback(async () => {
    if (code.length !== 8) {
      setError('Code must be 8 characters (3 letters + 5 digits)');
      return;
    }

    setIsValidating(true);
    setError(null);

    const result = await validateInvitationCode(code);

    setIsValidating(false);

    if (result.success && result.data) {
      setInvitationDetails(result.data);
    } else if (!result.success) {
      setError(result.error || 'Invalid invitation code');
    }
  }, [code]);

  /**
   * Accept the invitation and join the shop
   */
  const handleAccept = useCallback(async () => {
    if (!invitationDetails) {
      return;
    }

    setIsAccepting(true);

    const result = await acceptInvitation(code);

    setIsAccepting(false);

    if (result.success) {
      message.success(result.message || 'Successfully joined the shop!');
      onClose();
      onSuccess();
      router.push(`/${invitationDetails.id_shop}/dashboard`);
    } else if (!result.success) {
      setError(result.error || 'Failed to join shop');
    }
  }, [code, invitationDetails, onClose, onSuccess, router]);

  /**
   * Reset state when modal closes
   */
  const handleClose = useCallback(() => {
    setCode('');
    setError(null);
    setInvitationDetails(null);
    setIsValidating(false);
    setIsAccepting(false);
    onClose();
  }, [onClose]);

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={480}
      centered
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <UserAddOutlined className="text-xl text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Join a Shop</h3>
            <p className="text-sm text-stone-500 font-normal">Enter your invitation code</p>
          </div>
        </div>
      }
    >
      <div className="py-4">
        {/* Error Alert */}
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            className="mb-4"
          />
        )}

        {/* Code Input or Shop Preview */}
        {!invitationDetails ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Invitation Code
              </label>
              <Input
                size="large"
                placeholder="ABC12345"
                value={code}
                onChange={handleCodeChange}
                maxLength={8}
                className="text-center text-2xl tracking-[0.3em] font-mono"
                onPressEnter={handleValidate}
                autoFocus
              />
              <p className="mt-2 text-xs text-stone-500">
                Enter the 8-character code provided by your team (e.g., ABC12345)
              </p>
            </div>

            <Button
              type="primary"
              size="large"
              block
              onClick={handleValidate}
              loading={isValidating}
              disabled={code.length !== 8}
              style={{ backgroundColor: BRAND_COLORS.gold }}
              className="h-12 text-base font-semibold"
            >
              Validate Code
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Shop Preview */}
            <div className="bg-gradient-to-br from-stone-50 to-stone-100 rounded-xl p-6 border border-stone-200">
              <div className="flex items-center gap-4">
                {invitationDetails.shop_logo ? (
                  <img
                    src={invitationDetails.shop_logo}
                    alt={invitationDetails.shop_name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-stone-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center border-2 border-amber-200">
                    <ShopOutlined className="text-2xl text-amber-600" />
                  </div>
                )}
                <div>
                  <h4 className="text-lg font-bold text-stone-900">
                    {invitationDetails.shop_name}
                  </h4>
                  <Tag color="blue" className="mt-1">
                    {invitationDetails.role_name}
                  </Tag>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-stone-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Invited by</span>
                  <span className="text-stone-700 font-medium">
                    {invitationDetails.invited_by_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Expires</span>
                  <span className="text-stone-700 font-medium">
                    {new Date(invitationDetails.expires_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Accept Button */}
            <Button
              type="primary"
              size="large"
              block
              onClick={handleAccept}
              loading={isAccepting}
              icon={<CheckCircleOutlined />}
              style={{ backgroundColor: BRAND_COLORS.gold }}
              className="h-12 text-base font-semibold"
            >
              Accept & Join Shop
            </Button>

            {/* Back to code entry */}
            <button
              type="button"
              onClick={() => {
                setInvitationDetails(null);
                setCode('');
              }}
              className="w-full text-center text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              Use a different code
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * Premium shop card component
 */
function ShopCard({ shop, onClick }: { shop: ShopWithRole; onClick: () => void }) {
  const t = useTranslations('shop');

  const roleKey = shop.role.toLowerCase();
  const roleColor = ROLE_COLORS[roleKey] || 'default';
  const roleIcon = ROLE_ICONS[roleKey];

  return (
    <Card
      hoverable
      onClick={onClick}
      className={cn(
        'group relative h-full overflow-hidden',
        'border-stone-200 hover:border-amber-300',
        'transition-all duration-300 ease-out',
        'hover:shadow-xl hover:shadow-amber-500/10',
        'hover:-translate-y-1',
        'cursor-pointer'
      )}
      bodyStyle={{ padding: 0 }}
    >
      {/* Gradient overlay on hover */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100',
          'transition-opacity duration-300',
          'bg-gradient-to-br from-amber-50 to-transparent'
        )}
        aria-hidden="true"
      />

      {/* Card content */}
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          {/* Shop Logo or Placeholder */}
          <div
            className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center mb-5',
              'bg-gradient-to-br from-stone-100 to-stone-50',
              'border-2 border-stone-200 group-hover:border-amber-300',
              'overflow-hidden',
              'transition-all duration-300',
              'shadow-inner'
            )}
          >
            {shop.shop_logo ? (
              <img
                src={shop.shop_logo}
                alt={shop.shop_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <ShopOutlined className="text-3xl text-stone-400 group-hover:text-amber-600 transition-colors duration-300" />
            )}
          </div>

          {/* Shop Name */}
          <h3 className="text-lg font-bold text-stone-900 mb-3 line-clamp-2 group-hover:text-amber-900 transition-colors duration-300">
            {shop.shop_name}
          </h3>

          {/* Role Badge */}
          <Tag color={roleColor} icon={roleIcon} className="capitalize text-sm px-3 py-1">
            {t(`roles.${roleKey}`, { defaultValue: shop.role })}
          </Tag>

          {/* Currency indicator */}
          <div className="mt-4 text-xs text-stone-500 font-medium tracking-wide uppercase">
            {shop.currency}
          </div>

          {/* Enter button */}
          <div
            className={cn(
              'mt-5 flex items-center gap-2',
              'text-sm font-semibold',
              'text-stone-400 group-hover:text-amber-600',
              'transition-all duration-300'
            )}
          >
            <span>Enter Shop</span>
            <RightOutlined className="text-xs group-hover:translate-x-1 transition-transform duration-300 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
          </div>
        </div>
      </div>

      {/* Bottom gold accent line */}
      <div
        className={cn(
          'absolute bottom-0 start-0 end-0 h-1',
          'opacity-0 group-hover:opacity-100',
          'transition-opacity duration-300'
        )}
        style={{
          background: `linear-gradient(90deg, transparent, ${BRAND_COLORS.gold}, transparent)`,
        }}
        aria-hidden="true"
      />
    </Card>
  );
}

/**
 * Loading skeleton for shop cards
 */
function ShopCardSkeleton() {
  return (
    <Card className="h-full" bodyStyle={{ padding: 0 }}>
      <div className="p-6 sm:p-8">
        <div className="flex flex-col items-center">
          <Skeleton.Avatar active size={80} className="mb-5" />
          <Skeleton.Input active size="small" className="mb-3 !w-32" />
          <Skeleton.Button active size="small" className="!w-20" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Premium empty state for new users
 */
function EmptyState({
  isCheckingSubscription,
  onJoinClick,
}: {
  isCheckingSubscription: boolean;
  onJoinClick: () => void;
}) {
  const t = useTranslations('shop');

  if (isCheckingSubscription) {
    return (
      <div className="py-20 text-center">
        <LoadingSpinner size="default" text="Checking your account..." />
      </div>
    );
  }

  return (
    <div className="py-16 sm:py-20">
      <div className="max-w-md mx-auto text-center">
        {/* Icon */}
        <div
          className={cn(
            'inline-flex items-center justify-center',
            'w-24 h-24 rounded-full mb-8',
            'bg-gradient-to-br from-amber-100 to-amber-50',
            'border-2 border-amber-200'
          )}
        >
          <ShopOutlined className="text-4xl" style={{ color: BRAND_COLORS.gold }} />
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-3">{t('noShops')}</h2>

        {/* Description */}
        <p className="text-stone-500 mb-8 leading-relaxed">
          Create your first shop to start managing your jewelry business with AYMUR&apos;s powerful
          tools and insights.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            size="large"
            icon={<UserAddOutlined />}
            onClick={onJoinClick}
            className="h-14 px-8 text-base font-semibold border-2 border-stone-300 text-stone-700 bg-white hover:bg-stone-50 hover:border-stone-400 transition-all duration-200"
          >
            {t('joinShop', { defaultValue: 'Join Shop' })}
          </Button>

          <Link href="/shops/new">
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              className="h-14 px-10 text-base font-semibold border-none shadow-lg hover:shadow-xl transition-all duration-200"
              style={{
                backgroundColor: BRAND_COLORS.gold,
              }}
            >
              {t('createShop')}
            </Button>
          </Link>
        </div>

        {/* Helper text */}
        <p className="mt-6 text-xs text-stone-400">Setting up takes less than 5 minutes</p>
      </div>
    </div>
  );
}

/**
 * Shops grid section
 */
function ShopsGrid({
  shops,
  isLoading,
  onSelectShop,
}: {
  shops: ShopWithRole[];
  isLoading: boolean;
  onSelectShop: (shop: ShopWithRole) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShopCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {shops.map((shop) => (
        <ShopCard key={shop.id_shop} shop={shop} onClick={() => onSelectShop(shop)} />
      ))}
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

/**
 * Shop Selection Page Component
 *
 * Central hub for shop selection. Users MUST explicitly choose a shop
 * to enter - no auto-redirect even with single shop.
 */
export default function ShopsPage() {
  const router = useRouter();
  const { activeShops, isLoading, isFetched, shopCount, refetch } = useShops();
  const setCurrentShop = useShopStore((state) => state.setCurrentShop);

  // Subscription check state
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [hasNoSubscription, setHasNoSubscription] = useState(false);

  // Join shop modal state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Subscription limits state (fetched from plans table in database)
  const [subscriptionLimits, setSubscriptionLimits] = useState<SubscriptionLimits | null>(null);
  const [isLoadingLimits, setIsLoadingLimits] = useState(true);

  // Fetch subscription limits from database on mount
  useEffect(() => {
    async function fetchSubscriptionLimits() {
      setIsLoadingLimits(true);
      const result = await getUserSubscriptionLimitsAction();

      if (result.success && result.data) {
        setSubscriptionLimits(result.data);
      }
      setIsLoadingLimits(false);
    }

    fetchSubscriptionLimits();
  }, []);

  // Check subscription when user has no shops
  useEffect(() => {
    async function checkSubscription() {
      if (isFetched && activeShops.length === 0 && !subscriptionChecked) {
        const result = await canCreateShop();
        setSubscriptionChecked(true);

        if (result.success && result.data) {
          setHasNoSubscription(false);
        } else if (!result.success && result.code === 'no_subscription') {
          setHasNoSubscription(true);
        }
      }
    }

    checkSubscription();
  }, [isFetched, activeShops.length, subscriptionChecked]);

  // Redirect to onboarding if no subscription
  useEffect(() => {
    if (subscriptionChecked && hasNoSubscription) {
      router.replace('/onboarding/welcome');
    }
  }, [subscriptionChecked, hasNoSubscription, router]);

  /**
   * Handle shop selection - user explicitly chooses a shop
   */
  const handleSelectShop = (shop: ShopWithRole) => {
    setCurrentShop(shop.id_shop);
    router.push(`/${shop.id_shop}/dashboard`);
  };

  // Show loading while redirecting due to no subscription
  if (subscriptionChecked && hasNoSubscription) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <LoadingSpinner size="large" text="Redirecting to setup..." />
      </div>
    );
  }

  // Determine if we should show empty state
  const showEmptyState = isFetched && activeShops.length === 0 && !hasNoSubscription;
  const isCheckingSubscription = isFetched && activeShops.length === 0 && !subscriptionChecked;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Hero Header */}
      <HeroHeader shopCount={shopCount} onJoinClick={() => setIsJoinModalOpen(true)} />

      {/* Subscription Limits Bar - shows plan limits from database */}
      <SubscriptionLimitsBar limits={subscriptionLimits} isLoading={isLoadingLimits} />

      {/* Main Content */}
      <main className="flex-1 py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {showEmptyState || isCheckingSubscription ? (
            <EmptyState
              isCheckingSubscription={isCheckingSubscription}
              onJoinClick={() => setIsJoinModalOpen(true)}
            />
          ) : (
            <ShopsGrid shops={activeShops} isLoading={isLoading} onSelectShop={handleSelectShop} />
          )}
        </div>
      </main>

      {/* Footer accent */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${BRAND_COLORS.gold}30, transparent)`,
        }}
        aria-hidden="true"
      />

      {/* Join Shop Modal */}
      <JoinShopModal
        open={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
