import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, borderRadius } from '../theme';

interface SocialButtonProps {
  provider: 'google' | 'apple' | 'x';
  onPress: () => void;
}

const providerI18nKey: Record<string, string> = {
  google: 'login.continueGoogle',
  apple: 'login.continueApple',
  x: 'login.continueX',
};

function ProviderIcon({ provider }: { provider: string }) {
  switch (provider) {
    case 'google':
      return (
        <View style={styles.googleCircle}>
          <FontAwesome5 name="google" size={13} color="#fff" />
        </View>
      );
    case 'apple':
      return <FontAwesome5 name="apple" size={20} color={colors.onSurface} />;
    case 'x':
      return <FontAwesome6 name="x-twitter" size={17} color={colors.onSurface} />;
    default:
      return null;
  }
}

export function SocialButton({ provider, onPress }: SocialButtonProps) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <ProviderIcon provider={provider} />
      </View>
      <Text style={styles.label}>{t(providerI18nKey[provider])}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outline,
    gap: 12,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
  },
  googleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
});
