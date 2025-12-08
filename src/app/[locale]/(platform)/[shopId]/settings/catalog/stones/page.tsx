'use client';

/**
 * Stone Types Settings Page
 *
 * Manages stone types (Diamond, Ruby, Sapphire, etc.) with CRUD operations.
 * Includes category classification (precious, semi-precious, organic).
 *
 * Features:
 * - List all stone types with color indicators
 * - Filter by stone category
 * - Add new stone types
 * - Edit existing stone types
 * - Delete stone types (with usage check)
 * - Mohs hardness scale display
 *
 * @module app/(platform)/[locale]/[shopId]/settings/catalog/stones/page
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { Card, Form, Input, InputNumber, Select, message, Typography, Space, Progress } from 'antd';
import { useTranslations } from 'next-intl';

import {
  CatalogFormModal,
  FormField,
  FormRow,
} from '@/components/domain/settings/CatalogFormModal';
import {
  CatalogTable,
  CategoryBadge,
  type CatalogAction,
  type CatalogColumn,
} from '@/components/domain/settings/CatalogTable';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/lib/hooks/auth';
import {
  useStoneTypes,
  useCreateStoneType,
  useUpdateStoneType,
  useDeleteStoneType,
  type StoneType,
  type StoneCategory,
} from '@/lib/hooks/data/useStones';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

interface StoneFormValues {
  stone_name: string;
  category: StoneCategory;
  mohs_hardness?: number;
  description?: string;
  sort_order?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STONE_CATEGORIES: { value: StoneCategory; label: string; color: string }[] = [
  { value: 'precious', label: 'Precious', color: 'gold' },
  { value: 'semi-precious', label: 'Semi-Precious', color: 'blue' },
  { value: 'synthetic', label: 'Synthetic', color: 'purple' },
  { value: 'other', label: 'Other', color: 'green' },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Stone Types Settings Page
 */
export default function StoneTypesSettingsPage(): React.JSX.Element {
  const t = useTranslations('common');
  const tInventory = useTranslations('inventory');
  const tSettings = useTranslations('settings');

  const { can } = usePermissions();
  const { user } = useUser();
  const { shopId } = useShop();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStone, setEditingStone] = useState<StoneType | null>(null);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Form instance
  const [form] = Form.useForm<StoneFormValues>();

  // Data hooks
  const {
    data: stones = [],
    isLoading,
    refetch,
  } = useStoneTypes({
    category: selectedCategory,
  });

  // Mutation hooks
  const createMutation = useCreateStoneType();
  const updateMutation = useUpdateStoneType();
  const deleteMutation = useDeleteStoneType();

  // Derived state
  const isEdit = !!editingStone;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Category options for select
  const categoryOptions = useMemo(() => {
    return STONE_CATEGORIES.map((cat) => ({
      value: cat.value,
      label: cat.label,
    }));
  }, []);

  // Get hardness color based on Mohs scale
  const getHardnessColor = useCallback((hardness: number | null): string => {
    if (hardness === null) {
      return 'default';
    }
    if (hardness >= 8) {
      return '#52c41a';
    } // Green - very hard
    if (hardness >= 6) {
      return '#faad14';
    } // Gold - medium
    return '#ff4d4f'; // Red - soft
  }, []);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  // Open modal for adding new stone
  const handleAdd = useCallback(() => {
    setEditingStone(null);
    form.resetFields();
    // Pre-select category if filtering
    if (selectedCategory) {
      form.setFieldValue('category', selectedCategory);
    }
    setModalOpen(true);
  }, [form, selectedCategory]);

  // Open modal for editing stone
  const handleEdit = useCallback(
    (stone: StoneType) => {
      setEditingStone(stone);
      form.setFieldsValue({
        stone_name: stone.stone_name,
        category: stone.category as StoneCategory,
        mohs_hardness: stone.mohs_hardness || undefined,
        description: stone.description || '',
        sort_order: stone.sort_order || 0,
      });
      setModalOpen(true);
    },
    [form]
  );

  // Delete stone
  const handleDelete = useCallback(
    async (stone: StoneType) => {
      try {
        await deleteMutation.mutateAsync(stone.id_stone_type);
        message.success(tSettings('catalog.stoneDeleted'));
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
    setEditingStone(null);
    form.resetFields();
  }, [form]);

  // Submit form
  const handleSubmit = useCallback(
    async (values: StoneFormValues) => {
      if (!user?.id_user || !shopId) {
        message.error(t('messages.unexpectedError'));
        return;
      }

      try {
        if (isEdit && editingStone) {
          // Update existing stone
          await updateMutation.mutateAsync({
            stoneId: editingStone.id_stone_type,
            updates: {
              stone_name: values.stone_name,
              category: values.category,
              mohs_hardness: values.mohs_hardness || null,
              description: values.description || null,
              sort_order: values.sort_order || 0,
            },
          });
          message.success(tSettings('catalog.stoneUpdated'));
        } else {
          // Create new stone
          await createMutation.mutateAsync({
            stone_name: values.stone_name,
            category: values.category,
            mohs_hardness: values.mohs_hardness || null,
            description: values.description || null,
            sort_order: values.sort_order || 0,
            created_by: user.id_user,
          });
          message.success(tSettings('catalog.stoneCreated'));
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
      editingStone,
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
  const columns: CatalogColumn<StoneType>[] = [
    {
      key: 'stone_name',
      title: t('labels.name'),
      dataIndex: 'stone_name',
      width: '30%',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <ExperimentOutlined className="text-purple-600" />
          </div>
          <div>
            <Text strong>{record.stone_name}</Text>
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
      key: 'category',
      title: tSettings('catalog.category'),
      dataIndex: 'category',
      width: '20%',
      render: (value: unknown) => <CategoryBadge category={value as string} />,
    },
    {
      key: 'mohs_hardness',
      title: tSettings('catalog.mohsHardness'),
      dataIndex: 'mohs_hardness',
      width: '20%',
      render: (value: unknown) => {
        const numValue = value as number | null;
        if (numValue === null) {
          return <Text type="secondary">-</Text>;
        }
        const percent = (numValue / 10) * 100;
        return (
          <Space direction="vertical" size={0} className="w-full">
            <Text className="text-sm font-mono">{numValue}/10</Text>
            <Progress
              percent={percent}
              size="small"
              showInfo={false}
              strokeColor={getHardnessColor(numValue)}
              trailColor="#f0f0f0"
              className="w-20"
            />
          </Space>
        );
      },
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
      width: 60,
      render: (value: unknown) => <Text type="secondary">{(value as number | null) ?? '-'}</Text>,
    },
  ];

  // Table actions
  const actions: CatalogAction<StoneType>[] = [
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
        description: tSettings('catalog.deleteStoneWarning'),
      },
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="stone-types-settings-page">
      {/* Header with Filter and Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <Text strong className="text-lg">
            {tInventory('stones.title')}
          </Text>
          <Paragraph type="secondary" className="!mb-0 mt-1">
            {tSettings('catalog.stonesDescription')}
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
            suffixIcon={<FilterOutlined />}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            permission="catalog.manage"
          >
            {tSettings('catalog.addStone')}
          </Button>
        </Space>
      </div>

      {/* Stones Table */}
      <Card bodyStyle={{ padding: 0 }}>
        <CatalogTable
          dataSource={stones}
          columns={columns}
          rowKey="id_stone_type"
          actions={actions}
          loading={isLoading}
          showSortOrder={false}
          empty={{
            title: tSettings('catalog.noStones'),
            description: selectedCategory
              ? tSettings('catalog.noStonesForCategory')
              : tSettings('catalog.noStonesDescription'),
            icon: <ExperimentOutlined />,
            action: can('catalog.manage')
              ? {
                  label: tSettings('catalog.addStone'),
                  onClick: handleAdd,
                }
              : undefined,
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <CatalogFormModal
        open={modalOpen}
        title={isEdit ? tSettings('catalog.editStone') : tSettings('catalog.addStone')}
        onClose={handleClose}
        onSubmit={handleSubmit}
        isEdit={isEdit}
        loading={isSubmitting}
        form={form}
      >
        <FormField
          name="stone_name"
          label={t('labels.name')}
          rules={[
            { required: true, message: t('validation.required') },
            { max: 255, message: t('validation.maxLength', { max: 255 }) },
          ]}
        >
          <Input placeholder={tSettings('catalog.stoneNamePlaceholder')} autoFocus />
        </FormField>

        <FormRow>
          <FormField
            name="category"
            label={tSettings('catalog.category')}
            rules={[{ required: true, message: t('validation.required') }]}
          >
            <Select placeholder={tSettings('catalog.selectCategory')} options={categoryOptions} />
          </FormField>

          <FormField
            name="mohs_hardness"
            label={tSettings('catalog.mohsHardness')}
            tooltip={tSettings('catalog.mohsHardnessTooltip')}
          >
            <InputNumber
              min={0}
              max={10}
              precision={1}
              step={0.5}
              placeholder="7.5"
              className="w-full"
              addonAfter="/10"
            />
          </FormField>
        </FormRow>

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
