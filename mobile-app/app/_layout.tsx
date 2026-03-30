import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen
            name="create"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="camera"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="editor"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="preview"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  );
}
