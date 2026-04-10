import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import ScreenHeader from "@/components/ScreenHeader";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/services/api";
import { Save, User } from "lucide-react-native";

export default function EditProfileScreen() {
  const { refreshProfile, updateLocalUser } = useAuth();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api
      .getMyProfile()
      .then((profile) => {
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatarUrl || "");
      })
      .catch((error) => console.error("Error loading editable profile:", error))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert("System failure", "Handle required for identification.");
      return;
    }

    try {
      setSaving(true);
      const updated = await api.updateMyProfile({
        username: username.trim(),
        bio,
        avatarUrl,
      });
      await updateLocalUser({
        username: updated.username,
        avatarUrl: updated.avatarUrl,
        bio: updated.bio,
        email: updated.email,
      });
      await refreshProfile();
      router.back();
    } catch (error) {
      Alert.alert("System failure", "Connection lost.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color="#ff8c95" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface">
      <ScreenHeader
        title="Configure Identity"
        subtitle="Update public holographic network profile"
        onBack={() => router.back()}
        
      />

      <View className="px-6 py-6 pb-24">
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-surface-container-highest items-center justify-center shadow-[0_0_30px_rgba(255,140,149,0.3)] border border-primary/20 mb-4">
            <User size={40} color="#ff8c95" />
          </View>
          <Text className="text-gray-400 font-label text-sm tracking-widest uppercase">
            Aesthetic Matrix
          </Text>
        </View>

        <View className="bg-surface-container-low rounded-3xl p-6 shadow-2xl relative border border-outline-variant/15">
          <Text className="text-secondary font-label text-sm uppercase tracking-widest mb-3 ml-2">
            Network Handle
          </Text>
          <TextInput
            className="bg-surface-container-highest rounded-2xl text-white font-body text-base px-5 py-4 mb-6 border border-outline-variant/15"
            value={username}
            onChangeText={setUsername}
            placeholder="Ghost in the shell"
            placeholderTextColor="#888"
            autoCapitalize="none"
          />

          <Text className="text-secondary font-label text-sm uppercase tracking-widest mb-3 ml-2">
            Bio-Metric Summary
          </Text>
          <TextInput
            className="bg-surface-container-highest rounded-2xl text-white font-body text-base px-5 py-4 mb-6 border border-outline-variant/15 min-h-[120px]"
            value={bio}
            onChangeText={setBio}
            placeholder="Link data stream..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text className="text-secondary font-label text-sm uppercase tracking-widest mb-3 ml-2">
            Visual Payload (URL)
          </Text>
          <TextInput
            className="bg-surface-container-highest rounded-2xl text-white font-body text-base px-5 py-4 mb-8 border border-outline-variant/15"
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder="https://..."
            placeholderTextColor="#888"
            autoCapitalize="none"
          />

          <TouchableOpacity 
            className="bg-primary-dim rounded-full py-4 flex-row items-center justify-center relative shadow-[0_4px_20px_rgba(232,0,72,0.4)]"
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save size={18} color="#fff" className="mr-2" />
                <Text className="text-white font-label font-bold text-sm tracking-widest uppercase">
                  Inject Identity
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}