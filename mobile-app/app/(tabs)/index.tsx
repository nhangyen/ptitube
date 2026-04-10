import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CommentSection from '@/components/CommentSection';
import HashtagChips from '@/components/HashtagChips';
import SocialActions from '@/components/SocialActions';
import { API_BASE_URL } from '@/constants/Config';
import { useAuth } from '@/contexts/AuthContext';
import type { VideoItem, VideoStats } from '@/services/api';
import * as api from '@/services/api';

const { height, width } = Dimensions.get('window');

const DEFAULT_STATS: VideoStats = {
  viewCount: 0,
  likeCount: 0,
  commentCount: 0,
  shareCount: 0,
  repostCount: 0,
};
const ACTIVE_VIDEO_WINDOW = 1;

const resolveVideoUri = (item: VideoItem) => {
  if (item.videoUrl?.startsWith('http')) {
    return item.videoUrl;
  }
  return `${API_BASE_URL.replace('/api', '')}${item.videoUrl}`;
};

const FeedItemInfo = ({ item }: { item: VideoItem }) => {
  const [expanded, setExpanded] = useState(false);
  const tags = item.hashtags?.map((t) => typeof t === 'string' ? t : (t as any).name) || [];
  const hasMore = (item.description && item.description.length > 40) || (item.title && item.title.length > 30) || tags.length > 2;

  return (
    <View className="absolute left-4 right-20 bottom-[130px]">
      {item.entryType === 'repost' && item.repostedBy ? (
        <View className="self-start flex-row items-center gap-2 bg-tertiary rounded-full px-3 py-1.5 mb-3">
          <Ionicons name="repeat" size={14} color="#23020f" />
          <Text className="text-surface text-xs font-label">@{item.repostedBy.username} reposted</Text>
        </View>
      ) : null}
      <TouchableOpacity onPress={() => router.push(`/profile/${item.user.id}` as never)}>
        <Text className="text-white text-xl font-headline mb-2 font-bold" numberOfLines={1}>@{item.user?.username || 'user'}</Text>
      </TouchableOpacity>
      
      {item.title ? (
        <Text className="text-white font-label mb-2 text-sm leading-relaxed" numberOfLines={expanded ? undefined : 1}>{item.title}</Text>
      ) : null}
      
      {item.description ? (
        <Text className="text-white/80 text-sm font-body leading-tight mb-2" numberOfLines={expanded ? undefined : 1}>
          {item.description}
        </Text>
      ) : null}

      {tags.length > 0 && (
        <View className="flex-row items-start">
          <View className="flex-1">
            <HashtagChips hashtags={expanded ? tags : tags.slice(0, 2)} compact />
          </View>
        </View>
      )}
      
      {hasMore && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)} className="mt-1 self-start bg-black/40 px-3 py-1 rounded-full border border-white/10">
          <Text className="text-white/90 font-label text-xs font-bold">{expanded ? 'Ẩn bớt' : 'Xem thêm'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function FeedScreen() {
  const isFocused = useIsFocused();
  const { user: currentUser } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(height);

  const videoRefs = useRef<Record<string, Video | null>>({});
  const viewRecorded = useRef<Set<string>>(new Set());
  const viewStartTimeRef = useRef<number>(Date.now());
  const lastViewedIdRef = useRef<string | null>(null);
  const currentVideoFinishedRef = useRef<boolean>(false);
  const currentVideoId = videos[currentVideoIndex]?.id ?? null;

  useEffect(() => {
    void fetchVideos(0, true);

    return () => {
      // Record final view before unmount
      if (lastViewedIdRef.current) {
        const duration = (Date.now() - viewStartTimeRef.current) / 1000;
        if (duration > 0.5) {
          void api.recordView(lastViewedIdRef.current, parseFloat(duration.toFixed(2)), currentVideoFinishedRef.current);
        }
      }

      Object.values(videoRefs.current).forEach((ref) => {
        if (ref) {
          void ref.unloadAsync().catch(() => undefined);
        }
      });
      videoRefs.current = {};
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        Object.values(videoRefs.current).forEach((ref) => {
          if (ref) {
            void ref.pauseAsync().catch(() => undefined);
          }
        });
      };
    }, [])
  );

  const fetchVideos = async (pageNum: number, refresh = false) => {
    if (refresh) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await api.getFeed(pageNum, 10);
      setVideos((current) => {
        if (refresh) return response;
        const existingIds = new Set(current.map(v => v.id));
        const newVideos = response.filter(v => !existingIds.has(v.id));
        return [...current, ...newVideos];
      });
      setHasMore(response.length >= 10);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching feed:', error);
      if (refresh) setVideos([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentVideoIndex(0);
    setIsPaused(false);
    viewRecorded.current.clear();
    void fetchVideos(0, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) void fetchVideos(page + 1, false);
  };

  const recordVideoView = useCallback(async (videoId: string, duration: number, completed: boolean) => {
    try {
      await api.recordView(videoId, duration, completed);
    } catch (error) {
      console.error('Error recording view:', error);
    }
  }, []);

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (!viewableItems.length) return;

    const visibleIndex = viewableItems[0].index;
    const visibleVideo = viewableItems[0].item as VideoItem;

    if (visibleVideo && visibleVideo.id !== lastViewedIdRef.current) {
      // 1. Record previous video view if it exists
      if (lastViewedIdRef.current) {
        const duration = (Date.now() - viewStartTimeRef.current) / 1000;
        // Only record if watched for more than 0.5 seconds
        if (duration > 0.5) {
          void recordVideoView(lastViewedIdRef.current, parseFloat(duration.toFixed(2)), currentVideoFinishedRef.current);
        }
      }

      // 2. Initialize new video tracking
      lastViewedIdRef.current = visibleVideo.id;
      viewStartTimeRef.current = Date.now();
      currentVideoFinishedRef.current = false;
    }

    setCurrentVideoIndex(visibleIndex);
    setIsPaused(false);

    Object.entries(videoRefs.current).forEach(([videoId, videoRef]) => {
      if (!videoRef) return;
      if (videoId === visibleVideo?.id) void videoRef.playAsync();
      else {
        void videoRef.pauseAsync();
        void videoRef.setPositionAsync(0);
      }
    });
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const togglePlayPause = () => {
    if (!currentVideoId) return;
    const currentRef = videoRefs.current[currentVideoId];
    if (!currentRef) return;
    if (isPaused) void currentRef.playAsync();
    else void currentRef.pauseAsync();
    setIsPaused((current) => !current);
  };

  const toggleMute = () => {
    if (!currentVideoId) return;
    const currentRef = videoRefs.current[currentVideoId];
    if (!currentRef) return;
    void currentRef.setIsMutedAsync(!isMuted);
    setIsMuted((current) => !current);
  };

  const updateVideo = (videoId: string, updater: (video: VideoItem) => VideoItem) => {
    setVideos((current) => current.map((video) => (video.id === videoId ? updater(video) : video)));
  };

  const handleLikeChange = (videoId: string, liked: boolean) => {
    updateVideo(videoId, (video) => ({
      ...video,
      likedByCurrentUser: liked,
      stats: {
        ...(video.stats || DEFAULT_STATS),
        likeCount: Math.max(0, (video.stats?.likeCount || 0) + (liked ? 1 : -1)),
      },
    }));
  };

  const handleFollowChange = (userId: string, following: boolean) => {

    setVideos((current) =>
      current.map((video) =>
        video.user.id === userId
          ? { ...video, user: { ...video.user, followedByCurrentUser: following } }
          : video
      )
    );
  };

  const handleCommentCountChange = (videoId: string, count: number) => {
    updateVideo(videoId, (video) => ({
      ...video,
      stats: {
        ...(video.stats || DEFAULT_STATS),
        commentCount: count,
      },
    }));
  };

  const handleRepostChange = (videoId: string, reposted: boolean) => {
    updateVideo(videoId, (video) => {
      const nextStats = {
        ...(video.stats || DEFAULT_STATS),
        repostCount: Math.max(0, (video.stats?.repostCount || 0) + (reposted ? 1 : -1)),
      };
      const isOwnRepostEntry = video.entryType === 'repost' && video.repostedBy?.id === currentUser?.id;
      const now = new Date().toISOString();

      if (reposted && currentUser) {
        return {
          ...video,
          feedEntryId: isOwnRepostEntry ? video.feedEntryId : `repost:pending:${video.id}`,
          entryType: 'repost',
          activityAt: now,
          repostedAt: now,
          repostedBy: {
            id: currentUser.id,
            username: currentUser.username,
            avatarUrl: currentUser.avatarUrl,
            followedByCurrentUser: false,
          },
          currentUserHasReposted: true,
          stats: nextStats,
        };
      }

      return {
        ...video,
        feedEntryId: isOwnRepostEntry ? `video:${video.id}` : video.feedEntryId,
        entryType: isOwnRepostEntry ? 'original' : video.entryType,
        activityAt: isOwnRepostEntry ? (video.createdAt || video.activityAt) : video.activityAt,
        repostedAt: isOwnRepostEntry ? undefined : video.repostedAt,
        repostedBy: isOwnRepostEntry ? undefined : video.repostedBy,
        currentUserHasReposted: false,
        stats: nextStats,
      };
    });
  };

  const renderItem = ({ item, index }: { item: VideoItem; index: number }) => {
    const isCurrentVideo = index === currentVideoIndex;
    const shouldMountVideo = Math.abs(index - currentVideoIndex) <= ACTIVE_VIDEO_WINDOW;
    const canPlay = isFocused && isCurrentVideo && !isPaused;

    return (
      <View style={{ height: containerHeight, width }} className="bg-surface relative">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={togglePlayPause}>
          {shouldMountVideo ? (
            <Video
              ref={(ref) => {
                if (ref) videoRefs.current[item.id] = ref;
                else delete videoRefs.current[item.id];
              }}
              source={{ uri: resolveVideoUri(item) }}
              style={{ width: "100%", height: "100%" }}
              resizeMode={ResizeMode.COVER}
              isLooping
              shouldPlay={canPlay}
              isMuted={isMuted}
              useNativeControls={false}
              onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                if (status.isLoaded && status.didJustFinish) {
                  return;
                }
              }}
            />
          ) : (
            <View className="flex-1 bg-surface-container-low" />
          )}

          <LinearGradient
            colors={['transparent', 'rgba(35, 2, 15, 0.4)', 'rgba(35, 2, 15, 0.8)', '#23020f']}
            locations={[0, 0.5, 0.8, 1]}
              style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", justifyContent: "flex-end", paddingHorizontal: 16, paddingBottom: 140 }}
              pointerEvents="none"
            />

          <FeedItemInfo item={item} />
        </TouchableOpacity>

        <BlurView intensity={20} tint="dark" style={{position:"absolute", top:64, right:24, borderRadius:9999, overflow:"hidden", width:48, height:48}}>
          <TouchableOpacity className="w-12 h-12 justify-center items-center" onPress={toggleMute}>
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-medium'} size={24} color="#29fcf3" />
          </TouchableOpacity>
        </BlurView>

        {isPaused && isCurrentVideo && (
          <View className="absolute top-1/2 left-1/2 -translate-x-10 -translate-y-10 rounded-full overflow-hidden" pointerEvents="none">
            <BlurView intensity={20} tint="dark" style={{width:80, height:80, justifyContent:"center", alignItems:"center", borderRadius:9999, overflow:"hidden"}}>
              <Ionicons name="play" size={44} color="#ff8c95" style={{ marginLeft: 6 }} />
            </BlurView>
          </View>
        )}

        <View className="absolute bottom-[135px] right-2 items-center">
          <SocialActions
            videoId={item.id}
            userId={item.user?.id || ''}
            username={item.user?.username || 'user'}
            stats={item.stats || DEFAULT_STATS}
            isLiked={Boolean(item.likedByCurrentUser)}
            isFollowing={Boolean(item.user?.followedByCurrentUser)}
            isReposted={Boolean(item.currentUserHasReposted)}
            onLikeChange={(liked) => handleLikeChange(item.id, liked)}
            onFollowChange={(following) => handleFollowChange(item.user?.id || '', following)}
            onRepostChange={(reposted) => handleRepostChange(item.id, reposted)}
            onCommentPress={() => {
              setSelectedVideoId(item.id);
              setShowComments(true);
            }}
            onProfilePress={() => router.push(`/profile/${item.user.id}` as never)}
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color="#ff8c95" />
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <Text className="text-gray-300 font-body text-base mb-6">No videos found</Text>
        <TouchableOpacity className="h-12 px-6 rounded-full bg-primary justify-center items-center shadow-lg border border-outline-variant/15" onPress={handleRefresh}>
          <Text className="text-on-primary font-label text-base">Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-surface"
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      <FlatList
        data={videos}
        keyExtractor={(item) => item.feedEntryId || item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#ff8c95"
            colors={['#ff8c95']}
          />
        )}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        getItemLayout={(data, index) => ({ length: containerHeight, offset: containerHeight * index, index })}
        snapToInterval={containerHeight}
        snapToAlignment="start"
        decelerationRate="fast"
      />

      {showComments && selectedVideoId && (
        <CommentSection
          videoId={selectedVideoId}
          visible={showComments}
          onClose={() => setShowComments(false)}
          onCommentsCountChange={(count) => handleCommentCountChange(selectedVideoId, count)}
        />
      )}
    </View>
  );
}
