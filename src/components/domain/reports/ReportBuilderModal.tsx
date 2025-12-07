'use client';

/**
 * ReportBuilderModal Component
 *
 * Modal for creating and editing report configurations.
 * Supports template selection, date ranges, and scheduling.
 *
 * @module components/domain/reports/ReportBuilderModal
 */

import React, { useEffect, useMemo } from 'react';

import {
  FileTextOutlined,
  CalendarOutlined,
  FilterOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Card,
  Typography,
  Divider,
  message,
  Skeleton,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  useReportTemplates,
  useCreateReport,
  useUpdateReport,
  type Report,
  type ReportTemplate,
} from '@/lib/hooks/data/useReports';

const { Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

// =============================================================================
// TYPES
// =============================================================================

export interface ReportBuilderModalProps {
  open: boolean;
  onClose: () => void;
  report?: Report | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const REPORT_TYPES = [
  { value: 'sales', label: 'Sales' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'customers', label: 'Customers' },
  { value: 'suppliers', label: 'Suppliers' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'custom', label: 'Custom' },
];

const SCHEDULE_OPTIONS = [
  { value: 'none', label: 'Manual (No Schedule)' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function ReportBuilderModal({
  open,
  onClose,
  report,
}: ReportBuilderModalProps): React.JSX.Element {
  const t = useTranslations('reports.builder');
  const tCommon = useTranslations('common');
  const [form] = Form.useForm();

  // Data fetching
  const { templates, isLoading: templatesLoading } = useReportTemplates({ enabled: open });
  const createReport = useCreateReport();
  const updateReport = useUpdateReport();

  const isEditing = !!report;
  const isSubmitting = createReport.isPending || updateReport.isPending;

  // Filter templates by selected type
  const selectedType = Form.useWatch('type', form);
  const filteredTemplates = useMemo(() => {
    if (!templates || !selectedType) {
      return templates ?? [];
    }
    return templates.filter((template) => template.type === selectedType);
  }, [templates, selectedType]);

  // Reset form when modal opens/closes or report changes
  useEffect(() => {
    if (open) {
      if (report) {
        form.setFieldsValue({
          name: report.name,
          description: report.description,
          type: report.type,
          template_id: report.template_id,
          date_range:
            report.date_range_start && report.date_range_end
              ? [dayjs(report.date_range_start), dayjs(report.date_range_end)]
              : undefined,
          schedule: report.schedule,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, report, form]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const dateRange = values.date_range as [dayjs.Dayjs, dayjs.Dayjs] | undefined;

      const reportData = {
        name: values.name as string,
        description: values.description as string | undefined,
        type: values.type as Report['type'],
        template_id: values.template_id as string | undefined,
        filters: {},
        date_range_start: dateRange?.[0]?.toISOString(),
        date_range_end: dateRange?.[1]?.toISOString(),
        schedule: (values.schedule as Report['schedule']) || 'none',
      };

      let result;
      if (isEditing && report) {
        result = await updateReport.mutateAsync({
          id: report.id_report,
          data: reportData,
        });
      } else {
        result = await createReport.mutateAsync(reportData);
      }

      if (result.success) {
        message.success(isEditing ? t('updateSuccess') : t('createSuccess'));
        onClose();
      } else {
        message.error(result.error || (isEditing ? t('updateError') : t('createError')));
      }
    } catch {
      message.error(isEditing ? t('updateError') : t('createError'));
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates?.find((tmpl: ReportTemplate) => tmpl.id === templateId);
    if (template) {
      form.setFieldValue('type', template.type);
      if (!form.getFieldValue('name')) {
        form.setFieldValue('name', template.name);
      }
      if (!form.getFieldValue('description')) {
        form.setFieldValue('description', template.description);
      }
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <FileTextOutlined className="text-lg text-amber-600" />
          </div>
          <div>
            <Text strong className="text-lg block">
              {isEditing ? t('editTitle') : t('createTitle')}
            </Text>
            <Text type="secondary" className="text-sm">
              {isEditing ? t('editSubtitle') : t('createSubtitle')}
            </Text>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {tCommon('actions.cancel')}
        </Button>,
        <Button key="submit" type="primary" loading={isSubmitting} onClick={() => form.submit()}>
          {isEditing ? tCommon('actions.save') : t('createButton')}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-6">
        {/* Template Selection */}
        <Card className="mb-4 border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2 mb-3">
            <FilterOutlined className="text-amber-600" />
            <Text strong>{t('templateSection')}</Text>
          </div>

          {templatesLoading ? (
            <Skeleton.Input active block />
          ) : (
            <Form.Item name="template_id" className="mb-0">
              <Select
                placeholder={t('selectTemplate')}
                allowClear
                onChange={handleTemplateSelect}
                options={filteredTemplates?.map((template) => ({
                  value: template.id,
                  label: (
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-stone-500">{template.description}</div>
                    </div>
                  ),
                }))}
              />
            </Form.Item>
          )}
        </Card>

        <Divider className="my-4" />

        {/* Basic Info */}
        <Form.Item
          name="name"
          label={t('reportName')}
          rules={[{ required: true, message: t('nameRequired') }]}
        >
          <Input placeholder={t('namePlaceholder')} maxLength={100} />
        </Form.Item>

        <Form.Item name="description" label={t('description')}>
          <TextArea placeholder={t('descriptionPlaceholder')} rows={2} maxLength={500} />
        </Form.Item>

        <Form.Item
          name="type"
          label={t('reportType')}
          rules={[{ required: true, message: t('typeRequired') }]}
        >
          <Select
            placeholder={t('selectType')}
            options={REPORT_TYPES.map((type) => ({
              value: type.value,
              label: t(`types.${type.value}`),
            }))}
          />
        </Form.Item>

        {/* Date Range */}
        <Form.Item
          name="date_range"
          label={
            <div className="flex items-center gap-2">
              <CalendarOutlined />
              <span>{t('dateRange')}</span>
            </div>
          }
        >
          <RangePicker
            className="w-full"
            presets={[
              { label: t('presets.last7Days'), value: [dayjs().subtract(7, 'day'), dayjs()] },
              { label: t('presets.last30Days'), value: [dayjs().subtract(30, 'day'), dayjs()] },
              { label: t('presets.thisMonth'), value: [dayjs().startOf('month'), dayjs()] },
              {
                label: t('presets.lastMonth'),
                value: [
                  dayjs().subtract(1, 'month').startOf('month'),
                  dayjs().subtract(1, 'month').endOf('month'),
                ],
              },
              { label: t('presets.thisYear'), value: [dayjs().startOf('year'), dayjs()] },
            ]}
          />
        </Form.Item>

        {/* Schedule */}
        <Form.Item
          name="schedule"
          label={
            <div className="flex items-center gap-2">
              <ClockCircleOutlined />
              <span>{t('schedule')}</span>
            </div>
          }
          initialValue="none"
        >
          <Select
            options={SCHEDULE_OPTIONS.map((opt) => ({
              value: opt.value,
              label: t(`schedules.${opt.value}`),
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default ReportBuilderModal;
