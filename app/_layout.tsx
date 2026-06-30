import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { LocationProvider } from '../context/LocationContext';
import { AlertProvider } from '../context/AlertContext';
import GlobalNotificationListener from '../components/GlobalNotificationListener';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <GlobalNotificationListener />
        <AlertProvider>
          <LocationProvider>
            <CartProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack screenOptions={{ headerShown: false }} />
                <StatusBar style="auto" />
              </ThemeProvider>
            </CartProvider>
          </LocationProvider>
        </AlertProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
