'use client';

/**
 * Security Settings Page
 *
 * Allows users to manage their security settings including password and 2FA.
 *
 * Features:
 * - Password change form
 * - Two-factor authentication setup (TOTP)
 * - Login history table
 *
 * @module app/(platform)/[locale]/settings/security/page
 */

import React, { useState } from 'react';

import {
  LockOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  QrcodeOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Table, Tag, Modal, Alert, message, Tooltip, Spin } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  getMfaStatus,
  enrollTotp,
  verifyTotpEnrollment,
  disableTotp,
  changePassword,
  getLoginHistory,
  type MfaStatus,
  type TotpEnrollment,
  type LoginHistoryRecord,
} from '@/lib/actions/security-settings';
import { useUser } from '@/lib/hooks/auth/useUser';

// =============================================================================
// TYPES
// =============================================================================

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// =============================================================================
// QUERY KEYS
// =============================================================================

const securityQueryKeys = {
  mfaStatus: ['mfa-status'] as const,
  loginHistory: ['login-history'] as const,
};

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Loading skeleton for security page
 */
function SecuritySkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-8 bg-stone-200 rounded w-48 mb-2 animate-pulse" />
        <div className="h-5 bg-stone-200 rounded w-72 animate-pulse" />
      </div>

      {/* Password card skeleton */}
      <Card className="p-6">
        <div className="h-5 bg-stone-200 rounded w-40 mb-4 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 bg-stone-200 rounded w-32 mb-2 animate-pulse" />
              <div className="h-10 bg-stone-200 rounded w-full animate-pulse" />
            </div>
          ))}
        </div>
      </Card>

      {/* 2FA card skeleton */}
      <Card className="p-6">
        <div className="h-5 bg-stone-200 rounded w-48 mb-4 animate-pulse" />
        <div className="h-20 bg-stone-200 rounded animate-pulse" />
      </Card>
    </div>
  );
}

/**
 * Password change section
 */
function PasswordSection({ t }: { t: ReturnType<typeof useTranslations> }): React.JSX.Element {
  const [form] = Form.useForm<PasswordFormValues>();

  const { mutate: updatePassword, isPending: isChanging } = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      const result = await changePassword(values.newPassword);
      if (!result.success) {
        throw new Error(result.error || 'Failed to change password');
      }
      return result;
    },
    onSuccess: () => {
      message.success(t('security.password.changeSuccess'));
      form.resetFields();
    },
    onError: (error: Error) => {
      message.error(error.message || t('security.password.changeError'));
    },
  });

  const handleChangePassword = (values: PasswordFormValues) => {
    updatePassword(values);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <LockOutlined className="text-amber-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {t('security.password.title')}
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {t('security.password.description')}
          </p>
        </div>
      </div>

      <Form form={form} layout="vertical" onFinish={handleChangePassword} className="max-w-md">
        <Form.Item
          name="currentPassword"
          label={t('security.password.currentPassword')}
          rules={[{ required: true, message: t('security.password.currentRequired') }]}
        >
          <Input.Password
            prefix={<KeyOutlined className="text-stone-400" />}
            placeholder={t('security.password.currentPlaceholder')}
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label={t('security.password.newPassword')}
          rules={[
            { required: true, message: t('security.password.newRequired') },
            { min: 8, message: t('security.password.minLength') },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-stone-400" />}
            placeholder={t('security.password.newPlaceholder')}
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label={t('security.password.confirmPassword')}
          dependencies={['newPassword']}
          rules={[
            { required: true, message: t('security.password.confirmRequired') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t('security.password.mismatch')));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-stone-400" />}
            placeholder={t('security.password.confirmPlaceholder')}
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            loading={isChanging}
            className="bg-gradient-to-r from-[#C9A227] to-[#A68B1F] border-none"
          >
            {t('security.password.changeButton')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

/**
 * Two-factor authentication section using Supabase MFA
 */
function TwoFactorSection({
  mfaStatus,
  isLoading,
  t,
}: {
  mfaStatus: MfaStatus | null | undefined;
  isLoading: boolean;
  t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [enrollmentData, setEnrollmentData] = useState<TotpEnrollment | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const isEnabled = mfaStatus?.enabled ?? false;
  const verifiedFactor = mfaStatus?.factors.find((f) => f.status === 'verified');

  // Enroll TOTP mutation
  const { mutate: startEnrollment, isPending: isEnrolling } = useMutation({
    mutationFn: async () => {
      const result = await enrollTotp();
      if (!result.success) {
        throw new Error(result.error || 'Failed to start 2FA enrollment');
      }
      return result.data;
    },
    onSuccess: (data) => {
      if (data) {
        setEnrollmentData(data);
      }
    },
    onError: (error: Error) => {
      message.error(error.message || t('security.twoFactor.enableError'));
    },
  });

  // Verify enrollment mutation
  const { mutate: verifyEnrollment, isPending: isVerifying } = useMutation({
    mutationFn: async ({ factorId, code }: { factorId: string; code: string }) => {
      const result = await verifyTotpEnrollment(factorId, code);
      if (!result.success) {
        throw new Error(result.error || 'Invalid verification code');
      }
      return result;
    },
    onSuccess: () => {
      message.success(t('security.twoFactor.enableSuccess'));
      setSetupModalOpen(false);
      setVerificationCode('');
      setEnrollmentData(null);
      queryClient.invalidateQueries({ queryKey: securityQueryKeys.mfaStatus });
    },
    onError: (error: Error) => {
      message.error(error.message || t('security.twoFactor.enableError'));
    },
  });

  // Disable 2FA mutation
  const { mutate: disable2FA, isPending: isDisabling } = useMutation({
    mutationFn: async (factorId: string) => {
      const result = await disableTotp(factorId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to disable 2FA');
      }
      return result;
    },
    onSuccess: () => {
      message.success(t('security.twoFactor.disableSuccess'));
      setDisableModalOpen(false);
      queryClient.invalidateQueries({ queryKey: securityQueryKeys.mfaStatus });
    },
    onError: (error: Error) => {
      message.error(error.message || t('security.twoFactor.disableError'));
    },
  });

  const handleOpenSetup = () => {
    setSetupModalOpen(true);
    startEnrollment();
  };

  const handleCloseSetup = () => {
    setSetupModalOpen(false);
    setVerificationCode('');
    setEnrollmentData(null);
    setShowSecret(false);
  };

  const handleVerify = () => {
    if (!verificationCode) {
      message.error(t('security.twoFactor.enterCode'));
      return;
    }

    if (!enrollmentData) {
      message.error('Enrollment data missing');
      return;
    }

    verifyEnrollment({ factorId: enrollmentData.factorId, code: verificationCode });
  };

  const handleDisable = () => {
    if (!verifiedFactor) {
      message.error('No verified factor found');
      return;
    }
    disable2FA(verifiedFactor.id);
  };

  const copySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      message.success(t('security.twoFactor.secretCopied'));
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Spin />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <SafetyCertificateOutlined className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                {t('security.twoFactor.title')}
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {t('security.twoFactor.description')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEnabled ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                {t('security.twoFactor.enabled')}
              </Tag>
            ) : (
              <Tag color="warning" icon={<ExclamationCircleOutlined />}>
                {t('security.twoFactor.disabled')}
              </Tag>
            )}
          </div>
        </div>

        {isEnabled && verifiedFactor && (
          <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-800 rounded-lg">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {t('security.twoFactor.currentMethod')}:{' '}
              <span className="font-medium text-stone-900 dark:text-stone-100">
                {t('security.twoFactor.methods.authenticator')}
              </span>
            </p>
            {verifiedFactor.friendlyName && (
              <p className="text-xs text-stone-500 mt-1">{verifiedFactor.friendlyName}</p>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          {isEnabled ? (
            <Button danger onClick={() => setDisableModalOpen(true)}>
              {t('security.twoFactor.disableButton')}
            </Button>
          ) : (
            <Button
              type="primary"
              onClick={handleOpenSetup}
              className="bg-gradient-to-r from-[#C9A227] to-[#A68B1F] border-none"
            >
              {t('security.twoFactor.enableButton')}
            </Button>
          )}
        </div>
      </Card>

      {/* Setup Modal */}
      <Modal
        title={t('security.twoFactor.setupTitle')}
        open={setupModalOpen}
        onCancel={handleCloseSetup}
        footer={null}
        width={480}
      >
        <div className="py-4 space-y-4">
          <p className="text-stone-600 dark:text-stone-400">
            {t('security.twoFactor.setupDescription')}
          </p>

          {/* QR Code Display */}
          <div className="p-4 bg-stone-100 dark:bg-stone-800 rounded-lg text-center">
            {isEnrolling ? (
              <div className="w-32 h-32 mx-auto flex items-center justify-center">
                <Spin size="large" />
              </div>
            ) : enrollmentData?.qrCode ? (
              <div
                className="w-48 h-48 mx-auto bg-white p-2 rounded-lg"
                dangerouslySetInnerHTML={{ __html: enrollmentData.qrCode }}
              />
            ) : (
              <div className="w-32 h-32 mx-auto bg-white dark:bg-stone-700 rounded-lg flex items-center justify-center mb-3">
                <QrcodeOutlined className="text-6xl text-stone-400" />
              </div>
            )}
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-3">
              {t('security.twoFactor.scanQrCode')}
            </p>
          </div>

          {/* Manual Entry Option */}
          {enrollmentData?.secret && (
            <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-stone-600 dark:text-stone-400">
                  {t('security.twoFactor.cantScan')}
                </span>
                <Button
                  type="link"
                  size="small"
                  onClick={() => setShowSecret(!showSecret)}
                  className="p-0 h-auto"
                >
                  {showSecret
                    ? t('security.twoFactor.hideSecret')
                    : t('security.twoFactor.showSecret')}
                </Button>
              </div>
              {showSecret && (
                <div className="flex items-center gap-2 p-2 bg-white dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-700">
                  <code className="text-sm font-mono flex-1 break-all">
                    {enrollmentData.secret}
                  </code>
                  <Tooltip title={t('security.twoFactor.copySecret')}>
                    <Button type="text" size="small" icon={<CopyOutlined />} onClick={copySecret} />
                  </Tooltip>
                </div>
              )}
            </div>
          )}

          {/* Verification Code Input */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              {t('security.twoFactor.verificationCode')}
            </label>
            <Input
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              maxLength={6}
              className="text-center text-lg tracking-widest"
              disabled={!enrollmentData}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-700">
            <Button onClick={handleCloseSetup}>{t('common.actions.cancel')}</Button>
            <Button
              type="primary"
              onClick={handleVerify}
              loading={isVerifying}
              disabled={!enrollmentData || verificationCode.length !== 6}
              className="bg-gradient-to-r from-[#C9A227] to-[#A68B1F] border-none"
            >
              {t('security.twoFactor.verifyAndEnable')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Disable Modal */}
      <Modal
        title={t('security.twoFactor.disableTitle')}
        open={disableModalOpen}
        onCancel={() => setDisableModalOpen(false)}
        footer={null}
        width={400}
      >
        <div className="py-4 space-y-4">
          <Alert type="warning" message={t('security.twoFactor.disableWarning')} showIcon />

          <div className="flex justify-end gap-3 pt-4">
            <Button onClick={() => setDisableModalOpen(false)}>{t('common.actions.cancel')}</Button>
            <Button danger type="primary" onClick={handleDisable} loading={isDisabling}>
              {t('security.twoFactor.confirmDisable')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/**
 * Login history table section
 */
function LoginHistorySection({ t }: { t: ReturnType<typeof useTranslations> }): React.JSX.Element {
  const { data: history, isLoading } = useQuery({
    queryKey: securityQueryKeys.loginHistory,
    queryFn: async () => {
      const result = await getLoginHistory(20);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch login history');
      }
      return result.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const columns = [
    {
      title: t('security.loginHistory.status'),
      dataIndex: 'success',
      key: 'status',
      width: 100,
      render: (success: boolean) => (
        <div className="flex items-center gap-2">
          {success ? (
            <CheckCircleOutlined className="text-emerald-500" />
          ) : (
            <CloseCircleOutlined className="text-red-500" />
          )}
        </div>
      ),
    },
    {
      title: t('security.loginHistory.device'),
      key: 'device',
      render: (_: unknown, record: LoginHistoryRecord) => (
        <div>
          <p className="font-medium text-stone-900 dark:text-stone-100">
            {record.browser || 'Unknown browser'}
          </p>
          <p className="text-sm text-stone-500">{record.os || 'Unknown OS'}</p>
        </div>
      ),
    },
    {
      title: t('security.loginHistory.location'),
      dataIndex: 'location',
      key: 'location',
      render: (location: string | null) => (
        <span className="text-stone-600 dark:text-stone-400">{location || '-'}</span>
      ),
    },
    {
      title: t('security.loginHistory.date'),
      dataIndex: 'timestamp',
      key: 'date',
      render: (date: string) => (
        <span className="text-stone-600 dark:text-stone-400">
          {new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <HistoryOutlined className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {t('security.loginHistory.title')}
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {t('security.loginHistory.description')}
          </p>
        </div>
      </div>

      <Table
        dataSource={history || []}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 5 }}
        size="small"
        loading={isLoading}
        className="settings-table"
        locale={{
          emptyText: t('security.loginHistory.noHistory'),
        }}
      />
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SecuritySettingsPage(): React.JSX.Element {
  const t = useTranslations('userSettings');
  const { isLoading: userLoading } = useUser();

  // Fetch MFA status
  const { data: mfaStatus, isLoading: mfaLoading } = useQuery({
    queryKey: securityQueryKeys.mfaStatus,
    queryFn: async () => {
      const result = await getMfaStatus();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch MFA status');
      }
      return result.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (userLoading) {
    return <SecuritySkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1">
          {t('security.title')}
        </h1>
        <p className="text-stone-600 dark:text-stone-400">{t('security.subtitle')}</p>
      </div>

      {/* Password Section */}
      <PasswordSection t={t} />

      {/* Two-Factor Authentication */}
      <TwoFactorSection mfaStatus={mfaStatus} isLoading={mfaLoading} t={t} />

      {/* Login History */}
      <LoginHistorySection t={t} />
    </div>
  );
}
