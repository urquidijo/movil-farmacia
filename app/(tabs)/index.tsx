import { Platform, StyleSheet, TouchableOpacity, Alert, View, Text, ScrollView, Dimensions, ActivityIndicator, TextInput, FlatList, RefreshControl } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { useAuth } from '../../contexts/AuthContext';
import { productosAPI, categoriasAPI, carritoAPI, Producto, Categoria } from '../../services/api';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { isAuthenticated, user, logout, isLoading: authLoading } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);

  // Ya no redirigimos automáticamente al login, permitimos ver productos
  // useEffect(() => {
  //   if (!authLoading && !isAuthenticated) {
  //     router.replace('/login');
  //   }
  // }, [isAuthenticated, authLoading]);

  useEffect(() => {
    // Cargar datos siempre, incluso sin autenticación
    loadData();
  }, [selectedCategory, searchQuery]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [productosData, categoriasData] = await Promise.all([
        productosAPI.getAll({
          categoria: selectedCategory || undefined,
          q: searchQuery || undefined,
          limit: 20,
        }),
        categoriasAPI.getAll(),
      ]);
      setProductos(productosData);
      setCategorias(categoriasData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleAddToCart = async (productoId: number) => {
    // Si no está autenticado, pedir que inicie sesión
    if (!isAuthenticated) {
      Alert.alert(
        'Inicia sesión',
        'Para agregar productos al carrito necesitas iniciar sesión o crear una cuenta',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Registrarme', onPress: () => router.push('/register') },
          { text: 'Iniciar sesión', onPress: () => router.push('/login') },
        ]
      );
      return;
    }

    setAddingToCart(productoId);
    try {
      await carritoAPI.add(productoId, 1);
      Alert.alert('¡Agregado!', 'Producto agregado al carrito', [{ text: 'OK' }]);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      if (error.response?.status === 401) {
        Alert.alert('Sesión expirada', 'Por favor, inicia sesión nuevamente');
        await logout();
      } else {
        Alert.alert('Error', 'No se pudo agregar al carrito');
      }
    } finally {
      setAddingToCart(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="medical" size={60} color="#10b981" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <Ionicons name="medical" size={32} color="#fff" />
            <View style={styles.greetingContainer}>
              <Text style={styles.appTitle}>Farmacia App</Text>
              {isAuthenticated ? (
                <Text style={styles.userName}>Hola, {user?.firstName} 👋</Text>
              ) : (
                <Text style={styles.userName}>Modo invitado</Text>
              )}
            </View>
          </View>
          {isAuthenticated ? (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
              <Ionicons name="log-out-outline" size={24} color="#10b981" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginIcon}>
              <Ionicons name="log-in-outline" size={24} color="#10b981" />
            </TouchableOpacity>
          )}
        </View>

        {/* Barra de búsqueda */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mensaje de bienvenida */}
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeTitle}>Encuentra todo para tu salud 🏥</Text>
        <Text style={styles.welcomeSubtitle}>Medicamentos, dermocosméticos y más</Text>
      </View>

      {/* Categorías */}
      <View style={styles.categoriesWrapper}>
        <Text style={styles.categoriesLabel}>Categorías</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === '' && styles.categoryChipActive]}
            onPress={() => setSelectedCategory('')}
          >
            <Text style={[styles.categoryChipText, selectedCategory === '' && styles.categoryChipTextActive]} numberOfLines={1}>
              Todos
            </Text>
          </TouchableOpacity>
          {categorias.map((categoria) => (
            <TouchableOpacity
              key={categoria.id}
              style={[styles.categoryChip, selectedCategory === categoria.nombre && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(categoria.nombre)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === categoria.nombre && styles.categoryChipTextActive]} numberOfLines={1}>
                {categoria.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista de productos */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productList}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#10b981']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="basket-outline" size={60} color="#9ca3af" />
              <Text style={styles.emptyText}>
                {selectedCategory ? `No hay productos en "${selectedCategory}"` : 'No hay productos disponibles'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <View style={styles.productImageContainer}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.productImage} contentFit="cover" />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <Ionicons name="image-outline" size={40} color="#9ca3af" />
                  </View>
                )}
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productBrand} numberOfLines={1}>{item.marca.nombre}</Text>
                <Text style={styles.productName} numberOfLines={2}>{item.nombre}</Text>
                {item.descripcion && (
                  <Text style={styles.productDescription} numberOfLines={2}>{item.descripcion}</Text>
                )}
                <Text style={styles.productPrice}>Bs. {item.precio.toFixed(2)}</Text>
                <TouchableOpacity
                  style={[styles.addButton, addingToCart === item.id && styles.addButtonDisabled]}
                  onPress={() => handleAddToCart(item.id)}
                  disabled={addingToCart === item.id}
                >
                  {addingToCart === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="cart-outline" size={18} color="#fff" />
                      <Text style={styles.addButtonText}>Agregar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Botón flotante para test de notificaciones (temporal para desarrollo) */}
      <TouchableOpacity
        style={styles.testNotificationsFAB}
        onPress={() => router.push('/test-notifications')}
      >
        <Ionicons name="notifications" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    color: '#374151',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#10b981',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  greetingContainer: {
    marginLeft: 12,
  },
  appTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userName: {
    color: '#d1fae5',
    fontSize: 14,
    marginTop: 2,
  },
  logoutIcon: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#000000',
  },
  loginIcon: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#000000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    outlineStyle: 'none',
  },
  clearButton: {
    padding: 4,
  },
  welcomeContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  categoriesWrapper: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoriesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    paddingHorizontal: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#000000',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  productList: {
    padding: 16,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCard: {
    width: (width - 48) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000000',
    overflow: 'hidden',
  },
  productImageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#f3f4f6',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productBrand: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  testNotificationsFAB: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
});
