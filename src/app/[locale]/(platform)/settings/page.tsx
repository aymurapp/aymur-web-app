import { redirect } from 'next/navigation';

/**
 * User Settings Index Page
 *
 * Redirects to the profile settings page by default.
 * This ensures users always land on a specific settings section.
 *
 * @module app/(platform)/[locale]/settings/page
 */

interface SettingsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function SettingsPage({ params }: SettingsPageProps): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/settings/profile`);
}
