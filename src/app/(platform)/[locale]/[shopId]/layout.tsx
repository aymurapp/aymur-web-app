'use client';

/**
 * Shop Layout
 *
 * This layout wraps all pages within a specific shop context.
 * It provides:
 * - Sidebar + main content structure
 * - Shop access validation
 * - Shop context initialization
 * - Responsive layout (sidebar collapses on mobile)
 */

import React, { useEffect, useState } from 'react';

import { useParams } from 'next/navigation';

import { Layout, Spin, Result, Button } from 'antd';
import { useTranslations } from 'next-intl';

import { BreadcrumbProvider } from '@/components/layout/Breadcrumbs';
import { FAB } from '@/components/layout/FAB';
import { Header, HEADER_HEIGHT } from '@/components/layout/Header';
import { Sidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '@/components/layout/Sidebar';
import { useShopAccess } from '@/lib/hooks/shop/useShopAccess';
import { Link } from '@/lib/i18n/navigation';
import { useShopStore } from '@/stores/shopStore';
import { useUIStore } from '@/stores/uiStore';

const { Content } = Layout;

// =============================================================================
// TYPES
// =============================================================================

interface ShopLayoutProps {
  children: React.ReactNode;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to detect mobile viewport
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < 1024);
    };

    // Check on mount
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Loading State Component
 */
function LoadingState(): JSX.Element {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950">
      <div className="text-center">
        <Spin size="large" />
        <p className="mt-4 text-stone-500 dark:text-stone-400">{t('common.messages.loading')}</p>
      </div>
    </div>
  );
}

/**
 * Access Denied Component
 */
function AccessDenied(): JSX.Element {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950">
      <Result
        status="403"
        title={t('errors.unauthorized.title')}
        subTitle={t('errors.unauthorized.message')}
        extra={
          <Link href="/shops">
            <Button type="primary">{t('shop.selectShop')}</Button>
          </Link>
        }
      />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Shop Layout Component
 *
 * Provides the main application shell with:
 * - Fixed sidebar (collapsible)
 * - Sticky header
 * - Main content area
 * - Floating action button
 *
 * Validates user has access to the current shop before rendering.
 */
export default function ShopLayout({ children }: ShopLayoutProps): JSX.Element {
  const params = useParams();
  const shopId = params?.shopId as string;

  // Store hooks
  const { setCurrentShop } = useShopStore();
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);

  // Shop access validation
  const { isLoading, isActive } = useShopAccess(shopId);

  // Mobile detection
  const isMobile = useIsMobile();

  // Mobile drawer state (separate from collapse)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Sync shopId with store
  useEffect(() => {
    if (shopId) {
      setCurrentShop(shopId);
    }
  }, [shopId, setCurrentShop]);

  // Close mobile drawer on navigation
  const handleMobileClose = (): void => {
    setMobileDrawerOpen(false);
  };

  // Toggle mobile drawer
  const handleMobileToggle = (): void => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Access denied
  if (!isActive && !isLoading) {
    return <AccessDenied />;
  }

  // Calculate content margin based on sidebar state
  const contentMarginStart = isMobile
    ? 0
    : sidebarCollapsed
      ? SIDEBAR_COLLAPSED_WIDTH
      : SIDEBAR_WIDTH;

  return (
    <BreadcrumbProvider>
      <Layout className="min-h-screen bg-stone-50 dark:bg-stone-950">
        {/* Desktop Sidebar */}
        {!isMobile && <Sidebar />}

        {/* Mobile Drawer Sidebar */}
        {isMobile && <Sidebar isMobile onMobileClose={handleMobileClose} />}

        {/* Main Layout */}
        <Layout
          className="transition-all duration-300"
          style={{
            marginInlineStart: contentMarginStart,
          }}
        >
          {/* Header */}
          <Header showMobileMenu={isMobile} onMobileMenuToggle={handleMobileToggle} />

          {/* Content */}
          <Content
            className="p-4 sm:p-6 overflow-auto"
            style={{
              minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
            }}
          >
            {children}
          </Content>
        </Layout>

        {/* Floating Action Button */}
        <FAB />
      </Layout>
    </BreadcrumbProvider>
  );
}
