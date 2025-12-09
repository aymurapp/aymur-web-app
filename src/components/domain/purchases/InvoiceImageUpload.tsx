'use client';

/**
 * InvoiceImageUpload Component
 *
 * A component for uploading one or many invoice images for purchases.
 * Uses Ant Design Upload component with custom styling for the luxury jewelry theme.
 *
 * Features:
 * - Multiple file upload support
 * - Image preview
 * - Delete functionality
 * - Loading states
 * - Validation (file type and size)
 * - RTL support with logical properties
 *
 * @module components/domain/purchases/InvoiceImageUpload
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  LoadingOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { Upload, Modal, Image, message, Typography, Spin } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  useUploadFile,
  useDeleteFile,
  useEntityFiles,
  type FileUploadResult,
} from '@/lib/hooks/data/useFileUpload';
import { cn } from '@/lib/utils/cn';

import type { UploadFile, UploadProps, RcFile } from 'antd/es/upload';

const { Text } = Typography;

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

/**
 * Extended upload file with additional metadata
 */
interface ExtendedUploadFile extends UploadFile {
  fileId?: string;
  filePath?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

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

  // Local state for files (used when purchaseId is null - new purchase)
  const [localFiles, setLocalFiles] = useState<ExtendedUploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // Hooks
  const { uploadFileAsync, isUploading } = useUploadFile();
  const deleteFileMutation = useDeleteFile();
  const { data: existingFiles = [], isLoading: isLoadingFiles } = useEntityFiles(
    'purchases',
    purchaseId
  );

  // Convert existing files to upload file format
  const existingUploadFiles: ExtendedUploadFile[] = useMemo(
    () =>
      existingFiles.map((file) => ({
        uid: file.id_file,
        name: file.file_name,
        status: 'done' as const,
        url: file.file_url,
        fileId: file.id_file,
        filePath: file.file_path,
        type: file.mime_type,
      })),
    [existingFiles]
  );

  // Combined file list
  const fileList: ExtendedUploadFile[] = purchaseId ? existingUploadFiles : localFiles;

  /**
   * Validates a file before upload
   */
  const validateFile = useCallback(
    (file: RcFile): boolean => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        message.error(t('invoiceImages.fileTooLarge', { maxSize: '10MB' }));
        return false;
      }

      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        message.error(t('invoiceImages.invalidType'));
        return false;
      }

      // Check max files
      if (fileList.length >= maxFiles) {
        message.error(t('invoiceImages.maxFilesReached', { max: maxFiles }));
        return false;
      }

      return true;
    },
    [fileList.length, maxFiles, t]
  );

  /**
   * Handles file upload
   */
  const handleUpload = useCallback(
    async (file: RcFile): Promise<boolean> => {
      if (!validateFile(file)) {
        return false;
      }

      try {
        const result = await uploadFileAsync({
          file,
          options: {
            entityType: 'purchases',
            entityId: purchaseId,
          },
        });

        // Create upload file entry
        const newFile: ExtendedUploadFile = {
          uid: result.id_file,
          name: result.file_name,
          status: 'done',
          url: result.file_url,
          fileId: result.id_file,
          filePath: result.file_path,
          type: result.mime_type,
        };

        if (!purchaseId) {
          // For new purchases, track locally
          setLocalFiles((prev) => {
            const updated = [...prev, newFile];
            // Notify parent of uploaded files
            const results: FileUploadResult[] = updated.map((f) => ({
              id_file: f.fileId!,
              file_path: f.filePath!,
              file_url: f.url!,
              file_name: f.name,
              file_size_bytes: 0,
              mime_type: f.type || 'image/jpeg',
            }));
            onFilesChange?.(results);
            return updated;
          });
        }

        message.success(t('invoiceImages.uploadSuccess'));
      } catch (error) {
        console.error('[InvoiceImageUpload] Upload error:', error);
        message.error(t('invoiceImages.uploadError'));
      }

      // Return false to prevent default upload behavior
      return false;
    },
    [purchaseId, uploadFileAsync, validateFile, onFilesChange, t]
  );

  /**
   * Handles file removal
   */
  const handleRemove = useCallback(
    async (file: ExtendedUploadFile) => {
      if (!file.fileId || !file.filePath) {
        // Local file that wasn't uploaded yet
        setLocalFiles((prev) => prev.filter((f) => f.uid !== file.uid));
        return true;
      }

      try {
        await deleteFileMutation.mutateAsync({
          fileId: file.fileId,
          filePath: file.filePath,
          entityType: 'purchases',
          entityId: purchaseId ?? undefined,
        });

        if (!purchaseId) {
          setLocalFiles((prev) => {
            const updated = prev.filter((f) => f.uid !== file.uid);
            // Notify parent
            const results: FileUploadResult[] = updated.map((f) => ({
              id_file: f.fileId!,
              file_path: f.filePath!,
              file_url: f.url!,
              file_name: f.name,
              file_size_bytes: 0,
              mime_type: f.type || 'image/jpeg',
            }));
            onFilesChange?.(results);
            return updated;
          });
        }

        message.success(t('invoiceImages.deleteSuccess'));
        return true;
      } catch (error) {
        console.error('[InvoiceImageUpload] Delete error:', error);
        message.error(t('invoiceImages.deleteError'));
        return false;
      }
    },
    [purchaseId, deleteFileMutation, onFilesChange, t]
  );

  /**
   * Handles preview
   */
  const handlePreview = useCallback(async (file: ExtendedUploadFile) => {
    if (!file.url) {
      return;
    }

    // For PDFs, open in new tab
    if (file.type === 'application/pdf') {
      window.open(file.url, '_blank');
      return;
    }

    setPreviewImage(file.url);
    setPreviewTitle(file.name);
    setPreviewOpen(true);
  }, []);

  // Upload props
  const uploadProps: UploadProps = {
    name: 'invoice-image',
    listType: 'picture-card',
    fileList,
    beforeUpload: handleUpload,
    onRemove: handleRemove,
    onPreview: handlePreview,
    accept: ALLOWED_TYPES.join(','),
    multiple: true,
    disabled: disabled || isUploading,
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: !disabled,
    },
    itemRender: (originNode, file) => {
      const extFile = file as ExtendedUploadFile;

      // Custom render for PDF files
      if (extFile.type === 'application/pdf') {
        return (
          <div
            className={cn(
              'relative w-full h-full',
              'flex flex-col items-center justify-center',
              'bg-stone-50 border border-stone-200 rounded-lg',
              'hover:border-amber-400 transition-colors'
            )}
          >
            <FilePdfOutlined className="text-3xl text-red-500 mb-1" />
            <Text ellipsis className="text-xs text-stone-600 max-w-full px-1">
              {file.name}
            </Text>
            <div className="absolute top-1 end-1 flex gap-1">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(extFile);
                }}
                className="!p-1 !min-w-0"
              />
              {!disabled && (
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(extFile);
                  }}
                  className="!p-1 !min-w-0"
                />
              )}
            </div>
          </div>
        );
      }

      return originNode;
    },
  };

  // Loading state
  if (purchaseId && isLoadingFiles) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Spin indicator={<LoadingOutlined spin />} />
      </div>
    );
  }

  return (
    <div className={cn('invoice-image-upload', className)}>
      <Upload {...uploadProps}>
        {fileList.length >= maxFiles ? null : (
          <div className="flex flex-col items-center justify-center py-2">
            {isUploading ? (
              <LoadingOutlined className="text-2xl text-amber-500" />
            ) : (
              <PlusOutlined className="text-2xl text-stone-400" />
            )}
            <Text type="secondary" className="text-xs mt-1">
              {t('invoiceImages.upload')}
            </Text>
          </div>
        )}
      </Upload>

      {/* Empty state */}
      {fileList.length === 0 && !isUploading && (
        <div className="text-center py-2">
          <Text type="secondary" className="text-xs">
            {t('invoiceImages.hint')}
          </Text>
        </div>
      )}

      {/* File count */}
      {fileList.length > 0 && (
        <Text type="secondary" className="text-xs block mt-2">
          {t('invoiceImages.fileCount', { count: fileList.length, max: maxFiles })}
        </Text>
      )}

      {/* Preview Modal */}
      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
        width={800}
        centered
      >
        <Image alt={previewTitle} src={previewImage} style={{ width: '100%' }} preview={false} />
      </Modal>
    </div>
  );
}

export default InvoiceImageUpload;
