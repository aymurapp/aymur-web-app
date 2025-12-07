'use client';

/**
 * ConversationList Component
 *
 * Displays a list of AI conversations with options to select, create, or delete.
 *
 * Features:
 * - List of conversation items with title and date
 * - New conversation button at top
 * - Active item highlighted
 * - Delete conversation option on hover
 * - RTL support with logical properties
 *
 * @example
 * ```tsx
 * <ConversationList
 *   conversations={conversations}
 *   activeId={currentConversationId}
 *   onSelect={handleSelectConversation}
 *   onNew={handleNewConversation}
 *   onDelete={handleDeleteConversation}
 * />
 * ```
 */

import React, { useState } from 'react';

import {
  PlusOutlined,
  DeleteOutlined,
  MessageOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Typography, Tooltip, Modal, Empty, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

const { Text } = Typography;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Conversation data structure
 */
export interface ConversationData {
  /** Unique conversation identifier */
  id_conversation: string;
  /** Conversation title */
  title: string;
  /** Creation timestamp */
  created_at: string;
}

/**
 * Props for the ConversationList component
 */
export interface ConversationListProps {
  /** List of conversations to display */
  conversations: ConversationData[];
  /** Currently active conversation ID */
  activeId?: string;
  /** Handler for selecting a conversation */
  onSelect: (id: string) => void;
  /** Handler for creating a new conversation */
  onNew: () => void;
  /** Handler for deleting a conversation */
  onDelete?: (id: string) => void;
  /** Whether the list is loading */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Formats a date string into a relative or absolute date
 */
function formatConversationDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Today - show time
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    // This week - show day name
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  } else {
    // Older - show date
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * Truncates a title to a maximum length
 */
function truncateTitle(title: string, maxLength: number = 50): string {
  if (title.length <= maxLength) {
    return title;
  }
  return title.substring(0, maxLength - 3) + '...';
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ConversationList Component
 *
 * A list component for managing AI chat conversations.
 */
export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isLoading = false,
  className,
}: ConversationListProps) {
  const t = useTranslations('ai');
  const tCommon = useTranslations('common');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  // Handle delete confirmation
  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteModalId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteModalId && onDelete) {
      onDelete(deleteModalId);
    }
    setDeleteModalId(null);
  };

  const handleCancelDelete = () => {
    setDeleteModalId(null);
  };

  // Handle conversation selection
  const handleSelect = (id: string) => {
    onSelect(id);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(id);
    }
  };

  return (
    <div className={cn('flex flex-col h-full', 'bg-stone-50 border-e border-stone-200', className)}>
      {/* Header with New Conversation Button */}
      <div className="p-4 border-b border-stone-200">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onNew}
          block
          size="large"
          className="shadow-sm"
        >
          {t('newConversation')}
        </Button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="py-2 px-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton.Avatar active size={32} shape="circle" />
                <div className="flex-1">
                  <Skeleton.Input active size="small" block className="mb-2" />
                  <Skeleton.Input active size="small" style={{ width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text type="secondary" className="text-sm">
                  {t('emptyState')}
                </Text>
              }
            />
          </div>
        ) : (
          <ul className="py-2" role="listbox" aria-label={t('history')}>
            {conversations.map((conversation) => {
              const isActive = activeId === conversation.id_conversation;
              const isHovered = hoveredId === conversation.id_conversation;

              return (
                <li
                  key={conversation.id_conversation}
                  role="option"
                  aria-selected={isActive}
                  tabIndex={0}
                  onClick={() => handleSelect(conversation.id_conversation)}
                  onKeyDown={(e) => handleKeyDown(e, conversation.id_conversation)}
                  onMouseEnter={() => setHoveredId(conversation.id_conversation)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    'relative flex items-start gap-3 px-4 py-3 mx-2 rounded-lg cursor-pointer',
                    'transition-all duration-150',
                    isActive && ['bg-amber-50 border border-amber-200', 'shadow-sm'],
                    !isActive && ['hover:bg-stone-100', 'border border-transparent']
                  )}
                >
                  {/* Conversation Icon */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                      isActive ? 'bg-amber-100 text-amber-600' : 'bg-stone-200 text-stone-500'
                    )}
                  >
                    <MessageOutlined className="text-sm" />
                  </div>

                  {/* Conversation Details */}
                  <div className="flex-1 min-w-0">
                    <Text
                      strong={isActive}
                      className={cn(
                        'block truncate text-sm',
                        isActive ? 'text-amber-900' : 'text-stone-700'
                      )}
                      title={conversation.title}
                    >
                      {truncateTitle(conversation.title)}
                    </Text>
                    <Text type="secondary" className="text-xs">
                      {formatConversationDate(conversation.created_at)}
                    </Text>
                  </div>

                  {/* Delete Button - shown on hover */}
                  {onDelete && (isHovered || isActive) && (
                    <div className="flex-shrink-0">
                      <Tooltip title={tCommon('actions.delete')}>
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={(e) => handleDeleteClick(e, conversation.id_conversation)}
                          className={cn(
                            'w-7 h-7 flex items-center justify-center rounded-full',
                            'text-stone-400 hover:text-red-500 hover:bg-red-50',
                            'transition-colors duration-150'
                          )}
                          aria-label={tCommon('actions.delete')}
                        />
                      </Tooltip>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-red-600">
            <ExclamationCircleOutlined />
            <span>{tCommon('actions.delete')}</span>
          </div>
        }
        open={deleteModalId !== null}
        onOk={handleConfirmDelete}
        onCancel={handleCancelDelete}
        okText={tCommon('actions.delete')}
        cancelText={tCommon('actions.cancel')}
        okButtonProps={{ danger: true }}
        centered
      >
        <Text>{t('chat.deleteConfirmation')}</Text>
      </Modal>
    </div>
  );
}

export default ConversationList;
