/**
 * Context quản lý số thông báo chưa đọc toàn ứng dụng.
 *
 * Cung cấp:
 * - `unreadCount` — số thông báo chưa đọc, dùng để hiển thị badge trên tab Alerts.
 * - `refreshUnreadCount` — gọi API để đồng bộ lại số chưa đọc từ server.
 * - `setUnreadCount` / `decrementUnreadCount` / `clearUnreadCount` — cập nhật local counter
 *   ngay lập tức (optimistic update) khi user đọc thông báo, không cần refetch.
 *
 * Tự động fetch khi token thay đổi (đăng nhập/đăng xuất).
 * Hook `useNotifications()` ném Error nếu dùng ngoài `NotificationsProvider`.
 */
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/services/api';

interface NotificationsContextType {
  unreadCount: number;
  isLoading: boolean;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
  decrementUnreadCount: (amount?: number) => void;
  clearUnreadCount: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [unreadCount, setUnreadCountState] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const setUnreadCount = useCallback((count: number) => {
    setUnreadCountState(Math.max(0, count));
  }, []);

  const decrementUnreadCount = useCallback((amount: number = 1) => {
    setUnreadCountState((current) => Math.max(0, current - amount));
  }, []);

  const clearUnreadCount = useCallback(() => {
    setUnreadCountState(0);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!token) {
      setUnreadCountState(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const count = await api.getUnreadNotificationCount();
      setUnreadCountState(count);
    } catch (error) {
      console.error('Error loading unread notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setUnreadCountState(0);
      setIsLoading(false);
      return;
    }

    void refreshUnreadCount();
  }, [token, refreshUnreadCount]);

  const value = useMemo(
    () => ({
      unreadCount,
      isLoading,
      refreshUnreadCount,
      setUnreadCount,
      decrementUnreadCount,
      clearUnreadCount,
    }),
    [clearUnreadCount, decrementUnreadCount, isLoading, refreshUnreadCount, setUnreadCount, unreadCount]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};
