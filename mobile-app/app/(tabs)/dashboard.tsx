import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import VideoGrid from '@/components/VideoGrid';
import { useAuth } from '@/contexts/AuthContext';
import type { DashboardData, ProfileData, VideoItem } from '@/services/api';
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

export default function ProfileScreen() {
  const { token, user, login, register, logout, refreshProfile, isLoading: authLoading } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProfileData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [profileData, videoData, dashboardData, notificationCount] = await Promise.all([
        api.getMyProfile(),
        api.getMyVideos(),
        api.getCreatorDashboard().catch(() => null),
        api.getUnreadNotificationCount().catch(() => 0),
      ]);
      setProfile(profileData);
      setVideos(videoData);
      setDashboard(dashboardData);
      setUnreadCount(notificationCount);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadProfileData();
    } else {
      setProfile(null);
      setVideos([]);
      setDashboard(null);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [token, loadProfileData]);

  useFocusEffect(
    useCallback(() => {
      if (token) {
        void loadProfileData();
      }
    }, [token, loadProfileData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void refreshProfile();
    void loadProfileData();
  };

  const handleSubmitAuth = async () => {
    if (!username.trim() || !password.trim() || (isRegisterMode && !email.trim())) {
      Alert.alert('Missing data', 'Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      if (isRegisterMode) {
        await register(username.trim(), email.trim(), password);
      } else {
        await login(username.trim(), password);
      }

      setUsername('');
      setPassword('');
      setEmail('');
    } catch (error: any) {
      Alert.alert('Authentication error', error.response?.data?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Do you want to sign out now?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => void logout(),
      },
    ]);
  };

  if (authLoading || (token && loading)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  if (!token) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.authHero}>
          <Text style={styles.authEyebrow}>PROFILE</Text>
          <Text style={styles.authTitle}>Sign in to edit your profile and manage notifications.</Text>
          <Text style={styles.authSubtitle}>
            This tab now includes full profile editing, video grid, and creator stats.
          </Text>
        </View>

        <View style={styles.authCard}>
          <Text style={styles.authCardTitle}>{isRegisterMode ? 'Create account' : 'Login'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#6f6f6f"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          {isRegisterMode ? (
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#6f6f6f"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6f6f6f"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmitAuth} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{isRegisterMode ? 'Create account' : 'Login'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsRegisterMode((current) => !current)}>
            <Text style={styles.switchText}>
              {isRegisterMode ? 'Already have an account? Login' : 'Need an account? Register'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF3B30" />}
    >
      <View style={styles.profileHeader}>
        <View style={styles.profileTopRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile?.username || user?.username || 'U').slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/profile/edit' as never)}>
              <Text style={styles.secondaryButtonText}>Edit profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bellButton} onPress={() => router.push('/notifications' as never)}>
              <Text style={styles.bellButtonText}>Bell</Text>
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.profileName}>@{profile?.username || user?.username}</Text>
        {profile?.bio ? <Text style={styles.profileBio}>{profile.bio}</Text> : null}
        {profile?.email ? <Text style={styles.profileEmail}>{profile.email}</Text> : null}

        <View style={styles.statRow}>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{formatNumber(profile?.followerCount)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{formatNumber(profile?.followingCount)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{formatNumber(profile?.videoCount)}</Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{formatNumber(profile?.totalLikes)}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>My videos</Text>
      <VideoGrid
        videos={videos}
        onVideoPress={(video) => router.push(`/video/${video.id}` as never)}
        emptyTitle="Your profile is ready"
        emptySubtitle="Post the first video to populate your profile grid."
      />

      {dashboard ? (
        <>
          <Text style={styles.sectionTitle}>Creator analytics</Text>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>{formatNumber(dashboard.totalViews)}</Text>
              <Text style={styles.analyticsLabel}>Views</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>{formatNumber(dashboard.totalLikes)}</Text>
              <Text style={styles.analyticsLabel}>Likes</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>{formatNumber(dashboard.totalComments)}</Text>
              <Text style={styles.analyticsLabel}>Comments</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>{dashboard.engagementRate.toFixed(1)}%</Text>
              <Text style={styles.analyticsLabel}>Engagement</Text>
            </View>
          </View>

          {dashboard.topVideos?.length ? (
            <>
              <Text style={styles.sectionTitle}>Top performing videos</Text>
              {dashboard.topVideos.slice(0, 5).map((item) => (
                <View key={item.videoId} style={styles.topVideoCard}>
                  <View>
                    <Text style={styles.topVideoTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.topVideoStats}>
                      {formatNumber(item.views)} views · {formatNumber(item.likes)} likes · {formatNumber(item.comments)} comments
                    </Text>
                  </View>
                  <Text style={styles.topVideoRate}>{item.engagementRate.toFixed(1)}%</Text>
                </View>
              ))}
            </>
          ) : null}
        </>
      ) : null}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#070707',
  },
  authHero: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#242424',
  },
  authEyebrow: {
    color: '#ff8f87',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  authTitle: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    marginTop: 12,
  },
  authSubtitle: {
    color: '#979797',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  authCard: {
    marginTop: 18,
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#242424',
  },
  authCardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  input: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    color: '#fff',
    fontSize: 15,
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  switchText: {
    color: '#9a9a9a',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600',
  },
  profileHeader: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#242424',
  },
  profileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 10,
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#303030',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  bellButton: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#303030',
  },
  bellButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -4,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  profileName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 18,
  },
  profileBio: {
    color: '#c6c6c6',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  profileEmail: {
    color: '#878787',
    fontSize: 13,
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  statPill: {
    minWidth: '48%',
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
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 28,
    marginBottom: 14,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsCard: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#242424',
  },
  analyticsValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  analyticsLabel: {
    color: '#999',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  topVideoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#242424',
    marginBottom: 12,
  },
  topVideoTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    maxWidth: 230,
  },
  topVideoStats: {
    color: '#9a9a9a',
    fontSize: 12,
    marginTop: 6,
  },
  topVideoRate: {
    color: '#ffb0a8',
    fontSize: 14,
    fontWeight: '800',
  },
  logoutButton: {
    marginTop: 28,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#242424',
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '800',
  },
});
