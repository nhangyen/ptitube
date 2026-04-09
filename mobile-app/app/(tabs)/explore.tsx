import React, { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import HashtagChips from '@/components/HashtagChips';
import VideoGrid from '@/components/VideoGrid';
import type { DiscoverData, SearchResults, UserCard, VideoItem } from '@/services/api';
import * as api from '@/services/api';

function CreatorCard({ creator }: { creator: UserCard }) {
  return (
    <TouchableOpacity
      style={styles.creatorCard}
      onPress={() => router.push(`/profile/${creator.id}` as never)}
      activeOpacity={0.85}
    >
      <View style={styles.creatorAvatar}>
        <Text style={styles.creatorAvatarText}>{creator.username.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.creatorMeta}>
        <Text style={styles.creatorName}>@{creator.username}</Text>
        <Text style={styles.creatorBio} numberOfLines={2}>
          {creator.bio || 'Creator profile'}
        </Text>
        <Text style={styles.creatorStats}>
          {creator.followerCount} followers · {creator.videoCount} videos
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function VideoRowCard({ video }: { video: VideoItem }) {
  return (
    <TouchableOpacity
      style={styles.videoRow}
      onPress={() => router.push(`/video/${video.id}` as never)}
      activeOpacity={0.85}
    >
      <View style={styles.videoRowPreview}>
        {video.thumbnailUrl ? (
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={styles.videoRowThumbnail}
            contentFit="cover"
            transition={150}
          />
        ) : null}
      </View>
      <View style={styles.videoRowMeta}>
        <Text style={styles.videoRowTitle} numberOfLines={1}>
          {video.title}
        </Text>
        <Text style={styles.videoRowDescription} numberOfLines={2}>
          {video.description || 'No description yet.'}
        </Text>
        <Text style={styles.videoRowOwner}>@{video.user.username}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DiscoverScreen() {
  const [discoverData, setDiscoverData] = useState<DiscoverData | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void loadDiscover();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    const timeout = setTimeout(() => {
      void api
        .searchDiscover(trimmed, 0, 12)
        .then((response) => setSearchResults(response))
        .finally(() => setSearching(false));
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  const loadDiscover = async () => {
    setLoading(true);
    const data = await api.getDiscover();
    setDiscoverData(data);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    void loadDiscover();
  };

  const activeResults = useMemo(() => searchResults, [searchResults]);

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
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>DISCOVER</Text>
        <Text style={styles.heroTitle}>Search videos, creators, and hashtags.</Text>
        <Text style={styles.heroSubtitle}>
          The search API now uses backend discover endpoints and hashtag-aware results.
        </Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title, creator, or #hashtag"
          placeholderTextColor="#7a7a7a"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {searching ? <ActivityIndicator color="#FF3B30" style={styles.searchLoader} /> : null}

      {activeResults ? (
        <>
          <Text style={styles.sectionTitle}>Videos</Text>
          {activeResults.videos.length ? (
            activeResults.videos.map((video) => <VideoRowCard key={video.id} video={video} />)
          ) : (
            <Text style={styles.emptyText}>No matching videos.</Text>
          )}

          <Text style={styles.sectionTitle}>Creators</Text>
          {activeResults.users.length ? (
            activeResults.users.map((creator) => <CreatorCard key={creator.id} creator={creator} />)
          ) : (
            <Text style={styles.emptyText}>No matching creators.</Text>
          )}

          <Text style={styles.sectionTitle}>Hashtags</Text>
          {activeResults.hashtags.length ? (
            <HashtagChips
              hashtags={activeResults.hashtags.map((item) => item.name)}
              onPress={(tag) => router.push(`/hashtag/${encodeURIComponent(tag)}` as never)}
            />
          ) : (
            <Text style={styles.emptyText}>No matching hashtags.</Text>
          )}
        </>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Trending hashtags</Text>
          <HashtagChips
            hashtags={discoverData?.trendingHashtags.map((item) => item.name)}
            onPress={(tag) => router.push(`/hashtag/${encodeURIComponent(tag)}` as never)}
          />

          <Text style={styles.sectionTitle}>Suggested creators</Text>
          {discoverData?.suggestedCreators.length ? (
            discoverData.suggestedCreators.map((creator) => <CreatorCard key={creator.id} creator={creator} />)
          ) : (
            <Text style={styles.emptyText}>No creators available yet.</Text>
          )}

          <Text style={styles.sectionTitle}>Featured videos</Text>
          <VideoGrid
            videos={discoverData?.featuredVideos || []}
            onVideoPress={(video) => router.push(`/video/${video.id}` as never)}
            emptyTitle="No featured videos"
            emptySubtitle="Upload more content to populate discover."
          />
        </>
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#070707',
  },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#242424',
  },
  eyebrow: {
    color: '#ff8f87',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    marginTop: 12,
  },
  heroSubtitle: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  searchBox: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#262626',
    marginTop: 18,
  },
  searchInput: {
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  searchLoader: {
    marginTop: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 28,
    marginBottom: 14,
  },
  creatorCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#242424',
    marginBottom: 12,
  },
  creatorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorAvatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  creatorMeta: {
    flex: 1,
    marginLeft: 14,
    gap: 4,
  },
  creatorName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  creatorBio: {
    color: '#949494',
    fontSize: 13,
    lineHeight: 18,
  },
  creatorStats: {
    color: '#c8c8c8',
    fontSize: 12,
    fontWeight: '600',
  },
  videoRow: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#242424',
    marginBottom: 12,
  },
  videoRowPreview: {
    width: 86,
    borderRadius: 14,
    backgroundColor: '#262626',
    overflow: 'hidden',
  },
  videoRowThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoRowMeta: {
    flex: 1,
    marginLeft: 14,
    gap: 6,
  },
  videoRowTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  videoRowDescription: {
    color: '#8f8f8f',
    fontSize: 13,
    lineHeight: 18,
  },
  videoRowOwner: {
    color: '#ffd5d1',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#8d8d8d',
    fontSize: 14,
    lineHeight: 20,
  },
});
