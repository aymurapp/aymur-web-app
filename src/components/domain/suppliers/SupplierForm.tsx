'use client';

/**
 * SupplierForm Component
 *
 * A comprehensive form component for creating and editing supplier information.
 * Can be used in a Modal or Drawer context.
 *
 * Database table: suppliers
 * Available fields: company_name, contact_person, phone, email, address,
 * id_supplier_category, tax_id, status, notes, current_balance, version
 *
 * Note: The database does NOT have: city, country, bank_name, bank_account_number,
 * swift_code, credit_limit, credit_terms_days, website, address_line1/2, state,
 * postal_code, bank_iban, payment_terms_days, is_active
 *
 * Features:
 * - Basic info: company name, contact person, phone, email
 * - Address field (single field in database)
 * - Category selector using useSupplierCategories (id_supplier_category)
 * - Tax ID field
 * - Notes field
 * - Zod validation with supplierSchema
 * - RTL support with logical properties
 *
 * @module components/domain/suppliers/SupplierForm
 */

import React, { useCallback, useTransition, useMemo } from 'react';

import {
  ShopOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Input, Select, message, Divider, Typography, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Form } from '@/components/ui/Form';
import {
  useCreateSupplier,
  useUpdateSupplier,
  useSupplierCategories,
  type Supplier,
} from '@/lib/hooks/data/useSuppliers';
import { supplierSchema, type SupplierInput } from '@/lib/utils/schemas/supplier';

import type { z } from 'zod';

const { Title } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

/**
 * Form values type - uses the supplier schema input type
 */
type SupplierFormValues = SupplierInput;

// Cast the schema to match the Form component's expected type
// This is needed because the schema uses transforms that change output types
const formSchema = supplierSchema as unknown as z.ZodType<SupplierFormValues>;

/**
 * Props for the SupplierForm component
 */
export interface SupplierFormProps {
  /**
   * Supplier data for edit mode. If undefined, form is in create mode.
   */
  supplier?: Supplier;

  /**
   * Callback when supplier is successfully created or updated
   */
  onSuccess?: (supplier: Supplier) => void;

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;

  /**
   * Whether to show a compact version of the form (fewer sections visible)
   */
  compact?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SupplierForm Component
 *
 * Provides a comprehensive form for creating and editing suppliers
 * with support for all supplier fields and permission-based visibility.
 */
export function SupplierForm({
  supplier,
  onSuccess,
  onCancel,
  compact = false,
}: SupplierFormProps): React.JSX.Element {
  const t = useTranslations('suppliers');
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  // Mutations
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useSupplierCategories();

  // Determine if we're in edit mode
  const isEditMode = !!supplier;

  // Category options - database field is id_supplier_category
  const categoryOptions = useMemo(() => {
    if (!categories) {
      return [];
    }
    return categories.map((cat) => ({
      label: cat.category_name,
      value: cat.id_supplier_category,
    }));
  }, [categories]);

  /**
   * Handle form submission
   * Note: Maps form field names to database field names
   * Database suppliers table has: company_name, contact_person, phone, email,
   * address, id_supplier_category, tax_id, status, notes
   */
  const handleSubmit = useCallback(
    async (data: SupplierFormValues) => {
      startTransition(async () => {
        try {
          // Prepare supplier data - map to actual database field names
          // Note: DB does NOT have city, country, bank_name, bank_account_number,
          // swift_code, credit_limit, credit_terms_days
          const supplierData = {
            company_name: data.company_name,
            contact_person: data.contact_name || null, // DB field is contact_person
            phone: data.phone || null,
            email: data.email || null,
            id_supplier_category: data.id_category || null, // DB field is id_supplier_category
            address: data.address_line1 || null, // DB has single address field
            tax_id: data.tax_id || null,
            status: data.is_active === false ? 'inactive' : 'active', // DB uses status string
            notes: data.notes || null,
          };

          let result: Supplier;

          if (isEditMode && supplier) {
            // Update existing supplier
            result = await updateSupplier.mutateAsync({
              supplierId: supplier.id_supplier,
              data: supplierData,
            });
            message.success(t('messages.updateSuccess'));
          } else {
            // Create new supplier
            result = await createSupplier.mutateAsync(supplierData);
            message.success(t('messages.createSuccess'));
          }

          onSuccess?.(result);
        } catch (error) {
          console.error('[SupplierForm] Submit error:', error);
          message.error(isEditMode ? t('messages.updateError') : t('messages.createError'));
        }
      });
    },
    [isEditMode, supplier, createSupplier, updateSupplier, onSuccess, t]
  );

  // Check if form is currently submitting
  const isSubmitting = isPending || createSupplier.isPending || updateSupplier.isPending;

  return (
    <Form<SupplierFormValues>
      schema={formSchema}
      onSubmit={handleSubmit}
      defaultValues={{
        // Map database field names to form field names
        // DB suppliers table has: company_name, contact_person, phone, email,
        // address, id_supplier_category, tax_id, status, notes
        company_name: supplier?.company_name || '',
        contact_name: supplier?.contact_person || '', // DB field is contact_person
        phone: supplier?.phone || '',
        email: supplier?.email || '',
        id_category: supplier?.id_supplier_category || undefined, // DB field is id_supplier_category
        address_line1: supplier?.address || '', // DB has single address field
        address_line2: '', // DB doesn't have address_line2
        city: '', // DB doesn't have city field
        state: '', // DB doesn't have state field
        postal_code: '', // DB doesn't have postal_code field
        country: '', // DB doesn't have country field
        tax_id: supplier?.tax_id || '',
        bank_name: '', // DB doesn't have bank_name field
        bank_account: '', // DB doesn't have bank_account_number field
        bank_iban: '', // DB doesn't have bank_iban field
        bank_swift: '', // DB doesn't have swift_code field
        credit_limit: undefined, // DB doesn't have credit_limit field
        payment_terms_days: undefined, // DB doesn't have credit_terms_days field
        is_active: supplier?.status !== 'inactive', // DB uses status string
        notes: supplier?.notes || '',
      }}
      className="space-y-6"
    >
      {/* Basic Information Section */}
      <div>
        <Title level={5} className="mb-4 text-stone-800 flex items-center gap-2">
          <ShopOutlined className="text-amber-500" />
          {t('sections.basicInfo')}
        </Title>

        {/* Company Name */}
        <Form.Item<SupplierFormValues> name="company_name" label={t('companyName')} required>
          <Input
            size="large"
            placeholder={t('placeholders.companyName')}
            maxLength={255}
            prefix={<ShopOutlined className="text-stone-400" />}
          />
        </Form.Item>

        {/* Contact Person */}
        <Form.Item<SupplierFormValues> name="contact_name" label={t('contactPerson')}>
          <Input
            size="large"
            placeholder={t('placeholders.contactPerson')}
            maxLength={255}
            prefix={<UserOutlined className="text-stone-400" />}
          />
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Phone */}
          <Form.Item<SupplierFormValues> name="phone" label={t('phone')}>
            <Input
              size="large"
              placeholder={t('placeholders.phone')}
              maxLength={50}
              dir="ltr"
              className="text-start"
              prefix={<PhoneOutlined className="text-stone-400" />}
            />
          </Form.Item>

          {/* Email */}
          <Form.Item<SupplierFormValues> name="email" label={t('email')}>
            <Input
              size="large"
              type="email"
              placeholder={t('placeholders.email')}
              maxLength={255}
              dir="ltr"
              prefix={<MailOutlined className="text-stone-400" />}
            />
          </Form.Item>
        </div>

        {/* Category */}
        <Form.Item<SupplierFormValues> name="id_category" label={t('category')}>
          {categoriesLoading ? (
            <Skeleton.Input active size="large" block />
          ) : (
            <Select
              size="large"
              placeholder={t('placeholders.category')}
              allowClear
              showSearch
              optionFilterProp="label"
              options={categoryOptions}
              loading={categoriesLoading}
            />
          )}
        </Form.Item>
      </div>

      {!compact && (
        <>
          <Divider className="my-6" />

          {/* Address Section - Database only has single 'address' field */}
          <div>
            <Title level={5} className="mb-4 text-stone-800 flex items-center gap-2">
              <HomeOutlined className="text-amber-500" />
              {t('sections.address')}
            </Title>

            {/* Address - single field in database */}
            <Form.Item<SupplierFormValues> name="address_line1" label={t('address')}>
              <TextArea rows={3} placeholder={t('placeholders.address')} maxLength={255} />
            </Form.Item>

            {/* Tax ID */}
            <Form.Item<SupplierFormValues> name="tax_id" label={t('taxId')}>
              <Input size="large" placeholder={t('placeholders.taxId')} maxLength={50} dir="ltr" />
            </Form.Item>
          </div>

          {/* Note: Bank Details and Credit Terms sections removed - those fields
              do not exist in the suppliers database table */}

          <Divider className="my-6" />

          {/* Notes Section */}
          <div>
            <Title level={5} className="mb-4 text-stone-800 flex items-center gap-2">
              <FileTextOutlined className="text-amber-500" />
              {t('notes')}
            </Title>

            <Form.Item<SupplierFormValues> name="notes">
              <TextArea rows={4} placeholder={t('placeholders.notes')} maxLength={5000} showCount />
            </Form.Item>
          </div>
        </>
      )}

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

export default SupplierForm;
