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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { TopAppBar, PrimaryButton } from '../components';
import { colors, typography, spacing, borderRadius } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../api';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'RecoverPasswordRequest'>;
};

export function RecoverPasswordRequestScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { forgotPassword } = useAuth();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ paddingTop: insets.top }}>
        <TopAppBar
          showBack
          onBack={() => navigation.goBack()}
          leftLabel={t('recoverPassword.title')}
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
          <MaterialCommunityIcons name="refresh" size={32} color={colors.primary} />
        </View>

        <Text style={styles.title}>{t('recoverPassword.resetYourAccess')}</Text>

        <Text style={styles.description}>
          {t('recoverPassword.resetDesc')}
        </Text>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('recoverPassword.emailLabel')}</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons
              name="email-outline"
              size={18}
              color={colors.onSurfaceDim}
            />
            <TextInput
              style={styles.input}
              placeholder={t('recoverPassword.emailPlaceholder')}
              placeholderTextColor={colors.onSurfaceDim}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>
        </View>

        <PrimaryButton
          title={loading ? '' : t('recoverPassword.sendCode')}
          onPress={async () => {
            if (!email.trim() || loading) return;
            setLoading(true);
            try {
              await forgotPassword(email.trim());
              navigation.navigate('RecoverPasswordVerification', {
                email: email.trim(),
              });
            } catch (err) {
              const message =
                err instanceof ApiError
                  ? err.message
                  : t('common.somethingWrong');
              Alert.alert(t('common.error'), message);
            } finally {
              setLoading(false);
            }
          }}
          style={styles.sendButton}
          icon={
            loading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : undefined
          }
        />

        <View style={styles.dividerSection}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('recoverPassword.rememberedIt')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.returnText}>{t('recoverPassword.returnToSignIn')}</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />

        <Text style={styles.footerText}>{t('recoverPassword.footerText')}</Text>
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
    marginBottom: 24,
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
  sendButton: {
    width: '100%',
    marginBottom: 28,
  },
  dividerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceContainerHighest,
  },
  dividerText: {
    ...typography.bodySm,
    color: colors.onSurfaceDim,
    marginHorizontal: 12,
  },
  returnText: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontFamily: 'Inter_700Bold',
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
