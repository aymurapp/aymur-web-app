'use client';

/**
 * QuickCustomerForm Component
 *
 * Minimal inline form for quick customer creation during POS flow.
 * Allows creating a customer with essential fields without leaving the selector.
 *
 * Features:
 * - Simplified fields: name (required), phone (required), email (optional)
 * - Uses customerQuickAddSchema for validation
 * - Creates customer and selects immediately on success
 * - Cancel button to return to search
 * - Loading state during creation
 * - RTL support with CSS logical properties
 *
 * @module components/domain/sales/QuickCustomerForm
 */

import React, { useCallback, useTransition } from 'react';

import { UserOutlined, PhoneOutlined, MailOutlined, CloseOutlined } from '@ant-design/icons';
import { Input, message, Typography, Space } from 'antd';
import { useTranslations } from 'next-intl';
import { type z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Form } from '@/components/ui/Form';
import { useUser } from '@/lib/hooks/auth';
import { useCreateCustomer } from '@/lib/hooks/data/useCustomers';
import type { Customer } from '@/lib/hooks/data/useCustomers';
import { cn } from '@/lib/utils/cn';
import { customerQuickAddSchema } from '@/lib/utils/schemas/customer';

const { Text, Title } = Typography;

/**
 * Form values type from the quick add schema
 */
type QuickCustomerFormValues = z.infer<typeof customerQuickAddSchema>;

/**
 * Props for the QuickCustomerForm component
 */
export interface QuickCustomerFormProps {
  /** Callback when customer is successfully created */
  onSuccess?: (customer: Customer) => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * QuickCustomerForm Component
 *
 * A streamlined form for creating customers during POS transactions.
 * Only requires essential information to minimize friction.
 */
export function QuickCustomerForm({
  onSuccess,
  onCancel,
  className,
}: QuickCustomerFormProps): JSX.Element {
  const t = useTranslations('customers');
  const tSales = useTranslations('sales');
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  // Get current user for created_by field
  const { user } = useUser();

  // Mutation hook
  const createCustomer = useCreateCustomer();

  // Check if form is submitting
  const isSubmitting = isPending || createCustomer.isPending;

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: QuickCustomerFormValues) => {
      if (!user?.id_user) {
        message.error(t('messages.createError'));
        return;
      }

      startTransition(async () => {
        try {
          // Create customer with minimal data
          const result = await createCustomer.mutateAsync({
            full_name: data.full_name.trim(),
            phone: data.phone.trim(),
            email: data.email?.trim() || null,
            client_type: data.client_type || 'individual',
            created_by: user.id_user,
          });

          message.success(t('messages.createSuccess'));
          onSuccess?.(result);
        } catch (error) {
          console.error('[QuickCustomerForm] Create error:', error);
          message.error(t('messages.createError'));
        }
      });
    },
    [createCustomer, t, onSuccess, user]
  );

  return (
    <div className={cn('bg-amber-50/50 border border-amber-200 rounded-lg p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Title level={5} className="m-0 text-stone-800">
          {tSales('customerSelector.createNew')}
        </Title>
        {onCancel && (
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label={tCommon('actions.cancel')}
          />
        )}
      </div>

      {/* Form */}
      <Form<QuickCustomerFormValues>
        schema={customerQuickAddSchema as z.ZodType<QuickCustomerFormValues>}
        onSubmit={handleSubmit}
        defaultValues={{
          full_name: '',
          phone: '',
          email: '',
          client_type: 'individual',
        }}
        className="space-y-3"
      >
        {/* Full Name - Required */}
        <Form.Item<QuickCustomerFormValues> name="full_name" label={t('fullName')} required>
          <Input
            size="large"
            placeholder={t('placeholders.fullName')}
            maxLength={255}
            prefix={<UserOutlined className="text-stone-400" />}
            disabled={isSubmitting}
            autoFocus
          />
        </Form.Item>

        {/* Phone - Required */}
        <Form.Item<QuickCustomerFormValues> name="phone" label={t('phone')} required>
          <Input
            size="large"
            placeholder={t('placeholders.phone')}
            maxLength={20}
            prefix={<PhoneOutlined className="text-stone-400" />}
            dir="ltr"
            className="text-start"
            disabled={isSubmitting}
          />
        </Form.Item>

        {/* Email - Optional */}
        <Form.Item<QuickCustomerFormValues>
          name="email"
          label={
            <Space size={4}>
              <span>{t('email')}</span>
              <Text type="secondary" className="text-xs">
                ({tCommon('labels.optional')})
              </Text>
            </Space>
          }
        >
          <Input
            size="large"
            type="email"
            placeholder={t('placeholders.email')}
            maxLength={255}
            prefix={<MailOutlined className="text-stone-400" />}
            dir="ltr"
            disabled={isSubmitting}
          />
        </Form.Item>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {onCancel && (
            <Button onClick={onCancel} disabled={isSubmitting}>
              {tCommon('actions.cancel')}
            </Button>
          )}

          <Form.Submit>
            <Button type="primary" loading={isSubmitting} className="min-w-[120px]">
              {isSubmitting
                ? tCommon('messages.saving')
                : tSales('customerSelector.createAndSelect')}
            </Button>
          </Form.Submit>
        </div>
      </Form>

      {/* Helper Text */}
      <Text type="secondary" className="text-xs block mt-3">
        {tSales('customerSelector.quickCreateHint')}
      </Text>
    </div>
  );
}

export default QuickCustomerForm;
