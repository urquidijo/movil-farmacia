import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotificationsAsync,
  scheduleLocalNotification,
  sendImmediateNotification,
  cancelAllScheduledNotifications,
  checkNotificationPermissions,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  clearBadgeCount,
  getAllScheduledNotifications,
} from '@/services/notificationService';
import { notificacionesAPI } from '@/services/api';

export default function TestNotificationsScreen() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [scheduledCount, setScheduledCount] = useState(0);

  useEffect(() => {
    // Registrar para notificaciones push
    registerForPushNotificationsAsync().then((token) => {
      setExpoPushToken(token);
      if (token) {
        setHasPermissions(true);
      }
    });

    // Verificar permisos
    checkNotificationPermissions().then(setHasPermissions);

    // Listener para notificaciones recibidas (app en primer plano)
    const notificationListener = addNotificationReceivedListener((notification) => {
      console.log('📬 Notificación recibida:', notification);
      setNotification(notification);
    });

    // Listener para cuando el usuario toca una notificación
    const responseListener = addNotificationResponseReceivedListener((response) => {
      console.log('👆 Usuario tocó la notificación:', response);
      const data = response.notification.request.content.data;

      // Aquí puedes navegar a diferentes pantallas según el data
      if (data && data.screen) {
        Alert.alert('Navegación', `Deberías navegar a: ${data.screen}`);
      }
    });

    // Actualizar contador de notificaciones programadas
    updateScheduledCount();

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const updateScheduledCount = async () => {
    const scheduled = await getAllScheduledNotifications();
    setScheduledCount(scheduled.length);
  };

  const handleRegisterNotifications = async () => {
    const token = await registerForPushNotificationsAsync();
    setExpoPushToken(token);
    setHasPermissions(!!token);

    if (token) {
      Alert.alert(
        '✅ Permisos concedidos',
        `Push Token obtenido:\n${token.substring(0, 50)}...`
      );
    } else {
      Alert.alert(
        '❌ Permisos denegados',
        'No se pudieron obtener los permisos de notificaciones'
      );
    }
  };

  const handleSendImmediateNotification = async () => {
    try {
      await sendImmediateNotification(
        '¡Notificación Inmediata!',
        'Esta notificación se muestra inmediatamente',
        { type: 'test', timestamp: Date.now() }
      );
      Alert.alert('✅ Enviado', 'Notificación inmediata enviada');
    } catch (error) {
      Alert.alert('❌ Error', `No se pudo enviar la notificación: ${error}`);
    }
  };

  const handleSchedule5Seconds = async () => {
    try {
      await scheduleLocalNotification(
        '⏰ Notificación Programada',
        'Esta notificación se programó para 5 segundos',
        { type: 'scheduled', delay: 5 },
        5
      );
      await updateScheduledCount();
      Alert.alert('✅ Programada', 'Notificación programada para 5 segundos');
    } catch (error) {
      Alert.alert('❌ Error', `No se pudo programar: ${error}`);
    }
  };

  const handleSchedule10Seconds = async () => {
    try {
      await scheduleLocalNotification(
        '⏰ Notificación Programada',
        'Esta notificación se programó para 10 segundos',
        { type: 'scheduled', delay: 10 },
        10
      );
      await updateScheduledCount();
      Alert.alert('✅ Programada', 'Notificación programada para 10 segundos');
    } catch (error) {
      Alert.alert('❌ Error', `No se pudo programar: ${error}`);
    }
  };

  const handlePaymentSuccessSimulation = async () => {
    try {
      await sendImmediateNotification(
        '💳 ¡Pago Exitoso!',
        'Tu pedido de $125.50 ha sido procesado correctamente',
        { type: 'payment', orderId: '12345', invoiceId: 'INV-001' }
      );
      Alert.alert('✅ Simulación', 'Notificación de pago exitoso enviada');
    } catch (error) {
      Alert.alert('❌ Error', `No se pudo enviar: ${error}`);
    }
  };

  const handleAbandonedCartSimulation = async () => {
    try {
      await sendImmediateNotification(
        '🛒 ¡Tienes productos esperándote!',
        'Tu carrito tiene 3 productos. ¡Completa tu compra!',
        { type: 'abandoned_cart', screen: 'cart' }
      );
      Alert.alert('✅ Simulación', 'Notificación de carrito abandonado enviada');
    } catch (error) {
      Alert.alert('❌ Error', `No se pudo enviar: ${error}`);
    }
  };

  const handleDailyReminderSimulation = async () => {
    try {
      await sendImmediateNotification(
        '🏥 ¡Buenos días!',
        'Descubre nuevos productos en nuestra farmacia',
        { type: 'daily_reminder', screen: 'home' }
      );
      Alert.alert('✅ Simulación', 'Notificación de recordatorio diario enviada');
    } catch (error) {
      Alert.alert('❌ Error', `No se pudo enviar: ${error}`);
    }
  };

  const handleCancelAll = async () => {
    try {
      await cancelAllScheduledNotifications();
      await updateScheduledCount();
      Alert.alert('✅ Canceladas', 'Todas las notificaciones programadas fueron canceladas');
    } catch (error) {
      Alert.alert('❌ Error', `No se pudo cancelar: ${error}`);
    }
  };

  const handleClearBadge = async () => {
    try {
      await clearBadgeCount();
      Alert.alert('✅ Badge limpiado', 'El contador de notificaciones se limpió');
    } catch (error) {
      Alert.alert('❌ Error', `No se pudo limpiar: ${error}`);
    }
  };

  const handleSendFromBackend = async () => {
    try {
      const result = await notificacionesAPI.sendTestNotification();
      Alert.alert(
        '✅ Enviado desde Backend',
        `Notificación enviada: ${result.sent} exitosa(s), ${result.errors.length} error(es)`
      );
    } catch (error: any) {
      Alert.alert('❌ Error', `No se pudo enviar desde el backend: ${error.message}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Test de Notificaciones</Text>
        <Text style={styles.subtitle}>
          Prueba las notificaciones push de la app
        </Text>
      </View>

      {/* Estado de permisos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Estado</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Permisos:</Text>
          <Text style={[styles.statusValue, hasPermissions ? styles.success : styles.error]}>
            {hasPermissions ? '✅ Concedidos' : '❌ Denegados'}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Plataforma:</Text>
          <Text style={styles.statusValue}>{Platform.OS}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Programadas:</Text>
          <Text style={styles.statusValue}>{scheduledCount}</Text>
        </View>
        {expoPushToken && (
          <View style={styles.tokenContainer}>
            <Text style={styles.statusLabel}>Push Token:</Text>
            <Text style={styles.tokenText} numberOfLines={3}>
              {expoPushToken}
            </Text>
          </View>
        )}
      </View>

      {/* Configuración inicial */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Configuración Inicial</Text>
        <TouchableOpacity style={styles.button} onPress={handleRegisterNotifications}>
          <Text style={styles.buttonText}>1. Solicitar Permisos y Registrar</Text>
        </TouchableOpacity>
      </View>

      {/* Notificaciones básicas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Pruebas Básicas</Text>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleSendImmediateNotification}
          disabled={!hasPermissions}
        >
          <Text style={styles.buttonText}>📬 Notificación Inmediata (Local)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSuccess]}
          onPress={handleSendFromBackend}
          disabled={!hasPermissions}
        >
          <Text style={styles.buttonText}>🚀 Notificación desde Backend</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleSchedule5Seconds}
          disabled={!hasPermissions}
        >
          <Text style={styles.buttonText}>⏰ Programar en 5 segundos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleSchedule10Seconds}
          disabled={!hasPermissions}
        >
          <Text style={styles.buttonText}>⏰ Programar en 10 segundos</Text>
        </TouchableOpacity>
      </View>

      {/* Simulaciones de notificaciones reales */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Simulaciones de Casos Reales</Text>

        <TouchableOpacity
          style={[styles.button, styles.buttonSuccess]}
          onPress={handlePaymentSuccessSimulation}
          disabled={!hasPermissions}
        >
          <Text style={styles.buttonText}>💳 Pago Exitoso</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonWarning]}
          onPress={handleAbandonedCartSimulation}
          disabled={!hasPermissions}
        >
          <Text style={styles.buttonText}>🛒 Carrito Abandonado</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonInfo]}
          onPress={handleDailyReminderSimulation}
          disabled={!hasPermissions}
        >
          <Text style={styles.buttonText}>🏥 Recordatorio Diario</Text>
        </TouchableOpacity>
      </View>

      {/* Utilidades */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛠️ Utilidades</Text>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={handleCancelAll}
        >
          <Text style={styles.buttonText}>🗑️ Cancelar Todas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleClearBadge}
        >
          <Text style={styles.buttonText}>🔔 Limpiar Badge</Text>
        </TouchableOpacity>
      </View>

      {/* Última notificación recibida */}
      {notification && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📬 Última Notificación</Text>
          <View style={styles.notificationBox}>
            <Text style={styles.notificationTitle}>
              {notification.request.content.title}
            </Text>
            <Text style={styles.notificationBody}>
              {notification.request.content.body}
            </Text>
            {notification.request.content.data && (
              <Text style={styles.notificationData}>
                Data: {JSON.stringify(notification.request.content.data, null, 2)}
              </Text>
            )}
          </View>
        </View>
      )}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
  },
  success: {
    color: '#34C759',
    fontWeight: 'bold',
  },
  error: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  tokenContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
  },
  tokenText: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#8E8E93',
  },
  buttonSuccess: {
    backgroundColor: '#34C759',
  },
  buttonWarning: {
    backgroundColor: '#FF9500',
  },
  buttonInfo: {
    backgroundColor: '#5AC8FA',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationBox: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  notificationData: {
    fontSize: 10,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
  },
});
