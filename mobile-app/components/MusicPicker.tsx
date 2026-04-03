/**
 * MusicPicker — Chọn nhạc nền cho video
 *
 * Hiển thị danh sách nhạc mock bundled trong app.
 * Cho phép nghe thử, điều chỉnh volume, chọn giữ/bỏ tiếng gốc.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import { MUSIC_TRACKS, MusicTrack, formatDuration } from '@/constants/MusicLibrary';

const { width } = Dimensions.get('window');

interface MusicPickerProps {
  selectedTrackId: string | null;
  volume: number;
  keepOriginalAudio: boolean;
  onSelect: (track: MusicTrack | null, volume: number, keepOriginal: boolean) => void;
}

export default function MusicPicker({
  selectedTrackId,
  volume: initialVolume,
  keepOriginalAudio: initialKeepOriginal,
  onSelect,
}: MusicPickerProps) {
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [volume, setVolume] = useState(initialVolume);
  const [keepOriginal, setKeepOriginal] = useState(initialKeepOriginal);
  const soundRef = useRef<Audio.Sound | null>(null);

  const stopPreview = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
      setCurrentPreview(null);
    }
  }, []);

  const playPreview = useCallback(async (track: MusicTrack) => {
    await stopPreview();
    if (!track.source) {
      // Không có file thật — chỉ hiệu ứng UI
      setCurrentPreview(track.id);
      return;
    }
    try {
      const { sound } = await Audio.Sound.createAsync(
        track.source,
        { shouldPlay: true, volume }
      );
      soundRef.current = sound;
      setCurrentPreview(track.id);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setCurrentPreview(null);
          soundRef.current = null;
        }
      });
    } catch (err) {
      console.warn('Không thể phát nhạc preview:', err);
    }
  }, [volume, stopPreview]);

  const handleSelectTrack = useCallback((track: MusicTrack) => {
    if (selectedTrackId === track.id) {
      // Bỏ chọn
      onSelect(null, volume, keepOriginal);
      stopPreview();
    } else {
      onSelect(track, volume, keepOriginal);
    }
  }, [selectedTrackId, volume, keepOriginal, onSelect, stopPreview]);

  const handleVolumeChange = useCallback((val: number) => {
    setVolume(val);
    const selected = MUSIC_TRACKS.find((t) => t.id === selectedTrackId);
    if (selected) {
      onSelect(selected, val, keepOriginal);
    }
    if (soundRef.current) {
      soundRef.current.setVolumeAsync(val);
    }
  }, [selectedTrackId, keepOriginal, onSelect]);

  const handleToggleKeepOriginal = useCallback(() => {
    const newVal = !keepOriginal;
    setKeepOriginal(newVal);
    const selected = MUSIC_TRACKS.find((t) => t.id === selectedTrackId);
    if (selected) {
      onSelect(selected, volume, newVal);
    }
  }, [keepOriginal, selectedTrackId, volume, onSelect]);

  const genreIcons: Record<string, string> = {
    Pop: '🎵',
    Lofi: '☕',
    Acoustic: '🎸',
    Happy: '🎶',
    Cinematic: '🎬',
    Tropical: '🌴',
    Piano: '🎹',
    'Hip Hop': '🎤',
  };

  const renderItem = ({ item }: { item: MusicTrack }) => {
    const isSelected = selectedTrackId === item.id;
    const isPreviewing = currentPreview === item.id;

    return (
      <TouchableOpacity
        style={[styles.trackItem, isSelected && styles.trackItemSelected]}
        onPress={() => handleSelectTrack(item)}
        activeOpacity={0.7}
      >
        <View style={styles.trackIcon}>
          <Text style={styles.trackIconText}>
            {genreIcons[item.genre] || '🎵'}
          </Text>
        </View>
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, isSelected && styles.trackTitleSelected]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.trackMeta}>
            {item.genre} · {formatDuration(item.duration)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.previewBtn}
          onPress={() => isPreviewing ? stopPreview() : playPreview(item)}
        >
          <Text style={styles.previewBtnText}>
            {isPreviewing ? '⏹' : '▶'}
          </Text>
        </TouchableOpacity>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎵 Ghép nhạc nền</Text>
      </View>

      {/* Danh sách nhạc */}
      <FlatList
        data={MUSIC_TRACKS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <TouchableOpacity
            style={[styles.trackItem, !selectedTrackId && styles.trackItemSelected]}
            onPress={() => { onSelect(null, volume, keepOriginal); stopPreview(); }}
          >
            <View style={styles.trackIcon}>
              <Text style={styles.trackIconText}>🔇</Text>
            </View>
            <View style={styles.trackInfo}>
              <Text style={[styles.trackTitle, !selectedTrackId && styles.trackTitleSelected]}>
                Không có nhạc nền
              </Text>
              <Text style={styles.trackMeta}>Giữ nguyên âm thanh gốc</Text>
            </View>
          </TouchableOpacity>
        }
      />

      {/* Điều khiển khi đã chọn nhạc */}
      {selectedTrackId && (
        <View style={styles.controls}>
          {/* Volume slider */}
          <View style={styles.volumeRow}>
            <Text style={styles.controlLabel}>Âm lượng nhạc nền</Text>
            <Text style={styles.volumeValue}>{Math.round(volume * 100)}%</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            step={0.05}
            value={volume}
            onValueChange={handleVolumeChange}
            minimumTrackTintColor="#FF3B30"
            maximumTrackTintColor="#555"
            thumbTintColor="#FF3B30"
          />

          {/* Toggle giữ tiếng gốc */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={handleToggleKeepOriginal}
          >
            <View style={[styles.toggleBox, keepOriginal && styles.toggleBoxActive]}>
              {keepOriginal && <Text style={styles.toggleCheck}>✓</Text>}
            </View>
            <Text style={styles.toggleLabel}>Giữ tiếng gốc của video</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    flex: 1,
    paddingHorizontal: 12,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  trackItemSelected: {
    borderColor: '#FF3B30',
    backgroundColor: '#2a1a1a',
  },
  trackIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trackIconText: {
    fontSize: 20,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  trackTitleSelected: {
    color: '#FF3B30',
  },
  trackMeta: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  previewBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  previewBtnText: {
    fontSize: 16,
    color: '#fff',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  controls: {
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  volumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlLabel: {
    color: '#ccc',
    fontSize: 13,
  },
  volumeValue: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 36,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  toggleBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  toggleBoxActive: {
    borderColor: '#FF3B30',
    backgroundColor: '#FF3B30',
  },
  toggleCheck: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  toggleLabel: {
    color: '#ccc',
    fontSize: 13,
  },
});
