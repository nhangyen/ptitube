import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Share as NativeShare } from 'react-native';
import { Heart, MessageCircle, Share2, Plus, Check, Repeat } from 'lucide-react-native';
import * as api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface VideoStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  repostCount: number;
}

interface SocialActionsProps {
  videoId: string;
  userId: string;
  username: string;
  stats: VideoStats;
  isLiked: boolean;
  isFollowing: boolean;
  isReposted: boolean;
  onLikeChange: (liked: boolean) => void;
  onFollowChange: (following: boolean) => void;
  onRepostChange: (reposted: boolean) => void;
  onCommentPress: () => void;
  onProfilePress?: () => void;
}

const formatCount = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return `${count}`;
};

export default function SocialActions({
  videoId,
  userId,
  username,
  stats,
  isLiked: initialLiked,
  isFollowing: initialFollowing,
  isReposted: initialReposted,
  onLikeChange,
  onFollowChange,
  onRepostChange,
  onCommentPress,
  onProfilePress,
}: SocialActionsProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(stats.likeCount);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isReposted, setIsReposted] = useState(initialReposted);
  const [repostCount, setRepostCount] = useState(stats.repostCount);
  const [shareCount, setShareCount] = useState(stats.shareCount);

  const likeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setIsLiked(initialLiked);
    setLikeCount(stats.likeCount);
    setIsFollowing(initialFollowing);
    setIsReposted(initialReposted);
    setRepostCount(stats.repostCount);
    setShareCount(stats.shareCount);
  }, [initialLiked, stats, initialFollowing, initialReposted]);

  const handleLike = async () => {
    Animated.sequence([
      Animated.timing(likeScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 4, useNativeDriver: true })
    ]).start();

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    onLikeChange(nextLiked);

    try {
      const response = await api.toggleLike(videoId);
      if (typeof response?.likeCount === 'number') {
        setLikeCount(response.likeCount);
      }
    } catch {
      setIsLiked(!nextLiked);
      setLikeCount((c) => Math.max(0, c + (!nextLiked ? 1 : -1)));
      onLikeChange(!nextLiked);
    }
  };

  const handleFollow = async () => {
    const nextFollowing = !isFollowing;
    setIsFollowing(nextFollowing);
    onFollowChange(nextFollowing);

    try {
      await api.toggleFollow(userId);
    } catch {
      setIsFollowing(!nextFollowing);
      onFollowChange(!nextFollowing);
    }
  };

  const handleShareLink = async () => {
    try {
      const response = await api.shareVideo(videoId);
      const shareLink = response.shareLink || `videoapp://video/${videoId}`;
      await NativeShare.share({
        message: `Watch this video on Neon: ${shareLink}`,
        url: shareLink,
      });
      setShareCount(c => c + 1);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleRepost = async () => {
    const nextReposted = !isReposted;
    setIsReposted(nextReposted);
    setRepostCount((count) => Math.max(0, count + (nextReposted ? 1 : -1)));
    onRepostChange(nextReposted);

    try {
      const response = nextReposted
        ? await api.createRepost(videoId)
        : await api.removeRepost(videoId);
      if (typeof response?.repostCount === 'number') {
        setRepostCount(response.repostCount);
      }
    } catch {
      setIsReposted(!nextReposted);
      setRepostCount((count) => Math.max(0, count + (!nextReposted ? 1 : -1)));
      onRepostChange(!nextReposted);
    }
  };

  const canFollowCreator = user?.id !== userId;

  return (
    <View className="w-16 items-center gap-7 mt-4">
      <View className="relative mb-4 items-center">
        <TouchableOpacity 
          className="w-12 h-12 rounded-full border border-white/20 overflow-hidden items-center justify-center bg-surface shadow-2xl" 
          onPress={onProfilePress} 
          activeOpacity={0.8}
        >
          <Text className="text-primary text-xl font-headline font-bold">{username.slice(0, 1).toUpperCase()}</Text>
        </TouchableOpacity>
        
        {canFollowCreator && (
          <TouchableOpacity 
            className="absolute -bottom-3 w-6 h-6 rounded-full items-center justify-center bg-primary z-10"
            onPress={handleFollow}
          >
            {isFollowing ? (
              <View className="w-full h-full rounded-full items-center justify-center bg-surface-container-high border-[1.5px] border-primary">
                <Check size={12} color="#29fcf3" strokeWidth={3} />
              </View>
            ) : (
              <Plus size={16} color="#2b0414" strokeWidth={3} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity className="items-center" onPress={handleLike}>
        <Animated.View className="w-12 h-12 rounded-full items-center justify-center bg-black/30" style={{ transform: [{ scale: likeScale }] }}>
          <Heart size={28} color={isLiked ? "#ff8c95" : "#ffffff"} fill={isLiked ? "#ff8c95" : "transparent"} strokeWidth={1.5} />
        </Animated.View>
        <Text className="text-white/90 mt-1 text-xs font-label font-medium drop-shadow-md">
          {formatCount(likeCount)}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="items-center" onPress={onCommentPress}>
        <View className="w-12 h-12 rounded-full items-center justify-center bg-black/30">
          <MessageCircle size={26} color="#ffffff" fill="transparent" strokeWidth={1.5} />
        </View>
        <Text className="text-white/90 mt-1 text-xs font-label font-medium drop-shadow-md">
          {formatCount(stats.commentCount)}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="items-center" onPress={handleRepost}>
        <View className="w-12 h-12 rounded-full items-center justify-center bg-black/30">
          <Repeat size={26} color={isReposted ? "#29fcf3" : "#ffffff"} strokeWidth={1.7} />
        </View>
        <Text className="text-white/90 mt-1 text-xs font-label font-medium drop-shadow-md">
          {formatCount(repostCount || 0)}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="items-center" onPress={handleShareLink}>
        <View className="w-12 h-12 rounded-full items-center justify-center bg-black/30">
          <Share2 size={26} color="#ffffff" strokeWidth={1.5} />
        </View>
        <Text className="text-white/90 mt-1 text-xs font-label font-medium drop-shadow-md">
          {formatCount(shareCount || stats.shareCount || 0)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
