'use client';

/**
 * AuditLogViewer Component
 *
 * Displays the audit log/activity history for the shop. Provides a filterable,
 * paginated table of audit log entries with detailed views in a drawer.
 *
 * Features:
 * - Filterable table of audit log entries
 * - Filters: Date range, User, Action type, Entity type, Search
 * - Columns: Timestamp, User, Action (with colored tags), Entity, Description
 * - Click row to see full details in Drawer
 * - Detail drawer shows: Full change history (old/new values), IP address, User agent
 * - Export button to download logs
 * - Pagination with configurable page size
 * - Auto-refresh toggle
 *
 * @module components/domain/settings/AuditLogViewer
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import {
  ReloadOutlined,
  DownloadOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  UserOutlined,
  GlobalOutlined,
  DesktopOutlined,
  SwapOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  Drawer,
  Tag,
  Typography,
  Space,
  Select,
  DatePicker,
  Input,
  Switch,
  Timeline,
  Descriptions,
  Tooltip,
  Empty,
  Skeleton,
  Flex,
} from 'antd';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table, type ServerPaginationConfig } from '@/components/ui/Table';
import { usePermissions } from '@/lib/hooks/permissions';
import { type Locale, isRtlLocale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils/cn';
import { formatDateTime } from '@/lib/utils/format';

import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Search } = Input;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Action types for audit logs
 */
export type AuditActionType =
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
  | 'sale'
  | 'customer'
  | 'inventory_item'
  | 'supplier'
  | 'purchase'
  | 'expense'
  | 'workshop_order'
  | 'user'
  | 'shop'
  | 'settings'
  | 'report';

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: AuditActionType;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  description: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  shopId?: string;
}

/**
 * Filter values for audit log queries
 */
export interface AuditLogFilters {
  dateRange?: [Dayjs, Dayjs] | null;
  userId?: string;
  actionType?: AuditActionType;
  entityType?: AuditEntityType;
  search?: string;
}

/**
 * Props for the AuditLogViewer component
 */
export interface AuditLogViewerProps {
  /** Shop ID to filter logs by (optional if used within shop context) */
  shopId?: string;
  /** Pre-filter by user ID */
  userId?: string;
  /** Pre-filter by entity type */
  entityType?: string;
  /** Pre-filter by entity ID */
  entityId?: string;
  /** Compact mode for embedding */
  compact?: boolean;
  /** Additional CSS class name */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Action type colors for tags
 */
const ACTION_COLORS: Record<AuditActionType, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  login: 'purple',
  logout: 'purple',
  export: 'orange',
  import: 'orange',
  view: 'default',
};

/**
 * Entity type display names
 */
const ENTITY_TYPES: AuditEntityType[] = [
  'sale',
  'customer',
  'inventory_item',
  'supplier',
  'purchase',
  'expense',
  'workshop_order',
  'user',
  'shop',
  'settings',
  'report',
];

/**
 * Action types list
 */
const ACTION_TYPES: AuditActionType[] = [
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'export',
  'import',
  'view',
];

/**
 * Auto-refresh interval in milliseconds (30 seconds)
 */
const AUTO_REFRESH_INTERVAL = 30000;

// =============================================================================
// MOCK DATA
// =============================================================================

/**
 * Mock audit log entries for demonstration
 */
const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    userId: 'user-1',
    userName: 'John Smith',
    userEmail: 'john@example.com',
    action: 'create',
    entityType: 'sale',
    entityId: 'sale-123',
    entityName: 'INV-2024-0156',
    description: 'Created new sale INV-2024-0156 for customer Ahmed Hassan',
    newValues: {
      sale_number: 'INV-2024-0156',
      customer_name: 'Ahmed Hassan',
      total_amount: 2500.0,
      payment_status: 'paid',
    },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    sessionId: 'sess-abc123',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    userId: 'user-2',
    userName: 'Sarah Johnson',
    userEmail: 'sarah@example.com',
    action: 'update',
    entityType: 'inventory_item',
    entityId: 'item-456',
    entityName: 'Diamond Ring 18K',
    description: 'Updated inventory item Diamond Ring 18K status from available to reserved',
    oldValues: {
      status: 'available',
      updated_at: '2024-01-15T10:00:00Z',
    },
    newValues: {
      status: 'reserved',
      reserved_for: 'customer-789',
      updated_at: '2024-01-15T14:30:00Z',
    },
    ipAddress: '10.0.0.50',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    sessionId: 'sess-def456',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    userId: 'user-1',
    userName: 'John Smith',
    userEmail: 'john@example.com',
    action: 'delete',
    entityType: 'expense',
    entityId: 'exp-789',
    entityName: 'Office Supplies',
    description: 'Deleted expense record: Office Supplies - $150.00',
    oldValues: {
      category: 'Office Supplies',
      amount: 150.0,
      expense_date: '2024-01-10',
      status: 'approved',
    },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    sessionId: 'sess-abc123',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    userId: 'user-3',
    userName: 'Admin User',
    userEmail: 'admin@example.com',
    action: 'login',
    entityType: 'user',
    entityId: 'user-3',
    entityName: 'Admin User',
    description: 'User logged in successfully',
    newValues: {
      login_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      ip_address: '203.0.113.45',
      device: 'Desktop',
      browser: 'Chrome 120',
    },
    ipAddress: '203.0.113.45',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    sessionId: 'sess-ghi789',
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    userId: 'user-2',
    userName: 'Sarah Johnson',
    userEmail: 'sarah@example.com',
    action: 'export',
    entityType: 'report',
    entityId: 'report-sales-monthly',
    entityName: 'Monthly Sales Report',
    description: 'Exported Monthly Sales Report (January 2024) to PDF',
    newValues: {
      format: 'PDF',
      date_range: 'January 2024',
      records_exported: 156,
    },
    ipAddress: '10.0.0.50',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    sessionId: 'sess-def456',
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    userId: 'user-1',
    userName: 'John Smith',
    userEmail: 'john@example.com',
    action: 'update',
    entityType: 'customer',
    entityId: 'cust-321',
    entityName: 'Mohammed Al-Rashid',
    description: 'Updated customer Mohammed Al-Rashid contact information',
    oldValues: {
      phone: '+971-50-123-4567',
      email: 'old.email@example.com',
    },
    newValues: {
      phone: '+971-50-987-6543',
      email: 'new.email@example.com',
    },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    sessionId: 'sess-abc123',
  },
  {
    id: '7',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    userId: 'user-3',
    userName: 'Admin User',
    userEmail: 'admin@example.com',
    action: 'logout',
    entityType: 'user',
    entityId: 'user-3',
    entityName: 'Admin User',
    description: 'User logged out',
    oldValues: {
      session_duration: '2h 45m',
    },
    ipAddress: '203.0.113.45',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    sessionId: 'sess-ghi789',
  },
  {
    id: '8',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    userId: 'user-2',
    userName: 'Sarah Johnson',
    userEmail: 'sarah@example.com',
    action: 'import',
    entityType: 'inventory_item',
    entityId: 'import-batch-001',
    entityName: 'Inventory Import',
    description: 'Imported 45 inventory items from CSV file',
    newValues: {
      file_name: 'inventory_batch_jan2024.csv',
      records_imported: 45,
      records_skipped: 3,
      records_failed: 0,
    },
    ipAddress: '10.0.0.50',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    sessionId: 'sess-def456',
  },
  {
    id: '9',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    userId: 'user-1',
    userName: 'John Smith',
    userEmail: 'john@example.com',
    action: 'view',
    entityType: 'report',
    entityId: 'report-profit-loss',
    entityName: 'Profit & Loss Report',
    description: 'Viewed Profit & Loss Report for Q4 2023',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    sessionId: 'sess-abc123',
  },
  {
    id: '10',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    userId: 'user-3',
    userName: 'Admin User',
    userEmail: 'admin@example.com',
    action: 'update',
    entityType: 'settings',
    entityId: 'shop-settings',
    entityName: 'Shop Settings',
    description: 'Updated shop settings - changed tax rate',
    oldValues: {
      tax_rate: 5.0,
      tax_name: 'VAT',
    },
    newValues: {
      tax_rate: 7.5,
      tax_name: 'VAT',
    },
    ipAddress: '203.0.113.45',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    sessionId: 'sess-jkl012',
  },
];

/**
 * Mock users for filter dropdown
 */
const MOCK_USERS = [
  { value: 'user-1', label: 'John Smith' },
  { value: 'user-2', label: 'Sarah Johnson' },
  { value: 'user-3', label: 'Admin User' },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format relative time (e.g., "5 minutes ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString();
}

/**
 * Render value changes in a readable format
 */
function renderValueChange(key: string, oldVal: unknown, newVal: unknown): React.ReactNode {
  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) {
      return '-';
    }
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  };

  return (
    <div key={key} className="flex flex-col gap-1 py-2 border-b border-stone-100 last:border-b-0">
      <Text strong className="text-stone-700 capitalize">
        {key.replace(/_/g, ' ')}
      </Text>
      <div className="flex items-center gap-2 flex-wrap">
        {oldVal !== undefined && (
          <>
            <Tag color="red" className="font-mono text-xs">
              {formatValue(oldVal)}
            </Tag>
            <SwapOutlined className="text-stone-400" />
          </>
        )}
        {newVal !== undefined && (
          <Tag color="green" className="font-mono text-xs">
            {formatValue(newVal)}
          </Tag>
        )}
      </div>
    </div>
  );
}

/**
 * Parse user agent string for display
 */
function parseUserAgent(userAgent?: string): { browser: string; os: string } {
  if (!userAgent) {
    return { browser: 'Unknown', os: 'Unknown' };
  }

  let browser = 'Unknown';
  let os = 'Unknown';

  // Parse browser
  if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge';
  }

  // Parse OS
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iOS')) {
    os = 'iOS';
  }

  return { browser, os };
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Audit Log Detail Drawer
 */
interface AuditLogDetailDrawerProps {
  entry: AuditLogEntry | null;
  open: boolean;
  onClose: () => void;
}

function AuditLogDetailDrawer({
  entry,
  open,
  onClose,
}: AuditLogDetailDrawerProps): React.JSX.Element {
  const t = useTranslations('settings.auditLog');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;

  if (!entry) {
    return (
      <Drawer
        title={t('details.title')}
        placement="right"
        onClose={onClose}
        open={open}
        width={520}
      >
        <Empty description={tCommon('messages.noData')} />
      </Drawer>
    );
  }

  const { browser, os } = parseUserAgent(entry.userAgent);

  // Determine which values to show
  const hasOldValues = entry.oldValues && Object.keys(entry.oldValues).length > 0;
  const hasNewValues = entry.newValues && Object.keys(entry.newValues).length > 0;
  const hasChanges = hasOldValues || hasNewValues;

  // Build unified change list
  const changes: { key: string; oldVal?: unknown; newVal?: unknown }[] = [];
  if (hasOldValues && hasNewValues) {
    const allKeys = new Set([
      ...Object.keys(entry.oldValues || {}),
      ...Object.keys(entry.newValues || {}),
    ]);
    allKeys.forEach((key) => {
      changes.push({
        key,
        oldVal: entry.oldValues?.[key],
        newVal: entry.newValues?.[key],
      });
    });
  } else if (hasNewValues) {
    Object.entries(entry.newValues || {}).forEach(([key, val]) => {
      changes.push({ key, newVal: val });
    });
  } else if (hasOldValues) {
    Object.entries(entry.oldValues || {}).forEach(([key, val]) => {
      changes.push({ key, oldVal: val });
    });
  }

  return (
    <Drawer
      title={
        <div className="flex items-center gap-3 pe-8">
          <HistoryOutlined className="text-amber-600 text-xl" />
          <div>
            <Title level={5} className="!mb-0">
              {t('details.title')}
            </Title>
            <Text type="secondary" className="text-sm">
              {entry.entityName || entry.entityId}
            </Text>
          </div>
        </div>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={520}
      closeIcon={<CloseOutlined />}
      className={cn(
        '[&_.ant-drawer-header]:border-b [&_.ant-drawer-header]:border-stone-200',
        '[&_.ant-drawer-body]:bg-stone-50 [&_.ant-drawer-body]:p-4'
      )}
    >
      <div className="space-y-4">
        {/* Action Overview */}
        <Card className="border-stone-200">
          <div className="flex items-center gap-3 mb-4">
            <Tag color={ACTION_COLORS[entry.action]} className="uppercase text-xs font-medium">
              {t(`actions.${entry.action}`)}
            </Tag>
            <Text type="secondary" className="text-sm">
              {formatDateTime(entry.timestamp, locale)}
            </Text>
          </div>
          <Paragraph className="!mb-0 text-stone-700">{entry.description}</Paragraph>
        </Card>

        {/* User Information */}
        <Card className="border-stone-200">
          <div className="flex items-center gap-2 mb-4">
            <UserOutlined className="text-blue-600" />
            <Title level={5} className="!mb-0">
              {t('details.user')}
            </Title>
          </div>
          <Descriptions column={1} size="small" labelStyle={{ color: '#78716c', fontWeight: 500 }}>
            <Descriptions.Item label={tCommon('labels.name')}>{entry.userName}</Descriptions.Item>
            <Descriptions.Item label={tCommon('labels.email')}>{entry.userEmail}</Descriptions.Item>
            {entry.sessionId && (
              <Descriptions.Item label={t('details.sessionId')}>
                <Text copyable className="font-mono text-xs">
                  {entry.sessionId}
                </Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Changes Section */}
        {hasChanges && (
          <Card className="border-stone-200">
            <div className="flex items-center gap-2 mb-4">
              <SwapOutlined className="text-purple-600" />
              <Title level={5} className="!mb-0">
                {t('details.changes')}
              </Title>
            </div>
            <div className="divide-y divide-stone-100">
              {changes.map(({ key, oldVal, newVal }) => renderValueChange(key, oldVal, newVal))}
            </div>
          </Card>
        )}

        {/* Technical Details */}
        <Card className="border-stone-200">
          <div className="flex items-center gap-2 mb-4">
            <DesktopOutlined className="text-stone-600" />
            <Title level={5} className="!mb-0">
              {t('details.technicalInfo')}
            </Title>
          </div>
          <Descriptions column={1} size="small" labelStyle={{ color: '#78716c', fontWeight: 500 }}>
            {entry.ipAddress && (
              <Descriptions.Item label={t('details.ipAddress')}>
                <Space>
                  <GlobalOutlined className="text-stone-400" />
                  <Text className="font-mono text-sm">{entry.ipAddress}</Text>
                </Space>
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t('details.browser')}>{browser}</Descriptions.Item>
            <Descriptions.Item label={t('details.operatingSystem')}>{os}</Descriptions.Item>
            {entry.requestId && (
              <Descriptions.Item label={t('details.requestId')}>
                <Text copyable className="font-mono text-xs">
                  {entry.requestId}
                </Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Timeline Position */}
        <Card className="border-stone-200">
          <div className="flex items-center gap-2 mb-4">
            <ClockCircleOutlined className="text-amber-600" />
            <Title level={5} className="!mb-0">
              {t('details.timestamp')}
            </Title>
          </div>
          <Timeline
            items={[
              {
                color: ACTION_COLORS[entry.action],
                children: (
                  <div>
                    <Text strong className="block">
                      {t(`actions.${entry.action}`)}
                    </Text>
                    <Text type="secondary" className="text-xs">
                      {formatDateTime(entry.timestamp, locale)}
                    </Text>
                    <Text type="secondary" className="text-xs block">
                      {formatRelativeTime(entry.timestamp)}
                    </Text>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </Drawer>
  );
}

/**
 * Loading skeleton for the table
 */
function TableSkeleton({ rows = 5 }: { rows?: number }): React.JSX.Element {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-4 py-3 px-4 border-b border-stone-100">
          <Skeleton.Input active size="small" className="!w-32" />
          <Skeleton.Input active size="small" className="!w-24" />
          <Skeleton.Button active size="small" className="!w-16" />
          <Skeleton.Input active size="small" className="!w-28" />
          <Skeleton.Input active size="small" className="!w-48" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * AuditLogViewer Component
 *
 * Displays a filterable, paginated table of audit log entries with detailed views.
 */
export function AuditLogViewer({
  shopId: _shopId,
  userId: preFilterUserId,
  entityType: preFilterEntityType,
  entityId: preFilterEntityId,
  compact = false,
  className,
}: AuditLogViewerProps): React.JSX.Element {
  const t = useTranslations('settings.auditLog');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const isRtl = isRtlLocale(locale);
  const { can } = usePermissions();

  // Note: _shopId would be used in real implementation for fetching audit logs
  // Example: const { data: logs } = useAuditLogs({ shopId: _shopId, filters });

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<AuditLogEntry[]>(MOCK_AUDIT_LOGS);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: compact ? 5 : 10,
    total: MOCK_AUDIT_LOGS.length,
  });

  // Filter state
  const [filters, setFilters] = useState<AuditLogFilters>({
    userId: preFilterUserId,
    entityType: preFilterEntityType as AuditEntityType | undefined,
    search: preFilterEntityId,
  });

  // Check permissions for export
  const canExport = can('settings.manage');

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((key: keyof AuditLogFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  /**
   * Handle row click to open detail drawer
   */
  const handleRowClick = useCallback((record: AuditLogEntry) => {
    setSelectedEntry(record);
    setDrawerOpen(true);
  }, []);

  /**
   * Handle drawer close
   */
  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    // Delay clearing the entry to allow drawer animation
    setTimeout(() => setSelectedEntry(null), 300);
  }, []);

  /**
   * Handle pagination change
   */
  const handlePaginationChange = useCallback((page: number, pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  }, []);

  /**
   * Handle manual refresh
   */
  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLogs([...MOCK_AUDIT_LOGS]);
      setIsLoading(false);
    }, 500);
  }, []);

  /**
   * Handle export logs
   */
  const handleExport = useCallback(() => {
    // In a real implementation, this would call an API endpoint
    const dataStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  /**
   * Handle auto-refresh toggle
   */
  const handleAutoRefreshToggle = useCallback((checked: boolean) => {
    setAutoRefresh(checked);
  }, []);

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    setFilters({
      userId: preFilterUserId,
      entityType: preFilterEntityType as AuditEntityType | undefined,
      search: preFilterEntityId,
    });
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, [preFilterUserId, preFilterEntityType, preFilterEntityId]);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        handleRefresh();
      }, AUTO_REFRESH_INTERVAL);
    } else {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefresh, handleRefresh]);

  // ==========================================================================
  // FILTERED DATA
  // ==========================================================================

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Apply filters
    if (filters.userId) {
      result = result.filter((log) => log.userId === filters.userId);
    }
    if (filters.actionType) {
      result = result.filter((log) => log.action === filters.actionType);
    }
    if (filters.entityType) {
      result = result.filter((log) => log.entityType === filters.entityType);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (log) =>
          log.description.toLowerCase().includes(searchLower) ||
          log.entityName?.toLowerCase().includes(searchLower) ||
          log.entityId.toLowerCase().includes(searchLower)
      );
    }
    if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
      const startDate = filters.dateRange[0].startOf('day').toDate();
      const endDate = filters.dateRange[1].endOf('day').toDate();
      result = result.filter((log) => {
        const logDate = new Date(log.timestamp);
        return logDate >= startDate && logDate <= endDate;
      });
    }

    return result;
  }, [logs, filters]);

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================

  const columns: ColumnsType<AuditLogEntry> = useMemo(
    () => [
      {
        title: t('columns.timestamp'),
        dataIndex: 'timestamp',
        key: 'timestamp',
        width: 160,
        fixed: isRtl ? 'right' : 'left',
        render: (value: string) => (
          <Tooltip title={formatDateTime(value, locale)}>
            <Text className="text-stone-600">{formatRelativeTime(value)}</Text>
          </Tooltip>
        ),
        sorter: (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        defaultSortOrder: 'descend',
      },
      {
        title: t('columns.user'),
        dataIndex: 'userName',
        key: 'userName',
        width: 140,
        ellipsis: true,
        render: (value: string, record: AuditLogEntry) => (
          <Tooltip title={record.userEmail}>
            <div className="flex items-center gap-2">
              <UserOutlined className="text-stone-400" />
              <Text>{value}</Text>
            </div>
          </Tooltip>
        ),
      },
      {
        title: t('columns.action'),
        dataIndex: 'action',
        key: 'action',
        width: 100,
        align: 'center',
        render: (value: AuditActionType) => (
          <Tag color={ACTION_COLORS[value]} className="uppercase text-xs font-medium">
            {t(`actions.${value}`)}
          </Tag>
        ),
        filters: ACTION_TYPES.map((type) => ({
          text: t(`actions.${type}`),
          value: type,
        })),
        onFilter: (value, record) => record.action === value,
      },
      {
        title: t('columns.entity'),
        dataIndex: 'entityType',
        key: 'entityType',
        width: 140,
        render: (value: AuditEntityType, record: AuditLogEntry) => (
          <div className="flex flex-col">
            <Text className="text-stone-700 capitalize">{t(`entities.${value}`)}</Text>
            {record.entityName && (
              <Text type="secondary" className="text-xs truncate max-w-[120px]">
                {record.entityName}
              </Text>
            )}
          </div>
        ),
        filters: ENTITY_TYPES.map((type) => ({
          text: t(`entities.${type}`),
          value: type,
        })),
        onFilter: (value, record) => record.entityType === value,
      },
      {
        title: t('columns.description'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (value: string) => (
          <Tooltip title={value}>
            <Text className="text-stone-600">{value}</Text>
          </Tooltip>
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 48,
        fixed: isRtl ? 'left' : 'right',
        render: () => (
          <Tooltip title={t('viewDetails')}>
            <Button type="text" size="small" icon={<InfoCircleOutlined />} />
          </Tooltip>
        ),
      },
    ],
    [t, locale, isRtl]
  );

  // ==========================================================================
  // PAGINATION CONFIG
  // ==========================================================================

  const paginationConfig: ServerPaginationConfig = {
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: filteredLogs.length,
    onChange: handlePaginationChange,
    pageSizeOptions: compact ? [5, 10] : [10, 20, 50, 100],
    showSizeChanger: !compact,
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Paginated data
  const paginatedLogs = useMemo(() => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    return filteredLogs.slice(startIndex, startIndex + pagination.pageSize);
  }, [filteredLogs, pagination.current, pagination.pageSize]);

  // Check if any filters are active
  const hasActiveFilters =
    filters.userId ||
    filters.actionType ||
    filters.entityType ||
    filters.search ||
    filters.dateRange;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header */}
      {!compact && (
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <div>
            <Title level={4} className="!mb-1">
              {t('title')}
            </Title>
            <Text type="secondary">{t('subtitle')}</Text>
          </div>
          <Space>
            {/* Auto-refresh toggle */}
            <Tooltip title={t('autoRefresh')}>
              <Space>
                <Switch size="small" checked={autoRefresh} onChange={handleAutoRefreshToggle} />
                <Text type="secondary" className="text-sm">
                  {t('autoRefresh')}
                </Text>
              </Space>
            </Tooltip>
            {/* Refresh button */}
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading}>
              {tCommon('actions.refresh')}
            </Button>
            {/* Export button */}
            {canExport && (
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                {tCommon('actions.export')}
              </Button>
            )}
          </Space>
        </Flex>
      )}

      {/* Filters */}
      <Card size="small" className="border-stone-200 bg-stone-50">
        <Flex justify="space-between" align="start" wrap="wrap" gap={12}>
          <Flex gap={12} wrap="wrap" className="flex-1">
            {/* Search */}
            <Search
              placeholder={t('filters.searchPlaceholder')}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ width: 200 }}
              allowClear
            />

            {/* Date Range */}
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange('dateRange', dates)}
              placeholder={[t('filters.startDate'), t('filters.endDate')]}
              style={{ width: 240 }}
            />

            {/* User Filter */}
            {!preFilterUserId && (
              <Select
                placeholder={t('filters.user')}
                value={filters.userId}
                onChange={(value) => handleFilterChange('userId', value)}
                options={MOCK_USERS}
                allowClear
                style={{ width: 160 }}
              />
            )}

            {/* Action Type Filter */}
            <Select
              placeholder={t('filters.actionType')}
              value={filters.actionType}
              onChange={(value) => handleFilterChange('actionType', value)}
              options={ACTION_TYPES.map((type) => ({
                value: type,
                label: t(`actions.${type}`),
              }))}
              allowClear
              style={{ width: 140 }}
            />

            {/* Entity Type Filter */}
            {!preFilterEntityType && (
              <Select
                placeholder={t('filters.entityType')}
                value={filters.entityType}
                onChange={(value) => handleFilterChange('entityType', value)}
                options={ENTITY_TYPES.map((type) => ({
                  value: type,
                  label: t(`entities.${type}`),
                }))}
                allowClear
                style={{ width: 160 }}
              />
            )}
          </Flex>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button type="link" onClick={handleClearFilters} className="text-stone-500">
              {tCommon('actions.clear')}
            </Button>
          )}
        </Flex>
      </Card>

      {/* Table */}
      {isLoading && paginatedLogs.length === 0 ? (
        <TableSkeleton rows={pagination.pageSize} />
      ) : paginatedLogs.length === 0 ? (
        <Card className="border-stone-200">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={hasActiveFilters ? t('noResultsWithFilters') : t('noResults')}
          />
        </Card>
      ) : (
        <Table<AuditLogEntry>
          dataSource={paginatedLogs}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={paginationConfig}
          scroll={{ x: compact ? 600 : 1000 }}
          size={compact ? 'small' : 'middle'}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            className: 'cursor-pointer hover:bg-amber-50 transition-colors',
          })}
          className={cn(
            '[&_.ant-table-thead_th]:bg-stone-50',
            '[&_.ant-table-thead_th]:text-stone-600',
            '[&_.ant-table-thead_th]:font-medium',
            '[&_.ant-table-thead_th]:border-b-stone-200'
          )}
        />
      )}

      {/* Detail Drawer */}
      <AuditLogDetailDrawer entry={selectedEntry} open={drawerOpen} onClose={handleDrawerClose} />
    </div>
  );
}

export default AuditLogViewer;
