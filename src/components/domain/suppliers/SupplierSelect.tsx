'use client';

/**
 * SupplierSelect Component
 *
 * A searchable select component for choosing suppliers.
 * Uses debounced search and displays supplier company name and contact.
 *
 * Features:
 * - Async search with debounce
 * - Shows supplier company name and contact
 * - Loading state
 * - Clear button
 * - Empty state message
 *
 * @module components/domain/suppliers/SupplierSelect
 */

import React, { useState, useMemo } from 'react';

import { ShopOutlined, PhoneOutlined } from '@ant-design/icons';
import { Select, Spin } from 'antd';
import { useTranslations } from 'next-intl';

import { useSuppliers } from '@/lib/hooks/data/useSuppliers';
import { useDebounce } from '@/lib/hooks/utils/useDebounce';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

export interface SupplierSelectProps {
  /** Selected supplier ID */
  value: string | null;
  /** Callback when selection changes */
  onChange: (supplierId: string | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Allow clearing the selection */
  allowClear?: boolean;
  /** Disable the select */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
  /** Size of the select */
  size?: 'small' | 'middle' | 'large';
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SupplierSelect Component
 *
 * Searchable dropdown for selecting suppliers.
 */
export function SupplierSelect({
  value,
  onChange,
  placeholder,
  allowClear = true,
  disabled = false,
  className,
  size,
}: SupplierSelectProps): React.JSX.Element {
  const t = useTranslations('suppliers');
  const tCommon = useTranslations('common');

  // Search state with debounce
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebounce(searchValue, 300);

  // Fetch suppliers based on search
  const { suppliers, isLoading } = useSuppliers({
    search: debouncedSearch || undefined,
    page: 1,
    pageSize: 20,
    sortBy: 'company_name',
    sortDirection: 'asc',
  });

  // Build options from suppliers
  const options = useMemo(() => {
    return suppliers.map((supplier) => ({
      value: supplier.id_supplier,
      label: (
        <div className="flex items-center gap-2">
          <ShopOutlined className="text-amber-500" />
          <span className="font-medium">{supplier.company_name}</span>
          {supplier.phone && (
            <span className="text-stone-400 text-xs flex items-center gap-1 ms-auto">
              <PhoneOutlined className="text-xs" />
              {supplier.phone}
            </span>
          )}
        </div>
      ),
      // Store company_name for search filtering
      searchText:
        `${supplier.company_name} ${supplier.contact_person || ''} ${supplier.phone || ''}`.toLowerCase(),
    }));
  }, [suppliers]);

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
      size={size}
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

export default SupplierSelect;
