'use client';

/**
 * ShopLogoUpload Component
 *
 * A specialized image upload component for shop logos with:
 * - Image cropping (crop, zoom, rotate)
 * - Square aspect ratio (1:1) for logos
 * - Preview functionality
 * - Drag & drop support
 * - File validation
 *
 * Uses antd-img-crop for the cropping modal.
 *
 * @module components/common/forms/ShopLogoUpload
 */

import React, { useState, useCallback } from 'react';

import { PlusOutlined, LoadingOutlined, DeleteOutlined } from '@ant-design/icons';
import { Upload, message, Image } from 'antd';
import ImgCrop from 'antd-img-crop';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { useUploadFile, type FileUploadResult } from '@/lib/hooks/data/useFileUpload';
import { cn } from '@/lib/utils/cn';

import type { UploadFile, UploadProps, RcFile } from 'antd/es/upload';

// =============================================================================
// TYPES
// =============================================================================

export interface ShopLogoUploadProps {
  /**
   * Current logo URL (for editing existing shops)
   */
  value?: string | null;

  /**
   * Callback when logo changes
   */
  onChange?: (logoUrl: string | null) => void;

  /**
   * Callback with full file upload result (for new entities)
   */
  onFileChange?: (file: FileUploadResult | null) => void;

  /**
   * Whether the component is disabled
   */
  disabled?: boolean;

  /**
   * Maximum file size in bytes
   * @default 5MB
   */
  maxFileSize?: number;

  /**
   * Additional class name
   */
  className?: string;

  /**
   * Size of the upload area
   * @default 'large'
   */
  size?: 'small' | 'medium' | 'large';
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const SIZE_CLASSES = {
  small: 'w-20 h-20',
  medium: 'w-28 h-28',
  large: 'w-36 h-36',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ShopLogoUpload({
  value,
  onChange,
  onFileChange,
  disabled = false,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  className,
  size = 'large',
}: ShopLogoUploadProps): React.JSX.Element {
  const t = useTranslations('common');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>(() => {
    // Initialize with existing logo if provided
    if (value) {
      return [
        {
          uid: '-1',
          name: 'logo',
          status: 'done',
          url: value,
        },
      ];
    }
    return [];
  });

  // Upload hook
  const { uploadFileAsync, isUploading } = useUploadFile();

  /**
   * Validates a file before upload
   */
  const validateFile = useCallback(
    (file: RcFile): boolean => {
      // Check file size
      if (file.size > maxFileSize) {
        const maxSizeMB = Math.round(maxFileSize / 1024 / 1024);
        message.error(t('fileUpload.fileTooLarge', { maxSize: `${maxSizeMB}MB` }));
        return false;
      }

      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        message.error(t('fileUpload.invalidType'));
        return false;
      }

      return true;
    },
    [maxFileSize, t]
  );

  /**
   * Handles the actual file upload
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
            entityType: 'shops',
            entityId: null, // Will be linked after shop creation
          },
        });

        // Update file list with uploaded file
        const newFile: UploadFile = {
          uid: result.id_file,
          name: result.file_name,
          status: 'done',
          url: result.file_url,
        };

        setFileList([newFile]);
        onChange?.(result.file_url);
        onFileChange?.(result);
        message.success(t('fileUpload.uploadSuccess'));
      } catch (error) {
        console.error('[ShopLogoUpload] Upload error:', error);
        message.error(t('fileUpload.uploadError'));
      }

      // Return false to prevent default upload behavior
      return false;
    },
    [uploadFileAsync, validateFile, onChange, onFileChange, t]
  );

  /**
   * Handle file removal
   */
  const handleRemove = useCallback(() => {
    setFileList([]);
    onChange?.(null);
    onFileChange?.(null);
    return true;
  }, [onChange, onFileChange]);

  /**
   * Handle preview
   */
  const handlePreview = useCallback((file: UploadFile) => {
    if (file.url) {
      setPreviewOpen(true);
    }
  }, []);

  // Upload props
  const uploadProps: UploadProps = {
    name: 'shop-logo',
    listType: 'picture-card',
    fileList,
    onPreview: handlePreview,
    onRemove: handleRemove,
    beforeUpload: handleUpload,
    accept: ALLOWED_TYPES.join(','),
    maxCount: 1,
    disabled: disabled || isUploading,
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: !disabled,
    },
  };

  // Get current image URL
  const currentImageUrl = fileList[0]?.url || value;

  return (
    <div className={cn('shop-logo-upload', className)}>
      <ImgCrop
        rotationSlider
        showGrid
        showReset
        aspect={1}
        quality={0.9}
        modalTitle={t('fileUpload.cropImage') || 'Crop Image'}
        modalOk={t('actions.confirm') || 'OK'}
        modalCancel={t('actions.cancel') || 'Cancel'}
      >
        <Upload {...uploadProps} className={cn('logo-uploader', SIZE_CLASSES[size])}>
          {fileList.length >= 1 ? null : (
            <div className="flex flex-col items-center justify-center h-full">
              {isUploading ? (
                <LoadingOutlined className="text-2xl text-amber-500" />
              ) : (
                <>
                  <PlusOutlined className="text-2xl text-stone-400" />
                  <span className="text-xs text-stone-500 mt-1">
                    {t('fileUpload.upload') || 'Upload'}
                  </span>
                </>
              )}
            </div>
          )}
        </Upload>
      </ImgCrop>

      {/* Remove button when there's an image */}
      {fileList.length > 0 && !disabled && (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={handleRemove}
          className="mt-2"
        >
          {t('actions.remove') || 'Remove'}
        </Button>
      )}

      {/* Preview Modal */}
      {currentImageUrl && (
        <Image
          wrapperStyle={{ display: 'none' }}
          preview={{
            visible: previewOpen,
            onVisibleChange: (visible) => setPreviewOpen(visible),
            src: currentImageUrl,
          }}
          alt="Logo preview"
          src={currentImageUrl}
        />
      )}
    </div>
  );
}

export default ShopLogoUpload;
