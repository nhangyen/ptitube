import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import HashtagChips from '@/components/HashtagChips';
import VideoGrid from '@/components/VideoGrid';
import type { DiscoverData, SearchResults, UserCard, VideoItem } from '@/services/api';
import * as api from '@/services/api';

function CreatorCard({ creator }: { creator: UserCard }) {
  return (
    <TouchableOpacity
      className="flex-row p-4 rounded-3xl bg-surface-container-low mb-3 items-center"
      onPress={() => router.push(`/profile/${creator.id}` as never)}
      activeOpacity={0.85}
    >
      <View className="w-14 h-14 rounded-full bg-primary-dim items-center justify-center">
        <Text className="text-on-primary font-display text-2xl">{creator.username.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View className="flex-1 ml-4 justify-center">
        <Text className="text-white font-display text-base">@{creator.username}</Text>
        <Text className="text-gray-400 font-body text-sm mt-0.5" numberOfLines={2}>
          {creator.bio || 'Creator profile'}
        </Text>
        <Text className="text-white/60 font-label text-xs mt-1">
          {creator.followerCount} followers · {creator.videoCount} videos
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function VideoRowCard({ video }: { video: VideoItem }) {
  return (
    <TouchableOpacity
      className="flex-row p-4 rounded-3xl bg-surface-container-low mb-3"
      onPress={() => router.push(`/video/${video.id}` as never)}
      activeOpacity={0.85}
    >
      <View className="w-[86px] h-24 rounded-2xl bg-surface-container-high overflow-hidden">
        {video.thumbnailUrl ? (
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
          />
        ) : null}
      </View>
      <View className="flex-1 ml-4 justify-center">
        <Text className="text-white font-headline text-base" numberOfLines={1}>
          {video.title}
        </Text>
        <Text className="text-gray-400 font-body text-sm mt-1" numberOfLines={2}>
          {video.description || 'No description yet.'}
        </Text>
        <Text className="text-primary/80 font-label text-xs mt-2">@{video.user.username}</Text>
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
    try {
      const data = await api.getDiscover();
      console.log('Discover fetched:', data.suggestedCreators?.length, data.featuredVideos?.length);
      setDiscoverData(data);
    } catch (error) {
      console.error('Error loading discover:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    void loadDiscover();
  };

  const activeResults = useMemo(() => searchResults, [searchResults]);

  if (loading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color="#ff8c95" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="p-5 pt-14 pb-32"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff8c95" />}
    >
      <View className="bg-surface-container-high rounded-[28px] p-6 mb-6">
        <Text className="text-primary font-display text-xs tracking-widest uppercase mb-2">DISCOVER</Text>
        <Text className="text-white font-display text-3xl leading-9">Search videos, creators, and hashtags.</Text>
        <Text className="text-gray-400 font-body text-base mt-3 leading-snug">
          The search API now uses backend discover endpoints and hashtag-aware results.
        </Text>
      </View>

      <View className="flex-row items-center bg-surface-container-low rounded-2xl px-4 py-2 mb-8">
        <Search size={20} color="#ff8c95" className="mr-2" />
        <TextInput
          className="flex-1 text-white font-body text-base py-3"
          placeholder="Search by title, creator, or #hashtag"
          placeholderTextColor="#a1a1aa"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {searching && <ActivityIndicator color="#ff8c95" className="mb-6" />}

      {activeResults ? (
        <>
          <Text className="text-white font-display text-xl mb-4">Videos</Text>
          {activeResults.videos.length ? (
            activeResults.videos.map((video) => <VideoRowCard key={video.id} video={video} />)
          ) : (
            <Text className="text-gray-500 font-body mb-6">No matching videos.</Text>
          )}

          <Text className="text-white font-display text-xl mt-6 mb-4">Creators</Text>
          {activeResults.users.length ? (
            activeResults.users.map((creator) => <CreatorCard key={creator.id} creator={creator} />)
          ) : (
            <Text className="text-gray-500 font-body mb-6">No matching creators.</Text>
          )}

          <Text className="text-white font-display text-xl mt-6 mb-4">Hashtags</Text>
          {activeResults.hashtags.length ? (
            <HashtagChips
              hashtags={activeResults.hashtags.map((item) => item.name)}
              onPress={(tag) => router.push(`/hashtag/${encodeURIComponent(tag)}` as never)}
            />
          ) : (
            <Text className="text-gray-500 font-body mb-6">No matching hashtags.</Text>
          )}
        </>
      ) : (
        <>
          <Text className="text-white font-display text-xl mb-4">Trending hashtags</Text>
          <HashtagChips
            hashtags={discoverData?.trendingHashtags.map((item) => item.name) || []}
            onPress={(tag) => router.push(`/hashtag/${encodeURIComponent(tag)}` as never)}
          />

          <Text className="text-white font-display text-xl mt-8 mb-4">Suggested creators</Text>
          {discoverData?.suggestedCreators.length ? (
            discoverData.suggestedCreators.map((creator) => <CreatorCard key={creator.id} creator={creator} />)
          ) : (
            <Text className="text-gray-500 font-body mb-6">No creators available yet.</Text>
          )}

          <Text className="text-white font-display text-xl mt-8 mb-4">Featured videos</Text>
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
