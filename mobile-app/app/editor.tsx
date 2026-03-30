/**
 * Editor Screen — Trình chỉnh sửa video tổng hợp
 *
 * Nhận videoUri từ params (camera hoặc thư viện).
 * 5 tab chỉnh sửa:
 *   ✂️ Cắt xén (Trim)
 *   🎵 Nhạc nền (Music)
 *   ⚡ Tốc độ (Speed)
 *   ✏️ Chèn chữ (Text)
 *   🎨 Bộ lọc (Filter)
 *
 * Tất cả hiệu ứng được áp dụng bằng 1 lệnh FFmpeg duy nhất khi bấm "Xuất".
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Asset } from 'expo-asset';

import VideoTrimmer from '@/components/VideoTrimmer';
import MusicPicker from '@/components/MusicPicker';
import SpeedControl from '@/components/SpeedControl';
import TextOverlayComponent, { DraggableText, TextOverlayParams } from '@/components/TextOverlay';
import ColorFilters, { FILTER_PRESETS } from '@/components/ColorFilters';
import { exportVideo, EditorState } from '@/services/ffmpegService';
import { MusicTrack, MUSIC_TRACKS } from '@/constants/MusicLibrary';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIDEO_PREVIEW_HEIGHT = SCREEN_HEIGHT * 0.45;

type EditorTab = 'trim' | 'music' | 'speed' | 'text' | 'filter';

const EDITOR_TABS: { key: EditorTab; icon: string; label: string }[] = [
  { key: 'trim', icon: '✂️', label: 'Cắt xén' },
  { key: 'music', icon: '🎵', label: 'Nhạc' },
  { key: 'speed', icon: '⚡', label: 'Tốc độ' },
  { key: 'text', icon: '✏️', label: 'Chữ' },
  { key: 'filter', icon: '🎨', label: 'Lọc màu' },
];

export default function EditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ videoUri: string }>();
  const videoUri = params.videoUri || '';

  // Video player
  const videoRef = useRef<Video>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Active editor tab
  const [activeTab, setActiveTab] = useState<EditorTab>('trim');

  // Full-screen trimmer modal
  const [showTrimmer, setShowTrimmer] = useState(false);

  // ===== EDITOR STATE =====
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimSet, setTrimSet] = useState(false);

  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.7);
  const [keepOriginalAudio, setKeepOriginalAudio] = useState(true);

  const [speed, setSpeed] = useState(1);

  const [textParams, setTextParams] = useState<TextOverlayParams | null>(null);

  const [selectedFilterId, setSelectedFilterId] = useState('none');

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // ===== VIDEO PLAYBACK =====
  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (status.durationMillis) {
        setVideoDuration(status.durationMillis / 1000);
      }
      setCurrentTime(status.positionMillis / 1000);
      setIsPlaying(status.isPlaying);
    }
  }, []);

  // Set initial trimEnd when duration is known
  useEffect(() => {
    if (videoDuration > 0 && trimEnd === 0 && !trimSet) {
      setTrimEnd(Math.min(videoDuration, 60));
    }
  }, [videoDuration, trimEnd, trimSet]);

  // Apply speed to preview player
  useEffect(() => {
    videoRef.current?.setRateAsync(speed, true);
  }, [speed]);

  const togglePlay = async () => {
    if (isPlaying) {
      await videoRef.current?.pauseAsync();
    } else {
      await videoRef.current?.playAsync();
    }
  };

  // ===== TRIM HANDLERS =====
  const handleOpenTrimmer = () => {
    setShowTrimmer(true);
  };

  const handleTrimComplete = (start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
    setTrimSet(true);
    setShowTrimmer(false);
  };

  // ===== MUSIC HANDLERS =====
  const handleMusicSelect = useCallback(
    (track: MusicTrack | null, volume: number, keepOriginal: boolean) => {
      setSelectedMusic(track);
      setMusicVolume(volume);
      setKeepOriginalAudio(keepOriginal);
    },
    []
  );

  // ===== TEXT HANDLERS =====
  const handleTextChange = useCallback((params: TextOverlayParams | null) => {
    setTextParams(params);
  }, []);

  const handleTextPositionChange = useCallback(
    (x: number, y: number) => {
      if (textParams) {
        // Chuyển đổi tọa độ từ preview sang tọa độ video thực tế
        // Giả sử video 1080p, preview width = SCREEN_WIDTH
        const scaleX = 1080 / SCREEN_WIDTH;
        const scaleY = 1920 / VIDEO_PREVIEW_HEIGHT;
        setTextParams({
          ...textParams,
          x: Math.round(x * scaleX),
          y: Math.round(y * scaleY),
        });
      }
    },
    [textParams]
  );

  // ===== EXPORT =====
  const handleExport = useCallback(async () => {
    if (!videoUri) {
      Alert.alert('Lỗi', 'Không tìm thấy video.');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Build editor state cho FFmpeg
      const state: EditorState = {
        videoUri,
        trim: trimSet ? { start: trimStart, end: trimEnd } : null,
        music: selectedMusic
          ? {
              uri: '', // Sẽ resolve từ asset
              volume: musicVolume,
              keepOriginalAudio,
            }
          : null,
        speed,
        text: textParams
          ? {
              content: textParams.content,
              color: textParams.color,
              fontSize: textParams.fontSize,
              x: textParams.x,
              y: textParams.y,
            }
          : null,
        filter: selectedFilterId !== 'none' ? selectedFilterId : null,
      };

      // Resolve music URI nếu có
      if (state.music && selectedMusic?.source) {
        try {
          const asset = Asset.fromModule(selectedMusic.source);
          await asset.downloadAsync();
          state.music.uri = asset.localUri || '';
        } catch {
          console.warn('Không thể load file nhạc, bỏ qua nhạc nền.');
          state.music = null;
        }
      } else if (state.music) {
        // Không có file nhạc thật, bỏ qua
        state.music = null;
      }

      const outputUri = await exportVideo(state, (percent) => {
        setExportProgress(percent);
      });

      // Navigate to preview screen
      router.push({
        pathname: '/preview' as any,
        params: { videoUri: outputUri },
      });
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Lỗi xuất video', error.message || 'Không thể xuất video. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  }, [
    videoUri,
    trimSet,
    trimStart,
    trimEnd,
    selectedMusic,
    musicVolume,
    keepOriginalAudio,
    speed,
    textParams,
    selectedFilterId,
    router,
  ]);

  const handleClose = () => {
    Alert.alert('Thoát chỉnh sửa?', 'Các thay đổi chưa lưu sẽ bị mất.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Thoát', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  // ===== SUMMARY =====
  const effectsSummary: string[] = [];
  if (trimSet) effectsSummary.push(`✂️ ${trimStart.toFixed(1)}s - ${trimEnd.toFixed(1)}s`);
  if (selectedMusic) effectsSummary.push(`🎵 ${selectedMusic.title}`);
  if (speed !== 1) effectsSummary.push(`⚡ ${speed}x`);
  if (textParams) effectsSummary.push(`✏️ "${textParams.content}"`);
  if (selectedFilterId !== 'none') {
    const filter = FILTER_PRESETS.find((f) => f.id === selectedFilterId);
    effectsSummary.push(`🎨 ${filter?.name}`);
  }

  // ===== RENDER =====

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'trim':
        return (
          <View style={styles.tabContent}>
            <View style={styles.trimSummary}>
              <Text style={styles.trimSummaryText}>
                {trimSet
                  ? `Cắt từ ${formatTime(trimStart)} đến ${formatTime(trimEnd)} (${formatTime(trimEnd - trimStart)})`
                  : `Toàn bộ video: ${formatTime(videoDuration)}`}
              </Text>
              <TouchableOpacity style={styles.trimButton} onPress={handleOpenTrimmer}>
                <Text style={styles.trimButtonText}>
                  {trimSet ? '✂️ Chỉnh lại' : '✂️ Mở công cụ cắt'}
                </Text>
              </TouchableOpacity>
              {trimSet && (
                <TouchableOpacity
                  style={styles.trimResetBtn}
                  onPress={() => {
                    setTrimSet(false);
                    setTrimStart(0);
                    setTrimEnd(videoDuration);
                  }}
                >
                  <Text style={styles.trimResetText}>Bỏ cắt</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      case 'music':
        return (
          <MusicPicker
            selectedTrackId={selectedMusic?.id || null}
            volume={musicVolume}
            keepOriginalAudio={keepOriginalAudio}
            onSelect={handleMusicSelect}
          />
        );
      case 'speed':
        return <SpeedControl selectedSpeed={speed} onSpeedChange={setSpeed} />;
      case 'text':
        return (
          <TextOverlayComponent
            params={textParams}
            onChange={handleTextChange}
            previewWidth={SCREEN_WIDTH}
            previewHeight={VIDEO_PREVIEW_HEIGHT}
          />
        );
      case 'filter':
        return (
          <ColorFilters
            selectedFilterId={selectedFilterId}
            onFilterChange={setSelectedFilterId}
          />
        );
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
      {/* Export overlay */}
      {isExporting && (
        <View style={styles.exportOverlay}>
          <View style={styles.exportModal}>
            <ActivityIndicator size="large" color="#FF3B30" />
            <Text style={styles.exportTitle}>Đang xuất video...</Text>
            <View style={styles.exportProgressContainer}>
              <View style={[styles.exportProgressBar, { width: `${exportProgress}%` }]} />
            </View>
            <Text style={styles.exportProgressText}>{exportProgress}%</Text>
            <Text style={styles.exportNote}>
              Đang áp dụng {effectsSummary.length} hiệu ứng. Vui lòng đợi...
            </Text>
          </View>
        </View>
      )}

      {/* Trimmer Modal */}
      {showTrimmer && (
        <View style={StyleSheet.absoluteFill}>
          <VideoTrimmer
            videoUri={videoUri}
            onTrimComplete={handleTrimComplete}
            onCancel={() => setShowTrimmer(false)}
            maxDuration={60}
          />
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa video</Text>
        <TouchableOpacity
          style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={isExporting}
        >
          <Text style={styles.exportBtnText}>Xuất ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Video Preview */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isLooping={true}
          onPlaybackStatusUpdate={handlePlaybackStatus}
        />

        {/* Text overlay trên video */}
        {textParams && (
          <DraggableText
            params={textParams}
            onPositionChange={handleTextPositionChange}
            containerWidth={SCREEN_WIDTH}
            containerHeight={VIDEO_PREVIEW_HEIGHT}
          />
        )}

        {/* Play/Pause button */}
        <TouchableOpacity style={styles.playOverlay} onPress={togglePlay}>
          {!isPlaying && (
            <View style={styles.playBtn}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Current time */}
        <View style={styles.timeBar}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        </View>
      </View>

      {/* Effects summary */}
      {effectsSummary.length > 0 && (
        <View style={styles.summaryBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {effectsSummary.map((e, i) => (
              <View key={i} style={styles.summaryChip}>
                <Text style={styles.summaryChipText}>{e}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Editor Tabs */}
      <View style={styles.tabBar}>
        {EDITOR_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      <KeyboardAvoidingView
        style={styles.tabContentContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderActiveTab()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Error state
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  exportBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exportBtnDisabled: {
    opacity: 0.5,
  },
  exportBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Video preview
  videoContainer: {
    width: SCREEN_WIDTH,
    height: VIDEO_PREVIEW_HEIGHT,
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
  timeBar: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Effects summary bar
  summaryBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  summaryChip: {
    backgroundColor: '#2a1a1a',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#FF3B3044',
  },
  summaryChipText: {
    color: '#FF8A80',
    fontSize: 11,
    fontWeight: '500',
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#FF3B30',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#FF3B30',
    fontWeight: '700',
  },
  // Tab content
  tabContentContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Trim section
  trimSummary: {
    alignItems: 'center',
    gap: 12,
  },
  trimSummaryText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
  },
  trimButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  trimButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  trimResetBtn: {
    paddingVertical: 8,
  },
  trimResetText: {
    color: '#888',
    fontSize: 13,
  },
  // Export overlay
  exportOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  exportModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 30,
    width: SCREEN_WIDTH * 0.8,
    alignItems: 'center',
  },
  exportTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 20,
  },
  exportProgressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  exportProgressBar: {
    height: '100%',
    backgroundColor: '#FF3B30',
    borderRadius: 3,
  },
  exportProgressText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  exportNote: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
