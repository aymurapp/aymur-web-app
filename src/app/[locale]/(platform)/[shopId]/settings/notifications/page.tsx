'use client';

/**
 * Notification Settings Page
 *
 * Allows users to configure notification preferences including:
 * - Email notification toggles
 * - Low stock alert settings
 * - Payment reminder settings
 * - System notification preferences
 *
 * @module app/(platform)/[locale]/[shopId]/settings/notifications/page
 */

import React, { useState, useCallback } from 'react';

import {
  SaveOutlined,
  MailOutlined,
  ShoppingOutlined,
  DollarOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Card, Form, InputNumber, message, Typography, Space, Switch, Divider } from 'antd';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';

const { Text, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface NotificationSettingsFormValues {
  // Email Notifications
  new_sale_notifications: boolean;
  daily_summary_email: boolean;
  weekly_report_email: boolean;
  // Inventory Alerts
  low_stock_alerts: boolean;
  low_stock_threshold: number;
  out_of_stock_alerts: boolean;
  // Payment Reminders
  customer_payment_reminders: boolean;
  supplier_payment_reminders: boolean;
  days_before_due: number;
  // System Notifications
  staff_activity_alerts: boolean;
  security_alerts: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_VALUES: NotificationSettingsFormValues = {
  // Email Notifications
  new_sale_notifications: true,
  daily_summary_email: false,
  weekly_report_email: true,
  // Inventory Alerts
  low_stock_alerts: true,
  low_stock_threshold: 5,
  out_of_stock_alerts: true,
  // Payment Reminders
  customer_payment_reminders: true,
  supplier_payment_reminders: true,
  days_before_due: 3,
  // System Notifications
  staff_activity_alerts: false,
  security_alerts: true,
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Notification Settings Page
 */
export default function NotificationSettingsPage(): React.JSX.Element {
  const t = useTranslations('common');
  const tSettings = useTranslations('settings');

  const { can } = usePermissions();
  const { shopId } = useShop();

  // Form instance
  const [form] = Form.useForm<NotificationSettingsFormValues>();

  // State
  const [isSaving, setIsSaving] = useState(false);

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
    async (values: NotificationSettingsFormValues) => {
      if (!shopId || !canEdit) {
        message.error(t('messages.unexpectedError'));
        return;
      }

      setIsSaving(true);

      try {
        // TODO: Save settings to backend
        // await updateNotificationSettings(shopId, values);

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        message.success('Settings saved!');
        // eslint-disable-next-line no-console
        console.log('Notification settings to save:', values);
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
    <div className="notification-settings-page">
      {/* Page Header */}
      <PageHeader
        title={tSettings('notificationSettings.title')}
        subtitle={tSettings('notificationSettings.subtitle')}
        showBack
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={DEFAULT_VALUES}
        onFinish={handleSubmit}
        disabled={!canEdit}
      >
        <div className="space-y-6">
          {/* Email Notifications Card */}
          <Card
            title={
              <Space>
                <MailOutlined className="text-amber-600" />
                <span>{tSettings('notificationSettings.emailNotifications.title')}</span>
              </Space>
            }
            className="shadow-sm"
          >
            {/* New Sale Notifications */}
            <Form.Item name="new_sale_notifications" valuePropName="checked" className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text strong>{tSettings('notificationSettings.emailNotifications.newSale')}</Text>
                  <Paragraph type="secondary" className="!mb-0 text-sm">
                    {tSettings('notificationSettings.emailNotifications.newSaleDescription')}
                  </Paragraph>
                </div>
                <Switch
                  checked={form.getFieldValue('new_sale_notifications')}
                  onChange={(checked) => form.setFieldValue('new_sale_notifications', checked)}
                />
              </div>
            </Form.Item>

            <Divider className="!my-4" />

            {/* Daily Summary Email */}
            <Form.Item name="daily_summary_email" valuePropName="checked" className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text strong>
                    {tSettings('notificationSettings.emailNotifications.dailySummary')}
                  </Text>
                  <Paragraph type="secondary" className="!mb-0 text-sm">
                    {tSettings('notificationSettings.emailNotifications.dailySummaryDescription')}
                  </Paragraph>
                </div>
                <Switch
                  checked={form.getFieldValue('daily_summary_email')}
                  onChange={(checked) => form.setFieldValue('daily_summary_email', checked)}
                />
              </div>
            </Form.Item>

            <Divider className="!my-4" />

            {/* Weekly Report Email */}
            <Form.Item name="weekly_report_email" valuePropName="checked" className="mb-0">
              <div className="flex items-center justify-between">
                <div>
                  <Text strong>
                    {tSettings('notificationSettings.emailNotifications.weeklyReport')}
                  </Text>
                  <Paragraph type="secondary" className="!mb-0 text-sm">
                    {tSettings('notificationSettings.emailNotifications.weeklyReportDescription')}
                  </Paragraph>
                </div>
                <Switch
                  checked={form.getFieldValue('weekly_report_email')}
                  onChange={(checked) => form.setFieldValue('weekly_report_email', checked)}
                />
              </div>
            </Form.Item>
          </Card>

          {/* Inventory Alerts Card */}
          <Card
            title={
              <Space>
                <ShoppingOutlined className="text-amber-600" />
                <span>{tSettings('notificationSettings.inventoryAlerts.title')}</span>
              </Space>
            }
            className="shadow-sm"
          >
            {/* Low Stock Alerts */}
            <Form.Item name="low_stock_alerts" valuePropName="checked" className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text strong>{tSettings('notificationSettings.inventoryAlerts.lowStock')}</Text>
                  <Paragraph type="secondary" className="!mb-0 text-sm">
                    {tSettings('notificationSettings.inventoryAlerts.lowStockDescription')}
                  </Paragraph>
                </div>
                <Switch
                  checked={form.getFieldValue('low_stock_alerts')}
                  onChange={(checked) => form.setFieldValue('low_stock_alerts', checked)}
                />
              </div>
            </Form.Item>

            <Divider className="!my-4" />

            {/* Low Stock Threshold */}
            <Form.Item
              name="low_stock_threshold"
              label={tSettings('notificationSettings.inventoryAlerts.threshold')}
              rules={[
                { required: true, message: t('validation.required') },
                {
                  type: 'number',
                  min: 1,
                  max: 100,
                  message:
                    t('validation.minValue', { min: 1 }) +
                    ' / ' +
                    t('validation.maxValue', { max: 100 }),
                },
              ]}
              tooltip={tSettings('notificationSettings.inventoryAlerts.thresholdTooltip')}
              className="max-w-xs"
            >
              <InputNumber
                min={1}
                max={100}
                addonAfter={tSettings('notificationSettings.inventoryAlerts.units')}
                placeholder="5"
                className="w-full"
              />
            </Form.Item>

            <Divider className="!my-4" />

            {/* Out of Stock Alerts */}
            <Form.Item name="out_of_stock_alerts" valuePropName="checked" className="mb-0">
              <div className="flex items-center justify-between">
                <div>
                  <Text strong>{tSettings('notificationSettings.inventoryAlerts.outOfStock')}</Text>
                  <Paragraph type="secondary" className="!mb-0 text-sm">
                    {tSettings('notificationSettings.inventoryAlerts.outOfStockDescription')}
                  </Paragraph>
                </div>
                <Switch
                  checked={form.getFieldValue('out_of_stock_alerts')}
                  onChange={(checked) => form.setFieldValue('out_of_stock_alerts', checked)}
                />
              </div>
            </Form.Item>
          </Card>

          {/* Payment Reminders Card */}
          <Card
            title={
              <Space>
                <DollarOutlined className="text-amber-600" />
                <span>{tSettings('notificationSettings.paymentReminders.title')}</span>
              </Space>
            }
            className="shadow-sm"
          >
            {/* Customer Payment Reminders */}
            <Form.Item name="customer_payment_reminders" valuePropName="checked" className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text strong>{tSettings('notificationSettings.paymentReminders.customer')}</Text>
                  <Paragraph type="secondary" className="!mb-0 text-sm">
                    {tSettings('notificationSettings.paymentReminders.customerDescription')}
                  </Paragraph>
                </div>
                <Switch
                  checked={form.getFieldValue('customer_payment_reminders')}
                  onChange={(checked) => form.setFieldValue('customer_payment_reminders', checked)}
                />
              </div>
            </Form.Item>

            <Divider className="!my-4" />

            {/* Supplier Payment Reminders */}
            <Form.Item name="supplier_payment_reminders" valuePropName="checked" className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text strong>{tSettings('notificationSettings.paymentReminders.supplier')}</Text>
                  <Paragraph type="secondary" className="!mb-0 text-sm">
                    {tSettings('notificationSettings.paymentReminders.supplierDescription')}
                  </Paragraph>
                </div>
                <Switch
                  checked={form.getFieldValue('supplier_payment_reminders')}
                  onChange={(checked) => form.setFieldValue('supplier_payment_reminders', checked)}
                />
              </div>
            </Form.Item>

            <Divider className="!my-4" />

            {/* Days Before Due */}
            <Form.Item
              name="days_before_due"
              label={tSettings('notificationSettings.paymentReminders.daysBeforeDue')}
              rules={[
                { required: true, message: t('validation.required') },
                {
                  type: 'number',
                  min: 1,
                  max: 30,
                  message:
                    t('validation.minValue', { min: 1 }) +
                    ' / ' +
                    t('validation.maxValue', { max: 30 }),
                },
              ]}
              tooltip={tSettings('notificationSettings.paymentReminders.daysBeforeDueTooltip')}
              className="max-w-xs mb-0"
            >
              <InputNumber
                min={1}
                max={30}
                addonAfter={t('time.days', { count: 0 }).replace('0 ', '')}
                placeholder="3"
                className="w-full"
              />
            </Form.Item>
          </Card>

          {/* System Notifications Card */}
          <Card
            title={
              <Space>
                <SettingOutlined className="text-amber-600" />
                <span>{tSettings('notificationSettings.systemNotifications.title')}</span>
              </Space>
            }
            className="shadow-sm"
          >
            {/* Staff Activity Alerts */}
            <Form.Item name="staff_activity_alerts" valuePropName="checked" className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text strong>
                    {tSettings('notificationSettings.systemNotifications.staffActivity')}
                  </Text>
                  <Paragraph type="secondary" className="!mb-0 text-sm">
                    {tSettings('notificationSettings.systemNotifications.staffActivityDescription')}
                  </Paragraph>
                </div>
                <Switch
                  checked={form.getFieldValue('staff_activity_alerts')}
                  onChange={(checked) => form.setFieldValue('staff_activity_alerts', checked)}
                />
              </div>
            </Form.Item>

            <Divider className="!my-4" />

            {/* Security Alerts */}
            <Form.Item name="security_alerts" valuePropName="checked" className="mb-0">
              <div className="flex items-center justify-between">
                <div>
                  <Text strong>
                    {tSettings('notificationSettings.systemNotifications.security')}
                  </Text>
                  <Paragraph type="secondary" className="!mb-0 text-sm">
                    {tSettings('notificationSettings.systemNotifications.securityDescription')}
                  </Paragraph>
                </div>
                <Switch
                  checked={form.getFieldValue('security_alerts')}
                  onChange={(checked) => form.setFieldValue('security_alerts', checked)}
                />
              </div>
            </Form.Item>
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
