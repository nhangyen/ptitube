import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Share as NativeShare, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Heart, MessageCircle, Share2, Plus, Check, Repeat, Flag } from 'lucide-react-native';
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
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const likeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setIsLiked(initialLiked);
    setLikeCount(stats.likeCount);
    setIsFollowing(initialFollowing);
    setIsReposted(initialReposted);
    setRepostCount(stats.repostCount);
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
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleReport = async () => {
    if (reportReason.trim().length < 10) {
      Alert.alert('Error', 'Please describe the issue in at least 10 characters.');
      return;
    }
    setReportSubmitting(true);
    try {
      await api.reportVideo(videoId, reportReason.trim());
      setReportModalVisible(false);
      setReportReason('');
      setReportSubmitted(true);
      Alert.alert('Report Submitted', 'Thank you for helping keep the community safe.');
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Failed to submit report';
      Alert.alert('Error', msg);
    } finally {
      setReportSubmitting(false);
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
      </TouchableOpacity>

      {user?.id !== userId && (
        <TouchableOpacity className="items-center" onPress={() => setReportModalVisible(true)}>
          <View className="w-12 h-12 rounded-full items-center justify-center bg-black/30">
            <Flag size={24} color={reportSubmitted ? "#f59e0b" : "#ffffff"} strokeWidth={1.5} />
          </View>
        </TouchableOpacity>
      )}

      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-center items-center bg-black/60 px-6"
        >
          <View className="w-full bg-surface rounded-2xl p-5">
            <Text className="text-white text-lg font-headline font-bold mb-1">Report Video</Text>
            <Text className="text-white/50 text-xs mb-4">Describe why this video should be reviewed</Text>

            <TextInput
              className="bg-surface-container-high text-white rounded-xl p-4 min-h-[120px] text-sm"
              placeholder="Describe the issue..."
              placeholderTextColor="#ffffff50"
              multiline
              textAlignVertical="top"
              maxLength={500}
              value={reportReason}
              onChangeText={setReportReason}
              editable={!reportSubmitting}
            />

            <Text className="text-white/30 text-xs text-right mt-1 mb-4">{reportReason.length}/500</Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-surface-container-high items-center"
                onPress={() => { setReportModalVisible(false); setReportReason(''); }}
                disabled={reportSubmitting}
              >
                <Text className="text-white font-label font-medium">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl items-center ${reportReason.trim().length < 10 || reportSubmitting ? 'bg-error/30' : 'bg-error'}`}
                onPress={handleReport}
                disabled={reportReason.trim().length < 10 || reportSubmitting}
              >
                <Text className="text-white font-label font-bold">
                  {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
