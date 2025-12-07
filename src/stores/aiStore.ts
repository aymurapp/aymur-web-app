/**
 * AI Store
 * Manages AI chat panel state and conversation context
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type AIOperationType = 'analyze' | 'generate' | 'summarize' | 'translate' | 'suggest' | null;

export interface PendingOperation {
  type: AIOperationType;
  context?: Record<string, unknown>;
  startedAt: Date;
}

interface AIState {
  // Panel state
  isOpen: boolean;
  activeConversationId: string | null;

  // Streaming state
  isStreaming: boolean;
  pendingOperation: PendingOperation | null;

  // Context for AI (what entity/page is user viewing)
  contextEntityType: string | null;
  contextEntityId: string | null;

  // Panel actions
  openChat: (conversationId?: string) => void;
  closeChat: () => void;
  toggleChat: () => void;
  setActiveConversation: (conversationId: string | null) => void;

  // Streaming actions
  startStreaming: (operation?: AIOperationType, context?: Record<string, unknown>) => void;
  stopStreaming: () => void;

  // Context actions
  setContext: (entityType: string | null, entityId: string | null) => void;
  clearContext: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  isOpen: false,
  activeConversationId: null,
  isStreaming: false,
  pendingOperation: null,
  contextEntityType: null,
  contextEntityId: null,
};

export const useAIStore = create<AIState>()(
  devtools(
    (set) => ({
      ...initialState,

      // Panel actions
      openChat: (conversationId?: string) =>
        set(
          {
            isOpen: true,
            activeConversationId: conversationId ?? null,
          },
          false,
          'ai/openChat'
        ),

      closeChat: () => set({ isOpen: false }, false, 'ai/closeChat'),

      toggleChat: () => set((state) => ({ isOpen: !state.isOpen }), false, 'ai/toggleChat'),

      setActiveConversation: (conversationId: string | null) =>
        set({ activeConversationId: conversationId }, false, 'ai/setActiveConversation'),

      // Streaming actions
      startStreaming: (operation?: AIOperationType, context?: Record<string, unknown>) =>
        set(
          {
            isStreaming: true,
            pendingOperation: operation
              ? { type: operation, context, startedAt: new Date() }
              : null,
          },
          false,
          'ai/startStreaming'
        ),

      stopStreaming: () =>
        set(
          {
            isStreaming: false,
            pendingOperation: null,
          },
          false,
          'ai/stopStreaming'
        ),

      // Context actions
      setContext: (entityType: string | null, entityId: string | null) =>
        set(
          {
            contextEntityType: entityType,
            contextEntityId: entityId,
          },
          false,
          'ai/setContext'
        ),

      clearContext: () =>
        set(
          {
            contextEntityType: null,
            contextEntityId: null,
          },
          false,
          'ai/clearContext'
        ),

      // Reset
      reset: () => set(initialState, false, 'ai/reset'),
    }),
    { name: 'AIStore' }
  )
);

/**
 * Selector: Check if AI is busy (streaming or has pending operation)
 */
export const useAIBusy = () =>
  useAIStore((state) => state.isStreaming || state.pendingOperation !== null);

/**
 * Selector: Get current context as a tuple
 */
export const useAIContext = () =>
  useAIStore((state) => ({
    entityType: state.contextEntityType,
    entityId: state.contextEntityId,
  }));

/**
 * Selector: Check if chat is open with a specific conversation
 */
export const useIsConversationActive = (conversationId: string) =>
  useAIStore((state) => state.isOpen && state.activeConversationId === conversationId);
