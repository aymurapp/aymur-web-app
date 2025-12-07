/**
 * Notification Store
 * Manages in-app notifications (ephemeral - no persistence)
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  read: boolean;
  createdAt: Date;
  /** Auto-dismiss after this many milliseconds (null = manual dismiss) */
  duration?: number | null;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

export type NotificationInput = Omit<Notification, 'id' | 'read' | 'createdAt'>;

interface NotificationState {
  // State
  notifications: Notification[];

  // Computed (via selectors below)
  // unreadCount is computed via selector

  // Actions
  addNotification: (notification: NotificationInput) => string;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  clearRead: () => void;
}

const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      notifications: [],

      addNotification: (input: NotificationInput) => {
        const id = generateId();
        const notification: Notification = {
          ...input,
          id,
          read: false,
          createdAt: new Date(),
        };

        set(
          (state) => ({
            notifications: [notification, ...state.notifications],
          }),
          false,
          'notification/add'
        );

        // Auto-dismiss if duration is set
        if (input.duration) {
          setTimeout(() => {
            get().removeNotification(id);
          }, input.duration);
        }

        return id;
      },

      markAsRead: (id: string) =>
        set(
          (state) => ({
            notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
          }),
          false,
          'notification/markAsRead'
        ),

      markAllAsRead: () =>
        set(
          (state) => ({
            notifications: state.notifications.map((n) => ({
              ...n,
              read: true,
            })),
          }),
          false,
          'notification/markAllAsRead'
        ),

      removeNotification: (id: string) =>
        set(
          (state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }),
          false,
          'notification/remove'
        ),

      clearAll: () => set({ notifications: [] }, false, 'notification/clearAll'),

      clearRead: () =>
        set(
          (state) => ({
            notifications: state.notifications.filter((n) => !n.read),
          }),
          false,
          'notification/clearRead'
        ),
    }),
    { name: 'NotificationStore' }
  )
);

/**
 * Selector: Get unread notification count
 */
export const useUnreadCount = () =>
  useNotificationStore((state) => state.notifications.filter((n) => !n.read).length);

/**
 * Selector: Get unread notifications only
 */
export const useUnreadNotifications = () =>
  useNotificationStore((state) => state.notifications.filter((n) => !n.read));

/**
 * Selector: Get notifications by type
 */
export const useNotificationsByType = (type: NotificationType) =>
  useNotificationStore((state) => state.notifications.filter((n) => n.type === type));

/**
 * Helper: Create a toast-style notification
 */
export const toast = {
  info: (title: string, message?: string, duration = 5000) =>
    useNotificationStore.getState().addNotification({
      type: 'info',
      title,
      message,
      duration,
    }),
  success: (title: string, message?: string, duration = 5000) =>
    useNotificationStore.getState().addNotification({
      type: 'success',
      title,
      message,
      duration,
    }),
  warning: (title: string, message?: string, duration = 8000) =>
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title,
      message,
      duration,
    }),
  error: (title: string, message?: string, duration: number | null = null) =>
    useNotificationStore.getState().addNotification({
      type: 'error',
      title,
      message,
      duration,
    }),
};
