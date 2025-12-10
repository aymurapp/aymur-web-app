'use client';

/**
 * Inventory Item Detail Page
 *
 * Displays comprehensive inventory item information with all details.
 *
 * Features:
 * - Full item details display (name, SKU, status, type)
 * - Image gallery with primary image
 * - Metal information (type, purity, color, weight)
 * - Stone information (type, setting, count)
 * - Pricing information (purchase price, markup)
 * - Source/Purchase information
 * - Tabs: Overview, Stones, Certifications
 * - Actions: Edit, Print Label, Change Status
 *
 * @module app/(platform)/[locale]/[shopId]/inventory/[itemId]/page
 */

import React, { useState, useCallback } from 'react';

import { useParams } from 'next/navigation';

import {
  EditOutlined,
  PrinterOutlined,
  TagOutlined,
  ShopOutlined,
  BarcodeOutlined,
  GoldOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  Tabs,
  Typography,
  Tag,
  Space,
  Descriptions,
  Skeleton,
  Card,
  Image,
  Row,
  Col,
  Divider,
  Empty,
} from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table, type ColumnsType } from '@/components/ui/Table';
import {
  useInventoryItem,
  type ItemStoneWithType,
  type ItemCertification,
} from '@/lib/hooks/data/useInventoryItem';
import { usePermissions } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { useRouter, Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { formatCurrency, formatDate } from '@/lib/utils/format';

const { Text, Title, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

type TabKey = 'overview' | 'stones' | 'certifications';

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_COLORS: Record<string, string> = {
  available: 'success',
  reserved: 'warning',
  sold: 'processing',
  workshop: 'purple',
  damaged: 'error',
  returned: 'cyan',
  consignment: 'gold',
};

const PLACEHOLDER_IMAGE = '/images/placeholder-jewelry.svg';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Loading skeleton for inventory item detail
 */
function DetailSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <Row gutter={[24, 24]}>
        <Col xs={24} md={10}>
          <Skeleton.Image active className="!w-full !h-80" />
        </Col>
        <Col xs={24} md={14}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Col>
      </Row>
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    </div>
  );
}

/**
 * Format weight in grams
 */
function formatWeight(weight: number | null | undefined): string {
  if (weight === null || weight === undefined) {
    return '-';
  }
  return `${weight.toFixed(2)}g`;
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function InventoryItemDetailPage(): React.JSX.Element {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const { can } = usePermissions();
  const router = useRouter();
  const params = useParams();
  const { shop } = useShop();

  const itemId = params.itemId as string;
  const shopId = params.shopId as string;
  const currency = shop?.currency || 'USD';

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { item, stones, certifications, isLoading, error, refetch } = useInventoryItem({
    itemId,
    includeStones: true,
    includeCertifications: true,
    includePurchase: true,
  });

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleEdit = useCallback(() => {
    router.push(`/${locale}/${shopId}/inventory/${itemId}/edit`);
  }, [router, locale, shopId, itemId]);

  const handlePrintLabel = useCallback(() => {
    // TODO: Implement print label functionality
    window.print();
  }, []);

  // ==========================================================================
  // STONES TABLE COLUMNS
  // ==========================================================================

  const stonesColumns: ColumnsType<ItemStoneWithType> = [
    {
      title: t('stones.stoneType'),
      dataIndex: ['stone_type', 'stone_name'],
      key: 'stone_type',
      render: (_, record) => record.stone_type?.stone_name || '-',
    },
    {
      title: t('stones.caratWeight'),
      dataIndex: 'carat_weight',
      key: 'carat_weight',
      render: (value) => (value ? `${value} ct` : '-'),
    },
    {
      title: t('stones.quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
      render: (value) => value || 1,
    },
    {
      title: t('stones.setting'),
      dataIndex: 'setting_type',
      key: 'setting_type',
      render: (value) => (value ? t(`stones.settings.${value}` as Parameters<typeof t>[0]) : '-'),
    },
    {
      title: t('stones.color'),
      dataIndex: 'color_grade',
      key: 'color_grade',
    },
    {
      title: t('stones.clarity'),
      dataIndex: 'clarity_grade',
      key: 'clarity_grade',
    },
  ];

  // ==========================================================================
  // CERTIFICATIONS TABLE COLUMNS
  // ==========================================================================

  const certificationsColumns: ColumnsType<ItemCertification> = [
    {
      title: t('certifications.type'),
      dataIndex: 'certification_type',
      key: 'certification_type',
    },
    {
      title: t('certifications.number'),
      dataIndex: 'certificate_number',
      key: 'certificate_number',
    },
    {
      title: t('certifications.authority'),
      dataIndex: 'issuing_authority',
      key: 'issuing_authority',
    },
    {
      title: t('certifications.issueDate'),
      dataIndex: 'issue_date',
      key: 'issue_date',
      render: (value) => (value ? formatDate(value, locale) : '-'),
    },
    {
      title: t('certifications.expiryDate'),
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      render: (value) => (value ? formatDate(value, locale) : '-'),
    },
    {
      title: t('certifications.appraisedValue'),
      dataIndex: 'appraised_value',
      key: 'appraised_value',
      render: (value, record) => (value ? formatCurrency(value, record.currency || currency) : '-'),
    },
  ];

  // ==========================================================================
  // TABS CONFIGURATION
  // ==========================================================================

  const tabItems = [
    {
      key: 'overview' as TabKey,
      label: (
        <span>
          <InfoCircleOutlined className="me-2" />
          {tCommon('tabs.overview')}
        </span>
      ),
      children: null, // Will render below
    },
    {
      key: 'stones' as TabKey,
      label: (
        <span>
          <GoldOutlined className="me-2" />
          {t('stones.title')} ({stones.length})
        </span>
      ),
      children: (
        <Card className="border border-stone-200">
          {stones.length > 0 ? (
            <Table
              columns={stonesColumns}
              dataSource={stones}
              rowKey="id_item_stone"
              pagination={false}
              size="small"
            />
          ) : (
            <Empty description={t('stones.noStones')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      ),
    },
    {
      key: 'certifications' as TabKey,
      label: (
        <span>
          <SafetyCertificateOutlined className="me-2" />
          {t('certifications.title')} ({certifications.length})
        </span>
      ),
      children: (
        <Card className="border border-stone-200">
          {certifications.length > 0 ? (
            <Table
              columns={certificationsColumns}
              dataSource={certifications}
              rowKey="id_certification"
              pagination={false}
              size="small"
            />
          ) : (
            <Empty
              description={t('certifications.noCertifications')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>
      ),
    },
  ];

  // ==========================================================================
  // RENDER - LOADING STATE
  // ==========================================================================

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <PageHeader title={t('itemDetails')} showBack backUrl={`/${locale}/${shopId}/inventory`} />
        <DetailSkeleton />
      </div>
    );
  }

  // ==========================================================================
  // RENDER - ERROR STATE
  // ==========================================================================

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <PageHeader title={t('itemDetails')} showBack backUrl={`/${locale}/${shopId}/inventory`} />
        <EmptyState
          icon={<ExclamationCircleOutlined className="text-4xl text-red-500" />}
          title={tCommon('messages.error')}
          description={error.message}
          action={{
            label: tCommon('actions.retry'),
            onClick: () => refetch(),
          }}
          size="lg"
        />
      </div>
    );
  }

  // ==========================================================================
  // RENDER - NOT FOUND STATE
  // ==========================================================================

  if (!item) {
    return (
      <div className="p-4 sm:p-6">
        <PageHeader title={t('itemDetails')} showBack backUrl={`/${locale}/${shopId}/inventory`} />
        <EmptyState
          title={t('itemNotFound')}
          description={t('itemNotFoundDescription')}
          action={{
            label: t('backToInventory'),
            onClick: () => router.push(`/${locale}/${shopId}/inventory`),
          }}
          size="lg"
        />
      </div>
    );
  }

  // ==========================================================================
  // RENDER - MAIN CONTENT
  // ==========================================================================

  const statusColor = STATUS_COLORS[item.status || 'available'] || 'default';
  const images = item.images || [];
  const primaryImage = item.image_url || PLACEHOLDER_IMAGE;

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={item.item_name}
        subtitle={item.sku ? `SKU: ${item.sku}` : undefined}
        showBack
        backUrl={`/${locale}/${shopId}/inventory`}
        breadcrumbOverrides={[{ key: itemId, label: item.item_name }]}
      >
        {can('inventory.manage') && (
          <>
            <Button icon={<PrinterOutlined />} onClick={handlePrintLabel}>
              {t('printLabel')}
            </Button>
            <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
              {tCommon('actions.edit')}
            </Button>
          </>
        )}
      </PageHeader>

      {/* Main Content Grid */}
      <Row gutter={[24, 24]} className="mt-6">
        {/* Image Gallery */}
        <Col xs={24} md={10} lg={8}>
          <Card className="border border-stone-200" bodyStyle={{ padding: 0 }}>
            <div className="aspect-square overflow-hidden">
              <Image
                src={primaryImage}
                alt={item.item_name}
                className="w-full h-full object-cover"
                fallback={PLACEHOLDER_IMAGE}
                preview={{
                  visible: false,
                }}
              />
            </div>
            {images.length > 1 && (
              <div className="p-3 border-t border-stone-200">
                <Image.PreviewGroup>
                  <Space wrap size={8}>
                    {images.map((img) => (
                      <Image
                        key={img.id_file}
                        src={img.file_url}
                        alt={img.file_name}
                        width={60}
                        height={60}
                        className="object-cover rounded cursor-pointer border border-stone-200"
                        fallback={PLACEHOLDER_IMAGE}
                      />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              </div>
            )}
          </Card>

          {/* Quick Info Card */}
          <Card className="border border-stone-200 mt-4">
            <div className="flex items-center justify-between mb-4">
              <Text strong>{t('status')}</Text>
              <Tag color={statusColor}>{t(`${item.status}` as Parameters<typeof t>[0])}</Tag>
            </div>
            <Divider className="my-3" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Text type="secondary">{t('itemType')}</Text>
                <Text>{t(`types.${item.item_type}` as Parameters<typeof t>[0])}</Text>
              </div>
              <div className="flex items-center justify-between">
                <Text type="secondary">{t('ownershipType')}</Text>
                <Text>{t(`ownership.${item.ownership_type}` as Parameters<typeof t>[0])}</Text>
              </div>
              {item.barcode && (
                <div className="flex items-center justify-between">
                  <Text type="secondary">
                    <BarcodeOutlined className="me-1" />
                    {t('barcode')}
                  </Text>
                  <Text copyable>{item.barcode}</Text>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* Details Section */}
        <Col xs={24} md={14} lg={16}>
          {/* Price Card */}
          <Card className="border border-stone-200 mb-4">
            <div className="text-center py-2">
              <Text type="secondary" className="text-sm block mb-1">
                {t('purchasePrice')}
              </Text>
              <Title level={3} className="!mb-0 !text-amber-600">
                {formatCurrency(item.purchase_price || 0, currency)}
              </Title>
            </div>
          </Card>

          {/* Tabs for Overview, Stones, Certifications */}
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
            items={tabItems}
          />

          {/* Overview Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Metal Details */}
              <Card
                title={
                  <span>
                    <GoldOutlined className="me-2 text-amber-500" />
                    {t('metals.title')}
                  </span>
                }
                className="border border-stone-200"
                size="small"
              >
                <Descriptions column={{ xs: 1, sm: 2, md: 2 }} size="small">
                  <Descriptions.Item label={t('metals.metalType')}>
                    {item.metal_type?.metal_name || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('metals.purity')}>
                    {item.metal_purity?.purity_name || '-'}
                    {item.metal_purity?.purity_percentage && (
                      <Text type="secondary" className="ms-1">
                        ({item.metal_purity.purity_percentage}%)
                      </Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('metals.color')}>
                    {item.gold_color
                      ? t(`metals.colors.${item.gold_color}` as Parameters<typeof t>[0])
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('metals.weight')}>
                    {formatWeight(item.weight_grams)}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Stone Details */}
              {(item.stone_type || item.stone_weight_carats) && (
                <Card
                  title={
                    <span>
                      <TagOutlined className="me-2 text-blue-500" />
                      {t('stones.title')}
                    </span>
                  }
                  className="border border-stone-200"
                  size="small"
                >
                  <Descriptions column={{ xs: 1, sm: 2, md: 2 }} size="small">
                    <Descriptions.Item label={t('stones.primaryStone')}>
                      {item.stone_type?.stone_name || '-'}
                    </Descriptions.Item>
                    {item.stone_weight_carats && (
                      <Descriptions.Item label={t('stones.totalCarats')}>
                        {item.stone_weight_carats} ct
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              )}

              {/* Category & Size */}
              <Card
                title={
                  <span>
                    <FileTextOutlined className="me-2 text-stone-500" />
                    {t('additionalInfo')}
                  </span>
                }
                className="border border-stone-200"
                size="small"
              >
                <Descriptions column={{ xs: 1, sm: 2, md: 2 }} size="small">
                  <Descriptions.Item label={tCommon('labels.category')}>
                    {item.category?.category_name || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('size')}>
                    {item.size?.size_value || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('source._label')}>
                    {item.source_type
                      ? t(`source.${item.source_type}` as Parameters<typeof t>[0])
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('createdAt')}>
                    {formatDate(item.created_at, locale)}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Purchase/Source Info */}
              {item.purchase && (
                <Card
                  title={
                    <span>
                      <ShopOutlined className="me-2 text-green-500" />
                      {t('purchaseInfo')}
                    </span>
                  }
                  className="border border-stone-200"
                  size="small"
                >
                  <Descriptions column={{ xs: 1, sm: 2, md: 2 }} size="small">
                    <Descriptions.Item label={t('purchaseNumber')}>
                      <Link href={`/${locale}/${shopId}/purchases/${item.purchase.id_purchase}`}>
                        {item.purchase.purchase_number || item.purchase.id_purchase}
                      </Link>
                    </Descriptions.Item>
                    <Descriptions.Item label={t('purchaseDate')}>
                      {formatDate(item.purchase.purchase_date, locale)}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('supplier')}>
                      {item.purchase.supplier ? (
                        <Link
                          href={`/${locale}/${shopId}/suppliers/${item.purchase.supplier.id_supplier}`}
                        >
                          {item.purchase.supplier.company_name}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}

              {/* Description */}
              {item.description && (
                <Card
                  title={tCommon('labels.description')}
                  className="border border-stone-200"
                  size="small"
                >
                  <Paragraph className="!mb-0">{item.description}</Paragraph>
                </Card>
              )}
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
}
