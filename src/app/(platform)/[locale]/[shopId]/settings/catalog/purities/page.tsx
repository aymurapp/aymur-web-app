'use client';

/**
 * Metal Purities Settings Page
 *
 * Manages metal purities (e.g., 24K, 22K, 18K for Gold) with CRUD operations.
 * Purities are linked to metal types and include percentage and fineness values.
 *
 * Features:
 * - List all purities with metal type grouping
 * - Filter by metal type (from URL param or dropdown)
 * - Add new purities
 * - Edit existing purities
 * - Delete purities (with usage check)
 * - Show purity percentage and fineness
 *
 * @module app/(platform)/[locale]/[shopId]/settings/catalog/purities/page
 */

import React, { useState, useCallback, useMemo } from 'react';

import { useSearchParams } from 'next/navigation';

import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PercentageOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { Card, Form, Input, InputNumber, Select, message, Typography, Tag, Space } from 'antd';
import { useTranslations } from 'next-intl';

import { CatalogFormModal, FormField } from '@/components/domain/settings/CatalogFormModal';
import {
  CatalogTable,
  PercentageDisplay,
  type CatalogAction,
  type CatalogColumn,
} from '@/components/domain/settings/CatalogTable';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/lib/hooks/auth';
import {
  useMetalTypes,
  useMetalPurities,
  useCreateMetalPurity,
  useUpdateMetalPurity,
  useDeleteMetalPurity,
  type MetalPurityWithType,
} from '@/lib/hooks/data/useMetals';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';

const { Text, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

interface PurityFormValues {
  id_metal_type: string;
  purity_name: string;
  purity_percentage: number;
  fineness: number;
}

/** Mapped type for CatalogTable compatibility */
interface PurityTableItem extends MetalPurityWithType {
  id: string;
  sort_order: number | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Metal Purities Settings Page
 */
export default function MetalPuritiesSettingsPage(): React.JSX.Element {
  const t = useTranslations('common');
  const tInventory = useTranslations('inventory');
  const tSettings = useTranslations('settings');

  const searchParams = useSearchParams();
  const metalIdFromUrl = searchParams.get('metal');

  const { can } = usePermissions();
  const { user } = useUser();
  const { shopId } = useShop();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPurity, setEditingPurity] = useState<MetalPurityWithType | null>(null);

  // Filter state
  const [selectedMetalType, setSelectedMetalType] = useState<string | null>(metalIdFromUrl);

  // Form instance
  const [form] = Form.useForm<PurityFormValues>();

  // Data hooks
  const { data: metalTypes = [], isLoading: loadingMetals } = useMetalTypes();
  const {
    data: purities = [],
    isLoading: loadingPurities,
    refetch,
  } = useMetalPurities({
    metalTypeId: selectedMetalType,
    includeMetalType: true,
  });

  // Mutation hooks
  const createMutation = useCreateMetalPurity();
  const updateMutation = useUpdateMetalPurity();
  const deleteMutation = useDeleteMetalPurity();

  // Derived state
  const isEdit = !!editingPurity;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isLoading = loadingMetals || loadingPurities;

  // Metal type options for select
  const metalTypeOptions = useMemo(
    () =>
      metalTypes.map((type) => ({
        value: type.id_metal_type,
        label: type.metal_name,
      })),
    [metalTypes]
  );

  // Get metal name by ID
  const getMetalName = useCallback(
    (metalId: string) => {
      const metal = metalTypes.find((m) => m.id_metal_type === metalId);
      return metal?.metal_name || '-';
    },
    [metalTypes]
  );

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  // Open modal for adding new purity
  const handleAdd = useCallback(() => {
    setEditingPurity(null);
    form.resetFields();
    // Pre-select metal type if filtering
    if (selectedMetalType) {
      form.setFieldValue('id_metal_type', selectedMetalType);
    }
    setModalOpen(true);
  }, [form, selectedMetalType]);

  // Open modal for editing purity
  const handleEdit = useCallback(
    (purity: MetalPurityWithType) => {
      setEditingPurity(purity);
      form.setFieldsValue({
        id_metal_type: purity.id_metal_type,
        purity_name: purity.purity_name,
        purity_percentage: purity.purity_percentage,
        fineness: purity.fineness,
      });
      setModalOpen(true);
    },
    [form]
  );

  // Delete purity
  const handleDelete = useCallback(
    async (purity: MetalPurityWithType) => {
      try {
        await deleteMutation.mutateAsync(purity.id_purity);
        message.success(tSettings('catalog.purityDeleted'));
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
    setEditingPurity(null);
    form.resetFields();
  }, [form]);

  // Submit form
  const handleSubmit = useCallback(
    async (values: PurityFormValues) => {
      if (!user?.id_user || !shopId) {
        message.error(t('messages.unexpectedError'));
        return;
      }

      try {
        if (isEdit && editingPurity) {
          // Update existing purity
          await updateMutation.mutateAsync({
            purityId: editingPurity.id_purity,
            updates: {
              id_metal_type: values.id_metal_type,
              purity_name: values.purity_name,
              purity_percentage: values.purity_percentage,
              fineness: values.fineness,
            },
          });
          message.success(tSettings('catalog.purityUpdated'));
        } else {
          // Create new purity
          await createMutation.mutateAsync({
            id_metal_type: values.id_metal_type,
            purity_name: values.purity_name,
            purity_percentage: values.purity_percentage,
            fineness: values.fineness,
          });
          message.success(tSettings('catalog.purityCreated'));
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
      editingPurity,
      createMutation,
      updateMutation,
      handleClose,
      refetch,
      t,
      tSettings,
    ]
  );

  // Handle metal type filter change
  const handleFilterChange = useCallback((value: string | null) => {
    setSelectedMetalType(value);
  }, []);

  // Map purities for CatalogTable compatibility
  const tableData: PurityTableItem[] = useMemo(
    () =>
      (purities as MetalPurityWithType[]).map((p) => ({
        ...p,
        id: p.id_purity,
        sort_order: null,
      })),
    [purities]
  );

  // ==========================================================================
  // TABLE CONFIGURATION
  // ==========================================================================

  // Table columns
  const columns: CatalogColumn<PurityTableItem>[] = [
    {
      key: 'purity_name',
      title: t('labels.name'),
      dataIndex: 'purity_name',
      width: '30%',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <PercentageOutlined className="text-amber-600" />
          </div>
          <Text strong>{record.purity_name}</Text>
        </div>
      ),
    },
    {
      key: 'metal_type',
      title: tInventory('metals.title'),
      dataIndex: 'id_metal_type',
      width: '25%',
      render: (_, record) => <Tag color="gold">{getMetalName(record.id_metal_type)}</Tag>,
    },
    {
      key: 'purity_percentage',
      title: tSettings('catalog.percentage'),
      dataIndex: 'purity_percentage',
      width: '15%',
      render: (value: unknown) => <PercentageDisplay value={value as number} />,
    },
    {
      key: 'fineness',
      title: tSettings('catalog.fineness'),
      dataIndex: 'fineness',
      width: '15%',
      render: (value: unknown) => (
        <Text type="secondary" className="text-sm font-mono">
          {(value as number) ?? '-'}
        </Text>
      ),
    },
  ];

  // Table actions
  const actions: CatalogAction<PurityTableItem>[] = [
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
        description: tSettings('catalog.deletePurityWarning'),
      },
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="metal-purities-settings-page">
      {/* Header with Filter and Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <Text strong className="text-lg">
            {tSettings('catalog.purities')}
          </Text>
          <Paragraph type="secondary" className="!mb-0 mt-1">
            {tSettings('catalog.puritiesDescription')}
          </Paragraph>
        </div>
        <Space>
          {/* Metal Type Filter */}
          <Select
            placeholder={tSettings('catalog.filterByMetal')}
            value={selectedMetalType}
            onChange={handleFilterChange}
            options={[{ value: '', label: tSettings('catalog.allMetals') }, ...metalTypeOptions]}
            allowClear
            className="w-40"
            suffixIcon={<FilterOutlined />}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            permission="catalog.manage"
          >
            {tSettings('catalog.addPurity')}
          </Button>
        </Space>
      </div>

      {/* Purities Table */}
      <Card bodyStyle={{ padding: 0 }}>
        <CatalogTable<PurityTableItem>
          dataSource={tableData}
          columns={columns}
          rowKey="id_purity"
          actions={actions}
          loading={isLoading}
          showSortOrder={false}
          empty={{
            title: tSettings('catalog.noPurities'),
            description: selectedMetalType
              ? tSettings('catalog.noPuritiesForMetal')
              : tSettings('catalog.noPuritiesDescription'),
            icon: <PercentageOutlined />,
            action: can('catalog.manage')
              ? {
                  label: tSettings('catalog.addPurity'),
                  onClick: handleAdd,
                }
              : undefined,
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <CatalogFormModal
        open={modalOpen}
        title={isEdit ? tSettings('catalog.editPurity') : tSettings('catalog.addPurity')}
        onClose={handleClose}
        onSubmit={handleSubmit}
        isEdit={isEdit}
        loading={isSubmitting}
        form={form}
      >
        <FormField
          name="id_metal_type"
          label={tInventory('metals.title')}
          rules={[{ required: true, message: t('validation.required') }]}
        >
          <Select
            placeholder={tSettings('catalog.selectMetal')}
            options={metalTypeOptions}
            loading={loadingMetals}
          />
        </FormField>

        <FormField
          name="purity_name"
          label={t('labels.name')}
          rules={[
            { required: true, message: t('validation.required') },
            { max: 255, message: t('validation.maxLength', { max: 255 }) },
          ]}
        >
          <Input placeholder={tSettings('catalog.purityNamePlaceholder')} autoFocus />
        </FormField>

        <FormField
          name="purity_percentage"
          label={tSettings('catalog.percentage')}
          rules={[
            { required: true, message: t('validation.required') },
            {
              type: 'number',
              min: 0,
              max: 100,
              message: t('validation.range', { min: 0, max: 100 }),
            },
          ]}
        >
          <InputNumber
            min={0}
            max={100}
            precision={2}
            step={0.01}
            placeholder="99.9"
            className="w-full"
            addonAfter="%"
          />
        </FormField>

        <FormField
          name="fineness"
          label={tSettings('catalog.fineness')}
          rules={[
            { required: true, message: t('validation.required') },
            {
              type: 'number',
              min: 0,
              max: 1000,
              message: t('validation.range', { min: 0, max: 1000 }),
            },
          ]}
        >
          <InputNumber
            min={0}
            max={1000}
            precision={0}
            step={1}
            placeholder="999"
            className="w-full"
          />
        </FormField>
      </CatalogFormModal>
    </div>
  );
}
