'use client';

/**
 * Edit Inventory Item Page
 *
 * Page for editing an existing inventory item.
 * Uses the ItemForm component with edit mode.
 *
 * Features:
 * - Fetches existing item data
 * - Full item form with all sections pre-filled
 * - Navigation breadcrumbs
 * - Success/error handling with notifications
 * - Loading and error states
 *
 * @module app/(platform)/[locale]/[shopId]/inventory/[itemId]/edit/page
 */

import React, { useCallback, useMemo } from 'react';

import { useParams } from 'next/navigation';

import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Breadcrumb, message, Result } from 'antd';
import { useTranslations } from 'next-intl';

import {
  ItemForm,
  ItemFormSkeleton,
  type ItemFormValues,
  type InventoryItemData,
} from '@/components/domain/inventory/ItemForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useInventoryItem } from '@/lib/hooks/data/useInventoryItem';
import { useUpdateInventoryItem } from '@/lib/hooks/data/useInventoryItems';
import { useRouter, Link } from '@/lib/i18n/navigation';
import { useShopStore } from '@/stores/shopStore';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Edit Inventory Item Page
 *
 * Renders the ItemForm component in edit mode with:
 * - Page header with breadcrumbs
 * - Back navigation
 * - Loading state while fetching item
 * - Error state if item not found
 * - Form submission handling
 * - Success/error notifications
 */
export default function EditInventoryItemPage(): JSX.Element {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const params = useParams<{ itemId: string }>();
  const itemId = params?.itemId;
  const currentShopId = useShopStore((state) => state.currentShopId);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  // Fetch the existing inventory item
  const { item, isLoading, error, isFetched } = useInventoryItem({
    itemId: itemId ?? '',
    includeStones: false,
    includeCertifications: false,
    enabled: !!itemId,
  });

  // Mutation hook for updating inventory item
  const updateItem = useUpdateInventoryItem();

  // ==========================================================================
  // TRANSFORM DATA
  // ==========================================================================

  // Convert item data to form-compatible format
  const initialData = useMemo<InventoryItemData | undefined>(() => {
    if (!item) {
      return undefined;
    }

    return {
      id_item: item.id_item,
      item_name: item.item_name,
      description: item.description,
      sku: item.sku,
      barcode: item.barcode,
      item_type: item.item_type as 'finished' | 'raw_material' | 'component',
      ownership_type: item.ownership_type as 'owned' | 'consignment' | 'memo',
      id_category: item.id_category,
      id_metal_type: item.id_metal_type,
      id_metal_purity: item.id_metal_purity,
      id_stone_type: item.id_stone_type,
      id_size: item.id_size,
      gold_color: item.gold_color as 'yellow' | 'white' | 'rose' | null,
      weight_grams: item.weight_grams,
      stone_weight_carats: item.stone_weight_carats,
      purchase_price: item.purchase_price,
      currency: item.currency,
    };
  }, [item]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: ItemFormValues) => {
      if (!itemId) {
        return;
      }

      try {
        // Update the inventory item
        await updateItem.mutateAsync({
          itemId,
          data: {
            item_name: data.item_name,
            description: data.description ?? null,
            sku: data.sku ?? null,
            barcode: data.barcode ?? null,
            item_type: data.item_type,
            ownership_type: data.ownership_type,
            status: data.status ?? 'available',
            id_category: data.id_category ?? null,
            id_metal_type: data.id_metal_type ?? null,
            id_metal_purity: data.id_metal_purity ?? null,
            id_stone_type: data.id_stone_type ?? null,
            id_size: data.id_size ?? null,
            gold_color: data.gold_color ?? null,
            weight_grams: data.weight_grams,
            stone_weight_carats: data.stone_weight_carats ?? null,
            purchase_price: data.purchase_price,
            currency: data.currency,
          },
        });

        // Show success message
        message.success(tCommon('messages.operationSuccess'));

        // Navigate back to the item detail page
        router.push(`/${currentShopId}/inventory/items/${itemId}`);
      } catch (err) {
        // Show error message
        const errorMessage =
          err instanceof Error ? err.message : tCommon('messages.operationFailed');
        message.error(errorMessage);
        throw err; // Re-throw to keep form in submitting state briefly
      }
    },
    [itemId, updateItem, currentShopId, router, tCommon]
  );

  /**
   * Handle cancel button click
   */
  const handleCancel = useCallback(() => {
    if (itemId) {
      router.push(`/${currentShopId}/inventory/items/${itemId}`);
    } else {
      router.push(`/${currentShopId}/inventory`);
    }
  }, [currentShopId, itemId, router]);

  /**
   * Handle back to list
   */
  const handleBackToList = useCallback(() => {
    router.push(`/${currentShopId}/inventory`);
  }, [currentShopId, router]);

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (isLoading) {
    return (
      <div className="edit-inventory-item-page">
        {/* Breadcrumbs */}
        <Breadcrumb
          className="mb-4"
          items={[
            {
              title: <Link href={`/${currentShopId}/inventory`}>{t('title')}</Link>,
            },
            {
              title: t('editItem'),
            },
          ]}
        />

        {/* Page Header */}
        <PageHeader title={t('editItem')} />

        {/* Loading Skeleton */}
        <div className="mt-6">
          <ItemFormSkeleton />
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ERROR STATE
  // ==========================================================================

  if (error || (isFetched && !item)) {
    return (
      <div className="edit-inventory-item-page">
        {/* Breadcrumbs */}
        <Breadcrumb
          className="mb-4"
          items={[
            {
              title: <Link href={`/${currentShopId}/inventory`}>{t('title')}</Link>,
            },
            {
              title: t('editItem'),
            },
          ]}
        />

        {/* Error Result */}
        <Result
          status="error"
          icon={<ExclamationCircleOutlined className="text-red-500" />}
          title={tCommon('messages.error')}
          subTitle={error?.message || `${t('item')} ${tCommon('messages.noResults').toLowerCase()}`}
          extra={
            <Button type="primary" onClick={handleBackToList}>
              {tCommon('actions.back')}
            </Button>
          }
        />
      </div>
    );
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <div className="edit-inventory-item-page">
      {/* Breadcrumbs */}
      <Breadcrumb
        className="mb-4"
        items={[
          {
            title: <Link href={`/${currentShopId}/inventory`}>{t('title')}</Link>,
          },
          {
            title: (
              <Link href={`/${currentShopId}/inventory/items/${itemId}`}>
                {item?.item_name || t('item')}
              </Link>
            ),
          },
          {
            title: t('editItem'),
          },
        ]}
      />

      {/* Page Header */}
      <PageHeader
        title={t('editItem')}
        subtitle={item?.item_name}
        showBack
        onBack={handleCancel}
        hideBreadcrumbs
      />

      {/* Item Form */}
      <div className="mt-6">
        <ItemForm
          mode="edit"
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={updateItem.isPending}
        />
      </div>
    </div>
  );
}
