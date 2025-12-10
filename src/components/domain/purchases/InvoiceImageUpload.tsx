'use client';

/**
 * InvoiceImageUpload Component
 *
 * A specialized wrapper around EntityImageUpload for purchase invoice images.
 * Provides purchase-specific translations and defaults.
 *
 * @module components/domain/purchases/InvoiceImageUpload
 */

import React from 'react';

import { useTranslations } from 'next-intl';

import { EntityImageUpload } from '@/components/common/data/EntityImageUpload';
import type { FileUploadResult } from '@/lib/hooks/data/useFileUpload';

// =============================================================================
// TYPES
// =============================================================================

export interface InvoiceImageUploadProps {
  /**
   * The purchase ID to link files to (null for new purchases)
   */
  purchaseId: string | null;

  /**
   * Callback when files change (for new purchases before save)
   * Provides the uploaded file results for linking after purchase creation
   */
  onFilesChange?: (files: FileUploadResult[]) => void;

  /**
   * Maximum number of files allowed
   * @default 10
   */
  maxFiles?: number;

  /**
   * Whether the component is disabled
   */
  disabled?: boolean;

  /**
   * Additional class name
   */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function InvoiceImageUpload({
  purchaseId,
  onFilesChange,
  maxFiles = 10,
  disabled = false,
  className,
}: InvoiceImageUploadProps): React.JSX.Element {
  const t = useTranslations('purchases');

  return (
    <EntityImageUpload
      entityType="purchases"
      entityId={purchaseId}
      onFilesChange={onFilesChange}
      maxFiles={maxFiles}
      disabled={disabled}
      uploadLabel={t('invoiceImages.upload')}
      hintText={t('invoiceImages.hint')}
      className={className}
    />
  );
}

export default InvoiceImageUpload;

// Re-export types for backwards compatibility
export type { FileUploadResult } from '@/lib/hooks/data/useFileUpload';
