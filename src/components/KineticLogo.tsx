import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

interface KineticLogoProps {
  size?: 'large' | 'small';
  showSubtitle?: boolean;
  showIcon?: boolean;
}

export function KineticLogo({ size = 'large', showSubtitle = true, showIcon = false }: KineticLogoProps) {
  return (
    <View style={styles.container}>
      {showIcon && (
        <View style={[styles.iconWrap, size === 'small' && styles.iconWrapSmall]}>
          <Image
            source={require('../assets/logo2.png')}
            style={[styles.icon, size === 'small' && styles.iconSmall]}
            resizeMode="contain"
          />
        </View>
      )}
      <Text style={[styles.logo, size === 'small' && styles.logoSmall]}>
        KINETIC
      </Text>
      {showSubtitle && !showIcon && (
        <Text style={[styles.subtitle, size === 'small' && styles.subtitleSmall]}>
          PRECISION PREDICTION ENGINE
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 12,
  },
  iconWrapSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginBottom: 8,
  },
  icon: {
    width: 80,
    height: 80,
  },
  iconSmall: {
    width: 40,
    height: 40,
  },
  logo: {
    ...typography.displayLg,
    color: colors.primary,
    fontSize: 36,
    lineHeight: 44,
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
