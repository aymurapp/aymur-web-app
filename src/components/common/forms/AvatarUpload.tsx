'use client';

/**
 * AvatarUpload Component
 *
 * A specialized image upload component for user avatars with:
 * - Circular image cropping (crop, zoom, rotate)
 * - Preview functionality
 * - Drag & drop support
 * - File validation (max 2MB, images only)
 * - Server action integration for upload/delete
 *
 * Uses antd-img-crop for the cropping modal with circular crop shape.
 *
 * @module components/common/forms/AvatarUpload
 */

import React, { useState, useCallback, useTransition } from 'react';

import { UserOutlined, LoadingOutlined, DeleteOutlined, CameraOutlined } from '@ant-design/icons';
import { Upload, message, Image } from 'antd';
import ImgCrop from 'antd-img-crop';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { uploadAvatar, deleteAvatar } from '@/lib/actions/profile';
import { cn } from '@/lib/utils/cn';

import type { UploadFile, UploadProps, RcFile } from 'antd/es/upload';

// =============================================================================
// TYPES
// =============================================================================

export interface AvatarUploadProps {
  /**
   * Current avatar URL
   */
  value?: string | null;

  /**
   * Callback when avatar changes
   */
  onChange?: (avatarUrl: string | null) => void;

  /**
   * User name for showing initial in placeholder
   */
  userName?: string;

  /**
   * Size of the avatar upload area
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large' | 'xlarge';

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
// CONSTANTS
// =============================================================================

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Note: Size classes moved inline to PIXEL_SIZES in the component
// to use explicit pixel values for better antd Upload compatibility

const ICON_SIZES = {
  small: 'text-xl',
  medium: 'text-2xl',
  large: 'text-3xl',
  xlarge: 'text-4xl',
};

const INITIAL_SIZES = {
  small: 'text-lg',
  medium: 'text-2xl',
  large: 'text-3xl',
  xlarge: 'text-4xl',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the user initial from the name
 */
function getUserInitial(userName?: string): string {
  if (!userName || userName.trim().length === 0) {
    return '';
  }
  return userName.trim().charAt(0).toUpperCase();
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AvatarUpload({
  value,
  onChange,
  userName,
  size = 'medium',
  disabled = false,
  className,
}: AvatarUploadProps): React.JSX.Element {
  const t = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>(() => {
    // Initialize with existing avatar if provided
    if (value) {
      return [
        {
          uid: '-1',
          name: 'avatar',
          status: 'done',
          url: value,
        },
      ];
    }
    return [];
  });

  // Sync fileList when value prop changes externally
  React.useEffect(() => {
    if (value && fileList.length === 0) {
      setFileList([
        {
          uid: '-1',
          name: 'avatar',
          status: 'done',
          url: value,
        },
      ]);
    } else if (!value && fileList.length > 0) {
      setFileList([]);
    }
  }, [value, fileList.length]);

  /**
   * Validates a file before upload
   */
  const validateFile = useCallback(
    (file: RcFile): boolean => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        message.error(t('fileUpload.fileTooLarge', { maxSize: '2MB' }));
        return false;
      }

      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        message.error(t('fileUpload.invalidType'));
        return false;
      }

      return true;
    },
    [t]
  );

  /**
   * Handles the actual file upload using server action
   */
  const handleUpload = useCallback(
    async (file: RcFile): Promise<boolean> => {
      if (!validateFile(file)) {
        return false;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('avatar', file);

        const result = await uploadAvatar(formData);

        if (!result.success) {
          console.error('[AvatarUpload] Upload error:', result.error);
          message.error(result.error || t('fileUpload.uploadError'));
          return false;
        }

        if (result.data) {
          // Update file list with uploaded file
          const newFile: UploadFile = {
            uid: Date.now().toString(),
            name: file.name,
            status: 'done',
            url: result.data.avatar_url,
          };

          setFileList([newFile]);
          onChange?.(result.data.avatar_url);
          message.success(t('fileUpload.uploadSuccess'));
        }
      } catch (error) {
        console.error('[AvatarUpload] Upload error:', error);
        message.error(t('fileUpload.uploadError'));
      } finally {
        setIsUploading(false);
      }

      // Return false to prevent default upload behavior
      return false;
    },
    [validateFile, onChange, t]
  );

  /**
   * Handle file removal / avatar deletion
   */
  const handleRemove = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await deleteAvatar();

        if (result.success) {
          setFileList([]);
          onChange?.(null);
          message.success(t('fileUpload.deleteSuccess'));
        } else {
          console.error('[AvatarUpload] Delete error:', result.error);
          message.error(result.error || t('fileUpload.deleteError'));
        }
      } catch (error) {
        console.error('[AvatarUpload] Delete error:', error);
        message.error(t('fileUpload.deleteError'));
      }
    });
    return false; // Prevent default removal behavior, we handle it via server action
  }, [onChange, t]);

  /**
   * Handle preview
   */
  const handlePreview = useCallback((file: UploadFile) => {
    if (file.url) {
      setPreviewOpen(true);
    }
  }, []);

  // Get current image URL
  const currentImageUrl = fileList[0]?.url || value;
  const hasImage = !!currentImageUrl;
  const userInitial = getUserInitial(userName);
  const isLoading = isUploading || isPending;

  // Upload props
  const uploadProps: UploadProps = {
    name: 'avatar',
    listType: 'picture-card',
    fileList,
    onPreview: handlePreview,
    onRemove: handleRemove,
    beforeUpload: handleUpload,
    accept: ALLOWED_TYPES.join(','),
    maxCount: 1,
    disabled: disabled || isLoading,
    showUploadList: false, // We use custom rendering
  };

  // Get pixel size for explicit width/height
  const PIXEL_SIZES = {
    small: 64,
    medium: 96,
    large: 128,
    xlarge: 160,
  };
  const pixelSize = PIXEL_SIZES[size];

  /**
   * Renders the avatar content based on state (loading, has image, or placeholder)
   */
  const renderAvatarContent = (): React.JSX.Element => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center w-full h-full bg-stone-100">
          <LoadingOutlined className={cn('text-amber-500', ICON_SIZES[size])} />
        </div>
      );
    }

    if (hasImage) {
      return (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentImageUrl} alt="Avatar" className="w-full h-full object-cover" />
          {/* Hover overlay */}
          {!disabled && (
            <div
              className={cn(
                'absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100',
                'flex items-center justify-center transition-opacity duration-200'
              )}
            >
              <CameraOutlined className="text-white text-xl" />
            </div>
          )}
        </>
      );
    }

    // Placeholder - show initial or user icon
    return (
      <div className="flex items-center justify-center w-full h-full bg-stone-200">
        {userInitial ? (
          <span className={cn('font-semibold text-stone-500 select-none', INITIAL_SIZES[size])}>
            {userInitial}
          </span>
        ) : (
          <UserOutlined className={cn('text-stone-400', ICON_SIZES[size])} />
        )}
        {/* Hover overlay for placeholder */}
        {!disabled && (
          <div
            className={cn(
              'absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100',
              'flex items-center justify-center transition-opacity duration-200'
            )}
          >
            <CameraOutlined className="text-white text-xl" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn('avatar-upload flex flex-col items-center gap-3', className)}
      style={
        {
          // CSS variable for avatar size used by global styles
          '--avatar-size': `${pixelSize}px`,
        } as React.CSSProperties
      }
    >
      <ImgCrop
        rotationSlider
        showGrid
        showReset
        aspect={1}
        cropShape="round"
        quality={0.9}
        modalTitle={t('fileUpload.cropImage') || 'Crop Image'}
        modalOk={t('actions.confirm') || 'OK'}
        modalCancel={t('actions.cancel') || 'Cancel'}
      >
        <Upload {...uploadProps}>
          <div
            className={cn(
              'relative rounded-full overflow-hidden cursor-pointer',
              'border-2 border-stone-200 bg-stone-200',
              'transition-all duration-200',
              'hover:border-[#C9A227] hover:shadow-md',
              'group',
              disabled && 'opacity-50 cursor-not-allowed hover:border-stone-200 hover:shadow-none'
            )}
            style={{
              width: pixelSize,
              height: pixelSize,
              minWidth: pixelSize,
              minHeight: pixelSize,
            }}
          >
            {renderAvatarContent()}
          </div>
        </Upload>
      </ImgCrop>

      {/* Remove button when there's an image */}
      {hasImage && !disabled && (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={handleRemove}
          loading={isPending}
          className="text-xs"
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
          alt="Avatar preview"
          src={currentImageUrl}
        />
      )}
    </div>
  );
}

export default AvatarUpload;
