'use client';

/**
 * AI Chat Page
 *
 * Provides an AI assistant interface for the jewelry business.
 * Uses Vercel AI SDK's useChat hook for streaming responses.
 *
 * Features:
 * - Real-time streaming chat with AI
 * - Message history display
 * - Responsive design with RTL support
 * - Proper i18n integration
 */

import { useRef, useEffect } from 'react';

import { useChat } from '@ai-sdk/react';
import { RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Card, Empty, Input, Spin, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/layout/PageHeader';
import { useShop } from '@/lib/hooks/shop/useShop';

const { Text } = Typography;

// =============================================================================
// COMPONENT
// =============================================================================

export default function AIPage() {
  const t = useTranslations('ai');
  const { shopId } = useShop();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/ai/chat',
    body: { shopId },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <PageHeader title={t('title')} subtitle={t('askAnything')} />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Empty
              image={
                <RobotOutlined style={{ fontSize: 64, color: '#f59e0b' }} aria-hidden="true" />
              }
              description={
                <Text type="secondary" className="text-base">
                  {t('emptyState')}
                </Text>
              }
            />
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <Card
                  size="small"
                  className={`max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-amber-50 dark:bg-amber-900/20'
                      : 'bg-white dark:bg-stone-800'
                  }`}
                  styles={{
                    body: { padding: '12px 16px' },
                  }}
                >
                  <div className="flex gap-3 items-start">
                    <Avatar
                      icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                      className={
                        msg.role === 'assistant'
                          ? 'bg-amber-500 text-white flex-shrink-0'
                          : 'bg-stone-200 dark:bg-stone-600 flex-shrink-0'
                      }
                      size="small"
                    />
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <Card
                  size="small"
                  className="bg-white dark:bg-stone-800"
                  styles={{
                    body: { padding: '12px 16px' },
                  }}
                >
                  <div className="flex gap-3 items-center">
                    <Avatar
                      icon={<RobotOutlined />}
                      className="bg-amber-500 text-white flex-shrink-0"
                      size="small"
                    />
                    <div className="flex items-center gap-2">
                      <Spin size="small" />
                      <Text type="secondary">{t('processing')}</Text>
                    </div>
                  </div>
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input.TextArea
            value={input}
            onChange={handleInputChange}
            placeholder={t('placeholder')}
            autoSize={{ minRows: 1, maxRows: 4 }}
            className="flex-1"
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
            disabled={isLoading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            htmlType="submit"
            loading={isLoading}
            disabled={!input.trim()}
            className="self-end"
          >
            {t('send')}
          </Button>
        </form>
        <Text type="secondary" className="text-xs mt-2 block">
          {t('shiftEnterHint')}
        </Text>
      </div>
    </div>
  );
}
