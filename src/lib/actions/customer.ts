'use server';

/**
 * Customer Server Actions
 *
 * Server-side actions for managing customers in the Aymur Platform.
 * These actions handle CRUD operations for customer profile data only.
 *
 * Key features:
 * - Create, update, and soft-delete customers
 * - Read-only balance access (balance is maintained by database triggers)
 * - ID card image upload to Supabase Storage
 * - RLS-based multi-tenant security (shop_id context)
 *
 * IMPORTANT NOTES:
 * - `customers.current_balance` is COMPUTED by database triggers - DO NOT update directly
 * - `customer_transactions` is IMMUTABLE - only INSERT via database triggers
 * - Balance changes happen through sales/payments, which trigger customer_transactions entries
 * - These server actions handle customer profile data only, NOT financial transactions
 *
 * RLS Note: All queries are automatically filtered by get_user_shop_ids()
 * embedded in JWT claims. No manual shop filtering needed.
 *
 * @module lib/actions/customer
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
type Customer = Database['public']['Tables']['customers']['Row'];

/**
 * Customer balance information (read-only from application perspective)
 */
export interface CustomerBalance {
  id_customer: string;
  full_name: string;
  total_purchases: number;
  total_payments: number;
  current_balance: number;
  financial_status: string | null;
}

/**
 * ID card upload result
 */
export interface IdCardUploadResult {
  file_path: string;
  file_url: string;
  file_id: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Storage bucket name for customer documents
 */
const CUSTOMER_DOCUMENTS_BUCKET = 'customer-documents';

/**
 * Maximum file size for ID card uploads (5MB)
 */
const MAX_ID_CARD_SIZE = 5 * 1024 * 1024;

/**
 * Allowed MIME types for ID card uploads
 */
const ALLOWED_ID_CARD_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Customer validation schema
 */
const CustomerSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(255, 'Full name must be less than 255 characters'),
  phone: z.string().max(50, 'Phone must be less than 50 characters').nullable().optional(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .nullable()
    .optional()
    .or(z.literal('')),
  address: z.string().max(1000, 'Address must be less than 1000 characters').nullable().optional(),
  client_type: z
    .enum(['walk-in', 'regular', 'vip', 'collaboration'], {
      errorMap: () => ({
        message: 'Client type must be walk-in, regular, vip, or collaboration',
      }),
    })
    .default('walk-in'),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').nullable().optional(),
});

const CreateCustomerSchema = CustomerSchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
});

const UpdateCustomerSchema = CustomerSchema.partial().extend({
  id_customer: z.string().uuid('Invalid customer ID'),
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
 * Standard revalidation paths for customer changes
 */
function revalidateCustomerPaths(shopId: string, locale: string = 'en') {
  revalidatePath(`/${locale}/${shopId}/customers`, 'page');
  revalidatePath(`/${locale}/${shopId}/sales`, 'page');
  revalidatePath(`/${locale}/${shopId}`, 'layout');
}

/**
 * Validates the ID card file
 */
function validateIdCardFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (file.size > MAX_ID_CARD_SIZE) {
    return { valid: false, error: 'File size must be less than 5MB.' };
  }

  if (!ALLOWED_ID_CARD_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or PDF file.',
    };
  }

  return { valid: true };
}

/**
 * Generates a unique filename for the ID card
 */
function generateIdCardFilename(shopId: string, customerId: string, originalName: string): string {
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  return `${shopId}/customers/${customerId}/id-card-${timestamp}.${extension}`;
}

// =============================================================================
// CREATE CUSTOMER
// =============================================================================

/**
 * Creates a new customer.
 *
 * @param input - The customer data
 * @returns ActionResult with the created customer on success
 *
 * @example
 * ```tsx
 * const result = await createCustomer({
 *   id_shop: 'shop-uuid',
 *   full_name: 'John Doe',
 *   phone: '+1234567890',
 *   client_type: 'regular'
 * });
 * ```
 */
export async function createCustomer(
  input: z.infer<typeof CreateCustomerSchema>
): Promise<ActionResult<Customer>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateCustomerSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, full_name, phone, email, address, client_type, notes } = validationResult.data;

    // 3. Normalize empty email to null
    const normalizedEmail = email && email.trim() !== '' ? email.trim() : null;

    // 4. Check for duplicate customer by phone in same shop (if phone provided)
    if (phone && phone.trim() !== '') {
      const { data: existingByPhone } = await supabase
        .from('customers')
        .select('id_customer')
        .eq('id_shop', id_shop)
        .eq('phone', phone.trim())
        .is('deleted_at', null)
        .single();

      if (existingByPhone) {
        return {
          success: false,
          error: 'A customer with this phone number already exists',
          code: 'duplicate_phone',
        };
      }
    }

    // 5. Check for duplicate customer by email in same shop (if email provided)
    if (normalizedEmail) {
      const { data: existingByEmail } = await supabase
        .from('customers')
        .select('id_customer')
        .eq('id_shop', id_shop)
        .eq('email', normalizedEmail)
        .is('deleted_at', null)
        .single();

      if (existingByEmail) {
        return {
          success: false,
          error: 'A customer with this email already exists',
          code: 'duplicate_email',
        };
      }
    }

    // 6. Create customer (RLS ensures user has access to this shop)
    // NOTE: current_balance, total_purchases, total_payments are managed by DB triggers
    const { data, error } = await supabase
      .from('customers')
      .insert({
        id_shop,
        full_name: full_name.trim(),
        phone: phone?.trim() || null,
        email: normalizedEmail,
        address: address?.trim() || null,
        client_type: client_type ?? 'walk-in',
        notes: notes?.trim() || null,
        created_by: authData.publicUser.id_user,
        // Financial fields are initialized by database defaults:
        // - total_purchases: 0
        // - total_payments: 0
        // - current_balance: 0
        // - financial_status: 'paid'
      })
      .select()
      .single();

    if (error) {
      console.error('[createCustomer] Database error:', error);
      return {
        success: false,
        error: 'Failed to create customer',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateCustomerPaths(id_shop);

    return {
      success: true,
      data,
      message: 'Customer created successfully',
    };
  } catch (err) {
    console.error('[createCustomer] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// UPDATE CUSTOMER
// =============================================================================

/**
 * Updates an existing customer's profile data.
 *
 * NOTE: This action ONLY updates profile fields (name, phone, email, etc.).
 * Financial fields (current_balance, total_purchases, total_payments)
 * are managed by database triggers and CANNOT be updated directly.
 *
 * @param input - The customer update data
 * @returns ActionResult with the updated customer on success
 *
 * @example
 * ```tsx
 * const result = await updateCustomer({
 *   id_customer: 'customer-uuid',
 *   full_name: 'Jane Doe',
 *   client_type: 'vip'
 * });
 * ```
 */
export async function updateCustomer(
  input: z.infer<typeof UpdateCustomerSchema>
): Promise<ActionResult<Customer>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateCustomerSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_customer, ...updateFields } = validationResult.data;

    // 3. Check if customer exists and get shop_id
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('id_shop, phone, email')
      .eq('id_customer', id_customer)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingCustomer) {
      return {
        success: false,
        error: 'Customer not found',
        code: 'not_found',
      };
    }

    // 4. Check for duplicate phone if phone is being changed
    const normalizedPhone = updateFields.phone?.trim() || null;
    if (
      updateFields.phone !== undefined &&
      normalizedPhone &&
      normalizedPhone !== existingCustomer.phone
    ) {
      const { data: duplicatePhone } = await supabase
        .from('customers')
        .select('id_customer')
        .eq('id_shop', existingCustomer.id_shop)
        .eq('phone', normalizedPhone)
        .is('deleted_at', null)
        .neq('id_customer', id_customer)
        .single();

      if (duplicatePhone) {
        return {
          success: false,
          error: 'A customer with this phone number already exists',
          code: 'duplicate_phone',
        };
      }
    }

    // 5. Check for duplicate email if email is being changed
    const normalizedEmail =
      updateFields.email && updateFields.email.trim() !== '' ? updateFields.email.trim() : null;

    if (normalizedEmail && normalizedEmail !== existingCustomer.email) {
      const { data: duplicateEmail } = await supabase
        .from('customers')
        .select('id_customer')
        .eq('id_shop', existingCustomer.id_shop)
        .eq('email', normalizedEmail)
        .is('deleted_at', null)
        .neq('id_customer', id_customer)
        .single();

      if (duplicateEmail) {
        return {
          success: false,
          error: 'A customer with this email already exists',
          code: 'duplicate_email',
        };
      }
    }

    // 6. Build update object (only profile fields)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: authData.publicUser.id_user,
    };

    if (updateFields.full_name !== undefined) {
      updateData.full_name = updateFields.full_name.trim();
    }
    if (updateFields.phone !== undefined) {
      updateData.phone = normalizedPhone;
    }
    if (updateFields.email !== undefined) {
      updateData.email = normalizedEmail;
    }
    if (updateFields.address !== undefined) {
      updateData.address = updateFields.address?.trim() || null;
    }
    if (updateFields.client_type !== undefined) {
      updateData.client_type = updateFields.client_type;
    }
    if (updateFields.notes !== undefined) {
      updateData.notes = updateFields.notes?.trim() || null;
    }

    // 7. Update customer
    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id_customer', id_customer)
      .select()
      .single();

    if (error) {
      console.error('[updateCustomer] Database error:', error);
      return {
        success: false,
        error: 'Failed to update customer',
        code: 'database_error',
      };
    }

    // 8. Revalidate paths
    revalidateCustomerPaths(existingCustomer.id_shop);

    return {
      success: true,
      data,
      message: 'Customer updated successfully',
    };
  } catch (err) {
    console.error('[updateCustomer] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// DELETE CUSTOMER (SOFT DELETE)
// =============================================================================

/**
 * Soft deletes a customer.
 *
 * Sets the deleted_at timestamp rather than removing the record.
 * This preserves historical data and references in sales/transactions.
 *
 * @param id_customer - The customer ID to delete
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await deleteCustomer('customer-uuid');
 * if (result.success) {
 *   message.success('Customer deleted');
 * }
 * ```
 */
export async function deleteCustomer(id_customer: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid customer ID');
    const validationResult = uuidSchema.safeParse(id_customer);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid customer ID',
        code: 'validation_error',
      };
    }

    // 3. Get customer and verify they exist
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('id_shop, current_balance')
      .eq('id_customer', id_customer)
      .is('deleted_at', null)
      .single();

    if (fetchError || !customer) {
      return {
        success: false,
        error: 'Customer not found',
        code: 'not_found',
      };
    }

    // 4. Check if customer has outstanding balance
    if (customer.current_balance !== 0) {
      return {
        success: false,
        error: `Cannot delete customer with outstanding balance of ${customer.current_balance}. Please settle the balance first.`,
        code: 'has_balance',
      };
    }

    // 5. Check if customer has pending sales
    // Note: Using type assertion because 'sales' table types may not be generated yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: pendingSalesCount } = await (supabase as any)
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('id_customer', id_customer)
      .in('payment_status', ['unpaid', 'partial'])
      .is('deleted_at', null);

    if (pendingSalesCount && pendingSalesCount > 0) {
      return {
        success: false,
        error: `Cannot delete customer: ${pendingSalesCount} unpaid sale(s) exist. Please complete or cancel them first.`,
        code: 'has_pending_sales',
      };
    }

    // 6. Check if customer has active workshop orders
    // Note: Using type assertion because 'workshop_orders' table types may not be generated yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: activeWorkshopCount } = await (supabase as any)
      .from('workshop_orders')
      .select('*', { count: 'exact', head: true })
      .eq('id_customer', id_customer)
      .in('status', ['pending', 'in_progress'])
      .is('deleted_at', null);

    if (activeWorkshopCount && activeWorkshopCount > 0) {
      return {
        success: false,
        error: `Cannot delete customer: ${activeWorkshopCount} active workshop order(s) exist.`,
        code: 'has_active_orders',
      };
    }

    // 7. Soft delete customer
    const { error } = await supabase
      .from('customers')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_customer', id_customer);

    if (error) {
      console.error('[deleteCustomer] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete customer',
        code: 'database_error',
      };
    }

    // 8. Revalidate paths
    revalidateCustomerPaths(customer.id_shop);

    return {
      success: true,
      message: 'Customer deleted successfully',
    };
  } catch (err) {
    console.error('[deleteCustomer] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GET CUSTOMER BALANCE (READ-ONLY)
// =============================================================================

/**
 * Gets a customer's balance information.
 *
 * IMPORTANT: This is a READ-ONLY operation. Customer balances are maintained
 * by database triggers through the customer_transactions ledger table.
 * Balance changes occur automatically when:
 * - A sale is created (increases balance owed)
 * - A payment is received (decreases balance owed)
 * - A refund is processed (affects balance accordingly)
 *
 * The customer_transactions table is IMMUTABLE - it only allows INSERTs.
 *
 * @param id_customer - The customer ID to get balance for
 * @returns ActionResult with customer balance information
 *
 * @example
 * ```tsx
 * const result = await getCustomerBalance('customer-uuid');
 * if (result.success) {
 *   console.log(`Balance: ${result.data?.current_balance}`);
 *   console.log(`Status: ${result.data?.financial_status}`);
 * }
 * ```
 */
export async function getCustomerBalance(
  id_customer: string
): Promise<ActionResult<CustomerBalance>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid customer ID');
    const validationResult = uuidSchema.safeParse(id_customer);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid customer ID',
        code: 'validation_error',
      };
    }

    // 3. Fetch customer balance data (RLS ensures shop access)
    const { data, error } = await supabase
      .from('customers')
      .select(
        `
        id_customer,
        full_name,
        total_purchases,
        total_payments,
        current_balance,
        financial_status
      `
      )
      .eq('id_customer', id_customer)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Customer not found',
          code: 'not_found',
        };
      }
      console.error('[getCustomerBalance] Database error:', error);
      return {
        success: false,
        error: 'Failed to fetch customer balance',
        code: 'database_error',
      };
    }

    return {
      success: true,
      data: {
        id_customer: data.id_customer,
        full_name: data.full_name,
        total_purchases: Number(data.total_purchases),
        total_payments: Number(data.total_payments),
        current_balance: Number(data.current_balance),
        financial_status: data.financial_status,
      },
    };
  } catch (err) {
    console.error('[getCustomerBalance] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// UPLOAD CUSTOMER ID CARD
// =============================================================================

/**
 * Uploads an ID card image for a customer.
 *
 * Uploads the image to Supabase Storage and creates a file_uploads record
 * linked to the customer. Supports JPEG, PNG, WebP, and PDF formats.
 *
 * @param formData - FormData containing:
 *   - id_customer: The customer ID
 *   - id_shop: The shop ID
 *   - file: The ID card file
 * @returns ActionResult with the uploaded file information
 *
 * @example
 * ```tsx
 * const formData = new FormData();
 * formData.append('id_customer', 'customer-uuid');
 * formData.append('id_shop', 'shop-uuid');
 * formData.append('file', idCardFile);
 *
 * const result = await uploadCustomerIdCard(formData);
 * if (result.success) {
 *   console.log('ID card uploaded:', result.data?.file_url);
 * }
 * ```
 */
export async function uploadCustomerIdCard(
  formData: FormData
): Promise<ActionResult<IdCardUploadResult>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Extract form data
    const id_customer = formData.get('id_customer') as string | null;
    const id_shop = formData.get('id_shop') as string | null;
    const file = formData.get('file') as File | null;

    // 3. Validate inputs
    if (!id_customer || !id_shop) {
      return {
        success: false,
        error: 'Customer ID and Shop ID are required',
        code: 'validation_error',
      };
    }

    const uuidSchema = z.string().uuid();
    if (!uuidSchema.safeParse(id_customer).success || !uuidSchema.safeParse(id_shop).success) {
      return {
        success: false,
        error: 'Invalid ID format',
        code: 'validation_error',
      };
    }

    if (!file) {
      return {
        success: false,
        error: 'No file provided',
        code: 'validation_error',
      };
    }

    // 4. Validate file
    const validation = validateIdCardFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error!,
        code: 'validation_error',
      };
    }

    // 5. Verify customer exists and belongs to the shop (RLS check)
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id_customer, id_shop')
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

    // 6. Generate unique filename
    const filename = generateIdCardFilename(id_shop, id_customer, file.name);

    // 7. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(CUSTOMER_DOCUMENTS_BUCKET)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('[uploadCustomerIdCard] Upload error:', uploadError.message);

      if (uploadError.message.includes('Bucket not found')) {
        return {
          success: false,
          error: 'Document storage is not configured. Please contact support.',
          code: 'storage_not_configured',
        };
      }

      return {
        success: false,
        error: 'Failed to upload ID card. Please try again.',
        code: 'upload_error',
      };
    }

    // 8. Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(CUSTOMER_DOCUMENTS_BUCKET).getPublicUrl(uploadData.path);

    // 9. Create file_uploads record
    // Note: Using type assertion because 'file_uploads' table types may not be generated yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fileRecord, error: fileRecordError } = await (supabase as any)
      .from('file_uploads')
      .insert({
        id_shop,
        file_name: file.name,
        file_path: uploadData.path,
        file_size_bytes: file.size,
        mime_type: file.type,
        entity_type: 'customers',
        entity_id: id_customer,
        uploaded_by: authData.publicUser.id_user,
      })
      .select('id_file')
      .single();

    if (fileRecordError) {
      console.error('[uploadCustomerIdCard] File record error:', fileRecordError);
      // Try to clean up the uploaded file
      await supabase.storage.from(CUSTOMER_DOCUMENTS_BUCKET).remove([uploadData.path]);
      return {
        success: false,
        error: 'Failed to save file record',
        code: 'database_error',
      };
    }

    // 10. Revalidate paths
    revalidateCustomerPaths(id_shop);

    return {
      success: true,
      data: {
        file_path: uploadData.path,
        file_url: publicUrl,
        file_id: fileRecord?.id_file ?? '',
      },
      message: 'ID card uploaded successfully',
    };
  } catch (err) {
    console.error('[uploadCustomerIdCard] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while uploading ID card',
      code: 'unexpected_error',
    };
  }
}
