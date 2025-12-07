'use server';

/**
 * Sales Server Actions
 *
 * Server-side actions for managing sales in the Aymur Platform.
 * These actions handle CRUD operations for sales, sale items, and payments.
 *
 * Key features:
 * - Create and manage sales with line items
 * - Add/remove/update sale items (inventory items)
 * - Record payments against sales
 * - Complete and void sales with proper inventory status updates
 * - Generate sequential sale numbers per shop
 *
 * RLS Note: All queries are automatically filtered by get_user_shop_ids()
 * embedded in JWT claims. No manual shop filtering needed.
 *
 * Business Rules:
 * - Sale number format: PREFIX-YYYYMMDD-SEQUENCE (e.g., INV-20241204-0001)
 * - Items added to sale are marked as 'reserved'
 * - Items removed from sale are restored to 'available'
 * - Completed sales mark items as 'sold'
 * - Voided sales restore items to 'available'
 *
 * Immutable Ledger: customer_transactions is INSERT ONLY - no UPDATE/DELETE.
 * All balance changes are tracked via transaction entries.
 *
 * @module lib/actions/sales
 */

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

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

/**
 * Sale status enumeration
 */
export type SaleStatus = 'pending' | 'completed' | 'returned' | 'partial_return';

/**
 * Payment status enumeration
 */
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

/**
 * Discount type enumeration
 */
export type DiscountType = 'percentage' | 'fixed';

/**
 * Payment type enumeration
 */
export type PaymentType = 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'mixed' | 'refund';

/**
 * Inventory item status enumeration
 */
export type InventoryStatus =
  | 'available'
  | 'reserved'
  | 'sold'
  | 'workshop'
  | 'transferred'
  | 'damaged'
  | 'returned';

/**
 * Sale row type (based on database schema)
 * Note: Database uses 'invoice_number' (not sale_number), 'status' (not sale_status),
 * 'subtotal' (not subtotal_amount), 'sale_type' field exists
 */
export interface Sale {
  id_sale: string;
  id_shop: string;
  id_customer: string | null;
  invoice_number: string; // DB field is invoice_number
  sale_date: string;
  sale_type: string; // DB has sale_type field
  currency: string;
  subtotal: number; // DB field is subtotal
  discount_type: DiscountType | null;
  discount_amount: number | null;
  tax_amount: number | null;
  total_amount: number;
  paid_amount: number | null;
  payment_status: PaymentStatus | null;
  status: SaleStatus | null; // DB field is status
  notes: string | null;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

/**
 * Sale item row type (based on database schema)
 * Note: sale_items table does NOT have item_name, item_barcode, weight_grams, metal_type,
 * metal_purity, quantity, total_price, status, returned_at, return_reason.
 * These come from joined inventory_items table.
 * DB field is 'line_total' not 'total_price', no 'quantity' field.
 */
export interface SaleItem {
  id_sale_item: string;
  id_shop: string;
  id_sale: string;
  id_item: string;
  unit_price: number;
  discount_amount: number | null;
  discount_type: DiscountType | null;
  line_total: number; // DB field is line_total
  created_at: string;
}

/**
 * Sale payment row type (based on database schema)
 * Note: sale_payments table does NOT have id_customer, cash_amount, card_amount,
 * transfer_amount, cheque_amount. It's a simpler table with amount for the payment.
 */
export interface SalePayment {
  id_payment: string;
  id_shop: string;
  id_sale: string;
  payment_type: string; // DB uses string type
  amount: number;
  cheque_number: string | null;
  cheque_date: string | null;
  cheque_bank: string | null;
  cheque_status: 'pending' | 'cleared' | 'bounced' | null;
  cheque_cleared_date: string | null;
  payment_date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Create sale validation schema
 */
const CreateSaleSchema = z.object({
  id_shop: z.string().uuid('Invalid shop ID'),
  id_customer: z.string().uuid('Invalid customer ID').nullable().optional(),
  sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  currency: z.string().min(3).max(3, 'Currency must be a 3-letter code'),
  discount_type: z.enum(['percentage', 'fixed']).nullable().optional(),
  discount_value: z.number().min(0).nullable().optional(),
  tax_amount: z.number().min(0).nullable().optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').nullable().optional(),
});

/**
 * Add sale item validation schema
 */
const AddSaleItemSchema = z.object({
  id_sale: z.string().uuid('Invalid sale ID'),
  id_item: z.string().uuid('Invalid inventory item ID'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
});

/**
 * Update sale item validation schema
 */
const UpdateSaleItemSchema = z.object({
  id_sale_item: z.string().uuid('Invalid sale item ID'),
  unit_price: z.number().min(0, 'Unit price must be non-negative').optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').optional(),
});

/**
 * Record payment validation schema
 */
const RecordPaymentSchema = z.object({
  id_sale: z.string().uuid('Invalid sale ID'),
  id_customer: z.string().uuid('Invalid customer ID'),
  payment_type: z.enum(['cash', 'card', 'bank_transfer', 'cheque', 'mixed']),
  amount: z.number().positive('Amount must be positive'),
  cash_amount: z.number().min(0).nullable().optional(),
  card_amount: z.number().min(0).nullable().optional(),
  transfer_amount: z.number().min(0).nullable().optional(),
  cheque_amount: z.number().min(0).nullable().optional(),
  cheque_number: z.string().nullable().optional(),
  cheque_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .nullable()
    .optional(),
  cheque_bank: z.string().nullable().optional(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().max(1000).nullable().optional(),
});

/**
 * Complete sale validation schema
 */
const CompleteSaleSchema = z.object({
  id_sale: z.string().uuid('Invalid sale ID'),
});

/**
 * Void sale validation schema
 */
const VoidSaleSchema = z.object({
  id_sale: z.string().uuid('Invalid sale ID'),
  void_reason: z
    .string()
    .min(1, 'Void reason is required')
    .max(500, 'Void reason must be less than 500 characters'),
});

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
 * Standard revalidation paths for sales changes
 */
function revalidateSalesPaths(shopId: string, locale: string = 'en') {
  revalidatePath(`/${locale}/${shopId}/sales`, 'page');
  revalidatePath(`/${locale}/${shopId}/customers`, 'page');
  revalidatePath(`/${locale}/${shopId}/inventory`, 'page');
  revalidatePath(`/${locale}/${shopId}`, 'layout');
}

/**
 * Calculate discount amount based on type and value
 */
function calculateDiscountAmount(
  subtotal: number,
  discountType: DiscountType | null,
  discountValue: number | null
): number {
  if (!discountType || discountValue === null || discountValue === 0) {
    return 0;
  }

  if (discountType === 'percentage') {
    return (subtotal * discountValue) / 100;
  }

  return Math.min(discountValue, subtotal); // Fixed discount cannot exceed subtotal
}

/**
 * Determine payment status based on paid and total amounts
 */
function determinePaymentStatus(paidAmount: number, totalAmount: number): PaymentStatus {
  if (paidAmount >= totalAmount) {
    return 'paid';
  }
  if (paidAmount > 0) {
    return 'partial';
  }
  return 'unpaid';
}

// =============================================================================
// TYPED DATABASE HELPERS
// =============================================================================

/**
 * Helper type for Supabase query results
 * This allows us to work with tables not in the generated types
 */
type DbResult<T> = { data: T | null; error: { message: string; code?: string } | null };
type DbResultList<T> = { data: T[] | null; error: { message: string; code?: string } | null };
type DbCountResult = { count: number | null; error: { message: string; code?: string } | null };
type DbMutationResult = { error: { message: string; code?: string } | null };

/**
 * Tables not yet in generated types: sales, sale_items, sale_payments, shop_settings
 * We use these helper functions to work around TypeScript errors while maintaining
 * runtime functionality. The database tables exist and work correctly.
 *
 * TODO: Regenerate database types to include these tables and remove these helpers.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// =============================================================================
// SALE NUMBER GENERATION
// =============================================================================

/**
 * Generates a sequential sale number for a shop.
 *
 * Format: PREFIX-YYYYMMDD-SEQUENCE
 * Example: INV-20241204-0001
 *
 * The prefix comes from shop_settings.invoice_prefix, defaulting to 'INV-'.
 * The sequence resets daily and is zero-padded to 4 digits.
 *
 * @param id_shop - The shop ID to generate the sale number for
 * @returns ActionResult with the generated sale number
 */
export async function generateSaleNumber(id_shop: string): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid shop ID');
    const validationResult = uuidSchema.safeParse(id_shop);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid shop ID',
        code: 'validation_error',
      };
    }

    // 3. Get shop settings for invoice prefix
    const { data: settings } = (await db
      .from('shop_settings')
      .select('invoice_prefix')
      .eq('id_shop', id_shop)
      .single()) as DbResult<{ invoice_prefix: string | null }>;

    const prefix = settings?.invoice_prefix || 'INV-';

    // 4. Get today's date in YYYYMMDD format
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // 5. Count existing sales for today to get next sequence number
    const startOfDay = today.toISOString().slice(0, 10);
    const { count, error: countError } = (await db
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('id_shop', id_shop)
      .gte('created_at', `${startOfDay}T00:00:00.000Z`)
      .lt('created_at', `${startOfDay}T23:59:59.999Z`)) as DbCountResult;

    if (countError) {
      console.error('[generateSaleNumber] Count error:', countError);
      return {
        success: false,
        error: 'Failed to generate sale number',
        code: 'database_error',
      };
    }

    // 6. Generate sequence number (1-based, zero-padded to 4 digits)
    const sequence = ((count || 0) + 1).toString().padStart(4, '0');

    // 7. Construct sale number
    const saleNumber = `${prefix}${dateStr}-${sequence}`;

    return {
      success: true,
      data: saleNumber,
    };
  } catch (err) {
    console.error('[generateSaleNumber] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// SALE CRUD ACTIONS
// =============================================================================

/**
 * Creates a new sale record.
 *
 * This creates a pending sale that items can be added to.
 * The sale starts with subtotal_amount = 0 and is updated as items are added.
 *
 * @param input - The sale data
 * @returns ActionResult with the created sale on success
 */
export async function createSale(
  input: z.infer<typeof CreateSaleSchema>
): Promise<ActionResult<Sale>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateSaleSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const {
      id_shop,
      id_customer,
      sale_date,
      currency,
      discount_type,
      discount_value,
      tax_amount,
      notes,
    } = validationResult.data;

    // 3. If customer is provided, verify it exists
    if (id_customer) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id_customer')
        .eq('id_customer', id_customer)
        .eq('id_shop', id_shop)
        .is('deleted_at', null)
        .single();

      if (customerError || !customer) {
        return {
          success: false,
          error: 'Customer not found',
          code: 'not_found',
        };
      }
    }

    // 4. Generate sale number
    const saleNumberResult = await generateSaleNumber(id_shop);
    if (!saleNumberResult.success) {
      return {
        success: false,
        error: saleNumberResult.error,
        code: saleNumberResult.code || 'generation_error',
      };
    }

    // 5. Calculate initial amounts (subtotal starts at 0, no items yet)
    const subtotal = 0;
    const discountAmount = calculateDiscountAmount(
      subtotal,
      discount_type ?? null,
      discount_value ?? null
    );
    const totalAmount = Math.max(0, subtotal - discountAmount + (tax_amount ?? 0));

    // 6. Create sale
    // DB field names: invoice_number (not sale_number), status (not sale_status), subtotal (not subtotal_amount)
    const { data, error } = (await db
      .from('sales')
      .insert({
        id_shop,
        id_customer: id_customer ?? null,
        invoice_number: saleNumberResult.data, // DB field is invoice_number
        sale_date,
        sale_type: 'sale', // Default sale type
        currency,
        subtotal: subtotal, // DB field is subtotal
        discount_type: discount_type ?? null,
        discount_amount: discountAmount,
        tax_amount: tax_amount ?? null,
        total_amount: totalAmount,
        paid_amount: 0,
        payment_status: 'unpaid',
        status: 'pending', // DB field is status
        notes: notes ?? null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single()) as DbResult<Sale>;

    if (error) {
      console.error('[createSale] Database error:', error);
      return {
        success: false,
        error: 'Failed to create sale',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateSalesPaths(id_shop);

    return {
      success: true,
      data: data!,
      message: 'Sale created successfully',
    };
  } catch (err) {
    console.error('[createSale] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Adds an inventory item to a sale.
 *
 * This action:
 * 1. Verifies the item is available
 * 2. Creates a sale_items record with item snapshot data
 * 3. Updates the item status to 'reserved'
 * 4. Recalculates sale totals
 *
 * @param input - The sale item data
 * @returns ActionResult with the created sale item on success
 */
export async function addSaleItem(
  input: z.infer<typeof AddSaleItemSchema>
): Promise<ActionResult<SaleItem>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = AddSaleItemSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_sale, id_item, unit_price, quantity } = validationResult.data;

    // 3. Get sale and verify it's in pending status
    interface SaleQueryResult {
      id_shop: string;
      sale_status: string;
      discount_type: string | null;
      discount_value: number | null;
      tax_amount: number | null;
    }
    const { data: sale, error: saleError } = (await db
      .from('sales')
      .select('id_shop, sale_status, discount_type, discount_value, tax_amount')
      .eq('id_sale', id_sale)
      .is('deleted_at', null)
      .single()) as DbResult<SaleQueryResult>;

    if (saleError || !sale) {
      return {
        success: false,
        error: 'Sale not found',
        code: 'not_found',
      };
    }

    if (sale.sale_status !== 'pending') {
      return {
        success: false,
        error: 'Cannot add items to a completed or voided sale',
        code: 'invalid_status',
      };
    }

    // 4. Get inventory item and verify it's available
    interface InventoryItemResult {
      id_item: string;
      id_shop: string;
      item_name: string;
      barcode: string | null;
      weight_grams: number;
      status: string;
      version: number;
      id_metal_type: string | null;
      id_metal_purity: string | null;
    }
    const { data: item, error: itemError } = (await db
      .from('inventory_items')
      .select(
        'id_item, id_shop, item_name, barcode, weight_grams, status, version, id_metal_type, id_metal_purity'
      )
      .eq('id_item', id_item)
      .eq('id_shop', sale.id_shop)
      .is('deleted_at', null)
      .single()) as DbResult<InventoryItemResult>;

    if (itemError || !item) {
      return {
        success: false,
        error: 'Inventory item not found',
        code: 'not_found',
      };
    }

    if (item.status !== 'available') {
      return {
        success: false,
        error: `Item is not available for sale (current status: ${item.status})`,
        code: 'item_unavailable',
      };
    }

    // 5. Check if item is already in this sale
    const { data: existingItem } = (await db
      .from('sale_items')
      .select('id_sale_item')
      .eq('id_sale', id_sale)
      .eq('id_item', id_item)
      .single()) as DbResult<{ id_sale_item: string }>;

    if (existingItem) {
      return {
        success: false,
        error: 'This item is already in the sale',
        code: 'duplicate_item',
      };
    }

    // 6. Calculate total price for line item
    const totalPrice = unit_price * quantity;

    // 7. Get metal type and purity names for snapshot data
    let metalTypeName: string | null = null;
    let metalPurityName: string | null = null;

    if (item.id_metal_type) {
      const { data: metalType } = await supabase
        .from('metal_types')
        .select('metal_name')
        .eq('id_metal_type', item.id_metal_type)
        .single();
      metalTypeName = metalType?.metal_name ?? null;
    }

    if (item.id_metal_purity) {
      const { data: metalPurity } = await supabase
        .from('metal_purities')
        .select('purity_name')
        .eq('id_purity', item.id_metal_purity)
        .single();
      metalPurityName = metalPurity?.purity_name ?? null;
    }

    // 8. Create sale item with snapshot data
    const { data: saleItem, error: insertError } = (await db
      .from('sale_items')
      .insert({
        id_shop: sale.id_shop,
        id_sale,
        id_item,
        item_name: item.item_name,
        item_barcode: item.barcode,
        weight_grams: item.weight_grams,
        metal_type: metalTypeName,
        metal_purity: metalPurityName,
        unit_price,
        quantity,
        total_price: totalPrice,
        status: 'sold',
      })
      .select()
      .single()) as DbResult<SaleItem>;

    if (insertError) {
      console.error('[addSaleItem] Insert error:', insertError);
      return {
        success: false,
        error: 'Failed to add item to sale',
        code: 'database_error',
      };
    }

    // 9. Update inventory item status to 'reserved' with optimistic locking
    const { error: updateItemError } = (await db
      .from('inventory_items')
      .update({
        status: 'reserved',
        version: item.version + 1,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_item', id_item)
      .eq('version', item.version)) as DbMutationResult;

    if (updateItemError) {
      // Rollback sale item creation
      await db.from('sale_items').delete().eq('id_sale_item', saleItem!.id_sale_item);
      console.error('[addSaleItem] Update item error:', updateItemError);
      return {
        success: false,
        error: 'Failed to reserve item - it may have been modified',
        code: 'concurrent_modification',
      };
    }

    // 10. Recalculate sale totals
    const { data: allItems } = (await db
      .from('sale_items')
      .select('total_price')
      .eq('id_sale', id_sale)) as DbResultList<{ total_price: number }>;

    const newSubtotal = (allItems || []).reduce((sum, i) => sum + Number(i.total_price), 0);
    const newDiscountAmount = calculateDiscountAmount(
      newSubtotal,
      sale.discount_type as DiscountType | null,
      sale.discount_value
    );
    const newTotalAmount = Math.max(0, newSubtotal - newDiscountAmount + (sale.tax_amount ?? 0));

    // 11. Update sale totals
    const { error: updateSaleError } = (await db
      .from('sales')
      .update({
        subtotal_amount: newSubtotal,
        discount_amount: newDiscountAmount,
        total_amount: newTotalAmount,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_sale', id_sale)) as DbMutationResult;

    if (updateSaleError) {
      console.error('[addSaleItem] Update sale error:', updateSaleError);
      // Note: We don't rollback here as the item was successfully added
    }

    // 12. Revalidate paths
    revalidateSalesPaths(sale.id_shop);

    return {
      success: true,
      data: saleItem!,
      message: 'Item added to sale successfully',
    };
  } catch (err) {
    console.error('[addSaleItem] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Removes an item from a sale.
 *
 * This action:
 * 1. Verifies the sale is still pending
 * 2. Deletes the sale_items record
 * 3. Restores the inventory item status to 'available'
 * 4. Recalculates sale totals
 *
 * @param id_sale_item - The sale item ID to remove
 * @returns ActionResult indicating success or failure
 */
export async function removeSaleItem(id_sale_item: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid sale item ID');
    const validationResult = uuidSchema.safeParse(id_sale_item);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid sale item ID',
        code: 'validation_error',
      };
    }

    // 3. Get sale item
    interface SaleItemQueryResult {
      id_sale_item: string;
      id_shop: string;
      id_sale: string;
      id_item: string;
    }
    const { data: saleItem, error: fetchError } = (await db
      .from('sale_items')
      .select('id_sale_item, id_shop, id_sale, id_item')
      .eq('id_sale_item', id_sale_item)
      .single()) as DbResult<SaleItemQueryResult>;

    if (fetchError || !saleItem) {
      return {
        success: false,
        error: 'Sale item not found',
        code: 'not_found',
      };
    }

    // 4. Get sale info to check status
    interface SaleInfoResult {
      sale_status: string;
      discount_type: string | null;
      discount_value: number | null;
      tax_amount: number | null;
    }
    const { data: saleData, error: saleDataError } = (await db
      .from('sales')
      .select('sale_status, discount_type, discount_value, tax_amount')
      .eq('id_sale', saleItem.id_sale)
      .single()) as DbResult<SaleInfoResult>;

    if (saleDataError || !saleData) {
      return {
        success: false,
        error: 'Sale not found',
        code: 'not_found',
      };
    }

    if (saleData.sale_status !== 'pending') {
      return {
        success: false,
        error: 'Cannot remove items from a completed or voided sale',
        code: 'invalid_status',
      };
    }

    // 5. Get inventory item for version
    const { data: inventoryItem } = (await db
      .from('inventory_items')
      .select('version')
      .eq('id_item', saleItem.id_item)
      .single()) as DbResult<{ version: number }>;

    // 6. Delete sale item
    const { error: deleteError } = (await db
      .from('sale_items')
      .delete()
      .eq('id_sale_item', id_sale_item)) as DbMutationResult;

    if (deleteError) {
      console.error('[removeSaleItem] Delete error:', deleteError);
      return {
        success: false,
        error: 'Failed to remove item from sale',
        code: 'database_error',
      };
    }

    // 7. Restore inventory item status to 'available'
    if (inventoryItem) {
      await db
        .from('inventory_items')
        .update({
          status: 'available',
          version: inventoryItem.version + 1,
          updated_at: new Date().toISOString(),
          updated_by: authData.publicUser.id_user,
        })
        .eq('id_item', saleItem.id_item)
        .eq('version', inventoryItem.version);
    }

    // 8. Recalculate sale totals
    const { data: remainingItems } = (await db
      .from('sale_items')
      .select('total_price')
      .eq('id_sale', saleItem.id_sale)) as DbResultList<{ total_price: number }>;

    const newSubtotal = (remainingItems || []).reduce((sum, i) => sum + Number(i.total_price), 0);
    const newDiscountAmount = calculateDiscountAmount(
      newSubtotal,
      saleData.discount_type as DiscountType | null,
      saleData.discount_value
    );
    const newTotalAmount = Math.max(
      0,
      newSubtotal - newDiscountAmount + (saleData.tax_amount ?? 0)
    );

    // 9. Update sale totals
    await db
      .from('sales')
      .update({
        subtotal_amount: newSubtotal,
        discount_amount: newDiscountAmount,
        total_amount: newTotalAmount,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_sale', saleItem.id_sale);

    // 10. Revalidate paths
    revalidateSalesPaths(saleItem.id_shop);

    return {
      success: true,
      message: 'Item removed from sale successfully',
    };
  } catch (err) {
    console.error('[removeSaleItem] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates a sale item's quantity or price.
 *
 * This action:
 * 1. Verifies the sale is still pending
 * 2. Updates the sale_items record
 * 3. Recalculates sale totals
 *
 * @param input - The update data
 * @returns ActionResult with the updated sale item on success
 */
export async function updateSaleItem(
  input: z.infer<typeof UpdateSaleItemSchema>
): Promise<ActionResult<SaleItem>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateSaleItemSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_sale_item, unit_price, quantity } = validationResult.data;

    // 3. Get sale item
    interface ExistingSaleItemResult {
      id_sale_item: string;
      id_shop: string;
      id_sale: string;
      unit_price: number;
      quantity: number;
    }
    const { data: existingItem, error: fetchError } = (await db
      .from('sale_items')
      .select('id_sale_item, id_shop, id_sale, unit_price, quantity')
      .eq('id_sale_item', id_sale_item)
      .single()) as DbResult<ExistingSaleItemResult>;

    if (fetchError || !existingItem) {
      return {
        success: false,
        error: 'Sale item not found',
        code: 'not_found',
      };
    }

    // 4. Get sale info to check status
    interface SaleInfoResult {
      sale_status: string;
      discount_type: string | null;
      discount_value: number | null;
      tax_amount: number | null;
    }
    const { data: saleData, error: saleDataError } = (await db
      .from('sales')
      .select('sale_status, discount_type, discount_value, tax_amount')
      .eq('id_sale', existingItem.id_sale)
      .single()) as DbResult<SaleInfoResult>;

    if (saleDataError || !saleData) {
      return {
        success: false,
        error: 'Sale not found',
        code: 'not_found',
      };
    }

    if (saleData.sale_status !== 'pending') {
      return {
        success: false,
        error: 'Cannot update items in a completed or voided sale',
        code: 'invalid_status',
      };
    }

    // 5. Calculate new values
    const newUnitPrice = unit_price ?? existingItem.unit_price;
    const newQuantity = quantity ?? existingItem.quantity;
    const newTotalPrice = newUnitPrice * newQuantity;

    // 6. Update sale item
    const { data: updatedItem, error: updateError } = (await db
      .from('sale_items')
      .update({
        unit_price: newUnitPrice,
        quantity: newQuantity,
        total_price: newTotalPrice,
      })
      .eq('id_sale_item', id_sale_item)
      .select()
      .single()) as DbResult<SaleItem>;

    if (updateError) {
      console.error('[updateSaleItem] Update error:', updateError);
      return {
        success: false,
        error: 'Failed to update sale item',
        code: 'database_error',
      };
    }

    // 7. Recalculate sale totals
    const { data: allItems } = (await db
      .from('sale_items')
      .select('total_price')
      .eq('id_sale', existingItem.id_sale)) as DbResultList<{ total_price: number }>;

    const newSubtotal = (allItems || []).reduce((sum, i) => sum + Number(i.total_price), 0);
    const newDiscountAmount = calculateDiscountAmount(
      newSubtotal,
      saleData.discount_type as DiscountType | null,
      saleData.discount_value
    );
    const newTotalAmount = Math.max(
      0,
      newSubtotal - newDiscountAmount + (saleData.tax_amount ?? 0)
    );

    // 8. Update sale totals
    await db
      .from('sales')
      .update({
        subtotal_amount: newSubtotal,
        discount_amount: newDiscountAmount,
        total_amount: newTotalAmount,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_sale', existingItem.id_sale);

    // 9. Revalidate paths
    revalidateSalesPaths(existingItem.id_shop);

    return {
      success: true,
      data: updatedItem!,
      message: 'Sale item updated successfully',
    };
  } catch (err) {
    console.error('[updateSaleItem] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// SALE COMPLETION AND PAYMENT ACTIONS
// =============================================================================

/**
 * Records a payment for a sale.
 *
 * This action:
 * 1. Creates a sale_payments record
 * 2. Creates a customer_transaction entry (immutable ledger)
 * 3. Updates the sale's paid_amount and payment_status
 * 4. Updates the customer's balance
 *
 * Note: customer_transactions is an IMMUTABLE ledger table - entries can only
 * be inserted, never updated or deleted.
 *
 * @param input - The payment data
 * @returns ActionResult with the created payment on success
 */
export async function recordPayment(
  input: z.infer<typeof RecordPaymentSchema>
): Promise<ActionResult<SalePayment>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = RecordPaymentSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const {
      id_sale,
      id_customer,
      payment_type,
      amount,
      cash_amount,
      card_amount,
      transfer_amount,
      cheque_amount,
      cheque_number,
      cheque_date,
      cheque_bank,
      payment_date,
      notes,
    } = validationResult.data;

    // 3. Validate cheque fields if payment_type is cheque
    if (payment_type === 'cheque' && (!cheque_number || !cheque_date)) {
      return {
        success: false,
        error: 'Cheque number and date are required for cheque payments',
        code: 'validation_error',
      };
    }

    // 4. Get sale and verify it exists
    interface SalePaymentQueryResult {
      id_shop: string;
      total_amount: number;
      paid_amount: number;
      sale_status: string;
      id_customer: string | null;
    }
    const { data: sale, error: saleError } = (await db
      .from('sales')
      .select('id_shop, total_amount, paid_amount, sale_status, id_customer')
      .eq('id_sale', id_sale)
      .is('deleted_at', null)
      .single()) as DbResult<SalePaymentQueryResult>;

    if (saleError || !sale) {
      return {
        success: false,
        error: 'Sale not found',
        code: 'not_found',
      };
    }

    // 5. Verify customer matches if sale has a customer
    if (sale.id_customer && sale.id_customer !== id_customer) {
      return {
        success: false,
        error: 'Customer does not match the sale',
        code: 'customer_mismatch',
      };
    }

    // 6. Get customer for balance update
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id_customer, current_balance, version')
      .eq('id_customer', id_customer)
      .eq('id_shop', sale.id_shop)
      .is('deleted_at', null)
      .single();

    if (customerError || !customer) {
      return {
        success: false,
        error: 'Customer not found',
        code: 'not_found',
      };
    }

    // 7. Calculate new totals
    const newPaidAmount = Number(sale.paid_amount) + amount;
    const newPaymentStatus = determinePaymentStatus(newPaidAmount, Number(sale.total_amount));
    const newCustomerBalance = Number(customer.current_balance) - amount;

    // 8. Create payment record
    const { data: payment, error: paymentError } = (await db
      .from('sale_payments')
      .insert({
        id_shop: sale.id_shop,
        id_sale,
        id_customer,
        payment_type,
        amount,
        cash_amount: cash_amount ?? 0,
        card_amount: card_amount ?? 0,
        transfer_amount: transfer_amount ?? 0,
        cheque_amount: cheque_amount ?? 0,
        cheque_number: cheque_number ?? null,
        cheque_date: cheque_date ?? null,
        cheque_bank: cheque_bank ?? null,
        cheque_status: payment_type === 'cheque' ? 'pending' : null,
        payment_date,
        notes: notes ?? null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single()) as DbResult<SalePayment>;

    if (paymentError || !payment) {
      console.error('[recordPayment] Payment insert error:', paymentError);
      return {
        success: false,
        error: 'Failed to record payment',
        code: 'database_error',
      };
    }

    // 9. Create customer transaction entry (IMMUTABLE LEDGER)
    // This is an INSERT-ONLY table - entries cannot be updated or deleted
    const { error: transactionError } = await supabase.from('customer_transactions').insert({
      id_shop: sale.id_shop,
      id_customer,
      transaction_type: 'payment',
      reference_id: payment.id_payment,
      reference_type: 'sale_payment',
      debit_amount: 0,
      credit_amount: amount,
      balance_after: newCustomerBalance,
      description: `Payment for sale ${id_sale}`,
      created_by: authData.publicUser.id_user,
    });

    if (transactionError) {
      // Note: We don't rollback the payment as the transaction is for audit purposes
      console.error('[recordPayment] Transaction insert error:', transactionError);
    }

    // 10. Update sale paid amount and payment status
    const { error: updateSaleError } = (await db
      .from('sales')
      .update({
        paid_amount: newPaidAmount,
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_sale', id_sale)) as DbMutationResult;

    if (updateSaleError) {
      console.error('[recordPayment] Update sale error:', updateSaleError);
    }

    // 11. Update customer balance and totals with optimistic locking
    const { error: updateCustomerError } = await supabase
      .from('customers')
      .update({
        current_balance: newCustomerBalance,
        total_payments: Number(customer.current_balance) + amount, // Increment total payments
        financial_status: newCustomerBalance >= 0 ? 'paid' : 'owes',
        version: customer.version + 1,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_customer', id_customer)
      .eq('version', customer.version);

    if (updateCustomerError) {
      console.error('[recordPayment] Update customer error:', updateCustomerError);
    }

    // 12. Revalidate paths
    revalidateSalesPaths(sale.id_shop);

    return {
      success: true,
      data: payment,
      message: 'Payment recorded successfully',
    };
  } catch (err) {
    console.error('[recordPayment] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Completes a sale.
 *
 * This action:
 * 1. Verifies the sale has items and is in pending status
 * 2. Updates all sale items' inventory status to 'sold'
 * 3. Updates the sale status to 'completed'
 * 4. Creates a customer_transaction entry for the sale amount (if customer exists)
 *
 * @param input - The completion data
 * @returns ActionResult with the updated sale on success
 */
export async function completeSale(
  input: z.infer<typeof CompleteSaleSchema>
): Promise<ActionResult<Sale>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CompleteSaleSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_sale } = validationResult.data;

    // 3. Get sale
    interface CompleteSaleQueryResult {
      id_shop: string;
      id_customer: string | null;
      sale_status: string;
      total_amount: number;
      paid_amount: number;
      version: number;
    }
    const { data: sale, error: saleError } = (await db
      .from('sales')
      .select('id_shop, id_customer, sale_status, total_amount, paid_amount, version')
      .eq('id_sale', id_sale)
      .is('deleted_at', null)
      .single()) as DbResult<CompleteSaleQueryResult>;

    if (saleError || !sale) {
      return {
        success: false,
        error: 'Sale not found',
        code: 'not_found',
      };
    }

    if (sale.sale_status !== 'pending') {
      return {
        success: false,
        error: 'Sale is not in pending status',
        code: 'invalid_status',
      };
    }

    // 4. Get sale items
    const { data: saleItems, error: itemsError } = (await db
      .from('sale_items')
      .select('id_item')
      .eq('id_sale', id_sale)) as DbResultList<{ id_item: string }>;

    if (itemsError) {
      console.error('[completeSale] Fetch items error:', itemsError);
      return {
        success: false,
        error: 'Failed to fetch sale items',
        code: 'database_error',
      };
    }

    if (!saleItems || saleItems.length === 0) {
      return {
        success: false,
        error: 'Cannot complete a sale with no items',
        code: 'no_items',
      };
    }

    // 5. Update all inventory items to 'sold' status
    const itemIds = saleItems.map((item) => item.id_item);
    const { error: updateItemsError } = await supabase
      .from('inventory_items')
      .update({
        status: 'sold',
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .in('id_item', itemIds);

    if (updateItemsError) {
      console.error('[completeSale] Update items error:', updateItemsError);
      return {
        success: false,
        error: 'Failed to update inventory items',
        code: 'database_error',
      };
    }

    // 6. Determine final payment status
    const paymentStatus = determinePaymentStatus(
      Number(sale.paid_amount),
      Number(sale.total_amount)
    );

    // 7. Update sale status to completed
    const { data: updatedSale, error: updateSaleError } = (await db
      .from('sales')
      .update({
        sale_status: 'completed',
        payment_status: paymentStatus,
        version: sale.version + 1,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_sale', id_sale)
      .eq('version', sale.version)
      .select()
      .single()) as DbResult<Sale>;

    if (updateSaleError || !updatedSale) {
      console.error('[completeSale] Update sale error:', updateSaleError);
      return {
        success: false,
        error: 'Failed to complete sale - it may have been modified',
        code: 'concurrent_modification',
      };
    }

    // 8. Create customer transaction for sale amount (if customer exists)
    if (sale.id_customer) {
      // Get customer balance
      const { data: customer } = await supabase
        .from('customers')
        .select('current_balance, total_purchases, version')
        .eq('id_customer', sale.id_customer)
        .single();

      if (customer) {
        const newBalance = Number(customer.current_balance) + Number(sale.total_amount);
        const newTotalPurchases = Number(customer.total_purchases) + Number(sale.total_amount);

        // Create transaction entry (IMMUTABLE LEDGER)
        await supabase.from('customer_transactions').insert({
          id_shop: sale.id_shop,
          id_customer: sale.id_customer,
          transaction_type: 'sale',
          reference_id: id_sale,
          reference_type: 'sale',
          debit_amount: Number(sale.total_amount),
          credit_amount: 0,
          balance_after: newBalance,
          description: `Sale completed - ${saleItems.length} item(s)`,
          created_by: authData.publicUser.id_user,
        });

        // Update customer balance
        await supabase
          .from('customers')
          .update({
            current_balance: newBalance,
            total_purchases: newTotalPurchases,
            financial_status: newBalance > 0 ? 'owes' : 'paid',
            version: customer.version + 1,
            updated_at: new Date().toISOString(),
            updated_by: authData.publicUser.id_user,
          })
          .eq('id_customer', sale.id_customer)
          .eq('version', customer.version);
      }
    }

    // 9. Revalidate paths
    revalidateSalesPaths(sale.id_shop);

    return {
      success: true,
      data: updatedSale,
      message: 'Sale completed successfully',
    };
  } catch (err) {
    console.error('[completeSale] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Voids/cancels a sale.
 *
 * This action:
 * 1. Verifies the sale can be voided (pending status only by default)
 * 2. Restores all inventory items to 'available' status
 * 3. Marks the sale as returned (voided)
 * 4. Creates reversal customer_transaction entries if needed
 *
 * @param input - The void data including reason
 * @returns ActionResult with the updated sale on success
 */
export async function voidSale(input: z.infer<typeof VoidSaleSchema>): Promise<ActionResult<Sale>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = VoidSaleSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_sale, void_reason } = validationResult.data;

    // 3. Get sale
    interface VoidSaleQueryResult {
      id_shop: string;
      id_customer: string | null;
      sale_status: string;
      total_amount: number;
      paid_amount: number;
      notes: string | null;
      version: number;
    }
    const { data: sale, error: saleError } = (await db
      .from('sales')
      .select('id_shop, id_customer, sale_status, total_amount, paid_amount, notes, version')
      .eq('id_sale', id_sale)
      .is('deleted_at', null)
      .single()) as DbResult<VoidSaleQueryResult>;

    if (saleError || !sale) {
      return {
        success: false,
        error: 'Sale not found',
        code: 'not_found',
      };
    }

    // Only allow voiding pending sales
    // For completed sales, use a return/refund flow instead
    if (sale.sale_status !== 'pending') {
      return {
        success: false,
        error: 'Only pending sales can be voided. Use return/refund for completed sales.',
        code: 'invalid_status',
      };
    }

    // 4. Get sale items
    const { data: saleItems, error: itemsError } = (await db
      .from('sale_items')
      .select('id_item')
      .eq('id_sale', id_sale)) as DbResultList<{ id_item: string }>;

    if (itemsError) {
      console.error('[voidSale] Fetch items error:', itemsError);
      return {
        success: false,
        error: 'Failed to fetch sale items',
        code: 'database_error',
      };
    }

    // 5. Restore all inventory items to 'available' status
    if (saleItems && saleItems.length > 0) {
      const itemIds = saleItems.map((item) => item.id_item);
      const { error: updateItemsError } = await supabase
        .from('inventory_items')
        .update({
          status: 'available',
          updated_at: new Date().toISOString(),
          updated_by: authData.publicUser.id_user,
        })
        .in('id_item', itemIds);

      if (updateItemsError) {
        console.error('[voidSale] Update items error:', updateItemsError);
        return {
          success: false,
          error: 'Failed to restore inventory items',
          code: 'database_error',
        };
      }
    }

    // 6. Update sale status and add void reason to notes
    const updatedNotes = sale.notes
      ? `${sale.notes}\n\n[VOIDED] ${new Date().toISOString()}: ${void_reason}`
      : `[VOIDED] ${new Date().toISOString()}: ${void_reason}`;

    const { data: updatedSale, error: updateSaleError } = (await db
      .from('sales')
      .update({
        sale_status: 'returned', // Using 'returned' status for voided sales
        notes: updatedNotes,
        version: sale.version + 1,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_sale', id_sale)
      .eq('version', sale.version)
      .select()
      .single()) as DbResult<Sale>;

    if (updateSaleError || !updatedSale) {
      console.error('[voidSale] Update sale error:', updateSaleError);
      return {
        success: false,
        error: 'Failed to void sale - it may have been modified',
        code: 'concurrent_modification',
      };
    }

    // 7. If there were payments, create reversal transaction entries
    if (sale.id_customer && Number(sale.paid_amount) > 0) {
      const { data: customer } = await supabase
        .from('customers')
        .select('current_balance, version')
        .eq('id_customer', sale.id_customer)
        .single();

      if (customer) {
        const refundAmount = Number(sale.paid_amount);
        const newBalance = Number(customer.current_balance) + refundAmount;

        // Create reversal transaction (IMMUTABLE LEDGER)
        await supabase.from('customer_transactions').insert({
          id_shop: sale.id_shop,
          id_customer: sale.id_customer,
          transaction_type: 'adjustment',
          reference_id: id_sale,
          reference_type: 'sale',
          debit_amount: 0,
          credit_amount: refundAmount,
          balance_after: newBalance,
          description: `Sale voided: ${void_reason}`,
          created_by: authData.publicUser.id_user,
        });

        // Update customer balance
        await supabase
          .from('customers')
          .update({
            current_balance: newBalance,
            financial_status: newBalance > 0 ? 'owes' : 'paid',
            version: customer.version + 1,
            updated_at: new Date().toISOString(),
            updated_by: authData.publicUser.id_user,
          })
          .eq('id_customer', sale.id_customer)
          .eq('version', customer.version);
      }
    }

    // 8. Revalidate paths
    revalidateSalesPaths(sale.id_shop);

    return {
      success: true,
      data: updatedSale,
      message: 'Sale voided successfully',
    };
  } catch (err) {
    console.error('[voidSale] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}
