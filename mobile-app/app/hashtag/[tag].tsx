import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import ScreenHeader from "@/components/ScreenHeader";
import VideoGrid from "@/components/VideoGrid";
import type { HashtagDetail } from "@/services/api";
import * as api from "@/services/api";
import { Hash } from "lucide-react-native";

export default function HashtagScreen() {
  const params = useLocalSearchParams<{ tag: string }>();
  const [detail, setDetail] = useState<HashtagDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tag = params.tag || "";

  const loadDetail = useCallback(async () => {
    try {
      const response = await api.getHashtagDetail(tag, 0, 24);
      setDetail(response);
    } catch (error) {
      console.error("Error loading hashtag detail:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tag]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadDetail();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color="#ff8c95" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff8c95" />}
    >
      <ScreenHeader
        title={detail?.hashtag.displayName || `#${tag}`}
        subtitle="Network link sequence"
        onBack={() => router.back()}
        
      />

      <View className="px-6 py-6">
        <View className="bg-surface-container-low rounded-[32px] p-8 items-center justify-center mb-10 shadow-2xl relative border border-outline-variant/15">
          <View className="w-20 h-20 rounded-full bg-surface-container-highest border border-secondary/20 items-center justify-center mb-6 shadow-[0_0_40px_rgba(41,252,243,0.3)]">
            <Hash size={40} color="#29fcf3" />
          </View>
          <Text className="text-secondary font-display text-5xl font-bold mb-2">
            {detail?.hashtag.videoCount || 0}
          </Text>
          <Text className="text-gray-400 font-label tracking-widest text-sm uppercase">Total Logs Indexed</Text>
        </View>

        <Text className="text-primary font-headline text-xl mb-4 ml-1">Grid Activity</Text>
        <View className="bg-surface border-t border-surface-container-highest min-h-[400px] pt-4">
          <VideoGrid
            videos={detail?.videos || []}
            onVideoPress={(video) => router.push(`/video/${video.id}` as never)}
            emptyTitle="Signal Lost"
            emptySubtitle="No video records attached to this node."
          />
        </View>
      </View>
    </ScrollView>
  );
}