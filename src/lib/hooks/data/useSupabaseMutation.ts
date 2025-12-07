/**
 * useSupabaseMutation Hook
 *
 * A TanStack Query v5 wrapper for Supabase mutation operations
 * (INSERT, UPDATE, UPSERT, DELETE). Provides optimistic updates,
 * automatic cache invalidation, and comprehensive error handling.
 *
 * @module lib/hooks/data/useSupabaseMutation
 */

'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/types/database';

// Extract table names from database schema
type TableName = keyof Database['public']['Tables'];

// Extract row types for a given table
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];
type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

/**
 * Supported mutation types
 */
export type MutationType = 'insert' | 'update' | 'upsert' | 'delete';

/**
 * Variables for INSERT mutations
 */
interface InsertVariables<T extends TableName> {
  data: TableInsert<T> | TableInsert<T>[];
}

/**
 * Variables for UPDATE mutations
 */
interface UpdateVariables<T extends TableName> {
  data: TableUpdate<T>;
  match: Partial<Record<keyof TableRow<T>, unknown>>;
}

/**
 * Variables for UPSERT mutations
 */
interface UpsertVariables<T extends TableName> {
  data: TableInsert<T> | TableInsert<T>[];
  onConflict?: string;
  ignoreDuplicates?: boolean;
}

/**
 * Variables for DELETE mutations
 */
interface DeleteVariables<T extends TableName> {
  match: Partial<Record<keyof TableRow<T>, unknown>>;
}

/**
 * Union type for all mutation variables based on mutation type
 */
export type MutationVariables<
  T extends TableName,
  TType extends MutationType,
> = TType extends 'insert'
  ? InsertVariables<T>
  : TType extends 'update'
    ? UpdateVariables<T>
    : TType extends 'upsert'
      ? UpsertVariables<T>
      : TType extends 'delete'
        ? DeleteVariables<T>
        : never;

/**
 * Options for configuring the Supabase mutation
 */
export interface UseSupabaseMutationOptions<
  TTable extends TableName,
  TType extends MutationType,
  TData = TableRow<TTable>,
> {
  /** The database table to mutate */
  table: TTable;

  /** The type of mutation to perform */
  type: TType;

  /**
   * Query keys to invalidate after successful mutation.
   * Each element is a query key array.
   */
  invalidateKeys?: readonly (readonly unknown[])[];

  /**
   * Whether to return the mutated data.
   * For INSERT/UPDATE/UPSERT, returns the affected rows.
   * Default: true
   */
  returnData?: boolean;

  /**
   * Columns to select when returning data.
   * Default: '*'
   */
  select?: string;

  /**
   * Called when mutation starts (before mutationFn).
   * Return value is passed to onError and onSettled for rollback.
   */
  onMutate?: (variables: MutationVariables<TTable, TType>) => Promise<unknown> | unknown;

  /** Called on successful mutation */
  onSuccess?: (
    data: TData | TData[] | null,
    variables: MutationVariables<TTable, TType>,
    context: unknown
  ) => Promise<void> | void;

  /** Called on mutation error */
  onError?: (
    error: Error,
    variables: MutationVariables<TTable, TType>,
    context: unknown
  ) => Promise<void> | void;

  /** Called when mutation settles (success or error) */
  onSettled?: (
    data: TData | TData[] | null | undefined,
    error: Error | null,
    variables: MutationVariables<TTable, TType>,
    context: unknown
  ) => Promise<void> | void;
}

/**
 * A TanStack Query wrapper for Supabase mutation operations.
 *
 * Features:
 * - Fully typed based on database schema
 * - Supports INSERT, UPDATE, UPSERT, DELETE
 * - Automatic cache invalidation
 * - Optimistic update support via onMutate
 * - Comprehensive error handling
 *
 * @example
 * // INSERT mutation
 * const createCustomer = useSupabaseMutation({
 *   table: 'customers',
 *   type: 'insert',
 *   invalidateKeys: [['customers', shopId]],
 *   onSuccess: (data) => {
 *     toast.success('Customer created!');
 *   }
 * });
 *
 * // Usage:
 * createCustomer.mutate({
 *   data: {
 *     id_shop: shopId,
 *     full_name: 'John Doe',
 *     email: 'john@example.com',
 *     created_by: userId
 *   }
 * });
 *
 * @example
 * // UPDATE mutation
 * const updateCustomer = useSupabaseMutation({
 *   table: 'customers',
 *   type: 'update',
 *   invalidateKeys: [['customers'], ['customer', customerId]]
 * });
 *
 * // Usage:
 * updateCustomer.mutate({
 *   match: { id_customer: customerId },
 *   data: { full_name: 'Jane Doe', updated_by: userId }
 * });
 *
 * @example
 * // DELETE mutation
 * const deleteCustomer = useSupabaseMutation({
 *   table: 'customers',
 *   type: 'delete',
 *   invalidateKeys: [['customers', shopId]]
 * });
 *
 * // Usage:
 * deleteCustomer.mutate({
 *   match: { id_customer: customerId }
 * });
 *
 * @example
 * // With optimistic updates
 * const updateCustomer = useSupabaseMutation({
 *   table: 'customers',
 *   type: 'update',
 *   invalidateKeys: [['customers', shopId]],
 *   onMutate: async (variables) => {
 *     // Cancel outgoing refetches
 *     await queryClient.cancelQueries({ queryKey: ['customers', shopId] });
 *
 *     // Snapshot previous value
 *     const previousCustomers = queryClient.getQueryData(['customers', shopId]);
 *
 *     // Optimistically update cache
 *     queryClient.setQueryData(['customers', shopId], (old) =>
 *       old?.map(c => c.id_customer === variables.match.id_customer
 *         ? { ...c, ...variables.data }
 *         : c
 *       )
 *     );
 *
 *     // Return snapshot for rollback
 *     return { previousCustomers };
 *   },
 *   onError: (error, variables, context) => {
 *     // Rollback on error
 *     queryClient.setQueryData(
 *       ['customers', shopId],
 *       context.previousCustomers
 *     );
 *   }
 * });
 */
export function useSupabaseMutation<
  TTable extends TableName,
  TType extends MutationType,
  TData = TableRow<TTable>,
>(
  options: UseSupabaseMutationOptions<TTable, TType, TData>,
  mutationOptions?: Omit<
    UseMutationOptions<TData | TData[] | null, Error, MutationVariables<TTable, TType>, unknown>,
    'mutationFn' | 'onMutate' | 'onSuccess' | 'onError' | 'onSettled'
  >
) {
  const queryClient = useQueryClient();

  const {
    table,
    type,
    invalidateKeys,
    returnData = true,
    select = '*',
    onMutate,
    onSuccess,
    onError,
    onSettled,
  } = options;

  return useMutation<TData | TData[] | null, Error, MutationVariables<TTable, TType>, unknown>({
    mutationFn: async (variables) => {
      const supabase = createClient();

      // Use any type for query building to work around Supabase's strict generic typing
      // The runtime behavior is correct, TypeScript just can't infer the types properly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tableQuery = supabase.from(table) as any;

      switch (type) {
        case 'insert': {
          const insertVars = variables as InsertVariables<TTable>;
          const insertData = insertVars.data;

          const query = returnData
            ? tableQuery.insert(insertData).select(select)
            : tableQuery.insert(insertData);

          const { data, error } = await query;

          if (error) {
            throw new Error(error.message);
          }

          return (returnData ? data : null) as TData | TData[] | null;
        }

        case 'update': {
          const updateVars = variables as UpdateVariables<TTable>;
          const updateData = updateVars.data;

          let query = tableQuery.update(updateData);

          // Apply match filters
          for (const [column, value] of Object.entries(updateVars.match)) {
            if (value !== undefined) {
              query = query.eq(column, value);
            }
          }

          const finalQuery = returnData ? query.select(select) : query;
          const { data, error } = await finalQuery;

          if (error) {
            throw new Error(error.message);
          }

          return (returnData ? data : null) as TData | TData[] | null;
        }

        case 'upsert': {
          const upsertVars = variables as UpsertVariables<TTable>;
          const upsertData = upsertVars.data;

          const query = returnData
            ? tableQuery
                .upsert(upsertData, {
                  onConflict: upsertVars.onConflict,
                  ignoreDuplicates: upsertVars.ignoreDuplicates,
                })
                .select(select)
            : tableQuery.upsert(upsertData, {
                onConflict: upsertVars.onConflict,
                ignoreDuplicates: upsertVars.ignoreDuplicates,
              });

          const { data, error } = await query;

          if (error) {
            throw new Error(error.message);
          }

          return (returnData ? data : null) as TData | TData[] | null;
        }

        case 'delete': {
          const deleteVars = variables as DeleteVariables<TTable>;

          let query = tableQuery.delete();

          // Apply match filters
          for (const [column, value] of Object.entries(deleteVars.match)) {
            if (value !== undefined) {
              query = query.eq(column, value);
            }
          }

          const finalQuery = returnData ? query.select(select) : query;
          const { data, error } = await finalQuery;

          if (error) {
            throw new Error(error.message);
          }

          return (returnData ? data : null) as TData | TData[] | null;
        }

        default:
          throw new Error(`Unsupported mutation type: ${type}`);
      }
    },

    onMutate: async (variables) => {
      if (onMutate) {
        return onMutate(variables);
      }
      return undefined;
    },

    onSuccess: async (data, variables, context) => {
      // Invalidate specified query keys
      if (invalidateKeys && invalidateKeys.length > 0) {
        await Promise.all(
          invalidateKeys.map((key) => queryClient.invalidateQueries({ queryKey: key as unknown[] }))
        );
      }

      // Call user-provided onSuccess
      if (onSuccess) {
        await onSuccess(data, variables, context);
      }
    },

    onError: async (error, variables, context) => {
      if (onError) {
        await onError(error, variables, context);
      }
    },

    onSettled: async (data, error, variables, context) => {
      if (onSettled) {
        await onSettled(data, error, variables, context);
      }
    },

    ...mutationOptions,
  });
}

/**
 * Type helper to extract the return type of useSupabaseMutation
 */
export type UseSupabaseMutationResult<
  TTable extends TableName,
  TType extends MutationType,
> = ReturnType<typeof useSupabaseMutation<TTable, TType>>;

/**
 * Convenience type for insert mutation variables
 */
export type InsertMutationVariables<T extends TableName> = InsertVariables<T>;

/**
 * Convenience type for update mutation variables
 */
export type UpdateMutationVariables<T extends TableName> = UpdateVariables<T>;

/**
 * Convenience type for upsert mutation variables
 */
export type UpsertMutationVariables<T extends TableName> = UpsertVariables<T>;

/**
 * Convenience type for delete mutation variables
 */
export type DeleteMutationVariables<T extends TableName> = DeleteVariables<T>;
