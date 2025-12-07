'use server';

/**
 * Catalog Server Actions
 *
 * Server-side actions for managing catalog entities in the Aymur Platform.
 * These actions handle CRUD operations for product categories, metal types,
 * metal purities, stone types, product sizes, and metal prices.
 *
 * Key features:
 * - Full CRUD for catalog entities
 * - Zod validation for all inputs
 * - RLS-based multi-tenant security (shop_id context)
 * - Soft delete pattern for most entities
 * - Audit trail via created_by/updated_by fields
 *
 * RLS Note: All queries are automatically filtered by get_user_shop_ids()
 * embedded in JWT claims. No manual shop filtering needed.
 *
 * @module lib/actions/catalog
 */

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/types/database';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Generic action result type for consistent error handling.
 * All server actions should return this type.
 */
export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; code?: string };

// Database row types
type ProductCategory = Database['public']['Tables']['product_categories']['Row'];
type MetalType = Database['public']['Tables']['metal_types']['Row'];
type MetalPurity = Database['public']['Tables']['metal_purities']['Row'];
type StoneType = Database['public']['Tables']['stone_types']['Row'];
type ProductSize = Database['public']['Tables']['product_sizes']['Row'];

// MetalPrice type definition - table exists in database but not in generated types yet
// TODO: Regenerate database types to include metal_prices table
type MetalPrice = {
  id_price: string;
  id_shop: string;
  id_metal_type: string;
  id_metal_purity: string | null;
  price_date: string;
  price_per_gram: number;
  buy_price_per_gram: number | null;
  sell_price_per_gram: number | null;
  currency: string;
  source: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Product Category validation schema
 * Database columns: id_category, id_shop, category_name, description, sort_order, created_by, created_at, updated_at, deleted_at
 */
const CategorySchema = z.object({
  category_name: z
    .string()
    .min(1, 'Category name is required')
    .max(255, 'Category name must be less than 255 characters'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .nullable()
    .optional(),
  sort_order: z.number().int().min(0).nullable().optional(),
});

const CreateCategorySchema = CategorySchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
});

const UpdateCategorySchema = CategorySchema.partial().extend({
  id_category: z.string().uuid('Invalid category ID'),
});

/**
 * Metal Type validation schema
 * Database columns: metal_name, description, sort_order, created_by, deleted_at
 */
const MetalTypeSchema = z.object({
  metal_name: z
    .string()
    .min(1, 'Metal name is required')
    .max(255, 'Metal name must be less than 255 characters'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .nullable()
    .optional(),
  sort_order: z.number().int().min(0).nullable().optional(),
});

const CreateMetalTypeSchema = MetalTypeSchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
});

const UpdateMetalTypeSchema = MetalTypeSchema.partial().extend({
  id_metal_type: z.string().uuid('Invalid metal type ID'),
});

/**
 * Metal Purity validation schema
 * Database columns: purity_name, purity_percentage, fineness, sort_order, created_by, deleted_at
 */
const MetalPuritySchema = z.object({
  purity_name: z
    .string()
    .min(1, 'Purity name is required')
    .max(255, 'Purity name must be less than 255 characters'),
  purity_percentage: z
    .number()
    .min(0, 'Purity percentage must be at least 0')
    .max(100, 'Purity percentage must be at most 100'),
  fineness: z.number().int().min(0).max(1000, 'Fineness must be between 0 and 1000'),
  sort_order: z.number().int().min(0).nullable().optional(),
});

const CreateMetalPuritySchema = MetalPuritySchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
  id_metal_type: z.string().uuid('Invalid metal type ID'),
});

const UpdateMetalPuritySchema = MetalPuritySchema.partial().extend({
  id_purity: z.string().uuid('Invalid purity ID'),
  id_metal_type: z.string().uuid('Invalid metal type ID').optional(),
});

/**
 * Stone Type validation schema
 * Database columns: stone_name, category, mohs_hardness, description, sort_order, created_by, deleted_at
 */
const StoneTypeSchema = z.object({
  stone_name: z
    .string()
    .min(1, 'Stone name is required')
    .max(255, 'Stone name must be less than 255 characters'),
  category: z.string().max(100, 'Category must be less than 100 characters'),
  mohs_hardness: z
    .number()
    .min(0)
    .max(10, 'Mohs hardness must be between 0 and 10')
    .nullable()
    .optional(),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .nullable()
    .optional(),
  sort_order: z.number().int().min(0).nullable().optional(),
});

const CreateStoneTypeSchema = StoneTypeSchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
});

const UpdateStoneTypeSchema = StoneTypeSchema.partial().extend({
  id_stone_type: z.string().uuid('Invalid stone type ID'),
});

/**
 * Product Size validation schema
 * Database columns: id_category (FK), size_name, size_value, size_system, sort_order, created_by
 * Note: No deleted_at column
 */
const ProductSizeSchema = z.object({
  size_name: z
    .string()
    .min(1, 'Size name is required')
    .max(255, 'Size name must be less than 255 characters'),
  size_value: z.string().max(50).nullable().optional(),
  size_system: z.string().max(50).nullable().optional(),
  sort_order: z.number().int().min(0).nullable().optional(),
});

const CreateProductSizeSchema = ProductSizeSchema.extend({
  id_shop: z.string().uuid('Invalid shop ID'),
  id_category: z.string().uuid('Invalid category ID'),
});

/**
 * Metal Price validation schema
 * Note: Metal prices are typically only added, not updated (historical record)
 */
const CreateMetalPriceSchema = z.object({
  id_shop: z.string().uuid('Invalid shop ID'),
  id_metal_type: z.string().uuid('Invalid metal type ID'),
  id_metal_purity: z.string().uuid('Invalid metal purity ID').nullable().optional(),
  price_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  price_per_gram: z.number().positive('Price per gram must be positive'),
  buy_price_per_gram: z.number().min(0, 'Buy price must be non-negative').nullable().optional(),
  sell_price_per_gram: z.number().min(0, 'Sell price must be non-negative').nullable().optional(),
  currency: z.string().min(3).max(3, 'Currency must be a 3-letter code'),
  source: z.string().max(255, 'Source must be less than 255 characters').nullable().optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').nullable().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the authenticated user and their public.users record.
 * Returns null if not authenticated.
 */
async function getAuthenticatedUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Get the public.users record
  const { data: publicUser, error: userError } = await supabase
    .from('users')
    .select('id_user')
    .eq('auth_id', user.id)
    .single();

  if (userError || !publicUser) {
    return null;
  }

  return { authUser: user, publicUser };
}

/**
 * Standard revalidation paths for catalog changes
 * @param shopId - The shop ID (handles null/undefined gracefully by skipping revalidation)
 * @param locale - The locale for the path (default: 'en')
 */
function revalidateCatalogPaths(shopId: string | null | undefined, locale: string = 'en') {
  if (!shopId) {
    console.warn('[revalidateCatalogPaths] No shop ID provided, skipping revalidation');
    return;
  }
  revalidatePath(`/${locale}/${shopId}/settings/catalog`, 'page');
  revalidatePath(`/${locale}/${shopId}/inventory`, 'page');
  revalidatePath(`/${locale}/${shopId}`, 'layout');
}

// =============================================================================
// PRODUCT CATEGORIES ACTIONS
// =============================================================================

/**
 * Creates a new product category.
 *
 * @param input - The category data
 * @returns ActionResult with the created category on success
 */
export async function createCategory(
  input: z.infer<typeof CreateCategorySchema>
): Promise<ActionResult<ProductCategory>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateCategorySchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, category_name, description, sort_order } = validationResult.data;

    // 3. Check for duplicate category name in same shop
    const { data: existing } = await supabase
      .from('product_categories')
      .select('id_category')
      .eq('id_shop', id_shop)
      .eq('category_name', category_name)
      .is('deleted_at', null)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'A category with this name already exists',
        code: 'duplicate_name',
      };
    }

    // 4. Create category (RLS ensures user has access to this shop)
    const { data, error } = await supabase
      .from('product_categories')
      .insert({
        id_shop,
        category_name,
        description: description ?? null,
        sort_order: sort_order ?? null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (error) {
      console.error('[createCategory] Database error:', error);
      return {
        success: false,
        error: 'Failed to create category',
        code: 'database_error',
      };
    }

    // 5. Revalidate paths
    revalidateCatalogPaths(id_shop);

    return {
      success: true,
      data,
      message: 'Category created successfully',
    };
  } catch (err) {
    console.error('[createCategory] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates an existing product category.
 *
 * @param input - The category update data
 * @returns ActionResult with the updated category on success
 */
export async function updateCategory(
  input: z.infer<typeof UpdateCategorySchema>
): Promise<ActionResult<ProductCategory>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateCategorySchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_category, ...updateData } = validationResult.data;

    // 3. Check if category exists and get shop_id for revalidation
    const { data: existingCategory, error: fetchError } = await supabase
      .from('product_categories')
      .select('id_shop, category_name')
      .eq('id_category', id_category)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingCategory) {
      return {
        success: false,
        error: 'Category not found',
        code: 'not_found',
      };
    }

    // 4. Check for duplicate name if name is being changed
    if (updateData.category_name && updateData.category_name !== existingCategory.category_name) {
      const { data: duplicate } = await supabase
        .from('product_categories')
        .select('id_category')
        .eq('id_shop', existingCategory.id_shop)
        .eq('category_name', updateData.category_name)
        .is('deleted_at', null)
        .neq('id_category', id_category)
        .single();

      if (duplicate) {
        return {
          success: false,
          error: 'A category with this name already exists',
          code: 'duplicate_name',
        };
      }
    }

    // 5. Update category
    const { data, error } = await supabase
      .from('product_categories')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id_category', id_category)
      .select()
      .single();

    if (error) {
      console.error('[updateCategory] Database error:', error);
      return {
        success: false,
        error: 'Failed to update category',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateCatalogPaths(existingCategory.id_shop);

    return {
      success: true,
      data,
      message: 'Category updated successfully',
    };
  } catch (err) {
    console.error('[updateCategory] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Soft deletes a product category.
 *
 * @param id_category - The category ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteCategory(id_category: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid category ID');
    const validationResult = uuidSchema.safeParse(id_category);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid category ID',
        code: 'validation_error',
      };
    }

    // 3. Get category for shop_id
    const { data: category, error: fetchError } = await supabase
      .from('product_categories')
      .select('id_shop')
      .eq('id_category', id_category)
      .is('deleted_at', null)
      .single();

    if (fetchError || !category) {
      return {
        success: false,
        error: 'Category not found',
        code: 'not_found',
      };
    }

    // 4. Check if category is used by inventory items
    const { count } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('id_category', id_category)
      .is('deleted_at', null);

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete category: ${count} inventory item(s) are using it`,
        code: 'in_use',
      };
    }

    // 5. Soft delete category
    const { error } = await supabase
      .from('product_categories')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id_category', id_category);

    if (error) {
      console.error('[deleteCategory] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete category',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateCatalogPaths(category.id_shop);

    return {
      success: true,
      message: 'Category deleted successfully',
    };
  } catch (err) {
    console.error('[deleteCategory] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// METAL TYPES ACTIONS
// =============================================================================

/**
 * Creates a new metal type.
 *
 * @param input - The metal type data
 * @returns ActionResult with the created metal type on success
 */
export async function createMetalType(
  input: z.infer<typeof CreateMetalTypeSchema>
): Promise<ActionResult<MetalType>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateMetalTypeSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, metal_name, description, sort_order } = validationResult.data;

    // 3. Check for duplicate
    const { data: existing } = await supabase
      .from('metal_types')
      .select('id_metal_type')
      .eq('id_shop', id_shop)
      .eq('metal_name', metal_name)
      .is('deleted_at', null)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'A metal type with this name already exists',
        code: 'duplicate_name',
      };
    }

    // 4. Create metal type
    const { data, error } = await supabase
      .from('metal_types')
      .insert({
        id_shop,
        metal_name,
        description: description ?? null,
        sort_order: sort_order ?? null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (error) {
      console.error('[createMetalType] Database error:', error);
      return {
        success: false,
        error: 'Failed to create metal type',
        code: 'database_error',
      };
    }

    revalidateCatalogPaths(id_shop);

    return {
      success: true,
      data,
      message: 'Metal type created successfully',
    };
  } catch (err) {
    console.error('[createMetalType] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates an existing metal type.
 *
 * @param input - The metal type update data
 * @returns ActionResult with the updated metal type on success
 */
export async function updateMetalType(
  input: z.infer<typeof UpdateMetalTypeSchema>
): Promise<ActionResult<MetalType>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateMetalTypeSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_metal_type, ...updateData } = validationResult.data;

    // 3. Check if metal type exists
    const { data: existing, error: fetchError } = await supabase
      .from('metal_types')
      .select('id_shop, metal_name')
      .eq('id_metal_type', id_metal_type)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return {
        success: false,
        error: 'Metal type not found',
        code: 'not_found',
      };
    }

    // 4. Check for duplicate name
    if (updateData.metal_name && updateData.metal_name !== existing.metal_name) {
      const { data: duplicate } = await supabase
        .from('metal_types')
        .select('id_metal_type')
        .eq('id_shop', existing.id_shop)
        .eq('metal_name', updateData.metal_name)
        .is('deleted_at', null)
        .neq('id_metal_type', id_metal_type)
        .single();

      if (duplicate) {
        return {
          success: false,
          error: 'A metal type with this name already exists',
          code: 'duplicate_name',
        };
      }
    }

    // 5. Update metal type
    const { data, error } = await supabase
      .from('metal_types')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id_metal_type', id_metal_type)
      .select()
      .single();

    if (error) {
      console.error('[updateMetalType] Database error:', error);
      return {
        success: false,
        error: 'Failed to update metal type',
        code: 'database_error',
      };
    }

    revalidateCatalogPaths(existing.id_shop);

    return {
      success: true,
      data,
      message: 'Metal type updated successfully',
    };
  } catch (err) {
    console.error('[updateMetalType] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Soft deletes a metal type.
 *
 * @param id_metal_type - The metal type ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteMetalType(id_metal_type: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid metal type ID');
    const validationResult = uuidSchema.safeParse(id_metal_type);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid metal type ID',
        code: 'validation_error',
      };
    }

    // 3. Get metal type
    const { data: metalType, error: fetchError } = await supabase
      .from('metal_types')
      .select('id_shop')
      .eq('id_metal_type', id_metal_type)
      .is('deleted_at', null)
      .single();

    if (fetchError || !metalType) {
      return {
        success: false,
        error: 'Metal type not found',
        code: 'not_found',
      };
    }

    // 4. Check if metal type is used by inventory items
    const { count: inventoryCount } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('id_metal_type', id_metal_type)
      .is('deleted_at', null);

    if (inventoryCount && inventoryCount > 0) {
      return {
        success: false,
        error: `Cannot delete metal type: ${inventoryCount} inventory item(s) are using it`,
        code: 'in_use',
      };
    }

    // 5. Check if metal type has purities
    const { count: purityCount } = await supabase
      .from('metal_purities')
      .select('*', { count: 'exact', head: true })
      .eq('id_metal_type', id_metal_type)
      .is('deleted_at', null);

    if (purityCount && purityCount > 0) {
      return {
        success: false,
        error: `Cannot delete metal type: ${purityCount} purity level(s) are linked to it`,
        code: 'in_use',
      };
    }

    // 6. Soft delete
    const { error } = await supabase
      .from('metal_types')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id_metal_type', id_metal_type);

    if (error) {
      console.error('[deleteMetalType] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete metal type',
        code: 'database_error',
      };
    }

    revalidateCatalogPaths(metalType.id_shop);

    return {
      success: true,
      message: 'Metal type deleted successfully',
    };
  } catch (err) {
    console.error('[deleteMetalType] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// METAL PURITIES ACTIONS
// =============================================================================

/**
 * Creates a new metal purity.
 *
 * @param input - The metal purity data
 * @returns ActionResult with the created metal purity on success
 */
export async function createMetalPurity(
  input: z.infer<typeof CreateMetalPuritySchema>
): Promise<ActionResult<MetalPurity>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateMetalPuritySchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, id_metal_type, purity_name, purity_percentage, fineness, sort_order } =
      validationResult.data;

    // 3. Verify metal type exists and belongs to same shop
    const { data: metalType, error: metalTypeError } = await supabase
      .from('metal_types')
      .select('id_metal_type')
      .eq('id_metal_type', id_metal_type)
      .eq('id_shop', id_shop)
      .is('deleted_at', null)
      .single();

    if (metalTypeError || !metalType) {
      return {
        success: false,
        error: 'Metal type not found',
        code: 'not_found',
      };
    }

    // 4. Check for duplicate purity name within same metal type
    const { data: existing } = await supabase
      .from('metal_purities')
      .select('id_purity')
      .eq('id_shop', id_shop)
      .eq('id_metal_type', id_metal_type)
      .eq('purity_name', purity_name)
      .is('deleted_at', null)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'A purity with this name already exists for this metal type',
        code: 'duplicate_name',
      };
    }

    // 5. Create metal purity
    const { data, error } = await supabase
      .from('metal_purities')
      .insert({
        id_shop,
        id_metal_type,
        purity_name,
        purity_percentage,
        fineness,
        sort_order: sort_order ?? null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (error) {
      console.error('[createMetalPurity] Database error:', error);
      return {
        success: false,
        error: 'Failed to create metal purity',
        code: 'database_error',
      };
    }

    revalidateCatalogPaths(id_shop);

    return {
      success: true,
      data,
      message: 'Metal purity created successfully',
    };
  } catch (err) {
    console.error('[createMetalPurity] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates an existing metal purity.
 *
 * @param input - The metal purity update data
 * @returns ActionResult with the updated metal purity on success
 */
export async function updateMetalPurity(
  input: z.infer<typeof UpdateMetalPuritySchema>
): Promise<ActionResult<MetalPurity>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateMetalPuritySchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_purity, ...updateData } = validationResult.data;

    // 3. Check if purity exists
    const { data: existing, error: fetchError } = await supabase
      .from('metal_purities')
      .select('id_shop, id_metal_type, purity_name')
      .eq('id_purity', id_purity)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return {
        success: false,
        error: 'Metal purity not found',
        code: 'not_found',
      };
    }

    // 4. If changing metal type, verify it exists
    if (updateData.id_metal_type && updateData.id_metal_type !== existing.id_metal_type) {
      const { data: metalType, error: metalTypeError } = await supabase
        .from('metal_types')
        .select('id_metal_type')
        .eq('id_metal_type', updateData.id_metal_type)
        .eq('id_shop', existing.id_shop)
        .is('deleted_at', null)
        .single();

      if (metalTypeError || !metalType) {
        return {
          success: false,
          error: 'Metal type not found',
          code: 'not_found',
        };
      }
    }

    // 5. Check for duplicate name
    if (updateData.purity_name && updateData.purity_name !== existing.purity_name) {
      const metalTypeId = updateData.id_metal_type || existing.id_metal_type;
      const { data: duplicate } = await supabase
        .from('metal_purities')
        .select('id_purity')
        .eq('id_shop', existing.id_shop)
        .eq('id_metal_type', metalTypeId)
        .eq('purity_name', updateData.purity_name)
        .is('deleted_at', null)
        .neq('id_purity', id_purity)
        .single();

      if (duplicate) {
        return {
          success: false,
          error: 'A purity with this name already exists for this metal type',
          code: 'duplicate_name',
        };
      }
    }

    // 6. Update metal purity
    const { data, error } = await supabase
      .from('metal_purities')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id_purity', id_purity)
      .select()
      .single();

    if (error) {
      console.error('[updateMetalPurity] Database error:', error);
      return {
        success: false,
        error: 'Failed to update metal purity',
        code: 'database_error',
      };
    }

    revalidateCatalogPaths(existing.id_shop);

    return {
      success: true,
      data,
      message: 'Metal purity updated successfully',
    };
  } catch (err) {
    console.error('[updateMetalPurity] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Soft deletes a metal purity.
 *
 * @param id_purity - The metal purity ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteMetalPurity(id_purity: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid metal purity ID');
    const validationResult = uuidSchema.safeParse(id_purity);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid metal purity ID',
        code: 'validation_error',
      };
    }

    // 3. Get metal purity
    const { data: purity, error: fetchError } = await supabase
      .from('metal_purities')
      .select('id_shop')
      .eq('id_purity', id_purity)
      .is('deleted_at', null)
      .single();

    if (fetchError || !purity) {
      return {
        success: false,
        error: 'Metal purity not found',
        code: 'not_found',
      };
    }

    // 4. Check if purity is used by inventory items
    const { count } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('id_metal_purity', id_purity)
      .is('deleted_at', null);

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete metal purity: ${count} inventory item(s) are using it`,
        code: 'in_use',
      };
    }

    // 5. Soft delete
    const { error } = await supabase
      .from('metal_purities')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id_purity', id_purity);

    if (error) {
      console.error('[deleteMetalPurity] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete metal purity',
        code: 'database_error',
      };
    }

    revalidateCatalogPaths(purity.id_shop);

    return {
      success: true,
      message: 'Metal purity deleted successfully',
    };
  } catch (err) {
    console.error('[deleteMetalPurity] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// STONE TYPES ACTIONS
// =============================================================================

/**
 * Creates a new stone type.
 *
 * @param input - The stone type data
 * @returns ActionResult with the created stone type on success
 */
export async function createStoneType(
  input: z.infer<typeof CreateStoneTypeSchema>
): Promise<ActionResult<StoneType>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateStoneTypeSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, stone_name, category, mohs_hardness, description, sort_order } =
      validationResult.data;

    // 3. Check for duplicate
    const { data: existing } = await supabase
      .from('stone_types')
      .select('id_stone_type')
      .eq('id_shop', id_shop)
      .eq('stone_name', stone_name)
      .is('deleted_at', null)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'A stone type with this name already exists',
        code: 'duplicate_name',
      };
    }

    // 4. Create stone type
    const { data, error } = await supabase
      .from('stone_types')
      .insert({
        id_shop,
        stone_name,
        category,
        mohs_hardness: mohs_hardness ?? null,
        description: description ?? null,
        sort_order: sort_order ?? null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (error) {
      console.error('[createStoneType] Database error:', error);
      return {
        success: false,
        error: 'Failed to create stone type',
        code: 'database_error',
      };
    }

    revalidateCatalogPaths(id_shop);

    return {
      success: true,
      data,
      message: 'Stone type created successfully',
    };
  } catch (err) {
    console.error('[createStoneType] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Updates an existing stone type.
 *
 * @param input - The stone type update data
 * @returns ActionResult with the updated stone type on success
 */
export async function updateStoneType(
  input: z.infer<typeof UpdateStoneTypeSchema>
): Promise<ActionResult<StoneType>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = UpdateStoneTypeSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_stone_type, ...updateData } = validationResult.data;

    // 3. Check if stone type exists
    const { data: existing, error: fetchError } = await supabase
      .from('stone_types')
      .select('id_shop, stone_name')
      .eq('id_stone_type', id_stone_type)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return {
        success: false,
        error: 'Stone type not found',
        code: 'not_found',
      };
    }

    // 4. Check for duplicate name
    if (updateData.stone_name && updateData.stone_name !== existing.stone_name) {
      const { data: duplicate } = await supabase
        .from('stone_types')
        .select('id_stone_type')
        .eq('id_shop', existing.id_shop)
        .eq('stone_name', updateData.stone_name)
        .is('deleted_at', null)
        .neq('id_stone_type', id_stone_type)
        .single();

      if (duplicate) {
        return {
          success: false,
          error: 'A stone type with this name already exists',
          code: 'duplicate_name',
        };
      }
    }

    // 5. Update stone type
    const { data, error } = await supabase
      .from('stone_types')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id_stone_type', id_stone_type)
      .select()
      .single();

    if (error) {
      console.error('[updateStoneType] Database error:', error);
      return {
        success: false,
        error: 'Failed to update stone type',
        code: 'database_error',
      };
    }

    revalidateCatalogPaths(existing.id_shop);

    return {
      success: true,
      data,
      message: 'Stone type updated successfully',
    };
  } catch (err) {
    console.error('[updateStoneType] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Soft deletes a stone type.
 *
 * @param id_stone_type - The stone type ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteStoneType(id_stone_type: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid stone type ID');
    const validationResult = uuidSchema.safeParse(id_stone_type);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid stone type ID',
        code: 'validation_error',
      };
    }

    // 3. Get stone type
    const { data: stoneType, error: fetchError } = await supabase
      .from('stone_types')
      .select('id_shop')
      .eq('id_stone_type', id_stone_type)
      .is('deleted_at', null)
      .single();

    if (fetchError || !stoneType) {
      return {
        success: false,
        error: 'Stone type not found',
        code: 'not_found',
      };
    }

    // 4. Check if stone type is used by inventory items
    const { count: inventoryCount } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('id_stone_type', id_stone_type)
      .is('deleted_at', null);

    if (inventoryCount && inventoryCount > 0) {
      return {
        success: false,
        error: `Cannot delete stone type: ${inventoryCount} inventory item(s) are using it`,
        code: 'in_use',
      };
    }

    // 5. Check if stone type is used in item_stones
    const { count: itemStonesCount } = await supabase
      .from('item_stones')
      .select('*', { count: 'exact', head: true })
      .eq('id_stone_type', id_stone_type);

    if (itemStonesCount && itemStonesCount > 0) {
      return {
        success: false,
        error: `Cannot delete stone type: ${itemStonesCount} item stone record(s) are using it`,
        code: 'in_use',
      };
    }

    // 6. Soft delete
    const { error } = await supabase
      .from('stone_types')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id_stone_type', id_stone_type);

    if (error) {
      console.error('[deleteStoneType] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete stone type',
        code: 'database_error',
      };
    }

    revalidateCatalogPaths(stoneType.id_shop);

    return {
      success: true,
      message: 'Stone type deleted successfully',
    };
  } catch (err) {
    console.error('[deleteStoneType] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// PRODUCT SIZES ACTIONS
// =============================================================================

/**
 * Creates a new product size.
 *
 * Note: Product sizes do not have updated_at or deleted_at fields,
 * so we use hard delete instead of soft delete.
 *
 * @param input - The product size data
 * @returns ActionResult with the created product size on success
 */
export async function createProductSize(
  input: z.infer<typeof CreateProductSizeSchema>
): Promise<ActionResult<ProductSize>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateProductSizeSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { id_shop, id_category, size_name, size_value, size_system, sort_order } =
      validationResult.data;

    // 3. Verify category exists
    const { data: categoryData, error: categoryError } = await supabase
      .from('product_categories')
      .select('id_category')
      .eq('id_category', id_category)
      .eq('id_shop', id_shop)
      .is('deleted_at', null)
      .single();

    if (categoryError || !categoryData) {
      return {
        success: false,
        error: 'Category not found',
        code: 'not_found',
      };
    }

    // 4. Check for duplicate size name within same category
    const { data: existing } = await supabase
      .from('product_sizes')
      .select('id_size')
      .eq('id_shop', id_shop)
      .eq('id_category', id_category)
      .eq('size_name', size_name)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'A size with this name already exists for this category',
        code: 'duplicate_name',
      };
    }

    // 5. Create product size
    const { data, error } = await supabase
      .from('product_sizes')
      .insert({
        id_shop,
        id_category,
        size_name,
        size_value: size_value ?? null,
        size_system: size_system ?? null,
        sort_order: sort_order ?? null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (error) {
      console.error('[createProductSize] Database error:', error);
      return {
        success: false,
        error: 'Failed to create product size',
        code: 'database_error',
      };
    }

    revalidateCatalogPaths(id_shop);

    return {
      success: true,
      data,
      message: 'Product size created successfully',
    };
  } catch (err) {
    console.error('[createProductSize] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Deletes a product size.
 *
 * Note: Product sizes use hard delete since the table doesn't have
 * updated_at or deleted_at columns.
 *
 * @param id_size - The product size ID to delete
 * @returns ActionResult indicating success or failure
 */
export async function deleteProductSize(id_size: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUID
    const uuidSchema = z.string().uuid('Invalid product size ID');
    const validationResult = uuidSchema.safeParse(id_size);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid product size ID',
        code: 'validation_error',
      };
    }

    // 3. Get product size
    const { data: size, error: fetchError } = await supabase
      .from('product_sizes')
      .select('id_shop')
      .eq('id_size', id_size)
      .single();

    if (fetchError || !size) {
      return {
        success: false,
        error: 'Product size not found',
        code: 'not_found',
      };
    }

    // 4. Check if size is used by inventory items
    const { count } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('id_size', id_size)
      .is('deleted_at', null);

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete size: ${count} inventory item(s) are using it`,
        code: 'in_use',
      };
    }

    // 5. Hard delete (no soft delete for product_sizes)
    const { error } = await supabase.from('product_sizes').delete().eq('id_size', id_size);

    if (error) {
      console.error('[deleteProductSize] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete product size',
        code: 'database_error',
      };
    }

    revalidateCatalogPaths(size.id_shop);

    return {
      success: true,
      message: 'Product size deleted successfully',
    };
  } catch (err) {
    console.error('[deleteProductSize] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// METAL PRICES ACTIONS
// =============================================================================

/**
 * Creates a new metal price record.
 *
 * Metal prices are historical records and typically only added, not updated.
 * This maintains a price history for inventory valuation.
 *
 * @param input - The metal price data
 * @returns ActionResult with the created metal price on success
 */
export async function createMetalPrice(
  input: z.infer<typeof CreateMetalPriceSchema>
): Promise<ActionResult<MetalPrice>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateMetalPriceSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const {
      id_shop,
      id_metal_type,
      id_metal_purity,
      price_date,
      price_per_gram,
      buy_price_per_gram,
      sell_price_per_gram,
      currency,
      source,
      notes,
    } = validationResult.data;

    // 3. Verify metal type exists
    const { data: metalType, error: metalTypeError } = await supabase
      .from('metal_types')
      .select('id_metal_type')
      .eq('id_metal_type', id_metal_type)
      .eq('id_shop', id_shop)
      .is('deleted_at', null)
      .single();

    if (metalTypeError || !metalType) {
      return {
        success: false,
        error: 'Metal type not found',
        code: 'not_found',
      };
    }

    // 4. If metal purity provided, verify it exists and belongs to the metal type
    if (id_metal_purity) {
      const { data: purity, error: purityError } = await supabase
        .from('metal_purities')
        .select('id_purity')
        .eq('id_purity', id_metal_purity)
        .eq('id_shop', id_shop)
        .eq('id_metal_type', id_metal_type)
        .is('deleted_at', null)
        .single();

      if (purityError || !purity) {
        return {
          success: false,
          error: 'Metal purity not found or does not belong to the specified metal type',
          code: 'not_found',
        };
      }
    }

    // 5. Check for existing price on the same date for same metal/purity combination
    let existingQuery = supabase
      .from('metal_prices')
      .select('id_price')
      .eq('id_shop', id_shop)
      .eq('id_metal_type', id_metal_type)
      .eq('price_date', price_date);

    if (id_metal_purity) {
      existingQuery = existingQuery.eq('id_metal_purity', id_metal_purity);
    } else {
      existingQuery = existingQuery.is('id_metal_purity', null);
    }

    const { data: existing } = await existingQuery.single();

    if (existing) {
      return {
        success: false,
        error: 'A price record already exists for this metal/purity combination on this date',
        code: 'duplicate_record',
      };
    }

    // 6. Create metal price
    const { data, error } = await supabase
      .from('metal_prices')
      .insert({
        id_shop,
        id_metal_type,
        id_metal_purity: id_metal_purity ?? null,
        price_date,
        price_per_gram,
        buy_price_per_gram: buy_price_per_gram ?? null,
        sell_price_per_gram: sell_price_per_gram ?? null,
        currency,
        source: source ?? null,
        notes: notes ?? null,
        created_by: authData.publicUser.id_user,
      })
      .select()
      .single();

    if (error) {
      console.error('[createMetalPrice] Database error:', error);
      return {
        success: false,
        error: 'Failed to create metal price',
        code: 'database_error',
      };
    }

    revalidateCatalogPaths(id_shop);

    return {
      success: true,
      data,
      message: 'Metal price created successfully',
    };
  } catch (err) {
    console.error('[createMetalPrice] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

/**
 * Gets the latest metal price for a specific metal type and optional purity.
 *
 * @param id_shop - The shop ID
 * @param id_metal_type - The metal type ID
 * @param id_metal_purity - Optional metal purity ID
 * @returns ActionResult with the latest metal price on success
 */
export async function getLatestMetalPrice(
  id_shop: string,
  id_metal_type: string,
  id_metal_purity?: string
): Promise<ActionResult<MetalPrice>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate UUIDs
    const uuidSchema = z.string().uuid();
    if (!uuidSchema.safeParse(id_shop).success || !uuidSchema.safeParse(id_metal_type).success) {
      return {
        success: false,
        error: 'Invalid ID format',
        code: 'validation_error',
      };
    }

    if (id_metal_purity && !uuidSchema.safeParse(id_metal_purity).success) {
      return {
        success: false,
        error: 'Invalid metal purity ID format',
        code: 'validation_error',
      };
    }

    // 3. Build query
    let query = supabase
      .from('metal_prices')
      .select('*')
      .eq('id_shop', id_shop)
      .eq('id_metal_type', id_metal_type)
      .order('price_date', { ascending: false })
      .limit(1);

    if (id_metal_purity) {
      query = query.eq('id_metal_purity', id_metal_purity);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'No price found for this metal type',
          code: 'not_found',
        };
      }
      console.error('[getLatestMetalPrice] Database error:', error);
      return {
        success: false,
        error: 'Failed to fetch metal price',
        code: 'database_error',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err) {
    console.error('[getLatestMetalPrice] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}
