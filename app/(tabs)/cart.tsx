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
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../contexts/AuthContext';
import {
  carritoAPI,
  pagosAPI,
  rxAPI,
  CarritoItem,
  RxEstado,
  VerifyResponse,
  VerifyMissing,
} from '../../services/api';

export default function CartScreen() {
  const { isAuthenticated, user } = useAuth();
  const [items, setItems] = useState<CarritoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [updatingItem, setUpdatingItem] = useState<number | null>(null);

  // Estados de receta médica
  const [needsRx, setNeedsRx] = useState(false);
  const [rxImage, setRxImage] = useState<string | null>(null);
  const [rxUploading, setRxUploading] = useState(false);
  const [rxAnalyzing, setRxAnalyzing] = useState(false);
  const [rxEstado, setRxEstado] = useState<RxEstado>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);

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
      console.log('📦 Carrito items:', JSON.stringify(data, null, 2));
      setItems(data);

      // Verificar si algún producto requiere receta (respaldo frontend)
      const needsFront = data.some((x) => x.producto.requiereReceta === true);
      console.log('🔍 Necesita receta (frontend):', needsFront);
      setNeedsRx(needsFront);

      // Verificación backend
      await checkNeedsRx();
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

  const checkNeedsRx = async () => {
    try {
      console.log('🔍 Verificando necesidad de receta con backend...');
      const data = await rxAPI.needs();
      console.log('✅ Respuesta backend needsRx:', data);
      setNeedsRx(Boolean(data?.needsRx));
      console.log('📝 Estado needsRx actualizado a:', Boolean(data?.needsRx));
      if (!data?.needsRx) {
        setRxEstado(null);
        setVerificationId(null);
        setRxImage(null);
      }
    } catch (error) {
      console.warn('⚠️ No se pudo verificar needsRx (usando front):', error);
    }
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
      await checkNeedsRx();
      if (needsRx) {
        setVerificationId(null);
        setRxEstado(null);
      }
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

      await checkNeedsRx();
      setVerificationId(null);
      setRxEstado(null);
    } catch (error) {
      console.error('Error removing item:', error);
      Alert.alert('Error', 'No se pudo eliminar el producto');
    }
  };

  const uploadAndVerifyReceta = async (imageUri: string, base64?: string) => {
    setRxUploading(true);
    try {
      setRxImage(imageUri);

      // Construir el data URL con base64
      let imageBase64 = '';
      if (base64) {
        imageBase64 = `data:image/jpeg;base64,${base64}`;
      } else {
        Alert.alert('Error', 'No se pudo leer la imagen');
        return;
      }

      setRxAnalyzing(true);
      const data = await rxAPI.verify(imageBase64);

      const { ok, missing = [], verificationId: vId } = data;
      setVerificationId(vId ?? null);
      setRxEstado(ok ? 'APROBADA' : 'RECHAZADA');

      if (ok) {
        Alert.alert(
          'Receta aprobada',
          'Coincide con los productos del carrito.',
          [{ text: 'OK' }]
        );
      } else {
        const faltan = missing.map((m: VerifyMissing) => m.productoNombre).join(', ');
        Alert.alert(
          'Receta rechazada',
          faltan
            ? `Faltan en receta: ${faltan}`
            : 'No se pudo validar los productos.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error uploading/verifying receta:', error);
      const msg = error.response?.data?.message || 'No se pudo validar la receta';
      Alert.alert('Error', msg);
      setRxEstado('RECHAZADA');
      setVerificationId(null);
    } finally {
      setRxAnalyzing(false);
      setRxUploading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Pedir permisos
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      // Mostrar opciones
      Alert.alert(
        'Subir receta médica',
        'Selecciona una opción',
        [
          {
            text: 'Tomar foto',
            onPress: async () => {
              if (cameraStatus !== 'granted') {
                Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                base64: true,
              });

              if (!result.canceled && result.assets[0]) {
                await uploadAndVerifyReceta(result.assets[0].uri, result.assets[0].base64);
              }
            },
          },
          {
            text: 'Elegir de galería',
            onPress: async () => {
              if (libraryStatus !== 'granted') {
                Alert.alert('Permiso denegado', 'Se necesita acceso a la galería');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                base64: true,
              });

              if (!result.canceled && result.assets[0]) {
                await uploadAndVerifyReceta(result.assets[0].uri, result.assets[0].base64);
              }
            },
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos antes de procesar la compra');
      return;
    }

    if (needsRx && rxEstado !== 'APROBADA') {
      Alert.alert(
        'Falta receta aprobada',
        'Sube y valida tu receta para continuar.',
        [{ text: 'OK' }]
      );
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
              // 1. Crear orden desde el carrito (con verificationId si se requiere)
              const orden = await carritoAPI.checkout(
                needsRx ? verificationId ?? undefined : undefined
              );
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

  console.log('🎨 Renderizando carrito. needsRx:', needsRx, 'items:', items.length);

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
                      {item.producto.requiereReceta && (
                        <View style={styles.rxBadge}>
                          <Ionicons name="medical" size={10} color="#d97706" />
                          <Text style={styles.rxBadgeText}>Requiere receta</Text>
                        </View>
                      )}
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

          {/* Sección de receta médica */}
          {needsRx && (
            <View style={styles.rxContainer}>
              <View style={styles.rxHeader}>
                <Ionicons name="alert-circle" size={20} color="#d97706" />
                <Text style={styles.rxHeaderText}>
                  Este pedido incluye medicamentos que requieren receta médica
                </Text>
              </View>

              <View style={styles.rxContent}>
                <TouchableOpacity
                  style={[
                    styles.rxUploadButton,
                    (rxUploading || rxAnalyzing) && styles.rxUploadButtonDisabled,
                  ]}
                  onPress={pickImage}
                  disabled={rxUploading || rxAnalyzing}
                >
                  <Ionicons
                    name={rxImage ? 'camera-reverse' : 'camera'}
                    size={20}
                    color="#374151"
                  />
                  <Text style={styles.rxUploadButtonText}>
                    {rxUploading
                      ? 'Subiendo...'
                      : rxImage
                      ? 'Cambiar receta'
                      : 'Subir receta médica'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.rxStatus}>
                  <Text style={styles.rxStatusLabel}>Estado:</Text>
                  <Text
                    style={[
                      styles.rxStatusValue,
                      rxEstado === 'APROBADA' && styles.rxStatusApproved,
                      rxEstado === 'RECHAZADA' && styles.rxStatusRejected,
                    ]}
                  >
                    {rxAnalyzing
                      ? 'Validando...'
                      : rxEstado || 'PENDIENTE'}
                  </Text>
                </View>

                {rxImage && (
                  <Image
                    source={{ uri: rxImage }}
                    style={styles.rxImagePreview}
                    contentFit="contain"
                  />
                )}

                {!rxImage && (
                  <View style={styles.rxPlaceholder}>
                    <Ionicons name="document-text-outline" size={40} color="#9ca3af" />
                    <Text style={styles.rxPlaceholderText}>
                      Sube una imagen nítida y completa de tu receta
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

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
              style={[
                styles.checkoutButton,
                (processing || (needsRx && rxEstado !== 'APROBADA')) &&
                  styles.checkoutButtonDisabled,
              ]}
              onPress={handleCheckout}
              disabled={processing || (needsRx && rxEstado !== 'APROBADA')}
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
  // Estilos de receta médica
  rxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    gap: 4,
  },
  rxBadgeText: {
    fontSize: 10,
    color: '#d97706',
    fontWeight: '600',
  },
  rxContainer: {
    backgroundColor: '#fffbeb',
    borderWidth: 2,
    borderColor: '#fbbf24',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  rxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    gap: 8,
  },
  rxHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
  rxContent: {
    padding: 16,
  },
  rxUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  rxUploadButtonDisabled: {
    opacity: 0.6,
  },
  rxUploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  rxStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  rxStatusLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  rxStatusValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  rxStatusApproved: {
    color: '#10b981',
  },
  rxStatusRejected: {
    color: '#ef4444',
  },
  rxImagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#f3f4f6',
  },
  rxPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#fafafa',
  },
  rxPlaceholderText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
});
