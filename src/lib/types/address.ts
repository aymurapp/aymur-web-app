/**
 * Address Types
 * Types for address autocomplete and Google Places API integration
 *
 * @module lib/types/address
 */

/**
 * Parsed address structure extracted from Google Places API response
 */
export interface ParsedAddress {
  /**
   * Street address (street number + route)
   * e.g., "123 Main Street"
   */
  street: string;

  /**
   * Area, district, or neighborhood
   * Extracted from sublocality_level_1, sublocality, or neighborhood
   */
  area: string;

  /**
   * City name
   * Extracted from locality or administrative_area_level_2
   */
  city: string;

  /**
   * Postal/ZIP code
   */
  postalCode: string;

  /**
   * Country name
   */
  country: string;

  /**
   * Full formatted address as returned by Google
   */
  fullAddress: string;

  /**
   * Latitude coordinate
   */
  lat: number | null;

  /**
   * Longitude coordinate
   */
  lng: number | null;
}

/**
 * Empty parsed address for initialization
 */
export const EMPTY_PARSED_ADDRESS: ParsedAddress = {
  street: '',
  area: '',
  city: '',
  postalCode: '',
  country: '',
  fullAddress: '',
  lat: null,
  lng: null,
};
