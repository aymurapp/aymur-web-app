/**
 * useShopSettings Hooks
 *
 * TanStack Query hooks for fetching and managing shop settings.
 * Includes hooks for reading settings, updating settings, and uploading shop logo.
 *
 * @module lib/hooks/data/useShopSettings
 */

'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { queryKeys } from '@/lib/query/keys';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesUpdate } from '@/lib/types/database';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Shop row type from the public.shops table
 */
export type Shop = Tables<'shops'>;

/**
 * Shop update type for updating shop settings
 */
export type ShopUpdate = TablesUpdate<'shops'>;

/**
 * Shop settings - subset of shop fields that can be updated
 */
export interface ShopSettings {
  shop_name: string;
  shop_logo: string | null;
  language: string;
  currency: string;
  timezone: string;
  storage_used_bytes: number | null;
}

/**
 * Input type for updating shop settings
 */
export type ShopSettingsUpdate = Partial<
  Pick<ShopUpdate, 'shop_name' | 'shop_logo' | 'language' | 'currency' | 'timezone'>
>;

/**
 * Return type for the useShopSettings hook
 */
export interface UseShopSettingsReturn {
  /** The shop settings data */
  settings: ShopSettings | null;
  /** True while loading */
  isLoading: boolean;
  /** True if loading for first time */
  isInitialLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Upload result with URL
 */
export interface UploadLogoResult {
  /** The public URL of the uploaded logo */
  logoUrl: string;
  /** The storage path of the uploaded logo */
  storagePath: string;
}

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

/**
 * Fetches shop settings by shop ID
 */
async function fetchShopSettings(shopId: string): Promise<ShopSettings | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('shops')
    .select('shop_name, shop_logo, language, currency, timezone, storage_used_bytes')
    .eq('id_shop', shopId)
    .is('deleted_at', null)
    .single();

  if (error) {
    // PGRST116 = no rows found
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch shop settings: ${error.message}`);
  }

  return data;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to fetch shop settings.
 *
 * Fetches the current shop's settings from the shops table.
 * Uses the shop context from useShop to determine which shop to fetch.
 *
 * @param shopId - The shop ID to fetch settings for
 * @returns Shop settings with loading and error states
 *
 * @example
 * ```tsx
 * function SettingsPage() {
 *   const { shopId } = useShop();
 *   const { settings, isLoading, error } = useShopSettings(shopId!);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (!settings) return <NotFound />;
 *
 *   return (
 *     <div>
 *       <h1>{settings.shop_name}</h1>
 *       <p>Currency: {settings.currency}</p>
 *       <p>Timezone: {settings.timezone}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useShopSettings(shopId: string): UseShopSettingsReturn {
  const { hasAccess } = useShop();

  const queryResult = useQuery({
    queryKey: queryKeys.shopSettings(shopId),
    queryFn: () => fetchShopSettings(shopId),
    enabled: !!shopId && hasAccess,
    staleTime: 5 * 60 * 1000, // 5 minutes - settings change infrequently
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const { data, isLoading, isFetching, error, refetch } = queryResult;

  return {
    settings: data ?? null,
    isLoading,
    isInitialLoading: isLoading && !data,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Hook to update shop settings.
 *
 * Updates the shop settings in the shops table.
 * Automatically invalidates shop queries on success.
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * function SettingsForm() {
 *   const { shopId } = useShop();
 *   const updateSettings = useUpdateShopSettings();
 *
 *   const handleSubmit = async (data: ShopSettingsUpdate) => {
 *     try {
 *       await updateSettings.mutateAsync({
 *         shopId: shopId!,
 *         updates: {
 *           shop_name: data.shopName,
 *           currency: data.currency,
 *           timezone: data.timezone,
 *         },
 *       });
 *       toast.success('Settings updated!');
 *     } catch (error) {
 *       toast.error('Failed to update settings');
 *     }
 *   };
 *
 *   return <Form onSubmit={handleSubmit} />;
 * }
 * ```
 */
export function useUpdateShopSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shopId, updates }: { shopId: string; updates: ShopSettingsUpdate }) => {
      if (!shopId) {
        throw new Error('Shop ID is required');
      }

      const supabase = createClient();

      // Prepare the update payload
      const updatePayload: ShopUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('shops')
        .update(updatePayload)
        .eq('id_shop', shopId)
        .is('deleted_at', null)
        .select('shop_name, shop_logo, language, currency, timezone, storage_used_bytes')
        .single();

      if (error) {
        throw new Error(`Failed to update shop settings: ${error.message}`);
      }

      return data as ShopSettings;
    },
    onSuccess: (_, variables) => {
      // Invalidate shop settings query
      queryClient.invalidateQueries({
        queryKey: queryKeys.shopSettings(variables.shopId),
      });
      // Invalidate main shop query (used by useShop hook)
      queryClient.invalidateQueries({
        queryKey: queryKeys.shop(variables.shopId),
      });
      // Invalidate shops list
      queryClient.invalidateQueries({
        queryKey: queryKeys.shops,
      });
    },
  });
}

/**
 * Hook to upload shop logo to Supabase storage.
 *
 * Uploads a logo file to Supabase storage and updates the shop_logo field.
 * Supports image files (PNG, JPG, WEBP, SVG).
 *
 * @returns Mutation function and state
 *
 * @example
 * ```tsx
 * function LogoUpload() {
 *   const { shopId } = useShop();
 *   const uploadLogo = useUploadShopLogo();
 *
 *   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const file = e.target.files?.[0];
 *     if (!file) return;
 *
 *     try {
 *       const result = await uploadLogo.mutateAsync({
 *         shopId: shopId!,
 *         file,
 *       });
 *       toast.success('Logo uploaded!');
 *       console.log('New logo URL:', result.logoUrl);
 *     } catch (error) {
 *       toast.error('Failed to upload logo');
 *     }
 *   };
 *
 *   return (
 *     <input
 *       type="file"
 *       accept="image/png,image/jpeg,image/webp,image/svg+xml"
 *       onChange={handleFileChange}
 *       disabled={uploadLogo.isPending}
 *     />
 *   );
 * }
 * ```
 */
export function useUploadShopLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shopId,
      file,
    }: {
      shopId: string;
      file: File;
    }): Promise<UploadLogoResult> => {
      if (!shopId) {
        throw new Error('Shop ID is required');
      }

      if (!file) {
        throw new Error('File is required');
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Allowed types: PNG, JPG, WEBP, SVG');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 5MB');
      }

      const supabase = createClient();

      // Generate unique file name with shop ID
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${shopId}/logo_${Date.now()}.${fileExt}`;
      const storagePath = `shop-logos/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('shop-assets')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to upload logo: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('shop-assets').getPublicUrl(storagePath);

      const logoUrl = urlData.publicUrl;

      // Update shop record with new logo URL
      const { error: updateError } = await supabase
        .from('shops')
        .update({
          shop_logo: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id_shop', shopId)
        .is('deleted_at', null);

      if (updateError) {
        // Try to clean up the uploaded file
        await supabase.storage.from('shop-assets').remove([storagePath]);
        throw new Error(`Failed to update shop logo: ${updateError.message}`);
      }

      return {
        logoUrl,
        storagePath,
      };
    },
    onSuccess: (_, variables) => {
      // Invalidate shop settings query
      queryClient.invalidateQueries({
        queryKey: queryKeys.shopSettings(variables.shopId),
      });
      // Invalidate main shop query (used by useShop hook)
      queryClient.invalidateQueries({
        queryKey: queryKeys.shop(variables.shopId),
      });
      // Invalidate shops list
      queryClient.invalidateQueries({
        queryKey: queryKeys.shops,
      });
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Utility to invalidate shop settings caches
 */
export function useInvalidateShopSettings() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate shop settings for current shop */
    invalidate: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.shopSettings(shopId),
        });
      }
      return undefined;
    },
    /** Invalidate shop settings for a specific shop */
    invalidateById: (targetShopId: string): Promise<void> => {
      return queryClient.invalidateQueries({
        queryKey: queryKeys.shopSettings(targetShopId),
      });
    },
    /** Invalidate all shop-related queries for current shop */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.shop(shopId),
        });
      }
      return undefined;
    },
  };
}

/**
 * Local query key definitions for use in components
 */
export const shopSettingsKeys = {
  settings: (shopId: string) => queryKeys.shopSettings(shopId),
  shop: (shopId: string) => queryKeys.shop(shopId),
};
