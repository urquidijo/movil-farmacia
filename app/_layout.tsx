import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '../contexts/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Componente interno para manejar navegación de notificaciones
function NotificationHandler() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Listener para cuando el usuario toca una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        console.log('👆 Usuario tocó notificación:', data);

        // Navegar según el tipo de notificación
        if (data && data.screen) {
          switch (data.screen) {
            case 'invoices':
              // Navegar a la pantalla de facturas
              router.push('/(tabs)/invoices');
              break;
            case 'cart':
              // Navegar al carrito
              router.push('/(tabs)/explore');
              break;
            case 'home':
              // Navegar a productos
              router.push('/(tabs)/');
              break;
            default:
              console.log('Pantalla desconocida:', data.screen);
          }
        }
      }
    );

    // Limpiar listeners al desmontar
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <NotificationHandler />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="debug" options={{ headerShown: false }} />
          <Stack.Screen name="storage-debug" options={{ headerShown: false }} />
          <Stack.Screen name="test-notifications" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
