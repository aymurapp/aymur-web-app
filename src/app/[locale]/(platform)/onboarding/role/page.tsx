'use client';

/**
 * Onboarding Role Selection Page
 *
 * Enterprise-grade role selection page for the AYMUR jewelry platform onboarding flow.
 * Users choose between being a shop owner (create their own shop) or a team member
 * (join an existing shop via invitation code).
 *
 * Features:
 * - Two large, visually distinct cards for each path
 * - Team member path includes invitation code modal
 * - Back button to return to welcome page
 * - Professional enterprise aesthetics with AYMUR branding
 * - Gold accent for owner path, blue accent for team path
 * - Hover effects and selection states
 * - Responsive layout with RTL support
 * - Fully accessible navigation
 *
 * @module app/(platform)/[locale]/onboarding/role/page
 */

import React, { useState, useCallback } from 'react';

import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
  CheckOutlined,
  CrownOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Input, Modal, message, Avatar } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  validateInvitationCode,
  acceptInvitation,
  type InvitationDetails,
} from '@/lib/actions/invitation';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils/cn';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Brand colors derived from AYMUR logo
 */
const BRAND_COLORS = {
  gold: '#C9A227',
  goldLight: '#E5C76B',
  goldDark: '#A68B1F',
} as const;

/**
 * Role card configurations
 */
const ROLE_CARDS = [
  {
    key: 'owner',
    Icon: CrownOutlined,
    href: '/onboarding/profile?role=owner',
    accentColor: BRAND_COLORS.gold,
    gradient: 'from-amber-500 to-amber-600',
    gradientLight: 'from-amber-50 to-amber-100/50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    hoverBorder: 'hover:border-amber-400',
    hoverShadow: 'hover:shadow-amber-500/20',
    checkColor: 'text-amber-600 bg-amber-100',
    isTeamMember: false,
  },
  {
    key: 'team',
    Icon: TeamOutlined,
    href: '#', // Handled by modal
    accentColor: '#3B82F6', // blue-500
    gradient: 'from-blue-500 to-blue-600',
    gradientLight: 'from-blue-50 to-blue-100/50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    hoverBorder: 'hover:border-blue-400',
    hoverShadow: 'hover:shadow-blue-500/20',
    checkColor: 'text-blue-600 bg-blue-100',
    isTeamMember: true,
  },
] as const;

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Back button component
 */
function BackButton(): React.JSX.Element {
  return (
    <Link
      href="/onboarding/plans"
      className={cn(
        'inline-flex items-center gap-2',
        'text-stone-500 hover:text-stone-700',
        'text-sm font-medium',
        'transition-colors duration-200',
        'group'
      )}
    >
      <ArrowLeftOutlined className="text-xs group-hover:-translate-x-1 transition-transform duration-200 rtl:rotate-180 rtl:group-hover:translate-x-1" />
      <span>Back</span>
    </Link>
  );
}

/**
 * Page header with title and subtitle
 */
function PageHeader({
  t,
}: {
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'relative py-12 sm:py-16 lg:py-20',
        'bg-gradient-to-b from-stone-100 to-stone-50'
      )}
      aria-labelledby="role-title"
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className={cn(
            'absolute top-10 start-1/4 w-72 h-72 rounded-full',
            'bg-amber-500/5 blur-3xl'
          )}
        />
        <div
          className={cn(
            'absolute bottom-10 end-1/4 w-80 h-80 rounded-full',
            'bg-blue-500/5 blur-3xl'
          )}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="mb-8">
          <BackButton />
        </div>

        {/* Title and subtitle */}
        <div className="text-center">
          <h1
            id="role-title"
            className={cn(
              'text-3xl sm:text-4xl lg:text-5xl font-bold',
              'text-stone-900 mb-4',
              'tracking-tight leading-tight'
            )}
          >
            {t('role.title')}
          </h1>

          <p
            className={cn(
              'text-lg sm:text-xl text-stone-600',
              'max-w-2xl mx-auto',
              'leading-relaxed'
            )}
          >
            {t('role.subtitle')}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Feature list item with checkmark
 */
function FeatureItem({
  children,
  checkColorClass,
}: {
  children: React.ReactNode;
  checkColorClass: string;
}): React.JSX.Element {
  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full',
          'flex items-center justify-center',
          checkColorClass
        )}
      >
        <CheckOutlined className="text-xs" />
      </span>
      <span className="text-stone-600 text-sm">{children}</span>
    </li>
  );
}

/**
 * Individual role selection card
 */
function RoleCard({
  roleKey,
  Icon,
  href,
  gradient,
  gradientLight,
  iconBg,
  iconColor,
  hoverBorder,
  hoverShadow,
  checkColor,
  isTeamMember,
  onTeamMemberClick,
  t,
}: {
  roleKey: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  href: string;
  gradient: string;
  gradientLight: string;
  iconBg: string;
  iconColor: string;
  hoverBorder: string;
  hoverShadow: string;
  checkColor: string;
  isTeamMember: boolean;
  onTeamMemberClick: () => void;
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  // Access the features array - next-intl returns raw values for arrays
  const featuresRaw = t.raw(`role.${roleKey}.features` as Parameters<typeof t.raw>[0]);
  const features: string[] = Array.isArray(featuresRaw) ? featuresRaw : [];

  const commonClassName =
    'block h-full w-full text-start group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 rounded-2xl';
  const ariaLabel = t(`role.${roleKey}.title` as Parameters<typeof t>[0]);

  const cardContent = (
    <Card
      className={cn(
        'relative h-full overflow-hidden',
        'border-2 border-stone-200',
        'transition-all duration-300 ease-out',
        'group-hover:-translate-y-2',
        'group-hover:shadow-2xl',
        hoverBorder,
        hoverShadow
      )}
      bodyStyle={{ padding: 0 }}
      hoverable={false}
    >
      {/* Gradient accent bar at top */}
      <div className={cn('h-2 bg-gradient-to-r', gradient)} aria-hidden="true" />

      {/* Light gradient background on hover */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100',
          'transition-opacity duration-300',
          gradientLight
        )}
        aria-hidden="true"
      />

      {/* Card content */}
      <div className="relative p-8 sm:p-10">
        {/* Icon container */}
        <div
          className={cn(
            'inline-flex items-center justify-center',
            'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl',
            'mb-6',
            iconBg,
            'transition-transform duration-300',
            'group-hover:scale-110'
          )}
        >
          <Icon className={cn('text-3xl sm:text-4xl', iconColor)} />
        </div>

        {/* Title */}
        <h2
          className={cn(
            'text-xl sm:text-2xl font-bold text-stone-900',
            'mb-3',
            'group-hover:text-stone-800'
          )}
        >
          {t(`role.${roleKey}.title` as Parameters<typeof t>[0])}
        </h2>

        {/* Description */}
        <p className="text-stone-600 mb-6 leading-relaxed">
          {t(`role.${roleKey}.description` as Parameters<typeof t>[0])}
        </p>

        {/* Features list */}
        <ul className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <FeatureItem key={index} checkColorClass={checkColor}>
              {feature}
            </FeatureItem>
          ))}
        </ul>

        {/* Arrow indicator */}
        <div
          className={cn(
            'flex items-center gap-2 text-stone-400',
            'transition-all duration-300',
            'group-hover:text-stone-600',
            'group-hover:translate-x-1 rtl:group-hover:-translate-x-1'
          )}
        >
          <span className="text-sm font-medium">{t('role.cta')}</span>
          <ArrowRightOutlined className="text-sm rtl:rotate-180" />
        </div>
      </div>
    </Card>
  );

  // Render as button for team member, or Link for owner
  if (isTeamMember) {
    return (
      <button
        type="button"
        onClick={onTeamMemberClick}
        className={commonClassName}
        aria-label={ariaLabel}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link href={href} className={commonClassName} aria-label={ariaLabel}>
      {cardContent}
    </Link>
  );
}

/**
 * Invitation code modal for team members
 */
function InvitationCodeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle code input change - auto-uppercase and limit to 8 chars
   */
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    setCode(value);
    setError(null);
    setInvitationDetails(null);
  }, []);

  /**
   * Validate the invitation code
   */
  const handleValidate = useCallback(async () => {
    if (code.length !== 8) {
      setError('Please enter a complete 8-character code (3 letters + 5 digits)');
      return;
    }

    setIsValidating(true);
    setError(null);

    const result = await validateInvitationCode(code);

    setIsValidating(false);

    if (result.success && result.data) {
      setInvitationDetails(result.data);
    } else if (!result.success) {
      setError(result.error || 'Invalid invitation code');
    }
  }, [code]);

  /**
   * Accept the invitation and join the shop
   */
  const handleAccept = useCallback(async () => {
    if (!invitationDetails) {
      return;
    }

    setIsAccepting(true);

    const result = await acceptInvitation(code);

    setIsAccepting(false);

    if (result.success) {
      message.success(result.message || 'Successfully joined the shop!');
      onClose();
      router.push('/shops');
    } else {
      setError(result.error || 'Failed to join shop');
    }
  }, [code, invitationDetails, onClose, router]);

  /**
   * Reset state when modal closes
   */
  const handleClose = useCallback(() => {
    setCode('');
    setError(null);
    setInvitationDetails(null);
    setIsValidating(false);
    setIsAccepting(false);
    onClose();
  }, [onClose]);

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={480}
      centered
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <TeamOutlined className="text-xl text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Join a Shop</h3>
            <p className="text-sm text-stone-500 font-normal">Enter your invitation code</p>
          </div>
        </div>
      }
    >
      <div className="py-4">
        {/* Code Input */}
        {!invitationDetails && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Invitation Code
              </label>
              <Input
                value={code}
                onChange={handleCodeChange}
                placeholder="ABC12345"
                size="large"
                maxLength={8}
                className="text-center text-2xl font-mono tracking-wider uppercase"
                style={{ letterSpacing: '0.2em' }}
                status={error ? 'error' : undefined}
                onPressEnter={handleValidate}
                autoFocus
              />
              <p className="text-xs text-stone-500 mt-2">
                Enter the 8-character code (3 letters + 5 digits) provided by your shop owner
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Validate button */}
            <Button
              type="primary"
              size="large"
              block
              onClick={handleValidate}
              loading={isValidating}
              disabled={code.length !== 8}
              className="h-12"
              style={{ backgroundColor: '#3B82F6' }}
            >
              {isValidating ? 'Validating...' : 'Verify Code'}
            </Button>
          </>
        )}

        {/* Shop Preview (after validation) */}
        {invitationDetails && (
          <>
            {/* Success indicator */}
            <div className="text-center mb-6">
              <CheckCircleFilled className="text-4xl text-emerald-500 mb-2" />
              <p className="text-emerald-600 font-medium">Invitation code is valid!</p>
            </div>

            {/* Shop card */}
            <div className="bg-stone-50 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <Avatar
                  size={64}
                  src={invitationDetails.shop_logo}
                  icon={<ShopOutlined />}
                  className="bg-amber-100 text-amber-600"
                />
                <div>
                  <h4 className="text-lg font-semibold text-stone-900">
                    {invitationDetails.shop_name}
                  </h4>
                  <p className="text-stone-500">
                    Role:{' '}
                    <span className="font-medium text-stone-700">
                      {invitationDetails.role_name}
                    </span>
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    Invited by {invitationDetails.invited_by_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                size="large"
                block
                onClick={() => {
                  setInvitationDetails(null);
                  setCode('');
                }}
              >
                Use Different Code
              </Button>
              <Button
                type="primary"
                size="large"
                block
                onClick={handleAccept}
                loading={isAccepting}
                className="h-12"
                style={{ backgroundColor: '#059669' }}
              >
                {isAccepting ? 'Joining...' : 'Join Shop'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/**
 * Cards grid section
 */
function CardsSection({
  onTeamMemberClick,
  t,
}: {
  onTeamMemberClick: () => void;
  t: ReturnType<typeof useTranslations<'onboarding'>>;
}): React.JSX.Element {
  return (
    <section
      className="flex-1 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-stone-50"
      aria-label="Role selection"
    >
      <div className="max-w-4xl mx-auto">
        {/* Two cards in responsive grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {ROLE_CARDS.map((card) => (
            <RoleCard
              key={card.key}
              roleKey={card.key}
              Icon={card.Icon}
              href={card.href}
              gradient={card.gradient}
              gradientLight={card.gradientLight}
              iconBg={card.iconBg}
              iconColor={card.iconColor}
              hoverBorder={card.hoverBorder}
              hoverShadow={card.hoverShadow}
              checkColor={card.checkColor}
              isTeamMember={card.isTeamMember}
              onTeamMemberClick={onTeamMemberClick}
              t={t}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

/**
 * Role Selection Page Component
 *
 * The second step in the AYMUR onboarding flow. Users choose between:
 * - Owner Path: Create their own shop (leads to profile → plans → setup)
 * - Team Member Path: Join an existing shop via invitation code
 */
export default function RoleSelectionPage(): React.JSX.Element {
  const t = useTranslations('onboarding');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTeamMemberClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Page header with title and subtitle */}
      <PageHeader t={t} />

      {/* Role selection cards */}
      <CardsSection onTeamMemberClick={handleTeamMemberClick} t={t} />

      {/* Invitation code modal for team members */}
      <InvitationCodeModal open={isModalOpen} onClose={handleModalClose} />
    </div>
  );
}
