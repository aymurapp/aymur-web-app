'use client';

/**
 * ExpenseApprovalModal Component
 *
 * Modal for viewing expense details and approving/rejecting expenses.
 * Shows expense information, receipt preview, and approval actions.
 *
 * Features:
 * - Display expense details
 * - Receipt preview if uploaded
 * - Approve button (role-based: manager, admin, owner)
 * - Reject button with reason field
 * - Comments field
 * - Shows submitter info
 *
 * @module components/domain/expenses/ExpenseApprovalModal
 */

import React, { useState, useCallback } from 'react';

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  TagOutlined,
  ShopOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Modal, Descriptions, Tag, Space, Input, Typography, Divider, Alert } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import type { ExpenseWithCategory } from '@/lib/hooks/data/useExpenses';
import { usePermissions } from '@/lib/hooks/permissions';

const { TextArea } = Input;
const { Text, Title } = Typography;

// =============================================================================
// TYPES
// =============================================================================

export interface ExpenseApprovalModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Expense data to display */
  expense: ExpenseWithCategory;
  /** Callback when expense is approved */
  onApprove: (expenseId: string) => Promise<void>;
  /** Callback when expense is rejected */
  onReject: (expenseId: string, reason: string) => Promise<void>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get tag color for approval status
 */
function getApprovalStatusColor(status: string | null): string {
  switch (status) {
    case 'approved':
      return 'green';
    case 'rejected':
      return 'red';
    case 'pending':
    default:
      return 'gold';
  }
}

/**
 * Get tag color for payment status
 */
function getPaymentStatusColor(status: string | null): string {
  switch (status) {
    case 'paid':
      return 'green';
    case 'partial':
      return 'blue';
    case 'unpaid':
    default:
      return 'default';
  }
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date string
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format datetime string
 */
function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ExpenseApprovalModal Component
 *
 * Modal for reviewing and approving/rejecting expenses.
 * Displays detailed expense information and approval workflow.
 */
export function ExpenseApprovalModal({
  open,
  onClose,
  expense,
  onApprove,
  onReject,
}: ExpenseApprovalModalProps): React.JSX.Element {
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');
  const { can } = usePermissions();

  // State
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const canApprove = can('expenses.approve');
  const isPending = expense.approval_status === 'pending';

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleClose = useCallback(() => {
    setRejectMode(false);
    setRejectReason('');
    onClose();
  }, [onClose]);

  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    try {
      await onApprove(expense.id_expense);
      handleClose();
    } finally {
      setIsApproving(false);
    }
  }, [expense.id_expense, onApprove, handleClose]);

  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) {
      return;
    }

    setIsRejecting(true);
    try {
      await onReject(expense.id_expense, rejectReason.trim());
      handleClose();
    } finally {
      setIsRejecting(false);
    }
  }, [expense.id_expense, rejectReason, onReject, handleClose]);

  const handleStartReject = useCallback(() => {
    setRejectMode(true);
  }, []);

  const handleCancelReject = useCallback(() => {
    setRejectMode(false);
    setRejectReason('');
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <DollarOutlined className="text-amber-500 text-xl" />
          <span>{t('expenseDetails')}</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={640}
      footer={null}
      destroyOnClose
    >
      {/* Status Banner */}
      {expense.approval_status === 'approved' && (
        <Alert
          message={tCommon('status.approved')}
          description={
            expense.approved_at
              ? `${t('approvedBy')}: ${formatDateTime(expense.approved_at)}`
              : undefined
          }
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          className="mb-4"
        />
      )}

      {expense.approval_status === 'rejected' && (
        <Alert
          message={tCommon('status.rejected')}
          description={expense.rejection_reason || undefined}
          type="error"
          showIcon
          icon={<CloseCircleOutlined />}
          className="mb-4"
        />
      )}

      {/* Expense Details */}
      <Descriptions column={2} size="small" bordered className="expense-details">
        <Descriptions.Item label={t('description')} span={2}>
          <Text strong>{expense.description}</Text>
          {expense.expense_number && (
            <Text type="secondary" className="block text-xs mt-1">
              {expense.expense_number}
            </Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item
          label={
            <Space>
              <DollarOutlined />
              {t('amount')}
            </Space>
          }
        >
          <Text strong className="text-lg text-amber-600">
            {formatCurrency(expense.amount)}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item
          label={
            <Space>
              <CalendarOutlined />
              {t('date')}
            </Space>
          }
        >
          {formatDate(expense.expense_date)}
        </Descriptions.Item>

        <Descriptions.Item
          label={
            <Space>
              <TagOutlined />
              {t('category')}
            </Space>
          }
        >
          <Tag className="border-amber-200 bg-amber-50 text-amber-700">
            {expense.expense_categories?.category_name || '-'}
          </Tag>
        </Descriptions.Item>

        <Descriptions.Item
          label={
            <Space>
              <ShopOutlined />
              {t('vendor')}
            </Space>
          }
        >
          {expense.vendor_name || '-'}
        </Descriptions.Item>

        <Descriptions.Item label={t('status.paid')}>
          <Tag color={getPaymentStatusColor(expense.payment_status)}>
            {expense.payment_status === 'paid'
              ? t('status.paid')
              : expense.payment_status === 'partial'
                ? tCommon('status.processing')
                : tCommon('status.pending')}
          </Tag>
        </Descriptions.Item>

        <Descriptions.Item label={t('approvedBy').replace(' By', '')} span={2}>
          <Tag color={getApprovalStatusColor(expense.approval_status)}>
            {tCommon(`status.${expense.approval_status || 'pending'}`)}
          </Tag>
        </Descriptions.Item>

        {expense.notes && (
          <Descriptions.Item label={tCommon('labels.notes')} span={2}>
            <Text className="whitespace-pre-wrap">{expense.notes}</Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* Submission Info */}
      <Divider className="my-4" />
      <div className="text-sm text-stone-500 flex items-center gap-2">
        <UserOutlined />
        <span>
          {tCommon('labels.createdAt')}: {formatDateTime(expense.created_at)}
        </span>
      </div>

      {/* Approval Actions */}
      {isPending && canApprove && (
        <>
          <Divider className="my-4" />

          {!rejectMode ? (
            <div className="flex justify-end gap-3">
              <Button
                icon={<CloseCircleOutlined />}
                onClick={handleStartReject}
                danger
                disabled={isApproving}
              >
                {tCommon('status.rejected').replace('ed', '')}
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleApprove}
                loading={isApproving}
                className="bg-emerald-500 hover:bg-emerald-600 border-emerald-500"
              >
                {tCommon('status.approved').replace('ed', 'e')}
              </Button>
            </div>
          ) : (
            <div className="rejection-form bg-red-50 p-4 rounded-lg border border-red-200">
              <Title level={5} className="text-red-600 mb-3 flex items-center gap-2">
                <CloseCircleOutlined />
                Rejection Reason
              </Title>

              <TextArea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                rows={3}
                className="mb-3"
              />

              <div className="flex justify-end gap-3">
                <Button onClick={handleCancelReject} disabled={isRejecting}>
                  {tCommon('actions.cancel')}
                </Button>
                <Button
                  type="primary"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={handleReject}
                  loading={isRejecting}
                  disabled={!rejectReason.trim()}
                >
                  {tCommon('actions.confirm')} Rejection
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* No Permission Info */}
      {isPending && !canApprove && (
        <>
          <Divider className="my-4" />
          <Alert
            message={t('status.pending')}
            description="This expense is awaiting approval from a manager or administrator."
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
          />
        </>
      )}
    </Modal>
  );
}

export default ExpenseApprovalModal;
