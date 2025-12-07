/**
 * useExpenses Hook
 *
 * TanStack Query hooks for fetching and managing expenses, expense categories,
 * and recurring expenses.
 *
 * Features:
 * - Paginated expense list with category/date/status filters
 * - Single expense fetching
 * - Expense categories management
 * - Recurring expense schedules
 * - CRUD mutations with cache invalidation
 * - Approval/rejection workflows
 *
 * @module lib/hooks/data/useExpenses
 */

'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { queryKeys, invalidateScope } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/types/database';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Expense row type from the public.expenses table
 */
export type Expense = Tables<'expenses'>;

/**
 * Expense insert type for creating new expenses
 */
export type ExpenseInsert = TablesInsert<'expenses'>;

/**
 * Expense update type for updating expenses
 */
export type ExpenseUpdate = TablesUpdate<'expenses'>;

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
 * Expense category insert type
 */
export type ExpenseCategoryInsert = Omit<
  ExpenseCategory,
  'id_expense_category' | 'created_at' | 'updated_at' | 'deleted_at'
> & {
  id_expense_category?: string;
};

/**
 * Expense category update type
 */
export type ExpenseCategoryUpdate = Partial<
  Omit<ExpenseCategory, 'id_expense_category' | 'id_shop' | 'created_at' | 'created_by'>
> & {
  id_expense_category: string;
};

/**
 * Recurring expense row type
 * Matches actual database schema for recurring_expenses table
 */
export interface RecurringExpense {
  id_recurring_expense: string;
  id_shop: string;
  id_expense_category: string;
  description: string;
  amount: number;
  frequency: string;
  auto_approve: boolean | null;
  is_active: boolean | null;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  last_generated_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Recurring expense insert type
 */
export type RecurringExpenseInsert = Omit<
  RecurringExpense,
  | 'id_recurring_expense'
  | 'created_at'
  | 'updated_at'
  | 'deleted_at'
  | 'last_generated_date'
  | 'next_due_date'
> & {
  id_recurring_expense?: string;
  next_due_date?: string;
};

/**
 * Recurring expense update type
 */
export type RecurringExpenseUpdate = Partial<
  Omit<
    RecurringExpense,
    'id_recurring_expense' | 'id_shop' | 'created_at' | 'created_by' | 'deleted_at'
  >
> & {
  id_recurring_expense: string;
};

/**
 * Expense with category details
 */
export interface ExpenseWithCategory extends Expense {
  expense_categories: ExpenseCategory | null;
}

/**
 * Recurring expense with category details
 */
export interface RecurringExpenseWithCategory extends RecurringExpense {
  expense_categories: ExpenseCategory | null;
}

/**
 * Options for filtering and paginating expense queries
 */
export interface UseExpensesOptions {
  /** Search term for description, vendor name (ilike search) */
  search?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: keyof Expense;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Filter by category */
  categoryId?: string;
  /** Filter by payment status */
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
  /** Filter by approval status */
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  /** Start date for date range filter */
  startDate?: string;
  /** End date for date range filter */
  endDate?: string;
  /** Include soft-deleted expenses */
  includeDeleted?: boolean;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for the useExpenses hook
 */
export interface UseExpensesReturn {
  /** Array of expenses */
  expenses: ExpenseWithCategory[];
  /** Total count of matching expenses */
  totalCount: number;
  /** Current page number */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages */
  hasNextPage: boolean;
  /** Whether there are previous pages */
  hasPreviousPage: boolean;
  /** True while loading */
  isLoading: boolean;
  /** True if loading for first time */
  isInitialLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Options for recurring expense queries
 */
export interface UseRecurringExpensesOptions {
  /** Search term */
  search?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Filter by category */
  categoryId?: string;
  /** Filter by is_active */
  isActive?: boolean;
  /** Filter by frequency */
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for recurring expenses
 */
export interface UseRecurringExpensesReturn {
  /** Array of recurring expenses */
  recurringExpenses: RecurringExpenseWithCategory[];
  /** Total count */
  totalCount: number;
  /** Current page */
  page: number;
  /** Total pages */
  totalPages: number;
  /** True while loading */
  isLoading: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

/**
 * Fetches expenses with pagination and filtering
 */
async function fetchExpenses(
  shopId: string,
  options: UseExpensesOptions
): Promise<{ expenses: ExpenseWithCategory[]; totalCount: number }> {
  const {
    search,
    page = 1,
    pageSize = 20,
    sortBy = 'expense_date',
    sortDirection = 'desc',
    categoryId,
    paymentStatus,
    approvalStatus,
    startDate,
    endDate,
    includeDeleted = false,
  } = options;

  const supabase = createClient();

  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;

  // Build the base query
  let query = supabase
    .from('expenses')
    .select(
      `
      *,
      expense_categories (*)
    `,
      { count: 'exact' }
    )
    .eq('id_shop', shopId);

  // Apply soft delete filter
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  // Apply search filter (description, vendor_name, expense_number)
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `description.ilike.${searchTerm},vendor_name.ilike.${searchTerm},expense_number.ilike.${searchTerm}`
    );
  }

  // Apply category filter
  if (categoryId) {
    query = query.eq('id_expense_category', categoryId);
  }

  // Apply payment status filter
  if (paymentStatus) {
    query = query.eq('payment_status', paymentStatus);
  }

  // Apply approval status filter
  if (approvalStatus) {
    query = query.eq('approval_status', approvalStatus);
  }

  // Apply date range filter
  if (startDate) {
    query = query.gte('expense_date', startDate);
  }
  if (endDate) {
    query = query.lte('expense_date', endDate);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  return {
    expenses: (data ?? []) as unknown as ExpenseWithCategory[],
    totalCount: count ?? 0,
  };
}

/**
 * Fetches a single expense by ID
 */
async function fetchExpense(
  shopId: string,
  expenseId: string
): Promise<ExpenseWithCategory | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('expenses')
    .select(
      `
      *,
      expense_categories (*)
    `
    )
    .eq('id_shop', shopId)
    .eq('id_expense', expenseId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch expense: ${error.message}`);
  }

  return data as unknown as ExpenseWithCategory;
}

/**
 * Fetches expense categories
 */
async function fetchExpenseCategories(shopId: string): Promise<ExpenseCategory[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('id_shop', shopId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('category_name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch expense categories: ${error.message}`);
  }

  return (data ?? []) as ExpenseCategory[];
}

/**
 * Fetches recurring expenses with pagination and filtering
 */
async function fetchRecurringExpenses(
  shopId: string,
  options: UseRecurringExpensesOptions
): Promise<{ recurringExpenses: RecurringExpenseWithCategory[]; totalCount: number }> {
  const { search, page = 1, pageSize = 20, categoryId, isActive, frequency } = options;

  const supabase = createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('recurring_expenses')
    .select(
      `
      *,
      expense_categories (*)
    `,
      { count: 'exact' }
    )
    .eq('id_shop', shopId)
    .is('deleted_at', null);

  // Apply search filter
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.ilike('description', searchTerm);
  }

  // Apply category filter
  if (categoryId) {
    query = query.eq('id_expense_category', categoryId);
  }

  // Apply is_active filter
  if (isActive !== undefined) {
    query = query.eq('is_active', isActive);
  }

  // Apply frequency filter
  if (frequency) {
    query = query.eq('frequency', frequency);
  }

  // Order by next due date
  query = query.order('next_due_date', { ascending: true });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch recurring expenses: ${error.message}`);
  }

  return {
    recurringExpenses: (data ?? []) as unknown as RecurringExpenseWithCategory[],
    totalCount: count ?? 0,
  };
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to fetch paginated expense list with search and filtering.
 *
 * Features:
 * - Automatic shop scoping via useShop
 * - Search by description, vendor name, or expense number
 * - Pagination with page navigation
 * - Sorting by any expense field
 * - Filtering by category, payment status, approval status, and date range
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated expense list with metadata
 *
 * @example
 * ```tsx
 * function ExpenseList() {
 *   const [search, setSearch] = useState('');
 *   const [page, setPage] = useState(1);
 *
 *   const {
 *     expenses,
 *     totalCount,
 *     totalPages,
 *     hasNextPage,
 *     isLoading,
 *     error
 *   } = useExpenses({
 *     search,
 *     page,
 *     pageSize: 20,
 *     paymentStatus: 'unpaid',
 *     sortBy: 'expense_date',
 *     sortDirection: 'desc'
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       <SearchInput value={search} onChange={setSearch} />
 *       <ExpenseTable expenses={expenses} />
 *       <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useExpenses(options: UseExpensesOptions = {}): UseExpensesReturn {
  const { shopId, hasAccess } = useShop();
  const {
    search = '',
    page = 1,
    pageSize = 20,
    sortBy = 'expense_date',
    sortDirection = 'desc',
    categoryId,
    paymentStatus,
    approvalStatus,
    startDate,
    endDate,
    includeDeleted = false,
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.expenses(shopId ?? ''),
      {
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        categoryId,
        paymentStatus,
        approvalStatus,
        startDate,
        endDate,
        includeDeleted,
      },
    ],
    queryFn: () =>
      fetchExpenses(shopId!, {
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        categoryId,
        paymentStatus,
        approvalStatus,
        startDate,
        endDate,
        includeDeleted,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  const expenses = data?.expenses ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    expenses,
    totalCount,
    page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    isLoading,
    isInitialLoading: isLoading && !data,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to fetch a single expense by ID
 *
 * @param expenseId - The expense ID to fetch
 * @param options - Query options
 * @returns Expense data with category
 *
 * @example
 * ```tsx
 * const { data: expense, isLoading, error } = useExpense('expense-uuid');
 * ```
 */
export function useExpense(expenseId: string, options: { enabled?: boolean } = {}) {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.expense(shopId ?? '', expenseId),
    queryFn: () => fetchExpense(shopId!, expenseId),
    enabled: !!shopId && !!expenseId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch expense categories
 *
 * @returns List of expense categories
 *
 * @example
 * ```tsx
 * const { data: categories, isLoading } = useExpenseCategories();
 * ```
 */
export function useExpenseCategories(options: { enabled?: boolean } = {}) {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.expenseCategories(shopId ?? ''),
    queryFn: () => fetchExpenseCategories(shopId!),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - categories change less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetches a single expense category by ID
 */
async function fetchExpenseCategory(
  shopId: string,
  categoryId: string
): Promise<ExpenseCategory | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('id_shop', shopId)
    .eq('id_expense_category', categoryId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch expense category: ${error.message}`);
  }

  return data as ExpenseCategory;
}

/**
 * Hook to fetch a single expense category by ID
 *
 * @param categoryId - The category ID to fetch
 * @param options - Query options
 * @returns Single expense category data
 *
 * @example
 * ```tsx
 * const { data: category, isLoading, error } = useExpenseCategory('category-uuid');
 * ```
 */
export function useExpenseCategory(categoryId: string, options: { enabled?: boolean } = {}) {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  return useQuery({
    queryKey: [...queryKeys.expenseCategories(shopId ?? ''), categoryId],
    queryFn: () => fetchExpenseCategory(shopId!, categoryId),
    enabled: !!shopId && !!categoryId && hasAccess && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch recurring expenses
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated recurring expense list
 *
 * @example
 * ```tsx
 * const {
 *   recurringExpenses,
 *   totalCount,
 *   isLoading
 * } = useRecurringExpenses({
 *   isActive: true,
 *   frequency: 'monthly'
 * });
 * ```
 */
export function useRecurringExpenses(
  options: UseRecurringExpensesOptions = {}
): UseRecurringExpensesReturn {
  const { shopId, hasAccess } = useShop();
  const {
    search = '',
    page = 1,
    pageSize = 20,
    categoryId,
    isActive,
    frequency,
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.recurringExpenses(shopId ?? ''),
      { search, page, pageSize, categoryId, isActive, frequency },
    ],
    queryFn: () =>
      fetchRecurringExpenses(shopId!, {
        search,
        page,
        pageSize,
        categoryId,
        isActive,
        frequency,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, error, refetch } = queryResult;

  const recurringExpenses = data?.recurringExpenses ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    recurringExpenses,
    totalCount,
    page,
    totalPages,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Hook to create a new expense
 *
 * @example
 * ```tsx
 * const createExpense = useCreateExpense();
 *
 * const handleCreate = async (data: ExpenseInsert) => {
 *   try {
 *     const newExpense = await createExpense.mutateAsync(data);
 *     toast.success('Expense created!');
 *   } catch (error) {
 *     toast.error('Failed to create expense');
 *   }
 * };
 * ```
 */
export function useCreateExpense() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<ExpenseInsert, 'id_shop' | 'created_by' | 'expense_number'>) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get public user ID
      const { data: publicUser } = await supabase
        .from('users')
        .select('id_user')
        .eq('auth_id', user.id)
        .single();

      if (!publicUser) {
        throw new Error('User not found');
      }

      // Generate expense number
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
      const expenseNumber = `EXP-${String(nextNumber).padStart(6, '0')}`;

      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          ...data,
          id_shop: shopId,
          expense_number: expenseNumber,
          created_by: publicUser.id_user,
          payment_status: 'unpaid',
          approval_status: 'pending',
          paid_amount: 0,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create expense: ${error.message}`);
      }

      return expense;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.expenses(shopId) });
      }
    },
  });
}

/**
 * Hook to update an existing expense
 *
 * @example
 * ```tsx
 * const updateExpense = useUpdateExpense();
 *
 * const handleUpdate = async (expenseId: string, data: ExpenseUpdate) => {
 *   try {
 *     await updateExpense.mutateAsync({ expenseId, data });
 *     toast.success('Expense updated!');
 *   } catch (error) {
 *     toast.error('Failed to update expense');
 *   }
 * };
 * ```
 */
export function useUpdateExpense() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      expenseId,
      data,
    }: {
      expenseId: string;
      data: Partial<ExpenseUpdate>;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user for updated_by
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: publicUser } = await supabase
        .from('users')
        .select('id_user')
        .eq('auth_id', user.id)
        .single();

      const { data: expense, error } = await supabase
        .from('expenses')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
          updated_by: publicUser?.id_user,
        })
        .eq('id_expense', expenseId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update expense: ${error.message}`);
      }

      return expense;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.expenses(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.expense(shopId, variables.expenseId),
        });
      }
    },
  });
}

/**
 * Hook to soft-delete an expense
 *
 * @example
 * ```tsx
 * const deleteExpense = useDeleteExpense();
 *
 * const handleDelete = async (expenseId: string) => {
 *   try {
 *     await deleteExpense.mutateAsync(expenseId);
 *     toast.success('Expense deleted!');
 *   } catch (error) {
 *     toast.error('Failed to delete expense');
 *   }
 * };
 * ```
 */
export function useDeleteExpense() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user for updated_by
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let updatedBy: string | undefined;
      if (user) {
        const { data: publicUser } = await supabase
          .from('users')
          .select('id_user')
          .eq('auth_id', user.id)
          .single();
        updatedBy = publicUser?.id_user;
      }

      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('expenses')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        })
        .eq('id_expense', expenseId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to delete expense: ${error.message}`);
      }

      return { expenseId };
    },
    onSuccess: (_, expenseId) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.expenses(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.expense(shopId, expenseId),
        });
      }
    },
  });
}

/**
 * Hook to approve an expense
 *
 * @example
 * ```tsx
 * const approveExpense = useApproveExpense();
 *
 * const handleApprove = async (expenseId: string) => {
 *   try {
 *     await approveExpense.mutateAsync(expenseId);
 *     toast.success('Expense approved!');
 *   } catch (error) {
 *     toast.error('Failed to approve expense');
 *   }
 * };
 * ```
 */
export function useApproveExpense() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: publicUser } = await supabase
        .from('users')
        .select('id_user')
        .eq('auth_id', user.id)
        .single();

      if (!publicUser) {
        throw new Error('User not found');
      }

      const { data: expense, error } = await supabase
        .from('expenses')
        .update({
          approval_status: 'approved',
          approved_by: publicUser.id_user,
          approved_at: new Date().toISOString(),
          rejected_by: null,
          rejected_at: null,
          rejection_reason: null,
          updated_at: new Date().toISOString(),
          updated_by: publicUser.id_user,
        })
        .eq('id_expense', expenseId)
        .eq('id_shop', shopId)
        .eq('approval_status', 'pending')
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to approve expense: ${error.message}`);
      }

      return expense;
    },
    onSuccess: (_, expenseId) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.expenses(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.expense(shopId, expenseId),
        });
      }
    },
  });
}

/**
 * Hook to reject an expense
 *
 * @example
 * ```tsx
 * const rejectExpense = useRejectExpense();
 *
 * const handleReject = async (expenseId: string, reason: string) => {
 *   try {
 *     await rejectExpense.mutateAsync({ expenseId, reason });
 *     toast.success('Expense rejected!');
 *   } catch (error) {
 *     toast.error('Failed to reject expense');
 *   }
 * };
 * ```
 */
export function useRejectExpense() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, reason }: { expenseId: string; reason: string }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: publicUser } = await supabase
        .from('users')
        .select('id_user')
        .eq('auth_id', user.id)
        .single();

      if (!publicUser) {
        throw new Error('User not found');
      }

      const { data: expense, error } = await supabase
        .from('expenses')
        .update({
          approval_status: 'rejected',
          rejected_by: publicUser.id_user,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          approved_by: null,
          approved_at: null,
          updated_at: new Date().toISOString(),
          updated_by: publicUser.id_user,
        })
        .eq('id_expense', expenseId)
        .eq('id_shop', shopId)
        .eq('approval_status', 'pending')
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to reject expense: ${error.message}`);
      }

      return expense;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.expenses(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.expense(shopId, variables.expenseId),
        });
      }
    },
  });
}

// =============================================================================
// EXPENSE CATEGORY MUTATIONS
// =============================================================================

/**
 * Hook to create an expense category
 */
export function useCreateExpenseCategory() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<ExpenseCategoryInsert, 'id_shop' | 'created_by'>) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: publicUser } = await supabase
        .from('users')
        .select('id_user')
        .eq('auth_id', user.id)
        .single();

      if (!publicUser) {
        throw new Error('User not found');
      }

      const { data: category, error } = await supabase
        .from('expense_categories')
        .insert({
          ...data,
          id_shop: shopId,
          created_by: publicUser.id_user,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create expense category: ${error.message}`);
      }

      return category as ExpenseCategory;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories(shopId) });
      }
    },
  });
}

/**
 * Hook to update an expense category
 */
export function useUpdateExpenseCategory() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      data,
    }: {
      categoryId: string;
      data: Partial<ExpenseCategoryUpdate>;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: category, error } = await supabase
        .from('expense_categories')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id_expense_category', categoryId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update expense category: ${error.message}`);
      }

      return category as ExpenseCategory;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories(shopId) });
      }
    },
  });
}

/**
 * Hook to delete an expense category (soft delete)
 */
export function useDeleteExpenseCategory() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Check if category is in use
      const { count } = await supabase
        .from('expenses')
        .select('id_expense', { count: 'exact', head: true })
        .eq('id_expense_category', categoryId)
        .is('deleted_at', null);

      if (count && count > 0) {
        throw new Error('Cannot delete category that has expenses assigned to it');
      }

      const { error } = await supabase
        .from('expense_categories')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id_expense_category', categoryId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to delete expense category: ${error.message}`);
      }

      return { categoryId };
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories(shopId) });
      }
    },
  });
}

// =============================================================================
// RECURRING EXPENSE MUTATIONS
// =============================================================================

/**
 * Hook to create a recurring expense
 */
export function useCreateRecurringExpense() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: Omit<RecurringExpenseInsert, 'id_shop' | 'created_by' | 'next_due_date'>
    ) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: publicUser } = await supabase
        .from('users')
        .select('id_user')
        .eq('auth_id', user.id)
        .single();

      if (!publicUser) {
        throw new Error('User not found');
      }

      // Calculate next due date based on frequency
      const nextDueDate = data.start_date;

      const { data: recurringExpense, error } = await supabase
        .from('recurring_expenses')
        .insert({
          ...data,
          id_shop: shopId,
          created_by: publicUser.id_user,
          next_due_date: nextDueDate,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create recurring expense: ${error.message}`);
      }

      return recurringExpense as RecurringExpense;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses(shopId) });
      }
    },
  });
}

/**
 * Hook to update a recurring expense
 */
export function useUpdateRecurringExpense() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recurringExpenseId,
      data,
    }: {
      recurringExpenseId: string;
      data: Partial<RecurringExpenseUpdate>;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: recurringExpense, error } = await supabase
        .from('recurring_expenses')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id_recurring_expense', recurringExpenseId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update recurring expense: ${error.message}`);
      }

      return recurringExpense as RecurringExpense;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses(shopId) });
      }
    },
  });
}

/**
 * Hook to pause a recurring expense (set is_active to false)
 */
export function usePauseRecurringExpense() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recurringExpenseId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: recurringExpense, error } = await supabase
        .from('recurring_expenses')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id_recurring_expense', recurringExpenseId)
        .eq('id_shop', shopId)
        .eq('is_active', true)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to pause recurring expense: ${error.message}`);
      }

      return recurringExpense as RecurringExpense;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses(shopId) });
      }
    },
  });
}

/**
 * Hook to resume a paused recurring expense (set is_active to true)
 */
export function useResumeRecurringExpense() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recurringExpenseId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: recurringExpense, error } = await supabase
        .from('recurring_expenses')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id_recurring_expense', recurringExpenseId)
        .eq('id_shop', shopId)
        .eq('is_active', false)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to resume recurring expense: ${error.message}`);
      }

      return recurringExpense as RecurringExpense;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses(shopId) });
      }
    },
  });
}

/**
 * Hook to delete a recurring expense (soft delete)
 */
export function useDeleteRecurringExpense() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recurringExpenseId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { error } = await supabase
        .from('recurring_expenses')
        .update({
          deleted_at: new Date().toISOString(),
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id_recurring_expense', recurringExpenseId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to delete recurring expense: ${error.message}`);
      }

      return { recurringExpenseId };
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses(shopId) });
      }
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Utility to invalidate expense caches
 */
export function useInvalidateExpenses() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all expense queries for current shop */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({ queryKey: invalidateScope.expenses(shopId) });
      }
      return undefined;
    },
    /** Invalidate a specific expense */
    invalidateOne: (expenseId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.expense(shopId, expenseId),
        });
      }
      return undefined;
    },
    /** Invalidate expense categories */
    invalidateCategories: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.expenseCategories(shopId),
        });
      }
      return undefined;
    },
    /** Invalidate recurring expenses */
    invalidateRecurring: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.recurringExpenses(shopId),
        });
      }
      return undefined;
    },
  };
}

/**
 * Local query key definitions for use in components
 */
export const expenseKeys = {
  all: (shopId: string) => queryKeys.expenses(shopId),
  one: (shopId: string, expenseId: string) => queryKeys.expense(shopId, expenseId),
  categories: (shopId: string) => queryKeys.expenseCategories(shopId),
  recurring: (shopId: string) => queryKeys.recurringExpenses(shopId),
};
