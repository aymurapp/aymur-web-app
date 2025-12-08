'use client';

/**
 * Business Settings Page
 *
 * Allows users to configure business-related settings including:
 * - Tax configuration (rate, name)
 * - Invoice settings (prefix, starting number)
 * - Receipt settings (header, footer text)
 * - Default payment terms
 *
 * @module app/(platform)/[locale]/[shopId]/settings/business/page
 */

import React, { useState, useCallback } from 'react';

import {
  SaveOutlined,
  PercentageOutlined,
  FileTextOutlined,
  PrinterOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Typography,
  Tag,
  Space,
  Divider,
  Alert,
} from 'antd';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

interface BusinessSettingsFormValues {
  // Tax Configuration
  default_tax_rate: number;
  tax_name: string;
  // Invoice Settings
  invoice_prefix: string;
  invoice_starting_number: number;
  // Receipt Settings
  receipt_header: string;
  receipt_footer: string;
  default_payment_terms: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_VALUES: BusinessSettingsFormValues = {
  default_tax_rate: 0,
  tax_name: 'VAT',
  invoice_prefix: 'INV-',
  invoice_starting_number: 1000,
  receipt_header: '',
  receipt_footer: '',
  default_payment_terms: 30,
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Business Settings Page
 */
export default function BusinessSettingsPage(): React.JSX.Element {
  const t = useTranslations('common');
  const tSettings = useTranslations('settings');
  const tSales = useTranslations('sales');

  const { can } = usePermissions();
  const { shopId } = useShop();

  // Form instance
  const [form] = Form.useForm<BusinessSettingsFormValues>();

  // State
  const [isSaving, setIsSaving] = useState(false);

  // Watch form values for preview
  const invoicePrefix = Form.useWatch('invoice_prefix', form) || DEFAULT_VALUES.invoice_prefix;
  const invoiceStartingNumber =
    Form.useWatch('invoice_starting_number', form) || DEFAULT_VALUES.invoice_starting_number;

  // Permission check
  const canEdit = can('settings.update');

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle form submission
   * Currently shows placeholder success message
   * TODO: Implement actual save functionality when backend is ready
   */
  const handleSubmit = useCallback(
    async (values: BusinessSettingsFormValues) => {
      if (!shopId || !canEdit) {
        message.error(t('messages.unexpectedError'));
        return;
      }

      setIsSaving(true);

      try {
        // TODO: Save settings to backend
        // await updateShopSettings(shopId, values);

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        message.success('Settings saved!');
        // eslint-disable-next-line no-console
        console.log('Business settings to save:', values);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('messages.operationFailed');
        message.error(errorMessage);
      } finally {
        setIsSaving(false);
      }
    },
    [shopId, canEdit, t]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="business-settings-page">
      {/* Page Header */}
      <PageHeader
        title={tSettings('business.title')}
        subtitle={tSettings('business.subtitle')}
        showBack
      />

      {/* Info Alert */}
      <Alert
        message={t('messages.info')}
        description="These settings will be applied to all new invoices and receipts. Existing documents will not be affected."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        className="mb-6"
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={DEFAULT_VALUES}
        onFinish={handleSubmit}
        disabled={!canEdit}
      >
        <div className="space-y-6">
          {/* Tax Configuration Card */}
          <Card
            title={
              <Space>
                <PercentageOutlined className="text-amber-600" />
                <span>{tSettings('business.taxConfiguration')}</span>
              </Space>
            }
            className="shadow-sm"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Default Tax Rate */}
              <Form.Item
                name="default_tax_rate"
                label={tSales('taxRate')}
                rules={[
                  { required: true, message: t('validation.required') },
                  {
                    type: 'number',
                    min: 0,
                    max: 100,
                    message:
                      t('validation.minValue', { min: 0 }) +
                      ' / ' +
                      t('validation.maxValue', { max: 100 }),
                  },
                ]}
                tooltip="The default tax rate applied to sales"
              >
                <InputNumber
                  min={0}
                  max={100}
                  precision={2}
                  addonAfter="%"
                  placeholder="0.00"
                  className="w-full"
                />
              </Form.Item>

              {/* Tax Name */}
              <Form.Item
                name="tax_name"
                label={tSettings('business.taxName')}
                rules={[
                  { required: true, message: t('validation.required') },
                  { max: 50, message: t('validation.maxLength', { max: 50 }) },
                ]}
                tooltip="The name displayed on invoices (e.g., VAT, Sales Tax, GST)"
              >
                <Input placeholder="e.g., VAT, Sales Tax, GST" />
              </Form.Item>
            </div>

            <Paragraph type="secondary" className="!mb-0 text-sm">
              This tax rate will be used as the default for new sales transactions.
            </Paragraph>
          </Card>

          {/* Invoice Settings Card */}
          <Card
            title={
              <Space>
                <FileTextOutlined className="text-amber-600" />
                <span>{tSettings('business.invoiceSettings')}</span>
                <Tag color="amber" className="ms-2">
                  {t('labels.comingSoon')}
                </Tag>
              </Space>
            }
            className="shadow-sm"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Invoice Prefix */}
              <Form.Item
                name="invoice_prefix"
                label={tSettings('business.invoicePrefix')}
                rules={[
                  { required: true, message: t('validation.required') },
                  { max: 20, message: t('validation.maxLength', { max: 20 }) },
                ]}
                tooltip="Prefix added before invoice numbers"
              >
                <Input placeholder="e.g., INV-, SALE-" />
              </Form.Item>

              {/* Starting Number */}
              <Form.Item
                name="invoice_starting_number"
                label={tSettings('business.startingNumber')}
                rules={[
                  { required: true, message: t('validation.required') },
                  {
                    type: 'number',
                    min: 1,
                    message: t('validation.minValue', { min: 1 }),
                  },
                ]}
                tooltip="The starting number for invoice numbering"
              >
                <InputNumber min={1} placeholder="1000" className="w-full" />
              </Form.Item>
            </div>

            {/* Invoice Preview */}
            <Divider className="!my-4" />
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-lg p-4">
              <Text type="secondary" className="text-xs uppercase tracking-wider">
                {tSettings('business.previewLabel')}
              </Text>
              <div className="mt-2">
                <Text strong className="text-lg font-mono text-amber-700 dark:text-amber-400">
                  {invoicePrefix}
                  {String(invoiceStartingNumber).padStart(6, '0')}
                </Text>
              </div>
              <Paragraph type="secondary" className="!mb-0 text-xs mt-1">
                {tSettings('business.nextInvoiceNumber')}
              </Paragraph>
            </div>
          </Card>

          {/* Receipt Settings Card */}
          <Card
            title={
              <Space>
                <PrinterOutlined className="text-amber-600" />
                <span>{tSettings('business.receiptSettings')}</span>
                <Tag color="amber" className="ms-2">
                  {t('labels.comingSoon')}
                </Tag>
              </Space>
            }
            className="shadow-sm"
          >
            {/* Receipt Header */}
            <Form.Item
              name="receipt_header"
              label={tSettings('business.receiptHeader')}
              rules={[{ max: 500, message: t('validation.maxLength', { max: 500 }) }]}
              tooltip="Text displayed at the top of receipts (e.g., business name, slogan)"
            >
              <TextArea
                rows={3}
                placeholder="Enter header text for receipts (e.g., Thank you for shopping with us!)"
                showCount
                maxLength={500}
              />
            </Form.Item>

            {/* Receipt Footer */}
            <Form.Item
              name="receipt_footer"
              label={tSettings('business.receiptFooter')}
              rules={[{ max: 500, message: t('validation.maxLength', { max: 500 }) }]}
              tooltip="Text displayed at the bottom of receipts (e.g., return policy, contact info)"
            >
              <TextArea
                rows={3}
                placeholder="Enter footer text for receipts (e.g., Returns accepted within 7 days with receipt)"
                showCount
                maxLength={500}
              />
            </Form.Item>

            <Divider className="!my-4" />

            {/* Default Payment Terms */}
            <Form.Item
              name="default_payment_terms"
              label={tSettings('business.paymentTerms')}
              rules={[
                { required: true, message: t('validation.required') },
                {
                  type: 'number',
                  min: 0,
                  max: 365,
                  message:
                    t('validation.minValue', { min: 0 }) +
                    ' / ' +
                    t('validation.maxValue', { max: 365 }),
                },
              ]}
              tooltip="Default number of days for invoice payment terms"
              className="max-w-xs"
            >
              <InputNumber
                min={0}
                max={365}
                addonAfter={t('time.days', { count: 0 }).replace('0 ', '')}
                placeholder="30"
                className="w-full"
              />
            </Form.Item>

            <Paragraph type="secondary" className="!mb-0 text-sm">
              Payment terms will be displayed on invoices as &quot;Due in X days&quot;.
            </Paragraph>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={isSaving}
              permission="settings.update"
              size="large"
            >
              {t('actions.save')} {tSettings('title')}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
