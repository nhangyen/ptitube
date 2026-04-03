import React, { useEffect, useState, useRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';

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
  onLikeChange,
  onFollowChange,
  onCommentPress,
  onProfilePress,
}: SocialActionsProps) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [likeCount, setLikeCount] = useState(stats.likeCount);
  const likeAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => { setIsLiked(initialLiked); }, [initialLiked]);
  useEffect(() => { setIsFollowing(initialFollowing); }, [initialFollowing]);
  useEffect(() => { setLikeCount(stats.likeCount); }, [stats.likeCount]);

  const handleLike = async () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikeCount((current) => current + (nextLiked ? 1 : -1));
    onLikeChange(nextLiked);

    if (nextLiked) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(likeAnimation, { toValue: 1.18, useNativeDriver: true }),
          Animated.timing(pulseAnimation, { toValue: 1, duration: 200, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.spring(likeAnimation, { toValue: 1, useNativeDriver: true }),
          Animated.timing(pulseAnimation, { toValue: 0, duration: 400, useNativeDriver: true })
        ])
      ]).start();
    } else {
      Animated.sequence([
        Animated.spring(likeAnimation, { toValue: 0.8, useNativeDriver: true }),
        Animated.spring(likeAnimation, { toValue: 1, useNativeDriver: true })
      ]).start();
    }

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

  return (
    <View style={styles.container}>
      <View style={styles.actionItem}>
        <TouchableOpacity style={styles.avatarWrap} onPress={onProfilePress} activeOpacity={0.85}>
          <View style={styles.avatar}>
             <Text style={styles.avatarText}>{username.slice(0, 1).toUpperCase()}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.followBadge} onPress={handleFollow}>
          {isFollowing ? (
            <View style={[styles.followInner, styles.followingInner]}>
              <Text style={styles.followBadgeText}>✓</Text>
            </View>
          ) : (
            <LinearGradient
              colors={['#ff8c95', '#e80048']}
              style={styles.followInner}
            >
              <Text style={styles.followBadgeText}>+</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.actionItem} onPress={handleLike}>
        <Animated.View style={[styles.pulseGlow, { 
          opacity: pulseAnimation,
          transform: [{ scale: pulseAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1.5]
          })}]
        }]} />
        <Animated.Text style={[styles.actionIcon, isLiked && styles.likeIcon, { transform: [{ scale: likeAnimation }] }]}>
          {isLiked ? '♥' : '♡'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    bottom: 80, // slightly lower to keep closer to thumb zone
    alignItems: 'center',
     // spacing-8
  },
  actionItem: {
    alignItems: 'center',
    position: 'relative',
    height: 48, // 3rem minimum tap target
    justifyContent: 'center',
    marginBottom: 32, // Replacement for gap
  },
  avatarWrap: {
    borderRadius: 32,
    marginBottom: 16,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 32,
    backgroundColor: '#2b0414', // surface-container-low
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ff8c95',
    fontSize: 24, // headline-sm
    
    fontWeight: '800',
  },
  followBadge: {
    position: 'absolute',
    bottom: -8, // Tonal stacking
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followInner: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingInner: {
    backgroundColor: '#3e0d21', // surface-container-high
  },
  followBadgeText: {
    color: '#64001a', // ON Primary
    fontSize: 14,
    fontWeight: '800',
  },
  pulseGlow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ff576e', // primary-fixed-dim
  },
  actionIcon: {
    color: '#fff',
    fontSize: 32,
  },
  likeIcon: {
    color: '#ff8c95', // Primary
  },
  actionCount: {
    color: '#f3ffca', // Tertiary for metadata that shouldn't be missed
    fontSize: 12, // label-sm
    
    fontWeight: '700',
    marginTop: 4,
  },
});
