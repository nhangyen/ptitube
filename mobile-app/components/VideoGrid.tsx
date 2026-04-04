import React from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ListRenderItem } from 'react-native';
import type { VideoItem } from '@/services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 52) / 2;

interface VideoGridProps {
  videos: VideoItem[];
  onVideoPress: (video: VideoItem) => void;
  emptyTitle?: string;
  emptySubtitle?: string;
}

const formatCount = (count: number = 0) => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return `${count}`;
};

export default function VideoGrid({
  videos,
  onVideoPress,
  emptyTitle = 'No videos yet',
  emptySubtitle = 'Upload a video or check back later.',
}: VideoGridProps) {
  const renderItem: ListRenderItem<VideoItem> = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => onVideoPress(item)} activeOpacity={0.85}>
      <View style={styles.preview}>
        <View style={styles.previewTopRow}>
          <Text style={styles.previewBadge}>VIDEO</Text>
          {item.entryType === 'repost' ? <Text style={styles.repostBadge}>REPOST</Text> : null}
        </View>
        <Text style={styles.previewTitle} numberOfLines={2}>
          {item.title || 'Untitled'}
        </Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title || 'Untitled'}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description || 'No description yet.'}
        </Text>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>{formatCount(item.stats?.viewCount)} views</Text>
          <Text style={styles.stat}>{formatCount(item.stats?.likeCount)} likes</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={videos}
      renderItem={renderItem}
      keyExtractor={(item) => item.feedEntryId || item.id}
      numColumns={2}
      columnWrapperStyle={videos.length > 1 ? styles.row : undefined}
      scrollEnabled={false}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 12,
  },
  preview: {
    height: CARD_WIDTH * 1.22,
    backgroundColor: '#262626',
    padding: 14,
    justifyContent: 'space-between',
  },
  previewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  previewBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#f5f5f5',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  repostBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ff8f87',
    color: '#290905',
    fontSize: 10,
    fontWeight: '800',
  },
  previewTitle: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  meta: {
    padding: 12,
    gap: 6,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    color: '#8c8c8c',
    fontSize: 12,
    lineHeight: 16,
    minHeight: 32,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    color: '#b7b7b7',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: '#131313',
    borderWidth: 1,
    borderColor: '#242424',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#8c8c8c',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
});
