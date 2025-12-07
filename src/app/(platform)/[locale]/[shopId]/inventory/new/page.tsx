'use client';

/**
 * New Inventory Item Page
 *
 * Page for creating a new inventory item.
 * Uses the ItemForm component with create mode.
 *
 * Features:
 * - Full item form with all sections
 * - Navigation breadcrumbs
 * - Success/error handling with notifications
 * - Redirect to item detail or list on success
 *
 * @module app/(platform)/[locale]/[shopId]/inventory/new/page
 */

import React, { useCallback } from 'react';

import { Breadcrumb, message } from 'antd';
import { useTranslations } from 'next-intl';

import { ItemForm, type ItemFormValues } from '@/components/domain/inventory/ItemForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { useUser } from '@/lib/hooks/auth';
import { useCreateInventoryItem } from '@/lib/hooks/data/useInventoryItems';
import { useRouter, Link } from '@/lib/i18n/navigation';
import { useShopStore } from '@/stores/shopStore';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * New Inventory Item Page
 *
 * Renders the ItemForm component in create mode with:
 * - Page header with breadcrumbs
 * - Back navigation
 * - Form submission handling
 * - Success/error notifications
 */
export default function NewInventoryItemPage(): JSX.Element {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const currentShopId = useShopStore((state) => state.currentShopId);
  const { user } = useUser();

  // Mutation hook for creating inventory item
  const createItem = useCreateInventoryItem();

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: ItemFormValues) => {
      if (!user?.id_user) {
        message.error('User not authenticated');
        return;
      }

      try {
        // Determine source type based on ownership
        const sourceType = data.ownership_type === 'consignment' ? 'purchase' : 'purchase';

        // Create the inventory item
        const newItem = await createItem.mutateAsync({
          item_name: data.item_name,
          description: data.description ?? null,
          sku: data.sku ?? null,
          barcode: data.barcode ?? null,
          item_type: data.item_type,
          ownership_type: data.ownership_type,
          status: data.status ?? 'available',
          source_type: sourceType,
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
          created_by: user.id_user,
        });

        // Show success message
        message.success(tCommon('messages.operationSuccess'));

        // Navigate to the item detail page
        router.push(`/${currentShopId}/inventory/items/${newItem.id_item}`);
      } catch (error) {
        // Show error message
        const errorMessage =
          error instanceof Error ? error.message : tCommon('messages.operationFailed');
        message.error(errorMessage);
        throw error; // Re-throw to keep form in submitting state briefly
      }
    },
    [createItem, currentShopId, router, tCommon, user]
  );

  /**
   * Handle cancel button click
   */
  const handleCancel = useCallback(() => {
    router.push(`/${currentShopId}/inventory`);
  }, [currentShopId, router]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="new-inventory-item-page">
      {/* Breadcrumbs */}
      <Breadcrumb
        className="mb-4"
        items={[
          {
            title: <Link href={`/${currentShopId}/inventory`}>{t('title')}</Link>,
          },
          {
            title: t('addItem'),
          },
        ]}
      />

      {/* Page Header */}
      <PageHeader title={t('addItem')} showBack onBack={handleCancel} hideBreadcrumbs />

      {/* Item Form */}
      <div className="mt-6">
        <ItemForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createItem.isPending}
        />
      </div>
    </div>
  );
}
