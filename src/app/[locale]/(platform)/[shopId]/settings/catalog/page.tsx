import { redirect } from 'next/navigation';

/**
 * Catalog Settings Index Page
 *
 * Redirects to the categories page as the default catalog settings view.
 */
export default function CatalogSettingsPage({
  params,
}: {
  params: { locale: string; shopId: string };
}): never {
  redirect(`/${params.locale}/${params.shopId}/settings/catalog/categories`);
}
