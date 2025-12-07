'use client';

/**
 * ProfileSettingsForm Component
 *
 * A form component for editing user profile information.
 * Features:
 * - Avatar upload with preview
 * - Profile fields (name, phone, address)
 * - Zod validation
 * - Server action integration
 * - Loading states and error handling
 *
 * @module components/domain/settings/ProfileSettingsForm
 */

import React, { useCallback, useState, useTransition } from 'react';

import { UserOutlined, CameraOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import { Avatar, Input, Upload, message, Spin, Divider, Space } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Form } from '@/components/ui/Form';
import { updateProfile, uploadAvatar, deleteAvatar } from '@/lib/actions/profile';
import { profileUpdateSchema, type ProfileUpdateInput } from '@/lib/utils/validation';

import type { RcFile, UploadProps } from 'antd/es/upload';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the ProfileSettingsForm component
 */
export interface ProfileSettingsFormProps {
  /**
   * Initial profile data to populate the form
   */
  initialData: {
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    country: string | null;
    province: string | null;
    city: string | null;
    address: string | null;
  };

  /**
   * Callback when profile is successfully updated
   */
  onSuccess?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum file size for avatar (2MB)
 */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

/**
 * Allowed file types for avatar
 */
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ProfileSettingsForm Component
 *
 * Provides a form for users to edit their profile information
 * including avatar, name, phone, and address details.
 */
export function ProfileSettingsForm({
  initialData,
  onSuccess,
}: ProfileSettingsFormProps): JSX.Element {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialData.avatar_url);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);

  /**
   * Handle avatar file upload
   */
  const handleAvatarUpload = useCallback(
    async (file: RcFile): Promise<boolean> => {
      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        message.error(t('profile.avatarInvalidType'));
        return false;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        message.error(t('profile.avatarTooLarge'));
        return false;
      }

      setIsUploadingAvatar(true);

      try {
        const formData = new FormData();
        formData.append('avatar', file);

        const result = await uploadAvatar(formData);

        if (result.success && result.data) {
          setAvatarUrl(result.data.avatar_url);
          message.success(t('profile.avatarUploadSuccess'));
        } else if (!result.success) {
          message.error(result.error || t('profile.avatarUploadError'));
        }
      } catch (error) {
        console.error('[ProfileSettingsForm] Avatar upload error:', error);
        message.error(t('profile.avatarUploadError'));
      } finally {
        setIsUploadingAvatar(false);
      }

      // Return false to prevent default upload behavior
      return false;
    },
    [t]
  );

  /**
   * Handle avatar deletion
   */
  const handleAvatarDelete = useCallback(async () => {
    if (!avatarUrl) {
      return;
    }

    setIsDeletingAvatar(true);

    try {
      const result = await deleteAvatar();

      if (result.success) {
        setAvatarUrl(null);
        message.success(t('profile.avatarDeleteSuccess'));
      } else {
        message.error(result.error || t('profile.avatarDeleteError'));
      }
    } catch (error) {
      console.error('[ProfileSettingsForm] Avatar delete error:', error);
      message.error(t('profile.avatarDeleteError'));
    } finally {
      setIsDeletingAvatar(false);
    }
  }, [avatarUrl, t]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: ProfileUpdateInput) => {
      startTransition(async () => {
        try {
          const result = await updateProfile({
            full_name: data.full_name,
            phone: data.phone || null,
            country: data.country || null,
            province: data.province || null,
            city: data.city || null,
            address: data.address || null,
          });

          if (result.success) {
            message.success(t('profile.updateSuccess'));
            onSuccess?.();
          } else {
            message.error(result.error || t('profile.updateError'));
          }
        } catch (error) {
          console.error('[ProfileSettingsForm] Submit error:', error);
          message.error(t('profile.updateError'));
        }
      });
    },
    [t, onSuccess]
  );

  /**
   * Upload component props
   */
  const uploadProps: UploadProps = {
    name: 'avatar',
    showUploadList: false,
    accept: ALLOWED_FILE_TYPES.join(','),
    beforeUpload: handleAvatarUpload,
    disabled: isUploadingAvatar || isDeletingAvatar,
  };

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">{t('profile.avatar')}</h3>

        <div className="flex items-center gap-6">
          {/* Avatar Preview */}
          <div className="relative">
            <Avatar
              size={96}
              src={avatarUrl}
              icon={!avatarUrl && <UserOutlined />}
              className="bg-amber-100 text-amber-600"
            />
            {(isUploadingAvatar || isDeletingAvatar) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                <Spin indicator={<LoadingOutlined className="text-white" spin />} />
              </div>
            )}
          </div>

          {/* Avatar Actions */}
          <div className="flex flex-col gap-2">
            <Space>
              <Upload {...uploadProps}>
                <Button
                  icon={<CameraOutlined />}
                  loading={isUploadingAvatar}
                  disabled={isDeletingAvatar}
                >
                  {t('profile.uploadAvatar')}
                </Button>
              </Upload>

              {avatarUrl && (
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  onClick={handleAvatarDelete}
                  loading={isDeletingAvatar}
                  disabled={isUploadingAvatar}
                >
                  {t('profile.removeAvatar')}
                </Button>
              )}
            </Space>

            <p className="text-sm text-stone-500">{t('profile.avatarHint')}</p>
          </div>
        </div>
      </Card>

      {/* Profile Form */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">{t('profile.personalInfo')}</h3>

        <Form<ProfileUpdateInput>
          schema={profileUpdateSchema}
          onSubmit={handleSubmit}
          defaultValues={{
            full_name: initialData.full_name,
            email: initialData.email,
            phone: initialData.phone || '',
            country: initialData.country || '',
            province: initialData.province || '',
            city: initialData.city || '',
            address: initialData.address || '',
          }}
          className="space-y-4"
        >
          {/* Full Name */}
          <Form.Item<ProfileUpdateInput> name="full_name" label={t('profile.fullName')} required>
            <Input size="large" placeholder={t('profile.fullNamePlaceholder')} maxLength={100} />
          </Form.Item>

          {/* Email (Read-only) */}
          <Form.Item<ProfileUpdateInput> name="email" label={t('profile.email')}>
            <Input size="large" disabled className="bg-stone-50" />
          </Form.Item>

          {/* Phone */}
          <Form.Item<ProfileUpdateInput> name="phone" label={t('profile.phone')}>
            <Input size="large" placeholder={t('profile.phonePlaceholder')} maxLength={20} />
          </Form.Item>

          <Divider className="my-6" />

          <h4 className="text-base font-medium text-stone-800 mb-4">{t('profile.addressInfo')}</h4>

          {/* Country */}
          <Form.Item<ProfileUpdateInput> name="country" label={t('profile.country')}>
            <Input size="large" placeholder={t('profile.countryPlaceholder')} maxLength={100} />
          </Form.Item>

          {/* Province */}
          <Form.Item<ProfileUpdateInput> name="province" label={t('profile.province')}>
            <Input size="large" placeholder={t('profile.provincePlaceholder')} maxLength={100} />
          </Form.Item>

          {/* City */}
          <Form.Item<ProfileUpdateInput> name="city" label={t('profile.city')}>
            <Input size="large" placeholder={t('profile.cityPlaceholder')} maxLength={100} />
          </Form.Item>

          {/* Address */}
          <Form.Item<ProfileUpdateInput> name="address" label={t('profile.address')}>
            <Input.TextArea
              rows={3}
              placeholder={t('profile.addressPlaceholder')}
              maxLength={500}
              showCount
            />
          </Form.Item>

          {/* Submit Button */}
          <Form.Submit className="pt-4">
            <Button type="primary" size="large" loading={isPending} className="min-w-[160px]">
              {isPending ? t('common.actions.saving') : t('common.actions.saveChanges')}
            </Button>
          </Form.Submit>
        </Form>
      </Card>
    </div>
  );
}

export default ProfileSettingsForm;
