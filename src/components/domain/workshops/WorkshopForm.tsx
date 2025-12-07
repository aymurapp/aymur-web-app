'use client';

/**
 * WorkshopForm Component
 *
 * A modal/drawer form for creating and editing workshop information.
 * Features:
 * - Workshop name and contact information
 * - Internal/external toggle
 * - Specialization input
 * - Address and notes fields
 * - Zod validation with react-hook-form
 * - RTL support with logical properties
 *
 * @module components/domain/workshops/WorkshopForm
 */

import React, { useCallback, useTransition, useMemo } from 'react';

import {
  ShopOutlined,
  HomeOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { Modal, Input, Switch, message, Divider, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Form } from '@/components/ui/Form';
import { useCreateWorkshop, useUpdateWorkshop, type Workshop } from '@/lib/hooks/data/useWorkshops';

import type { ZodType } from 'zod';

// Create a custom form schema for the workshop form
// Simplified version that handles form validation
const workshopFormSchema = z.object({
  workshop_name: z.string().min(2, 'Workshop name must be at least 2 characters').max(255),
  is_internal: z.boolean().default(false),
  contact_person: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable(),
  specialization: z.string().max(500).optional().nullable(),
  status: z.enum(['active', 'inactive']).optional().nullable().default('active'),
  notes: z.string().max(5000).optional().nullable(),
});

// Infer the form data type from the schema
type WorkshopFormData = z.infer<typeof workshopFormSchema>;

const { Text, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface WorkshopFormProps {
  /**
   * Whether the modal is open
   */
  open: boolean;

  /**
   * Workshop data for edit mode. If undefined/null, form is in create mode.
   */
  workshop?: Workshop | null;

  /**
   * Callback when workshop is successfully created or updated
   */
  onSuccess?: (workshop: Workshop) => void;

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * WorkshopForm Component
 *
 * Provides a modal form for creating and editing workshops
 * with support for all workshop fields and validation.
 */
export function WorkshopForm({
  open,
  workshop,
  onSuccess,
  onCancel,
}: WorkshopFormProps): React.JSX.Element {
  const t = useTranslations('workshops');
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  // Mutations
  const createWorkshop = useCreateWorkshop();
  const updateWorkshop = useUpdateWorkshop();

  // Determine if we're in edit mode
  const isEditMode = !!workshop;

  // Check if form is currently submitting
  const isSubmitting = isPending || createWorkshop.isPending || updateWorkshop.isPending;

  // Default values for the form
  const defaultValues = useMemo<WorkshopFormData>(
    () => ({
      workshop_name: workshop?.workshop_name || '',
      is_internal: workshop?.is_internal || false,
      contact_person: workshop?.contact_person || null,
      phone: workshop?.phone || null,
      email: workshop?.email || null,
      address: workshop?.address || null,
      specialization: workshop?.specialization || null,
      status: (workshop?.status as 'active' | 'inactive') || 'active',
      notes: workshop?.notes || null,
    }),
    [workshop]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: WorkshopFormData) => {
      startTransition(async () => {
        try {
          let result: Workshop;

          if (isEditMode && workshop) {
            // Update existing workshop
            result = await updateWorkshop.mutateAsync({
              workshopId: workshop.id_workshop,
              data: {
                workshop_name: data.workshop_name,
                is_internal: data.is_internal,
                contact_person: data.contact_person,
                phone: data.phone,
                email: data.email,
                address: data.address,
                specialization: data.specialization,
                status: data.status,
                notes: data.notes,
              },
            });
            message.success(t('messages.updateSuccess'));
          } else {
            // Create new workshop
            result = await createWorkshop.mutateAsync({
              workshop_name: data.workshop_name,
              is_internal: data.is_internal,
              contact_person: data.contact_person,
              phone: data.phone,
              email: data.email,
              address: data.address,
              specialization: data.specialization,
              status: data.status,
              notes: data.notes,
            });
            message.success(t('messages.createSuccess'));
          }

          onSuccess?.(result);
        } catch (error) {
          console.error('[WorkshopForm] Submit error:', error);
          message.error(isEditMode ? t('messages.updateError') : t('messages.createError'));
        }
      });
    },
    [isEditMode, workshop, createWorkshop, updateWorkshop, onSuccess, t]
  );

  return (
    <Modal
      open={open}
      title={
        <div className="flex items-center gap-2">
          <ShopOutlined className="text-amber-500" />
          <span>{isEditMode ? t('editWorkshop') : t('addWorkshop')}</span>
        </div>
      }
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
      maskClosable={!isSubmitting}
      closable={!isSubmitting}
    >
      <Form<WorkshopFormData>
        schema={workshopFormSchema as unknown as ZodType<WorkshopFormData>}
        onSubmit={handleSubmit}
        defaultValues={defaultValues}
        className="space-y-6 mt-4"
      >
        {/* Basic Information Section */}
        <div>
          <Title level={5} className="mb-4 text-stone-800">
            {t('workshopDetails')}
          </Title>

          {/* Workshop Name */}
          <Form.Item<WorkshopFormData> name="workshop_name" label={t('name')} required>
            <Input
              size="large"
              placeholder={t('placeholders.workshopName')}
              maxLength={255}
              prefix={<ShopOutlined className="text-stone-400" />}
            />
          </Form.Item>

          {/* Internal/External Toggle */}
          <Form.Item<WorkshopFormData> name="is_internal" label={t('type')}>
            {({ field }) => (
              <div className="flex items-center gap-3">
                <Switch
                  checked={!!field.value}
                  onChange={field.onChange}
                  checkedChildren={<HomeOutlined />}
                  unCheckedChildren={<ShopOutlined />}
                />
                <div className="flex items-center gap-2">
                  {field.value ? (
                    <>
                      <HomeOutlined className="text-amber-500" />
                      <Text>{t('internal')}</Text>
                    </>
                  ) : (
                    <>
                      <ShopOutlined className="text-blue-500" />
                      <Text>{t('external')}</Text>
                    </>
                  )}
                </div>
              </div>
            )}
          </Form.Item>

          {/* Specialization */}
          <Form.Item<WorkshopFormData> name="specialization" label={t('specialization')}>
            <Input size="large" placeholder={t('placeholders.specialization')} maxLength={500} />
          </Form.Item>
        </div>

        <Divider className="my-6" />

        {/* Contact Information Section */}
        <div>
          <Title level={5} className="mb-4 text-stone-800">
            {t('contactInfo')}
          </Title>

          {/* Contact Person */}
          <Form.Item<WorkshopFormData> name="contact_person" label={t('contactPerson')}>
            <Input
              size="large"
              placeholder={t('placeholders.contactPerson')}
              maxLength={255}
              prefix={<UserOutlined className="text-stone-400" />}
            />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone */}
            <Form.Item<WorkshopFormData> name="phone" label={t('phone')}>
              <Input
                size="large"
                placeholder={t('placeholders.phone')}
                maxLength={50}
                prefix={<PhoneOutlined className="text-stone-400" />}
                dir="ltr"
                className="text-start"
              />
            </Form.Item>

            {/* Email */}
            <Form.Item<WorkshopFormData> name="email" label={tCommon('labels.email')}>
              <Input
                size="large"
                type="email"
                placeholder={t('placeholders.email')}
                maxLength={255}
                prefix={<MailOutlined className="text-stone-400" />}
                dir="ltr"
              />
            </Form.Item>
          </div>
        </div>

        <Divider className="my-6" />

        {/* Address Section */}
        <div>
          <Title level={5} className="mb-4 text-stone-800">
            {t('address')}
          </Title>

          <Form.Item<WorkshopFormData> name="address" label={t('address')}>
            <Input.TextArea rows={3} placeholder={t('placeholders.address')} maxLength={500} />
          </Form.Item>
        </div>

        <Divider className="my-6" />

        {/* Notes Section */}
        <div>
          <Title level={5} className="mb-4 text-stone-800">
            {tCommon('labels.notes')}
          </Title>

          <Form.Item<WorkshopFormData> name="notes">
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
          <Button size="large" onClick={onCancel} disabled={isSubmitting}>
            {tCommon('actions.cancel')}
          </Button>

          <Form.Submit>
            <Button type="primary" size="large" loading={isSubmitting} className="min-w-[140px]">
              {isSubmitting
                ? tCommon('messages.saving')
                : isEditMode
                  ? tCommon('actions.update')
                  : tCommon('actions.create')}
            </Button>
          </Form.Submit>
        </div>
      </Form>
    </Modal>
  );
}

export default WorkshopForm;
