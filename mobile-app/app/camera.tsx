import { SafeAreaView } from 'react-native-safe-area-context';
/**
 * Camera Screen - multi-segment hold-to-record flow.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { cleanupLocalFiles, concatSegments } from "@/services/ffmpegService";

const MAX_DURATION = 60;
const MIN_RECORDING_HOLD_MS = 350;
const MIN_SEGMENT_DURATION = 0.5;

interface Segment {
  uri: string;
  duration: number;
}

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const segmentsRef = useRef<Segment[]>([]);
  const isRecordingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const segmentStartRef = useRef<number | null>(null);
  const cameraReadyRef = useRef(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);

  const totalDuration =
    segments.reduce((sum, segment) => sum + segment.duration, 0) +
    recordingElapsed;

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      if (!microphonePermission?.granted) {
        await requestMicrophonePermission();
      }
    })();
  }, [
    cameraPermission,
    microphonePermission,
    requestCameraPermission,
    requestMicrophonePermission,
  ]);

  const clearRecordingTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearPendingStop = useCallback(() => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearRecordingTimer();
      clearPendingStop();
    };
  }, [clearPendingStop, clearRecordingTimer]);

  const resetRecordingSession = useCallback(() => {
    clearRecordingTimer();
    clearPendingStop();
    isRecordingRef.current = false;
    isStoppingRef.current = false;
    segmentStartRef.current = null;
    setIsRecording(false);
    setRecordingElapsed(0);
  }, [clearPendingStop, clearRecordingTimer]);

  const stopRecording = useCallback(async (force = false) => {
    if (
      !cameraRef.current ||
      !isRecordingRef.current ||
      isStoppingRef.current
    ) {
      return;
    }

    const segmentStart = segmentStartRef.current;
    if (!force && segmentStart) {
      const elapsed = Date.now() - segmentStart;
      if (elapsed < MIN_RECORDING_HOLD_MS) {
        if (!stopTimeoutRef.current) {
          stopTimeoutRef.current = setTimeout(() => {
            stopTimeoutRef.current = null;
            void stopRecording(true);
          }, MIN_RECORDING_HOLD_MS - elapsed);
        }
        return;
      }
    }

    isStoppingRef.current = true;
    clearPendingStop();
    clearRecordingTimer();
    setIsRecording(false);
    setRecordingElapsed(0);

    try {
      cameraRef.current.stopRecording();
    } catch (error) {
      console.error("Stop recording error:", error);
      resetRecordingSession();
    }
  }, [clearPendingStop, clearRecordingTimer, resetRecordingSession]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecordingRef.current || isProcessing) {
      return;
    }

    if (!cameraReadyRef.current) {
      Alert.alert("Camera chua san sang", "Hay doi camera san sang roi thu lai.");
      return;
    }

    const existingDuration = segmentsRef.current.reduce(
      (sum, segment) => sum + segment.duration,
      0,
    );

    if (existingDuration >= MAX_DURATION) {
      Alert.alert(
        "Da dat gioi han",
        `Tong thoi luong toi da la ${MAX_DURATION} giay.`,
      );
      return;
    }

    try {
      clearPendingStop();
      isRecordingRef.current = true;
      isStoppingRef.current = false;
      segmentStartRef.current = Date.now();
      setIsRecording(true);
      setRecordingElapsed(0);

      timerRef.current = setInterval(() => {
        setRecordingElapsed((prev) => {
          const nextValue = prev + 0.1;
          if (existingDuration + nextValue >= MAX_DURATION) {
            void stopRecording();
          }
          return nextValue;
        });
      }, 100);

      const video = await cameraRef.current.recordAsync({
        maxDuration: Math.max(1, Math.ceil(MAX_DURATION - existingDuration)),
      });

      const segmentStart = segmentStartRef.current;
      if (video?.uri && segmentStart) {
        const duration = Math.max(
          MIN_SEGMENT_DURATION,
          (Date.now() - segmentStart) / 1000,
        );
        setSegments((prev) => {
          const nextSegments = [...prev, { uri: video.uri, duration }];
          segmentsRef.current = nextSegments;
          return nextSegments;
        });
      }
    } catch (error) {
      console.error("Recording error:", error);
      Alert.alert(
        "Loi quay video",
        "Khong the bat dau quay. Hay doi camera on dinh roi thu lai.",
      );
    } finally {
      resetRecordingSession();
    }
  }, [clearPendingStop, isProcessing, resetRecordingSession, stopRecording]);

  const handleFlipCamera = () => {
    if (isRecordingRef.current || isProcessing) {
      return;
    }
    cameraReadyRef.current = false;
    setIsCameraReady(false);
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const handleDeleteLastSegment = () => {
    if (segments.length === 0) return;

    Alert.alert("Xoa clip cuoi?", "Ban co chac muon xoa doan vua quay?", [
      { text: "Huy", style: "cancel" },
      {
        text: "Xoa",
        style: "destructive",
        onPress: () => {
          const lastSegment = segmentsRef.current[segmentsRef.current.length - 1];
          void cleanupLocalFiles([lastSegment?.uri]);
          setSegments((prev) => {
            const nextSegments = prev.slice(0, -1);
            segmentsRef.current = nextSegments;
            return nextSegments;
          });
        },
      },
    ]);
  };

  const handleNext = useCallback(async () => {
    if (segments.length === 0) {
      Alert.alert("Chua co video", "Hay quay it nhat mot doan video.");
      return;
    }

    setIsProcessing(true);
    try {
      let videoUri: string;
      if (segments.length === 1) {
        videoUri = segments[0].uri;
      } else {
        videoUri = await concatSegments(segments.map((segment) => segment.uri));
        await cleanupLocalFiles(segments.map((segment) => segment.uri));
      }

      router.push({
        pathname: "/editor" as any,
        params: { videoUri },
      });
    } catch (error: any) {
      console.error("Concat error:", error);
      Alert.alert("Loi", "Khong the ghep cac doan video. Vui long thu lai.");
    } finally {
      setIsProcessing(false);
    }
  }, [segments, router]);

  const discardSegmentsAndExit = useCallback(async () => {
    await cleanupLocalFiles(segmentsRef.current.map((segment) => segment.uri));
    router.back();
  }, [router]);

  const handleClose = () => {
    if (isRecordingRef.current || isStoppingRef.current) {
      Alert.alert("Dang quay", "Hay tha nut quay de ket thuc doan hien tai.");
      return;
    }

    if (segments.length > 0) {
      Alert.alert("Thoat?", "Cac doan video da quay se bi mat.", [
        { text: "Huy", style: "cancel" },
        {
          text: "Thoat",
          style: "destructive",
          onPress: () => {
            void discardSegmentsAndExit();
          },
        },
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
          <Text style={styles.permissionText}>Dang kiem tra quyen...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Ung dung can quyen truy cap Camera va Micro de quay video.
          </Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={async () => {
              await requestCameraPermission();
              await requestMicrophonePermission();
            }}
          >
            <Text style={styles.permissionBtnText}>Cap quyen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Quay lai</Text>
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
        videoQuality="720p"
        onCameraReady={() => {
          cameraReadyRef.current = true;
          setIsCameraReady(true);
        }}
        onMountError={(error) => {
          cameraReadyRef.current = false;
          setIsCameraReady(false);
          console.error("Camera mount error:", error);
          Alert.alert("Loi", "Khong the khoi dong camera.");
        }}
      />

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#FF3B30" />
          <Text style={styles.processingText}>Dang ghep video...</Text>
        </View>
      )}

      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={handleClose}
          disabled={isRecording || isProcessing}
        >
          <Text style={styles.topBtnText}>X</Text>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            {segments.map((segment, index) => {
              const segmentPercent = (segment.duration / MAX_DURATION) * 100;
              const previousPercent = segments
                .slice(0, index)
                .reduce(
                  (sum, item) => sum + (item.duration / MAX_DURATION) * 100,
                  0,
                );

              return (
                <View
                  key={index}
                  style={[
                    styles.progressSegment,
                    {
                      left: `${previousPercent}%`,
                      width: `${segmentPercent}%`,
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
                    left: `${(segments.reduce((sum, segment) => sum + segment.duration, 0) / MAX_DURATION) * 100}%`,
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

        <TouchableOpacity
          style={styles.topBtn}
          onPress={handleFlipCamera}
          disabled={isRecording || isProcessing}
        >
          <Text style={styles.topBtnText}>R</Text>
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
          <Text style={styles.sideBtnText}>Undo</Text>
          <Text style={styles.sideBtnLabel}>Hoan tac</Text>
        </TouchableOpacity>

        <View style={styles.recordContainer}>
          <Pressable
            style={[
              styles.recordBtn,
              isRecording && styles.recordBtnActive,
              !isCameraReady && styles.recordBtnDisabled,
            ]}
            onPressIn={startRecording}
            onPressOut={() => {
              void stopRecording();
            }}
            onTouchCancel={() => {
              void stopRecording();
            }}
            disabled={!isCameraReady || isProcessing}
          >
            <View
              style={[
                styles.recordInner,
                isRecording && styles.recordInnerActive,
              ]}
            />
          </Pressable>
          <Text style={styles.recordHint}>
            {isRecording
              ? "Tha de dung"
              : isCameraReady
                ? "Giu de quay"
                : "Dang mo camera..."}
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
          <Text style={styles.sideBtnText}>Next</Text>
          <Text style={styles.sideBtnLabel}>Tiep</Text>
        </TouchableOpacity>
      </View>

      {segments.length > 0 && !isRecording && (
        <View style={styles.segmentBadge}>
          <Text style={styles.segmentBadgeText}>{segments.length} doan</Text>
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
    color: "#fff",
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
  recordBtnDisabled: {
    opacity: 0.5,
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
