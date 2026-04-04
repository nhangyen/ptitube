import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HashtagChipsProps {
  hashtags?: string[];
  onPress?: (tag: string) => void;
  compact?: boolean;
}

export default function HashtagChips({
  hashtags = [],
  onPress,
  compact = false,
}: HashtagChipsProps) {
  if (!hashtags.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.container, compact && styles.compactContainer]}
      contentContainerStyle={{ paddingRight: 24 }}
    >
      {hashtags.map((tag) => (
        <TouchableOpacity
          key={tag}
          style={[styles.chip, compact && styles.compactChip]}
          onPress={() => onPress?.(tag)}
          disabled={!onPress}
        >
          <Text style={[styles.label, compact && styles.compactLabel]} numberOfLines={1}>#{tag}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    marginTop: 12,
    maxHeight: 60,
  },
  compactContainer: {
    marginTop: 8,
    maxHeight: 48,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12, // Increased tap target (min 48 h)
    borderRadius: 48, // xl rounding (3rem)
    backgroundColor: '#2b0414', // surface-container-low (NO BORDERS)
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48, // 3rem minimum
    marginRight: 12,
    maxWidth: 200,
  },
  compactChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36, // fallback for compact
    borderRadius: 36,
    maxWidth: 150,
  },
  label: {
    color: '#f3ffca', // Tertiary - Trending / Accent pops
    fontSize: 14, // label-sm/body-md
    fontWeight: '700',
  },
  compactLabel: {
    fontSize: 12,
  },
});
