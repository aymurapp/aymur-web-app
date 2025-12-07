/**
 * UI Components
 * Ant Design wrappers and custom UI primitives
 *
 * These components wrap Ant Design with project-specific enhancements:
 * - Permission-aware rendering
 * - Gold/luxury theme integration
 * - RTL support via logical properties
 * - i18n via next-intl
 */

// Button - Permission-aware button wrapper
export { Button } from './Button';
export type { ButtonProps } from './Button';

// Card - Styled card with hover effects and skeleton loading
export { Card, CardMeta, CardGrid } from './Card';
export type { CardProps } from './Card';

// Form - React Hook Form + Zod validation integration
export { Form, useFormInstance } from './Form';
export type { FormProps, FormItemProps } from './Form';

// Table - Server-paginated table wrapper
export { Table } from './Table';
export type { TableProps, ServerPaginationConfig, ColumnsType, ColumnType } from './Table';

// Modal - Consistent modal with loading and footer
export { Modal, ConfirmModal } from './Modal';
export type { ModalProps, ConfirmModalProps } from './Modal';

// Select - Async searchable select
export { Select, BaseCustomerSelect, ProductSelect } from './Select';
export type {
  SelectProps,
  SelectOption,
  BaseCustomerSelectProps,
  ProductSelectProps,
} from './Select';

// OptimizedImage - Next.js Image wrapper with blur placeholders and presets
export {
  OptimizedImage,
  imagePresets,
  DEFAULT_BLUR_DATA_URL,
  ERROR_PLACEHOLDER_URL,
} from './OptimizedImage';
export type { OptimizedImageProps } from './OptimizedImage';
