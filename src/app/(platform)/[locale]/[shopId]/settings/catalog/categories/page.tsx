'use client';

/**
 * Categories Settings Page
 *
 * Manages product categories with CRUD operations.
 * Categories are used to organize inventory items.
 *
 * Features:
 * - List all categories with icons
 * - Add new categories
 * - Edit existing categories
 * - Delete categories (with usage check)
 * - Reorder categories
 * - Icon selector for visual identification
 *
 * @module app/(platform)/[locale]/[shopId]/settings/catalog/categories/page
 */

import React, { useState, useCallback } from 'react';

import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Card, Form, Input, InputNumber, message, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { CatalogFormModal, FormField } from '@/components/domain/settings/CatalogFormModal';
import {
  CatalogTable,
  type CatalogAction,
  type CatalogColumn,
} from '@/components/domain/settings/CatalogTable';
import { CategoryIcon } from '@/components/domain/settings/IconSelector';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/lib/hooks/auth';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type ProductCategory,
} from '@/lib/hooks/data/useCategories';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

interface CategoryFormValues {
  category_name: string;
  description?: string;
  sort_order?: number;
  icon?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Categories Settings Page
 */
export default function CategoriesSettingsPage(): React.JSX.Element {
  const t = useTranslations('common');
  const tInventory = useTranslations('inventory');
  const tSettings = useTranslations('settings');

  const { can } = usePermissions();
  const { user } = useUser();
  const { shopId } = useShop();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  // Form instance
  const [form] = Form.useForm<CategoryFormValues>();

  // Data hooks
  const { data: categories = [], isLoading, refetch } = useCategories();

  // Mutation hooks
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

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
    setModalOpen(true);
  }, [form]);

  // Open modal for editing category
  const handleEdit = useCallback(
    (category: ProductCategory) => {
      setEditingCategory(category);
      form.setFieldsValue({
        category_name: category.category_name,
        description: category.description || '',
        sort_order: category.sort_order || 0,
        // Icon would be stored in description as JSON if needed, simplified here
      });
      setModalOpen(true);
    },
    [form]
  );

  // Delete category
  const handleDelete = useCallback(
    async (category: ProductCategory) => {
      try {
        await deleteMutation.mutateAsync(category.id_category);
        message.success(tSettings('catalog.categoryDeleted'));
        refetch();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('messages.operationFailed');
        message.error(errorMessage);
      }
    },
    [deleteMutation, refetch, t, tSettings]
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
            categoryId: editingCategory.id_category,
            updates: {
              category_name: values.category_name,
              description: values.description || null,
              sort_order: values.sort_order || 0,
            },
          });
          message.success(tSettings('catalog.categoryUpdated'));
        } else {
          // Create new category
          await createMutation.mutateAsync({
            category_name: values.category_name,
            description: values.description || null,
            sort_order: values.sort_order || 0,
            created_by: user.id_user,
          });
          message.success(tSettings('catalog.categoryCreated'));
        }

        handleClose();
        refetch();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('messages.operationFailed');
        message.error(errorMessage);
      }
    },
    [
      user,
      shopId,
      isEdit,
      editingCategory,
      createMutation,
      updateMutation,
      handleClose,
      refetch,
      t,
      tSettings,
    ]
  );

  // ==========================================================================
  // TABLE CONFIGURATION
  // ==========================================================================

  // Table columns
  const columns: CatalogColumn<ProductCategory>[] = [
    {
      key: 'category_name',
      title: t('labels.name'),
      dataIndex: 'category_name',
      width: '40%',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <CategoryIcon iconKey={null} className="text-amber-600" />
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
      key: 'description',
      title: t('labels.description'),
      dataIndex: 'description',
      render: (value: unknown) => (
        <Text type="secondary" className="text-sm" ellipsis>
          {(value as string | null) || '-'}
        </Text>
      ),
    },
    {
      key: 'sort_order',
      title: '#',
      dataIndex: 'sort_order',
      width: 80,
      render: (value: unknown) => <Text type="secondary">{(value as number | null) ?? '-'}</Text>,
    },
  ];

  // Table actions
  const actions: CatalogAction<ProductCategory>[] = [
    {
      key: 'edit',
      label: t('actions.edit'),
      icon: <EditOutlined />,
      onClick: handleEdit,
      permission: 'catalog.manage',
    },
    {
      key: 'delete',
      label: t('actions.delete'),
      icon: <DeleteOutlined />,
      onClick: handleDelete,
      danger: true,
      permission: 'catalog.manage',
      confirm: {
        title: t('messages.confirmDelete'),
        description: tSettings('catalog.deleteCategoryWarning'),
      },
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="categories-settings-page">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Text strong className="text-lg">
            {tInventory('categories.title')}
          </Text>
          <Paragraph type="secondary" className="!mb-0 mt-1">
            {tSettings('catalog.categoriesDescription')}
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          permission="catalog.manage"
        >
          {tInventory('categories.addCategory')}
        </Button>
      </div>

      {/* Categories Table */}
      <Card bodyStyle={{ padding: 0 }}>
        <CatalogTable
          dataSource={categories}
          columns={columns}
          rowKey="id_category"
          actions={actions}
          loading={isLoading}
          showSortOrder={false}
          empty={{
            title: tSettings('catalog.noCategories'),
            description: tSettings('catalog.noCategoriesDescription'),
            icon: <AppstoreOutlined />,
            action: can('catalog.manage')
              ? {
                  label: tInventory('categories.addCategory'),
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
          isEdit ? tInventory('categories.editCategory') : tInventory('categories.addCategory')
        }
        onClose={handleClose}
        onSubmit={handleSubmit}
        isEdit={isEdit}
        loading={isSubmitting}
        form={form}
      >
        <FormField
          name="category_name"
          label={t('labels.name')}
          rules={[
            { required: true, message: t('validation.required') },
            { max: 255, message: t('validation.maxLength', { max: 255 }) },
          ]}
        >
          <Input placeholder={tSettings('catalog.categoryNamePlaceholder')} autoFocus />
        </FormField>

        <FormField
          name="description"
          label={t('labels.description')}
          rules={[{ max: 1000, message: t('validation.maxLength', { max: 1000 }) }]}
        >
          <TextArea
            rows={3}
            placeholder={tSettings('catalog.descriptionPlaceholder')}
            showCount
            maxLength={1000}
          />
        </FormField>

        <FormField
          name="sort_order"
          label={tSettings('catalog.sortOrder')}
          tooltip={tSettings('catalog.sortOrderTooltip')}
        >
          <InputNumber min={0} max={999} placeholder="0" className="w-full" />
        </FormField>
      </CatalogFormModal>
    </div>
  );
}
