import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ResizeMode, Video } from 'expo-av';
import CommentSection from '@/components/CommentSection';
import HashtagChips from '@/components/HashtagChips';
import ScreenHeader from '@/components/ScreenHeader';
import SocialActions from '@/components/SocialActions';
import { API_BASE_URL } from '@/constants/Config';
import type { VideoItem, VideoStats } from '@/services/api';
import * as api from '@/services/api';

const { width } = Dimensions.get('window');

const DEFAULT_STATS: VideoStats = {
  viewCount: 0,
  likeCount: 0,
  commentCount: 0,
  shareCount: 0,
};

const resolveVideoUri = (video: VideoItem) => {
  if (video.videoUrl?.startsWith('http')) {
    return video.videoUrl;
  }
  return `${API_BASE_URL.replace('/api', '')}${video.videoUrl}`;
};

export default function VideoDetailScreen() {
  const params = useLocalSearchParams<{ videoId: string }>();
  const videoRef = useRef<Video>(null);
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);

  const videoId = params.videoId || '';

  useEffect(() => {
    void api
      .getVideoDetail(videoId)
      .then((data) => setVideo(data))
      .catch((error) => console.error('Error loading video detail:', error))
      .finally(() => setLoading(false));
  }, [videoId]);

  useEffect(() => {
    const currentVideo = videoRef.current;
    return () => {
      if (currentVideo) {
        void currentVideo.unloadAsync().catch(() => undefined);
      }
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  if (!video) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Video not found.</Text>
      </View>
    );
  }

  const handleCommentCountChange = (count: number) => {
    setVideo((current) =>
      current
        ? {
            ...current,
            stats: {
              ...(current.stats || DEFAULT_STATS),
              commentCount: count,
            },
          }
        : current
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title={video.title || 'Video'}
          subtitle={`@${video.user.username}`}
          onBack={() => router.back()}
        />

        <View style={styles.playerWrap}>
          <Video
            ref={videoRef}
            source={{ uri: resolveVideoUri(video) }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
            useNativeControls={false}
          />

          <SocialActions
            videoId={video.id}
            userId={video.user.id}
            username={video.user.username}
            stats={video.stats || DEFAULT_STATS}
            isLiked={Boolean(video.likedByCurrentUser)}
            isFollowing={Boolean(video.user.followedByCurrentUser)}
            onLikeChange={(liked) =>
              setVideo((current) =>
                current
                  ? {
                      ...current,
                      likedByCurrentUser: liked,
                      stats: {
                        ...(current.stats || DEFAULT_STATS),
                        likeCount: Math.max(0, (current.stats?.likeCount || 0) + (liked ? 1 : -1)),
                      },
                    }
                  : current
              )
            }
            onFollowChange={(following) =>
              setVideo((current) =>
                current
                  ? {
                      ...current,
                      user: {
                        ...current.user,
                        followedByCurrentUser: following,
                      },
                    }
                  : current
              )
            }
            onCommentPress={() => setShowComments(true)}
            onProfilePress={() => router.push(`/profile/${video.user.id}` as never)}
          />
        </View>

        <TouchableOpacity onPress={() => router.push(`/profile/${video.user.id}` as never)}>
          <Text style={styles.username} numberOfLines={1}>@{video.user.username}</Text>
        </TouchableOpacity>
        <Text style={styles.description}>{video.description || 'No description available.'}</Text>
        <HashtagChips
          hashtags={video.hashtags}
          onPress={(tag) => router.push(`/hashtag/${encodeURIComponent(tag)}` as never)}
        />

        <View style={styles.statsRow}>
          <Text style={styles.stat}>{video.stats?.viewCount || 0} views</Text>
          <Text style={styles.stat}>{video.stats?.likeCount || 0} likes</Text>
          <Text style={styles.stat}>{video.stats?.commentCount || 0} comments</Text>
        </View>
      </ScrollView>

      <CommentSection
        videoId={video.id}
        visible={showComments}
        onClose={() => setShowComments(false)}
        onCommentsCountChange={handleCommentCountChange}
      />
    </View>
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
  emptyText: {
    color: '#fff',
    fontSize: 16,
  },
  playerWrap: {
    marginTop: 18,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#242424',
    height: width * 1.5,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  username: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 18,
  },
  description: {
    color: '#c9c9c9',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 18,
  },
  stat: {
    color: '#9d9d9d',
    fontSize: 13,
    fontWeight: '600',
  },
});
