import { Platform, StyleSheet, TouchableOpacity, Alert, View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { useAuth } from '../../contexts/AuthContext';
import { carritoAPI, CarritoItem } from '../../services/api';

export default function CarritoScreen() {
  const { isAuthenticated, logout, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<CarritoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingItem, setProcessingItem] = useState<number | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        loadCarrito();
      }
    }, [isAuthenticated])
  );

  // Ya no redirigimos automáticamente, mostramos mensaje si no está autenticado
  // useEffect(() => {
  //   if (!authLoading && !isAuthenticated) {
  //     router.replace('/login');
  //   }
  // }, [isAuthenticated, authLoading]);

  const loadCarrito = async () => {
    try {
      setIsLoading(true);
      const data = await carritoAPI.get();
      setItems(data);
    } catch (error: any) {
      console.error('Error loading cart:', error);
      if (error.response?.status === 401) {
        await logout();
      } else {
        Alert.alert('Error', 'No se pudo cargar el carrito');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadCarrito();
  };

  const updateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemove(itemId);
      return;
    }

    setProcessingItem(itemId);
    try {
      await carritoAPI.update(itemId, newQuantity);
      await loadCarrito();
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'No se pudo actualizar la cantidad');
    } finally {
      setProcessingItem(null);
    }
  };

  const handleRemove = async (itemId: number) => {
    Alert.alert(
      'Eliminar producto',
      '¿Estás seguro de que quieres eliminar este producto del carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setProcessingItem(itemId);
            try {
              await carritoAPI.remove(itemId);
              await loadCarrito();
            } catch (error) {
              console.error('Error removing item:', error);
              Alert.alert('Error', 'No se pudo eliminar el producto');
            } finally {
              setProcessingItem(null);
            }
          },
        },
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert('Vaciar carrito', '¿Estás seguro de que quieres vaciar el carrito?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Vaciar',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoading(true);
            await carritoAPI.clear();
            setItems([]);
          } catch (error) {
            console.error('Error clearing cart:', error);
            Alert.alert('Error', 'No se pudo vaciar el carrito');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos antes de finalizar la compra');
      return;
    }

    Alert.alert(
      'Finalizar compra',
      `Total: Bs. ${calculateTotal().toFixed(2)}\n¿Deseas crear la orden?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setIsCheckingOut(true);
            try {
              const orden = await carritoAPI.checkout();
              Alert.alert(
                '¡Orden creada!',
                `Orden #${orden.id} creada exitosamente\nTotal: Bs. ${orden.total.toFixed(2)}`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setItems([]);
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Error creating order:', error);
              Alert.alert('Error', 'No se pudo crear la orden');
            } finally {
              setIsCheckingOut(false);
            }
          },
        },
      ]
    );
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0);
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="medical" size={60} color="#10b981" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // Si no está autenticado, mostrar mensaje
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="cart" size={32} color="#fff" />
            <Text style={styles.headerTitle}>Mi Carrito</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={80} color="#9ca3af" />
          <Text style={styles.emptyTitle}>Inicia sesión</Text>
          <Text style={styles.emptyText}>Necesitas iniciar sesión para ver tu carrito</Text>
          <TouchableOpacity style={styles.shopButton} onPress={() => router.push('/login')}>
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.shopButtonText}>Iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shopButton, { backgroundColor: '#ffffff', borderColor: '#10b981', marginTop: 12 }]}
            onPress={() => router.push('/register')}
          >
            <Ionicons name="person-add-outline" size={20} color="#10b981" />
            <Text style={[styles.shopButtonText, { color: '#10b981' }]}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="cart" size={32} color="#fff" />
          <Text style={styles.headerTitle}>Mi Carrito</Text>
        </View>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClearCart} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.clearButtonText}>Vaciar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Contenido */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Cargando carrito...</Text>
        </View>
      ) : items.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#10b981']} />}
        >
          <Ionicons name="cart-outline" size={80} color="#9ca3af" />
          <Text style={styles.emptyTitle}>Carrito vacío</Text>
          <Text style={styles.emptyText}>Agrega productos para comenzar tu compra</Text>
          <TouchableOpacity style={styles.shopButton} onPress={() => router.push('/(tabs)')}>
            <Ionicons name="storefront-outline" size={20} color="#fff" />
            <Text style={styles.shopButtonText}>Ir a comprar</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          <ScrollView
            style={styles.itemsContainer}
            contentContainerStyle={styles.itemsContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#10b981']} />}
          >
            {items.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.itemImageContainer}>
                  {item.producto.imageUrl ? (
                    <Image source={{ uri: item.producto.imageUrl }} style={styles.itemImage} contentFit="cover" />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons name="image-outline" size={30} color="#9ca3af" />
                    </View>
                  )}
                </View>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemBrand} numberOfLines={1}>
                    {item.producto.marca.nombre}
                  </Text>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.producto.nombre}
                  </Text>
                  <Text style={styles.itemPrice}>Bs. {item.producto.precio.toFixed(2)}</Text>

                  <View style={styles.quantityContainer}>
                    <TouchableOpacity
                      style={[styles.quantityButton, processingItem === item.id && styles.quantityButtonDisabled]}
                      onPress={() => updateQuantity(item.id, item.cantidad - 1)}
                      disabled={processingItem === item.id}
                    >
                      <Ionicons name="remove" size={18} color="#374151" />
                    </TouchableOpacity>

                    <Text style={styles.quantityText}>{item.cantidad}</Text>

                    <TouchableOpacity
                      style={[styles.quantityButton, processingItem === item.id && styles.quantityButtonDisabled]}
                      onPress={() => updateQuantity(item.id, item.cantidad + 1)}
                      disabled={processingItem === item.id}
                    >
                      <Ionicons name="add" size={18} color="#374151" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemove(item.id)}
                  disabled={processingItem === item.id}
                >
                  {processingItem === item.id ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Ionicons name="trash-outline" size={22} color="#ef4444" />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Footer con total y botón de checkout */}
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>Bs. {calculateTotal().toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutButton, isCheckingOut && styles.checkoutButtonDisabled]}
              onPress={handleCheckout}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                  <Text style={styles.checkoutButtonText}>Finalizar compra</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#10b981',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000000',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    marginTop: 24,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemsContainer: {
    flex: 1,
  },
  itemsContent: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 12,
    marginBottom: 12,
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemBrand: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 2,
    borderTopColor: '#000000',
    padding: 20,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10b981',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 16,
  },
  checkoutButtonDisabled: {
    opacity: 0.7,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
