/**
 * usePaymentReminders Hook
 *
 * TanStack Query hook for fetching and managing payment reminders.
 * Supports pagination, search, filtering by status/date/entity, and sorting.
 *
 * @module lib/hooks/data/usePaymentReminders
 */

'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { queryKeys, invalidateScope } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';
import type { ReminderStatus } from '@/lib/utils/schemas/paymentReminder';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Payment reminder row type
 * Matches actual database schema for payment_reminders table
 */
export interface PaymentReminder {
  id_reminder: string;
  id_shop: string;
  id_supplier: string;
  id_purchase: string | null;
  id_payment: string | null;
  reminder_type: string;
  due_date: string;
  amount: number;
  status: string | null;
  reminder_count: number;
  last_reminded_at: string | null;
  next_reminder_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Payment reminder with supplier details
 */
export interface PaymentReminderWithSupplier extends PaymentReminder {
  supplier?: ReminderSupplier | null;
}

/**
 * Supplier type for payment reminders (minimal fields needed for display)
 */
export interface ReminderSupplier {
  id_supplier: string;
  company_name: string;
  contact_person: string | null;
}

/**
 * Payment reminder insert type
 */
export interface PaymentReminderInsert {
  id_shop?: string;
  id_supplier: string;
  id_purchase?: string | null;
  id_payment?: string | null;
  reminder_type: string;
  due_date: string;
  amount: number;
  status?: ReminderStatus;
  reminder_count?: number;
  last_reminded_at?: string | null;
  next_reminder_date?: string | null;
  notes?: string | null;
}

/**
 * Payment reminder update type
 */
export interface PaymentReminderUpdate {
  id_supplier?: string;
  id_purchase?: string | null;
  id_payment?: string | null;
  reminder_type?: string;
  due_date?: string;
  amount?: number;
  status?: ReminderStatus;
  reminder_count?: number;
  last_reminded_at?: string | null;
  next_reminder_date?: string | null;
  notes?: string | null;
}

/**
 * Options for filtering and paginating payment reminder queries
 */
export interface UsePaymentRemindersOptions {
  /** Filter by supplier ID */
  supplierId?: string;
  /** Filter by purchase ID */
  purchaseId?: string;
  /** Filter by reminder type */
  reminderType?: string;
  /** Filter by status */
  status?: ReminderStatus;
  /** Filter by due date from */
  dueDateFrom?: string;
  /** Filter by due date to */
  dueDateTo?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: 'due_date' | 'amount' | 'status' | 'created_at' | 'reminder_type';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for the usePaymentReminders hook
 */
export interface UsePaymentRemindersReturn {
  /** Array of payment reminders with supplier details */
  reminders: PaymentReminderWithSupplier[];
  /** Total count of matching reminders */
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
 * Options for upcoming reminders query
 */
export interface UseUpcomingRemindersOptions {
  /** Number of days ahead to look (default: 7) */
  daysAhead?: number;
  /** Maximum number of reminders to return (default: 10) */
  limit?: number;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Options for overdue reminders query
 */
export interface UseOverdueRemindersOptions {
  /** Maximum number of reminders to return (default: 10) */
  limit?: number;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for upcoming/overdue reminders
 */
export interface UseRemindersWidgetReturn {
  /** Array of reminders with supplier details */
  reminders: PaymentReminderWithSupplier[];
  /** Total count */
  totalCount: number;
  /** Total amount due */
  totalAmount: number;
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
 * Fetches payment reminders with pagination and filtering
 * Includes supplier data for all reminders
 */
async function fetchPaymentReminders(
  shopId: string,
  options: UsePaymentRemindersOptions
): Promise<{ reminders: PaymentReminderWithSupplier[]; totalCount: number }> {
  const {
    supplierId,
    purchaseId,
    reminderType,
    status,
    dueDateFrom,
    dueDateTo,
    page = 1,
    pageSize = 20,
    sortBy = 'due_date',
    sortDirection = 'asc',
  } = options;

  const supabase = createClient();

  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;

  // Build the base query
  let query = supabase
    .from('payment_reminders')
    .select('*', { count: 'exact' })
    .eq('id_shop', shopId)
    .is('deleted_at', null);

  // Apply supplier filter
  if (supplierId) {
    query = query.eq('id_supplier', supplierId);
  }

  // Apply purchase filter
  if (purchaseId) {
    query = query.eq('id_purchase', purchaseId);
  }

  // Apply reminder type filter
  if (reminderType) {
    query = query.eq('reminder_type', reminderType);
  }

  // Apply status filter
  if (status) {
    query = query.eq('status', status);
  }

  // Apply date range filter
  if (dueDateFrom) {
    query = query.gte('due_date', dueDateFrom);
  }
  if (dueDateTo) {
    query = query.lte('due_date', dueDateTo);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortDirection === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch payment reminders: ${error.message}`);
  }

  const reminders = (data ?? []) as PaymentReminder[];

  // Fetch supplier data for all reminders
  const supplierIds = [...new Set(reminders.map((r) => r.id_supplier))];

  let supplierMap: Map<string, ReminderSupplier> = new Map();
  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id_supplier, company_name, contact_person')
      .in('id_supplier', supplierIds);

    if (suppliers) {
      supplierMap = new Map(suppliers.map((s) => [s.id_supplier, s as ReminderSupplier]));
    }
  }

  // Attach supplier data to reminders
  const remindersWithSupplier: PaymentReminderWithSupplier[] = reminders.map((r) => ({
    ...r,
    supplier: supplierMap.get(r.id_supplier) || null,
  }));

  return {
    reminders: remindersWithSupplier,
    totalCount: count ?? 0,
  };
}

/**
 * Fetches a single payment reminder by ID
 */
async function fetchPaymentReminder(
  shopId: string,
  reminderId: string
): Promise<PaymentReminder | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('payment_reminders')
    .select('*')
    .eq('id_shop', shopId)
    .eq('id_reminder', reminderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch payment reminder: ${error.message}`);
  }

  return data as PaymentReminder;
}

/**
 * Fetches upcoming payment reminders (due within X days)
 * Includes supplier data for all reminders
 */
async function fetchUpcomingReminders(
  shopId: string,
  daysAhead: number,
  limit: number
): Promise<{ reminders: PaymentReminderWithSupplier[]; totalCount: number; totalAmount: number }> {
  const supabase = createClient();

  // Calculate date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const todayStr = today.toISOString().split('T')[0];
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const { data, error, count } = await supabase
    .from('payment_reminders')
    .select('*', { count: 'exact' })
    .eq('id_shop', shopId)
    .is('deleted_at', null)
    .neq('status', 'completed')
    .gte('due_date', todayStr)
    .lte('due_date', futureDateStr)
    .order('due_date', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch upcoming reminders: ${error.message}`);
  }

  const reminders = (data ?? []) as PaymentReminder[];

  // Fetch supplier data for all reminders
  const supplierIds = [...new Set(reminders.map((r) => r.id_supplier))];

  let supplierMap: Map<string, ReminderSupplier> = new Map();
  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id_supplier, company_name, contact_person')
      .in('id_supplier', supplierIds);

    if (suppliers) {
      supplierMap = new Map(suppliers.map((s) => [s.id_supplier, s as ReminderSupplier]));
    }
  }

  // Attach supplier data to reminders
  const remindersWithSupplier: PaymentReminderWithSupplier[] = reminders.map((r) => ({
    ...r,
    supplier: supplierMap.get(r.id_supplier) || null,
  }));

  const totalAmount = remindersWithSupplier.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return {
    reminders: remindersWithSupplier,
    totalCount: count ?? 0,
    totalAmount,
  };
}

/**
 * Fetches overdue payment reminders (past due date)
 * Includes supplier data for all reminders
 */
async function fetchOverdueReminders(
  shopId: string,
  limit: number
): Promise<{ reminders: PaymentReminderWithSupplier[]; totalCount: number; totalAmount: number }> {
  const supabase = createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const { data, error, count } = await supabase
    .from('payment_reminders')
    .select('*', { count: 'exact' })
    .eq('id_shop', shopId)
    .is('deleted_at', null)
    .neq('status', 'completed')
    .lt('due_date', todayStr)
    .order('due_date', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch overdue reminders: ${error.message}`);
  }

  const reminders = (data ?? []) as PaymentReminder[];

  // Fetch supplier data for all reminders
  const supplierIds = [...new Set(reminders.map((r) => r.id_supplier))];

  let supplierMap: Map<string, ReminderSupplier> = new Map();
  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id_supplier, company_name, contact_person')
      .in('id_supplier', supplierIds);

    if (suppliers) {
      supplierMap = new Map(suppliers.map((s) => [s.id_supplier, s as ReminderSupplier]));
    }
  }

  // Attach supplier data to reminders
  const remindersWithSupplier: PaymentReminderWithSupplier[] = reminders.map((r) => ({
    ...r,
    supplier: supplierMap.get(r.id_supplier) || null,
  }));

  const totalAmount = remindersWithSupplier.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return {
    reminders: remindersWithSupplier,
    totalCount: count ?? 0,
    totalAmount,
  };
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to fetch paginated payment reminder list with filtering.
 *
 * Features:
 * - Automatic shop scoping via useShop
 * - Filter by supplier, status, type, and date range
 * - Pagination with page navigation
 * - Sorting by various fields
 *
 * @param options - Query options for filtering and pagination
 * @returns Paginated reminder list with metadata
 *
 * @example
 * ```tsx
 * function RemindersList() {
 *   const [page, setPage] = useState(1);
 *
 *   const {
 *     reminders,
 *     totalCount,
 *     totalPages,
 *     isLoading,
 *     error
 *   } = usePaymentReminders({
 *     page,
 *     pageSize: 20,
 *     status: 'pending',
 *     sortBy: 'due_date',
 *     sortDirection: 'asc'
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       <ReminderTable reminders={reminders} />
 *       <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
 *     </div>
 *   );
 * }
 * ```
 */
export function usePaymentReminders(
  options: UsePaymentRemindersOptions = {}
): UsePaymentRemindersReturn {
  const { shopId, hasAccess } = useShop();
  const {
    supplierId,
    purchaseId,
    reminderType,
    status,
    dueDateFrom,
    dueDateTo,
    page = 1,
    pageSize = 20,
    sortBy = 'due_date',
    sortDirection = 'asc',
    enabled = true,
  } = options;

  const queryResult = useQuery({
    queryKey: [
      ...queryKeys.paymentReminders(shopId ?? ''),
      {
        supplierId,
        purchaseId,
        reminderType,
        status,
        dueDateFrom,
        dueDateTo,
        page,
        pageSize,
        sortBy,
        sortDirection,
      },
    ],
    queryFn: () =>
      fetchPaymentReminders(shopId!, {
        supplierId,
        purchaseId,
        reminderType,
        status,
        dueDateFrom,
        dueDateTo,
        page,
        pageSize,
        sortBy,
        sortDirection,
      }),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  const reminders = data?.reminders ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    reminders,
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
 * Hook to fetch a single payment reminder by ID
 *
 * @param reminderId - The reminder ID to fetch
 * @param options - Query options
 * @returns Reminder data with supplier
 *
 * @example
 * ```tsx
 * const { data: reminder, isLoading, error } = usePaymentReminder('reminder-uuid');
 * ```
 */
export function usePaymentReminder(reminderId: string, options: { enabled?: boolean } = {}) {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.paymentReminder(shopId ?? '', reminderId),
    queryFn: () => fetchPaymentReminder(shopId!, reminderId),
    enabled: !!shopId && !!reminderId && hasAccess && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch upcoming payment reminders due within X days.
 * Ideal for dashboard widgets.
 *
 * @param options - Query options
 * @returns Upcoming reminders with total amount
 *
 * @example
 * ```tsx
 * const { reminders, totalAmount, isLoading } = useUpcomingReminders({ daysAhead: 7 });
 * ```
 */
export function useUpcomingReminders(
  options: UseUpcomingRemindersOptions = {}
): UseRemindersWidgetReturn {
  const { shopId, hasAccess } = useShop();
  const { daysAhead = 7, limit = 10, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: queryKeys.upcomingReminders(shopId ?? '', daysAhead),
    queryFn: () => fetchUpcomingReminders(shopId!, daysAhead, limit),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 60 * 1000, // 1 minute - dashboard data can be slightly stale
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, error, refetch } = queryResult;

  return {
    reminders: data?.reminders ?? [],
    totalCount: data?.totalCount ?? 0,
    totalAmount: data?.totalAmount ?? 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to fetch overdue payment reminders (past due date).
 * Ideal for dashboard widgets and alerts.
 *
 * @param options - Query options
 * @returns Overdue reminders with total amount
 *
 * @example
 * ```tsx
 * const { reminders, totalCount, totalAmount, isLoading } = useOverdueReminders({ limit: 5 });
 * ```
 */
export function useOverdueReminders(
  options: UseOverdueRemindersOptions = {}
): UseRemindersWidgetReturn {
  const { shopId, hasAccess } = useShop();
  const { limit = 10, enabled = true } = options;

  const queryResult = useQuery({
    queryKey: queryKeys.overdueReminders(shopId ?? ''),
    queryFn: () => fetchOverdueReminders(shopId!, limit),
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, error, refetch } = queryResult;

  return {
    reminders: data?.reminders ?? [],
    totalCount: data?.totalCount ?? 0,
    totalAmount: data?.totalAmount ?? 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Hook to create a new payment reminder
 *
 * @example
 * ```tsx
 * const createReminder = useCreatePaymentReminder();
 *
 * const handleCreate = async (data: PaymentReminderInsert) => {
 *   try {
 *     const newReminder = await createReminder.mutateAsync(data);
 *     toast.success('Reminder created!');
 *   } catch (error) {
 *     toast.error('Failed to create reminder');
 *   }
 * };
 * ```
 */
export function useCreatePaymentReminder() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<PaymentReminderInsert, 'id_shop'>) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: reminder, error } = await supabase
        .from('payment_reminders')
        .insert({
          ...data,
          id_shop: shopId,
          status: data.status || 'pending',
          reminder_count: data.reminder_count ?? 0,
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to create payment reminder: ${error.message}`);
      }

      return reminder as PaymentReminder;
    },
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.paymentReminders(shopId) });
      }
    },
  });
}

/**
 * Hook to update an existing payment reminder
 *
 * @example
 * ```tsx
 * const updateReminder = useUpdatePaymentReminder();
 *
 * const handleUpdate = async (reminderId: string, data: PaymentReminderUpdate) => {
 *   try {
 *     await updateReminder.mutateAsync({ reminderId, data });
 *     toast.success('Reminder updated!');
 *   } catch (error) {
 *     toast.error('Failed to update reminder');
 *   }
 * };
 * ```
 */
export function useUpdatePaymentReminder() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reminderId,
      data,
    }: {
      reminderId: string;
      data: PaymentReminderUpdate;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data: reminder, error } = await supabase
        .from('payment_reminders')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id_reminder', reminderId)
        .eq('id_shop', shopId)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to update payment reminder: ${error.message}`);
      }

      return reminder as PaymentReminder;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.paymentReminders(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.paymentReminder(shopId, variables.reminderId),
        });
      }
    },
  });
}

/**
 * Hook to soft-delete a payment reminder
 *
 * @example
 * ```tsx
 * const deleteReminder = useDeletePaymentReminder();
 *
 * const handleDelete = async (reminderId: string) => {
 *   try {
 *     await deleteReminder.mutateAsync(reminderId);
 *     toast.success('Reminder deleted!');
 *   } catch (error) {
 *     toast.error('Failed to delete reminder');
 *   }
 * };
 * ```
 */
export function useDeletePaymentReminder() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Hard delete the reminder (no soft delete in this table)
      const { error } = await supabase
        .from('payment_reminders')
        .delete()
        .eq('id_reminder', reminderId)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to delete payment reminder: ${error.message}`);
      }

      return { reminderId };
    },
    onSuccess: (_, reminderId) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.paymentReminders(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.paymentReminder(shopId, reminderId),
        });
      }
    },
  });
}

/**
 * Hook to mark a payment reminder as completed
 *
 * @example
 * ```tsx
 * const markComplete = useMarkReminderComplete();
 *
 * const handleComplete = async (reminderId: string, notes?: string) => {
 *   try {
 *     await markComplete.mutateAsync({ reminderId, completionNotes: notes });
 *     toast.success('Reminder marked as completed!');
 *   } catch (error) {
 *     toast.error('Failed to complete reminder');
 *   }
 * };
 * ```
 */
export function useMarkReminderComplete() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reminderId,
      completionNotes,
    }: {
      reminderId: string;
      completionNotes?: string;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get existing reminder to append notes
      const { data: existing } = await supabase
        .from('payment_reminders')
        .select('notes, status')
        .eq('id_reminder', reminderId)
        .eq('id_shop', shopId)
        .single();

      if (existing?.status === 'completed') {
        throw new Error('Reminder is already completed');
      }

      // Build updated notes
      let updatedNotes = existing?.notes || '';
      if (completionNotes) {
        const timestamp = new Date().toISOString().split('T')[0];
        updatedNotes = updatedNotes
          ? `${updatedNotes}\n\n[${timestamp}] Completed: ${completionNotes}`
          : `[${timestamp}] Completed: ${completionNotes}`;
      }

      const { data: reminder, error } = await supabase
        .from('payment_reminders')
        .update({
          status: 'completed',
          notes: updatedNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id_reminder', reminderId)
        .eq('id_shop', shopId)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to mark reminder as completed: ${error.message}`);
      }

      return reminder as PaymentReminder;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.paymentReminders(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.paymentReminder(shopId, variables.reminderId),
        });
      }
    },
  });
}

/**
 * Hook to snooze a payment reminder (push due date forward)
 *
 * @example
 * ```tsx
 * const snoozeReminder = useSnoozeReminder();
 *
 * const handleSnooze = async (reminderId: string, days: number = 7) => {
 *   try {
 *     await snoozeReminder.mutateAsync({
 *       reminderId,
 *       snoozeDays: days,
 *       snoozeReason: 'Supplier requested extension'
 *     });
 *     toast.success(`Reminder snoozed for ${days} days`);
 *   } catch (error) {
 *     toast.error('Failed to snooze reminder');
 *   }
 * };
 * ```
 */
export function useSnoozeReminder() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reminderId,
      snoozeDays,
      snoozeReason,
    }: {
      reminderId: string;
      snoozeDays: number;
      snoozeReason?: string;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Get existing reminder to calculate new due date
      const { data: existing } = await supabase
        .from('payment_reminders')
        .select('due_date, notes, status, reminder_count')
        .eq('id_reminder', reminderId)
        .eq('id_shop', shopId)
        .single();

      if (!existing) {
        throw new Error('Reminder not found');
      }

      if (existing.status === 'completed') {
        throw new Error('Cannot snooze a completed reminder');
      }

      // Calculate new due date
      const currentDue = new Date(existing.due_date);
      currentDue.setDate(currentDue.getDate() + snoozeDays);
      const newDueDate = currentDue.toISOString().split('T')[0];

      // Build updated notes
      let updatedNotes = existing.notes || '';
      if (snoozeReason) {
        const timestamp = new Date().toISOString().split('T')[0];
        updatedNotes = updatedNotes
          ? `${updatedNotes}\n\n[${timestamp}] Snoozed ${snoozeDays} days: ${snoozeReason}`
          : `[${timestamp}] Snoozed ${snoozeDays} days: ${snoozeReason}`;
      }

      const { data: reminder, error } = await supabase
        .from('payment_reminders')
        .update({
          status: 'snoozed',
          due_date: newDueDate,
          next_reminder_date: newDueDate,
          notes: updatedNotes.trim() || null,
          reminder_count: (existing.reminder_count || 0) + 1,
          last_reminded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id_reminder', reminderId)
        .eq('id_shop', shopId)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to snooze reminder: ${error.message}`);
      }

      return reminder as PaymentReminder;
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: invalidateScope.paymentReminders(shopId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.paymentReminder(shopId, variables.reminderId),
        });
      }
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Utility to invalidate payment reminder caches
 */
export function useInvalidatePaymentReminders() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all payment reminder queries for current shop */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: invalidateScope.paymentReminders(shopId),
        });
      }
      return undefined;
    },
    /** Invalidate a specific reminder */
    invalidateOne: (reminderId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.paymentReminder(shopId, reminderId),
        });
      }
      return undefined;
    },
    /** Invalidate upcoming reminders */
    invalidateUpcoming: (daysAhead: number = 7): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.upcomingReminders(shopId, daysAhead),
        });
      }
      return undefined;
    },
    /** Invalidate overdue reminders */
    invalidateOverdue: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.overdueReminders(shopId),
        });
      }
      return undefined;
    },
  };
}

/**
 * Local query key definitions for use in components
 */
export const paymentReminderKeys = {
  all: (shopId: string) => queryKeys.paymentReminders(shopId),
  one: (shopId: string, reminderId: string) => queryKeys.paymentReminder(shopId, reminderId),
  upcoming: (shopId: string, daysAhead: number) => queryKeys.upcomingReminders(shopId, daysAhead),
  overdue: (shopId: string) => queryKeys.overdueReminders(shopId),
};
