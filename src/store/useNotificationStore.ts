import { create } from 'zustand';
import { generateId } from '@/lib/utils';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  isToast: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (message: string, type?: NotificationType, options?: { isToast?: boolean }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  
  addNotification: (message, type = 'info', options = { isToast: true }) => {
    const id = generateId();
    const newNotification: AppNotification = {
      id,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      isToast: options.isToast ?? true,
    };
    
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep last 50
    }));

    // Auto-remove toast after 5 seconds if it's a toast
    if (options.isToast) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.map(n => n.id === id ? { ...n, isToast: false } : n),
        }));
      }, 5000);
    }
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));
