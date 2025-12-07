'use client';

/**
 * CustomerSelector Component
 *
 * Modal/Drawer component for selecting customers in the POS system.
 * Allows searching existing customers or creating new ones inline.
 *
 * Features:
 * - Search input with debounce (300ms)
 * - Recent customers section (last used in sales)
 * - Customer list with pagination/infinite scroll
 * - Quick "Walk-in Customer" option
 * - "Create New Customer" inline form
 * - Keyboard navigation (arrow keys, enter to select)
 * - Loading and empty states
 * - Permission-based visibility
 * - RTL support with CSS logical properties
 * - Mobile-first responsive design
 *
 * @module components/domain/sales/CustomerSelector
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import {
  SearchOutlined,
  UserAddOutlined,
  UserOutlined,
  CloseOutlined,
  HistoryOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Drawer, Input, Empty, Spin, Typography, Badge } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { PERMISSION_KEYS } from '@/lib/constants/permissions';
import { useCustomers, type Customer } from '@/lib/hooks/data/useCustomers';
import { usePermissions } from '@/lib/hooks/permissions';
import { useDebounce } from '@/lib/hooks/utils/useDebounce';
import { cn } from '@/lib/utils/cn';

import { CustomerSelectorItem } from './CustomerSelectorItem';
import { QuickCustomerForm } from './QuickCustomerForm';

import type { CustomerWithVip } from './CustomerSelectorItem';
import type { InputRef } from 'antd';

const { Text } = Typography;

/**
 * Props for the CustomerSelector component
 */
export interface CustomerSelectorProps {
  /** Whether the selector is open */
  open: boolean;
  /** Callback when selector is closed */
  onClose: () => void;
  /** Callback when a customer is selected (null = walk-in) */
  onSelect: (customer: Customer | null) => void;
  /** Currently selected customer */
  selectedCustomer?: Customer | null;
  /** Shop ID for customer queries */
  shopId: string;
}

/**
 * Number of recent customers to display
 */
const RECENT_CUSTOMERS_COUNT = 5;

/**
 * Page size for customer list
 */
const PAGE_SIZE = 10;

/**
 * Debounce delay for search input (ms)
 */
const SEARCH_DEBOUNCE_DELAY = 300;

/**
 * CustomerSelector Component
 *
 * A drawer-based customer selection interface for POS transactions.
 */
export function CustomerSelector({
  open,
  onClose,
  onSelect,
  selectedCustomer,
  shopId: _shopId,
}: CustomerSelectorProps): JSX.Element {
  const t = useTranslations('sales');
  const tCustomers = useTranslations('customers');
  const tCommon = useTranslations('common');

  // Permissions
  const { can } = usePermissions();
  const canViewCustomers = can(PERMISSION_KEYS.CUSTOMERS_VIEW);
  const canCreateCustomers = can(PERMISSION_KEYS.CUSTOMERS_MANAGE);

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Debounced search term
  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_DELAY);

  // Refs for keyboard navigation
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<InputRef>(null);

  // Query customers
  const { customers, isLoading, isFetching, totalCount } = useCustomers({
    search: debouncedSearch,
    page: 1,
    pageSize: PAGE_SIZE,
    sortBy: 'full_name',
    sortDirection: 'asc',
    enabled: open && canViewCustomers,
  });

  // Query recent customers (no search, sorted by updated_at)
  const { customers: recentCustomers } = useCustomers({
    page: 1,
    pageSize: RECENT_CUSTOMERS_COUNT,
    sortBy: 'updated_at',
    sortDirection: 'desc',
    enabled: open && canViewCustomers && !debouncedSearch,
  });

  // Combined list for keyboard navigation
  const navigationList = useMemo<CustomerWithVip[]>(() => {
    if (debouncedSearch) {
      return customers as CustomerWithVip[];
    }
    // When not searching, show recent customers first, then all customers
    const recentIds = new Set(recentCustomers.map((c) => c.id_customer));
    const otherCustomers = customers.filter((c) => !recentIds.has(c.id_customer));
    return [...recentCustomers, ...otherCustomers] as CustomerWithVip[];
  }, [debouncedSearch, customers, recentCustomers]);

  // Reset state when drawer opens/closes
  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setShowCreateForm(false);
      setHighlightedIndex(-1);
      // Focus search input after drawer animation
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Reset highlighted index when search changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [debouncedSearch]);

  /**
   * Handle customer selection
   */
  const handleSelect = useCallback(
    (customer: Customer | null) => {
      onSelect(customer);
      onClose();
    },
    [onSelect, onClose]
  );

  /**
   * Handle walk-in customer selection
   */
  const handleWalkIn = useCallback(() => {
    handleSelect(null);
  }, [handleSelect]);

  /**
   * Handle quick customer creation success
   */
  const handleCreateSuccess = useCallback(
    (customer: Customer) => {
      setShowCreateForm(false);
      handleSelect(customer);
    },
    [handleSelect]
  );

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowCreateForm(false);
  }, []);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showCreateForm) {
        return;
      }

      const listLength = navigationList.length;
      if (listLength === 0) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < listLength - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < listLength) {
            const selectedCustomer = navigationList[highlightedIndex];
            if (selectedCustomer) {
              handleSelect(selectedCustomer);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (searchTerm) {
            setSearchTerm('');
          } else {
            onClose();
          }
          break;
      }
    },
    [showCreateForm, navigationList, highlightedIndex, handleSelect, searchTerm, onClose]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      item?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedIndex]);

  /**
   * Render customer list section
   */
  const renderCustomerList = (): React.ReactNode => {
    // Loading state
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Spin size="large" />
        </div>
      );
    }

    // Permission denied
    if (!canViewCustomers) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={tCommon('errors.accessDenied')}
          className="py-8"
        />
      );
    }

    // Empty search results
    if (debouncedSearch && customers.length === 0) {
      return (
        <div className="py-8 text-center">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>{t('customerSelector.noResults', { search: debouncedSearch })}</span>
            }
          />
          {canCreateCustomers && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setShowCreateForm(true)}
              className="mt-4"
            >
              {t('customerSelector.createNew')}
            </Button>
          )}
        </div>
      );
    }

    // No customers at all
    if (!debouncedSearch && customers.length === 0 && recentCustomers.length === 0) {
      return (
        <div className="py-8 text-center">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tCustomers('empty.title')} />
          {canCreateCustomers && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setShowCreateForm(true)}
              className="mt-4"
            >
              {t('customerSelector.createNew')}
            </Button>
          )}
        </div>
      );
    }

    // Render list
    let itemIndex = 0;

    return (
      <div ref={listRef} role="listbox" aria-label={t('customerSelector.title')}>
        {/* Recent Customers Section (only when not searching) */}
        {!debouncedSearch && recentCustomers.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-4 py-2 bg-stone-50">
              <HistoryOutlined className="text-stone-400" />
              <Text type="secondary" className="text-xs font-medium uppercase">
                {t('customerSelector.recent')}
              </Text>
            </div>
            {recentCustomers.map((customer) => {
              const currentIndex = itemIndex++;
              return (
                <CustomerSelectorItem
                  key={customer.id_customer}
                  customer={customer as CustomerWithVip}
                  selected={selectedCustomer?.id_customer === customer.id_customer}
                  highlighted={highlightedIndex === currentIndex}
                  onClick={handleSelect}
                  data-index={currentIndex}
                />
              );
            })}
          </>
        )}

        {/* All Customers Section */}
        {(debouncedSearch
          ? customers
          : customers.filter((c) => !recentCustomers.some((r) => r.id_customer === c.id_customer))
        ).length > 0 && (
          <>
            {!debouncedSearch && recentCustomers.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-stone-50 mt-2">
                <TeamOutlined className="text-stone-400" />
                <Text type="secondary" className="text-xs font-medium uppercase">
                  {t('customerSelector.allCustomers')}
                </Text>
                {totalCount > 0 && (
                  <Badge
                    count={totalCount}
                    className="ms-auto"
                    style={{ backgroundColor: '#a8a29e' }}
                  />
                )}
              </div>
            )}
            {(debouncedSearch
              ? customers
              : customers.filter(
                  (c) => !recentCustomers.some((r) => r.id_customer === c.id_customer)
                )
            ).map((customer) => {
              const currentIndex = itemIndex++;
              return (
                <CustomerSelectorItem
                  key={customer.id_customer}
                  customer={customer as CustomerWithVip}
                  selected={selectedCustomer?.id_customer === customer.id_customer}
                  highlighted={highlightedIndex === currentIndex}
                  onClick={handleSelect}
                  data-index={currentIndex}
                />
              );
            })}
          </>
        )}

        {/* Loading more indicator */}
        {isFetching && !isLoading && (
          <div className="flex items-center justify-center py-4">
            <Spin size="small" />
          </div>
        )}
      </div>
    );
  };

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <UserOutlined className="text-amber-500" />
          <span>{t('customerSelector.title')}</span>
        </div>
      }
      placement="right"
      open={open}
      onClose={onClose}
      width={420}
      className="customer-selector-drawer"
      styles={{
        body: { padding: 0, display: 'flex', flexDirection: 'column' },
      }}
      extra={
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          aria-label={tCommon('actions.close')}
        />
      }
      closeIcon={null}
    >
      {/* Search Section */}
      <div className="p-4 border-b border-stone-200 bg-white sticky top-0 z-10">
        <Input
          ref={searchInputRef}
          size="large"
          placeholder={t('customerSelector.searchPlaceholder')}
          prefix={<SearchOutlined className="text-stone-400" />}
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          allowClear
          className="mb-3"
        />

        {/* Walk-in Customer Button */}
        <Button
          block
          size="large"
          icon={<UserOutlined />}
          onClick={handleWalkIn}
          className={cn(
            'flex items-center justify-center gap-2',
            'border-dashed border-stone-300 hover:border-amber-400 hover:text-amber-600',
            selectedCustomer === null && 'border-amber-400 bg-amber-50 text-amber-700'
          )}
        >
          {t('customerSelector.walkIn')}
        </Button>
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-y-auto" onKeyDown={handleKeyDown}>
        {showCreateForm ? (
          <div className="p-4">
            <QuickCustomerForm
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        ) : (
          renderCustomerList()
        )}
      </div>

      {/* Footer Section */}
      {!showCreateForm && canCreateCustomers && customers.length > 0 && (
        <div className="p-4 border-t border-stone-200 bg-white">
          <Button
            type="primary"
            block
            size="large"
            icon={<UserAddOutlined />}
            onClick={() => setShowCreateForm(true)}
          >
            {t('customerSelector.createNew')}
          </Button>
        </div>
      )}

      {/* Selected Customer Display */}
      {selectedCustomer && !showCreateForm && (
        <div className="px-4 py-3 border-t border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2">
            <Text type="secondary" className="text-xs">
              {t('customerSelector.selected')}:
            </Text>
            <Text strong className="text-amber-700">
              {selectedCustomer.full_name}
            </Text>
          </div>
        </div>
      )}
    </Drawer>
  );
}

export default CustomerSelector;
