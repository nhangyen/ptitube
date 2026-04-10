import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

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
    <View className="flex-row flex-wrap">
      {hashtags.map((tag) => (
        <TouchableOpacity
          key={tag}
          className={`justify-center items-center mr-2 mb-2 ${compact ? 'px-2 py-1' : 'px-3 py-1.5'} rounded-full bg-white/20 blur-xl`}
          onPress={() => onPress?.(tag)}
          disabled={!onPress}
        >
          <Text className={`text-white font-label font-bold text-shadow-sm ${compact ? 'text-[10px]' : 'text-xs'}`} numberOfLines={1}>
            #{tag}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
