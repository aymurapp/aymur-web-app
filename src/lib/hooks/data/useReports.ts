'use client';

/**
 * Reports Data Hooks
 *
 * TanStack Query v5 hooks for reports management.
 * Includes saved reports, report generation, and templates.
 *
 * @module lib/hooks/data/useReports
 */

import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';

import {
  getReports,
  getReport,
  getReportTemplates,
  createReport,
  updateReport,
  deleteReport,
  generateReport,
  type ReportFilters,
} from '@/lib/actions/reports';

// =============================================================================
// TYPES
// =============================================================================

export interface Report {
  id_report: string;
  id_shop: string;
  name: string;
  description?: string;
  type: 'sales' | 'inventory' | 'customers' | 'suppliers' | 'expenses' | 'custom';
  template_id?: string;
  filters: Record<string, unknown>;
  date_range_start?: string;
  date_range_end?: string;
  schedule?: 'none' | 'daily' | 'weekly' | 'monthly';
  last_generated?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: Report['type'];
  default_filters: Record<string, unknown>;
  columns: string[];
  grouping?: string[];
  sorting?: { field: string; direction: 'asc' | 'desc' }[];
}

export interface GeneratedReport {
  id: string;
  report_id: string;
  data: Record<string, unknown>[];
  summary: Record<string, number | string>;
  generated_at: string;
  format: 'json' | 'pdf' | 'excel';
}

// =============================================================================
// QUERY KEYS
// =============================================================================

export const reportKeys = {
  all: ['reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  list: (filters?: ReportFilters) => [...reportKeys.lists(), filters] as const,
  details: () => [...reportKeys.all, 'detail'] as const,
  detail: (id: string) => [...reportKeys.details(), id] as const,
  templates: () => [...reportKeys.all, 'templates'] as const,
  generated: () => [...reportKeys.all, 'generated'] as const,
  generatedReport: (id: string) => [...reportKeys.generated(), id] as const,
};

// =============================================================================
// QUERY OPTIONS
// =============================================================================

export const reportsQueryOptions = (filters?: ReportFilters) =>
  queryOptions({
    queryKey: reportKeys.list(filters),
    queryFn: () => getReports(filters),
  });

export const reportQueryOptions = (id: string) =>
  queryOptions({
    queryKey: reportKeys.detail(id),
    queryFn: () => getReport(id),
    enabled: !!id,
  });

export const reportTemplatesQueryOptions = () =>
  queryOptions({
    queryKey: reportKeys.templates(),
    queryFn: () => getReportTemplates(),
  });

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to fetch reports with optional filters
 */
export function useReports(filters?: ReportFilters & { enabled?: boolean }) {
  const { enabled = true, ...filterParams } = filters ?? {};

  const query = useQuery({
    ...reportsQueryOptions(Object.keys(filterParams).length > 0 ? filterParams : undefined),
    enabled,
  });

  return {
    reports: query.data?.success ? (query.data.data ?? []) : [],
    error: query.data?.success === false ? query.data.error : null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch a single report by ID
 */
export function useReport(id: string, options?: { enabled?: boolean }) {
  const query = useQuery({
    ...reportQueryOptions(id),
    enabled: options?.enabled !== false && !!id,
  });

  return {
    report: query.data?.success ? query.data.data : null,
    error: query.data?.success === false ? query.data.error : null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch report templates
 */
export function useReportTemplates(options?: { enabled?: boolean }) {
  const query = useQuery({
    ...reportTemplatesQueryOptions(),
    enabled: options?.enabled !== false,
  });

  return {
    templates: query.data?.success ? (query.data.data ?? []) : [],
    error: query.data?.success === false ? query.data.error : null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/**
 * Hook to create a new report
 */
export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReport,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      }
    },
  });
}

/**
 * Hook to update an existing report
 */
export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateReport>[1] }) =>
      updateReport(id, data),
    onSuccess: (result, { id }) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
        queryClient.invalidateQueries({ queryKey: reportKeys.detail(id) });
      }
    },
  });
}

/**
 * Hook to delete a report
 */
export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReport,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      }
    },
  });
}

/**
 * Hook to generate a report
 */
export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, format }: { reportId: string; format: 'json' | 'pdf' | 'excel' }) =>
      generateReport(reportId, format),
    onSuccess: (result, { reportId }) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: reportKeys.detail(reportId) });
        queryClient.invalidateQueries({ queryKey: reportKeys.generatedReport(reportId) });
      }
    },
  });
}

export default {
  useReports,
  useReport,
  useReportTemplates,
  useCreateReport,
  useUpdateReport,
  useDeleteReport,
  useGenerateReport,
};
