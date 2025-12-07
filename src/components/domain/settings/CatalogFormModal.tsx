'use client';

/**
 * CatalogFormModal Component
 *
 * A reusable modal component for adding/editing catalog items.
 * Wraps Ant Design Modal with consistent styling and form integration.
 *
 * Features:
 * - Add and Edit modes
 * - Form integration with Ant Design Form
 * - Loading states
 * - Consistent footer buttons
 * - RTL support
 *
 * @module components/domain/settings/CatalogFormModal
 */

import React, { useEffect } from 'react';

import { Modal, Form, Spin } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

import type { FormInstance } from 'antd';

// =============================================================================
// TYPES
// =============================================================================

/**
 * CatalogFormModal props
 */
export interface CatalogFormModalProps<T extends object = object> {
  /** Whether the modal is open */
  open: boolean;
  /** Modal title */
  title: string;
  /** Close handler */
  onClose: () => void;
  /** Form submit handler */
  onSubmit: (values: T) => void | Promise<void>;
  /** Initial values for edit mode */
  initialValues?: Partial<T>;
  /** Whether the modal is in edit mode */
  isEdit?: boolean;
  /** Whether the form is submitting */
  loading?: boolean;
  /** Whether initial data is loading (for edit mode) */
  dataLoading?: boolean;
  /** Form instance (optional, creates internal form if not provided) */
  form?: FormInstance<T>;
  /** Modal width */
  width?: number | string;
  /** Form content (children) */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
  /** Custom submit button text */
  submitText?: string;
  /** Custom cancel button text */
  cancelText?: string;
  /** Whether to destroy form on close */
  destroyOnClose?: boolean;
  /** Permission required to submit */
  permission?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * CatalogFormModal - Reusable modal for catalog CRUD operations
 */
export function CatalogFormModal<T extends object = object>({
  open,
  title,
  onClose,
  onSubmit,
  initialValues,
  isEdit = false,
  loading = false,
  dataLoading = false,
  form: externalForm,
  width = 520,
  children,
  className,
  submitText,
  cancelText,
  destroyOnClose = true,
  permission = 'catalog.manage',
}: CatalogFormModalProps<T>): React.JSX.Element {
  const t = useTranslations('common');

  // Create internal form if not provided
  const [internalForm] = Form.useForm<T>();
  const form = externalForm || internalForm;

  // Reset form when modal opens or initial values change
  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue(initialValues as T);
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form]);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
    } catch {
      // Form validation errors are handled by Ant Design Form
    }
  };

  // Handle modal close
  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  // Determine button texts
  const submitButtonText = submitText || (isEdit ? t('actions.save') : t('actions.add'));
  const cancelButtonText = cancelText || t('actions.cancel');

  return (
    <Modal
      open={open}
      title={title}
      onCancel={handleClose}
      width={width}
      destroyOnClose={destroyOnClose}
      className={cn('catalog-form-modal', className)}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} disabled={loading}>
            {cancelButtonText}
          </Button>
          <Button type="primary" onClick={handleSubmit} loading={loading} permission={permission}>
            {submitButtonText}
          </Button>
        </div>
      }
      maskClosable={!loading}
      closable={!loading}
    >
      {dataLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spin size="large" />
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          className="mt-4"
          initialValues={initialValues}
        >
          {children}
        </Form>
      )}
    </Modal>
  );
}

// =============================================================================
// FORM FIELD COMPONENTS
// =============================================================================

/**
 * Standard form item wrapper with consistent styling
 */
export function FormField({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Form.Item> & {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <Form.Item className={cn('mb-4', className)} {...props}>
      {children}
    </Form.Item>
  );
}

/**
 * Form row for inline fields
 */
export function FormRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return <div className={cn('grid grid-cols-2 gap-4', className)}>{children}</div>;
}

/**
 * Form section with optional title
 */
export function FormSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <h4 className="text-sm font-medium text-stone-700 border-b border-stone-200 pb-2">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

export default CatalogFormModal;
