import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { legalApi } from '../api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { KineticLogo, PrimaryButton, SocialButton, ModalCloseButton } from '../components';
import { colors, typography, spacing } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../api';
import type { SocialProvider } from '../api';
import { signInWithGoogle, isGoogleSignInCancelled } from '../services/googleAuth';
import * as AppleAuthentication from 'expo-apple-authentication';
import { isBiometricLoginEnabled, getBiometricLabel } from '../services/biometricAuth';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

type LegalModalProps = {
  visible: boolean;
  type: 'terms' | 'privacy';
  onClose: () => void;
};

function LegalModal({ visible, type, onClose }: LegalModalProps) {
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setLoading(true);
    const fetcher = type === 'terms' ? legalApi.getTerms : legalApi.getPrivacy;
    fetcher()
      .then((doc) => {
        setTitle(doc.title);
        setContent(doc.content);
      })
      .catch(() => {
        setTitle(type === 'terms' ? 'Terms of Service' : 'Privacy Policy');
        setContent('Unable to load document. Please try again later.');
      })
      .finally(() => setLoading(false));
  }, [visible, type]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <Pressable style={modalStyles.overlayBg} onPress={onClose} />
        <View
          style={[
            modalStyles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={modalStyles.handle} />

          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <ModalCloseButton onClose={onClose} variant="sheet" />
          </View>

          <ScrollView
            style={modalStyles.body}
            showsVerticalScrollIndicator
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginTop: 32 }}
              />
            ) : (
              <Text style={modalStyles.bodyText}>{content}</Text>
            )}
          </ScrollView>

          <TouchableOpacity
            style={modalStyles.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={modalStyles.closeBtnText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function LoginScreen({ navigation }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { loginWithSocial, loginWithBiometric } = useAuth();
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Face ID');
  const [biometricLoading, setBiometricLoading] = useState(false);
  const biometricAttempted = useRef(false);

  // Entrance animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const headlineAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
    }
  }, []);

  // Check if biometric login is available and auto-prompt
  useEffect(() => {
    (async () => {
      const enabled = await isBiometricLoginEnabled();
      if (enabled) {
        setBiometricAvailable(true);
        const label = await getBiometricLabel();
        setBiometricLabel(label);

        // Auto-prompt on first mount
        if (!biometricAttempted.current) {
          biometricAttempted.current = true;
          setBiometricLoading(true);
          const success = await loginWithBiometric();
          setBiometricLoading(false);
          if (!success) {
            // Silently fail — user can tap manually or use other methods
          }
        }
      }
    })();
  }, [loginWithBiometric]);

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    const success = await loginWithBiometric();
    setBiometricLoading(false);
    if (!success) {
      Alert.alert('Authentication Failed', 'Biometric login failed. Please try another method.');
    }
  };

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(headlineAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(buttonsAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(footerAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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

  const handleAppleLogin = async () => {
    setSocialLoading('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert('Error', 'Apple sign-in failed: no identity token received.');
        return;
      }

      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ');

      await loginWithSocial('apple', credential.identityToken, {
        idToken: credential.identityToken,
        email: credential.email ?? undefined,
        displayName: fullName || undefined,
      });
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') return;
      const message =
        err instanceof ApiError
          ? err.message
          : 'Apple sign-in failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSocialLogin = async (provider: SocialProvider) => {
    if (provider === 'google') return handleGoogleLogin();
    if (provider === 'apple') return handleAppleLogin();
  };

  const makeAnimStyle = (anim: Animated.Value, translateY = 20) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [translateY, 0],
        }),
      },
    ],
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background gradient orbs */}
      <View style={styles.orbContainer}>
        <LinearGradient
          colors={['rgba(252,91,0,0.18)', 'rgba(252,91,0,0)']}
          style={styles.orbTopRight}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <LinearGradient
          colors={['rgba(202,253,0,0.12)', 'rgba(202,253,0,0)']}
          style={styles.orbBottomLeft}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <LinearGradient
          colors={['rgba(202,253,0,0.06)', 'rgba(202,253,0,0)']}
          style={styles.orbCenter}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo + Headline as single visual block */}
        <Animated.View style={[styles.logoSection, makeAnimStyle(logoAnim, 30)]}>
          <KineticLogo showIcon />
        </Animated.View>

        <Animated.View style={[styles.headlineSection, makeAnimStyle(headlineAnim)]}>
          <Text style={styles.headline}>Predict. Compete. Win.</Text>
          <Text style={styles.subheadline}>Your sports prediction edge.</Text>
        </Animated.View>

        {/* Action Buttons Section */}
        <Animated.View style={[styles.actionsSection, makeAnimStyle(buttonsAnim)]}>
          <SocialButton
            provider="google"
            onPress={() => handleSocialLogin('google')}
          />
          {appleAvailable && (
            <SocialButton
              provider="apple"
              onPress={() => handleSocialLogin('apple')}
            />
          )}

          {socialLoading && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginTop: 4 }}
            />
          )}

          <View style={styles.dividerSection}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <PrimaryButton
            title="CONTINUE WITH EMAIL"
            onPress={handleEmailContinue}
            style={styles.emailButton}
            icon={
              <Ionicons name="mail-outline" size={18} color={colors.onPrimary} />
            }
          />

          {biometricAvailable && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              activeOpacity={0.7}
              disabled={biometricLoading}
            >
              <Ionicons
                name={biometricLabel === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                size={22}
                color={colors.primary}
              />
              {biometricLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 10 }} />
              ) : (
                <Text style={styles.biometricText}>
                  Sign in with {biometricLabel}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>

        <View style={styles.spacer} />

        {/* Footer / Legal */}
        <Animated.View style={[styles.footer, makeAnimStyle(footerAnim, 10)]}>
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text
              style={styles.termsLink}
              onPress={() => setLegalModal('terms')}
            >
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text
              style={styles.termsLink}
              onPress={() => setLegalModal('privacy')}
            >
              Privacy Policy
            </Text>
          </Text>
        </Animated.View>
      </ScrollView>

      <LegalModal
        visible={legalModal === 'terms'}
        type="terms"
        onClose={() => setLegalModal(null)}
      />
      <LegalModal
        visible={legalModal === 'privacy'}
        type="privacy"
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

  // Background orbs
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orbTopRight: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: -40,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  orbCenter: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.35,
    left: SCREEN_WIDTH * 0.2,
    width: 200,
    height: 200,
    borderRadius: 100,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
  },

  // Logo
  logoSection: {
    marginBottom: 16,
    alignItems: 'center',
  },

  // Headline
  headlineSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headline: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 26,
    lineHeight: 34,
    color: colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subheadline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  // Actions
  actionsSection: {
    width: '100%',
    gap: 12,
  },
  dividerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outline,
  },
  dividerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceDim,
    marginHorizontal: 16,
  },
  emailButton: {
    width: '100%',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  biometricText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: colors.primary,
  },

  // Spacer
  spacer: {
    flexGrow: 1,
    minHeight: 24,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  termsText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.onSurfaceDim,
    textAlign: 'center',
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
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
    flex: 1,
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
