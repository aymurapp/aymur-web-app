'use server';

/**
 * Expense Server Actions
 *
 * Server-side actions for managing expenses in the Aymur Platform.
 * These actions handle CRUD operations for expenses, expense categories,
 * and recurring expenses.
 *
 * Key features:
 * - Create, update, and soft-delete expenses
 * - Approve/reject expense workflows
 * - Expense category management
 * - Recurring expense schedules with pause/resume functionality
 *
 * RLS Note: All queries are automatically filtered by get_user_shop_ids()
 * embedded in JWT claims. No manual shop filtering needed.
 *
 * @module lib/actions/expense
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
 * Expense row type
 */
export interface Expense {
  id_expense: string;
  id_shop: string;
  id_expense_category: string;
  expense_number: string;
  description: string;
  vendor_name: string | null;
  amount: number;
  paid_amount: number | null;
  expense_date: string;
  due_date: string | null;
  payment_status: string | null;
  approval_status: string | null;
  approval_threshold_exceeded: boolean | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  id_recurring_expense: string | null;
  id_file_upload: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

/**
 * Expense category row type
 */
export interface ExpenseCategory {
  id_expense_category: string;
  id_shop: string;
  category_name: string;
  category_type: string;
  description: string | null;
  is_taxable: boolean | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Recurring expense row type
 * Database columns: auto_approve (boolean), is_active (boolean), description (no notes)
 */
export interface RecurringExpense {
  id_recurring_expense: string;
  id_shop: string;
  id_expense_category: string;
  description: string;
  vendor_name: string | null;
  amount: number;
  frequency: string;
  auto_approve: boolean | null;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  last_generated_date: string | null;
  is_active: boolean | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Expense validation schema
 */
const ExpenseSchema = z.object({
  id_expense_category: z.string().uuid('Invalid category ID'),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
  vendor_name: z.string().max(255).nullable().optional(),
  amount: z.number().positive('Amount must be greater than zero'),
  expense_date: z
    .string()
    .refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid expense date' }),
  due_date: z
    .string()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), { message: 'Invalid due date' })
    .nullable()
    .optional(),
  notes: z.string().max(5000).nullable().optional(),
  id_file_upload: z.string().uuid().nullable().optional(),
});

const CreateExpenseSchema = ExpenseSchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
});

const UpdateExpenseSchema = ExpenseSchema.partial().extend({
  id_expense: z.string().uuid('Invalid expense ID'),
});

/**
 * Expense category validation schema
 */
const ExpenseCategorySchema = z.object({
  category_name: z
    .string()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters'),
  category_type: z.enum(
    ['operational', 'administrative', 'marketing', 'payroll', 'inventory', 'utilities', 'other'],
    { errorMap: () => ({ message: 'Invalid category type' }) }
  ),
  description: z.string().max(500).nullable().optional(),
  is_taxable: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).nullable().optional(),
  is_active: z.boolean().default(true),
});

const CreateExpenseCategorySchema = ExpenseCategorySchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
});

const UpdateExpenseCategorySchema = ExpenseCategorySchema.partial().extend({
  id_expense_category: z.string().uuid('Invalid category ID'),
});

/**
 * Recurring expense validation schema
 * Database columns: auto_approve (boolean), is_active (boolean), description
 */
const RecurringExpenseSchema = z.object({
  id_expense_category: z.string().uuid('Invalid category ID'),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
  vendor_name: z.string().max(255).nullable().optional(),
  amount: z.number().positive('Amount must be greater than zero'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
    errorMap: () => ({ message: 'Frequency must be daily, weekly, monthly, or yearly' }),
  }),
  auto_approve: z.boolean().default(true),
  day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  start_date: z
    .string()
    .refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid start date' }),
  end_date: z
    .string()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), { message: 'Invalid end date' })
    .nullable()
    .optional(),
});

const CreateRecurringExpenseSchema = RecurringExpenseSchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
});

const UpdateRecurringExpenseSchema = RecurringExpenseSchema.partial().extend({
  id_recurring_expense: z.string().uuid('Invalid recurring expense ID'),
});

/**
 * Rejection schema
 */
const RejectExpenseSchema = z.object({
  id_expense: z.string().uuid('Invalid expense ID'),
  rejection_reason: z
    .string()
    .min(1, 'Rejection reason is required')
    .max(1000, 'Rejection reason cannot exceed 1000 characters'),
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
 * Standard revalidation paths for expense changes
 */
function revalidateExpensePaths(shopId: string, locale: string = 'en') {
  revalidatePath(`/${locale}/${shopId}/expenses`, 'page');
  revalidatePath(`/${locale}/${shopId}/finance`, 'page');
  revalidatePath(`/${locale}/${shopId}`, 'layout');
}

/**
 * Generates next expense number
 */
async function generateExpenseNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shopId: string
): Promise<string> {
  const { data: lastExpense } = await supabase
    .from('expenses')
    .select('expense_number')
    .eq('id_shop', shopId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastExpense?.expense_number) {
    const match = lastExpense.expense_number.match(/EXP-(\d+)/);
    if (match && match[1]) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  return `EXP-${String(nextNumber).padStart(6, '0')}`;
}

// =============================================================================
// EXPENSE ACTIONS
// =============================================================================

/**
 * Creates a new expense.
 *
 * @param input - The expense data
 * @returns ActionResult with the created expense on success
 */
export async function createExpense(
  input: z.infer<typeof CreateExpenseSchema>
): Promise<ActionResult<Expense>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateExpenseSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, ...rest } = validationResult.data;

    // 3. Verify category exists and belongs to shop
    const { data: category, error: categoryError } = await supabase
      .from('expense_categories')
      .select('id_expense_category')
      .eq('id_expense_category', rest.id_expense_category)
      .eq('id_shop', id_shop)
      .is('deleted_at', null)
      .single();

    if (categoryError || !category) {
      return {
        success: false,
        error: 'Invalid expense category',
        code: 'invalid_category',
      };
    }

    // 4. Generate expense number
    const expenseNumber = await generateExpenseNumber(supabase, id_shop);

    // 5. Create expense
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        ...rest,
        id_shop,
        expense_number: expenseNumber,
        created_by: authData.publicUser.id_user,
        payment_status: 'unpaid',
        approval_status: 'pending',
        paid_amount: 0,
        vendor_name: rest.vendor_name?.trim() || null,
        notes: rest.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[createExpense] Database error:', error);
      return {
        success: false,
        error: 'Failed to create expense',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateExpensePaths(id_shop);

    return {
      success: true,
      data: data as Expense,
      message: 'Expense created successfully',
    };
  } catch (err) {
    console.error('[createExpense] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates an existing expense.
 *
 * @param input - The expense update data
 * @returns ActionResult with the updated expense on success
 */
export async function updateExpense(
  input: z.infer<typeof UpdateExpenseSchema>
): Promise<ActionResult<Expense>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateExpenseSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_expense, ...updateFields } = validationResult.data;

    // 3. Check if expense exists
    const { data: existingExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('id_shop, approval_status')
      .eq('id_expense', id_expense)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingExpense) {
      return {
        success: false,
        error: 'Expense not found',
        code: 'not_found',
      };
    }

    // 4. Prevent editing approved expenses
    if (existingExpense.approval_status === 'approved') {
      return {
        success: false,
        error: 'Cannot edit an approved expense',
        code: 'expense_approved',
      };
    }

    // 5. Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: authData.publicUser.id_user,
    };

    if (updateFields.id_expense_category !== undefined) {
      updateData.id_expense_category = updateFields.id_expense_category;
    }
    if (updateFields.description !== undefined) {
      updateData.description = updateFields.description.trim();
    }
    if (updateFields.vendor_name !== undefined) {
      updateData.vendor_name = updateFields.vendor_name?.trim() || null;
    }
    if (updateFields.amount !== undefined) {
      updateData.amount = updateFields.amount;
    }
    if (updateFields.expense_date !== undefined) {
      updateData.expense_date = updateFields.expense_date;
    }
    if (updateFields.due_date !== undefined) {
      updateData.due_date = updateFields.due_date || null;
    }
    if (updateFields.notes !== undefined) {
      updateData.notes = updateFields.notes?.trim() || null;
    }
    if (updateFields.id_file_upload !== undefined) {
      updateData.id_file_upload = updateFields.id_file_upload;
    }

    // 6. Update expense
    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id_expense', id_expense)
      .select()
      .single();

    if (error) {
      console.error('[updateExpense] Database error:', error);
      return {
        success: false,
        error: 'Failed to update expense',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateExpensePaths(existingExpense.id_shop);

    return {
      success: true,
      data: data as Expense,
      message: 'Expense updated successfully',
    };
  } catch (err) {
    console.error('[updateExpense] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Soft deletes an expense.
 *
 * @param id_expense - The expense ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteExpense(id_expense: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid expense ID');
    const validationResult = uuidSchema.safeParse(id_expense);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid expense ID',
        code: 'validation_error',
      };
    }

    // 3. Get expense and verify it exists
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('id_shop, payment_status, approval_status')
      .eq('id_expense', id_expense)
      .is('deleted_at', null)
      .single();

    if (fetchError || !expense) {
      return {
        success: false,
        error: 'Expense not found',
        code: 'not_found',
      };
    }

    // 4. Prevent deleting paid expenses
    if (expense.payment_status === 'paid') {
      return {
        success: false,
        error: 'Cannot delete a paid expense',
        code: 'expense_paid',
      };
    }

    // 5. Soft delete expense
    const { error } = await supabase
      .from('expenses')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_expense', id_expense);

    if (error) {
      console.error('[deleteExpense] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete expense',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateExpensePaths(expense.id_shop);

    return {
      success: true,
      message: 'Expense deleted successfully',
    };
  } catch (err) {
    console.error('[deleteExpense] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Approves an expense.
 *
 * @param id_expense - The expense ID to approve
 * @returns ActionResult with the approved expense on success
 */
export async function approveExpense(id_expense: string): Promise<ActionResult<Expense>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid expense ID');
    const validationResult = uuidSchema.safeParse(id_expense);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid expense ID',
        code: 'validation_error',
      };
    }

    // 3. Get expense and verify it can be approved
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('id_shop, approval_status')
      .eq('id_expense', id_expense)
      .is('deleted_at', null)
      .single();

    if (fetchError || !expense) {
      return {
        success: false,
        error: 'Expense not found',
        code: 'not_found',
      };
    }

    if (expense.approval_status !== 'pending') {
      return {
        success: false,
        error: `Cannot approve expense with status: ${expense.approval_status}`,
        code: 'invalid_status',
      };
    }

    // 4. Approve expense
    const { data, error } = await supabase
      .from('expenses')
      .update({
        approval_status: 'approved',
        approved_by: authData.publicUser.id_user,
        approved_at: new Date().toISOString(),
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_expense', id_expense)
      .select()
      .single();

    if (error) {
      console.error('[approveExpense] Database error:', error);
      return {
        success: false,
        error: 'Failed to approve expense',
        code: 'database_error',
      };
    }

    // 5. Revalidate paths
    revalidateExpensePaths(expense.id_shop);

    return {
      success: true,
      data: data as Expense,
      message: 'Expense approved successfully',
    };
  } catch (err) {
    console.error('[approveExpense] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Rejects an expense.
 *
 * @param input - The rejection data including expense ID and reason
 * @returns ActionResult with the rejected expense on success
 */
export async function rejectExpense(
  input: z.infer<typeof RejectExpenseSchema>
): Promise<ActionResult<Expense>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = RejectExpenseSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_expense, rejection_reason } = validationResult.data;

    // 3. Get expense and verify it can be rejected
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('id_shop, approval_status')
      .eq('id_expense', id_expense)
      .is('deleted_at', null)
      .single();

    if (fetchError || !expense) {
      return {
        success: false,
        error: 'Expense not found',
        code: 'not_found',
      };
    }

    if (expense.approval_status !== 'pending') {
      return {
        success: false,
        error: `Cannot reject expense with status: ${expense.approval_status}`,
        code: 'invalid_status',
      };
    }

    // 4. Reject expense
    const { data, error } = await supabase
      .from('expenses')
      .update({
        approval_status: 'rejected',
        rejected_by: authData.publicUser.id_user,
        rejected_at: new Date().toISOString(),
        rejection_reason: rejection_reason.trim(),
        approved_by: null,
        approved_at: null,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_expense', id_expense)
      .select()
      .single();

    if (error) {
      console.error('[rejectExpense] Database error:', error);
      return {
        success: false,
        error: 'Failed to reject expense',
        code: 'database_error',
      };
    }

    // 5. Revalidate paths
    revalidateExpensePaths(expense.id_shop);

    return {
      success: true,
      data: data as Expense,
      message: 'Expense rejected successfully',
    };
  } catch (err) {
    console.error('[rejectExpense] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// EXPENSE CATEGORY ACTIONS
// =============================================================================

/**
 * Creates a new expense category.
 *
 * @param input - The category data
 * @returns ActionResult with the created category on success
 */
export async function createExpenseCategory(
  input: z.infer<typeof CreateExpenseCategorySchema>
): Promise<ActionResult<ExpenseCategory>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateExpenseCategorySchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, category_name, ...rest } = validationResult.data;

    // 3. Check for duplicate category name in same shop
    const { data: existingCategory } = await supabase
      .from('expense_categories')
      .select('id_expense_category')
      .eq('id_shop', id_shop)
      .eq('category_name', category_name.trim())
      .is('deleted_at', null)
      .single();

    if (existingCategory) {
      return {
        success: false,
        error: 'An expense category with this name already exists',
        code: 'duplicate_name',
      };
    }

    // 4. Create category
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        id_shop,
        category_name: category_name.trim(),
        ...rest,
        description: rest.description?.trim() || null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (error) {
      console.error('[createExpenseCategory] Database error:', error);
      return {
        success: false,
        error: 'Failed to create expense category',
        code: 'database_error',
      };
    }

    // 5. Revalidate paths
    revalidateExpensePaths(id_shop);

    return {
      success: true,
      data: data as ExpenseCategory,
      message: 'Expense category created successfully',
    };
  } catch (err) {
    console.error('[createExpenseCategory] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates an existing expense category.
 *
 * @param input - The category update data
 * @returns ActionResult with the updated category on success
 */
export async function updateExpenseCategory(
  input: z.infer<typeof UpdateExpenseCategorySchema>
): Promise<ActionResult<ExpenseCategory>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateExpenseCategorySchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_expense_category, ...updateFields } = validationResult.data;

    // 3. Check if category exists
    const { data: existingCategory, error: fetchError } = await supabase
      .from('expense_categories')
      .select('id_shop, category_name')
      .eq('id_expense_category', id_expense_category)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingCategory) {
      return {
        success: false,
        error: 'Expense category not found',
        code: 'not_found',
      };
    }

    // 4. Check for duplicate name if being changed
    if (updateFields.category_name) {
      const normalizedName = updateFields.category_name.trim();
      if (normalizedName !== existingCategory.category_name) {
        const { data: duplicateName } = await supabase
          .from('expense_categories')
          .select('id_expense_category')
          .eq('id_shop', existingCategory.id_shop)
          .eq('category_name', normalizedName)
          .is('deleted_at', null)
          .neq('id_expense_category', id_expense_category)
          .single();

        if (duplicateName) {
          return {
            success: false,
            error: 'An expense category with this name already exists',
            code: 'duplicate_name',
          };
        }
      }
    }

    // 5. Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updateFields.category_name !== undefined) {
      updateData.category_name = updateFields.category_name.trim();
    }
    if (updateFields.category_type !== undefined) {
      updateData.category_type = updateFields.category_type;
    }
    if (updateFields.description !== undefined) {
      updateData.description = updateFields.description?.trim() || null;
    }
    if (updateFields.is_taxable !== undefined) {
      updateData.is_taxable = updateFields.is_taxable;
    }
    if (updateFields.sort_order !== undefined) {
      updateData.sort_order = updateFields.sort_order;
    }
    if (updateFields.is_active !== undefined) {
      updateData.is_active = updateFields.is_active;
    }

    // 6. Update category
    const { data, error } = await supabase
      .from('expense_categories')
      .update(updateData)
      .eq('id_expense_category', id_expense_category)
      .select()
      .single();

    if (error) {
      console.error('[updateExpenseCategory] Database error:', error);
      return {
        success: false,
        error: 'Failed to update expense category',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateExpensePaths(existingCategory.id_shop);

    return {
      success: true,
      data: data as ExpenseCategory,
      message: 'Expense category updated successfully',
    };
  } catch (err) {
    console.error('[updateExpenseCategory] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// RECURRING EXPENSE ACTIONS
// =============================================================================

/**
 * Creates a new recurring expense.
 *
 * @param input - The recurring expense data
 * @returns ActionResult with the created recurring expense on success
 */
export async function createRecurringExpense(
  input: z.infer<typeof CreateRecurringExpenseSchema>
): Promise<ActionResult<RecurringExpense>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateRecurringExpenseSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, ...rest } = validationResult.data;

    // 3. Validate frequency-specific requirements
    if ((rest.frequency === 'monthly' || rest.frequency === 'yearly') && !rest.day_of_month) {
      return {
        success: false,
        error: 'Day of month is required for monthly and yearly recurring expenses',
        code: 'validation_error',
      };
    }

    if (rest.frequency === 'weekly' && rest.day_of_week === null) {
      return {
        success: false,
        error: 'Day of week is required for weekly recurring expenses',
        code: 'validation_error',
      };
    }

    // 4. Verify category exists and belongs to shop
    const { data: category, error: categoryError } = await supabase
      .from('expense_categories')
      .select('id_expense_category')
      .eq('id_expense_category', rest.id_expense_category)
      .eq('id_shop', id_shop)
      .is('deleted_at', null)
      .single();

    if (categoryError || !category) {
      return {
        success: false,
        error: 'Invalid expense category',
        code: 'invalid_category',
      };
    }

    // 5. Create recurring expense
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert({
        id_shop,
        id_expense_category: rest.id_expense_category,
        description: rest.description.trim(),
        vendor_name: rest.vendor_name?.trim() || null,
        amount: rest.amount,
        frequency: rest.frequency,
        auto_approve: rest.auto_approve,
        day_of_month: rest.day_of_month ?? null,
        day_of_week: rest.day_of_week ?? null,
        start_date: rest.start_date,
        end_date: rest.end_date ?? null,
        next_due_date: rest.start_date,
        is_active: true,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (error) {
      console.error('[createRecurringExpense] Database error:', error);
      return {
        success: false,
        error: 'Failed to create recurring expense',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateExpensePaths(id_shop);

    return {
      success: true,
      data: data as RecurringExpense,
      message: 'Recurring expense created successfully',
    };
  } catch (err) {
    console.error('[createRecurringExpense] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Pauses a recurring expense.
 *
 * @param id_recurring_expense - The recurring expense ID to pause
 * @returns ActionResult indicating success or failure
 */
export async function pauseRecurringExpense(
  id_recurring_expense: string
): Promise<ActionResult<RecurringExpense>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid recurring expense ID');
    const validationResult = uuidSchema.safeParse(id_recurring_expense);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid recurring expense ID',
        code: 'validation_error',
      };
    }

    // 3. Get recurring expense and verify it can be paused
    const { data: recurringExpense, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select('id_shop, is_active')
      .eq('id_recurring_expense', id_recurring_expense)
      .is('deleted_at', null)
      .single();

    if (fetchError || !recurringExpense) {
      return {
        success: false,
        error: 'Recurring expense not found',
        code: 'not_found',
      };
    }

    // Database uses is_active (boolean) - check for true
    if (recurringExpense.is_active !== true) {
      return {
        success: false,
        error: 'Cannot pause recurring expense that is not active',
        code: 'invalid_status',
      };
    }

    // 4. Pause recurring expense (set is_active to false)
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_recurring_expense', id_recurring_expense)
      .select()
      .single();

    if (error) {
      console.error('[pauseRecurringExpense] Database error:', error);
      return {
        success: false,
        error: 'Failed to pause recurring expense',
        code: 'database_error',
      };
    }

    // 5. Revalidate paths
    revalidateExpensePaths(recurringExpense.id_shop);

    return {
      success: true,
      data: data as RecurringExpense,
      message: 'Recurring expense paused successfully',
    };
  } catch (err) {
    console.error('[pauseRecurringExpense] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Resumes a paused recurring expense.
 *
 * @param id_recurring_expense - The recurring expense ID to resume
 * @returns ActionResult indicating success or failure
 */
export async function resumeRecurringExpense(
  id_recurring_expense: string
): Promise<ActionResult<RecurringExpense>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid recurring expense ID');
    const validationResult = uuidSchema.safeParse(id_recurring_expense);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid recurring expense ID',
        code: 'validation_error',
      };
    }

    // 3. Get recurring expense and verify it can be resumed
    const { data: recurringExpense, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select('id_shop, is_active')
      .eq('id_recurring_expense', id_recurring_expense)
      .is('deleted_at', null)
      .single();

    if (fetchError || !recurringExpense) {
      return {
        success: false,
        error: 'Recurring expense not found',
        code: 'not_found',
      };
    }

    // Database uses is_active (boolean) - check for false (paused)
    if (recurringExpense.is_active !== false) {
      return {
        success: false,
        error: 'Cannot resume recurring expense that is not paused',
        code: 'invalid_status',
      };
    }

    // 4. Resume recurring expense (set is_active to true)
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_recurring_expense', id_recurring_expense)
      .select()
      .single();

    if (error) {
      console.error('[resumeRecurringExpense] Database error:', error);
      return {
        success: false,
        error: 'Failed to resume recurring expense',
        code: 'database_error',
      };
    }

    // 5. Revalidate paths
    revalidateExpensePaths(recurringExpense.id_shop);

    return {
      success: true,
      data: data as RecurringExpense,
      message: 'Recurring expense resumed successfully',
    };
  } catch (err) {
    console.error('[resumeRecurringExpense] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates an existing recurring expense.
 *
 * @param input - The recurring expense update data
 * @returns ActionResult with the updated recurring expense on success
 */
export async function updateRecurringExpense(
  input: z.infer<typeof UpdateRecurringExpenseSchema>
): Promise<ActionResult<RecurringExpense>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateRecurringExpenseSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_recurring_expense, ...updateFields } = validationResult.data;

    // 3. Check if recurring expense exists
    const { data: existingRecurring, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select('id_shop, is_active')
      .eq('id_recurring_expense', id_recurring_expense)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingRecurring) {
      return {
        success: false,
        error: 'Recurring expense not found',
        code: 'not_found',
      };
    }

    // 4. Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: authData.publicUser.id_user,
    };

    if (updateFields.id_expense_category !== undefined) {
      updateData.id_expense_category = updateFields.id_expense_category;
    }
    if (updateFields.description !== undefined) {
      updateData.description = updateFields.description.trim();
    }
    if (updateFields.vendor_name !== undefined) {
      updateData.vendor_name = updateFields.vendor_name?.trim() || null;
    }
    if (updateFields.amount !== undefined) {
      updateData.amount = updateFields.amount;
    }
    if (updateFields.frequency !== undefined) {
      updateData.frequency = updateFields.frequency;
    }
    // Database uses auto_approve (boolean)
    if (updateFields.auto_approve !== undefined) {
      updateData.auto_approve = updateFields.auto_approve;
    }
    if (updateFields.day_of_month !== undefined) {
      updateData.day_of_month = updateFields.day_of_month;
    }
    if (updateFields.day_of_week !== undefined) {
      updateData.day_of_week = updateFields.day_of_week;
    }
    if (updateFields.start_date !== undefined) {
      updateData.start_date = updateFields.start_date;
    }
    if (updateFields.end_date !== undefined) {
      updateData.end_date = updateFields.end_date || null;
    }

    // 5. Update recurring expense
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update(updateData)
      .eq('id_recurring_expense', id_recurring_expense)
      .select()
      .single();

    if (error) {
      console.error('[updateRecurringExpense] Database error:', error);
      return {
        success: false,
        error: 'Failed to update recurring expense',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateExpensePaths(existingRecurring.id_shop);

    return {
      success: true,
      data: data as RecurringExpense,
      message: 'Recurring expense updated successfully',
    };
  } catch (err) {
    console.error('[updateRecurringExpense] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Deletes (soft) a recurring expense.
 *
 * @param id_recurring_expense - The recurring expense ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteRecurringExpense(id_recurring_expense: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid recurring expense ID');
    const validationResult = uuidSchema.safeParse(id_recurring_expense);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid recurring expense ID',
        code: 'validation_error',
      };
    }

    // 3. Get recurring expense and verify it exists
    const { data: recurringExpense, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select('id_shop')
      .eq('id_recurring_expense', id_recurring_expense)
      .is('deleted_at', null)
      .single();

    if (fetchError || !recurringExpense) {
      return {
        success: false,
        error: 'Recurring expense not found',
        code: 'not_found',
      };
    }

    // 4. Soft delete recurring expense
    const { error } = await supabase
      .from('recurring_expenses')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_recurring_expense', id_recurring_expense);

    if (error) {
      console.error('[deleteRecurringExpense] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete recurring expense',
        code: 'database_error',
      };
    }

    // 5. Revalidate paths
    revalidateExpensePaths(recurringExpense.id_shop);

    return {
      success: true,
      message: 'Recurring expense deleted successfully',
    };
  } catch (err) {
    console.error('[deleteRecurringExpense] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GENERATE EXPENSE FROM RECURRING
// =============================================================================

/**
 * Schema for generating expense from recurring template
 */
const GenerateExpenseFromRecurringSchema = z.object({
  id_recurring_expense: z.string().uuid('Invalid recurring expense ID'),
  expense_date: z
    .string()
    .refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid expense date' })
    .optional(),
});

/**
 * Calculates the next due date based on frequency and current next_due_date
 */
function calculateNextRecurringDate(
  currentNextDueDate: string,
  frequency: string,
  dayOfMonth?: number | null
): string {
  const current = new Date(currentNextDueDate);

  switch (frequency) {
    case 'daily':
      current.setDate(current.getDate() + 1);
      break;
    case 'weekly':
      current.setDate(current.getDate() + 7);
      break;
    case 'monthly':
      current.setMonth(current.getMonth() + 1);
      // Handle months with fewer days
      if (dayOfMonth) {
        const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        current.setDate(Math.min(dayOfMonth, daysInMonth));
      }
      break;
    case 'yearly':
      current.setFullYear(current.getFullYear() + 1);
      // Handle leap year for Feb 29
      if (dayOfMonth) {
        const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        current.setDate(Math.min(dayOfMonth, daysInMonth));
      }
      break;
    default:
      current.setMonth(current.getMonth() + 1);
  }

  const datePart = current.toISOString().split('T')[0];
  return datePart ?? currentNextDueDate;
}

/**
 * Generates an expense from a recurring expense template.
 *
 * This action:
 * 1. Fetches the recurring expense template
 * 2. Creates a new expense based on the template
 * 3. Updates the recurring expense's last_generated_date and next_due_date
 *
 * @param input - The recurring expense ID and optional expense date
 * @returns ActionResult with the created expense on success
 *
 * @example
 * ```tsx
 * const result = await generateExpenseFromRecurring({
 *   id_recurring_expense: 'recurring-uuid',
 *   expense_date: '2024-01-15' // Optional, defaults to next_due_date
 * });
 * ```
 */
export async function generateExpenseFromRecurring(
  input: z.infer<typeof GenerateExpenseFromRecurringSchema>
): Promise<ActionResult<Expense>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = GenerateExpenseFromRecurringSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_recurring_expense, expense_date } = validationResult.data;

    // 3. Fetch the recurring expense template
    const { data: recurringExpense, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('id_recurring_expense', id_recurring_expense)
      .is('deleted_at', null)
      .single();

    if (fetchError || !recurringExpense) {
      return {
        success: false,
        error: 'Recurring expense not found',
        code: 'not_found',
      };
    }

    // 4. Check if recurring expense is active
    // Database uses is_active (boolean) - check for true
    if (recurringExpense.is_active !== true) {
      return {
        success: false,
        error: 'Cannot generate expense from inactive recurring expense',
        code: 'invalid_status',
      };
    }

    // 5. Check if end_date has passed
    if (recurringExpense.end_date) {
      const endDate = new Date(recurringExpense.end_date);
      if (endDate < new Date()) {
        return {
          success: false,
          error: 'Recurring expense has ended',
          code: 'recurring_ended',
        };
      }
    }

    // 6. Generate expense number
    const expenseNumber = await generateExpenseNumber(supabase, recurringExpense.id_shop);

    // 7. Determine expense date (use provided date or next_due_date)
    const finalExpenseDate = expense_date || recurringExpense.next_due_date;

    // 8. Create the expense
    // Note: recurring_expenses does NOT have notes column, only description
    const { data: expense, error: createError } = await supabase
      .from('expenses')
      .insert({
        id_shop: recurringExpense.id_shop,
        id_expense_category: recurringExpense.id_expense_category,
        expense_number: expenseNumber,
        description: recurringExpense.description,
        vendor_name: recurringExpense.vendor_name,
        amount: recurringExpense.amount,
        expense_date: finalExpenseDate,
        payment_status: 'unpaid',
        approval_status: 'pending',
        paid_amount: 0,
        id_recurring_expense: id_recurring_expense,
        notes: 'Generated from recurring expense',
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (createError) {
      console.error('[generateExpenseFromRecurring] Create expense error:', createError);
      return {
        success: false,
        error: 'Failed to create expense from recurring template',
        code: 'database_error',
      };
    }

    // 9. Calculate next due date
    const nextDueDate = calculateNextRecurringDate(
      recurringExpense.next_due_date,
      recurringExpense.frequency,
      recurringExpense.day_of_month
    );

    // 10. Check if recurring expense should be marked as inactive (completed)
    // Database uses is_active (boolean) - set to false when end date is passed
    let newIsActive: boolean | null = recurringExpense.is_active;
    if (recurringExpense.end_date) {
      const endDate = new Date(recurringExpense.end_date);
      const nextDate = new Date(nextDueDate);
      if (nextDate > endDate) {
        newIsActive = false; // Deactivate when end date is passed
      }
    }

    // 11. Update the recurring expense
    const { error: updateError } = await supabase
      .from('recurring_expenses')
      .update({
        last_generated_date: finalExpenseDate,
        next_due_date: nextDueDate,
        is_active: newIsActive,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_recurring_expense', id_recurring_expense);

    if (updateError) {
      console.error('[generateExpenseFromRecurring] Update recurring error:', updateError);
      // Note: The expense was created, so we don't fail completely
      // Just log the error and continue
    }

    // 12. Revalidate paths
    revalidateExpensePaths(recurringExpense.id_shop);

    return {
      success: true,
      data: expense as Expense,
      message: 'Expense generated from recurring template successfully',
    };
  } catch (err) {
    console.error('[generateExpenseFromRecurring] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}
