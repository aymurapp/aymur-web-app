'use server';

/**
 * Audit Log Server Actions
 *
 * Server actions for audit log management including:
 * - Query and filter audit entries
 * - Export audit logs
 * - Audit statistics
 *
 * NOTE: This uses mock data since the audit_logs table doesn't exist yet.
 * When the database schema is updated, replace mock data with actual queries.
 *
 * @module lib/actions/audit-log
 */

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

// =============================================================================
// ACTION RESULT TYPE
// =============================================================================

/**
 * Standard result type for server actions
 */
type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

// =============================================================================
// TYPES
// =============================================================================

/**
 * Action types that can be logged
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'view';

/**
 * Entity types that can be audited
 */
export type AuditEntityType =
  | 'inventory'
  | 'sale'
  | 'customer'
  | 'supplier'
  | 'expense'
  | 'user'
  | 'settings';

/**
 * Represents a single field change in an audit entry
 */
export interface AuditChange {
  field: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
}

/**
 * Complete audit log entry with all details
 */
export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName: string;
  changes: AuditChange[] | null;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

/**
 * Filters for querying audit logs
 */
export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Paginated response for audit logs
 */
export interface AuditLogPage {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Statistics about audit logs
 */
export interface AuditLogStats {
  totalEntries: number;
  byAction: Record<AuditAction, number>;
  byUser: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
  byEntityType: Record<AuditEntityType, number>;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * Export format options
 */
export type AuditExportFormat = 'csv' | 'json';

/**
 * Result of an audit log export
 */
export interface AuditLogExport {
  format: AuditExportFormat;
  content: string;
  filename: string;
  mimeType: string;
  generatedAt: string;
  totalRecords: number;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const auditLogFiltersSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z
    .enum(['create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'view'])
    .optional(),
  entityType: z
    .enum(['inventory', 'sale', 'customer', 'supplier', 'expense', 'user', 'settings'])
    .optional(),
  entityId: z.string().optional(),
  dateRange: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(100).optional().default(20),
});

const exportFiltersSchema = z.object({
  format: z.enum(['csv', 'json']),
  userId: z.string().uuid().optional(),
  action: z
    .enum(['create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'view'])
    .optional(),
  entityType: z
    .enum(['inventory', 'sale', 'customer', 'supplier', 'expense', 'user', 'settings'])
    .optional(),
  entityId: z.string().optional(),
  dateRange: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
  search: z.string().optional(),
});

// =============================================================================
// MOCK DATA STORE
// =============================================================================

const mockAuditLogs: AuditLogEntry[] = [
  // Recent inventory actions
  {
    id: 'audit-001',
    userId: 'user-001',
    userName: 'Ahmed Hassan',
    action: 'create',
    entityType: 'inventory',
    entityId: 'inv-001',
    entityName: '18K Gold Diamond Ring - 2.5ct',
    changes: null,
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: '2024-01-15T14:30:00Z',
  },
  {
    id: 'audit-002',
    userId: 'user-001',
    userName: 'Ahmed Hassan',
    action: 'update',
    entityType: 'inventory',
    entityId: 'inv-002',
    entityName: '22K Gold Necklace - 45cm',
    changes: [
      { field: 'price', oldValue: 2500, newValue: 2750 },
      { field: 'weight_grams', oldValue: 25.5, newValue: 25.8 },
    ],
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: '2024-01-15T13:45:00Z',
  },
  {
    id: 'audit-003',
    userId: 'user-002',
    userName: 'Maria Santos',
    action: 'delete',
    entityType: 'inventory',
    entityId: 'inv-003',
    entityName: 'Silver Bracelet - Celtic Design',
    changes: null,
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    timestamp: '2024-01-15T11:20:00Z',
  },
  // Sales actions
  {
    id: 'audit-004',
    userId: 'user-002',
    userName: 'Maria Santos',
    action: 'create',
    entityType: 'sale',
    entityId: 'sale-001',
    entityName: 'Sale #2024-0115 - Diamond Engagement Ring',
    changes: null,
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    timestamp: '2024-01-15T10:30:00Z',
  },
  {
    id: 'audit-005',
    userId: 'user-002',
    userName: 'Maria Santos',
    action: 'update',
    entityType: 'sale',
    entityId: 'sale-001',
    entityName: 'Sale #2024-0115 - Diamond Engagement Ring',
    changes: [
      { field: 'status', oldValue: 'pending', newValue: 'completed' },
      { field: 'payment_method', oldValue: null, newValue: 'credit_card' },
    ],
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    timestamp: '2024-01-15T10:45:00Z',
  },
  // Customer actions
  {
    id: 'audit-006',
    userId: 'user-003',
    userName: 'Jean-Pierre Dubois',
    action: 'create',
    entityType: 'customer',
    entityId: 'cust-001',
    entityName: 'Elisabeth van der Berg',
    changes: null,
    ipAddress: '192.168.1.110',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0',
    timestamp: '2024-01-15T09:15:00Z',
  },
  {
    id: 'audit-007',
    userId: 'user-003',
    userName: 'Jean-Pierre Dubois',
    action: 'update',
    entityType: 'customer',
    entityId: 'cust-002',
    entityName: 'Mohammed Al-Rashid',
    changes: [
      { field: 'phone', oldValue: '+31 6 1234 5678', newValue: '+31 6 8765 4321' },
      { field: 'email', oldValue: 'old@email.com', newValue: 'new@email.com' },
    ],
    ipAddress: '192.168.1.110',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0',
    timestamp: '2024-01-14T16:30:00Z',
  },
  // Supplier actions
  {
    id: 'audit-008',
    userId: 'user-001',
    userName: 'Ahmed Hassan',
    action: 'create',
    entityType: 'supplier',
    entityId: 'supp-001',
    entityName: 'Antwerp Diamond Traders',
    changes: null,
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: '2024-01-14T14:00:00Z',
  },
  {
    id: 'audit-009',
    userId: 'user-001',
    userName: 'Ahmed Hassan',
    action: 'update',
    entityType: 'supplier',
    entityId: 'supp-002',
    entityName: 'Istanbul Gold Wholesale',
    changes: [
      { field: 'credit_limit', oldValue: 50000, newValue: 75000 },
      { field: 'payment_terms', oldValue: 'net_30', newValue: 'net_45' },
    ],
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: '2024-01-14T11:30:00Z',
  },
  // Expense actions
  {
    id: 'audit-010',
    userId: 'user-004',
    userName: 'Sarah Thompson',
    action: 'create',
    entityType: 'expense',
    entityId: 'exp-001',
    entityName: 'Monthly Rent - January 2024',
    changes: null,
    ipAddress: '192.168.1.115',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) Safari/605.1.15',
    timestamp: '2024-01-14T09:00:00Z',
  },
  {
    id: 'audit-011',
    userId: 'user-004',
    userName: 'Sarah Thompson',
    action: 'update',
    entityType: 'expense',
    entityId: 'exp-002',
    entityName: 'Insurance Premium - Q1',
    changes: [
      { field: 'amount', oldValue: 1200, newValue: 1350 },
      { field: 'notes', oldValue: null, newValue: 'Premium increased due to inventory value' },
    ],
    ipAddress: '192.168.1.115',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) Safari/605.1.15',
    timestamp: '2024-01-13T15:45:00Z',
  },
  // User/Auth actions
  {
    id: 'audit-012',
    userId: 'user-001',
    userName: 'Ahmed Hassan',
    action: 'login',
    entityType: 'user',
    entityId: 'user-001',
    entityName: 'Ahmed Hassan',
    changes: null,
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: '2024-01-15T08:00:00Z',
  },
  {
    id: 'audit-013',
    userId: 'user-002',
    userName: 'Maria Santos',
    action: 'login',
    entityType: 'user',
    entityId: 'user-002',
    entityName: 'Maria Santos',
    changes: null,
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    timestamp: '2024-01-15T09:30:00Z',
  },
  {
    id: 'audit-014',
    userId: 'user-003',
    userName: 'Jean-Pierre Dubois',
    action: 'logout',
    entityType: 'user',
    entityId: 'user-003',
    entityName: 'Jean-Pierre Dubois',
    changes: null,
    ipAddress: '192.168.1.110',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0',
    timestamp: '2024-01-14T18:00:00Z',
  },
  // Export/Import actions
  {
    id: 'audit-015',
    userId: 'user-004',
    userName: 'Sarah Thompson',
    action: 'export',
    entityType: 'inventory',
    entityId: 'export-001',
    entityName: 'Inventory Export - Full Catalog',
    changes: null,
    ipAddress: '192.168.1.115',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) Safari/605.1.15',
    timestamp: '2024-01-13T14:00:00Z',
  },
  {
    id: 'audit-016',
    userId: 'user-001',
    userName: 'Ahmed Hassan',
    action: 'import',
    entityType: 'inventory',
    entityId: 'import-001',
    entityName: 'Batch Import - 150 Items',
    changes: null,
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: '2024-01-12T10:30:00Z',
  },
  // Settings actions
  {
    id: 'audit-017',
    userId: 'user-001',
    userName: 'Ahmed Hassan',
    action: 'update',
    entityType: 'settings',
    entityId: 'shop-settings',
    entityName: 'Shop Settings',
    changes: [
      { field: 'currency', oldValue: 'USD', newValue: 'EUR' },
      { field: 'tax_rate', oldValue: 0.08, newValue: 0.21 },
    ],
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: '2024-01-11T16:00:00Z',
  },
  {
    id: 'audit-018',
    userId: 'user-002',
    userName: 'Maria Santos',
    action: 'view',
    entityType: 'customer',
    entityId: 'cust-003',
    entityName: 'Sophie Laurent - Account Details',
    changes: null,
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    timestamp: '2024-01-15T12:00:00Z',
  },
  // More inventory updates
  {
    id: 'audit-019',
    userId: 'user-003',
    userName: 'Jean-Pierre Dubois',
    action: 'update',
    entityType: 'inventory',
    entityId: 'inv-004',
    entityName: 'Platinum Wedding Band Set',
    changes: [
      { field: 'status', oldValue: 'available', newValue: 'reserved' },
      { field: 'reserved_for', oldValue: null, newValue: 'cust-003' },
    ],
    ipAddress: '192.168.1.110',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0',
    timestamp: '2024-01-15T15:00:00Z',
  },
  {
    id: 'audit-020',
    userId: 'user-004',
    userName: 'Sarah Thompson',
    action: 'delete',
    entityType: 'customer',
    entityId: 'cust-004',
    entityName: 'Test Customer (Duplicate)',
    changes: null,
    ipAddress: '192.168.1.115',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) Safari/605.1.15',
    timestamp: '2024-01-13T11:30:00Z',
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Apply filters to audit log entries
 */
function applyFilters(entries: AuditLogEntry[], filters: AuditLogFilters): AuditLogEntry[] {
  let filtered = [...entries];

  if (filters.userId) {
    filtered = filtered.filter((e) => e.userId === filters.userId);
  }

  if (filters.action) {
    filtered = filtered.filter((e) => e.action === filters.action);
  }

  if (filters.entityType) {
    filtered = filtered.filter((e) => e.entityType === filters.entityType);
  }

  if (filters.entityId) {
    filtered = filtered.filter((e) => e.entityId === filters.entityId);
  }

  if (filters.dateRange) {
    const startDate = new Date(filters.dateRange.start);
    const endDate = new Date(filters.dateRange.end);
    filtered = filtered.filter((e) => {
      const entryDate = new Date(e.timestamp);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.entityName.toLowerCase().includes(searchLower) ||
        e.userName.toLowerCase().includes(searchLower) ||
        e.action.toLowerCase().includes(searchLower) ||
        e.entityType.toLowerCase().includes(searchLower)
    );
  }

  // Sort by timestamp descending (most recent first)
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return filtered;
}

/**
 * Convert audit log entries to CSV format
 */
function convertToCSV(entries: AuditLogEntry[]): string {
  const headers = [
    'ID',
    'Timestamp',
    'User ID',
    'User Name',
    'Action',
    'Entity Type',
    'Entity ID',
    'Entity Name',
    'Changes',
    'IP Address',
    'User Agent',
  ];

  const rows = entries.map((entry) => [
    entry.id,
    entry.timestamp,
    entry.userId,
    entry.userName,
    entry.action,
    entry.entityType,
    entry.entityId,
    entry.entityName,
    entry.changes ? JSON.stringify(entry.changes) : '',
    entry.ipAddress,
    entry.userAgent,
  ]);

  const escapeCSV = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => escapeCSV(String(cell))).join(',')),
  ].join('\n');

  return csvContent;
}

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Get audit logs with pagination and filtering
 */
export async function getAuditLogs(filters?: AuditLogFilters): Promise<ActionResult<AuditLogPage>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate and apply defaults to filters
    const validatedFilters = filters
      ? auditLogFiltersSchema.parse(filters)
      : { page: 1, pageSize: 20 };
    const page = validatedFilters.page ?? 1;
    const pageSize = validatedFilters.pageSize ?? 20;

    // Apply filters to mock data
    const filteredEntries = applyFilters(mockAuditLogs, validatedFilters);
    const total = filteredEntries.length;
    const totalPages = Math.ceil(total / pageSize);

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const paginatedEntries = filteredEntries.slice(startIndex, startIndex + pageSize);

    return {
      success: true,
      data: {
        entries: paginatedEntries,
        total,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Validation error' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch audit logs',
    };
  }
}

/**
 * Get a single audit log entry by ID
 */
export async function getAuditLogEntry(id: string): Promise<ActionResult<AuditLogEntry>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const entry = mockAuditLogs.find((e) => e.id === id);
    if (!entry) {
      return { success: false, error: 'Audit log entry not found' };
    }

    return { success: true, data: entry };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch audit log entry',
    };
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(): Promise<ActionResult<AuditLogStats>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Calculate statistics from mock data
    const byAction: Record<AuditAction, number> = {
      create: 0,
      update: 0,
      delete: 0,
      login: 0,
      logout: 0,
      export: 0,
      import: 0,
      view: 0,
    };

    const byEntityType: Record<AuditEntityType, number> = {
      inventory: 0,
      sale: 0,
      customer: 0,
      supplier: 0,
      expense: 0,
      user: 0,
      settings: 0,
    };

    const userCounts: Record<string, { userName: string; count: number }> = {};
    const dateCounts: Record<string, number> = {};

    for (const entry of mockAuditLogs) {
      // Count by action
      byAction[entry.action]++;

      // Count by entity type
      byEntityType[entry.entityType]++;

      // Count by user
      if (!userCounts[entry.userId]) {
        userCounts[entry.userId] = { userName: entry.userName, count: 0 };
      }
      const userCount = userCounts[entry.userId];
      if (userCount) {
        userCount.count++;
      }

      // Count by date (last 7 days)
      const date = entry.timestamp.split('T')[0];
      if (date) {
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
    }

    // Format user stats
    const byUser = Object.entries(userCounts)
      .map(([userId, data]) => ({
        userId,
        userName: data.userName,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);

    // Format recent activity (last 7 days)
    const recentActivity = Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);

    return {
      success: true,
      data: {
        totalEntries: mockAuditLogs.length,
        byAction,
        byUser,
        byEntityType,
        recentActivity,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch audit log statistics',
    };
  }
}

/**
 * Export audit logs in specified format
 */
export async function exportAuditLogs(
  format: AuditExportFormat,
  filters?: Omit<AuditLogFilters, 'page' | 'pageSize'>
): Promise<ActionResult<AuditLogExport>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate format and filters
    const validated = exportFiltersSchema.parse({ format, ...filters });

    // Apply filters (without pagination for export)
    const filteredEntries = applyFilters(mockAuditLogs, validated);
    const generatedAt = new Date().toISOString();
    const dateStr = generatedAt.split('T')[0]?.replace(/-/g, '') ?? 'export';

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'csv') {
      content = convertToCSV(filteredEntries);
      filename = `audit-log-export-${dateStr}.csv`;
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(
        {
          exportedAt: generatedAt,
          totalRecords: filteredEntries.length,
          filters: filters ?? {},
          entries: filteredEntries,
        },
        null,
        2
      );
      filename = `audit-log-export-${dateStr}.json`;
      mimeType = 'application/json';
    }

    return {
      success: true,
      data: {
        format,
        content,
        filename,
        mimeType,
        generatedAt,
        totalRecords: filteredEntries.length,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'Validation error' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export audit logs',
    };
  }
}
