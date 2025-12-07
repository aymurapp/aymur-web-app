'use server';

/**
 * Inventory Server Actions
 *
 * Server-side actions for managing inventory items in the Aymur Platform.
 * These actions handle CRUD operations for inventory items, stones, and certifications.
 *
 * Key features:
 * - Full CRUD for inventory items
 * - Stone management (add/remove stones from items)
 * - Certification management (add/remove certifications)
 * - Status transition validation
 * - Auto-generated SKU/barcode with shop code prefix
 * - Zod validation for all inputs
 * - RLS-based multi-tenant security (shop_id context)
 * - Soft delete pattern for inventory items
 * - Optimistic locking via version field
 *
 * RLS Note: All queries are automatically filtered by get_user_shop_ids()
 * embedded in JWT claims. No manual shop filtering needed.
 *
 * @module lib/actions/inventory
 */

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/types/database';
import {
  inventoryItemSimpleSchema,
  inventoryItemUpdateSchema,
  inventoryStatusEnum,
  itemStoneCreateSchema,
  itemCertificationCreateSchema,
  type InventoryStatus,
} from '@/lib/utils/schemas/inventory';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Generic action result type for consistent error handling.
 * All server actions should return this type.
 */
export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; code?: string };

// Database row types
type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type ItemStone = Database['public']['Tables']['item_stones']['Row'];
type ItemCertification = Database['public']['Tables']['item_certifications']['Row'];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Create inventory item schema - extends simple schema with shop_id
 */
const CreateInventoryItemSchema = inventoryItemSimpleSchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
});

/**
 * Update inventory item schema - requires item ID
 */
const UpdateInventoryItemSchema = inventoryItemUpdateSchema.extend({
  id_item: z.string().uuid('Invalid item ID'),
});

/**
 * Status update schema with reason
 */
const UpdateItemStatusSchema = z.object({
  id_item: z.string().uuid('Invalid item ID'),
  status: inventoryStatusEnum,
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
});

/**
 * Add stone to item schema
 */
const AddItemStoneSchema = itemStoneCreateSchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
});

/**
 * Add certification to item schema
 * Note: itemCertificationCreateSchema is a ZodEffects (has refinements),
 * so we use z.intersection to add the shop ID field instead of .extend()
 */
const AddItemCertificationSchema = z.intersection(
  itemCertificationCreateSchema,
  z.object({
    id_shop: z.string().uuid('Invalid shop ID'),
  })
);

// =============================================================================
// STATUS TRANSITION RULES
// =============================================================================

/**
 * Valid status transitions map.
 * Defines which statuses can transition to which other statuses.
 *
 * Status Flow:
 * - available: Initial state, can go to reserved, sold, workshop, transferred, damaged
 * - reserved: Can go back to available, or proceed to sold
 * - sold: Terminal state for sales (can be returned)
 * - workshop: Item is being repaired/modified, returns to available
 * - transferred: Item moved to another shop
 * - damaged: Item is damaged, can be returned or stay damaged
 * - returned: Item returned by customer, goes back to available or damaged
 */
const STATUS_TRANSITIONS: Record<InventoryStatus, InventoryStatus[]> = {
  available: ['reserved', 'sold', 'workshop', 'transferred', 'damaged'],
  reserved: ['available', 'sold'],
  sold: ['returned'],
  workshop: ['available', 'damaged'],
  transferred: ['available'], // When transfer is cancelled or item returns
  damaged: ['available', 'returned'], // Can be repaired or returned to supplier
  returned: ['available', 'damaged'],
};

/**
 * Validates if a status transition is allowed.
 */
function isValidStatusTransition(
  currentStatus: InventoryStatus,
  newStatus: InventoryStatus
): boolean {
  if (currentStatus === newStatus) {
    return true;
  } // No change
  return STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the authenticated user and their public.users record.
 * Returns null if not authenticated.
 */
async function getAuthenticatedUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Get the public.users record
  const { data: publicUser, error: userError } = await supabase
    .from('users')
    .select('id_user')
    .eq('auth_id', user.id)
    .single();

  if (userError || !publicUser) {
    return null;
  }

  return { authUser: user, publicUser };
}

/**
 * Standard revalidation paths for inventory changes
 */
function revalidateInventoryPaths(shopId: string, locale: string = 'en') {
  revalidatePath(`/${locale}/${shopId}/inventory`, 'page');
  revalidatePath(`/${locale}/${shopId}/inventory/[itemId]`, 'page');
  revalidatePath(`/${locale}/${shopId}`, 'layout');
}

/**
 * Generates a unique SKU for an inventory item.
 * Format: {SHOP_CODE}-{CATEGORY_PREFIX}-{TIMESTAMP}-{RANDOM}
 * Example: AYM-RNG-1701234567-A1B2
 */
async function generateSKU(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shopId: string,
  categoryId?: string | null
): Promise<string> {
  // Get shop code (first 3 chars of shop name, uppercase)
  const { data: shop } = await supabase
    .from('shops')
    .select('shop_name')
    .eq('id_shop', shopId)
    .single();

  const shopCode = shop?.shop_name
    ? shop.shop_name
        .substring(0, 3)
        .toUpperCase()
        .replace(/[^A-Z]/g, 'X')
    : 'SHP';

  // Get category prefix if category provided
  let categoryPrefix = 'ITM';
  if (categoryId) {
    const { data: category } = await supabase
      .from('product_categories')
      .select('category_name')
      .eq('id_category', categoryId)
      .single();

    if (category?.category_name) {
      categoryPrefix = category.category_name
        .substring(0, 3)
        .toUpperCase()
        .replace(/[^A-Z]/g, 'X');
    }
  }

  // Generate timestamp component (last 6 digits of unix timestamp)
  const timestamp = Date.now().toString().slice(-6);

  // Generate random suffix (4 alphanumeric chars)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomSuffix = '';
  for (let i = 0; i < 4; i++) {
    randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${shopCode}-${categoryPrefix}-${timestamp}-${randomSuffix}`;
}

/**
 * Generates a unique barcode for an inventory item.
 * Format: {SHOP_ID_SHORT}-{TIMESTAMP}-{SEQUENCE}
 * Example: A1B2C3-1701234567890-0001
 */
async function generateBarcode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shopId: string
): Promise<string> {
  // Use first 6 chars of shop UUID (without dashes)
  const shopShort = shopId.replace(/-/g, '').substring(0, 6).toUpperCase();

  // Full timestamp for uniqueness
  const timestamp = Date.now().toString();

  // Get count of items in shop for sequence
  const { count } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('id_shop', shopId);

  const sequence = ((count || 0) + 1).toString().padStart(4, '0');

  return `${shopShort}-${timestamp}-${sequence}`;
}

// =============================================================================
// INVENTORY ITEM ACTIONS
// =============================================================================

/**
 * Creates a new inventory item.
 *
 * Features:
 * - Auto-generates SKU if not provided
 * - Auto-generates barcode if not provided
 * - Validates all foreign key references
 * - Sets initial status to 'available'
 *
 * @param input - The inventory item data
 * @returns ActionResult with the created item on success
 */
export async function createItem(
  input: z.infer<typeof CreateInventoryItemSchema>
): Promise<ActionResult<InventoryItem>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateInventoryItemSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const validatedData = validationResult.data;
    const { id_shop } = validatedData;

    // 3. Validate foreign key references if provided
    if (validatedData.id_category) {
      const { data: category } = await supabase
        .from('product_categories')
        .select('id_category')
        .eq('id_category', validatedData.id_category)
        .eq('id_shop', id_shop)
        .is('deleted_at', null)
        .single();

      if (!category) {
        return {
          success: false,
          error: 'Product category not found',
          code: 'invalid_category',
        };
      }
    }

    if (validatedData.id_metal_type) {
      const { data: metalType } = await supabase
        .from('metal_types')
        .select('id_metal_type')
        .eq('id_metal_type', validatedData.id_metal_type)
        .eq('id_shop', id_shop)
        .is('deleted_at', null)
        .single();

      if (!metalType) {
        return {
          success: false,
          error: 'Metal type not found',
          code: 'invalid_metal_type',
        };
      }
    }

    if (validatedData.id_metal_purity) {
      const { data: purity } = await supabase
        .from('metal_purities')
        .select('id_purity')
        .eq('id_purity', validatedData.id_metal_purity)
        .eq('id_shop', id_shop)
        .is('deleted_at', null)
        .single();

      if (!purity) {
        return {
          success: false,
          error: 'Metal purity not found',
          code: 'invalid_metal_purity',
        };
      }
    }

    if (validatedData.id_stone_type) {
      const { data: stoneType } = await supabase
        .from('stone_types')
        .select('id_stone_type')
        .eq('id_stone_type', validatedData.id_stone_type)
        .eq('id_shop', id_shop)
        .is('deleted_at', null)
        .single();

      if (!stoneType) {
        return {
          success: false,
          error: 'Stone type not found',
          code: 'invalid_stone_type',
        };
      }
    }

    if (validatedData.id_size) {
      const { data: size } = await supabase
        .from('product_sizes')
        .select('id_size')
        .eq('id_size', validatedData.id_size)
        .eq('id_shop', id_shop)
        .single();

      if (!size) {
        return {
          success: false,
          error: 'Product size not found',
          code: 'invalid_size',
        };
      }
    }

    // 4. Generate SKU and barcode if not provided
    const sku =
      validatedData.sku || (await generateSKU(supabase, id_shop, validatedData.id_category));
    const barcode = validatedData.barcode || (await generateBarcode(supabase, id_shop));

    // 5. Check for duplicate SKU in shop
    const { data: existingSku } = await supabase
      .from('inventory_items')
      .select('id_item')
      .eq('id_shop', id_shop)
      .eq('sku', sku)
      .is('deleted_at', null)
      .single();

    if (existingSku) {
      return {
        success: false,
        error: 'An item with this SKU already exists',
        code: 'duplicate_sku',
      };
    }

    // 6. Check for duplicate barcode in shop
    const { data: existingBarcode } = await supabase
      .from('inventory_items')
      .select('id_item')
      .eq('id_shop', id_shop)
      .eq('barcode', barcode)
      .is('deleted_at', null)
      .single();

    if (existingBarcode) {
      return {
        success: false,
        error: 'An item with this barcode already exists',
        code: 'duplicate_barcode',
      };
    }

    // 7. Create inventory item
    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        id_shop,
        item_name: validatedData.item_name,
        description: validatedData.description ?? null,
        sku,
        barcode,
        source_type: 'purchase', // Default source type for simple creation
        item_type: validatedData.item_type ?? 'finished',
        ownership_type: validatedData.ownership_type ?? 'owned',
        status: validatedData.status ?? 'available',
        weight_grams: validatedData.weight_grams,
        stone_weight_carats: validatedData.stone_weight_carats ?? null,
        purchase_price: validatedData.purchase_price,
        currency: validatedData.currency,
        id_category: validatedData.id_category ?? null,
        id_metal_type: validatedData.id_metal_type ?? null,
        id_metal_purity: validatedData.id_metal_purity ?? null,
        id_stone_type: validatedData.id_stone_type ?? null,
        id_size: validatedData.id_size ?? null,
        gold_color: validatedData.gold_color ?? null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (error) {
      console.error('[createItem] Database error:', error);
      return {
        success: false,
        error: 'Failed to create inventory item',
        code: 'database_error',
      };
    }

    // 8. Revalidate paths
    revalidateInventoryPaths(id_shop);

    return {
      success: true,
      data,
      message: 'Inventory item created successfully',
    };
  } catch (err) {
    console.error('[createItem] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates an existing inventory item.
 *
 * Features:
 * - Validates all foreign key references
 * - Prevents updates to sold/transferred items without proper status change
 * - Uses optimistic locking via version field
 *
 * @param input - The inventory item update data
 * @returns ActionResult with the updated item on success
 */
export async function updateItem(
  input: z.infer<typeof UpdateInventoryItemSchema>
): Promise<ActionResult<InventoryItem>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateInventoryItemSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_item, ...updateData } = validationResult.data;

    // 3. Get existing item
    const { data: existingItem, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id_shop, status, version, sku, barcode')
      .eq('id_item', id_item)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingItem) {
      return {
        success: false,
        error: 'Inventory item not found',
        code: 'not_found',
      };
    }

    // 4. Check if item can be updated (not sold or transferred)
    if (existingItem.status === 'sold' || existingItem.status === 'transferred') {
      return {
        success: false,
        error: `Cannot update item with status '${existingItem.status}'`,
        code: 'invalid_status',
      };
    }

    const shopId = existingItem.id_shop;

    // 5. Validate foreign key references if provided
    if (updateData.id_category) {
      const { data: category } = await supabase
        .from('product_categories')
        .select('id_category')
        .eq('id_category', updateData.id_category)
        .eq('id_shop', shopId)
        .is('deleted_at', null)
        .single();

      if (!category) {
        return {
          success: false,
          error: 'Product category not found',
          code: 'invalid_category',
        };
      }
    }

    if (updateData.id_metal_type) {
      const { data: metalType } = await supabase
        .from('metal_types')
        .select('id_metal_type')
        .eq('id_metal_type', updateData.id_metal_type)
        .eq('id_shop', shopId)
        .is('deleted_at', null)
        .single();

      if (!metalType) {
        return {
          success: false,
          error: 'Metal type not found',
          code: 'invalid_metal_type',
        };
      }
    }

    if (updateData.id_metal_purity) {
      const { data: purity } = await supabase
        .from('metal_purities')
        .select('id_purity')
        .eq('id_purity', updateData.id_metal_purity)
        .eq('id_shop', shopId)
        .is('deleted_at', null)
        .single();

      if (!purity) {
        return {
          success: false,
          error: 'Metal purity not found',
          code: 'invalid_metal_purity',
        };
      }
    }

    if (updateData.id_stone_type) {
      const { data: stoneType } = await supabase
        .from('stone_types')
        .select('id_stone_type')
        .eq('id_stone_type', updateData.id_stone_type)
        .eq('id_shop', shopId)
        .is('deleted_at', null)
        .single();

      if (!stoneType) {
        return {
          success: false,
          error: 'Stone type not found',
          code: 'invalid_stone_type',
        };
      }
    }

    if (updateData.id_size) {
      const { data: size } = await supabase
        .from('product_sizes')
        .select('id_size')
        .eq('id_size', updateData.id_size)
        .eq('id_shop', shopId)
        .single();

      if (!size) {
        return {
          success: false,
          error: 'Product size not found',
          code: 'invalid_size',
        };
      }
    }

    // 6. Check for duplicate SKU if being changed
    if (updateData.sku && updateData.sku !== existingItem.sku) {
      const { data: existingSku } = await supabase
        .from('inventory_items')
        .select('id_item')
        .eq('id_shop', shopId)
        .eq('sku', updateData.sku)
        .is('deleted_at', null)
        .neq('id_item', id_item)
        .single();

      if (existingSku) {
        return {
          success: false,
          error: 'An item with this SKU already exists',
          code: 'duplicate_sku',
        };
      }
    }

    // 7. Check for duplicate barcode if being changed
    if (updateData.barcode && updateData.barcode !== existingItem.barcode) {
      const { data: existingBarcode } = await supabase
        .from('inventory_items')
        .select('id_item')
        .eq('id_shop', shopId)
        .eq('barcode', updateData.barcode)
        .is('deleted_at', null)
        .neq('id_item', id_item)
        .single();

      if (existingBarcode) {
        return {
          success: false,
          error: 'An item with this barcode already exists',
          code: 'duplicate_barcode',
        };
      }
    }

    // 8. Update inventory item with optimistic locking
    const { data, error } = await supabase
      .from('inventory_items')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
        version: existingItem.version + 1,
      })
      .eq('id_item', id_item)
      .eq('version', existingItem.version) // Optimistic locking
      .select()
      .single();

    if (error) {
      console.error('[updateItem] Database error:', error);
      return {
        success: false,
        error: 'Failed to update inventory item',
        code: 'database_error',
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Item was modified by another user. Please refresh and try again.',
        code: 'concurrent_modification',
      };
    }

    // 9. Revalidate paths
    revalidateInventoryPaths(shopId);

    return {
      success: true,
      data,
      message: 'Inventory item updated successfully',
    };
  } catch (err) {
    console.error('[updateItem] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates the status of an inventory item.
 *
 * Features:
 * - Validates status transitions according to business rules
 * - Records reason for status change
 * - Uses optimistic locking
 *
 * Valid Transitions:
 * - available -> reserved, sold, workshop, transferred, damaged
 * - reserved -> available, sold
 * - sold -> returned
 * - workshop -> available, damaged
 * - transferred -> available
 * - damaged -> available, returned
 * - returned -> available, damaged
 *
 * @param input - The status update data
 * @returns ActionResult with the updated item on success
 */
export async function updateItemStatus(
  input: z.infer<typeof UpdateItemStatusSchema>
): Promise<ActionResult<InventoryItem>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateItemStatusSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_item, status: newStatus, reason } = validationResult.data;

    // 3. Get existing item
    const { data: existingItem, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id_shop, status, version')
      .eq('id_item', id_item)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingItem) {
      return {
        success: false,
        error: 'Inventory item not found',
        code: 'not_found',
      };
    }

    const currentStatus = existingItem.status as InventoryStatus;

    // 4. Validate status transition
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      return {
        success: false,
        error: `Cannot transition from '${currentStatus}' to '${newStatus}'`,
        code: 'invalid_transition',
      };
    }

    // 5. Update status with optimistic locking
    const { data, error } = await supabase
      .from('inventory_items')
      .update({
        status: newStatus,
        description: reason ? `${existingItem.status} -> ${newStatus}: ${reason}` : undefined,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
        version: existingItem.version + 1,
      })
      .eq('id_item', id_item)
      .eq('version', existingItem.version)
      .select()
      .single();

    if (error) {
      console.error('[updateItemStatus] Database error:', error);
      return {
        success: false,
        error: 'Failed to update item status',
        code: 'database_error',
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Item was modified by another user. Please refresh and try again.',
        code: 'concurrent_modification',
      };
    }

    // 6. Revalidate paths
    revalidateInventoryPaths(existingItem.id_shop);

    return {
      success: true,
      data,
      message: `Item status changed from '${currentStatus}' to '${newStatus}'`,
    };
  } catch (err) {
    console.error('[updateItemStatus] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Soft deletes an inventory item.
 *
 * Note: Items with certain statuses cannot be deleted.
 *
 * @param id_item - The item ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteItem(id_item: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid item ID');
    const validationResult = uuidSchema.safeParse(id_item);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid item ID',
        code: 'validation_error',
      };
    }

    // 3. Get item
    const { data: item, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id_shop, status')
      .eq('id_item', id_item)
      .is('deleted_at', null)
      .single();

    if (fetchError || !item) {
      return {
        success: false,
        error: 'Inventory item not found',
        code: 'not_found',
      };
    }

    // 4. Check if item can be deleted
    const nonDeletableStatuses: InventoryStatus[] = ['sold', 'reserved', 'workshop', 'transferred'];
    if (nonDeletableStatuses.includes(item.status as InventoryStatus)) {
      return {
        success: false,
        error: `Cannot delete item with status '${item.status}'`,
        code: 'invalid_status',
      };
    }

    // 5. Soft delete
    const { error } = await supabase
      .from('inventory_items')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_item', id_item);

    if (error) {
      console.error('[deleteItem] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete inventory item',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateInventoryPaths(item.id_shop);

    return {
      success: true,
      message: 'Inventory item deleted successfully',
    };
  } catch (err) {
    console.error('[deleteItem] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// ITEM STONES ACTIONS
// =============================================================================

/**
 * Adds a stone to an inventory item.
 *
 * Features:
 * - Validates stone type exists
 * - Validates item exists and belongs to same shop
 * - Updates item's total stone weight
 *
 * @param input - The stone data
 * @returns ActionResult with the created stone on success
 */
export async function addItemStones(
  input: z.infer<typeof AddItemStoneSchema>
): Promise<ActionResult<ItemStone>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = AddItemStoneSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const validatedData = validationResult.data;
    const { id_shop, id_item, id_stone_type } = validatedData;

    // 3. Verify item exists and belongs to shop
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('id_item, id_shop, stone_weight_carats')
      .eq('id_item', id_item)
      .eq('id_shop', id_shop)
      .is('deleted_at', null)
      .single();

    if (itemError || !item) {
      return {
        success: false,
        error: 'Inventory item not found',
        code: 'not_found',
      };
    }

    // 4. Verify stone type exists
    const { data: stoneType, error: stoneTypeError } = await supabase
      .from('stone_types')
      .select('id_stone_type')
      .eq('id_stone_type', id_stone_type)
      .eq('id_shop', id_shop)
      .is('deleted_at', null)
      .single();

    if (stoneTypeError || !stoneType) {
      return {
        success: false,
        error: 'Stone type not found',
        code: 'invalid_stone_type',
      };
    }

    // 5. Create item stone
    const { data, error } = await supabase
      .from('item_stones')
      .insert({
        id_shop,
        id_item,
        id_stone_type,
        weight_carats: validatedData.weight_carats,
        stone_count: validatedData.stone_count ?? 1,
        position: validatedData.position ?? null,
        clarity: validatedData.clarity ?? null,
        color: validatedData.color ?? null,
        cut: validatedData.cut ?? null,
        estimated_value: validatedData.estimated_value ?? null,
        notes: validatedData.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('[addItemStones] Database error:', error);
      return {
        success: false,
        error: 'Failed to add stone to item',
        code: 'database_error',
      };
    }

    // 6. Update item's total stone weight
    const currentStoneWeight = Number(item.stone_weight_carats) || 0;
    const newStoneWeight = currentStoneWeight + validatedData.weight_carats;

    await supabase
      .from('inventory_items')
      .update({
        stone_weight_carats: newStoneWeight,
        updated_at: new Date().toISOString(),
      })
      .eq('id_item', id_item);

    // 7. Revalidate paths
    revalidateInventoryPaths(id_shop);

    return {
      success: true,
      data,
      message: 'Stone added to item successfully',
    };
  } catch (err) {
    console.error('[addItemStones] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Removes a stone from an inventory item.
 *
 * Features:
 * - Hard deletes the stone record
 * - Updates item's total stone weight
 *
 * @param id_item_stone - The stone ID to remove
 * @returns ActionResult indicating success or failure
 */
export async function removeItemStone(id_item_stone: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid stone ID');
    const validationResult = uuidSchema.safeParse(id_item_stone);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid stone ID',
        code: 'validation_error',
      };
    }

    // 3. Get stone with item info
    const { data: stone, error: fetchError } = await supabase
      .from('item_stones')
      .select('id_item_stone, id_item, id_shop, weight_carats')
      .eq('id_item_stone', id_item_stone)
      .single();

    if (fetchError || !stone) {
      return {
        success: false,
        error: 'Stone not found',
        code: 'not_found',
      };
    }

    // 4. Get current item stone weight
    const { data: item } = await supabase
      .from('inventory_items')
      .select('stone_weight_carats')
      .eq('id_item', stone.id_item)
      .single();

    // 5. Delete stone
    const { error } = await supabase
      .from('item_stones')
      .delete()
      .eq('id_item_stone', id_item_stone);

    if (error) {
      console.error('[removeItemStone] Database error:', error);
      return {
        success: false,
        error: 'Failed to remove stone from item',
        code: 'database_error',
      };
    }

    // 6. Update item's total stone weight
    if (item) {
      const currentStoneWeight = Number(item.stone_weight_carats) || 0;
      const newStoneWeight = Math.max(0, currentStoneWeight - Number(stone.weight_carats));

      await supabase
        .from('inventory_items')
        .update({
          stone_weight_carats: newStoneWeight,
          updated_at: new Date().toISOString(),
        })
        .eq('id_item', stone.id_item);
    }

    // 7. Revalidate paths
    revalidateInventoryPaths(stone.id_shop);

    return {
      success: true,
      message: 'Stone removed from item successfully',
    };
  } catch (err) {
    console.error('[removeItemStone] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// ITEM CERTIFICATIONS ACTIONS
// =============================================================================

/**
 * Adds a certification to an inventory item.
 *
 * Features:
 * - Validates item exists and belongs to same shop
 * - Validates file upload reference if provided
 * - Checks for duplicate certificate numbers
 *
 * @param input - The certification data
 * @returns ActionResult with the created certification on success
 */
export async function addItemCertification(
  input: z.infer<typeof AddItemCertificationSchema>
): Promise<ActionResult<ItemCertification>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = AddItemCertificationSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const validatedData = validationResult.data;
    const { id_shop, id_item } = validatedData;

    // 3. Verify item exists and belongs to shop
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('id_item, id_shop')
      .eq('id_item', id_item)
      .eq('id_shop', id_shop)
      .is('deleted_at', null)
      .single();

    if (itemError || !item) {
      return {
        success: false,
        error: 'Inventory item not found',
        code: 'not_found',
      };
    }

    // 4. Check for duplicate certificate number in shop
    const { data: existingCert } = await supabase
      .from('item_certifications')
      .select('id_certification')
      .eq('id_shop', id_shop)
      .eq('certificate_number', validatedData.certificate_number)
      .single();

    if (existingCert) {
      return {
        success: false,
        error: 'A certification with this certificate number already exists',
        code: 'duplicate_certificate',
      };
    }

    // 5. Verify file upload if provided
    if (validatedData.id_file_upload) {
      const { data: fileUpload, error: fileError } = await supabase
        .from('file_uploads')
        .select('id_file')
        .eq('id_file', validatedData.id_file_upload)
        .eq('id_shop', id_shop)
        .is('deleted_at', null)
        .single();

      if (fileError || !fileUpload) {
        return {
          success: false,
          error: 'File upload not found',
          code: 'invalid_file_upload',
        };
      }
    }

    // 6. Create certification
    const { data, error } = await supabase
      .from('item_certifications')
      .insert({
        id_shop,
        id_item,
        certification_type: validatedData.certification_type,
        certificate_number: validatedData.certificate_number,
        issuing_authority: validatedData.issuing_authority,
        issue_date: validatedData.issue_date ?? null,
        expiry_date: validatedData.expiry_date ?? null,
        appraised_value: validatedData.appraised_value ?? null,
        currency: validatedData.currency ?? null,
        id_file_upload: validatedData.id_file_upload ?? null,
        verification_url: validatedData.verification_url ?? null,
        notes: validatedData.notes ?? null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (error) {
      console.error('[addItemCertification] Database error:', error);
      return {
        success: false,
        error: 'Failed to add certification to item',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateInventoryPaths(id_shop);

    return {
      success: true,
      data,
      message: 'Certification added to item successfully',
    };
  } catch (err) {
    console.error('[addItemCertification] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Removes a certification from an inventory item.
 *
 * Features:
 * - Hard deletes the certification record
 * - Does NOT delete associated file upload (orphan cleanup handled separately)
 *
 * @param id_certification - The certification ID to remove
 * @returns ActionResult indicating success or failure
 */
export async function removeItemCertification(id_certification: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid certification ID');
    const validationResult = uuidSchema.safeParse(id_certification);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid certification ID',
        code: 'validation_error',
      };
    }

    // 3. Get certification
    const { data: certification, error: fetchError } = await supabase
      .from('item_certifications')
      .select('id_certification, id_shop')
      .eq('id_certification', id_certification)
      .single();

    if (fetchError || !certification) {
      return {
        success: false,
        error: 'Certification not found',
        code: 'not_found',
      };
    }

    // 4. Delete certification
    const { error } = await supabase
      .from('item_certifications')
      .delete()
      .eq('id_certification', id_certification);

    if (error) {
      console.error('[removeItemCertification] Database error:', error);
      return {
        success: false,
        error: 'Failed to remove certification from item',
        code: 'database_error',
      };
    }

    // 5. Revalidate paths
    revalidateInventoryPaths(certification.id_shop);

    return {
      success: true,
      message: 'Certification removed from item successfully',
    };
  } catch (err) {
    console.error('[removeItemCertification] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Bulk updates status for multiple items.
 *
 * @param itemIds - Array of item IDs to update
 * @param newStatus - The new status to apply
 * @param reason - Optional reason for the status change
 * @returns ActionResult with count of updated items
 */
export async function bulkUpdateItemStatus(
  itemIds: string[],
  newStatus: InventoryStatus,
  reason?: string
): Promise<ActionResult<{ updatedCount: number; failedCount: number }>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate inputs
    if (!itemIds.length) {
      return {
        success: false,
        error: 'No items provided',
        code: 'validation_error',
      };
    }

    const statusValidation = inventoryStatusEnum.safeParse(newStatus);
    if (!statusValidation.success) {
      return {
        success: false,
        error: 'Invalid status',
        code: 'validation_error',
      };
    }

    let updatedCount = 0;
    let failedCount = 0;
    let shopId: string | null = null;

    // 3. Process each item
    for (const itemId of itemIds) {
      const result = await updateItemStatus({
        id_item: itemId,
        status: newStatus,
        reason,
      });

      if (result.success) {
        updatedCount++;
        if (result.data && !shopId) {
          shopId = result.data.id_shop;
        }
      } else {
        failedCount++;
      }
    }

    // 4. Revalidate paths if any updates succeeded
    if (shopId) {
      revalidateInventoryPaths(shopId);
    }

    return {
      success: true,
      data: { updatedCount, failedCount },
      message: `Updated ${updatedCount} items, ${failedCount} failed`,
    };
  } catch (err) {
    console.error('[bulkUpdateItemStatus] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}
