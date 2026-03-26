import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

interface KineticLogoProps {
  size?: 'large' | 'small';
  showSubtitle?: boolean;
}

export function KineticLogo({ size = 'large', showSubtitle = true }: KineticLogoProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.logo, size === 'small' && styles.logoSmall]}>
        KINETIC
      </Text>
      {showSubtitle && (
        <Text style={[styles.subtitle, size === 'small' && styles.subtitleSmall]}>
          PRECISION BETTING ENGINE
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logo: {
    ...typography.displayLg,
    color: colors.primary,
    fontSize: 42,
    lineHeight: 50,
    letterSpacing: 2,
  },
  logoSmall: {
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 1,
  },
  subtitle: {
    ...typography.labelMd,
    color: colors.primary,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 4,
    opacity: 0.8,
  },
  subtitleSmall: {
    fontSize: 8,
    letterSpacing: 2,
  },
});
