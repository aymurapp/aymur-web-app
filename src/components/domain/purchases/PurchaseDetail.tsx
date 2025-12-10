'use client';

/**
 * PurchaseDetail Component
 *
 * Detailed view of a purchase order showing all information,
 * line items, payment history, and supplier info.
 *
 * Features:
 * - Purchase header info (number, date, status, supplier)
 * - Line items table with totals
 * - Payment history section
 * - Supplier info card
 * - Actions: Edit (if pending), Receive, Record Payment, Cancel
 * - Status timeline/progress
 *
 * @module components/domain/purchases/PurchaseDetail
 */

import React from 'react';

import {
  EditOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ShopOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Card, Descriptions, Tag, Timeline, Space, Typography, Row, Col, Skeleton } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/ui/Button';
import type { PurchaseWithSupplier, PurchasePaymentStatus } from '@/lib/hooks/data/usePurchases';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format';

const { Title, Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface PurchaseDetailProps {
  /** Purchase data with supplier */
  purchase: PurchaseWithSupplier;
  /** Handler for edit action */
  onEdit?: () => void;
  /** Handler for record payment action */
  onRecordPayment?: () => void;
  /** Handler for cancel action */
  onCancel?: () => void;
  /** Whether data is loading */
  isLoading?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get tag color for payment status
 */
function getPaymentStatusColor(status: PurchasePaymentStatus | null): string {
  switch (status) {
    case 'paid':
      return 'success';
    case 'partial':
      return 'warning';
    case 'unpaid':
      return 'default';
    default:
      return 'default';
  }
}

/**
 * Get timeline step status
 */
function getTimelineStatus(purchase: PurchaseWithSupplier): Array<{
  label: string;
  status: 'finish' | 'process' | 'wait';
  icon: React.ReactNode;
}> {
  const isPaid = purchase.payment_status === 'paid';
  const isPartiallyPaid = purchase.payment_status === 'partial';

  return [
    {
      label: 'Created',
      status: 'finish',
      icon: <FileTextOutlined />,
    },
    {
      label: 'Payment',
      status: isPaid ? 'finish' : isPartiallyPaid ? 'process' : 'wait',
      icon: <DollarOutlined />,
    },
    {
      label: 'Completed',
      status: isPaid ? 'finish' : 'wait',
      icon: <CheckCircleOutlined />,
    },
  ];
}

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

export function PurchaseDetailSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <Card className="border border-stone-200">
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
      <Card className="border border-stone-200">
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PurchaseDetail({
  purchase,
  onEdit,
  onRecordPayment,
  onCancel,
  isLoading = false,
}: PurchaseDetailProps): React.JSX.Element {
  const t = useTranslations('purchases');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const { can } = usePermissions();
  const { shop } = useShop();
  const currency = shop?.currency || 'USD';

  // Permissions
  const canEdit = can('purchases.edit');
  const canRecordPayment = can('suppliers.payments');
  const canCancelPurchase = can('purchases.delete');

  // Calculate values
  const balanceDue = Number(purchase.total_amount) - Number(purchase.paid_amount);
  const isPaid = purchase.payment_status === 'paid';

  if (isLoading) {
    return <PurchaseDetailSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Purchase Info */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Title level={3} className="!mb-0 text-amber-700">
                {purchase.purchase_number}
              </Title>
              <Tag color={getPaymentStatusColor(purchase.payment_status)} className="text-sm">
                {purchase.payment_status ? t(`paymentStatus.${purchase.payment_status}`) : '-'}
              </Tag>
            </div>
            <div className="flex items-center gap-2 text-stone-500">
              <CalendarOutlined />
              <span>{formatDate(purchase.purchase_date, locale)}</span>
            </div>
          </div>

          {/* Actions */}
          <Space wrap>
            {canEdit && !isPaid && onEdit && (
              <Button icon={<EditOutlined />} onClick={onEdit}>
                {tCommon('actions.edit')}
              </Button>
            )}
            {canRecordPayment && !isPaid && onRecordPayment && (
              <Button type="primary" icon={<DollarOutlined />} onClick={onRecordPayment}>
                {t('recordPayment')}
              </Button>
            )}
            {canCancelPurchase && !isPaid && onCancel && (
              <Button danger icon={<CloseCircleOutlined />} onClick={onCancel}>
                {tCommon('actions.cancel')}
              </Button>
            )}
          </Space>
        </div>
      </Card>

      <Row gutter={[24, 24]}>
        {/* Left Column: Details and Items */}
        <Col xs={24} lg={16}>
          {/* Purchase Details */}
          <Card title={t('purchaseDetails')} className="border border-stone-200 mb-6">
            <Descriptions
              column={{ xs: 1, sm: 2 }}
              colon={false}
              labelStyle={{ color: '#78716c', fontWeight: 500 }}
            >
              <Descriptions.Item label={t('purchaseNumber')}>
                <Text strong>{purchase.purchase_number}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('invoiceNumber')}>
                {purchase.invoice_number || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('purchaseDate')}>
                {formatDate(purchase.purchase_date, locale)}
              </Descriptions.Item>
              <Descriptions.Item label={t('currency')}>{purchase.currency}</Descriptions.Item>
              <Descriptions.Item label={t('totalItems')}>{purchase.total_items}</Descriptions.Item>
              <Descriptions.Item label={t('totalWeight')}>
                {Number(purchase.total_weight_grams).toFixed(2)} g
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Financial Summary */}
          <Card title={t('financialSummary')} className="border border-stone-200 mb-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-stone-100">
                <Text type="secondary">{t('totalAmount')}</Text>
                <Text strong className="text-lg">
                  {formatCurrency(Number(purchase.total_amount), currency, locale)}
                </Text>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-stone-100">
                <Text type="secondary">{t('paidAmount')}</Text>
                <Text className="text-green-600">
                  {formatCurrency(Number(purchase.paid_amount), currency, locale)}
                </Text>
              </div>
              <div className="flex justify-between items-center py-2">
                <Text strong>{t('balanceDue')}</Text>
                <Title
                  level={4}
                  className={cn('!mb-0', balanceDue > 0 ? 'text-orange-500' : 'text-green-600')}
                >
                  {formatCurrency(balanceDue, currency, locale)}
                </Title>
              </div>
            </div>
          </Card>

          {/* Notes */}
          {purchase.notes && (
            <Card title={tCommon('labels.notes')} className="border border-stone-200">
              <Text className="whitespace-pre-wrap">{purchase.notes}</Text>
            </Card>
          )}
        </Col>

        {/* Right Column: Supplier and Timeline */}
        <Col xs={24} lg={8}>
          {/* Supplier Card */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <ShopOutlined className="text-amber-500" />
                {t('supplier')}
              </div>
            }
            className="border border-stone-200 mb-6"
          >
            {purchase.supplier ? (
              <div className="space-y-3">
                <div>
                  <Text strong className="text-lg block">
                    {purchase.supplier.company_name}
                  </Text>
                  {purchase.supplier.contact_person && (
                    <Text type="secondary">{purchase.supplier.contact_person}</Text>
                  )}
                </div>
                {purchase.supplier.phone && (
                  <div className="flex items-center gap-2 text-stone-600">
                    <PhoneOutlined className="text-stone-400" />
                    <a href={`tel:${purchase.supplier.phone}`} className="hover:text-amber-600">
                      {purchase.supplier.phone}
                    </a>
                  </div>
                )}
                {purchase.supplier.email && (
                  <div className="flex items-center gap-2 text-stone-600">
                    <MailOutlined className="text-stone-400" />
                    <a href={`mailto:${purchase.supplier.email}`} className="hover:text-amber-600">
                      {purchase.supplier.email}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <Text type="secondary" italic>
                {t('unknownSupplier')}
              </Text>
            )}
          </Card>

          {/* Status Timeline */}
          <Card title={t('statusTimeline')} className="border border-stone-200">
            <Timeline
              items={getTimelineStatus(purchase).map((step) => ({
                color:
                  step.status === 'finish' ? 'green' : step.status === 'process' ? 'blue' : 'gray',
                dot: step.icon,
                children: (
                  <span className={step.status === 'wait' ? 'text-stone-400' : ''}>
                    {t(`timeline.${step.label.toLowerCase()}`)}
                  </span>
                ),
              }))}
            />
          </Card>

          {/* Metadata */}
          <Card title={t('metadata')} className="border border-stone-200 mt-6" size="small">
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item label={tCommon('labels.createdAt')}>
                <Text type="secondary" className="text-xs">
                  {formatDateTime(purchase.created_at, locale)}
                </Text>
              </Descriptions.Item>
              {purchase.updated_at !== purchase.created_at && (
                <Descriptions.Item label={tCommon('labels.updatedAt')}>
                  <Text type="secondary" className="text-xs">
                    {formatDateTime(purchase.updated_at, locale)}
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default PurchaseDetail;
