'use client';

/**
 * ItemDetailDrawer Component
 *
 * A full-featured drawer component for displaying comprehensive inventory item details.
 * Opens when clicking on an ItemCard in the inventory grid.
 *
 * Features:
 * - Image gallery with main image and thumbnail navigation
 * - Organized sections for details, stones, and certifications
 * - Status timeline/history display
 * - Permission-aware action buttons (Edit, Print Label, Status Change)
 * - RTL support with logical CSS properties
 * - Fully internationalized with next-intl
 *
 * @module components/domain/inventory/ItemDetailDrawer
 */

import React, { useState, useCallback, useMemo } from 'react';

import {
  CloseOutlined,
  EditOutlined,
  PrinterOutlined,
  TagOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  GoldOutlined,
  BarcodeOutlined,
  DollarOutlined,
  AppstoreOutlined,
  SwapOutlined,
  LeftOutlined,
  RightOutlined,
  EyeOutlined,
  ShoppingOutlined,
  StarOutlined,
  ColumnWidthOutlined,
} from '@ant-design/icons';
import {
  Drawer,
  Image,
  Tag,
  Typography,
  Space,
  Skeleton,
  Empty,
  Timeline,
  Tooltip,
  Dropdown,
  Badge,
  Descriptions,
} from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useInventoryItem } from '@/lib/hooks/data/useInventoryItem';
import type {
  ItemStoneWithType,
  ItemCertification,
  InventoryItemFull,
} from '@/lib/hooks/data/useInventoryItem';
import { useUpdateInventoryItemStatus } from '@/lib/hooks/data/useInventoryItems';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';

import type { MenuProps } from 'antd';

const { Text, Title, Paragraph } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the ItemDetailDrawer component
 */
export interface ItemDetailDrawerProps {
  /**
   * The ID of the item to display, or null if no item selected
   */
  itemId: string | null;

  /**
   * Whether the drawer is open
   */
  open: boolean;

  /**
   * Callback when the drawer should close
   */
  onClose: () => void;

  /**
   * Optional callback when edit button is clicked
   * If provided, shows an edit button in the drawer
   */
  onEdit?: (itemId: string) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Status color mapping for badges
 */
const STATUS_COLORS: Record<string, string> = {
  available: 'green',
  reserved: 'orange',
  sold: 'blue',
  workshop: 'purple',
  transferred: 'cyan',
  damaged: 'red',
  returned: 'gold',
  consignment: 'magenta',
};

/**
 * Status options for changing item status
 */
const STATUS_OPTIONS = [
  'available',
  'reserved',
  'sold',
  'workshop',
  'transferred',
  'damaged',
  'returned',
] as const;

/**
 * Placeholder image for items without images
 */
const PLACEHOLDER_IMAGE = '/images/placeholder-jewelry.svg';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format weight in grams with proper units
 */
function formatWeight(weightGrams: number | null | undefined): string {
  if (weightGrams === null || weightGrams === undefined) {
    return '-';
  }
  return `${weightGrams.toFixed(2)}g`;
}

/**
 * Format price with currency
 */
function formatPrice(price: number | null | undefined, currency: string = 'USD'): string {
  if (price === null || price === undefined) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Format date for display
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return '-';
  }

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Image Gallery Component
 */
interface ImageGalleryProps {
  images: string[];
  itemName: string;
}

function ImageGallery({ images, itemName }: ImageGalleryProps): JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  const displayImages = images.length > 0 ? images : [PLACEHOLDER_IMAGE];
  const currentImage = displayImages[activeIndex] || PLACEHOLDER_IMAGE;

  const handlePrevious = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1));
  }, [displayImages.length]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0));
  }, [displayImages.length]);

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="relative aspect-square rounded-lg overflow-hidden bg-stone-100 group">
        <Image
          src={currentImage}
          alt={itemName}
          className="w-full h-full object-cover"
          preview={{
            visible: previewVisible,
            onVisibleChange: setPreviewVisible,
            mask: (
              <div className="flex items-center justify-center gap-2">
                <EyeOutlined />
                <span>Preview</span>
              </div>
            ),
          }}
          fallback={PLACEHOLDER_IMAGE}
        />

        {/* Navigation Arrows (only show if multiple images) */}
        {displayImages.length > 1 && (
          <>
            <Button
              type="text"
              shape="circle"
              icon={<LeftOutlined />}
              onClick={handlePrevious}
              className={cn(
                'absolute start-2 top-1/2 -translate-y-1/2',
                'bg-white/80 hover:bg-white shadow-md',
                'opacity-0 group-hover:opacity-100 transition-opacity'
              )}
            />
            <Button
              type="text"
              shape="circle"
              icon={<RightOutlined />}
              onClick={handleNext}
              className={cn(
                'absolute end-2 top-1/2 -translate-y-1/2',
                'bg-white/80 hover:bg-white shadow-md',
                'opacity-0 group-hover:opacity-100 transition-opacity'
              )}
            />
          </>
        )}

        {/* Image Counter */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-2 start-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            {activeIndex + 1} / {displayImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {displayImages.map((img, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all',
                index === activeIndex
                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                  : 'border-stone-200 hover:border-amber-300'
              )}
            >
              <img
                src={img}
                alt={`${itemName} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Details Section Component
 */
interface DetailsSectionProps {
  item: InventoryItemFull;
  t: ReturnType<typeof useTranslations>;
}

function DetailsSection({ item, t }: DetailsSectionProps): JSX.Element {
  return (
    <Card className="border-stone-200">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AppstoreOutlined className="text-amber-600" />
          <Title level={5} className="!mb-0">
            {t('inventory.itemDetails')}
          </Title>
        </div>

        <Descriptions
          column={1}
          size="small"
          labelStyle={{ color: '#78716c', fontWeight: 500 }}
          contentStyle={{ color: '#1c1917' }}
        >
          {/* Category */}
          {item.category && (
            <Descriptions.Item label={t('common.labels.category')}>
              <Tag color="default">{item.category.category_name}</Tag>
            </Descriptions.Item>
          )}

          {/* Metal Type & Purity */}
          {item.metal_type && (
            <Descriptions.Item label={t('inventory.metals.title')}>
              <Space>
                <GoldOutlined className="text-amber-500" />
                <span>{item.metal_type.metal_name}</span>
                {item.metal_purity && <Tag color="gold">{item.metal_purity.purity_name}</Tag>}
              </Space>
            </Descriptions.Item>
          )}

          {/* Weight */}
          <Descriptions.Item label={t('inventory.metals.weight')}>
            <Space>
              <ColumnWidthOutlined className="text-stone-400" />
              <span className="font-medium">{formatWeight(item.weight_grams)}</span>
            </Space>
          </Descriptions.Item>

          {/* Purchase Price */}
          <Descriptions.Item label={t('inventory.pricing.costPrice')}>
            <Space>
              <DollarOutlined className="text-green-600" />
              <span className="font-semibold text-green-700">
                {formatPrice(item.purchase_price)}
              </span>
            </Space>
          </Descriptions.Item>

          {/* Size */}
          {item.size && (
            <Descriptions.Item label={t('common.labels.type')}>
              <Tag>{item.size.size_value}</Tag>
            </Descriptions.Item>
          )}

          {/* Barcode */}
          {item.barcode && (
            <Descriptions.Item label={t('inventory.barcode')}>
              <Space>
                <BarcodeOutlined className="text-stone-400" />
                <Text copyable={{ text: item.barcode }} className="font-mono">
                  {item.barcode}
                </Text>
              </Space>
            </Descriptions.Item>
          )}

          {/* Stone Type (if primary stone) */}
          {item.stone_type && (
            <Descriptions.Item label={t('inventory.stones.type')}>
              <Space>
                <StarOutlined className="text-cyan-500" />
                <span>{item.stone_type.stone_name}</span>
              </Space>
            </Descriptions.Item>
          )}

          {/* Item Type */}
          {item.item_type && (
            <Descriptions.Item label={t('common.labels.type')}>
              <Tag color="blue">{item.item_type}</Tag>
            </Descriptions.Item>
          )}

          {/* Ownership Type */}
          {item.ownership_type && (
            <Descriptions.Item label="Ownership">
              <Tag color={item.ownership_type === 'owned' ? 'green' : 'orange'}>
                {item.ownership_type}
              </Tag>
            </Descriptions.Item>
          )}

          {/* Created Date */}
          <Descriptions.Item label={t('common.labels.createdAt')}>
            {formatDate(item.created_at)}
          </Descriptions.Item>
        </Descriptions>

        {/* Description */}
        {item.description && (
          <div className="pt-2 border-t border-stone-100">
            <Text type="secondary" className="text-sm block mb-1">
              {t('common.labels.description')}
            </Text>
            <Paragraph className="!mb-0 text-stone-700">{item.description}</Paragraph>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Stones Section Component
 */
interface StonesSectionProps {
  stones: ItemStoneWithType[];
  t: ReturnType<typeof useTranslations>;
}

function StonesSection({ stones, t }: StonesSectionProps): JSX.Element {
  if (stones.length === 0) {
    return (
      <Card className="border-stone-200">
        <div className="flex items-center gap-2 mb-4">
          <StarOutlined className="text-cyan-600" />
          <Title level={5} className="!mb-0">
            {t('inventory.stones.title')}
          </Title>
          <Badge count={0} showZero className="ms-auto" />
        </div>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('common.messages.noItems')}
          className="py-4"
        />
      </Card>
    );
  }

  return (
    <Card className="border-stone-200">
      <div className="flex items-center gap-2 mb-4">
        <StarOutlined className="text-cyan-600" />
        <Title level={5} className="!mb-0">
          {t('inventory.stones.title')}
        </Title>
        <Badge count={stones.length} className="ms-auto" style={{ backgroundColor: '#0891b2' }} />
      </div>

      <div className="space-y-3">
        {stones.map((stone) => (
          <div
            key={stone.id_item_stone}
            className="flex items-start gap-3 p-3 rounded-lg bg-stone-50 border border-stone-100"
          >
            <StarOutlined className="text-cyan-500 text-lg mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Text strong className="text-stone-900">
                  {stone.stone_type?.stone_name || 'Unknown Stone'}
                </Text>
                {stone.stone_type?.category && (
                  <Tag color="cyan" className="text-xs">
                    {stone.stone_type.category}
                  </Tag>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-stone-600">
                {stone.weight_carats && (
                  <span>
                    {t('inventory.stones.carat')}: <strong>{stone.weight_carats}ct</strong>
                  </span>
                )}
                {stone.stone_count && stone.stone_count > 1 && (
                  <span>
                    {t('common.labels.quantity')}: <strong>{stone.stone_count}</strong>
                  </span>
                )}
                {stone.color && (
                  <span>
                    {t('inventory.stones.color')}: <strong>{stone.color}</strong>
                  </span>
                )}
                {stone.clarity && (
                  <span>
                    {t('inventory.stones.clarity')}: <strong>{stone.clarity}</strong>
                  </span>
                )}
                {stone.cut && (
                  <span>
                    {t('inventory.stones.cut')}: <strong>{stone.cut}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Certifications Section Component
 */
interface CertificationsSectionProps {
  certifications: ItemCertification[];
  t: ReturnType<typeof useTranslations>;
}

function CertificationsSection({ certifications, t }: CertificationsSectionProps): JSX.Element {
  if (certifications.length === 0) {
    return (
      <Card className="border-stone-200">
        <div className="flex items-center gap-2 mb-4">
          <SafetyCertificateOutlined className="text-green-600" />
          <Title level={5} className="!mb-0">
            Certifications
          </Title>
          <Badge count={0} showZero className="ms-auto" />
        </div>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('common.messages.noItems')}
          className="py-4"
        />
      </Card>
    );
  }

  return (
    <Card className="border-stone-200">
      <div className="flex items-center gap-2 mb-4">
        <SafetyCertificateOutlined className="text-green-600" />
        <Title level={5} className="!mb-0">
          Certifications
        </Title>
        <Badge
          count={certifications.length}
          className="ms-auto"
          style={{ backgroundColor: '#16a34a' }}
        />
      </div>

      <div className="space-y-3">
        {certifications.map((cert) => (
          <div
            key={cert.id_certification}
            className="p-3 rounded-lg bg-green-50 border border-green-100"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <Text strong className="text-stone-900 block">
                  {cert.certification_type}
                </Text>
                <Text type="secondary" className="text-sm">
                  {cert.issuing_authority}
                </Text>
              </div>
              <Tag color="green">{cert.certificate_number}</Tag>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-stone-600">
              {cert.issue_date && (
                <span>
                  Issued: <strong>{formatDate(cert.issue_date)}</strong>
                </span>
              )}
              {cert.expiry_date && (
                <span>
                  Expires: <strong>{formatDate(cert.expiry_date)}</strong>
                </span>
              )}
              {cert.appraised_value && (
                <span>
                  Value:{' '}
                  <strong>{formatPrice(cert.appraised_value, cert.currency || 'USD')}</strong>
                </span>
              )}
            </div>
            {cert.verification_url && (
              <a
                href={cert.verification_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-amber-600 hover:text-amber-700 mt-2 inline-block"
              >
                Verify Certificate
              </a>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Status History/Timeline Component
 */
interface StatusHistoryProps {
  item: InventoryItemFull;
  t: ReturnType<typeof useTranslations>;
}

function StatusHistory({ item, t }: StatusHistoryProps): JSX.Element {
  // For now, we show basic timeline based on creation and update dates
  // In a full implementation, this would fetch from a status_history table
  const timelineItems = useMemo(() => {
    const items = [];

    // Created entry
    items.push({
      color: 'green',
      children: (
        <div>
          <Text strong className="block">
            {t('common.actions.create')}d
          </Text>
          <Text type="secondary" className="text-xs">
            {formatDate(item.created_at)}
          </Text>
          {item.created_by_user && (
            <Text type="secondary" className="text-xs block">
              by {item.created_by_user.full_name}
            </Text>
          )}
        </div>
      ),
    });

    // Current status
    items.push({
      color: STATUS_COLORS[item.status || 'available'] || 'gray',
      children: (
        <div>
          <Text strong className="block">
            Status: {item.status || 'available'}
          </Text>
          <Text type="secondary" className="text-xs">
            Current
          </Text>
        </div>
      ),
    });

    // Last updated (if different from created)
    if (item.updated_at && item.updated_at !== item.created_at) {
      items.push({
        color: 'blue',
        children: (
          <div>
            <Text strong className="block">
              {t('common.actions.update')}d
            </Text>
            <Text type="secondary" className="text-xs">
              {formatDate(item.updated_at)}
            </Text>
            {item.updated_by_user && (
              <Text type="secondary" className="text-xs block">
                by {item.updated_by_user.full_name}
              </Text>
            )}
          </div>
        ),
      });
    }

    return items;
  }, [item, t]);

  return (
    <Card className="border-stone-200">
      <div className="flex items-center gap-2 mb-4">
        <HistoryOutlined className="text-blue-600" />
        <Title level={5} className="!mb-0">
          History
        </Title>
      </div>
      <Timeline items={timelineItems} />
    </Card>
  );
}

/**
 * Loading Skeleton Component
 */
function DrawerSkeleton(): JSX.Element {
  return (
    <div className="space-y-6 p-4">
      {/* Image skeleton */}
      <Skeleton.Image active className="!w-full !h-64" />

      {/* Title skeleton */}
      <div className="space-y-2">
        <Skeleton.Input active block />
        <Skeleton.Input active size="small" style={{ width: '50%' }} />
      </div>

      {/* Details skeleton */}
      <div className="space-y-3">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>

      {/* Stones skeleton */}
      <div className="space-y-3">
        <Skeleton.Input active size="small" style={{ width: '30%' }} />
        <Skeleton active paragraph={{ rows: 2 }} />
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ItemDetailDrawer Component
 *
 * Displays comprehensive details for an inventory item in a slide-out drawer.
 * Includes image gallery, item details, stones, certifications, and status history.
 */
export function ItemDetailDrawer({
  itemId,
  open,
  onClose,
  onEdit,
}: ItemDetailDrawerProps): JSX.Element {
  const t = useTranslations();
  const { can } = usePermissions();

  // Fetch item data
  const { item, stones, certifications, isLoading, error } = useInventoryItem({
    itemId: itemId || '',
    includeStones: true,
    includeCertifications: true,
    includePurchase: true,
    enabled: !!itemId && open,
    realtime: true,
  });

  // Status update mutation
  const updateStatus = useUpdateInventoryItemStatus();

  // Permission checks
  const canEdit = can('inventory.manage');
  const canSell = can('sales.create');

  // Handle edit button click
  const handleEdit = useCallback(() => {
    if (itemId && onEdit) {
      onEdit(itemId);
    }
  }, [itemId, onEdit]);

  // Handle status change
  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      if (!itemId) {
        return;
      }

      try {
        await updateStatus.mutateAsync({
          itemId,
          status: newStatus,
        });
      } catch (err) {
        console.error('Failed to update status:', err);
      }
    },
    [itemId, updateStatus]
  );

  // Handle print label
  const handlePrintLabel = useCallback(() => {
    // Implement print label functionality
    if (item) {
      window.print();
    }
  }, [item]);

  // Build status change menu items
  const statusMenuItems: MenuProps['items'] = useMemo(() => {
    if (!canEdit || !item) {
      return [];
    }

    return STATUS_OPTIONS.filter((status) => status !== item.status).map((status) => ({
      key: status,
      label: (
        <Space>
          <Badge color={STATUS_COLORS[status]} />
          {t(`inventory.${status}` as Parameters<typeof t>[0])}
        </Space>
      ),
      onClick: () => handleStatusChange(status),
    }));
  }, [canEdit, item, t, handleStatusChange]);

  // Get images array (mock for now - would come from file_uploads relation)
  const images = useMemo(() => {
    // In real implementation, this would be:
    // return item?.images?.map(img => img.url) || [];
    return [];
  }, []);

  // Drawer title with status badge
  const drawerTitle = useMemo(() => {
    if (!item) {
      return t('inventory.itemDetails');
    }

    return (
      <div className="flex items-center gap-3 pe-8">
        <div className="flex-1 min-w-0">
          <Title level={4} ellipsis className="!mb-0 text-stone-900">
            {item.item_name || t('common.labels.name')}
          </Title>
          <div className="flex items-center gap-2 mt-1">
            <Text type="secondary" className="text-sm">
              {t('inventory.sku')}: {item.sku || '-'}
            </Text>
            <Tag color={STATUS_COLORS[item.status || 'available']}>
              {item.status
                ? t(`inventory.${item.status}` as Parameters<typeof t>[0])
                : t('common.labels.status')}
            </Tag>
          </div>
        </div>
      </div>
    );
  }, [item, t]);

  // Drawer footer with action buttons
  const drawerFooter = useMemo(() => {
    if (!item || !canEdit) {
      return null;
    }

    return (
      <div className="flex items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-2">
          {/* Status Change Dropdown */}
          <Dropdown
            menu={{ items: statusMenuItems }}
            trigger={['click']}
            disabled={updateStatus.isPending}
          >
            <Button icon={<SwapOutlined />} loading={updateStatus.isPending}>
              {t('common.labels.status')}
            </Button>
          </Dropdown>

          {/* Print Label Button */}
          <Tooltip title={t('common.actions.print')}>
            <Button icon={<PrinterOutlined />} onClick={handlePrintLabel}>
              {t('common.actions.print')}
            </Button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          {/* Sell Button (if available and has permission) */}
          {canSell && item.status === 'available' && (
            <Button type="default" icon={<ShoppingOutlined />}>
              {t('sales.newSale')}
            </Button>
          )}

          {/* Edit Button */}
          {onEdit && canEdit && (
            <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
              {t('common.actions.edit')}
            </Button>
          )}
        </div>
      </div>
    );
  }, [
    item,
    canEdit,
    canSell,
    statusMenuItems,
    updateStatus.isPending,
    onEdit,
    handleEdit,
    handlePrintLabel,
    t,
  ]);

  return (
    <Drawer
      title={drawerTitle}
      placement="right"
      onClose={onClose}
      open={open}
      width={480}
      closeIcon={<CloseOutlined />}
      footer={drawerFooter}
      destroyOnClose
      className={cn(
        // Custom drawer styling
        '[&_.ant-drawer-header]:border-b [&_.ant-drawer-header]:border-stone-200',
        '[&_.ant-drawer-footer]:border-t [&_.ant-drawer-footer]:border-stone-200',
        '[&_.ant-drawer-body]:bg-stone-50 [&_.ant-drawer-body]:p-4'
      )}
    >
      {/* Loading State */}
      {isLoading && <DrawerSkeleton />}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Empty
            description={
              <span className="text-red-600">{t('common.messages.operationFailed')}</span>
            }
          />
          <Button onClick={onClose} className="mt-4">
            {t('common.actions.close')}
          </Button>
        </div>
      )}

      {/* No Item State */}
      {!item && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-12">
          <Empty description={t('common.messages.noData')} />
        </div>
      )}

      {/* Item Content */}
      {item && !isLoading && (
        <div className="space-y-4">
          {/* Image Gallery */}
          <Card className="border-stone-200">
            <ImageGallery images={images} itemName={item.item_name || ''} />
          </Card>

          {/* Item Details Section */}
          <DetailsSection item={item} t={t} />

          {/* Stones Section */}
          <StonesSection stones={stones} t={t} />

          {/* Certifications Section */}
          <CertificationsSection certifications={certifications} t={t} />

          {/* Status History Section */}
          <StatusHistory item={item} t={t} />

          {/* Purchase Info (if available) */}
          {item.purchase && (
            <Card className="border-stone-200">
              <div className="flex items-center gap-2 mb-4">
                <TagOutlined className="text-purple-600" />
                <Title level={5} className="!mb-0">
                  Purchase Info
                </Title>
              </div>
              <Descriptions
                column={1}
                size="small"
                labelStyle={{ color: '#78716c', fontWeight: 500 }}
              >
                {item.purchase.purchase_number && (
                  <Descriptions.Item label="Purchase #">
                    {item.purchase.purchase_number}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Purchase Date">
                  {formatDate(item.purchase.purchase_date)}
                </Descriptions.Item>
                {item.purchase.supplier && (
                  <Descriptions.Item label="Supplier">
                    {item.purchase.supplier.company_name}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}
        </div>
      )}
    </Drawer>
  );
}

export default ItemDetailDrawer;
