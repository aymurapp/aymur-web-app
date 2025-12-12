/**
 * Form Components
 * Form fields, inputs, and form utilities
 */

// Address autocomplete using Google Places API
export { AddressAutocomplete, type AddressAutocompleteProps } from './AddressAutocomplete';

// Address form section with autocomplete and all address fields
export {
  AddressFormSection,
  type AddressFormSectionProps,
  type AddressFieldNames,
} from './AddressFormSection';

// Avatar upload with circular crop
export { AvatarUpload, type AvatarUploadProps } from './AvatarUpload';

// International phone input with country selector and validation
export {
  PhoneInput,
  type PhoneInputProps,
  type PhoneInputMeta,
  isValidPhone,
  formatPhoneDisplay,
} from './PhoneInput';
