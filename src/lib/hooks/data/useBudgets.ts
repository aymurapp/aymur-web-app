/**
 * useBudgets Hook
 *
 * TanStack Query hooks for fetching and managing budget data.
 * Supports budget categories, allocations, transactions, and summaries.
 *
 * @module lib/hooks/data/useBudgets
 */

'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { queryKeys, invalidateScope } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

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
 * Budget category insert type
 */
export interface BudgetCategoryInsert {
  id_shop: string;
  category_name: string;
  budget_type: string;
  description?: string | null;
  default_amount?: number;
  default_frequency?: string;
  requires_approval?: boolean;
  approval_threshold?: number | null;
  is_active?: boolean;
  sort_order?: number;
  created_by: string;
}

/**
 * Budget category update type
 */
export interface BudgetCategoryUpdate {
  category_name?: string;
  budget_type?: string;
  description?: string | null;
  default_amount?: number;
  default_frequency?: string;
  requires_approval?: boolean;
  approval_threshold?: number | null;
  is_active?: boolean;
  sort_order?: number;
  updated_at?: string;
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
 * Budget allocation insert type
 */
export interface BudgetAllocationInsert {
  id_shop: string;
  id_budget_category: string;
  id_user?: string | null;
  period_start: string;
  period_end: string;
  allocated_amount: number;
  used_amount?: number;
  remaining_amount?: number;
  rollover_enabled?: boolean;
  rollover_amount?: number;
  status?: string;
  notes?: string | null;
  created_by: string;
}

/**
 * Budget allocation update type
 */
export interface BudgetAllocationUpdate {
  allocated_amount?: number;
  used_amount?: number;
  remaining_amount?: number;
  rollover_enabled?: boolean;
  rollover_amount?: number;
  status?: string;
  notes?: string | null;
  updated_at?: string;
  updated_by?: string;
}

/**
 * Budget allocation with category details
 */
export interface BudgetAllocationWithCategory extends BudgetAllocation {
  budget_category: BudgetCategory | null;
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
 * Budget summary type
 */
export interface BudgetSummary {
  total_allocated: number;
  total_used: number;
  total_remaining: number;
  utilization_percentage: number;
  over_budget_count: number;
  under_budget_count: number;
  category_count: number;
}

/**
 * Options for budget category queries
 */
export interface UseBudgetCategoriesOptions {
  /** Search term for category name */
  search?: string;
  /** Filter by budget type */
  budgetType?: string;
  /** Filter by active status */
  isActive?: boolean;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: keyof BudgetCategory;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Options for budget allocation queries
 */
export interface UseBudgetAllocationsOptions {
  /** Filter by category */
  categoryId?: string;
  /** Filter by user (for user-specific budgets) */
  userId?: string | null;
  /** Filter by status */
  status?: 'active' | 'closed' | 'cancelled';
  /** Find allocations containing this date */
  periodContains?: string;
  /** Period start after this date */
  periodStartAfter?: string;
  /** Period end before this date */
  periodEndBefore?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: keyof BudgetAllocation;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Options for budget transaction queries
 */
export interface UseBudgetTransactionsOptions {
  /** Filter by allocation */
  allocationId?: string;
  /** Filter by transaction type */
  transactionType?: string;
  /** Start date for date range filter */
  startDate?: string;
  /** End date for date range filter */
  endDate?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Options for budget summary queries
 */
export interface UseBudgetSummaryOptions {
  /** Period start date */
  periodStart: string;
  /** Period end date */
  periodEnd: string;
  /** Filter by category */
  categoryId?: string;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for budget categories hook
 */
export interface UseBudgetCategoriesReturn {
  categories: BudgetCategory[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  isInitialLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Return type for budget allocations hook
 */
export interface UseBudgetAllocationsReturn {
  allocations: BudgetAllocationWithCategory[];
  totalCount: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Return type for budget transactions hook
 */
export interface UseBudgetTransactionsReturn {
  transactions: BudgetTransaction[];
  totalCount: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

/**
 * Fetches budget categories with pagination and filtering
 */
async function fetchBudgetCategories(
  shopId: string,
  options: UseBudgetCategoriesOptions
): Promise<{ categories: BudgetCategory[]; totalCount: number }> {
  const {
    search,
    page = 1,
    pageSize = 20,
    sortBy = 'sort_order',
    sortDirection = 'asc',
    budgetType,
    isActive,
  } = options;

  const supabase = createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('budget_categories')
    .select('*', { count: 'exact' })
    .eq('id_shop', shopId)
    .is('deleted_at', null);

  // Apply search filter
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.ilike('category_name', searchTerm);
  }

  // Apply budget type filter
  if (budgetType) {
    query = query.eq('budget_type', budgetType);
  }

  // Apply active status filter
  if (isActive !== undefined) {
    query = query.eq('is_active', isActive);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch budget categories: ${error.message}`);
  }

  return {
    categories: (data ?? []) as BudgetCategory[],
    totalCount: count ?? 0,
  };
}

/**
 * Fetches a single budget category by ID
 */
async function fetchBudgetCategory(
  shopId: string,
  categoryId: string
): Promise<BudgetCategory | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('id_shop', shopId)
    .eq('id_budget_category', categoryId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch budget category: ${error.message}`);
  }

  return data as BudgetCategory;
}

/**
 * Fetches budget allocations with pagination and filtering
 */
async function fetchBudgetAllocations(
  shopId: string,
  options: UseBudgetAllocationsOptions
): Promise<{ allocations: BudgetAllocationWithCategory[]; totalCount: number }> {
  const {
    categoryId,
    userId,
    status,
    periodContains,
    periodStartAfter,
    periodEndBefore,
    page = 1,
    pageSize = 20,
    sortBy = 'period_start',
    sortDirection = 'desc',
  } = options;

  const supabase = createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('budget_allocations')
    .select(
      `
      *,
      budget_category:budget_categories!fk_budget_allocations_category (*)
    `,
      { count: 'exact' }
    )
    .eq('id_shop', shopId);

  // Apply category filter
  if (categoryId) {
    query = query.eq('id_budget_category', categoryId);
  }

  // Apply user filter
  if (userId !== undefined) {
    if (userId === null) {
      query = query.is('id_user', null);
    } else {
      query = query.eq('id_user', userId);
    }
  }

  // Apply status filter
  if (status) {
    query = query.eq('status', status);
  }

  // Apply period contains filter
  if (periodContains) {
    query = query.lte('period_start', periodContains).gte('period_end', periodContains);
  }

  // Apply period range filters
  if (periodStartAfter) {
    query = query.gte('period_start', periodStartAfter);
  }
  if (periodEndBefore) {
    query = query.lte('period_end', periodEndBefore);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch budget allocations: ${error.message}`);
  }

  return {
    // Cast through unknown since TypeScript types don't include the relationship
    allocations: (data ?? []) as unknown as BudgetAllocationWithCategory[],
    totalCount: count ?? 0,
  };
}

/**
 * Fetches budget transactions (immutable ledger)
 */
async function fetchBudgetTransactions(
  shopId: string,
  options: UseBudgetTransactionsOptions
): Promise<{ transactions: BudgetTransaction[]; totalCount: number }> {
  const { allocationId, transactionType, startDate, endDate, page = 1, pageSize = 20 } = options;

  const supabase = createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('budget_transactions')
    .select('*', { count: 'exact' })
    .eq('id_shop', shopId);

  // Apply allocation filter
  if (allocationId) {
    query = query.eq('id_budget_allocation', allocationId);
  }

  // Apply transaction type filter
  if (transactionType) {
    query = query.eq('transaction_type', transactionType);
  }

  // Apply date range filter
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  // Order by most recent first (ledger)
  query = query.order('sequence_number', { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch budget transactions: ${error.message}`);
  }

  return {
    transactions: (data ?? []) as BudgetTransaction[],
    totalCount: count ?? 0,
  };
}

/**
 * Fetches budget summary for a period
 */
async function fetchBudgetSummary(
  shopId: string,
  options: UseBudgetSummaryOptions
): Promise<BudgetSummary> {
  const { periodStart, periodEnd, categoryId } = options;

  const supabase = createClient();

  let query = supabase
    .from('budget_allocations')
    .select('allocated_amount, used_amount, remaining_amount, status')
    .eq('id_shop', shopId)
    .neq('status', 'cancelled')
    .lte('period_start', periodEnd)
    .gte('period_end', periodStart);

  if (categoryId) {
    query = query.eq('id_budget_category', categoryId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch budget summary: ${error.message}`);
  }

  const allocations = data ?? [];

  // Calculate summary
  let totalAllocated = 0;
  let totalUsed = 0;
  let totalRemaining = 0;
  let overBudgetCount = 0;
  let underBudgetCount = 0;

  allocations.forEach((alloc) => {
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

  return {
    total_allocated: totalAllocated,
    total_used: totalUsed,
    total_remaining: totalRemaining,
    utilization_percentage: utilizationPercentage,
    over_budget_count: overBudgetCount,
    under_budget_count: underBudgetCount,
    category_count: allocations.length,
  };
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to fetch paginated budget categories with search and filtering.
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated category list with metadata
 *
 * @example
 * ```tsx
 * const {
 *   categories,
 *   totalCount,
 *   isLoading,
 *   error
 * } = useBudgetCategories({
 *   isActive: true,
 *   sortBy: 'category_name'
 * });
 * ```
 */
export function useBudgetCategories(
  options: UseBudgetCategoriesOptions = {}
): UseBudgetCategoriesReturn {
  const { shopId, hasAccess } = useShop();
  const {
    search = '',
    page = 1,
    pageSize = 20,
    sortBy = 'sort_order',
    sortDirection = 'asc',
    budgetType,
    isActive,
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.budgetCategories(shopId ?? ''),
      { search, page, pageSize, sortBy, sortDirection, budgetType, isActive },
    ],
    queryFn: () =>
      fetchBudgetCategories(shopId!, {
        search,
        page,
        pageSize,
        sortBy,
        sortDirection,
        budgetType,
        isActive,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - categories change less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  const categories = data?.categories ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    categories,
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
 * Hook to fetch a single budget category by ID
 *
 * @param categoryId - The category ID to fetch
 * @param options - Query options
 * @returns Category data
 */
export function useBudgetCategory(categoryId: string, options: { enabled?: boolean } = {}) {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.budgetCategory(shopId ?? '', categoryId),
    queryFn: () => fetchBudgetCategory(shopId!, categoryId),
    enabled: !!shopId && !!categoryId && hasAccess && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch budget allocations for a period
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated allocation list
 *
 * @example
 * ```tsx
 * const {
 *   allocations,
 *   isLoading
 * } = useBudgetAllocations({
 *   periodContains: '2024-01-15',
 *   status: 'active'
 * });
 * ```
 */
export function useBudgetAllocations(
  options: UseBudgetAllocationsOptions = {}
): UseBudgetAllocationsReturn {
  const { shopId, hasAccess } = useShop();
  const {
    categoryId,
    userId,
    status,
    periodContains,
    periodStartAfter,
    periodEndBefore,
    page = 1,
    pageSize = 20,
    sortBy = 'period_start',
    sortDirection = 'desc',
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.budgetAllocations(shopId ?? ''),
      {
        categoryId,
        userId,
        status,
        periodContains,
        periodStartAfter,
        periodEndBefore,
        page,
        pageSize,
        sortBy,
        sortDirection,
      },
    ],
    queryFn: () =>
      fetchBudgetAllocations(shopId!, {
        categoryId,
        userId,
        status,
        periodContains,
        periodStartAfter,
        periodEndBefore,
        page,
        pageSize,
        sortBy,
        sortDirection,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data, isLoading, error, refetch } = queryResult;

  const allocations = data?.allocations ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    allocations,
    totalCount,
    page,
    totalPages,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to fetch budget transactions (immutable ledger)
 *
 * NOTE: budget_transactions is IMMUTABLE - only INSERT operations allowed
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated transaction list
 */
export function useBudgetTransactions(
  options: UseBudgetTransactionsOptions = {}
): UseBudgetTransactionsReturn {
  const { shopId, hasAccess } = useShop();
  const {
    allocationId,
    transactionType,
    startDate,
    endDate,
    page = 1,
    pageSize = 20,
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.budgetTransactions(shopId ?? ''),
      { allocationId, transactionType, startDate, endDate, page, pageSize },
    ],
    queryFn: () =>
      fetchBudgetTransactions(shopId!, {
        allocationId,
        transactionType,
        startDate,
        endDate,
        page,
        pageSize,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, error, refetch } = queryResult;

  const transactions = data?.transactions ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    transactions,
    totalCount,
    page,
    totalPages,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to fetch budget summary (allocated vs spent)
 *
 * @param options - Query options including period
 * @returns Budget summary data
 *
 * @example
 * ```tsx
 * const { data: summary, isLoading } = useBudgetSummary({
 *   periodStart: '2024-01-01',
 *   periodEnd: '2024-01-31'
 * });
 * ```
 */
export function useBudgetSummary(options: UseBudgetSummaryOptions) {
  const { shopId, hasAccess } = useShop();
  const { periodStart, periodEnd, categoryId, enabled = true } = options;

  return useQuery({
    queryKey: [...queryKeys.budgetSummary(shopId ?? ''), { periodStart, periodEnd, categoryId }],
    queryFn: () =>
      fetchBudgetSummary(shopId!, {
        periodStart,
        periodEnd,
        categoryId,
      }),
    enabled: !!shopId && !!periodStart && !!periodEnd && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Hook to create a new budget category
 *
 * @example
 * ```tsx
 * const createCategory = useCreateBudgetCategory();
 *
 * const handleCreate = async (data) => {
 *   try {
 *     const newCategory = await createCategory.mutateAsync(data);
 *     toast.success('Category created!');
 *   } catch (error) {
 *     toast.error('Failed to create category');
 *   }
 * };
 * ```
 */
export function useCreateBudgetCategory() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<BudgetCategoryInsert, 'id_shop' | 'created_by'>) => {
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

      const { data: category, error } = await supabase
        .from('budget_categories')
        .insert({
          ...data,
          id_shop: shopId,
          created_by: publicUser.id_user,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create budget category: ${error.message}`);
      }

      return category as BudgetCategory;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: invalidateScope.budgetCategories(shopId),
        });
      }
    },
  });
}

/**
 * Hook to update an existing budget category
 */
export function useUpdateBudgetCategory() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      data,
    }: {
      categoryId: string;
      data: BudgetCategoryUpdate;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: category, error } = await supabase
        .from('budget_categories')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id_budget_category', categoryId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update budget category: ${error.message}`);
      }

      return category as BudgetCategory;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: invalidateScope.budgetCategories(shopId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.budgetCategory(shopId, variables.categoryId),
        });
      }
    },
  });
}

/**
 * Hook to soft-delete a budget category
 */
export function useDeleteBudgetCategory() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Check for active allocations
      const { data: activeAllocations } = await supabase
        .from('budget_allocations')
        .select('id_budget_allocation')
        .eq('id_budget_category', categoryId)
        .eq('status', 'active')
        .limit(1);

      if (activeAllocations && activeAllocations.length > 0) {
        throw new Error('Cannot delete category with active budget allocations');
      }

      const { error } = await supabase
        .from('budget_categories')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id_budget_category', categoryId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to delete budget category: ${error.message}`);
      }

      return { categoryId };
    },
    onSuccess: (_, categoryId) => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: invalidateScope.budgetCategories(shopId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.budgetCategory(shopId, categoryId),
        });
      }
    },
  });
}

/**
 * Hook to create a new budget allocation
 */
export function useCreateBudgetAllocation() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<BudgetAllocationInsert, 'id_shop' | 'created_by'>) => {
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

      // Calculate remaining amount
      const remainingAmount = data.allocated_amount + (data.rollover_amount || 0);

      const { data: allocation, error } = await supabase
        .from('budget_allocations')
        .insert({
          ...data,
          id_shop: shopId,
          created_by: publicUser.id_user,
          used_amount: 0,
          remaining_amount: remainingAmount,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create budget allocation: ${error.message}`);
      }

      return allocation as BudgetAllocation;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: invalidateScope.budgetAllocations(shopId),
        });
        queryClient.invalidateQueries({
          queryKey: invalidateScope.budgetSummary(shopId),
        });
      }
    },
  });
}

/**
 * Hook to update an existing budget allocation
 */
export function useUpdateBudgetAllocation() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      allocationId,
      data,
    }: {
      allocationId: string;
      data: BudgetAllocationUpdate;
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

      const { data: allocation, error } = await supabase
        .from('budget_allocations')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
          updated_by: publicUser?.id_user,
        })
        .eq('id_budget_allocation', allocationId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update budget allocation: ${error.message}`);
      }

      return allocation as BudgetAllocation;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: invalidateScope.budgetAllocations(shopId),
        });
        queryClient.invalidateQueries({
          queryKey: invalidateScope.budgetSummary(shopId),
        });
      }
    },
  });
}

/**
 * Hook to fetch a single budget allocation by ID
 *
 * @param allocationId - The allocation ID to fetch
 * @param options - Query options
 * @returns Allocation data with category details
 *
 * @example
 * ```tsx
 * const { data: allocation, isLoading } = useBudgetAllocation('allocation-uuid');
 * ```
 */
export function useBudgetAllocation(allocationId: string, options: { enabled?: boolean } = {}) {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.budgetAllocation(shopId ?? '', allocationId),
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('budget_allocations')
        .select(
          `
          *,
          budget_category:budget_categories!fk_budget_allocations_category (*)
        `
        )
        .eq('id_shop', shopId!)
        .eq('id_budget_allocation', allocationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch budget allocation: ${error.message}`);
      }

      // Cast through unknown since TypeScript types don't include the relationship
      return data as unknown as BudgetAllocationWithCategory;
    },
    enabled: !!shopId && !!allocationId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to allocate budget to a category for a period.
 * This is an alias for useCreateBudgetAllocation with a more semantic name.
 *
 * @example
 * ```tsx
 * const allocateBudget = useAllocateBudget();
 *
 * const handleAllocate = async () => {
 *   await allocateBudget.mutateAsync({
 *     id_budget_category: 'category-uuid',
 *     period_start: '2024-01-01',
 *     period_end: '2024-01-31',
 *     allocated_amount: 5000
 *   });
 * };
 * ```
 */
export function useAllocateBudget() {
  return useCreateBudgetAllocation();
}

/**
 * Hook to adjust an existing budget allocation amount.
 * Creates an immutable transaction record and updates the allocation.
 *
 * @example
 * ```tsx
 * const adjustBudget = useAdjustBudget();
 *
 * const handleAdjust = async () => {
 *   await adjustBudget.mutateAsync({
 *     allocationId: 'allocation-uuid',
 *     adjustmentAmount: 1000,  // positive = increase, negative = decrease
 *     reason: 'Budget revision for Q1'
 *   });
 * };
 * ```
 */
export function useAdjustBudget() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      allocationId,
      adjustmentAmount,
      reason,
    }: {
      allocationId: string;
      adjustmentAmount: number;
      reason: string;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      if (adjustmentAmount === 0) {
        throw new Error('Adjustment amount cannot be zero');
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

      // Get current allocation
      const { data: allocation, error: fetchError } = await supabase
        .from('budget_allocations')
        .select('*')
        .eq('id_budget_allocation', allocationId)
        .eq('id_shop', shopId)
        .eq('status', 'active')
        .single();

      if (fetchError || !allocation) {
        throw new Error('Active budget allocation not found');
      }

      // Calculate new amounts
      const newAllocatedAmount = Number(allocation.allocated_amount) + adjustmentAmount;

      if (newAllocatedAmount < 0) {
        throw new Error('Adjustment would result in negative budget allocation');
      }

      const newRemainingAmount =
        newAllocatedAmount + Number(allocation.rollover_amount) - Number(allocation.used_amount);

      // Create budget transaction (immutable ledger)
      const { error: transactionError } = await supabase.from('budget_transactions').insert({
        id_shop: shopId,
        id_budget_allocation: allocationId,
        transaction_type: 'adjustment',
        amount: Math.abs(adjustmentAmount),
        description: `${adjustmentAmount > 0 ? 'Increase' : 'Decrease'}: ${reason}`,
        approval_status: 'auto_approved',
        created_by: publicUser.id_user,
      });

      if (transactionError) {
        throw new Error(`Failed to record adjustment transaction: ${transactionError.message}`);
      }

      // Update allocation
      const { data: updatedAllocation, error: updateError } = await supabase
        .from('budget_allocations')
        .update({
          allocated_amount: newAllocatedAmount,
          remaining_amount: newRemainingAmount,
          updated_at: new Date().toISOString(),
          updated_by: publicUser.id_user,
        })
        .eq('id_budget_allocation', allocationId)
        .eq('id_shop', shopId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update budget allocation: ${updateError.message}`);
      }

      return updatedAllocation as BudgetAllocation;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: invalidateScope.budgetAllocations(shopId),
        });
        queryClient.invalidateQueries({
          queryKey: invalidateScope.budgetTransactions(shopId),
        });
        queryClient.invalidateQueries({
          queryKey: invalidateScope.budgetSummary(shopId),
        });
      }
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Utility to invalidate budget caches
 */
export function useInvalidateBudgets() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all budget category queries for current shop */
    invalidateCategories: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: invalidateScope.budgetCategories(shopId),
        });
      }
      return undefined;
    },
    /** Invalidate a specific budget category */
    invalidateCategory: (categoryId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.budgetCategory(shopId, categoryId),
        });
      }
      return undefined;
    },
    /** Invalidate all budget allocation queries */
    invalidateAllocations: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: invalidateScope.budgetAllocations(shopId),
        });
      }
      return undefined;
    },
    /** Invalidate all budget transaction queries */
    invalidateTransactions: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: invalidateScope.budgetTransactions(shopId),
        });
      }
      return undefined;
    },
    /** Invalidate budget summary queries */
    invalidateSummary: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: invalidateScope.budgetSummary(shopId),
        });
      }
      return undefined;
    },
    /** Invalidate all budget-related queries */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: invalidateScope.budgets(shopId),
        });
      }
      return undefined;
    },
  };
}

/**
 * Local query key definitions for use in components
 */
export const budgetKeys = {
  categories: (shopId: string) => queryKeys.budgetCategories(shopId),
  category: (shopId: string, categoryId: string) => queryKeys.budgetCategory(shopId, categoryId),
  allocations: (shopId: string) => queryKeys.budgetAllocations(shopId),
  allocation: (shopId: string, allocationId: string) =>
    queryKeys.budgetAllocation(shopId, allocationId),
  transactions: (shopId: string) => queryKeys.budgetTransactions(shopId),
  summary: (shopId: string) => queryKeys.budgetSummary(shopId),
};
