import { redirect } from 'next/navigation';

/**
 * Workshops Page - Redirect to Orders
 *
 * This page redirects to the Workshop Orders page as the default view.
 * The Workshop Orders list is the primary view for the workshops section.
 *
 * @module app/(platform)/[locale]/[shopId]/workshops/page
 */

interface PageProps {
  params: Promise<{
    locale: string;
    shopId: string;
  }>;
}

export default async function WorkshopsPage({ params }: PageProps) {
  const { locale, shopId } = await params;
  redirect(`/${locale}/${shopId}/workshops/orders`);
}
