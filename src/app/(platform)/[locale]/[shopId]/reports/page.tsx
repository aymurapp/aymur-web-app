'use client';

/**
 * Reports Page
 *
 * Main reports management page with list view and report generation.
 *
 * @module app/(platform)/[locale]/[shopId]/reports/page
 */

import React, { useState, useCallback } from 'react';

import {
  FileTextOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import {
  Card,
  Tabs,
  Table,
  Input,
  Space,
  Tag,
  Tooltip,
  Dropdown,
  Modal,
  message,
  Skeleton,
} from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { ReportBuilderModal } from '@/components/domain/reports/ReportBuilderModal';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  useReports,
  useDeleteReport,
  useGenerateReport,
  type Report,
} from '@/lib/hooks/data/useReports';
import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';

import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;

// =============================================================================
// CONSTANTS
// =============================================================================

const TYPE_STYLES: Record<string, { color: string; bg: string }> = {
  sales: { color: 'text-emerald-700', bg: 'bg-emerald-50' },
  inventory: { color: 'text-blue-700', bg: 'bg-blue-50' },
  customers: { color: 'text-purple-700', bg: 'bg-purple-50' },
  suppliers: { color: 'text-orange-700', bg: 'bg-orange-50' },
  expenses: { color: 'text-red-700', bg: 'bg-red-50' },
  custom: { color: 'text-stone-700', bg: 'bg-stone-50' },
};

const SCHEDULE_LABELS: Record<string, string> = {
  none: 'Manual',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function ReportsPage() {
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  // State
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);

  // Data fetching
  const filters = {
    type: activeTab !== 'all' ? (activeTab as Report['type']) : undefined,
    search: searchQuery || undefined,
  };

  const { reports, isLoading } = useReports(filters);
  const deleteReport = useDeleteReport();
  const generateReport = useGenerateReport();

  // Permission checks
  const canCreate = can('reports.create');
  const canEdit = can('reports.edit');
  const canDelete = can('reports.delete');
  const canGenerate = can('reports.generate');

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleCreateReport = useCallback(() => {
    setEditingReport(null);
    setIsBuilderOpen(true);
  }, []);

  const handleEditReport = useCallback((report: Report) => {
    setEditingReport(report);
    setIsBuilderOpen(true);
  }, []);

  const handleDeleteReport = useCallback(
    (report: Report) => {
      Modal.confirm({
        title: t('deleteConfirmTitle'),
        content: t('deleteConfirmContent', { name: report.name }),
        okText: tCommon('actions.delete'),
        okType: 'danger',
        cancelText: tCommon('actions.cancel'),
        onOk: async () => {
          const result = await deleteReport.mutateAsync(report.id_report);
          if (result.success) {
            message.success(t('deleteSuccess'));
          } else {
            message.error(result.error || t('deleteError'));
          }
        },
      });
    },
    [t, tCommon, deleteReport]
  );

  const handleGenerateReport = useCallback(
    async (report: Report, format: 'json' | 'pdf' | 'excel') => {
      const result = await generateReport.mutateAsync({
        reportId: report.id_report,
        format,
      });

      if (result.success && result.data) {
        message.success(t('generateSuccess'));
        if (format === 'json') {
          const blob = new Blob([JSON.stringify(result.data, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${report.name}-${new Date().toISOString()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        const errorMsg = 'error' in result ? result.error : undefined;
        message.error(errorMsg || t('generateError'));
      }
    },
    [t, generateReport]
  );

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================

  const columns: ColumnsType<Report> = [
    {
      title: t('columns.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Report) => (
        <div>
          <div className="font-medium text-stone-900">{name}</div>
          {record.description && (
            <div className="text-xs text-stone-500 truncate max-w-xs">{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: t('columns.type'),
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: Report['type']) => {
        const style = TYPE_STYLES[type] ??
          TYPE_STYLES.custom ?? { color: 'text-stone-700', bg: 'bg-stone-50' };
        return <Tag className={cn('border-0', style.bg, style.color)}>{t(`types.${type}`)}</Tag>;
      },
    },
    {
      title: t('columns.schedule'),
      dataIndex: 'schedule',
      key: 'schedule',
      width: 100,
      render: (schedule: string) => (
        <div className="flex items-center gap-1 text-stone-600">
          <ClockCircleOutlined className="text-xs" />
          <span className="text-sm">{SCHEDULE_LABELS[schedule] || schedule}</span>
        </div>
      ),
    },
    {
      title: t('columns.lastGenerated'),
      dataIndex: 'last_generated',
      key: 'last_generated',
      width: 160,
      render: (date: string | null) => (
        <div className="flex items-center gap-1 text-stone-600">
          <CalendarOutlined className="text-xs" />
          <span className="text-sm">
            {date ? new Date(date).toLocaleDateString() : t('neverGenerated')}
          </span>
        </div>
      ),
    },
    {
      title: t('columns.actions'),
      key: 'actions',
      width: 150,
      render: (_: unknown, record: Report) => (
        <Space>
          {canGenerate && (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'json',
                    label: 'JSON',
                    onClick: () => handleGenerateReport(record, 'json'),
                  },
                  { key: 'pdf', label: 'PDF', onClick: () => handleGenerateReport(record, 'pdf') },
                  {
                    key: 'excel',
                    label: 'Excel',
                    onClick: () => handleGenerateReport(record, 'excel'),
                  },
                ],
              }}
              trigger={['click']}
            >
              <Tooltip title={t('generate')}>
                <Button
                  type="text"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  loading={generateReport.isPending}
                />
              </Tooltip>
            </Dropdown>
          )}
          {canEdit && (
            <Tooltip title={tCommon('actions.edit')}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditReport(record)}
              />
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title={tCommon('actions.delete')}>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteReport(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // Tab items
  const tabItems = [
    { key: 'all', label: t('tabs.all') },
    { key: 'sales', label: t('tabs.sales') },
    { key: 'inventory', label: t('tabs.inventory') },
    { key: 'customers', label: t('tabs.customers') },
    { key: 'suppliers', label: t('tabs.suppliers') },
    { key: 'expenses', label: t('tabs.expenses') },
    { key: 'custom', label: t('tabs.custom') },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title={t('title')} subtitle={t('subtitle')}>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateReport}>
            {t('createReport')}
          </Button>
        )}
      </PageHeader>

      {/* Main Content */}
      <Card className="border border-stone-200">
        {/* Tabs and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} className="mb-0" />
          <Search
            placeholder={t('searchPlaceholder')}
            allowClear
            onSearch={handleSearch}
            onChange={(e) => !e.target.value && setSearchQuery('')}
            style={{ width: 250 }}
          />
        </div>

        {/* Reports Table or Empty State */}
        {(reports ?? []).length === 0 ? (
          <EmptyState
            icon={<FileTextOutlined />}
            title={searchQuery ? t('noSearchResults') : t('noReports')}
            description={searchQuery ? t('noSearchResultsDescription') : t('noReportsDescription')}
            action={
              !searchQuery && canCreate
                ? {
                    label: t('createFirstReport'),
                    onClick: handleCreateReport,
                    icon: <PlusOutlined />,
                    type: 'primary',
                  }
                : undefined
            }
          />
        ) : (
          <Table
            dataSource={reports}
            columns={columns}
            rowKey="id_report"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => t('totalReports', { count: total }),
            }}
          />
        )}
      </Card>

      {/* Report Builder Modal */}
      <ReportBuilderModal
        open={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingReport(null);
        }}
        report={editingReport}
      />
    </div>
  );
}
