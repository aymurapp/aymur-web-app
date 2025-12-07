'use client';

/**
 * ChatMessage Component
 *
 * Displays a single message in the AI chat conversation.
 * Supports user and assistant roles with different styling.
 *
 * Features:
 * - User messages: right-aligned with amber background
 * - Assistant messages: left-aligned with white background and gold avatar
 * - Markdown rendering for assistant messages
 * - Copy button on hover
 * - RTL support with logical properties
 *
 * @example
 * ```tsx
 * <ChatMessage
 *   message={{
 *     id: '1',
 *     role: 'assistant',
 *     content: '**Hello!** How can I help you today?'
 *   }}
 * />
 * ```
 */

import React, { useMemo, useState } from 'react';

import { CopyOutlined, CheckOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Tooltip, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/Button';
import { useCopyToClipboard } from '@/lib/hooks/utils/useCopyToClipboard';
import { cn } from '@/lib/utils/cn';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Message data structure
 */
export interface ChatMessageData {
  /** Unique message identifier */
  id: string;
  /** Role of the message sender */
  role: 'user' | 'assistant';
  /** Message content (plain text or markdown for assistant) */
  content: string;
}

/**
 * Props for the ChatMessage component
 */
export interface ChatMessageProps {
  /** Message data to display */
  message: ChatMessageData;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ChatMessage Component
 *
 * Renders a single chat message with role-based styling and features.
 */
export function ChatMessage({ message, className }: ChatMessageProps) {
  const tCommon = useTranslations('common');
  const { copy, isCopied } = useCopyToClipboard({ resetTimeout: 2000 });
  const [isHovered, setIsHovered] = useState(false);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Handle copy action
  const handleCopy = async () => {
    await copy(message.content);
  };

  // Memoize markdown components for performance
  const markdownComponents = useMemo(
    () => ({
      // Style links
      a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-600 hover:text-amber-700 underline"
          {...props}
        >
          {children}
        </a>
      ),
      // Style code blocks
      code: ({
        inline,
        className: codeClassName,
        children,
        ...props
      }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) => {
        if (inline) {
          return (
            <code
              className="bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          );
        }
        return (
          <code
            className={cn(
              'block bg-stone-900 text-stone-100 p-3 rounded-lg text-sm font-mono overflow-x-auto',
              codeClassName
            )}
            {...props}
          >
            {children}
          </code>
        );
      },
      // Style pre blocks
      pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
        <pre className="bg-stone-900 rounded-lg overflow-hidden my-2" {...props}>
          {children}
        </pre>
      ),
      // Style paragraphs
      p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p className="mb-2 last:mb-0" {...props}>
          {children}
        </p>
      ),
      // Style lists
      ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
        <ul className="list-disc list-inside mb-2 space-y-1" {...props}>
          {children}
        </ul>
      ),
      ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
        <ol className="list-decimal list-inside mb-2 space-y-1" {...props}>
          {children}
        </ol>
      ),
      // Style headings
      h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h1 className="text-lg font-semibold mb-2" {...props}>
          {children}
        </h1>
      ),
      h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h2 className="text-base font-semibold mb-2" {...props}>
          {children}
        </h2>
      ),
      h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h3 className="text-sm font-semibold mb-1" {...props}>
          {children}
        </h3>
      ),
      // Style blockquotes
      blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
        <blockquote
          className="border-s-4 border-amber-400 ps-4 py-1 my-2 text-stone-600 italic"
          {...props}
        >
          {children}
        </blockquote>
      ),
      // Style tables
      table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
        <div className="overflow-x-auto my-2">
          <table className="min-w-full border-collapse border border-stone-200" {...props}>
            {children}
          </table>
        </div>
      ),
      th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
        <th
          className="border border-stone-200 bg-stone-50 px-3 py-2 text-start font-medium"
          {...props}
        >
          {children}
        </th>
      ),
      td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
        <td className="border border-stone-200 px-3 py-2" {...props}>
          {children}
        </td>
      ),
    }),
    []
  );

  return (
    <div
      className={cn('flex gap-3 group', isUser && 'flex-row-reverse', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <Avatar size={36} icon={<UserOutlined />} className="bg-amber-500" />
        ) : (
          <Avatar
            size={36}
            icon={<RobotOutlined />}
            className="bg-gradient-to-br from-amber-400 to-amber-600 shadow-md"
          />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'relative max-w-[80%] rounded-2xl px-4 py-3',
          isUser && [
            'bg-amber-500 text-white',
            'rounded-te-sm', // RTL-aware: top-end corner
          ],
          isAssistant && [
            'bg-white border border-stone-200 shadow-sm',
            'rounded-ts-sm', // RTL-aware: top-start corner
          ]
        )}
      >
        {/* Message Text */}
        <div
          className={cn(
            'text-sm leading-relaxed',
            isUser && 'text-white',
            isAssistant && 'text-stone-700'
          )}
        >
          {isAssistant ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          ) : (
            <Text className="text-white whitespace-pre-wrap">{message.content}</Text>
          )}
        </div>

        {/* Copy Button - shown on hover */}
        <div
          className={cn(
            'absolute -top-2 transition-opacity duration-200',
            isUser ? 'start-0 -translate-x-full ps-2' : 'end-0 translate-x-full pe-2',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Tooltip title={isCopied ? tCommon('messages.copied') : tCommon('actions.copy')}>
            <Button
              type="text"
              size="small"
              icon={isCopied ? <CheckOutlined className="text-emerald-500" /> : <CopyOutlined />}
              onClick={handleCopy}
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-full',
                'bg-white shadow-md border border-stone-200',
                'hover:bg-stone-50 hover:border-stone-300'
              )}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
