'use server';

/**
 * Supplier Server Actions
 *
 * Server-side actions for managing suppliers in the Aymur Platform.
 * These actions handle CRUD operations for supplier profile data and payments.
 *
 * Key features:
 * - Create, update, and soft-delete suppliers
 * - Read-only balance access (balance is maintained by database triggers)
 * - Record payments (creates immutable supplier_transaction)
 *
 * IMPORTANT NOTES:
 * - `suppliers.current_balance` is COMPUTED by database triggers - DO NOT update directly
 * - `supplier_transactions` is IMMUTABLE - only INSERT operations allowed
 * - Balance changes happen through purchases/payments, which trigger supplier_transactions entries
 * - These server actions handle supplier profile data and payment recording
 *
 * RLS Note: All queries are automatically filtered by get_user_shop_ids()
 * embedded in JWT claims. No manual shop filtering needed.
 *
 * @module lib/actions/supplier
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
 * All server actions should return this type.
 */
export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; code?: string };

// Database row types
type Supplier = Database['public']['Tables']['suppliers']['Row'];
type SupplierTransaction = Database['public']['Tables']['supplier_transactions']['Row'];

/**
 * Supplier balance information (read-only from application perspective)
 * NOTE: Database only has current_balance - no total_purchases, total_payments, credit_limit, credit_terms_days
 */
export interface SupplierBalance {
  id_supplier: string;
  company_name: string;
  current_balance: number;
}

/**
 * Payment recording result
 */
export interface PaymentResult {
  transaction: SupplierTransaction;
  new_balance: number;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Supplier validation schema
 * Database columns: id_supplier_category, contact_person, phone, email, address, tax_id, status, notes
 * NOTE: No city, country, bank_name, bank_account_*, swift_code, credit_limit, credit_terms_days, website columns
 */
const SupplierSchema = z.object({
  company_name: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(255, 'Company name cannot exceed 255 characters'),
  contact_person: z
    .string()
    .max(255, 'Contact person cannot exceed 255 characters')
    .nullable()
    .optional(),
  phone: z.string().max(50, 'Phone must be less than 50 characters').nullable().optional(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .nullable()
    .optional()
    .or(z.literal('')),
  id_supplier_category: z.string().uuid('Invalid category ID').nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  tax_id: z.string().max(50).nullable().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  notes: z.string().max(5000).nullable().optional(),
});

const CreateSupplierSchema = SupplierSchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
});

const UpdateSupplierSchema = SupplierSchema.partial().extend({
  id_supplier: z.string().uuid('Invalid supplier ID'),
});

/**
 * Payment recording schema
 */
const RecordPaymentSchema = z.object({
  id_supplier: z.string().uuid('Invalid supplier ID'),
  amount: z.number().positive('Amount must be positive'),
  transaction_date: z
    .string()
    .refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid transaction date' }),
  notes: z.string().max(1000).nullable().optional(),
  reference_type: z.enum(['purchase', 'payment', 'manual', 'return']).nullable().optional(),
  reference_id: z.string().uuid().nullable().optional(),
  // Payment type and breakdown
  payment_type: z.enum(['cash', 'card', 'transfer', 'cheque', 'gold']).default('cash'),
  // Cheque payment fields
  cheque_number: z.string().max(50).nullable().optional(),
  cheque_bank: z.string().max(100).nullable().optional(),
  cheque_date: z.string().nullable().optional(),
  // Gold payment fields
  gold_weight_grams: z.number().positive().nullable().optional(),
  gold_rate_per_gram: z.number().positive().nullable().optional(),
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
 * Standard revalidation paths for supplier changes
 */
function revalidateSupplierPaths(shopId: string, locale: string = 'en') {
  revalidatePath(`/${locale}/${shopId}/suppliers`, 'page');
  revalidatePath(`/${locale}/${shopId}/purchases`, 'page');
  revalidatePath(`/${locale}/${shopId}`, 'layout');
}

// =============================================================================
// CREATE SUPPLIER
// =============================================================================

/**
 * Creates a new supplier.
 *
 * @param input - The supplier data
 * @returns ActionResult with the created supplier on success
 *
 * @example
 * ```tsx
 * const result = await createSupplier({
 *   id_shop: 'shop-uuid',
 *   company_name: 'Gold Supplier Co.',
 *   contact_person: 'John Doe',
 *   phone: '+1234567890'
 * });
 * ```
 */
export async function createSupplier(
  input: z.infer<typeof CreateSupplierSchema>
): Promise<ActionResult<Supplier>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateSupplierSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, company_name, email, ...rest } = validationResult.data;

    // 3. Normalize empty email to null
    const normalizedEmail = email && email.trim() !== '' ? email.trim() : null;

    // 4. Check for duplicate supplier by company name in same shop
    const { data: existingByName } = await supabase
      .from('suppliers')
      .select('id_supplier')
      .eq('id_shop', id_shop)
      .eq('company_name', company_name.trim())
      .is('deleted_at', null)
      .single();

    if (existingByName) {
      return {
        success: false,
        error: 'A supplier with this company name already exists',
        code: 'duplicate_company_name',
      };
    }

    // 5. Check for duplicate supplier by email in same shop (if email provided)
    if (normalizedEmail) {
      const { data: existingByEmail } = await supabase
        .from('suppliers')
        .select('id_supplier')
        .eq('id_shop', id_shop)
        .eq('email', normalizedEmail)
        .is('deleted_at', null)
        .single();

      if (existingByEmail) {
        return {
          success: false,
          error: 'A supplier with this email already exists',
          code: 'duplicate_email',
        };
      }
    }

    // 6. Create supplier (RLS ensures user has access to this shop)
    // NOTE: current_balance, total_purchases, total_payments are managed by DB triggers
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        id_shop,
        company_name: company_name.trim(),
        email: normalizedEmail,
        ...rest,
        contact_person: rest.contact_person?.trim() || null,
        phone: rest.phone?.trim() || null,
        notes: rest.notes?.trim() || null,
        created_by: authData.publicUser.id_user,
        // Financial fields are initialized by database defaults:
        // - total_purchases: 0
        // - total_payments: 0
        // - current_balance: 0
      })
      .select()
      .single();

    if (error) {
      console.error('[createSupplier] Database error:', error);
      return {
        success: false,
        error: 'Failed to create supplier',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateSupplierPaths(id_shop);

    return {
      success: true,
      data,
      message: 'Supplier created successfully',
    };
  } catch (err) {
    console.error('[createSupplier] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// UPDATE SUPPLIER
// =============================================================================

/**
 * Updates an existing supplier's profile data.
 *
 * NOTE: This action ONLY updates profile fields (name, contact, address, etc.).
 * Financial fields (current_balance, total_purchases, total_payments)
 * are managed by database triggers and CANNOT be updated directly.
 *
 * @param input - The supplier update data
 * @returns ActionResult with the updated supplier on success
 *
 * @example
 * ```tsx
 * const result = await updateSupplier({
 *   id_supplier: 'supplier-uuid',
 *   company_name: 'Updated Gold Supplier Co.',
 *   credit_limit: 50000
 * });
 * ```
 */
export async function updateSupplier(
  input: z.infer<typeof UpdateSupplierSchema>
): Promise<ActionResult<Supplier>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateSupplierSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_supplier, ...updateFields } = validationResult.data;

    // 3. Check if supplier exists and get shop_id
    const { data: existingSupplier, error: fetchError } = await supabase
      .from('suppliers')
      .select('id_shop, company_name, email')
      .eq('id_supplier', id_supplier)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingSupplier) {
      return {
        success: false,
        error: 'Supplier not found',
        code: 'not_found',
      };
    }

    // 4. Check for duplicate company name if being changed
    const normalizedCompanyName = updateFields.company_name?.trim();
    if (normalizedCompanyName && normalizedCompanyName !== existingSupplier.company_name) {
      const { data: duplicateName } = await supabase
        .from('suppliers')
        .select('id_supplier')
        .eq('id_shop', existingSupplier.id_shop)
        .eq('company_name', normalizedCompanyName)
        .is('deleted_at', null)
        .neq('id_supplier', id_supplier)
        .single();

      if (duplicateName) {
        return {
          success: false,
          error: 'A supplier with this company name already exists',
          code: 'duplicate_company_name',
        };
      }
    }

    // 5. Check for duplicate email if email is being changed
    const normalizedEmail =
      updateFields.email && updateFields.email.trim() !== '' ? updateFields.email.trim() : null;

    if (normalizedEmail && normalizedEmail !== existingSupplier.email) {
      const { data: duplicateEmail } = await supabase
        .from('suppliers')
        .select('id_supplier')
        .eq('id_shop', existingSupplier.id_shop)
        .eq('email', normalizedEmail)
        .is('deleted_at', null)
        .neq('id_supplier', id_supplier)
        .single();

      if (duplicateEmail) {
        return {
          success: false,
          error: 'A supplier with this email already exists',
          code: 'duplicate_email',
        };
      }
    }

    // 6. Build update object (only profile fields)
    // Note: Using correct database column names:
    // - id_supplier_category (FK to supplier_categories)
    // - contact_person (not contact_name)
    // - address (single text field, no city/country)
    // - status (varchar)
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
      updateData.email = normalizedEmail;
    }
    if (updateFields.id_supplier_category !== undefined) {
      updateData.id_supplier_category = updateFields.id_supplier_category;
    }
    if (updateFields.address !== undefined) {
      updateData.address = updateFields.address?.trim() || null;
    }
    if (updateFields.tax_id !== undefined) {
      updateData.tax_id = updateFields.tax_id?.trim() || null;
    }
    if (updateFields.status !== undefined) {
      updateData.status = updateFields.status;
    }
    if (updateFields.notes !== undefined) {
      updateData.notes = updateFields.notes?.trim() || null;
    }

    // 7. Update supplier
    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id_supplier', id_supplier)
      .select()
      .single();

    if (error) {
      console.error('[updateSupplier] Database error:', error);
      return {
        success: false,
        error: 'Failed to update supplier',
        code: 'database_error',
      };
    }

    // 8. Revalidate paths
    revalidateSupplierPaths(existingSupplier.id_shop);

    return {
      success: true,
      data,
      message: 'Supplier updated successfully',
    };
  } catch (err) {
    console.error('[updateSupplier] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// DELETE SUPPLIER (SOFT DELETE)
// =============================================================================

/**
 * Soft deletes a supplier.
 *
 * Sets the deleted_at timestamp rather than removing the record.
 * This preserves historical data and references in purchases/transactions.
 *
 * @param id_supplier - The supplier ID to delete
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await deleteSupplier('supplier-uuid');
 * if (result.success) {
 *   message.success('Supplier deleted');
 * }
 * ```
 */
export async function deleteSupplier(id_supplier: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid supplier ID');
    const validationResult = uuidSchema.safeParse(id_supplier);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid supplier ID',
        code: 'validation_error',
      };
    }

    // 3. Get supplier and verify they exist
    const { data: supplier, error: fetchError } = await supabase
      .from('suppliers')
      .select('id_shop, current_balance')
      .eq('id_supplier', id_supplier)
      .is('deleted_at', null)
      .single();

    if (fetchError || !supplier) {
      return {
        success: false,
        error: 'Supplier not found',
        code: 'not_found',
      };
    }

    // 4. Check if supplier has outstanding balance
    if (supplier.current_balance !== 0) {
      return {
        success: false,
        error: `Cannot delete supplier with outstanding balance of ${supplier.current_balance}. Please settle the balance first.`,
        code: 'has_balance',
      };
    }

    // 5. Soft delete supplier
    const { error } = await supabase
      .from('suppliers')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_supplier', id_supplier);

    if (error) {
      console.error('[deleteSupplier] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete supplier',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateSupplierPaths(supplier.id_shop);

    return {
      success: true,
      message: 'Supplier deleted successfully',
    };
  } catch (err) {
    console.error('[deleteSupplier] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GET SUPPLIER BALANCE (READ-ONLY)
// =============================================================================

/**
 * Gets a supplier's balance information.
 *
 * IMPORTANT: This is a READ-ONLY operation. Supplier balances are maintained
 * by database triggers through the supplier_transactions ledger table.
 * Balance changes occur automatically when:
 * - A purchase is created (increases what we owe)
 * - A payment is made (decreases what we owe)
 * - A return/credit note is processed
 *
 * The supplier_transactions table is IMMUTABLE - it only allows INSERTs.
 *
 * @param id_supplier - The supplier ID to get balance for
 * @returns ActionResult with supplier balance information
 *
 * @example
 * ```tsx
 * const result = await getSupplierBalance('supplier-uuid');
 * if (result.success) {
 *   console.log(`Balance: ${result.data?.current_balance}`);
 *   console.log(`Credit Limit: ${result.data?.credit_limit}`);
 * }
 * ```
 */
export async function getSupplierBalance(
  id_supplier: string
): Promise<ActionResult<SupplierBalance>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid supplier ID');
    const validationResult = uuidSchema.safeParse(id_supplier);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid supplier ID',
        code: 'validation_error',
      };
    }

    // 3. Fetch supplier balance data (RLS ensures shop access)
    // NOTE: Database only has current_balance column - no total_purchases, total_payments, credit_limit
    const { data, error } = await supabase
      .from('suppliers')
      .select(
        `
        id_supplier,
        company_name,
        current_balance
      `
      )
      .eq('id_supplier', id_supplier)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Supplier not found',
          code: 'not_found',
        };
      }
      console.error('[getSupplierBalance] Database error:', error);
      return {
        success: false,
        error: 'Failed to fetch supplier balance',
        code: 'database_error',
      };
    }

    return {
      success: true,
      data: {
        id_supplier: data.id_supplier,
        company_name: data.company_name,
        current_balance: Number(data.current_balance),
      },
    };
  } catch (err) {
    console.error('[getSupplierBalance] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// RECORD SUPPLIER PAYMENT
// =============================================================================

/**
 * Records a payment to a supplier.
 *
 * This creates an IMMUTABLE supplier_transaction record.
 * The supplier's current_balance and total_payments are updated by database triggers.
 *
 * IMPORTANT: supplier_transactions uses immutable ledger pattern - INSERT only, no updates.
 *
 * @param input - The payment data
 * @returns ActionResult with the transaction and new balance
 *
 * @example
 * ```tsx
 * const result = await recordSupplierPayment({
 *   id_supplier: 'supplier-uuid',
 *   amount: 5000,
 *   transaction_date: '2024-01-15',
 *   notes: 'Payment for January purchases'
 * });
 * if (result.success) {
 *   console.log(`New balance: ${result.data?.new_balance}`);
 * }
 * ```
 */
export async function recordSupplierPayment(
  input: z.infer<typeof RecordPaymentSchema>
): Promise<ActionResult<PaymentResult>> {
  try {
    const supabase = await createClient();

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
      id_supplier,
      amount,
      transaction_date,
      notes,
      reference_type,
      reference_id,
      payment_type,
      cheque_number,
      cheque_bank,
      cheque_date,
      gold_weight_grams,
      gold_rate_per_gram,
    } = validationResult.data;

    // 3. Get supplier to verify existence and get current balance
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id_shop, current_balance, company_name')
      .eq('id_supplier', id_supplier)
      .is('deleted_at', null)
      .single();

    if (supplierError || !supplier) {
      return {
        success: false,
        error: 'Supplier not found',
        code: 'not_found',
      };
    }

    // 4. Calculate new balance (payment reduces what we owe)
    const newBalance = Number(supplier.current_balance) - amount;
    const paymentDate = transaction_date.slice(0, 10); // Ensure YYYY-MM-DD format

    // 5. Create supplier_payments record (actual payment details)
    // Calculate gold_amount if gold payment
    const goldAmount =
      payment_type === 'gold' && gold_weight_grams && gold_rate_per_gram
        ? gold_weight_grams * gold_rate_per_gram
        : null;

    const { data: paymentRecord, error: paymentError } = await supabase
      .from('supplier_payments')
      .insert({
        id_shop: supplier.id_shop,
        id_supplier,
        id_purchase: reference_type === 'purchase' ? reference_id : null,
        payment_type: payment_type || 'cash',
        amount,
        // Payment type breakdown amounts
        cash_amount: payment_type === 'cash' ? amount : 0,
        card_amount: payment_type === 'card' ? amount : 0,
        transfer_amount: payment_type === 'transfer' ? amount : 0,
        cheque_amount: payment_type === 'cheque' ? amount : 0,
        // Cheque details
        cheque_number: payment_type === 'cheque' ? cheque_number : null,
        cheque_bank: payment_type === 'cheque' ? cheque_bank : null,
        cheque_date: payment_type === 'cheque' && cheque_date ? cheque_date : null,
        cheque_status: payment_type === 'cheque' ? 'pending' : null,
        // Gold payment details
        gold_weight_grams: payment_type === 'gold' ? gold_weight_grams : null,
        gold_rate_per_gram: payment_type === 'gold' ? gold_rate_per_gram : null,
        gold_amount: goldAmount,
        // Common fields
        payment_date: paymentDate,
        notes: notes?.trim() || null,
        created_by: authData.publicUser.id_user,
      })
      .select('id_payment')
      .single();

    if (paymentError || !paymentRecord) {
      console.error('[recordSupplierPayment] Payment record error:', paymentError);
      return {
        success: false,
        error: 'Failed to create payment record',
        code: 'database_error',
      };
    }

    // 6. Create supplier_transactions ledger entry (referencing the payment)
    const { data: transaction, error: transactionError } = await supabase
      .from('supplier_transactions')
      .insert({
        id_shop: supplier.id_shop,
        id_supplier,
        transaction_type: 'payment',
        debit_amount: 0,
        credit_amount: amount, // Payment reduces what we owe
        balance_after: newBalance,
        reference_type: 'supplier_payment',
        reference_id: paymentRecord.id_payment,
        description: notes?.trim() || `Payment on ${paymentDate}`,
        transaction_date: paymentDate,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (transactionError) {
      console.error('[recordSupplierPayment] Transaction error:', transactionError);
      return {
        success: false,
        error: 'Failed to record payment in ledger',
        code: 'database_error',
      };
    }

    // 7. Update supplier's current_balance
    // Note: This should ideally be handled by a database trigger (sync_supplier_balance)
    // but we update it manually as a fallback
    const { error: updateSupplierError } = await supabase
      .from('suppliers')
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_supplier', id_supplier);

    if (updateSupplierError) {
      console.error(
        '[recordSupplierPayment] Failed to update supplier balance:',
        updateSupplierError
      );
      // Transaction was created but balance update failed - log for investigation
    }

    // 8. Note: Purchase paid_amount and payment_status are automatically updated
    // by the database trigger 'sync_purchase_payment_status_trigger' when a payment
    // is inserted with a linked id_purchase. No manual update needed here.

    // 9. Revalidate paths
    revalidateSupplierPaths(supplier.id_shop);

    return {
      success: true,
      data: {
        transaction,
        new_balance: newBalance,
      },
      message: `Payment of ${amount} recorded successfully`,
    };
  } catch (err) {
    console.error('[recordSupplierPayment] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}
