'use client';

/**
 * ReminderForm Component
 *
 * Modal form for creating and editing payment reminders.
 * Supports entity type selection, entity selector, due date, amount, and notes.
 *
 * Features:
 * - Entity type selector (supplier, workshop, courier, customer)
 * - Entity selector (dynamic based on type)
 * - Due date picker
 * - Amount input with currency
 * - Notes field
 * - Recurring option toggle with frequency selector (prepared for future)
 * - Validation with paymentReminderSchema
 *
 * Note: Currently the database only supports supplier as entity type.
 * The entity_type concept is prepared for future expansion.
 *
 * @module components/domain/reminders/ReminderForm
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import { DollarOutlined, CalendarOutlined, FileTextOutlined } from '@ant-design/icons';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Space,
  message,
  Divider,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  useCreatePaymentReminder,
  useUpdatePaymentReminder,
  type PaymentReminderWithSupplier,
  type PaymentReminderInsert,
  type PaymentReminderUpdate,
} from '@/lib/hooks/data/usePaymentReminders';
import { useSuppliers } from '@/lib/hooks/data/useSuppliers';

const { TextArea } = Input;
const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface ReminderFormProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback on successful save */
  onSuccess?: () => void;
  /** Reminder data for editing (null for create) */
  reminder?: PaymentReminderWithSupplier | null;
}

interface FormValues {
  id_supplier: string;
  reminder_type: string;
  due_date: dayjs.Dayjs;
  amount: number;
  notes?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const REMINDER_TYPES = [
  { value: 'payment_due', labelKey: 'type.paymentDue' },
  { value: 'follow_up', labelKey: 'type.followUp' },
  { value: 'overdue', labelKey: 'type.overdue' },
  { value: 'scheduled', labelKey: 'type.scheduled' },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ReminderForm Component
 *
 * Modal form for creating and editing payment reminders with validation.
 */
export function ReminderForm({
  open,
  onClose,
  onSuccess,
  reminder,
}: ReminderFormProps): React.JSX.Element {
  const t = useTranslations('reminders');
  const tCommon = useTranslations('common');

  const [form] = Form.useForm<FormValues>();

  // Data fetching for entity dropdowns
  const { suppliers = [], isLoading: suppliersLoading } = useSuppliers({
    pageSize: 100,
    isActive: true,
  });

  // Mutations
  const createReminder = useCreatePaymentReminder();
  const updateReminder = useUpdatePaymentReminder();

  const isEditing = !!reminder;
  const isLoading = createReminder.isPending || updateReminder.isPending;

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  // Build supplier options
  const supplierOptions = useMemo(() => {
    return suppliers.map((s) => ({
      label: s.company_name,
      value: s.id_supplier,
      description: s.contact_person || undefined,
    }));
  }, [suppliers]);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Populate form when editing
  useEffect(() => {
    if (open && reminder) {
      form.setFieldsValue({
        id_supplier: reminder.id_supplier,
        reminder_type: reminder.reminder_type,
        due_date: dayjs(reminder.due_date),
        amount: reminder.amount,
        notes: reminder.notes || undefined,
      });
    } else if (open) {
      // Reset form for new reminder
      form.resetFields();
      form.setFieldsValue({
        reminder_type: 'payment_due',
        due_date: dayjs().add(7, 'day'),
      });
    }
  }, [open, reminder, form]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleClose = useCallback(() => {
    form.resetFields();
    onClose();
  }, [form, onClose]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const reminderData: Omit<PaymentReminderInsert, 'id_shop'> = {
          id_supplier: values.id_supplier,
          reminder_type: values.reminder_type,
          due_date: values.due_date.format('YYYY-MM-DD'),
          amount: values.amount,
          notes: values.notes || null,
          status: 'pending',
        };

        if (isEditing && reminder) {
          const updateData: PaymentReminderUpdate = {
            id_supplier: values.id_supplier,
            reminder_type: values.reminder_type,
            due_date: values.due_date.format('YYYY-MM-DD'),
            amount: values.amount,
            notes: values.notes || null,
          };

          await updateReminder.mutateAsync({
            reminderId: reminder.id_reminder,
            data: updateData,
          });
          message.success(tCommon('messages.operationSuccess'));
        } else {
          await createReminder.mutateAsync(reminderData);
          message.success(tCommon('messages.operationSuccess'));
        }

        handleClose();
        onSuccess?.();
      } catch (error) {
        console.error('Error saving reminder:', error);
        message.error(tCommon('messages.operationFailed'));
      }
    },
    [isEditing, reminder, createReminder, updateReminder, handleClose, onSuccess, tCommon]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Modal
      title={isEditing ? t('editReminder') : t('createReminder')}
      open={open}
      onCancel={handleClose}
      width={520}
      destroyOnClose
      footer={
        <Space className="w-full justify-end">
          <Button onClick={handleClose}>{tCommon('actions.cancel')}</Button>
          <Button type="primary" onClick={() => form.submit()} loading={isLoading}>
            {isEditing ? tCommon('actions.save') : tCommon('actions.create')}
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
        className="reminder-form"
      >
        {/* Supplier Selector */}
        <Form.Item
          name="id_supplier"
          label={t('selectSupplier')}
          rules={[{ required: true, message: tCommon('validation.required') }]}
        >
          <Select
            placeholder={t('selectSupplier')}
            loading={suppliersLoading}
            options={supplierOptions}
            showSearch
            filterOption={(input, option) =>
              ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())
            }
            optionRender={(option) => (
              <div>
                <div className="font-medium">{option.data.label}</div>
                {option.data.description && (
                  <div className="text-xs text-stone-500">{option.data.description}</div>
                )}
              </div>
            )}
            size="large"
          />
        </Form.Item>

        {/* Reminder Type */}
        <Form.Item
          name="reminder_type"
          label={t('reminderType')}
          rules={[{ required: true, message: tCommon('validation.required') }]}
          initialValue="payment_due"
        >
          <Select
            placeholder={tCommon('select.placeholder')}
            options={REMINDER_TYPES.map((type) => ({
              label: t(type.labelKey),
              value: type.value,
            }))}
            size="large"
          />
        </Form.Item>

        <Divider className="my-4" />

        {/* Amount and Due Date Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Amount */}
          <Form.Item
            name="amount"
            label={tCommon('labels.amount')}
            rules={[
              { required: true, message: tCommon('validation.required') },
              { type: 'number', min: 0.01, message: tCommon('validation.minValue', { min: 0.01 }) },
            ]}
          >
            <InputNumber
              placeholder="0.00"
              prefix={<DollarOutlined className="text-stone-400" />}
              min={0}
              precision={2}
              className="w-full"
              size="large"
            />
          </Form.Item>

          {/* Due Date */}
          <Form.Item
            name="due_date"
            label={t('dueDate')}
            rules={[{ required: true, message: tCommon('validation.required') }]}
          >
            <DatePicker
              className="w-full"
              format="YYYY-MM-DD"
              size="large"
              suffixIcon={<CalendarOutlined />}
            />
          </Form.Item>
        </div>

        {/* Notes */}
        <Form.Item
          name="notes"
          label={tCommon('labels.notes')}
          rules={[{ max: 2000, message: tCommon('validation.maxLength', { max: 2000 }) }]}
        >
          <TextArea placeholder={t('notesPlaceholder')} rows={3} showCount maxLength={2000} />
        </Form.Item>

        {/* Info Text for New Reminders */}
        {!isEditing && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Text className="text-amber-700 text-sm">
              <FileTextOutlined className="me-2" />
              {t('reminderCreateInfo')}
            </Text>
          </div>
        )}
      </Form>
    </Modal>
  );
}

export default ReminderForm;
