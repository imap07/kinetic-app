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
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { TopAppBar, PrimaryButton } from '../components';
import { colors, typography, spacing, borderRadius } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../api';
import {
  validatePassword,
  PASSWORD_MIN_LENGTH,
} from '../services/passwordPolicy';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MIN_AGE_YEARS } from '../shared/domain';

// Bound for the date picker — anything after this point can't be
// 18+, so the picker won't let users land there at all.
const MAX_BIRTHDATE = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE_YEARS);
  return d;
})();

function yearsBetween(dob: Date, now = new Date()): number {
  let years = now.getFullYear() - dob.getFullYear();
  const before =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (before) years -= 1;
  return years;
}

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'EmailAuth'>;
};

export function EmailAuthScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { loginWithEmail, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Birthdate is captured only for registration. Null until the user
  // confirms via the system picker. The picker enforces MAX_BIRTHDATE
  // (today minus 18y), but we also re-check on submit so a manual
  // override can't bypass.
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isLogin = mode === 'login';

  // Login accepts any non-empty password — the server decides. We do NOT
  // leak the password policy on the login screen (would tell an attacker
  // which accounts pre-date a policy change).
  //
  // Register must match the backend DTO exactly (10 chars, mixed case,
  // digit, symbol) or the server will reject with 400.
  const passwordCheck = validatePassword(password);

  const ageOk = !!birthdate && yearsBetween(birthdate) >= MIN_AGE_YEARS;
  const canSubmit = isLogin
    ? !!email.trim() && password.length > 0
    : !!email.trim() &&
      passwordCheck.valid &&
      displayName.trim().length >= 2 &&
      ageOk;

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email.trim(), password);
      } else {
        if (!birthdate) {
          Alert.alert(
            t('common.error'),
            t('emailAuth.birthdateRequired', {
              defaultValue: 'Please confirm your date of birth.',
            }),
          );
          return;
        }
        // Backend re-validates — this is a UX guard, not the gate.
        const iso = birthdate.toISOString().slice(0, 10);
        await register(email.trim(), password, displayName.trim(), iso);
      }
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
          leftLabel={isLogin ? t('emailAuth.signIn') : t('emailAuth.createAccount')}
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
            name={isLogin ? 'login' : 'account-plus'}
            size={32}
            color={colors.primary}
          />
        </View>

        <Text style={styles.title}>
          {isLogin ? t('emailAuth.welcomeBack') : t('emailAuth.joinFrontline')}
        </Text>

        <Text style={styles.description}>
          {isLogin
            ? t('emailAuth.loginDesc')
            : t('emailAuth.registerDesc')}
        </Text>

        {!isLogin && (
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>{t('emailAuth.displayName')}</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="account-outline"
                size={18}
                color={colors.onSurfaceDim}
              />
              <TextInput
                style={styles.input}
                placeholder={t('emailAuth.displayNamePlaceholder')}
                placeholderTextColor={colors.onSurfaceDim}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                editable={!loading}
              />
            </View>
          </View>
        )}

        {!isLogin && (
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              {t('emailAuth.birthdate', { defaultValue: 'Date of birth' })}
            </Text>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <MaterialCommunityIcons
                name="calendar"
                size={18}
                color={colors.onSurfaceDim}
              />
              <Text
                style={[
                  styles.input,
                  !birthdate && { color: colors.onSurfaceDim },
                ]}
              >
                {birthdate
                  ? birthdate.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : t('emailAuth.birthdatePlaceholder', {
                      defaultValue: 'Tap to select',
                    })}
              </Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              {t('emailAuth.birthdateHelper', {
                defaultValue: 'Kinetic is 18+. We never share your birthdate.',
              })}
            </Text>
            {showDatePicker && (
              <DateTimePicker
                value={birthdate ?? MAX_BIRTHDATE}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={MAX_BIRTHDATE}
                minimumDate={new Date(1920, 0, 1)}
                onChange={(event, selected) => {
                  // Android dismisses the picker before delivering the
                  // value; iOS keeps it open. Mirror both behaviors.
                  if (Platform.OS !== 'ios') setShowDatePicker(false);
                  if (event.type === 'set' && selected) {
                    setBirthdate(selected);
                  }
                }}
              />
            )}
            {Platform.OS === 'ios' && showDatePicker && (
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.dateDoneBtn}
              >
                <Text style={styles.dateDoneText}>
                  {t('common.done', { defaultValue: 'Done' })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('emailAuth.email')}</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons
              name="email-outline"
              size={18}
              color={colors.onSurfaceDim}
            />
            <TextInput
              style={styles.input}
              placeholder={t('emailAuth.emailPlaceholder')}
              placeholderTextColor={colors.onSurfaceDim}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('emailAuth.password')}</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={18}
              color={colors.onSurfaceDim}
            />
            <TextInput
              style={styles.input}
              placeholder={t('emailAuth.passwordPlaceholder')}
              placeholderTextColor={colors.onSurfaceDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              textContentType={isLogin ? 'password' : 'newPassword'}
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

          {/*
            Password checklist — only shown in register mode, only once the
            user has started typing. Keeps the login UX clean (we never
            reveal the current policy to login users, that would leak
            "your old password is below the current policy" info).
          */}
          {!isLogin && password.length > 0 && (
            <View style={styles.policyBox}>
              <PolicyItem
                ok={passwordCheck.checks.length}
                label={t('passwordPolicy.ruleLength', { count: PASSWORD_MIN_LENGTH })}
              />
              <PolicyItem
                ok={passwordCheck.checks.upper && passwordCheck.checks.lower}
                label={t('passwordPolicy.ruleMixedCase')}
              />
              <PolicyItem
                ok={passwordCheck.checks.digit}
                label={t('passwordPolicy.ruleDigit')}
              />
              <PolicyItem
                ok={passwordCheck.checks.symbol}
                label={t('passwordPolicy.ruleSymbol')}
              />
            </View>
          )}
        </View>

        {isLogin && (
          <TouchableOpacity
            onPress={() => navigation.navigate('RecoverPasswordRequest')}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>{t('emailAuth.forgotPassword')}</Text>
          </TouchableOpacity>
        )}

        <PrimaryButton
          title={loading ? '' : isLogin ? t('emailAuth.signInBtn') : t('emailAuth.createAccountBtn')}
          onPress={handleSubmit}
          style={styles.submitButton}
          icon={
            loading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : undefined
          }
        />

        <View style={styles.dividerSection}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>
            {isLogin ? t('emailAuth.newHere') : t('emailAuth.alreadyAccount')}
          </Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          onPress={() => setMode(isLogin ? 'register' : 'login')}
          disabled={loading}
        >
          <Text style={styles.switchText}>
            {isLogin ? t('emailAuth.createAnAccount') : t('emailAuth.signIn')}
          </Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * One row of the password checklist. Green check when the rule passes,
 * muted dot when it doesn't. Never red — nagging red isn't useful while
 * the user is still typing.
 */
function PolicyItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={styles.policyRow}>
      <Feather
        name={ok ? 'check-circle' : 'circle'}
        size={14}
        color={ok ? colors.primary : colors.onSurfaceDim}
      />
      <Text
        style={[
          styles.policyText,
          ok && { color: colors.onSurface },
        ]}
      >
        {label}
      </Text>
    </View>
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
  helperText: {
    ...typography.bodySm,
    color: colors.onSurfaceDim,
    marginTop: 6,
    fontSize: 11,
  },
  dateDoneBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  dateDoneText: {
    ...typography.labelMd,
    color: colors.primary,
    fontSize: 14,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  forgotText: {
    ...typography.bodySm,
    color: colors.primary,
  },
  submitButton: {
    width: '100%',
    marginTop: 16,
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
  switchText: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontFamily: 'Inter_700Bold',
  },
  spacer: {
    flexGrow: 1,
    minHeight: 32,
  },
  policyBox: {
    marginTop: 10,
    paddingHorizontal: 4,
    gap: 6,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  policyText: {
    ...typography.bodySm,
    color: colors.onSurfaceDim,
    fontSize: 12,
  },
});
