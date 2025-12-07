'use server';

/**
 * Delivery Server Actions
 *
 * Server-side actions for managing deliveries and couriers in the Aymur Platform.
 * These actions handle CRUD operations for deliveries, couriers, and courier payments.
 *
 * Key features:
 * - Create, update, and manage deliveries
 * - Create, update, and soft-delete couriers
 * - Record courier payments (creates immutable courier_transaction)
 * - Read-only balance access (balance is maintained by database triggers)
 *
 * IMPORTANT NOTES:
 * - `courier_companies.current_balance` is COMPUTED by database triggers - DO NOT update directly
 * - `courier_transactions` is IMMUTABLE - only INSERT operations allowed
 * - Balance changes happen through delivery charges/payments, which trigger courier_transactions entries
 *
 * RLS Note: All queries are automatically filtered by get_user_shop_ids()
 * embedded in JWT claims. No manual shop filtering needed.
 *
 * @module lib/actions/delivery
 */

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/types/database';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Generic action result type for consistent error handling.
 */
export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; code?: string };

// Database row types
type Delivery = Database['public']['Tables']['deliveries']['Row'];
type CourierCompany = Database['public']['Tables']['courier_companies']['Row'];
type CourierTransaction = Database['public']['Tables']['courier_transactions']['Row'];

/**
 * Courier balance information (read-only from application perspective)
 */
export interface CourierBalance {
  id_courier: string;
  company_name: string;
  current_balance: number;
}

/**
 * Payment recording result
 */
export interface CourierPaymentResult {
  transaction: CourierTransaction;
  new_balance: number;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Delivery status enum
 */
const DeliveryStatusSchema = z.enum([
  'pending',
  'picked_up',
  'in_transit',
  'delivered',
  'failed',
  'cancelled',
]);

/**
 * Cost paid by enum
 */
const CostPaidBySchema = z.enum(['shop', 'customer', 'split']);

/**
 * Courier status enum
 */
const CourierStatusSchema = z.enum(['active', 'inactive', 'suspended']);

/**
 * Delivery creation/update schema
 */
const DeliverySchema = z.object({
  id_sale: z.string().uuid('Invalid sale ID'),
  id_courier: z.string().uuid('Invalid courier ID'),
  tracking_number: z.string().max(100).nullable().optional(),
  delivery_cost: z.number().min(0, 'Delivery cost cannot be negative'),
  cost_paid_by: CostPaidBySchema,
  status: DeliveryStatusSchema.default('pending'),
  shipped_date: z.string().nullable().optional(),
  estimated_delivery_date: z.string().nullable().optional(),
  delivered_date: z.string().nullable().optional(),
  recipient_name: z.string().max(255).nullable().optional(),
  delivery_address: z.string().max(1000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const CreateDeliverySchema = DeliverySchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
});

const UpdateDeliverySchema = DeliverySchema.partial().extend({
  id_delivery: z.string().uuid('Invalid delivery ID'),
});

/**
 * Delivery status update schema
 */
const UpdateDeliveryStatusSchema = z.object({
  id_delivery: z.string().uuid('Invalid delivery ID'),
  status: DeliveryStatusSchema,
  tracking_number: z.string().max(100).nullable().optional(),
  shipped_date: z.string().nullable().optional(),
  delivered_date: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/**
 * Courier schema
 */
const CourierSchema = z.object({
  company_name: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(255, 'Company name cannot exceed 255 characters'),
  contact_person: z.string().max(255).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().max(255).nullable().optional().or(z.literal('')),
  website: z.string().url().max(255).nullable().optional().or(z.literal('')),
  status: CourierStatusSchema.default('active'),
  notes: z.string().max(5000).nullable().optional(),
});

const CreateCourierSchema = CourierSchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
});

const UpdateCourierSchema = CourierSchema.partial().extend({
  id_courier: z.string().uuid('Invalid courier ID'),
});

/**
 * Courier payment schema
 */
const RecordCourierPaymentSchema = z.object({
  id_courier: z.string().uuid('Invalid courier ID'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().max(500).nullable().optional(),
  reference_type: z.enum(['delivery', 'payment', 'manual']).nullable().optional(),
  reference_id: z.string().uuid().nullable().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the authenticated user and their public.users record.
 */
async function getAuthenticatedUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

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
 * Standard revalidation paths for delivery changes
 */
function revalidateDeliveryPaths(shopId: string, locale: string = 'en') {
  revalidatePath(`/${locale}/${shopId}/deliveries`, 'page');
  revalidatePath(`/${locale}/${shopId}/sales`, 'page');
  revalidatePath(`/${locale}/${shopId}`, 'layout');
}

/**
 * Standard revalidation paths for courier changes
 */
function revalidateCourierPaths(shopId: string, locale: string = 'en') {
  revalidatePath(`/${locale}/${shopId}/deliveries`, 'page');
  revalidatePath(`/${locale}/${shopId}/deliveries/couriers`, 'page');
  revalidatePath(`/${locale}/${shopId}`, 'layout');
}

// =============================================================================
// DELIVERY ACTIONS
// =============================================================================

/**
 * Creates a new delivery.
 *
 * @param input - The delivery data
 * @returns ActionResult with the created delivery on success
 *
 * @example
 * ```tsx
 * const result = await createDelivery({
 *   id_shop: 'shop-uuid',
 *   id_sale: 'sale-uuid',
 *   id_courier: 'courier-uuid',
 *   delivery_cost: 25.00,
 *   cost_paid_by: 'customer',
 *   delivery_address: '123 Main St, City, Country'
 * });
 * ```
 */
export async function createDelivery(
  input: z.infer<typeof CreateDeliverySchema>
): Promise<ActionResult<Delivery>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateDeliverySchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, ...deliveryData } = validationResult.data;

    // 3. Verify the sale exists and belongs to the shop
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('id_sale, id_shop')
      .eq('id_sale', deliveryData.id_sale)
      .eq('id_shop', id_shop)
      .single();

    if (saleError || !sale) {
      return {
        success: false,
        error: 'Sale not found',
        code: 'sale_not_found',
      };
    }

    // 4. Verify the courier exists and belongs to the shop
    const { data: courier, error: courierError } = await supabase
      .from('courier_companies')
      .select('id_courier, id_shop')
      .eq('id_courier', deliveryData.id_courier)
      .eq('id_shop', id_shop)
      .is('deleted_at', null)
      .single();

    if (courierError || !courier) {
      return {
        success: false,
        error: 'Courier not found',
        code: 'courier_not_found',
      };
    }

    // 5. Check if delivery already exists for this sale
    const { data: existingDelivery } = await supabase
      .from('deliveries')
      .select('id_delivery')
      .eq('id_sale', deliveryData.id_sale)
      .single();

    if (existingDelivery) {
      return {
        success: false,
        error: 'A delivery already exists for this sale',
        code: 'duplicate_delivery',
      };
    }

    // 6. Create delivery
    const { data, error } = await supabase
      .from('deliveries')
      .insert({
        id_shop,
        ...deliveryData,
        tracking_number: deliveryData.tracking_number?.trim().toUpperCase() || null,
        recipient_name: deliveryData.recipient_name?.trim() || null,
        delivery_address: deliveryData.delivery_address?.trim() || null,
        notes: deliveryData.notes?.trim() || null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (error) {
      console.error('[createDelivery] Database error:', error);
      return {
        success: false,
        error: 'Failed to create delivery',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateDeliveryPaths(id_shop);

    return {
      success: true,
      data,
      message: 'Delivery created successfully',
    };
  } catch (err) {
    console.error('[createDelivery] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates an existing delivery.
 *
 * @param input - The delivery update data
 * @returns ActionResult with the updated delivery on success
 */
export async function updateDelivery(
  input: z.infer<typeof UpdateDeliverySchema>
): Promise<ActionResult<Delivery>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateDeliverySchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_delivery, ...updateFields } = validationResult.data;

    // 3. Check if delivery exists
    const { data: existingDelivery, error: fetchError } = await supabase
      .from('deliveries')
      .select('id_shop, status')
      .eq('id_delivery', id_delivery)
      .single();

    if (fetchError || !existingDelivery) {
      return {
        success: false,
        error: 'Delivery not found',
        code: 'not_found',
      };
    }

    // 4. Check if delivery can be edited (not in terminal state)
    if (['delivered', 'cancelled'].includes(existingDelivery.status || '')) {
      return {
        success: false,
        error: 'Cannot edit a delivered or cancelled delivery',
        code: 'invalid_status',
      };
    }

    // 5. Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: authData.publicUser.id_user,
    };

    if (updateFields.id_courier !== undefined) {
      updateData.id_courier = updateFields.id_courier;
    }
    if (updateFields.tracking_number !== undefined) {
      updateData.tracking_number = updateFields.tracking_number?.trim().toUpperCase() || null;
    }
    if (updateFields.delivery_cost !== undefined) {
      updateData.delivery_cost = updateFields.delivery_cost;
    }
    if (updateFields.cost_paid_by !== undefined) {
      updateData.cost_paid_by = updateFields.cost_paid_by;
    }
    if (updateFields.status !== undefined) {
      updateData.status = updateFields.status;
    }
    if (updateFields.shipped_date !== undefined) {
      updateData.shipped_date = updateFields.shipped_date;
    }
    if (updateFields.estimated_delivery_date !== undefined) {
      updateData.estimated_delivery_date = updateFields.estimated_delivery_date;
    }
    if (updateFields.delivered_date !== undefined) {
      updateData.delivered_date = updateFields.delivered_date;
    }
    if (updateFields.recipient_name !== undefined) {
      updateData.recipient_name = updateFields.recipient_name?.trim() || null;
    }
    if (updateFields.delivery_address !== undefined) {
      updateData.delivery_address = updateFields.delivery_address?.trim() || null;
    }
    if (updateFields.notes !== undefined) {
      updateData.notes = updateFields.notes?.trim() || null;
    }

    // 6. Update delivery
    const { data, error } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id_delivery', id_delivery)
      .select()
      .single();

    if (error) {
      console.error('[updateDelivery] Database error:', error);
      return {
        success: false,
        error: 'Failed to update delivery',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateDeliveryPaths(existingDelivery.id_shop);

    return {
      success: true,
      data,
      message: 'Delivery updated successfully',
    };
  } catch (err) {
    console.error('[updateDelivery] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates just the delivery status with relevant fields.
 *
 * @param input - The status update data
 * @returns ActionResult with the updated delivery on success
 */
export async function updateDeliveryStatus(
  input: z.infer<typeof UpdateDeliveryStatusSchema>
): Promise<ActionResult<Delivery>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateDeliveryStatusSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_delivery, status, tracking_number, shipped_date, delivered_date, notes } =
      validationResult.data;

    // 3. Check if delivery exists
    const { data: existingDelivery, error: fetchError } = await supabase
      .from('deliveries')
      .select('id_shop, status')
      .eq('id_delivery', id_delivery)
      .single();

    if (fetchError || !existingDelivery) {
      return {
        success: false,
        error: 'Delivery not found',
        code: 'not_found',
      };
    }

    // 4. Validate status transition
    const validTransitions: Record<string, string[]> = {
      pending: ['picked_up', 'cancelled'],
      picked_up: ['in_transit', 'failed', 'cancelled'],
      in_transit: ['delivered', 'failed'],
      delivered: [],
      failed: ['pending', 'picked_up'],
      cancelled: [],
    };

    const currentStatus = existingDelivery.status || 'pending';
    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(status)) {
      return {
        success: false,
        error: `Cannot transition from ${currentStatus} to ${status}`,
        code: 'invalid_transition',
      };
    }

    // 5. Build update object
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
      updated_by: authData.publicUser.id_user,
    };

    if (tracking_number !== undefined) {
      updateData.tracking_number = tracking_number?.trim().toUpperCase() || null;
    }
    if (shipped_date !== undefined) {
      updateData.shipped_date = shipped_date;
    }
    if (delivered_date !== undefined) {
      updateData.delivered_date = delivered_date;
    }
    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null;
    }

    // Auto-set dates based on status
    if (status === 'picked_up' && !shipped_date) {
      updateData.shipped_date = new Date().toISOString().split('T')[0];
    }
    if (status === 'delivered' && !delivered_date) {
      updateData.delivered_date = new Date().toISOString().split('T')[0];
    }

    // 6. Update delivery
    const { data, error } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id_delivery', id_delivery)
      .select()
      .single();

    if (error) {
      console.error('[updateDeliveryStatus] Database error:', error);
      return {
        success: false,
        error: 'Failed to update delivery status',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateDeliveryPaths(existingDelivery.id_shop);

    return {
      success: true,
      data,
      message: `Delivery status updated to ${status}`,
    };
  } catch (err) {
    console.error('[updateDeliveryStatus] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// COURIER ACTIONS
// =============================================================================

/**
 * Creates a new courier company.
 *
 * @param input - The courier data
 * @returns ActionResult with the created courier on success
 */
export async function createCourier(
  input: z.infer<typeof CreateCourierSchema>
): Promise<ActionResult<CourierCompany>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateCourierSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, company_name, email, website, ...rest } = validationResult.data;

    // 3. Normalize empty strings to null
    const normalizedEmail = email && email.trim() !== '' ? email.trim() : null;
    const normalizedWebsite = website && website.trim() !== '' ? website.trim() : null;

    // 4. Check for duplicate courier by company name
    const { data: existingByName } = await supabase
      .from('courier_companies')
      .select('id_courier')
      .eq('id_shop', id_shop)
      .eq('company_name', company_name.trim())
      .is('deleted_at', null)
      .single();

    if (existingByName) {
      return {
        success: false,
        error: 'A courier with this company name already exists',
        code: 'duplicate_company_name',
      };
    }

    // 5. Create courier
    const { data, error } = await supabase
      .from('courier_companies')
      .insert({
        id_shop,
        company_name: company_name.trim(),
        email: normalizedEmail,
        website: normalizedWebsite,
        ...rest,
        contact_person: rest.contact_person?.trim() || null,
        phone: rest.phone?.trim() || null,
        notes: rest.notes?.trim() || null,
        created_by: authData.publicUser.id_user,
        // Financial fields are initialized by database defaults:
        // - current_balance: 0
      })
      .select()
      .single();

    if (error) {
      console.error('[createCourier] Database error:', error);
      return {
        success: false,
        error: 'Failed to create courier',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateCourierPaths(id_shop);

    return {
      success: true,
      data,
      message: 'Courier created successfully',
    };
  } catch (err) {
    console.error('[createCourier] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates an existing courier company.
 *
 * NOTE: This action ONLY updates profile fields.
 * current_balance is managed by database triggers and CANNOT be updated directly.
 *
 * @param input - The courier update data
 * @returns ActionResult with the updated courier on success
 */
export async function updateCourier(
  input: z.infer<typeof UpdateCourierSchema>
): Promise<ActionResult<CourierCompany>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateCourierSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_courier, ...updateFields } = validationResult.data;

    // 3. Check if courier exists
    const { data: existingCourier, error: fetchError } = await supabase
      .from('courier_companies')
      .select('id_shop, company_name')
      .eq('id_courier', id_courier)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingCourier) {
      return {
        success: false,
        error: 'Courier not found',
        code: 'not_found',
      };
    }

    // 4. Check for duplicate company name if being changed
    const normalizedCompanyName = updateFields.company_name?.trim();
    if (normalizedCompanyName && normalizedCompanyName !== existingCourier.company_name) {
      const { data: duplicateName } = await supabase
        .from('courier_companies')
        .select('id_courier')
        .eq('id_shop', existingCourier.id_shop)
        .eq('company_name', normalizedCompanyName)
        .is('deleted_at', null)
        .neq('id_courier', id_courier)
        .single();

      if (duplicateName) {
        return {
          success: false,
          error: 'A courier with this company name already exists',
          code: 'duplicate_company_name',
        };
      }
    }

    // 5. Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: authData.publicUser.id_user,
    };

    if (updateFields.company_name !== undefined) {
      updateData.company_name = normalizedCompanyName;
    }
    if (updateFields.contact_person !== undefined) {
      updateData.contact_person = updateFields.contact_person?.trim() || null;
    }
    if (updateFields.phone !== undefined) {
      updateData.phone = updateFields.phone?.trim() || null;
    }
    if (updateFields.email !== undefined) {
      updateData.email =
        updateFields.email && updateFields.email.trim() !== '' ? updateFields.email.trim() : null;
    }
    if (updateFields.website !== undefined) {
      updateData.website =
        updateFields.website && updateFields.website.trim() !== ''
          ? updateFields.website.trim()
          : null;
    }
    if (updateFields.status !== undefined) {
      updateData.status = updateFields.status;
    }
    if (updateFields.notes !== undefined) {
      updateData.notes = updateFields.notes?.trim() || null;
    }

    // 6. Update courier
    const { data, error } = await supabase
      .from('courier_companies')
      .update(updateData)
      .eq('id_courier', id_courier)
      .select()
      .single();

    if (error) {
      console.error('[updateCourier] Database error:', error);
      return {
        success: false,
        error: 'Failed to update courier',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateCourierPaths(existingCourier.id_shop);

    return {
      success: true,
      data,
      message: 'Courier updated successfully',
    };
  } catch (err) {
    console.error('[updateCourier] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Soft deletes a courier company.
 *
 * @param id_courier - The courier ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteCourier(id_courier: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid courier ID');
    const validationResult = uuidSchema.safeParse(id_courier);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid courier ID',
        code: 'validation_error',
      };
    }

    // 3. Get courier and verify it exists
    const { data: courier, error: fetchError } = await supabase
      .from('courier_companies')
      .select('id_shop, current_balance')
      .eq('id_courier', id_courier)
      .is('deleted_at', null)
      .single();

    if (fetchError || !courier) {
      return {
        success: false,
        error: 'Courier not found',
        code: 'not_found',
      };
    }

    // 4. Check if courier has outstanding balance
    if (Number(courier.current_balance) !== 0) {
      return {
        success: false,
        error: `Cannot delete courier with outstanding balance of ${courier.current_balance}. Please settle the balance first.`,
        code: 'has_balance',
      };
    }

    // 5. Check if courier has pending deliveries
    const { data: pendingDeliveries, error: deliveryError } = await supabase
      .from('deliveries')
      .select('id_delivery')
      .eq('id_courier', id_courier)
      .in('status', ['pending', 'picked_up', 'in_transit'])
      .limit(1);

    if (!deliveryError && pendingDeliveries && pendingDeliveries.length > 0) {
      return {
        success: false,
        error: 'Cannot delete courier with pending deliveries',
        code: 'has_pending_deliveries',
      };
    }

    // 6. Soft delete courier
    const { error } = await supabase
      .from('courier_companies')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_courier', id_courier);

    if (error) {
      console.error('[deleteCourier] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete courier',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateCourierPaths(courier.id_shop);

    return {
      success: true,
      message: 'Courier deleted successfully',
    };
  } catch (err) {
    console.error('[deleteCourier] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// COURIER BALANCE & PAYMENT ACTIONS
// =============================================================================

/**
 * Gets a courier's balance information.
 *
 * IMPORTANT: This is a READ-ONLY operation. Courier balances are maintained
 * by database triggers through the courier_transactions ledger table.
 *
 * @param id_courier - The courier ID to get balance for
 * @returns ActionResult with courier balance information
 */
export async function getCourierBalance(id_courier: string): Promise<ActionResult<CourierBalance>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid courier ID');
    const validationResult = uuidSchema.safeParse(id_courier);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid courier ID',
        code: 'validation_error',
      };
    }

    // 3. Fetch courier balance data
    const { data, error } = await supabase
      .from('courier_companies')
      .select('id_courier, company_name, current_balance')
      .eq('id_courier', id_courier)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Courier not found',
          code: 'not_found',
        };
      }
      console.error('[getCourierBalance] Database error:', error);
      return {
        success: false,
        error: 'Failed to fetch courier balance',
        code: 'database_error',
      };
    }

    return {
      success: true,
      data: {
        id_courier: data.id_courier,
        company_name: data.company_name,
        current_balance: Number(data.current_balance),
      },
    };
  } catch (err) {
    console.error('[getCourierBalance] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Records a payment to a courier.
 *
 * This creates an IMMUTABLE courier_transaction record.
 * The courier's current_balance is updated by database triggers.
 *
 * IMPORTANT: courier_transactions uses immutable ledger pattern - INSERT only, no updates.
 *
 * @param input - The payment data
 * @returns ActionResult with the transaction and new balance
 */
export async function recordCourierPayment(
  input: z.infer<typeof RecordCourierPaymentSchema>
): Promise<ActionResult<CourierPaymentResult>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = RecordCourierPaymentSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_courier, amount, description, reference_type, reference_id } = validationResult.data;

    // 3. Get courier to verify existence and get current balance
    const { data: courier, error: courierError } = await supabase
      .from('courier_companies')
      .select('id_shop, current_balance, company_name')
      .eq('id_courier', id_courier)
      .is('deleted_at', null)
      .single();

    if (courierError || !courier) {
      return {
        success: false,
        error: 'Courier not found',
        code: 'not_found',
      };
    }

    // 4. Calculate new balance (payment reduces what we owe)
    const currentBalance = Number(courier.current_balance);
    const newBalance = currentBalance - amount;

    // 5. Create courier transaction (immutable ledger entry)
    const { data: transaction, error: transactionError } = await supabase
      .from('courier_transactions')
      .insert({
        id_shop: courier.id_shop,
        id_courier,
        transaction_type: 'payment',
        credit_amount: amount, // Payment is a credit (reduces what we owe)
        debit_amount: 0,
        balance_after: newBalance,
        reference_type: reference_type || 'payment',
        reference_id: reference_id || null,
        description: description?.trim() || `Payment to ${courier.company_name}`,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (transactionError) {
      console.error('[recordCourierPayment] Transaction error:', transactionError);
      return {
        success: false,
        error: 'Failed to record payment',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateCourierPaths(courier.id_shop);

    return {
      success: true,
      data: {
        transaction,
        new_balance: newBalance,
      },
      message: `Payment of ${amount} recorded successfully`,
    };
  } catch (err) {
    console.error('[recordCourierPayment] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}
