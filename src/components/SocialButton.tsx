import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { colors, typography, borderRadius } from '../theme';

interface SocialButtonProps {
  provider: 'google' | 'apple' | 'x';
  onPress: () => void;
}

const providerConfig = {
  google: { label: 'Sign in with Google' },
  apple: { label: 'Sign in with Apple' },
  x: { label: 'Sign in with X' },
};

function ProviderIcon({ provider }: { provider: string }) {
  switch (provider) {
    case 'google':
      return (
        <View style={styles.googleCircle}>
          <FontAwesome5 name="google" size={12} color="#fff" />
        </View>
      );
    case 'apple':
      return <FontAwesome5 name="apple" size={18} color={colors.onSurface} />;
    case 'x':
      return <FontAwesome6 name="x-twitter" size={16} color={colors.onSurface} />;
    default:
      return null;
  }
}

export function SocialButton({ provider, onPress }: SocialButtonProps) {
  const config = providerConfig[provider];

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <ProviderIcon provider={provider} />
      </View>
      <Text style={styles.label}>{config.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerHighest,
    gap: 10,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
  },
  googleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontFamily: 'Inter_500Medium',
  },
});
