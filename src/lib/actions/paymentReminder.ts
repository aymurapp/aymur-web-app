'use server';

/**
 * Payment Reminder Server Actions
 *
 * Server-side actions for managing payment reminders in the Aymur Platform.
 * These actions handle CRUD operations for payment reminders as well as
 * specialized operations like marking complete and snoozing.
 *
 * Key features:
 * - Create, update, and soft-delete payment reminders
 * - Mark reminders as completed
 * - Snooze reminders (push due date forward)
 * - Get upcoming and overdue reminders for dashboard widgets
 *
 * RLS Note: All queries are automatically filtered by get_user_shop_ids()
 * embedded in JWT claims. No manual shop filtering needed.
 *
 * @module lib/actions/paymentReminder
 */

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import {
  paymentReminderCreateSchema,
  paymentReminderUpdateSchema,
  markReminderCompleteSchema,
  snoozeReminderSchema,
  calculateSnoozedDueDate,
} from '@/lib/utils/schemas/paymentReminder';

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

// Database row type - using generic type since payment_reminders may not be in generated types
type PaymentReminder = {
  id_reminder: string;
  id_shop: string;
  id_supplier: string;
  id_purchase: string | null;
  id_payment: string | null;
  reminder_type: string;
  due_date: string;
  amount: number;
  status: string;
  reminder_count: number;
  last_reminded_at: string | null;
  next_reminder_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/**
 * Payment reminder with supplier details
 * Note: Database column is contact_person (not contact_name)
 */
export interface PaymentReminderWithSupplier extends PaymentReminder {
  supplier: {
    id_supplier: string;
    company_name: string;
    contact_person: string | null;
    phone: string | null;
    current_balance: number;
  } | null;
}

/**
 * Result for upcoming reminders query
 */
export interface UpcomingRemindersResult {
  reminders: PaymentReminderWithSupplier[];
  total_count: number;
  total_amount: number;
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
 * Standard revalidation paths for payment reminder changes
 */
function revalidateReminderPaths(shopId: string, locale: string = 'en') {
  revalidatePath(`/${locale}/${shopId}/suppliers`, 'page');
  revalidatePath(`/${locale}/${shopId}/dashboard`, 'page');
  revalidatePath(`/${locale}/${shopId}`, 'layout');
}

// =============================================================================
// CREATE PAYMENT REMINDER
// =============================================================================

/**
 * Creates a new payment reminder.
 *
 * @param input - The reminder data
 * @returns ActionResult with the created reminder on success
 *
 * @example
 * ```tsx
 * const result = await createReminder({
 *   id_shop: 'shop-uuid',
 *   id_supplier: 'supplier-uuid',
 *   reminder_type: 'payment_due',
 *   due_date: '2024-02-15',
 *   amount: 5000,
 *   notes: 'Monthly payment for gold supplies'
 * });
 * ```
 */
export async function createReminder(
  input: z.infer<typeof paymentReminderCreateSchema>
): Promise<ActionResult<PaymentReminder>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = paymentReminderCreateSchema.safeParse(input);
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
      id_purchase,
      id_payment,
      reminder_type,
      due_date,
      amount,
      status,
      next_reminder_date,
      notes,
    } = validationResult.data;

    // 3. Verify supplier exists and get shop context
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id_shop, company_name')
      .eq('id_supplier', id_supplier)
      .is('deleted_at', null)
      .single();

    if (supplierError || !supplier) {
      return {
        success: false,
        error: 'Supplier not found',
        code: 'supplier_not_found',
      };
    }

    // Use supplier's shop_id if not provided
    const shopId = id_shop || supplier.id_shop;

    // 4. Create payment reminder
    const { data, error } = await supabase
      .from('payment_reminders')
      .insert({
        id_shop: shopId,
        id_supplier,
        id_purchase: id_purchase || null,
        id_payment: id_payment || null,
        reminder_type,
        due_date,
        amount,
        status: status || 'pending',
        reminder_count: 0,
        next_reminder_date: next_reminder_date || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[createReminder] Database error:', error);
      return {
        success: false,
        error: 'Failed to create payment reminder',
        code: 'database_error',
      };
    }

    // 5. Revalidate paths
    revalidateReminderPaths(shopId);

    return {
      success: true,
      data: data as PaymentReminder,
      message: 'Payment reminder created successfully',
    };
  } catch (err) {
    console.error('[createReminder] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// UPDATE PAYMENT REMINDER
// =============================================================================

/**
 * Updates an existing payment reminder.
 *
 * @param input - The reminder update data
 * @returns ActionResult with the updated reminder on success
 *
 * @example
 * ```tsx
 * const result = await updateReminder({
 *   id_reminder: 'reminder-uuid',
 *   due_date: '2024-02-20',
 *   notes: 'Extended due date per agreement'
 * });
 * ```
 */
export async function updateReminder(
  input: z.infer<typeof paymentReminderUpdateSchema>
): Promise<ActionResult<PaymentReminder>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = paymentReminderUpdateSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_reminder, ...updateFields } = validationResult.data;

    // 3. Check if reminder exists
    const { data: existingReminder, error: fetchError } = await supabase
      .from('payment_reminders')
      .select('id_shop, status')
      .eq('id_reminder', id_reminder)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingReminder) {
      return {
        success: false,
        error: 'Payment reminder not found',
        code: 'not_found',
      };
    }

    // 4. Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updateFields.id_supplier !== undefined) {
      updateData.id_supplier = updateFields.id_supplier;
    }
    if (updateFields.id_purchase !== undefined) {
      updateData.id_purchase = updateFields.id_purchase;
    }
    if (updateFields.id_payment !== undefined) {
      updateData.id_payment = updateFields.id_payment;
    }
    if (updateFields.reminder_type !== undefined) {
      updateData.reminder_type = updateFields.reminder_type;
    }
    if (updateFields.due_date !== undefined) {
      updateData.due_date = updateFields.due_date;
    }
    if (updateFields.amount !== undefined) {
      updateData.amount = updateFields.amount;
    }
    if (updateFields.status !== undefined) {
      updateData.status = updateFields.status;
    }
    if (updateFields.next_reminder_date !== undefined) {
      updateData.next_reminder_date = updateFields.next_reminder_date;
    }
    if (updateFields.notes !== undefined) {
      updateData.notes = updateFields.notes?.trim() || null;
    }

    // 5. Update reminder
    const { data, error } = await supabase
      .from('payment_reminders')
      .update(updateData)
      .eq('id_reminder', id_reminder)
      .select()
      .single();

    if (error) {
      console.error('[updateReminder] Database error:', error);
      return {
        success: false,
        error: 'Failed to update payment reminder',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateReminderPaths(existingReminder.id_shop);

    return {
      success: true,
      data: data as PaymentReminder,
      message: 'Payment reminder updated successfully',
    };
  } catch (err) {
    console.error('[updateReminder] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// DELETE PAYMENT REMINDER (SOFT DELETE)
// =============================================================================

/**
 * Soft deletes a payment reminder.
 *
 * Sets the deleted_at timestamp rather than removing the record.
 *
 * @param id_reminder - The reminder ID to delete
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await deleteReminder('reminder-uuid');
 * if (result.success) {
 *   message.success('Reminder deleted');
 * }
 * ```
 */
export async function deleteReminder(id_reminder: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid reminder ID');
    const validationResult = uuidSchema.safeParse(id_reminder);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid reminder ID',
        code: 'validation_error',
      };
    }

    // 3. Get reminder to verify existence
    const { data: reminder, error: fetchError } = await supabase
      .from('payment_reminders')
      .select('id_shop')
      .eq('id_reminder', id_reminder)
      .is('deleted_at', null)
      .single();

    if (fetchError || !reminder) {
      return {
        success: false,
        error: 'Payment reminder not found',
        code: 'not_found',
      };
    }

    // 4. Soft delete reminder
    const { error } = await supabase
      .from('payment_reminders')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id_reminder', id_reminder);

    if (error) {
      console.error('[deleteReminder] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete payment reminder',
        code: 'database_error',
      };
    }

    // 5. Revalidate paths
    revalidateReminderPaths(reminder.id_shop);

    return {
      success: true,
      message: 'Payment reminder deleted successfully',
    };
  } catch (err) {
    console.error('[deleteReminder] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// MARK AS COMPLETED
// =============================================================================

/**
 * Marks a payment reminder as completed.
 *
 * @param input - The completion data with reminder ID and optional notes
 * @returns ActionResult with the updated reminder on success
 *
 * @example
 * ```tsx
 * const result = await markAsCompleted({
 *   id_reminder: 'reminder-uuid',
 *   completion_notes: 'Payment made via bank transfer'
 * });
 * ```
 */
export async function markAsCompleted(
  input: z.infer<typeof markReminderCompleteSchema>
): Promise<ActionResult<PaymentReminder>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = markReminderCompleteSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_reminder, completion_notes } = validationResult.data;

    // 3. Get reminder to verify existence and current status
    const { data: existingReminder, error: fetchError } = await supabase
      .from('payment_reminders')
      .select('id_shop, status, notes')
      .eq('id_reminder', id_reminder)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingReminder) {
      return {
        success: false,
        error: 'Payment reminder not found',
        code: 'not_found',
      };
    }

    if (existingReminder.status === 'completed') {
      return {
        success: false,
        error: 'Payment reminder is already completed',
        code: 'already_completed',
      };
    }

    // 4. Append completion notes to existing notes if provided
    let updatedNotes = existingReminder.notes || '';
    if (completion_notes) {
      const timestamp = new Date().toISOString().split('T')[0];
      updatedNotes = updatedNotes
        ? `${updatedNotes}\n\n[${timestamp}] Completed: ${completion_notes}`
        : `[${timestamp}] Completed: ${completion_notes}`;
    }

    // 5. Update reminder to completed
    const { data, error } = await supabase
      .from('payment_reminders')
      .update({
        status: 'completed',
        notes: updatedNotes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id_reminder', id_reminder)
      .select()
      .single();

    if (error) {
      console.error('[markAsCompleted] Database error:', error);
      return {
        success: false,
        error: 'Failed to mark reminder as completed',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateReminderPaths(existingReminder.id_shop);

    return {
      success: true,
      data: data as PaymentReminder,
      message: 'Payment reminder marked as completed',
    };
  } catch (err) {
    console.error('[markAsCompleted] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// SNOOZE REMINDER
// =============================================================================

/**
 * Snoozes a payment reminder by pushing the due date forward.
 *
 * @param input - The snooze data with reminder ID, days to snooze, and optional reason
 * @returns ActionResult with the updated reminder on success
 *
 * @example
 * ```tsx
 * const result = await snoozeReminder({
 *   id_reminder: 'reminder-uuid',
 *   snooze_days: 7,
 *   snooze_reason: 'Supplier agreed to extend payment deadline'
 * });
 * ```
 */
export async function snoozeReminder(
  input: z.infer<typeof snoozeReminderSchema>
): Promise<ActionResult<PaymentReminder>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = snoozeReminderSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_reminder, snooze_days, snooze_reason } = validationResult.data;

    // 3. Get reminder to verify existence and get current due date
    const { data: existingReminder, error: fetchError } = await supabase
      .from('payment_reminders')
      .select('id_shop, status, due_date, notes, reminder_count')
      .eq('id_reminder', id_reminder)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingReminder) {
      return {
        success: false,
        error: 'Payment reminder not found',
        code: 'not_found',
      };
    }

    if (existingReminder.status === 'completed') {
      return {
        success: false,
        error: 'Cannot snooze a completed reminder',
        code: 'already_completed',
      };
    }

    // 4. Calculate new due date
    const newDueDate = calculateSnoozedDueDate(existingReminder.due_date, snooze_days);

    // 5. Append snooze reason to notes if provided
    let updatedNotes = existingReminder.notes || '';
    if (snooze_reason) {
      const timestamp = new Date().toISOString().split('T')[0];
      updatedNotes = updatedNotes
        ? `${updatedNotes}\n\n[${timestamp}] Snoozed ${snooze_days} days: ${snooze_reason}`
        : `[${timestamp}] Snoozed ${snooze_days} days: ${snooze_reason}`;
    }

    // 6. Update reminder with new due date and snoozed status
    const { data, error } = await supabase
      .from('payment_reminders')
      .update({
        status: 'snoozed',
        due_date: newDueDate,
        notes: updatedNotes.trim() || null,
        reminder_count: (existingReminder.reminder_count || 0) + 1,
        last_reminded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id_reminder', id_reminder)
      .select()
      .single();

    if (error) {
      console.error('[snoozeReminder] Database error:', error);
      return {
        success: false,
        error: 'Failed to snooze reminder',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateReminderPaths(existingReminder.id_shop);

    return {
      success: true,
      data: data as PaymentReminder,
      message: `Payment reminder snoozed for ${snooze_days} days (new due date: ${newDueDate})`,
    };
  } catch (err) {
    console.error('[snoozeReminder] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GET UPCOMING REMINDERS (FOR DASHBOARD WIDGET)
// =============================================================================

/**
 * Gets upcoming payment reminders due within the specified number of days.
 * Used for dashboard widgets.
 *
 * @param shopId - The shop ID to filter reminders for
 * @param daysAhead - Number of days to look ahead (default: 7)
 * @param limit - Maximum number of reminders to return (default: 10)
 * @returns ActionResult with upcoming reminders and summary
 *
 * @example
 * ```tsx
 * const result = await getUpcomingReminders('shop-uuid', 7, 10);
 * if (result.success) {
 *   console.log(`${result.data.total_count} reminders due in next 7 days`);
 *   console.log(`Total amount: ${result.data.total_amount}`);
 * }
 * ```
 */
export async function getUpcomingReminders(
  shopId: string,
  daysAhead: number = 7,
  limit: number = 10
): Promise<ActionResult<UpcomingRemindersResult>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate inputs
    const uuidSchema = z.string().uuid('Invalid shop ID');
    const shopValidation = uuidSchema.safeParse(shopId);
    if (!shopValidation.success) {
      return {
        success: false,
        error: 'Invalid shop ID',
        code: 'validation_error',
      };
    }

    // 3. Calculate date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    // 4. Fetch upcoming reminders with supplier details
    // Note: Database column is contact_person (not contact_name)
    const { data, error, count } = await supabase
      .from('payment_reminders')
      .select(
        `
        *,
        supplier:suppliers!fk_payment_reminders_supplier (
          id_supplier,
          company_name,
          contact_person,
          phone,
          current_balance
        )
      `,
        { count: 'exact' }
      )
      .eq('id_shop', shopId)
      .neq('status', 'completed')
      .gte('due_date', todayStr)
      .lte('due_date', futureDateStr)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[getUpcomingReminders] Database error:', error);
      return {
        success: false,
        error: 'Failed to fetch upcoming reminders',
        code: 'database_error',
      };
    }

    // 5. Calculate total amount
    const totalAmount = (data || []).reduce(
      (sum, reminder) => sum + Number(reminder.amount || 0),
      0
    );

    return {
      success: true,
      data: {
        // Cast through unknown since TypeScript types don't include the relationship
        reminders: (data || []) as unknown as PaymentReminderWithSupplier[],
        total_count: count || 0,
        total_amount: totalAmount,
      },
    };
  } catch (err) {
    console.error('[getUpcomingReminders] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GET OVERDUE REMINDERS (FOR DASHBOARD WIDGET)
// =============================================================================

/**
 * Gets overdue payment reminders (past due date, not completed).
 * Used for dashboard widgets and alerts.
 *
 * @param shopId - The shop ID to filter reminders for
 * @param limit - Maximum number of reminders to return (default: 10)
 * @returns ActionResult with overdue reminders and summary
 *
 * @example
 * ```tsx
 * const result = await getOverdueReminders('shop-uuid', 10);
 * if (result.success && result.data.total_count > 0) {
 *   alert(`Warning: ${result.data.total_count} overdue reminders!`);
 * }
 * ```
 */
export async function getOverdueReminders(
  shopId: string,
  limit: number = 10
): Promise<ActionResult<UpcomingRemindersResult>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate inputs
    const uuidSchema = z.string().uuid('Invalid shop ID');
    const shopValidation = uuidSchema.safeParse(shopId);
    if (!shopValidation.success) {
      return {
        success: false,
        error: 'Invalid shop ID',
        code: 'validation_error',
      };
    }

    // 3. Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // 4. Fetch overdue reminders with supplier details
    // Note: Database column is contact_person (not contact_name)
    const { data, error, count } = await supabase
      .from('payment_reminders')
      .select(
        `
        *,
        supplier:suppliers!fk_payment_reminders_supplier (
          id_supplier,
          company_name,
          contact_person,
          phone,
          current_balance
        )
      `,
        { count: 'exact' }
      )
      .eq('id_shop', shopId)
      .neq('status', 'completed')
      .lt('due_date', todayStr)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[getOverdueReminders] Database error:', error);
      return {
        success: false,
        error: 'Failed to fetch overdue reminders',
        code: 'database_error',
      };
    }

    // 5. Calculate total amount
    const totalAmount = (data || []).reduce(
      (sum, reminder) => sum + Number(reminder.amount || 0),
      0
    );

    return {
      success: true,
      data: {
        // Cast through unknown since TypeScript types don't include the relationship
        reminders: (data || []) as unknown as PaymentReminderWithSupplier[],
        total_count: count || 0,
        total_amount: totalAmount,
      },
    };
  } catch (err) {
    console.error('[getOverdueReminders] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}
