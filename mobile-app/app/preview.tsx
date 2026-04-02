import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ResizeMode, Video } from 'expo-av';
import * as api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { cleanupLocalFiles, cleanupTmpFiles } from '@/services/ffmpegService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ videoUri: string; sourceVideoUri?: string }>();
  const videoUri = params.videoUri || '';
  const sourceVideoUri = params.sourceVideoUri || '';
  const { token } = useAuth();

  const videoRef = useRef<Video>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const currentVideo = videoRef.current;
    return () => {
      if (currentVideo) {
        void currentVideo.unloadAsync().catch(() => undefined);
      }
    };
  }, []);

  const handleUpload = useCallback(async () => {
    if (!token) {
      Alert.alert('Yeu cau dang nhap', 'Ban can dang nhap de dang video.');
      return;
    }

    if (!videoUri) {
      Alert.alert('Loi', 'Khong tim thay video de dang.');
      return;
    }

    const file = {
      uri: videoUri,
      name: `video_${Date.now()}.mp4`,
      type: 'video/mp4',
    };

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await api.uploadVideo(file, title.trim() || 'Video cua toi', description.trim(), (progress) => {
        setUploadProgress(progress);
      });

      await cleanupLocalFiles([videoUri, sourceVideoUri]);
      await cleanupTmpFiles();

      Alert.alert('Thanh cong', 'Video da duoc dang tai thanh cong.', [
        {
          text: 'Ve trang chu',
          onPress: () => router.dismissAll(),
        },
      ]);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        'Loi dang tai',
        error?.response?.data?.message || error?.message || 'Khong the dang video. Vui long thu lai.'
      );
    } finally {
      setIsUploading(false);
    }
  }, [description, router, sourceVideoUri, title, token, videoUri]);

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
          <Text style={styles.errorText}>Khong tim thay video.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.errorLink}>Quay lai</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {isUploading ? (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadModal}>
            <ActivityIndicator size="large" color="#34C759" />
            <Text style={styles.uploadTitle}>Dang dang video...</Text>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{uploadProgress}%</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>Sua tiep</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xem truoc</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.videoContainer} onPress={togglePlay} activeOpacity={0.9}>
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
          />
          {!isPlaying ? (
            <View style={styles.playOverlay}>
              <View style={styles.playBtn}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </View>
          ) : null}
        </TouchableOpacity>

        <View style={styles.form}>
          <Text style={styles.formLabel}>Tieu de</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhap tieu de video..."
            placeholderTextColor="#666"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Text style={styles.formLabel}>Mo ta</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Nhap mo ta (khong bat buoc)..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
            maxLength={500}
          />

          <TouchableOpacity
            style={[styles.uploadBtn, isUploading && styles.uploadBtnDisabled]}
            onPress={handleUpload}
            disabled={isUploading}
            activeOpacity={0.8}
          >
            <Text style={styles.uploadBtnText}>{isUploading ? 'Dang dang...' : 'Dang video'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>Quay lai chinh sua</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
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
  backBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backBtnText: {
    color: '#888',
    fontSize: 14,
  },
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
