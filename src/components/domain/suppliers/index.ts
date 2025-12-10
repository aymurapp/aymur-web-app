/**
 * Suppliers Domain Components
 *
 * Components for displaying and managing supplier information.
 *
 * @module components/domain/suppliers
 *
 * @example
 * ```tsx
 * import { SupplierCard, SupplierForm, SupplierSelect } from '@/components/domain/suppliers';
 *
 * function SuppliersPage() {
 *   return (
 *     <div>
 *       <SupplierCard supplier={supplier} onClick={handleClick} />
 *       <SupplierForm onSuccess={handleSuccess} />
 *       <SupplierSelect onChange={handleChange} />
 *     </div>
 *   );
 * }
 * ```
 */

// Card component for displaying supplier information
export { SupplierCard } from './SupplierCard';
export type { SupplierCardProps, SupplierWithCategory } from './SupplierCard';

// Form component for creating/editing suppliers
export { SupplierForm } from './SupplierForm';
export type { SupplierFormProps } from './SupplierForm';

// Select component for choosing suppliers
export { SupplierSelect } from './SupplierSelect';
export type { SupplierSelectProps } from './SupplierSelect';

// Modal component for recording supplier payments (legacy)
export { RecordPaymentModal as SupplierPaymentModal } from './RecordPaymentModal';
export type { RecordPaymentModalProps as SupplierPaymentModalProps } from './RecordPaymentModal';

// Drawer component for recording supplier payments (recommended)
export { RecordPaymentDrawer } from './RecordPaymentDrawer';
export type { RecordPaymentDrawerProps } from './RecordPaymentDrawer';
