import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import ScreenHeader from "@/components/ScreenHeader";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/services/api";
import { Save, User, Camera, Image as ImageIcon } from "lucide-react-native";

export default function EditProfileScreen() {
  const { refreshProfile, updateLocalUser } = useAuth();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert("System failure", "Handle required for identification.");
      return;
    }

    try {
      setSaving(true);
      let newAvatarUrl = avatarUrl;

      // Attempt image upload first if an image is selected
      if (selectedImage) {
        try {
          const profileWithAvatar = await api.uploadAvatar(selectedImage);
          newAvatarUrl = profileWithAvatar.avatarUrl || newAvatarUrl;
        } catch (uploadError) {
          Alert.alert("Upload Failed", "Could not upload the selected image. Please try again.");
          setSaving(false);
          return;
        }
      }

      const updated = await api.updateMyProfile({
        username: username.trim(),
        bio,
        avatarUrl: newAvatarUrl,
      });

      await updateLocalUser({
        username: updated.username,
        avatarUrl: updated.avatarUrl,
        bio: updated.bio,
        email: updated.email,
      });
      await refreshProfile();
      router.back();
    } catch (error: any) {
      console.error("Save profile error details:", error?.response?.data || error.message);
      Alert.alert("System failure", `Profile update failed: ${error.message}`);
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
          <TouchableOpacity
            onPress={pickImage}
            className="w-24 h-24 rounded-full bg-surface-container-highest items-center justify-center shadow-[0_0_30px_rgba(255,140,149,0.3)] border border-primary/20 mb-4 overflow-hidden relative"
          >
            {selectedImage ? (
              <Image source={{ uri: selectedImage.uri }} className="w-full h-full" />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl.startsWith('http') ? avatarUrl : `${api.API_ORIGIN}/api/${avatarUrl}` }} className="w-full h-full" />
            ) : (
              <User size={40} color="#ff8c95" />
            )}
            <View className="absolute bottom-0 w-full bg-black/50 py-1 items-center justify-center">
              <Camera size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text className="text-gray-400 font-label text-sm tracking-widest uppercase">
            Edit your profile
          </Text>
        </View>

        <View className="bg-surface-container-low rounded-3xl p-6 shadow-2xl relative border border-outline-variant/15">
          <Text className="text-secondary font-label text-sm uppercase tracking-widest mb-3 ml-2">
            Username
          </Text>
          <TextInput
            className="bg-surface-container-highest rounded-2xl text-white font-body text-base px-5 py-4 mb-6 border border-outline-variant/15"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            placeholderTextColor="#888"
            autoCapitalize="none"
          />

          <Text className="text-secondary font-label text-sm uppercase tracking-widest mb-3 ml-2">
            Bio description
          </Text>
          <TextInput
            className="bg-surface-container-highest rounded-2xl text-white font-body text-base px-5 py-4 mb-6 border border-outline-variant/15 min-h-[120px]"
            value={bio}
            onChangeText={setBio}
            placeholder="Describe yourself..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text className="text-secondary font-label text-sm uppercase tracking-widest mb-3 ml-2">
            Profile visual
          </Text>
          <TouchableOpacity
            onPress={pickImage}
            className="bg-surface-container-highest rounded-2xl px-5 py-4 mb-8 border border-outline-variant/15 flex-row items-center justify-center"
          >
            <ImageIcon size={18} color="#888" className="mr-2" />
            <Text className="text-white font-body text-base">
              {selectedImage ? "Image selected" : "Choose from device"}
            </Text>
          </TouchableOpacity>

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
                  Save
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}