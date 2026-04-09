import { SafeAreaView } from 'react-native-safe-area-context';
/**
 * Create Screen — Chọn nguồn video
 *
 * Fullscreen modal cho phép:
 * - Quay video mới (navigate to /camera)
 * - Chọn video từ thư viện (expo-image-picker → navigate to /editor)
 */

import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';

export default function CreateScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const handleClose = () => {
    router.back();
  };

  const handleOpenCamera = () => {
    if (!token) {
      Alert.alert('Yêu cầu đăng nhập', 'Bạn cần đăng nhập để tạo video.', [
        { text: 'Đóng' },
      ]);
      return;
    }
    router.push('/camera' as any);
  };

  const handlePickFromLibrary = useCallback(async () => {
    if (!token) {
      Alert.alert('Yêu cầu đăng nhập', 'Bạn cần đăng nhập để tạo video.', [
        { text: 'Đóng' },
      ]);
      return;
    }

    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền truy cập thư viện ảnh.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
      videoMaxDuration: 300, // 5 phút max
    });

    if (!result.canceled && result.assets.length > 0) {
      const video = result.assets[0];
      router.push({
        pathname: '/editor' as any,
        params: { videoUri: video.uri },
      });
    }
  }, [token, router]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo video mới</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Nội dung */}
      <View style={styles.content}>
        <Text style={styles.subtitle}>Chọn cách bạn muốn bắt đầu</Text>

        {/* Nút Quay Video */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={handleOpenCamera}
          activeOpacity={0.8}
        >
          <View style={[styles.optionIcon, { backgroundColor: '#FF3B30' }]}>
            <Text style={styles.optionIconText}>🎥</Text>
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Quay video</Text>
            <Text style={styles.optionDesc}>
              Sử dụng camera để quay video mới.{'\n'}
              Giữ nút quay → thả để tạm dừng → giữ tiếp để nối clip.
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* Nút Chọn từ thư viện */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={handlePickFromLibrary}
          activeOpacity={0.8}
        >
          <View style={[styles.optionIcon, { backgroundColor: '#007AFF' }]}>
            <Text style={styles.optionIconText}>📁</Text>
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Chọn từ thư viện</Text>
            <Text style={styles.optionDesc}>
              Chọn video có sẵn trong thiết bị để chỉnh sửa và đăng tải.
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* Thông tin */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Sau khi có video, bạn sẽ được chuyển đến trình chỉnh sửa với các công cụ:
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>✂️ Cắt xén thời lượng</Text>
            <Text style={styles.featureItem}>🎵 Ghép nhạc nền</Text>
            <Text style={styles.featureItem}>⚡ Điều chỉnh tốc độ</Text>
            <Text style={styles.featureItem}>✏️ Chèn chữ</Text>
            <Text style={styles.featureItem}>🎨 Bộ lọc màu</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  subtitle: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 30,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionIconText: {
    fontSize: 24,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDesc: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },
  arrow: {
    color: '#555',
    fontSize: 24,
    fontWeight: '300',
    marginLeft: 8,
  },
  infoSection: {
    marginTop: 30,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
  },
  infoText: {
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    color: '#ccc',
    fontSize: 14,
  },
});
