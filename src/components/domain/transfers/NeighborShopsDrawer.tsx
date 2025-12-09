'use client';

/**
 * NeighborShopsDrawer Component
 *
 * Drawer component for managing neighbor shops (partner shops) that can
 * participate in transfers. Supports both internal (same business) and
 * external (partner) shops.
 *
 * Features:
 * - List all neighbor shops with search
 * - Add new neighbor shop (internal or external)
 * - Edit external shop details
 * - Toggle active/inactive status
 * - Delete (soft delete) neighbor shop
 * - RTL support
 * - Permission-based access (transfers.manage_neighbors)
 *
 * @module components/domain/transfers/NeighborShopsDrawer
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';

import {
  ShopOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GlobalOutlined,
  HomeOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  StopOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Drawer,
  Typography,
  Tag,
  List,
  Form,
  Input,
  Select,
  Modal,
  message,
  Empty,
  Spin,
  Popconfirm,
  Space,
  Tooltip,
  Radio,
  Divider,
} from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  type NeighborShopWithDetails,
  useNeighborShopsForManagement,
  useCreateNeighborShop,
  useUpdateNeighborShop,
  useDeleteNeighborShop,
  getNeighborDisplayName,
} from '@/lib/hooks/data/useTransfers';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/format';

const { Text } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

interface NeighborShopsDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
}

interface NeighborShopFormValues {
  neighborType: 'internal' | 'external';
  neighborShopId?: string;
  externalShopName?: string;
  externalShopPhone?: string;
  externalShopAddress?: string;
  notes?: string;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Status badge for neighbor shop
 */
function StatusBadge({
  status,
  t,
}: {
  status: string | null;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const isActive = status === 'active';

  return (
    <Tag
      icon={isActive ? <CheckCircleOutlined /> : <StopOutlined />}
      color={isActive ? 'green' : 'default'}
    >
      {isActive ? t('neighborShops.active') : t('neighborShops.inactive')}
    </Tag>
  );
}

/**
 * Type badge for neighbor shop (internal/external)
 */
function TypeBadge({
  type,
  t,
}: {
  type: 'internal' | 'external';
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const isInternal = type === 'internal';

  return (
    <Tag
      icon={isInternal ? <HomeOutlined /> : <GlobalOutlined />}
      color={isInternal ? 'blue' : 'purple'}
    >
      {isInternal ? t('neighborShops.internal') : t('neighborShops.external')}
    </Tag>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * NeighborShopsDrawer - Drawer for managing neighbor shops
 */
export function NeighborShopsDrawer({
  open,
  onClose,
}: NeighborShopsDrawerProps): React.JSX.Element {
  const t = useTranslations('transfers');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<NeighborShopWithDetails | null>(null);
  const [form] = Form.useForm<NeighborShopFormValues>();

  // Watch neighborType for conditional rendering
  const neighborType = Form.useWatch('neighborType', form);

  // Data fetching
  const { neighborShops, isLoading, isFetching, refetch } = useNeighborShopsForManagement({
    search: searchTerm,
    enabled: open,
  });

  // Mutations
  const createMutation = useCreateNeighborShop();
  const updateMutation = useUpdateNeighborShop();
  const deleteMutation = useDeleteNeighborShop();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Check permission
  const canManage = can('transfers.manage_neighbors');

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Reset form when modal opens/closes
  useEffect(() => {
    if (formModalOpen) {
      if (editingShop) {
        // Editing existing shop
        form.setFieldsValue({
          neighborType: editingShop.neighbor_type,
          externalShopName: editingShop.external_shop_name || '',
          externalShopPhone: editingShop.external_shop_phone || '',
          externalShopAddress: editingShop.external_shop_address || '',
          notes: editingShop.notes || '',
        });
      } else {
        // Creating new shop
        form.resetFields();
        form.setFieldValue('neighborType', 'external');
      }
    }
  }, [formModalOpen, editingShop, form]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleOpenAddModal = useCallback(() => {
    setEditingShop(null);
    setFormModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((shop: NeighborShopWithDetails) => {
    setEditingShop(shop);
    setFormModalOpen(true);
  }, []);

  const handleCloseFormModal = useCallback(() => {
    setFormModalOpen(false);
    setEditingShop(null);
    form.resetFields();
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      if (editingShop) {
        // Update existing shop (only external shops can be edited)
        await updateMutation.mutateAsync({
          neighborId: editingShop.id_neighbor,
          externalShopName: values.externalShopName,
          externalShopPhone: values.externalShopPhone,
          externalShopAddress: values.externalShopAddress,
          notes: values.notes,
        });
        message.success(t('neighborShops.updated'));
      } else {
        // Create new shop
        await createMutation.mutateAsync({
          neighborType: values.neighborType,
          neighborShopId: values.neighborShopId,
          externalShopName: values.externalShopName,
          externalShopPhone: values.externalShopPhone,
          externalShopAddress: values.externalShopAddress,
          notes: values.notes,
        });
        message.success(t('neighborShops.created'));
      }

      handleCloseFormModal();
      refetch();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error(tCommon('messages.operationFailed'));
      }
    }
  }, [
    form,
    editingShop,
    createMutation,
    updateMutation,
    t,
    tCommon,
    handleCloseFormModal,
    refetch,
  ]);

  const handleToggleStatus = useCallback(
    async (shop: NeighborShopWithDetails) => {
      try {
        const newStatus = shop.status === 'active' ? 'inactive' : 'active';
        await updateMutation.mutateAsync({
          neighborId: shop.id_neighbor,
          status: newStatus,
        });
        message.success(
          newStatus === 'active' ? t('neighborShops.activated') : t('neighborShops.deactivated')
        );
        refetch();
      } catch (error) {
        if (error instanceof Error) {
          message.error(error.message);
        } else {
          message.error(tCommon('messages.operationFailed'));
        }
      }
    },
    [updateMutation, t, tCommon, refetch]
  );

  const handleDelete = useCallback(
    async (shop: NeighborShopWithDetails) => {
      try {
        await deleteMutation.mutateAsync(shop.id_neighbor);
        message.success(t('neighborShops.deleted'));
        refetch();
      } catch (error) {
        if (error instanceof Error) {
          message.error(error.message);
        } else {
          message.error(tCommon('messages.operationFailed'));
        }
      }
    },
    [deleteMutation, t, tCommon, refetch]
  );

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Filter shops based on search
  const filteredShops = useMemo(() => {
    if (!searchTerm.trim()) {
      return neighborShops;
    }
    const searchLower = searchTerm.toLowerCase();
    return neighborShops.filter((shop) => {
      const name = getNeighborDisplayName(shop);
      return name.toLowerCase().includes(searchLower);
    });
  }, [neighborShops, searchTerm]);

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        width={560}
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <ShopOutlined className="text-amber-600 text-lg" />
            </div>
            <div>
              <Text strong>{t('neighborShops.title')}</Text>
              <Text type="secondary" className="block text-xs">
                {t('neighborShops.subtitle')}
              </Text>
            </div>
          </div>
        }
        extra={
          canManage && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
              {t('neighborShops.add')}
            </Button>
          )
        }
      >
        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder={t('neighborShops.searchPlaceholder')}
            prefix={<SearchOutlined className="text-stone-400" />}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
          />
        </div>

        {/* List */}
        <div className={cn(isFetching && 'opacity-70')}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spin size="large" />
            </div>
          ) : filteredShops.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={searchTerm ? t('neighborShops.noResults') : t('neighborShops.empty')}
            >
              {canManage && !searchTerm && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
                  {t('neighborShops.add')}
                </Button>
              )}
            </Empty>
          ) : (
            <List
              dataSource={filteredShops}
              renderItem={(shop) => (
                <List.Item
                  className="!px-3 !py-3 hover:bg-stone-50 rounded-lg transition-colors"
                  actions={
                    canManage
                      ? [
                          // Toggle status button
                          <Tooltip
                            key="toggle"
                            title={
                              shop.status === 'active'
                                ? t('neighborShops.deactivate')
                                : t('neighborShops.activate')
                            }
                          >
                            <Button
                              type="text"
                              size="small"
                              icon={
                                shop.status === 'active' ? (
                                  <StopOutlined />
                                ) : (
                                  <CheckCircleOutlined />
                                )
                              }
                              onClick={() => handleToggleStatus(shop)}
                              loading={updateMutation.isPending}
                            />
                          </Tooltip>,
                          // Edit button (only for external shops)
                          shop.neighbor_type === 'external' && (
                            <Tooltip key="edit" title={tCommon('actions.edit')}>
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleOpenEditModal(shop)}
                              />
                            </Tooltip>
                          ),
                          // Delete button
                          <Popconfirm
                            key="delete"
                            title={t('neighborShops.confirmDelete')}
                            description={t('neighborShops.confirmDeleteDescription')}
                            onConfirm={() => handleDelete(shop)}
                            okText={tCommon('actions.delete')}
                            cancelText={tCommon('actions.cancel')}
                            okButtonProps={{ danger: true }}
                          >
                            <Tooltip title={tCommon('actions.delete')}>
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                loading={deleteMutation.isPending}
                              />
                            </Tooltip>
                          </Popconfirm>,
                        ].filter(Boolean)
                      : undefined
                  }
                >
                  <List.Item.Meta
                    avatar={
                      <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                        {shop.neighbor_type === 'internal' ? (
                          <HomeOutlined className="text-blue-500" />
                        ) : (
                          <GlobalOutlined className="text-purple-500" />
                        )}
                      </div>
                    }
                    title={
                      <div className="flex items-center gap-2 flex-wrap">
                        <Text strong>{getNeighborDisplayName(shop)}</Text>
                        <TypeBadge type={shop.neighbor_type} t={t} />
                        <StatusBadge status={shop.status} t={t} />
                      </div>
                    }
                    description={
                      <div className="mt-1 space-y-1">
                        {shop.neighbor_type === 'external' && (
                          <>
                            {shop.external_shop_phone && (
                              <div className="flex items-center gap-2 text-xs text-stone-500">
                                <PhoneOutlined />
                                <span>{shop.external_shop_phone}</span>
                              </div>
                            )}
                            {shop.external_shop_address && (
                              <div className="flex items-center gap-2 text-xs text-stone-500">
                                <EnvironmentOutlined />
                                <span className="truncate max-w-[300px]">
                                  {shop.external_shop_address}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        <Text type="secondary" className="text-xs">
                          {tCommon('labels.addedOn')}{' '}
                          {formatDate(shop.created_at, 'en-US', 'short')}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Drawer>

      {/* Add/Edit Modal */}
      <Modal
        open={formModalOpen}
        title={
          <div className="flex items-center gap-2">
            {editingShop ? <EditOutlined /> : <PlusOutlined />}
            <span>{editingShop ? t('neighborShops.edit') : t('neighborShops.add')}</span>
          </div>
        }
        onCancel={handleCloseFormModal}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={handleCloseFormModal} disabled={isSubmitting}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
              permission="transfers.manage_neighbors"
            >
              {editingShop ? tCommon('actions.save') : tCommon('actions.add')}
            </Button>
          </div>
        }
        width={500}
        destroyOnClose
        maskClosable={!isSubmitting}
        closable={!isSubmitting}
      >
        <Form form={form} layout="vertical" className="mt-4" requiredMark="optional">
          {/* Neighbor Type Selection (only for new shops) */}
          {!editingShop && (
            <Form.Item
              name="neighborType"
              label={t('neighborShops.type')}
              initialValue="external"
              rules={[{ required: true, message: tCommon('validation.required') }]}
            >
              <Radio.Group className="w-full">
                <Space direction="vertical" className="w-full">
                  <Radio value="external" className="w-full">
                    <div className="flex items-center gap-2">
                      <GlobalOutlined className="text-purple-500" />
                      <div>
                        <Text strong>{t('neighborShops.external')}</Text>
                        <Text type="secondary" className="block text-xs">
                          {t('neighborShops.externalDescription')}
                        </Text>
                      </div>
                    </div>
                  </Radio>
                  <Radio value="internal" className="w-full" disabled>
                    <div className="flex items-center gap-2">
                      <HomeOutlined className="text-blue-500" />
                      <div>
                        <Text strong>{t('neighborShops.internal')}</Text>
                        <Text type="secondary" className="block text-xs">
                          {t('neighborShops.internalDescription')}
                        </Text>
                      </div>
                    </div>
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          )}

          <Divider className="!my-3" />

          {/* External Shop Fields */}
          {(neighborType === 'external' || editingShop?.neighbor_type === 'external') && (
            <>
              <Form.Item
                name="externalShopName"
                label={t('neighborShops.shopName')}
                rules={[
                  { required: true, message: tCommon('validation.required') },
                  { max: 100, message: tCommon('validation.maxLength', { max: 100 }) },
                ]}
              >
                <Input
                  placeholder={t('neighborShops.shopNamePlaceholder')}
                  prefix={<ShopOutlined className="text-stone-400" />}
                />
              </Form.Item>

              <Form.Item
                name="externalShopPhone"
                label={t('neighborShops.phone')}
                rules={[{ max: 50, message: tCommon('validation.maxLength', { max: 50 }) }]}
              >
                <Input
                  placeholder={t('neighborShops.phonePlaceholder')}
                  prefix={<PhoneOutlined className="text-stone-400" />}
                />
              </Form.Item>

              <Form.Item
                name="externalShopAddress"
                label={t('neighborShops.address')}
                rules={[{ max: 500, message: tCommon('validation.maxLength', { max: 500 }) }]}
              >
                <TextArea
                  placeholder={t('neighborShops.addressPlaceholder')}
                  rows={2}
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </>
          )}

          {/* Internal Shop Selection */}
          {neighborType === 'internal' && !editingShop && (
            <Form.Item
              name="neighborShopId"
              label={t('neighborShops.selectShop')}
              rules={[{ required: true, message: tCommon('validation.required') }]}
            >
              <Select
                placeholder={t('neighborShops.selectShopPlaceholder')}
                options={[]}
                disabled
                notFoundContent={t('neighborShops.noInternalShops')}
              />
            </Form.Item>
          )}

          {/* Notes */}
          <Form.Item
            name="notes"
            label={tCommon('labels.notes')}
            rules={[{ max: 1000, message: tCommon('validation.maxLength', { max: 1000 }) }]}
          >
            <TextArea
              placeholder={t('neighborShops.notesPlaceholder')}
              rows={3}
              maxLength={1000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default NeighborShopsDrawer;
