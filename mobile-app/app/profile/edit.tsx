import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/services/api';

export default function EditProfileScreen() {
  const { refreshProfile, updateLocalUser } = useAuth();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api
      .getMyProfile()
      .then((profile) => {
        setUsername(profile.username || '');
        setBio(profile.bio || '');
        setAvatarUrl(profile.avatarUrl || '');
      })
      .catch((error) => console.error('Error loading editable profile:', error))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Missing username', 'Username cannot be empty.');
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
    } catch (error: any) {
      Alert.alert('Unable to save profile', error.response?.data?.error || 'Please try again.');
    } finally {
      setSaving(false);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Edit profile"
        subtitle="Update the public fields used by profile, discover, and notifications."
        onBack={() => router.back()}
      />

      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor="#6f6f6f"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Short profile bio"
          placeholderTextColor="#6f6f6f"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Avatar URL</Text>
        <TextInput
          style={styles.input}
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="https://..."
          placeholderTextColor="#6f6f6f"
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save changes</Text>}
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#070707',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginTop: 18,
    borderRadius: 26,
    padding: 20,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#242424',
  },
  label: {
    color: '#f3f3f3',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
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
    marginBottom: 16,
  },
  textArea: {
    minHeight: 110,
  },
  saveButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
