import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { useCoins } from '../contexts/CoinContext';
import { usePurchases } from '../contexts/PurchasesContext';

const PACKAGE_ICONS: Record<string, string> = {
  $rc_50: 'layers',
  $rc_100: 'box',
  $rc_250: 'gift',
  $rc_500: 'award',
  $rc_1000: 'zap',
};

export function CoinStoreScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { balance, available, isLoading: balanceLoading, refreshBalanceAfterPurchase } = useCoins();
  const { currentOffering, purchasePackage, isProMember } = usePurchases();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const coinPackages = currentOffering?.availablePackages?.filter(
    (p) => p.product.productCategory === 'NON_SUBSCRIPTION',
  ) ?? [];
  const subscriptionPkgs = currentOffering?.availablePackages?.filter(
    (p) => p.product.productCategory === 'SUBSCRIPTION',
  ) ?? [];

  const handleBuyCoins = async (pkg: any) => {
    setPurchasing(pkg.identifier);
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        refreshBalanceAfterPurchase();
        Alert.alert('Purchase Successful', 'Your coins will be credited shortly.');
      }
    } catch {
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const handleSubscribe = async (pkg: any) => {
    setPurchasing(pkg.identifier);
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        refreshBalanceAfterPurchase();
        Alert.alert('Subscribed!', 'Welcome to Kinetic Pro! You will receive monthly coins.');
      }
    } catch {
      Alert.alert('Subscription Failed', 'Something went wrong. Please try again.');
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
        <Text style={styles.headerTitle}>COIN STORE</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['rgba(202,253,0,0.12)', 'rgba(202,253,0,0.02)']}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
          <View style={styles.balanceRow}>
            <MaterialCommunityIcons name="circle-multiple" size={28} color={colors.primary} />
            <Text style={styles.balanceValue}>
              {balanceLoading ? '...' : balance.toLocaleString()}
            </Text>
          </View>
          <Text style={styles.balanceSubtext}>
            {available.toLocaleString()} available to spend
          </Text>
        </LinearGradient>

        <Text style={[styles.sectionTitle, { marginTop: spacing['3xl'] }]}>BUY COINS</Text>
        <Text style={styles.sectionSubtext}>
          Coins are used to enter leagues and redeem giftcards
        </Text>

        {coinPackages.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="package" size={32} color={colors.onSurfaceDim} />
            <Text style={styles.emptyText}>
              Coin packages are not available yet. Check back soon!
            </Text>
          </View>
        )}

        <View style={styles.packagesGrid}>
          {coinPackages.map((pkg) => {
            const iconName = PACKAGE_ICONS[pkg.identifier] ?? 'circle';
            const isPurchasing = purchasing === pkg.identifier;
            return (
              <TouchableOpacity
                key={pkg.identifier}
                style={styles.packageCard}
                activeOpacity={0.7}
                disabled={!!purchasing}
                onPress={() => handleBuyCoins(pkg)}
              >
                <View style={styles.packageIconWrap}>
                  <Feather
                    name={iconName as any}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                <Text style={styles.packageDesc}>{pkg.product.description}</Text>
                <View style={styles.packagePriceRow}>
                  {isPurchasing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.packagePrice}>
                      {pkg.product.priceString}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {!isProMember && subscriptionPkgs.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing['3xl'] }]}>
              KINETIC PRO
            </Text>
            <Text style={styles.sectionSubtext}>
              Unlock unlimited predictions, all sports, and get 30 coins every month
            </Text>

            {subscriptionPkgs.map((pkg) => {
              const isPurchasing = purchasing === pkg.identifier;
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
                      {isPurchasing ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text style={styles.proPrice}>
                          {pkg.product.priceString}/mo
                        </Text>
                      )}
                    </View>
                    <Text style={styles.proTitle}>{pkg.product.title}</Text>
                    <Text style={styles.proDesc}>{pkg.product.description}</Text>
                    <View style={styles.proFeatures}>
                      {[
                        'Unlimited predictions',
                        'All sports unlocked',
                        '30 coins/month',
                        'Detailed stats',
                      ].map((f) => (
                        <View key={f} style={styles.proFeatureRow}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                          <Text style={styles.proFeatureText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {isProMember && (
          <View style={styles.proActiveCard}>
            <Ionicons name="diamond" size={20} color={colors.primary} />
            <Text style={styles.proActiveText}>
              You are a Kinetic Pro member. 30 coins are credited monthly.
            </Text>
          </View>
        )}
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
  },
  packageIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(202,253,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  packageTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
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
});
