'use client';

/**
 * ExpenseForm Component
 *
 * Modal drawer form for creating and editing expenses.
 * Supports all expense fields including receipt upload.
 *
 * Features:
 * - Category selector (hierarchical if parent categories exist)
 * - Amount input with currency
 * - Description field
 * - Expense date picker
 * - Vendor name input
 * - Receipt upload (image/PDF)
 * - Payment method selector
 * - Notes field
 * - Submit for approval
 *
 * @module components/domain/expenses/ExpenseForm
 */

import React, { useCallback, useEffect, useState } from 'react';

import {
  UploadOutlined,
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  Drawer,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Upload,
  Button as AntButton,
  Space,
  message,
  Divider,
  Typography,
  Image,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  useExpenseCategories,
  useCreateExpense,
  useUpdateExpense,
  type ExpenseWithCategory,
} from '@/lib/hooks/data/useExpenses';
import { useRole } from '@/lib/hooks/permissions';

import type { UploadFile, UploadProps } from 'antd';

const { TextArea } = Input;
const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface ExpenseFormProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when drawer is closed */
  onClose: () => void;
  /** Callback on successful save */
  onSuccess?: () => void;
  /** Expense data for editing (null for create) */
  expense?: ExpenseWithCategory | null;
}

interface FormValues {
  description: string;
  id_expense_category: string;
  amount: number;
  expense_date: dayjs.Dayjs;
  vendor_name?: string;
  notes?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ExpenseForm Component
 *
 * Drawer form for creating and editing expenses with validation
 * and receipt upload support.
 */
export function ExpenseForm({
  open,
  onClose,
  onSuccess,
  expense,
}: ExpenseFormProps): React.JSX.Element {
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');
  const { isOwner } = useRole();

  const [form] = Form.useForm<FormValues>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  // Data fetching
  const { data: categories = [], isLoading: categoriesLoading } = useExpenseCategories();

  // Mutations
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const isEditing = !!expense;
  const isLoading = createExpense.isPending || updateExpense.isPending;

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Populate form when editing
  useEffect(() => {
    if (open && expense) {
      form.setFieldsValue({
        description: expense.description,
        id_expense_category: expense.id_expense_category,
        amount: expense.amount,
        expense_date: dayjs(expense.expense_date),
        vendor_name: expense.vendor_name || undefined,
        notes: expense.notes || undefined,
      });
      setFileList([]);
    } else if (open) {
      // Reset form for new expense
      form.resetFields();
      form.setFieldsValue({
        expense_date: dayjs(),
      });
      setFileList([]);
    }
  }, [open, expense, form]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleClose = useCallback(() => {
    form.resetFields();
    setFileList([]);
    onClose();
  }, [form, onClose]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const expenseData = {
          description: values.description,
          id_expense_category: values.id_expense_category,
          amount: values.amount,
          expense_date: values.expense_date.format('YYYY-MM-DD'),
          vendor_name: values.vendor_name || null,
          notes: values.notes || null,
        };

        if (isEditing && expense) {
          await updateExpense.mutateAsync({
            expenseId: expense.id_expense,
            data: expenseData,
          });
          message.success(tCommon('messages.operationSuccess'));
        } else {
          await createExpense.mutateAsync(expenseData);
          message.success(tCommon('messages.operationSuccess'));
        }

        handleClose();
        onSuccess?.();
      } catch (error) {
        console.error('Error saving expense:', error);
        message.error(tCommon('messages.operationFailed'));
      }
    },
    [isEditing, expense, createExpense, updateExpense, handleClose, onSuccess, tCommon]
  );

  const handleUploadChange: UploadProps['onChange'] = useCallback(
    ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
      setFileList(newFileList);
    },
    []
  );

  const handlePreview = useCallback(async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as File);
    }
    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFileList([]);
  }, []);

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  // Build category options (flat or hierarchical)
  const categoryOptions = categories.map((cat) => ({
    label: cat.category_name,
    value: cat.id_expense_category,
  }));

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <>
      <Drawer
        title={isEditing ? t('editExpense') : t('addExpense')}
        placement="right"
        width={480}
        onClose={handleClose}
        open={open}
        destroyOnClose
        extra={
          <Space>
            <AntButton onClick={handleClose}>{tCommon('actions.cancel')}</AntButton>
            <Button type="primary" onClick={() => form.submit()} loading={isLoading}>
              {isEditing ? tCommon('actions.save') : tCommon('actions.submit')}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
          className="expense-form"
        >
          {/* Description */}
          <Form.Item
            name="description"
            label={t('description')}
            rules={[
              { required: true, message: tCommon('validation.required') },
              { max: 500, message: tCommon('validation.maxLength', { max: 500 }) },
            ]}
          >
            <Input
              placeholder={t('description')}
              prefix={<FileTextOutlined className="text-stone-400" />}
              size="large"
            />
          </Form.Item>

          {/* Category */}
          <Form.Item
            name="id_expense_category"
            label={t('category')}
            rules={[{ required: true, message: tCommon('validation.required') }]}
          >
            <Select
              placeholder={tCommon('select.placeholder')}
              loading={categoriesLoading}
              options={categoryOptions}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              size="large"
            />
          </Form.Item>

          {/* Amount and Date Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <Form.Item
              name="amount"
              label={t('amount')}
              rules={[
                { required: true, message: tCommon('validation.required') },
                {
                  type: 'number',
                  min: 0.01,
                  message: tCommon('validation.minValue', { min: 0.01 }),
                },
              ]}
            >
              <InputNumber<number>
                placeholder="0.00"
                prefix={<DollarOutlined className="text-stone-400" />}
                min={0}
                precision={2}
                className="w-full"
                size="large"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => {
                  const cleaned = value?.replace(/\$\s?|(,*)/g, '') || '0';
                  return parseFloat(cleaned) as unknown as number;
                }}
              />
            </Form.Item>

            {/* Date */}
            <Form.Item
              name="expense_date"
              label={t('date')}
              rules={[{ required: true, message: tCommon('validation.required') }]}
            >
              <DatePicker
                className="w-full"
                format="YYYY-MM-DD"
                size="large"
                suffixIcon={<CalendarOutlined />}
                disabledDate={(current) => current && current > dayjs().endOf('day')}
              />
            </Form.Item>
          </div>

          {/* Vendor */}
          <Form.Item
            name="vendor_name"
            label={t('vendor')}
            rules={[{ max: 200, message: tCommon('validation.maxLength', { max: 200 }) }]}
          >
            <Input placeholder={t('vendor')} size="large" />
          </Form.Item>

          <Divider className="my-4" />

          {/* Receipt Upload */}
          <Form.Item label={t('receipt')}>
            <Upload
              listType="picture-card"
              fileList={fileList}
              onPreview={handlePreview}
              onChange={handleUploadChange}
              maxCount={1}
              accept="image/*,.pdf"
              beforeUpload={() => false} // Prevent auto-upload for now
              className="expense-receipt-upload"
            >
              {fileList.length === 0 && (
                <div className="flex flex-col items-center justify-center p-2">
                  <UploadOutlined className="text-2xl text-stone-400 mb-1" />
                  <Text className="text-xs text-stone-500">{t('attachReceipt')}</Text>
                </div>
              )}
            </Upload>

            {fileList.length > 0 && (
              <AntButton
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={handleRemoveFile}
                className="mt-2 px-0"
              >
                {tCommon('actions.remove')}
              </AntButton>
            )}

            <Text type="secondary" className="block mt-2 text-xs">
              {t('attachReceipt')} (JPG, PNG, PDF)
            </Text>
          </Form.Item>

          {/* Notes */}
          <Form.Item
            name="notes"
            label={tCommon('labels.notes')}
            rules={[{ max: 1000, message: tCommon('validation.maxLength', { max: 1000 }) }]}
          >
            <TextArea placeholder={tCommon('labels.notes')} rows={3} showCount maxLength={1000} />
          </Form.Item>

          {/* Info Text - Only show pending approval message for non-owner roles */}
          {/* Owners are the approvers, so showing "pending approval" to them is illogical */}
          {!isEditing && !isOwner && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Text className="text-amber-700 text-sm">{t('status.pending')}</Text>
            </div>
          )}
        </Form>
      </Drawer>

      {/* Image Preview */}
      <Image
        style={{ display: 'none' }}
        preview={{
          visible: previewOpen,
          onVisibleChange: (visible) => setPreviewOpen(visible),
          src: previewImage,
        }}
      />
    </>
  );
}

export default ExpenseForm;
