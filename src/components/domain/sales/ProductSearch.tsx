'use client';

/**
 * ProductSearch Component
 *
 * Main product search grid for the POS page left panel.
 * Provides comprehensive search and filtering for quick item selection.
 *
 * Features:
 * - Search input with barcode icon (hardware scanner support)
 * - Category filter tabs
 * - Advanced filters (collapsible)
 * - Responsive grid layout (2-4 columns)
 * - Click to add to cart with visual feedback
 * - Infinite scroll / pagination
 * - Empty state for no results
 * - Loading skeleton
 * - Keyboard shortcuts (Enter to add first item)
 *
 * @module components/domain/sales/ProductSearch
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SearchOutlined, CloseOutlined, FilterOutlined } from '@ant-design/icons';
import { Input, Tag, Spin, message } from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { Button } from '@/components/ui/Button';
import { useCategories } from '@/lib/hooks/data/useCategories';
import {
  useInventoryItems,
  type InventoryItemWithRelations,
} from '@/lib/hooks/data/useInventoryItems';
import { useShop } from '@/lib/hooks/shop';
import { useDebounce } from '@/lib/hooks/utils/useDebounce';
import { cn } from '@/lib/utils/cn';
import { useCartStore } from '@/stores/cartStore';

import { CategoryTabs, CategoryTabsSkeleton } from './CategoryTabs';
import { ProductSearchFilters, type ProductFilters } from './ProductSearchFilters';
import { ProductSearchItem, ProductSearchItemSkeleton } from './ProductSearchItem';

import type { InputRef } from 'antd';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the ProductSearch component
 */
export interface ProductSearchProps {
  /**
   * Callback when an item is added to cart
   */
  onItemAdd?: (item: InventoryItemWithRelations) => void;

  /**
   * Whether to show advanced filters
   * @default true
   */
  showFilters?: boolean;

  /**
   * Whether to show category tabs
   * @default true
   */
  showCategories?: boolean;

  /**
   * Number of columns in the grid (responsive)
   * @default { mobile: 2, tablet: 3, desktop: 4 }
   */
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };

  /**
   * Page size for pagination
   * @default 12
   */
  pageSize?: number;

  /**
   * Whether to use infinite scroll
   * @default false
   */
  infiniteScroll?: boolean;

  /**
   * Size variant
   * @default 'default'
   */
  size?: 'small' | 'default';

  /**
   * Additional class name
   */
  className?: string;

  /**
   * Input ref for external focus control
   */
  inputRef?: React.RefObject<HTMLInputElement | null>;

  /**
   * Whether to enable real-time updates
   * @default false
   */
  realtime?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Debounce delay for search input */
const SEARCH_DEBOUNCE_MS = 300;

/** Default page size */
const DEFAULT_PAGE_SIZE = 12;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ProductSearch Component
 *
 * Comprehensive product search grid for POS with filtering and cart integration.
 */
export function ProductSearch({
  onItemAdd,
  showFilters = true,
  showCategories = true,
  columns = { mobile: 2, tablet: 3, desktop: 4 },
  pageSize = DEFAULT_PAGE_SIZE,
  infiniteScroll = false,
  size = 'default',
  className,
  inputRef: externalInputRef,
  realtime = false,
}: ProductSearchProps): JSX.Element {
  const t = useTranslations();

  // Shop context
  const { shop } = useShop();
  const currency = shop?.currency || 'USD';

  // Cart store
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);

  // Internal refs
  const internalInputRef = useRef<InputRef>(null);
  const searchInputRef = externalInputRef || internalInputRef;
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // STATE
  // ==========================================================================

  // Search state
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState<ProductFilters>({});
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  // Categories
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  // Build query filters
  const queryFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: ['available'] as (
        | 'available'
        | 'reserved'
        | 'sold'
        | 'workshop'
        | 'transferred'
        | 'damaged'
        | 'returned'
      )[],
      id_category: selectedCategory !== 'all' ? [selectedCategory] : undefined,
      id_metal_type: advancedFilters.metalTypes,
      id_metal_purity: advancedFilters.metalPurities,
      price_range: advancedFilters.priceRange
        ? { min: advancedFilters.priceRange[0], max: advancedFilters.priceRange[1] }
        : undefined,
      weight_range: advancedFilters.weightRange
        ? { min: advancedFilters.weightRange[0], max: advancedFilters.weightRange[1] }
        : undefined,
      page,
      page_size: pageSize,
      sort_by: 'item_name' as const,
      sort_order: 'asc' as const,
      realtime,
    }),
    [debouncedSearch, selectedCategory, advancedFilters, page, pageSize, realtime]
  );

  // Inventory items query
  const {
    items: products,
    totalCount,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    isLoading: productsLoading,
    isFetching,
  } = useInventoryItems(queryFilters);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory, advancedFilters]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle adding item to cart
   */
  const handleAddToCart = useCallback(
    (item: InventoryItemWithRelations) => {
      // Check if already in cart
      const isInCart = cartItems.some((ci) => ci.itemId === item.id_item);
      if (isInCart) {
        message.warning(t('sales.itemAlreadyInCart'));
        return;
      }

      // Add to cart
      addItem({
        itemId: item.id_item,
        name: item.item_name || t('common.labels.untitled'),
        sku: item.sku || '-',
        barcode: item.barcode || undefined,
        price: (item as { selling_price?: number }).selling_price || item.purchase_price || 0,
        quantity: 1,
        weight: item.weight_grams || undefined,
        metalType: item.metal_type?.metal_name,
        purity: item.metal_purity?.purity_name,
        category: item.category?.category_name,
        imageUrl: (item as { image_url?: string }).image_url || undefined,
      });

      // Show feedback
      message.success(t('sales.itemAdded'));

      // Call external callback
      onItemAdd?.(item);
    },
    [addItem, cartItems, onItemAdd, t]
  );

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  /**
   * Clear search input
   */
  const handleSearchClear = useCallback(() => {
    setSearchInput('');
    searchInputRef.current?.focus();
  }, [searchInputRef]);

  /**
   * Handle category change
   */
  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  /**
   * Handle advanced filters change
   */
  const handleFiltersChange = useCallback((filters: ProductFilters) => {
    setAdvancedFilters(filters);
  }, []);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Enter to add first visible item
      if (e.key === 'Enter' && products.length > 0) {
        const firstAvailable = products.find(
          (p) => !cartItems.some((ci) => ci.itemId === p.id_item)
        );
        if (firstAvailable) {
          e.preventDefault();
          handleAddToCart(firstAvailable);
        }
      }
      // Escape to clear search
      else if (e.key === 'Escape' && searchInput) {
        e.preventDefault();
        handleSearchClear();
      }
    },
    [products, cartItems, handleAddToCart, searchInput, handleSearchClear]
  );

  /**
   * Handle page change
   */
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    gridContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ==========================================================================
  // COMPUTED
  // ==========================================================================

  // Check if item is in cart
  const isItemInCart = useCallback(
    (itemId: string) => cartItems.some((ci) => ci.itemId === itemId),
    [cartItems]
  );

  // Grid column classes
  const gridColumns = useMemo(() => {
    const { mobile = 2, tablet = 3, desktop = 4 } = columns;
    return cn(
      `grid-cols-${mobile}`,
      `sm:grid-cols-${Math.min(mobile + 1, tablet)}`,
      `md:grid-cols-${tablet}`,
      `lg:grid-cols-${Math.min(tablet + 1, desktop)}`,
      `xl:grid-cols-${desktop}`
    );
  }, [columns]);

  // Size configurations
  const isSmall = size === 'small';
  const inputSize = isSmall ? 'middle' : 'large';
  const gap = isSmall ? 'gap-2' : 'gap-3';

  // Has active filters
  const hasActiveFilters =
    !!advancedFilters.metalTypes?.length ||
    !!advancedFilters.metalPurities?.length ||
    !!advancedFilters.priceRange ||
    !!advancedFilters.weightRange;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search Header */}
      <div
        className={cn('space-y-3', isSmall ? 'p-2' : 'p-4', 'bg-white border-b border-stone-200')}
      >
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            ref={searchInputRef as React.RefObject<InputRef>}
            prefix={<SearchOutlined className="text-stone-400" />}
            suffix={
              searchInput ? (
                <CloseOutlined
                  className="text-stone-400 cursor-pointer hover:text-stone-600 transition-colors"
                  onClick={handleSearchClear}
                />
              ) : (
                <Tag className="text-xs m-0">F2</Tag>
              )
            }
            placeholder={t('inventory.search')}
            value={searchInput}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            size={inputSize}
            className="flex-1"
            allowClear={false}
            data-barcode-input
          />

          {/* Filter Toggle Button (when filters not inline) */}
          {showFilters && !filtersExpanded && (
            <Button
              type={hasActiveFilters ? 'primary' : 'default'}
              size={inputSize}
              icon={<FilterOutlined />}
              onClick={() => setFiltersExpanded(true)}
              className={hasActiveFilters ? '' : 'text-stone-500'}
            />
          )}
        </div>

        {/* Category Tabs */}
        {showCategories &&
          (categoriesLoading ? (
            <CategoryTabsSkeleton size={size} />
          ) : (
            <CategoryTabs
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              size={size}
            />
          ))}

        {/* Advanced Filters */}
        {showFilters && (
          <ProductSearchFilters
            filters={advancedFilters}
            onFiltersChange={handleFiltersChange}
            metalTypes={[]} // TODO: Fetch from useMetalTypes hook
            metalPurities={[]} // TODO: Fetch from useMetalPurities hook
            expanded={filtersExpanded}
            onExpandedChange={setFiltersExpanded}
            currency={currency}
            size={size}
          />
        )}
      </div>

      {/* Products Grid */}
      <div
        ref={gridContainerRef}
        className={cn('flex-1 overflow-auto', isSmall ? 'p-2' : 'p-4', 'bg-stone-50')}
      >
        {/* Loading State */}
        {productsLoading ? (
          <div className={cn('grid', gridColumns, gap)}>
            {Array.from({ length: pageSize }).map((_, i) => (
              <ProductSearchItemSkeleton key={i} size={size} />
            ))}
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <EmptyState
            title={debouncedSearch ? t('common.messages.noResults') : t('inventory.noItems')}
            description={
              debouncedSearch
                ? t('common.messages.tryDifferentSearch')
                : t('inventory.noItemsDescription')
            }
            size={isSmall ? 'sm' : 'md'}
            action={
              debouncedSearch
                ? {
                    label: t('common.actions.clearSearch'),
                    onClick: handleSearchClear,
                    type: 'default',
                  }
                : undefined
            }
          />
        ) : (
          /* Products Grid */
          <>
            <div className={cn('grid', gridColumns, gap)}>
              {products.map((item) => (
                <ProductSearchItem
                  key={item.id_item}
                  item={item}
                  currency={currency}
                  onAdd={handleAddToCart}
                  inCart={isItemInCart(item.id_item)}
                  size={size}
                />
              ))}
            </div>

            {/* Loading indicator for fetching */}
            {isFetching && !productsLoading && (
              <div className="flex justify-center py-4">
                <Spin size="small" />
              </div>
            )}

            {/* Pagination */}
            {!infiniteScroll && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-stone-200">
                <Button
                  type="default"
                  size="small"
                  disabled={!hasPreviousPage}
                  onClick={() => handlePageChange(page - 1)}
                >
                  {t('common.actions.previous')}
                </Button>

                <span className="text-sm text-stone-500 px-3">
                  {t('common.labels.page')} {page} / {totalPages}
                </span>

                <Button
                  type="default"
                  size="small"
                  disabled={!hasNextPage}
                  onClick={() => handlePageChange(page + 1)}
                >
                  {t('common.actions.next')}
                </Button>
              </div>
            )}

            {/* Results count */}
            <div className="text-center text-xs text-stone-400 mt-2">
              {t('common.labels.showing')} {products.length} {t('common.labels.of')} {totalCount}{' '}
              {t('common.labels.items')}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

/**
 * Loading skeleton for ProductSearch
 */
export function ProductSearchSkeleton({
  size = 'default',
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  size?: 'small' | 'default';
  pageSize?: number;
}): JSX.Element {
  const isSmall = size === 'small';
  const gap = isSmall ? 'gap-2' : 'gap-3';

  return (
    <div className="flex flex-col h-full">
      {/* Header Skeleton */}
      <div
        className={cn('space-y-3', isSmall ? 'p-2' : 'p-4', 'bg-white border-b border-stone-200')}
      >
        <div className="h-10 bg-stone-200 rounded animate-pulse" />
        <CategoryTabsSkeleton size={size} />
      </div>

      {/* Grid Skeleton */}
      <div className={cn('flex-1 overflow-hidden', isSmall ? 'p-2' : 'p-4', 'bg-stone-50')}>
        <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4', gap)}>
          {Array.from({ length: pageSize }).map((_, i) => (
            <ProductSearchItemSkeleton key={i} size={size} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProductSearch;
