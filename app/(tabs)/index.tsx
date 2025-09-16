import { Image } from 'expo-image';
import { Platform, StyleSheet, TouchableOpacity, Alert, View, Text, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading]);

  const handleLogout = async () => {
    try {
      console.log('🚪 Ejecutando logout...');
      await logout();
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="medical" size={60} color="#10b981" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getCurrentTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(user?.firstName || '', user?.lastName || '')}
                </Text>
              </View>
            </View>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>{getCurrentTime()}</Text>
              <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutIcon, isLoggingOut && styles.logoutIconDisabled]}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="log-out-outline" size={24} color="#10b981" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tarjetas de información */}
      <View style={styles.content}>
        <View style={styles.cardGrid}>
          {/* Tarjeta de perfil */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-outline" size={24} color="#10b981" />
              <Text style={styles.cardTitle}>Mi Perfil</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nombre completo:</Text>
                <Text style={styles.infoValue}>{user?.firstName} {user?.lastName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Correo electrónico:</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>ID de usuario:</Text>
                <Text style={styles.infoValue}>#{user?.id}</Text>
              </View>
            </View>
          </View>

          {/* Tarjeta de estado */}
          <View style={styles.statusCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
              <Text style={[styles.cardTitle, { color: '#fff' }]}>Estado</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.statusText}>Sesión Activa</Text>
              <Text style={styles.statusSubtext}>
                Conectado desde {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Tarjeta de acciones */}
          <View style={styles.actionCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="settings-outline" size={24} color="#10b981" />
              <Text style={styles.cardTitle}>Acciones</Text>
            </View>
            <View style={styles.cardContent}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="refresh-outline" size={20} color="#10b981" />
                <Text style={styles.actionButtonText}>Actualizar datos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Botón de cerrar sesión */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    color: '#000000',
    fontSize: 18,
    marginTop: 20,
    fontWeight: '600',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: '#10b981',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
  },
  avatarText: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: 'bold',
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  userEmail: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 2,
    opacity: 0.8,
  },
  logoutIcon: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#000000',
  },
  content: {
    padding: 20,
    marginTop: -20,
  },
  cardGrid: {
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
  },
  statusCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#000000',
  },
  actionCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#374151',
  },
  cardContent: {
    gap: 8,
  },
  infoRow: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    marginTop: 2,
  },
  statusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusSubtext: {
    color: '#d1fae5',
    fontSize: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#000000',
    padding: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#000000',
    marginLeft: 8,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 30,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#000000',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
