/**
 * SpeedControl — Điều chỉnh tốc độ phát video
 *
 * Cung cấp 4 nút: 0.5x, 1x, 1.5x, 2x
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

interface SpeedControlProps {
  selectedSpeed: number;
  onSpeedChange: (speed: number) => void;
}

const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x', description: 'Chậm' },
  { value: 1, label: '1x', description: 'Bình thường' },
  { value: 1.5, label: '1.5x', description: 'Nhanh' },
  { value: 2, label: '2x', description: 'Rất nhanh' },
];

export default function SpeedControl({ selectedSpeed, onSpeedChange }: SpeedControlProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚡ Tốc độ phát</Text>
        <Text style={styles.headerSubtitle}>
          Hiện tại: {selectedSpeed}x
        </Text>
      </View>

      <View style={styles.optionsRow}>
        {SPEED_OPTIONS.map((opt) => {
          const isActive = selectedSpeed === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.speedBtn, isActive && styles.speedBtnActive]}
              onPress={() => onSpeedChange(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.speedLabel, isActive && styles.speedLabelActive]}>
                {opt.label}
              </Text>
              <Text style={[styles.speedDesc, isActive && styles.speedDescActive]}>
                {opt.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Ghi chú */}
      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          💡 Tốc độ sẽ được áp dụng cho cả hình ảnh và âm thanh khi xuất video.
          {selectedSpeed !== 1 && (
            selectedSpeed < 1
              ? ' Video sẽ chậm hơn và dài hơn.'
              : ' Video sẽ nhanh hơn và ngắn hơn.'
          )}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 13,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  speedBtn: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  speedBtnActive: {
    borderColor: '#FF3B30',
    backgroundColor: '#2a1a1a',
  },
  speedLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  speedLabelActive: {
    color: '#FF3B30',
  },
  speedDesc: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
  },
  speedDescActive: {
    color: '#FF8A80',
  },
  noteContainer: {
    marginTop: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
  },
  noteText: {
    color: '#999',
    fontSize: 12,
    lineHeight: 18,
  },
});
