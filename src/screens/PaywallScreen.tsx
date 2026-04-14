import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';
import { ModalCloseButton } from '../components';
import { usePurchases } from '../contexts/PurchasesContext';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList, PaywallTrigger } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

const FEATURE_KEYS = [
  'paywall.adFree',
  'paywall.bonusCoins',
  'paywall.supportDev',
  'paywall.proBadge',
];

function getContextCard(trigger: PaywallTrigger, t: (key: string, opts?: Record<string, unknown>) => string) {
  switch (trigger) {
    case 'remove_ads':
      return {
        icon: 'eye-off-outline' as const,
        title: t('paywall.tiredOfAds'),
        subtitle: t('paywall.tiredOfAdsDesc'),
      };
    case 'general':
    default:
      return {
        icon: 'flash-outline' as const,
        title: t('paywall.enhanceExperience'),
        subtitle: t('paywall.enhanceExperienceDesc'),
      };
  }
}

export function PaywallScreen({ navigation, route }: Props) {
  const { trigger } = route.params;
  const {
    currentOffering,
    purchasePackage,
    restorePurchases,
    isProMember,
  } = usePurchases();

  const { t } = useTranslation();
  const context = getContextCard(trigger, t);

  // Try SDK convenience accessors first, then search availablePackages by lookup_key
  const monthlyPkg =
    currentOffering?.monthly ??
    currentOffering?.availablePackages?.find(
      (p) => p.identifier === '$rc_monthly' || p.product?.identifier === 'kinetic_pro_monthly',
    ) ??
    null;
  const annualPkg =
    currentOffering?.annual ??
    currentOffering?.availablePackages?.find(
      (p) => p.identifier === '$rc_annual' || p.product?.identifier === 'kinetic_pro_annual',
    ) ??
    null;

  const monthlyPrice = monthlyPkg?.product?.priceString ?? '$3.99';
  const annualPrice = annualPkg?.product?.priceString ?? '$24.99';

  // Debug: log offerings state in dev
  if (__DEV__) {
    console.log('[Paywall] offering:', currentOffering?.identifier);
    console.log('[Paywall] availablePackages:', currentOffering?.availablePackages?.map(
      (p) => `${p.identifier} → ${p.product?.identifier}`,
    ));
    console.log('[Paywall] monthly:', monthlyPkg?.identifier, '| annual:', annualPkg?.identifier);
  }

  const handlePurchase = useCallback(async (type: 'monthly' | 'annual') => {
    const pkg = type === 'monthly' ? monthlyPkg : annualPkg;
    if (!pkg) {
      Alert.alert(t('paywall.notAvailable'), t('paywall.notAvailableDesc'));
      return;
    }
    const success = await purchasePackage(pkg);
    if (success) {
      navigation.goBack();
    }
  }, [monthlyPkg, annualPkg, purchasePackage, navigation, t]);

  const handleRestore = useCallback(async () => {
    const restored = await restorePurchases();
    if (restored) {
      Alert.alert(t('paywall.restored'), t('paywall.restoredDesc'));
      navigation.goBack();
    } else {
      Alert.alert(t('paywall.nothingToRestore'), t('paywall.nothingToRestoreDesc'));
    }
  }, [restorePurchases, navigation, t]);

  if (isProMember) {
    navigation.goBack();
    return null;
  }

  return (
    <View style={styles.container}>
      <ModalCloseButton onClose={() => navigation.goBack()} variant="fullscreen" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['rgba(202,253,0,0.15)', 'rgba(202,253,0,0)']}
            style={styles.headerGlow}
          />
          <View style={styles.iconCircle}>
            <Ionicons name="flash" size={32} color={colors.primary} />
          </View>
          <Text style={styles.brandLabel}>KINETIC PRO</Text>
          <Text style={styles.headline}>{t('paywall.headlineAdFree')}</Text>
        </View>

        {/* Context Card */}
        <View style={styles.contextCard}>
          <Ionicons
            name={context.icon as any}
            size={20}
            color={colors.primary}
          />
          <View style={styles.contextTextWrap}>
            <Text style={styles.contextTitle}>{context.title}</Text>
            <Text style={styles.contextSubtitle}>{context.subtitle}</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          {FEATURE_KEYS.map((key, i) => (
            <View key={key} style={styles.featureRow}>
              <View style={styles.featureCheck}>
                <Ionicons name="checkmark" size={14} color={colors.background} />
              </View>
              <Text style={styles.featureText}>{t(key)}</Text>
            </View>
          ))}
        </View>

        {/* Social Proof */}
        <View style={styles.socialProof}>
          <MaterialCommunityIcons name="account-group" size={16} color={colors.primary} />
          <Text style={styles.socialProofText}>
            {t('paywall.socialProof')}
          </Text>
        </View>

        {/* Pricing */}
        <View style={styles.pricingSection}>
          <TouchableOpacity
            style={styles.pricingCardPrimary}
            onPress={() => handlePurchase('annual')}
            activeOpacity={0.8}
          >
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>{t('paywall.save48')}</Text>
            </View>
            <Text style={styles.pricingLabel}>{t('paywall.annual')}</Text>
            <Text style={styles.pricingAmount}>{t('paywall.perYear', { price: annualPrice })}</Text>
            <Text style={styles.pricingDetail}>{t('paywall.freeTrial')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pricingCardSecondary}
            onPress={() => handlePurchase('monthly')}
            activeOpacity={0.8}
          >
            <Text style={styles.pricingLabel}>{t('paywall.monthly')}</Text>
            <Text style={styles.pricingAmount}>{t('paywall.perMonth', { price: monthlyPrice })}</Text>
            <Text style={styles.pricingDetail}>{t('paywall.cancelAnytime')}</Text>
          </TouchableOpacity>
        </View>

        {/* Restore */}
        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore}>
          <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
        </TouchableOpacity>

        {/* Legal */}
        <Text style={styles.legalText}>
          {t('paywall.legalNotice')}{'\n'}
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL('https://kineticapp.ca/terms')}
          >
            {t('login.termsLink')}
          </Text>
          {'  ·  '}
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL('https://kineticapp.ca/privacy')}
          >
            {t('login.privacyLink')}
          </Text>
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },

  header: {
    alignItems: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  headerGlow: {
    position: 'absolute',
    top: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(202,253,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 3,
    color: colors.primary,
    marginBottom: 8,
  },
  headline: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    lineHeight: 36,
    color: colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  contextCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(202,253,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
  },
  contextTextWrap: {
    flex: 1,
    gap: 4,
  },
  contextTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
  },
  contextSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },

  featuresSection: {
    gap: 14,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
    flex: 1,
  },

  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 12,
    marginBottom: 28,
  },
  socialProofText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    flex: 1,
  },

  pricingSection: {
    gap: 12,
    marginBottom: 20,
  },
  pricingCardPrimary: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  saveBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  saveBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    color: colors.background,
  },
  pricingCardSecondary: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  pricingLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.5,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  pricingAmount: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: colors.onSurface,
  },
  pricingDetail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.onSurfaceDim,
  },

  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
  },

  legalText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    color: colors.onSurfaceDim,
    textAlign: 'center',
  },
  legalLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
