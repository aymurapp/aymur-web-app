'use client';

/**
 * Inventory Page
 *
 * Main inventory listing page with card grid layout and infinite scroll.
 * Displays all inventory items for the current shop with filtering,
 * search, and quick actions.
 *
 * Features:
 * - Responsive card grid (1-2-3-4 columns based on screen width)
 * - Infinite scroll for loading more items
 * - Collapsible filter panel
 * - Search with debounce
 * - Empty state handling
 * - FAB for quick add on mobile
 * - Selection mode support
 *
 * @module app/(platform)/[locale]/[shopId]/inventory/page
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  PlusOutlined,
  FilterOutlined,
  SearchOutlined,
  AppstoreOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Input, Badge, Spin, FloatButton, Tooltip, Typography, Space } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { FilterPanel, type FilterConfig } from '@/components/common/data/FilterPanel';
import { ItemCard, ItemCardSkeleton } from '@/components/domain/inventory/ItemCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useCategories } from '@/lib/hooks/data/useCategories';
import { useInventoryFilters } from '@/lib/hooks/data/useInventoryFilters';
import {
  useInventoryItemsInfinite,
  type InventoryItemWithRelations,
} from '@/lib/hooks/data/useInventoryItems';
import { useMetalTypes, useMetalPurities } from '@/lib/hooks/data/useMetals';
import { useStoneTypes } from '@/lib/hooks/data/useStones';
import { usePermissions } from '@/lib/hooks/permissions';
import { useDebounce } from '@/lib/hooks/utils/useDebounce';
import { useMobile } from '@/lib/hooks/utils/useMediaQuery';
import { useRouter } from '@/lib/i18n/navigation';
import { isRtlLocale, type Locale } from '@/lib/i18n/routing';
import { useShopStore } from '@/stores/shopStore';

const { Text } = Typography;

// =============================================================================
// CONSTANTS
// =============================================================================

/** Number of skeleton cards to show during initial loading */
const SKELETON_COUNT = 8;

/** Debounce delay for search input in milliseconds */
const SEARCH_DEBOUNCE_MS = 300;

/** Intersection observer threshold for infinite scroll */
const INFINITE_SCROLL_THRESHOLD = 0.1;

/** Page size for infinite scroll */
const PAGE_SIZE = 20;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Status options for the filter panel
 */
const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Sold' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'returned', label: 'Returned' },
  { value: 'consignment', label: 'Consignment' },
];

/**
 * Item type options for the filter panel
 */
const ITEM_TYPE_OPTIONS = [
  { value: 'finished', label: 'Finished Product' },
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'component', label: 'Component' },
  { value: 'packaging', label: 'Packaging' },
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Search Input Component
 */
function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <Input
      prefix={<SearchOutlined className="text-stone-400" />}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      allowClear
      className="w-full sm:w-64"
    />
  );
}

/**
 * Item Count Display
 */
function ItemCount({
  totalCount,
  selectedCount,
  isSelectionMode,
}: {
  totalCount: number;
  selectedCount: number;
  isSelectionMode: boolean;
}) {
  const t = useTranslations('inventory');

  if (isSelectionMode && selectedCount > 0) {
    return (
      <Text type="secondary" className="text-sm">
        {selectedCount} {t('items')} selected
      </Text>
    );
  }

  return (
    <Text type="secondary" className="text-sm">
      {totalCount} {t('items')}
    </Text>
  );
}

/**
 * Skeleton Grid for Loading State
 */
function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <ItemCardSkeleton key={`skeleton-${index}`} />
      ))}
    </div>
  );
}

/**
 * Item Grid Component
 */
function ItemGrid({
  items,
  selectedItems,
  onItemClick,
  onQuickAction,
}: {
  items: InventoryItemWithRelations[];
  selectedItems: Set<string>;
  onItemClick: (item: InventoryItemWithRelations) => void;
  onQuickAction: (action: 'edit' | 'reserve' | 'sell', item: InventoryItemWithRelations) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <ItemCard
          key={item.id_item}
          item={item}
          selected={selectedItems.has(item.id_item)}
          onClick={onItemClick}
          onQuickAction={onQuickAction}
        />
      ))}
    </div>
  );
}

/**
 * Infinite Scroll Sentinel
 */
function InfiniteScrollSentinel({
  onIntersect,
  isLoading,
}: {
  onIntersect: () => void;
  isLoading: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !isLoading) {
          onIntersect();
        }
      },
      { threshold: INFINITE_SCROLL_THRESHOLD }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [onIntersect, isLoading]);

  return (
    <div ref={sentinelRef} className="h-10 flex items-center justify-center mt-4">
      {isLoading && <Spin size="default" />}
    </div>
  );
}

/**
 * Mobile FAB for Quick Add
 */
function MobileAddFAB({ onClick }: { onClick: () => void }) {
  const t = useTranslations('inventory');
  const locale = useLocale() as Locale;
  const isRtl = isRtlLocale(locale);

  return (
    <FloatButton
      type="primary"
      icon={<PlusOutlined />}
      tooltip={t('addItem')}
      onClick={onClick}
      style={{
        [isRtl ? 'left' : 'right']: 24,
        [isRtl ? 'right' : 'left']: 'auto',
        bottom: 90, // Above the main FAB
      }}
      className="shadow-lg md:hidden"
    />
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Inventory Page Component
 *
 * Displays inventory items in a responsive card grid with:
 * - Infinite scroll pagination
 * - Search and filtering
 * - Quick actions on items
 * - Selection mode for bulk operations
 * - Mobile-optimized FAB
 */
export default function InventoryPage(): JSX.Element {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { can } = usePermissions();
  const currentShopId = useShopStore((state) => state.currentShopId);
  const isMobile = useMobile();

  // ==========================================================================
  // STATE
  // ==========================================================================

  // Search state with debounce
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);

  // Filter panel visibility
  const [showFilters, setShowFilters] = useState(false);

  // Selection mode
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Filter state
  const { filters, setFilters, resetFilters, hasActiveFilters, activeFilterCount } =
    useInventoryFilters({
      syncWithUrl: true,
      defaultPageSize: PAGE_SIZE,
    });

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  // Catalog data for filter options
  const { data: categories } = useCategories({ enabled: showFilters });
  const { data: metalTypes } = useMetalTypes({ enabled: showFilters });
  const { data: metalPurities } = useMetalPurities({ enabled: showFilters });
  const { data: stoneTypes } = useStoneTypes({ enabled: showFilters });

  // Inventory items with infinite scroll
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error } =
    useInventoryItemsInfinite({
      ...filters,
      search: debouncedSearch || undefined,
      page_size: PAGE_SIZE,
      realtime: true,
    });

  // Flatten pages into items array
  const items = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data?.pages]);

  // Get total count from first page
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // ==========================================================================
  // FILTER CONFIGURATION
  // ==========================================================================

  // Build filter config for FilterPanel
  const filterConfig: FilterConfig[] = useMemo(() => {
    const config: FilterConfig[] = [
      {
        key: 'status',
        label: tCommon('labels.status'),
        type: 'select',
        mode: 'multiple',
        options: STATUS_OPTIONS.map((opt) => ({
          ...opt,
          label: t(opt.value as Parameters<typeof t>[0]),
        })),
      },
      {
        key: 'item_type',
        label: tCommon('labels.type'),
        type: 'select',
        mode: 'multiple',
        options: ITEM_TYPE_OPTIONS,
      },
      {
        key: 'id_category',
        label: tCommon('labels.category'),
        type: 'select',
        mode: 'multiple',
        options:
          categories?.map((cat) => ({
            value: cat.id_category,
            label: cat.category_name,
          })) ?? [],
      },
      {
        key: 'id_metal_type',
        label: t('metals.title'),
        type: 'select',
        mode: 'multiple',
        options:
          metalTypes?.map((mt) => ({
            value: mt.id_metal_type,
            label: mt.metal_name,
          })) ?? [],
      },
      {
        key: 'id_metal_purity',
        label: t('metals.purity'),
        type: 'select',
        mode: 'multiple',
        options:
          metalPurities?.map((mp) => ({
            value: mp.id_purity,
            label: mp.purity_name,
          })) ?? [],
      },
      {
        key: 'id_stone_type',
        label: t('stones.type'),
        type: 'select',
        mode: 'multiple',
        options:
          stoneTypes?.map((st) => ({
            value: st.id_stone_type,
            label: st.stone_name,
          })) ?? [],
      },
    ];

    return config;
  }, [t, tCommon, categories, metalTypes, metalPurities, stoneTypes]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  // Handle item click
  const handleItemClick = useCallback(
    (item: InventoryItemWithRelations) => {
      if (isSelectionMode) {
        setSelectedItems((prev) => {
          const next = new Set(prev);
          if (next.has(item.id_item)) {
            next.delete(item.id_item);
          } else {
            next.add(item.id_item);
          }
          return next;
        });
      } else {
        // Navigate to item detail
        router.push(`/${currentShopId}/inventory/items/${item.id_item}`);
      }
    },
    [isSelectionMode, currentShopId, router]
  );

  // Handle quick actions
  const handleQuickAction = useCallback(
    (action: 'edit' | 'reserve' | 'sell', item: InventoryItemWithRelations) => {
      switch (action) {
        case 'edit':
          router.push(`/${currentShopId}/inventory/items/${item.id_item}/edit`);
          break;
        case 'sell':
          // Navigate to POS with item pre-selected
          router.push(`/${currentShopId}/pos?item=${item.id_item}`);
          break;
        case 'reserve':
          // TODO: Open reserve modal
          console.log('Reserve item:', item.id_item);
          break;
      }
    },
    [currentShopId, router]
  );

  // Handle add new item
  const handleAddItem = useCallback(() => {
    router.push(`/${currentShopId}/inventory/items/new`);
  }, [currentShopId, router]);

  // Handle filter change from FilterPanel
  const handleFilterChange = useCallback(
    (values: Record<string, unknown>) => {
      setFilters(values as Partial<typeof filters>);
    },
    [setFilters]
  );

  // Handle infinite scroll
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Error state
  if (isError) {
    return (
      <div className="inventory-page">
        <PageHeader title={t('title')} />
        <EmptyState
          title={tCommon('messages.error')}
          description={error?.message || tCommon('messages.unexpectedError')}
          action={{
            label: tCommon('messages.tryAgain'),
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  return (
    <div className="inventory-page">
      {/* Page Header */}
      <PageHeader title={t('title')}>
        <Space wrap>
          {/* Item Count */}
          <ItemCount
            totalCount={totalCount}
            selectedCount={selectedItems.size}
            isSelectionMode={isSelectionMode}
          />

          {/* Search Input - Hidden on very small screens */}
          <div className="hidden sm:block">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder={t('select.placeholder')}
            />
          </div>

          {/* Filter Toggle */}
          <Tooltip title={tCommon('actions.filter')}>
            <Badge count={activeFilterCount} size="small" offset={[-4, 4]}>
              <Button
                type={showFilters ? 'primary' : 'default'}
                icon={<FilterOutlined />}
                onClick={() => setShowFilters(!showFilters)}
              />
            </Badge>
          </Tooltip>

          {/* Add Item Button - Desktop only */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddItem}
            permission="inventory.create"
            className="hidden md:inline-flex"
          >
            {t('addItem')}
          </Button>

          {/* Clear Selection - Only in selection mode */}
          {isSelectionMode && (
            <Button type="text" icon={<CloseOutlined />} onClick={handleClearSelection}>
              {tCommon('actions.clear')}
            </Button>
          )}
        </Space>
      </PageHeader>

      {/* Mobile Search - Visible only on small screens */}
      <div className="block sm:hidden mb-4">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder={t('select.placeholder')}
        />
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-4">
          <FilterPanel
            filters={filterConfig}
            values={filters as Record<string, unknown>}
            onChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && !showFilters && (
        <div className="mb-4 flex items-center gap-2">
          <Text type="secondary" className="text-sm">
            {activeFilterCount} {tCommon('actions.filter').toLowerCase()}(s) active
          </Text>
          <Button type="link" size="small" onClick={resetFilters} className="px-0">
            {tCommon('actions.clear')}
          </Button>
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        // Initial loading state
        <SkeletonGrid count={SKELETON_COUNT} />
      ) : items.length === 0 ? (
        // Empty state
        <EmptyState
          icon={<AppstoreOutlined />}
          title={
            debouncedSearch || hasActiveFilters
              ? tCommon('messages.noResults')
              : tCommon('messages.noItems')
          }
          description={debouncedSearch || hasActiveFilters ? undefined : t('addItem')}
          action={
            debouncedSearch || hasActiveFilters
              ? {
                  label: tCommon('actions.clear'),
                  onClick: () => {
                    setSearchInput('');
                    resetFilters();
                  },
                }
              : can('inventory.create')
                ? {
                    label: t('addItem'),
                    onClick: handleAddItem,
                    permission: 'inventory.create',
                  }
                : undefined
          }
          size="lg"
          className="py-16"
        />
      ) : (
        // Item grid with infinite scroll
        <>
          <ItemGrid
            items={items}
            selectedItems={selectedItems}
            onItemClick={handleItemClick}
            onQuickAction={handleQuickAction}
          />

          {/* Infinite Scroll Sentinel */}
          {hasNextPage && (
            <InfiniteScrollSentinel onIntersect={handleLoadMore} isLoading={isFetchingNextPage} />
          )}

          {/* End of list indicator */}
          {!hasNextPage && items.length > 0 && (
            <div className="text-center py-8">
              <Text type="secondary" className="text-sm">
                {tCommon('pagination.showing', {
                  from: 1,
                  to: items.length,
                  total: totalCount,
                })}
              </Text>
            </div>
          )}
        </>
      )}

      {/* Mobile FAB for Quick Add */}
      {can('inventory.create') && isMobile && <MobileAddFAB onClick={handleAddItem} />}
    </div>
  );
}
