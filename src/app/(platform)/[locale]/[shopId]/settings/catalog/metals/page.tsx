'use client';

/**
 * Metal Types Settings Page
 *
 * Manages metal types (Gold, Silver, Platinum, etc.) with CRUD operations.
 * Shows associated purities as nested items.
 *
 * Features:
 * - List all metal types
 * - Show associated purities count
 * - Add new metal types
 * - Edit existing metal types
 * - Delete metal types (with usage check)
 * - Navigate to purities for each metal
 *
 * @module app/(platform)/[locale]/[shopId]/settings/catalog/metals/page
 */

import React, { useState, useCallback, useMemo } from 'react';

import { useParams } from 'next/navigation';

import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GoldOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Card, Form, Input, InputNumber, message, Typography, Badge } from 'antd';
import { useTranslations } from 'next-intl';

import { CatalogFormModal, FormField } from '@/components/domain/settings/CatalogFormModal';
import {
  CatalogTable,
  type CatalogAction,
  type CatalogColumn,
} from '@/components/domain/settings/CatalogTable';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/lib/hooks/auth';
import {
  useMetalTypes,
  useCreateMetalType,
  useUpdateMetalType,
  useDeleteMetalType,
  useMetalPurities,
  type MetalType,
} from '@/lib/hooks/data/useMetals';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { useRouter } from '@/lib/i18n/navigation';

const { Text, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface MetalTypeFormValues {
  metal_name: string;
  description?: string;
  sort_order?: number;
}

/** Mapped type for CatalogTable compatibility */
interface MetalTableItem extends MetalType {
  id: string;
  sort_order: number | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Metal Types Settings Page
 */
export default function MetalTypesSettingsPage(): React.JSX.Element {
  const t = useTranslations('common');
  const tInventory = useTranslations('inventory');
  const tSettings = useTranslations('settings');

  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const shopIdParam = params.shopId as string;

  const { can } = usePermissions();
  const { user } = useUser();
  const { shopId } = useShop();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMetal, setEditingMetal] = useState<MetalType | null>(null);

  // Form instance
  const [form] = Form.useForm<MetalTypeFormValues>();

  // Data hooks
  const { data: metalTypes = [], isLoading, refetch } = useMetalTypes();
  const { data: allPurities = [] } = useMetalPurities();

  // Mutation hooks
  const createMutation = useCreateMetalType();
  const updateMutation = useUpdateMetalType();
  const deleteMutation = useDeleteMetalType();

  // Derived state
  const isEdit = !!editingMetal;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Calculate purity counts per metal type
  const purityCountMap = useMemo(() => {
    const map = new Map<string, number>();
    allPurities.forEach((purity) => {
      const count = map.get(purity.id_metal_type) || 0;
      map.set(purity.id_metal_type, count + 1);
    });
    return map;
  }, [allPurities]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  // Open modal for adding new metal type
  const handleAdd = useCallback(() => {
    setEditingMetal(null);
    form.resetFields();
    setModalOpen(true);
  }, [form]);

  // Open modal for editing metal type
  const handleEdit = useCallback(
    (metal: MetalType) => {
      setEditingMetal(metal);
      form.setFieldsValue({
        metal_name: metal.metal_name,
        description: metal.description || '',
        sort_order: metal.sort_order ?? undefined,
      });
      setModalOpen(true);
    },
    [form]
  );

  // Delete metal type
  const handleDelete = useCallback(
    async (metal: MetalType) => {
      try {
        await deleteMutation.mutateAsync(metal.id_metal_type);
        message.success(tSettings('catalog.metalDeleted'));
        refetch();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('messages.operationFailed');
        message.error(errorMessage);
      }
    },
    [deleteMutation, refetch, t, tSettings]
  );

  // Navigate to purities page for a specific metal
  const handleViewPurities = useCallback(
    (metal: MetalType) => {
      router.push(
        `/${locale}/${shopIdParam}/settings/catalog/purities?metal=${metal.id_metal_type}`
      );
    },
    [router, locale, shopIdParam]
  );

  // Close modal
  const handleClose = useCallback(() => {
    setModalOpen(false);
    setEditingMetal(null);
    form.resetFields();
  }, [form]);

  // Submit form
  const handleSubmit = useCallback(
    async (values: MetalTypeFormValues) => {
      if (!user?.id_user || !shopId) {
        message.error(t('messages.unexpectedError'));
        return;
      }

      try {
        if (isEdit && editingMetal) {
          // Update existing metal type
          await updateMutation.mutateAsync({
            typeId: editingMetal.id_metal_type,
            updates: {
              metal_name: values.metal_name,
              description: values.description || null,
              sort_order: values.sort_order ?? null,
            },
          });
          message.success(tSettings('catalog.metalUpdated'));
        } else {
          // Create new metal type
          await createMutation.mutateAsync({
            metal_name: values.metal_name,
            description: values.description || null,
            sort_order: values.sort_order ?? null,
          });
          message.success(tSettings('catalog.metalCreated'));
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
      editingMetal,
      createMutation,
      updateMutation,
      handleClose,
      refetch,
      t,
      tSettings,
    ]
  );

  // Map metal types for CatalogTable compatibility
  const tableData: MetalTableItem[] = useMemo(
    () =>
      metalTypes.map((m) => ({
        ...m,
        id: m.id_metal_type,
        sort_order: null,
      })),
    [metalTypes]
  );

  // ==========================================================================
  // TABLE CONFIGURATION
  // ==========================================================================

  // Table columns
  const columns: CatalogColumn<MetalTableItem>[] = [
    {
      key: 'metal_name',
      title: t('labels.name'),
      dataIndex: 'metal_name',
      width: '35%',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-100">
            <GoldOutlined className="text-amber-600" />
          </div>
          <div>
            <Text strong>{record.metal_name}</Text>
            {record.description && (
              <Paragraph type="secondary" className="!mb-0 text-xs">
                {record.description}
              </Paragraph>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'purities',
      title: tSettings('catalog.purities'),
      width: '25%',
      render: (_, record) => {
        const count = purityCountMap.get(record.id_metal_type) || 0;
        return (
          <Button
            type="link"
            size="small"
            onClick={() => handleViewPurities(record)}
            className="p-0 h-auto"
          >
            <Badge count={count} showZero color={count > 0 ? 'gold' : 'default'} className="me-2" />
            <span className="text-stone-600">
              {count === 1 ? tSettings('catalog.purity') : tSettings('catalog.purities')}
            </span>
            <RightOutlined className="text-xs ms-1" />
          </Button>
        );
      },
    },
    {
      key: 'sort_order',
      title: tSettings('catalog.sortOrder'),
      dataIndex: 'sort_order',
      width: '15%',
      render: (value: unknown) => (
        <Text type="secondary" className="text-sm">
          {(value as number | null) ?? '-'}
        </Text>
      ),
    },
  ];

  // Table actions
  const actions: CatalogAction<MetalTableItem>[] = [
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
        description: tSettings('catalog.deleteMetalWarning'),
      },
      disabled: (record) => (purityCountMap.get(record.id_metal_type) || 0) > 0,
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="metal-types-settings-page">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Text strong className="text-lg">
            {tInventory('metals.title')}
          </Text>
          <Paragraph type="secondary" className="!mb-0 mt-1">
            {tSettings('catalog.metalsDescription')}
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          permission="catalog.manage"
        >
          {tSettings('catalog.addMetal')}
        </Button>
      </div>

      {/* Metal Types Table */}
      <Card bodyStyle={{ padding: 0 }}>
        <CatalogTable<MetalTableItem>
          dataSource={tableData}
          columns={columns}
          rowKey="id_metal_type"
          actions={actions}
          loading={isLoading}
          showSortOrder={false}
          empty={{
            title: tSettings('catalog.noMetals'),
            description: tSettings('catalog.noMetalsDescription'),
            icon: <GoldOutlined />,
            action: can('catalog.manage')
              ? {
                  label: tSettings('catalog.addMetal'),
                  onClick: handleAdd,
                }
              : undefined,
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <CatalogFormModal
        open={modalOpen}
        title={isEdit ? tSettings('catalog.editMetal') : tSettings('catalog.addMetal')}
        onClose={handleClose}
        onSubmit={handleSubmit}
        isEdit={isEdit}
        loading={isSubmitting}
        form={form}
      >
        <FormField
          name="metal_name"
          label={t('labels.name')}
          rules={[
            { required: true, message: t('validation.required') },
            { max: 255, message: t('validation.maxLength', { max: 255 }) },
          ]}
        >
          <Input placeholder={tSettings('catalog.metalNamePlaceholder')} autoFocus />
        </FormField>

        <FormField
          name="description"
          label={t('labels.description')}
          rules={[{ max: 500, message: t('validation.maxLength', { max: 500 }) }]}
        >
          <Input.TextArea placeholder={tSettings('catalog.metalDescriptionPlaceholder')} rows={3} />
        </FormField>

        <FormField name="sort_order" label={tSettings('catalog.sortOrder')}>
          <InputNumber min={0} placeholder="0" className="w-full" />
        </FormField>
      </CatalogFormModal>
    </div>
  );
}
