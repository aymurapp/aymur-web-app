'use client';

/**
 * CustomerSelect Component
 *
 * A searchable select component for choosing customers.
 * Uses debounced search and displays customer name and phone.
 *
 * Features:
 * - Async search with debounce
 * - Shows customer name and phone in options
 * - Loading state
 * - Clear button
 * - Empty state message
 *
 * @module components/domain/customers/CustomerSelect
 */

import React, { useState, useMemo } from 'react';

import { UserOutlined } from '@ant-design/icons';
import { Select, Spin } from 'antd';
import { useTranslations } from 'next-intl';

import { useCustomers } from '@/lib/hooks/data/useCustomers';
import { useDebounce } from '@/lib/hooks/utils/useDebounce';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

export interface CustomerSelectProps {
  /** Selected customer ID */
  value: string | null;
  /** Callback when selection changes */
  onChange: (customerId: string | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Allow clearing the selection */
  allowClear?: boolean;
  /** Disable the select */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * CustomerSelect Component
 *
 * Searchable dropdown for selecting customers.
 */
export function CustomerSelect({
  value,
  onChange,
  placeholder,
  allowClear = true,
  disabled = false,
  className,
}: CustomerSelectProps): React.JSX.Element {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');

  // Search state with debounce
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebounce(searchValue, 300);

  // Fetch customers based on search
  const { customers, isLoading } = useCustomers({
    search: debouncedSearch || undefined,
    page: 1,
    pageSize: 20,
    sortBy: 'full_name',
    sortDirection: 'asc',
  });

  // Build options from customers
  const options = useMemo(() => {
    return customers.map((customer) => ({
      value: customer.id_customer,
      label: (
        <div className="flex items-center gap-2">
          <UserOutlined className="text-stone-400" />
          <span>{customer.full_name}</span>
          {customer.phone && <span className="text-stone-400 text-xs">({customer.phone})</span>}
        </div>
      ),
      // Store full_name for search filtering
      searchText: `${customer.full_name} ${customer.phone || ''}`.toLowerCase(),
    }));
  }, [customers]);

  // Handle selection change
  const handleChange = (selectedValue: string | undefined) => {
    onChange(selectedValue || null);
  };

  // Handle search input
  const handleSearch = (search: string) => {
    setSearchValue(search);
  };

  return (
    <Select
      value={value || undefined}
      onChange={handleChange}
      onSearch={handleSearch}
      placeholder={placeholder || t('select.placeholder')}
      allowClear={allowClear}
      disabled={disabled}
      showSearch
      filterOption={false} // Disable client-side filtering since we search server-side
      loading={isLoading}
      notFoundContent={
        isLoading ? (
          <div className="py-2 text-center">
            <Spin size="small" />
          </div>
        ) : (
          <div className="py-2 text-center text-stone-400">{tCommon('messages.noResults')}</div>
        )
      }
      options={options}
      className={cn('w-full', className)}
      dropdownRender={(menu) => <>{menu}</>}
    />
  );
}

export default CustomerSelect;
