import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}

export default function ScreenHeader({ title, subtitle, onBack, rightSlot }: ScreenHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={!onBack}>
          <Text style={styles.backText}>{onBack ? 'Back' : ''}</Text>
        </TouchableOpacity>
        <View style={styles.rightSlot}>{rightSlot}</View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    minWidth: 56,
    paddingVertical: 8,
  },
  backText: {
    color: '#ff8f87',
    fontSize: 14,
    fontWeight: '700',
  },
  rightSlot: {
    minWidth: 56,
    alignItems: 'flex-end',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
  },
});
