'use client';

/**
 * ChatInput Component
 *
 * Text input for sending messages in the AI chat.
 * Features auto-resize textarea with keyboard shortcuts.
 *
 * Features:
 * - Auto-resizing textarea
 * - Send button with loading state
 * - Shift+Enter for new line
 * - Enter to send (when not loading)
 * - RTL support with logical properties
 *
 * @example
 * ```tsx
 * const [message, setMessage] = useState('');
 *
 * <ChatInput
 *   value={message}
 *   onChange={setMessage}
 *   onSubmit={handleSendMessage}
 *   isLoading={isSending}
 *   placeholder="Ask anything..."
 * />
 * ```
 */

import React, { useRef, useEffect, useCallback } from 'react';

import { SendOutlined, LoadingOutlined } from '@ant-design/icons';
import { Input, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

const { TextArea } = Input;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the ChatInput component
 */
export interface ChatInputProps {
  /** Current input value */
  value: string;
  /** Handler for value changes */
  onChange: (value: string) => void;
  /** Handler for message submission */
  onSubmit: () => void;
  /** Whether a message is being sent */
  isLoading?: boolean;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ChatInput Component
 *
 * A smart text input for chat messages with auto-resize and keyboard shortcuts.
 */
export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder,
  disabled = false,
  className,
}: ChatInputProps) {
  const t = useTranslations('ai');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Default placeholder
  const inputPlaceholder = placeholder ?? t('placeholder');

  // Check if message can be sent
  const canSend = value.trim().length > 0 && !isLoading && !disabled;

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter without Shift sends the message
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (canSend) {
          onSubmit();
        }
      }
      // Shift+Enter adds a new line (default behavior)
    },
    [canSend, onSubmit]
  );

  // Handle value change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Handle submit button click
  const handleSubmit = () => {
    if (canSend) {
      onSubmit();
    }
  };

  // Focus input on mount
  useEffect(() => {
    textAreaRef.current?.focus();
  }, []);

  // Reset textarea height when value is cleared
  useEffect(() => {
    if (value === '' && textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
    }
  }, [value]);

  return (
    <div
      className={cn(
        'relative flex items-end gap-2 p-3',
        'bg-white border-t border-stone-200',
        className
      )}
    >
      {/* Text Input */}
      <div className="flex-1 relative">
        <TextArea
          ref={textAreaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={inputPlaceholder}
          disabled={disabled || isLoading}
          autoSize={{ minRows: 1, maxRows: 6 }}
          className={cn(
            'resize-none',
            'rounded-2xl',
            'border-stone-200 hover:border-amber-400 focus:border-amber-500',
            'focus:shadow-[0_0_0_2px_rgba(245,158,11,0.1)]',
            'pe-12', // Space for send button
            'py-3 px-4',
            'text-sm',
            'transition-all duration-200'
          )}
          styles={{
            textarea: {
              paddingInlineEnd: '3rem',
            },
          }}
        />

        {/* Keyboard hint */}
        <div className="absolute bottom-full mb-1 start-0">
          <span className="text-xs text-stone-400">{t('shiftEnterHint')}</span>
        </div>
      </div>

      {/* Send Button */}
      <Tooltip title={canSend ? t('send') : undefined}>
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={isLoading ? <LoadingOutlined spin /> : <SendOutlined />}
          onClick={handleSubmit}
          disabled={!canSend}
          className={cn(
            'flex items-center justify-center',
            'w-11 h-11',
            'shadow-md',
            'transition-all duration-200',
            canSend && 'hover:scale-105',
            !canSend && 'opacity-50'
          )}
          aria-label={t('send')}
        />
      </Tooltip>
    </div>
  );
}

export default ChatInput;
