'use server';

/**
 * AI Server Actions
 *
 * Server-side actions for managing AI features in the Aymur Platform.
 * These actions handle AI conversations, messages, and credit management.
 *
 * Key features:
 * - Conversation CRUD (create, read, delete)
 * - Message management within conversations
 * - Credit pool and allocation tracking
 * - Immutable token usage ledger (INSERT ONLY)
 *
 * IMPORTANT NOTES:
 * - `ai_token_usage` is IMMUTABLE - only INSERT allowed, NO UPDATE/DELETE
 * - Credits are tracked at both pool (shop) and allocation (user) levels
 * - RLS policies enforce user-specific access for conversations and messages
 * - Credit pools are shop-wide; allocations are per-user within a pool
 *
 * RLS Patterns:
 * - ai_conversations: id_shop + id_user (user can only see their own conversations)
 * - ai_messages: id_shop + id_user (user can only see their own messages)
 * - ai_credit_pools: id_shop only (all shop members can see pool)
 * - ai_credit_allocations: id_shop only (managers can see all allocations)
 * - ai_token_usage: INSERT allowed, SELECT by id_shop + id_user
 *
 * @module lib/actions/ai
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
type AIConversation = Database['public']['Tables']['ai_conversations']['Row'];
type AIMessage = Database['public']['Tables']['ai_messages']['Row'];
type AICreditPool = Database['public']['Tables']['ai_credit_pools']['Row'];
type AICreditAllocation = Database['public']['Tables']['ai_credit_allocations']['Row'];
type AITokenUsage = Database['public']['Tables']['ai_token_usage']['Row'];

/**
 * Conversation with its messages
 */
export interface ConversationWithMessages extends AIConversation {
  messages: AIMessage[];
}

/**
 * Credit pool with remaining credits calculated
 */
export interface CreditPoolInfo {
  id_credit_pool: string;
  id_shop: string;
  period_start: string;
  period_end: string;
  total_credits: number;
  owner_credits: number;
  staff_pool_credits: number;
  owner_used: number;
  staff_pool_used: number;
  owner_overflow_used: number;
  // Calculated fields
  total_used: number;
  total_remaining: number;
  owner_remaining: number;
  staff_pool_remaining: number;
  is_active: boolean;
}

/**
 * User's credit allocation info
 */
export interface UserCreditInfo {
  allocation: AICreditAllocation | null;
  pool: CreditPoolInfo | null;
  available_credits: number;
  is_owner: boolean;
}

/**
 * Token usage input for tracking
 */
export interface TokenUsageInput {
  conversationId: string;
  messageId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  creditsCharged: number;
  costUsd?: number;
}

/**
 * Add message input
 */
export interface AddMessageInput {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokensUsed?: number;
  creditsUsed?: number;
  hasOperation?: boolean;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * UUID validation schema
 */
const UUIDSchema = z.string().uuid('Invalid ID format');

/**
 * Create conversation input schema
 */
export const CreateConversationSchema = z.object({
  shopId: z.string().uuid('Invalid shop ID'),
  title: z
    .string()
    .max(255, 'Title must be less than 255 characters')
    .optional()
    .default('New Conversation'),
});

/**
 * Add message input schema
 */
export const AddMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  role: z.enum(['user', 'assistant', 'system'], {
    errorMap: () => ({ message: 'Role must be user, assistant, or system' }),
  }),
  content: z.string().min(1, 'Content is required'),
  tokensUsed: z.number().int().min(0).optional().default(0),
  creditsUsed: z.number().int().min(0).optional().default(0),
  hasOperation: z.boolean().optional().default(false),
  metadata: z.record(z.unknown()).optional().default({}),
});

/**
 * Token usage input schema
 */
export const TokenUsageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  messageId: z.string().uuid('Invalid message ID'),
  model: z.string().min(1, 'Model name is required'),
  inputTokens: z.number().int().min(0, 'Input tokens must be non-negative'),
  outputTokens: z.number().int().min(0, 'Output tokens must be non-negative'),
  creditsCharged: z.number().int().min(0, 'Credits charged must be non-negative'),
  costUsd: z.number().min(0).optional(),
});

/**
 * Check credits input schema
 */
export const CheckCreditsSchema = z.object({
  shopId: z.string().uuid('Invalid shop ID'),
  estimatedTokens: z.number().int().min(0, 'Estimated tokens must be non-negative'),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the authenticated user and their public.users record.
 * Returns null if not authenticated.
 */
async function getAuthenticatedUser(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ authUser: { id: string }; publicUser: { id_user: string } } | null> {
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
 * Checks if user is shop owner
 */
async function isShopOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shopId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase.from('shops').select('id_owner').eq('id_shop', shopId).single();

  return data?.id_owner === userId;
}

/**
 * Gets the current active credit pool for a shop
 */
async function getCurrentCreditPool(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shopId: string
): Promise<AICreditPool | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ai_credit_pools')
    .select('*')
    .eq('id_shop', shopId)
    .lte('period_start', today)
    .gte('period_end', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Standard revalidation paths for AI changes
 */
function revalidateAIPaths(shopId: string, locale: string = 'en'): void {
  revalidatePath(`/${locale}/${shopId}/ai`, 'page');
  revalidatePath(`/${locale}/${shopId}/ai/assistant`, 'page');
}

// =============================================================================
// GET CONVERSATIONS
// =============================================================================

/**
 * Fetches all conversations for a shop.
 * Due to RLS, only returns conversations belonging to the authenticated user.
 *
 * @param shopId - The shop ID to get conversations for
 * @returns ActionResult with array of conversations ordered by created_at desc
 *
 * @example
 * ```tsx
 * const result = await getConversations('shop-uuid');
 * if (result.success) {
 *   console.log(`Found ${result.data?.length} conversations`);
 * }
 * ```
 */
export async function getConversations(shopId: string): Promise<ActionResult<AIConversation[]>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate shop ID
    const validationResult = UUIDSchema.safeParse(shopId);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid shop ID',
        code: 'validation_error',
      };
    }

    // 3. Fetch conversations (RLS ensures user + shop access)
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id_shop', shopId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getConversations] Database error:', error);
      return {
        success: false,
        error: 'Failed to fetch conversations',
        code: 'database_error',
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err) {
    console.error('[getConversations] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GET CONVERSATION WITH MESSAGES
// =============================================================================

/**
 * Fetches a single conversation with all its messages.
 * Validates that the user has access to this conversation.
 *
 * @param conversationId - The conversation ID to fetch
 * @returns ActionResult with conversation and messages
 *
 * @example
 * ```tsx
 * const result = await getConversation('conversation-uuid');
 * if (result.success) {
 *   console.log(`Conversation: ${result.data?.title}`);
 *   console.log(`Messages: ${result.data?.messages.length}`);
 * }
 * ```
 */
export async function getConversation(
  conversationId: string
): Promise<ActionResult<ConversationWithMessages>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate conversation ID
    const validationResult = UUIDSchema.safeParse(conversationId);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid conversation ID',
        code: 'validation_error',
      };
    }

    // 3. Fetch conversation (RLS ensures user + shop access)
    const { data: conversation, error: convError } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id_conversation', conversationId)
      .single();

    if (convError) {
      if (convError.code === 'PGRST116') {
        return {
          success: false,
          error: 'Conversation not found',
          code: 'not_found',
        };
      }
      console.error('[getConversation] Database error:', convError);
      return {
        success: false,
        error: 'Failed to fetch conversation',
        code: 'database_error',
      };
    }

    // 4. Fetch messages for this conversation (RLS filters)
    const { data: messages, error: msgError } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('id_conversation', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('[getConversation] Messages error:', msgError);
      return {
        success: false,
        error: 'Failed to fetch messages',
        code: 'database_error',
      };
    }

    return {
      success: true,
      data: {
        ...conversation,
        messages: messages || [],
      },
    };
  } catch (err) {
    console.error('[getConversation] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// CREATE CONVERSATION
// =============================================================================

/**
 * Creates a new AI conversation.
 *
 * @param shopId - The shop ID to create the conversation in
 * @param title - Optional title (defaults to "New Conversation")
 * @returns ActionResult with the created conversation
 *
 * @example
 * ```tsx
 * const result = await createConversation('shop-uuid', 'Sales Analysis');
 * if (result.success) {
 *   console.log(`Created: ${result.data?.id_conversation}`);
 * }
 * ```
 */
export async function createConversation(
  shopId: string,
  title?: string
): Promise<ActionResult<AIConversation>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CreateConversationSchema.safeParse({ shopId, title });
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { shopId: validShopId, title: validTitle } = validationResult.data;

    // 3. Create conversation
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        id_shop: validShopId,
        id_user: authData.publicUser.id_user,
        title: validTitle,
        status: 'active',
        total_messages: 0,
        total_tokens_used: 0,
        total_credits_used: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[createConversation] Database error:', error);
      return {
        success: false,
        error: 'Failed to create conversation',
        code: 'database_error',
      };
    }

    // 4. Revalidate paths
    revalidateAIPaths(validShopId);

    return {
      success: true,
      data,
      message: 'Conversation created successfully',
    };
  } catch (err) {
    console.error('[createConversation] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// DELETE CONVERSATION
// =============================================================================

/**
 * Deletes a conversation and all its messages.
 * This is a hard delete as conversations don't have soft delete.
 *
 * @param conversationId - The conversation ID to delete
 * @returns ActionResult indicating success or failure
 *
 * @example
 * ```tsx
 * const result = await deleteConversation('conversation-uuid');
 * if (result.success) {
 *   message.success('Conversation deleted');
 * }
 * ```
 */
export async function deleteConversation(conversationId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate conversation ID
    const validationResult = UUIDSchema.safeParse(conversationId);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid conversation ID',
        code: 'validation_error',
      };
    }

    // 3. Get conversation to verify access and get shop ID
    const { data: conversation, error: fetchError } = await supabase
      .from('ai_conversations')
      .select('id_shop')
      .eq('id_conversation', conversationId)
      .single();

    if (fetchError || !conversation) {
      return {
        success: false,
        error: 'Conversation not found',
        code: 'not_found',
      };
    }

    // 4. Delete messages first (due to foreign key constraint)
    const { error: msgDeleteError } = await supabase
      .from('ai_messages')
      .delete()
      .eq('id_conversation', conversationId);

    if (msgDeleteError) {
      console.error('[deleteConversation] Message delete error:', msgDeleteError);
      return {
        success: false,
        error: 'Failed to delete conversation messages',
        code: 'database_error',
      };
    }

    // 5. Delete conversation
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id_conversation', conversationId);

    if (error) {
      console.error('[deleteConversation] Database error:', error);
      return {
        success: false,
        error: 'Failed to delete conversation',
        code: 'database_error',
      };
    }

    // 6. Revalidate paths
    revalidateAIPaths(conversation.id_shop);

    return {
      success: true,
      message: 'Conversation deleted successfully',
    };
  } catch (err) {
    console.error('[deleteConversation] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// ADD MESSAGE
// =============================================================================

/**
 * Adds a message to a conversation.
 *
 * @param input - The message data
 * @returns ActionResult with the created message
 *
 * @example
 * ```tsx
 * const result = await addMessage({
 *   conversationId: 'conversation-uuid',
 *   role: 'user',
 *   content: 'How are my sales this month?'
 * });
 * if (result.success) {
 *   console.log(`Message ID: ${result.data?.id_message}`);
 * }
 * ```
 */
export async function addMessage(input: AddMessageInput): Promise<ActionResult<AIMessage>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = AddMessageSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { conversationId, role, content, tokensUsed, creditsUsed, hasOperation, metadata } =
      validationResult.data;

    // 3. Get conversation to verify access and get shop ID
    const { data: conversation, error: convError } = await supabase
      .from('ai_conversations')
      .select('id_shop, total_messages, total_tokens_used, total_credits_used')
      .eq('id_conversation', conversationId)
      .single();

    if (convError || !conversation) {
      return {
        success: false,
        error: 'Conversation not found',
        code: 'not_found',
      };
    }

    // 4. Create message
    const { data, error } = await supabase
      .from('ai_messages')
      .insert({
        id_shop: conversation.id_shop,
        id_conversation: conversationId,
        id_user: authData.publicUser.id_user,
        role,
        content,
        tokens_used: tokensUsed,
        credits_used: creditsUsed,
        has_operation: hasOperation,
        metadata: metadata as Database['public']['Tables']['ai_messages']['Insert']['metadata'],
      })
      .select()
      .single();

    if (error) {
      console.error('[addMessage] Database error:', error);
      return {
        success: false,
        error: 'Failed to add message',
        code: 'database_error',
      };
    }

    // 5. Update conversation stats
    await supabase
      .from('ai_conversations')
      .update({
        total_messages: (conversation.total_messages ?? 0) + 1,
        total_tokens_used: (conversation.total_tokens_used ?? 0) + (tokensUsed ?? 0),
        total_credits_used: (conversation.total_credits_used ?? 0) + (creditsUsed ?? 0),
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id_conversation', conversationId);

    return {
      success: true,
      data,
      message: 'Message added successfully',
    };
  } catch (err) {
    console.error('[addMessage] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// GET AI CREDITS
// =============================================================================

/**
 * Gets the current credit pool for a shop with calculated remaining credits.
 *
 * @param shopId - The shop ID to get credits for
 * @returns ActionResult with credit pool information
 *
 * @example
 * ```tsx
 * const result = await getAICredits('shop-uuid');
 * if (result.success) {
 *   console.log(`Remaining credits: ${result.data?.total_remaining}`);
 * }
 * ```
 */
export async function getAICredits(shopId: string): Promise<ActionResult<UserCreditInfo>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate shop ID
    const validationResult = UUIDSchema.safeParse(shopId);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid shop ID',
        code: 'validation_error',
      };
    }

    // 3. Get current credit pool
    const pool = await getCurrentCreditPool(supabase, shopId);

    if (!pool) {
      return {
        success: true,
        data: {
          allocation: null,
          pool: null,
          available_credits: 0,
          is_owner: false,
        },
      };
    }

    // 4. Check if user is shop owner
    const isOwner = await isShopOwner(supabase, shopId, authData.publicUser.id_user);

    // 5. Calculate pool info
    const poolInfo: CreditPoolInfo = {
      id_credit_pool: pool.id_credit_pool,
      id_shop: pool.id_shop,
      period_start: pool.period_start,
      period_end: pool.period_end,
      total_credits: pool.total_credits,
      owner_credits: pool.owner_credits,
      staff_pool_credits: pool.staff_pool_credits,
      owner_used: pool.owner_used || 0,
      staff_pool_used: pool.staff_pool_used || 0,
      owner_overflow_used: pool.owner_overflow_used || 0,
      total_used:
        (pool.owner_used || 0) + (pool.staff_pool_used || 0) + (pool.owner_overflow_used || 0),
      total_remaining:
        pool.total_credits -
        ((pool.owner_used || 0) + (pool.staff_pool_used || 0) + (pool.owner_overflow_used || 0)),
      owner_remaining: pool.owner_credits - (pool.owner_used || 0),
      staff_pool_remaining: pool.staff_pool_credits - (pool.staff_pool_used || 0),
      is_active: true,
    };

    // 6. Get user allocation if not owner
    let allocation: AICreditAllocation | null = null;
    let availableCredits = 0;

    if (isOwner) {
      // Owner can use their credits + overflow into staff pool
      availableCredits = poolInfo.owner_remaining + poolInfo.staff_pool_remaining;
    } else {
      // Get user's specific allocation
      const { data: allocationData } = await supabase
        .from('ai_credit_allocations')
        .select('*')
        .eq('id_credit_pool', pool.id_credit_pool)
        .eq('id_user', authData.publicUser.id_user)
        .single();

      allocation = allocationData;

      if (allocation) {
        availableCredits = allocation.allocated_credits - (allocation.used_credits || 0);
      }
    }

    return {
      success: true,
      data: {
        allocation,
        pool: poolInfo,
        available_credits: Math.max(0, availableCredits),
        is_owner: isOwner,
      },
    };
  } catch (err) {
    console.error('[getAICredits] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// TRACK TOKEN USAGE
// =============================================================================

/**
 * Creates a record in the immutable ai_token_usage ledger and updates credit usage.
 *
 * IMPORTANT: ai_token_usage is an IMMUTABLE LEDGER table.
 * - Only INSERT operations are allowed
 * - No UPDATE or DELETE - will throw database errors
 * - Corrections require compensating entries (not supported in this action)
 *
 * This action also updates:
 * - ai_credit_pools (owner_used or staff_pool_used)
 * - ai_credit_allocations (used_credits) for non-owner users
 *
 * @param input - Token usage data
 * @returns ActionResult with the created usage record
 *
 * @example
 * ```tsx
 * const result = await trackTokenUsage({
 *   conversationId: 'conversation-uuid',
 *   messageId: 'message-uuid',
 *   model: 'gpt-4',
 *   inputTokens: 100,
 *   outputTokens: 200,
 *   creditsCharged: 3,
 *   costUsd: 0.05
 * });
 * ```
 */
export async function trackTokenUsage(input: TokenUsageInput): Promise<ActionResult<AITokenUsage>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = TokenUsageSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    const { conversationId, messageId, model, inputTokens, outputTokens, creditsCharged, costUsd } =
      validationResult.data;

    // 3. Get conversation to verify access and get shop ID
    const { data: conversation, error: convError } = await supabase
      .from('ai_conversations')
      .select('id_shop')
      .eq('id_conversation', conversationId)
      .single();

    if (convError || !conversation) {
      return {
        success: false,
        error: 'Conversation not found',
        code: 'not_found',
      };
    }

    const shopId = conversation.id_shop;
    const totalTokens = inputTokens + outputTokens;

    // 4. Insert into immutable ledger (ai_token_usage)
    const { data, error } = await supabase
      .from('ai_token_usage')
      .insert({
        id_shop: shopId,
        id_user: authData.publicUser.id_user,
        id_conversation: conversationId,
        id_message: messageId,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        credits_charged: creditsCharged,
        cost_usd: costUsd,
      })
      .select()
      .single();

    if (error) {
      console.error('[trackTokenUsage] Database error:', error);
      return {
        success: false,
        error: 'Failed to track token usage',
        code: 'database_error',
      };
    }

    // 5. Update credit pools
    const pool = await getCurrentCreditPool(supabase, shopId);
    if (pool) {
      const isOwner = await isShopOwner(supabase, shopId, authData.publicUser.id_user);

      if (isOwner) {
        // Update owner's usage
        const currentOwnerUsed = pool.owner_used || 0;
        const ownerRemaining = pool.owner_credits - currentOwnerUsed;

        if (creditsCharged <= ownerRemaining) {
          // All credits from owner pool
          await supabase
            .from('ai_credit_pools')
            .update({
              owner_used: currentOwnerUsed + creditsCharged,
              updated_at: new Date().toISOString(),
            })
            .eq('id_credit_pool', pool.id_credit_pool);
        } else {
          // Overflow into staff pool
          const overflowPortion = creditsCharged - ownerRemaining;

          await supabase
            .from('ai_credit_pools')
            .update({
              owner_used: pool.owner_credits, // Max out owner credits
              owner_overflow_used: (pool.owner_overflow_used || 0) + overflowPortion,
              updated_at: new Date().toISOString(),
            })
            .eq('id_credit_pool', pool.id_credit_pool);
        }
      } else {
        // Staff user - update staff pool and allocation
        await supabase
          .from('ai_credit_pools')
          .update({
            staff_pool_used: (pool.staff_pool_used || 0) + creditsCharged,
            updated_at: new Date().toISOString(),
          })
          .eq('id_credit_pool', pool.id_credit_pool);

        // Update user's allocation
        const { data: allocation } = await supabase
          .from('ai_credit_allocations')
          .select('id_allocation, used_credits')
          .eq('id_credit_pool', pool.id_credit_pool)
          .eq('id_user', authData.publicUser.id_user)
          .single();

        if (allocation) {
          await supabase
            .from('ai_credit_allocations')
            .update({
              used_credits: (allocation.used_credits || 0) + creditsCharged,
              updated_at: new Date().toISOString(),
            })
            .eq('id_allocation', allocation.id_allocation);
        }
      }
    }

    return {
      success: true,
      data,
      message: 'Token usage tracked successfully',
    };
  } catch (err) {
    console.error('[trackTokenUsage] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}

// =============================================================================
// CHECK CREDITS AVAILABLE
// =============================================================================

/**
 * Checks if the user has enough credits for an estimated token usage.
 * Uses a simple token-to-credit conversion (1 credit per 1000 tokens, rounded up).
 *
 * @param shopId - The shop ID to check credits for
 * @param estimatedTokens - Estimated number of tokens to be used
 * @returns ActionResult with boolean indicating if credits are available
 *
 * @example
 * ```tsx
 * const result = await checkCreditsAvailable('shop-uuid', 5000);
 * if (result.success && result.data) {
 *   // Proceed with AI request
 * } else {
 *   message.error('Insufficient AI credits');
 * }
 * ```
 */
export async function checkCreditsAvailable(
  shopId: string,
  estimatedTokens: number
): Promise<ActionResult<boolean>> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const authData = await getAuthenticatedUser(supabase);
    if (!authData) {
      return { success: false, error: 'Unauthorized', code: 'unauthorized' };
    }

    // 2. Validate input
    const validationResult = CheckCreditsSchema.safeParse({ shopId, estimatedTokens });
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Validation failed',
        code: 'validation_error',
      };
    }

    // 3. Get user's credit info
    const creditsResult = await getAICredits(shopId);
    if (!creditsResult.success) {
      return creditsResult;
    }

    // 4. Calculate required credits (1 credit per 1000 tokens, rounded up)
    const requiredCredits = Math.ceil(estimatedTokens / 1000);

    // 5. Check if enough credits available
    const availableCredits = creditsResult.data?.available_credits || 0;
    const hasEnough = availableCredits >= requiredCredits;

    return {
      success: true,
      data: hasEnough,
      message: hasEnough
        ? `Sufficient credits available (${availableCredits} available, ${requiredCredits} required)`
        : `Insufficient credits (${availableCredits} available, ${requiredCredits} required)`,
    };
  } catch (err) {
    console.error('[checkCreditsAvailable] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
    };
  }
}
