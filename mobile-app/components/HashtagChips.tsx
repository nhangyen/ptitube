import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  if (!hashtags.length) {
    return null;
  }

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {hashtags.map((tag) => (
        <TouchableOpacity
          key={tag}
          style={[styles.chip, compact && styles.compactChip]}
          onPress={() => onPress?.(tag)}
          disabled={!onPress}
        >
          <Text style={[styles.label, compact && styles.compactLabel]}>#{tag}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  compactContainer: {
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 59, 48, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.26)',
  },
  compactChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    color: '#ffd5d1',
    fontSize: 12,
    fontWeight: '600',
  },
  compactLabel: {
    fontSize: 11,
  },
});
