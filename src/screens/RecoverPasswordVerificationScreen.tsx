import React, { useState, useRef } from 'react';
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
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { TopAppBar, PrimaryButton } from '../components';
import { colors, typography, spacing, borderRadius } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../api';

const CODE_LENGTH = 6;

type Props = NativeStackScreenProps<AuthStackParamList, 'RecoverPasswordVerification'>;

export function RecoverPasswordVerificationScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { verifyCode, forgotPassword } = useAuth();

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (text: string, index: number) => {
    const next = [...code];
    next[index] = text;
    setCode(next);
    if (text && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const codeStr = code.join('');
    if (codeStr.length !== CODE_LENGTH || loading) return;

    setLoading(true);
    try {
      await verifyCode(email, codeStr);
      navigation.navigate('ResetPassword', { email, code: codeStr });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : t('recoverPassword.invalidCode');
      Alert.alert(t('common.error'), message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      await forgotPassword(email);
      Alert.alert(t('recoverPassword.codeSent'), t('recoverPassword.codeSentDesc'));
    } catch {
      Alert.alert(t('common.error'), t('recoverPassword.resendFailed'));
    } finally {
      setResending(false);
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
          leftLabel={t('recoverPassword.screenTitle')}
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
          <MaterialCommunityIcons name="shield-lock" size={32} color={colors.primary} />
        </View>

        <Text style={styles.title}>{t('recoverPassword.checkYourEmail')}</Text>

        <Text style={styles.description}>
          {t('recoverPassword.verifyDesc')}{'\n'}
          <Text style={styles.emailHighlight}>
            {email.replace(/(.{2})(.*)(@.*)/, (_m, a, b, c) => a + '*'.repeat(b.length) + c)}
          </Text>
          {t('recoverPassword.verifyDescSuffix')}
        </Text>

        <View style={styles.codeSection}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, index)
              }
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              textContentType="oneTimeCode"
            />
          ))}
        </View>

        <PrimaryButton
          title={loading ? '' : t('recoverPassword.verifyContinue')}
          onPress={handleVerify}
          style={styles.verifyButton}
          icon={
            loading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : undefined
          }
        />

        <Text style={styles.resendLabel}>{t('recoverPassword.didntReceive')}</Text>
        <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={resending}>
          {resending ? (
            <ActivityIndicator size={14} color={colors.primary} />
          ) : (
            <MaterialCommunityIcons name="refresh" size={14} color={colors.primary} />
          )}
          <Text style={styles.resendLink}>{t('recoverPassword.resendCode')}</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />

        <View style={styles.securityTip}>
          <Ionicons
            name="diamond"
            size={18}
            color={colors.tertiary}
            style={styles.securityIcon}
          />
          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>{t('recoverPassword.securityTip')}</Text>
            <Text style={styles.securityText}>
              {t('recoverPassword.securityTipText')}
            </Text>
          </View>
        </View>

        <Text style={styles.footerText}>
          {'\u00A9'} {new Date().getFullYear()} {t('recoverPassword.copyrightFooter')}
        </Text>
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
    paddingTop: 24,
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
    ...typography.headlineLg,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 26,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emailHighlight: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  codeSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceContainerHighest,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.onSurface,
  },
  codeInputFilled: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  verifyButton: {
    width: '100%',
    marginBottom: 20,
  },
  resendLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceDim,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  resendLink: {
    ...typography.labelLg,
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  spacer: {
    flexGrow: 1,
    minHeight: 32,
  },
  securityTip: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: 16,
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  securityIcon: {
    marginTop: 2,
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
    fontSize: 13,
  },
  securityText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  footerText: {
    ...typography.labelSm,
    color: colors.onSurfaceDim,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 20,
    fontSize: 9,
  },
});
