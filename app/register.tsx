import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../services/api';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    // Validaciones
    if (!form.email.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (form.password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/api/public/register', {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        password: form.password,
      });

      if (response.status === 200 || response.status === 201) {
        Alert.alert(
          '¡Registro exitoso!',
          'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login'),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Register error:', error);

      let errorMessage = 'Error al registrar';
      if (error.response?.status === 409) {
        errorMessage = 'El correo electrónico ya está registrado';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const scorePassword = (pw: string) => {
    let score = 0;
    if (pw.length >= 6) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const passScore = scorePassword(form.password);
  const passLabel =
    passScore === 0 ? 'Muy débil' : passScore === 1 ? 'Débil' : passScore === 2 ? 'Aceptable' : 'Fuerte';
  const passColor =
    passScore === 0 ? '#ef4444' : passScore === 1 ? '#f59e0b' : passScore === 2 ? '#10b981' : '#059669';

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="medical" size={60} color="#10b981" />
              </View>
            </View>
            <Text style={styles.title}>Crea tu cuenta</Text>
            <Text style={styles.subtitle}>Únete y accede a ofertas exclusivas</Text>
          </View>

          {/* Beneficios */}
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <Ionicons name="rocket-outline" size={16} color="#10b981" />
              <Text style={styles.benefitText}>Envíos 24h</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="notifications-outline" size={16} color="#10b981" />
              <Text style={styles.benefitText}>Recordatorios</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="pricetag-outline" size={16} color="#10b981" />
              <Text style={styles.benefitText}>Ofertas</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#10b981" />
              <Text style={styles.benefitText}>Seguro</Text>
            </View>
          </View>

          <View style={styles.formContainer}>
            {/* Email */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                  placeholder="Correo electrónico"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Nombre y Apellido */}
            <View style={styles.rowContainer}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={form.firstName}
                    onChangeText={(text) => setForm({ ...form, firstName: text })}
                    placeholder="Nombre"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="words"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={form.lastName}
                    onChangeText={(text) => setForm({ ...form, lastName: text })}
                    placeholder="Apellido"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="words"
                    editable={!isLoading}
                  />
                </View>
              </View>
            </View>

            {/* Contraseña */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={form.password}
                  onChangeText={(text) => setForm({ ...form, password: text })}
                  placeholder="Contraseña (mín. 6)"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Indicador de fuerza de contraseña */}
            {form.password.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.passwordStrengthBars}>
                  {[0, 1, 2].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.passwordStrengthBar,
                        { backgroundColor: passScore > i ? passColor : '#e5e7eb' },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.passwordStrengthText, { color: passColor }]}>{passLabel}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Crear cuenta gratis</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.termsText}>
              Al registrarte aceptas nuestros términos y política de privacidad
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.footerLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  benefitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  benefitItem: {
    alignItems: 'center',
    flex: 1,
  },
  benefitText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    outlineStyle: 'none',
  },
  eyeIcon: {
    padding: 5,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  passwordStrengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  passwordStrengthBar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 12,
  },
  registerButton: {
    marginTop: 10,
    borderRadius: 15,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#000000',
    height: 55,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  footerLink: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
});
