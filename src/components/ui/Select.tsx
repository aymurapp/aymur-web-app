'use client';

/**
 * Select Component
 *
 * An async searchable select wrapper around Ant Design Select.
 * Supports fetching options from an API with debounced search.
 *
 * @example
 * // Basic usage with static options
 * <Select
 *   options={[
 *     { label: 'Option 1', value: '1' },
 *     { label: 'Option 2', value: '2' },
 *   ]}
 * />
 *
 * // Async search
 * <Select
 *   fetchOptions={async (search) => {
 *     const response = await fetch(`/api/customers?q=${search}`);
 *     const data = await response.json();
 *     return data.map(item => ({ label: item.name, value: item.id }));
 *   }}
 *   debounceMs={300}
 *   placeholder="Search customers..."
 * />
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

import { Select as AntSelect, Spin, Empty } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';

import type { SelectProps as AntSelectProps, DefaultOptionType } from 'antd/es/select';

/**
 * Option type for the select
 */
export interface SelectOption<T = string> {
  /** Display label */
  label: React.ReactNode;
  /** Option value */
  value: T;
  /** Whether this option is disabled */
  disabled?: boolean;
  /** Additional data attached to the option */
  data?: Record<string, unknown>;
}

/**
 * Extended Select props with async fetch support
 */
export interface SelectProps<T = string> extends Omit<
  AntSelectProps<T>,
  'options' | 'filterOption'
> {
  /**
   * Static options for the select.
   * If fetchOptions is provided, these are used as initial options.
   */
  options?: SelectOption<T>[];

  /**
   * Async function to fetch options based on search query.
   * When provided, enables server-side search.
   */
  fetchOptions?: (search: string) => Promise<SelectOption<T>[]>;

  /**
   * Debounce delay in milliseconds for search.
   * @default 300
   */
  debounceMs?: number;

  /**
   * Minimum characters required before triggering search.
   * @default 0
   */
  minSearchLength?: number;

  /**
   * Whether to show loading spinner while fetching.
   * @default true
   */
  showLoadingIndicator?: boolean;

  /**
   * Cache fetched options by search term.
   * @default false
   */
  cacheOptions?: boolean;

  /**
   * Callback when fetch fails.
   */
  onFetchError?: (error: Error) => void;
}

/**
 * Async searchable Select component
 *
 * Features:
 * - Server-side search with debouncing
 * - Loading states
 * - Empty state handling
 * - RTL-compatible styling
 * - Gold-themed focus states
 */
export function Select<T = string>({
  options: staticOptions = [],
  fetchOptions,
  debounceMs = 300,
  minSearchLength = 0,
  showLoadingIndicator = true,
  cacheOptions = false,
  onFetchError,
  className,
  loading: externalLoading,
  notFoundContent,
  placeholder,
  showSearch = true,
  allowClear = true,
  onDropdownVisibleChange,
  ...props
}: SelectProps<T>) {
  const t = useTranslations('common');

  // State for async options
  const [asyncOptions, setAsyncOptions] = useState<SelectOption<T>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Cache for fetched options
  const optionsCacheRef = useRef<Map<string, SelectOption<T>[]>>(new Map());

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // AbortController for canceling pending requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handle search with debouncing
  const handleSearch = useCallback(
    async (searchValue: string) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Cancel pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // If no fetch function, use client-side filtering
      if (!fetchOptions) {
        return;
      }

      // Check minimum search length
      if (searchValue.length < minSearchLength) {
        setAsyncOptions([]);
        return;
      }

      // Check cache
      if (cacheOptions && optionsCacheRef.current.has(searchValue)) {
        setAsyncOptions(optionsCacheRef.current.get(searchValue)!);
        return;
      }

      // Debounce the fetch
      debounceTimerRef.current = setTimeout(async () => {
        setIsLoading(true);
        setHasSearched(true);

        // Create new AbortController for this request
        abortControllerRef.current = new AbortController();

        try {
          const results = await fetchOptions(searchValue);

          // Cache results if caching is enabled
          if (cacheOptions) {
            optionsCacheRef.current.set(searchValue, results);
          }

          setAsyncOptions(results);
        } catch (error) {
          // Ignore abort errors
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }

          console.error('Select fetch error:', error);
          onFetchError?.(error as Error);
          setAsyncOptions([]);
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [fetchOptions, debounceMs, minSearchLength, cacheOptions, onFetchError]
  );

  // Clear async options when dropdown closes
  const handleDropdownVisibleChange = useCallback(
    (open: boolean) => {
      if (!open && fetchOptions) {
        // Reset state when dropdown closes
        setHasSearched(false);
        if (!cacheOptions) {
          setAsyncOptions([]);
        }
      }
      onDropdownVisibleChange?.(open);
    },
    [fetchOptions, cacheOptions, onDropdownVisibleChange]
  );

  // Determine which options to display
  const displayOptions = fetchOptions ? asyncOptions : staticOptions;

  // Build not found content
  const emptyContent = notFoundContent || (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        isLoading
          ? t('select.loading')
          : hasSearched
            ? t('select.noResults')
            : t('select.typeToSearch')
      }
      className="py-4"
    />
  );

  // Loading indicator
  const loadingIndicator =
    showLoadingIndicator && (isLoading || externalLoading) ? <Spin size="small" /> : undefined;

  return (
    <AntSelect
      options={displayOptions as DefaultOptionType[]}
      loading={isLoading || externalLoading}
      showSearch={showSearch}
      allowClear={allowClear}
      filterOption={!fetchOptions} // Use client-side filter only when no fetch function
      onSearch={fetchOptions ? handleSearch : undefined}
      onDropdownVisibleChange={handleDropdownVisibleChange}
      notFoundContent={emptyContent}
      placeholder={placeholder || t('select.placeholder')}
      suffixIcon={loadingIndicator}
      className={cn(
        // Base styling
        'w-full',
        // Gold focus ring
        '[&.ant-select-focused_.ant-select-selector]:border-amber-400',
        '[&.ant-select-focused_.ant-select-selector]:shadow-[0_0_0_2px_rgba(245,158,11,0.2)]',
        // Dropdown styling
        '[&_.ant-select-dropdown]:rounded-lg',
        '[&_.ant-select-dropdown]:shadow-lg',
        className
      )}
      {...props}
    />
  );
}

/**
 * Pre-configured Select variants for common use cases
 */

/**
 * Base Customer Select - Pre-configured for customer search
 * Note: For most use cases, prefer the domain-specific CustomerSelect from @/components/domain/customers
 * which handles data fetching internally.
 */
export interface BaseCustomerSelectProps extends Omit<SelectProps<string>, 'fetchOptions'> {
  fetchCustomers: (search: string) => Promise<SelectOption<string>[]>;
}

export function BaseCustomerSelect({ fetchCustomers, ...props }: BaseCustomerSelectProps) {
  const t = useTranslations('customers');

  return (
    <Select
      fetchOptions={fetchCustomers}
      placeholder={t('select.placeholder')}
      debounceMs={300}
      minSearchLength={2}
      {...props}
    />
  );
}

/**
 * Product Select - Pre-configured for product/inventory item search
 */
export interface ProductSelectProps extends Omit<SelectProps<string>, 'fetchOptions'> {
  fetchProducts: (search: string) => Promise<SelectOption<string>[]>;
}

export function ProductSelect({ fetchProducts, ...props }: ProductSelectProps) {
  const t = useTranslations('inventory');

  return (
    <Select
      fetchOptions={fetchProducts}
      placeholder={t('select.placeholder')}
      debounceMs={300}
      minSearchLength={1}
      {...props}
    />
  );
}

export default Select;
