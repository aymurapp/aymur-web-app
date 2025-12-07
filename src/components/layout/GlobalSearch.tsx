'use client';

/**
 * GlobalSearch Component
 *
 * Global search input with keyboard shortcut support (Cmd/Ctrl + K).
 * Opens a search modal/dropdown for platform-wide search.
 *
 * Features:
 * - Search input in header
 * - Cmd/Ctrl + K keyboard shortcut
 * - Modal search overlay with results area
 * - Placeholder implementation (no actual search yet)
 * - Recent searches display
 * - RTL support using CSS logical properties
 *
 * @module components/layout/GlobalSearch
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { SearchOutlined, CloseOutlined, HistoryOutlined } from '@ant-design/icons';
import { Input, Modal, Empty, Typography, Divider, Tag, Spin } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';

import type { InputRef } from 'antd';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface GlobalSearchProps {
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Additional CSS class name for the trigger input */
  className?: string;
}

interface SearchCategory {
  key: string;
  label: string;
  icon: React.ReactNode;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Search categories for filtering results
 */
const SEARCH_CATEGORIES: SearchCategory[] = [
  { key: 'all', label: 'All', icon: <SearchOutlined /> },
  { key: 'inventory', label: 'Inventory', icon: <SearchOutlined /> },
  { key: 'customers', label: 'Customers', icon: <SearchOutlined /> },
  { key: 'orders', label: 'Orders', icon: <SearchOutlined /> },
];

/**
 * Example recent searches (placeholder data)
 */
const RECENT_SEARCHES = ['Gold ring 18K', 'Diamond necklace', 'Customer John Doe', 'Order #1234'];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Keyboard Shortcut Badge
 */
function ShortcutBadge(): React.JSX.Element {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  return (
    <div className="hidden sm:flex items-center gap-1 text-stone-400">
      <kbd className="px-1.5 py-0.5 text-xs font-mono bg-stone-100 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700">
        {isMac ? 'cmd' : 'Ctrl'}
      </kbd>
      <kbd className="px-1.5 py-0.5 text-xs font-mono bg-stone-100 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700">
        K
      </kbd>
    </div>
  );
}

/**
 * Search Results Empty State
 */
function SearchEmptyState({
  query,
  t,
}: {
  query: string;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  if (query) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={<Text type="secondary">{t('common.messages.noResults')}</Text>}
      />
    );
  }

  return (
    <div className="text-center py-8">
      <SearchOutlined className="text-4xl text-stone-300 dark:text-stone-600 mb-4" />
      <Text type="secondary" className="block">
        {t('search.placeholder')}
      </Text>
    </div>
  );
}

/**
 * Recent Searches Section
 */
function RecentSearches({
  searches,
  onSelect,
  onClear,
  t,
}: {
  searches: string[];
  onSelect: (query: string) => void;
  onClear: () => void;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element | null {
  if (searches.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <Text type="secondary" className="text-sm font-medium">
          {t('search.recent')}
        </Text>
        <button
          onClick={onClear}
          className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
        >
          {t('common.actions.clear')}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {searches.map((search, index) => (
          <Tag
            key={index}
            icon={<HistoryOutlined />}
            className="cursor-pointer hover:border-amber-400 transition-colors"
            onClick={() => onSelect(search)}
          >
            {search}
          </Tag>
        ))}
      </div>
    </div>
  );
}

/**
 * Search Modal Content
 */
function SearchModalContent({
  query,
  setQuery,
  isSearching,
  recentSearches,
  onSelectRecent,
  onClearRecent,
  inputRef,
  t,
}: {
  query: string;
  setQuery: (query: string) => void;
  isSearching: boolean;
  recentSearches: string[];
  onSelectRecent: (query: string) => void;
  onClearRecent: () => void;
  inputRef: React.RefObject<InputRef>;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  return (
    <div className="global-search-modal">
      {/* Search Input */}
      <div className="mb-4">
        <Input
          ref={inputRef}
          size="large"
          placeholder={t('search.placeholder')}
          prefix={
            isSearching ? <Spin size="small" /> : <SearchOutlined className="text-stone-400" />
          }
          suffix={
            query && (
              <CloseOutlined
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
                onClick={() => setQuery('')}
              />
            )
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg"
          autoFocus
        />
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {SEARCH_CATEGORIES.map((category) => (
          <Tag
            key={category.key}
            className={cn(
              'cursor-pointer transition-colors',
              category.key === 'all'
                ? 'bg-amber-50 border-amber-400 text-amber-700'
                : 'hover:border-amber-400'
            )}
          >
            {category.label}
          </Tag>
        ))}
      </div>

      <Divider className="!my-3" />

      {/* Results Area */}
      <div className="min-h-48 max-h-96 overflow-y-auto">
        {!query && (
          <RecentSearches
            searches={recentSearches}
            onSelect={onSelectRecent}
            onClear={onClearRecent}
            t={t}
          />
        )}

        <SearchEmptyState query={query} t={t} />
      </div>

      {/* Footer Hint */}
      <Divider className="!my-3" />
      <div className="flex items-center justify-between text-xs text-stone-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px]">
              Enter
            </kbd>
            <span>{t('search.toSelect')}</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px]">
              Esc
            </kbd>
            <span>{t('search.toClose')}</span>
          </span>
        </div>
        <Text type="secondary" className="text-xs">
          {t('search.poweredBy')}
        </Text>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * GlobalSearch Component
 *
 * Global search trigger with keyboard shortcut support.
 * Opens a modal for platform-wide searching.
 *
 * @example
 * // Basic usage
 * <GlobalSearch />
 *
 * @example
 * // With custom placeholder
 * <GlobalSearch placeholder="Search inventory..." />
 */
export function GlobalSearch({ placeholder, className }: GlobalSearchProps): React.JSX.Element {
  const t = useTranslations();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(RECENT_SEARCHES);

  const inputRef = useRef<InputRef>(null);

  // Handle keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle modal close
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  // Handle selecting a recent search
  const handleSelectRecent = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, []);

  // Handle clearing recent searches
  const handleClearRecent = useCallback(() => {
    setRecentSearches([]);
  }, []);

  return (
    <>
      {/* Search Trigger Input */}
      <div
        className={cn('relative cursor-pointer hidden sm:block', className)}
        onClick={() => setIsOpen(true)}
      >
        <Input
          placeholder={placeholder ?? t('common.actions.search')}
          prefix={<SearchOutlined className="text-stone-400" />}
          suffix={<ShortcutBadge />}
          className="max-w-xs cursor-pointer"
          size="middle"
          readOnly
        />
      </div>

      {/* Mobile Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="sm:hidden p-2 text-stone-600 dark:text-stone-300 hover:text-amber-600"
        aria-label={t('common.actions.search')}
      >
        <SearchOutlined className="text-lg" />
      </button>

      {/* Search Modal */}
      <Modal
        open={isOpen}
        onCancel={handleClose}
        footer={null}
        width={640}
        centered
        closable={false}
        className="global-search-modal-wrapper"
        styles={{
          body: {
            padding: '16px',
          },
          mask: {
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        <SearchModalContent
          query={query}
          setQuery={setQuery}
          isSearching={isSearching}
          recentSearches={recentSearches}
          onSelectRecent={handleSelectRecent}
          onClearRecent={handleClearRecent}
          inputRef={inputRef}
          t={t}
        />
      </Modal>
    </>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default GlobalSearch;
