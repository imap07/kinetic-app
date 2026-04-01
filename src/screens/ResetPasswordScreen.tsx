import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { TopAppBar, PrimaryButton } from '../components';
import { colors, typography, spacing, borderRadius } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../api';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { email, code } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    password.length >= 6 && confirmPassword === password && !loading;

  const handleReset = async () => {
    if (!canSubmit) return;

    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('resetPassword.passwordsDoNotMatchAlert'));
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, code, password);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : t('common.somethingWrong');
      Alert.alert(t('common.error'), message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ paddingTop: insets.top }}>
        <TopAppBar
          showBack
          onBack={() => navigation.goBack()}
          leftLabel={t('resetPassword.title')}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons
            name="lock-reset"
            size={32}
            color={colors.primary}
          />
        </View>

        <Text style={styles.title}>{t('resetPassword.setNewPassword')}</Text>

        <Text style={styles.description}>
          {t('resetPassword.desc')}
        </Text>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('resetPassword.newPasswordLabel')}</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={18}
              color={colors.onSurfaceDim}
            />
            <TextInput
              style={styles.input}
              placeholder={t('resetPassword.passwordPlaceholder')}
              placeholderTextColor={colors.onSurfaceDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={8}
            >
              <Feather
                name={showPassword ? 'eye-off' : 'eye'}
                size={18}
                color={colors.onSurfaceDim}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('resetPassword.confirmPasswordLabel')}</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons
              name="lock-check-outline"
              size={18}
              color={colors.onSurfaceDim}
            />
            <TextInput
              style={styles.input}
              placeholder={t('resetPassword.confirmPlaceholder')}
              placeholderTextColor={colors.onSurfaceDim}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!loading}
            />
          </View>
          {confirmPassword.length > 0 && confirmPassword !== password && (
            <Text style={styles.errorHint}>{t('resetPassword.passwordsDoNotMatch')}</Text>
          )}
        </View>

        <PrimaryButton
          title={loading ? '' : t('resetPassword.resetBtn')}
          onPress={handleReset}
          style={styles.submitButton}
          icon={
            loading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : undefined
          }
        />

        <View style={styles.spacer} />

        <Text style={styles.footerText}>{t('resetPassword.footerText')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    paddingTop: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    ...typography.displayMd,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  inputSection: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    padding: 0,
  },
  errorHint: {
    ...typography.bodySm,
    color: '#FF7351',
    marginTop: 6,
    marginLeft: 4,
  },
  submitButton: {
    width: '100%',
    marginTop: 16,
    marginBottom: 28,
  },
  spacer: {
    flexGrow: 1,
    minHeight: 32,
  },
  footerText: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    letterSpacing: 1.5,
    marginBottom: 20,
  },
});
