import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as api from '@/services/api';

const { width } = Dimensions.get('window');

interface DashboardData {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalVideos: number;
  followerCount: number;
  engagementRate: number;
  topVideos: Array<{
    videoId: string;
    title: string;
    views: number;
    likes: number;
    comments: number;
    engagementRate: number;
  }>;
}

interface ProfileData {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  followerCount: number;
  followingCount: number;
  videoCount: number;
  totalLikes: number;
}

export default function DashboardScreen() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, profileData] = await Promise.all([
        api.getCreatorDashboard(),
        api.getMyProfile(),
      ]);
      setDashboard(dashboardData);
      setProfile(profileData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Please login to view dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      {profile && (
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.username[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          
          <View style={styles.profileStats}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{formatNumber(profile.followerCount)}</Text>
              <Text style={styles.profileStatLabel}>Followers</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{formatNumber(profile.followingCount)}</Text>
              <Text style={styles.profileStatLabel}>Following</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{profile.videoCount}</Text>
              <Text style={styles.profileStatLabel}>Videos</Text>
            </View>
          </View>
        </View>
      )}

      {/* Stats Grid */}
      {dashboard && (
        <>
          <Text style={styles.sectionTitle}>Analytics Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>👁️</Text>
              <Text style={styles.statValue}>{formatNumber(dashboard.totalViews)}</Text>
              <Text style={styles.statLabel}>Total Views</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>❤️</Text>
              <Text style={styles.statValue}>{formatNumber(dashboard.totalLikes)}</Text>
              <Text style={styles.statLabel}>Total Likes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>💬</Text>
              <Text style={styles.statValue}>{formatNumber(dashboard.totalComments)}</Text>
              <Text style={styles.statLabel}>Comments</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>↗️</Text>
              <Text style={styles.statValue}>{formatNumber(dashboard.totalShares)}</Text>
              <Text style={styles.statLabel}>Shares</Text>
            </View>
          </View>

          {/* Engagement Rate */}
          <View style={styles.engagementCard}>
            <Text style={styles.engagementTitle}>Engagement Rate</Text>
            <View style={styles.engagementRow}>
              <Text style={styles.engagementValue}>
                {dashboard.engagementRate.toFixed(2)}%
              </Text>
              <Text style={styles.engagementFormula}>
                (Likes + Comments) / Views × 100
              </Text>
            </View>
            <View style={styles.engagementBar}>
              <View 
                style={[
                  styles.engagementProgress, 
                  { width: `${Math.min(dashboard.engagementRate, 100)}%` }
                ]} 
              />
            </View>
            <Text style={styles.engagementHint}>
              {dashboard.engagementRate >= 5 
                ? '🔥 Great engagement!' 
                : dashboard.engagementRate >= 2 
                  ? '👍 Good engagement' 
                  : '💡 Try to increase engagement'}
            </Text>
          </View>

          {/* Top Videos */}
          {dashboard.topVideos && dashboard.topVideos.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Top Performing Videos</Text>
              {dashboard.topVideos.slice(0, 5).map((video, index) => (
                <View key={video.videoId} style={styles.videoItem}>
                  <Text style={styles.videoRank}>#{index + 1}</Text>
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle} numberOfLines={1}>{video.title}</Text>
                    <View style={styles.videoStats}>
                      <Text style={styles.videoStat}>👁️ {formatNumber(video.views)}</Text>
                      <Text style={styles.videoStat}>❤️ {formatNumber(video.likes)}</Text>
                      <Text style={styles.videoStat}>💬 {formatNumber(video.comments)}</Text>
                    </View>
                  </View>
                  <View style={styles.videoEngagement}>
                    <Text style={styles.engagementBadge}>
                      {video.engagementRate.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  username: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  bio: {
    color: '#888',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  profileStats: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 30,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileStatLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 50) / 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  engagementCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  engagementTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  engagementValue: {
    color: '#34C759',
    fontSize: 36,
    fontWeight: 'bold',
  },
  engagementFormula: {
    color: '#666',
    fontSize: 10,
  },
  engagementBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginTop: 15,
    overflow: 'hidden',
  },
  engagementProgress: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  engagementHint: {
    color: '#888',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  videoRank: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
    width: 30,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  videoStats: {
    flexDirection: 'row',
    gap: 12,
  },
  videoStat: {
    color: '#888',
    fontSize: 12,
  },
  videoEngagement: {
    marginLeft: 10,
  },
  engagementBadge: {
    backgroundColor: '#333',
    color: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
  },
});
