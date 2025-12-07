/**
 * useSupabaseQuery Hook
 *
 * A TanStack Query v5 wrapper for Supabase SELECT operations.
 * Provides typed, cached data fetching with automatic refetching,
 * loading states, and error handling.
 *
 * @module lib/hooks/data/useSupabaseQuery
 */

'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/types/database';

// Extract table names from database schema
type TableName = keyof Database['public']['Tables'];

// Extract row type for a given table
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

/**
 * Filter operators supported by Supabase PostgREST
 */
type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'is'
  | 'in'
  | 'contains'
  | 'containedBy'
  | 'overlaps';

/**
 * Filter configuration for query building
 */
interface FilterConfig {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Order configuration for sorting results
 */
interface OrderConfig {
  column: string;
  ascending?: boolean;
  nullsFirst?: boolean;
}

/**
 * Options for configuring the Supabase query
 */
export interface UseSupabaseQueryOptions<
  TTable extends TableName,
  TSelect extends string = '*',
  TData = TSelect extends '*' ? TableRow<TTable>[] : unknown[],
> {
  /** The database table to query */
  table: TTable;

  /** Columns to select (default: '*') */
  select?: TSelect;

  /**
   * Simple equality filters as key-value pairs
   * For more complex filters, use the `filters` array
   */
  match?: Partial<Record<keyof TableRow<TTable>, unknown>>;

  /**
   * Advanced filters with operators
   * Supports: eq, neq, gt, gte, lt, lte, like, ilike, is, in, contains, containedBy, overlaps
   */
  filters?: FilterConfig[];

  /** Order configuration for sorting results */
  order?: OrderConfig | OrderConfig[];

  /** Maximum number of rows to return */
  limit?: number;

  /** Number of rows to skip (for pagination) */
  offset?: number;

  /** Return a single row instead of an array */
  single?: boolean;

  /** Return at most one row (errors if more than one found) */
  maybeSingle?: boolean;

  /** Whether the query is enabled (default: true) */
  enabled?: boolean;

  /** Transform the result data */
  transform?: (data: TSelect extends '*' ? TableRow<TTable>[] : unknown[]) => TData;
}

/**
 * Applies filters to a Supabase query builder
 */
function applyFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: FilterConfig[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  let filteredQuery = query;

  for (const filter of filters) {
    const { column, operator, value } = filter;

    switch (operator) {
      case 'eq':
        filteredQuery = filteredQuery.eq(column, value);
        break;
      case 'neq':
        filteredQuery = filteredQuery.neq(column, value);
        break;
      case 'gt':
        filteredQuery = filteredQuery.gt(column, value);
        break;
      case 'gte':
        filteredQuery = filteredQuery.gte(column, value);
        break;
      case 'lt':
        filteredQuery = filteredQuery.lt(column, value);
        break;
      case 'lte':
        filteredQuery = filteredQuery.lte(column, value);
        break;
      case 'like':
        filteredQuery = filteredQuery.like(column, value as string);
        break;
      case 'ilike':
        filteredQuery = filteredQuery.ilike(column, value as string);
        break;
      case 'is':
        filteredQuery = filteredQuery.is(column, value as boolean | null);
        break;
      case 'in':
        filteredQuery = filteredQuery.in(column, value as unknown[]);
        break;
      case 'contains':
        filteredQuery = filteredQuery.contains(column, value as unknown[]);
        break;
      case 'containedBy':
        filteredQuery = filteredQuery.containedBy(column, value as unknown[]);
        break;
      case 'overlaps':
        filteredQuery = filteredQuery.overlaps(column, value as unknown[]);
        break;
    }
  }

  return filteredQuery;
}

/**
 * A TanStack Query wrapper for Supabase SELECT operations.
 *
 * Features:
 * - Fully typed based on database schema
 * - Supports filtering, ordering, pagination
 * - Automatic caching and refetching
 * - Loading and error states
 *
 * @example
 * // Basic usage - fetch all customers
 * const { data, isLoading, error } = useSupabaseQuery(
 *   ['customers', shopId],
 *   { table: 'customers', match: { id_shop: shopId } }
 * );
 *
 * @example
 * // With ordering and limit
 * const { data } = useSupabaseQuery(
 *   ['recent-sales', shopId],
 *   {
 *     table: 'sales',
 *     match: { id_shop: shopId },
 *     order: { column: 'created_at', ascending: false },
 *     limit: 10
 *   }
 * );
 *
 * @example
 * // With advanced filters
 * const { data } = useSupabaseQuery(
 *   ['active-customers', shopId],
 *   {
 *     table: 'customers',
 *     filters: [
 *       { column: 'id_shop', operator: 'eq', value: shopId },
 *       { column: 'current_balance', operator: 'gt', value: 0 },
 *       { column: 'deleted_at', operator: 'is', value: null }
 *     ]
 *   }
 * );
 *
 * @example
 * // Fetch single record
 * const { data: customer } = useSupabaseQuery(
 *   ['customer', customerId],
 *   {
 *     table: 'customers',
 *     match: { id_customer: customerId },
 *     single: true
 *   }
 * );
 */
export function useSupabaseQuery<
  TTable extends TableName,
  TSelect extends string = '*',
  TData = TSelect extends '*' ? TableRow<TTable>[] : unknown[],
>(
  queryKey: readonly unknown[],
  options: UseSupabaseQueryOptions<TTable, TSelect, TData>,
  queryOptions?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const {
    table,
    select = '*',
    match,
    filters,
    order,
    limit,
    offset,
    single = false,
    maybeSingle = false,
    enabled = true,
    transform,
  } = options;

  return useQuery<TData, Error>({
    queryKey,
    queryFn: async () => {
      const supabase = createClient();

      // Start building the query
      // Use any type to work around Supabase's strict generic typing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = supabase.from(table).select(select) as any;

      // Apply simple equality matches
      if (match) {
        for (const [column, value] of Object.entries(match)) {
          if (value !== undefined) {
            query = query.eq(column, value);
          }
        }
      }

      // Apply advanced filters
      if (filters && filters.length > 0) {
        query = applyFilters(query, filters);
      }

      // Apply ordering
      if (order) {
        const orders = Array.isArray(order) ? order : [order];
        for (const orderConfig of orders) {
          query = query.order(orderConfig.column, {
            ascending: orderConfig.ascending ?? true,
            nullsFirst: orderConfig.nullsFirst,
          });
        }
      }

      // Apply limit
      if (limit !== undefined) {
        query = query.limit(limit);
      }

      // Apply offset (range)
      if (offset !== undefined) {
        const rangeEnd = limit !== undefined ? offset + limit - 1 : offset + 999;
        query = query.range(offset, rangeEnd);
      }

      // Execute query
      let result;

      if (single) {
        result = await query.single();
      } else if (maybeSingle) {
        result = await query.maybeSingle();
      } else {
        result = await query;
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      const data = result.data as TSelect extends '*' ? TableRow<TTable>[] : unknown[];

      // Apply transform if provided
      if (transform) {
        return transform(data);
      }

      return data as TData;
    },
    enabled,
    ...queryOptions,
  });
}

/**
 * Type helper to extract the return type of useSupabaseQuery
 */
export type UseSupabaseQueryResult<
  TTable extends TableName,
  TSelect extends string = '*',
> = ReturnType<typeof useSupabaseQuery<TTable, TSelect>>;
