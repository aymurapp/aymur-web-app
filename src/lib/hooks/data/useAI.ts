/**
 * useAI Hooks
 *
 * TanStack Query v5 hooks for AI features including conversations,
 * messages, and credit management.
 *
 * Database Tables:
 * - ai_conversations: Chat sessions per shop/user
 * - ai_messages: Individual messages within conversations
 * - ai_credit_pools: Monthly credit allocation per shop
 * - ai_credit_allocations: Per-user credit allocation from pool
 * - ai_token_usage: Immutable token usage ledger (read-only)
 *
 * @module lib/hooks/data/useAI
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useUser } from '@/lib/hooks/auth';
import { useShop } from '@/lib/hooks/shop';
// Note: Using local aiKeys instead of central queryKeys for AI-specific queries
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/types/database';

// ============================================
// Type Definitions
// ============================================

/**
 * AI conversation row type from public.ai_conversations table
 */
export type AIConversation = Tables<'ai_conversations'>;

/**
 * AI conversation insert type
 */
export type AIConversationInsert = TablesInsert<'ai_conversations'>;

/**
 * AI conversation update type
 */
export type AIConversationUpdate = TablesUpdate<'ai_conversations'>;

/**
 * AI message row type from public.ai_messages table
 */
export type AIMessage = Tables<'ai_messages'>;

/**
 * AI message insert type
 */
export type AIMessageInsert = TablesInsert<'ai_messages'>;

/**
 * AI credit pool row type from public.ai_credit_pools table
 */
export type AICreditPool = Tables<'ai_credit_pools'>;

/**
 * AI credit allocation row type from public.ai_credit_allocations table
 */
export type AICreditAllocation = Tables<'ai_credit_allocations'>;

/**
 * AI token usage row type from public.ai_token_usage table (IMMUTABLE LEDGER)
 */
export type AITokenUsage = Tables<'ai_token_usage'>;

/**
 * Message role type
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Conversation with message count
 */
export interface AIConversationWithStats extends AIConversation {
  message_count?: number;
}

/**
 * Credit summary for a shop/user
 */
export interface AICreditSummary {
  /** Total credits allocated to the shop for the current period */
  totalCredits: number;
  /** Credits used by all users in the shop */
  usedCredits: number;
  /** Remaining credits for the shop */
  remainingCredits: number;
  /** User's personal allocation from the pool */
  userAllocation: {
    allocated: number;
    used: number;
    remaining: number;
  } | null;
  /** Current billing period */
  period: {
    start: string;
    end: string;
  } | null;
}

// ============================================
// Query Key Factory Extensions
// ============================================

/**
 * AI-specific query keys
 */
export const aiKeys = {
  /** All AI data for a shop */
  all: (shopId: string) => ['ai', shopId] as const,

  /** AI conversations for a shop */
  conversations: (shopId: string) => ['ai-conversations', shopId] as const,

  /** Single conversation with messages */
  conversation: (shopId: string, conversationId: string) =>
    ['ai-conversations', shopId, conversationId] as const,

  /** Messages for a conversation */
  messages: (conversationId: string) => ['ai-messages', conversationId] as const,

  /** Credit pool and allocations for a shop */
  credits: (shopId: string) => ['ai-credits', shopId] as const,

  /** User's credit allocation */
  userCredits: (shopId: string, userId: string) => ['ai-credits', shopId, userId] as const,
} as const;

// ============================================
// Options Types
// ============================================

/**
 * Options for useAIConversations hook
 */
export interface UseAIConversationsOptions {
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
  /** Number of conversations to fetch (default: 50) */
  limit?: number;
}

/**
 * Options for useAIConversation hook
 */
export interface UseAIConversationOptions {
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

/**
 * Options for useAIMessages hook
 */
export interface UseAIMessagesOptions {
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
  /** Number of messages to fetch (default: 100) */
  limit?: number;
}

/**
 * Options for useAICredits hook
 */
export interface UseAICreditsOptions {
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

// ============================================
// Return Types
// ============================================

/**
 * Return type for useAIConversations hook
 */
export interface UseAIConversationsReturn {
  /** Array of conversations */
  conversations: AIConversation[];
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Return type for useAIConversation hook
 */
export interface UseAIConversationReturn {
  /** The conversation data */
  conversation: AIConversation | null;
  /** Messages in the conversation */
  messages: AIMessage[];
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Return type for useAIMessages hook
 */
export interface UseAIMessagesReturn {
  /** Array of messages */
  messages: AIMessage[];
  /** True while loading */
  isLoading: boolean;
  /** True if fetching in background */
  isFetching: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

/**
 * Return type for useAICredits hook
 */
export interface UseAICreditsReturn {
  /** Total credits for the shop in current period */
  totalCredits: number;
  /** Used credits in current period */
  usedCredits: number;
  /** Remaining credits */
  remainingCredits: number;
  /** User's personal allocation */
  userAllocation: AICreditSummary['userAllocation'];
  /** True while loading */
  isLoading: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => void;
}

// ============================================
// Mutation Input Types
// ============================================

/**
 * Input for creating a new conversation
 */
export interface CreateConversationInput {
  /** Optional title for the conversation */
  title?: string;
}

/**
 * Input for sending a message
 */
export interface SendMessageInput {
  /** The conversation to add the message to */
  conversationId: string;
  /** The role of the message sender */
  role: MessageRole;
  /** The message content */
  content: string;
}

// ============================================
// Query Hooks
// ============================================

/**
 * Hook to fetch AI conversations for a shop
 *
 * Fetches all conversations for the current shop, ordered by
 * created_at descending (most recent first).
 *
 * @param options - Query options
 * @returns Conversations list with loading state
 *
 * @example
 * ```tsx
 * function ConversationList() {
 *   const { conversations, isLoading } = useAIConversations();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <ul>
 *       {conversations.map((conv) => (
 *         <li key={conv.id_conversation}>{conv.title}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useAIConversations(
  options: UseAIConversationsOptions = {}
): UseAIConversationsReturn {
  const { shopId, hasAccess } = useShop();
  const { enabled = true, limit = 50 } = options;

  const queryResult = useQuery({
    queryKey: [...aiKeys.conversations(shopId ?? ''), { limit }],
    queryFn: async () => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('id_shop', shopId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch conversations: ${error.message}`);
      }

      return data ?? [];
    },
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    conversations: queryResult.data ?? [],
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error as Error | null,
    refetch: queryResult.refetch,
  };
}

/**
 * Hook to fetch a single AI conversation with its messages
 *
 * Fetches the conversation details and all associated messages.
 *
 * @param conversationId - The conversation ID to fetch
 * @param options - Query options
 * @returns Conversation and messages with loading state
 *
 * @example
 * ```tsx
 * function ConversationView({ conversationId }: { conversationId: string }) {
 *   const { conversation, messages, isLoading } = useAIConversation(conversationId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (!conversation) return <NotFound />;
 *
 *   return (
 *     <div>
 *       <h1>{conversation.title}</h1>
 *       {messages.map((msg) => (
 *         <MessageBubble key={msg.id_message} message={msg} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAIConversation(
  conversationId: string,
  options: UseAIConversationOptions = {}
): UseAIConversationReturn {
  const { shopId, hasAccess } = useShop();
  const { enabled = true } = options;

  const isEnabled = !!shopId && hasAccess && !!conversationId && enabled;

  // Fetch conversation details
  const conversationQuery = useQuery({
    queryKey: aiKeys.conversation(shopId ?? '', conversationId),
    queryFn: async () => {
      if (!shopId || !conversationId) {
        return null;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('id_conversation', conversationId)
        .eq('id_shop', shopId)
        .single();

      if (error) {
        // PGRST116 = no rows found
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch conversation: ${error.message}`);
      }

      return data;
    },
    enabled: isEnabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch messages for the conversation
  const messagesQuery = useQuery({
    queryKey: aiKeys.messages(conversationId),
    queryFn: async () => {
      if (!conversationId) {
        return [];
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('id_conversation', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch messages: ${error.message}`);
      }

      return data ?? [];
    },
    enabled: isEnabled,
    staleTime: 10 * 1000, // 10 seconds - messages might update frequently
    gcTime: 5 * 60 * 1000,
  });

  const isLoading = conversationQuery.isLoading || messagesQuery.isLoading;
  const isFetching = conversationQuery.isFetching || messagesQuery.isFetching;
  const error = conversationQuery.error || messagesQuery.error;

  const refetch = () => {
    conversationQuery.refetch();
    messagesQuery.refetch();
  };

  return {
    conversation: conversationQuery.data ?? null,
    messages: messagesQuery.data ?? [],
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to fetch messages for a conversation
 *
 * Fetches all messages for a specific conversation, sorted by
 * created_at ascending (oldest first).
 *
 * @param conversationId - The conversation ID to fetch messages for
 * @param options - Query options
 * @returns Messages list with loading state
 *
 * @example
 * ```tsx
 * function MessageList({ conversationId }: { conversationId: string }) {
 *   const { messages, isLoading } = useAIMessages(conversationId);
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       {messages.map((msg) => (
 *         <div key={msg.id_message} className={msg.role}>
 *           {msg.content}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAIMessages(
  conversationId: string,
  options: UseAIMessagesOptions = {}
): UseAIMessagesReturn {
  const { shopId, hasAccess } = useShop();
  const { enabled = true, limit = 100 } = options;

  const queryResult = useQuery({
    queryKey: [...aiKeys.messages(conversationId), { limit }],
    queryFn: async () => {
      if (!conversationId) {
        return [];
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('id_conversation', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch messages: ${error.message}`);
      }

      return data ?? [];
    },
    enabled: !!shopId && hasAccess && !!conversationId && enabled,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 5 * 60 * 1000,
  });

  return {
    messages: queryResult.data ?? [],
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error as Error | null,
    refetch: queryResult.refetch,
  };
}

/**
 * Hook to fetch AI credits for the current shop and user
 *
 * Fetches the current credit pool for the shop and the user's
 * personal allocation from that pool.
 *
 * @param options - Query options
 * @returns Credit summary with loading state
 *
 * @example
 * ```tsx
 * function CreditDisplay() {
 *   const { totalCredits, usedCredits, remainingCredits, userAllocation, isLoading } = useAICredits();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <p>Shop Credits: {remainingCredits} / {totalCredits}</p>
 *       {userAllocation && (
 *         <p>Your Credits: {userAllocation.remaining} / {userAllocation.allocated}</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAICredits(options: UseAICreditsOptions = {}): UseAICreditsReturn {
  const { shopId, hasAccess } = useShop();
  const { user } = useUser();
  const { enabled = true } = options;

  const userId = user?.id_user;

  const queryResult = useQuery({
    queryKey: aiKeys.credits(shopId ?? ''),
    queryFn: async (): Promise<AICreditSummary> => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      const supabase = createClient();
      const now = new Date().toISOString();

      // Fetch the current active credit pool for the shop
      const { data: poolData, error: poolError } = await supabase
        .from('ai_credit_pools')
        .select('*')
        .eq('id_shop', shopId)
        .lte('period_start', now)
        .gte('period_end', now)
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (poolError) {
        throw new Error(`Failed to fetch credit pool: ${poolError.message}`);
      }

      // If no pool exists, return zeros
      if (!poolData) {
        return {
          totalCredits: 0,
          usedCredits: 0,
          remainingCredits: 0,
          userAllocation: null,
          period: null,
        };
      }

      // Calculate used credits from the pool
      // owner_used + staff_pool_used = total used
      const ownerUsed = poolData.owner_used ?? 0;
      const staffPoolUsed = poolData.staff_pool_used ?? 0;
      const usedCredits = ownerUsed + staffPoolUsed;
      const remainingCredits = poolData.total_credits - usedCredits;

      // Fetch user's allocation if userId is available
      let userAllocation: AICreditSummary['userAllocation'] = null;

      if (userId) {
        const { data: allocationData, error: allocationError } = await supabase
          .from('ai_credit_allocations')
          .select('*')
          .eq('id_credit_pool', poolData.id_credit_pool)
          .eq('id_user', userId)
          .maybeSingle();

        if (allocationError && allocationError.code !== 'PGRST116') {
          // Log but don't throw - allocation is optional
          console.warn('Failed to fetch user credit allocation:', allocationError.message);
        }

        if (allocationData) {
          const allocatedUsed = allocationData.used_credits ?? 0;
          userAllocation = {
            allocated: allocationData.allocated_credits,
            used: allocatedUsed,
            remaining: allocationData.allocated_credits - allocatedUsed,
          };
        }
      }

      return {
        totalCredits: poolData.total_credits,
        usedCredits,
        remainingCredits,
        userAllocation,
        period: {
          start: poolData.period_start,
          end: poolData.period_end,
        },
      };
    },
    enabled: !!shopId && hasAccess && enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });

  const data = queryResult.data;

  return {
    totalCredits: data?.totalCredits ?? 0,
    usedCredits: data?.usedCredits ?? 0,
    remainingCredits: data?.remainingCredits ?? 0,
    userAllocation: data?.userAllocation ?? null,
    isLoading: queryResult.isLoading,
    error: queryResult.error as Error | null,
    refetch: queryResult.refetch,
  };
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to create a new AI conversation
 *
 * Creates a new conversation for the current shop and user.
 *
 * @returns Mutation object for creating conversations
 *
 * @example
 * ```tsx
 * function NewConversationButton() {
 *   const createConversation = useCreateConversation();
 *
 *   const handleClick = async () => {
 *     try {
 *       const conversation = await createConversation.mutateAsync({
 *         title: 'New Chat'
 *       });
 *       router.push(`/ai/${conversation.id_conversation}`);
 *     } catch (error) {
 *       toast.error('Failed to create conversation');
 *     }
 *   };
 *
 *   return (
 *     <Button onClick={handleClick} loading={createConversation.isPending}>
 *       New Conversation
 *     </Button>
 *   );
 * }
 * ```
 */
export function useCreateConversation() {
  const { shopId } = useShop();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateConversationInput): Promise<AIConversation> => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      if (!user?.id_user) {
        throw new Error('No user context available');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          id_shop: shopId,
          id_user: user.id_user,
          title: input.title ?? null,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create conversation: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      if (shopId) {
        // Invalidate conversations list
        queryClient.invalidateQueries({
          queryKey: aiKeys.conversations(shopId),
        });
      }
    },
  });
}

/**
 * Hook to send a message in a conversation
 *
 * Adds a new message to an existing conversation.
 * Note: AI responses are handled by the API route, not this mutation.
 *
 * @returns Mutation object for sending messages
 *
 * @example
 * ```tsx
 * function ChatInput({ conversationId }: { conversationId: string }) {
 *   const [message, setMessage] = useState('');
 *   const sendMessage = useSendMessage();
 *
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault();
 *     if (!message.trim()) return;
 *
 *     try {
 *       await sendMessage.mutateAsync({
 *         conversationId,
 *         role: 'user',
 *         content: message,
 *       });
 *       setMessage('');
 *     } catch (error) {
 *       toast.error('Failed to send message');
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input value={message} onChange={(e) => setMessage(e.target.value)} />
 *       <button type="submit" disabled={sendMessage.isPending}>
 *         Send
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useSendMessage() {
  const { shopId } = useShop();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendMessageInput): Promise<AIMessage> => {
      if (!shopId) {
        throw new Error('No shop context available');
      }

      if (!user?.id_user) {
        throw new Error('No user context available');
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from('ai_messages')
        .insert({
          id_conversation: input.conversationId,
          id_shop: shopId,
          id_user: user.id_user,
          role: input.role,
          content: input.content,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to send message: ${error.message}`);
      }

      return data;
    },
    onSuccess: (_data, variables) => {
      if (shopId) {
        // Invalidate messages for this conversation
        queryClient.invalidateQueries({
          queryKey: aiKeys.messages(variables.conversationId),
        });

        // Invalidate conversation to update last_message_at, etc.
        queryClient.invalidateQueries({
          queryKey: aiKeys.conversation(shopId, variables.conversationId),
        });

        // Invalidate conversations list to update order
        queryClient.invalidateQueries({
          queryKey: aiKeys.conversations(shopId),
        });
      }
    },
  });
}

// ============================================
// Utility Hooks
// ============================================

/**
 * Utility to invalidate AI-related caches
 *
 * @returns Object with invalidation functions
 */
export function useInvalidateAI() {
  const queryClient = useQueryClient();
  const { shopId } = useShop();

  return {
    /** Invalidate all AI queries for current shop */
    invalidateAll: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: aiKeys.all(shopId),
        });
      }
      return undefined;
    },

    /** Invalidate conversations list */
    invalidateConversations: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: aiKeys.conversations(shopId),
        });
      }
      return undefined;
    },

    /** Invalidate a specific conversation */
    invalidateConversation: (conversationId: string): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: aiKeys.conversation(shopId, conversationId),
        });
      }
      return undefined;
    },

    /** Invalidate messages for a conversation */
    invalidateMessages: (conversationId: string): Promise<void> | undefined => {
      return queryClient.invalidateQueries({
        queryKey: aiKeys.messages(conversationId),
      });
    },

    /** Invalidate credit data */
    invalidateCredits: (): Promise<void> | undefined => {
      if (shopId) {
        return queryClient.invalidateQueries({
          queryKey: aiKeys.credits(shopId),
        });
      }
      return undefined;
    },
  };
}
