import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useFonts, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { BeVietnamPro_400Regular, BeVietnamPro_500Medium } from '@expo-google-fonts/be-vietnam-pro';
import 'react-native-reanimated';
import '../global.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'BeVietnamPro-Regular': BeVietnamPro_400Regular,
    'BeVietnamPro-Medium': BeVietnamPro_500Medium,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

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
