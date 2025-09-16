import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración de URL del backend
const getBaseURL = () => {
  // Para desarrollo
  if (__DEV__) {
    // Para testing web: usar localhost
    if (typeof window !== 'undefined') {
      return 'http://localhost:3001';
    }
    // Para móvil: usar IP local (para que tus compañeros puedan testear)
    return 'http://192.168.26.3:3001';
  }
  // Para producción
  return 'https://tu-backend-produccion.com';
};

const BASE_URL = getBaseURL();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Interceptor para agregar token a las requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  user: User;
}

// Servicios de autenticación
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      // Intentar hacer logout en el servidor
      await api.post('/auth/logout');
      console.log('Logout del servidor exitoso');
    } catch (error) {
      // Si falla el logout del servidor, seguimos adelante
      console.warn('Error en logout del servidor:', error);
    }
    // El AuthContext se encarga de limpiar el storage local
  },
};

// Funciones de storage
export const storage = {
  saveToken: async (token: string) => {
    await AsyncStorage.setItem('access_token', token);
  },

  getToken: async (): Promise<string | null> => {
    return await AsyncStorage.getItem('access_token');
  },

  saveUser: async (user: User) => {
    await AsyncStorage.setItem('user', JSON.stringify(user));
  },

  getUser: async (): Promise<User | null> => {
    const userData = await AsyncStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },

  clearAll: async () => {
    try {
      console.log('🗑️ Limpiando AsyncStorage...');

      // Primero, ver qué hay en el storage
      const tokenBefore = await AsyncStorage.getItem('access_token');
      const userBefore = await AsyncStorage.getItem('user');
      console.log('Antes de limpiar - Token:', !!tokenBefore, 'User:', !!userBefore);

      // Limpiar de forma individual (más confiable)
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('user');

      // FUERZA ADICIONAL: En web, también limpiar localStorage directamente
      if (typeof window !== 'undefined' && window.localStorage) {
        console.log('🌐 Limpiando localStorage directamente (web)...');
        window.localStorage.removeItem('access_token');
        window.localStorage.removeItem('user');
      }

      // Verificar que se limpió correctamente
      const tokenAfter = await AsyncStorage.getItem('access_token');
      const userAfter = await AsyncStorage.getItem('user');
      console.log('Después de limpiar - Token:', tokenAfter, 'User:', userAfter);

      // Verificación adicional en web
      if (typeof window !== 'undefined' && window.localStorage) {
        const webToken = window.localStorage.getItem('access_token');
        const webUser = window.localStorage.getItem('user');
        console.log('Web localStorage - Token:', webToken, 'User:', webUser);
      }

      if (tokenAfter === null && userAfter === null) {
        console.log('✅ Storage limpiado correctamente');
      } else {
        console.warn('⚠️ El storage no se limpió completamente, forzando limpieza completa...');

        // ÚLTIMA OPCIÓN: Limpiar TODO el AsyncStorage
        await AsyncStorage.clear();
        console.log('💥 AsyncStorage completamente limpiado');
      }
    } catch (error) {
      console.error('❌ Error limpiando storage:', error);
      // EMERGENCIA: Limpiar todo
      try {
        await AsyncStorage.clear();
        console.log('🚨 Limpieza de emergencia: AsyncStorage vaciado completamente');
      } catch (emergencyError) {
        console.error('💀 Error crítico en limpieza de emergencia:', emergencyError);
      }
    }
  },
};

export default api;