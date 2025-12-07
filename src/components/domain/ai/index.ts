/**
 * AI Domain Components
 *
 * Components for the AI Assistant chat interface and dashboard widgets.
 * Includes chat messages, input controls, conversation management,
 * credit tracking, quick panel, and insights widgets.
 */

// Chat Message Component
export { ChatMessage, type ChatMessageProps, type ChatMessageData } from './ChatMessage';

// Chat Input Component
export { ChatInput, type ChatInputProps } from './ChatInput';

// Conversation List Component
export {
  ConversationList,
  type ConversationListProps,
  type ConversationData,
} from './ConversationList';

// AI Credits Widget
export { AICreditsWidget, type AICreditsWidgetProps } from './AICreditsWidget';

// AI Quick Panel (Drawer)
export { AIQuickPanel, type AIQuickPanelProps } from './AIQuickPanel';

// AI Insights Widget (Dashboard)
export { AIInsightsWidget, type AIInsightsWidgetProps } from './AIInsightsWidget';
