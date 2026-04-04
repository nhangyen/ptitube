import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import VideoGrid from '@/components/VideoGrid';
import { useAuth } from '@/contexts/AuthContext';
import type { ProfileData, VideoItem } from '@/services/api';
import * as api from '@/services/api';

const formatNumber = (num: number = 0) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return `${num}`;
};

export default function UserProfileScreen() {
  const params = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState(false);

  const userId = params.userId || '';
  const isCurrentUser = userId === user?.id;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileData, videoData] = await Promise.all([
        isCurrentUser ? api.getMyProfile() : api.getUserProfile(userId),
        isCurrentUser ? api.getMyVideos() : api.getUserVideos(userId),
      ]);
      setProfile(profileData);
      setVideos(videoData);
      setFollowing(Boolean(profileData.followedByCurrentUser));
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isCurrentUser, userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const handleFollow = async () => {
    if (isCurrentUser || !profile) {
      return;
    }

    const next = !following;
    setFollowing(next);
    setProfile((current) =>
      current
        ? {
            ...current,
            followedByCurrentUser: next,
            followerCount: Math.max(0, current.followerCount + (next ? 1 : -1)),
          }
        : current
    );

    try {
      await api.toggleFollow(profile.id);
    } catch (error: any) {
      setFollowing(!next);
      setProfile((current) =>
        current
          ? {
              ...current,
              followedByCurrentUser: !next,
              followerCount: Math.max(0, current.followerCount + (!next ? 1 : -1)),
            }
          : current
      );
      if (error.response?.status === 401) {
        Alert.alert('Login required', 'Please login to follow this creator.');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF3B30" />}
    >
      <ScreenHeader
        title={isCurrentUser ? 'My profile' : `@${profile?.username || 'creator'}`}
        subtitle={isCurrentUser ? 'Your public profile and uploads.' : 'Profile details and creator uploads.'}
        onBack={() => router.back()}
        rightSlot={
          isCurrentUser ? (
            <TouchableOpacity onPress={() => router.push('/profile/edit' as never)}>
              <Text style={styles.linkText}>Edit</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <View style={styles.heroCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(profile?.username || 'U').slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={styles.username}>@{profile?.username}</Text>
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatNumber(profile?.followerCount)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatNumber(profile?.followingCount)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatNumber(profile?.videoCount)}</Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatNumber(profile?.totalLikes)}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
        </View>

        {!isCurrentUser ? (
          <TouchableOpacity style={[styles.followButton, following && styles.followingButton]} onPress={handleFollow}>
            <Text style={styles.followButtonText}>{following ? 'Following' : 'Follow'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Video grid</Text>
      <VideoGrid
        videos={videos}
        onVideoPress={(video) => router.push(`/video/${video.id}` as never)}
        emptyTitle="No public videos"
        emptySubtitle="This creator has not published any active videos yet."
      />
    </ScrollView>
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
  linkText: {
    color: '#ff8f87',
    fontSize: 14,
    fontWeight: '700',
  },
  heroCard: {
    marginTop: 18,
    borderRadius: 28,
    padding: 22,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#242424',
    alignItems: 'center',
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '800',
  },
  username: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 16,
  },
  bio: {
    color: '#c4c4c4',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginTop: 18,
  },
  statCard: {
    width: '48%',
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#252525',
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: '#9b9b9b',
    fontSize: 12,
    marginTop: 4,
  },
  followButton: {
    marginTop: 18,
    width: '100%',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#FF3B30',
  },
  followingButton: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 28,
    marginBottom: 14,
  },
});
