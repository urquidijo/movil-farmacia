import React, { useState, useEffect } from 'react';
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
import { router } from 'expo-router';

import { useAuth } from '../../contexts/AuthContext';
import { pagosAPI, Factura } from '../../services/api';

export default function InvoicesScreen() {
  const { isAuthenticated, user } = useAuth();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Inicia sesión',
        'Para ver tus facturas necesitas iniciar sesión',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => router.back() },
          { text: 'Iniciar sesión', onPress: () => router.push('/login') },
        ]
      );
    } else {
      loadFacturas();
    }
  }, [isAuthenticated]);

  const loadFacturas = async () => {
    try {
      setIsLoading(true);
      const data = await pagosAPI.getFacturas();

      // Filtrar facturas del usuario actual
      const userFacturas = data.filter(
        (factura) => factura.orden.user.email === user?.email
      );

      // Ordenar por fecha más reciente primero
      userFacturas.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setFacturas(userFacturas);
    } catch (error) {
      console.error('Error loading invoices:', error);
      Alert.alert('Error', 'No se pudieron cargar las facturas');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadFacturas();
  };

  const openInvoice = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No se puede abrir la factura');
      }
    } catch (error) {
      console.error('Error opening invoice:', error);
      Alert.alert('Error', 'No se pudo abrir la factura');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'PAGADA':
        return { bg: '#d1fae5', text: '#065f46', border: '#10b981' };
      case 'PENDIENTE':
        return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
      default:
        return { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };
    }
  };

  if (!isAuthenticated) return null;

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Cargando facturas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="receipt" size={24} color="#10b981" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Mis Facturas</Text>
            <Text style={styles.headerSubtitle}>
              {facturas.length} {facturas.length === 1 ? 'factura' : 'facturas'}
            </Text>
          </View>
        </View>
      </View>

      {facturas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No tienes facturas</Text>
          <Text style={styles.emptySubtitle}>
            Tus facturas aparecerán aquí después de realizar una compra
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
        <FlatList
          data={facturas}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#10b981']} />
          }
          renderItem={({ item }) => {
            const estadoColors = getEstadoColor(item.estado);

            return (
              <View style={styles.invoiceCard}>
                {/* Header de la factura */}
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceHeaderLeft}>
                    <View style={styles.invoiceIconContainer}>
                      <Ionicons name="document-text" size={24} color="#10b981" />
                    </View>
                    <View>
                      <Text style={styles.invoiceId}>Factura #{item.id}</Text>
                      <Text style={styles.invoiceDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.estadoBadge,
                      { backgroundColor: estadoColors.bg, borderColor: estadoColors.border },
                    ]}
                  >
                    <Text style={[styles.estadoText, { color: estadoColors.text }]}>
                      {item.estado}
                    </Text>
                  </View>
                </View>

                {/* Información del monto */}
                <View style={styles.invoiceBody}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Orden</Text>
                    <Text style={styles.infoValue}>#{item.orden.id}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Monto total</Text>
                    <Text style={styles.infoValueHighlight}>
                      Bs. {item.monto.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Botón para ver factura */}
                {item.facturaUrl ? (
                  <TouchableOpacity
                    style={styles.viewInvoiceButton}
                    onPress={() => openInvoice(item.facturaUrl!)}
                  >
                    <Ionicons name="open-outline" size={18} color="#10b981" />
                    <Text style={styles.viewInvoiceText}>Ver factura en Stripe</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noInvoiceButton}>
                    <Ionicons name="alert-circle-outline" size={18} color="#9ca3af" />
                    <Text style={styles.noInvoiceText}>Factura no disponible</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
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
  invoiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 16,
    marginBottom: 16,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  invoiceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  invoiceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  invoiceId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  invoiceDate: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceBody: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  infoValueHighlight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  viewInvoiceButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#10b981',
    paddingVertical: 12,
    gap: 8,
  },
  viewInvoiceText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  noInvoiceButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 12,
    gap: 8,
  },
  noInvoiceText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
});
