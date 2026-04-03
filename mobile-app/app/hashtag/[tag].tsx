import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import VideoGrid from '@/components/VideoGrid';
import type { HashtagDetail } from '@/services/api';
import * as api from '@/services/api';

export default function HashtagScreen() {
  const params = useLocalSearchParams<{ tag: string }>();
  const [detail, setDetail] = useState<HashtagDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tag = params.tag || '';

  const loadDetail = useCallback(async () => {
    try {
      const response = await api.getHashtagDetail(tag, 0, 24);
      setDetail(response);
    } catch (error) {
      console.error('Error loading hashtag detail:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tag]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadDetail();
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
        title={detail?.hashtag.displayName || `#${tag}`}
        subtitle="Videos collected from the hashtag system."
        onBack={() => router.back()}
      />

      <View style={styles.heroCard}>
        <Text style={styles.heroCount}>{detail?.hashtag.videoCount || 0}</Text>
        <Text style={styles.heroLabel}>videos tagged with {detail?.hashtag.displayName || `#${tag}`}</Text>
      </View>

      <Text style={styles.sectionTitle}>Video grid</Text>
      <VideoGrid
        videos={detail?.videos || []}
        onVideoPress={(video) => router.push(`/video/${video.id}` as never)}
        emptyTitle="No videos in this hashtag"
        emptySubtitle="Try another hashtag or add this hashtag to a new upload."
      />
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#070707',
  },
  heroCard: {
    marginTop: 18,
    borderRadius: 28,
    padding: 22,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#242424',
  },
  heroCount: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '800',
  },
  heroLabel: {
    color: '#a0a0a0',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 28,
    marginBottom: 14,
  },
});
