/**
 * useOptimisticUpdate Hook
 *
 * Provides optimistic update functionality with version-based conflict detection
 * for handling concurrent updates in a multi-user environment.
 *
 * Features:
 * - Optimistic UI updates for instant feedback
 * - Version checking to detect concurrent modifications
 * - Automatic rollback on conflict or error
 * - Conflict notification with refresh action
 * - Integration with TanStack Query v5
 *
 * The Aymur database uses a `version` column (integer) on tables that support
 * optimistic locking. This column is auto-incremented via the `bump_version_trigger`.
 *
 * @module lib/hooks/data/useOptimisticUpdate
 */

'use client';

import React, { useCallback, useState, useRef } from 'react';

import { SyncOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { notification, Button } from 'antd';

import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/types/database';

// =============================================================================
// TYPES
// =============================================================================

// Extract table names and row types from database schema
type TableName = keyof Database['public']['Tables'];
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];
type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

/**
 * Record with version field for optimistic locking
 */
export interface VersionedRecord {
  version: number;
  [key: string]: unknown;
}

/**
 * Conflict information when version mismatch is detected
 */
export interface ConflictInfo<T> {
  /** The version that was expected */
  expectedVersion: number;
  /** The current version in the database */
  actualVersion: number;
  /** The data that caused the conflict (server's current state) */
  serverData: T;
  /** The update that was attempted */
  attemptedUpdate: Partial<T>;
  /** Timestamp of conflict detection */
  timestamp: Date;
}

/**
 * Options for the useOptimisticUpdate hook
 */
export interface UseOptimisticUpdateOptions<TTable extends TableName, TData = TableRow<TTable>> {
  /** The database table to update */
  table: TTable;

  /** Primary key column name (e.g., 'id_customer', 'id_item') */
  primaryKey: keyof TableRow<TTable>;

  /**
   * Query keys to update optimistically and invalidate after mutation.
   * Can be a single key or multiple keys.
   */
  queryKeys: QueryKey[];

  /**
   * Columns to select when fetching/returning data.
   * @default '*'
   */
  select?: string;

  /**
   * Function to transform the data before optimistic update.
   * Receives current data and the update, returns the optimistically updated data.
   */
  optimisticTransform?: (current: TData, update: Partial<TData>) => TData;

  /**
   * Callback when a version conflict is detected.
   */
  onConflict?: (conflict: ConflictInfo<TData>) => void;

  /**
   * Callback on successful update.
   */
  onSuccess?: (data: TData) => void;

  /**
   * Callback on error (non-conflict).
   */
  onError?: (error: Error) => void;

  /**
   * Whether to show default conflict notification.
   * @default true
   */
  showConflictNotification?: boolean;

  /**
   * Custom conflict notification message.
   */
  conflictMessage?: string;
}

/**
 * Variables for the optimistic update mutation
 */
export interface OptimisticUpdateVariables<TTable extends TableName> {
  /** The ID of the record to update */
  id: string;
  /** The update data */
  data: TableUpdate<TTable>;
  /** The expected version of the record */
  expectedVersion: number;
}

/**
 * Return type for the useOptimisticUpdate hook
 */
export interface UseOptimisticUpdateReturn<TTable extends TableName, TData = TableRow<TTable>> {
  /** Execute the optimistic update */
  update: (variables: OptimisticUpdateVariables<TTable>) => Promise<TData>;

  /** Whether an update is in progress */
  isUpdating: boolean;

  /** Whether a conflict was detected */
  hasConflict: boolean;

  /** Current conflict information (if any) */
  conflict: ConflictInfo<TData> | null;

  /** Clear the current conflict */
  clearConflict: () => void;

  /** Refresh the data (fetch latest from server) */
  refresh: () => Promise<void>;

  /** The underlying mutation state */
  mutation: ReturnType<
    typeof useMutation<TData, Error, OptimisticUpdateVariables<TTable>, unknown>
  >;
}

// =============================================================================
// VERSION CONFLICT ERROR
// =============================================================================

/**
 * Custom error for version conflicts
 */
export class VersionConflictError<T = unknown> extends Error {
  public readonly expectedVersion: number;
  public readonly actualVersion: number;
  public readonly serverData: T;

  constructor(expectedVersion: number, actualVersion: number, serverData: T) {
    super(`Version conflict: expected version ${expectedVersion} but found ${actualVersion}`);
    this.name = 'VersionConflictError';
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
    this.serverData = serverData;
  }
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for performing optimistic updates with version-based conflict detection.
 *
 * @example
 * // Basic usage for updating a customer
 * const {
 *   update,
 *   isUpdating,
 *   hasConflict,
 *   conflict,
 *   refresh,
 * } = useOptimisticUpdate({
 *   table: 'customers',
 *   primaryKey: 'id_customer',
 *   queryKeys: [['customers', shopId], ['customer', customerId]],
 *   onConflict: (conflict) => {
 *     console.log('Conflict detected:', conflict);
 *   },
 * });
 *
 * // Perform update
 * const handleSave = async () => {
 *   try {
 *     await update({
 *       id: customerId,
 *       data: { full_name: 'Updated Name' },
 *       expectedVersion: customer.version,
 *     });
 *   } catch (error) {
 *     if (error instanceof VersionConflictError) {
 *       // Handle conflict (notification shown automatically)
 *     }
 *   }
 * };
 *
 * @example
 * // With custom optimistic transform
 * const { update } = useOptimisticUpdate({
 *   table: 'inventory_items',
 *   primaryKey: 'id_item',
 *   queryKeys: [['inventory', shopId]],
 *   optimisticTransform: (current, update) => ({
 *     ...current,
 *     ...update,
 *     // Custom logic: recalculate derived fields
 *     updated_at: new Date().toISOString(),
 *   }),
 * });
 */
export function useOptimisticUpdate<
  TTable extends TableName,
  TData extends VersionedRecord = TableRow<TTable> & VersionedRecord,
>(options: UseOptimisticUpdateOptions<TTable, TData>): UseOptimisticUpdateReturn<TTable, TData> {
  const {
    table,
    primaryKey,
    queryKeys,
    select = '*',
    optimisticTransform,
    onConflict,
    onSuccess,
    onError,
    showConflictNotification = true,
    conflictMessage = 'This record was modified by another user. Please refresh to see the latest changes.',
  } = options;

  const queryClient = useQueryClient();
  const [conflict, setConflict] = useState<ConflictInfo<TData> | null>(null);
  const previousDataRef = useRef<Map<string, unknown>>(new Map());

  /**
   * Clear current conflict
   */
  const clearConflict = useCallback(() => {
    setConflict(null);
  }, []);

  /**
   * Show conflict notification with refresh action
   */
  const showConflictNotificationFn = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_conflictInfo: ConflictInfo<TData>) => {
      notification.warning({
        message: 'Update Conflict',
        description: conflictMessage,
        icon: React.createElement(ExclamationCircleOutlined, { style: { color: '#d97706' } }),
        btn: React.createElement(
          Button,
          {
            type: 'primary',
            size: 'small',
            icon: React.createElement(SyncOutlined),
            onClick: () => {
              // Invalidate queries to refresh data
              queryKeys.forEach((key) => {
                queryClient.invalidateQueries({ queryKey: key });
              });
              notification.destroy();
              clearConflict();
            },
            style: {
              backgroundColor: '#f59e0b',
              borderColor: '#f59e0b',
            },
          },
          'Refresh'
        ),
        duration: 0, // Don't auto-dismiss
      });
    },
    [queryClient, queryKeys, conflictMessage, clearConflict]
  );

  /**
   * Refresh data by invalidating queries
   */
  const refresh = useCallback(async () => {
    await Promise.all(queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })));
    clearConflict();
  }, [queryClient, queryKeys, clearConflict]);

  // Context type for mutation
  interface MutationContext {
    previousData: Map<string, unknown>;
  }

  /**
   * Mutation for performing the update
   */
  const mutation = useMutation<TData, Error, OptimisticUpdateVariables<TTable>, MutationContext>({
    mutationFn: async (variables) => {
      const { id, data, expectedVersion } = variables;
      const supabase = createClient();

      // First, check the current version
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: currentData, error: fetchError } = await (supabase.from(table) as any)
        .select(select)
        .eq(primaryKey, id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current data: ${fetchError.message}`);
      }

      const currentVersion = (currentData as VersionedRecord)?.version;

      // Check for version conflict
      if (currentVersion !== undefined && currentVersion !== expectedVersion) {
        throw new VersionConflictError(
          expectedVersion,
          currentVersion,
          currentData as unknown as TData
        );
      }

      // Perform the update with version check
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updatedData, error: updateError } = await (supabase.from(table) as any)
        .update(data)
        .eq(primaryKey, id)
        .eq('version', expectedVersion)
        .select(select)
        .single();

      if (updateError) {
        // Could be a race condition where version changed between check and update
        if (updateError.code === 'PGRST116') {
          // No rows returned - version changed
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: latestData } = await (supabase.from(table) as any)
            .select(select)
            .eq(primaryKey, id)
            .single();

          throw new VersionConflictError(
            expectedVersion,
            (latestData as VersionedRecord)?.version ?? -1,
            latestData as unknown as TData
          );
        }
        throw new Error(`Update failed: ${updateError.message}`);
      }

      return updatedData as TData;
    },

    onMutate: async (variables) => {
      const { id, data: updateData } = variables;

      // Cancel outgoing refetches to prevent overwrites
      await Promise.all(queryKeys.map((key) => queryClient.cancelQueries({ queryKey: key })));

      // Snapshot previous data for each query key
      previousDataRef.current.clear();
      queryKeys.forEach((key) => {
        const previousData = queryClient.getQueryData(key);
        previousDataRef.current.set(JSON.stringify(key), previousData);
      });

      // Optimistically update all related queries
      queryKeys.forEach((key) => {
        queryClient.setQueryData(key, (old: unknown) => {
          if (!old) {
            return old;
          }

          // Handle array of records (list queries)
          if (Array.isArray(old)) {
            return old.map((item: TData) => {
              if ((item as Record<string, unknown>)[primaryKey as string] === id) {
                if (optimisticTransform) {
                  return optimisticTransform(item, updateData as Partial<TData>);
                }
                return { ...item, ...updateData, version: (item.version || 0) + 1 };
              }
              return item;
            });
          }

          // Handle single record (detail queries)
          if ((old as Record<string, unknown>)[primaryKey as string] === id) {
            if (optimisticTransform) {
              return optimisticTransform(old as TData, updateData as Partial<TData>);
            }
            return {
              ...old,
              ...updateData,
              version: ((old as TData).version || 0) + 1,
            };
          }

          return old;
        });
      });

      return { previousData: previousDataRef.current };
    },

    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach((data: unknown, keyString: string) => {
          const key = JSON.parse(keyString);
          queryClient.setQueryData(key, data);
        });
      }

      // Handle version conflict
      if (error instanceof VersionConflictError) {
        const conflictInfo: ConflictInfo<TData> = {
          expectedVersion: error.expectedVersion,
          actualVersion: error.actualVersion,
          serverData: error.serverData as TData,
          attemptedUpdate: variables.data as Partial<TData>,
          timestamp: new Date(),
        };

        setConflict(conflictInfo);

        if (showConflictNotification) {
          showConflictNotificationFn(conflictInfo);
        }

        if (onConflict) {
          onConflict(conflictInfo);
        }
      } else {
        // Non-conflict error
        if (onError) {
          onError(error);
        }
      }
    },

    onSuccess: (data) => {
      // Clear any existing conflict
      clearConflict();

      // Invalidate queries to ensure consistency
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      if (onSuccess) {
        onSuccess(data);
      }
    },
  });

  /**
   * Wrapper function for update
   */
  const update = useCallback(
    async (variables: OptimisticUpdateVariables<TTable>): Promise<TData> => {
      const result = await mutation.mutateAsync(variables);
      return result;
    },
    [mutation]
  );

  return {
    update,
    isUpdating: mutation.isPending,
    hasConflict: conflict !== null,
    conflict,
    clearConflict,
    refresh,
    mutation,
  };
}

// =============================================================================
// CONVENIENCE HOOKS FOR COMMON TABLES
// =============================================================================

/**
 * Pre-configured optimistic update hook for inventory items
 */
export function useOptimisticInventoryUpdate(
  shopId: string,
  itemId?: string,
  options?: Partial<UseOptimisticUpdateOptions<'inventory_items'>>
) {
  const queryKeys: QueryKey[] = [['inventory', shopId]];
  if (itemId) {
    queryKeys.push(['inventory-item', itemId]);
  }

  return useOptimisticUpdate({
    table: 'inventory_items',
    primaryKey: 'id_item',
    queryKeys,
    ...options,
  });
}

/**
 * Pre-configured optimistic update hook for customers
 */
export function useOptimisticCustomerUpdate(
  shopId: string,
  customerId?: string,
  options?: Partial<UseOptimisticUpdateOptions<'customers'>>
) {
  const queryKeys: QueryKey[] = [['customers', shopId]];
  if (customerId) {
    queryKeys.push(['customer', customerId]);
  }

  return useOptimisticUpdate({
    table: 'customers',
    primaryKey: 'id_customer',
    queryKeys,
    ...options,
  });
}

/**
 * Pre-configured optimistic update hook for suppliers
 */
export function useOptimisticSupplierUpdate(
  shopId: string,
  supplierId?: string,
  options?: Partial<UseOptimisticUpdateOptions<'suppliers'>>
) {
  const queryKeys: QueryKey[] = [['suppliers', shopId]];
  if (supplierId) {
    queryKeys.push(['supplier', supplierId]);
  }

  return useOptimisticUpdate({
    table: 'suppliers',
    primaryKey: 'id_supplier',
    queryKeys,
    ...options,
  });
}

/**
 * Pre-configured optimistic update hook for shops
 */
export function useOptimisticShopUpdate(
  shopId: string,
  options?: Partial<UseOptimisticUpdateOptions<'shops'>>
) {
  return useOptimisticUpdate({
    table: 'shops',
    primaryKey: 'id_shop',
    queryKeys: [['shop', shopId], ['shops']],
    ...options,
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useOptimisticUpdate;
