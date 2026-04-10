import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ResizeMode, Video } from "expo-av";
import CommentSection from "@/components/CommentSection";
import HashtagChips from "@/components/HashtagChips";
import ScreenHeader from "@/components/ScreenHeader";
import SocialActions from "@/components/SocialActions";
import { API_BASE_URL } from "@/constants/Config";
import { useAuth } from "@/contexts/AuthContext";
import type { VideoItem, VideoStats } from "@/services/api";
import * as api from "@/services/api";
import { Repeat } from "lucide-react-native";

const { width } = Dimensions.get("window");

const DEFAULT_STATS: VideoStats = {
  viewCount: 0,
  likeCount: 0,
  commentCount: 0,
  shareCount: 0,
  repostCount: 0,
};

const resolveVideoUri = (video: VideoItem) => {
  if (video.videoUrl?.startsWith("http")) {
    return video.videoUrl;
  }
  return `${API_BASE_URL.replace("/api", "")}${video.videoUrl}`;
};

export default function VideoDetailScreen() {
  const params = useLocalSearchParams<{ videoId: string; repostedByUserId?: string }>();
  const { user: currentUser } = useAuth();
  const videoRef = useRef<Video>(null);
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);

  const videoId = params.videoId || "";

  useEffect(() => {
    void api
      .getVideoDetail(videoId, params.repostedByUserId)
      .then((data) => setVideo(data))
      .catch((error) => console.error("Error loading video detail:", error))
      .finally(() => setLoading(false));
  }, [params.repostedByUserId, videoId]);

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
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color="#ff8c95" />
      </View>
    );
  }

  if (!video) {
    return (
      <View className="flex-1 bg-surface items-center justify-center p-6">
        <Text className="text-primary font-display text-2xl font-bold">Signal Lost</Text>
        <Text className="text-gray-400 font-body text-center mt-2">Cannot retrieve this visual sequence.</Text>
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

  const handleRepostChange = (reposted: boolean) => {
    setVideo((current) => {
      if (!current) { return current; }
      const isOwnRepostEntry = current.entryType === "repost" && current.repostedBy?.id === currentUser?.id;
      const nextStats = {
        ...(current.stats || DEFAULT_STATS),
        repostCount: Math.max(0, (current.stats?.repostCount || 0) + (reposted ? 1 : -1)),
      };
      const now = new Date().toISOString();

      if (reposted && currentUser) {
        return {
          ...current,
          feedEntryId: isOwnRepostEntry ? current.feedEntryId : `repost:pending:${current.id}`,
          entryType: "repost",
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
        ...current,
        feedEntryId: isOwnRepostEntry ? `video:${current.id}` : current.feedEntryId,
        entryType: isOwnRepostEntry ? "original" : current.entryType,
        activityAt: isOwnRepostEntry ? (current.createdAt || current.activityAt) : current.activityAt,
        repostedAt: isOwnRepostEntry ? undefined : current.repostedAt,
        repostedBy: isOwnRepostEntry ? undefined : current.repostedBy,
        currentUserHasReposted: false,
        stats: nextStats,
      };
    });
  };

  return (
    <View className="flex-1 bg-surface relative">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <ScreenHeader
          title={video.title || "Sequence Log"}
          subtitle={`@${video.user.username}`}
          onBack={() => router.back()}
          
        />

        <View className="px-4">
          <View className="bg-surface-container-lowest rounded-[36px] overflow-hidden border border-outline-variant/15 shadow-[0_10px_40px_rgba(255,140,149,0.1)] relative">
            <Video
              ref={videoRef}
              source={{ uri: resolveVideoUri(video) }}
              className="w-full bg-[#0e0e0e]"
              style={{ height: width * 1.5 }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping
              useNativeControls={false}
            />

            <View className="absolute inset-0 pointer-events-none" />

            <View className="absolute top-2 left-0 right-0 h-40 pointer-events-none" />

            <SocialActions
              videoId={video.id}
              userId={video.user.id}
              username={video.user.username}
              stats={video.stats || DEFAULT_STATS}
              isLiked={Boolean(video.likedByCurrentUser)}
              isFollowing={Boolean(video.user.followedByCurrentUser)}
              isReposted={Boolean(video.currentUserHasReposted)}
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
              onRepostChange={handleRepostChange}
              onCommentPress={() => setShowComments(true)}
              onProfilePress={() => router.push(`/profile/${video.user.id}` as never)}
            />
          </View>

          <View className="mt-8 px-2">
            <TouchableOpacity onPress={() => router.push(`/profile/${video.user.id}` as never)}>
              {video.entryType === "repost" && video.repostedBy ? (
                <View className="bg-secondary/20 rounded-full px-3 py-1 flex-row items-center self-start mb-3 border border-secondary/30">
                  <Repeat size={12} color="#29fcf3" className="mr-1" />
                  <Text className="text-secondary font-label text-xs uppercase tracking-widest">
                    ${video.repostedBy.username} uplinked
                  </Text>
                </View>
              ) : null}
              <Text className="text-white font-display text-2xl font-bold mb-2" numberOfLines={1}>
                @${video.user.username}
              </Text>
            </TouchableOpacity>

            <Text className="text-gray-300 font-body text-base leading-relaxed mb-4 mt-2">
              {video.description || "System log generated without narrative payload."}
            </Text>
            
            <HashtagChips
              hashtags={video.hashtags}
              onPress={(tag) => router.push(`/hashtag/${encodeURIComponent(tag)}` as never)}
            />

            <View className="flex-row items-center flex-wrap gap-4 mt-6 bg-surface-container-high rounded-full p-4 border border-outline-variant/15">
              <View className="flex-row items-baseline gap-1 relative px-2">
                <Text className="text-white font-headline text-lg">{video.stats?.viewCount || 0}</Text>
                <Text className="text-secondary font-label text-xs uppercase tracking-widest">Views</Text>
              </View>
              <View className="w-1 h-1 rounded-full bg-surface-container-highest" />
              <View className="flex-row items-baseline gap-1 relative px-2">
                <Text className="text-white font-headline text-lg">{video.stats?.likeCount || 0}</Text>
                <Text className="text-primary font-label text-xs uppercase tracking-widest">Likes</Text>
              </View>
              <View className="w-1 h-1 rounded-full bg-surface-container-highest" />
              <View className="flex-row items-baseline gap-1 relative px-2">
                <Text className="text-white font-headline text-lg">{video.stats?.commentCount || 0}</Text>
                <Text className="text-tertiary font-label text-xs uppercase tracking-widest">Feedback</Text>
              </View>
            </View>
          </View>
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