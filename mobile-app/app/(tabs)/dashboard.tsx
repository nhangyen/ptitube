import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import VideoGrid from '@/components/VideoGrid';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import type { DashboardData, ProfileData, VideoItem } from '@/services/api';
import * as api from '@/services/api';
import { User, LogIn, Mail, Lock, Settings, BarChart2, Grid, Edit3, LogOut, Shield } from 'lucide-react-native';

const formatNumber = (num: number = 0) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return `${num}`;
};

export default function ProfileScreen() {
  const { token, user, login, register, logout, refreshProfile, isLoading: authLoading } = useAuth();
  const { unreadCount, refreshUnreadCount } = useNotifications();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
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
      const [profileData, videoData, dashboardData] = await Promise.all([
        api.getMyProfile().catch(() => null),
        api.getMyVideos().catch(() => []),
        api.getCreatorDashboard().catch(() => null),
      ]);
      setProfile(profileData);
      setVideos(videoData);
      setDashboard(dashboardData);
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
      setLoading(false);
    }
  }, [token, loadProfileData]);

  useFocusEffect(
    useCallback(() => {
      if (token) {
        void loadProfileData();
        void refreshUnreadCount();
      }
    }, [token, loadProfileData, refreshUnreadCount])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void refreshProfile();
    void loadProfileData();
    void refreshUnreadCount();
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

  const handleOpenConnections = (type: 'followers' | 'following') => {
    const targetUserId = profile?.id || user?.id;
    if (!targetUserId) return;
    router.push(`/profile/${targetUserId}/${type}` as never);
  };

  if (authLoading || (token && loading)) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color="#ff8c95" />
      </View>
    );
  }

  if (!token) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-surface">
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 80, flexGrow: 1 }}>
          <View className="mb-12 items-center">
            <View className="w-20 h-20 rounded-full bg-surface-container-highest items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,140,149,0.3)]">
              <User size={32} color="#ff8c95" />
            </View>
            <Text className="text-3xl font-display font-bold text-white mb-2 text-center tracking-widest">
              Neon Identify
            </Text>
            <Text className="font-body text-gray-400 text-center px-4">
              Enter the cinematic universe. Access your profile and connect.
            </Text>
          </View>

          <View className="bg-surface-container-low p-6 rounded-3xl border border-surface-container-highest">
            <Text className="text-xl font-headline font-semibold text-white mb-6">
              {isRegisterMode ? 'Establish Identity' : 'Authenticate'}
            </Text>

            <View className="mb-4 bg-surface-container-highest flex-row items-center rounded-xl px-4 border border-outline-variant/30">
              <User size={18} color="#999" />
              <TextInput
                className="flex-1 text-white font-body py-4 px-3"
                placeholder="Username"
                placeholderTextColor="#666"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            {isRegisterMode && (
              <View className="mb-4 bg-surface-container-highest flex-row items-center rounded-xl px-4 border border-outline-variant/30">
                <Mail size={18} color="#999" />
                <TextInput
                  className="flex-1 text-white font-body py-4 px-3"
                  placeholder="Email"
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            )}

            <View className="mb-8 bg-surface-container-highest flex-row items-center rounded-xl px-4 border border-outline-variant/30">
              <Lock size={18} color="#999" />
              <TextInput
                className="flex-1 text-white font-body py-4 px-3"
                placeholder="Password"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              className="w-full bg-primary-dim py-4 rounded-xl items-center flex-row justify-center shadow-[0_4px_20px_rgba(232,0,72,0.4)]"
              onPress={handleSubmitAuth}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text className="font-display font-bold text-white tracking-widest uppercase mr-2">
                    {isRegisterMode ? 'Create Identity' : 'Access Node'}
                  </Text>
                  <LogIn size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              className="mt-6 items-center py-2"
              onPress={() => setIsRegisterMode(!isRegisterMode)}
            >
              <Text className="font-label text-sm text-secondary">
                {isRegisterMode ? 'Returning user? Authenticate' : 'New here? Establish identity'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-surface"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ff8c95" />}
      showsVerticalScrollIndicator={false}
    >
      <View className="pt-16 px-6 pb-6 border-b border-surface-container-high items-center">
        <View className="flex-row w-full justify-between items-start absolute top-16 px-6 z-10">
          <TouchableOpacity 
            className="w-10 h-10 rounded-full bg-surface-container-highest items-center justify-center border border-outline-variant/30"
            onPress={() => router.push('/profile/edit' as never)}
          >
            <Edit3 size={18} color="#ff8c95" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="w-10 h-10 rounded-full bg-surface-container-highest items-center justify-center border border-outline-variant/30"
            onPress={handleLogout}
          >
            <LogOut size={18} color="#666" />
          </TouchableOpacity>
        </View>

        <View className="w-24 h-24 rounded-full bg-surface-container-highest items-center justify-center mb-4 mt-8 shadow-[0_0_30px_rgba(255,140,149,0.3)] border border-primary/20">
          <Text className="text-4xl font-display font-bold text-primary">
            {(profile?.username || user?.username || 'U').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        
        <Text className="text-2xl font-display font-bold text-white mb-2">
          @{profile?.username || user?.username}
        </Text>
        
        {user?.role && (user.role === 'admin' || user.role === 'moderator') && (
          <View className="flex-row items-center bg-primary-dim/20 px-3 py-1 rounded-full mb-6">
            <Shield size={12} color="#ff8c95" className="mr-1" />
            <Text className="text-xs font-label text-primary">{user.role.toUpperCase()}</Text>
          </View>
        )}

        <View className="flex-row w-full justify-between px-6 mt-4">
          <TouchableOpacity className="items-center" onPress={() => handleOpenConnections('followers')}>
            <Text className="text-xl font-headline font-bold text-white">{formatNumber(profile?.followerCount)}</Text>
            <Text className="text-xs font-label text-gray-500 uppercase tracking-widest mt-1">Followers</Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="items-center" onPress={() => handleOpenConnections('following')}>
            <Text className="text-xl font-headline font-bold text-white">{formatNumber(profile?.followingCount)}</Text>
            <Text className="text-xs font-label text-gray-500 uppercase tracking-widest mt-1">Following</Text>
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-xl font-headline font-bold text-tertiary">{formatNumber(dashboard?.totalLikes)}</Text>
            <Text className="text-xs font-label text-gray-500 uppercase tracking-widest mt-1">Likes</Text>
          </View>
        </View>
      </View>

      {dashboard && (
        <View className="p-6 border-b border-surface-container-high">
          <View className="flex-row items-center mb-4">
            <BarChart2 size={20} color="#29fcf3" className="mr-2" />
            <Text className="text-lg font-headline font-bold text-white tracking-wider">CREATOR INSIGHTS</Text>
          </View>
          
          <View className="flex-row gap-4 mb-4">
            <View className="flex-1 bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest">
              <Text className="text-xs font-label text-gray-400 mb-1 uppercase tracking-widest">Views</Text>
              <Text className="text-2xl font-display font-bold text-white">{formatNumber(dashboard.totalViews)}</Text>
            </View>
            <View className="flex-1 bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest">
              <Text className="text-xs font-label text-gray-400 mb-1 uppercase tracking-widest">Watch Time</Text>
              <Text className="text-2xl font-display font-bold text-secondary">
                {Math.round(dashboard.totalViews * 2.5 / 60)}<Text className="text-sm">m</Text>
              </Text>
            </View>
          </View>
        </View>
      )}

      <View className="p-6 pb-24">
        <View className="flex-row items-center mb-6 pl-2 border-l-2 border-primary">
          <Grid size={20} color="#ff8c95" className="mr-2" />
          <Text className="text-lg font-headline font-bold text-white tracking-wider uppercase">Your Sequences</Text>
        </View>

        {videos.length > 0 ? (
          <VideoGrid 
            videos={videos} 
            onVideoPress={(video) => router.push(`/video/${video.id}`)} 
          />
        ) : (
          <View className="items-center justify-center py-12 bg-surface-container-low rounded-3xl border border-surface-container-highest border-dashed">
            <View className="w-16 h-16 rounded-full bg-surface-container-highest items-center justify-center mb-4">
              <Grid size={24} color="#666" />
            </View>
            <Text className="text-white font-headline text-lg mb-2">No sequences found</Text>
            <Text className="text-gray-500 font-body text-center px-8 text-sm">
              Tap the creation node to start capturing visuals.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
