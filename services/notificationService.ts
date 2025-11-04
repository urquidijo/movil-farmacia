import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configuración del comportamiento de las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,  // Mostrar alerta
    shouldPlaySound: true,  // Reproducir sonido
    shouldSetBadge: true,   // Actualizar badge
  }),
});

/**
 * Solicita permisos de notificaciones al usuario
 * @returns El token de push si se concedieron permisos, null si no
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Solo funciona en dispositivos físicos para iOS, en Android funciona en emulador también
  if (Device.isDevice) {
    // Verificar si ya tenemos permisos
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Si no tenemos permisos, solicitarlos
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Si no se concedieron permisos, retornar null
    if (finalStatus !== 'granted') {
      console.log('❌ Permisos de notificaciones denegados');
      return null;
    }

    // Obtener el token de push
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        console.error('❌ No se encontró el projectId en la configuración');
        return null;
      }

      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      token = pushTokenData.data;
      console.log('✅ Push Token obtenido:', token);
    } catch (error) {
      console.error('❌ Error al obtener el push token:', error);
      return null;
    }
  } else {
    console.log('⚠️ Debes usar un dispositivo físico para notificaciones push en iOS');
    console.log('ℹ️ Para Android, las notificaciones funcionan en emulador también');
  }

  // Configurar canal de notificación para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
    });
  }

  return token;
}

/**
 * Envía una notificación local de prueba (no requiere backend)
 * @param title Título de la notificación
 * @param body Mensaje de la notificación
 * @param data Datos adicionales (opcional)
 * @param delayInSeconds Retraso en segundos antes de mostrar (por defecto: 1)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  delayInSeconds: number = 1
): Promise<string> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      vibrate: [0, 250, 250, 250],
    },
    trigger: {
      seconds: delayInSeconds,
    },
  });

  console.log('📬 Notificación local programada con ID:', notificationId);
  return notificationId;
}

/**
 * Envía una notificación local inmediata (0 segundos de retraso)
 * @param title Título de la notificación
 * @param body Mensaje de la notificación
 * @param data Datos adicionales (opcional)
 */
export async function sendImmediateNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<string> {
  return scheduleLocalNotification(title, body, data, 0);
}

/**
 * Cancela todas las notificaciones programadas
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('🗑️ Todas las notificaciones programadas canceladas');
}

/**
 * Cancela una notificación específica por su ID
 * @param notificationId ID de la notificación a cancelar
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
  console.log('🗑️ Notificación cancelada:', notificationId);
}

/**
 * Verifica el estado de los permisos de notificaciones
 * @returns true si tiene permisos, false si no
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Listener para notificaciones recibidas cuando la app está en primer plano
 * @param callback Función a ejecutar cuando se recibe una notificación
 * @returns Subscription que se puede desuscribir
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Listener para cuando el usuario toca una notificación
 * @param callback Función a ejecutar cuando se toca una notificación
 * @returns Subscription que se puede desuscribir
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Obtiene todas las notificaciones programadas
 * @returns Array de notificaciones programadas
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Limpia el badge de la app (contador de notificaciones)
 */
export async function clearBadgeCount(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
  console.log('🔔 Badge count limpiado');
}

/**
 * Establece el badge count
 * @param count Número a mostrar en el badge
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
  console.log('🔔 Badge count actualizado:', count);
}
