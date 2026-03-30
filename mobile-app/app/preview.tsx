/**
 * Preview Screen — Xem trước video đã xuất & Đăng tải
 *
 * Phát video đã export full-screen.
 * Form nhập title, description.
 * Nút "Đăng video" → upload lên server.
 * Nút "Quay lại editor" để chỉnh sửa tiếp.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import * as api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { cleanupTmpFiles } from '@/services/ffmpegService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ videoUri: string }>();
  const videoUri = params.videoUri || '';
  const { token } = useAuth();

  const videoRef = useRef<Video>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const handleUpload = useCallback(async () => {
    if (!token) {
      Alert.alert('Yêu cầu đăng nhập', 'Bạn cần đăng nhập để đăng video.');
      return;
    }

    if (!videoUri) {
      Alert.alert('Lỗi', 'Không tìm thấy video để đăng.');
      return;
    }

    const videoTitle = title.trim() || 'Video của tôi';
    const videoDesc = description.trim() || '';

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const file = {
        uri: videoUri,
        name: `video_${Date.now()}.mp4`,
        type: 'video/mp4',
      };

      await api.uploadVideo(file, videoTitle, videoDesc, (progress) => {
        setUploadProgress(progress);
      });

      // Dọn file tạm FFmpeg
      await cleanupTmpFiles();

      Alert.alert('Thành công! 🎉', 'Video đã được đăng tải thành công.', [
        {
          text: 'Về trang chủ',
          onPress: () => {
            // Navigate back to feed
            router.dismissAll();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        'Lỗi đăng tải',
        error.response?.data?.message || 'Không thể đăng video. Vui lòng thử lại.'
      );
    } finally {
      setIsUploading(false);
    }
  }, [videoUri, title, description, token, router]);

  const handleBack = () => {
    router.back();
  };

  const togglePlay = async () => {
    if (isPlaying) {
      await videoRef.current?.pauseAsync();
      setIsPlaying(false);
    } else {
      await videoRef.current?.playAsync();
      setIsPlaying(true);
    }
  };

  if (!videoUri) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Không tìm thấy video.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.errorLink}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Upload Overlay */}
      {isUploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadModal}>
            <ActivityIndicator size="large" color="#34C759" />
            <Text style={styles.uploadTitle}>Đang đăng video...</Text>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{uploadProgress}%</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>← Sửa tiếp</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xem trước</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Video Preview */}
        <TouchableOpacity
          style={styles.videoContainer}
          onPress={togglePlay}
          activeOpacity={0.9}
        >
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={true}
            isLooping={true}
          />
          {!isPlaying && (
            <View style={styles.playOverlay}>
              <View style={styles.playBtn}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formLabel}>Tiêu đề</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập tiêu đề video..."
            placeholderTextColor="#666"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Text style={styles.formLabel}>Mô tả</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Nhập mô tả (không bắt buộc)..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
            maxLength={500}
          />

          {/* Upload button */}
          <TouchableOpacity
            style={[styles.uploadBtn, isUploading && styles.uploadBtnDisabled]}
            onPress={handleUpload}
            disabled={isUploading}
            activeOpacity={0.8}
          >
            <Text style={styles.uploadBtnText}>
              {isUploading ? 'Đang đăng...' : '📤 Đăng video'}
            </Text>
          </TouchableOpacity>

          {/* Back to editor */}
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>← Quay lại chỉnh sửa</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ccc',
    fontSize: 16,
  },
  errorLink: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 12,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  headerBtnText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 80,
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Video
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.45,
    backgroundColor: '#111',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: '#fff',
    fontSize: 24,
    marginLeft: 4,
  },
  // Form
  form: {
    padding: 20,
    gap: 12,
  },
  formLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Upload button
  uploadBtn: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  uploadBtnDisabled: {
    opacity: 0.5,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  // Back button
  backBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backBtnText: {
    color: '#888',
    fontSize: 14,
  },
  // Upload overlay
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 30,
    width: SCREEN_WIDTH * 0.8,
    alignItems: 'center',
  },
  uploadTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 3,
  },
  progressText: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
});
