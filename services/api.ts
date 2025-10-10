import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración de URL del backend
const getBaseURL = () => {
  // Para desarrollo
  if (__DEV__) {
    // Detectar si estamos en web (Expo Web tiene window y document)
    const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

    if (isWeb) {
      // En web, usar localhost
      return 'http://localhost:3001';
    }

    // Para móvil (iOS/Android): SIEMPRE usar el backend desplegado
    return 'https://backend-farmacia-production.up.railway.app';
  }
  // Para producción
  return 'https://backend-farmacia-production.up.railway.app';
};

const BASE_URL = getBaseURL();

// Log para debugging
console.log('🔧 API Base URL:', BASE_URL);
console.log('🔧 Environment:', __DEV__ ? 'Development' : 'Production');

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // Aumentado a 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las requests
api.interceptors.request.use(
  async (config) => {
    console.log('📡 Request:', config.method?.toUpperCase(), config.url);
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Token incluido en request');
    }
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.config.url, '- Status:', response.status);
    return response;
  },
  async (error) => {
    console.error('❌ Response error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);

      if (error.response.status === 401) {
        // Token expirado o inválido
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user');
      }
    } else if (error.request) {
      console.error('   No response received');
      console.error('   Request:', error.request);
    } else {
      console.error('   Error setting up request:', error.message);
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

// Interfaces adicionales
export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  imageUrl?: string;
  marca: { nombre: string };
  categoria: { nombre: string };
  activo: boolean;
}

export interface Categoria {
  id: number;
  nombre: string;
}

export interface CarritoItem {
  id: number;
  cantidad: number;
  producto: {
    id: number;
    nombre: string;
    precio: number;
    imageUrl?: string;
    marca: { nombre: string };
  };
}

// Servicios de autenticación
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      // Intentar hacer logout en el servidor
      await api.post('/api/auth/logout');
      console.log('Logout del servidor exitoso');
    } catch (error) {
      // Si falla el logout del servidor, seguimos adelante
      console.warn('Error en logout del servidor:', error);
    }
    // El AuthContext se encarga de limpiar el storage local
  },
};

// Servicios de productos (públicos)
export const productosAPI = {
  getAll: async (params?: { categoria?: string; q?: string; limit?: number }): Promise<Producto[]> => {
    const queryParams = new URLSearchParams();
    if (params?.categoria) queryParams.append('categoria', params.categoria);
    if (params?.q) queryParams.append('q', params.q);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get(`/api/public/productos?${queryParams.toString()}`);
    return response.data;
  },
};

// Servicios de categorías (públicas)
export const categoriasAPI = {
  getAll: async (): Promise<Categoria[]> => {
    const response = await api.get('/api/public/categorias');
    return response.data;
  },
};

// Servicios de carrito (requieren autenticación)
export const carritoAPI = {
  get: async (): Promise<CarritoItem[]> => {
    const response = await api.get('/api/carrito');
    return response.data;
  },

  add: async (productoId: number, cantidad: number = 1): Promise<CarritoItem> => {
    const response = await api.post('/api/carrito', { productoId, cantidad });
    return response.data;
  },

  update: async (itemId: number, cantidad: number): Promise<CarritoItem> => {
    const response = await api.patch(`/api/carrito/${itemId}`, { cantidad });
    return response.data;
  },

  remove: async (itemId: number): Promise<void> => {
    await api.delete(`/api/carrito/${itemId}`);
  },

  clear: async (): Promise<void> => {
    await api.delete('/api/carrito');
  },

  checkout: async (): Promise<any> => {
    const response = await api.post('/api/carrito/checkout');
    return response.data;
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
      console.log(' Limpiando AsyncStorage...');

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