'use client';

/**
 * DeliveryDetailDrawer Component
 *
 * Drawer component displaying detailed delivery information with status timeline.
 * Allows status updates and editing for non-terminal deliveries.
 *
 * Features:
 * - Delivery info header with status badge
 * - Status timeline showing delivery progress
 * - Recipient info section
 * - Delivery address display
 * - Courier info with tracking link (if template exists)
 * - Payment info showing cost and who pays
 * - Actions: Update Status, Edit (if not delivered)
 * - RTL support
 *
 * @module components/domain/deliveries/DeliveryDetailDrawer
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  TruckOutlined,
  UserOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,
  EditOutlined,
  DollarOutlined,
  FileTextOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  Drawer,
  Typography,
  Tag,
  Timeline,
  Divider,
  Space,
  Button as AntButton,
  Select,
  message,
  Modal,
  Form,
  Input,
} from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  type DeliveryWithCourier,
  type DeliveryStatus,
  useUpdateDeliveryStatus,
} from '@/lib/hooks/data/useDeliveries';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';
import { formatDate, formatDateTime } from '@/lib/utils/format';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

interface DeliveryDetailDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Delivery to display */
  delivery: DeliveryWithCourier | null;
  /** Close handler */
  onClose: () => void;
  /** Callback when status is updated */
  onStatusUpdated?: () => void;
  /** Callback to edit the delivery */
  onEdit?: (delivery: DeliveryWithCourier) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Status color mapping
 */
const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: 'blue',
  picked_up: 'cyan',
  in_transit: 'orange',
  delivered: 'green',
  failed: 'red',
  cancelled: 'default',
};

/**
 * Status icon mapping
 */
const STATUS_ICONS: Record<DeliveryStatus, React.ReactNode> = {
  pending: <ClockCircleOutlined />,
  picked_up: <TruckOutlined />,
  in_transit: <SyncOutlined spin />,
  delivered: <CheckCircleOutlined />,
  failed: <ExclamationCircleOutlined />,
  cancelled: <CloseCircleOutlined />,
};

/**
 * Valid status transitions
 */
const STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'failed'],
  delivered: [],
  failed: ['in_transit', 'delivered'],
  cancelled: [],
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Status badge component
 */
function StatusBadge({
  status,
  t,
  size = 'default',
}: {
  status: DeliveryStatus;
  t: ReturnType<typeof useTranslations>;
  size?: 'small' | 'default';
}): React.JSX.Element {
  const statusLabels: Record<DeliveryStatus, string> = {
    pending: t('status.pending'),
    picked_up: t('status.pickedUp'),
    in_transit: t('status.inTransit'),
    delivered: t('status.delivered'),
    failed: t('status.failed'),
    cancelled: t('status.cancelled'),
  };

  return (
    <Tag
      icon={STATUS_ICONS[status]}
      color={STATUS_COLORS[status]}
      className={cn(size === 'small' ? 'text-xs' : 'text-sm py-1 px-3')}
    >
      {statusLabels[status]}
    </Tag>
  );
}

/**
 * Info row component for consistent layout
 */
function InfoRow({
  icon,
  label,
  value,
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('flex items-start gap-3 py-2', className)}>
      {icon && <span className="text-stone-400 mt-0.5">{icon}</span>}
      <div className="flex-1 min-w-0">
        <Text type="secondary" className="text-xs block mb-0.5">
          {label}
        </Text>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * DeliveryDetailDrawer - Displays delivery details with status update capability
 */
export function DeliveryDetailDrawer({
  open,
  delivery,
  onClose,
  onStatusUpdated,
  onEdit,
}: DeliveryDetailDrawerProps): React.JSX.Element {
  const t = useTranslations('deliveries');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  // Status update modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<DeliveryStatus | null>(null);
  const [statusNotes, setStatusNotes] = useState('');

  // Status update mutation
  const updateStatusMutation = useUpdateDeliveryStatus();

  // Check if delivery can be edited
  const canEdit = useMemo(() => {
    if (!delivery) {
      return false;
    }
    return !['delivered', 'cancelled'].includes(delivery.status || '');
  }, [delivery]);

  // Available next statuses
  const availableStatuses = useMemo(() => {
    if (!delivery?.status) {
      return [];
    }
    return STATUS_TRANSITIONS[delivery.status as DeliveryStatus] || [];
  }, [delivery?.status]);

  // Build tracking URL - courier_companies doesn't have tracking_url_template,
  // so we just show the tracking number without a direct link
  const trackingUrl = useMemo(() => {
    // Courier companies don't have a tracking_url_template field in the schema
    // If the courier has a website, we could potentially link there
    if (!delivery?.tracking_number) {
      return null;
    }
    // Return the courier website if available (user can manually search for tracking)
    return delivery?.courier_companies?.website || null;
  }, [delivery]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleOpenStatusModal = useCallback(() => {
    setNewStatus(null);
    setStatusNotes('');
    setStatusModalOpen(true);
  }, []);

  const handleCloseStatusModal = useCallback(() => {
    setStatusModalOpen(false);
    setNewStatus(null);
    setStatusNotes('');
  }, []);

  const handleUpdateStatus = useCallback(async () => {
    if (!delivery || !newStatus) {
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        deliveryId: delivery.id_delivery,
        status: newStatus,
        notes: statusNotes.trim() || undefined,
      });

      message.success(t('statusUpdated'));
      handleCloseStatusModal();
      onStatusUpdated?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : tCommon('messages.operationFailed');
      message.error(errorMessage);
    }
  }, [
    delivery,
    newStatus,
    statusNotes,
    updateStatusMutation,
    t,
    tCommon,
    handleCloseStatusModal,
    onStatusUpdated,
  ]);

  const handleEditClick = useCallback(() => {
    if (delivery && onEdit) {
      onClose();
      onEdit(delivery);
    }
  }, [delivery, onEdit, onClose]);

  const handleOpenTrackingUrl = useCallback(() => {
    if (trackingUrl) {
      window.open(trackingUrl, '_blank', 'noopener,noreferrer');
    }
  }, [trackingUrl]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (!delivery) {
    return <Drawer open={open} onClose={onClose} width={480} />;
  }

  const courier = delivery.courier_companies;

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        width={520}
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <TruckOutlined className="text-amber-600 text-lg" />
            </div>
            <div>
              <Text strong>{t('deliveryDetails')}</Text>
              {delivery.tracking_number && (
                <Text type="secondary" className="block text-xs font-mono">
                  #{delivery.tracking_number}
                </Text>
              )}
            </div>
          </div>
        }
        footer={
          <div className="flex justify-between">
            <Space>
              {canEdit && can('deliveries.update') && availableStatuses.length > 0 && (
                <Button type="primary" icon={<SyncOutlined />} onClick={handleOpenStatusModal}>
                  {t('updateStatus')}
                </Button>
              )}
              {trackingUrl && (
                <Button icon={<LinkOutlined />} onClick={handleOpenTrackingUrl}>
                  {t('trackDelivery')}
                </Button>
              )}
            </Space>
            <Space>
              {canEdit && can('deliveries.update') && onEdit && (
                <Button icon={<EditOutlined />} onClick={handleEditClick}>
                  {tCommon('actions.edit')}
                </Button>
              )}
              <Button onClick={onClose}>{tCommon('actions.close')}</Button>
            </Space>
          </div>
        }
      >
        {/* Status Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <StatusBadge status={delivery.status as DeliveryStatus} t={t} />
            <Text type="secondary" className="text-xs">
              {formatDateTime(delivery.created_at)}
            </Text>
          </div>

          {/* Status Timeline */}
          <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
            <Text strong className="text-sm block mb-3">
              {t('timeline')}
            </Text>
            <Timeline
              items={[
                {
                  color: 'blue',
                  children: (
                    <div>
                      <Text className="block">{t('status.pending')}</Text>
                      <Text type="secondary" className="text-xs">
                        {formatDateTime(delivery.created_at)}
                      </Text>
                    </div>
                  ),
                },
                ...(delivery.shipped_date
                  ? [
                      {
                        color: 'cyan',
                        children: (
                          <div>
                            <Text className="block">{t('status.pickedUp')}</Text>
                            <Text type="secondary" className="text-xs">
                              {formatDate(delivery.shipped_date, 'en-US', 'short')}
                            </Text>
                          </div>
                        ),
                      },
                    ]
                  : []),
                ...(delivery.status === 'in_transit'
                  ? [
                      {
                        color: 'orange',
                        dot: <SyncOutlined spin />,
                        children: (
                          <div>
                            <Text className="block">{t('status.inTransit')}</Text>
                            <Text type="secondary" className="text-xs">
                              {tCommon('labels.current')}
                            </Text>
                          </div>
                        ),
                      },
                    ]
                  : []),
                ...(delivery.delivered_date
                  ? [
                      {
                        color: 'green',
                        children: (
                          <div>
                            <Text className="block">{t('status.delivered')}</Text>
                            <Text type="secondary" className="text-xs">
                              {formatDate(delivery.delivered_date, 'en-US', 'short')}
                            </Text>
                          </div>
                        ),
                      },
                    ]
                  : []),
                ...(delivery.status === 'failed'
                  ? [
                      {
                        color: 'red',
                        children: (
                          <div>
                            <Text className="block">{t('status.failed')}</Text>
                          </div>
                        ),
                      },
                    ]
                  : []),
                ...(delivery.status === 'cancelled'
                  ? [
                      {
                        color: 'gray',
                        children: (
                          <div>
                            <Text className="block">{t('status.cancelled')}</Text>
                          </div>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>

        <Divider className="!my-4" />

        {/* Recipient Info */}
        <div className="mb-4">
          <Text strong className="text-sm flex items-center gap-2 mb-2">
            <UserOutlined className="text-amber-500" />
            {t('recipientInfo')}
          </Text>
          <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
            <InfoRow label={t('recipientName')} value={delivery.recipient_name || '-'} />
          </div>
        </div>

        {/* Delivery Address */}
        {delivery.delivery_address && (
          <div className="mb-4">
            <Text strong className="text-sm flex items-center gap-2 mb-2">
              <EnvironmentOutlined className="text-amber-500" />
              {t('deliveryAddress')}
            </Text>
            <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
              <Paragraph className="!mb-0 whitespace-pre-wrap">
                {delivery.delivery_address}
              </Paragraph>
            </div>
          </div>
        )}

        <Divider className="!my-4" />

        {/* Courier Info */}
        <div className="mb-4">
          <Text strong className="text-sm flex items-center gap-2 mb-2">
            <TruckOutlined className="text-amber-500" />
            {t('courierInfo')}
          </Text>
          <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
            <InfoRow label={t('courier.companyName')} value={courier?.company_name || '-'} />
            {courier?.contact_person && (
              <InfoRow label={t('courier.contactPerson')} value={courier.contact_person} />
            )}
            {courier?.phone && (
              <InfoRow icon={<PhoneOutlined />} label={t('courier.phone')} value={courier.phone} />
            )}
            {delivery.tracking_number && (
              <InfoRow
                icon={<LinkOutlined />}
                label={t('trackingNumber')}
                value={
                  trackingUrl ? (
                    <AntButton
                      type="link"
                      size="small"
                      className="p-0 h-auto"
                      onClick={handleOpenTrackingUrl}
                    >
                      <span className="font-mono">{delivery.tracking_number}</span>
                      <LinkOutlined className="ms-1" />
                    </AntButton>
                  ) : (
                    <span className="font-mono">{delivery.tracking_number}</span>
                  )
                }
              />
            )}
          </div>
        </div>

        <Divider className="!my-4" />

        {/* Payment Info */}
        <div className="mb-4">
          <Text strong className="text-sm flex items-center gap-2 mb-2">
            <DollarOutlined className="text-amber-500" />
            {t('paymentInfo')}
          </Text>
          <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
            <InfoRow
              label={t('deliveryCost')}
              value={
                <Text className="font-mono text-lg">
                  ${Number(delivery.delivery_cost || 0).toFixed(2)}
                </Text>
              }
            />
            <InfoRow
              label={t('costPaidBy')}
              value={
                <Tag>
                  {delivery.cost_paid_by === 'shop'
                    ? t('paidByShop')
                    : delivery.cost_paid_by === 'customer'
                      ? t('paidByCustomer')
                      : t('splitCost')}
                </Tag>
              }
            />
          </div>
        </div>

        {/* Dates */}
        <div className="mb-4">
          <Text strong className="text-sm flex items-center gap-2 mb-2">
            <ClockCircleOutlined className="text-amber-500" />
            {tCommon('labels.dates')}
          </Text>
          <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
            {delivery.estimated_delivery_date && (
              <InfoRow
                label={t('estimatedDelivery')}
                value={formatDate(delivery.estimated_delivery_date, 'en-US', 'short')}
              />
            )}
            {delivery.shipped_date && (
              <InfoRow
                label={t('shippedDate')}
                value={formatDate(delivery.shipped_date, 'en-US', 'short')}
              />
            )}
            {delivery.delivered_date && (
              <InfoRow
                label={t('deliveredDate')}
                value={formatDate(delivery.delivered_date, 'en-US', 'short')}
              />
            )}
          </div>
        </div>

        {/* Notes */}
        {delivery.notes && (
          <div className="mb-4">
            <Text strong className="text-sm flex items-center gap-2 mb-2">
              <FileTextOutlined className="text-amber-500" />
              {t('notes')}
            </Text>
            <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
              <Paragraph className="!mb-0 whitespace-pre-wrap text-sm">{delivery.notes}</Paragraph>
            </div>
          </div>
        )}
      </Drawer>

      {/* Status Update Modal */}
      <Modal
        open={statusModalOpen}
        title={t('updateStatus')}
        onCancel={handleCloseStatusModal}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={handleCloseStatusModal}>{tCommon('actions.cancel')}</Button>
            <Button
              type="primary"
              onClick={handleUpdateStatus}
              loading={updateStatusMutation.isPending}
              disabled={!newStatus}
            >
              {tCommon('actions.update')}
            </Button>
          </div>
        }
        width={400}
        destroyOnClose
      >
        <Form layout="vertical" className="mt-4">
          <Form.Item label={tCommon('labels.status')}>
            <Select
              value={newStatus}
              onChange={setNewStatus}
              placeholder={tCommon('labels.select')}
              options={availableStatuses.map((status) => ({
                label: (
                  <div className="flex items-center gap-2">
                    {STATUS_ICONS[status]}
                    <span>
                      {t(
                        `status.${
                          status === 'picked_up'
                            ? 'pickedUp'
                            : status === 'in_transit'
                              ? 'inTransit'
                              : status
                        }`
                      )}
                    </span>
                  </div>
                ),
                value: status,
              }))}
            />
          </Form.Item>
          <Form.Item label={t('notes')}>
            <TextArea
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              rows={3}
              placeholder={t('notes')}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default DeliveryDetailDrawer;
