/**
 * Google Places Parser Utility
 * Parses Google Places API PlaceResult into structured address components
 *
 * @module lib/utils/parseGooglePlace
 */

import type { ParsedAddress } from '@/lib/types/address';
import { EMPTY_PARSED_ADDRESS } from '@/lib/types/address';

/**
 * Google Places address component types
 * @see https://developers.google.com/maps/documentation/places/web-service/supported_types
 */
type AddressComponentType =
  | 'street_number'
  | 'route'
  | 'sublocality_level_1'
  | 'sublocality_level_2'
  | 'sublocality_level_3'
  | 'sublocality'
  | 'neighborhood'
  | 'locality'
  | 'administrative_area_level_1'
  | 'administrative_area_level_2'
  | 'administrative_area_level_3'
  | 'country'
  | 'postal_code'
  | 'postal_code_suffix';

/**
 * Address component from Google Places API
 */
interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

/**
 * Google Places PlaceResult (partial interface for what we need)
 */
interface PlaceResult {
  address_components?: AddressComponent[];
  formatted_address?: string;
  geometry?: {
    location?: {
      lat: () => number;
      lng: () => number;
    };
  };
}

/**
 * Extracts a specific address component by type
 * @param components - Array of address components from Google Places
 * @param types - Array of types to search for (in priority order)
 * @param useLongName - Whether to use long_name (default) or short_name
 * @returns The component value or empty string if not found
 */
function getAddressComponent(
  components: AddressComponent[] | undefined,
  types: AddressComponentType[],
  useLongName = true
): string {
  if (!components) {
    return '';
  }

  for (const type of types) {
    const component = components.find((c) => c.types.includes(type));
    if (component) {
      return useLongName ? component.long_name : component.short_name;
    }
  }

  return '';
}

/**
 * Parses a Google Places PlaceResult into a structured address object
 *
 * @param place - Google Places PlaceResult object
 * @returns Parsed address with individual components
 *
 * @example
 * ```typescript
 * const { ref } = usePlacesWidget({
 *   onPlaceSelected: (place) => {
 *     const address = parseGooglePlace(place);
 *     console.log(address.city, address.street);
 *   }
 * });
 * ```
 */
export function parseGooglePlace(place: PlaceResult | null | undefined): ParsedAddress {
  if (!place) {
    return EMPTY_PARSED_ADDRESS;
  }

  const components = place.address_components;

  // Extract street address
  const streetNumber = getAddressComponent(components, ['street_number']);
  const route = getAddressComponent(components, ['route']);
  const street = [streetNumber, route].filter(Boolean).join(' ').trim();

  // Extract area/district/neighborhood
  const area = getAddressComponent(components, [
    'sublocality_level_1',
    'sublocality',
    'neighborhood',
    'sublocality_level_2',
  ]);

  // Extract city
  const city = getAddressComponent(components, [
    'locality',
    'administrative_area_level_2',
    'administrative_area_level_3',
  ]);

  // Extract postal code
  const postalCode = getAddressComponent(components, ['postal_code']);

  // Extract country
  const country = getAddressComponent(components, ['country']);

  // Get coordinates
  let lat: number | null = null;
  let lng: number | null = null;

  if (place.geometry?.location) {
    // Google Places API returns location as methods
    if (typeof place.geometry.location.lat === 'function') {
      lat = place.geometry.location.lat();
      lng = place.geometry.location.lng();
    } else {
      // Handle case where it might be a plain object (serialized)
      lat = (place.geometry.location as unknown as { lat: number }).lat;
      lng = (place.geometry.location as unknown as { lng: number }).lng;
    }
  }

  return {
    street,
    area,
    city,
    postalCode,
    country,
    fullAddress: place.formatted_address || '',
    lat,
    lng,
  };
}

export default parseGooglePlace;
