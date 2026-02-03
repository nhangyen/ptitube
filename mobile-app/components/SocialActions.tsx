import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Share as RNShare,
  Alert,
  Animated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
}

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
}: SocialActionsProps) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [likeCount, setLikeCount] = useState(stats.likeCount);
  const [likeAnimation] = useState(new Animated.Value(1));

  const handleLike = async () => {
    // Optimistic update
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    onLikeChange(newLiked);

    // Animation
    Animated.sequence([
      Animated.spring(likeAnimation, {
        toValue: 1.3,
        useNativeDriver: true,
      }),
      Animated.spring(likeAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await api.toggleLike(videoId);
    } catch (error) {
      // Revert on error
      setIsLiked(!newLiked);
      setLikeCount(prev => !newLiked ? prev + 1 : prev - 1);
      onLikeChange(!newLiked);
      console.error('Error toggling like:', error);
    }
  };

  const handleFollow = async () => {
    const newFollowing = !isFollowing;
    setIsFollowing(newFollowing);
    onFollowChange(newFollowing);

    try {
      await api.toggleFollow(userId);
    } catch (error) {
      setIsFollowing(!newFollowing);
      onFollowChange(!newFollowing);
      console.error('Error toggling follow:', error);
    }
  };

  const handleShare = async () => {
    try {
      const response = await api.shareVideo(videoId);
      const shareLink = response.shareLink || `https://videoapp.com/video/${videoId}`;

      const result = await RNShare.share({
        message: `Check out this video on VideoApp! ${shareLink}`,
        url: shareLink,
      });

      if (result.action === RNShare.sharedAction) {
        // Successfully shared
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Report Video',
      'Why are you reporting this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Inappropriate Content', onPress: () => submitReport('Inappropriate content') },
        { text: 'Spam', onPress: () => submitReport('Spam') },
        { text: 'Harassment', onPress: () => submitReport('Harassment') },
        { text: 'Other', onPress: () => submitReport('Other') },
      ]
    );
  };

  const submitReport = async (reason: string) => {
    try {
      await api.reportVideo(videoId, reason);
      Alert.alert('Thank You', 'Your report has been submitted.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit report');
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <View style={styles.container}>
      {/* User Avatar with Follow */}
      <View style={styles.actionItem}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handleFollow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{username[0].toUpperCase()}</Text>
          </View>
          {!isFollowing && (
            <View style={styles.followBadge}>
              <Text style={styles.followBadgeText}>+</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Like */}
      <TouchableOpacity style={styles.actionItem} onPress={handleLike}>
        <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
          <Text style={[styles.actionIcon, isLiked && styles.liked]}>
            {isLiked ? '❤️' : '🤍'}
          </Text>
        </Animated.View>
        <Text style={styles.actionCount}>{formatCount(likeCount)}</Text>
      </TouchableOpacity>

      {/* Comment */}
      <TouchableOpacity style={styles.actionItem} onPress={onCommentPress}>
        <Text style={styles.actionIcon}>💬</Text>
        <Text style={styles.actionCount}>{formatCount(stats.commentCount)}</Text>
      </TouchableOpacity>

      {/* Share */}
      <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
        <Text style={styles.actionIcon}>↗️</Text>
        <Text style={styles.actionCount}>{formatCount(stats.shareCount)}</Text>
      </TouchableOpacity>

      {/* Report */}
      <TouchableOpacity style={styles.actionItem} onPress={handleReport}>
        <Text style={styles.actionIcon}>⚠️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 10,
    bottom: 100,
    alignItems: 'center',
    gap: 20,
  },
  actionItem: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  followBadge: {
    position: 'absolute',
    bottom: -5,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionIcon: {
    fontSize: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  liked: {
    // Additional styling for liked state
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 5,
  },
});
