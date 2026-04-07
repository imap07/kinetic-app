import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { colors, borderRadius } from '../theme';
import { usePurchases } from '../contexts/PurchasesContext';
import type { RootStackParamList } from '../navigation/types';

export function ProUpgradeBanner() {
  const { isProMember } = usePurchases();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();

  if (isProMember) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('Paywall', { trigger: 'remove_ads' })}
    >
      <LinearGradient
        colors={['rgba(202,253,0,0.08)', 'rgba(202,253,0,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="eye-off" size={18} color={colors.primary} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title}>{t('ads.removeAds')}</Text>
            <Text style={styles.subtitle}>{t('ads.removeAdsDesc')}</Text>
          </View>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>$3.99/mo</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.12)',
    overflow: 'hidden',
  },
  gradient: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(202,253,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.onSurface,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  priceBadge: {
    backgroundColor: 'rgba(202,253,0,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.primary,
  },
});
