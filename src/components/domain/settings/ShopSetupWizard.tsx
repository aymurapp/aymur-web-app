'use client';

/**
 * ShopSetupWizard Component
 *
 * A comprehensive multi-step wizard for creating a new shop with:
 * - Basic info (name, description)
 * - Business settings (currency, language, timezone)
 * - Business contact (phone, email, tax ID)
 * - Location (address with Google Places autocomplete)
 * - Branding (logo with crop/zoom functionality)
 *
 * Enterprise-level UI/UX with smooth transitions and comprehensive validation.
 *
 * @module components/domain/settings/ShopSetupWizard
 */

import React, { useState, useCallback } from 'react';

import {
  ShopOutlined,
  GlobalOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  PictureOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LoadingOutlined,
  MailOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { Steps, Input, Select, message, Result, Typography, Divider } from 'antd';
import { useTranslations } from 'next-intl';

import { AddressAutocomplete } from '@/components/common/forms/AddressAutocomplete';
import { ShopLogoUpload } from '@/components/common/forms/ShopLogoUpload';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createShop, type CreateShopInput } from '@/lib/actions/shop';
import { useRouter } from '@/lib/i18n/navigation';
import type { ParsedAddress } from '@/lib/types/address';
import { cn } from '@/lib/utils/cn';

const { Text, Title } = Typography;

/**
 * Props for ShopSetupWizard component
 */
export interface ShopSetupWizardProps {
  /** Callback when wizard is cancelled */
  onCancel?: () => void;
  /** Callback when wizard is completed (shop created successfully) */
  onComplete?: (shopId: string) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Wizard step configuration
 */
interface WizardStep {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

/**
 * Form data structure
 */
interface WizardFormData {
  // Basic Info
  shopName: string;
  description: string;
  // Settings
  currency: string;
  language: string;
  timezone: string;
  // Business Contact
  phone: string;
  email: string;
  taxId: string;
  // Address
  addressLine1: string;
  addressLine2: string;
  city: string;
  area: string;
  state: string;
  postalCode: string;
  country: string;
  // Branding
  shopLogo: string | null;
}

/**
 * Currency options - Comprehensive list
 */
const CURRENCY_OPTIONS = [
  // Major World Currencies
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
  { value: 'AUD', label: 'AUD - Australian Dollar', symbol: 'A$' },
  { value: 'CAD', label: 'CAD - Canadian Dollar', symbol: 'C$' },
  { value: 'CHF', label: 'CHF - Swiss Franc', symbol: 'Fr' },
  // Gulf Countries
  { value: 'AED', label: 'AED - UAE Dirham', symbol: 'د.إ' },
  { value: 'SAR', label: 'SAR - Saudi Riyal', symbol: '﷼' },
  { value: 'KWD', label: 'KWD - Kuwaiti Dinar', symbol: 'د.ك' },
  { value: 'QAR', label: 'QAR - Qatari Riyal', symbol: '﷼' },
  { value: 'BHD', label: 'BHD - Bahraini Dinar', symbol: '.د.ب' },
  { value: 'OMR', label: 'OMR - Omani Rial', symbol: '﷼' },
  // North Africa
  { value: 'MAD', label: 'MAD - Moroccan Dirham', symbol: 'د.م.' },
  { value: 'DZD', label: 'DZD - Algerian Dinar', symbol: 'د.ج' },
  { value: 'TND', label: 'TND - Tunisian Dinar', symbol: 'د.ت' },
  { value: 'EGP', label: 'EGP - Egyptian Pound', symbol: 'ج.م' },
  { value: 'LYD', label: 'LYD - Libyan Dinar', symbol: 'ل.د' },
  // Middle East
  { value: 'IQD', label: 'IQD - Iraqi Dinar', symbol: 'ع.د' },
  { value: 'TRY', label: 'TRY - Turkish Lira', symbol: '₺' },
  { value: 'JOD', label: 'JOD - Jordanian Dinar', symbol: 'د.ا' },
  { value: 'LBP', label: 'LBP - Lebanese Pound', symbol: 'ل.ل' },
  // Other
  { value: 'INR', label: 'INR - Indian Rupee', symbol: '₹' },
];

/**
 * Language options
 */
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'ar', label: 'العربية' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'ku', label: 'کوردی' },
];

/**
 * Common timezone options
 */
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Toronto', label: 'Eastern Time (Canada)' },
  { value: 'Europe/London', label: 'London, Dublin' },
  { value: 'Europe/Paris', label: 'Paris, Berlin, Rome, Madrid' },
  { value: 'Europe/Istanbul', label: 'Istanbul' },
  { value: 'Europe/Moscow', label: 'Moscow' },
  { value: 'Asia/Dubai', label: 'Dubai, Abu Dhabi' },
  { value: 'Asia/Riyadh', label: 'Riyadh, Kuwait, Baghdad' },
  { value: 'Asia/Baghdad', label: 'Baghdad' },
  { value: 'Asia/Kolkata', label: 'Mumbai, Kolkata, New Delhi' },
  { value: 'Asia/Shanghai', label: 'Beijing, Shanghai, Hong Kong' },
  { value: 'Asia/Tokyo', label: 'Tokyo, Seoul' },
  { value: 'Australia/Sydney', label: 'Sydney, Melbourne' },
  { value: 'Pacific/Auckland', label: 'Auckland, Wellington' },
  { value: 'Africa/Cairo', label: 'Cairo' },
  { value: 'Africa/Casablanca', label: 'Casablanca' },
  { value: 'Africa/Algiers', label: 'Algiers' },
  { value: 'Africa/Tunis', label: 'Tunis' },
];

/**
 * Initial form data
 */
const INITIAL_FORM_DATA: WizardFormData = {
  shopName: '',
  description: '',
  currency: 'USD',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
  phone: '',
  email: '',
  taxId: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  area: '',
  state: '',
  postalCode: '',
  country: '',
  shopLogo: null,
};

/**
 * ShopSetupWizard Component
 */
export function ShopSetupWizard({ onCancel, onComplete, className }: ShopSetupWizardProps) {
  const t = useTranslations('shop');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [createdShopId, setCreatedShopId] = useState<string | null>(null);

  /**
   * Wizard steps configuration
   */
  const steps: WizardStep[] = [
    {
      key: 'basic',
      title: t('wizard.basicInfo'),
      description: t('wizard.basicInfoDesc'),
      icon: <ShopOutlined />,
    },
    {
      key: 'settings',
      title: t('wizard.settings'),
      description: t('wizard.settingsDesc'),
      icon: <GlobalOutlined />,
    },
    {
      key: 'contact',
      title: t('wizard.contact'),
      description: t('wizard.contactDesc'),
      icon: <PhoneOutlined />,
    },
    {
      key: 'location',
      title: t('wizard.location'),
      description: t('wizard.locationDesc'),
      icon: <EnvironmentOutlined />,
    },
    {
      key: 'branding',
      title: t('wizard.branding'),
      description: t('wizard.brandingDesc'),
      icon: <PictureOutlined />,
    },
  ];

  /**
   * Handle address selection from autocomplete
   */
  const handleAddressSelect = useCallback((address: ParsedAddress) => {
    setFormData((prev) => ({
      ...prev,
      addressLine1: address.street || address.fullAddress,
      city: address.city,
      area: address.area,
      postalCode: address.postalCode,
      country: address.country,
    }));
  }, []);

  /**
   * Validate current step
   */
  const validateCurrentStep = useCallback((): boolean => {
    switch (currentStep) {
      case 0: // Basic Info
        if (!formData.shopName.trim()) {
          message.error(t('validation.shopNameRequired'));
          return false;
        }
        if (formData.shopName.trim().length < 2) {
          message.error(t('validation.shopNameMinLength'));
          return false;
        }
        return true;

      case 1: // Settings
        if (!formData.currency) {
          message.error(t('validation.currencyRequired'));
          return false;
        }
        if (!formData.language) {
          message.error(t('validation.languageRequired'));
          return false;
        }
        if (!formData.timezone) {
          message.error(t('validation.timezoneRequired'));
          return false;
        }
        return true;

      case 2: // Contact (optional fields)
        // Email validation if provided
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          message.error(tCommon('validation.invalidEmail'));
          return false;
        }
        return true;

      case 3: // Location (optional)
        return true;

      case 4: // Branding (optional)
        return true;

      default:
        return true;
    }
  }, [currentStep, formData, t, tCommon]);

  /**
   * Go to next step
   */
  const handleNext = useCallback(() => {
    if (!validateCurrentStep()) {
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [validateCurrentStep, steps.length]);

  /**
   * Go to previous step
   */
  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    if (!validateCurrentStep()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const input: CreateShopInput = {
        shopName: formData.shopName.trim(),
        description: formData.description.trim() || undefined,
        currency: formData.currency,
        language: formData.language,
        timezone: formData.timezone,
        shopLogo: formData.shopLogo,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        taxId: formData.taxId || undefined,
        addressLine1: formData.addressLine1 || undefined,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city || undefined,
        area: formData.area || undefined,
        state: formData.state || undefined,
        postalCode: formData.postalCode || undefined,
        country: formData.country || undefined,
      };

      const result = await createShop(input);

      if (result.success && result.data) {
        setCreatedShopId(result.data.id_shop);
        setIsComplete(true);
        message.success(result.message || t('messages.shopCreated'));
      } else if (!result.success) {
        message.error(result.error || t('messages.shopCreationFailed'));
      }
    } catch (error) {
      console.error('Shop creation error:', error);
      message.error(tCommon('messages.unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateCurrentStep, t, tCommon]);

  /**
   * Navigate to the new shop's dashboard or call onComplete callback
   */
  const handleGoToDashboard = useCallback(() => {
    if (createdShopId) {
      if (onComplete) {
        onComplete(createdShopId);
      } else {
        router.push(`/${createdShopId}/dashboard`);
      }
    }
  }, [createdShopId, router, onComplete]);

  /**
   * Render step content
   */
  const renderStepContent = () => {
    if (isComplete) {
      return (
        <Result
          status="success"
          title={t('wizard.successTitle')}
          subTitle={t('wizard.successSubtitle', { shopName: formData.shopName })}
          extra={[
            <Button key="dashboard" type="primary" size="large" onClick={handleGoToDashboard}>
              {t('wizard.goToDashboard')}
            </Button>,
            <Button key="shops" size="large" onClick={() => router.push('/shops')}>
              {t('wizard.viewAllShops')}
            </Button>,
          ]}
        />
      );
    }

    switch (currentStep) {
      case 0: // Basic Info
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('shopName')} <span className="text-red-500">*</span>
              </label>
              <Input
                size="large"
                placeholder={t('placeholders.shopName')}
                value={formData.shopName}
                onChange={(e) => setFormData((prev) => ({ ...prev, shopName: e.target.value }))}
                maxLength={100}
                showCount
              />
              <Text type="secondary" className="text-xs mt-1 block">
                {t('hints.shopName')}
              </Text>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {tCommon('labels.description')} ({tCommon('labels.optional')})
              </label>
              <Input.TextArea
                size="large"
                placeholder={t('placeholders.description')}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={4}
                maxLength={500}
                showCount
              />
            </div>
          </div>
        );

      case 1: // Settings
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('currency')} <span className="text-red-500">*</span>
              </label>
              <Select
                size="large"
                className="w-full"
                placeholder={t('placeholders.currency')}
                value={formData.currency}
                onChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
                showSearch
                optionFilterProp="label"
                options={CURRENCY_OPTIONS}
              />
              <Text type="secondary" className="text-xs mt-1 block">
                {t('hints.currency')}
              </Text>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('language')} <span className="text-red-500">*</span>
              </label>
              <Select
                size="large"
                className="w-full"
                placeholder={t('placeholders.language')}
                value={formData.language}
                onChange={(value) => setFormData((prev) => ({ ...prev, language: value }))}
                options={LANGUAGE_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('timezone')} <span className="text-red-500">*</span>
              </label>
              <Select
                size="large"
                className="w-full"
                placeholder={t('placeholders.timezone')}
                value={formData.timezone}
                onChange={(value) => setFormData((prev) => ({ ...prev, timezone: value }))}
                showSearch
                optionFilterProp="label"
                options={TIMEZONE_OPTIONS}
              />
            </div>
          </div>
        );

      case 2: // Contact Info
        return (
          <div className="space-y-6">
            <Text type="secondary" className="block mb-4">
              {t('wizard.contactHint')}
            </Text>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                <PhoneOutlined className="me-2" />
                {tCommon('labels.phone')} ({tCommon('labels.optional')})
              </label>
              <Input
                size="large"
                placeholder={t('placeholders.phone')}
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                maxLength={20}
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                <MailOutlined className="me-2" />
                {tCommon('labels.email')} ({tCommon('labels.optional')})
              </label>
              <Input
                size="large"
                type="email"
                placeholder={t('placeholders.email')}
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                maxLength={255}
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                <IdcardOutlined className="me-2" />
                {t('taxId')} ({tCommon('labels.optional')})
              </label>
              <Input
                size="large"
                placeholder={t('placeholders.taxId')}
                value={formData.taxId}
                onChange={(e) => setFormData((prev) => ({ ...prev, taxId: e.target.value }))}
                maxLength={50}
                dir="ltr"
              />
              <Text type="secondary" className="text-xs mt-1 block">
                {t('hints.taxId')}
              </Text>
            </div>
          </div>
        );

      case 3: // Location
        return (
          <div className="space-y-6">
            <Text type="secondary" className="block mb-4">
              {t('wizard.locationHint')}
            </Text>

            {/* Address Autocomplete */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                <EnvironmentOutlined className="me-2" />
                {t('address')} ({tCommon('labels.optional')})
              </label>
              <AddressAutocomplete
                onAddressSelect={handleAddressSelect}
                value={formData.addressLine1}
                onChange={(value) => setFormData((prev) => ({ ...prev, addressLine1: value }))}
                placeholder={tCommon('address.placeholder')}
                size="large"
              />
              <Text type="secondary" className="text-xs mt-1 block">
                {t('hints.address')}
              </Text>
            </div>

            {/* Address Line 2 */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('addressLine2')} ({tCommon('labels.optional')})
              </label>
              <Input
                size="large"
                placeholder={t('placeholders.addressLine2')}
                value={formData.addressLine2}
                onChange={(e) => setFormData((prev) => ({ ...prev, addressLine2: e.target.value }))}
                maxLength={255}
              />
            </div>

            {/* City, Area, Postal Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {tCommon('labels.city')}
                </label>
                <Input
                  size="large"
                  placeholder={t('placeholders.city')}
                  value={formData.city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">{t('area')}</label>
                <Input
                  size="large"
                  placeholder={t('placeholders.area')}
                  value={formData.area}
                  onChange={(e) => setFormData((prev) => ({ ...prev, area: e.target.value }))}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {tCommon('labels.postalCode')}
                </label>
                <Input
                  size="large"
                  placeholder={t('placeholders.postalCode')}
                  value={formData.postalCode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, postalCode: e.target.value }))}
                  maxLength={20}
                  dir="ltr"
                />
              </div>
            </div>

            {/* State, Country */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {t('state')}
                </label>
                <Input
                  size="large"
                  placeholder={t('placeholders.state')}
                  value={formData.state}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  {tCommon('labels.country')}
                </label>
                <Input
                  size="large"
                  placeholder={t('placeholders.country')}
                  value={formData.country}
                  onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                  maxLength={100}
                />
              </div>
            </div>
          </div>
        );

      case 4: // Branding
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('shopLogo')} ({tCommon('labels.optional')})
              </label>
              <Text type="secondary" className="block mb-4">
                {t('hints.shopLogo')}
              </Text>
              <div className="flex justify-center">
                <ShopLogoUpload
                  value={formData.shopLogo}
                  onChange={(logoUrl) => setFormData((prev) => ({ ...prev, shopLogo: logoUrl }))}
                  size="large"
                />
              </div>
            </div>

            <Divider />

            {/* Summary */}
            <Card className="bg-stone-50">
              <Title level={5} className="mb-4">
                {t('wizard.summary')}
              </Title>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">{t('shopName')}:</dt>
                  <dd className="font-medium text-stone-900">{formData.shopName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">{t('currency')}:</dt>
                  <dd className="font-medium text-stone-900">{formData.currency}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">{t('language')}:</dt>
                  <dd className="font-medium text-stone-900">
                    {LANGUAGE_OPTIONS.find((l) => l.value === formData.language)?.label}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">{t('timezone')}:</dt>
                  <dd className="font-medium text-stone-900 text-end max-w-[60%] truncate">
                    {TIMEZONE_OPTIONS.find((tz) => tz.value === formData.timezone)?.label ||
                      formData.timezone}
                  </dd>
                </div>
                {formData.phone && (
                  <div className="flex justify-between">
                    <dt className="text-stone-500">{tCommon('labels.phone')}:</dt>
                    <dd className="font-medium text-stone-900">{formData.phone}</dd>
                  </div>
                )}
                {formData.email && (
                  <div className="flex justify-between">
                    <dt className="text-stone-500">{tCommon('labels.email')}:</dt>
                    <dd className="font-medium text-stone-900">{formData.email}</dd>
                  </div>
                )}
                {formData.city && (
                  <div className="flex justify-between">
                    <dt className="text-stone-500">{tCommon('labels.address')}:</dt>
                    <dd className="font-medium text-stone-900 text-end max-w-[60%]">
                      {[formData.city, formData.country].filter(Boolean).join(', ')}
                    </dd>
                  </div>
                )}
              </dl>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('max-w-2xl mx-auto', className)}>
      {/* Steps Progress */}
      {!isComplete && (
        <Steps
          current={currentStep}
          className="mb-8"
          size="small"
          items={steps.map((step) => ({
            title: step.title,
            description: step.description,
            icon: step.icon,
          }))}
        />
      )}

      {/* Step Content */}
      <Card className="mb-6">
        <div className="p-2">{renderStepContent()}</div>
      </Card>

      {/* Navigation Buttons */}
      {!isComplete && (
        <div className="flex justify-between">
          <div>
            {currentStep > 0 && (
              <Button
                size="large"
                onClick={handlePrevious}
                icon={<ArrowLeftOutlined />}
                disabled={isSubmitting}
              >
                {tCommon('actions.back')}
              </Button>
            )}
            {currentStep === 0 && onCancel && (
              <Button size="large" onClick={onCancel} disabled={isSubmitting}>
                {tCommon('actions.cancel')}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {/* Skip button for optional steps */}
            {currentStep >= 2 && currentStep < steps.length - 1 && (
              <Button
                size="large"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                disabled={isSubmitting}
              >
                {t('wizard.skip')}
              </Button>
            )}

            {currentStep < steps.length - 1 ? (
              <Button type="primary" size="large" onClick={handleNext} disabled={isSubmitting}>
                {tCommon('actions.next')} <ArrowRightOutlined />
              </Button>
            ) : (
              <Button
                type="primary"
                size="large"
                onClick={handleSubmit}
                loading={isSubmitting}
                icon={isSubmitting ? <LoadingOutlined /> : <CheckCircleOutlined />}
              >
                {isSubmitting ? t('wizard.creating') : t('createShop')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShopSetupWizard;
