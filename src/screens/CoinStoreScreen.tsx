import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../theme';
import { useCoins } from '../contexts/CoinContext';
import { usePurchases } from '../contexts/PurchasesContext';
import { RewardedAdButton } from '../components/RewardedAdButton';

/** Local fallback packages — shown when RevenueCat offerings aren't configured yet */
const LOCAL_PACKAGES = [
  { id: 'kinetic_coins_starter', coins: 50, bonus: 0, price: '$0.99', icon: 'layers' as const, tag: null },
  { id: 'kinetic_coins_basic', coins: 150, bonus: 10, price: '$2.99', icon: 'package' as const, tag: null },
  { id: 'kinetic_coins_popular', coins: 300, bonus: 50, price: '$4.99', icon: 'star' as const, tag: 'MOST POPULAR' as const },
  { id: 'kinetic_coins_value', coins: 650, bonus: 150, price: '$9.99', icon: 'gift' as const, tag: null },
  { id: 'kinetic_coins_premium', coins: 1500, bonus: 500, price: '$19.99', icon: 'award' as const, tag: 'BEST VALUE' as const },
  { id: 'kinetic_coins_mega', coins: 3500, bonus: 1500, price: '$49.99', icon: 'zap' as const, tag: null },
];

const ICON_BY_INDEX = ['layers', 'package', 'star', 'gift', 'award', 'zap'] as const;

export function CoinStoreScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { balance, available, isLoading: balanceLoading, refreshBalanceAfterPurchase } = useCoins();
  const { currentOffering, purchasePackage, isProMember } = usePurchases();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // RevenueCat packages (when configured in App Store Connect)
  const rcCoinPackages =
    currentOffering?.availablePackages?.filter(
      (p) => p.product.productCategory === 'NON_SUBSCRIPTION',
    ) ?? [];
  const subscriptionPkgs =
    currentOffering?.availablePackages?.filter(
      (p) => p.product.productCategory === 'SUBSCRIPTION',
    ) ?? [];

  // Use RevenueCat packages if available, otherwise show local fallback
  const hasRCPackages = rcCoinPackages.length > 0;

  const handleBuyCoins = async (pkg: any) => {
    if (!hasRCPackages) {
      Alert.alert(t('coinStore.comingSoon'), t('coinStore.comingSoonDesc'));
      return;
    }
    setPurchasing(pkg.identifier);
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        refreshBalanceAfterPurchase();
        Alert.alert(t('coinStore.purchaseSuccess'), t('coinStore.purchaseSuccessDesc'));
      }
    } catch {
      Alert.alert(t('coinStore.purchaseFailed'), t('coinStore.purchaseFailedDesc'));
    } finally {
      setPurchasing(null);
    }
  };

  const handleSubscribe = async (pkg: any) => {
    if (!hasRCPackages) {
      Alert.alert(t('coinStore.comingSoon'), t('coinStore.comingSoonDesc'));
      return;
    }
    setPurchasing(pkg.identifier);
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        refreshBalanceAfterPurchase();
        Alert.alert(t('coinStore.subscribed'), t('coinStore.subscribedDesc'));
      }
    } catch {
      Alert.alert(t('coinStore.subscriptionFailed'), t('coinStore.purchaseFailedDesc'));
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('coinStore.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Watch Ad to Earn Coins */}
        <RewardedAdButton />

        {/* Balance */}
        <LinearGradient
          colors={['rgba(202,253,0,0.12)', 'rgba(202,253,0,0.02)']}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>{t('coinStore.yourBalance')}</Text>
          <View style={styles.balanceRow}>
            <MaterialCommunityIcons name="circle-multiple" size={28} color={colors.primary} />
            <Text style={styles.balanceValue}>
              {balanceLoading ? '...' : balance.toLocaleString()}
            </Text>
          </View>
          <Text style={styles.balanceSubtext}>
            {t('coinStore.availableToSpend', { count: available.toLocaleString() })}
          </Text>
        </LinearGradient>

        {/* Buy Coins */}
        <Text style={[styles.sectionTitle, { marginTop: spacing['3xl'] }]}>{t('coinStore.buyCoins')}</Text>
        <Text style={styles.sectionSubtext}>
          {t('coinStore.buyCoinsDesc')}
        </Text>

        <View style={styles.packagesGrid}>
          {LOCAL_PACKAGES.map((lp, index) => {
            // If RevenueCat is available, find the matching RC package
            const rcPkg = rcCoinPackages[index];
            const isPurchasing = purchasing === (rcPkg?.identifier ?? lp.id);

            return (
              <TouchableOpacity
                key={lp.id}
                style={[
                  styles.packageCard,
                  lp.tag === 'MOST POPULAR' && styles.packageCardHighlight,
                  lp.tag === 'BEST VALUE' && styles.packageCardBestValue,
                ]}
                activeOpacity={0.7}
                disabled={!!purchasing}
                onPress={() => handleBuyCoins(rcPkg ?? lp)}
              >
                {/* Tag badge */}
                {lp.tag && (
                  <View
                    style={[
                      styles.tagBadge,
                      lp.tag === 'BEST VALUE' && styles.tagBadgeBestValue,
                    ]}
                  >
                    <Text style={styles.tagBadgeText}>{lp.tag === 'MOST POPULAR' ? t('coinStore.mostPopular') : t('coinStore.bestValue')}</Text>
                  </View>
                )}

                <View style={styles.packageIconWrap}>
                  <Feather name={lp.icon} size={24} color={colors.primary} />
                </View>

                <Text style={styles.packageTitle}>
                  {lp.coins + lp.bonus} Coins
                </Text>

                {/* Bonus line */}
                {lp.bonus > 0 && (
                  <View style={styles.bonusRow}>
                    <Ionicons name="gift" size={12} color="#FC5B00" />
                    <Text style={styles.bonusText}>{t('coinStore.bonus', { count: lp.bonus })}</Text>
                  </View>
                )}

                <Text style={styles.packageDesc}>
                  {lp.bonus > 0
                    ? t('coinStore.bonusCoins', { base: lp.coins, bonus: lp.bonus })
                    : t('coinStore.coins', { count: lp.coins })}
                </Text>

                <View style={styles.packagePriceRow}>
                  {isPurchasing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.packagePrice}>
                      {rcPkg?.product.priceString ?? lp.price}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Pro Subscription */}
        {!isProMember && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing['3xl'] }]}>
              {t('coinStore.kineticPro')}
            </Text>
            <Text style={styles.sectionSubtext}>
              {t('coinStore.proDesc')}
            </Text>

            {subscriptionPkgs.length > 0 ? (
              subscriptionPkgs.map((pkg) => {
                const isPurchasing = purchasing === pkg.identifier;
                const isAnnual = pkg.identifier.includes('annual') || pkg.identifier.includes('year');
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    activeOpacity={0.7}
                    disabled={!!purchasing}
                    onPress={() => handleSubscribe(pkg)}
                  >
                    <LinearGradient
                      colors={['rgba(202,253,0,0.08)', 'rgba(202,253,0,0.02)']}
                      style={styles.proCard}
                    >
                      <View style={styles.proHeader}>
                        <View style={styles.proBadge}>
                          <Ionicons name="diamond" size={14} color={colors.primary} />
                          <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                        {isAnnual && (
                          <View style={styles.saveBadge}>
                            <Text style={styles.saveBadgeText}>{t('coinStore.save44')}</Text>
                          </View>
                        )}
                        {isPurchasing ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Text style={styles.proPrice}>
                            {pkg.product.priceString}
                            {isAnnual ? '/yr' : '/mo'}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.proTitle}>
                        {isAnnual ? t('coinStore.proAnnual') : t('coinStore.proMonthly')}
                      </Text>
                      <Text style={styles.proDesc}>
                        {isAnnual ? t('coinStore.proAnnualDesc') : t('coinStore.proMonthlyDesc')}
                      </Text>
                      <View style={styles.proFeatures}>
                        {([
                          t('coinStore.unlimitedPredictions'),
                          t('coinStore.allSportsUnlocked'),
                          t('coinStore.coinsPerMonth'),
                          t('coinStore.detailedStats'),
                        ] as string[]).map((f) => (
                          <View key={f} style={styles.proFeatureRow}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                            <Text style={styles.proFeatureText}>{f}</Text>
                          </View>
                        ))}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })
            ) : (
              /* Fallback Pro cards when RevenueCat isn't configured */
              <>
                <TouchableOpacity activeOpacity={0.7} onPress={() => handleSubscribe(null)}>
                  <LinearGradient
                    colors={['rgba(202,253,0,0.08)', 'rgba(202,253,0,0.02)']}
                    style={styles.proCard}
                  >
                    <View style={styles.proHeader}>
                      <View style={styles.proBadge}>
                        <Ionicons name="diamond" size={14} color={colors.primary} />
                        <Text style={styles.proBadgeText}>{t('coinStore.pro')}</Text>
                      </View>
                      <Text style={styles.proPrice}>$5.99/mo</Text>
                    </View>
                    <Text style={styles.proTitle}>{t('coinStore.proMonthly')}</Text>
                    <Text style={styles.proDesc}>{t('coinStore.proMonthlyDesc')}</Text>
                    <View style={styles.proFeatures}>
                      {([
                        t('coinStore.unlimitedPredictions'),
                        t('coinStore.allSportsUnlocked'),
                        t('coinStore.coinsPerMonth'),
                        t('coinStore.detailedStats'),
                      ] as string[]).map((f) => (
                        <View key={f} style={styles.proFeatureRow}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                          <Text style={styles.proFeatureText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7} onPress={() => handleSubscribe(null)}>
                  <LinearGradient
                    colors={['rgba(202,253,0,0.08)', 'rgba(202,253,0,0.02)']}
                    style={styles.proCard}
                  >
                    <View style={styles.proHeader}>
                      <View style={styles.proBadge}>
                        <Ionicons name="diamond" size={14} color={colors.primary} />
                        <Text style={styles.proBadgeText}>{t('coinStore.pro')}</Text>
                      </View>
                      <View style={styles.saveBadge}>
                        <Text style={styles.saveBadgeText}>{t('coinStore.save44')}</Text>
                      </View>
                      <Text style={styles.proPrice}>$39.99/yr</Text>
                    </View>
                    <Text style={styles.proTitle}>{t('coinStore.proAnnual')}</Text>
                    <Text style={styles.proDesc}>{t('coinStore.proAnnualDesc')}</Text>
                    <View style={styles.proFeatures}>
                      {([
                        t('coinStore.unlimitedPredictions'),
                        t('coinStore.allSportsUnlocked'),
                        t('coinStore.coinsPerYear'),
                        t('coinStore.detailedStats'),
                      ] as string[]).map((f) => (
                        <View key={f} style={styles.proFeatureRow}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                          <Text style={styles.proFeatureText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {isProMember && (
          <View style={styles.proActiveCard}>
            <Ionicons name="diamond" size={20} color={colors.primary} />
            <Text style={styles.proActiveText}>
              {t('coinStore.proActiveMember')}
            </Text>
          </View>
        )}

        {/* Compliance disclaimer */}
        <Text style={styles.disclaimer}>
          {t('coinStore.disclaimer')}
        </Text>
        <Text style={styles.legalLinks}>
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  scroll: { flex: 1 },

  balanceCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing['2xl'],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.15)',
  },
  balanceLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceDim,
    letterSpacing: 1.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  balanceValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 40,
    color: colors.primary,
    letterSpacing: -1,
  },
  balanceSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },

  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceDim,
    letterSpacing: 1.5,
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.xs,
  },
  sectionSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.lg,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceDim,
    textAlign: 'center',
    paddingHorizontal: spacing['4xl'],
  },

  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  packageCard: {
    width: '47%' as any,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'visible',
  },
  packageCardHighlight: {
    borderColor: 'rgba(202,253,0,0.35)',
    borderWidth: 1.5,
  },
  packageCardBestValue: {
    borderColor: 'rgba(252,91,0,0.35)',
    borderWidth: 1.5,
  },

  tagBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    left: '15%' as any,
    right: '15%' as any,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
    zIndex: 1,
  },
  tagBadgeBestValue: {
    backgroundColor: '#FC5B00',
  },
  tagBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#000',
    letterSpacing: 0.5,
  },

  packageIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(202,253,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  packageTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  bonusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#FC5B00',
    letterSpacing: 0.5,
  },
  packageDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
    marginTop: 4,
    minHeight: 30,
  },
  packagePriceRow: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(202,253,0,0.12)',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  packagePrice: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.primary,
  },

  proCard: {
    marginHorizontal: spacing.lg,
    padding: spacing['2xl'],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.15)',
    marginBottom: spacing.md,
  },
  proHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(202,253,0,0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  proBadgeText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1,
  },
  saveBadge: {
    backgroundColor: '#FC5B00',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  saveBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#fff',
    letterSpacing: 0.5,
  },
  proPrice: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.primary,
  },
  proTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: colors.onSurface,
    marginTop: spacing.md,
  },
  proDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  proFeatures: { marginTop: spacing.lg, gap: spacing.sm },
  proFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  proFeatureText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurface,
  },

  proActiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing['3xl'],
    padding: spacing.lg,
    backgroundColor: 'rgba(202,253,0,0.08)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(202,253,0,0.15)',
  },
  proActiveText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.primary,
  },

  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: colors.onSurfaceDim,
    textAlign: 'center',
    marginTop: spacing['3xl'],
    marginHorizontal: spacing['2xl'],
    lineHeight: 15,
    opacity: 0.7,
  },
  legalLinks: {
    textAlign: 'center',
    marginTop: spacing.md,
    marginHorizontal: spacing['2xl'],
  },
  legalLink: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
