'use client';

/**
 * Supplier Categories Settings Page
 *
 * Manage supplier categories with CRUD operations.
 *
 * Features:
 * - List of supplier categories
 * - Create/edit in drawer
 * - Delete with confirmation
 * - Show count of suppliers per category
 * - Simple name + description fields
 *
 * @module app/(platform)/[locale]/[shopId]/settings/supplier-categories/page
 */

import React, { useState, useCallback, useMemo, useTransition } from 'react';

import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TagOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Drawer, Input, message, Popconfirm, Typography, Space, Empty, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';
import { z } from 'zod';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Form } from '@/components/ui/Form';
import { Table, type ColumnsType } from '@/components/ui/Table';
import { useUser } from '@/lib/hooks/auth';
import {
  useSupplierCategories,
  useCreateSupplierCategory,
  useUpdateSupplierCategory,
  useDeleteSupplierCategory,
  type SupplierCategory,
} from '@/lib/hooks/data/useSuppliers';
import { usePermissions } from '@/lib/hooks/permissions';

const { Text } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

/**
 * Category form schema
 */
const categoryFormSchema = z.object({
  category_name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be 100 characters or less'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Supplier Categories Settings Page Component
 */
export default function SupplierCategoriesPage(): React.JSX.Element {
  const t = useTranslations('suppliers');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();
  const { user } = useUser();
  const [, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SupplierCategory | null>(null);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { data: categories, isLoading } = useSupplierCategories();

  // Mutations
  const createCategory = useCreateSupplierCategory();
  const updateCategory = useUpdateSupplierCategory();
  const deleteCategory = useDeleteSupplierCategory();

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleAdd = useCallback(() => {
    setSelectedCategory(null);
    setIsDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((category: SupplierCategory) => {
    setSelectedCategory(category);
    setIsDrawerOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (categoryId: string) => {
      try {
        await deleteCategory.mutateAsync(categoryId);
        message.success(t('categories.deleteSuccess'));
      } catch (error) {
        console.error('[SupplierCategories] Delete error:', error);
        message.error(t('categories.deleteError'));
      }
    },
    [deleteCategory, t]
  );

  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedCategory(null);
  }, []);

  const handleSubmit = useCallback(
    async (data: CategoryFormValues) => {
      startTransition(async () => {
        setIsSubmitting(true);
        try {
          if (selectedCategory) {
            // Update existing category
            await updateCategory.mutateAsync({
              categoryId: selectedCategory.id_supplier_category,
              data: {
                category_name: data.category_name,
                description: data.description || null,
              },
            });
            message.success(t('categories.updateSuccess'));
          } else {
            // Create new category
            if (!user?.id_user) {
              throw new Error('User not authenticated');
            }
            await createCategory.mutateAsync({
              category_name: data.category_name,
              description: data.description || null,
              created_by: user.id_user,
            });
            message.success(t('categories.createSuccess'));
          }
          handleDrawerClose();
        } catch (error) {
          console.error('[SupplierCategories] Submit error:', error);
          message.error(
            selectedCategory ? t('categories.updateError') : t('categories.createError')
          );
        } finally {
          setIsSubmitting(false);
        }
      });
    },
    [selectedCategory, createCategory, updateCategory, handleDrawerClose, t]
  );

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================

  const columns: ColumnsType<SupplierCategory> = useMemo(
    () => [
      {
        title: t('categories.name'),
        dataIndex: 'category_name',
        key: 'name',
        render: (name: string) => (
          <Space>
            <TagOutlined className="text-amber-500" />
            <Text strong>{name}</Text>
          </Space>
        ),
      },
      {
        title: tCommon('labels.description'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (description: string | null) =>
          description ? (
            <Text type="secondary" className="text-sm">
              {description}
            </Text>
          ) : (
            <Text type="secondary" className="text-sm italic">
              {tCommon('messages.noData')}
            </Text>
          ),
      },
      {
        title: t('categories.supplierCount'),
        dataIndex: 'supplier_count',
        key: 'count',
        width: 140,
        align: 'center',
        render: (count: number | undefined) => <Text className="text-stone-600">{count ?? 0}</Text>,
      },
      {
        title: tCommon('labels.actions'),
        key: 'actions',
        width: 120,
        align: 'end',
        render: (_: unknown, record: SupplierCategory) => (
          <Space size="small">
            {can('suppliers.manage') && (
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                aria-label={tCommon('actions.edit')}
              />
            )}
            {can('suppliers.delete') && (
              <Popconfirm
                title={t('categories.deleteConfirmTitle')}
                description={t('categories.deleteConfirmDescription')}
                onConfirm={() => handleDelete(record.id_supplier_category)}
                okText={tCommon('actions.delete')}
                cancelText={tCommon('actions.cancel')}
                okButtonProps={{ danger: true, loading: deleteCategory.isPending }}
                icon={<ExclamationCircleOutlined className="text-red-500" />}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={tCommon('actions.delete')}
                  loading={deleteCategory.isPending}
                />
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ],
    [t, tCommon, can, handleEdit, handleDelete]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="supplier-categories-page">
      {/* Page Header */}
      <PageHeader title={t('categories.title')} subtitle={t('categories.subtitle')} showBack>
        {can('suppliers.manage') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('categories.addCategory')}
          </Button>
        )}
      </PageHeader>

      {/* Content */}
      <Card className="border-stone-200">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton.Input active size="small" className="!w-48" />
                <Skeleton.Input active size="small" className="!w-64 flex-1" />
                <Skeleton.Input active size="small" className="!w-16" />
                <Skeleton.Button active size="small" className="!w-20" />
              </div>
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <Table
            dataSource={categories}
            columns={columns}
            rowKey="id_supplier_category"
            pagination={false}
            className="supplier-categories-table"
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="text-center">
                <Text type="secondary" className="block mb-2">
                  {t('categories.emptyTitle')}
                </Text>
                <Text type="secondary" className="text-sm">
                  {t('categories.emptyDescription')}
                </Text>
              </div>
            }
          >
            {can('suppliers.manage') && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                {t('categories.addCategory')}
              </Button>
            )}
          </Empty>
        )}
      </Card>

      {/* Add/Edit Drawer */}
      <Drawer
        title={selectedCategory ? t('categories.editCategory') : t('categories.addCategory')}
        placement="right"
        width={420}
        open={isDrawerOpen}
        onClose={handleDrawerClose}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={handleDrawerClose} disabled={isSubmitting}>
              {tCommon('actions.cancel')}
            </Button>
          </Space>
        }
      >
        <Form<CategoryFormValues>
          schema={categoryFormSchema}
          onSubmit={handleSubmit}
          defaultValues={{
            category_name: selectedCategory?.category_name || '',
            description: selectedCategory?.description || '',
          }}
          className="space-y-6"
        >
          {/* Category Name */}
          <Form.Item<CategoryFormValues> name="category_name" label={t('categories.name')} required>
            <Input
              size="large"
              placeholder={t('categories.namePlaceholder')}
              maxLength={100}
              prefix={<TagOutlined className="text-stone-400" />}
            />
          </Form.Item>

          {/* Description */}
          <Form.Item<CategoryFormValues> name="description" label={tCommon('labels.description')}>
            <TextArea
              rows={4}
              placeholder={t('categories.descriptionPlaceholder')}
              maxLength={500}
              showCount
            />
          </Form.Item>

          {/* Submit Button */}
          <div className="pt-4 border-t border-stone-200">
            <Form.Submit>
              <Button type="primary" size="large" loading={isSubmitting} className="w-full">
                {isSubmitting
                  ? tCommon('messages.saving')
                  : selectedCategory
                    ? tCommon('actions.update')
                    : tCommon('actions.create')}
              </Button>
            </Form.Submit>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}
