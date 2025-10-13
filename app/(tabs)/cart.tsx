import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '../../contexts/AuthContext';
import { carritoAPI, pagosAPI, CarritoItem } from '../../services/api';

export default function CartScreen() {
  const { isAuthenticated, user } = useAuth();
  const [items, setItems] = useState<CarritoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [updatingItem, setUpdatingItem] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Inicia sesión',
        'Para ver tu carrito necesitas iniciar sesión',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => router.back() },
          { text: 'Iniciar sesión', onPress: () => router.push('/login') },
        ]
      );
    } else {
      loadCarrito();
    }
  }, [isAuthenticated]);

  const loadCarrito = async () => {
    try {
      setIsLoading(true);
      const data = await carritoAPI.get();
      setItems(data);
    } catch (error) {
      console.error('Error loading cart:', error);
      Alert.alert('Error', 'No se pudo cargar el carrito');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadCarrito();
  };

  const updateCantidad = async (itemId: number, newCantidad: number) => {
    if (newCantidad < 1) {
      return removeItem(itemId, true);
    }

    setUpdatingItem(itemId);
    try {
      await carritoAPI.update(itemId, newCantidad);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, cantidad: newCantidad } : item
        )
      );
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'No se pudo actualizar la cantidad');
      await loadCarrito(); // Recargar para mantener consistencia
    } finally {
      setUpdatingItem(null);
    }
  };

  const removeItem = async (itemId: number, skipConfirmation = false) => {
    if (!skipConfirmation) {
      Alert.alert(
        '¿Eliminar producto?',
        'Se quitará del carrito',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => removeItem(itemId, true),
          },
        ]
      );
      return;
    }

    try {
      await carritoAPI.remove(itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      Alert.alert('Eliminado', 'Producto quitado del carrito');
    } catch (error) {
      console.error('Error removing item:', error);
      Alert.alert('Error', 'No se pudo eliminar el producto');
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos antes de procesar la compra');
      return;
    }

    Alert.alert(
      'Procesar compra',
      `Total a pagar: Bs. ${total.toFixed(2)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar',
          onPress: async () => {
            setProcessing(true);
            try {
              // 1. Crear orden desde el carrito
              const orden = await carritoAPI.checkout();
              console.log('✅ Orden creada:', orden.id);

              // 2. Crear sesión de pago con Stripe
              const pagoResponse = await pagosAPI.crear({
                ordenId: orden.id,
                monto: orden.total,
                moneda: 'usd',
              });

              console.log('✅ Sesión de pago creada:', pagoResponse.url);

              // 3. Abrir navegador para pagar
              if (pagoResponse.url) {
                // Usar WebBrowser de Expo para mejor experiencia
                const result = await WebBrowser.openBrowserAsync(pagoResponse.url, {
                  dismissButtonStyle: 'close',
                  presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
                });

                // Cuando el usuario cierre el navegador, recargar el carrito
                if (result.type === 'cancel' || result.type === 'dismiss') {
                  // Dar tiempo para que el webhook procese
                  setTimeout(() => {
                    loadCarrito();
                  }, 2000);

                  Alert.alert(
                    'Proceso de pago',
                    'Puedes revisar tus facturas en la pestaña de Facturas',
                    [{ text: 'OK' }]
                  );
                }
              }
            } catch (error: any) {
              console.error('Error en checkout:', error);
              Alert.alert(
                'Error',
                error.response?.data?.message || 'No se pudo procesar la compra'
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  // Cálculos
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0),
    [items]
  );

  const envio = useMemo(() => (subtotal > 200 ? 0 : items.length ? 15 : 0), [subtotal, items.length]);

  const total = useMemo(() => Math.max(subtotal + envio - 15, 0), [subtotal, envio]);

  if (!isAuthenticated) return null;

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Cargando carrito...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="cart" size={24} color="#10b981" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Mi Carrito</Text>
            <Text style={styles.headerSubtitle}>
              {items.length} {items.length === 1 ? 'producto' : 'productos'}
            </Text>
          </View>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#9ca3af" />
          <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptySubtitle}>
            Explora nuestros productos y agrega tus favoritos
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Ionicons name="storefront" size={20} color="#fff" />
            <Text style={styles.browseButtonText}>Ver productos</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#10b981']} />
            }
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <View style={styles.itemImageContainer}>
                  {item.producto.imageUrl ? (
                    <Image
                      source={{ uri: item.producto.imageUrl }}
                      style={styles.itemImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color="#9ca3af" />
                    </View>
                  )}
                </View>

                <View style={styles.itemInfo}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTitleContainer}>
                      <Text style={styles.itemBrand} numberOfLines={1}>
                        {item.producto.marca.nombre}
                      </Text>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.producto.nombre}
                      </Text>
                      <Text style={styles.itemPrice}>
                        Bs. {item.producto.precio.toFixed(2)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeItem(item.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.itemFooter}>
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        onPress={() => updateCantidad(item.id, item.cantidad - 1)}
                        style={styles.quantityButton}
                        disabled={updatingItem === item.id}
                      >
                        <Ionicons name="remove" size={16} color="#374151" />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.cantidad}</Text>
                      <TouchableOpacity
                        onPress={() => updateCantidad(item.id, item.cantidad + 1)}
                        style={styles.quantityButton}
                        disabled={updatingItem === item.id}
                      >
                        <Ionicons name="add" size={16} color="#374151" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.itemTotal}>
                      Bs. {(item.producto.precio * item.cantidad).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          />

          {/* Resumen y botón de pago */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>Bs. {subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Envío</Text>
              <Text style={styles.summaryValue}>Gratis</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>Bs. {total.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.checkoutButton, processing && styles.checkoutButtonDisabled]}
              onPress={handleCheckout}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="card" size={20} color="#fff" />
                  <Text style={styles.checkoutButtonText}>Procesar compra</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.securityBadges}>
              <View style={styles.badge}>
                <Ionicons name="shield-checkmark" size={14} color="#6b7280" />
                <Text style={styles.badgeText}>Pago seguro</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="lock-closed" size={14} color="#6b7280" />
                <Text style={styles.badgeText}>SSL</Text>
              </View>
            </View>
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
    marginTop: 16,
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  browseButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    gap: 8,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 12,
    marginBottom: 16,
  },
  itemImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitleContainer: {
    flex: 1,
  },
  itemBrand: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 4,
  },
  removeButton: {
    padding: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000000',
    overflow: 'hidden',
  },
  quantityButton: {
    padding: 8,
    backgroundColor: '#ffffff',
  },
  quantityText: {
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  itemTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  summaryContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 2,
    borderTopColor: '#000000',
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 16,
    marginTop: 16,
    gap: 8,
  },
  checkoutButtonDisabled: {
    opacity: 0.7,
  },
  checkoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  securityBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
