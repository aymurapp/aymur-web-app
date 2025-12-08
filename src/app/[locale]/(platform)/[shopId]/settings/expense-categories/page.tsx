'use client';

/**
 * Expense Categories Settings Page
 *
 * Manages expense categories with CRUD operations.
 * Categories are used to organize and track business expenses.
 *
 * Features:
 * - List of expense categories
 * - Create/edit drawer
 * - Parent category selector (for hierarchy)
 * - Link to budget category option
 * - Description field
 * - Active toggle
 *
 * @module app/(platform)/[locale]/[shopId]/settings/expense-categories/page
 */

import React, { useState, useCallback } from 'react';

import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  message,
  Typography,
  Tag,
  Space,
} from 'antd';
import { useTranslations } from 'next-intl';

import { CatalogFormModal, FormField } from '@/components/domain/settings/CatalogFormModal';
import {
  CatalogTable,
  type CatalogAction,
  type CatalogColumn,
} from '@/components/domain/settings/CatalogTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/lib/hooks/auth';
import {
  useExpenseCategories,
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
  useDeleteExpenseCategory,
  type ExpenseCategory,
} from '@/lib/hooks/data/useExpenses';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

interface CategoryFormValues {
  category_name: string;
  category_type: string;
  description?: string;
  is_taxable: boolean;
  sort_order?: number;
  is_active: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CATEGORY_TYPES = [
  { value: 'operational', labelKey: 'categories.supplies' },
  { value: 'rent', labelKey: 'categories.rent' },
  { value: 'utilities', labelKey: 'categories.utilities' },
  { value: 'salaries', labelKey: 'categories.salaries' },
  { value: 'marketing', labelKey: 'categories.marketing' },
  { value: 'insurance', labelKey: 'categories.insurance' },
  { value: 'maintenance', labelKey: 'categories.maintenance' },
  { value: 'transport', labelKey: 'categories.transport' },
  { value: 'communication', labelKey: 'categories.communication' },
  { value: 'professional', labelKey: 'categories.professional' },
  { value: 'taxes', labelKey: 'categories.taxes' },
  { value: 'other', labelKey: 'categories.other' },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Expense Categories Settings Page
 */
export default function ExpenseCategoriesSettingsPage(): React.JSX.Element {
  const t = useTranslations('common');
  const tExpenses = useTranslations('expenses');

  const { can } = usePermissions();
  const { user } = useUser();
  const { shopId } = useShop();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);

  // Form instance
  const [form] = Form.useForm<CategoryFormValues>();

  // Data hooks
  const { data: categories = [], isLoading, refetch } = useExpenseCategories();

  // Mutation hooks
  const createMutation = useCreateExpenseCategory();
  const updateMutation = useUpdateExpenseCategory();
  const deleteMutation = useDeleteExpenseCategory();

  // Derived state
  const isEdit = !!editingCategory;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  // Open modal for adding new category
  const handleAdd = useCallback(() => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({
      is_active: true,
      is_taxable: false,
      category_type: 'operational',
    });
    setModalOpen(true);
  }, [form]);

  // Open modal for editing category
  const handleEdit = useCallback(
    (category: ExpenseCategory) => {
      setEditingCategory(category);
      form.setFieldsValue({
        category_name: category.category_name,
        category_type: category.category_type,
        description: category.description || '',
        is_taxable: category.is_taxable ?? false,
        sort_order: category.sort_order || 0,
        is_active: category.is_active ?? true,
      });
      setModalOpen(true);
    },
    [form]
  );

  // Delete category
  const handleDelete = useCallback(
    async (category: ExpenseCategory) => {
      try {
        await deleteMutation.mutateAsync(category.id_expense_category);
        message.success(t('messages.operationSuccess'));
        refetch();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('messages.operationFailed');
        message.error(errorMessage);
      }
    },
    [deleteMutation, refetch, t]
  );

  // Close modal
  const handleClose = useCallback(() => {
    setModalOpen(false);
    setEditingCategory(null);
    form.resetFields();
  }, [form]);

  // Submit form
  const handleSubmit = useCallback(
    async (values: CategoryFormValues) => {
      if (!user?.id_user || !shopId) {
        message.error(t('messages.unexpectedError'));
        return;
      }

      try {
        if (isEdit && editingCategory) {
          // Update existing category
          await updateMutation.mutateAsync({
            categoryId: editingCategory.id_expense_category,
            data: {
              category_name: values.category_name,
              category_type: values.category_type,
              description: values.description || null,
              is_taxable: values.is_taxable,
              sort_order: values.sort_order || 0,
              is_active: values.is_active,
            },
          });
          message.success(t('messages.operationSuccess'));
        } else {
          // Create new category
          await createMutation.mutateAsync({
            category_name: values.category_name,
            category_type: values.category_type,
            description: values.description || null,
            is_taxable: values.is_taxable,
            sort_order: values.sort_order || 0,
            is_active: values.is_active,
          });
          message.success(t('messages.operationSuccess'));
        }

        handleClose();
        refetch();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('messages.operationFailed');
        message.error(errorMessage);
      }
    },
    [user, shopId, isEdit, editingCategory, createMutation, updateMutation, handleClose, refetch, t]
  );

  // ==========================================================================
  // TABLE CONFIGURATION
  // ==========================================================================

  // Table columns
  const columns: CatalogColumn<ExpenseCategory>[] = [
    {
      key: 'category_name',
      title: t('labels.name'),
      dataIndex: 'category_name',
      width: '35%',
      render: (_: unknown, record: ExpenseCategory) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <DollarOutlined className="text-amber-600" />
          </div>
          <div>
            <Text strong>{record.category_name}</Text>
            {record.description && (
              <Paragraph type="secondary" className="!mb-0 text-xs" ellipsis={{ rows: 1 }}>
                {record.description}
              </Paragraph>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'category_type',
      title: t('labels.type'),
      dataIndex: 'category_type',
      width: '20%',
      render: (value: unknown) => (
        <Tag className="border-amber-200 bg-amber-50 text-amber-700">
          {tExpenses(`categories.${value as string}`) || (value as string)}
        </Tag>
      ),
    },
    {
      key: 'is_taxable',
      title: tExpenses('categories.taxes'),
      dataIndex: 'is_taxable',
      width: '15%',
      render: (value: unknown) => {
        const boolValue = value as boolean | null;
        return (
          <Tag color={boolValue ? 'blue' : 'default'}>
            {boolValue ? t('labels.yes') : t('labels.no')}
          </Tag>
        );
      },
    },
    {
      key: 'is_active',
      title: t('labels.status'),
      dataIndex: 'is_active',
      width: '15%',
      render: (value: unknown) => {
        const boolValue = value as boolean | null;
        return (
          <Space size="small">
            {boolValue ? (
              <>
                <CheckCircleOutlined className="text-emerald-500" />
                <Text className="text-emerald-600">{t('status.active')}</Text>
              </>
            ) : (
              <>
                <CloseCircleOutlined className="text-stone-400" />
                <Text type="secondary">{t('status.inactive')}</Text>
              </>
            )}
          </Space>
        );
      },
    },
    {
      key: 'sort_order',
      title: '#',
      dataIndex: 'sort_order',
      width: 60,
      render: (value: unknown) => <Text type="secondary">{(value as number | null) ?? '-'}</Text>,
    },
  ];

  // Table actions
  const actions: CatalogAction<ExpenseCategory>[] = [
    {
      key: 'edit',
      label: t('actions.edit'),
      icon: <EditOutlined />,
      onClick: handleEdit,
      permission: 'settings.manage',
    },
    {
      key: 'delete',
      label: t('actions.delete'),
      icon: <DeleteOutlined />,
      onClick: handleDelete,
      danger: true,
      permission: 'settings.manage',
      confirm: {
        title: t('messages.confirmDelete'),
        description: 'Categories with associated expenses cannot be deleted.',
      },
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="expense-categories-settings-page">
      {/* Page Header */}
      <PageHeader
        title={tExpenses('title')}
        subtitle={`${tExpenses('category')} ${t('labels.category').toLowerCase()}`}
        showBack
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          permission="settings.manage"
        >
          {t('actions.add')} {tExpenses('category')}
        </Button>
      </PageHeader>

      {/* Info Section */}
      <div className="mb-6">
        <Paragraph type="secondary" className="!mb-0">
          Organize your business expenses into categories for better tracking and reporting.
          Categories can be linked to budget items for spending control.
        </Paragraph>
      </div>

      {/* Categories Table */}
      <Card styles={{ body: { padding: 0 } }}>
        <CatalogTable
          dataSource={categories}
          columns={columns}
          rowKey="id_expense_category"
          actions={actions}
          loading={isLoading}
          showSortOrder={false}
          permission="settings.manage"
          empty={{
            title: `${t('messages.noData')}`,
            description: `${t('actions.add')} expense categories to organize your business expenses.`,
            icon: <DollarOutlined />,
            action: can('settings.manage')
              ? {
                  label: `${t('actions.add')} ${tExpenses('category')}`,
                  onClick: handleAdd,
                }
              : undefined,
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <CatalogFormModal
        open={modalOpen}
        title={
          isEdit
            ? `${t('actions.edit')} ${tExpenses('category')}`
            : `${t('actions.add')} ${tExpenses('category')}`
        }
        onClose={handleClose}
        onSubmit={handleSubmit}
        isEdit={isEdit}
        loading={isSubmitting}
        form={form}
      >
        {/* Category Name */}
        <FormField
          name="category_name"
          label={t('labels.name')}
          rules={[
            { required: true, message: t('validation.required') },
            { max: 100, message: t('validation.maxLength', { max: 100 }) },
          ]}
        >
          <Input
            placeholder={`e.g., ${tExpenses('categories.rent')}, ${tExpenses('categories.utilities')}`}
            autoFocus
          />
        </FormField>

        {/* Category Type */}
        <FormField
          name="category_type"
          label={t('labels.type')}
          rules={[{ required: true, message: t('validation.required') }]}
        >
          <Select
            placeholder={t('select.placeholder')}
            options={CATEGORY_TYPES.map((type) => ({
              label: tExpenses(type.labelKey),
              value: type.value,
            }))}
          />
        </FormField>

        {/* Description */}
        <FormField
          name="description"
          label={t('labels.description')}
          rules={[{ max: 500, message: t('validation.maxLength', { max: 500 }) }]}
        >
          <TextArea rows={3} placeholder={t('labels.description')} showCount maxLength={500} />
        </FormField>

        {/* Row: Taxable and Sort Order */}
        <div className="grid grid-cols-2 gap-4">
          {/* Is Taxable */}
          <FormField
            name="is_taxable"
            label={`${tExpenses('categories.taxes')}?`}
            valuePropName="checked"
          >
            <Switch />
          </FormField>

          {/* Sort Order */}
          <FormField name="sort_order" label="#" tooltip="Lower numbers appear first in lists">
            <InputNumber min={0} max={999} placeholder="0" className="w-full" />
          </FormField>
        </div>

        {/* Is Active */}
        <FormField name="is_active" label={t('labels.status')} valuePropName="checked">
          <Switch checkedChildren={t('status.active')} unCheckedChildren={t('status.inactive')} />
        </FormField>
      </CatalogFormModal>
    </div>
  );
}
