'use server';

/**
 * Purchase Server Actions
 *
 * Server-side actions for managing purchases (supplier orders) in the Aymur Platform.
 * These actions handle CRUD operations for purchases from suppliers.
 *
 * Key features:
 * - Create and manage purchase orders
 * - Track payment status (unpaid, partial, paid)
 * - Generate sequential purchase numbers per shop
 * - Record payments against purchases
 *
 * RLS Note: All queries are automatically filtered by get_user_shop_ids()
 * embedded in JWT claims. No manual shop filtering needed.
 *
 * Business Rules:
 * - Purchase number format: PO-YYYYMMDD-SEQUENCE (e.g., PO-20241204-0001)
 * - Payment status automatically updates based on paid vs total amount
 *
 * @module lib/actions/purchase
 */

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import {
  determinePurchasePaymentStatus,
  type PurchasePaymentStatus,
} from '@/lib/utils/schemas/purchase';

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
 * Purchase row type (based on database schema)
 */
export interface Purchase {
  id_purchase: string;
  id_shop: string;
  id_supplier: string;
  purchase_number: string;
  invoice_number: string | null;
  purchase_date: string;
  currency: string;
  total_items: number;
  total_weight_grams: number;
  total_amount: number;
  paid_amount: number;
  payment_status: PurchasePaymentStatus | null;
  notes: string | null;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

/**
 * Purchase with supplier details
 */
export interface PurchaseWithSupplier extends Purchase {
  supplier: {
    id_supplier: string;
    company_name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Create purchase validation schema
 */
const CreatePurchaseSchema = z.object({
  id_shop: z.string().uuid('Invalid shop ID'),
  id_supplier: z.string().uuid('Invalid supplier ID'),
  invoice_number: z.string().max(100).nullable().optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  currency: z.string().min(3).max(3, 'Currency must be a 3-letter code'),
  total_items: z.number().int().min(0).default(0),
  total_weight_grams: z.number().min(0).default(0),
  total_amount: z.number().min(0, 'Total amount must be non-negative'),
  paid_amount: z.number().min(0, 'Paid amount must be non-negative').default(0),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').nullable().optional(),
});

/**
 * Update purchase validation schema
 */
const UpdatePurchaseSchema = z.object({
  id_purchase: z.string().uuid('Invalid purchase ID'),
  id_supplier: z.string().uuid('Invalid supplier ID').optional(),
  invoice_number: z.string().max(100).nullable().optional(),
  purchase_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional(),
  total_items: z.number().int().min(0).optional(),
  total_weight_grams: z.number().min(0).optional(),
  total_amount: z.number().min(0).optional(),
  paid_amount: z.number().min(0).optional(),
  payment_status: z.enum(['unpaid', 'partial', 'paid']).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/**
 * Record payment validation schema
 */
const RecordPaymentSchema = z.object({
  id_purchase: z.string().uuid('Invalid purchase ID'),
  amount: z.number().positive('Amount must be positive'),
  payment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional(),
  notes: z.string().max(500).nullable().optional(),
});

/**
 * Cancel purchase validation schema
 */
const CancelPurchaseSchema = z.object({
  id_purchase: z.string().uuid('Invalid purchase ID'),
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
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
 * Standard revalidation paths for purchase changes
 */
function revalidatePurchasePaths(shopId: string, locale: string = 'en') {
  revalidatePath(`/${locale}/${shopId}/purchases`, 'page');
  revalidatePath(`/${locale}/${shopId}/suppliers`, 'page');
  revalidatePath(`/${locale}/${shopId}/inventory`, 'page');
  revalidatePath(`/${locale}/${shopId}`, 'layout');
}

// =============================================================================
// TYPED DATABASE HELPERS
// =============================================================================

/**
 * Helper type for Supabase query results
 * This allows us to work with tables not in the generated types
 */
type DbResult<T> = { data: T | null; error: { message: string; code?: string } | null };
type DbCountResult = { count: number | null; error: { message: string; code?: string } | null };
type DbMutationResult = { error: { message: string; code?: string } | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// =============================================================================
// PURCHASE NUMBER GENERATION
// =============================================================================

/**
 * Generates a sequential purchase number for a shop.
 *
 * Format: PO-YYYYMMDD-SEQUENCE
 * Example: PO-20241204-0001
 *
 * The sequence resets daily and is zero-padded to 4 digits.
 *
 * @param id_shop - The shop ID to generate the purchase number for
 * @returns ActionResult with the generated purchase number
 */
export async function generatePurchaseNumber(id_shop: string): Promise<ActionResult<string>> {
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

    // 3. Get today's date in YYYYMMDD format
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // 4. Count existing purchases for today to get next sequence number
    const startOfDay = today.toISOString().slice(0, 10);
    const { count, error: countError } = (await db
      .from('purchases')
      .select('*', { count: 'exact', head: true })
      .eq('id_shop', id_shop)
      .gte('created_at', `${startOfDay}T00:00:00.000Z`)
      .lt('created_at', `${startOfDay}T23:59:59.999Z`)) as DbCountResult;

    if (countError) {
      console.error('[generatePurchaseNumber] Count error:', countError);
      return {
        success: false,
        error: 'Failed to generate purchase number',
        code: 'database_error',
      };
    }

    // 5. Generate sequence number (1-based, zero-padded to 4 digits)
    const sequence = ((count || 0) + 1).toString().padStart(4, '0');

    // 6. Construct purchase number
    const purchaseNumber = `PO-${dateStr}-${sequence}`;

    return {
      success: true,
      data: purchaseNumber,
    };
  } catch (err) {
    console.error('[generatePurchaseNumber] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// PURCHASE CRUD ACTIONS
// =============================================================================

/**
 * Creates a new purchase record.
 *
 * @param input - The purchase data
 * @returns ActionResult with the created purchase on success
 */
export async function createPurchase(
  input: z.infer<typeof CreatePurchaseSchema>
): Promise<ActionResult<Purchase>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreatePurchaseSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const {
      id_shop,
      id_supplier,
      invoice_number,
      purchase_date,
      currency,
      total_items,
      total_weight_grams,
      total_amount,
      paid_amount,
      notes,
    } = validationResult.data;

    // 3. Verify supplier exists and belongs to the shop
    const { data: supplier, error: supplierError } = (await db
      .from('suppliers')
      .select('id_supplier')
      .eq('id_supplier', id_supplier)
      .eq('id_shop', id_shop)
      .is('deleted_at', null)
      .single()) as DbResult<{ id_supplier: string }>;

    if (supplierError || !supplier) {
      return {
        success: false,
        error: 'Supplier not found',
        code: 'not_found',
      };
    }

    // 4. Generate purchase number
    const purchaseNumberResult = await generatePurchaseNumber(id_shop);
    if (!purchaseNumberResult.success) {
      return {
        success: false,
        error: purchaseNumberResult.error,
        code: purchaseNumberResult.code || 'generation_error',
      };
    }

    // 5. Determine payment status
    const paymentStatus = determinePurchasePaymentStatus(paid_amount, total_amount);

    // 6. Get supplier's current balance for ledger entry
    const { data: supplierData, error: supplierBalanceError } = (await db
      .from('suppliers')
      .select('current_balance')
      .eq('id_supplier', id_supplier)
      .single()) as DbResult<{ current_balance: number }>;

    if (supplierBalanceError || !supplierData) {
      console.error('[createPurchase] Failed to get supplier balance:', supplierBalanceError);
      return {
        success: false,
        error: 'Failed to get supplier balance',
        code: 'database_error',
      };
    }

    const currentSupplierBalance = Number(supplierData.current_balance) || 0;
    // Purchase creates a debit (we owe the supplier)
    const newSupplierBalance = currentSupplierBalance + total_amount;

    // 7. Create purchase
    const { data, error } = (await db
      .from('purchases')
      .insert({
        id_shop,
        id_supplier,
        purchase_number: purchaseNumberResult.data,
        invoice_number: invoice_number ?? null,
        purchase_date,
        currency,
        total_items,
        total_weight_grams,
        total_amount,
        paid_amount,
        payment_status: paymentStatus,
        notes: notes ?? null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single()) as DbResult<Purchase>;

    if (error) {
      console.error('[createPurchase] Database error:', error);
      return {
        success: false,
        error: 'Failed to create purchase',
        code: 'database_error',
      };
    }

    // 8. Create supplier transaction (ledger entry for the purchase)
    const { error: transactionError } = (await db.from('supplier_transactions').insert({
      id_shop,
      id_supplier,
      transaction_type: 'purchase',
      debit_amount: total_amount,
      credit_amount: 0,
      balance_after: newSupplierBalance,
      reference_type: 'purchase',
      reference_id: data!.id_purchase,
      description: `Purchase ${purchaseNumberResult.data}${invoice_number ? ` (Invoice: ${invoice_number})` : ''}`,
      transaction_date: purchase_date,
      created_by: authData.publicUser.id_user,
    })) as DbMutationResult;

    if (transactionError) {
      console.error('[createPurchase] Failed to create supplier transaction:', transactionError);
      // Note: Purchase was created, but transaction failed. Log this for investigation.
    }

    // 9. Update supplier's current_balance
    const { error: updateSupplierError } = (await db
      .from('suppliers')
      .update({
        current_balance: newSupplierBalance,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_supplier', id_supplier)) as DbMutationResult;

    if (updateSupplierError) {
      console.error('[createPurchase] Failed to update supplier balance:', updateSupplierError);
      // Note: Purchase was created, but supplier balance update failed.
    }

    // 10. Revalidate paths
    revalidatePurchasePaths(id_shop);

    return {
      success: true,
      data: data!,
      message: 'Purchase created successfully',
    };
  } catch (err) {
    console.error('[createPurchase] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates an existing purchase.
 *
 * @param input - The update data
 * @returns ActionResult with the updated purchase on success
 */
export async function updatePurchase(
  input: z.infer<typeof UpdatePurchaseSchema>
): Promise<ActionResult<Purchase>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdatePurchaseSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_purchase, ...updateData } = validationResult.data;

    // 3. Get existing purchase
    const { data: existingPurchase, error: fetchError } = (await db
      .from('purchases')
      .select('id_shop, version, total_amount, paid_amount')
      .eq('id_purchase', id_purchase)
      .is('deleted_at', null)
      .single()) as DbResult<{
      id_shop: string;
      version: number;
      total_amount: number;
      paid_amount: number;
    }>;

    if (fetchError || !existingPurchase) {
      return {
        success: false,
        error: 'Purchase not found',
        code: 'not_found',
      };
    }

    // 4. If supplier is being changed, verify new supplier exists
    if (updateData.id_supplier) {
      const { data: supplier, error: supplierError } = (await db
        .from('suppliers')
        .select('id_supplier')
        .eq('id_supplier', updateData.id_supplier)
        .eq('id_shop', existingPurchase.id_shop)
        .is('deleted_at', null)
        .single()) as DbResult<{ id_supplier: string }>;

      if (supplierError || !supplier) {
        return {
          success: false,
          error: 'Supplier not found',
          code: 'not_found',
        };
      }
    }

    // 5. Recalculate payment status if amounts changed
    const newTotalAmount = updateData.total_amount ?? existingPurchase.total_amount;
    const newPaidAmount = updateData.paid_amount ?? existingPurchase.paid_amount;
    const paymentStatus =
      updateData.payment_status ?? determinePurchasePaymentStatus(newPaidAmount, newTotalAmount);

    // 6. Build update object
    const updateObject: Record<string, unknown> = {
      ...updateData,
      payment_status: paymentStatus,
      version: existingPurchase.version + 1,
      updated_at: new Date().toISOString(),
      updated_by: authData.publicUser.id_user,
    };

    // 7. Update purchase with optimistic locking
    const { data, error } = (await db
      .from('purchases')
      .update(updateObject)
      .eq('id_purchase', id_purchase)
      .eq('version', existingPurchase.version)
      .select()
      .single()) as DbResult<Purchase>;

    if (error) {
      console.error('[updatePurchase] Database error:', error);
      return {
        success: false,
        error: 'Failed to update purchase - it may have been modified',
        code: 'concurrent_modification',
      };
    }

    // 8. Revalidate paths
    revalidatePurchasePaths(existingPurchase.id_shop);

    return {
      success: true,
      data: data!,
      message: 'Purchase updated successfully',
    };
  } catch (err) {
    console.error('[updatePurchase] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Records a payment for a purchase.
 *
 * This action:
 * 1. Validates the payment amount
 * 2. Updates the purchase paid_amount
 * 3. Automatically updates payment_status
 * 4. Creates a supplier_transaction ledger entry (credit)
 * 5. Updates supplier's current_balance
 *
 * @param input - The payment data
 * @returns ActionResult with the updated purchase on success
 */
export async function recordPurchasePayment(
  input: z.infer<typeof RecordPaymentSchema>
): Promise<ActionResult<Purchase>> {
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

    const { id_purchase, amount, payment_date, notes } = validationResult.data;

    // 3. Get existing purchase
    const { data: purchase, error: fetchError } = (await db
      .from('purchases')
      .select('id_shop, id_supplier, purchase_number, total_amount, paid_amount, notes, version')
      .eq('id_purchase', id_purchase)
      .is('deleted_at', null)
      .single()) as DbResult<{
      id_shop: string;
      id_supplier: string;
      purchase_number: string;
      total_amount: number;
      paid_amount: number;
      notes: string | null;
      version: number;
    }>;

    if (fetchError || !purchase) {
      return {
        success: false,
        error: 'Purchase not found',
        code: 'not_found',
      };
    }

    // 4. Get supplier's current balance for ledger entry
    const { data: supplierData, error: supplierBalanceError } = (await db
      .from('suppliers')
      .select('current_balance')
      .eq('id_supplier', purchase.id_supplier)
      .single()) as DbResult<{ current_balance: number }>;

    if (supplierBalanceError || !supplierData) {
      console.error(
        '[recordPurchasePayment] Failed to get supplier balance:',
        supplierBalanceError
      );
      return {
        success: false,
        error: 'Failed to get supplier balance',
        code: 'database_error',
      };
    }

    const currentSupplierBalance = Number(supplierData.current_balance) || 0;
    // Payment creates a credit (we paid the supplier, reducing what we owe)
    const newSupplierBalance = currentSupplierBalance - amount;

    // 5. Calculate new amounts
    const newPaidAmount = Number(purchase.paid_amount) + amount;
    const paymentStatus = determinePurchasePaymentStatus(
      newPaidAmount,
      Number(purchase.total_amount)
    );

    // 6. Append payment note
    const paymentNote = `[Payment: ${amount} on ${new Date().toISOString().slice(0, 10)}]${notes ? ` - ${notes}` : ''}`;
    const updatedNotes = purchase.notes ? `${purchase.notes}\n${paymentNote}` : paymentNote;

    // 7. Update purchase
    const { data, error } = (await db
      .from('purchases')
      .update({
        paid_amount: newPaidAmount,
        payment_status: paymentStatus,
        notes: updatedNotes,
        version: purchase.version + 1,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_purchase', id_purchase)
      .eq('version', purchase.version)
      .select()
      .single()) as DbResult<Purchase>;

    if (error) {
      console.error('[recordPurchasePayment] Database error:', error);
      return {
        success: false,
        error: 'Failed to record payment - purchase may have been modified',
        code: 'concurrent_modification',
      };
    }

    // 8. Create supplier_payments record (actual payment details)
    const transactionDate = payment_date || new Date().toISOString().slice(0, 10);
    const { data: paymentRecord, error: paymentError } = (await db
      .from('supplier_payments')
      .insert({
        id_shop: purchase.id_shop,
        id_supplier: purchase.id_supplier,
        id_purchase,
        payment_type: 'cash', // Default to cash, can be enhanced later
        amount,
        payment_date: transactionDate,
        notes: notes || null,
        created_by: authData.publicUser.id_user,
      })
      .select('id_payment')
      .single()) as DbResult<{ id_payment: string }>;

    if (paymentError || !paymentRecord) {
      console.error('[recordPurchasePayment] Failed to create supplier payment:', paymentError);
      // Purchase was updated, but payment record failed. Continue to try ledger entry.
    }

    // 9. Create supplier_transactions ledger entry (referencing the payment)
    const { error: transactionError } = (await db.from('supplier_transactions').insert({
      id_shop: purchase.id_shop,
      id_supplier: purchase.id_supplier,
      transaction_type: 'payment',
      debit_amount: 0,
      credit_amount: amount,
      balance_after: newSupplierBalance,
      reference_type: 'supplier_payment',
      reference_id: paymentRecord?.id_payment || null,
      description: `Payment for ${purchase.purchase_number}${notes ? ` - ${notes}` : ''}`,
      transaction_date: transactionDate,
      created_by: authData.publicUser.id_user,
    })) as DbMutationResult;

    if (transactionError) {
      console.error(
        '[recordPurchasePayment] Failed to create supplier transaction:',
        transactionError
      );
      // Note: Purchase was updated, but transaction failed. Log this for investigation.
    }

    // 10. Update supplier's current_balance
    const { error: updateSupplierError } = (await db
      .from('suppliers')
      .update({
        current_balance: newSupplierBalance,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_supplier', purchase.id_supplier)) as DbMutationResult;

    if (updateSupplierError) {
      console.error(
        '[recordPurchasePayment] Failed to update supplier balance:',
        updateSupplierError
      );
      // Note: Purchase was updated, but supplier balance update failed.
    }

    // 11. Revalidate paths
    revalidatePurchasePaths(purchase.id_shop);

    return {
      success: true,
      data: data!,
      message: 'Payment recorded successfully',
    };
  } catch (err) {
    console.error('[recordPurchasePayment] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Cancels a purchase (soft delete).
 *
 * @param input - The cancellation data
 * @returns ActionResult indicating success or failure
 */
export async function cancelPurchase(
  input: z.infer<typeof CancelPurchaseSchema>
): Promise<ActionResult<Purchase>> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CancelPurchaseSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_purchase, reason } = validationResult.data;

    // 3. Get existing purchase
    const { data: purchase, error: fetchError } = (await db
      .from('purchases')
      .select('id_shop, notes, version')
      .eq('id_purchase', id_purchase)
      .is('deleted_at', null)
      .single()) as DbResult<{
      id_shop: string;
      notes: string | null;
      version: number;
    }>;

    if (fetchError || !purchase) {
      return {
        success: false,
        error: 'Purchase not found',
        code: 'not_found',
      };
    }

    // 4. Append cancellation reason to notes
    const cancellationNote = `[CANCELLED: ${new Date().toISOString()}] ${reason}`;
    const updatedNotes = purchase.notes
      ? `${purchase.notes}\n${cancellationNote}`
      : cancellationNote;

    // 5. Soft delete the purchase
    const { data, error } = (await db
      .from('purchases')
      .update({
        deleted_at: new Date().toISOString(),
        notes: updatedNotes,
        version: purchase.version + 1,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_purchase', id_purchase)
      .eq('version', purchase.version)
      .select()
      .single()) as DbResult<Purchase>;

    if (error) {
      console.error('[cancelPurchase] Database error:', error);
      return {
        success: false,
        error: 'Failed to cancel purchase - it may have been modified',
        code: 'concurrent_modification',
      };
    }

    // 6. Revalidate paths
    revalidatePurchasePaths(purchase.id_shop);

    return {
      success: true,
      data: data!,
      message: 'Purchase cancelled successfully',
    };
  } catch (err) {
    console.error('[cancelPurchase] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Deletes a purchase permanently.
 * Use with caution - prefer cancelPurchase for soft delete.
 *
 * @param id_purchase - The purchase ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deletePurchase(id_purchase: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const db: AnySupabaseClient = supabase;

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid purchase ID');
    const validationResult = uuidSchema.safeParse(id_purchase);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid purchase ID',
        code: 'validation_error',
      };
    }

    // 3. Get existing purchase for shop ID
    const { data: purchase, error: fetchError } = (await db
      .from('purchases')
      .select('id_shop')
      .eq('id_purchase', id_purchase)
      .single()) as DbResult<{ id_shop: string }>;

    if (fetchError || !purchase) {
      return {
        success: false,
        error: 'Purchase not found',
        code: 'not_found',
      };
    }

    // 4. Delete the purchase
    const { error } = (await db
      .from('purchases')
      .delete()
      .eq('id_purchase', id_purchase)) as DbMutationResult;

    if (error) {
      console.error('[deletePurchase] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete purchase',
        code: 'database_error',
      };
    }

    // 5. Revalidate paths
    revalidatePurchasePaths(purchase.id_shop);

    return {
      success: true,
      message: 'Purchase deleted successfully',
    };
  } catch (err) {
    console.error('[deletePurchase] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}
