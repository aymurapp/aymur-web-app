'use client';

/**
 * Shop Selection Page (task-067)
 *
 * Displays a list of shops the user has access to.
 * Features:
 * - Shop cards with name, logo, and role badge
 * - Create new shop button
 * - Auto-redirect to dashboard if user has only one shop
 * - Loading skeleton states
 * - Empty state for new users
 *
 * @module app/(platform)/[locale]/shops/page
 */

import React, { useEffect } from 'react';

import { PlusOutlined, ShopOutlined, CrownOutlined, TeamOutlined } from '@ant-design/icons';
import { Empty, Tag } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useShops, type ShopWithRole } from '@/lib/hooks/shop/useShops';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';
import { useShopStore } from '@/stores/shopStore';

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
  finance: <TeamOutlined />,
  staff: <TeamOutlined />,
};

/**
 * Shop card component
 */
function ShopCard({ shop, onClick }: { shop: ShopWithRole; onClick: () => void }) {
  const t = useTranslations('shop');

  const roleKey = shop.role.toLowerCase();
  const roleColor = ROLE_COLORS[roleKey] || 'default';
  const roleIcon = ROLE_ICONS[roleKey];

  return (
    <Card hoverable onClick={onClick} className="h-full transition-all duration-200">
      <div className="flex flex-col items-center text-center p-4">
        {/* Shop Logo or Placeholder */}
        <div
          className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center mb-4',
            'bg-gradient-to-br from-amber-100 to-amber-50',
            'border-2 border-amber-200',
            'overflow-hidden'
          )}
        >
          {shop.shop_logo ? (
            <img src={shop.shop_logo} alt={shop.shop_name} className="w-full h-full object-cover" />
          ) : (
            <ShopOutlined className="text-3xl text-amber-600" />
          )}
        </div>

        {/* Shop Name */}
        <h3 className="text-lg font-semibold text-stone-900 mb-2 line-clamp-2">{shop.shop_name}</h3>

        {/* Role Badge */}
        <Tag color={roleColor} icon={roleIcon} className="capitalize">
          {t(`roles.${roleKey}`, { defaultValue: shop.role })}
        </Tag>

        {/* Additional Info */}
        <div className="mt-3 text-xs text-stone-500 space-y-1">
          <div>{shop.currency}</div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Loading skeleton for shop cards
 */
function ShopCardSkeleton() {
  return (
    <Card skeleton loading skeletonRows={3} className="h-full">
      <div />
    </Card>
  );
}

/**
 * Shop Selection Page Component
 */
export default function ShopsPage() {
  const t = useTranslations('shop');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { activeShops, isLoading, isFetched, shopCount } = useShops();
  const setCurrentShop = useShopStore((state) => state.setCurrentShop);

  // Auto-redirect to dashboard if user has only one shop
  useEffect(() => {
    if (isFetched && shopCount === 1 && activeShops.length === 1) {
      const shop = activeShops[0];
      if (shop) {
        setCurrentShop(shop.id_shop);
        router.replace(`/${shop.id_shop}/dashboard`);
      }
    }
  }, [isFetched, shopCount, activeShops, setCurrentShop, router]);

  /**
   * Handle shop selection
   */
  const handleSelectShop = (shop: ShopWithRole) => {
    setCurrentShop(shop.id_shop);
    router.push(`/${shop.id_shop}/dashboard`);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-stone-900 mb-2">{t('selectShop')}</h1>
            <p className="text-stone-600">{tCommon('messages.loading')}</p>
          </div>

          {/* Loading Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <ShopCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show empty state for new users
  if (isFetched && activeShops.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center py-8 px-4">
        <div className="max-w-md w-full text-center">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-stone-900">{t('noShops')}</h2>
                <p className="text-stone-600">
                  Create your first shop to get started with managing your jewelry business.
                </p>
              </div>
            }
          >
            <Link href="/shops/new">
              <Button type="primary" size="large" icon={<PlusOutlined />}>
                {t('createShop')}
              </Button>
            </Link>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 mb-2">{t('selectShop')}</h1>
            <p className="text-stone-600">
              {shopCount} {shopCount === 1 ? 'shop' : 'shops'} available
            </p>
          </div>

          <Link href="/shops/new" className="mt-4 sm:mt-0">
            <Button type="primary" icon={<PlusOutlined />}>
              {t('createShop')}
            </Button>
          </Link>
        </div>

        {/* Shops Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeShops.map((shop) => (
            <ShopCard key={shop.id_shop} shop={shop} onClick={() => handleSelectShop(shop)} />
          ))}
        </div>
      </div>
    </div>
  );
}
