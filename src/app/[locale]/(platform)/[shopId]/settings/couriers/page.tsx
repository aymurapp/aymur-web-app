'use client';

/**
 * Courier Companies Settings Page
 *
 * Manages courier companies for delivery tracking.
 * Supports creating, editing, and soft-deleting couriers.
 *
 * Features:
 * - List all courier companies
 * - Create/edit courier in drawer modal
 * - Fields: company name, contact, phone, email, address
 * - Tracking URL template field for generating tracking links
 * - Current balance display
 * - Soft delete with confirmation and balance check
 * - RTL support
 *
 * @module app/(platform)/[locale]/[shopId]/settings/couriers/page
 */

import React, { useState, useCallback } from 'react';

import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TruckOutlined,
  PhoneOutlined,
  MailOutlined,
  LinkOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { Card, Form, Input, message, Typography, Drawer, Tag, Tooltip, Space } from 'antd';
import { useTranslations } from 'next-intl';

import {
  CatalogTable,
  type CatalogAction,
  type CatalogColumn,
} from '@/components/domain/settings/CatalogTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  useCouriers,
  useCreateCourier,
  useUpdateCourier,
  useDeleteCourier,
  type CourierCompany,
  type CourierCompanyInsert,
  type CourierCompanyUpdate,
} from '@/lib/hooks/data/useDeliveries';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

const { Text } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

interface CourierFormValues {
  company_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Courier Companies Settings Page
 */
export default function CourierCompaniesSettingsPage(): React.JSX.Element {
  const t = useTranslations('deliveries');
  const tCommon = useTranslations('common');

  const { can } = usePermissions();
  const { shopId } = useShop();

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<CourierCompany | null>(null);

  // Form instance
  const [form] = Form.useForm<CourierFormValues>();

  // Data hooks
  const { couriers, isLoading, refetch } = useCouriers({
    pageSize: 100,
    includeDeleted: false,
  });

  // Mutation hooks
  const createMutation = useCreateCourier();
  const updateMutation = useUpdateCourier();
  const deleteMutation = useDeleteCourier();

  // Derived state
  const isEdit = !!editingCourier;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  // Open drawer for adding new courier
  const handleAdd = useCallback(() => {
    setEditingCourier(null);
    form.resetFields();
    setDrawerOpen(true);
  }, [form]);

  // Open drawer for editing courier
  const handleEdit = useCallback(
    (courier: CourierCompany) => {
      setEditingCourier(courier);
      form.setFieldsValue({
        company_name: courier.company_name,
        contact_person: courier.contact_person || undefined,
        phone: courier.phone || undefined,
        email: courier.email || undefined,
        website: courier.website || undefined,
        notes: courier.notes || undefined,
      });
      setDrawerOpen(true);
    },
    [form]
  );

  // Delete courier
  const handleDelete = useCallback(
    async (courier: CourierCompany) => {
      try {
        await deleteMutation.mutateAsync(courier.id_courier);
        message.success(t('courier.courierDeleted'));
        refetch();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : tCommon('messages.operationFailed');
        message.error(errorMessage);
      }
    },
    [deleteMutation, refetch, t, tCommon]
  );

  // Close drawer
  const handleClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingCourier(null);
    form.resetFields();
  }, [form]);

  // Submit form
  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      if (isEdit && editingCourier) {
        // Update existing courier
        const updateData: CourierCompanyUpdate = {
          company_name: values.company_name.trim(),
          contact_person: values.contact_person?.trim() || null,
          phone: values.phone?.trim() || null,
          email: values.email?.trim() || null,
          website: values.website?.trim() || null,
          notes: values.notes?.trim() || null,
        };

        await updateMutation.mutateAsync({
          courierId: editingCourier.id_courier,
          data: updateData,
        });

        message.success(t('courier.courierUpdated'));
      } else {
        // Create new courier
        const createData: Omit<CourierCompanyInsert, 'id_shop' | 'created_by'> = {
          company_name: values.company_name.trim(),
          contact_person: values.contact_person?.trim() || null,
          phone: values.phone?.trim() || null,
          email: values.email?.trim() || null,
          website: values.website?.trim() || null,
          notes: values.notes?.trim() || null,
          status: 'active',
        };

        await createMutation.mutateAsync(createData);

        message.success(t('courier.courierCreated'));
      }

      handleClose();
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
    isEdit,
    editingCourier,
    createMutation,
    updateMutation,
    handleClose,
    refetch,
    t,
    tCommon,
  ]);

  // ==========================================================================
  // TABLE CONFIGURATION
  // ==========================================================================

  // Table columns
  const columns: CatalogColumn<CourierCompany>[] = [
    {
      key: 'company_name',
      title: t('courier.companyName'),
      dataIndex: 'company_name',
      width: '30%',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <TruckOutlined className="text-amber-600 text-lg" />
          </div>
          <div className="min-w-0">
            <Text strong className="block truncate">
              {record.company_name}
            </Text>
            {record.contact_person && (
              <Text type="secondary" className="text-xs block truncate">
                {record.contact_person}
              </Text>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      title: tCommon('labels.contact'),
      width: '25%',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.phone && (
            <Text className="text-sm flex items-center gap-1">
              <PhoneOutlined className="text-stone-400" />
              {record.phone}
            </Text>
          )}
          {record.email && (
            <Text className="text-sm flex items-center gap-1" type="secondary">
              <MailOutlined className="text-stone-400" />
              {record.email}
            </Text>
          )}
          {!record.phone && !record.email && (
            <Text type="secondary" className="text-sm">
              -
            </Text>
          )}
        </Space>
      ),
    },
    {
      key: 'website',
      title: t('courier.website'),
      width: '15%',
      render: (_, record) => (
        <div>
          {record.website ? (
            <Tooltip title={record.website}>
              <Tag icon={<LinkOutlined />} color="blue">
                <a href={record.website} target="_blank" rel="noopener noreferrer">
                  {tCommon('labels.website')}
                </a>
              </Tag>
            </Tooltip>
          ) : (
            <Text type="secondary" className="text-sm">
              {tCommon('messages.noData')}
            </Text>
          )}
        </div>
      ),
    },
    {
      key: 'balance',
      title: t('courier.balance'),
      dataIndex: 'current_balance',
      width: '15%',
      align: 'end',
      render: (value: unknown) => {
        const balance = Number(value) || 0;
        const isPositive = balance > 0;
        const isNegative = balance < 0;
        return (
          <Text
            className={cn(
              'font-mono',
              isPositive && 'text-emerald-600',
              isNegative && 'text-red-600'
            )}
          >
            ${Math.abs(balance).toFixed(2)}
            {isNegative && ' CR'}
          </Text>
        );
      },
    },
    {
      key: 'status',
      title: tCommon('labels.status'),
      dataIndex: 'status',
      width: '10%',
      render: (value: unknown) => {
        const statusValue = String(value || 'active');
        const statusColors: Record<string, string> = {
          active: 'green',
          inactive: 'default',
          suspended: 'red',
        };
        return (
          <Tag color={statusColors[statusValue] || 'default'}>
            {t(`courier.status.${statusValue}`)}
          </Tag>
        );
      },
    },
  ];

  // Table actions
  const actions: CatalogAction<CourierCompany>[] = [
    {
      key: 'edit',
      label: tCommon('actions.edit'),
      icon: <EditOutlined />,
      onClick: handleEdit,
      permission: 'deliveries.manage',
    },
    {
      key: 'delete',
      label: tCommon('actions.delete'),
      icon: <DeleteOutlined />,
      onClick: handleDelete,
      danger: true,
      permission: 'deliveries.manage',
      confirm: {
        title: tCommon('messages.confirmDelete'),
        description: t('courier.deleteCourierWarning'),
      },
      // Disable delete if courier has outstanding balance
      disabled: (record) => Number(record.current_balance) !== 0,
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="courier-companies-settings-page">
      {/* Page Header with Back Navigation */}
      <PageHeader
        title={t('courier.title')}
        subtitle={t('courier.noCouriersDescription')}
        showBack
        backUrl={`/${shopId}/deliveries`}
      >
        <Link href={`/${shopId}/deliveries`}>
          <Button icon={<SendOutlined />}>{t('backToDeliveries')}</Button>
        </Link>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          permission="deliveries.manage"
        >
          {t('courier.addCourier')}
        </Button>
      </PageHeader>

      {/* Couriers Table */}
      <Card bodyStyle={{ padding: 0 }}>
        <CatalogTable<CourierCompany & { id?: string; sort_order?: number | null }>
          dataSource={couriers.map((c) => ({ ...c, id: c.id_courier, sort_order: null }))}
          columns={columns}
          rowKey="id_courier"
          actions={actions}
          loading={isLoading}
          permission="deliveries.manage"
          showSortOrder={false}
          empty={{
            title: t('courier.noCouriers'),
            description: t('courier.noCouriersDescription'),
            icon: <TruckOutlined />,
            action: can('deliveries.manage')
              ? {
                  label: t('courier.addCourier'),
                  onClick: handleAdd,
                }
              : undefined,
          }}
        />
      </Card>

      {/* Add/Edit Drawer */}
      <Drawer
        open={drawerOpen}
        title={
          <div className="flex items-center gap-2">
            <TruckOutlined className="text-amber-500" />
            <span>{isEdit ? t('courier.editCourier') : t('courier.addCourier')}</span>
          </div>
        }
        onClose={handleClose}
        width={480}
        destroyOnClose
        maskClosable={!isSubmitting}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={handleClose} disabled={isSubmitting}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
              permission="deliveries.manage"
            >
              {isEdit ? tCommon('actions.save') : tCommon('actions.add')}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional" className="mt-2">
          {/* Company Name */}
          <Form.Item
            name="company_name"
            label={t('courier.companyName')}
            rules={[
              { required: true, message: tCommon('validation.required') },
              { max: 255, message: tCommon('validation.maxLength', { max: 255 }) },
            ]}
          >
            <Input
              placeholder={t('courier.companyName')}
              prefix={<TruckOutlined className="text-stone-400" />}
              autoFocus
            />
          </Form.Item>

          {/* Contact Person */}
          <Form.Item
            name="contact_person"
            label={t('courier.contactPerson')}
            rules={[{ max: 255, message: tCommon('validation.maxLength', { max: 255 }) }]}
          >
            <Input placeholder={t('courier.contactPerson')} />
          </Form.Item>

          {/* Phone and Email */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="phone"
              label={t('courier.phone')}
              rules={[{ max: 50, message: tCommon('validation.maxLength', { max: 50 }) }]}
            >
              <Input
                placeholder={t('courier.phone')}
                prefix={<PhoneOutlined className="text-stone-400" />}
              />
            </Form.Item>

            <Form.Item
              name="email"
              label={t('courier.email')}
              rules={[
                { type: 'email', message: tCommon('validation.email') },
                { max: 255, message: tCommon('validation.maxLength', { max: 255 }) },
              ]}
            >
              <Input
                placeholder={t('courier.email')}
                prefix={<MailOutlined className="text-stone-400" />}
              />
            </Form.Item>
          </div>

          {/* Website */}
          <Form.Item
            name="website"
            label={t('courier.website')}
            rules={[
              { max: 500, message: tCommon('validation.maxLength', { max: 500 }) },
              { type: 'url', message: tCommon('validation.url') },
            ]}
          >
            <Input
              placeholder="https://courier.com"
              prefix={<LinkOutlined className="text-stone-400" />}
            />
          </Form.Item>

          {/* Notes */}
          <Form.Item
            name="notes"
            label={tCommon('labels.notes')}
            rules={[{ max: 1000, message: tCommon('validation.maxLength', { max: 1000 }) }]}
          >
            <TextArea rows={3} placeholder={tCommon('labels.notes')} showCount maxLength={1000} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
