'use server';

/**
 * Workshop Server Actions
 *
 * Server-side actions for managing workshops and workshop orders in the Aymur Platform.
 * These actions handle CRUD operations for workshops, orders, and payments.
 *
 * Key features:
 * - Create, update, and soft-delete workshops
 * - Create and manage workshop orders
 * - Generate order numbers (WO-YYYYMMDD-XXX format)
 * - Record payments (creates immutable workshop_transaction)
 *
 * IMPORTANT NOTES:
 * - `workshop_transactions` is IMMUTABLE - only INSERT operations allowed
 * - Workshop balances are maintained by database triggers
 * - Order numbers are generated server-side to ensure uniqueness
 *
 * RLS Note: All queries are automatically filtered by get_user_shop_ids()
 * embedded in JWT claims. No manual shop filtering needed.
 *
 * @module lib/actions/workshop
 */

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/types/database';
import {
  workshopCreateSchema,
  workshopUpdateSchema,
  workshopOrderCreateSchema,
  workshopOrderStatusUpdateSchema,
  workshopPaymentWithReferenceSchema,
  type WorkshopOrderStatus,
} from '@/lib/utils/schemas/workshop';

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
 * Workshop row type (matches database structure)
 * Database columns: specialization (varchar, NOT array), no hourly_rate, total_orders, total_payments columns
 */
export interface Workshop {
  id_workshop: string;
  id_shop: string;
  workshop_name: string;
  is_internal: boolean;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  specialization: string | null;
  current_balance: number;
  status: string | null;
  notes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  deleted_at: string | null;
}

/**
 * Workshop order row type (matches database structure)
 */
export interface WorkshopOrder {
  id_workshop_order: string;
  id_shop: string;
  id_workshop: string;
  order_number: string;
  item_source: string;
  id_customer: string | null;
  id_inventory_item: string | null;
  order_type: string;
  item_description: string | null;
  description: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  materials_used: Record<string, unknown> | null;
  labor_cost: number | null;
  payment_status: 'unpaid' | 'partial' | 'paid' | null;
  paid_amount: number;
  status: WorkshopOrderStatus | null;
  received_date: string;
  estimated_completion_date: string | null;
  completed_date: string | null;
  delivered_date: string | null;
  notes: string | null;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

/**
 * Workshop transaction row type (immutable ledger)
 */
export interface WorkshopTransaction {
  id_transaction: string;
  id_shop: string;
  id_workshop: string;
  sequence_number: number;
  transaction_type: string;
  reference_id: string | null;
  reference_type: string | null;
  debit_amount: number;
  credit_amount: number;
  balance_after: number;
  description: string | null;
  created_by: string;
  created_at: string;
}

/**
 * Payment recording result
 */
export interface PaymentResult {
  transaction: WorkshopTransaction;
  new_balance: number;
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
 * Standard revalidation paths for workshop changes
 */
function revalidateWorkshopPaths(shopId: string, locale: string = 'en') {
  revalidatePath(`/${locale}/${shopId}/workshops`, 'page');
  revalidatePath(`/${locale}/${shopId}/workshops/orders`, 'page');
  revalidatePath(`/${locale}/${shopId}`, 'layout');
}

// =============================================================================
// CREATE WORKSHOP
// =============================================================================

/**
 * Creates a new workshop.
 *
 * @param input - The workshop data
 * @returns ActionResult with the created workshop on success
 *
 * @example
 * ```tsx
 * const result = await createWorkshop({
 *   id_shop: 'shop-uuid',
 *   workshop_name: 'Gold Repair Workshop',
 *   is_internal: false,
 *   contact_name: 'John Doe',
 *   specializations: ['repair', 'resize']
 * });
 * ```
 */
export async function createWorkshop(
  input: z.infer<typeof workshopCreateSchema>
): Promise<ActionResult<Workshop>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = workshopCreateSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, workshop_name, email, ...rest } = validationResult.data;

    if (!id_shop) {
      return {
        success: false,
        error: 'Shop ID is required',
        code: 'validation_error',
      };
    }

    // 3. Normalize empty email to null
    const normalizedEmail = email && email.trim() !== '' ? email.trim() : null;

    // 4. Check for duplicate workshop by name in same shop
    const { data: existingByName } = await supabase
      .from('workshops')
      .select('id_workshop')
      .eq('id_shop', id_shop)
      .eq('workshop_name', workshop_name.trim())
      .is('deleted_at', null)
      .single();

    if (existingByName) {
      return {
        success: false,
        error: 'A workshop with this name already exists',
        code: 'duplicate_workshop_name',
      };
    }

    // 5. Create workshop (RLS ensures user has access to this shop)
    const { data, error } = await supabase
      .from('workshops')
      .insert({
        id_shop,
        workshop_name: workshop_name.trim(),
        email: normalizedEmail,
        ...rest,
        contact_person: rest.contact_person?.trim() || null,
        phone: rest.phone?.trim() || null,
        address: rest.address?.trim() || null,
        notes: rest.notes?.trim() || null,
        created_by: authData.publicUser.id_user,
        // current_balance is initialized by database default (0)
      })
      .select()
      .single();

    if (error) {
      console.error('[createWorkshop] Database error:', error);
      return {
        success: false,
        error: 'Failed to create workshop',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateWorkshopPaths(id_shop);

    return {
      success: true,
      data: data as Workshop,
      message: 'Workshop created successfully',
    };
  } catch (err) {
    console.error('[createWorkshop] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// UPDATE WORKSHOP
// =============================================================================

/**
 * Updates an existing workshop's profile data.
 *
 * NOTE: This action ONLY updates profile fields.
 * Financial fields are managed by database triggers.
 *
 * @param input - The workshop update data
 * @returns ActionResult with the updated workshop on success
 */
export async function updateWorkshop(
  input: z.infer<typeof workshopUpdateSchema>
): Promise<ActionResult<Workshop>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = workshopUpdateSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_workshop, ...updateFields } = validationResult.data;

    if (!id_workshop) {
      return {
        success: false,
        error: 'Workshop ID is required',
        code: 'validation_error',
      };
    }

    // 3. Check if workshop exists and get shop_id
    const { data: existingWorkshop, error: fetchError } = await supabase
      .from('workshops')
      .select('id_shop, workshop_name')
      .eq('id_workshop', id_workshop)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingWorkshop) {
      return {
        success: false,
        error: 'Workshop not found',
        code: 'not_found',
      };
    }

    // 4. Check for duplicate workshop name if being changed
    const normalizedWorkshopName = updateFields.workshop_name?.trim();
    if (normalizedWorkshopName && normalizedWorkshopName !== existingWorkshop.workshop_name) {
      const { data: duplicateName } = await supabase
        .from('workshops')
        .select('id_workshop')
        .eq('id_shop', existingWorkshop.id_shop)
        .eq('workshop_name', normalizedWorkshopName)
        .is('deleted_at', null)
        .neq('id_workshop', id_workshop)
        .single();

      if (duplicateName) {
        return {
          success: false,
          error: 'A workshop with this name already exists',
          code: 'duplicate_workshop_name',
        };
      }
    }

    // 5. Build update object (only profile fields)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: authData.publicUser.id_user,
    };

    if (updateFields.workshop_name !== undefined) {
      updateData.workshop_name = normalizedWorkshopName;
    }
    if (updateFields.is_internal !== undefined) {
      updateData.is_internal = updateFields.is_internal;
    }
    if (updateFields.contact_person !== undefined) {
      updateData.contact_person = updateFields.contact_person?.trim() || null;
    }
    if (updateFields.phone !== undefined) {
      updateData.phone = updateFields.phone?.trim() || null;
    }
    if (updateFields.email !== undefined) {
      const normalizedEmail =
        updateFields.email && updateFields.email.trim() !== '' ? updateFields.email.trim() : null;
      updateData.email = normalizedEmail;
    }
    if (updateFields.address !== undefined) {
      updateData.address = updateFields.address?.trim() || null;
    }
    // Database uses specialization (varchar) not specializations (array)
    if (updateFields.specialization !== undefined) {
      updateData.specialization = updateFields.specialization?.trim() || null;
    }
    if (updateFields.status !== undefined) {
      updateData.status = updateFields.status;
    }
    if (updateFields.notes !== undefined) {
      updateData.notes = updateFields.notes?.trim() || null;
    }

    // 6. Update workshop
    const { data, error } = await supabase
      .from('workshops')
      .update(updateData)
      .eq('id_workshop', id_workshop)
      .select()
      .single();

    if (error) {
      console.error('[updateWorkshop] Database error:', error);
      return {
        success: false,
        error: 'Failed to update workshop',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateWorkshopPaths(existingWorkshop.id_shop);

    return {
      success: true,
      data: data as Workshop,
      message: 'Workshop updated successfully',
    };
  } catch (err) {
    console.error('[updateWorkshop] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// DELETE WORKSHOP (SOFT DELETE)
// =============================================================================

/**
 * Soft deletes a workshop.
 *
 * Sets the deleted_at timestamp rather than removing the record.
 * This preserves historical data and references in orders/transactions.
 *
 * @param id_workshop - The workshop ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteWorkshop(id_workshop: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid workshop ID');
    const validationResult = uuidSchema.safeParse(id_workshop);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid workshop ID',
        code: 'validation_error',
      };
    }

    // 3. Get workshop and verify they exist
    const { data: workshop, error: fetchError } = await supabase
      .from('workshops')
      .select('id_shop, current_balance')
      .eq('id_workshop', id_workshop)
      .is('deleted_at', null)
      .single();

    if (fetchError || !workshop) {
      return {
        success: false,
        error: 'Workshop not found',
        code: 'not_found',
      };
    }

    // 4. Check if workshop has outstanding balance
    if (workshop.current_balance !== 0) {
      return {
        success: false,
        error: `Cannot delete workshop with outstanding balance of ${workshop.current_balance}. Please settle the balance first.`,
        code: 'has_balance',
      };
    }

    // 5. Check for pending orders
    const { data: pendingOrders } = await supabase
      .from('workshop_orders')
      .select('id_workshop_order')
      .eq('id_workshop', id_workshop)
      .in('status', ['pending', 'in_progress'])
      .is('deleted_at', null)
      .limit(1);

    if (pendingOrders && pendingOrders.length > 0) {
      return {
        success: false,
        error: 'Cannot delete workshop with pending or in-progress orders',
        code: 'has_pending_orders',
      };
    }

    // 6. Soft delete workshop
    const { error } = await supabase
      .from('workshops')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_workshop', id_workshop);

    if (error) {
      console.error('[deleteWorkshop] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete workshop',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateWorkshopPaths(workshop.id_shop);

    return {
      success: true,
      message: 'Workshop deleted successfully',
    };
  } catch (err) {
    console.error('[deleteWorkshop] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GENERATE ORDER NUMBER
// =============================================================================

/**
 * Generates a unique order number in format WO-YYYYMMDD-XXX
 *
 * The sequence number resets daily and is determined by counting
 * existing orders for the day.
 *
 * @param id_shop - The shop ID
 * @returns ActionResult with the generated order number
 *
 * @example
 * ```tsx
 * const result = await generateOrderNumber('shop-uuid');
 * // Returns: { success: true, data: 'WO-20240115-001' }
 * ```
 */
export async function generateOrderNumber(id_shop: string): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate shop ID
    const uuidSchema = z.string().uuid('Invalid shop ID');
    const validationResult = uuidSchema.safeParse(id_shop);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid shop ID',
        code: 'validation_error',
      };
    }

    // 3. Generate date prefix
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const datePrefix = `WO-${year}${month}${day}-`;

    // 4. Count existing orders for today
    const { count, error: countError } = await supabase
      .from('workshop_orders')
      .select('id_workshop_order', { count: 'exact', head: true })
      .eq('id_shop', id_shop)
      .like('order_number', `${datePrefix}%`);

    if (countError) {
      console.error('[generateOrderNumber] Count error:', countError);
      return {
        success: false,
        error: 'Failed to generate order number',
        code: 'database_error',
      };
    }

    // 5. Generate sequence number
    const sequenceNumber = (count ?? 0) + 1;
    const orderNumber = `${datePrefix}${String(sequenceNumber).padStart(3, '0')}`;

    return {
      success: true,
      data: orderNumber,
    };
  } catch (err) {
    console.error('[generateOrderNumber] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// CREATE WORKSHOP ORDER
// =============================================================================

/**
 * Creates a new workshop order.
 *
 * Automatically generates an order number if not provided.
 *
 * @param input - The order data
 * @returns ActionResult with the created order on success
 */
export async function createWorkshopOrder(
  input: z.infer<typeof workshopOrderCreateSchema>
): Promise<ActionResult<WorkshopOrder>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = workshopOrderCreateSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, id_workshop, order_number, ...rest } = validationResult.data;

    if (!id_shop) {
      return {
        success: false,
        error: 'Shop ID is required',
        code: 'validation_error',
      };
    }

    // 3. Verify workshop exists and belongs to shop
    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .select('id_workshop, status')
      .eq('id_workshop', id_workshop)
      .eq('id_shop', id_shop)
      .is('deleted_at', null)
      .single();

    if (workshopError || !workshop) {
      return {
        success: false,
        error: 'Workshop not found',
        code: 'not_found',
      };
    }

    if (workshop.status !== 'active') {
      return {
        success: false,
        error: 'Cannot create order for inactive workshop',
        code: 'workshop_inactive',
      };
    }

    // 4. Generate order number if not provided
    let finalOrderNumber = order_number;
    if (!finalOrderNumber) {
      const orderNumberResult = await generateOrderNumber(id_shop);
      if (!orderNumberResult.success || !orderNumberResult.data) {
        return {
          success: false,
          error: orderNumberResult.success
            ? 'Failed to generate order number'
            : orderNumberResult.error,
          code: 'generation_error',
        };
      }
      finalOrderNumber = orderNumberResult.data;
    }

    // 5. Create order
    const { data, error } = await supabase
      .from('workshop_orders')
      .insert({
        id_shop,
        id_workshop,
        order_number: finalOrderNumber,
        item_source: rest.item_source,
        order_type: rest.order_type,
        received_date: rest.received_date,
        status: rest.status ?? 'pending',
        id_customer: rest.id_customer ?? null,
        id_inventory_item: rest.id_inventory_item ?? null,
        item_description: rest.item_description ?? null,
        description: rest.description?.trim() || null,
        estimated_completion_date: rest.estimated_completion_date ?? null,
        completed_date: rest.completed_date ?? null,
        delivered_date: rest.delivered_date ?? null,
        estimated_cost: rest.estimated_cost ?? null,
        actual_cost: rest.actual_cost ?? null,
        labor_cost: rest.labor_cost ?? null,
        materials_used: (rest.materials_used ?? null) as Json,
        payment_status: rest.payment_status ?? 'unpaid',
        notes: rest.notes?.trim() || null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (error) {
      console.error('[createWorkshopOrder] Database error:', error);

      // Check for duplicate order number
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Order number already exists. Please try again.',
          code: 'duplicate_order_number',
        };
      }

      return {
        success: false,
        error: 'Failed to create order',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateWorkshopPaths(id_shop);

    return {
      success: true,
      data: data as WorkshopOrder,
      message: 'Order created successfully',
    };
  } catch (err) {
    console.error('[createWorkshopOrder] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// UPDATE ORDER STATUS
// =============================================================================

/**
 * Updates a workshop order's status.
 *
 * Handles status transitions and updates relevant timestamps.
 *
 * @param input - The status update data
 * @returns ActionResult with the updated order on success
 */
export async function updateOrderStatus(
  input: z.infer<typeof workshopOrderStatusUpdateSchema>
): Promise<ActionResult<WorkshopOrder>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = workshopOrderStatusUpdateSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_order, status, notes, actual_cost, completed_at } = validationResult.data;

    // 3. Get existing order (id_order maps to id_workshop_order in database)
    const { data: existingOrder, error: fetchError } = await supabase
      .from('workshop_orders')
      .select('id_shop, status')
      .eq('id_workshop_order', id_order)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingOrder) {
      return {
        success: false,
        error: 'Order not found',
        code: 'not_found',
      };
    }

    // 4. Validate status transition
    const currentStatus = existingOrder.status ?? 'pending';
    const validTransitions: Record<string, string[]> = {
      pending: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled', 'pending'],
      completed: [], // Cannot change completed orders
      cancelled: ['pending'], // Can reopen cancelled orders
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return {
        success: false,
        error: `Cannot change status from ${currentStatus} to ${status}`,
        code: 'invalid_status_transition',
      };
    }

    // 5. Build update object
    // Note: Database schema uses received_date (not started_at), completed_date (not completed_at)
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
      updated_by: authData.publicUser.id_user,
    };

    // Set completed_date when completing
    if (status === 'completed') {
      updateData.completed_date = completed_at || new Date().toISOString();
      if (actual_cost !== undefined) {
        updateData.actual_cost = actual_cost;
      }
    }

    // Clear completed_date if reopening
    if (
      status === 'pending' &&
      (currentStatus === 'cancelled' || currentStatus === 'in_progress')
    ) {
      updateData.completed_date = null;
    }

    // Add notes if provided
    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null;
    }

    // 6. Update order
    const { data, error } = await supabase
      .from('workshop_orders')
      .update(updateData)
      .eq('id_workshop_order', id_order)
      .select()
      .single();

    if (error) {
      console.error('[updateOrderStatus] Database error:', error);
      return {
        success: false,
        error: 'Failed to update order status',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateWorkshopPaths(existingOrder.id_shop);

    return {
      success: true,
      data: data as WorkshopOrder,
      message: `Order status updated to ${status}`,
    };
  } catch (err) {
    console.error('[updateOrderStatus] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// RECORD WORKSHOP PAYMENT
// =============================================================================

/**
 * Records a payment to a workshop.
 *
 * This creates an IMMUTABLE workshop_transaction record.
 * The workshop's balance is updated by database triggers.
 *
 * IMPORTANT: workshop_transactions uses immutable ledger pattern - INSERT only, no updates.
 *
 * @param input - The payment data
 * @returns ActionResult with the transaction and new balance
 *
 * @example
 * ```tsx
 * const result = await recordWorkshopPayment({
 *   id_workshop: 'workshop-uuid',
 *   amount: 5000,
 *   transaction_date: '2024-01-15',
 *   notes: 'Payment for January orders'
 * });
 * ```
 */
export async function recordWorkshopPayment(
  input: z.infer<typeof workshopPaymentWithReferenceSchema>
): Promise<ActionResult<PaymentResult>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = workshopPaymentWithReferenceSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const {
      id_workshop,
      id_order,
      amount,
      transaction_date: _transaction_date, // Reserved for future use
      transaction_type,
      notes,
      reference_type,
      reference_id,
    } = validationResult.data;

    // 3. Get workshop to verify existence and get current balance
    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .select('id_shop, current_balance, workshop_name')
      .eq('id_workshop', id_workshop)
      .is('deleted_at', null)
      .single();

    if (workshopError || !workshop) {
      return {
        success: false,
        error: 'Workshop not found',
        code: 'not_found',
      };
    }

    // 4. If order reference provided, verify it exists
    if (id_order) {
      const { data: order, error: orderError } = await supabase
        .from('workshop_orders')
        .select('id_workshop_order')
        .eq('id_workshop_order', id_order)
        .eq('id_workshop', id_workshop)
        .is('deleted_at', null)
        .single();

      if (orderError || !order) {
        return {
          success: false,
          error: 'Order not found for this workshop',
          code: 'order_not_found',
        };
      }
    }

    // 5. Calculate new balance (payment is a credit that reduces what we owe)
    const newBalance = Number(workshop.current_balance) - amount;

    // 6. Create workshop transaction (immutable ledger entry)
    // Uses debit_amount/credit_amount columns (payment is a credit)
    const { data: transaction, error: transactionError } = await supabase
      .from('workshop_transactions')
      .insert({
        id_shop: workshop.id_shop,
        id_workshop,
        transaction_type: transaction_type || 'order_payment',
        debit_amount: 0, // Payment doesn't debit
        credit_amount: amount, // Payment is a credit
        balance_after: newBalance,
        reference_type: reference_type || 'payment',
        reference_id: reference_id || id_order || null,
        description: notes?.trim() || null,
        created_by: authData.publicUser.id_user,
        // sequence_number is auto-generated by database
      })
      .select()
      .single();

    if (transactionError) {
      console.error('[recordWorkshopPayment] Transaction error:', transactionError);
      return {
        success: false,
        error: 'Failed to record payment',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateWorkshopPaths(workshop.id_shop);

    return {
      success: true,
      data: {
        transaction: transaction as WorkshopTransaction,
        new_balance: newBalance,
      },
      message: `Payment of ${amount} recorded successfully`,
    };
  } catch (err) {
    console.error('[recordWorkshopPayment] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}
