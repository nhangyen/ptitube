/**
 * Camera Screen — Quay video multi-segment
 *
 * Chuyển sang expo-camera để hỗ trợ Expo Go.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { cleanupLocalFiles, concatSegments } from "@/services/ffmpegService";

const MAX_DURATION = 60; // Tối đa 60 giây

interface Segment {
  uri: string;
  duration: number; // giây
}

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);

  // Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();

  // Camera state
  const [facing, setFacing] = useState<"back" | "front">("back");

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentSegmentStart, setCurrentSegmentStart] = useState<number | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Timer để đếm thời gian đang quay
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalDuration =
    segments.reduce((sum, s) => sum + s.duration, 0) + recordingElapsed;

  // Request permissions
  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) await requestCameraPermission();
      if (!microphonePermission?.granted) await requestMicrophonePermission();
    })();
  }, [
    cameraPermission,
    microphonePermission,
    requestCameraPermission,
    requestMicrophonePermission,
  ]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecording) return;

    setIsRecording(false);
    setRecordingElapsed(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      await cameraRef.current.stopRecording();
    } catch (err) {
      console.error("Stop recording error:", err);
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;
    if (totalDuration >= MAX_DURATION) {
      Alert.alert(
        "Đã đạt giới hạn",
        `Tổng thời lượng tối đa là ${MAX_DURATION} giây.`,
      );
      return;
    }

    try {
      setIsRecording(true);
      setCurrentSegmentStart(Date.now());
      setRecordingElapsed(0);

      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setRecordingElapsed((prev) => {
          const newVal = prev + 0.1;
          const currentTotal =
            segments.reduce((sum, s) => sum + s.duration, 0) + newVal;
          if (currentTotal >= MAX_DURATION) {
            void stopRecording();
          }
          return newVal;
        });
      }, 100);

      const video = await cameraRef.current.recordAsync({
        maxDuration:
          MAX_DURATION - segments.reduce((sum, s) => sum + s.duration, 0),
      });

      if (video) {
        const duration =
          (Date.now() - (currentSegmentStart || Date.now())) / 1000;
        setSegments((prev) => [
          ...prev,
          { uri: video.uri, duration: Math.max(0.5, duration) },
        ]);
      }
    } catch (error) {
      console.error("Recording error:", error);
      setIsRecording(false);
      setRecordingElapsed(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [
    isRecording,
    totalDuration,
    segments,
    currentSegmentStart,
    stopRecording,
  ]);

  const handleFlipCamera = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const handleDeleteLastSegment = () => {
    if (segments.length === 0) return;
    Alert.alert("Xóa clip cuối?", "Bạn có chắc muốn xóa đoạn vừa quay?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => {
          const lastSegment = segments[segments.length - 1];
          void cleanupLocalFiles([lastSegment?.uri]);
          setSegments((prev) => prev.slice(0, -1));
        },
      },
    ]);
  };

  const handleNext = useCallback(async () => {
    if (segments.length === 0) {
      Alert.alert("Chưa có video", "Hãy quay ít nhất một đoạn video.");
      return;
    }

    setIsProcessing(true);
    try {
      let videoUri: string;
      if (segments.length === 1) {
        videoUri = segments[0].uri;
      } else {
        videoUri = await concatSegments(segments.map((s) => s.uri));
        await cleanupLocalFiles(segments.map((segment) => segment.uri));
      }

      router.push({
        pathname: "/editor" as any,
        params: { videoUri },
      });
    } catch (error: any) {
      console.error("Concat error:", error);
      Alert.alert("Lỗi", "Không thể ghép các đoạn video. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  }, [segments, router]);

  const handleClose = () => {
    if (segments.length > 0) {
      Alert.alert("Thoát?", "Các đoạn video đã quay sẽ bị mất.", [
        { text: "Hủy", style: "cancel" },
        { text: "Thoát", style: "destructive", onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  if (!cameraPermission || !microphonePermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color="#FF3B30" />
          <Text style={styles.permissionText}>Đang kiểm tra quyền...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Ứng dụng cần quyền truy cập Camera và Micro để quay video.
          </Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={async () => {
              await requestCameraPermission();
              await requestMicrophonePermission();
            }}
          >
            <Text style={styles.permissionBtnText}>Cấp quyền</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
        onMountError={(error) => {
          console.error("Camera mount error:", error);
          Alert.alert("Lỗi", "Không thể khởi động camera.");
        }}
      />

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#FF3B30" />
          <Text style={styles.processingText}>Đang ghép video...</Text>
        </View>
      )}

      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={handleClose}>
          <Text style={styles.topBtnText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
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

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.sideBtn,
            segments.length === 0 && styles.sideBtnDisabled,
          ]}
          onPress={handleDeleteLastSegment}
          disabled={segments.length === 0 || isRecording}
        >
          <Text style={styles.sideBtnText}>↩️</Text>
          <Text style={styles.sideBtnLabel}>Hoàn tác</Text>
        </TouchableOpacity>

        <View style={styles.recordContainer}>
          <Pressable
            style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
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
            {isRecording ? "Thả để dừng" : "Giữ để quay"}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.sideBtn,
            segments.length === 0 && styles.sideBtnDisabled,
          ]}
          onPress={handleNext}
          disabled={segments.length === 0 || isRecording || isProcessing}
        >
          <Text style={styles.sideBtnText}>➡️</Text>
          <Text style={styles.sideBtnLabel}>Tiếp</Text>
        </TouchableOpacity>
      </View>

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
    backgroundColor: "#000",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  permissionText: {
    color: "#ccc",
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  permissionBtn: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  permissionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  backBtn: {
    paddingVertical: 10,
  },
  backBtnText: {
    color: "#888",
    fontSize: 14,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  processingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 12,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    zIndex: 10,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  topBtnText: {
    fontSize: 18,
    color: "#fff",
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: "center",
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
    position: "relative",
  },
  progressSegment: {
    position: "absolute",
    height: "100%",
    backgroundColor: "#FF3B30",
    borderRightWidth: 1,
    borderRightColor: "#fff",
  },
  progressCurrent: {
    position: "absolute",
    height: "100%",
    backgroundColor: "#FF6B6B",
  },
  durationText: {
    color: "#fff",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
  bottomBar: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  sideBtn: {
    alignItems: "center",
    width: 60,
  },
  sideBtnDisabled: {
    opacity: 0.3,
  },
  sideBtnText: {
    fontSize: 24,
  },
  sideBtnLabel: {
    color: "#fff",
    fontSize: 11,
    marginTop: 4,
  },
  recordContainer: {
    alignItems: "center",
  },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  recordBtnActive: {
    borderColor: "#FF3B30",
    transform: [{ scale: 1.1 }],
  },
  recordInner: {
    width: "100%",
    height: "100%",
    borderRadius: 36,
    backgroundColor: "#FF3B30",
  },
  recordInnerActive: {
    borderRadius: 8,
    backgroundColor: "#FF3B30",
  },
  recordHint: {
    color: "#fff",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "500",
  },
  segmentBadge: {
    position: "absolute",
    bottom: 130,
    alignSelf: "center",
    backgroundColor: "rgba(255, 59, 48, 0.8)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  segmentBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
