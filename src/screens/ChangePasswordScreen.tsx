import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { authApi, ApiError } from '../api';

const MIN_PASSWORD_LENGTH = 6;

export function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { tokens, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Validation
  const currentValid = currentPassword.length > 0;
  const newValid = newPassword.length >= MIN_PASSWORD_LENGTH;
  const confirmValid = confirmPassword === newPassword && confirmPassword.length > 0;
  const passwordsDifferent = newPassword !== currentPassword || newPassword.length === 0;
  const canSubmit = currentValid && newValid && confirmValid && passwordsDifferent;

  const handleSubmit = async () => {
    if (!canSubmit || !tokens?.accessToken) return;

    if (newPassword === currentPassword) {
      Alert.alert(t('changePassword.samePasswordAlert'), t('changePassword.samePasswordDesc'));
      return;
    }

    setSaving(true);
    try {
      const res = await authApi.changePassword(tokens.accessToken, currentPassword, newPassword);
      Alert.alert(
        t('changePassword.successTitle'),
        t('changePassword.successDesc'),
        [
          {
            text: t('common.ok'),
            onPress: async () => {
              await logout();
            },
          },
        ],
      );
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : t('changePassword.failedAlert');
      Alert.alert(t('common.error'), message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('changePassword.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={styles.infoText}>
              {t('changePassword.infoBanner')}
            </Text>
          </View>

          {/* Current password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('changePassword.currentPasswordLabel')}</Text>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={16} color={colors.onSurfaceDim} />
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={t('changePassword.currentPasswordPlaceholder')}
                placeholderTextColor={colors.onSurfaceDim}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                editable={!saving}
              />
              <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} hitSlop={8}>
                <Feather
                  name={showCurrent ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.onSurfaceDim}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('changePassword.newPasswordLabel')}</Text>
            <View
              style={[
                styles.inputWrapper,
                newPassword.length > 0 && !newValid && styles.inputError,
              ]}
            >
              <Feather name="key" size={16} color={colors.onSurfaceDim} />
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t('changePassword.newPasswordPlaceholder')}
                placeholderTextColor={colors.onSurfaceDim}
                secureTextEntry={!showNew}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!saving}
              />
              <TouchableOpacity onPress={() => setShowNew((v) => !v)} hitSlop={8}>
                <Feather
                  name={showNew ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.onSurfaceDim}
                />
              </TouchableOpacity>
            </View>
            {newPassword.length > 0 && !newValid && (
              <Text style={styles.errorText}>{t('changePassword.minChars', { count: MIN_PASSWORD_LENGTH })}</Text>
            )}
            {newPassword.length > 0 && newPassword === currentPassword && (
              <Text style={styles.errorText}>{t('changePassword.mustBeDifferent')}</Text>
            )}

            {/* Strength indicators */}
            {newPassword.length > 0 && (
              <View style={styles.strengthRow}>
                <View
                  style={[
                    styles.strengthBar,
                    {
                      backgroundColor:
                        newPassword.length >= 10
                          ? '#5BEF90'
                          : newPassword.length >= MIN_PASSWORD_LENGTH
                            ? '#FBBF24'
                            : '#FF7351',
                    },
                    { flex: Math.min(newPassword.length / 12, 1) },
                  ]}
                />
                <View style={[styles.strengthBarBg, { flex: Math.max(1 - newPassword.length / 12, 0) }]} />
                <Text style={styles.strengthLabel}>
                  {newPassword.length >= 10 ? t('changePassword.strengthStrong') : newPassword.length >= MIN_PASSWORD_LENGTH ? t('changePassword.strengthGood') : t('changePassword.strengthWeak')}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('changePassword.confirmPasswordLabel')}</Text>
            <View
              style={[
                styles.inputWrapper,
                confirmPassword.length > 0 && !confirmValid && styles.inputError,
              ]}
            >
              <Feather name="check-circle" size={16} color={colors.onSurfaceDim} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('changePassword.confirmPasswordPlaceholder')}
                placeholderTextColor={colors.onSurfaceDim}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!saving}
              />
              <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                <Feather
                  name={showConfirm ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.onSurfaceDim}
                />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && !confirmValid && (
              <Text style={styles.errorText}>{t('changePassword.passwordsDontMatch')}</Text>
            )}
          </View>

          {/* Submit */}
          <View style={styles.submitSection}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={!canSubmit || saving}
              style={[styles.submitBtn, (!canSubmit || saving) && { opacity: 0.4 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#4A5E00" />
              ) : (
                <>
                  <Feather name="shield" size={18} color="#4A5E00" />
                  <Text style={styles.submitBtnText}>{t('changePassword.submitBtn')}</Text>
                </>
              )}
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  scroll: { flex: 1 },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: spacing['2xl'],
    marginTop: spacing.lg,
    marginBottom: spacing['2xl'],
    padding: spacing.lg,
    backgroundColor: 'rgba(202,253,0,0.06)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.15)',
  },
  infoText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },

  fieldGroup: {
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceDim,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  inputError: {
    borderColor: '#FF7351',
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: colors.onSurface,
    paddingVertical: 14,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#FF7351',
    marginTop: 6,
  },

  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    height: 4,
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
  },
  strengthBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceContainerHighest,
  },
  strengthLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    minWidth: 40,
  },

  submitSection: {
    paddingHorizontal: spacing['2xl'],
    marginTop: spacing.xl,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
  },
  submitBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: '#4A5E00',
    letterSpacing: 0.5,
  },
});
