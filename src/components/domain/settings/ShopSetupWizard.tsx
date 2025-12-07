'use client';

/**
 * ShopSetupWizard Component (task-069)
 *
 * A multi-step wizard for creating a new shop.
 * Steps:
 * 1. Shop name, description
 * 2. Currency, locale/language, timezone selection
 * 3. Logo upload (optional)
 *
 * On complete, calls the createShop server action and redirects to the new shop's dashboard.
 *
 * @module components/domain/settings/ShopSetupWizard
 */

import React, { useState, useCallback } from 'react';

import {
  ShopOutlined,
  GlobalOutlined,
  PictureOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { Steps, Input, Select, message, Upload, Result } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createShop, type CreateShopInput } from '@/lib/actions/shop';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

import type { UploadFile, UploadProps } from 'antd';

/**
 * Props for ShopSetupWizard component
 */
export interface ShopSetupWizardProps {
  /** Callback when wizard is cancelled */
  onCancel?: () => void;
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
  shopName: string;
  description: string;
  currency: string;
  language: string;
  timezone: string;
  shopLogo: string | null;
}

/**
 * Currency options
 */
const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
  { value: 'TRY', label: 'TRY - Turkish Lira', symbol: '₺' },
  { value: 'AED', label: 'AED - UAE Dirham', symbol: 'د.إ' },
  { value: 'SAR', label: 'SAR - Saudi Riyal', symbol: '﷼' },
  { value: 'KWD', label: 'KWD - Kuwaiti Dinar', symbol: 'د.ك' },
  { value: 'QAR', label: 'QAR - Qatari Riyal', symbol: '﷼' },
  { value: 'BHD', label: 'BHD - Bahraini Dinar', symbol: '.د.ب' },
  { value: 'OMR', label: 'OMR - Omani Rial', symbol: '﷼' },
  { value: 'INR', label: 'INR - Indian Rupee', symbol: '₹' },
  { value: 'CAD', label: 'CAD - Canadian Dollar', symbol: 'C$' },
  { value: 'AUD', label: 'AUD - Australian Dollar', symbol: 'A$' },
  { value: 'CHF', label: 'CHF - Swiss Franc', symbol: 'Fr' },
];

/**
 * Language options
 */
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Francais' },
  { value: 'es', label: 'Espanol' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'ar', label: 'العربية' },
  { value: 'tr', label: 'Turkce' },
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
  { value: 'Asia/Kolkata', label: 'Mumbai, Kolkata, New Delhi' },
  { value: 'Asia/Shanghai', label: 'Beijing, Shanghai, Hong Kong' },
  { value: 'Asia/Tokyo', label: 'Tokyo, Seoul' },
  { value: 'Australia/Sydney', label: 'Sydney, Melbourne' },
  { value: 'Pacific/Auckland', label: 'Auckland, Wellington' },
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
  shopLogo: null,
};

/**
 * ShopSetupWizard Component
 */
export function ShopSetupWizard({ onCancel, className }: ShopSetupWizardProps) {
  const t = useTranslations('shop');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [createdShopId, setCreatedShopId] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  /**
   * Wizard steps configuration
   */
  const steps: WizardStep[] = [
    {
      key: 'basic',
      title: 'Basic Info',
      description: 'Shop name and description',
      icon: <ShopOutlined />,
    },
    {
      key: 'settings',
      title: 'Settings',
      description: 'Currency, language, timezone',
      icon: <GlobalOutlined />,
    },
    {
      key: 'branding',
      title: 'Branding',
      description: 'Logo (optional)',
      icon: <PictureOutlined />,
    },
  ];

  /**
   * Validate current step
   */
  const validateCurrentStep = useCallback((): boolean => {
    switch (currentStep) {
      case 0:
        if (!formData.shopName.trim()) {
          message.error('Shop name is required');
          return false;
        }
        if (formData.shopName.trim().length < 2) {
          message.error('Shop name must be at least 2 characters');
          return false;
        }
        return true;
      case 1:
        if (!formData.currency) {
          message.error('Please select a currency');
          return false;
        }
        if (!formData.language) {
          message.error('Please select a language');
          return false;
        }
        if (!formData.timezone) {
          message.error('Please select a timezone');
          return false;
        }
        return true;
      case 2:
        // Logo is optional
        return true;
      default:
        return true;
    }
  }, [currentStep, formData]);

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
      };

      const result = await createShop(input);

      if (result.success) {
        if (result.data) {
          setCreatedShopId(result.data.id_shop);
          setIsComplete(true);
          message.success(result.message || 'Shop created successfully!');
        } else {
          message.error('Failed to create shop');
        }
      } else {
        message.error(result.error);
      }
    } catch (error) {
      console.error('Shop creation error:', error);
      message.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateCurrentStep]);

  /**
   * Navigate to the new shop's dashboard
   */
  const handleGoToDashboard = useCallback(() => {
    if (createdShopId) {
      router.push(`/${createdShopId}/dashboard`);
    }
  }, [createdShopId, router]);

  /**
   * Handle file upload change
   */
  const handleUploadChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);

    // If there's an uploaded file with a URL, use it
    const uploadedFile = newFileList[0];
    if (uploadedFile?.response?.url) {
      setFormData((prev) => ({ ...prev, shopLogo: uploadedFile.response.url }));
    } else if (uploadedFile?.thumbUrl) {
      // For preview purposes (actual upload would happen via a separate endpoint)
      setFormData((prev) => ({ ...prev, shopLogo: uploadedFile.thumbUrl || null }));
    } else if (newFileList.length === 0) {
      setFormData((prev) => ({ ...prev, shopLogo: null }));
    }
  };

  /**
   * Render step content
   */
  const renderStepContent = () => {
    if (isComplete) {
      return (
        <Result
          status="success"
          title="Shop Created Successfully!"
          subTitle={`Your shop "${formData.shopName}" is ready. You can now start managing your jewelry business.`}
          extra={[
            <Button key="dashboard" type="primary" size="large" onClick={handleGoToDashboard}>
              Go to Dashboard
            </Button>,
            <Button key="shops" size="large" onClick={() => router.push('/shops')}>
              View All Shops
            </Button>,
          ]}
        />
      );
    }

    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('shopName')} <span className="text-red-500">*</span>
              </label>
              <Input
                size="large"
                placeholder="Enter your shop name"
                value={formData.shopName}
                onChange={(e) => setFormData((prev) => ({ ...prev, shopName: e.target.value }))}
                maxLength={100}
                showCount
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {tCommon('labels.description')} ({tCommon('labels.optional')})
              </label>
              <Input.TextArea
                size="large"
                placeholder="Describe your jewelry business"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={4}
                maxLength={500}
                showCount
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('currency')} <span className="text-red-500">*</span>
              </label>
              <Select
                size="large"
                className="w-full"
                placeholder="Select currency"
                value={formData.currency}
                onChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
                showSearch
                optionFilterProp="label"
                options={CURRENCY_OPTIONS}
              />
              <p className="mt-1 text-xs text-stone-500">
                This will be the default currency for all transactions in this shop.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Language <span className="text-red-500">*</span>
              </label>
              <Select
                size="large"
                className="w-full"
                placeholder="Select language"
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
                placeholder="Select timezone"
                value={formData.timezone}
                onChange={(value) => setFormData((prev) => ({ ...prev, timezone: value }))}
                showSearch
                optionFilterProp="label"
                options={TIMEZONE_OPTIONS}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Shop Logo ({tCommon('labels.optional')})
              </label>
              <Upload.Dragger
                name="logo"
                listType="picture"
                maxCount={1}
                fileList={fileList}
                onChange={handleUploadChange}
                beforeUpload={() => false} // Prevent auto-upload, handle manually
                accept="image/*"
              >
                <p className="ant-upload-drag-icon">
                  <PictureOutlined className="text-4xl text-stone-400" />
                </p>
                <p className="ant-upload-text">Click or drag an image to upload</p>
                <p className="ant-upload-hint">
                  Recommended: Square image, at least 200x200 pixels
                </p>
              </Upload.Dragger>
            </div>

            {/* Summary */}
            <Card className="bg-stone-50">
              <h4 className="font-medium text-stone-900 mb-4">Summary</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">{t('shopName')}:</dt>
                  <dd className="font-medium text-stone-900">{formData.shopName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">{t('currency')}:</dt>
                  <dd className="font-medium text-stone-900">{formData.currency}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Language:</dt>
                  <dd className="font-medium text-stone-900">
                    {LANGUAGE_OPTIONS.find((l) => l.value === formData.language)?.label}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">{t('timezone')}:</dt>
                  <dd className="font-medium text-stone-900 text-right max-w-[60%] truncate">
                    {TIMEZONE_OPTIONS.find((tz) => tz.value === formData.timezone)?.label ||
                      formData.timezone}
                  </dd>
                </div>
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

          <div>
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
                {isSubmitting ? 'Creating Shop...' : t('createShop')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShopSetupWizard;
