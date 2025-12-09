'use client';

/**
 * TransferDetailDrawer Component
 *
 * Drawer displaying transfer details with items and status actions.
 *
 * Features:
 * - Transfer info header with neighbor shop and direction
 * - Items list with denormalized details
 * - Status actions (Ship, Receive, Reject)
 * - Notes display
 * - Status timeline
 * - RTL support
 *
 * @module components/domain/transfers/TransferDetailDrawer
 */

import React, { useCallback, useState } from 'react';

import {
  SwapOutlined,
  ShopOutlined,
  SendOutlined,
  InboxOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  Drawer,
  Descriptions,
  Tag,
  Table,
  Typography,
  Space,
  Divider,
  message,
  Modal,
  Input,
  Timeline,
  Empty,
} from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  type TransferWithDetails,
  type TransferStatus,
  type TransferItemWithDetails,
  useUpdateTransferStatus,
  getNeighborDisplayName,
} from '@/lib/hooks/data/useTransfers';
import { useShop } from '@/lib/hooks/shop';
import { formatCurrency, formatDate, formatWeight } from '@/lib/utils/format';

import type { ColumnsType } from 'antd/es/table';

const { Text, Title } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

interface TransferDetailDrawerProps {
  /** Whether drawer is open */
  open: boolean;
  /** Transfer data to display */
  transfer: TransferWithDetails | null;
  /** Close handler */
  onClose: () => void;
  /** Callback when status is updated */
  onStatusUpdated?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_COLORS: Record<TransferStatus, string> = {
  pending: 'blue',
  shipped: 'orange',
  received: 'green',
  rejected: 'red',
};

const STATUS_ICONS: Record<TransferStatus, React.ReactNode> = {
  pending: <SwapOutlined />,
  shipped: <RocketOutlined />,
  received: <CheckCircleOutlined />,
  rejected: <CloseCircleOutlined />,
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * TransferDetailDrawer - Display transfer details with actions
 */
export function TransferDetailDrawer({
  open,
  transfer,
  onClose,
  onStatusUpdated,
}: TransferDetailDrawerProps): React.JSX.Element {
  const t = useTranslations('transfers');
  const tCommon = useTranslations('common');
  const tInventory = useTranslations('inventory');
  const { shop } = useShop();
  const currency = shop?.currency || 'USD';

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Mutations
  const updateStatusMutation = useUpdateTransferStatus();

  // Derived state - actions depend on direction
  const isOutgoing = transfer?.direction === 'outgoing';
  const canShip = isOutgoing && transfer?.status === 'pending';
  const canReceive = !isOutgoing && transfer?.status === 'shipped';
  const canReject = !isOutgoing && transfer?.status === 'shipped';

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleShip = useCallback(async () => {
    if (!transfer) {
      return;
    }

    Modal.confirm({
      title: t('confirmShip'),
      content: t('confirmShipDescription'),
      okText: tCommon('actions.confirm'),
      cancelText: tCommon('actions.cancel'),
      onOk: async () => {
        try {
          await updateStatusMutation.mutateAsync({
            transferId: transfer.id_transfer,
            status: 'shipped',
          });
          message.success(t('transferShipped'));
          onStatusUpdated?.();
        } catch (error) {
          if (error instanceof Error) {
            message.error(error.message);
          }
        }
      },
    });
  }, [transfer, updateStatusMutation, t, tCommon, onStatusUpdated]);

  const handleReceive = useCallback(async () => {
    if (!transfer) {
      return;
    }

    Modal.confirm({
      title: t('confirmReceive'),
      content: t('confirmReceiveDescription'),
      okText: tCommon('actions.confirm'),
      cancelText: tCommon('actions.cancel'),
      onOk: async () => {
        try {
          await updateStatusMutation.mutateAsync({
            transferId: transfer.id_transfer,
            status: 'received',
          });
          message.success(t('transferReceived'));
          onStatusUpdated?.();
        } catch (error) {
          if (error instanceof Error) {
            message.error(error.message);
          }
        }
      },
    });
  }, [transfer, updateStatusMutation, t, tCommon, onStatusUpdated]);

  const handleRejectClick = useCallback(() => {
    setRejectReason('');
    setRejectModalOpen(true);
  }, []);

  const handleRejectConfirm = useCallback(async () => {
    if (!transfer) {
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        transferId: transfer.id_transfer,
        status: 'rejected',
        notes: rejectReason || undefined,
      });
      message.success(t('transferRejected'));
      setRejectModalOpen(false);
      onStatusUpdated?.();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  }, [transfer, rejectReason, updateStatusMutation, t, onStatusUpdated]);

  // ==========================================================================
  // TABLE CONFIGURATION
  // ==========================================================================

  // Use denormalized data from transfer items
  const itemColumns: ColumnsType<TransferItemWithDetails> = [
    {
      key: 'item_name',
      title: tInventory('itemName'),
      width: 200,
      ellipsis: true,
      render: (_, record) => (
        <div>
          <Text strong className="block">
            {record.item_name || '-'}
          </Text>
          {record.item_sku && (
            <Text type="secondary" className="text-xs font-mono">
              {record.item_sku}
            </Text>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      title: tInventory('category'),
      width: 120,
      render: (_, record) => <Text>{record.category_name || '-'}</Text>,
    },
    {
      key: 'weight',
      title: tInventory('weight'),
      width: 100,
      align: 'right',
      render: (_, record) => (
        <Text>{record.weight_grams ? formatWeight(record.weight_grams) : '-'}</Text>
      ),
    },
    {
      key: 'value',
      title: tInventory('purchasePrice'),
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Text>{record.item_value ? formatCurrency(record.item_value, currency) : '-'}</Text>
      ),
    },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (!transfer) {
    return (
      <Drawer open={open} onClose={onClose} width={700} title={t('transferDetails')}>
        <Empty description={t('noTransferSelected')} />
      </Drawer>
    );
  }

  const statusLabel = t(transfer.status as TransferStatus);
  const neighborDisplayName = getNeighborDisplayName(transfer.neighbor);

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        width={700}
        placement="right"
        destroyOnClose
        title={
          <div className="flex items-center gap-2">
            <SwapOutlined className="text-amber-500" />
            <span>{t('transferDetails')}</span>
          </div>
        }
        footer={
          <div className="flex justify-between">
            <div>
              {canReject && (
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={handleRejectClick}
                  loading={updateStatusMutation.isPending}
                >
                  {t('rejectTransfer')}
                </Button>
              )}
            </div>
            <Space>
              <Button onClick={onClose}>{tCommon('actions.close')}</Button>
              {canShip && (
                <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  onClick={handleShip}
                  loading={updateStatusMutation.isPending}
                >
                  {t('shipTransfer')}
                </Button>
              )}
              {canReceive && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleReceive}
                  loading={updateStatusMutation.isPending}
                >
                  {t('receiveTransfer')}
                </Button>
              )}
            </Space>
          </div>
        }
      >
        {/* Transfer Header */}
        <div className="mb-4 p-4 bg-stone-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Title level={5} className="!mb-0 font-mono">
              {transfer.transfer_number || `#${transfer.id_transfer.slice(0, 8).toUpperCase()}`}
            </Title>
            <Tag
              icon={STATUS_ICONS[transfer.status as TransferStatus]}
              color={STATUS_COLORS[transfer.status as TransferStatus]}
            >
              {statusLabel}
            </Tag>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {isOutgoing ? (
              <Tag icon={<SendOutlined />} color="blue">
                {t('outgoing')}
              </Tag>
            ) : (
              <Tag icon={<InboxOutlined />} color="purple">
                {t('incoming')}
              </Tag>
            )}
            <Text type="secondary">{formatDate(transfer.created_at || '', 'en-US', 'long')}</Text>
          </div>
        </div>

        {/* Neighbor Shop Information */}
        <Descriptions
          bordered
          size="small"
          column={1}
          className="mb-4"
          labelStyle={{ width: '140px' }}
        >
          <Descriptions.Item
            label={
              <span className="flex items-center gap-1">
                <ShopOutlined /> {isOutgoing ? t('toShop') : t('fromShop')}
              </span>
            }
          >
            <Text strong>{neighborDisplayName}</Text>
            {transfer.neighbor?.neighbor_type === 'external' && (
              <Tag className="ms-2" color="default">
                {t('externalShop')}
              </Tag>
            )}
          </Descriptions.Item>
          {transfer.total_items_count !== null && (
            <Descriptions.Item label={t('itemsCount')}>
              <Text>{transfer.total_items_count}</Text>
            </Descriptions.Item>
          )}
          {transfer.total_items_value !== null && (
            <Descriptions.Item label={t('totalValue')}>
              <Text strong>{formatCurrency(transfer.total_items_value, currency)}</Text>
            </Descriptions.Item>
          )}
          {transfer.gold_grams !== null && transfer.gold_grams > 0 && (
            <Descriptions.Item label={t('goldWeight')}>
              <Text>{formatWeight(transfer.gold_grams)}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>

        {/* Transfer Items */}
        <Divider orientation="left" className="!text-sm !text-stone-500">
          <span className="flex items-center gap-2">
            <SwapOutlined />
            {t('transferItems')} ({transfer.items?.length || 0})
          </span>
        </Divider>

        <Table<TransferItemWithDetails>
          dataSource={transfer.items || []}
          columns={itemColumns}
          rowKey="id_transfer_item"
          size="small"
          pagination={false}
          scroll={{ y: 200 }}
          className="mb-4"
          locale={{
            emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('noItems')} />,
          }}
        />

        {/* Notes */}
        {transfer.notes && (
          <>
            <Divider orientation="left" className="!text-sm !text-stone-500">
              <span className="flex items-center gap-2">
                <FileTextOutlined />
                {tCommon('labels.notes')}
              </span>
            </Divider>
            <div className="p-3 bg-stone-50 rounded-lg">
              <Text>{transfer.notes}</Text>
            </div>
          </>
        )}

        {/* Rejection Reason */}
        {transfer.status === 'rejected' && transfer.rejection_reason && (
          <>
            <Divider orientation="left" className="!text-sm !text-red-500">
              <span className="flex items-center gap-2">
                <CloseCircleOutlined />
                {t('rejectionReason')}
              </span>
            </Divider>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <Text type="danger">{transfer.rejection_reason}</Text>
            </div>
          </>
        )}

        {/* Status Timeline */}
        <Divider orientation="left" className="!text-sm !text-stone-500">
          <span className="flex items-center gap-2">
            <ClockCircleOutlined />
            {t('statusHistory')}
          </span>
        </Divider>

        <Timeline
          items={[
            {
              color: 'blue',
              children: (
                <div>
                  <Text strong>{t('created')}</Text>
                  <br />
                  <Text type="secondary" className="text-xs">
                    {formatDate(transfer.created_at || '', 'en-US', 'long')}
                  </Text>
                </div>
              ),
            },
            // Received (approved)
            ...(transfer.approved_at
              ? [
                  {
                    color: 'green' as const,
                    children: (
                      <div>
                        <Text strong>{t('received')}</Text>
                        <br />
                        <Text type="secondary" className="text-xs">
                          {formatDate(transfer.approved_at, 'en-US', 'long')}
                        </Text>
                      </div>
                    ),
                  },
                ]
              : []),
            // Rejected
            ...(transfer.rejected_at
              ? [
                  {
                    color: 'red' as const,
                    children: (
                      <div>
                        <Text strong>{t('rejected')}</Text>
                        <br />
                        <Text type="secondary" className="text-xs">
                          {formatDate(transfer.rejected_at, 'en-US', 'long')}
                        </Text>
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Drawer>

      {/* Reject Modal */}
      <Modal
        open={rejectModalOpen}
        title={t('rejectTransfer')}
        okText={t('confirmReject')}
        okButtonProps={{ danger: true }}
        cancelText={tCommon('actions.cancel')}
        onOk={handleRejectConfirm}
        onCancel={() => setRejectModalOpen(false)}
        confirmLoading={updateStatusMutation.isPending}
      >
        <div className="mb-4">
          <Text>{t('rejectDescription')}</Text>
        </div>
        <TextArea
          rows={3}
          placeholder={t('rejectionReasonPlaceholder')}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          maxLength={500}
          showCount
        />
      </Modal>
    </>
  );
}

export default TransferDetailDrawer;
