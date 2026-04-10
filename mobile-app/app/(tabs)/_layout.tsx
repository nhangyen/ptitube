import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Home, Compass, Plus, Bell, User, ShieldAlert } from 'lucide-react-native';
import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';

function CreateTabButton(props: any) {
  const router = useRouter();
  const { style, ...rest } = props;

  return (
    <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
      <TouchableOpacity
        {...rest}
        className="absolute top-[-24px] items-center justify-center rounded-full w-14 h-14 bg-primary-dim border-[3px] border-surface"
        onPress={() => router.push('/create')}
        activeOpacity={0.85}
      >
        <View className="items-center justify-center rounded-full w-full h-full bg-primary-dim shadow-[0_12px_40px_rgba(255,140,149,0.5)]">
          <Plus size={28} color="#23020f" strokeWidth={3} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

function NotificationsTabIcon({ color, unreadCount }: { color: string; unreadCount: number }) {
  return (
    <View className="items-center justify-center relative">
      <Bell size={24} color={color} />
      {unreadCount > 0 ? (
        <View className="absolute -top-1 -right-2 bg-secondary rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border border-surface">
          <Text className="text-surface text-[10px] font-label leading-[12px]">{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const isModerator = user?.role === 'admin' || user?.role === 'moderator';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#29fcf3',
        tabBarInactiveTintColor: '#4e1b30',
        tabBarBackground: () => (
          <BlurView 
            intensity={20} 
            tint="dark" 
            style={{ 
              flex: 1, 
              backgroundColor: 'rgba(43, 4, 20, 0.8)', // surface-container-low
            }} 
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          backgroundColor: 'transparent',
        },
        tabBarLabelStyle: {
          fontFamily: 'BeVietnamPro-Medium',
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <Home size={24} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <Compass size={24} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="action"
        options={{
          title: '',
          tabBarButton: CreateTabButton,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <NotificationsTabIcon color={color} unreadCount={unreadCount} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="moderation"
        options={{
          title: 'Moderate',
          tabBarIcon: ({ color }) => <ShieldAlert size={24} color={color} strokeWidth={2.5} />,
          href: null,
        }}
      />
    </Tabs>
  );
}
