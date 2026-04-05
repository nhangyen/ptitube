import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function CreateTabButton(props: any) {
  const router = useRouter();

  return (
    <TouchableOpacity
      {...props}
      style={styles.createButtonContainer}
      onPress={() => router.push('/create')}
      activeOpacity={0.85}
    >
      <View style={styles.createButton}>
        <IconSymbol size={30} name="plus" color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

function NotificationsTabIcon({ color, unreadCount }: { color: string; unreadCount: number }) {
  return (
    <View style={styles.tabIconWrap}>
      <IconSymbol size={24} name="bell.fill" color={color} />
      {unreadCount > 0 ? (
        <View style={styles.tabBadge}>
          <Text style={styles.tabBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const isModerator = user?.role === 'admin' || user?.role === 'moderator';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#222',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="play.rectangle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="action"
        options={{
          title: 'Create',
          tabBarButton: CreateTabButton,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color }) => <NotificationsTabIcon color={color} unreadCount={unreadCount} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.crop.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="moderation"
        options={{
          title: 'Moderate',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="shield.fill" color={color} />,
          href: isModerator ? undefined : null,
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
  tabIconWrap: {
    width: 30,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -7,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#000',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
});
