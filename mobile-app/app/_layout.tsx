import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <NotificationsProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="create" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="editor" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="preview" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="profile/[userId]" options={{ headerShown: false }} />
            <Stack.Screen name="profile/[userId]/followers" options={{ headerShown: false }} />
            <Stack.Screen name="profile/[userId]/following" options={{ headerShown: false }} />
            <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="hashtag/[tag]" options={{ headerShown: false }} />
            <Stack.Screen name="video/[videoId]" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}
