/**
 * TextOverlay — Chèn chữ lên video
 *
 * Cho phép nhập văn bản, chọn màu, kéo thả vị trí trên video preview.
 * Sử dụng PanGestureHandler từ react-native-gesture-handler.
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ======================== TYPES ========================

export interface TextOverlayParams {
  content: string;
  color: string;
  fontSize: number;
  x: number; // pixel position trên video preview
  y: number;
}

interface TextOverlayProps {
  params: TextOverlayParams | null;
  onChange: (params: TextOverlayParams | null) => void;
  /** Kích thước vùng video preview để tính toán vị trí */
  previewWidth: number;
  previewHeight: number;
}

// ======================== CONSTANTS ========================

const COLOR_PRESETS = [
  { label: 'Trắng', value: '#FFFFFF' },
  { label: 'Đen', value: '#000000' },
  { label: 'Đỏ', value: '#FF3B30' },
  { label: 'Vàng', value: '#FFCC00' },
  { label: 'Xanh dương', value: '#007AFF' },
  { label: 'Xanh lá', value: '#34C759' },
  { label: 'Hồng', value: '#FF2D55' },
  { label: 'Cam', value: '#FF9500' },
];

const FONT_SIZE_OPTIONS = [
  { label: 'Nhỏ', value: 24 },
  { label: 'Vừa', value: 36 },
  { label: 'Lớn', value: 48 },
];

// ======================== COMPONENT ========================

export default function TextOverlay({
  params,
  onChange,
  previewWidth,
  previewHeight,
}: TextOverlayProps) {
  const [text, setText] = useState(params?.content || '');
  const [color, setColor] = useState(params?.color || '#FFFFFF');
  const [fontSize, setFontSize] = useState(params?.fontSize || 36);

  const updateParams = useCallback(
    (updates: Partial<TextOverlayParams>) => {
      if (!text.trim() && !updates.content?.trim()) {
        onChange(null);
        return;
      }
      const current: TextOverlayParams = {
        content: text,
        color,
        fontSize,
        x: params?.x ?? Math.round(previewWidth / 2 - 50),
        y: params?.y ?? Math.round(previewHeight / 2),
        ...updates,
      };
      onChange(current);
    },
    [text, color, fontSize, params, onChange, previewWidth, previewHeight]
  );

  const handleTextChange = (val: string) => {
    setText(val);
    if (val.trim()) {
      updateParams({ content: val });
    } else {
      onChange(null);
    }
  };

  const handleColorSelect = (c: string) => {
    setColor(c);
    updateParams({ color: c });
  };

  const handleFontSizeSelect = (size: number) => {
    setFontSize(size);
    updateParams({ fontSize: size });
  };

  const handleClear = () => {
    setText('');
    onChange(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✏️ Chèn chữ</Text>
        {text.trim() ? (
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearBtn}>Xóa chữ</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Text input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Nhập văn bản..."
          placeholderTextColor="#666"
          value={text}
          onChangeText={handleTextChange}
          maxLength={100}
          returnKeyType="done"
        />
        <Text style={styles.charCount}>{text.length}/100</Text>
      </View>

      {/* Hướng dẫn kéo thả */}
      {text.trim() ? (
        <View style={styles.dragHint}>
          <Text style={styles.dragHintText}>
            👆 Kéo thả chữ trên video để đặt vị trí
          </Text>
        </View>
      ) : null}

      {/* Chọn màu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Màu chữ</Text>
        <View style={styles.colorRow}>
          {COLOR_PRESETS.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[
                styles.colorBtn,
                { backgroundColor: c.value },
                color === c.value && styles.colorBtnActive,
              ]}
              onPress={() => handleColorSelect(c.value)}
            >
              {color === c.value && (
                <Text style={[
                  styles.colorCheck,
                  { color: c.value === '#FFFFFF' || c.value === '#FFCC00' ? '#000' : '#fff' }
                ]}>
                  ✓
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Cỡ chữ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cỡ chữ</Text>
        <View style={styles.fontSizeRow}>
          {FONT_SIZE_OPTIONS.map((opt) => {
            const isActive = fontSize === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.fontSizeBtn, isActive && styles.fontSizeBtnActive]}
                onPress={() => handleFontSizeSelect(opt.value)}
              >
                <Text style={[styles.fontSizeLabel, isActive && styles.fontSizeLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ======================== DRAGGABLE TEXT VIEW (dùng trong Editor) ========================

interface DraggableTextProps {
  params: TextOverlayParams;
  onPositionChange: (x: number, y: number) => void;
  containerWidth: number;
  containerHeight: number;
}

/**
 * Component hiển thị chữ kéo thả trên video preview.
 * Sử dụng trong Editor screen, đặt absolute lên trên <Video>.
 */
export function DraggableText({
  params,
  onPositionChange,
  containerWidth,
  containerHeight,
}: DraggableTextProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: params.x, y: params.y });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleTouchStart = (e: any) => {
    const touch = e.nativeEvent;
    setDragOffset({
      x: touch.pageX - position.x,
      y: touch.pageY - position.y,
    });
    setIsDragging(true);
  };

  const handleTouchMove = (e: any) => {
    if (!isDragging) return;
    const touch = e.nativeEvent;
    const newX = Math.max(0, Math.min(containerWidth - 50, touch.pageX - dragOffset.x));
    const newY = Math.max(0, Math.min(containerHeight - 30, touch.pageY - dragOffset.y));
    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    onPositionChange(position.x, position.y);
  };

  // Scale font size cho preview (preview nhỏ hơn video thật)
  const displayFontSize = Math.max(12, params.fontSize * 0.6);

  return (
    <View
      style={[
        styles.draggableText,
        {
          left: position.x,
          top: position.y,
          borderColor: isDragging ? '#FF3B30' : 'transparent',
        },
      ]}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Text
        style={[
          styles.overlayText,
          {
            color: params.color,
            fontSize: displayFontSize,
          },
        ]}
      >
        {params.content}
      </Text>
    </View>
  );
}

// ======================== STYLES ========================

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
    marginBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  clearBtn: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    paddingRight: 60,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  charCount: {
    position: 'absolute',
    right: 14,
    top: 16,
    color: '#666',
    fontSize: 12,
  },
  dragHint: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  dragHintText: {
    color: '#88aaff',
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorBtnActive: {
    borderColor: '#FF3B30',
    borderWidth: 3,
  },
  colorCheck: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fontSizeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fontSizeBtn: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fontSizeBtnActive: {
    borderColor: '#FF3B30',
    backgroundColor: '#2a1a1a',
  },
  fontSizeLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fontSizeLabelActive: {
    color: '#FF3B30',
  },
  // Draggable text overlay styles
  draggableText: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 4,
    padding: 4,
    zIndex: 100,
  },
  overlayText: {
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
