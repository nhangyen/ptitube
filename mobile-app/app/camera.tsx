/**
 * Camera Screen — Quay video multi-segment
 *
 * Sử dụng react-native-vision-camera.
 * - Giữ nút quay để bắt đầu → thả để tạm dừng → giữ tiếp để nối clip mới.
 * - Thanh progress hiển thị tổng thời lượng các segment.
 * - Nút lật camera (front/back).
 * - Nút xóa clip cuối (undo).
 * - Nút "Tiếp" → ghép segments → navigate to /editor.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
  VideoFile,
} from 'react-native-vision-camera';
import { concatSegments } from '@/services/ffmpegService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_DURATION = 60; // Tối đa 60 giây

interface Segment {
  uri: string;
  duration: number; // giây
}

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<Camera>(null);

  // Permissions
  const { hasPermission: hasCamPerm, requestPermission: requestCam } = useCameraPermission();
  const { hasPermission: hasMicPerm, requestPermission: requestMic } = useMicrophonePermission();

  // Camera state
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');
  const device = useCameraDevice(cameraPosition);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentSegmentStart, setCurrentSegmentStart] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Timer để đếm thời gian đang quay
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0) + recordingElapsed;
  const progressPercent = Math.min(100, (totalDuration / MAX_DURATION) * 100);

  // Request permissions
  useEffect(() => {
    (async () => {
      if (!hasCamPerm) await requestCam();
      if (!hasMicPerm) await requestMic();
    })();
  }, []);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;
    if (totalDuration >= MAX_DURATION) {
      Alert.alert('Đã đạt giới hạn', `Tổng thời lượng tối đa là ${MAX_DURATION} giây.`);
      return;
    }

    setIsRecording(true);
    setCurrentSegmentStart(Date.now());
    setRecordingElapsed(0);

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setRecordingElapsed((prev) => {
        const newVal = prev + 0.1;
        const newTotal = segments.reduce((sum, s) => sum + s.duration, 0) + newVal;
        if (newTotal >= MAX_DURATION) {
          // Auto stop when reaching limit
          stopRecording();
        }
        return newVal;
      });
    }, 100);

    cameraRef.current.startRecording({
      onRecordingFinished: (video: VideoFile) => {
        const duration = recordingElapsed || ((Date.now() - (currentSegmentStart || Date.now())) / 1000);
        setSegments((prev) => [
          ...prev,
          { uri: `file://${video.path}`, duration: Math.max(0.5, duration) },
        ]);
        setIsRecording(false);
        setRecordingElapsed(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      },
      onRecordingError: (error) => {
        console.error('Recording error:', error);
        setIsRecording(false);
        setRecordingElapsed(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      },
    });
  }, [isRecording, totalDuration, segments, currentSegmentStart]);

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecording) return;
    try {
      await cameraRef.current.stopRecording();
    } catch {}
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isRecording]);

  const handleFlipCamera = () => {
    setCameraPosition((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const handleDeleteLastSegment = () => {
    if (segments.length === 0) return;
    Alert.alert('Xóa clip cuối?', 'Bạn có chắc muốn xóa đoạn vừa quay?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => setSegments((prev) => prev.slice(0, -1)),
      },
    ]);
  };

  const handleNext = useCallback(async () => {
    if (segments.length === 0) {
      Alert.alert('Chưa có video', 'Hãy quay ít nhất một đoạn video.');
      return;
    }

    setIsProcessing(true);
    try {
      let videoUri: string;
      if (segments.length === 1) {
        videoUri = segments[0].uri;
      } else {
        // Ghép nhiều segment bằng FFmpeg
        videoUri = await concatSegments(segments.map((s) => s.uri));
      }

      router.push({
        pathname: '/editor' as any,
        params: { videoUri },
      });
    } catch (error: any) {
      console.error('Concat error:', error);
      Alert.alert('Lỗi', 'Không thể ghép các đoạn video. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  }, [segments, router]);

  const handleClose = () => {
    if (segments.length > 0) {
      Alert.alert('Thoát?', 'Các đoạn video đã quay sẽ bị mất.', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Thoát', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  // Permission check
  if (!hasCamPerm || !hasMicPerm) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Ứng dụng cần quyền truy cập Camera và Micro để quay video.
          </Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={async () => {
              await requestCam();
              await requestMic();
            }}
          >
            <Text style={styles.permissionBtnText}>Cấp quyền</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color="#FF3B30" />
          <Text style={styles.permissionText}>Đang khởi tạo camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera Preview */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        video={true}
        audio={true}
      />

      {/* Processing Overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#FF3B30" />
          <Text style={styles.processingText}>Đang ghép video...</Text>
        </View>
      )}

      {/* Top Bar */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={handleClose}>
          <Text style={styles.topBtnText}>✕</Text>
        </TouchableOpacity>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          {/* Segment indicators */}
          <View style={styles.progressTrack}>
            {segments.map((seg, i) => {
              const segPercent = (seg.duration / MAX_DURATION) * 100;
              const prevPercent = segments
                .slice(0, i)
                .reduce((sum, s) => sum + (s.duration / MAX_DURATION) * 100, 0);
              return (
                <View
                  key={i}
                  style={[
                    styles.progressSegment,
                    {
                      left: `${prevPercent}%`,
                      width: `${segPercent}%`,
                    },
                  ]}
                />
              );
            })}
            {/* Current recording progress */}
            {isRecording && (
              <View
                style={[
                  styles.progressCurrent,
                  {
                    left: `${(segments.reduce((s, seg) => s + seg.duration, 0) / MAX_DURATION) * 100}%`,
                    width: `${(recordingElapsed / MAX_DURATION) * 100}%`,
                  },
                ]}
              />
            )}
          </View>
          <Text style={styles.durationText}>
            {totalDuration.toFixed(1)}s / {MAX_DURATION}s
          </Text>
        </View>

        <TouchableOpacity style={styles.topBtn} onPress={handleFlipCamera}>
          <Text style={styles.topBtnText}>🔄</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom Controls */}
      <View style={styles.bottomBar}>
        {/* Xóa clip cuối */}
        <TouchableOpacity
          style={[styles.sideBtn, segments.length === 0 && styles.sideBtnDisabled]}
          onPress={handleDeleteLastSegment}
          disabled={segments.length === 0 || isRecording}
        >
          <Text style={styles.sideBtnText}>↩️</Text>
          <Text style={styles.sideBtnLabel}>Hoàn tác</Text>
        </TouchableOpacity>

        {/* Nút quay */}
        <View style={styles.recordContainer}>
          <Pressable
            style={[
              styles.recordBtn,
              isRecording && styles.recordBtnActive,
            ]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            <View
              style={[
                styles.recordInner,
                isRecording && styles.recordInnerActive,
              ]}
            />
          </Pressable>
          <Text style={styles.recordHint}>
            {isRecording ? 'Thả để dừng' : 'Giữ để quay'}
          </Text>
        </View>

        {/* Nút Tiếp */}
        <TouchableOpacity
          style={[styles.sideBtn, segments.length === 0 && styles.sideBtnDisabled]}
          onPress={handleNext}
          disabled={segments.length === 0 || isRecording || isProcessing}
        >
          <Text style={styles.sideBtnText}>➡️</Text>
          <Text style={styles.sideBtnLabel}>Tiếp</Text>
        </TouchableOpacity>
      </View>

      {/* Segment Count */}
      {segments.length > 0 && !isRecording && (
        <View style={styles.segmentBadge}>
          <Text style={styles.segmentBadgeText}>{segments.length} đoạn</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Permission screens
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  permissionBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backBtn: {
    paddingVertical: 10,
  },
  backBtnText: {
    color: '#888',
    fontSize: 14,
  },
  // Processing overlay
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    zIndex: 10,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBtnText: {
    fontSize: 18,
    color: '#fff',
  },
  // Progress bar
  progressContainer: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  progressSegment: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#FF3B30',
    borderRightWidth: 1,
    borderRightColor: '#fff',
  },
  progressCurrent: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#FF6B6B',
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  sideBtn: {
    alignItems: 'center',
    width: 60,
  },
  sideBtnDisabled: {
    opacity: 0.3,
  },
  sideBtnText: {
    fontSize: 24,
  },
  sideBtnLabel: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
  },
  // Record button
  recordContainer: {
    alignItems: 'center',
  },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  recordBtnActive: {
    borderColor: '#FF3B30',
    transform: [{ scale: 1.1 }],
  },
  recordInner: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    backgroundColor: '#FF3B30',
  },
  recordInnerActive: {
    borderRadius: 8,
    backgroundColor: '#FF3B30',
  },
  recordHint: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  // Segment badge
  segmentBadge: {
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  segmentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
