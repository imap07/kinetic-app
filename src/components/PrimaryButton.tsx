import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, borderRadius } from '../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  style,
  textStyle,
  icon,
}: PrimaryButtonProps) {
  if (variant === 'outline') {
    return (
      <TouchableOpacity
        style={[styles.outlineButton, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {icon}
        <Text style={[styles.outlineButtonText, textStyle]}>{title}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientButton}
      >
        {icon}
        <Text style={[styles.primaryButtonText, textStyle]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    gap: 8,
  },
  primaryButtonText: {
    ...typography.titleMd,
    color: colors.onPrimary,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerHighest,
    gap: 10,
  },
  outlineButtonText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontFamily: 'Inter_500Medium',
  },
});
