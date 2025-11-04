import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { authAPI, storage, User, LoginCredentials, notificacionesAPI } from '../services/api';
import { registerForPushNotificationsAsync } from '../services/notificationService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Verificar si hay sesión guardada al iniciar la app
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        console.log('🔍 Verificando estado de autenticación...');
        const token = await storage.getToken();
        const savedUser = await storage.getUser();

        console.log('Token encontrado:', !!token);
        console.log('Usuario guardado:', !!savedUser);

        if (token && savedUser) {
          console.log('✅ Restaurando sesión para:', savedUser.email);
          setUser(savedUser);
        } else {
          console.log('❌ No hay sesión guardada');
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        // Limpiar datos corruptos
        await storage.clearAll();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthState();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(credentials);

      // Guardar token y datos del usuario
      await storage.saveToken(response.access_token);
      await storage.saveUser(response.user);

      setUser(response.user);

      // Registrar token de notificaciones push (no bloquear el login si falla)
      registerPushToken().catch((error) => {
        console.warn('⚠️ No se pudo registrar el token de notificaciones:', error.message);
      });
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Registra el token de notificaciones push en el backend
   */
  const registerPushToken = async () => {
    try {
      console.log('📱 Registrando token de notificaciones...');

      // Obtener el token de Expo
      const expoPushToken = await registerForPushNotificationsAsync();

      if (!expoPushToken) {
        console.log('❌ No se pudo obtener el token de notificaciones (permisos denegados o emulador)');
        return;
      }

      // Determinar la plataforma
      let platform: 'ANDROID' | 'IOS' | 'WEB' = 'ANDROID';
      if (Platform.OS === 'ios') {
        platform = 'IOS';
      } else if (Platform.OS === 'web') {
        platform = 'WEB';
      }

      // Registrar en el backend
      const response = await notificacionesAPI.registerToken({
        token: expoPushToken,
        platform,
      });

      console.log('✅ Token de notificaciones registrado exitosamente:', response.deviceToken.id);
    } catch (error: any) {
      console.error('❌ Error registrando token de notificaciones:', error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Iniciando proceso de logout...');
      setIsLoading(true);

      // Desactivar tokens de notificaciones (no bloquear el logout si falla)
      try {
        console.log('🔕 Desactivando tokens de notificaciones...');
        await notificacionesAPI.deactivateAllTokens();
        console.log('✅ Tokens de notificaciones desactivados');
      } catch (notifError) {
        console.warn('⚠️ Error desactivando tokens de notificaciones:', notifError);
      }

      // Intentar hacer logout en el servidor
      console.log('📡 Enviando logout al servidor...');
      await authAPI.logout();
      console.log(' Logout del servidor exitoso');

      // Limpiar datos locales después del logout exitoso
      console.log('🧹 Limpiando storage local...');
      await storage.clearAll();

      // Verificar que realmente se limpió
      const tokenAfterClear = await storage.getToken();
      const userAfterClear = await storage.getUser();
      console.log('Token después de limpiar:', tokenAfterClear);
      console.log('Usuario después de limpiar:', userAfterClear);

      setUser(null);
      console.log(' Logout completado, usuario eliminado del estado');

    } catch (error) {
      // Incluso si falla la request, limpiamos localmente
      console.error(' Error during logout:', error);
      console.log(' Forzando limpieza local...');
      await storage.clearAll();
      setUser(null);
      console.log('Limpieza forzada completada');
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};