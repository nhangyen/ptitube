import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
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
  const currentVideoId = videos[currentVideoIndex]?.id ?? null;

  useEffect(() => {
    void fetchVideos(0, true);

    return () => {
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
      setVideos((current) => (refresh ? response : [...current, ...response]));
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

  const recordVideoView = useCallback(async (videoId: string) => {
    if (viewRecorded.current.has(videoId)) return;
    viewRecorded.current.add(videoId);
    try {
      await api.recordView(videoId, 0, false);
    } catch (error) {
      console.error('Error recording view:', error);
    }
  }, []);

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (!viewableItems.length) return;

    const visibleIndex = viewableItems[0].index;
    const visibleVideo = viewableItems[0].item as VideoItem;

    setCurrentVideoIndex(visibleIndex);
    setIsPaused(false);
    if (visibleVideo) void recordVideoView(visibleVideo.id);

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
      <View style={[styles.videoCard, { height: containerHeight }]}>
        <TouchableOpacity style={styles.videoTouchable} activeOpacity={1} onPress={togglePlayPause}>
          {shouldMountVideo ? (
            <Video
              ref={(ref) => {
                if (ref) videoRefs.current[item.id] = ref;
                else delete videoRefs.current[item.id];
              }}
              source={{ uri: resolveVideoUri(item) }}
              style={styles.video}
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
            <View style={styles.videoPlaceholder} />
          )}

          <LinearGradient
            colors={['transparent', 'rgba(35, 2, 15, 0.4)', 'rgba(35, 2, 15, 0.8)', '#23020f']}
            locations={[0, 0.5, 0.8, 1]}
            style={styles.bottomGradient}
            pointerEvents="none"
          />

          <View style={styles.contentOverlay}>
            {item.entryType === 'repost' && item.repostedBy ? (
              <View style={styles.repostBadge}>
                <Ionicons name="repeat" size={12} color="#23020f" />
                <Text style={styles.repostBadgeText}>@{item.repostedBy.username} reposted</Text>
              </View>
            ) : null}
            <TouchableOpacity onPress={() => router.push(`/profile/${item.user.id}` as never)}>
              <Text style={styles.usernameText} numberOfLines={1}>@{item.user?.username || 'user'}</Text>
            </TouchableOpacity>
            <Text style={styles.titleText} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.descriptionText} numberOfLines={2}>
              {item.description}
            </Text>
            <HashtagChips hashtags={item.hashtags?.map((t) => typeof t === 'string' ? t : (t as any).name) || []} />
          </View>
        </TouchableOpacity>

        <BlurView intensity={70} tint="dark" style={styles.topControlMuteContainer}>
          <TouchableOpacity style={styles.controlButtonList} onPress={toggleMute}>
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-medium'} size={20} color="#fff" />
          </TouchableOpacity>
        </BlurView>

        {isPaused && isCurrentVideo && (
          <View style={styles.pauseIndicatorContainer} pointerEvents="none">
            <BlurView intensity={70} tint="dark" style={styles.pauseIndicatorWrap}>
              <Ionicons name="play" size={38} color="#ff8c95" style={{ marginLeft: 6 }} />
            </BlurView>
          </View>
        )}

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
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderCenter}>
        <ActivityIndicator size="large" color="#ff8c95" />
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.loaderCenter}>
        <Text style={styles.infoCenterText}>No videos found</Text>
        <TouchableOpacity style={styles.refreshControlBtn} onPress={handleRefresh}>
          <Text style={styles.refreshControlText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={styles.mainContainer}
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

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#23020f',
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#23020f',
  },
  infoCenterText: {
    color: '#e8e8e8',
    fontSize: 16,
    marginBottom: 24,
  },
  refreshControlBtn: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 48,
    backgroundColor: '#ff8c95',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshControlText: {
    color: '#64001a',
    fontWeight: '700',
    fontSize: 16,
  },
  videoCard: {
    width,
    height,
    backgroundColor: '#23020f',
    position: 'relative',
  },
  videoTouchable: {
    flex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: '#2b0414',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  topControlMuteContainer: {
    position: 'absolute',
    top: 60,
    right: 24,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: 'rgba(74, 17, 41, 0.7)',
  },
  controlButtonList: {
    height: 48,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIndicatorContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -42 }, { translateY: -42 }],
    borderRadius: 84,
    overflow: 'hidden',
  },
  pauseIndicatorWrap: {
    width: 84,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(62, 13, 33, 0.7)',
  },
  contentOverlay: {
    position: 'absolute',
    left: 24,
    right: 84,
    bottom: 30,
  },
  repostBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3ffca',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  repostBadgeText: {
    color: '#23020f',
    fontSize: 11,
    fontWeight: '800',
  },
  usernameText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  titleText: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 22,
  },
  descriptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
});
