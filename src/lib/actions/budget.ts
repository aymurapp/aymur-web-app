'use server';

/**
 * Budget Server Actions
 *
 * Server-side actions for managing budgets in the Aymur Platform.
 * These actions handle CRUD operations for budget categories, allocations,
 * and budget vs actual comparisons.
 *
 * Key features:
 * - Create, update, and soft-delete budget categories
 * - Allocate budgets for time periods
 * - Adjust budget allocations
 * - Compare budget vs actual expenses
 *
 * IMPORTANT NOTES:
 * - `budget_transactions` is IMMUTABLE - only INSERT operations allowed
 * - Budget usage (used_amount) is updated by database triggers when expenses are recorded
 * - remaining_amount is computed as allocated_amount + rollover_amount - used_amount
 *
 * RLS Note: All queries are automatically filtered by get_user_shop_ids()
 * embedded in JWT claims. No manual shop filtering needed.
 *
 * @module lib/actions/budget
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
 * Budget category row type (matching database schema)
 */
export interface BudgetCategory {
  id_budget_category: string;
  id_shop: string;
  category_name: string;
  budget_type: string;
  description: string | null;
  default_amount: number;
  default_frequency: string;
  requires_approval: boolean;
  approval_threshold: number | null;
  is_active: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Budget allocation row type (matching database schema)
 */
export interface BudgetAllocation {
  id_budget_allocation: string;
  id_shop: string;
  id_budget_category: string;
  id_user: string | null;
  period_start: string;
  period_end: string;
  allocated_amount: number;
  used_amount: number;
  remaining_amount: number;
  rollover_enabled: boolean;
  rollover_amount: number;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Budget allocation with category details
 */
export interface BudgetAllocationWithCategory extends BudgetAllocation {
  budget_categories: BudgetCategory | null;
}

/**
 * Budget transaction row type (immutable ledger)
 */
export interface BudgetTransaction {
  id_transaction: string;
  id_shop: string;
  id_budget_allocation: string;
  sequence_number: number;
  transaction_type: string;
  amount: number;
  description: string;
  id_expense: string | null;
  approval_status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string;
  created_at: string;
}

/**
 * Budget vs actual comparison result
 */
export interface BudgetVsActual {
  category_name: string;
  id_budget_category: string;
  budget_type: string;
  allocated_amount: number;
  used_amount: number;
  remaining_amount: number;
  actual_expenses: number;
  variance: number;
  variance_percentage: number;
  is_over_budget: boolean;
}

/**
 * Budget summary for a period
 */
export interface BudgetSummary {
  total_allocated: number;
  total_used: number;
  total_remaining: number;
  total_expenses: number;
  overall_variance: number;
  category_count: number;
  over_budget_count: number;
  under_budget_count: number;
  utilization_percentage: number;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Budget category validation schema
 */
const BudgetCategorySchema = z.object({
  category_name: z
    .string()
    .min(2, 'Category name must be at least 2 characters')
    .max(255, 'Category name cannot exceed 255 characters'),
  budget_type: z.enum([
    'operational',
    'capital',
    'marketing',
    'salary',
    'inventory',
    'maintenance',
    'other',
  ]),
  description: z.string().max(2000).nullable().optional(),
  default_amount: z.number().min(0).nullable().optional().default(0),
  default_frequency: z
    .enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
    .optional()
    .default('monthly'),
  requires_approval: z.boolean().optional().default(false),
  approval_threshold: z.number().positive().nullable().optional(),
  is_active: z.boolean().optional().default(true),
  sort_order: z.number().int().min(0).optional().default(0),
});

const CreateBudgetCategorySchema = BudgetCategorySchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
});

const UpdateBudgetCategorySchema = BudgetCategorySchema.partial().extend({
  id_budget_category: z.string().uuid('Invalid budget category ID'),
});

/**
 * Budget allocation validation schema
 */
const BudgetAllocationSchema = z
  .object({
    id_budget_category: z.string().uuid('Invalid budget category ID'),
    id_user: z.string().uuid().nullable().optional(),
    period_start: z
      .string()
      .refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid period start date' }),
    period_end: z
      .string()
      .refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid period end date' }),
    allocated_amount: z.number().positive('Allocated amount must be positive'),
    rollover_enabled: z.boolean().optional().default(false),
    rollover_amount: z.number().min(0).optional().default(0),
    notes: z.string().max(5000).nullable().optional(),
  })
  .refine((data) => new Date(data.period_start) <= new Date(data.period_end), {
    message: 'Period start must be before or equal to period end',
    path: ['period_end'],
  });

const CreateBudgetAllocationSchema = BudgetAllocationSchema.and(
  z.object({
    id_shop: z.string().uuid('Invalid shop ID'),
  })
);

const AdjustBudgetSchema = z.object({
  id_budget_allocation: z.string().uuid('Invalid budget allocation ID'),
  adjustment_amount: z.number().refine((val) => val !== 0, 'Adjustment amount cannot be zero'),
  reason: z.string().min(1, 'Reason is required').max(1000, 'Reason cannot exceed 1000 characters'),
});

const BudgetVsActualSchema = z.object({
  period_start: z
    .string()
    .refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid period start date' }),
  period_end: z
    .string()
    .refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid period end date' }),
  id_budget_category: z.string().uuid().optional(),
  id_expense_category: z.string().uuid().optional(),
  id_user: z.string().uuid().nullable().optional(),
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
 * Standard revalidation paths for budget changes
 */
function revalidateBudgetPaths(shopId: string, locale: string = 'en') {
  revalidatePath(`/${locale}/${shopId}/budgets`, 'page');
  revalidatePath(`/${locale}/${shopId}/expenses`, 'page');
  revalidatePath(`/${locale}/${shopId}/reports`, 'page');
  revalidatePath(`/${locale}/${shopId}`, 'layout');
}

// =============================================================================
// BUDGET CATEGORY ACTIONS
// =============================================================================

/**
 * Creates a new budget category.
 *
 * @param input - The budget category data
 * @returns ActionResult with the created category on success
 *
 * @example
 * ```tsx
 * const result = await createBudgetCategory({
 *   id_shop: 'shop-uuid',
 *   category_name: 'Marketing',
 *   budget_type: 'marketing',
 *   default_amount: 5000,
 *   default_frequency: 'monthly'
 * });
 * ```
 */
export async function createBudgetCategory(
  input: z.infer<typeof CreateBudgetCategorySchema>
): Promise<ActionResult<BudgetCategory>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateBudgetCategorySchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, category_name, description, ...rest } = validationResult.data;

    // 3. Check for duplicate category name in same shop
    const { data: existingCategory } = await supabase
      .from('budget_categories')
      .select('id_budget_category')
      .eq('id_shop', id_shop)
      .eq('category_name', category_name.trim())
      .is('deleted_at', null)
      .single();

    if (existingCategory) {
      return {
        success: false,
        error: 'A budget category with this name already exists',
        code: 'duplicate_name',
      };
    }

    // 4. Create budget category
    const { data, error } = await supabase
      .from('budget_categories')
      .insert({
        id_shop,
        category_name: category_name.trim(),
        description: description?.trim() || null,
        ...rest,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (error) {
      console.error('[createBudgetCategory] Database error:', error);
      return {
        success: false,
        error: 'Failed to create budget category',
        code: 'database_error',
      };
    }

    // 5. Revalidate paths
    revalidateBudgetPaths(id_shop);

    return {
      success: true,
      data: data as BudgetCategory,
      message: 'Budget category created successfully',
    };
  } catch (err) {
    console.error('[createBudgetCategory] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates an existing budget category.
 *
 * @param input - The budget category update data
 * @returns ActionResult with the updated category on success
 */
export async function updateBudgetCategory(
  input: z.infer<typeof UpdateBudgetCategorySchema>
): Promise<ActionResult<BudgetCategory>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateBudgetCategorySchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_budget_category, category_name, description, ...rest } = validationResult.data;

    // 3. Check if category exists and get shop_id
    const { data: existingCategory, error: fetchError } = await supabase
      .from('budget_categories')
      .select('id_shop, category_name')
      .eq('id_budget_category', id_budget_category)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingCategory) {
      return {
        success: false,
        error: 'Budget category not found',
        code: 'not_found',
      };
    }

    // 4. Check for duplicate name if being changed
    const normalizedName = category_name?.trim();
    if (normalizedName && normalizedName !== existingCategory.category_name) {
      const { data: duplicateName } = await supabase
        .from('budget_categories')
        .select('id_budget_category')
        .eq('id_shop', existingCategory.id_shop)
        .eq('category_name', normalizedName)
        .is('deleted_at', null)
        .neq('id_budget_category', id_budget_category)
        .single();

      if (duplicateName) {
        return {
          success: false,
          error: 'A budget category with this name already exists',
          code: 'duplicate_name',
        };
      }
    }

    // 5. Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (category_name !== undefined) {
      updateData.category_name = normalizedName;
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    Object.entries(rest).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    // 6. Update category
    const { data, error } = await supabase
      .from('budget_categories')
      .update(updateData)
      .eq('id_budget_category', id_budget_category)
      .select()
      .single();

    if (error) {
      console.error('[updateBudgetCategory] Database error:', error);
      return {
        success: false,
        error: 'Failed to update budget category',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateBudgetPaths(existingCategory.id_shop);

    return {
      success: true,
      data: data as BudgetCategory,
      message: 'Budget category updated successfully',
    };
  } catch (err) {
    console.error('[updateBudgetCategory] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Soft deletes a budget category.
 *
 * @param id_budget_category - The budget category ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteBudgetCategory(id_budget_category: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid budget category ID');
    const validationResult = uuidSchema.safeParse(id_budget_category);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid budget category ID',
        code: 'validation_error',
      };
    }

    // 3. Get category and verify it exists
    const { data: category, error: fetchError } = await supabase
      .from('budget_categories')
      .select('id_shop')
      .eq('id_budget_category', id_budget_category)
      .is('deleted_at', null)
      .single();

    if (fetchError || !category) {
      return {
        success: false,
        error: 'Budget category not found',
        code: 'not_found',
      };
    }

    // 4. Check for active allocations
    const { data: activeAllocations } = await supabase
      .from('budget_allocations')
      .select('id_budget_allocation')
      .eq('id_budget_category', id_budget_category)
      .eq('status', 'active')
      .limit(1);

    if (activeAllocations && activeAllocations.length > 0) {
      return {
        success: false,
        error: 'Cannot delete category with active budget allocations',
        code: 'has_active_allocations',
      };
    }

    // 5. Soft delete category
    const { error } = await supabase
      .from('budget_categories')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id_budget_category', id_budget_category);

    if (error) {
      console.error('[deleteBudgetCategory] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete budget category',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateBudgetPaths(category.id_shop);

    return {
      success: true,
      message: 'Budget category deleted successfully',
    };
  } catch (err) {
    console.error('[deleteBudgetCategory] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// BUDGET ALLOCATION ACTIONS
// =============================================================================

/**
 * Creates a new budget allocation for a period.
 *
 * @param input - The budget allocation data
 * @returns ActionResult with the created allocation on success
 *
 * @example
 * ```tsx
 * const result = await allocateBudget({
 *   id_shop: 'shop-uuid',
 *   id_budget_category: 'category-uuid',
 *   period_start: '2024-01-01',
 *   period_end: '2024-01-31',
 *   allocated_amount: 5000
 * });
 * ```
 */
export async function allocateBudget(
  input: z.infer<typeof CreateBudgetAllocationSchema>
): Promise<ActionResult<BudgetAllocation>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateBudgetAllocationSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const {
      id_shop,
      id_budget_category,
      period_start,
      period_end,
      allocated_amount,
      rollover_enabled,
      rollover_amount,
      notes,
      id_user,
    } = validationResult.data;

    // 3. Verify budget category exists and is active
    const { data: category, error: categoryError } = await supabase
      .from('budget_categories')
      .select('id_budget_category, is_active')
      .eq('id_budget_category', id_budget_category)
      .eq('id_shop', id_shop)
      .is('deleted_at', null)
      .single();

    if (categoryError || !category) {
      return {
        success: false,
        error: 'Budget category not found',
        code: 'category_not_found',
      };
    }

    if (!category.is_active) {
      return {
        success: false,
        error: 'Cannot allocate budget to inactive category',
        code: 'category_inactive',
      };
    }

    // 4. Check for overlapping allocation in same category and period
    const { data: overlapping } = await supabase
      .from('budget_allocations')
      .select('id_budget_allocation')
      .eq('id_shop', id_shop)
      .eq('id_budget_category', id_budget_category)
      .neq('status', 'cancelled')
      .or(`and(period_start.lte.${period_end},period_end.gte.${period_start})`)
      .limit(1);

    if (overlapping && overlapping.length > 0) {
      return {
        success: false,
        error: 'An allocation already exists for this category in the specified period',
        code: 'overlapping_allocation',
      };
    }

    // 5. Calculate remaining amount
    const remaining_amount = allocated_amount + (rollover_amount || 0);

    // 6. Create budget allocation
    const { data, error } = await supabase
      .from('budget_allocations')
      .insert({
        id_shop,
        id_budget_category,
        id_user: id_user || null,
        period_start,
        period_end,
        allocated_amount,
        used_amount: 0,
        remaining_amount,
        rollover_enabled: rollover_enabled || false,
        rollover_amount: rollover_amount || 0,
        status: 'active',
        notes: notes?.trim() || null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (error) {
      console.error('[allocateBudget] Database error:', error);
      return {
        success: false,
        error: 'Failed to create budget allocation',
        code: 'database_error',
      };
    }

    // 7. Revalidate paths
    revalidateBudgetPaths(id_shop);

    return {
      success: true,
      data: data as BudgetAllocation,
      message: 'Budget allocated successfully',
    };
  } catch (err) {
    console.error('[allocateBudget] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Adjusts an existing budget allocation amount.
 *
 * Creates an immutable budget_transaction record and updates the allocation.
 *
 * @param input - The adjustment data
 * @returns ActionResult with the updated allocation on success
 */
export async function adjustBudget(
  input: z.infer<typeof AdjustBudgetSchema>
): Promise<ActionResult<BudgetAllocation>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = AdjustBudgetSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_budget_allocation, adjustment_amount, reason } = validationResult.data;

    // 3. Get current allocation
    const { data: allocation, error: fetchError } = await supabase
      .from('budget_allocations')
      .select('*')
      .eq('id_budget_allocation', id_budget_allocation)
      .eq('status', 'active')
      .single();

    if (fetchError || !allocation) {
      return {
        success: false,
        error: 'Active budget allocation not found',
        code: 'not_found',
      };
    }

    // 4. Calculate new amounts
    const newAllocatedAmount = Number(allocation.allocated_amount) + adjustment_amount;

    if (newAllocatedAmount < 0) {
      return {
        success: false,
        error: 'Adjustment would result in negative budget allocation',
        code: 'negative_allocation',
      };
    }

    const newRemainingAmount =
      newAllocatedAmount + Number(allocation.rollover_amount) - Number(allocation.used_amount);

    // 5. Create budget transaction (immutable ledger)
    const { error: transactionError } = await supabase.from('budget_transactions').insert({
      id_shop: allocation.id_shop,
      id_budget_allocation,
      transaction_type: 'adjustment',
      amount: Math.abs(adjustment_amount),
      description: `${adjustment_amount > 0 ? 'Increase' : 'Decrease'}: ${reason}`,
      approval_status: 'auto_approved',
      created_by: authData.publicUser.id_user,
    });

    if (transactionError) {
      console.error('[adjustBudget] Transaction error:', transactionError);
      return {
        success: false,
        error: 'Failed to record adjustment transaction',
        code: 'transaction_error',
      };
    }

    // 6. Update allocation
    const { data, error: updateError } = await supabase
      .from('budget_allocations')
      .update({
        allocated_amount: newAllocatedAmount,
        remaining_amount: newRemainingAmount,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_budget_allocation', id_budget_allocation)
      .select()
      .single();

    if (updateError) {
      console.error('[adjustBudget] Update error:', updateError);
      return {
        success: false,
        error: 'Failed to update budget allocation',
        code: 'update_error',
      };
    }

    // 7. Revalidate paths
    revalidateBudgetPaths(allocation.id_shop);

    return {
      success: true,
      data: data as BudgetAllocation,
      message: `Budget ${adjustment_amount > 0 ? 'increased' : 'decreased'} successfully`,
    };
  } catch (err) {
    console.error('[adjustBudget] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// BUDGET VS ACTUAL ACTIONS
// =============================================================================

/**
 * Gets budget summary for a period.
 *
 * @param input - The query parameters including shop ID and period
 * @returns ActionResult with budget summary data
 *
 * @example
 * ```tsx
 * const result = await getBudgetSummary({
 *   id_shop: 'shop-uuid',
 *   period_start: '2024-01-01',
 *   period_end: '2024-01-31'
 * });
 * ```
 */
export async function getBudgetSummary(input: {
  id_shop: string;
  period_start: string;
  period_end: string;
  id_budget_category?: string;
}): Promise<ActionResult<BudgetSummary>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    const { id_shop, period_start, period_end, id_budget_category } = input;

    // 2. Validate dates
    const startDate = new Date(period_start);
    const endDate = new Date(period_end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        success: false,
        error: 'Invalid date format',
        code: 'validation_error',
      };
    }

    if (startDate > endDate) {
      return {
        success: false,
        error: 'Period start must be before or equal to period end',
        code: 'validation_error',
      };
    }

    // 3. Get budget allocations for the period
    let query = supabase
      .from('budget_allocations')
      .select('allocated_amount, used_amount, remaining_amount, status')
      .eq('id_shop', id_shop)
      .neq('status', 'cancelled')
      .lte('period_start', period_end)
      .gte('period_end', period_start);

    if (id_budget_category) {
      query = query.eq('id_budget_category', id_budget_category);
    }

    const { data: allocations, error: allocationsError } = await query;

    if (allocationsError) {
      console.error('[getBudgetSummary] Database error:', allocationsError);
      return {
        success: false,
        error: 'Failed to fetch budget allocations',
        code: 'database_error',
      };
    }

    // 4. Calculate summary
    let totalAllocated = 0;
    let totalUsed = 0;
    let totalRemaining = 0;
    let overBudgetCount = 0;
    let underBudgetCount = 0;

    (allocations ?? []).forEach((alloc) => {
      const allocated = Number(alloc.allocated_amount);
      const used = Number(alloc.used_amount);
      const remaining = Number(alloc.remaining_amount);

      totalAllocated += allocated;
      totalUsed += used;
      totalRemaining += remaining;

      if (remaining < 0) {
        overBudgetCount++;
      } else {
        underBudgetCount++;
      }
    });

    const utilizationPercentage = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;

    const summary: BudgetSummary = {
      total_allocated: totalAllocated,
      total_used: totalUsed,
      total_remaining: totalRemaining,
      total_expenses: totalUsed, // In this context, used_amount represents expenses
      overall_variance: totalAllocated - totalUsed,
      category_count: (allocations ?? []).length,
      over_budget_count: overBudgetCount,
      under_budget_count: underBudgetCount,
      utilization_percentage: utilizationPercentage,
    };

    return {
      success: true,
      data: summary,
    };
  } catch (err) {
    console.error('[getBudgetSummary] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Transfers budget between two allocations within the same period.
 *
 * Creates immutable transaction records for both source and destination allocations.
 *
 * @param input - The transfer parameters
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await transferBudget({
 *   id_shop: 'shop-uuid',
 *   from_allocation_id: 'source-allocation-uuid',
 *   to_allocation_id: 'dest-allocation-uuid',
 *   amount: 1000,
 *   reason: 'Reallocating from marketing to operations'
 * });
 * ```
 */
export async function transferBudget(input: {
  id_shop: string;
  from_allocation_id: string;
  to_allocation_id: string;
  amount: number;
  reason: string;
}): Promise<ActionResult<{ from_allocation: BudgetAllocation; to_allocation: BudgetAllocation }>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    const { id_shop, from_allocation_id, to_allocation_id, amount, reason } = input;

    // 2. Validate input
    if (amount <= 0) {
      return {
        success: false,
        error: 'Transfer amount must be positive',
        code: 'validation_error',
      };
    }

    if (from_allocation_id === to_allocation_id) {
      return {
        success: false,
        error: 'Cannot transfer to the same allocation',
        code: 'validation_error',
      };
    }

    if (!reason || reason.trim().length === 0) {
      return {
        success: false,
        error: 'Transfer reason is required',
        code: 'validation_error',
      };
    }

    // 3. Get source allocation
    const { data: fromAllocation, error: fromError } = await supabase
      .from('budget_allocations')
      .select('*')
      .eq('id_budget_allocation', from_allocation_id)
      .eq('id_shop', id_shop)
      .eq('status', 'active')
      .single();

    if (fromError || !fromAllocation) {
      return {
        success: false,
        error: 'Source allocation not found or not active',
        code: 'not_found',
      };
    }

    // 4. Get destination allocation
    const { data: toAllocation, error: toError } = await supabase
      .from('budget_allocations')
      .select('*')
      .eq('id_budget_allocation', to_allocation_id)
      .eq('id_shop', id_shop)
      .eq('status', 'active')
      .single();

    if (toError || !toAllocation) {
      return {
        success: false,
        error: 'Destination allocation not found or not active',
        code: 'not_found',
      };
    }

    // 5. Check if source has enough remaining budget
    const fromRemaining = Number(fromAllocation.remaining_amount);
    if (fromRemaining < amount) {
      return {
        success: false,
        error: `Insufficient budget. Source allocation has only ${fromRemaining.toFixed(2)} remaining`,
        code: 'insufficient_budget',
      };
    }

    // 6. Calculate new amounts
    const fromNewAllocated = Number(fromAllocation.allocated_amount) - amount;
    const fromNewRemaining =
      fromNewAllocated +
      Number(fromAllocation.rollover_amount) -
      Number(fromAllocation.used_amount);

    const toNewAllocated = Number(toAllocation.allocated_amount) + amount;
    const toNewRemaining =
      toNewAllocated + Number(toAllocation.rollover_amount) - Number(toAllocation.used_amount);

    // 7. Create transaction for source (debit/decrease)
    const { error: fromTransactionError } = await supabase.from('budget_transactions').insert({
      id_shop,
      id_budget_allocation: from_allocation_id,
      transaction_type: 'adjustment',
      amount,
      description: `Transfer out: ${reason.trim()}`,
      approval_status: 'auto_approved',
      created_by: authData.publicUser.id_user,
    });

    if (fromTransactionError) {
      console.error('[transferBudget] Source transaction error:', fromTransactionError);
      return {
        success: false,
        error: 'Failed to record source transfer transaction',
        code: 'transaction_error',
      };
    }

    // 8. Create transaction for destination (credit/increase)
    const { error: toTransactionError } = await supabase.from('budget_transactions').insert({
      id_shop,
      id_budget_allocation: to_allocation_id,
      transaction_type: 'adjustment',
      amount,
      description: `Transfer in: ${reason.trim()}`,
      approval_status: 'auto_approved',
      created_by: authData.publicUser.id_user,
    });

    if (toTransactionError) {
      console.error('[transferBudget] Destination transaction error:', toTransactionError);
      return {
        success: false,
        error: 'Failed to record destination transfer transaction',
        code: 'transaction_error',
      };
    }

    // 9. Update source allocation
    const { data: updatedFrom, error: updateFromError } = await supabase
      .from('budget_allocations')
      .update({
        allocated_amount: fromNewAllocated,
        remaining_amount: fromNewRemaining,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_budget_allocation', from_allocation_id)
      .select()
      .single();

    if (updateFromError) {
      console.error('[transferBudget] Update source error:', updateFromError);
      return {
        success: false,
        error: 'Failed to update source allocation',
        code: 'update_error',
      };
    }

    // 10. Update destination allocation
    const { data: updatedTo, error: updateToError } = await supabase
      .from('budget_allocations')
      .update({
        allocated_amount: toNewAllocated,
        remaining_amount: toNewRemaining,
        updated_at: new Date().toISOString(),
        updated_by: authData.publicUser.id_user,
      })
      .eq('id_budget_allocation', to_allocation_id)
      .select()
      .single();

    if (updateToError) {
      console.error('[transferBudget] Update destination error:', updateToError);
      return {
        success: false,
        error: 'Failed to update destination allocation',
        code: 'update_error',
      };
    }

    // 11. Revalidate paths
    revalidateBudgetPaths(id_shop);

    return {
      success: true,
      data: {
        from_allocation: updatedFrom as BudgetAllocation,
        to_allocation: updatedTo as BudgetAllocation,
      },
      message: `Successfully transferred ${amount.toFixed(2)} between budget allocations`,
    };
  } catch (err) {
    console.error('[transferBudget] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Gets budget vs actual expense comparison for a period.
 *
 * @param input - The query parameters
 * @returns ActionResult with budget vs actual data
 *
 * @example
 * ```tsx
 * const result = await getBudgetVsActual({
 *   id_shop: 'shop-uuid',
 *   period_start: '2024-01-01',
 *   period_end: '2024-01-31'
 * });
 * ```
 */
export async function getBudgetVsActual(
  input: z.infer<typeof BudgetVsActualSchema> & { id_shop: string }
): Promise<ActionResult<{ items: BudgetVsActual[]; summary: BudgetSummary }>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = BudgetVsActualSchema.and(
      z.object({ id_shop: z.string().uuid() })
    ).safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, period_start, period_end, id_budget_category } = validationResult.data;

    // 3. Get budget allocations for the period
    let allocationsQuery = supabase
      .from('budget_allocations')
      .select(
        `
        *,
        budget_categories (
          id_budget_category,
          category_name,
          budget_type
        )
      `
      )
      .eq('id_shop', id_shop)
      .neq('status', 'cancelled')
      .lte('period_start', period_end)
      .gte('period_end', period_start);

    if (id_budget_category) {
      allocationsQuery = allocationsQuery.eq('id_budget_category', id_budget_category);
    }

    const { data: allocations, error: allocationsError } = await allocationsQuery;

    if (allocationsError) {
      console.error('[getBudgetVsActual] Allocations error:', allocationsError);
      return {
        success: false,
        error: 'Failed to fetch budget allocations',
        code: 'database_error',
      };
    }

    // 4. Get actual expenses for the period
    const expensesQuery = supabase
      .from('expenses')
      .select('id_expense_category, amount')
      .eq('id_shop', id_shop)
      .gte('expense_date', period_start)
      .lte('expense_date', period_end)
      .is('deleted_at', null);

    const { data: expenses, error: expensesError } = await expensesQuery;

    if (expensesError) {
      console.error('[getBudgetVsActual] Expenses error:', expensesError);
      return {
        success: false,
        error: 'Failed to fetch expenses',
        code: 'database_error',
      };
    }

    // 5. Calculate expenses by category
    const expensesByCategory: Record<string, number> = {};
    expenses?.forEach((expense) => {
      const catId = expense.id_expense_category;
      expensesByCategory[catId] = (expensesByCategory[catId] || 0) + Number(expense.amount);
    });

    // 6. Build budget vs actual items
    const items: BudgetVsActual[] = [];
    let totalAllocated = 0;
    let totalUsed = 0;
    let totalRemaining = 0;
    let totalExpenses = 0;
    let overBudgetCount = 0;
    let underBudgetCount = 0;

    allocations?.forEach((allocation) => {
      const category = allocation.budget_categories as unknown as {
        id_budget_category: string;
        category_name: string;
        budget_type: string;
      } | null;

      if (!category) {
        return;
      }

      const allocatedAmount = Number(allocation.allocated_amount);
      const usedAmount = Number(allocation.used_amount);
      const remainingAmount = Number(allocation.remaining_amount);
      // Note: In a real implementation, you'd link budget_categories to expense_categories
      // For now, we use the used_amount from the allocation
      const actualExpenses = usedAmount;
      const variance = allocatedAmount - actualExpenses;
      const variancePercentage = allocatedAmount > 0 ? (variance / allocatedAmount) * 100 : 0;
      const isOverBudget = variance < 0;

      items.push({
        category_name: category.category_name,
        id_budget_category: category.id_budget_category,
        budget_type: category.budget_type,
        allocated_amount: allocatedAmount,
        used_amount: usedAmount,
        remaining_amount: remainingAmount,
        actual_expenses: actualExpenses,
        variance,
        variance_percentage: variancePercentage,
        is_over_budget: isOverBudget,
      });

      totalAllocated += allocatedAmount;
      totalUsed += usedAmount;
      totalRemaining += remainingAmount;
      totalExpenses += actualExpenses;

      if (isOverBudget) {
        overBudgetCount++;
      } else {
        underBudgetCount++;
      }
    });

    // 7. Build summary
    const summary: BudgetSummary = {
      total_allocated: totalAllocated,
      total_used: totalUsed,
      total_remaining: totalRemaining,
      total_expenses: totalExpenses,
      overall_variance: totalAllocated - totalExpenses,
      category_count: items.length,
      over_budget_count: overBudgetCount,
      under_budget_count: underBudgetCount,
      utilization_percentage: totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0,
    };

    return {
      success: true,
      data: { items, summary },
    };
  } catch (err) {
    console.error('[getBudgetVsActual] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}
