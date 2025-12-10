'use client';

/**
 * AddressAutocomplete Component
 *
 * A reusable address autocomplete component using Google Places API.
 * Provides address suggestions as user types and parses selected address
 * into structured components (street, city, area, postal code, country).
 *
 * Uses react-google-autocomplete's usePlacesWidget hook with Ant Design Input.
 *
 * @module components/common/forms/AddressAutocomplete
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { EnvironmentOutlined, LoadingOutlined } from '@ant-design/icons';
import { Input, type InputRef } from 'antd';
import { useTranslations } from 'next-intl';
import { usePlacesWidget } from 'react-google-autocomplete';

import type { ParsedAddress } from '@/lib/types/address';
import { cn } from '@/lib/utils/cn';
import { parseGooglePlace } from '@/lib/utils/parseGooglePlace';

// =============================================================================
// TYPES
// =============================================================================

export interface AddressAutocompleteProps {
  /**
   * Callback when an address is selected from the autocomplete dropdown
   */
  onAddressSelect: (address: ParsedAddress) => void;

  /**
   * Default value for the input
   */
  defaultValue?: string;

  /**
   * Controlled value for the input
   */
  value?: string;

  /**
   * Callback when input value changes
   */
  onChange?: (value: string) => void;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Whether the input is disabled
   */
  disabled?: boolean;

  /**
   * Additional CSS class name
   */
  className?: string;

  /**
   * Google Places autocomplete options
   * @see https://developers.google.com/maps/documentation/javascript/reference/places-autocomplete-service#AutocompletionRequest
   */
  options?: {
    /**
     * Restrict results to specific types
     * @default ['address']
     */
    types?: string[];

    /**
     * Restrict results to specific countries (ISO 3166-1 Alpha-2 codes)
     */
    componentRestrictions?: {
      country: string | string[];
    };

    /**
     * Fields to return from the API (affects billing)
     * @default ['address_components', 'geometry.location', 'formatted_address']
     */
    fields?: string[];
  };

  /**
   * Input size
   * @default 'middle'
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * Whether to show the location icon prefix
   * @default true
   */
  showIcon?: boolean;

  /**
   * Form field status for Ant Design Form integration
   */
  status?: 'error' | 'warning';
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS = {
  types: ['address'],
  fields: ['address_components', 'geometry.location', 'formatted_address'],
};

// =============================================================================
// COMPONENT
// =============================================================================

export function AddressAutocomplete({
  onAddressSelect,
  defaultValue,
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  options = {},
  size = 'middle',
  showIcon = true,
  status,
}: AddressAutocompleteProps): React.JSX.Element {
  const t = useTranslations('common');
  const inputRef = useRef<InputRef>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState(defaultValue || value || '');

  // Get API key from environment
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Merge options with defaults
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    fields: options.fields || DEFAULT_OPTIONS.fields,
    types: options.types || DEFAULT_OPTIONS.types,
  };

  // Handle place selection
  const handlePlaceSelected = useCallback(
    (place: google.maps.places.PlaceResult) => {
      setIsLoading(false);

      if (!place || !place.address_components) {
        return;
      }

      // Parse the place result
      const parsedAddress = parseGooglePlace(place);

      // Update input value with formatted address
      const newValue = parsedAddress.fullAddress || inputValue;
      setInputValue(newValue);
      onChange?.(newValue);

      // Notify parent
      onAddressSelect(parsedAddress);
    },
    [inputValue, onChange, onAddressSelect]
  );

  // Use the places widget hook
  const { ref: placesRef } = usePlacesWidget<HTMLInputElement>({
    apiKey,
    onPlaceSelected: handlePlaceSelected,
    options: mergedOptions,
  });

  // Sync controlled value
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value, inputValue]);

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onChange?.(newValue);

      // Show loading when user is typing (suggestions are being fetched)
      if (newValue.length > 2) {
        setIsLoading(true);
        // Reset loading after a delay (suggestions should appear by then)
        setTimeout(() => setIsLoading(false), 1500);
      } else {
        setIsLoading(false);
      }
    },
    [onChange]
  );

  // Combine refs - attach places widget to the input
  const setRefs = useCallback(
    (element: HTMLInputElement | null) => {
      // Set the places widget ref
      if (placesRef) {
        (placesRef as React.MutableRefObject<HTMLInputElement | null>).current = element;
      }
    },
    [placesRef]
  );

  // Warn if API key is missing
  useEffect(() => {
    if (!apiKey) {
      console.warn(
        '[AddressAutocomplete] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Address autocomplete will not work.'
      );
    }
  }, [apiKey]);

  return (
    <Input
      ref={(instance) => {
        // Store Ant Design InputRef
        (inputRef as React.MutableRefObject<InputRef | null>).current = instance;
        // Get the underlying input element and pass to places widget
        if (instance?.input) {
          setRefs(instance.input);
        }
      }}
      value={inputValue}
      onChange={handleInputChange}
      placeholder={placeholder || t('address.placeholder')}
      disabled={disabled || !apiKey}
      size={size}
      status={status}
      className={cn('address-autocomplete', className)}
      prefix={
        showIcon ? (
          isLoading ? (
            <LoadingOutlined className="text-amber-500" spin />
          ) : (
            <EnvironmentOutlined className="text-stone-400" />
          )
        ) : undefined
      }
      allowClear
    />
  );
}

export default AddressAutocomplete;
