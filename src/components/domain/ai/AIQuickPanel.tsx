'use client';

/**
 * AIQuickPanel Component
 *
 * A slide-in drawer panel for quick AI chat interactions.
 * Provides a context-aware chat interface with credit display.
 *
 * Features:
 * - Drawer slides in from the right side
 * - Quick chat interface using useAIConversations
 * - Context-aware suggestions based on current page
 * - Keyboard shortcut hint (Cmd/Ctrl + K)
 * - Credit display at the bottom
 * - Message input with send button
 * - Loading states and error handling
 * - RTL support with logical CSS properties
 *
 * @module components/domain/ai/AIQuickPanel
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import { usePathname } from 'next/navigation';

import {
  CloseOutlined,
  SendOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  UserOutlined,
  BulbOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Drawer, Input, Typography, Space, Avatar, Spin, Tooltip, Tag } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import {
  useAIConversations,
  useAIMessages,
  useCreateConversation,
  useSendMessage,
  useAICredits,
  type AIMessage,
} from '@/lib/hooks/data/useAI';
import { cn } from '@/lib/utils/cn';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the AIQuickPanel component
 */
export interface AIQuickPanelProps {
  /**
   * Whether the drawer is open
   */
  open: boolean;

  /**
   * Callback when the drawer should close
   */
  onClose: () => void;
}

/**
 * Context-aware suggestion type
 */
interface Suggestion {
  id: string;
  text: string;
  icon: React.ReactNode;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Get context-aware suggestions based on current path
 */
function getContextSuggestions(pathname: string, t: (key: string) => string): Suggestion[] {
  // Extract the page section from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const section = pathSegments[2] || 'dashboard'; // After locale and shopId

  const suggestionMap: Record<string, Suggestion[]> = {
    dashboard: [
      { id: 'sales-summary', text: t('suggestions.salesSummary'), icon: <BulbOutlined /> },
      { id: 'top-products', text: t('suggestions.topProducts'), icon: <BulbOutlined /> },
      { id: 'business-insights', text: t('suggestions.businessInsights'), icon: <BulbOutlined /> },
    ],
    inventory: [
      { id: 'low-stock', text: t('suggestions.lowStock'), icon: <BulbOutlined /> },
      { id: 'inventory-value', text: t('suggestions.inventoryValue'), icon: <BulbOutlined /> },
      { id: 'slow-movers', text: t('suggestions.slowMovers'), icon: <BulbOutlined /> },
    ],
    sales: [
      { id: 'sales-trends', text: t('suggestions.salesTrends'), icon: <BulbOutlined /> },
      { id: 'best-sellers', text: t('suggestions.bestSellers'), icon: <BulbOutlined /> },
      { id: 'customer-insights', text: t('suggestions.customerInsights'), icon: <BulbOutlined /> },
    ],
    customers: [
      { id: 'top-customers', text: t('suggestions.topCustomers'), icon: <BulbOutlined /> },
      {
        id: 'customer-retention',
        text: t('suggestions.customerRetention'),
        icon: <BulbOutlined />,
      },
      { id: 'purchase-patterns', text: t('suggestions.purchasePatterns'), icon: <BulbOutlined /> },
    ],
    suppliers: [
      { id: 'supplier-analysis', text: t('suggestions.supplierAnalysis'), icon: <BulbOutlined /> },
      { id: 'payment-due', text: t('suggestions.paymentDue'), icon: <BulbOutlined /> },
      { id: 'best-suppliers', text: t('suggestions.bestSuppliers'), icon: <BulbOutlined /> },
    ],
    expenses: [
      { id: 'expense-breakdown', text: t('suggestions.expenseBreakdown'), icon: <BulbOutlined /> },
      { id: 'budget-status', text: t('suggestions.budgetStatus'), icon: <BulbOutlined /> },
      { id: 'cost-savings', text: t('suggestions.costSavings'), icon: <BulbOutlined /> },
    ],
    analytics: [
      {
        id: 'performance-report',
        text: t('suggestions.performanceReport'),
        icon: <BulbOutlined />,
      },
      { id: 'trend-analysis', text: t('suggestions.trendAnalysis'), icon: <BulbOutlined /> },
      { id: 'predictions', text: t('suggestions.predictions'), icon: <BulbOutlined /> },
    ],
  };

  return suggestionMap[section] ?? suggestionMap.dashboard ?? [];
}

/**
 * Detect if user is on Mac for keyboard shortcut display
 */
function isMac(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AIQuickPanel Component
 *
 * Slide-in drawer for quick AI chat interactions.
 */
export function AIQuickPanel({ open, onClose }: AIQuickPanelProps): React.JSX.Element {
  const t = useTranslations('ai.quickPanel');
  const pathname = usePathname();

  // Local state
  const [message, setMessage] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const { conversations, isLoading: conversationsLoading } = useAIConversations({
    limit: 10,
    enabled: open,
  });

  const {
    messages,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useAIMessages(activeConversationId ?? '', { enabled: !!activeConversationId && open });

  const { remainingCredits, isLoading: creditsLoading } = useAICredits({
    enabled: open,
  });

  // Mutations
  const createConversation = useCreateConversation();
  const sendMessageMutation = useSendMessage();

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const suggestions = useMemo(() => getContextSuggestions(pathname, t) ?? [], [pathname, t]);

  const shortcutKey = useMemo(() => (isMac() ? 'Cmd' : 'Ctrl'), []);

  const isLoading = conversationsLoading || messagesLoading;
  const isSending = sendMessageMutation.isPending || createConversation.isPending;

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [open]);

  // Set active conversation to the most recent one
  useEffect(() => {
    if ((conversations ?? []).length > 0 && !activeConversationId) {
      setActiveConversationId(conversations?.[0]?.id_conversation ?? null);
    }
  }, [conversations, activeConversationId]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending) {
      return;
    }

    try {
      let conversationId = activeConversationId;

      // Create a new conversation if none exists
      if (!conversationId) {
        const newConversation = await createConversation.mutateAsync({
          title: trimmedMessage.slice(0, 50),
        });
        conversationId = newConversation.id_conversation;
        setActiveConversationId(conversationId);
      }

      // Send the message
      await sendMessageMutation.mutateAsync({
        conversationId,
        role: 'user',
        content: trimmedMessage,
      });

      setMessage('');
      refetchMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [
    message,
    activeConversationId,
    isSending,
    createConversation,
    sendMessageMutation,
    refetchMessages,
  ]);

  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    setMessage(suggestion.text);
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessage('');
  }, []);

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  const renderMessage = (msg: AIMessage) => {
    const isUser = msg.role === 'user';

    return (
      <div
        key={msg.id_message}
        className={cn('flex gap-3 mb-4', isUser ? 'flex-row-reverse' : 'flex-row')}
      >
        <Avatar
          size="small"
          icon={isUser ? <UserOutlined /> : <RobotOutlined />}
          className={cn(isUser ? 'bg-amber-500' : 'bg-stone-600')}
        />
        <div
          className={cn(
            'max-w-[80%] px-4 py-2 rounded-xl',
            isUser
              ? 'bg-amber-50 text-stone-900 rounded-tr-sm'
              : 'bg-stone-100 text-stone-900 rounded-tl-sm'
          )}
        >
          <Paragraph className="m-0 text-sm whitespace-pre-wrap">{msg.content}</Paragraph>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
        <RobotOutlined className="text-3xl text-amber-600" />
      </div>
      <Text strong className="text-lg text-stone-900 mb-2">
        {t('emptyTitle')}
      </Text>
      <Text type="secondary" className="text-sm mb-6 max-w-[280px]">
        {t('emptyDescription')}
      </Text>

      {/* Suggestions */}
      <div className="w-full max-w-[300px]">
        <Text type="secondary" className="text-xs mb-2 block">
          {t('trySuggestions')}
        </Text>
        <div className="space-y-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                'w-full text-start px-3 py-2 rounded-lg',
                'bg-stone-50 hover:bg-amber-50 border border-stone-100 hover:border-amber-200',
                'transition-colors text-sm text-stone-700 hover:text-amber-700',
                'flex items-center gap-2'
              )}
            >
              {suggestion.icon}
              {suggestion.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <RobotOutlined className="text-amber-600" />
            </div>
            <div>
              <Text strong className="text-stone-900 block">
                {t('title')}
              </Text>
              <Text type="secondary" className="text-xs">
                {t('subtitle')}
              </Text>
            </div>
          </div>
          <Space>
            <Tooltip title={t('newConversation')}>
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={handleNewConversation}
              />
            </Tooltip>
          </Space>
        </div>
      }
      placement="right"
      open={open}
      onClose={onClose}
      width={400}
      closeIcon={<CloseOutlined />}
      styles={{
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100% - 55px)',
        },
        header: {
          borderBottom: '1px solid #e7e5e4',
          padding: '12px 16px',
        },
      }}
    >
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Spin indicator={<LoadingOutlined spin />} />
          </div>
        ) : (messages ?? []).length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {(messages ?? []).map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-stone-200 p-4 bg-white">
        {/* Keyboard Shortcut Hint */}
        <div className="flex items-center justify-between mb-2">
          <Tag className="text-xs bg-stone-100 border-stone-200">{shortcutKey} + K</Tag>
          <Text type="secondary" className="text-xs">
            {t('shiftEnterHint')}
          </Text>
        </div>

        {/* Input Field */}
        <div className="flex gap-2">
          <TextArea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={isSending}
            className="flex-1 resize-none"
          />
          <Button
            type="primary"
            icon={isSending ? <LoadingOutlined /> : <SendOutlined />}
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending}
            className="self-end"
          />
        </div>

        {/* Credits Display */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
          <div className="flex items-center gap-2 text-stone-500">
            <ThunderboltOutlined className="text-amber-500" />
            <Text type="secondary" className="text-xs">
              {t('creditsRemaining')}
            </Text>
          </div>
          <Text
            strong
            className={cn('text-sm', remainingCredits < 100 ? 'text-red-600' : 'text-amber-600')}
          >
            {creditsLoading ? '-' : remainingCredits.toLocaleString()}
          </Text>
        </div>
      </div>
    </Drawer>
  );
}

export default AIQuickPanel;
