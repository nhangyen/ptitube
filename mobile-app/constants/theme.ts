/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
  // The Immersive Pulse Design System Colors
  system: {
    surface: '#23020f',  // Background
    surfaceContainerLow: '#2b0414',
    surfaceContainerHigh: '#3e0d21',
    surfaceContainerHighest: '#4a1129',
    primary: '#ff8c95',
    primaryDim: '#e80048',
    primaryFixedDim: '#ff576e', // Pulse glow
    onPrimary: '#64001a',
    secondary: '#29fcf3',
    tertiary: '#f3ffca',
    outlineVariant: '#693949',
  }
};

export const Fonts = Platform.select({
  ios: {
    display: 'Plus Jakarta Sans',
    body: 'Be Vietnam Pro',
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    display: 'Plus Jakarta Sans',
    body: 'Be Vietnam Pro',
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    display: "'Plus Jakarta Sans', sans-serif",
    body: "'Be Vietnam Pro', sans-serif",
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
