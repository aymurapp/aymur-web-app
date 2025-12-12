'use client';

/**
 * ProfileSettingsForm Component
 *
 * A form component for editing user profile information.
 * Features:
 * - Two-card layout: Avatar card + Basic Info card (side by side)
 * - Address section with Google Places autocomplete
 * - Zod validation
 * - Server action integration
 * - Loading states and error handling
 *
 * @module components/domain/settings/ProfileSettingsForm
 */

import React, { useCallback, useState, useTransition } from 'react';

import { UserOutlined, CameraOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import { Avatar, Input, Upload, message, Spin } from 'antd';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { AddressAutocomplete } from '@/components/common/forms/AddressAutocomplete';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Form } from '@/components/ui/Form';
import { updateProfile, uploadAvatar, deleteAvatar } from '@/lib/actions/profile';
import type { ParsedAddress } from '@/lib/types/address';
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
// INNER FORM COMPONENT
// =============================================================================

/**
 * Inner form content that uses useFormContext
 */
function ProfileFormContent({
  initialData,
  avatarUrl,
  setAvatarUrl,
  isUploadingAvatar,
  setIsUploadingAvatar,
  isDeletingAvatar,
  setIsDeletingAvatar,
  isPending,
}: {
  initialData: ProfileSettingsFormProps['initialData'];
  avatarUrl: string | null;
  setAvatarUrl: React.Dispatch<React.SetStateAction<string | null>>;
  isUploadingAvatar: boolean;
  setIsUploadingAvatar: React.Dispatch<React.SetStateAction<boolean>>;
  isDeletingAvatar: boolean;
  setIsDeletingAvatar: React.Dispatch<React.SetStateAction<boolean>>;
  isPending: boolean;
}): React.JSX.Element {
  const t = useTranslations('userSettings');
  const { setValue } = useFormContext<ProfileUpdateInput>();

  // Address state for Google Places autocomplete
  const [addressValue, setAddressValue] = useState(initialData.address || '');

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
    [t, setIsUploadingAvatar, setAvatarUrl]
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
  }, [avatarUrl, t, setIsDeletingAvatar, setAvatarUrl]);

  /**
   * Handle address selection from Google Places autocomplete
   */
  const handleAddressSelect = useCallback(
    (parsedAddress: ParsedAddress): void => {
      // Set the full address
      if (parsedAddress.fullAddress) {
        setAddressValue(parsedAddress.fullAddress);
        setValue('address', parsedAddress.fullAddress, { shouldDirty: true });
      }

      // Set city
      if (parsedAddress.city) {
        setValue('city', parsedAddress.city, { shouldDirty: true });
      }

      // Set province/area
      if (parsedAddress.area) {
        setValue('province', parsedAddress.area, { shouldDirty: true });
      }

      // Set country
      if (parsedAddress.country) {
        setValue('country', parsedAddress.country, { shouldDirty: true });
      }
    },
    [setValue]
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
    <>
      {/* Top Section: Avatar Card + Basic Info Card (side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar Card */}
        <Card className="p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
            {t('profile.avatar')}
          </h3>

          <div className="flex flex-col items-center gap-4">
            {/* Avatar Preview */}
            <div className="relative">
              <Avatar
                size={120}
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
            <div className="flex flex-col gap-2 w-full">
              <Upload {...uploadProps} className="w-full">
                <Button
                  icon={<CameraOutlined />}
                  loading={isUploadingAvatar}
                  disabled={isDeletingAvatar}
                  className="w-full"
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
                  className="w-full"
                >
                  {t('profile.removeAvatar')}
                </Button>
              )}
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 text-center">
              {t('profile.avatarHint')}
            </p>
          </div>
        </Card>

        {/* Basic Info Card */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
            {t('profile.personalInfo')}
          </h3>

          <div className="space-y-4">
            {/* Full Name */}
            <Form.Item<ProfileUpdateInput> name="full_name" label={t('profile.fullName')} required>
              <Input size="large" placeholder={t('profile.fullNamePlaceholder')} maxLength={100} />
            </Form.Item>

            {/* Email (Read-only) */}
            <Form.Item<ProfileUpdateInput> name="email" label={t('profile.email')}>
              <Input size="large" disabled className="bg-stone-50 dark:bg-stone-800" />
            </Form.Item>

            {/* Phone */}
            <Form.Item<ProfileUpdateInput> name="phone" label={t('profile.phone')}>
              <Input size="large" placeholder={t('profile.phonePlaceholder')} maxLength={20} />
            </Form.Item>
          </div>
        </Card>
      </div>

      {/* Address Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
          {t('profile.addressInfo')}
        </h3>

        <div className="space-y-4">
          {/* Address with Google Places Autocomplete */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              {t('profile.address')}
            </label>
            <AddressAutocomplete
              onAddressSelect={handleAddressSelect}
              value={addressValue}
              onChange={(value) => {
                setAddressValue(value);
                setValue('address', value, { shouldDirty: true });
              }}
              placeholder={t('profile.addressPlaceholder')}
              size="large"
            />
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              {t('profile.addressHint')}
            </p>
          </div>

          {/* City, Province, Country - 3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* City */}
            <Form.Item<ProfileUpdateInput> name="city" label={t('profile.city')}>
              <Input size="large" placeholder={t('profile.cityPlaceholder')} maxLength={100} />
            </Form.Item>

            {/* Province */}
            <Form.Item<ProfileUpdateInput> name="province" label={t('profile.province')}>
              <Input size="large" placeholder={t('profile.provincePlaceholder')} maxLength={100} />
            </Form.Item>

            {/* Country */}
            <Form.Item<ProfileUpdateInput> name="country" label={t('profile.country')}>
              <Input size="large" placeholder={t('profile.countryPlaceholder')} maxLength={100} />
            </Form.Item>
          </div>
        </div>

        {/* Submit Button */}
        <Form.Submit className="pt-6">
          <Button type="primary" size="large" loading={isPending} className="min-w-[160px]">
            {isPending ? t('profile.saving') : t('profile.saveChanges')}
          </Button>
        </Form.Submit>
      </Card>
    </>
  );
}

// =============================================================================
// MAIN COMPONENT
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
}: ProfileSettingsFormProps): React.JSX.Element {
  const t = useTranslations('userSettings');
  const [isPending, startTransition] = useTransition();

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialData.avatar_url);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);

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

  return (
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
      className="space-y-6"
    >
      <ProfileFormContent
        initialData={initialData}
        avatarUrl={avatarUrl}
        setAvatarUrl={setAvatarUrl}
        isUploadingAvatar={isUploadingAvatar}
        setIsUploadingAvatar={setIsUploadingAvatar}
        isDeletingAvatar={isDeletingAvatar}
        setIsDeletingAvatar={setIsDeletingAvatar}
        isPending={isPending}
      />
    </Form>
  );
}

export default ProfileSettingsForm;
