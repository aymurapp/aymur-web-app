'use client';

/**
 * AddressFormSection Component
 *
 * A reusable address form section with Google Places autocomplete.
 * Auto-fills street, city, area, and postal code when an address is selected.
 *
 * Can be used in any form that uses react-hook-form with address fields.
 *
 * @module components/common/forms/AddressFormSection
 */

import React, { useCallback } from 'react';

import { Input, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useFormContext, type FieldValues, type Path } from 'react-hook-form';

import type { ParsedAddress } from '@/lib/types/address';
import { cn } from '@/lib/utils/cn';

import { AddressAutocomplete } from './AddressAutocomplete';

const { Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Field name mapping for address components
 * Allows customization of field names to match different form schemas
 */
export interface AddressFieldNames {
  /**
   * Field name for street address
   * @default 'street'
   */
  street?: string;

  /**
   * Field name for city
   * @default 'city'
   */
  city?: string;

  /**
   * Field name for area/district
   * @default 'area'
   */
  area?: string;

  /**
   * Field name for postal code
   * @default 'postal_code'
   */
  postalCode?: string;

  /**
   * Field name for country
   * @default 'country'
   */
  country?: string;
}

export interface AddressFormSectionProps {
  /**
   * Custom field name mapping
   * Use this when your form schema uses different field names
   */
  fieldNames?: AddressFieldNames;

  /**
   * Whether to show the section title
   * @default true
   */
  showTitle?: boolean;

  /**
   * Custom title text (uses translation key if not provided)
   */
  title?: string;

  /**
   * Whether the fields are disabled
   */
  disabled?: boolean;

  /**
   * Additional CSS class name for the container
   */
  className?: string;

  /**
   * Google Places autocomplete options
   */
  autocompleteOptions?: {
    /**
     * Restrict results to specific countries (ISO 3166-1 Alpha-2 codes)
     * @example ['SA', 'AE', 'KW'] for Gulf countries
     */
    componentRestrictions?: {
      country: string | string[];
    };
  };

  /**
   * Callback when an address is selected (for additional handling)
   */
  onAddressSelect?: (address: ParsedAddress) => void;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_FIELD_NAMES: Required<AddressFieldNames> = {
  street: 'street',
  city: 'city',
  area: 'area',
  postalCode: 'postal_code',
  country: 'country',
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AddressFormSection Component
 *
 * A complete address form section with:
 * - Google Places autocomplete for easy address entry
 * - Auto-fill of street, city, area, and postal code
 * - Manual input fields for each component
 * - RTL support
 *
 * @example
 * // Basic usage in a form
 * <Form schema={customerSchema} onSubmit={handleSubmit}>
 *   <AddressFormSection />
 * </Form>
 *
 * @example
 * // With custom field names
 * <AddressFormSection
 *   fieldNames={{
 *     street: 'address_line_1',
 *     city: 'city_name',
 *     area: 'district',
 *     postalCode: 'zip_code',
 *   }}
 * />
 *
 * @example
 * // Restrict to specific countries
 * <AddressFormSection
 *   autocompleteOptions={{
 *     componentRestrictions: { country: ['SA', 'AE'] }
 *   }}
 * />
 */
export function AddressFormSection<TFieldValues extends FieldValues = FieldValues>({
  fieldNames = {},
  showTitle = true,
  title,
  disabled = false,
  className,
  autocompleteOptions,
  onAddressSelect,
}: AddressFormSectionProps): React.JSX.Element {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');

  // Get form context for setValue
  const { setValue, watch } = useFormContext<TFieldValues>();

  // Merge field names with defaults
  const fields = {
    ...DEFAULT_FIELD_NAMES,
    ...fieldNames,
  };

  // Watch current street value for controlled input
  const currentStreet = watch(fields.street as Path<TFieldValues>);

  /**
   * Handle address selection from autocomplete
   * Sets all address fields in the form
   */
  const handleAddressSelect = useCallback(
    (address: ParsedAddress) => {
      // Set street address
      if (address.street || address.fullAddress) {
        setValue(
          fields.street as Path<TFieldValues>,
          (address.street || address.fullAddress) as TFieldValues[Path<TFieldValues>],
          { shouldValidate: true, shouldDirty: true }
        );
      }

      // Set city
      if (address.city) {
        setValue(
          fields.city as Path<TFieldValues>,
          address.city as TFieldValues[Path<TFieldValues>],
          {
            shouldValidate: true,
            shouldDirty: true,
          }
        );
      }

      // Set area/district
      if (address.area) {
        setValue(
          fields.area as Path<TFieldValues>,
          address.area as TFieldValues[Path<TFieldValues>],
          {
            shouldValidate: true,
            shouldDirty: true,
          }
        );
      }

      // Set postal code
      if (address.postalCode) {
        setValue(
          fields.postalCode as Path<TFieldValues>,
          address.postalCode as TFieldValues[Path<TFieldValues>],
          { shouldValidate: true, shouldDirty: true }
        );
      }

      // Set country
      if (address.country) {
        setValue(
          fields.country as Path<TFieldValues>,
          address.country as TFieldValues[Path<TFieldValues>],
          { shouldValidate: true, shouldDirty: true }
        );
      }

      // Call parent callback if provided
      onAddressSelect?.(address);
    },
    [fields, setValue, onAddressSelect]
  );

  return (
    <div className={cn('address-form-section', className)}>
      {showTitle && (
        <Title level={5} className="mb-4 text-stone-800">
          {title || t('sections.address')}
        </Title>
      )}

      {/* Address Autocomplete - Main search input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-stone-700 mb-2">
          {t('streetAddress')}
        </label>
        <AddressAutocomplete
          onAddressSelect={handleAddressSelect}
          value={currentStreet as string | undefined}
          onChange={(value) => {
            setValue(
              fields.street as Path<TFieldValues>,
              value as TFieldValues[Path<TFieldValues>],
              {
                shouldDirty: true,
              }
            );
          }}
          placeholder={tCommon('address.placeholder')}
          disabled={disabled}
          options={autocompleteOptions}
          size="large"
        />
        <p className="mt-1 text-xs text-stone-500">{t('placeholders.streetAddressHint')}</p>
      </div>

      {/* Postal Code */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-stone-700 mb-2">{t('postalCode')}</label>
        <Input
          size="large"
          value={watch(fields.postalCode as Path<TFieldValues>) as string}
          onChange={(e) => {
            setValue(
              fields.postalCode as Path<TFieldValues>,
              e.target.value as TFieldValues[Path<TFieldValues>],
              { shouldDirty: true }
            );
          }}
          placeholder={t('placeholders.postalCode')}
          maxLength={20}
          dir="ltr"
          disabled={disabled}
        />
      </div>

      {/* City, Area, and Country */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* City */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">{t('city')}</label>
          <Input
            size="large"
            value={watch(fields.city as Path<TFieldValues>) as string}
            onChange={(e) => {
              setValue(
                fields.city as Path<TFieldValues>,
                e.target.value as TFieldValues[Path<TFieldValues>],
                { shouldDirty: true }
              );
            }}
            placeholder={t('placeholders.city')}
            maxLength={100}
            disabled={disabled}
          />
        </div>

        {/* Area/District */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">{t('area')}</label>
          <Input
            size="large"
            value={watch(fields.area as Path<TFieldValues>) as string}
            onChange={(e) => {
              setValue(
                fields.area as Path<TFieldValues>,
                e.target.value as TFieldValues[Path<TFieldValues>],
                { shouldDirty: true }
              );
            }}
            placeholder={t('placeholders.area')}
            maxLength={100}
            disabled={disabled}
          />
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">{t('country')}</label>
          <Input
            size="large"
            value={watch(fields.country as Path<TFieldValues>) as string}
            onChange={(e) => {
              setValue(
                fields.country as Path<TFieldValues>,
                e.target.value as TFieldValues[Path<TFieldValues>],
                { shouldDirty: true }
              );
            }}
            placeholder={t('placeholders.country')}
            maxLength={100}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

export default AddressFormSection;
