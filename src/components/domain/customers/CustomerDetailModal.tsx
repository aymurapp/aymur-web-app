'use client';

/**
 * CustomerDetailModal Component
 *
 * A comprehensive modal for displaying full customer details including:
 * - Overview: Contact info, address, client type, VIP status
 * - Financial: Balance, purchases, payments, credit limit
 * - Transactions: Full transaction history with pagination/filters
 * - Documents: ID card images with preview
 *
 * Features:
 * - Permission-based action buttons (Edit, Print, Create Sale)
 * - Tabbed interface using Ant Design Tabs
 * - RTL support with logical CSS properties
 * - Internationalization with next-intl
 *
 * @example
 * ```tsx
 * <CustomerDetailModal
 *   customerId={selectedCustomerId}
 *   open={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   onEdit={(customer) => handleEdit(customer)}
 *   onCreateSale={(customer) => handleCreateSale(customer)}
 * />
 * ```
 *
 * @module components/domain/customers/CustomerDetailModal
 */

import React, { useState, useMemo, useCallback } from 'react';

import {
  UserOutlined,
  BankOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  CrownOutlined,
  EditOutlined,
  PrinterOutlined,
  ShoppingCartOutlined,
  IdcardOutlined,
  WalletOutlined,
  HistoryOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  FilterOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import {
  Modal,
  Tabs,
  Avatar,
  Tag,
  Typography,
  Descriptions,
  Divider,
  Space,
  Skeleton,
  Image,
  DatePicker,
  Select,
  Statistic,
  Row,
  Col,
} from 'antd';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/data/EmptyState';
import { StatCard, StatCardGrid } from '@/components/common/data/StatCard';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { useCustomer } from '@/lib/hooks/data/useCustomer';
import type { CustomerWithDetails } from '@/lib/hooks/data/useCustomer';
import {
  useCustomerTransactions,
  useCustomerTransactionSummary,
  type TransactionType,
  type CustomerTransactionWithDetails,
} from '@/lib/hooks/data/useCustomerTransactions';
import { usePermissions, PERMISSION_KEYS } from '@/lib/hooks/permissions';
import { useShop } from '@/lib/hooks/shop';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDateTime, formatPhone } from '@/lib/utils/format';

import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the CustomerDetailModal component
 */
export interface CustomerDetailModalProps {
  /** Customer ID to display details for */
  customerId: string | null | undefined;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback to edit customer (requires customers.manage permission) */
  onEdit?: (customer: CustomerWithDetails) => void;
  /** Callback to print statement (requires reports.basic permission) */
  onPrintStatement?: (customer: CustomerWithDetails) => void;
  /** Callback to create sale for customer (requires sales.create permission) */
  onCreateSale?: (customer: CustomerWithDetails) => void;
  /** Default active tab */
  defaultTab?: 'overview' | 'financial' | 'transactions' | 'documents';
}

/**
 * Extended customer type with additional UI fields not in database
 * is_vip and tax_id are now in the base Customer type
 */
interface ExtendedCustomer extends CustomerWithDetails {
  is_active?: boolean;
  credit_limit?: number;
  id_card_front?: string | null;
  id_card_back?: string | null;
}

/**
 * Tab key type
 */
type TabKey = 'overview' | 'financial' | 'transactions' | 'documents';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets balance color configuration based on value
 */
function getBalanceConfig(balance: number): {
  color: string;
  textColor: string;
  label: string;
} {
  if (balance > 0) {
    return {
      color: 'text-red-600',
      textColor: 'red',
      label: 'owes', // Customer owes shop
    };
  }
  if (balance < 0) {
    return {
      color: 'text-emerald-600',
      textColor: 'green',
      label: 'credit', // Shop owes customer
    };
  }
  return {
    color: 'text-stone-500',
    textColor: 'default',
    label: 'settled',
  };
}

/**
 * Gets financial status icon and color
 */
function getFinancialStatusConfig(status: string | null): {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case 'good':
      return {
        icon: <CheckCircleOutlined />,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
      };
    case 'warning':
      return {
        icon: <WarningOutlined />,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
      };
    case 'critical':
      return {
        icon: <ExclamationCircleOutlined />,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      };
    default:
      return {
        icon: <CloseCircleOutlined />,
        color: 'text-stone-500',
        bgColor: 'bg-stone-50',
      };
  }
}

/**
 * Gets transaction type configuration
 */
function getTransactionTypeConfig(type: string): {
  color: string;
  label: string;
} {
  switch (type) {
    case 'sale':
      return { color: 'blue', label: 'sale' };
    case 'payment':
      return { color: 'green', label: 'payment' };
    case 'refund':
      return { color: 'orange', label: 'refund' };
    case 'adjustment':
      return { color: 'purple', label: 'adjustment' };
    case 'opening_balance':
      return { color: 'default', label: 'openingBalance' };
    case 'return':
      return { color: 'red', label: 'return' };
    default:
      return { color: 'default', label: type };
  }
}

/**
 * Parses address string into components
 */
function parseAddress(address: string | null): {
  street: string;
  area: string;
  city: string;
  postalCode: string;
} {
  if (!address) {
    return { street: '', area: '', city: '', postalCode: '' };
  }

  const parts = address.split('|').map((p) => p.trim());
  return {
    street: parts[0] || '',
    area: parts[1] || '',
    city: parts[2] || '',
    postalCode: parts[3] || '',
  };
}

/**
 * Gets initials from customer name
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '??';
  }
  if (words.length === 1) {
    const firstWord = words[0];
    return firstWord ? firstWord.substring(0, 2).toUpperCase() : '??';
  }
  const firstChar = words[0]?.[0] ?? '?';
  const lastChar = words[words.length - 1]?.[0] ?? '?';
  return (firstChar + lastChar).toUpperCase();
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Customer Overview Tab
 */
interface OverviewTabProps {
  customer: ExtendedCustomer;
  currency: string;
}

function OverviewTab({ customer, currency }: OverviewTabProps) {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');

  const parsedAddress = useMemo(() => parseAddress(customer.address), [customer.address]);
  const balanceConfig = useMemo(
    () => getBalanceConfig(customer.current_balance),
    [customer.current_balance]
  );
  const financialStatus = useMemo(
    () => getFinancialStatusConfig(customer.financial_status),
    [customer.financial_status]
  );
  const formattedPhone = useMemo(
    () => (customer.phone ? formatPhone(customer.phone) : null),
    [customer.phone]
  );

  const isVip = customer.is_vip ?? false;
  const isCollaboration = customer.client_type === 'collaboration';

  return (
    <div className="space-y-6">
      {/* Customer Header */}
      <div className="flex items-start gap-4">
        <Avatar
          size={80}
          icon={
            isCollaboration ? (
              <BankOutlined />
            ) : customer.client_type === 'vip' ? (
              <CrownOutlined />
            ) : (
              <UserOutlined />
            )
          }
          className={cn(
            'flex-shrink-0 text-2xl',
            isCollaboration
              ? 'bg-blue-500'
              : customer.client_type === 'vip'
                ? 'bg-amber-500'
                : 'bg-stone-400'
          )}
        >
          {getInitials(customer.full_name)}
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Title level={4} className="!mb-0 !text-stone-900">
              {customer.full_name}
            </Title>
            {isVip && (
              <Tag icon={<CrownOutlined />} color="gold">
                {t('segments.vip')}
              </Tag>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {/* Client Type */}
            <Tag
              icon={
                isCollaboration ? (
                  <BankOutlined />
                ) : customer.client_type === 'vip' ? (
                  <CrownOutlined />
                ) : (
                  <UserOutlined />
                )
              }
              color={isCollaboration ? 'blue' : customer.client_type === 'vip' ? 'gold' : 'default'}
            >
              {t(`clientTypes.${customer.client_type || 'walk-in'}`)}
            </Tag>

            {/* Financial Status */}
            {customer.financial_status && (
              <div
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  financialStatus.bgColor,
                  financialStatus.color
                )}
              >
                {financialStatus.icon}
                <span className="capitalize">{customer.financial_status}</span>
              </div>
            )}

            {/* Status Badge */}
            {customer.is_active !== false ? (
              <Tag color="success">{tCommon('status.active')}</Tag>
            ) : (
              <Tag color="default">{tCommon('status.inactive')}</Tag>
            )}
          </div>
        </div>

        {/* Balance Display */}
        <div className="text-end flex-shrink-0">
          <Text type="secondary" className="text-xs block mb-1">
            {t('currentBalance')}
          </Text>
          <Text strong className={cn('text-xl', balanceConfig.color)}>
            {customer.current_balance === 0 ? (
              formatCurrency(0, currency)
            ) : customer.current_balance > 0 ? (
              <>+{formatCurrency(customer.current_balance, currency)}</>
            ) : (
              <>-{formatCurrency(Math.abs(customer.current_balance), currency)}</>
            )}
          </Text>
          {customer.current_balance !== 0 && (
            <Text type="secondary" className="text-xs block">
              {customer.current_balance > 0
                ? t('creditAccount.balance')
                : t('creditAccount.available')}
            </Text>
          )}
        </div>
      </div>

      <Divider className="!my-4" />

      {/* Contact Information */}
      <Descriptions
        title={t('sections.contactInfo')}
        column={{ xs: 1, sm: 2 }}
        size="small"
        labelStyle={{ fontWeight: 500, color: '#78716c' }}
      >
        <Descriptions.Item
          label={
            <span className="flex items-center gap-2">
              <PhoneOutlined />
              {t('phone')}
            </span>
          }
        >
          {formattedPhone ? (
            <a
              href={`tel:${customer.phone}`}
              className="text-amber-600 hover:text-amber-700"
              dir="ltr"
            >
              {formattedPhone}
            </a>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item
          label={
            <span className="flex items-center gap-2">
              <MailOutlined />
              {t('email')}
            </span>
          }
        >
          {customer.email ? (
            <a href={`mailto:${customer.email}`} className="text-amber-600 hover:text-amber-700">
              {customer.email}
            </a>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>

        {customer.tax_id && (
          <Descriptions.Item label={t('taxId')}>
            <Text code>{customer.tax_id}</Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* Address Information */}
      {customer.address && (
        <>
          <Divider className="!my-4" />
          <Descriptions
            title={
              <span className="flex items-center gap-2">
                <EnvironmentOutlined />
                {t('sections.address')}
              </span>
            }
            column={1}
            size="small"
            labelStyle={{ fontWeight: 500, color: '#78716c' }}
          >
            {parsedAddress.street && (
              <Descriptions.Item label={t('streetAddress')}>
                {parsedAddress.street}
              </Descriptions.Item>
            )}
            {parsedAddress.area && (
              <Descriptions.Item label={t('area')}>{parsedAddress.area}</Descriptions.Item>
            )}
            {parsedAddress.city && (
              <Descriptions.Item label={t('city')}>{parsedAddress.city}</Descriptions.Item>
            )}
            {parsedAddress.postalCode && (
              <Descriptions.Item label={tCommon('labels.postalCode')}>
                <Text code dir="ltr">
                  {parsedAddress.postalCode}
                </Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </>
      )}

      {/* Notes */}
      {customer.notes && (
        <>
          <Divider className="!my-4" />
          <div>
            <Title level={5} className="!mb-2 !text-stone-700">
              {t('notes')}
            </Title>
            <Text className="text-stone-600 whitespace-pre-wrap">{customer.notes}</Text>
          </div>
        </>
      )}

      {/* Audit Info */}
      <Divider className="!my-4" />
      <div className="text-xs text-stone-500 space-y-1">
        {customer.created_by_user && (
          <div>
            {tCommon('labels.createdBy')}: {customer.created_by_user.full_name}{' '}
            {customer.created_at && <>({formatDateTime(customer.created_at)})</>}
          </div>
        )}
        {customer.updated_by_user && customer.updated_at && (
          <div>
            {tCommon('labels.updatedBy')}: {customer.updated_by_user.full_name} (
            {formatDateTime(customer.updated_at)})
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Financial Summary Tab
 */
interface FinancialTabProps {
  customer: ExtendedCustomer;
  currency: string;
}

function FinancialTab({ customer, currency }: FinancialTabProps) {
  const t = useTranslations('customers');

  const { data: summary, isLoading: summaryLoading } = useCustomerTransactionSummary(
    customer.id_customer
  );

  const balanceConfig = useMemo(
    () => getBalanceConfig(customer.current_balance),
    [customer.current_balance]
  );

  if (summaryLoading) {
    return (
      <div className="space-y-4">
        <Skeleton active paragraph={{ rows: 2 }} />
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  const byType = summary?.byType ?? {};
  const totalPurchases = byType['sale']?.debits ?? 0;
  const totalPayments = byType['payment']?.credits ?? 0;
  const totalRefunds = byType['refund']?.credits ?? 0;
  const transactionCount = summary?.transactionCount ?? 0;
  const creditLimit = (customer as ExtendedCustomer).credit_limit ?? 0;
  const availableCredit = creditLimit > 0 ? Math.max(0, creditLimit - customer.current_balance) : 0;

  return (
    <div className="space-y-6">
      {/* Current Balance Highlight */}
      <div
        className={cn(
          'p-6 rounded-lg border-2 text-center',
          customer.current_balance > 0
            ? 'border-red-200 bg-red-50'
            : customer.current_balance < 0
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-stone-200 bg-stone-50'
        )}
      >
        <Text type="secondary" className="text-sm block mb-2">
          {t('currentBalance')}
        </Text>
        <div className={cn('text-3xl font-bold', balanceConfig.color)}>
          {customer.current_balance === 0 ? (
            formatCurrency(0, currency)
          ) : customer.current_balance > 0 ? (
            <>+{formatCurrency(customer.current_balance, currency)}</>
          ) : (
            <>-{formatCurrency(Math.abs(customer.current_balance), currency)}</>
          )}
        </div>
        <Text type="secondary" className="text-sm mt-1 block">
          {customer.current_balance > 0
            ? t('messages.customerOwes')
            : customer.current_balance < 0
              ? t('messages.shopOwes')
              : t('messages.settled')}
        </Text>
      </div>

      {/* Statistics Grid */}
      <StatCardGrid columns={2}>
        <StatCard
          title={t('financial.totalPurchases')}
          value={formatCurrency(totalPurchases, currency)}
          prefix={<ShoppingCartOutlined />}
        />
        <StatCard
          title={t('financial.totalPayments')}
          value={formatCurrency(totalPayments, currency)}
          prefix={<WalletOutlined />}
        />
        {totalRefunds > 0 && (
          <StatCard
            title={t('financial.totalRefunds')}
            value={formatCurrency(totalRefunds, currency)}
          />
        )}
        <StatCard title={t('financial.transactionCount')} value={transactionCount} />
      </StatCardGrid>

      {/* Credit Limit Section */}
      {creditLimit > 0 && (
        <>
          <Divider className="!my-4" />
          <div>
            <Title level={5} className="!mb-4 !text-stone-700">
              {t('creditAccount.title')}
            </Title>
            <Row gutter={[16, 16]}>
              <Col xs={12}>
                <Statistic
                  title={t('creditLimit')}
                  value={creditLimit}
                  prefix={currency}
                  valueStyle={{ color: '#1c1917' }}
                />
              </Col>
              <Col xs={12}>
                <Statistic
                  title={t('creditAccount.available')}
                  value={availableCredit}
                  prefix={currency}
                  valueStyle={{
                    color: availableCredit > 0 ? '#16a34a' : '#dc2626',
                  }}
                />
              </Col>
            </Row>
            {/* Credit Usage Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-stone-500 mb-1">
                <span>{t('financial.creditUsed')}</span>
                <span>
                  {Math.round((Math.max(0, customer.current_balance) / creditLimit) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    customer.current_balance >= creditLimit
                      ? 'bg-red-500'
                      : customer.current_balance >= creditLimit * 0.8
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  )}
                  style={{
                    width: `${Math.min(100, (Math.max(0, customer.current_balance) / creditLimit) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Transactions Tab
 */
interface TransactionsTabProps {
  customerId: string;
  currency: string;
}

function TransactionsTab({ customerId, currency }: TransactionsTabProps) {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [transactionType, setTransactionType] = useState<TransactionType | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const { transactions, totalCount, isLoading, totals } = useCustomerTransactions({
    customerId,
    page,
    pageSize,
    transactionType,
    fromDate: dateRange?.[0],
    toDate: dateRange?.[1],
  });

  // Table columns
  const columns: ColumnsType<CustomerTransactionWithDetails> = useMemo(
    () => [
      {
        title: tCommon('labels.date'),
        dataIndex: 'created_at',
        key: 'date',
        width: 160,
        render: (date: string) => <span className="text-sm">{formatDateTime(date)}</span>,
      },
      {
        title: t('transactions.type'),
        dataIndex: 'transaction_type',
        key: 'type',
        width: 120,
        render: (type: string) => {
          const config = getTransactionTypeConfig(type);
          return (
            <Tag color={config.color} className="capitalize">
              {t(`transactions.types.${config.label}`)}
            </Tag>
          );
        },
      },
      {
        title: t('transactions.reference'),
        dataIndex: 'reference_type',
        key: 'reference',
        width: 150,
        render: (refType: string, record: CustomerTransactionWithDetails) => {
          // reference_number may exist on the transaction record
          const refNumber = (record as unknown as { reference_number?: string }).reference_number;
          return (
            <div className="text-sm">
              {refType && (
                <Text type="secondary" className="capitalize">
                  {refType}
                </Text>
              )}
              {refNumber && (
                <div>
                  <Text code className="text-xs">
                    {refNumber}
                  </Text>
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: t('transactions.debit'),
        dataIndex: 'debit_amount',
        key: 'debit',
        width: 120,
        align: 'end',
        render: (amount: number) =>
          amount > 0 ? (
            <Text className="text-red-600 font-medium">+{formatCurrency(amount, currency)}</Text>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
      {
        title: t('transactions.credit'),
        dataIndex: 'credit_amount',
        key: 'credit',
        width: 120,
        align: 'end',
        render: (amount: number) =>
          amount > 0 ? (
            <Text className="text-emerald-600 font-medium">
              -{formatCurrency(amount, currency)}
            </Text>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
      {
        title: t('transactions.balance'),
        dataIndex: 'balance_after',
        key: 'balance',
        width: 130,
        align: 'end',
        render: (balance: number) => {
          const config = getBalanceConfig(balance);
          return (
            <Text strong className={config.color}>
              {formatCurrency(balance, currency)}
            </Text>
          );
        },
      },
      {
        title: t('transactions.notes'),
        dataIndex: 'notes',
        key: 'notes',
        ellipsis: true,
        render: (notes: string) =>
          notes ? (
            <Text className="text-sm text-stone-600">{notes}</Text>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
    ],
    [t, tCommon, currency]
  );

  // Transaction type filter options
  const typeOptions = useMemo(
    () => [
      { value: '', label: tCommon('labels.all') },
      { value: 'sale', label: t('transactions.types.sale') },
      { value: 'payment', label: t('transactions.types.payment') },
      { value: 'refund', label: t('transactions.types.refund') },
      { value: 'adjustment', label: t('transactions.types.adjustment') },
      { value: 'return', label: t('transactions.types.return') },
    ],
    [t, tCommon]
  );

  // Handle date range change
  const handleDateRangeChange = useCallback((dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0].toISOString(), dates[1].toISOString()]);
    } else {
      setDateRange(null);
    }
    setPage(1);
  }, []);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-stone-50 rounded-lg">
        <div className="flex items-center gap-2">
          <FilterOutlined className="text-stone-400" />
          <Select
            value={transactionType || ''}
            onChange={(value: string) => {
              setTransactionType((value || undefined) as TransactionType | undefined);
              setPage(1);
            }}
            options={typeOptions}
            className="w-40"
            placeholder={t('transactions.filterByType')}
          />
        </div>

        <div className="flex items-center gap-2">
          <CalendarOutlined className="text-stone-400" />
          <RangePicker
            onChange={handleDateRangeChange}
            className="w-64"
            placeholder={[tCommon('labels.startDate'), tCommon('labels.endDate')]}
          />
        </div>

        {(transactionType || dateRange) && (
          <Button
            type="link"
            size="small"
            onClick={() => {
              setTransactionType(undefined);
              setDateRange(null);
              setPage(1);
            }}
          >
            {tCommon('actions.clearFilters')}
          </Button>
        )}
      </div>

      {/* Page Totals Summary */}
      {transactions.length > 0 && (
        <div className="flex items-center justify-end gap-6 text-sm">
          <span>
            <Text type="secondary">{t('transactions.pageDebits')}:</Text>{' '}
            <Text className="text-red-600 font-medium">
              {formatCurrency(totals.totalDebits, currency)}
            </Text>
          </span>
          <span>
            <Text type="secondary">{t('transactions.pageCredits')}:</Text>{' '}
            <Text className="text-emerald-600 font-medium">
              {formatCurrency(totals.totalCredits, currency)}
            </Text>
          </span>
        </div>
      )}

      {/* Transactions Table */}
      <Table<CustomerTransactionWithDetails>
        dataSource={transactions}
        columns={columns}
        rowKey="id_transaction"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: totalCount,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          },
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
        }}
        scroll={{ x: 900 }}
        size="small"
        emptyText={
          <EmptyState
            icon={<HistoryOutlined />}
            title={t('transactions.noTransactions')}
            description={t('transactions.noTransactionsDescription')}
            size="sm"
          />
        }
      />
    </div>
  );
}

/**
 * Documents Tab (ID Card Images)
 */
interface DocumentsTabProps {
  customer: ExtendedCustomer;
}

function DocumentsTab({ customer }: DocumentsTabProps) {
  const t = useTranslations('customers');

  const idCardFront = customer.id_card_front;
  const idCardBack = customer.id_card_back;

  const hasDocuments = idCardFront || idCardBack;

  if (!hasDocuments) {
    return (
      <EmptyState
        icon={<IdcardOutlined />}
        title={t('documents.noDocuments')}
        description={t('documents.noDocumentsDescription')}
        size="md"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ID Card Front */}
        <div className="flex flex-col gap-2">
          <Text strong>{t('idCard.front')}</Text>
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-4',
              idCardFront ? 'border-amber-300 bg-amber-50/50' : 'border-stone-200 bg-stone-50'
            )}
          >
            {idCardFront ? (
              <Image
                src={idCardFront}
                alt={t('idCard.front')}
                className="w-full h-48 object-cover rounded"
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                preview={{
                  mask: t('idCard.clickToPreview'),
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-stone-400">
                <IdcardOutlined className="text-4xl mb-2" />
                <Text type="secondary">{t('idCard.notUploaded')}</Text>
              </div>
            )}
          </div>
        </div>

        {/* ID Card Back */}
        <div className="flex flex-col gap-2">
          <Text strong>{t('idCard.back')}</Text>
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-4',
              idCardBack ? 'border-amber-300 bg-amber-50/50' : 'border-stone-200 bg-stone-50'
            )}
          >
            {idCardBack ? (
              <Image
                src={idCardBack}
                alt={t('idCard.back')}
                className="w-full h-48 object-cover rounded"
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                preview={{
                  mask: t('idCard.clickToPreview'),
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-stone-400">
                <IdcardOutlined className="text-4xl mb-2" />
                <Text type="secondary">{t('idCard.notUploaded')}</Text>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CustomerDetailModal Component
 *
 * Full-featured customer details modal with tabbed interface showing:
 * - Overview: Contact info, address, status
 * - Financial: Balance summary, credit info
 * - Transactions: Full ledger with filters
 * - Documents: ID card images
 */
export function CustomerDetailModal({
  customerId,
  open,
  onClose,
  onEdit,
  onPrintStatement,
  onCreateSale,
  defaultTab = 'overview',
}: CustomerDetailModalProps) {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');

  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  // Fetch customer data
  const { customer, isLoading, error } = useCustomer({
    customerId,
    includeUsers: true,
    enabled: open && !!customerId,
  });

  // Get shop for currency
  const { shop } = useShop();
  const currency = shop?.currency || 'USD';

  // Permissions
  const { can } = usePermissions();
  const canEdit = can(PERMISSION_KEYS.CUSTOMERS_MANAGE);
  const canPrint = can(PERMISSION_KEYS.REPORTS_BASIC);
  const canCreateSale = can(PERMISSION_KEYS.SALES_CREATE);

  // Cast customer to extended type
  const extendedCustomer = customer as ExtendedCustomer | null;

  // Handle edit
  const handleEdit = useCallback(() => {
    if (extendedCustomer && onEdit) {
      onEdit(extendedCustomer);
    }
  }, [extendedCustomer, onEdit]);

  // Handle print statement
  const handlePrintStatement = useCallback(() => {
    if (extendedCustomer && onPrintStatement) {
      onPrintStatement(extendedCustomer);
    }
  }, [extendedCustomer, onPrintStatement]);

  // Handle create sale
  const handleCreateSale = useCallback(() => {
    if (extendedCustomer && onCreateSale) {
      onCreateSale(extendedCustomer);
    }
  }, [extendedCustomer, onCreateSale]);

  // Tab items
  const tabItems = useMemo(
    () => [
      {
        key: 'overview' as TabKey,
        label: (
          <span className="flex items-center gap-2">
            <UserOutlined />
            {t('tabs.overview')}
          </span>
        ),
        children: extendedCustomer ? (
          <OverviewTab customer={extendedCustomer} currency={currency} />
        ) : null,
      },
      {
        key: 'financial' as TabKey,
        label: (
          <span className="flex items-center gap-2">
            <WalletOutlined />
            {t('tabs.financial')}
          </span>
        ),
        children: extendedCustomer ? (
          <FinancialTab customer={extendedCustomer} currency={currency} />
        ) : null,
      },
      {
        key: 'transactions' as TabKey,
        label: (
          <span className="flex items-center gap-2">
            <HistoryOutlined />
            {t('tabs.transactions')}
          </span>
        ),
        children: extendedCustomer ? (
          <TransactionsTab customerId={extendedCustomer.id_customer} currency={currency} />
        ) : null,
      },
      {
        key: 'documents' as TabKey,
        label: (
          <span className="flex items-center gap-2">
            <FileTextOutlined />
            {t('tabs.documents')}
          </span>
        ),
        children: extendedCustomer ? <DocumentsTab customer={extendedCustomer} /> : null,
      },
    ],
    [t, extendedCustomer, currency]
  );

  // Render loading state
  const renderLoading = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-4">
        <Skeleton.Avatar active size={80} />
        <div className="flex-1">
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>
      </div>
      <Skeleton active paragraph={{ rows: 4 }} />
    </div>
  );

  // Render error state
  const renderError = () => (
    <EmptyState
      icon={<ExclamationCircleOutlined className="text-red-500" />}
      title={tCommon('messages.error')}
      description={error?.message || tCommon('messages.errorLoading')}
      size="md"
    />
  );

  // Render not found state
  const renderNotFound = () => (
    <EmptyState
      icon={<UserOutlined />}
      title={t('messages.customerNotFound')}
      description={t('messages.customerNotFoundDescription')}
      size="md"
    />
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <UserOutlined />
          {t('modal.customerDetails')}
        </div>
      }
      width={900}
      centered
      destroyOnClose
      footer={
        <div className="flex items-center justify-between">
          {/* Left side - Close button */}
          <Button onClick={onClose}>{tCommon('actions.close')}</Button>

          {/* Right side - Action buttons */}
          <Space>
            {canPrint && onPrintStatement && extendedCustomer && (
              <Button icon={<PrinterOutlined />} onClick={handlePrintStatement}>
                {t('actions.printStatement')}
              </Button>
            )}
            {canCreateSale && onCreateSale && extendedCustomer && (
              <Button type="primary" icon={<ShoppingCartOutlined />} onClick={handleCreateSale}>
                {t('actions.createSale')}
              </Button>
            )}
            {canEdit && onEdit && extendedCustomer && (
              <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
                {tCommon('actions.edit')}
              </Button>
            )}
          </Space>
        </div>
      }
      className={cn(
        '[&_.ant-modal-content]:rounded-xl',
        '[&_.ant-modal-header]:border-b [&_.ant-modal-header]:border-stone-200',
        '[&_.ant-modal-footer]:border-t [&_.ant-modal-footer]:border-stone-200'
      )}
      styles={{
        body: {
          padding: 0,
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
        },
      }}
    >
      {isLoading ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : !extendedCustomer ? (
        renderNotFound()
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          items={tabItems}
          className={cn(
            '[&_.ant-tabs-nav]:px-6 [&_.ant-tabs-nav]:pt-2',
            '[&_.ant-tabs-nav]:border-b [&_.ant-tabs-nav]:border-stone-100',
            '[&_.ant-tabs-content-holder]:p-6'
          )}
        />
      )}
    </Modal>
  );
}

export default CustomerDetailModal;
