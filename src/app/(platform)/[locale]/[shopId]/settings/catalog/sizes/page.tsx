'use client';

/**
 * Product Sizes Settings Page
 *
 * Manages product sizes grouped by category (e.g., ring sizes, bracelet lengths).
 * Sizes can use different measurement systems (US, UK, EU, metric).
 *
 * Features:
 * - List all sizes grouped by category
 * - Filter by category
 * - Add new sizes with category association
 * - Edit existing sizes
 * - Delete sizes (with usage check)
 * - Size system indicator (US, UK, EU, etc.)
 *
 * @module app/(platform)/[locale]/[shopId]/settings/catalog/sizes/page
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ColumnWidthOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { Card, Form, Input, InputNumber, Select, message, Typography, Tag, Space } from 'antd';
import { useTranslations } from 'next-intl';

import {
  CatalogFormModal,
  FormField,
  FormRow,
} from '@/components/domain/settings/CatalogFormModal';
import {
  CatalogTable,
  type CatalogAction,
  type CatalogColumn,
} from '@/components/domain/settings/CatalogTable';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/lib/hooks/auth';
import { useCategories } from '@/lib/hooks/data/useCategories';
import {
  useSizes,
  useCreateSize,
  useUpdateSize,
  useDeleteSize,
  type ProductSizeWithCategory,
  type SizeSystem,
} from '@/lib/hooks/data/useSizes';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';

const { Text, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface SizeFormValues {
  id_category: string;
  size_name: string;
  size_value?: string;
  size_system?: SizeSystem;
  sort_order?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SIZE_SYSTEMS: { value: SizeSystem; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'US', label: 'US' },
  { value: 'UK', label: 'UK' },
  { value: 'EU', label: 'EU' },
  { value: 'metric', label: 'Metric (mm)' },
  { value: 'inches', label: 'Inches' },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Product Sizes Settings Page
 */
export default function ProductSizesSettingsPage(): React.JSX.Element {
  const t = useTranslations('common');
  const tInventory = useTranslations('inventory');
  const tSettings = useTranslations('settings');

  const { can } = usePermissions();
  const { user } = useUser();
  const { shopId } = useShop();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<ProductSizeWithCategory | null>(null);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Form instance
  const [form] = Form.useForm<SizeFormValues>();

  // Data hooks
  const {
    data: sizes = [],
    isLoading: loadingSizes,
    refetch,
  } = useSizes({
    categoryId: selectedCategory,
    includeCategory: true,
  });
  const { data: categories = [], isLoading: loadingCategories } = useCategories();

  // Mutation hooks
  const createMutation = useCreateSize();
  const updateMutation = useUpdateSize();
  const deleteMutation = useDeleteSize();

  // Derived state
  const isEdit = !!editingSize;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isLoading = loadingSizes || loadingCategories;

  // Category options for select
  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        value: cat.id_category,
        label: cat.category_name,
      })),
    [categories]
  );

  // Size system options for select
  const sizeSystemOptions = useMemo(
    () =>
      SIZE_SYSTEMS.map((sys) => ({
        value: sys.value,
        label: sys.label,
      })),
    []
  );

  // Get category name by ID
  const getCategoryName = useCallback(
    (categoryId: string) => {
      const category = categories.find((c) => c.id_category === categoryId);
      return category?.category_name || '-';
    },
    [categories]
  );

  // Get size system color
  const getSizeSystemColor = useCallback((system: string | null): string => {
    if (!system) {
      return 'default';
    }
    const colorMap: Record<string, string> = {
      US: 'blue',
      UK: 'red',
      EU: 'green',
      metric: 'purple',
      inches: 'orange',
      general: 'default',
    };
    return colorMap[system] || 'default';
  }, []);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  // Open modal for adding new size
  const handleAdd = useCallback(() => {
    setEditingSize(null);
    form.resetFields();
    // Pre-select category if filtering
    if (selectedCategory) {
      form.setFieldValue('id_category', selectedCategory);
    }
    setModalOpen(true);
  }, [form, selectedCategory]);

  // Open modal for editing size
  const handleEdit = useCallback(
    (size: ProductSizeWithCategory) => {
      setEditingSize(size);
      form.setFieldsValue({
        id_category: size.id_category,
        size_name: size.size_name,
        size_value: size.size_value || undefined,
        size_system: (size.size_system as SizeSystem) || 'general',
        sort_order: size.sort_order || 0,
      });
      setModalOpen(true);
    },
    [form]
  );

  // Delete size
  const handleDelete = useCallback(
    async (size: ProductSizeWithCategory) => {
      try {
        await deleteMutation.mutateAsync(size.id_size);
        message.success(tSettings('catalog.sizeDeleted'));
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
    setEditingSize(null);
    form.resetFields();
  }, [form]);

  // Submit form
  const handleSubmit = useCallback(
    async (values: SizeFormValues) => {
      if (!user?.id_user || !shopId) {
        message.error(t('messages.unexpectedError'));
        return;
      }

      try {
        if (isEdit && editingSize) {
          // Update existing size
          await updateMutation.mutateAsync({
            sizeId: editingSize.id_size,
            updates: {
              id_category: values.id_category,
              size_name: values.size_name,
              size_value: values.size_value || null,
              size_system: values.size_system || 'general',
              sort_order: values.sort_order || 0,
            },
          });
          message.success(tSettings('catalog.sizeUpdated'));
        } else {
          // Create new size
          await createMutation.mutateAsync({
            id_category: values.id_category,
            size_name: values.size_name,
            size_value: values.size_value || null,
            size_system: values.size_system || 'general',
            sort_order: values.sort_order || 0,
            created_by: user.id_user,
          });
          message.success(tSettings('catalog.sizeCreated'));
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
      editingSize,
      createMutation,
      updateMutation,
      handleClose,
      refetch,
      t,
      tSettings,
    ]
  );

  // Handle category filter change
  const handleFilterChange = useCallback((value: string | null) => {
    setSelectedCategory(value || null);
  }, []);

  // ==========================================================================
  // TABLE CONFIGURATION
  // ==========================================================================

  // Table columns
  const columns: CatalogColumn<ProductSizeWithCategory>[] = [
    {
      key: 'size_name',
      title: t('labels.name'),
      dataIndex: 'size_name',
      width: '25%',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <ColumnWidthOutlined className="text-blue-600" />
          </div>
          <div>
            <Text strong>{record.size_name}</Text>
            {record.size_value && (
              <Paragraph type="secondary" className="!mb-0 text-xs font-mono">
                {record.size_value}
              </Paragraph>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      title: tInventory('categories.title'),
      dataIndex: 'id_category',
      width: '20%',
      render: (_, record) => {
        const categoryName = record.category?.category_name || getCategoryName(record.id_category);
        return <Tag color="blue">{categoryName}</Tag>;
      },
    },
    {
      key: 'size_system',
      title: tSettings('catalog.sizeSystem'),
      dataIndex: 'size_system',
      width: '15%',
      render: (value: unknown) => (
        <Tag color={getSizeSystemColor(value as string | null)}>
          {(value as string | null) || 'General'}
        </Tag>
      ),
    },
    {
      key: 'size_value',
      title: tSettings('catalog.sizeValue'),
      dataIndex: 'size_value',
      width: '15%',
      render: (value: unknown) => (
        <Text className="font-mono">{(value as string | null) || '-'}</Text>
      ),
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
  const actions: CatalogAction<ProductSizeWithCategory>[] = [
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
        description: tSettings('catalog.deleteSizeWarning'),
      },
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="product-sizes-settings-page">
      {/* Header with Filter and Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <Text strong className="text-lg">
            {tSettings('catalog.sizes')}
          </Text>
          <Paragraph type="secondary" className="!mb-0 mt-1">
            {tSettings('catalog.sizesDescription')}
          </Paragraph>
        </div>
        <Space>
          {/* Category Filter */}
          <Select
            placeholder={tSettings('catalog.filterByCategory')}
            value={selectedCategory}
            onChange={handleFilterChange}
            options={[{ value: '', label: tSettings('catalog.allCategories') }, ...categoryOptions]}
            allowClear
            className="w-44"
            loading={loadingCategories}
            suffixIcon={<FilterOutlined />}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            permission="catalog.manage"
          >
            {tSettings('catalog.addSize')}
          </Button>
        </Space>
      </div>

      {/* Sizes Table */}
      <Card bodyStyle={{ padding: 0 }}>
        <CatalogTable
          dataSource={sizes as ProductSizeWithCategory[]}
          columns={columns}
          rowKey="id_size"
          actions={actions}
          loading={isLoading}
          showSortOrder={false}
          empty={{
            title: tSettings('catalog.noSizes'),
            description: selectedCategory
              ? tSettings('catalog.noSizesForCategory')
              : tSettings('catalog.noSizesDescription'),
            icon: <ColumnWidthOutlined />,
            action: can('catalog.manage')
              ? {
                  label: tSettings('catalog.addSize'),
                  onClick: handleAdd,
                }
              : undefined,
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <CatalogFormModal
        open={modalOpen}
        title={isEdit ? tSettings('catalog.editSize') : tSettings('catalog.addSize')}
        onClose={handleClose}
        onSubmit={handleSubmit}
        isEdit={isEdit}
        loading={isSubmitting}
        form={form}
      >
        <FormField
          name="id_category"
          label={tInventory('categories.title')}
          rules={[{ required: true, message: t('validation.required') }]}
        >
          <Select
            placeholder={tSettings('catalog.selectCategory')}
            options={categoryOptions}
            loading={loadingCategories}
          />
        </FormField>

        <FormRow>
          <FormField
            name="size_name"
            label={t('labels.name')}
            rules={[
              { required: true, message: t('validation.required') },
              { max: 255, message: t('validation.maxLength', { max: 255 }) },
            ]}
          >
            <Input placeholder={tSettings('catalog.sizeNamePlaceholder')} autoFocus />
          </FormField>

          <FormField name="size_system" label={tSettings('catalog.sizeSystem')}>
            <Select
              placeholder={tSettings('catalog.selectSizeSystem')}
              options={sizeSystemOptions}
              defaultValue="general"
            />
          </FormField>
        </FormRow>

        <FormRow>
          <FormField
            name="size_value"
            label={tSettings('catalog.sizeValue')}
            tooltip={tSettings('catalog.sizeValueTooltip')}
            rules={[{ max: 100, message: t('validation.maxLength', { max: 100 }) }]}
          >
            <Input placeholder={tSettings('catalog.sizeValuePlaceholder')} />
          </FormField>

          <FormField
            name="sort_order"
            label={tSettings('catalog.sortOrder')}
            tooltip={tSettings('catalog.sortOrderTooltip')}
          >
            <InputNumber min={0} max={999} placeholder="0" className="w-full" />
          </FormField>
        </FormRow>
      </CatalogFormModal>
    </div>
  );
}
