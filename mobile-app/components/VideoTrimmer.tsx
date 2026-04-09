import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';

interface VideoTrimmerProps {
  videoUri: string;
  onTrimComplete: (startTime: number, endTime: number) => void;
  onCancel: () => void;
  maxDuration?: number; // Maximum allowed duration in seconds
}

export default function VideoTrimmer({
  videoUri,
  onTrimComplete,
  onCancel,
  maxDuration = 60,
}: VideoTrimmerProps) {
  const { width, height } = useWindowDimensions();
  const videoRef = useRef<Video>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (duration > 0 && endTime === 0) {
      setEndTime(Math.min(duration, maxDuration));
    }
  }, [duration, maxDuration]);

  useEffect(() => {
    const currentVideo = videoRef.current;
    return () => {
      if (currentVideo) {
        void currentVideo.unloadAsync().catch(() => undefined);
      }
    };
  }, []);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      if (status.durationMillis) {
        setDuration(status.durationMillis / 1000);
      }
      setCurrentTime(status.positionMillis / 1000);
      setIsPlaying(status.isPlaying);

      // Loop within trim range
      if (status.positionMillis / 1000 >= endTime) {
        videoRef.current?.setPositionAsync(startTime * 1000);
      }
    }
  };

  const handleStartChange = (value: number) => {
    const newStart = Math.min(value, endTime - 1);
    setStartTime(newStart);
    videoRef.current?.setPositionAsync(newStart * 1000);
  };

  const handleEndChange = (value: number) => {
    const maxEnd = Math.min(startTime + maxDuration, duration);
    const newEnd = Math.max(value, startTime + 1);
    setEndTime(Math.min(newEnd, maxEnd));
  };

  const togglePlayPause = async () => {
    if (isPlaying) {
      await videoRef.current?.pauseAsync();
    } else {
      await videoRef.current?.setPositionAsync(startTime * 1000);
      await videoRef.current?.playAsync();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const trimDuration = endTime - startTime;
  const isValidDuration = trimDuration >= 1 && trimDuration <= maxDuration;

  const handleConfirm = () => {
    if (!isValidDuration) {
      Alert.alert('Invalid Duration', `Video must be between 1 and ${maxDuration} seconds`);
      return;
    }
    onTrimComplete(startTime, endTime);
  };

  const previewHeight = Math.min(height * 0.48, width * 1.15);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={[styles.header, { paddingTop: 12 }]}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trim Video</Text>
        <TouchableOpacity onPress={handleConfirm} disabled={!isValidDuration}>
          <Text style={[styles.headerButton, !isValidDuration && styles.disabled]}>
            Done
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.videoContainer, { maxHeight: previewHeight }]}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FF3B30" />
          </View>
        )}
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={[styles.video, { width, height: previewHeight }]}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isLooping={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />
        <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
          <Text style={styles.playIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.trimControls, { paddingBottom: 20 }]}>
        <View style={styles.timeInfo}>
          <Text style={styles.timeText}>
            Duration: {formatTime(trimDuration)} / {formatTime(maxDuration)} max
          </Text>
          <Text style={[styles.durationIndicator, !isValidDuration && styles.invalidDuration]}>
            {isValidDuration ? '✓ Valid' : '✗ Invalid'}
          </Text>
        </View>

        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Start: {formatTime(startTime)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration}
            value={startTime}
            onValueChange={handleStartChange}
            minimumTrackTintColor="#FF3B30"
            maximumTrackTintColor="#333"
            thumbTintColor="#FF3B30"
          />
        </View>

        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>End: {formatTime(endTime)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration}
            value={endTime}
            onValueChange={handleEndChange}
            minimumTrackTintColor="#FF3B30"
            maximumTrackTintColor="#333"
            thumbTintColor="#FF3B30"
          />
        </View>

        <View style={styles.trimPreview}>
          <View style={styles.timeline}>
            <View
              style={[
                styles.trimRange,
                {
                  left: `${(startTime / duration) * 100}%`,
                  width: `${((endTime - startTime) / duration) * 100}%`,
                },
              ]}
            />
            <View
              style={[
                styles.playhead,
                { left: `${(currentTime / duration) * 100}%` },
              ]}
            />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#111',
  },
  headerButton: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  playButton: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 30,
  },
  trimControls: {
    padding: 20,
    backgroundColor: '#111',
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
  },
  durationIndicator: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: '600',
  },
  invalidDuration: {
    color: '#FF3B30',
  },
  sliderContainer: {
    marginBottom: 15,
  },
  sliderLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 5,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  trimPreview: {
    marginTop: 10,
  },
  timeline: {
    height: 30,
    backgroundColor: '#333',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  trimRange: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(255, 59, 48, 0.4)',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FF3B30',
  },
  playhead: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: '#fff',
  },
});
