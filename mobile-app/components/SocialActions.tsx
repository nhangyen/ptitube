import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Share as NativeShare,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as api from '@/services/api';

interface VideoStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

interface SocialActionsProps {
  videoId: string;
  userId: string;
  username: string;
  stats: VideoStats;
  isLiked: boolean;
  isFollowing: boolean;
  onLikeChange: (liked: boolean) => void;
  onFollowChange: (following: boolean) => void;
  onCommentPress: () => void;
  onProfilePress?: () => void;
}

const formatCount = (count: number) => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return `${count}`;
};

export default function SocialActions({
  videoId,
  userId,
  username,
  stats,
  isLiked: initialLiked,
  isFollowing: initialFollowing,
  onLikeChange,
  onFollowChange,
  onCommentPress,
  onProfilePress,
}: SocialActionsProps) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [likeCount, setLikeCount] = useState(stats.likeCount);
  const [likeAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    setIsLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing]);

  useEffect(() => {
    setLikeCount(stats.likeCount);
  }, [stats.likeCount]);

  const handleLike = async () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikeCount((current) => current + (nextLiked ? 1 : -1));
    onLikeChange(nextLiked);

    Animated.sequence([
      Animated.spring(likeAnimation, {
        toValue: 1.18,
        useNativeDriver: true,
      }),
      Animated.spring(likeAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await api.toggleLike(videoId);
    } catch (error: any) {
      setIsLiked(!nextLiked);
      setLikeCount((current) => current + (!nextLiked ? 1 : -1));
      onLikeChange(!nextLiked);
      if (error.response?.status === 401) {
        Alert.alert('Login required', 'Please login to like this video.');
      }
    }
  };

  const handleFollow = async () => {
    const nextFollowing = !isFollowing;
    setIsFollowing(nextFollowing);
    onFollowChange(nextFollowing);

    try {
      await api.toggleFollow(userId);
    } catch (error: any) {
      setIsFollowing(!nextFollowing);
      onFollowChange(!nextFollowing);
      if (error.response?.status === 401) {
        Alert.alert('Login required', 'Please login to follow this creator.');
      }
    }
  };

  const handleShare = async () => {
    try {
      const response = await api.shareVideo(videoId);
      const shareLink = response.shareLink || `videoapp://video/${videoId}`;
      await NativeShare.share({
        message: `Watch this video: ${shareLink}`,
        url: shareLink,
      });
    } catch (error) {
      console.error('Error sharing video:', error);
    }
  };

  const handleReport = () => {
    Alert.alert('Report video', 'Select a reason', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Inappropriate', onPress: () => submitReport('Inappropriate content') },
      { text: 'Spam', onPress: () => submitReport('Spam') },
      { text: 'Harassment', onPress: () => submitReport('Harassment') },
      { text: 'Other', onPress: () => submitReport('Other') },
    ]);
  };

  const submitReport = async (reason: string) => {
    try {
      await api.reportVideo(videoId, reason);
      Alert.alert('Report sent', 'Thanks, your report has been submitted.');
    } catch (error: any) {
      Alert.alert('Unable to report', error.response?.data?.error || 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.actionItem}>
        <TouchableOpacity style={styles.avatarWrap} onPress={onProfilePress} activeOpacity={0.85}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{username.slice(0, 1).toUpperCase()}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.followBadge} onPress={handleFollow}>
          <Text style={styles.followBadgeText}>{isFollowing ? '✓' : '+'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.actionItem} onPress={handleLike}>
        <Animated.Text style={[styles.actionIcon, styles.likeIcon, { transform: [{ scale: likeAnimation }] }]}>
          {isLiked ? '❤' : '♡'}
        </Animated.Text>
        <Text style={styles.actionCount}>{formatCount(likeCount)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={onCommentPress}>
        <Text style={styles.actionIcon}>💬</Text>
        <Text style={styles.actionCount}>{formatCount(stats.commentCount)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
        <Text style={styles.actionIcon}>↗</Text>
        <Text style={styles.actionCount}>{formatCount(stats.shareCount)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={handleReport}>
        <Text style={styles.actionIcon}>⚠</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    bottom: 112,
    alignItems: 'center',
    gap: 20,
  },
  actionItem: {
    alignItems: 'center',
    position: 'relative',
  },
  avatarWrap: {
    borderRadius: 28,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2b2b2b',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  followBadge: {
    position: 'absolute',
    bottom: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  actionIcon: {
    color: '#fff',
    fontSize: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  likeIcon: {
    color: '#ff5b52',
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
});
