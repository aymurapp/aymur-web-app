'use client';

/**
 * Onboarding Profile Completion Page
 *
 * Enterprise-grade profile completion page for the AYMUR jewelry platform onboarding flow.
 * Allows users to complete their profile with avatar upload and basic information.
 *
 * Features:
 * - Dark hero section with centered avatar upload
 * - Gold ring accent around avatar area
 * - Clean form section for profile fields
 * - Pre-population from session/auth metadata
 * - Route-aware navigation (owner vs team paths)
 * - Responsive layout with RTL support
 * - Loading states during save operations
 *
 * @module app/(platform)/[locale]/onboarding/profile
 */

import React, { useState, useCallback, useEffect, Suspense } from 'react';

import { useSearchParams } from 'next/navigation';

import { UserOutlined, PhoneOutlined, GlobalOutlined, HomeOutlined } from '@ant-design/icons';
import { Form, Input, Select, Avatar, message, Upload } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner, LoadingSpinnerSection } from '@/components/ui/LoadingSpinner';
import { updateProfile, uploadAvatar } from '@/lib/actions/profile';
import { useUser } from '@/lib/hooks/auth';
import { useRouter } from '@/lib/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

import type { FormInstance } from 'antd';
import type { RcFile } from 'antd/es/upload';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Brand colors derived from AYMUR logo
 */
const BRAND_COLORS = {
  gold: '#C9A227',
  goldLight: '#E5C76B',
  goldDark: '#A68B1F',
} as const;

/**
 * Common countries list for the dropdown
 */
const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'KW', label: 'Kuwait' },
  { value: 'QA', label: 'Qatar' },
  { value: 'BH', label: 'Bahrain' },
  { value: 'OM', label: 'Oman' },
  { value: 'IQ', label: 'Iraq' },
  { value: 'JO', label: 'Jordan' },
  { value: 'LB', label: 'Lebanon' },
  { value: 'EG', label: 'Egypt' },
  { value: 'MA', label: 'Morocco' },
  { value: 'TN', label: 'Tunisia' },
  { value: 'DZ', label: 'Algeria' },
  { value: 'TR', label: 'Turkey' },
  { value: 'IN', label: 'India' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IT', label: 'Italy' },
  { value: 'ES', label: 'Spain' },
  { value: 'CH', label: 'Switzerland' },
];

/**
 * Avatar upload configuration
 */
const AVATAR_CONFIG = {
  maxSizeMB: 2,
  maxSizeBytes: 2 * 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};

// =============================================================================
// TYPES
// =============================================================================

interface ProfileFormValues {
  full_name: string;
  phone?: string;
  country?: string;
  city?: string;
}

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Hero section with avatar upload
 */
function HeroSection({
  avatarUrl,
  userName,
  isUploading,
  onAvatarChange,
  t,
}: {
  avatarUrl: string | null;
  userName: string;
  isUploading: boolean;
  onAvatarChange: (file: RcFile) => void;
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  const tCommon = useTranslations('common');

  /**
   * Validates avatar file before upload
   */
  const beforeUpload = (file: RcFile): boolean => {
    // Check file size
    if (file.size > AVATAR_CONFIG.maxSizeBytes) {
      message.error(
        tCommon('fileUpload.fileTooLarge', { maxSize: `${AVATAR_CONFIG.maxSizeMB}MB` })
      );
      return false;
    }

    // Check file type
    if (!AVATAR_CONFIG.allowedTypes.includes(file.type)) {
      message.error(tCommon('fileUpload.invalidType'));
      return false;
    }

    // Trigger upload
    onAvatarChange(file);
    return false; // Prevent default upload behavior
  };

  return (
    <section
      className={cn(
        'relative overflow-hidden',
        'bg-gradient-to-b from-stone-900 via-stone-900 to-stone-800',
        'py-16 sm:py-20 lg:py-24'
      )}
      aria-labelledby="profile-title"
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Radial gradient overlay */}
        <div
          className="absolute top-0 start-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-30"
          style={{
            background: `radial-gradient(ellipse at center, ${BRAND_COLORS.gold}15 0%, transparent 70%)`,
          }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(${BRAND_COLORS.gold}20 1px, transparent 1px),
                              linear-gradient(90deg, ${BRAND_COLORS.gold}20 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Avatar upload area with gold ring */}
        <div className="mb-8 inline-flex">
          <Upload
            name="avatar"
            showUploadList={false}
            beforeUpload={beforeUpload}
            accept={AVATAR_CONFIG.allowedTypes.join(',')}
            disabled={isUploading}
          >
            <div
              className={cn(
                'relative cursor-pointer group',
                'transition-transform duration-300',
                'hover:scale-105'
              )}
            >
              {/* Gold ring container */}
              <div
                className={cn(
                  'relative w-32 h-32 sm:w-40 sm:h-40 rounded-full',
                  'flex items-center justify-center',
                  'p-1',
                  'bg-gradient-to-br',
                  'shadow-xl'
                )}
                style={{
                  background: `linear-gradient(135deg, ${BRAND_COLORS.gold}, ${BRAND_COLORS.goldLight}, ${BRAND_COLORS.gold})`,
                }}
              >
                {/* Inner avatar area */}
                <div className="relative w-full h-full rounded-full overflow-hidden bg-stone-800">
                  {isUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-800/80">
                      <LoadingSpinner size="medium" />
                    </div>
                  ) : (
                    <Avatar
                      size={128}
                      src={avatarUrl}
                      icon={<UserOutlined className="text-4xl sm:text-5xl" />}
                      className="w-full h-full bg-stone-700 text-stone-400"
                      style={{ width: '100%', height: '100%' }}
                    />
                  )}

                  {/* Hover overlay */}
                  <div
                    className={cn(
                      'absolute inset-0 bg-black/50',
                      'flex items-center justify-center',
                      'opacity-0 group-hover:opacity-100',
                      'transition-opacity duration-200'
                    )}
                  >
                    <span className="text-white text-sm font-medium">
                      {tCommon('fileUpload.upload')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Outer ring animation */}
              <div
                className="absolute -inset-2 rounded-full animate-pulse opacity-30"
                style={{
                  boxShadow: `0 0 0 4px ${BRAND_COLORS.gold}40, 0 0 0 8px ${BRAND_COLORS.gold}20`,
                }}
                aria-hidden="true"
              />
            </div>
          </Upload>
        </div>

        {/* User name */}
        <h2 className={cn('text-2xl sm:text-3xl font-bold', 'text-white mb-2', 'tracking-tight')}>
          {userName || t('profile.defaultName')}
        </h2>

        {/* Subtitle */}
        <p
          className={cn('text-lg sm:text-xl font-medium')}
          style={{ color: BRAND_COLORS.goldLight }}
        >
          {t('profile.subtitle')}
        </p>

        {/* Gold accent line */}
        <div
          className="mt-8 mx-auto w-24 h-1 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${BRAND_COLORS.gold}, transparent)`,
          }}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}

/**
 * Profile form section
 */
function ProfileForm({
  form,
  isSubmitting,
  t,
}: {
  form: FormInstance<ProfileFormValues>;
  isSubmitting: boolean;
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <section className="py-12 sm:py-16 bg-stone-50" aria-labelledby="form-title">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className={cn('border-stone-200', 'shadow-sm')} bodyStyle={{ padding: 0 }}>
          {/* Card header */}
          <div
            className={cn(
              'px-6 sm:px-8 py-5',
              'border-b border-stone-100',
              'bg-gradient-to-r from-stone-50 to-white'
            )}
          >
            <h3 id="form-title" className="text-lg font-semibold text-stone-900">
              {t('profile.formTitle')}
            </h3>
            <p className="text-sm text-stone-500 mt-1">{t('profile.formDescription')}</p>
          </div>

          {/* Form */}
          <div className="px-6 sm:px-8 py-6">
            <Form form={form} layout="vertical" disabled={isSubmitting} requiredMark="optional">
              {/* Full Name */}
              <Form.Item
                name="full_name"
                label={t('profile.form.fullName')}
                rules={[
                  { required: true, message: t('profile.validation.fullNameRequired') },
                  { min: 2, message: t('profile.validation.fullNameMin') },
                  { max: 100, message: t('profile.validation.fullNameMax') },
                ]}
              >
                <Input
                  prefix={<UserOutlined className="text-stone-400" />}
                  placeholder={t('profile.form.fullNamePlaceholder')}
                  size="large"
                  className="rounded-lg"
                />
              </Form.Item>

              {/* Phone Number */}
              <Form.Item name="phone" label={t('profile.form.phone')}>
                <Input
                  prefix={<PhoneOutlined className="text-stone-400" />}
                  placeholder={t('profile.form.phonePlaceholder')}
                  size="large"
                  type="tel"
                  className="rounded-lg"
                />
              </Form.Item>

              {/* Country */}
              <Form.Item name="country" label={t('profile.form.country')}>
                <Select
                  placeholder={t('profile.form.countryPlaceholder')}
                  size="large"
                  className="rounded-lg"
                  showSearch
                  optionFilterProp="label"
                  options={COUNTRIES}
                  suffixIcon={<GlobalOutlined className="text-stone-400" />}
                  allowClear
                />
              </Form.Item>

              {/* City */}
              <Form.Item name="city" label={t('profile.form.city')}>
                <Input
                  prefix={<HomeOutlined className="text-stone-400" />}
                  placeholder={t('profile.form.cityPlaceholder')}
                  size="large"
                  className="rounded-lg"
                />
              </Form.Item>
            </Form>
          </div>
        </Card>
      </div>
    </section>
  );
}

/**
 * CTA section with continue and skip options
 */
function CTASection({
  isSubmitting,
  onContinue,
  onSkip,
  t,
}: {
  isSubmitting: boolean;
  onContinue: () => void;
  onSkip: () => void;
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  const tCommon = useTranslations('common');

  return (
    <section className="py-12 sm:py-16 bg-white" aria-label="Actions">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Continue Button */}
        <Button
          type="primary"
          size="large"
          onClick={onContinue}
          loading={isSubmitting}
          className={cn(
            'h-14 px-10 text-base font-semibold',
            'border-none shadow-lg',
            'hover:shadow-xl hover:scale-[1.02]',
            'transition-all duration-200'
          )}
          style={{
            backgroundColor: BRAND_COLORS.gold,
          }}
          aria-label={tCommon('actions.continue')}
        >
          {tCommon('actions.continue')}
        </Button>

        {/* Skip link */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onSkip}
            disabled={isSubmitting}
            className={cn(
              'text-stone-500 hover:text-stone-700',
              'text-sm font-medium',
              'underline underline-offset-4',
              'transition-colors duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
              'focus-visible:ring-offset-2 rounded-sm',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {t('profile.skipForNow')}
          </button>
        </div>

        {/* Help text */}
        <p className="mt-8 text-sm text-stone-400">{t('profile.helpText')}</p>
      </div>
    </section>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

/**
 * Loading fallback for Suspense boundary
 */
function ProfilePageLoading(): React.JSX.Element {
  return <LoadingSpinnerSection className="flex-1" />;
}

/**
 * Profile Completion Page Content
 *
 * Allows users to complete their profile with avatar and basic info
 * during the onboarding flow. Routes to plans (owner) or invitation (team)
 * based on the role query parameter.
 */
function ProfilePageContent(): React.JSX.Element {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isUserLoading } = useUser();
  const [form] = Form.useForm<ProfileFormValues>();

  // State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get role from query params
  const role = searchParams.get('role') as 'owner' | 'team' | null;

  /**
   * Determine next path based on role
   */
  const getNextPath = useCallback((): string => {
    if (role === 'team') {
      return '/onboarding/invitation';
    }
    // Default to owner path
    return '/onboarding/plans';
  }, [role]);

  /**
   * Initialize form with user data
   */
  useEffect(() => {
    const initializeUserData = async (): Promise<void> => {
      // Try to get data from auth metadata first
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const metadata = authUser.user_metadata;
        const currentAvatarUrl = metadata?.avatar_url || null;
        const fullName = metadata?.full_name || user?.full_name || '';

        setAvatarUrl(currentAvatarUrl);
        form.setFieldsValue({
          full_name: fullName,
          phone: user?.phone || '',
          country: user?.country || '',
          city: user?.city || '',
        });
      }
    };

    initializeUserData();
  }, [user, form]);

  /**
   * Handles avatar upload
   */
  const handleAvatarChange = useCallback(
    async (file: RcFile) => {
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('avatar', file);

        const result = await uploadAvatar(formData);

        if (result.success && result.data) {
          setAvatarUrl(result.data.avatar_url);
          message.success(result.message || t('profile.avatarUploaded'));
        } else if (!result.success) {
          message.error(result.error || t('profile.avatarUploadFailed'));
        }
      } catch (error) {
        console.error('[ProfilePage] Avatar upload error:', error);
        message.error(t('profile.avatarUploadFailed'));
      } finally {
        setIsUploading(false);
      }
    },
    [t]
  );

  /**
   * Handles form submission (Continue button)
   */
  const handleContinue = useCallback(async () => {
    try {
      // Validate form
      const values = await form.validateFields();
      setIsSubmitting(true);

      // Update profile
      const result = await updateProfile({
        full_name: values.full_name,
        phone: values.phone || null,
        country: values.country || null,
        city: values.city || null,
      });

      if (result.success) {
        message.success(result.message || t('profile.profileUpdated'));
        router.push(getNextPath());
      } else {
        message.error(result.error || t('profile.profileUpdateFailed'));
      }
    } catch (error) {
      // Form validation failed - messages are shown by antd
      console.error('[ProfilePage] Form validation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, router, getNextPath, t]);

  /**
   * Handles skip action
   */
  const handleSkip = useCallback(() => {
    router.push(getNextPath());
  }, [router, getNextPath]);

  // Get display name
  const displayName = form.getFieldValue('full_name') || user?.full_name || '';

  // Loading state
  if (isUserLoading) {
    return <LoadingSpinnerSection className="flex-1" />;
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero section with avatar upload */}
      <HeroSection
        avatarUrl={avatarUrl}
        userName={displayName}
        isUploading={isUploading}
        onAvatarChange={handleAvatarChange}
        t={t}
      />

      {/* Form section */}
      <ProfileForm form={form} isSubmitting={isSubmitting} t={t} />

      {/* CTA section */}
      <CTASection
        isSubmitting={isSubmitting}
        onContinue={handleContinue}
        onSkip={handleSkip}
        t={t}
      />
    </div>
  );
}

/**
 * Profile Page with Suspense Boundary
 *
 * Wraps ProfilePageContent in Suspense to support useSearchParams
 * during static generation / prerendering.
 */
export default function ProfilePage(): React.JSX.Element {
  return (
    <Suspense fallback={<ProfilePageLoading />}>
      <ProfilePageContent />
    </Suspense>
  );
}
