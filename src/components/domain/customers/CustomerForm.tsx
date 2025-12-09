'use client';

/**
 * CustomerForm Component
 *
 * A form component for creating and editing customer information.
 * Features:
 * - Basic info: name, phone, email
 * - Address fields: city, area, street, postal_code
 * - Business info: client_type, tax_id, is_vip
 * - Credit management (permission-based)
 * - ID card image upload (front/back)
 * - Zod validation with react-hook-form
 * - RTL support with logical properties
 *
 * @module components/domain/customers/CustomerForm
 */

import React, { useCallback, useState, useTransition, useMemo } from 'react';

import {
  UserOutlined,
  BankOutlined,
  IdcardOutlined,
  DeleteOutlined,
  LoadingOutlined,
  CrownOutlined,
  InstagramOutlined,
  FacebookOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons';
import {
  Input,
  Upload,
  message,
  Spin,
  Divider,
  Space,
  Checkbox,
  InputNumber,
  Radio,
  Typography,
  Collapse,
} from 'antd';
import { useTranslations } from 'next-intl';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Form } from '@/components/ui/Form';
import { PERMISSION_KEYS } from '@/lib/constants/permissions';
import { useCreateCustomer, useUpdateCustomer } from '@/lib/hooks/data/useCustomers';
import type { Customer } from '@/lib/hooks/data/useCustomers';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';
import {
  customerSchema,
  citySchema,
  areaSchema,
  streetSchema,
  postalCodeSchema,
  creditLimitFieldSchema,
  instagramSchema,
  facebookSchema,
  whatsappSchema,
  tiktokSchema,
  idCardSchema,
  type ClientType,
} from '@/lib/utils/schemas/customer';

import type { RcFile, UploadProps } from 'antd/es/upload';

const { Text, Title } = Typography;

/**
 * Extended Customer type with optional fields that may not be in DB yet
 * This allows the form to work with both current and future DB schemas
 */
interface ExtendedCustomer extends Customer {
  tax_id?: string | null;
  is_vip?: boolean;
  credit_limit?: number;
  // Social media fields
  instagram?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;
  tiktok?: string | null;
  // Address component fields
  postal_code?: string | null;
  city?: string | null;
  area?: string | null;
  // ID Card number
  id_card?: string | null;
}

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

/**
 * Extended form schema with address components, social media, and credit limit
 * This extends the base customerSchema with additional UI-specific fields
 */
const customerFormSchema = customerSchema.extend({
  // Extended address fields (combined into address field on submit)
  city: citySchema,
  area: areaSchema,
  street: streetSchema,
  postal_code: postalCodeSchema,
  // Social media fields
  instagram: instagramSchema,
  facebook: facebookSchema,
  whatsapp: whatsappSchema,
  tiktok: tiktokSchema,
  // Credit field (permission-based, validated on server)
  credit_limit: creditLimitFieldSchema.optional(),
  // ID card number
  id_card: idCardSchema,
  // ID card images (stored as URLs after upload)
  id_card_front: z.string().nullable().optional(),
  id_card_back: z.string().nullable().optional(),
});

/**
 * Extended form values type
 */
type CustomerFormValues = z.infer<typeof customerFormSchema>;

/**
 * Props for the CustomerForm component
 */
export interface CustomerFormProps {
  /**
   * Customer data for edit mode. If undefined, form is in create mode.
   * Accepts extended customer type with optional fields (tax_id, is_vip, credit_limit)
   */
  customer?: ExtendedCustomer;

  /**
   * Callback when customer is successfully created or updated
   */
  onSuccess?: (customer: Customer) => void;

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum file size for ID card images (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Allowed file types for ID card images
 */
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Client type options
 */
const CLIENT_TYPE_OPTIONS: { value: ClientType; labelKey: string; icon: React.ReactNode }[] = [
  { value: 'individual', labelKey: 'segments.retail', icon: <UserOutlined /> },
  { value: 'company', labelKey: 'segments.wholesale', icon: <BankOutlined /> },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parses address string into component fields
 * Format: "street | area | city | postal_code"
 */
function parseAddress(address: string | null): {
  street: string;
  area: string;
  city: string;
  postal_code: string;
} {
  if (!address) {
    return { street: '', area: '', city: '', postal_code: '' };
  }

  const parts = address.split('|').map((p) => p.trim());
  return {
    street: parts[0] || '',
    area: parts[1] || '',
    city: parts[2] || '',
    postal_code: parts[3] || '',
  };
}

/**
 * Combines address fields into a single string
 */
function combineAddress(
  street: string | null | undefined,
  area: string | null | undefined,
  city: string | null | undefined,
  postal_code: string | null | undefined
): string | null {
  const parts = [street, area, city, postal_code].filter((p) => p && p.trim());
  return parts.length > 0 ? parts.join(' | ') : null;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * CustomerForm Component
 *
 * Provides a comprehensive form for creating and editing customers
 * with support for all customer fields, permission-based visibility,
 * and ID card image uploads.
 */
export function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps): JSX.Element {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  // Permissions
  const { can } = usePermissions();
  const canManageCredit = can(PERMISSION_KEYS.CUSTOMERS_CREDIT);
  const canManageVip = can(PERMISSION_KEYS.CUSTOMERS_MANAGE);

  // Mutations
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  // Determine if we're in edit mode
  const isEditMode = !!customer;

  // Parse existing address for edit mode
  const parsedAddress = useMemo(() => parseAddress(customer?.address ?? null), [customer?.address]);

  // ID card image states
  const [idCardFront, setIdCardFront] = useState<string | null>(null);
  const [idCardBack, setIdCardBack] = useState<string | null>(null);
  const [isUploadingFront, setIsUploadingFront] = useState(false);
  const [isUploadingBack, setIsUploadingBack] = useState(false);

  // Client type state for conditional tax_id visibility
  const [clientType, setClientType] = useState<ClientType>(
    (customer?.client_type as ClientType) || 'individual'
  );

  /**
   * Handle ID card image upload
   */
  const handleIdCardUpload = useCallback(
    async (file: RcFile, side: 'front' | 'back'): Promise<boolean> => {
      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        message.error(tCommon('validation.invalidFormat'));
        return false;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        message.error(t('idCard.fileTooLarge'));
        return false;
      }

      const setUploading = side === 'front' ? setIsUploadingFront : setIsUploadingBack;
      const setImage = side === 'front' ? setIdCardFront : setIdCardBack;

      setUploading(true);

      try {
        // For now, create a local URL preview
        // In production, this would upload to Supabase Storage
        const previewUrl = URL.createObjectURL(file);
        setImage(previewUrl);
        message.success(t('idCard.uploadSuccess'));
      } catch (error) {
        console.error('[CustomerForm] ID card upload error:', error);
        message.error(t('idCard.uploadError'));
      } finally {
        setUploading(false);
      }

      // Return false to prevent default upload behavior
      return false;
    },
    [t, tCommon]
  );

  /**
   * Handle ID card image removal
   */
  const handleIdCardRemove = useCallback(
    (side: 'front' | 'back') => {
      const setImage = side === 'front' ? setIdCardFront : setIdCardBack;
      setImage(null);
      message.success(t('idCard.removeSuccess'));
    },
    [t]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: CustomerFormValues) => {
      startTransition(async () => {
        try {
          // Combine address fields
          const combinedAddress = combineAddress(
            data.street,
            data.area,
            data.city,
            data.postal_code
          );

          // Prepare customer data with all fields
          const customerData: Record<string, unknown> = {
            full_name: data.full_name,
            phone: data.phone,
            email: data.email || null,
            address: combinedAddress,
            client_type: data.client_type,
            notes: data.notes || null,
            // Address component fields (new DB columns)
            postal_code: data.postal_code || null,
            city: data.city || null,
            area: data.area || null,
            // Social media fields
            instagram: data.instagram || null,
            facebook: data.facebook || null,
            whatsapp: data.whatsapp || null,
            tiktok: data.tiktok || null,
            // ID card number
            id_card: data.id_card || null,
          };

          // Add optional fields if user has permission
          if (data.client_type === 'company' && data.tax_id) {
            customerData.tax_id = data.tax_id;
          }
          if (canManageVip && data.is_vip !== undefined) {
            customerData.is_vip = data.is_vip;
          }

          let result: Customer;

          if (isEditMode && customer) {
            // Update existing customer
            result = await updateCustomer.mutateAsync({
              customerId: customer.id_customer,
              data: customerData as Parameters<typeof updateCustomer.mutateAsync>[0]['data'],
            });
            message.success(t('messages.updateSuccess'));
          } else {
            // Create new customer
            result = await createCustomer.mutateAsync(
              customerData as Parameters<typeof createCustomer.mutateAsync>[0]
            );
            message.success(t('messages.createSuccess'));
          }

          onSuccess?.(result);
        } catch (error) {
          console.error('[CustomerForm] Submit error:', error);
          message.error(isEditMode ? t('messages.updateError') : t('messages.createError'));
        }
      });
    },
    [isEditMode, customer, createCustomer, updateCustomer, canManageVip, onSuccess, t]
  );

  /**
   * Upload component props for front ID card
   */
  const uploadPropsFront: UploadProps = {
    name: 'id_card_front',
    showUploadList: false,
    accept: ALLOWED_FILE_TYPES.join(','),
    beforeUpload: (file) => handleIdCardUpload(file as RcFile, 'front'),
    disabled: isUploadingFront || isUploadingBack,
  };

  /**
   * Upload component props for back ID card
   */
  const uploadPropsBack: UploadProps = {
    name: 'id_card_back',
    showUploadList: false,
    accept: ALLOWED_FILE_TYPES.join(','),
    beforeUpload: (file) => handleIdCardUpload(file as RcFile, 'back'),
    disabled: isUploadingFront || isUploadingBack,
  };

  // Check if form is currently submitting
  const isSubmitting = isPending || createCustomer.isPending || updateCustomer.isPending;

  return (
    <Form<CustomerFormValues>
      schema={customerFormSchema as z.ZodType<CustomerFormValues>}
      onSubmit={handleSubmit}
      defaultValues={{
        full_name: customer?.full_name || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
        address: customer?.address || '',
        client_type: (customer?.client_type as ClientType) || 'individual',
        tax_id: customer?.tax_id || '',
        is_vip: customer?.is_vip || false,
        notes: customer?.notes || '',
        // Address components - use DB fields if available, fallback to parsed address
        city: customer?.city || parsedAddress.city,
        area: customer?.area || parsedAddress.area,
        street: parsedAddress.street,
        postal_code: customer?.postal_code || parsedAddress.postal_code,
        // Social media fields
        instagram: customer?.instagram || '',
        facebook: customer?.facebook || '',
        whatsapp: customer?.whatsapp || '',
        tiktok: customer?.tiktok || '',
        // Credit limit (only for edit mode if user has permission)
        credit_limit: customer?.credit_limit || 0,
        // ID card number
        id_card: customer?.id_card || '',
      }}
      className="space-y-6"
    >
      {/* Basic Information Section */}
      <div>
        <Title level={5} className="mb-4 text-stone-800">
          {t('sections.basicInfo')}
        </Title>

        {/* Full Name */}
        <Form.Item<CustomerFormValues> name="full_name" label={t('fullName')} required>
          <Input
            size="large"
            placeholder={t('placeholders.fullName')}
            maxLength={255}
            prefix={<UserOutlined className="text-stone-400" />}
          />
        </Form.Item>

        {/* Phone */}
        <Form.Item<CustomerFormValues> name="phone" label={t('phone')} required>
          <Input
            size="large"
            placeholder={t('placeholders.phone')}
            maxLength={20}
            dir="ltr"
            className="text-start"
          />
        </Form.Item>

        {/* Email */}
        <Form.Item<CustomerFormValues> name="email" label={t('email')}>
          <Input
            size="large"
            type="email"
            placeholder={t('placeholders.email')}
            maxLength={255}
            dir="ltr"
          />
        </Form.Item>
      </div>

      <Divider className="my-6" />

      {/* Address Section */}
      <div>
        <Title level={5} className="mb-4 text-stone-800">
          {t('sections.address')}
        </Title>

        {/* Street Address - Full width */}
        <Form.Item<CustomerFormValues> name="street" label={t('streetAddress')}>
          <Input.TextArea rows={2} placeholder={t('placeholders.streetAddress')} maxLength={255} />
        </Form.Item>

        {/* Postal Code */}
        <Form.Item<CustomerFormValues> name="postal_code" label={t('postalCode')}>
          <Input size="large" placeholder={t('placeholders.postalCode')} maxLength={20} dir="ltr" />
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* City */}
          <Form.Item<CustomerFormValues> name="city" label={t('city')}>
            <Input size="large" placeholder={t('placeholders.city')} maxLength={100} />
          </Form.Item>

          {/* Area/District */}
          <Form.Item<CustomerFormValues> name="area" label={t('area')}>
            <Input size="large" placeholder={t('placeholders.area')} maxLength={100} />
          </Form.Item>
        </div>
      </div>

      <Divider className="my-6" />

      {/* Social Media Section - Collapsible */}
      <Collapse
        ghost
        className="bg-stone-50 rounded-lg border border-stone-200"
        items={[
          {
            key: 'social-media',
            label: (
              <Title level={5} className="!mb-0 text-stone-800">
                {t('sections.socialMedia')}
              </Title>
            ),
            children: (
              <div className="pt-2">
                <Text type="secondary" className="block mb-4">
                  {t('socialMedia.hint')}
                </Text>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Instagram */}
                  <Form.Item<CustomerFormValues>
                    name="instagram"
                    label={t('socialMedia.instagram')}
                  >
                    <Input
                      size="large"
                      placeholder={t('placeholders.instagram')}
                      maxLength={100}
                      prefix={<InstagramOutlined className="text-stone-400" />}
                      addonBefore="@"
                      dir="ltr"
                    />
                  </Form.Item>

                  {/* TikTok */}
                  <Form.Item<CustomerFormValues> name="tiktok" label={t('socialMedia.tiktok')}>
                    <Input
                      size="large"
                      placeholder={t('placeholders.tiktok')}
                      maxLength={100}
                      prefix={
                        <svg
                          className="w-4 h-4 text-stone-400"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                        </svg>
                      }
                      addonBefore="@"
                      dir="ltr"
                    />
                  </Form.Item>

                  {/* Facebook */}
                  <Form.Item<CustomerFormValues> name="facebook" label={t('socialMedia.facebook')}>
                    <Input
                      size="large"
                      placeholder={t('placeholders.facebook')}
                      maxLength={100}
                      prefix={<FacebookOutlined className="text-stone-400" />}
                      dir="ltr"
                    />
                  </Form.Item>

                  {/* WhatsApp */}
                  <Form.Item<CustomerFormValues> name="whatsapp" label={t('socialMedia.whatsapp')}>
                    <Input
                      size="large"
                      placeholder={t('placeholders.whatsapp')}
                      maxLength={20}
                      prefix={<WhatsAppOutlined className="text-stone-400" />}
                      dir="ltr"
                    />
                  </Form.Item>
                </div>
              </div>
            ),
          },
        ]}
      />

      <Divider className="my-6" />

      {/* Business Information Section */}
      <div>
        <Title level={5} className="mb-4 text-stone-800">
          {t('sections.businessInfo')}
        </Title>

        {/* Client Type */}
        <Form.Item<CustomerFormValues> name="client_type" label={t('clientType')}>
          {({ field }) => (
            <Radio.Group
              {...field}
              onChange={(e) => {
                field.onChange(e);
                setClientType(e.target.value);
              }}
              className="flex gap-4"
            >
              {CLIENT_TYPE_OPTIONS.map((option) => (
                <Radio.Button
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'flex items-center gap-2 h-10 px-4',
                    field.value === option.value && 'border-amber-400 text-amber-600'
                  )}
                >
                  {option.icon}
                  <span>{t(option.labelKey)}</span>
                </Radio.Button>
              ))}
            </Radio.Group>
          )}
        </Form.Item>

        {/* Tax ID - Only visible for company type */}
        {clientType === 'company' && (
          <Form.Item<CustomerFormValues> name="tax_id" label={t('taxId')}>
            <Input size="large" placeholder={t('placeholders.taxId')} maxLength={50} dir="ltr" />
          </Form.Item>
        )}

        {/* VIP Status - Permission-based */}
        {canManageVip && (
          <Form.Item<CustomerFormValues> name="is_vip" valuePropName="checked">
            {({ field }) => (
              <Checkbox {...field} checked={Boolean(field.value)} className="flex items-center">
                <Space>
                  <CrownOutlined className="text-amber-500" />
                  <span>{t('segments.vip')}</span>
                  <Text type="secondary" className="text-xs">
                    ({t('vipDescription')})
                  </Text>
                </Space>
              </Checkbox>
            )}
          </Form.Item>
        )}
      </div>

      {/* Credit Section - Permission-based */}
      {canManageCredit && (
        <>
          <Divider className="my-6" />

          <div>
            <Title level={5} className="mb-4 text-stone-800">
              {t('creditAccount.title')}
            </Title>

            <Form.Item<CustomerFormValues> name="credit_limit" label={t('creditLimit')}>
              <InputNumber
                size="large"
                min={0}
                max={99999999999.9999}
                precision={2}
                className="w-full"
                placeholder={t('placeholders.creditLimit')}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => {
                  const parsed = Number(value?.replace(/,/g, '') || 0);
                  return parsed as 0 | 99999999999.9999;
                }}
              />
            </Form.Item>
          </div>
        </>
      )}

      <Divider className="my-6" />

      {/* Documents Section */}
      <div>
        <Title level={5} className="mb-4 text-stone-800">
          {t('sections.documents')}
        </Title>

        {/* ID Card Number */}
        <Form.Item<CustomerFormValues> name="id_card" label={t('idCard.number')}>
          <Input
            size="large"
            placeholder={t('placeholders.idCard')}
            maxLength={50}
            prefix={<IdcardOutlined className="text-stone-400" />}
            dir="ltr"
          />
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ID Card Front */}
          <div className="flex flex-col gap-2">
            <Text strong>{t('idCard.front')}</Text>
            <div
              className={cn(
                'relative border-2 border-dashed rounded-lg p-4 text-center',
                'transition-colors hover:border-amber-400',
                idCardFront ? 'border-amber-300 bg-amber-50/50' : 'border-stone-200'
              )}
            >
              {idCardFront ? (
                <div className="relative">
                  <img
                    src={idCardFront}
                    alt={t('idCard.front')}
                    className="w-full h-32 object-cover rounded"
                  />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleIdCardRemove('front')}
                    className="absolute top-2 end-2"
                    aria-label={tCommon('actions.delete')}
                  />
                </div>
              ) : (
                <Upload {...uploadPropsFront}>
                  <div className="flex flex-col items-center gap-2 py-4 cursor-pointer">
                    {isUploadingFront ? (
                      <Spin indicator={<LoadingOutlined spin />} />
                    ) : (
                      <>
                        <IdcardOutlined className="text-3xl text-stone-400" />
                        <Text type="secondary">{t('idCard.uploadFront')}</Text>
                      </>
                    )}
                  </div>
                </Upload>
              )}
            </div>
          </div>

          {/* ID Card Back */}
          <div className="flex flex-col gap-2">
            <Text strong>{t('idCard.back')}</Text>
            <div
              className={cn(
                'relative border-2 border-dashed rounded-lg p-4 text-center',
                'transition-colors hover:border-amber-400',
                idCardBack ? 'border-amber-300 bg-amber-50/50' : 'border-stone-200'
              )}
            >
              {idCardBack ? (
                <div className="relative">
                  <img
                    src={idCardBack}
                    alt={t('idCard.back')}
                    className="w-full h-32 object-cover rounded"
                  />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleIdCardRemove('back')}
                    className="absolute top-2 end-2"
                    aria-label={tCommon('actions.delete')}
                  />
                </div>
              ) : (
                <Upload {...uploadPropsBack}>
                  <div className="flex flex-col items-center gap-2 py-4 cursor-pointer">
                    {isUploadingBack ? (
                      <Spin indicator={<LoadingOutlined spin />} />
                    ) : (
                      <>
                        <IdcardOutlined className="text-3xl text-stone-400" />
                        <Text type="secondary">{t('idCard.uploadBack')}</Text>
                      </>
                    )}
                  </div>
                </Upload>
              )}
            </div>
          </div>
        </div>

        <Text type="secondary" className="text-xs mt-2 block">
          {t('idCard.hint')}
        </Text>
      </div>

      <Divider className="my-6" />

      {/* Notes Section */}
      <div>
        <Title level={5} className="mb-4 text-stone-800">
          {t('notes')}
        </Title>

        <Form.Item<CustomerFormValues> name="notes">
          <Input.TextArea
            rows={4}
            placeholder={t('placeholders.notes')}
            maxLength={5000}
            showCount
          />
        </Form.Item>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
        {onCancel && (
          <Button size="large" onClick={onCancel} disabled={isSubmitting}>
            {tCommon('actions.cancel')}
          </Button>
        )}

        <Form.Submit>
          <Button type="primary" size="large" loading={isSubmitting} className="min-w-[160px]">
            {isSubmitting
              ? tCommon('messages.saving')
              : isEditMode
                ? tCommon('actions.update')
                : tCommon('actions.create')}
          </Button>
        </Form.Submit>
      </div>
    </Form>
  );
}

export default CustomerForm;
