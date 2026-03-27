import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { KineticLogo, PrimaryButton, SocialButton } from '../components';
import { colors, typography, spacing } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../api';
import type { SocialProvider } from '../api';
import { signInWithGoogle, isGoogleSignInCancelled } from '../services/googleAuth';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

const LOREM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.`;

type LegalModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
};

function LegalModal({ visible, title, onClose }: LegalModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable
          style={[
            modalStyles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={modalStyles.handle} />

          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={modalStyles.body}
            showsVerticalScrollIndicator={false}
          >
            <Text style={modalStyles.bodyText}>{LOREM}</Text>
          </ScrollView>

          <TouchableOpacity
            style={modalStyles.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={modalStyles.closeBtnText}>CLOSE</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function LoginScreen({ navigation }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { loginWithSocial } = useAuth();
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);

  const handleEmailContinue = () => {
    navigation.navigate('EmailAuth');
  };

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    try {
      const result = await signInWithGoogle();
      await loginWithSocial('google', result.idToken, {
        idToken: result.idToken,
        email: result.email,
        displayName: result.displayName,
        avatar: result.avatar,
      });
    } catch (err) {
      if (isGoogleSignInCancelled(err)) return;
      const message =
        err instanceof ApiError
          ? err.message
          : 'Google sign-in failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSocialLogin = async (provider: SocialProvider) => {
    if (provider === 'google') {
      return handleGoogleLogin();
    }
    setSocialLoading(provider);
    try {
      await loginWithSocial(provider, `dev-${provider}-token`, {
        email: `dev@${provider}.com`,
        displayName: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Dev User`,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Social login failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <KineticLogo />
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome to the Frontline</Text>
          <Text style={styles.welcomeSubtitle}>
            Sign in or create your account instantly
          </Text>
        </View>

        <View style={styles.socialSection}>
          <SocialButton
            provider="google"
            onPress={() => handleSocialLogin('google')}
          />
          <SocialButton
            provider="apple"
            onPress={() => handleSocialLogin('apple')}
          />
          <SocialButton
            provider="x"
            onPress={() => handleSocialLogin('x')}
          />
          {socialLoading && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginTop: 4 }}
            />
          )}
        </View>

        <View style={styles.dividerSection}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <PrimaryButton
          title="CONTINUE WITH EMAIL"
          onPress={handleEmailContinue}
          style={styles.emailButton}
        />

        <TouchableOpacity
          onPress={() => navigation.navigate('RecoverPasswordRequest')}
          style={styles.forgotButton}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text
            style={styles.termsLink}
            onPress={() => setLegalModal('terms')}
          >
            Terms of Service
          </Text>{' '}
          and{'\n'}
          <Text
            style={styles.termsLink}
            onPress={() => setLegalModal('privacy')}
          >
            Privacy Policy
          </Text>
        </Text>

        <View style={styles.spacer} />
      </ScrollView>

      <LegalModal
        visible={legalModal === 'terms'}
        title="Terms of Service"
        onClose={() => setLegalModal(null)}
      />
      <LegalModal
        visible={legalModal === 'privacy'}
        title="Privacy Policy"
        onClose={() => setLegalModal(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  orbTopRight: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.tertiary,
    opacity: 0.03,
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary,
    opacity: 0.03,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  logoSection: {
    marginBottom: 32,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    ...typography.headlineLg,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  socialSection: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  dividerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
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
    marginHorizontal: 16,
  },
  emailButton: {
    width: '100%',
  },
  forgotButton: {
    marginTop: 20,
  },
  forgotText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  termsText: {
    ...typography.bodySm,
    color: colors.onSurfaceDim,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  spacer: {
    flexGrow: 1,
    minHeight: 32,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 8,
    paddingHorizontal: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceContainerHighest,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  body: {
    marginBottom: 24,
  },
  bodyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
  },
  closeBtn: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  closeBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
    letterSpacing: 1,
  },
});
