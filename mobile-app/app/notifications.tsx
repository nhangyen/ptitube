import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import { useNotifications } from '@/contexts/NotificationsContext';
import type { NotificationItem } from '@/services/api';
import * as api from '@/services/api';

const formatRelativeTime = (value?: string) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    return 'Just now';
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export default function NotificationsScreen() {
  const { clearUnreadCount, decrementUnreadCount, refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications(0, 50);
      setNotifications(data);
      void refreshUnreadCount();
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void loadNotifications();
  };

  const handleOpenNotification = async (item: NotificationItem) => {
    if (!item.read) {
      setNotifications((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)));
      decrementUnreadCount();
      try {
        await api.markNotificationRead(item.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
        void refreshUnreadCount();
      }
    }

    if (item.videoId) {
      router.push(`/video/${item.videoId}` as never);
      return;
    }

    if (item.actor?.id) {
      router.push(`/profile/${item.actor.id}` as never);
    }
  };

  const handleMarkAll = async () => {
    try {
      setMarkingAll(true);
      await api.markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      clearUnreadCount();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      void refreshUnreadCount();
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF3B30" />}
    >
      <ScreenHeader
        title="Notifications"
        subtitle="Follow, like, comment, and reply alerts."
        onBack={() => router.back()}
        rightSlot={
          notifications.length ? (
            <TouchableOpacity onPress={handleMarkAll} disabled={markingAll}>
              <Text style={styles.markAllText}>{markingAll ? '...' : 'Read all'}</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <View style={styles.list}>
        {notifications.length ? (
          notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, !item.read && styles.unreadCard]}
              onPress={() => void handleOpenNotification(item)}
              activeOpacity={0.85}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.actor?.username || 'N').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.meta}>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.caption}>
                  {item.videoTitle ? `${item.videoTitle} · ` : ''}
                  {formatRelativeTime(item.createdAt)}
                </Text>
              </View>
              {!item.read ? <View style={styles.dot} /> : null}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>You will see follow, like, comment, and reply activity here.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070707',
  },
  content: {
    padding: 20,
    paddingTop: 56,
    paddingBottom: 120,
  },
  center: {
    flex: 1,
    backgroundColor: '#070707',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllText: {
    color: '#ff8f87',
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    marginTop: 18,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#242424',
  },
  unreadCard: {
    borderColor: 'rgba(255, 59, 48, 0.32)',
    backgroundColor: '#141010',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    flex: 1,
    marginLeft: 14,
    gap: 6,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  caption: {
    color: '#989898',
    fontSize: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    marginLeft: 12,
  },
  emptyState: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#242424',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  emptySubtitle: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
});
