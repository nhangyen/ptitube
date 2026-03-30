import { Tabs } from 'expo-router';
import { useRouter } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Nút "Tạo" tròn ở giữa tab bar — mở fullscreen Create flow
 */
function CreateTabButton({ children, ...props }: any) {
  const router = useRouter();

  return (
    <TouchableOpacity
      {...props}
      style={styles.createButtonContainer}
      onPress={() => router.push('/create')}
      activeOpacity={0.8}
    >
      <View style={styles.createButton}>
        <IconSymbol size={30} name="plus" color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#222',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="play.rectangle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="action"
        options={{
          title: 'Tạo',
          tabBarButton: CreateTabButton,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.crop.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Thống kê',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createButtonContainer: {
    top: -15,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
