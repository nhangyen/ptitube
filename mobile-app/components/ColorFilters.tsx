/**
 * ColorFilters — Bộ lọc màu cơ bản cho video
 *
 * 5 preset màu + "Gốc":
 * - Gốc (không filter)
 * - Trắng Đen
 * - Đậm Đà
 * - Mùa Thu
 * - Cổ Điển
 * - Mát Lạnh
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ======================== TYPES ========================

export interface FilterPreset {
  id: string;
  name: string;
  icon: string;
  /** FFmpeg filter string — rỗng = không filter */
  ffmpegFilter: string;
  /** Mô tả ngắn */
  description: string;
  /** CSS-like tint color for preview thumbnail */
  previewTint: string;
}

// ======================== PRESETS ========================

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'none',
    name: 'Gốc',
    icon: '🎞️',
    ffmpegFilter: '',
    description: 'Không áp dụng bộ lọc',
    previewTint: 'transparent',
  },
  {
    id: 'grayscale',
    name: 'Trắng Đen',
    icon: '⬛',
    ffmpegFilter: 'hue=s=0',
    description: 'Loại bỏ toàn bộ màu sắc',
    previewTint: '#888888',
  },
  {
    id: 'vivid',
    name: 'Đậm Đà',
    icon: '🌈',
    ffmpegFilter: 'eq=saturation=1.5:contrast=1.2',
    description: 'Tăng độ bão hòa và tương phản',
    previewTint: '#FF6B6B',
  },
  {
    id: 'autumn',
    name: 'Mùa Thu',
    icon: '🍂',
    ffmpegFilter: 'colorbalance=rs=0.15:gs=-0.05:bs=-0.15,eq=saturation=1.3',
    description: 'Tông ấm, cam vàng',
    previewTint: '#D4A574',
  },
  {
    id: 'vintage',
    name: 'Cổ Điển',
    icon: '📷',
    ffmpegFilter: 'curves=vintage',
    description: 'Hiệu ứng phim cũ',
    previewTint: '#C4A882',
  },
  {
    id: 'cool',
    name: 'Mát Lạnh',
    icon: '❄️',
    ffmpegFilter: 'colorbalance=rs=-0.1:gs=0.05:bs=0.2,eq=brightness=0.05',
    description: 'Tông xanh lạnh, sáng nhẹ',
    previewTint: '#7EB8DA',
  },
];

// ======================== COMPONENT ========================

interface ColorFiltersProps {
  selectedFilterId: string;
  onFilterChange: (filterId: string) => void;
}

export default function ColorFilters({
  selectedFilterId,
  onFilterChange,
}: ColorFiltersProps) {
  const ITEM_SIZE = (SCREEN_WIDTH - 48) / 3.5;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎨 Bộ lọc màu</Text>
        {selectedFilterId !== 'none' && (
          <TouchableOpacity onPress={() => onFilterChange('none')}>
            <Text style={styles.resetBtn}>Bỏ lọc</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTER_PRESETS.map((preset) => {
          const isActive = selectedFilterId === preset.id;
          return (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.filterItem,
                { width: ITEM_SIZE },
                isActive && styles.filterItemActive,
              ]}
              onPress={() => onFilterChange(preset.id)}
              activeOpacity={0.7}
            >
              {/* Thumbnail preview */}
              <View
                style={[
                  styles.filterThumb,
                  {
                    width: ITEM_SIZE - 16,
                    height: ITEM_SIZE - 16,
                    backgroundColor: preset.previewTint === 'transparent' ? '#333' : preset.previewTint,
                  },
                  isActive && styles.filterThumbActive,
                ]}
              >
                <Text style={styles.filterIcon}>{preset.icon}</Text>
                {isActive && (
                  <View style={styles.activeIndicator}>
                    <Text style={styles.activeCheck}>✓</Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.filterName, isActive && styles.filterNameActive]}
                numberOfLines={1}
              >
                {preset.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Mô tả filter đang chọn */}
      {selectedFilterId !== 'none' && (
        <View style={styles.descContainer}>
          <Text style={styles.descText}>
            {FILTER_PRESETS.find((f) => f.id === selectedFilterId)?.description}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resetBtn: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterItem: {
    alignItems: 'center',
    padding: 4,
  },
  filterItemActive: {},
  filterThumb: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  filterThumbActive: {
    borderColor: '#FF3B30',
  },
  filterIcon: {
    fontSize: 28,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCheck: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterName: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  filterNameActive: {
    color: '#FF3B30',
    fontWeight: '700',
  },
  descContainer: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 10,
  },
  descText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
});
