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
import { router } from 'expo-router';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import CommentSection from '@/components/CommentSection';
import HashtagChips from '@/components/HashtagChips';
import SocialActions from '@/components/SocialActions';
import { API_BASE_URL } from '@/constants/Config';
import type { VideoItem, VideoStats } from '@/services/api';
import * as api from '@/services/api';

const { height, width } = Dimensions.get('window');

const DEFAULT_STATS: VideoStats = {
  viewCount: 0,
  likeCount: 0,
  commentCount: 0,
  shareCount: 0,
};
const ACTIVE_VIDEO_WINDOW = 1;

const resolveVideoUri = (item: VideoItem) => {
  if (item.videoUrl?.startsWith('http')) {
    return item.videoUrl;
  }
  return `${API_BASE_URL.replace('/api', '')}${item.videoUrl}`;
};

export default function FeedScreen() {
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

  const videoRefs = useRef<Record<string, Video | null>>({});
  const viewRecorded = useRef<Set<string>>(new Set());
  const currentVideoId = videos[currentVideoIndex]?.id ?? null;

  useEffect(() => {
    void fetchVideos(0, true);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(videoRefs.current).forEach((ref) => {
        if (ref) {
          void ref.unloadAsync().catch(() => undefined);
        }
      });
      videoRefs.current = {};
    };
  }, []);

  const fetchVideos = async (pageNum: number, refresh = false) => {
    if (refresh) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await api.getFeed(pageNum, 10);
      setVideos((current) => (refresh ? response : [...current, ...response]));
      setHasMore(response.length >= 10);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching feed:', error);
      if (refresh) {
        setVideos([]);
      }
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
    if (!loadingMore && hasMore) {
      void fetchVideos(page + 1, false);
    }
  };

  const recordVideoView = useCallback(async (videoId: string) => {
    if (viewRecorded.current.has(videoId)) {
      return;
    }

    viewRecorded.current.add(videoId);
    try {
      await api.recordView(videoId, 0, false);
    } catch (error) {
      console.error('Error recording view:', error);
    }
  }, []);

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (!viewableItems.length) {
      return;
    }

    const visibleIndex = viewableItems[0].index;
    const visibleVideo = viewableItems[0].item as VideoItem;

    setCurrentVideoIndex(visibleIndex);
    setIsPaused(false);
    if (visibleVideo) {
      void recordVideoView(visibleVideo.id);
    }

    Object.entries(videoRefs.current).forEach(([videoId, videoRef]) => {
      if (!videoRef) {
        return;
      }

      if (videoId === visibleVideo?.id) {
        void videoRef.playAsync();
      } else {
        void videoRef.pauseAsync();
        void videoRef.setPositionAsync(0);
      }
    });
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const togglePlayPause = () => {
    if (!currentVideoId) {
      return;
    }

    const currentRef = videoRefs.current[currentVideoId];
    if (!currentRef) {
      return;
    }

    if (isPaused) {
      void currentRef.playAsync();
    } else {
      void currentRef.pauseAsync();
    }
    setIsPaused((current) => !current);
  };

  const toggleMute = () => {
    if (!currentVideoId) {
      return;
    }

    const currentRef = videoRefs.current[currentVideoId];
    if (!currentRef) {
      return;
    }

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
          ? {
              ...video,
              user: {
                ...video.user,
                followedByCurrentUser: following,
              },
            }
          : video
      )
    );
  };

  const openComments = (videoId: string) => {
    setSelectedVideoId(videoId);
    setShowComments(true);
  };

  const renderItem = ({ item, index }: { item: VideoItem; index: number }) => {
    const isCurrentVideo = index === currentVideoIndex;
    const shouldMountVideo = Math.abs(index - currentVideoIndex) <= ACTIVE_VIDEO_WINDOW;

    return (
      <View style={styles.videoCard}>
        <TouchableOpacity style={styles.videoTouchable} activeOpacity={1} onPress={togglePlayPause}>
          {shouldMountVideo ? (
            <Video
              ref={(ref) => {
                if (ref) {
                  videoRefs.current[item.id] = ref;
                } else {
                  delete videoRefs.current[item.id];
                }
              }}
              source={{ uri: resolveVideoUri(item) }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay={isCurrentVideo && !isPaused}
              isMuted={isMuted}
              useNativeControls={false}
              onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                if (status.isLoaded && isCurrentVideo) {
                  setIsPaused(!status.isPlaying);
                }
              }}
              onError={(error) => console.error('Video error:', error)}
            />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoPlaceholderText}>Loading video...</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
            <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🔊'}</Text>
          </TouchableOpacity>
        </View>

        {isPaused && isCurrentVideo ? (
          <View style={styles.pauseIndicator}>
            <Text style={styles.pauseIcon}>▶</Text>
          </View>
        ) : null}

        <SocialActions
          videoId={item.id}
          userId={item.user?.id || ''}
          username={item.user?.username || 'user'}
          stats={item.stats || DEFAULT_STATS}
          isLiked={Boolean(item.likedByCurrentUser)}
          isFollowing={Boolean(item.user?.followedByCurrentUser)}
          onLikeChange={(liked) => handleLikeChange(item.id, liked)}
          onFollowChange={(following) => handleFollowChange(item.user?.id || '', following)}
          onCommentPress={() => openComments(item.id)}
          onProfilePress={() => router.push(`/profile/${item.user.id}` as never)}
        />

        <View style={styles.overlay}>
          <TouchableOpacity onPress={() => router.push(`/profile/${item.user.id}` as never)}>
            <Text style={styles.username}>@{item.user?.username || 'user'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
          <HashtagChips
            hashtags={item.hashtags}
            compact
            onPress={(tag) => router.push(`/hashtag/${encodeURIComponent(tag)}` as never)}
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {videos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.infoText}>No videos yet. Upload something.</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => void fetchVideos(0, true)}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={videos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          pagingEnabled
          snapToInterval={height - 79}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF3B30" />
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#FF3B30" style={styles.footer} /> : null}
          removeClippedSubviews
          maxToRenderPerBatch={3}
          windowSize={5}
          initialNumToRender={2}
          getItemLayout={(_, index) => ({
            length: height - 79,
            offset: (height - 79) * index,
            index,
          })}
        />
      )}

      {selectedVideoId ? (
        <CommentSection
          videoId={selectedVideoId}
          visible={showComments}
          onClose={() => setShowComments(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoCard: {
    height: height - 79,
    width,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoTouchable: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050505',
  },
  videoPlaceholderText: {
    color: '#7a7a7a',
    fontSize: 13,
    fontWeight: '600',
  },
  controlsContainer: {
    position: 'absolute',
    top: 60,
    right: 18,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIcon: {
    fontSize: 22,
  },
  pauseIndicator: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIcon: {
    color: '#fff',
    fontSize: 34,
    marginLeft: 4,
  },
  overlay: {
    position: 'absolute',
    left: 20,
    right: 84,
    bottom: 36,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  description: {
    color: '#d7d7d7',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 18,
  },
  refreshButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
  },
  refreshText: {
    color: '#fff',
    fontWeight: '700',
  },
  footer: {
    paddingVertical: 20,
  },
});
