import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import ScreenHeader from "@/components/ScreenHeader";
import VideoGrid from "@/components/VideoGrid";
import { useAuth } from "@/contexts/AuthContext";
import type { ProfileData, VideoItem } from "@/services/api";
import * as api from "@/services/api";
import { User, Activity, Shield, Settings, Disc3, AlertTriangle } from "lucide-react-native";

const formatNumber = (num: number = 0) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return `${num}`;
};

export default function ProfileDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"videos" | "liked">("videos");

  const isCurrentUser = currentUser?.id.toString() === userId;

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.getUserProfile(userId);
      setProfile(data);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      Alert.alert("System Failure", "Cannot sync profile data");
    }
  }, [userId]);

  const fetchVideos = useCallback(async () => {
    try {
      const response = await api.getUserVideos(userId);
      setVideos(response || []);
    } catch (error) {
      console.error("Failed to sync sequences:", error);
    }
  }, [userId]);

  const loadData = useCallback(async () => {
    await Promise.all([fetchProfile(), fetchVideos()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchProfile, fetchVideos]);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      loadData();
    }
  }, [userId, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleFollowToggle = async () => {
    if (!profile || followLoading) return;
    try {
      setFollowLoading(true);
      await api.toggleFollow(userId);
      await fetchProfile();
    } catch (error) {
      console.error("Action denied:", error);
      Alert.alert("System Failure", "Action denied");
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color="#ff8c95" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 bg-surface items-center justify-center p-6">
        <AlertTriangle size={64} color="#e80048" className="mb-6 opacity-80" />
        <Text className="text-3xl font-display font-bold text-primary mb-2">User Lost</Text>
        <Text className="text-base font-body text-gray-400 text-center">
          The requested profile could not be found in the network.
        </Text>
      </View>
    );
  }

  const p = profile as any;

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title={profile.username}  />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff8c95" />}
        className="flex-1"
      >
        <View className="pt-24 px-6 pb-8 items-center bg-surface-container-low shadow-xl">
          <View className="w-24 h-24 rounded-full bg-surface-container-highest items-center justify-center mb-4 shadow-[0_0_30px_rgba(255,140,149,0.3)]">
            <User size={40} color="#ff8c95" />
          </View>
          
          <Text className="text-3xl font-display font-bold text-white mb-2">@{profile.username}</Text>
          
          <View className="flex-row items-center gap-x-3 mb-8 bg-surface-container-high px-5 py-2 rounded-2xl">
            {p.role === "admin" || p.role === "moderator" ? (
              <View className="flex-row items-center bg-primary-dim/20 px-3 py-1 rounded-full">
                <Shield size={12} color="#ff8c95" className="mr-1" />
                <Text className="text-xs font-label text-primary">{p.role.toUpperCase()}</Text>
              </View>
            ) : null}
            <View className="flex-row items-center bg-secondary/10 px-3 py-1 rounded-full">
              <Activity size={12} color="#29fcf3" className="mr-1" />
              <Text className="text-[10px] font-label text-secondary uppercase tracking-widest">Active</Text>
            </View>
          </View>

          <View className="flex-row w-full justify-between px-6 mb-8">
            <TouchableOpacity className="items-center" onPress={() => router.push(`/profile/${userId}/followers`)}>
              <Text className="text-2xl font-headline font-bold text-white">{formatNumber(profile.followerCount)}</Text>
              <Text className="text-xs font-label text-gray-500 uppercase tracking-widest mt-1">Followers</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="items-center" onPress={() => router.push(`/profile/${userId}/following`)}>
              <Text className="text-2xl font-headline font-bold text-white">{formatNumber(profile.followingCount)}</Text>
              <Text className="text-xs font-label text-gray-500 uppercase tracking-widest mt-1">Following</Text>
            </TouchableOpacity>

            <View className="items-center">
              <Text className="text-2xl font-headline font-bold text-tertiary">{formatNumber(profile.totalLikes)}</Text>
              <Text className="text-xs font-label text-gray-500 uppercase tracking-widest mt-1">Likes</Text>
            </View>
          </View>

          {!isCurrentUser && (
            <TouchableOpacity
              onPress={handleFollowToggle}
              disabled={followLoading}
              activeOpacity={0.8}
              className={`w-full py-4 rounded-full flex-row items-center justify-center ${
                p.followedByCurrentUser ? "bg-surface-container-highest" : "bg-primary-dim shadow-[0_4px_20px_rgba(232,0,72,0.4)]"
              }`}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={p.followedByCurrentUser ? "#ff8c95" : "#fff"} />
              ) : (
                <>
                  <User size={18} color={p.followedByCurrentUser ? "#ff8c95" : "#fff"} className="mr-2" />
                  <Text className={`font-label font-bold text-sm tracking-widest uppercase ${
                    p.followedByCurrentUser ? "text-primary" : "text-white"
                  }`}>
                    {p.followedByCurrentUser ? "Unlink" : "Connect"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isCurrentUser && (
            <TouchableOpacity
              onPress={() => router.push("/profile/edit")}
              className="w-full py-4 rounded-full bg-surface border border-outline-variant/15 flex-row items-center justify-center"
            >
              <Settings size={18} color="#ff8c95" className="mr-2" />
              <Text className="font-label font-bold text-sm text-primary tracking-widest uppercase">
                Configure Identity
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="pt-6">
          <View className="flex-row px-4 mb-4 gap-2">
            <TouchableOpacity
              onPress={() => setActiveTab("videos")}
              className={`flex-1 py-4 items-center rounded-2xl ${
                activeTab === "videos" ? "bg-surface-container-high" : "bg-transparent"
              }`}
            >
              <View className="flex-row items-center">
                <Disc3 size={16} color={activeTab === "videos" ? "#29fcf3" : "#666"} className="mr-2" />
                <Text className={`font-label tracking-widest uppercase text-xs ${
                  activeTab === "videos" ? "text-secondary font-bold" : "text-gray-500"
                }`}>Sequences</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setActiveTab("liked")}
              className={`flex-1 py-4 items-center rounded-2xl ${
                activeTab === "liked" ? "bg-surface-container-high" : "bg-transparent"
              }`}
            >
              <View className="flex-row items-center">
                <Activity size={16} color={activeTab === "liked" ? "#ff8c95" : "#666"} className="mr-2" />
                <Text className={`font-label tracking-widest uppercase text-xs ${
                  activeTab === "liked" ? "text-primary font-bold" : "text-gray-500"
                }`}>Liked Nodes</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View className="min-h-[400px]">
            {activeTab === "videos" ? (
              <VideoGrid 
                videos={videos} 
                onVideoPress={(video) => router.push(`/video/${video.id}` as never)} 
                emptyTitle="No Output"
                emptySubtitle="User has not broadcasted sequences yet."
              />
            ) : (
              <View className="flex-1 items-center justify-center pt-20">
                <Text className="font-headline text-lg text-gray-500 mb-2">Restricted Payload</Text>
                <Text className="font-body text-sm text-gray-600">Liked sequences are private.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}