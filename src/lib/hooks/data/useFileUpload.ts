/**
 * useFileUpload Hook
 *
 * Hook for uploading files to Supabase Storage and tracking them in file_uploads table.
 * Supports image uploads for various entities (purchases, customers, inventory items, etc.)
 *
 * Features:
 * - Upload to Supabase Storage
 * - Track files in file_uploads table with entity linking
 * - Support for multiple file uploads
 * - Progress tracking
 * - Delete functionality
 *
 * @module lib/hooks/data/useFileUpload
 */

'use client';

import { useState, useCallback } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useShop } from '@/lib/hooks/shop';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Entity types that can have file attachments
 * Must match the database constraint: chk_file_uploads_entity_type
 */
export type FileEntityType =
  | 'purchases'
  | 'customers'
  | 'inventory_items'
  | 'item_certifications'
  | 'sales'
  | 'workshop_orders'
  | 'expenses'
  | 'suppliers'
  | 'profile';

/**
 * File upload record from the database
 */
export interface FileUpload {
  id_file: string;
  id_shop: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  entity_type: string | null;
  entity_id: string | null;
  uploaded_by: string;
  created_at: string;
  deleted_at: string | null;
}

/**
 * Result of a file upload operation
 */
export interface FileUploadResult {
  id_file: string;
  file_path: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
}

/**
 * Options for uploading files
 */
export interface UploadOptions {
  /** The type of entity the file is attached to */
  entityType: FileEntityType;
  /** The ID of the entity (can be null for new entities) */
  entityId: string | null;
  /** Optional subfolder within the bucket */
  folder?: string;
}

/**
 * Storage bucket configuration
 */
const STORAGE_BUCKET = 'shop-documents';

/**
 * Maximum file size (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Allowed MIME types for invoice images
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

// =============================================================================
// QUERY KEYS
// =============================================================================

export const fileUploadKeys = {
  all: (shopId: string) => ['file-uploads', shopId] as const,
  byEntity: (shopId: string, entityType: FileEntityType, entityId: string) =>
    [...fileUploadKeys.all(shopId), entityType, entityId] as const,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validates a file before upload
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Generates a unique filename for storage
 */
function generateUniqueFilename(shopId: string, entityType: string, originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || 'unknown';
  const sanitizedName = originalName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace special chars
    .substring(0, 50); // Limit length

  return `${shopId}/${entityType}/${timestamp}-${random}-${sanitizedName}.${extension}`;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to get files for an entity
 */
export function useEntityFiles(entityType: FileEntityType, entityId: string | null) {
  const { shopId, hasAccess } = useShop();

  return useQuery({
    queryKey: fileUploadKeys.byEntity(shopId ?? '', entityType, entityId ?? ''),
    queryFn: async () => {
      if (!shopId || !entityId) {
        return [];
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('file_uploads')
        .select('*')
        .eq('id_shop', shopId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch files: ${error.message}`);
      }

      // Add public URLs to the files
      return (data ?? []).map((file) => ({
        ...file,
        file_url: supabase.storage.from(STORAGE_BUCKET).getPublicUrl(file.file_path).data.publicUrl,
      }));
    },
    enabled: !!shopId && !!entityId && hasAccess,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to upload files
 */
export function useUploadFile() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();
  // Upload progress tracking (for future use with progress indicators)
  const [uploadProgress] = useState<Record<string, number>>({});

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      options,
    }: {
      file: File;
      options: UploadOptions;
    }): Promise<FileUploadResult> => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const supabase = createClient();

      // Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Unauthorized');
      }

      // Get public user id
      const { data: publicUser, error: userError } = await supabase
        .from('users')
        .select('id_user')
        .eq('auth_id', user.id)
        .single();

      if (userError || !publicUser) {
        throw new Error('User not found');
      }

      // Generate unique filename
      const filePath = generateUniqueFilename(shopId, options.entityType, file.name);

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        console.error('[useUploadFile] Storage upload error:', uploadError);

        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('File storage is not configured. Please contact support.');
        }

        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(uploadData.path);

      // Create file_uploads record
      // Note: chk_file_uploads_entity constraint requires both entity_type and entity_id
      // to be either both NULL or both NOT NULL
      const { data: fileRecord, error: recordError } = await supabase
        .from('file_uploads')
        .insert({
          id_shop: shopId,
          file_name: file.name,
          file_path: uploadData.path,
          file_size_bytes: file.size,
          mime_type: file.type,
          entity_type: options.entityId ? options.entityType : null,
          entity_id: options.entityId,
          uploaded_by: publicUser.id_user,
        })
        .select('id_file')
        .single();

      if (recordError) {
        // Try to clean up the uploaded file
        await supabase.storage.from(STORAGE_BUCKET).remove([uploadData.path]);
        throw new Error(`Failed to record file upload: ${recordError.message}`);
      }

      return {
        id_file: fileRecord.id_file,
        file_path: uploadData.path,
        file_url: publicUrl,
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
      };
    },
    onSuccess: (_, variables) => {
      if (shopId && variables.options.entityId) {
        queryClient.invalidateQueries({
          queryKey: fileUploadKeys.byEntity(
            shopId,
            variables.options.entityType,
            variables.options.entityId
          ),
        });
      }
    },
  });

  const uploadFiles = useCallback(
    async (files: File[], options: UploadOptions): Promise<FileUploadResult[]> => {
      const results: FileUploadResult[] = [];

      for (const file of files) {
        try {
          const result = await uploadMutation.mutateAsync({ file, options });
          results.push(result);
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          throw error;
        }
      }

      return results;
    },
    [uploadMutation]
  );

  return {
    uploadFile: uploadMutation.mutate,
    uploadFileAsync: uploadMutation.mutateAsync,
    uploadFiles,
    isUploading: uploadMutation.isPending,
    uploadProgress,
    error: uploadMutation.error,
  };
}

/**
 * Hook to delete a file
 */
export function useDeleteFile() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      filePath: _filePath,
      entityType: _entityType,
      entityId: _entityId,
    }: {
      fileId: string;
      filePath: string;
      entityType?: FileEntityType;
      entityId?: string;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      // Soft delete the file record
      // Note: filePath, entityType, entityId are available for future use
      // (e.g., actually deleting from storage or additional validation)
      const { error: deleteError } = await supabase
        .from('file_uploads')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id_file', fileId)
        .eq('id_shop', shopId);

      if (deleteError) {
        throw new Error(`Failed to delete file record: ${deleteError.message}`);
      }

      // Optionally delete from storage (comment out to keep files for audit)
      // await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);

      return { fileId };
    },
    onSuccess: (_, variables) => {
      if (shopId && variables.entityType && variables.entityId) {
        queryClient.invalidateQueries({
          queryKey: fileUploadKeys.byEntity(shopId, variables.entityType, variables.entityId),
        });
      }
    },
  });
}

/**
 * Hook to update entity_id for files (useful when creating new entities)
 */
export function useLinkFilesToEntity() {
  const { shopId } = useShop();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileIds,
      entityType,
      entityId,
    }: {
      fileIds: string[];
      entityType: FileEntityType;
      entityId: string;
    }) => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      if (fileIds.length === 0) {
        return { updated: 0 };
      }

      const supabase = createClient();

      const { error } = await supabase
        .from('file_uploads')
        .update({ entity_id: entityId, entity_type: entityType })
        .in('id_file', fileIds)
        .eq('id_shop', shopId);

      if (error) {
        throw new Error(`Failed to link files: ${error.message}`);
      }

      return { updated: fileIds.length };
    },
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({
          queryKey: fileUploadKeys.byEntity(shopId, variables.entityType, variables.entityId),
        });
      }
    },
  });
}
