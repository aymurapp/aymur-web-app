'use client';

/**
 * Profile Settings Page
 *
 * Allows users to manage their personal information and profile settings.
 * Includes profile form and danger zone for account deletion.
 *
 * Features:
 * - Avatar upload and management
 * - Personal information editing
 * - Address details
 * - Account deletion (danger zone)
 *
 * @module app/(platform)/[locale]/settings/profile/page
 */

import React, { useState, useEffect } from 'react';

import { ExclamationCircleOutlined, WarningOutlined, LockOutlined } from '@ant-design/icons';
import { Modal, Input, message, Alert } from 'antd';
import { useTranslations } from 'next-intl';

import ProfileSettingsForm from '@/components/domain/settings/ProfileSettingsForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  requestAccountDeletion,
  confirmAccountDeletion,
  cancelAccountDeletion,
  getPendingDeletionRequest,
  type PendingDeletionInfo,
} from '@/lib/actions/account';
import { useUser } from '@/lib/hooks/auth/useUser';
import { type DeletionReason } from '@/lib/hooks/settings/useAccountDeletion';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Loading skeleton for profile settings
 */
function ProfileSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-8 bg-stone-200 rounded w-48 mb-2 animate-pulse" />
        <div className="h-5 bg-stone-200 rounded w-72 animate-pulse" />
      </div>

      {/* Avatar card skeleton */}
      <Card className="p-6">
        <div className="h-5 bg-stone-200 rounded w-32 mb-4 animate-pulse" />
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-stone-200 animate-pulse" />
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="h-8 bg-stone-200 rounded w-32 animate-pulse" />
              <div className="h-8 bg-stone-200 rounded w-24 animate-pulse" />
            </div>
            <div className="h-4 bg-stone-200 rounded w-48 animate-pulse" />
          </div>
        </div>
      </Card>

      {/* Form card skeleton */}
      <Card className="p-6">
        <div className="h-5 bg-stone-200 rounded w-40 mb-4 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <div className="h-4 bg-stone-200 rounded w-24 mb-2 animate-pulse" />
              <div className="h-10 bg-stone-200 rounded w-full animate-pulse" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/**
 * Danger Zone section for account deletion
 */
function DangerZone({
  t,
  userEmail,
}: {
  t: ReturnType<typeof useTranslations>;
  userEmail: string;
}): React.JSX.Element {
  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [step, setStep] = useState<'request' | 'confirm'>('request');

  // Form states - Step 1 (Request)
  const [deleteReason, setDeleteReason] = useState<DeletionReason | ''>('');
  const [feedback, setFeedback] = useState('');
  const [password, setPassword] = useState('');

  // Form states - Step 2 (Confirm)
  const [confirmEmail, setConfirmEmail] = useState('');

  // Loading states
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Pending deletion state
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletionInfo | null>(null);

  // Check for pending deletion on mount
  useEffect(() => {
    const checkPendingDeletion = async () => {
      const result = await getPendingDeletionRequest();
      if (result.success && result.data?.hasPendingRequest) {
        setPendingDeletion(result.data);
      }
    };
    checkPendingDeletion();
  }, []);

  const handleOpenDeleteModal = () => {
    // If there's a pending request, go straight to confirm step
    if (pendingDeletion?.hasPendingRequest) {
      setStep('confirm');
    } else {
      setStep('request');
    }
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteReason('');
    setFeedback('');
    setPassword('');
    setConfirmEmail('');
    setStep('request');
  };

  const handleRequestDeletion = async () => {
    if (!deleteReason) {
      message.error(t('profile.dangerZone.selectReason'));
      return;
    }

    if (!password) {
      message.error(t('profile.dangerZone.passwordRequired'));
      return;
    }

    setIsDeleting(true);
    try {
      const result = await requestAccountDeletion(password, deleteReason);

      if (result.success) {
        message.success(t('profile.dangerZone.deletionRequested'));
        // Move to confirmation step
        setStep('confirm');
        setPassword(''); // Clear password for security
        // Refresh pending deletion state
        const pendingResult = await getPendingDeletionRequest();
        if (pendingResult.success) {
          setPendingDeletion(pendingResult.data ?? null);
        }
      } else {
        message.error(result.error || t('profile.dangerZone.deletionError'));
      }
    } catch {
      message.error(t('profile.dangerZone.deletionError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeletion = async () => {
    if (!confirmEmail) {
      message.error(t('profile.dangerZone.emailRequired'));
      return;
    }

    if (confirmEmail.toLowerCase() !== userEmail.toLowerCase()) {
      message.error(t('profile.dangerZone.emailMismatch'));
      return;
    }

    setIsDeleting(true);
    try {
      const result = await confirmAccountDeletion(confirmEmail);

      if (result.success) {
        message.success(result.message || t('profile.dangerZone.accountDeleted'));
        // User will be signed out by the server action
        window.location.href = '/';
      } else {
        message.error(result.error || t('profile.dangerZone.deletionError'));
      }
    } catch {
      message.error(t('profile.dangerZone.deletionError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelAccountDeletion();

      if (result.success) {
        message.success(t('profile.dangerZone.deletionCancelled'));
        setPendingDeletion(null);
        handleCloseDeleteModal();
      } else {
        message.error(result.error || t('profile.dangerZone.cancelError'));
      }
    } catch {
      message.error(t('profile.dangerZone.cancelError'));
    } finally {
      setIsCancelling(false);
    }
  };

  const deletionReasons: { value: DeletionReason; label: string }[] = [
    { value: 'no_longer_needed', label: t('profile.dangerZone.reasons.noLongerNeeded') },
    { value: 'privacy_concerns', label: t('profile.dangerZone.reasons.privacyConcerns') },
    { value: 'switching_service', label: t('profile.dangerZone.reasons.switchingService') },
    { value: 'too_expensive', label: t('profile.dangerZone.reasons.tooExpensive') },
    { value: 'missing_features', label: t('profile.dangerZone.reasons.missingFeatures') },
    { value: 'too_complex', label: t('profile.dangerZone.reasons.tooComplex') },
    { value: 'other', label: t('profile.dangerZone.reasons.other') },
  ];

  return (
    <>
      {/* Pending deletion banner */}
      {pendingDeletion?.hasPendingRequest && (
        <Alert
          type="warning"
          showIcon
          message={t('profile.dangerZone.pendingDeletionTitle')}
          description={t('profile.dangerZone.pendingDeletionDescription')}
          action={
            <Button danger onClick={handleCancelDeletion} loading={isCancelling} size="small">
              {t('profile.dangerZone.cancelDeletion')}
            </Button>
          }
          className="mb-4"
        />
      )}

      <Card
        className={cn(
          'p-6 border-red-200 bg-red-50/50',
          'dark:border-red-900/50 dark:bg-red-950/20'
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-full',
              'bg-red-100 dark:bg-red-900/30',
              'flex items-center justify-center'
            )}
          >
            <WarningOutlined className="text-lg text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-1">
              {t('profile.dangerZone.title')}
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              {t('profile.dangerZone.description')}
            </p>
            <Button
              danger
              onClick={handleOpenDeleteModal}
              className="border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600"
            >
              {pendingDeletion?.hasPendingRequest
                ? t('profile.dangerZone.confirmDeletionButton')
                : t('profile.dangerZone.deleteButton')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Account Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-red-600">
            <ExclamationCircleOutlined />
            <span>
              {step === 'request'
                ? t('profile.dangerZone.modalTitle')
                : t('profile.dangerZone.confirmModalTitle')}
            </span>
          </div>
        }
        open={deleteModalOpen}
        onCancel={handleCloseDeleteModal}
        footer={null}
        width={480}
      >
        <div className="py-4 space-y-4">
          {step === 'request' ? (
            <>
              <p className="text-stone-600 dark:text-stone-400">
                {t('profile.dangerZone.modalDescription')}
              </p>

              {/* Warning box */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex gap-3">
                  <WarningOutlined className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium mb-1">{t('profile.dangerZone.warningTitle')}</p>
                    <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
                      <li>{t('profile.dangerZone.warningItem1')}</li>
                      <li>{t('profile.dangerZone.warningItem2')}</li>
                      <li>{t('profile.dangerZone.warningItem3')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Reason selection */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                  {t('profile.dangerZone.reasonLabel')}
                </label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value as DeletionReason)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border',
                    'bg-white dark:bg-stone-800',
                    'border-stone-300 dark:border-stone-600',
                    'text-stone-900 dark:text-stone-100',
                    'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500'
                  )}
                >
                  <option value="">{t('profile.dangerZone.selectReasonPlaceholder')}</option>
                  {deletionReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional feedback */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                  {t('profile.dangerZone.feedbackLabel')}
                </label>
                <Input.TextArea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={t('profile.dangerZone.feedbackPlaceholder')}
                  rows={3}
                  maxLength={500}
                  showCount
                />
              </div>

              {/* Password verification */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                  {t('profile.dangerZone.passwordLabel')}
                </label>
                <Input.Password
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('profile.dangerZone.passwordPlaceholder')}
                  prefix={<LockOutlined className="text-stone-400" />}
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-700">
                <Button onClick={handleCloseDeleteModal}>{t('common.actions.cancel')}</Button>
                <Button
                  danger
                  type="primary"
                  onClick={handleRequestDeletion}
                  loading={isDeleting}
                  disabled={!deleteReason || !password}
                  className="bg-red-600 hover:bg-red-700 border-red-600"
                >
                  {t('profile.dangerZone.requestDeletion')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-stone-600 dark:text-stone-400">
                {t('profile.dangerZone.confirmDescription')}
              </p>

              {/* Warning box */}
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex gap-3">
                  <ExclamationCircleOutlined className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800 dark:text-red-200">
                    <p className="font-medium">{t('profile.dangerZone.finalWarning')}</p>
                  </div>
                </div>
              </div>

              {/* Email confirmation */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                  {t('profile.dangerZone.typeEmailLabel', { email: userEmail })}
                </label>
                <Input
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={userEmail}
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-between pt-4 border-t border-stone-200 dark:border-stone-700">
                <Button onClick={handleCancelDeletion} loading={isCancelling}>
                  {t('profile.dangerZone.cancelDeletion')}
                </Button>
                <div className="flex gap-3">
                  <Button onClick={handleCloseDeleteModal}>{t('common.actions.close')}</Button>
                  <Button
                    danger
                    type="primary"
                    onClick={handleConfirmDeletion}
                    loading={isDeleting}
                    disabled={confirmEmail.toLowerCase() !== userEmail.toLowerCase()}
                    className="bg-red-600 hover:bg-red-700 border-red-600"
                  >
                    {t('profile.dangerZone.confirmDelete')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ProfileSettingsPage(): React.JSX.Element {
  const t = useTranslations('userSettings');
  const { user, isLoading } = useUser();

  // Show loading skeleton while user data is loading
  if (isLoading || !user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1">
          {t('profile.title')}
        </h1>
        <p className="text-stone-600 dark:text-stone-400">{t('profile.subtitle')}</p>
      </div>

      {/* Profile Settings Form */}
      <ProfileSettingsForm
        initialData={{
          full_name: user.full_name || '',
          email: user.email || '',
          phone: user.phone || null,
          avatar_url: null, // Avatar is stored in Supabase Auth metadata, fetched separately
          country: user.country || null,
          province: user.province || null,
          city: user.city || null,
          address: user.address || null,
        }}
      />

      {/* Danger Zone */}
      <DangerZone t={t} userEmail={user.email || ''} />
    </div>
  );
}
