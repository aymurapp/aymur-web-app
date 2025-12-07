'use client';

/**
 * Modal Component
 *
 * A consistent modal wrapper around Ant Design Modal with standardized footer,
 * loading states, and accessibility enhancements.
 *
 * @example
 * <Modal
 *   open={isOpen}
 *   onCancel={() => setIsOpen(false)}
 *   onOk={handleSubmit}
 *   title="Confirm Action"
 *   loading={isSubmitting}
 *   confirmText="Save Changes"
 * >
 *   <p>Are you sure you want to proceed?</p>
 * </Modal>
 */

import React, { useCallback } from 'react';

import { Modal as AntModal, Button, Space } from 'antd';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils/cn';

import type { ModalProps as AntModalProps } from 'antd';

/**
 * Extended Modal props with loading and custom text support
 */
export interface ModalProps extends Omit<AntModalProps, 'okButtonProps' | 'cancelButtonProps'> {
  /**
   * Whether the modal is in a loading state.
   * When true, the confirm button shows a loading spinner and interactions are disabled.
   */
  loading?: boolean;

  /**
   * Custom text for the confirm button.
   * If not provided, defaults to the localized "OK" text.
   */
  confirmText?: string;

  /**
   * Custom text for the cancel button.
   * If not provided, defaults to the localized "Cancel" text.
   */
  cancelText?: string;

  /**
   * Type of the confirm button.
   * @default 'primary'
   */
  confirmType?: 'primary' | 'default' | 'dashed' | 'link' | 'text';

  /**
   * Whether the confirm button should appear as dangerous (red).
   * @default false
   */
  confirmDanger?: boolean;

  /**
   * Whether to hide the cancel button.
   * @default false
   */
  hideCancel?: boolean;

  /**
   * Whether to hide the footer entirely.
   * @default false
   */
  hideFooter?: boolean;

  /**
   * Additional props for the confirm button.
   */
  confirmButtonProps?: React.ComponentProps<typeof Button>;

  /**
   * Additional props for the cancel button.
   */
  cancelButtonProps?: React.ComponentProps<typeof Button>;

  /**
   * Additional class name for the modal body content.
   */
  bodyClassName?: string;
}

/**
 * Consistent Modal component with standardized footer
 *
 * Features:
 * - Loading state with disabled interactions
 * - Customizable button text
 * - RTL-compatible layout
 * - Accessible focus management
 * - Consistent styling with platform theme
 */
export function Modal({
  loading = false,
  confirmText,
  cancelText,
  confirmType = 'primary',
  confirmDanger = false,
  hideCancel = false,
  hideFooter = false,
  confirmButtonProps,
  cancelButtonProps,
  onOk,
  onCancel,
  children,
  className,
  bodyClassName,
  footer,
  closable = true,
  maskClosable = true,
  destroyOnClose = true,
  centered = true,
  ...props
}: ModalProps) {
  const t = useTranslations('common');

  // Handle confirm click
  const handleOk = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading) {
        return;
      }
      onOk?.(e);
    },
    [loading, onOk]
  );

  // Handle cancel click
  const handleCancel = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading) {
        return;
      }
      onCancel?.(e);
    },
    [loading, onCancel]
  );

  // Build custom footer if not hidden and not overridden
  const modalFooter = hideFooter ? null : footer !== undefined ? (
    footer
  ) : (
    <Space className="w-full justify-end">
      {!hideCancel && (
        <Button onClick={handleCancel} disabled={loading} {...cancelButtonProps}>
          {cancelText || t('actions.cancel')}
        </Button>
      )}
      <Button
        type={confirmType}
        danger={confirmDanger}
        loading={loading}
        onClick={handleOk}
        {...confirmButtonProps}
      >
        {confirmText || t('actions.ok')}
      </Button>
    </Space>
  );

  return (
    <AntModal
      footer={modalFooter}
      onOk={handleOk}
      onCancel={handleCancel}
      closable={closable && !loading}
      maskClosable={maskClosable && !loading}
      destroyOnClose={destroyOnClose}
      centered={centered}
      keyboard={!loading}
      className={cn(
        // Base modal styling
        '[&_.ant-modal-content]:rounded-xl',
        '[&_.ant-modal-header]:border-b [&_.ant-modal-header]:border-stone-200',
        '[&_.ant-modal-footer]:border-t [&_.ant-modal-footer]:border-stone-200',
        '[&_.ant-modal-title]:text-lg [&_.ant-modal-title]:font-semibold',
        // Loading overlay effect
        loading && '[&_.ant-modal-body]:opacity-70 [&_.ant-modal-body]:pointer-events-none',
        className
      )}
      styles={{
        body: {
          padding: '24px',
        },
        ...props.styles,
      }}
      {...props}
    >
      <div className={cn('min-h-[60px]', bodyClassName)}>{children}</div>
    </AntModal>
  );
}

/**
 * Confirmation modal helper component for quick confirm dialogs
 */
export interface ConfirmModalProps extends Omit<ModalProps, 'children'> {
  /** Message to display in the modal body */
  message: React.ReactNode;
  /** Optional description text below the message */
  description?: React.ReactNode;
}

export function ConfirmModal({ message, description, ...props }: ConfirmModalProps) {
  return (
    <Modal {...props}>
      <div className="text-center py-4">
        <p className="text-base text-stone-900 mb-2">{message}</p>
        {description && <p className="text-sm text-stone-500">{description}</p>}
      </div>
    </Modal>
  );
}

export default Modal;
