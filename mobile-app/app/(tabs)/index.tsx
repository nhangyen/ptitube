import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { API_BASE_URL, API_TIMEOUT } from '@/constants/Config';
import * as api from '@/services/api';
import SocialActions from '@/components/SocialActions';
import CommentSection from '@/components/CommentSection';

const { height, width } = Dimensions.get('window');
const PRELOAD_COUNT = 3;

interface VideoStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

interface VideoItem {
  id: string;
  videoUrl: string;
  title: string;
  description: string;
  score?: number;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
    followedByCurrentUser?: boolean;
  };
  stats?: VideoStats;
  likedByCurrentUser?: boolean;
}

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

  const videoRefs = useRef<{ [key: string]: Video | null }>({});
  const preloadedUrls = useRef<Set<string>>(new Set());
  const viewRecorded = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchVideos(0, true);
  }, []);

  // Preload upcoming videos
  useEffect(() => {
    for (let i = 1; i <= PRELOAD_COUNT; i++) {
      const nextIndex = currentVideoIndex + i;
      if (nextIndex < videos.length) {
        const videoUrl = videos[nextIndex].videoUrl;
        preloadedUrls.current.add(videoUrl);
      }
    }
  }, [currentVideoIndex, videos]);

  const fetchVideos = async (pageNum: number, isRefresh: boolean = false) => {
    if (isRefresh) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await api.getFeed(pageNum, 10);
      const newVideos = response || [];
      
      if (isRefresh) {
        setVideos(newVideos);
        setPage(0);
      } else {
        setVideos(prev => [...prev, ...newVideos]);
      }
      setHasMore(newVideos.length >= 10);
    } catch (error) {
      console.error('Error fetching feed:', error);
      // Fallback to regular videos endpoint
      try {
        const fallback = await api.getVideos();
        if (isRefresh) setVideos(fallback || []);
      } catch (e) {
        console.error('Fallback error:', e);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    viewRecorded.current.clear();
    fetchVideos(0, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchVideos(nextPage, false);
    }
  };

  const recordVideoView = useCallback(async (videoId: string) => {
    if (!viewRecorded.current.has(videoId)) {
      viewRecorded.current.add(videoId);
      try {
        await api.recordView(videoId, 0, false);
      } catch (error) {
        console.error('Error recording view:', error);
      }
    }
  }, []);

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const visibleIndex = viewableItems[0].index;
      const visibleVideo = viewableItems[0].item as VideoItem;
      
      setCurrentVideoIndex(visibleIndex);
      if (visibleVideo) recordVideoView(visibleVideo.id);
      
      Object.keys(videoRefs.current).forEach((key) => {
        const index = parseInt(key);
        const videoRef = videoRefs.current[key];
        if (videoRef) {
          if (index === visibleIndex) {
            videoRef.playAsync();
          } else {
            videoRef.pauseAsync();
            videoRef.setPositionAsync(0);
          }
        }
      });
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const togglePlayPause = () => {
    const currentRef = videoRefs.current[currentVideoIndex.toString()];
    if (currentRef) {
      if (isPaused) currentRef.playAsync();
      else currentRef.pauseAsync();
      setIsPaused(!isPaused);
    }
  };

  const toggleMute = () => {
    const currentRef = videoRefs.current[currentVideoIndex.toString()];
    if (currentRef) {
      currentRef.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const handleLikeChange = (videoId: string, liked: boolean) => {
    setVideos(prev => prev.map(v => 
      v.id === videoId 
        ? { ...v, likedByCurrentUser: liked, stats: v.stats ? { ...v.stats, likeCount: v.stats.likeCount + (liked ? 1 : -1) } : v.stats }
        : v
    ));
  };

  const handleFollowChange = (userId: string, following: boolean) => {
    setVideos(prev => prev.map(v => 
      v.user.id === userId 
        ? { ...v, user: { ...v.user, followedByCurrentUser: following } }
        : v
    ));
  };

  const openComments = (videoId: string) => {
    setSelectedVideoId(videoId);
    setShowComments(true);
  };

  const getVideoUri = (item: VideoItem) => {
    if (item.videoUrl.startsWith('http')) return item.videoUrl;
    return `${API_BASE_URL.replace('/api', '')}${item.videoUrl}`;
  };

  const renderItem = ({ item, index }: { item: VideoItem; index: number }) => {
    const videoUri = getVideoUri(item);
    const isCurrentVideo = index === currentVideoIndex;
    const defaultStats: VideoStats = { viewCount: 0, likeCount: 0, commentCount: 0, shareCount: 0 };

    return (
      <View style={styles.videoCard}>
        <TouchableOpacity 
          style={styles.videoTouchable}
          activeOpacity={1}
          onPress={togglePlayPause}
        >
          <Video
            ref={(ref) => (videoRefs.current[index.toString()] = ref)}
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            shouldPlay={isCurrentVideo && !isPaused}
            isMuted={isMuted}
            useNativeControls={false}
            onError={(error) => console.error('Video error:', error)}
            onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
              if (status.isLoaded && isCurrentVideo) {
                setIsPaused(!status.isPlaying);
              }
            }}
          />
        </TouchableOpacity>
        
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
            <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🔊'}</Text>
          </TouchableOpacity>
        </View>

        {isPaused && isCurrentVideo && (
          <View style={styles.pauseIndicator}>
            <Text style={styles.pauseIcon}>▶️</Text>
          </View>
        )}

        {/* Social Actions */}
        <SocialActions
          videoId={item.id}
          userId={item.user?.id || ''}
          username={item.user?.username || 'user'}
          stats={item.stats || defaultStats}
          isLiked={item.likedByCurrentUser || false}
          isFollowing={item.user?.followedByCurrentUser || false}
          onLikeChange={(liked) => handleLikeChange(item.id, liked)}
          onFollowChange={(following) => handleFollowChange(item.user?.id || '', following)}
          onCommentPress={() => openComments(item.id)}
        />

        <View style={styles.overlay}>
          <Text style={styles.username}>@{item.user?.username || 'user'}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#FF3B30" />
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
          <Text style={styles.infoText}>No videos yet. Upload something!</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => fetchVideos(0, true)}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={videos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height - 79}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF3B30" />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={3}
          windowSize={5}
          initialNumToRender={2}
          getItemLayout={(data, index) => ({
            length: height - 79,
            offset: (height - 79) * index,
            index,
          })}
        />
      )}

      {selectedVideoId && (
        <CommentSection
          videoId={selectedVideoId}
          visible={showComments}
          onClose={() => setShowComments(false)}
        />
      )}
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
    width: width,
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
  controlsContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    gap: 15,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  controlIcon: {
    fontSize: 24,
  },
  pauseIndicator: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  pauseIcon: {
    fontSize: 40,
  },
  overlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 80,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  description: {
    color: '#ddd',
    fontSize: 14,
    marginTop: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
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
    marginBottom: 20,
  },
  refreshButton: {
    padding: 12,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
  },
  refreshText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
