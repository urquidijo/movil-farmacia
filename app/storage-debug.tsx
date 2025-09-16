import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function StorageDebugScreen() {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { user, logout } = useAuth();

  const analyzeStorage = async () => {
    let info = '🔍 ANÁLISIS COMPLETO DEL STORAGE\n\n';

    try {
      // 1. AsyncStorage
      info += '📱 AsyncStorage:\n';
      const asyncToken = await AsyncStorage.getItem('access_token');
      const asyncUser = await AsyncStorage.getItem('user');
      info += `  - access_token: ${asyncToken ? 'EXISTS' : 'NULL'}\n`;
      info += `  - user: ${asyncUser ? 'EXISTS' : 'NULL'}\n\n`;

      // 2. localStorage (si estamos en web)
      if (typeof window !== 'undefined' && window.localStorage) {
        info += '🌐 localStorage:\n';
        const localToken = window.localStorage.getItem('access_token');
        const localUser = window.localStorage.getItem('user');
        info += `  - access_token: ${localToken ? 'EXISTS' : 'NULL'}\n`;
        info += `  - user: ${localUser ? 'EXISTS' : 'NULL'}\n\n`;

        // Ver TODO el localStorage
        info += '🗂️ TODO el localStorage:\n';
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            const value = window.localStorage.getItem(key);
            info += `  - ${key}: ${value ? 'HAS_VALUE' : 'NULL'}\n`;
          }
        }
        info += '\n';
      }

      // 3. sessionStorage (si estamos en web)
      if (typeof window !== 'undefined' && window.sessionStorage) {
        info += '💾 sessionStorage:\n';
        const sessionToken = window.sessionStorage.getItem('access_token');
        const sessionUser = window.sessionStorage.getItem('user');
        info += `  - access_token: ${sessionToken ? 'EXISTS' : 'NULL'}\n`;
        info += `  - user: ${sessionUser ? 'EXISTS' : 'NULL'}\n\n`;
      }

      // 4. Estado actual del contexto
      info += '🔄 Estado del AuthContext:\n';
      info += `  - user: ${user ? 'LOGGED IN' : 'NULL'}\n`;
      info += `  - email: ${user?.email || 'N/A'}\n\n`;

      // 5. Todos los keys de AsyncStorage
      info += '🔑 TODOS los keys en AsyncStorage:\n';
      const allKeys = await AsyncStorage.getAllKeys();
      info += `  Total keys: ${allKeys.length}\n`;
      for (const key of allKeys) {
        const value = await AsyncStorage.getItem(key);
        info += `  - ${key}: ${value ? 'HAS_VALUE' : 'NULL'}\n`;
      }

      setDebugInfo(info);
    } catch (error) {
      setDebugInfo(`❌ Error analizando storage: ${error}`);
    }
  };

  const nukeEverything = async () => {
    Alert.alert(
      '💥 LIMPIAR TODO',
      '¿Eliminar ABSOLUTAMENTE TODO del storage?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'SÍ, ELIMINAR TODO',
          style: 'destructive',
          onPress: async () => {
            try {
              // AsyncStorage
              await AsyncStorage.clear();

              // localStorage
              if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.clear();
              }

              // sessionStorage
              if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.clear();
              }

              Alert.alert('✅ TODO ELIMINADO', 'Refresca la página');
            } catch (error) {
              Alert.alert('❌ Error', `No se pudo limpiar: ${error}`);
            }
          },
        },
      ]
    );
  };

  const testLogout = async () => {
    try {
      console.log('🧪 TEST LOGOUT - ANTES:');
      await analyzeStorage();

      console.log('🚪 Ejecutando logout...');
      await logout();

      console.log('🧪 TEST LOGOUT - DESPUÉS:');
      setTimeout(analyzeStorage, 1000); // Dar tiempo para que se complete
    } catch (error) {
      console.error('Error en test logout:', error);
    }
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>🕵️ Storage Detective</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={analyzeStorage}>
          <Text style={styles.buttonText}>🔍 Analizar Storage</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testLogout}>
          <Text style={styles.buttonText}>🧪 Test Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={nukeEverything}>
          <Text style={styles.buttonText}>💥 ELIMINAR TODO</Text>
        </TouchableOpacity>

        {debugInfo ? (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>{debugInfo}</Text>
          </View>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.7)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    lineHeight: 18,
  },
});