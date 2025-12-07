'use client';

/**
 * General Settings Page
 *
 * Allows users to configure their shop's basic settings including:
 * - Shop name
 * - Shop logo upload with preview
 * - Currency selection
 * - Timezone selection
 * - Language preference
 *
 * Features:
 * - Form validation with Zod
 * - Real-time form state with react-hook-form
 * - Loading skeleton while fetching
 * - Success/error messages with Ant Design message
 * - Permission check for settings.update
 * - RTL support using CSS logical properties
 *
 * @module app/(platform)/[locale]/[shopId]/settings/general/page
 */

import React, { useEffect, useState, useCallback } from 'react';

import {
  SettingOutlined,
  UploadOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  TranslationOutlined,
  ShopOutlined,
  LoadingOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  Card,
  Form,
  Input,
  Select,
  Upload,
  message,
  Typography,
  Skeleton,
  Avatar,
  Spin,
  Image,
} from 'antd';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  getAvailableCurrencies,
  getAvailableTimezones,
  getAvailableLanguages,
  type CurrencyOption,
  type TimezoneOption,
} from '@/lib/actions/shopSettings';
import {
  useShopSettings,
  useUpdateShopSettings,
  useUploadShopLogo,
} from '@/lib/hooks/data/useShopSettings';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';

import type { UploadProps } from 'antd';

const { Text, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface SettingsFormValues {
  shop_name: string;
  currency: string;
  timezone: string;
  language: string;
}

interface LanguageOption {
  code: string;
  label: string;
  direction: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * General Settings Page
 *
 * Configures shop's basic settings like name, logo, currency, timezone, and language.
 */
export default function GeneralSettingsPage(): React.JSX.Element {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');

  const { can } = usePermissions();
  const { shopId } = useShop();

  // Form instance
  const [form] = Form.useForm<SettingsFormValues>();

  // Local state for dropdowns
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // Logo preview state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Data hooks
  const { settings, isLoading: settingsLoading, refetch } = useShopSettings(shopId || '');

  // Mutation hooks
  const updateSettingsMutation = useUpdateShopSettings();
  const uploadLogoMutation = useUploadShopLogo();

  // Derived state
  const isSubmitting = updateSettingsMutation.isPending;
  const canEdit = can('settings.update');

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Load dropdown options on mount
  useEffect(() => {
    const loadOptions = async () => {
      setOptionsLoading(true);
      try {
        const [currencyResult, timezoneResult, languageResult] = await Promise.all([
          getAvailableCurrencies(),
          getAvailableTimezones(),
          getAvailableLanguages(),
        ]);

        if (currencyResult.success && currencyResult.data) {
          setCurrencies(currencyResult.data);
        }

        if (timezoneResult.success && timezoneResult.data) {
          setTimezones(timezoneResult.data);
        }

        if (languageResult.success && languageResult.data) {
          // Convert readonly array to regular array
          setLanguages([...languageResult.data]);
        }
      } catch (_error) {
        message.error(tCommon('messages.unexpectedError'));
      } finally {
        setOptionsLoading(false);
      }
    };

    loadOptions();
  }, [tCommon]);

  // Initialize form with settings data
  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        shop_name: settings.shop_name,
        currency: settings.currency,
        timezone: settings.timezone,
        language: settings.language,
      });
      setLogoPreview(settings.shop_logo);
    }
  }, [settings, form]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!shopId) {
      message.error(tCommon('messages.unexpectedError'));
      return;
    }

    try {
      const values = await form.validateFields();

      await updateSettingsMutation.mutateAsync({
        shopId,
        updates: {
          shop_name: values.shop_name.trim(),
          currency: values.currency,
          timezone: values.timezone,
          language: values.language,
        },
      });

      message.success(tCommon('messages.operationSuccess'));
      refetch();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error(tCommon('messages.operationFailed'));
      }
    }
  }, [shopId, form, updateSettingsMutation, refetch, tCommon]);

  // Handle logo upload
  const handleLogoUpload = useCallback<NonNullable<UploadProps['customRequest']>>(
    async (options) => {
      if (!shopId) {
        message.error(tCommon('messages.unexpectedError'));
        return;
      }

      const { file, onSuccess, onError } = options;

      if (!(file instanceof File)) {
        message.error(tCommon('messages.unexpectedError'));
        return;
      }

      setLogoUploading(true);

      try {
        const result = await uploadLogoMutation.mutateAsync({
          shopId,
          file,
        });

        setLogoPreview(result.logoUrl);
        message.success(tCommon('messages.operationSuccess'));
        onSuccess?.(result);
        refetch();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : tCommon('messages.operationFailed');
        message.error(errorMessage);
        onError?.(error as Error);
      } finally {
        setLogoUploading(false);
      }
    },
    [shopId, uploadLogoMutation, refetch, tCommon]
  );

  // Handle logo removal
  const handleLogoRemove = useCallback(async () => {
    if (!shopId) {
      message.error(tCommon('messages.unexpectedError'));
      return;
    }

    try {
      await updateSettingsMutation.mutateAsync({
        shopId,
        updates: {
          shop_logo: null,
        },
      });

      setLogoPreview(null);
      message.success(tCommon('messages.operationSuccess'));
      refetch();
    } catch (_error) {
      message.error(tCommon('messages.operationFailed'));
    }
  }, [shopId, updateSettingsMutation, refetch, tCommon]);

  // Validate file before upload
  const beforeUpload = useCallback(
    (file: File) => {
      // Check file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        message.error(t('general.invalidFileType'));
        return Upload.LIST_IGNORE;
      }

      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        message.error(t('general.fileTooLarge'));
        return Upload.LIST_IGNORE;
      }

      return true;
    },
    [t]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Loading state
  if (settingsLoading || optionsLoading) {
    return (
      <div className="general-settings-page">
        <PageHeader title={t('general.title')} subtitle={t('general.subtitle')} showBack />

        {/* Loading Skeleton */}
        <div className="space-y-6">
          {/* Shop Profile Card Skeleton */}
          <Card>
            <Skeleton active avatar paragraph={{ rows: 3 }} />
          </Card>

          {/* Regional Settings Card Skeleton */}
          <Card>
            <Skeleton active paragraph={{ rows: 4 }} />
          </Card>
        </div>
      </div>
    );
  }

  // No settings found
  if (!settings) {
    return (
      <div className="general-settings-page">
        <PageHeader title={t('general.title')} subtitle={t('general.subtitle')} showBack />

        <Card className="text-center py-12">
          <SettingOutlined className="text-4xl text-stone-300 mb-4" />
          <Paragraph type="secondary">{tCommon('messages.noData')}</Paragraph>
        </Card>
      </div>
    );
  }

  return (
    <div className="general-settings-page">
      {/* Page Header */}
      <PageHeader title={t('general.title')} subtitle={t('general.subtitle')} showBack />

      {/* Form Container */}
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        disabled={!canEdit}
        className="space-y-6"
      >
        {/* Shop Profile Card */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <ShopOutlined className="text-amber-500" />
              <span>{t('general.shopProfile')}</span>
            </div>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logo Upload Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {/* Logo Preview */}
                {logoPreview ? (
                  <div className="relative group">
                    <Avatar
                      size={120}
                      src={
                        <Image
                          src={logoPreview}
                          alt={settings.shop_name}
                          preview={false}
                          className="object-cover"
                        />
                      }
                      className="border-2 border-amber-200"
                    />
                    {canEdit && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={handleLogoRemove}
                        className="absolute -bottom-2 -end-2 bg-white shadow-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={tCommon('actions.delete')}
                      />
                    )}
                  </div>
                ) : (
                  <Avatar
                    size={120}
                    icon={<ShopOutlined />}
                    className="bg-amber-100 text-amber-600 border-2 border-amber-200"
                  />
                )}

                {/* Upload Spinner */}
                {logoUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-full">
                    <Spin indicator={<LoadingOutlined spin />} />
                  </div>
                )}
              </div>

              {/* Upload Button */}
              {canEdit && (
                <Upload
                  name="logo"
                  showUploadList={false}
                  customRequest={handleLogoUpload}
                  beforeUpload={beforeUpload}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  disabled={logoUploading}
                >
                  <Button
                    icon={logoUploading ? <LoadingOutlined /> : <UploadOutlined />}
                    loading={logoUploading}
                    size="small"
                  >
                    {logoPreview ? t('general.changeLogo') : t('general.uploadLogo')}
                  </Button>
                </Upload>
              )}

              <Text type="secondary" className="text-xs text-center">
                {t('general.logoHint')}
              </Text>
            </div>

            {/* Shop Name Input */}
            <div className="lg:col-span-2">
              <Form.Item
                name="shop_name"
                label={t('general.shopName')}
                rules={[
                  { required: true, message: tCommon('validation.required') },
                  { min: 2, message: tCommon('validation.minLength', { min: 2 }) },
                  { max: 100, message: tCommon('validation.maxLength', { max: 100 }) },
                ]}
              >
                <Input
                  placeholder={t('general.shopNamePlaceholder')}
                  prefix={<ShopOutlined className="text-stone-400" />}
                  size="large"
                  maxLength={100}
                  showCount
                />
              </Form.Item>

              <Paragraph type="secondary" className="!mb-0">
                {t('general.shopNameHint')}
              </Paragraph>
            </div>
          </div>
        </Card>

        {/* Regional Settings Card */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <GlobalOutlined className="text-amber-500" />
              <span>{t('general.regionalSettings')}</span>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Currency Selector */}
            <Form.Item
              name="currency"
              label={t('general.currency')}
              rules={[{ required: true, message: tCommon('validation.required') }]}
            >
              <Select
                placeholder={tCommon('select.placeholder')}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) ||
                  (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={currencies.map((currency) => ({
                  value: currency.code,
                  label: `${currency.symbol} ${currency.code} - ${currency.label}`,
                }))}
                suffixIcon={<GlobalOutlined className="text-stone-400" />}
                size="large"
              />
            </Form.Item>

            {/* Timezone Selector */}
            <Form.Item
              name="timezone"
              label={t('general.timezone')}
              rules={[{ required: true, message: tCommon('validation.required') }]}
            >
              <Select
                placeholder={tCommon('select.placeholder')}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={timezones.map((tz) => ({
                  value: tz.value,
                  label: `${tz.label} (${tz.offset})`,
                }))}
                suffixIcon={<ClockCircleOutlined className="text-stone-400" />}
                size="large"
              />
            </Form.Item>

            {/* Language Selector */}
            <Form.Item
              name="language"
              label={t('general.language')}
              rules={[{ required: true, message: tCommon('validation.required') }]}
            >
              <Select
                placeholder={tCommon('select.placeholder')}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={languages.map((lang) => ({
                  value: lang.code,
                  label: lang.label,
                }))}
                suffixIcon={<TranslationOutlined className="text-stone-400" />}
                size="large"
              />
            </Form.Item>
          </div>

          <Paragraph type="secondary" className="!mb-0 mt-4">
            {t('general.regionalSettingsHint')}
          </Paragraph>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="primary"
            size="large"
            onClick={handleSubmit}
            loading={isSubmitting}
            permission="settings.update"
            icon={<SettingOutlined />}
          >
            {tCommon('actions.save')}
          </Button>
        </div>
      </Form>
    </div>
  );
}
