/**
 * Profile Page
 *
 * Server component that displays and allows editing of user profile information.
 * Features:
 * - User avatar display and upload
 * - Profile information (name, email, phone)
 * - Account settings link
 * - Security settings (change password)
 *
 * @module app/(platform)/[locale]/[shopId]/profile/page
 */

import { redirect } from 'next/navigation';

import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  LockOutlined,
  SettingOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { Card, Descriptions, Divider, Avatar, Space, Typography } from 'antd';
import { getTranslations } from 'next-intl/server';

import { ProfileSettingsForm } from '@/components/domain/settings/ProfileSettingsForm';
import { getProfile } from '@/lib/actions/profile';
import { Link } from '@/lib/i18n/navigation';

import type { Metadata } from 'next';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Force dynamic rendering to ensure fresh profile data
 */
export const dynamic = 'force-dynamic';

/**
 * Page metadata
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile');

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

// =============================================================================
// TYPES
// =============================================================================

interface ProfilePageProps {
  params: Promise<{
    locale: string;
    shopId: string;
  }>;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Quick Actions Card Component
 */
function QuickActionsCard({
  t,
  params,
}: {
  t: Awaited<ReturnType<typeof getTranslations>>;
  params: { locale: string; shopId: string };
}): JSX.Element {
  return (
    <Card className="border border-stone-200">
      <h3 className="text-lg font-semibold text-stone-900 mb-4">{t('quickActions')}</h3>

      <div className="space-y-3">
        {/* Change Password */}
        <Link
          href={`/${params.locale}/${params.shopId}/settings/security`}
          className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
            <LockOutlined className="text-amber-600 text-lg" />
          </div>
          <div>
            <p className="font-medium text-stone-900">{t('changePassword')}</p>
            <p className="text-sm text-stone-500">{t('changePasswordHint')}</p>
          </div>
        </Link>

        {/* Account Settings */}
        <Link
          href={`/${params.locale}/${params.shopId}/settings/account`}
          className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors">
            <SettingOutlined className="text-stone-600 text-lg" />
          </div>
          <div>
            <p className="font-medium text-stone-900">{t('accountSettings')}</p>
            <p className="text-sm text-stone-500">{t('accountSettingsHint')}</p>
          </div>
        </Link>
      </div>
    </Card>
  );
}

/**
 * Profile Summary Card Component
 */
function ProfileSummaryCard({
  profile,
  t,
}: {
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    country: string | null;
    city: string | null;
    created_at: string;
  };
  t: Awaited<ReturnType<typeof getTranslations>>;
}): JSX.Element {
  // Format date
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Build location string
  const location = [profile.city, profile.country].filter(Boolean).join(', ');

  return (
    <Card className="border border-stone-200">
      <div className="flex flex-col items-center text-center pb-4">
        <Avatar
          size={80}
          src={profile.avatar_url}
          icon={!profile.avatar_url && <UserOutlined />}
          className="bg-amber-100 text-amber-600 mb-4"
        />
        <Typography.Title level={4} className="mb-1">
          {profile.full_name}
        </Typography.Title>
        <Typography.Text type="secondary" className="flex items-center gap-1">
          <MailOutlined /> {profile.email}
        </Typography.Text>
      </div>

      <Divider className="my-4" />

      <Descriptions column={1} size="small" className="profile-descriptions">
        {profile.phone && (
          <Descriptions.Item
            label={
              <Space>
                <PhoneOutlined />
                {t('phone')}
              </Space>
            }
          >
            {profile.phone}
          </Descriptions.Item>
        )}

        {location && (
          <Descriptions.Item
            label={
              <Space>
                <EnvironmentOutlined />
                {t('location')}
              </Space>
            }
          >
            {location}
          </Descriptions.Item>
        )}

        <Descriptions.Item
          label={
            <Space>
              <CalendarOutlined />
              {t('memberSince')}
            </Space>
          }
        >
          {memberSince}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Profile Page Component
 *
 * Server component that fetches user profile data and renders the profile page.
 * Displays user information, avatar, and provides links to security settings.
 */
export default async function ProfilePage({ params }: ProfilePageProps): Promise<JSX.Element> {
  // Await params (Next.js 15 async params)
  const { locale, shopId } = await params;

  // Get translations
  const t = await getTranslations('profile');

  // Fetch user profile
  const profileResult = await getProfile();

  // Handle unauthorized or error
  if (!profileResult.success || !profileResult.data) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/${shopId}/profile`);
  }

  const profile = profileResult.data;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">{t('pageTitle')}</h1>
        <p className="text-stone-600 mt-1">{t('pageDescription')}</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Summary */}
          <ProfileSummaryCard profile={profile} t={t} />

          {/* Quick Actions */}
          <QuickActionsCard t={t} params={{ locale, shopId }} />
        </div>

        {/* Main Content - Profile Form */}
        <div className="lg:col-span-2">
          <ProfileSettingsForm
            initialData={{
              full_name: profile.full_name,
              email: profile.email,
              phone: profile.phone,
              avatar_url: profile.avatar_url,
              country: profile.country,
              province: profile.province,
              city: profile.city,
              address: profile.address,
            }}
          />
        </div>
      </div>
    </div>
  );
}
