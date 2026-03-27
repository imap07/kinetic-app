import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, borderRadius, spacing } from '../theme';
import { usePurchases } from '../contexts/PurchasesContext';

const FEATURES = [
  'Make picks on real matches',
  'Compete on live leaderboards',
  'Pro-grade market insights',
  'Track results in real-time',
  'Advanced analytics & trends',
];

export function ProUpgradeBanner() {
  const { isProMember, presentPaywall } = usePurchases();

  if (isProMember) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(202,253,0,0.08)', 'rgba(202,253,0,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconRow}>
          <MaterialCommunityIcons
            name="lightning-bolt"
            size={22}
            color={colors.primary}
          />
          <Text style={styles.title}>Join Kinetic Pro</Text>
        </View>

        <View style={styles.featureList}>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.ctaWrap}
          onPress={presentPaywall}
        >
          <LinearGradient
            colors={['#F3FFCA', '#CAFD00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnText}>UPGRADE NOW</Text>
            <Ionicons name="arrow-forward" size={16} color="#4A5E00" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.15)',
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  featureList: {
    gap: 10,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  ctaWrap: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 4,
    gap: 8,
  },
  ctaBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    lineHeight: 20,
    color: '#4A5E00',
    letterSpacing: 0.5,
  },
});
