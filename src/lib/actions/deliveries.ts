'use server';

/**
 * Delivery Server Actions
 *
 * Server actions for managing deliveries. Used by the checkout flow
 * to create delivery records when delivery option is selected.
 *
 * @module lib/actions/deliveries
 */

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import type { Tables, TablesInsert } from '@/lib/types/database';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Delivery row type from the public.deliveries table
 */
export type Delivery = Tables<'deliveries'>;

/**
 * Delivery insert type for creating new deliveries
 */
export type DeliveryInsert = TablesInsert<'deliveries'>;

/**
 * Result type for delivery actions
 */
export interface DeliveryActionResult<T = Delivery> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Input for creating a delivery from checkout
 */
export interface CreateDeliveryFromCheckoutInput {
  id_shop: string;
  id_sale: string;
  id_courier: string;
  recipient_name?: string | null;
  delivery_address: string;
  delivery_cost: number;
  cost_paid_by: 'shop' | 'customer';
  estimated_delivery_date?: string | null;
  notes?: string | null;
  status?: string;
}

// =============================================================================
// DELIVERY ACTIONS
// =============================================================================

/**
 * Create a delivery record from checkout flow.
 *
 * This action is called when a user selects delivery option during checkout.
 * It creates a pending delivery record linked to the sale.
 *
 * @param input - Delivery creation input
 * @returns Result with created delivery or error
 *
 * @example
 * ```ts
 * const result = await createDeliveryFromCheckout({
 *   id_shop: 'shop-uuid',
 *   id_sale: 'sale-uuid',
 *   id_courier: 'courier-uuid',
 *   recipient_name: 'John Doe',
 *   delivery_address: '123 Main St, City',
 *   delivery_cost: 15.00,
 *   cost_paid_by: 'customer',
 *   estimated_delivery_date: '2024-01-15',
 * });
 *
 * if (result.success) {
 *   console.log('Delivery created:', result.data.id_delivery);
 * }
 * ```
 */
export async function createDeliveryFromCheckout(
  input: CreateDeliveryFromCheckoutInput
): Promise<DeliveryActionResult> {
  const supabase = await createClient();

  try {
    // 1. Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized: User not authenticated',
      };
    }

    // 2. Get public user ID
    const { data: publicUser, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    if (userError || !publicUser) {
      return {
        success: false,
        error: 'User profile not found',
      };
    }

    // 3. Validate the sale exists and belongs to the shop
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('id_sale, id_shop')
      .eq('id_sale', input.id_sale)
      .eq('id_shop', input.id_shop)
      .single();

    if (saleError || !sale) {
      return {
        success: false,
        error: 'Sale not found or does not belong to this shop',
      };
    }

    // 4. Validate the courier exists, belongs to the shop, and is active
    const { data: courier, error: courierError } = await supabase
      .from('courier_companies')
      .select('id_courier, company_name, status')
      .eq('id_courier', input.id_courier)
      .eq('id_shop', input.id_shop)
      .is('deleted_at', null)
      .single();

    if (courierError || !courier) {
      return {
        success: false,
        error: 'Courier not found or does not belong to this shop',
      };
    }

    if (courier.status !== 'active') {
      return {
        success: false,
        error: 'Selected courier is not active',
      };
    }

    // 5. Create the delivery record
    const deliveryData: DeliveryInsert = {
      id_shop: input.id_shop,
      id_sale: input.id_sale,
      id_courier: input.id_courier,
      recipient_name: input.recipient_name || null,
      delivery_address: input.delivery_address,
      delivery_cost: input.delivery_cost,
      cost_paid_by: input.cost_paid_by,
      estimated_delivery_date: input.estimated_delivery_date || null,
      notes: input.notes || null,
      status: input.status || 'pending',
      created_by: publicUser.id_user,
    };

    const { data: delivery, error: createError } = await supabase
      .from('deliveries')
      .insert(deliveryData)
      .select()
      .single();

    if (createError) {
      console.error('[createDeliveryFromCheckout] Insert error:', createError);
      return {
        success: false,
        error: `Failed to create delivery: ${createError.message}`,
      };
    }

    // 6. Revalidate related paths
    revalidatePath(`/${input.id_shop}/deliveries`);
    revalidatePath(`/${input.id_shop}/sales/${input.id_sale}`);

    return {
      success: true,
      data: delivery,
    };
  } catch (error) {
    console.error('[createDeliveryFromCheckout] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Update an existing delivery record.
 *
 * Used for updating delivery status, tracking number, dates, etc.
 *
 * @param id_delivery - The delivery ID to update
 * @param id_shop - The shop ID for RLS validation
 * @param updates - Fields to update
 * @returns Result with updated delivery or error
 */
export async function updateDelivery(
  id_delivery: string,
  id_shop: string,
  updates: Partial<Omit<DeliveryInsert, 'id_shop' | 'id_sale' | 'id_courier' | 'created_by'>>
): Promise<DeliveryActionResult> {
  const supabase = await createClient();

  try {
    // 1. Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized: User not authenticated',
      };
    }

    // 2. Get public user ID
    const { data: publicUser } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_id', user.id)
      .single();

    // 3. Update the delivery
    const { data: delivery, error: updateError } = await supabase
      .from('deliveries')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: publicUser?.id_user,
      })
      .eq('id_delivery', id_delivery)
      .eq('id_shop', id_shop)
      .select()
      .single();

    if (updateError) {
      console.error('[updateDelivery] Update error:', updateError);
      return {
        success: false,
        error: `Failed to update delivery: ${updateError.message}`,
      };
    }

    // 4. Revalidate related paths
    revalidatePath(`/${id_shop}/deliveries`);
    revalidatePath(`/${id_shop}/deliveries/${id_delivery}`);

    return {
      success: true,
      data: delivery,
    };
  } catch (error) {
    console.error('[updateDelivery] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Update delivery status with automatic date handling.
 *
 * Automatically sets:
 * - shipped_date when status changes to 'shipped' or 'in_transit'
 * - delivered_date when status changes to 'delivered'
 *
 * @param id_delivery - The delivery ID
 * @param id_shop - The shop ID
 * @param status - New status
 * @param additionalData - Optional tracking number or notes
 * @returns Result with updated delivery or error
 */
export async function updateDeliveryStatus(
  id_delivery: string,
  id_shop: string,
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'cancelled',
  additionalData?: {
    tracking_number?: string;
    notes?: string;
  }
): Promise<DeliveryActionResult> {
  const updates: Partial<DeliveryInsert> = {
    status,
    ...additionalData,
  };

  // Auto-set dates based on status
  const today = new Date().toISOString().split('T')[0];

  if (status === 'picked_up' || status === 'in_transit') {
    updates.shipped_date = today;
  }

  if (status === 'delivered') {
    updates.delivered_date = today;
  }

  return updateDelivery(id_delivery, id_shop, updates);
}

/**
 * Get delivery details for a specific sale.
 *
 * @param id_sale - The sale ID
 * @param id_shop - The shop ID
 * @returns Result with delivery or null if not found
 */
export async function getDeliveryBySale(
  id_sale: string,
  id_shop: string
): Promise<DeliveryActionResult<Delivery | null>> {
  const supabase = await createClient();

  try {
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized: User not authenticated',
      };
    }

    const { data: delivery, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('id_sale', id_sale)
      .eq('id_shop', id_shop)
      .maybeSingle();

    if (error) {
      console.error('[getDeliveryBySale] Query error:', error);
      return {
        success: false,
        error: `Failed to fetch delivery: ${error.message}`,
      };
    }

    return {
      success: true,
      data: delivery,
    };
  } catch (error) {
    console.error('[getDeliveryBySale] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
