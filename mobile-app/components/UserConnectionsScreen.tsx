import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import type { UserCard } from '@/services/api';

interface UserConnectionsScreenProps {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptySubtitle: string;
  loadUsers: () => Promise<UserCard[]>;
}

const formatNumber = (num: number = 0) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return `${num}`;
};

export default function UserConnectionsScreen({
  title,
  subtitle,
  emptyTitle,
  emptySubtitle,
  loadUsers,
}: UserConnectionsScreenProps) {
  const [users, setUsers] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await loadUsers();
      setUsers(data);
    } catch (error) {
      console.error(`Error loading ${title.toLowerCase()}:`, error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadUsers, title]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
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
      <ScreenHeader title={title} subtitle={subtitle} onBack={() => router.back()} />

      {users.length ? (
        <View style={styles.list}>
          {users.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push(`/profile/${item.id}` as never)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.username || 'U').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.meta}>
                <Text style={styles.username}>@{item.username}</Text>
                {item.bio ? (
                  <Text style={styles.bio} numberOfLines={2}>
                    {item.bio}
                  </Text>
                ) : (
                  <Text style={styles.bioMuted}>No bio yet</Text>
                )}
                <Text style={styles.stats}>
                  {formatNumber(item.followerCount)} followers · {formatNumber(item.videoCount)} videos
                </Text>
              </View>
              <View style={[styles.statusPill, item.followedByCurrentUser && styles.statusPillActive]}>
                <Text style={[styles.statusText, item.followedByCurrentUser && styles.statusTextActive]}>
                  {item.followedByCurrentUser ? 'Following' : 'Profile'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
        </View>
      )}
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
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  meta: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  bio: {
    color: '#c9c9c9',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  bioMuted: {
    color: '#7d7d7d',
    fontSize: 13,
    marginTop: 6,
  },
  stats: {
    color: '#999',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  statusPillActive: {
    backgroundColor: '#1f1f1f',
  },
  statusText: {
    color: '#b6b6b6',
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#fff',
  },
  emptyCard: {
    marginTop: 18,
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
