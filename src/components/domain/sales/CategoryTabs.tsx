'use client';

/**
 * CategoryTabs Component
 *
 * Horizontal scrollable tabs for quick category filtering in POS.
 * Touch-friendly with smooth scrolling and active state styling.
 *
 * Features:
 * - "All" tab first
 * - Horizontal scroll on overflow
 * - Active state with gold accent
 * - Optional item count badges
 * - Touch-friendly for mobile
 * - Keyboard navigation support
 *
 * @module components/domain/sales/CategoryTabs
 */

import React, { useRef, useCallback, useEffect } from 'react';

import { AppstoreOutlined } from '@ant-design/icons';
import { Badge, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';

import type { ProductCategory } from '@/lib/hooks/data/useCategories';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Category option for the tabs
 */
export interface CategoryOption {
  /** Unique category ID or 'all' */
  id: string;
  /** Display name */
  name: string;
  /** Optional item count for badge */
  count?: number;
}

/**
 * Props for the CategoryTabs component
 */
export interface CategoryTabsProps {
  /**
   * Array of categories to display
   */
  categories: ProductCategory[] | undefined;

  /**
   * Currently selected category ID ('all' for no filter)
   */
  selectedCategory: string;

  /**
   * Callback when category selection changes
   */
  onCategoryChange: (categoryId: string) => void;

  /**
   * Optional counts per category (map of categoryId -> count)
   */
  categoryCounts?: Record<string, number>;

  /**
   * Whether the categories are loading
   */
  isLoading?: boolean;

  /**
   * Whether to show count badges
   * @default false
   */
  showCounts?: boolean;

  /**
   * Size variant
   * @default 'default'
   */
  size?: 'small' | 'default';

  /**
   * Additional class name
   */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * CategoryTabs Component
 *
 * Horizontal scrollable category filter tabs for POS.
 */
export function CategoryTabs({
  categories,
  selectedCategory,
  onCategoryChange,
  categoryCounts,
  isLoading = false,
  showCounts = false,
  size = 'default',
  className,
}: CategoryTabsProps): JSX.Element {
  const t = useTranslations('common');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedTabRef = useRef<HTMLButtonElement>(null);

  // Build category options with "All" first
  const categoryOptions: CategoryOption[] = [
    {
      id: 'all',
      name: t('labels.all'),
      count: categoryCounts ? Object.values(categoryCounts).reduce((a, b) => a + b, 0) : undefined,
    },
    ...(categories?.map((cat) => ({
      id: cat.id_category,
      name: cat.category_name,
      count: categoryCounts?.[cat.id_category],
    })) || []),
  ];

  // Scroll selected tab into view
  useEffect(() => {
    if (selectedTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const tab = selectedTabRef.current;
      const containerRect = container.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();

      // Check if tab is out of view
      if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
        tab.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [selectedCategory]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let newIndex = currentIndex;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const direction = e.key === 'ArrowRight' ? 1 : -1;
        newIndex = (currentIndex + direction + categoryOptions.length) % categoryOptions.length;
        const newCategoryId = categoryOptions[newIndex]?.id;
        if (newCategoryId) {
          onCategoryChange(newCategoryId);
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        onCategoryChange('all');
      } else if (e.key === 'End' && categoryOptions.length > 0) {
        e.preventDefault();
        const lastCategory = categoryOptions[categoryOptions.length - 1];
        if (lastCategory) {
          onCategoryChange(lastCategory.id);
        }
      }
    },
    [categoryOptions, onCategoryChange]
  );

  // Size configurations
  const isSmall = size === 'small';
  const tabPadding = isSmall ? 'px-3 py-1.5' : 'px-4 py-2';
  const fontSize = isSmall ? 'text-xs' : 'text-sm';
  const iconSize = isSmall ? 'text-xs' : 'text-sm';
  const badgeSize = isSmall ? 'small' : 'default';

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex gap-2 overflow-hidden', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton.Button
            key={i}
            active
            size={isSmall ? 'small' : 'default'}
            style={{ width: 80, minWidth: 80 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        'flex gap-2 overflow-x-auto',
        // Hide scrollbar but keep functionality
        'scrollbar-hide',
        // Smooth scroll
        'scroll-smooth',
        // Padding for scroll shadows
        'px-1',
        className
      )}
      role="tablist"
      aria-label={t('labels.categories')}
    >
      {categoryOptions.map((category, index) => {
        const isSelected = selectedCategory === category.id;
        const isAll = category.id === 'all';

        const tabContent = (
          <button
            key={category.id}
            ref={isSelected ? selectedTabRef : undefined}
            role="tab"
            aria-selected={isSelected}
            aria-controls={`category-panel-${category.id}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onCategoryChange(category.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              // Base styles
              'flex items-center gap-1.5 whitespace-nowrap rounded-full',
              'font-medium transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
              tabPadding,
              fontSize,
              // State styles
              isSelected
                ? ['bg-amber-500 text-white shadow-md', 'hover:bg-amber-600']
                : ['bg-stone-100 text-stone-600', 'hover:bg-stone-200 hover:text-stone-800']
            )}
          >
            {/* "All" icon */}
            {isAll && <AppstoreOutlined className={iconSize} />}

            {/* Category name */}
            <span>{category.name}</span>
          </button>
        );

        // Wrap with badge if showing counts
        if (showCounts && category.count !== undefined) {
          return (
            <Badge
              key={category.id}
              count={category.count}
              size={badgeSize}
              offset={[-4, 4]}
              overflowCount={99}
              style={{
                backgroundColor: isSelected ? '#fff' : '#f59e0b',
                color: isSelected ? '#f59e0b' : '#fff',
                fontSize: '10px',
                fontWeight: 600,
              }}
            >
              {tabContent}
            </Badge>
          );
        }

        return tabContent;
      })}
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

/**
 * Loading skeleton for CategoryTabs
 */
export function CategoryTabsSkeleton({
  count = 5,
  size = 'default',
}: {
  count?: number;
  size?: 'small' | 'default';
}): JSX.Element {
  const isSmall = size === 'small';

  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton.Button
          key={i}
          active
          size={isSmall ? 'small' : 'default'}
          style={{
            width: i === 0 ? 60 : 80 + Math.random() * 30,
            minWidth: 60,
            borderRadius: 20,
          }}
        />
      ))}
    </div>
  );
}

export default CategoryTabs;
